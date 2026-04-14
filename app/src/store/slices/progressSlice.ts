import type { StateCreator } from 'zustand';
import type { GameStore } from '../gameStore';
import type { GameState } from '../types';
import { BALANCE_PARAMS } from '../../data/balance';
import { TIERS } from '../../data/tiers';
import { FIELDS } from '../../data/fields';
import {
  calcFullMaxHp, calcQiPerSec,
  gatherEquipmentStats,
} from '../../utils/combatCalc';

import { calcUsedPoints } from '../utils/sliceHelpers';

const B = BALANCE_PARAMS;

// ── 내부 헬퍼 ──
function calcStatCost(level: number): number {
  return Math.max(1, Math.floor(Math.pow(level, 1.25)));
}

export type ProgressSlice = {
  // ── state ──
  qi: number;
  totalSpentQi: number;
  stats: { gi: number; sim: number; che: number };
  proficiency: GameState['proficiency'];
  hp: number;
  maxHp: number;
  tier: number;
  achievements: string[];
  achievementCount: number;
  killCounts: Record<string, number>;
  bossKillCounts: Record<string, number>;
  totalYasanKills: number;
  totalKills: number;
  hiddenRevealedInField: Record<string, string | null>;
  tutorialFlags: GameState['tutorialFlags'];
  fieldUnlocks: Record<string, boolean>;
  repeatableAchCounts: Record<string, number>;

  // ── actions ──
  investStat: (stat: 'gi' | 'sim' | 'che', amount?: number) => void;
  healWithQi: () => void;
  attemptBreakthrough: () => void;
  getQiPerSec: () => number;
  getTotalStats: () => number;
  getStatCost: (level: number) => number;
  getUsedPoints: () => number;
  getAvailablePoints: () => number;
};

export const createProgressSlice: StateCreator<GameStore, [], [], ProgressSlice> = (set, get) => ({
  // ── 초기 상태 ──
  qi: 0,
  totalSpentQi: 0,
  stats: { gi: 0, sim: 0, che: 0 },
  proficiency: { sword: 1, palm: 1, footwork: 1, mental: 1 },
  hp: B.HP_BASE,
  maxHp: B.HP_BASE,
  tier: 0,
  achievements: [],
  achievementCount: 0,
  killCounts: {},
  bossKillCounts: {},
  totalYasanKills: 0,
  totalKills: 0,
  hiddenRevealedInField: {},
  tutorialFlags: {
    equippedSword: false,
    equippedSimbeop: false,
    yasanUnlocked: false,
    killedWood: false,
    killedIron: false,
    firstBreakthroughNotified: false,
  },
  fieldUnlocks: {
    training: true,
    yasan: false,
    inn: false,
    cheonsan_jangmak: false,
    cheonsan_godo: false,
    cheonsan_simjang: false,
  },
  repeatableAchCounts: {},

  // ── 액션 ──
  investStat: (stat, amount = 1) => {
    const state = get() as GameStore;
    if (state.battleMode !== 'none') return;

    let qi = state.qi;
    let level = state.stats[stat];
    let totalSpent = state.totalSpentQi;
    let invested = 0;

    for (let i = 0; i < amount; i++) {
      const cost = calcStatCost(level);
      if (qi < cost) break;
      qi -= cost;
      totalSpent += cost;
      level += 1;
      invested += 1;
    }

    if (invested === 0) return;

    const newStats = { ...state.stats, [stat]: level };
    const newMaxHp = calcFullMaxHp({ ...state, stats: newStats } as GameState);

    set({
      qi,
      stats: newStats,
      totalSpentQi: totalSpent,
      maxHp: newMaxHp,
      hp: Math.min(state.hp, newMaxHp),
    });
  },

  healWithQi: () => {
    const state = get() as GameStore;
    if (state.battleMode !== 'none') return;
    if (state.hp >= state.maxHp) return;

    const missing = state.maxHp - state.hp;
    const healAmount = Math.min(missing, state.qi);
    if (healAmount <= 0) return;

    const totalHeal = Math.min(healAmount, missing);

    set({
      qi: state.qi - healAmount,
      hp: Math.min(state.hp + totalHeal, state.maxHp),
    });
  },

  attemptBreakthrough: () => {
    const state = get() as GameStore;
    if (state.battleMode !== 'none') return;

    const nextTier = state.tier + 1;
    const tierDef = TIERS[nextTier];
    if (!tierDef || !tierDef.requirements) return;

    const reqs = tierDef.requirements;
    const totalStats = state.stats.gi + state.stats.sim + state.stats.che;

    if (reqs.totalStats && totalStats < reqs.totalStats) return;
    if (reqs.bossKills && (state.bossKillCounts['tiger_boss'] ?? 0) < reqs.bossKills) return;
    if (reqs.achievementCount && (state.achievementCount ?? 0) < reqs.achievementCount) return;

    let newPoints = state.artPoints;
    if (tierDef.rewards?.artPoints) {
      newPoints += tierDef.rewards.artPoints;
    }

    const fieldUnlocks = { ...state.fieldUnlocks };
    for (const field of FIELDS) {
      if (field.unlockCondition?.minTier != null && !fieldUnlocks[field.id]) {
        if (nextTier >= field.unlockCondition.minTier) {
          fieldUnlocks[field.id] = true;
        }
      }
    }

    const tutorialFlags = { ...state.tutorialFlags };
    const battleLog = [...state.battleLog];
    if (!tutorialFlags.firstBreakthroughNotified && tierDef.rewards?.artPoints) {
      battleLog.push(`[${tierDef.name}] 경지 돌파! 무공포인트 +${tierDef.rewards.artPoints} 획득. 무공(武功) 탭에서 새 무공을 익힐 수 있습니다.`);
      tutorialFlags.firstBreakthroughNotified = true;
    }

    set({
      tier: nextTier,
      artPoints: newPoints,
      fieldUnlocks,
      tutorialFlags,
      battleLog,
      playerAnim: 'breakthrough',
    });
  },

  getQiPerSec: () => {
    const state = get() as GameStore;
    const equipStats = gatherEquipmentStats(state);
    const qiMult = 1 + (equipStats.bonusQiMultiplier ?? 0);
    return calcQiPerSec(state) * qiMult;
  },

  getTotalStats: () => {
    const s = (get() as GameStore).stats;
    return s.gi + s.sim + s.che;
  },

  getStatCost: (level) => calcStatCost(level),

  getUsedPoints: () => calcUsedPoints(get() as GameStore),

  getAvailablePoints: () => {
    const state = get() as GameStore;
    return state.artPoints - calcUsedPoints(state);
  },
});
