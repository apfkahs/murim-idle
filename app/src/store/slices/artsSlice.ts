import type { StateCreator } from 'zustand';
import type { GameStore } from '../gameStore';
import type { GameState } from '../types';
import { getArtDef, getMasteryDef, getMasteryDefsForArt } from '../../data/arts';
import { getArtGradeInfo } from '../../utils/artUtils';

// ── 내부 헬퍼 ──
function calcUsedPoints(state: GameState): number {
  let used = state.equippedArts.reduce((sum, artId) => {
    const def = getArtDef(artId);
    return sum + (def?.cost ?? 0);
  }, 0);

  for (const [artId, mIds] of Object.entries(state.activeMasteries)) {
    for (const mId of mIds) {
      const mDef = getMasteryDef(artId, mId);
      if (mDef) used += mDef.pointCost;
    }
  }

  return used;
}

export type ArtsSlice = {
  // ── state ──
  equippedSimbeop: string | null;
  ownedArts: { id: string; totalSimdeuk: number }[];
  equippedArts: string[];
  artPoints: number;
  artGradeExp: Record<string, number>;
  activeMasteries: Record<string, string[]>;
  discoveredMasteries: string[];
  pendingEnlightenments: { artId: string; masteryId: string; masteryName: string }[];

  // ── actions ──
  equipArt: (artId: string) => void;
  unequipArt: (artId: string) => void;
  equipSimbeop: (artId: string) => void;
  unequipSimbeop: () => void;
  activateMastery: (artId: string, masteryId: string) => void;
  deactivateMastery: (artId: string, masteryId: string) => void;
  resetAllMasteries: () => void;
  dismissEnlightenment: () => void;
};

export const createArtsSlice: StateCreator<GameStore, [], [], ArtsSlice> = (set, get) => ({
  // ── 초기 상태 ──
  equippedSimbeop: null,
  ownedArts: [],
  equippedArts: [],
  artPoints: 3,
  artGradeExp: {},
  activeMasteries: {},
  discoveredMasteries: [],
  pendingEnlightenments: [],

  // ── 액션 ──
  equipArt: (artId) => {
    const state = get() as GameStore;
    if (state.battleMode !== 'none') return;

    const artDef = getArtDef(artId);
    if (!artDef || artDef.artType === 'simbeop') return;

    const owned = state.ownedArts.find(a => a.id === artId);
    if (!owned) return;

    if (state.equippedArts.includes(artId)) return;

    const usedPoints = calcUsedPoints(state);
    if (usedPoints + artDef.cost > state.artPoints) return;

    const newEquipped = [...state.equippedArts, artId];
    const flags = { ...state.tutorialFlags };
    if (artId === 'samjae_sword') flags.equippedSword = true;

    set({
      equippedArts: newEquipped,
      tutorialFlags: flags,
    });
  },

  unequipArt: (artId) => {
    const state = get() as GameStore;
    if (state.battleMode !== 'none') return;
    set({ equippedArts: state.equippedArts.filter(id => id !== artId) });
  },

  equipSimbeop: (artId) => {
    const state = get() as GameStore;
    if (state.battleMode !== 'none') return;

    const artDef = getArtDef(artId);
    if (!artDef || artDef.artType !== 'simbeop') return;

    const owned = state.ownedArts.find(a => a.id === artId);
    if (!owned) return;

    const flags = { ...state.tutorialFlags };
    if (artId === 'samjae_simbeop') flags.equippedSimbeop = true;

    const fieldUnlocksUpdate: Record<string, boolean> = { ...state.fieldUnlocks };
    const totalStats = state.stats.gi + state.stats.sim + state.stats.che;
    if (flags.equippedSword && flags.equippedSimbeop && totalStats >= 10) {
      flags.yasanUnlocked = true;
      fieldUnlocksUpdate.yasan = true;
    }

    set({
      equippedSimbeop: artId,
      tutorialFlags: flags,
      fieldUnlocks: fieldUnlocksUpdate,
    });
  },

  unequipSimbeop: () => {
    const state = get() as GameStore;
    if (state.battleMode !== 'none') return;
    set({ equippedSimbeop: null });
  },

  activateMastery: (artId, masteryId) => {
    const state = get() as GameStore;
    if (state.battleMode !== 'none') return;

    if (!state.equippedArts.includes(artId) && state.equippedSimbeop !== artId) return;

    const owned = state.ownedArts.find(a => a.id === artId);
    if (!owned) return;

    const mDef = getMasteryDef(artId, masteryId);
    if (!mDef) return;

    if (mDef.discovery?.type === 'bijup' || mDef.discovery?.type === 'artStar') return;

    const currentMasteries = state.activeMasteries[artId] ?? [];
    if (currentMasteries.includes(masteryId)) return;

    if (owned.totalSimdeuk < mDef.requiredSimdeuk) return;

    if (mDef.requiredTier > 0 && state.tier < mDef.requiredTier) return;

    if (mDef.requires) {
      for (const reqId of mDef.requires) {
        if (!currentMasteries.includes(reqId)) return;
      }
    }

    const available = state.artPoints - calcUsedPoints(state);
    if (available < mDef.pointCost) return;

    const newActiveMasteries = {
      ...state.activeMasteries,
      [artId]: [...currentMasteries, masteryId],
    };

    set({ activeMasteries: newActiveMasteries });
  },

  deactivateMastery: (artId, masteryId) => {
    const state = get() as GameStore;
    if (state.battleMode !== 'none') return;

    const currentMasteries = state.activeMasteries[artId] ?? [];
    if (!currentMasteries.includes(masteryId)) return;

    const toRemove = new Set<string>();
    toRemove.add(masteryId);

    let changed = true;
    while (changed) {
      changed = false;
      const allMasteries = getMasteryDefsForArt(artId);
      for (const mDef of allMasteries) {
        if (toRemove.has(mDef.id)) continue;
        if (!currentMasteries.includes(mDef.id)) continue;
        if (mDef.requires && mDef.requires.some(r => toRemove.has(r))) {
          toRemove.add(mDef.id);
          changed = true;
        }
      }
    }

    const newMasteries = currentMasteries.filter(id => !toRemove.has(id));
    const newActiveMasteries = { ...state.activeMasteries };
    if (newMasteries.length === 0) {
      delete newActiveMasteries[artId];
    } else {
      newActiveMasteries[artId] = newMasteries;
    }

    set({ activeMasteries: newActiveMasteries });
  },

  resetAllMasteries: () => {
    const state = get() as GameStore;
    if (state.battleMode !== 'none') return;
    set({ activeMasteries: {} });
  },

  dismissEnlightenment: () => {
    const state = get() as GameStore;
    set({ pendingEnlightenments: state.pendingEnlightenments.slice(1) });
  },
});
