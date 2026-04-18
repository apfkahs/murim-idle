import type { StateCreator } from 'zustand';
import type { GameStore } from '../gameStore';
import type { BattleResult, FloatingText, GameState } from '../types';
import { BALANCE_PARAMS } from '../../data/balance';
import { BOSS_PATTERNS, getMonsterDef } from '../../data/monsters';
import { getArtDef } from '../../data/arts';
import { getFieldDef, generateExploreOrder } from '../../data/fields';
import { spawnEnemy, CLEAR_BATTLE_STATE } from '../../utils/combatCalc';
import { createBossPatternState } from '../../utils/combat/tickContext';

/**
 * battle_start 트리거 스킬 처리
 * - 현재는 baehwa_guard (삼행의 율법)만 존재
 * - 조건: equippedArts 중 conditionRequiredFaction과 일치하는 무공이 하나라도 있으면 조건 충족
 * - 불충족 시 guardDamageTakenMultiplier 적용 (0.5 → 적이 받는 피해 절반)
 * - battleStartLogs를 battleLog에 추가, usedOneTimeSkills에 기록
 */
function applyBattleStartSkills(
  monsterId: string,
  equippedArts: string[],
  state: NonNullable<GameState['bossPatternState']>,
  battleLog: string[],
): { battleLog: string[]; state: NonNullable<GameState['bossPatternState']> } {
  const pattern = BOSS_PATTERNS[monsterId];
  if (!pattern) return { battleLog, state };
  const next = { ...state };
  const usedOne = [...(next.usedOneTimeSkills ?? [])];
  const logs = [...battleLog];
  for (const skill of pattern.skills) {
    if (skill.triggerCondition !== 'battle_start') continue;
    if (skill.type === 'baehwa_guard') {
      const required = skill.conditionRequiredFaction;
      const hasFactionArt = required
        ? equippedArts.some(id => getArtDef(id)?.faction === required)
        : true;
      next.guardDamageTakenMultiplier = hasFactionArt ? 1.0 : (skill.damageTakenMultiplierIfCondition ?? 0.5);
      next.guardFirstHitLogged = false;
      if (skill.battleStartLogs) {
        for (const line of skill.battleStartLogs) logs.push(line);
      }
      if (skill.oneTime) usedOne.push(skill.id);
    }
  }
  next.usedOneTimeSkills = usedOne;
  return { battleLog: logs, state: next };
}

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
  explorePendingRewards: { drops: string[]; proficiencyGains?: Record<string, number>; materialDrops?: Record<string, number> };
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
  explorePendingRewards: { drops: [], proficiencyGains: {}, materialDrops: {} },
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

    const initialBps = createBossPatternState(order[0]);
    let battleLog = [`— ${firstMon.name} 등장 —`];
    let bps = initialBps;
    if (bps) {
      const applied = applyBattleStartSkills(order[0], state.equippedArts, bps, battleLog);
      battleLog = applied.battleLog;
      bps = applied.state;
    }

    set({
      ...CLEAR_BATTLE_STATE,
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
    let battleLog = [`— ${monDef.name} 사냥 시작 —`];
    let bps = initialBps;
    if (bps) {
      const applied = applyBattleStartSkills(monsterId, state.equippedArts, bps, battleLog);
      battleLog = applied.battleLog;
      bps = applied.state;
    }

    set({
      ...CLEAR_BATTLE_STATE,
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
          drops: [],
          proficiencyGains: {},
          materialDrops: {},
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
