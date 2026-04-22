import type { StateCreator } from 'zustand';
import type { GameStore } from '../gameStore';
import type { BattleResult, FloatingText, GameState, BattleLogEntry } from '../types';
import { BALANCE_PARAMS } from '../../data/balance';
import { getMonsterDef } from '../../data/monsters';
import { getFieldDef, generateExploreOrder } from '../../data/fields';
import { spawnEnemy, CLEAR_BATTLE_STATE, calcPlayerAttackInterval } from '../../utils/combatCalc';
import { createBossPatternState, applyBattleStartSkills } from '../../utils/combat/tickContext';

const B = BALANCE_PARAMS;

/** 사냥 세션 리셋 — 전장이 바뀌었을 때만 0으로 초기화, 같은 전장 재진입이면 유지 */
function maybeResetSession(state: GameStore, fieldId: string): Partial<GameState> {
  if (state.sessionFieldId === fieldId) return {};
  return {
    sessionFieldId: fieldId,
    sessionStartedAt: Date.now(),
    sessionKills: 0,
    sessionQiGained: 0,
    sessionTotalDamage: 0,
    sessionActiveTime: 0,
    sessionMaxDps: 0,
    sessionBattleWins: 0,
    sessionDeaths: 0,
    sessionDrops: {},
    sessionProfGains: {},
  };
}

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
  explorePendingRewards: { drops: string[]; proficiencyGains?: Record<string, number>; materialDrops?: Record<string, number> };
  battleLog: BattleLogEntry[];
  combatElapsed: number;
  logEntryIdSeq: number;
  lawActiveFromSkillId: string | null;
  playerAttackTimer: number;
  enemyAttackTimer: number;
  bossPatternState: GameState['bossPatternState'];
  playerStunTimer: number;
  lastEnemyAttack: GameState['lastEnemyAttack'];
  dodgeCounterActive: boolean;
  baehwagyoEmberTimer: number;
  baehwagyoAshOathBuffs: GameState['baehwagyoAshOathBuffs'];
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
  explorePendingRewards: { drops: [], proficiencyGains: {}, materialDrops: {} },
  battleLog: [],
  playerAttackTimer: 0,
  enemyAttackTimer: 0,
  bossPatternState: null,
  playerStunTimer: 0,
  lastEnemyAttack: null,
  dodgeCounterActive: false,
  baehwagyoEmberTimer: 0,
  baehwagyoAshOathBuffs: [],
  combatElapsed: 0,
  logEntryIdSeq: 0,
  lawActiveFromSkillId: null,
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

    if (field.firstEntryEvent && !state.firstEnteredFields?.[fieldId]) {
      const ev = field.firstEntryEvent;
      let seq = state.logEntryIdSeq ?? 0;
      const eventEntries: BattleLogEntry[] = ev.logs.map(text => ({
        id: seq++,
        time: 0,
        actor: 'system' as const,
        kind: 'system' as const,
        text,
      }));
      set({
        firstEnteredFields: { ...state.firstEnteredFields, [fieldId]: true },
        materials: { ...state.materials, [ev.materialDrop]: (state.materials[ev.materialDrop] ?? 0) + 1 },
        obtainedMaterials: state.obtainedMaterials.includes(ev.materialDrop)
          ? state.obtainedMaterials
          : [...state.obtainedMaterials, ev.materialDrop],
        battleLog: [...state.battleLog, ...eventEntries],
        logEntryIdSeq: seq,
        battleResult: {
          type: 'explore_win',
          drops: [],
          proficiencyGains: {},
          materialDrops: { [ev.materialDrop]: 1 },
          message: ev.resultMessage,
          recentBattleLog: [...ev.logs],
        },
      });
      return;
    }

    const hiddenRevealedInField = { ...state.hiddenRevealedInField };
    if (firstMon.isHidden) {
      hiddenRevealedInField[fieldId] = order[0];
    }

    const initialBps = createBossPatternState(order[0]);
    // 새 전투 진입 시 이전 로그 완전 초기화 — seq=0부터 시작
    let seq = 0;
    const startEntry: BattleLogEntry = {
      id: seq++, time: 0, actor: 'system', kind: 'combat-start',
      enemyId: order[0],
      playerAttackInterval: calcPlayerAttackInterval(state as GameState),
      enemyAttackInterval: firstMon.attackInterval,
    };
    let battleLog: BattleLogEntry[] = [startEntry];
    let bps = initialBps;
    let lawActive: string | null = null;
    if (bps) {
      const applied = applyBattleStartSkills(order[0], state.equippedArts, bps, battleLog, seq);
      battleLog = applied.battleLog;
      bps = applied.state;
      seq = applied.logEntryIdSeq;
      lawActive = applied.lawActiveFromSkillId;
    }

    set({
      ...CLEAR_BATTLE_STATE,
      ...maybeResetSession(state, fieldId),
      battleMode: 'explore',
      currentEnemy: spawnEnemy(firstMon),
      bossPatternState: bps,
      currentField: fieldId,
      exploreOrder: order,
      exploreStep: 0,
      isBossPhase: false,
      bossTimer: 0,
      explorePendingRewards: { drops: [], proficiencyGains: {}, materialDrops: {} },
      battleLog,
      logEntryIdSeq: seq,
      combatElapsed: 0,
      lawActiveFromSkillId: lawActive,
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

    const initialBps = createBossPatternState(monsterId);
    // 새 전투 진입 시 이전 로그 완전 초기화 — seq=0부터 시작
    let seq = 0;
    const startEntry: BattleLogEntry = {
      id: seq++, time: 0, actor: 'system', kind: 'combat-start',
      enemyId: monsterId,
      playerAttackInterval: calcPlayerAttackInterval(state as GameState),
      enemyAttackInterval: monDef.attackInterval,
    };
    let battleLog: BattleLogEntry[] = [startEntry];
    let bps = initialBps;
    let lawActive: string | null = null;
    if (bps) {
      const applied = applyBattleStartSkills(monsterId, state.equippedArts, bps, battleLog, seq);
      battleLog = applied.battleLog;
      bps = applied.state;
      seq = applied.logEntryIdSeq;
      lawActive = applied.lawActiveFromSkillId;
    }

    set({
      ...CLEAR_BATTLE_STATE,
      ...maybeResetSession(state, fieldId),
      battleMode: 'hunt',
      currentEnemy: spawnEnemy(monDef),
      bossPatternState: bps,
      currentField: fieldId,
      huntTarget: monsterId,
      exploreOrder: [],
      exploreStep: 0,
      isBossPhase: false,
      bossTimer: 0,
      explorePendingRewards: { drops: [], proficiencyGains: {}, materialDrops: {} },
      battleLog,
      logEntryIdSeq: seq,
      combatElapsed: 0,
      lawActiveFromSkillId: lawActive,
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
        battleLog: [],
        combatElapsed: 0,
        logEntryIdSeq: 0,
        lawActiveFromSkillId: null,
        battleResult: {
          type: 'explore_fail',
          drops: [],
          proficiencyGains: {},
          materialDrops: {},
          message: '답파를 포기했습니다. 보상이 없습니다.',
        },
      });
    } else {
      set({
        ...CLEAR_BATTLE_STATE,
        battleLog: [],
        combatElapsed: 0,
        logEntryIdSeq: 0,
        lawActiveFromSkillId: null,
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
