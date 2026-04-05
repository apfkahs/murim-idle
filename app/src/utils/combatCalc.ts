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
};

// ============================================================
// 기본 수치 계산
// ============================================================

/** CRIT_DMG = CRITD_BASE (고정값, 스탯 무관) */
export function calcCritDmg(): number {
  return B.CRITD_BASE;
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
  }

  for (const [artId, masteryIds] of Object.entries(activeMasteries)) {
    const artDef = getArtDef(artId);
    if (!artDef) continue;
    const isEquipped = equippedArts.includes(artId) || equippedSimbeop === artId;
    if (!isEquipped) continue;

    for (const mId of masteryIds) {
      const mDef = artDef.masteries.find(m => m.id === mId);
      if (!mDef?.effects) continue;
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
      if (eff.killBonusEnabled) result.killBonusEnabled = true;
      if (eff.dodgeCounterEnabled) result.dodgeCounterEnabled = true;
    }
  }
  return result;
}

// ============================================================
// 심법 2초(전투 수련) 해금 확인 (내부 헬퍼)
// ============================================================
function isCombatQiUnlocked(state: GameState): boolean {
  if (!state.equippedSimbeop) return false;
  const masteryIds = state.activeMasteries[state.equippedSimbeop] ?? [];
  const artDef = getArtDef(state.equippedSimbeop);
  if (!artDef) return false;
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

/** 기운 생산 속도 (심법 심득 성장분 + bonusQiPerSec + 경지 배율) */
export function calcQiPerSec(state: GameState): number {
  let total = B.BASE_QI_PER_SEC;

  if (state.equippedSimbeop) {
    const artDef = getArtDef(state.equippedSimbeop);
    const owned = state.ownedArts.find(a => a.id === state.equippedSimbeop);
    if (artDef && owned && artDef.growth.baseQiPerSec != null) {
      const rate = artDef.growth.qiGrowthRate ?? B.QI_GROWTH_RATE;
      const grown = artDef.growth.baseQiPerSec + rate * Math.sqrt(owned.totalSimdeuk);
      const capped = Math.min(grown, artDef.growth.maxQiPerSec ?? Infinity);
      const mentalProf = state.proficiency?.mental ?? 1;
      const profMult = 1 + getProfDamageValue(mentalProf) * B.PROF_QI_SCALE;
      total += capped * profMult;
    }
  }

  const effects = gatherMasteryEffects(state);
  total += effects.bonusQiPerSec ?? 0;
  total *= calcTierMultiplier(state.tier);

  return total;
}

/** 전투 중 기운 생산 비율 (2초 해금 후만 활성) */
export function calcCombatQiRatio(state: GameState): number {
  if (!isCombatQiUnlocked(state)) return 0;

  const artDef = state.equippedSimbeop ? getArtDef(state.equippedSimbeop) : null;
  const owned = state.equippedSimbeop ? state.ownedArts.find(a => a.id === state.equippedSimbeop) : null;

  let ratio = B.COMBAT_QI_BASE;
  if (artDef && owned) {
    const rate = artDef.growth.combatQiGrowthRate ?? B.COMBAT_QI_GROWTH_RATE;
    ratio = (artDef.growth.baseCombatQiRatio ?? B.COMBAT_QI_BASE) + rate * Math.sqrt(owned.totalSimdeuk);
  }
  const cap = artDef?.growth.maxCombatQiRatio ?? B.COMBAT_QI_CAP;
  ratio = Math.min(ratio, cap);

  const effects = gatherMasteryEffects(state);
  ratio += effects.bonusCombatQiRatio ?? 0;

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
