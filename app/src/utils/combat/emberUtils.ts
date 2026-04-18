/**
 * emberUtils.ts — 배화교 행자 "불씨(魂焰)" 스택 유틸
 *
 * 불씨는 플레이어에 누적되는 지속 스택 디버프:
 *  - 1스택당 출력 피해 -5% (상한 100%)
 *  - 1스택당 공속 -5% (상한 80%, interval 증가)
 *  - 시간 감쇠 없음 (noDecay)
 *  - 답파 모드: 답파 시작 시 0, 답파 종료까지 유지
 *  - 사냥 모드: 매 전투 시작 시 0, 전투 종료 시 소멸
 */
import type { DotStackEntry } from '../../store/types';

const EMBER_ID = 'ember';

export const EMBER_DEFAULTS = {
  outDamageReductionPerStack: 0.05,
  atkSpeedReductionPerStack: 0.05,
  maxOutDamageReduction: 1.0,
  maxAtkSpeedReduction: 0.8,
  attackDamageBonusPerStack: 0.5,
};

export const DEFAULT_EMBER_ATTACK_LOGS: string[] = [
  '*상대의 손끝이 당신의 몸에 남은 불씨를 건드린다. 불꽃이 되살아난다.*',
  '*당신의 살갗 위 불씨가 다시 타오른다.*',
  '*꺼져가던 불씨가 상대의 숨결에 살아난다. 당신의 몸을 조금씩 갉아먹는다.*',
];

/** bossPatternState.playerDotStacks에서 ember 스택 수 조회 (없으면 0) */
export function getEmberStacks(
  dots: DotStackEntry[] | undefined | null,
): number {
  if (!dots) return 0;
  const entry = dots.find(d => d.id === EMBER_ID);
  return entry?.stacks ?? 0;
}

/** ember 엔트리 찾기 */
export function getEmberEntry(
  dots: DotStackEntry[] | undefined | null,
): DotStackEntry | undefined {
  if (!dots) return undefined;
  return dots.find(d => d.id === EMBER_ID);
}

/** ember 엔트리 신규 생성 */
function createEmberEntry(stacks: number): DotStackEntry {
  return {
    id: EMBER_ID,
    type: 'ember',
    damagePerTick: 0,
    damagePerStack: 0,
    stacks,
    maxStacks: 999,
    remainingSec: Number.MAX_SAFE_INTEGER,
    totalDuration: Number.MAX_SAFE_INTEGER,
    outDamageReductionPerStack: EMBER_DEFAULTS.outDamageReductionPerStack,
    atkSpeedReductionPerStack: EMBER_DEFAULTS.atkSpeedReductionPerStack,
    maxOutDamageReduction: EMBER_DEFAULTS.maxOutDamageReduction,
    maxAtkSpeedReduction: EMBER_DEFAULTS.maxAtkSpeedReduction,
    noDecay: true,
  };
}

/** 평타 보너스 배율 계산 (몬스터 무관) */
export function getEmberAttackBonusMult(
  dots: DotStackEntry[] | undefined | null,
): number {
  const stacks = getEmberStacks(dots);
  if (stacks <= 0) return 1;
  return 1 + stacks * EMBER_DEFAULTS.attackDamageBonusPerStack;
}

/**
 * playerDotStacks 배열에 ember 스택을 delta만큼 추가/갱신하여 새 배열 반환
 * 기존 엔트리가 있으면 stacks += delta, 없으면 신규 push
 */
export function applyEmberStack(
  dots: DotStackEntry[] | undefined | null,
  delta: number,
): DotStackEntry[] {
  const base = dots ? [...dots] : [];
  const idx = base.findIndex(d => d.id === EMBER_ID);
  if (idx >= 0) {
    const existing = base[idx];
    base[idx] = { ...existing, stacks: existing.stacks + delta };
  } else {
    base.push(createEmberEntry(delta));
  }
  return base;
}

/** playerDotStacks에서 ember 엔트리만 제거 (전투 리셋용) */
export function removeEmberStacks(
  dots: DotStackEntry[] | undefined | null,
): DotStackEntry[] {
  if (!dots) return [];
  return dots.filter(d => d.id !== EMBER_ID);
}

/** 출력 피해 감소 배율 (× max(0, 1 - min(cap, stacks × perStack))) */
export function getEmberOutDamageMultiplier(entry: DotStackEntry | undefined): number {
  if (!entry) return 1;
  const per = entry.outDamageReductionPerStack ?? 0;
  const cap = entry.maxOutDamageReduction ?? 1;
  const reduction = Math.min(cap, entry.stacks * per);
  return Math.max(0, 1 - reduction);
}

/** 공속 감소 배율 (interval 증가 곱: 1 + min(cap, stacks × perStack)) */
export function getEmberAtkSpeedPenaltyMult(entry: DotStackEntry | undefined): number {
  if (!entry) return 1;
  const per = entry.atkSpeedReductionPerStack ?? 0;
  const cap = entry.maxAtkSpeedReduction ?? 0.8;
  const penalty = Math.min(cap, entry.stacks * per);
  return 1 + penalty;
}
