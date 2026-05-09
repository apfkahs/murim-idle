/**
 * oathSlice 단위 테스트
 * 검증 항목: 토글 · 라디오(exclusiveGroup) · 잠금 박제 · 언락 후 미해금 보존
 */
import { resetGame, getState, callAction } from '../src/testAdapter';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

function sameIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sorted = (arr: string[]) => [...arr].sort();
  return sorted(a).every((v, i) => v === sorted(b)[i]);
}

// ─────────────────────────────────────────────
// 0. 초기화
// ─────────────────────────────────────────────
resetGame();

// ─────────────────────────────────────────────
// 1. 기본 토글 ON / OFF
// ─────────────────────────────────────────────
console.log('\n[1] 기본 토글 ON/OFF');

callAction('toggleOath', 'oath_in_1');
assert('oath_in_1 토글 ON', getState().oathSystem.activeOathIds.includes('oath_in_1'));

callAction('toggleOath', 'oath_in_1');
assert('oath_in_1 토글 OFF', !getState().oathSystem.activeOathIds.includes('oath_in_1'));

// 복수 토글
callAction('toggleOath', 'oath_in_1');
callAction('toggleOath', 'oath_out_1');
assert(
  '서로 다른 그룹 동시 활성 가능',
  sameIds(getState().oathSystem.activeOathIds, ['oath_in_1', 'oath_out_1']),
);

// ─────────────────────────────────────────────
// 2. 라디오 동작 (exclusiveGroup)
// ─────────────────────────────────────────────
console.log('\n[2] 라디오 동작 (exclusiveGroup)');

// oath_incoming 그룹: oath_in_1 활성 상태에서 oath_in_2 선택
callAction('toggleOath', 'oath_in_2');
const afterRadio = getState().oathSystem.activeOathIds;
assert('oath_in_2 선택 후 oath_in_1 자동 해제', !afterRadio.includes('oath_in_1'));
assert('oath_in_2 활성', afterRadio.includes('oath_in_2'));

// oath_output 그룹: oath_out_1 활성 상태에서 oath_out_3 선택
callAction('toggleOath', 'oath_out_3');
const afterRadio2 = getState().oathSystem.activeOathIds;
assert('oath_out_3 선택 후 oath_out_1 자동 해제', !afterRadio2.includes('oath_out_1'));
assert('oath_out_3 활성', afterRadio2.includes('oath_out_3'));

// 라디오 OFF (같은 항목 재선택)
callAction('toggleOath', 'oath_out_3');
assert('라디오 항목 재선택 시 OFF', !getState().oathSystem.activeOathIds.includes('oath_out_3'));

// ─────────────────────────────────────────────
// 3. 잠금 박제 — 전투 시작 시 스냅샷 고정
// ─────────────────────────────────────────────
console.log('\n[3] 잠금 박제');

resetGame();
callAction('toggleOath', 'oath_qi_1');
callAction('toggleOath', 'oath_in_1');
const preSnapIds = [...getState().oathSystem.activeOathIds];

// 필드 잠금
callAction('lockOathsForField', 'training');
const lockedState = getState().oathSystem;

assert('lockedAt 설정됨', lockedState.lockedAt !== null);
assert('snapshotIds = 잠금 직전 activeOathIds', sameIds(lockedState.lockedAt!.snapshotIds, preSnapIds));
assert('fieldId 기록', lockedState.lockedAt!.fieldId === 'training');

// 잠금 중 토글 시도 → 무시
callAction('toggleOath', 'oath_qi_2');
assert('잠금 중 toggleOath 무시 (activeOathIds 불변)', sameIds(getState().oathSystem.activeOathIds, preSnapIds));

// 잠금 중 clearAllOaths 시도 → 무시
callAction('clearAllOaths');
assert('잠금 중 clearAllOaths 무시', getState().oathSystem.activeOathIds.length > 0);

// 잠금 중 lockOathsForField 재호출 → 무시
callAction('lockOathsForField', 'yasan');
assert('이중 잠금 시 fieldId 변경 없음', getState().oathSystem.lockedAt!.fieldId === 'training');

// ─────────────────────────────────────────────
// 4. 언락 후 미해금 보존 (activeOathIds 불변)
// ─────────────────────────────────────────────
console.log('\n[4] 언락 후 미해금 보존');

callAction('unlockOaths');
const afterUnlock = getState().oathSystem;

assert('unlockOaths 후 lockedAt = null', afterUnlock.lockedAt === null);
assert('unlockOaths 후 activeOathIds 보존', sameIds(afterUnlock.activeOathIds, preSnapIds));

// 언락 후 다시 토글 가능
callAction('toggleOath', 'oath_qi_1');
assert('언락 후 토글 재활성화', !getState().oathSystem.activeOathIds.includes('oath_qi_1'));

// ─────────────────────────────────────────────
// 5. clearAllOaths (미잠금 상태에서)
// ─────────────────────────────────────────────
console.log('\n[5] clearAllOaths');

callAction('toggleOath', 'oath_qi_1');
callAction('toggleOath', 'oath_out_1');
assert('clearAllOaths 전 맹세 있음', getState().oathSystem.activeOathIds.length > 0);

callAction('clearAllOaths');
assert('clearAllOaths 후 activeOathIds 비어 있음', getState().oathSystem.activeOathIds.length === 0);
assert('clearAllOaths 후 lockedAt = null', getState().oathSystem.lockedAt === null);

// ─────────────────────────────────────────────
// 결과
// ─────────────────────────────────────────────
console.log(`\n결과: ${passed}/${passed + failed} 통과${failed > 0 ? ` (실패 ${failed}개)` : ''}`);
if (failed > 0) process.exit(1);
