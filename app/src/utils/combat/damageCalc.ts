/**
 * damageCalc.ts — 순수 데미지 계산 함수 및 전투 관련 헬퍼
 * gameLoop.ts에서 분리. 순환 의존성 없음.
 */
import { BALANCE_PARAMS } from '../../data/balance';
import { getMonsterDef } from '../../data/monsters';
import { getMaxSimdeuk } from '../../data/tiers';
import { ACHIEVEMENTS, type AchievementContext } from '../../data/achievements';
import type { GameState } from '../../store/types';

const B = BALANCE_PARAMS;

// ── 상수 ──
export const PROF_LABEL: Record<string, string> = {
  sword: '검법', palm: '장법', footwork: '보법', mental: '심법', fist: '권법',
};

const GROWTH_MESSAGES = {
  power: [
    '어렴풋이 더 효율적으로 공격할 수 있게 된 것 같다..',
    '일격에 실리는 힘이 전보다 묵직하게 느껴진다..',
  ],
  qi: [
    '기운이 모이는 속도가 조금 늘어난 것 같다..',
    '단전에 기운이 더 자연스럽게 모여든다..',
  ],
} as const;

export function pickGrowthMsg(stat: keyof typeof GROWTH_MESSAGES): string {
  const pool = GROWTH_MESSAGES[stat];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── 데미지 헬퍼 ──
/** 데미지에 ±10% 분산 적용 */
export function applyVariance(value: number): number {
  return value * (0.9 + Math.random() * 0.2);
}

/** 플레이어 공격 데미지 */
export function calcAttackDamage(
  baseDmg: number, profCoeff: number, profVal: number,
  gradeMult: number, bonusAtk: number,
): number {
  return applyVariance((baseDmg + Math.floor(profCoeff * profVal) + bonusAtk) * gradeMult);
}

/** 적 공격 데미지 */
export function calcEnemyDamage(
  atkPower: number, mult: number, dmgReduction: number,
  fixedDmg?: number,
  fixedDmgReduction?: number,
  externalDmgReduction?: number,
): number {
  if (fixedDmg != null) return fixedDmg;
  const raw = Math.floor(applyVariance(atkPower) * mult * (1 - dmgReduction / 100) * (1 - (externalDmgReduction ?? 0)));
  return Math.max(0, raw - (fixedDmgReduction ?? 0));
}

// ── 전투 보조 ──
export function getTrainingSimdeuk(state: GameState, monsterId: string): number {
  if ((state.killCounts[monsterId] ?? 0) > 0) return 0;
  const mon = getMonsterDef(monsterId);
  return mon?.simdeuk ?? 0;
}

export function buildAchievementContext(
  state: GameState & { totalKills?: number },
): AchievementContext {
  const artSimdeuks: Record<string, number> = {};
  for (const a of state.ownedArts) artSimdeuks[a.id] = a.totalSimdeuk;
  return {
    killCounts: state.killCounts,
    bossKillCounts: state.bossKillCounts,
    ownedArts: state.ownedArts.map(a => a.id),
    artSimdeuks,
    totalStats: state.stats.gi + state.stats.sim + state.stats.che,
    totalSimdeuk: state.totalSimdeuk,
    tier: state.tier,
    achievements: state.achievements,
    hiddenRevealedInField: state.hiddenRevealedInField,
    fieldUnlocks: state.fieldUnlocks,
    totalKills: state.totalKills ?? 0,
  };
}

export function applySimdeuk(
  ownedArts: GameState['ownedArts'],
  equippedArts: string[],
  equippedSimbeop: string | null,
  amount: number,
  tier: number,
  battleLog: string[],
) {
  if (amount <= 0) return;
  const maxSd = getMaxSimdeuk(tier);
  const allEquipped = [...equippedArts];
  if (equippedSimbeop) allEquipped.push(equippedSimbeop);
  for (const artId of allEquipped) {
    const owned = ownedArts.find(a => a.id === artId);
    if (!owned) continue;
    if (owned.totalSimdeuk >= maxSd) continue;
    const before = owned.totalSimdeuk;
    owned.totalSimdeuk = Math.min(owned.totalSimdeuk + amount, maxSd);
    if (owned.totalSimdeuk > before && Math.random() < 0.1) {
      battleLog.push(pickGrowthMsg('power'));
    }
  }
}

export { ACHIEVEMENTS, B };
