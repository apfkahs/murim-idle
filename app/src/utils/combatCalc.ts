/**
 * 전투 수치 계산 공유 헬퍼 함수 모음
 * gameStore 슬라이스와 gameLoop.ts 양쪽에서 import — 순환 의존성 없음
 */
import { BALANCE_PARAMS } from '../data/balance';
import { getArtDef, type MasteryEffects } from '../data/arts';
import { getEquipmentDef, type EquipSlot, type EquipStats } from '../data/equipment';
import { type MonsterDef } from '../data/monsters';
import { getProfDamageValue } from './artUtils';
import type { GameState } from '../store/types';


const B = BALANCE_PARAMS;

// ============================================================
// 전투 초기화 상수
// ============================================================
export const CLEAR_BATTLE_STATE = {
  battleMode: 'none' as const,
  currentEnemy: null,
  stamina: 0,
  ultCooldowns: {} as Record<string, number>,
  currentBattleDuration: 0,
  currentBattleDamageDealt: 0,
  bossPatternState: null,
  playerStunTimer: 0,
  lastEnemyAttack: null,
  dodgeCounterActive: false,
  playerFinisherCharge: null,
};

// ============================================================
// 기본 수치 계산
// ============================================================

/** CRIT_DMG = CRITD_BASE + bonusCritDmg (심득 보너스 포함) */
export function calcCritDmg(state: GameState): number {
  const eff = gatherMasteryEffects(state);
  return B.CRITD_BASE + (eff.bonusCritDmg ?? 0);
}

/** 경지 돌파 누적 배율: 1.1^tier */
export function calcTierMultiplier(tier: number): number {
  return Math.pow(1.1, tier);
}

/** HP = HP_BASE + 체 × K_CHE × tierMult + hpBonus */
export function calcMaxHp(che: number, hpBonus: number = 0, tierMult: number = 1): number {
  return Math.floor(B.HP_BASE + che * B.STAT_K_CHE * tierMult + hpBonus);
}

/** STAMINA = STAM_BASE + 심 × K_SIM × tierMult */
export function calcStamina(sim: number, tierMult: number = 1): number {
  return Math.floor(B.STAM_BASE + sim * B.STAT_K_SIM * tierMult);
}

/** STAMINA_REGEN = REGEN_BASE + 기 × K_GI × tierMult */
export function calcStaminaRegen(gi: number, tierMult: number = 1): number {
  return B.REGEN_BASE + gi * B.STAT_K_GI * tierMult;
}

// ============================================================
// 장비 & 심득 효과 집계
// ============================================================

/** 장착 장비의 스탯 합산 */
export function gatherEquipmentStats(state: GameState): EquipStats {
  const result: EquipStats = {};
  for (const slot of ['weapon', 'armor', 'gloves', 'boots'] as EquipSlot[]) {
    const inst = state.equipment[slot];
    if (!inst) continue;
    const def = getEquipmentDef(inst.defId);
    if (!def) continue;
    for (const [key, val] of Object.entries(def.stats)) {
      if (typeof val === 'number') {
        (result as any)[key] = ((result as any)[key] ?? 0) + val;
      }
    }
  }
  return result;
}

