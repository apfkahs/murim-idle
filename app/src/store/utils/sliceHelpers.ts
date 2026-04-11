/**
 * sliceHelpers.ts — 슬라이스 간 공유 유틸리티
 * artsSlice, progressSlice에서 중복된 calcUsedPoints를 통합.
 */
import { getArtDef, getMasteryDef } from '../../data/arts';
import type { GameState } from '../types';

export function calcUsedPoints(state: GameState): number {
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
