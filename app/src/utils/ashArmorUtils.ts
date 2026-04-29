/**
 * 재의 갑옷(ash_armor) — 강화 단계 + 불씨 스택 5+ 일 때만 발동하는 동적 피해 감소.
 *
 * 정적 stats(bonusFixedDmgReduction / bonusHpPercent)는 EQUIPMENT.enhanceSteps 에서 관리.
 * 본 모듈은 추가 곱연산 피해감소(0~8%)만 책임진다. 적용은 applyIncomingDamage 안.
 */
import type { GameState } from '../store/types';
import { getEmberStacks } from './combat/emberUtils';

export const ASH_ARMOR_ID = 'ash_armor';
export const ASH_ARMOR_EMBER_THRESHOLD = 5;

// 강화 단계별 추가 피해감소율 (+0/+1 = 0, +2 = 3%, +3 = 4%, +4 = 6%, +5 = 8%)
const REDUCTION_BY_ENHANCE = [0, 0, 0.03, 0.04, 0.06, 0.08];

/**
 * 현재 ctx 기준 재의 갑옷 추가 피해감소 비율 (0~0.08).
 * 갑옷이 ash_armor가 아니거나 불씨 스택 < 5 이면 0.
 */
export function getAshArmorEmberReduction(state: Partial<GameState>): number {
  const inst = state.equipment?.armor;
  if (!inst || inst.defId !== ASH_ARMOR_ID) return 0;
  const stacks = getEmberStacks(state.bossPatternState?.playerDotStacks);
  if (stacks < ASH_ARMOR_EMBER_THRESHOLD) return 0;
  const enhanceLevel = inst.enhanceLevel ?? 0;
  return REDUCTION_BY_ENHANCE[enhanceLevel] ?? 0;
}
