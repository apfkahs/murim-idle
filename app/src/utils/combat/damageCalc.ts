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
