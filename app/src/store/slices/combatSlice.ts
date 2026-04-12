import type { StateCreator } from 'zustand';
import type { GameStore } from '../gameStore';
import type { BattleResult, FloatingText, GameState } from '../types';
import { BALANCE_PARAMS } from '../../data/balance';
import { getMonsterDef } from '../../data/monsters';
import { BOSS_PATTERNS } from '../../data/monsters';
import { getFieldDef, generateExploreOrder } from '../../data/fields';
import { spawnEnemy, CLEAR_BATTLE_STATE } from '../../utils/combatCalc';

const B = BALANCE_PARAMS;

export type CombatSlice = {
  // ── state ──
  stamina: number;
  ultCooldowns: Record<string, number>;
  currentBattleDuration: number;
  currentBattleDamageDealt: number;
  currentField: string | null;
  battleMode: 'none' | 'explore' | 'hunt';
  huntTarget: string | null;
  pendingHuntRetry: boolean;
  currentEnemy: GameState['currentEnemy'];
  exploreStep: number;
  exploreOrder: string[];
  isBossPhase: boolean;
  bossTimer: number;
  explorePendingRewards: { simdeuk: number; drops: string[] };
  battleLog: string[];
  playerAttackTimer: number;
  enemyAttackTimer: number;
  bossPatternState: GameState['bossPatternState'];
  playerStunTimer: number;
  lastEnemyAttack: GameState['lastEnemyAttack'];
  dodgeCounterActive: boolean;
  battleResult: BattleResult | null;
  floatingTexts: FloatingText[];
  nextFloatingId: number;
  playerAnim: string;
  enemyAnim: string;

  // ── actions ──
  startExplore: (fieldId: string) => void;
  startHunt: (fieldId: string, monsterId: string) => void;
  abandonBattle: () => void;
  dismissBattleResult: () => void;
  toggleAutoExplore: (fieldId: string) => void;
  isBattling: () => boolean;
  addFloatingText: (text: string, type: FloatingText['type']) => void;
};

export const createCombatSlice: StateCreator<GameStore, [], [], CombatSlice> = (set, get) => ({
  // ── 초기 상태 ──
  stamina: 0,
  ultCooldowns: {},
  currentBattleDuration: 0,
  currentBattleDamageDealt: 0,
  currentField: null,
  battleMode: 'none',
  huntTarget: null,
  pendingHuntRetry: false,
  currentEnemy: null,
  exploreStep: 0,
  exploreOrder: [],
  isBossPhase: false,
  bossTimer: 0,
  explorePendingRewards: { simdeuk: 0, drops: [] },
  battleLog: [],
  playerAttackTimer: 0,
  enemyAttackTimer: 0,
  bossPatternState: null,
  playerStunTimer: 0,
  lastEnemyAttack: null,
  dodgeCounterActive: false,
  battleResult: null,
  floatingTexts: [],
  nextFloatingId: 0,
  playerAnim: '',
  enemyAnim: '',

  // ── 액션 ──
  startExplore: (fieldId) => {
    const state = get() as GameStore;
    if (state.battleMode !== 'none') return;

    const field = getFieldDef(fieldId);
    if (!field || !field.canExplore) return;

    const order = generateExploreOrder(field);
    const firstMon = getMonsterDef(order[0]);
    if (!firstMon) return;

    const hiddenRevealedInField = { ...state.hiddenRevealedInField };
    if (firstMon.isHidden) {
      hiddenRevealedInField[fieldId] = order[0];
    }

    set({
      ...CLEAR_BATTLE_STATE,
      battleMode: 'explore',
      currentEnemy: spawnEnemy(firstMon),
      bossPatternState: BOSS_PATTERNS[order[0]]
        ? { bossStamina: BOSS_PATTERNS[order[0]].stamina.initial, rageUsed: false, playerFreezeLeft: 0, usedOneTimeSkills: [], bossChargeState: null }
        : null,
      currentField: fieldId,
      exploreOrder: order,
      exploreStep: 0,
      isBossPhase: false,
      bossTimer: 0,
      explorePendingRewards: { simdeuk: 0, drops: [] },
      battleLog: [`— ${firstMon.name} 등장 —`],
      battleResult: null,
      hiddenRevealedInField,
      playerAttackTimer: B.BASE_ATTACK_INTERVAL,
      enemyAttackTimer: firstMon.attackInterval,
    });
  },

  startHunt: (fieldId, monsterId) => {
    const state = get() as GameStore;
    if (state.battleMode !== 'none') return;

    const monDef = getMonsterDef(monsterId);
    if (!monDef) return;

    set({
      ...CLEAR_BATTLE_STATE,
      battleMode: 'hunt',
      currentEnemy: spawnEnemy(monDef),
      bossPatternState: BOSS_PATTERNS[monsterId]
        ? { bossStamina: BOSS_PATTERNS[monsterId].stamina.initial, rageUsed: false, playerFreezeLeft: 0, usedOneTimeSkills: [], bossChargeState: null }
        : null,
      currentField: fieldId,
      huntTarget: monsterId,
      exploreOrder: [],
      exploreStep: 0,
      isBossPhase: false,
      bossTimer: 0,
      explorePendingRewards: { simdeuk: 0, drops: [] },
      battleLog: [`— ${monDef.name} 사냥 시작 —`],
      battleResult: null,
      playerAttackTimer: B.BASE_ATTACK_INTERVAL,
      enemyAttackTimer: monDef.attackInterval,
      pendingHuntRetry: false,
    });
  },

  abandonBattle: () => {
    const state = get() as GameStore;
    if (state.battleMode === 'none') return;

    if (state.battleMode === 'explore') {
      set({
        ...CLEAR_BATTLE_STATE,
        battleResult: {
          type: 'explore_fail',
          simdeuk: 0,
          drops: [],
          message: '답파를 포기했습니다. 보상이 없습니다.',
        },
      });
    } else {
      set({
        ...CLEAR_BATTLE_STATE,
        battleResult: null,
      });
    }
  },

  dismissBattleResult: () => {
    const state = get() as GameStore;
    const result = state.battleResult;
    const fieldId = state.currentField;

    if (fieldId && state.autoExploreFields[fieldId]) {
      if (result?.type === 'explore_win') {
        // 자동 답파: 결과 닫고 즉시 재시작
        (get() as GameStore).startExplore(fieldId);
        return;
      } else if (result?.type === 'explore_fail') {
        // 실패 시 자동 답파 비활성화
        set({
          battleResult: null,
          pendingHuntRetry: false,
          autoExploreFields: { ...state.autoExploreFields, [fieldId]: false },
        });
        return;
      } else if (result?.type === 'death') {
        // 사망 + 자동 답파: HP 회복 후 재탐험 예약
        set({
          battleResult: null,
          pendingHuntRetry: false,
          pendingAutoExplore: true,
        });
        return;
      }
    }

    set({ battleResult: null, pendingHuntRetry: false });
  },

  toggleAutoExplore: (fieldId) => {
    const state = get() as GameStore;
    set({
      autoExploreFields: {
        ...state.autoExploreFields,
        [fieldId]: !state.autoExploreFields[fieldId],
      },
    });
  },

  isBattling: () => (get() as GameStore).battleMode !== 'none',

  addFloatingText: (text, type) => {
    set(s => {
      const id = (s as GameStore).nextFloatingId;
      const newTexts = [...(s as GameStore).floatingTexts, { id, text, type, timestamp: Date.now() }];
      if (newTexts.length > 15) newTexts.shift();
      return { floatingTexts: newTexts, nextFloatingId: id + 1 };
    });
  },
});
