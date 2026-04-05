/**
 * B-2: 타입 중앙화 — 각 data 파일과 store에서 re-export
 * 컴포넌트는 이 파일에서 타입을 가져올 수 있다.
 */

// 게임 스토어 타입
export type {
  GameState, BattleResult, FloatingText, OfflineResult, SaveMeta, InventoryItem,
} from '../store/types';

export type { GameStore } from '../store/gameStore';
export type { CombatSlice } from '../store/slices/combatSlice';
export type { ArtsSlice } from '../store/slices/artsSlice';
export type { ProgressSlice } from '../store/slices/progressSlice';
export type { InventorySlice } from '../store/slices/inventorySlice';
export type { SaveSlice } from '../store/slices/saveSlice';

// 데이터 타입
export type { ArtDef, MasteryDef, MasteryEffects, ProficiencyType } from '../data/arts';
export type { MonsterDef } from '../data/monsters';
export type { EquipSlot, EquipStats, EquipmentInstance } from '../data/equipment';

// 아트 유틸 타입
export type { ArtGradeInfo, ProfStarInfo } from '../utils/artUtils';