/** 해금된 MasteryDef의 effects를 순회하여 합산. synergyArtId 조건 적용. */
export function gatherMasteryEffects(state: GameState): MasteryEffects {
  const result: MasteryEffects = {};
  const { activeMasteries, equippedArts, equippedSimbeop } = state;

  // baseEffects 적용 (mastery 없이도 장착 시 효과)
  for (const artId of [...equippedArts, ...(equippedSimbeop ? [equippedSimbeop] : [])]) {
    const artDef = getArtDef(artId);
    if (!artDef?.baseEffects) continue;
    const eff = artDef.baseEffects;
    const profBonus = artDef.proficiencyCoefficient > 0
      ? getProfDamageValue(state.proficiency?.[artDef.proficiencyType] ?? 0) * artDef.proficiencyCoefficient
      : 0;
    if (eff.bonusAtkSpeed) result.bonusAtkSpeed = (result.bonusAtkSpeed ?? 0) + eff.bonusAtkSpeed + profBonus;
    if (eff.bonusDodge) result.bonusDodge = (result.bonusDodge ?? 0) + eff.bonusDodge + profBonus;
    if (eff.bonusHpPercent) result.bonusHpPercent = (result.bonusHpPercent ?? 0) + eff.bonusHpPercent;
  }

  for (const [artId, masteryIds] of Object.entries(activeMasteries)) {
    const artDef = getArtDef(artId);
    if (!artDef) continue;
    const isEquipped = equippedArts.includes(artId) || equippedSimbeop === artId;
    if (!isEquipped) continue;

    for (const mId of masteryIds) {
      const mDef = artDef.masteries.find(m => m.id === mId);
      if (!mDef?.effects) continue;

      // conditionMastery: 지정된 초식이 활성화되어 있어야 효과 적용
      if (mDef.conditionMastery && !masteryIds.includes(mDef.conditionMastery)) continue;

      const eff = mDef.effects;

      if (eff.synergyArtId) {
        const synergyEquipped = equippedArts.includes(eff.synergyArtId) || equippedSimbeop === eff.synergyArtId;
        if (!synergyEquipped) continue;
      }

      if (eff.unlockUlt) result.unlockUlt = true;
      if (eff.bonusCritRate) result.bonusCritRate = (result.bonusCritRate ?? 0) + eff.bonusCritRate;
      if (eff.bonusDodge) result.bonusDodge = (result.bonusDodge ?? 0) + eff.bonusDodge;
      if (eff.bonusDmgReduction) result.bonusDmgReduction = (result.bonusDmgReduction ?? 0) + eff.bonusDmgReduction;
      if (eff.bonusAtkSpeed) result.bonusAtkSpeed = (result.bonusAtkSpeed ?? 0) + eff.bonusAtkSpeed;
      if (eff.bonusRegenPerSec) result.bonusRegenPerSec = (result.bonusRegenPerSec ?? 0) + eff.bonusRegenPerSec;
      if (eff.bonusQiPerSec) result.bonusQiPerSec = (result.bonusQiPerSec ?? 0) + eff.bonusQiPerSec;
      if (eff.bonusCombatQiRatio) result.bonusCombatQiRatio = (result.bonusCombatQiRatio ?? 0) + eff.bonusCombatQiRatio;
      if (eff.normalMultiplierCapIncrease) result.normalMultiplierCapIncrease = (result.normalMultiplierCapIncrease ?? 0) + eff.normalMultiplierCapIncrease;
      if (eff.ultChange) result.ultChange = eff.ultChange;
      if (eff.bonusCritDmg) result.bonusCritDmg = (result.bonusCritDmg ?? 0) + eff.bonusCritDmg;
      if (eff.killBonusEnabled) result.killBonusEnabled = true;
      if (eff.dodgeCounterEnabled) result.dodgeCounterEnabled = true;
      if (eff.bonusHpPercent) result.bonusHpPercent = (result.bonusHpPercent ?? 0) + eff.bonusHpPercent;
      if (eff.bonusCombatQiRatioFlat) result.bonusCombatQiRatioFlat = (result.bonusCombatQiRatioFlat ?? 0) + eff.bonusCombatQiRatioFlat;
      if (eff.bonusQiMultiplier) result.bonusQiMultiplier = (result.bonusQiMultiplier ?? 0) + eff.bonusQiMultiplier;
    }
  }
  return result;
}

// ============================================================
// 심법 전투 기운 해금 확인 (내부 헬퍼)
// ============================================================
function isCombatQiUnlocked(state: GameState): boolean {
  if (!state.equippedSimbeop) return false;
  const artDef = getArtDef(state.equippedSimbeop);
  if (!artDef) return false;
  // baseCombatQiRatio가 art에 직접 설정된 경우 항상 활성
  if (artDef.growth.baseCombatQiRatio != null) return true;
  // 기존 방식: stage 2 초식 해금 여부로 판단
  const masteryIds = state.activeMasteries[state.equippedSimbeop] ?? [];
  return artDef.masteries.some(m => m.stage === 2 && masteryIds.includes(m.id));
}

// ============================================================
// 전투 파생 수치
// ============================================================

/** BASE_CRIT_RATE + bonusCritRate 합산, 캡 적용 */
export function calcCritRate(state: GameState): number {
  const effects = gatherMasteryEffects(state);
  return Math.min(B.BASE_CRIT_RATE + (effects.bonusCritRate ?? 0), B.CRIT_RATE_CAP);
}

/** 스탯 기반 회복 + bonusRegenPerSec 합산 */
export function calcEffectiveRegen(state: GameState): number {
  const effects = gatherMasteryEffects(state);
  const tierMult = calcTierMultiplier(state.tier);
  return calcStaminaRegen(state.stats.gi, tierMult) + (effects.bonusRegenPerSec ?? 0);
}

