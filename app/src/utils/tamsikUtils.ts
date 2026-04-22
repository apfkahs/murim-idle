/**
 * 탐식하는 불꽃(tamsik_bulggot_weapon) 동적 스탯 & 스택 유틸
 *
 * 스택 구성:
 *  - tamsikKillStacks: Record<monsterId, number> — 배화교 몬스터별 처치 카운트 (각 20,000 cap)
 *  - tamsikEmberStacks: number — 잔불 강화 스택 (cap 없음)
 * 총합 cap 100,000.
 *
 * partial state 폴백: saveSlice.ts:216의 gatherEquipmentStats가
 * equipment 필드만 세팅된 객체를 캐스팅해 호출한다. tamsikKillStacks/
 * tamsikEmberStacks 접근 시 `undefined` → NaN 발생을 막기 위해 각 필드에 `?? {}` / `?? 0` 폴백을 적용한다.
 */
import type { GameState } from '../store/types';
import type { EquipStats } from '../data/equipment';

export const TAMSIK_WEAPON_ID = 'tamsik_bulggot_weapon';

export const TAMSIK_TOTAL_STACK_CAP = 100_000;
export const TAMSIK_PER_MONSTER_CAP = 20_000;
export const TAMSIK_EMBER_PER_JANBUL = 5;

export const TAMSIK_BAEHWA_MONSTER_IDS = [
  'baehwa_haengja',
  'baehwa_howi',
  'baehwa_geombosa',
  'baehwa_hwabosa',
  'baehwa_gyeongbosa',
] as const;

export interface TamsikStackInfo {
  killStacksSum: number;
  emberStacks: number;
  totalStacks: number;      // min(TAMSIK_TOTAL_STACK_CAP, killStacksSum + emberStacks)
  remainingCapacity: number; // TAMSIK_TOTAL_STACK_CAP - totalStacks (이월 허용 분)
}

export function getTamsikTotalStacks(state: Partial<GameState>): TamsikStackInfo {
  const killStacks = state.tamsikKillStacks ?? {};
  const emberStacks = state.tamsikEmberStacks ?? 0;
  let killSum = 0;
  for (const v of Object.values(killStacks)) killSum += v;
  const combined = killSum + emberStacks;
  const totalStacks = Math.min(TAMSIK_TOTAL_STACK_CAP, combined);
  return {
    killStacksSum: killSum,
    emberStacks,
    totalStacks,
    remainingCapacity: Math.max(0, TAMSIK_TOTAL_STACK_CAP - totalStacks),
  };
}

/**
 * 탐식하는 불꽃 현재 실효 스탯 (선형 보간).
 * progress = totalStacks / 100000
 *  - bonusAtk:           100 → 300
 *  - bonusCritRate:      0.05 → 0.15 (소수)
 *  - bonusCritDmgPercent: 0.10 → 0.30 (소수)
 */
export function getTamsikWeaponStats(state: Partial<GameState>): EquipStats {
  const info = getTamsikTotalStacks(state);
  const progress = info.totalStacks / TAMSIK_TOTAL_STACK_CAP;
  return {
    bonusAtk: 100 + 200 * progress,
    bonusCritRate: 0.05 + 0.10 * progress,
    bonusCritDmgPercent: 0.10 + 0.20 * progress,
  };
}

/** 배화교 몬스터 id 여부 */
export function isBaehwaMonster(monId: string): boolean {
  return monId.startsWith('baehwa_');
}
