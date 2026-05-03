/**
 * 무림 방치록 v4.0 — 게임 스토어 (Zustand)
 * 슬라이스 패턴으로 분리된 스토어. 슬라이스를 조합하여 GameStore를 구성한다.
 */
import { create } from 'zustand';
import { createCombatSlice, type CombatSlice } from './slices/combatSlice';
import { createArtsSlice, type ArtsSlice } from './slices/artsSlice';
import { createProgressSlice, type ProgressSlice } from './slices/progressSlice';
import { createInventorySlice, type InventorySlice } from './slices/inventorySlice';
import { createSaveSlice, type SaveSlice } from './slices/saveSlice';
import { createBahwagyoSlice, type BahwagyoSlice } from './slices/bahwagyoSlice';
import { simulateTick } from '../utils/gameLoop';
import { calcPlayerAttackInterval } from '../utils/combatCalc';

// ============================================================
// GameStore 타입 조합
// ============================================================
export type GameStore = CombatSlice & ArtsSlice & ProgressSlice & InventorySlice & SaveSlice & BahwagyoSlice & {
  tick: (forceDt?: number) => void;
  setGameSpeed: (speed: number) => void;
  setPaused: (paused: boolean) => void;
  getAttackInterval: () => number;
};

// ============================================================
// Zustand 스토어 생성
// ============================================================
export const useGameStore = create<GameStore>()((...args) => ({
  ...createCombatSlice(...args),
  ...createArtsSlice(...args),
  ...createProgressSlice(...args),
  ...createInventorySlice(...args),
  ...createSaveSlice(...args),
  ...createBahwagyoSlice(...args),

  // ─── 루트 레벨 액션 ───
  setGameSpeed: (speed: number) => {
    args[0]({ gameSpeed: speed });
  },

  setPaused: (paused: boolean) => {
    args[0]({ paused });
  },

  getAttackInterval: () => {
    const state = args[1]() as GameStore;
    return calcPlayerAttackInterval(state);
  },

  tick: (forceDt?: number) => {
    args[0](state => {
      const s = state as GameStore;
      if (s.paused && forceDt === undefined) {
        return { lastTickTime: Math.max(s.lastTickTime, Date.now()) };
      }
      let dt: number;
      let now: number;
      if (forceDt !== undefined) {
        dt = forceDt;
        now = s.lastTickTime + forceDt * 1000;
      } else {
        now = Math.max(s.lastTickTime, Date.now());
        const rawDt = (now - s.lastTickTime) / 1000;
        dt = Math.min(rawDt * s.gameSpeed, 5);
        if (dt < 0.05) return { lastTickTime: now };
      }
      const changes = simulateTick(s, dt, false);
      return { ...changes, lastTickTime: now };
    });
  },
}));

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as unknown as { __gameStore?: typeof useGameStore }).__gameStore = useGameStore;
}

// ============================================================
// 타입 re-export (기존 import 경로 유지)
// ============================================================
export type {
  GameState, GameActions, BattleResult, FloatingText, OfflineResult, SaveMeta, InventoryItem,
} from './types';

// 함수 re-export (컴포넌트가 gameStore에서 직접 import하는 것들)
export {
  // artUtils
  getArtCurrentGrade, getArtDamageMultiplier, getMaxEquippedArtGrade,
  getArtGradeInfo, getProfStarInfo, getProfDamageValue, getProficiencyGrade,
  getMonsterRevealLevel, PROF_TABLE, ART_GRADE_TABLE, PROF_STAGES,
  buildCustomGradeTable, getGradeTableForArt, getArtGradeInfoFromTable,
  type ArtGradeInfo, type ProfStarInfo,
} from '../utils/artUtils';

export {
  // combatCalc
  calcMaxHp, calcStamina, calcStaminaRegen, calcEffectiveRegen,
  calcQiPerSec, calcCombatQiRatio, gatherMasteryEffects, gatherEquipmentStats,
  spawnEnemy, calcCritRate, calcDodge, calcDmgReduction, calcCritDmg,
  calcCritDamageMultiplier, calcTierMultiplier, getActiveUltName, CLEAR_BATTLE_STATE,
} from '../utils/combatCalc';

// GameActions는 슬라이스 타입들의 합집합으로 교체되었으므로 빈 인터페이스로 re-export
// (기존 코드 호환성 유지: type GameActions는 사용되지 않으므로 타입 별칭으로 선언)
export type GameActions = Omit<GameStore, keyof import('./types').GameState>;

// createInitialState re-export (testAdapter 등에서 사용할 경우 대비)
export { createInitialState } from './initialState';