/** bonusDmgReduction 합산 */
export function calcDmgReduction(state: GameState): number {
  const effects = gatherMasteryEffects(state);
  return effects.bonusDmgReduction ?? 0;
}

/** bonusDodge 합산, DODGE_CAP 적용 */
export function calcDodge(state: GameState): number {
  const effects = gatherMasteryEffects(state);
  return Math.min((effects.bonusDodge ?? 0) / 100, B.DODGE_CAP);
}

/** 기운 생산 속도 (심법 숙련도 기반, 검법 공식의 1/15 구조) */
export function calcQiPerSec(state: GameState): number {
  let total = B.BASE_QI_PER_SEC;

  if (state.equippedSimbeop) {
    const artDef = getArtDef(state.equippedSimbeop);
    if (artDef && artDef.growth.baseQiPerSec != null) {
      const mentalProf = state.proficiency?.mental ?? 1;
      const mentalProfDamage = getProfDamageValue(mentalProf);
      const grown = artDef.growth.baseQiPerSec + Math.floor(artDef.proficiencyCoefficient * mentalProfDamage);
      const capped = Math.min(grown, artDef.growth.maxQiPerSec ?? Infinity);
      total += capped;
    }
  }

  total *= calcTierMultiplier(state.tier);

  return total;
}

/** 전투 중 기운 생산 비율 (2초 해금 후만 활성, bonusCombatQiRatioFlat 적용) */
export function calcCombatQiRatio(state: GameState): number {
  if (!isCombatQiUnlocked(state)) return 0;

  const artDef = state.equippedSimbeop ? getArtDef(state.equippedSimbeop) : null;
  const eff = gatherMasteryEffects(state);

  const ratio = Math.min(
    (artDef?.growth.baseCombatQiRatio ?? B.COMBAT_QI_BASE) + (eff.bonusCombatQiRatioFlat ?? 0),
    artDef?.growth.maxCombatQiRatio ?? B.COMBAT_QI_CAP,
  );

  return ratio;
}

// ============================================================
// 기타 유틸
// ============================================================

/** 장착된 무공 중 ult 가능한 첫 번째의 절초 이름 (ultChange 반영) */
export function getActiveUltName(state: GameState): string {
  for (const artId of state.equippedArts) {
    const artDef = getArtDef(artId);
    if (!artDef?.ultMultiplier) continue;

    const artMasteryIds = state.activeMasteries[artId] ?? [];
    for (const mId of artMasteryIds) {
      const mDef = artDef.masteries.find(m => m.id === mId);
      if (mDef?.effects?.ultChange?.name) return mDef.effects.ultChange.name;
    }
    if (artDef.ultMessages?.[0]) return artDef.ultMessages[0];
  }
  return '절초';
}

/** 장착된 외공(externalDefenseGrade 보유) 무공의 피해 감소율 합산 (0~1) */
export function calcExternalDmgReduction(state: GameState): number {
  let totalPercent = 0;
  const { equippedArts, equippedSimbeop, activeMasteries } = state;
  const allArts = [...equippedArts, ...(equippedSimbeop ? [equippedSimbeop] : [])];
  for (const artId of allArts) {
    const artDef = getArtDef(artId);
    if (!artDef?.externalDefenseGrade) continue;
    if (artDef.baseEffects?.bonusDmgReductionPercent) {
      totalPercent += artDef.baseEffects.bonusDmgReductionPercent;
    }
    const masteryIds = activeMasteries[artId] ?? [];
    for (const mId of masteryIds) {
      const mDef = artDef.masteries.find(m => m.id === mId);
      if (mDef?.effects?.bonusDmgReductionPercent) {
        totalPercent += mDef.effects.bonusDmgReductionPercent;
      }
    }
  }
  return Math.min(totalPercent / 100, 0.99);
}

/** CRITD_BASE + 심득 bonusCritDmg + 장비 bonusCritDmgPercent 합산 */
export function calcCritDamageMultiplier(state: GameState): number {
  const eff = gatherMasteryEffects(state);
  const equipStats = gatherEquipmentStats(state);
  return B.CRITD_BASE + (eff.bonusCritDmg ?? 0) + (equipStats.bonusCritDmgPercent ?? 0) * 100;
}

/** 적 스폰 */
export function spawnEnemy(monDef: MonsterDef): GameState['currentEnemy'] {
  return {
    id: monDef.id,
    hp: monDef.hp,
    maxHp: monDef.hp,
    attackPower: monDef.attackPower,
    attackInterval: monDef.attackInterval,
    regen: monDef.regen,
  };
}
