/**
 * damageCalc.ts — 순수 데미지 계산 함수 및 전투 관련 헬퍼
 * gameLoop.ts에서 분리. 순환 의존성 없음.
 */
import { BALANCE_PARAMS } from '../../data/balance';
import { ACHIEVEMENTS, type AchievementContext } from '../../data/achievements';
import type { GameState } from '../../store/types';

const B = BALANCE_PARAMS;

// ── 상수 ──
export const PROF_LABEL: Record<string, string> = {
  sword: '검법', palm: '장법', footwork: '보법', mental: '심법', fist: '권법',
};

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

/**
 * 동일 variance 샘플로 base/total을 동시 계산하여
 * 보너스 기여분(bonusPortion)을 정확히 산출한다.
 * - base:  baseMult × varied 피해
 * - total: baseMult × bonusMult × varied 피해
 * - bonusPortion = total - base
 */
export function calcEnemyDamageWithBonus(
  atkPower: number, baseMult: number, bonusMult: number,
  dmgReduction: number,
  fixedDmgReduction: number,
  externalDmgReduction: number,
): { total: number; bonusPortion: number } {
  const varied = atkPower * (0.9 + Math.random() * 0.2);
  const reducer = (1 - dmgReduction / 100) * (1 - externalDmgReduction);
  const baseRaw = Math.floor(varied * baseMult * reducer);
  const totalRaw = Math.floor(varied * baseMult * bonusMult * reducer);
  const base = Math.max(0, baseRaw - fixedDmgReduction);
  const total = Math.max(0, totalRaw - fixedDmgReduction);
  return { total, bonusPortion: total - base };
}

// ── 전투 보조 ──
export function buildAchievementContext(
  state: GameState & { totalKills?: number },
): AchievementContext {
  return {
    killCounts: state.killCounts,
    bossKillCounts: state.bossKillCounts,
    ownedArts: state.ownedArts.map(a => a.id),
    totalStats: state.stats.gi + state.stats.sim + state.stats.che,
    proficiency: state.proficiency,
    tier: state.tier,
    achievements: state.achievements,
    hiddenRevealedInField: state.hiddenRevealedInField,
    fieldUnlocks: state.fieldUnlocks,
    totalKills: state.totalKills ?? 0,
    repeatableAchCounts: state.repeatableAchCounts ?? {},
  };
}

export { ACHIEVEMENTS, B };
