import type { DotStackEntry } from '../../store/types';

const DRUZE_ID = 'druze';
const ABSOLUTE_ID = 'absolute_discipline';

/**
 * 드루즈 단죄 DoT 적용 — 기존 엔트리를 완전히 덮어씀 (스냅샷 고정 시맨틱).
 * damagePerTick: 발동 시점 스냅샷 값 (이후 스택 변동과 무관).
 */
export function applyDruzeSnapshot(
  dots: DotStackEntry[],
  damagePerTick: number,
  durationSec: number,
): DotStackEntry[] {
  const filtered = dots.filter(d => d.id !== DRUZE_ID);
  filtered.push({
    id: DRUZE_ID,
    type: 'druze',
    damagePerTick,
    damagePerStack: 0,
    stacks: 1,
    maxStacks: 1,
    remainingSec: durationSec,
    totalDuration: durationSec,
  });
  return filtered;
}

/** 드루즈 단죄 DoT 제거 */
export function clearDruze(dots: DotStackEntry[]): DotStackEntry[] {
  return dots.filter(d => d.id !== DRUZE_ID);
}

/**
 * 절대 규율 DoT 적용 — 경보사 절대 규율용. 드루즈 단죄와 별도 id 로 동시 존재 가능.
 * 내부 type 은 'druze' 재사용 (gameLoop 의 DoT 틱 적용 로직 그대로 활용).
 * 기존 절대 규율 엔트리는 새 스냅샷으로 덮어씀.
 */
export function applyAbsoluteSnapshot(
  dots: DotStackEntry[],
  damagePerTick: number,
  durationSec: number,
): DotStackEntry[] {
  const filtered = dots.filter(d => d.id !== ABSOLUTE_ID);
  filtered.push({
    id: ABSOLUTE_ID,
    type: 'druze',
    damagePerTick,
    damagePerStack: 0,
    stacks: 1,
    maxStacks: 1,
    remainingSec: durationSec,
    totalDuration: durationSec,
  });
  return filtered;
}

/** 절대 규율 DoT 제거 */
export function clearAbsolute(dots: DotStackEntry[]): DotStackEntry[] {
  return dots.filter(d => d.id !== ABSOLUTE_ID);
}

// ============================================================
// 외문수좌 — 성화 화상 DoT (드루즈와 동일한 스냅샷 시맨틱, 별도 id)
// ============================================================
const OEMUN_BURN_ID = 'oemun_burn';

/**
 * 외문수좌 성화 화상 DoT 적용 — 드루즈/절대 규율과 동일하게 type 'druze' 재사용 (gameLoop 틱 분기).
 * 기존 oemun_burn 엔트리는 새 스냅샷으로 덮어씀.
 * damagePerTick 은 발동 시점 스냅샷 (이후 스택/공격력 변동과 무관).
 */
export function applyOemunBurnSnapshot(
  dots: DotStackEntry[],
  damagePerTick: number,
  durationSec: number,
): DotStackEntry[] {
  const filtered = dots.filter(d => d.id !== OEMUN_BURN_ID);
  filtered.push({
    id: OEMUN_BURN_ID,
    type: 'druze',
    damagePerTick,
    damagePerStack: 0,
    stacks: 1,
    maxStacks: 1,
    remainingSec: durationSec,
    totalDuration: durationSec,
  });
  return filtered;
}

/** 외문수좌 성화 화상 DoT 제거 */
export function clearOemunBurn(dots: DotStackEntry[]): DotStackEntry[] {
  return dots.filter(d => d.id !== OEMUN_BURN_ID);
}
