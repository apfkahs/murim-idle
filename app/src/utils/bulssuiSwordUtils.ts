/**
 * 불씨의 검(bulssui_sword) — 강화 단계별 정적 스탯 + 불씨 스택 기반 동적 ATK 보너스
 *
 * 강화 단계 0~5 (5단계 강화). 각 단계의 정적 스탯은 EQUIPMENT.enhanceSteps 에서 관리.
 * 동적 ATK 보너스 = (perStack × emberStacks) × 기본 ATK. emberStacks 는
 * bossPatternState.playerDotStacks 의 ember 엔트리. 미장착/미발생 시 0.
 */
import type { GameState } from '../store/types';
import type { EquipStats } from '../data/equipment';
import { getEquipmentDef } from '../data/equipment';
import { getEmberStacks } from './combat/emberUtils';

export const BULSSUI_SWORD_ID = 'bulssui_sword';

// 강화 단계별 불씨 스택 1개당 ATK 비율 (+0/+1 = 0, +2~+5 = 1%~3%)
const EMBER_ATK_RATE_PER_STACK = [0, 0, 0.01, 0.015, 0.02, 0.03];

/** 강화 단계 + 현재 불씨 스택 기준 추가 ATK 보너스 비율 */
export function getBulssuiSwordEmberAtkBonusRate(
  enhanceLevel: number,
  emberStacks: number,
): number {
  if (emberStacks <= 0) return 0;
  const rate = EMBER_ATK_RATE_PER_STACK[enhanceLevel] ?? 0;
  return rate * emberStacks;
}

/**
 * 불씨의 검 동적 스탯. 정적 stats 위에 ember 보너스 ATK 만 추가 가산.
 * gatherEquipmentStats 에서 BULSSUI_SWORD_ID 인 무기 슬롯에 한해 호출되어 정적 스탯과 합산된다.
 */
export function getBulssuiSwordEmberBonus(state: Partial<GameState>): EquipStats {
  const inst = state.equipment?.weapon;
  if (!inst || inst.defId !== BULSSUI_SWORD_ID) return {};
  const def = getEquipmentDef(BULSSUI_SWORD_ID);
  if (!def) return {};
  const enhanceLevel = inst.enhanceLevel ?? 0;
  const baseStats = (enhanceLevel > 0 && def.enhanceSteps && def.enhanceSteps[enhanceLevel - 1])
    ? def.enhanceSteps[enhanceLevel - 1].stats
    : def.stats;
  const baseAtk = baseStats.bonusAtk ?? 0;
  const emberStacks = getEmberStacks(state.bossPatternState?.playerDotStacks);
  const rate = getBulssuiSwordEmberAtkBonusRate(enhanceLevel, emberStacks);
  if (rate <= 0) return {};
  return { bonusAtk: Math.floor(baseAtk * rate) };
}
