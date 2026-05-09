/**
 * oathSlice — 맹세(盟誓) 시스템 상태 관리
 *
 * - 마을에서 자유 토글 (exclusiveGroup 라디오 동작)
 * - 필드 진입 시 스냅샷 잠금 (전투 중 변경 불가)
 * - 보상 계산은 snapshotIds 기준
 */
import type { StateCreator } from 'zustand';
import type { GameStore } from '../gameStore';
import type { GameState, OathSystemState } from '../types';
import { getOathDef } from '../../data/oaths';
import { getFieldDef } from '../../data/fields';

export type OathSlice = {
  // ── state ──
  oathSystem: OathSystemState;

  // ── actions ──
  toggleOath: (oathId: string) => void;
  lockOathsForField: (fieldId: string) => void;
  unlockOaths: () => void;
  clearAllOaths: () => void;
};

export const createOathSlice: StateCreator<GameStore, [], [], OathSlice> = (set, get) => ({
  oathSystem: { activeOathIds: [], lockedAt: null },

  toggleOath: (oathId) => {
    const { oathSystem } = get() as GameStore;
    if (oathSystem.lockedAt !== null) return;

    const def = getOathDef(oathId);
    if (!def) return;

    const active = oathSystem.activeOathIds;
    if (active.includes(oathId)) {
      set({ oathSystem: { ...oathSystem, activeOathIds: active.filter(id => id !== oathId) } });
    } else {
      // exclusiveGroup: 같은 그룹 기존 선택 해제 (라디오 동작)
      let next = active;
      if (def.exclusiveGroup) {
        next = next.filter(id => getOathDef(id)?.exclusiveGroup !== def.exclusiveGroup);
      }
      set({ oathSystem: { ...oathSystem, activeOathIds: [...next, oathId] } });
    }
  },

  lockOathsForField: (fieldId) => {
    const { oathSystem } = get() as GameStore;
    if (oathSystem.lockedAt !== null) return;
    set({
      oathSystem: {
        ...oathSystem,
        lockedAt: {
          fieldId,
          lockedAtTimestamp: Date.now(),
          snapshotIds: [...oathSystem.activeOathIds],
        },
      },
    });
  },

  unlockOaths: () => {
    const { oathSystem } = get() as GameStore;
    if (oathSystem.lockedAt === null) return;
    set({ oathSystem: { ...oathSystem, lockedAt: null } });
  },

  clearAllOaths: () => {
    const state = get() as GameStore;
    if (state.battleMode !== 'none') return;          // 마을에서만 (스펙 4-3)
    if (state.oathSystem.lockedAt !== null) return;   // 잠금 중 거부 (이중 가드)
    set({ oathSystem: { activeOathIds: [], lockedAt: null } });
  },
});

// ─────────────────────────────────────────────
// 셀렉터 (slice 외부에서 호출 — combatSlice/saveSlice 가드용)
// ─────────────────────────────────────────────

/**
 * 해당 필드에서 맹세 시스템이 활성화될 수 있는가.
 * 스펙 4-1: 보스가 정의된 필드 + 해당 보스 처치 기록 1회 이상.
 */
export function isOathEnabledInField(
  fieldId: string,
  state: Pick<GameState, 'bossKillCounts'>,
): boolean {
  const f = getFieldDef(fieldId);
  if (!f?.boss) return false;
  return (state.bossKillCounts[f.boss] ?? 0) > 0;
}
