/**
 * 무림 방치록 v1.1 — 게임 스토어 (Zustand)
 * DPS 폐기. 타이머 기반 전투. 무공 발동 로직.
 */
import { create } from 'zustand';
import {
  ARTS, getArtDef, getArtGrade, getAllPassives, getSimdeukForGrade,
  type ArtDef,
} from '../data/arts';
import { getMonsterDef, getMonsterAttackMsg, type MonsterDef, TRAINING_MONSTERS } from '../data/monsters';
import { TIERS, getTierDef, getMaxGrade } from '../data/tiers';
import { getFieldDef, generateExploreOrder } from '../data/fields';
import { ACHIEVEMENTS, type AchievementContext } from '../data/achievements';

// ============================================================
// State interface
// ============================================================
export interface GameState {
  neigong: number;
  totalSimdeuk: number;
  totalSpentNeigong: number; // v1.1: HP 공식용
  stats: { sungi: number; gyeongsin: number; magi: number };
  hp: number;
  maxHp: number;
  tier: number;

  equippedSimbeop: string | null;
  ownedArts: { id: string; grade: number; proficiency: number }[];
  equippedArts: string[];
  artPoints: number;

  currentField: string | null;
  battleMode: 'none' | 'explore' | 'hunt';
  huntTarget: string | null;
  currentEnemy: {
    id: string; hp: number; maxHp: number; attackPower: number;
    attackInterval: number; regen: number;
  } | null;
  exploreStep: number;
  exploreOrder: string[];
  isBossPhase: boolean;
  bossTimer: number;
  explorePendingRewards: { simdeuk: number; drops: string[] };
  battleLog: string[];

  // v1.1: 타이머 기반 전투
  playerAttackTimer: number;
  enemyAttackTimer: number;

  achievements: string[];
  killCounts: Record<string, number>;
  bossKillCounts: Record<string, number>;
  totalYasanKills: number;
  hiddenEncountered: boolean;

  tutorialFlags: {
    equippedSword: boolean;
    equippedSimbeop: boolean;
    yasanUnlocked: boolean;
    killedWood: boolean;
    killedIron: boolean;
  };

  lastTickTime: number;
  simbeopBurstTimer: number;
  battleResult: BattleResult | null;

  // 전투 애니메이션 상태
  floatingTexts: FloatingText[];
  nextFloatingId: number;
  playerAnim: string;
  enemyAnim: string;
}

export interface BattleResult {
  type: 'explore_win' | 'explore_fail' | 'hunt_end' | 'death';
  simdeuk: number;
  drops: string[];
  message: string;
}

export interface FloatingText {
  id: number;
  text: string;
  type: 'damage' | 'simdeuk' | 'drop' | 'heal' | 'evade' | 'critical';
  timestamp: number;
}

// ============================================================
// Actions interface
// ============================================================
export interface GameActions {
  tick: () => void;
  investStat: (stat: 'sungi' | 'gyeongsin' | 'magi') => void;
  healWithNeigong: () => void;

  equipArt: (artId: string) => void;
  unequipArt: (artId: string) => void;
  equipSimbeop: (artId: string) => void;
  unequipSimbeop: () => void;

  startExplore: (fieldId: string) => void;
  startHunt: (fieldId: string, monsterId: string) => void;
  abandonBattle: () => void;
  dismissBattleResult: () => void;

  attemptBreakthrough: () => void;

  saveGame: () => void;
  loadGame: () => void;
  resetGame: () => void;

  getNeigongPerSec: () => number;
  getAttackInterval: () => number;
  getEvasion: () => number;
  getTotalStats: () => number;
  getStatCost: (level: number) => number;
  getUsedPoints: () => number;
  getAvailablePoints: () => number;
  isBattling: () => boolean;
  addFloatingText: (text: string, type: FloatingText['type']) => void;
}

export type GameStore = GameState & GameActions;

// ============================================================
// Initial state
// ============================================================
function createInitialState(): GameState {
  return {
    neigong: 0,
    totalSimdeuk: 0,
    totalSpentNeigong: 0,
    stats: { sungi: 0, gyeongsin: 0, magi: 0 },
    hp: 50,
    maxHp: 50,
    tier: 0,
    equippedSimbeop: null,
    ownedArts: [],
    equippedArts: [],
    artPoints: 3,
    currentField: null,
    battleMode: 'none',
    huntTarget: null,
    currentEnemy: null,
    exploreStep: 0,
    exploreOrder: [],
    isBossPhase: false,
    bossTimer: 0,
    explorePendingRewards: { simdeuk: 0, drops: [] },
    battleLog: [],
    playerAttackTimer: 0,
    enemyAttackTimer: 0,
    achievements: [],
    killCounts: {},
    bossKillCounts: {},
    totalYasanKills: 0,
    hiddenEncountered: false,
    tutorialFlags: {
      equippedSword: false,
      equippedSimbeop: false,
      yasanUnlocked: false,
      killedWood: false,
      killedIron: false,
    },
    lastTickTime: Date.now(),
    simbeopBurstTimer: 0,
    battleResult: null,
    floatingTexts: [],
    nextFloatingId: 0,
    playerAnim: '',
    enemyAnim: '',
  };
}

// ============================================================
// Helper calculations
// ============================================================

/** v1.1 HP: 50 + floor(log2(1 + totalSpentNeigong) * 15) */
function calcMaxHp(totalSpentNeigong: number): number {
  return 50 + Math.floor(Math.log2(1 + totalSpentNeigong) * 15);
}

function calcStatCost(level: number): number {
  return Math.floor(10 * Math.pow(1.15, level));
}

/** v1.1 공격 간격: 4 / (1 + ln(1 + 경신 * 0.05)), 최소 1초 */
function calcAttackInterval(gyeongsin: number): number {
  const raw = 4 / (1 + Math.log(1 + gyeongsin * 0.05));
  return Math.max(raw, 1.0);
}

/** v1.1 회피: 패시브 무공의 dodge 합산, 상한 25%. 경신은 회피에 무관. */
function calcEvasion(state: GameState): number {
  let dodge = 0;
  for (const artId of state.equippedArts) {
    const owned = state.ownedArts.find(a => a.id === artId);
    const artDef = getArtDef(artId);
    if (!owned || !artDef) continue;
    const gradeData = getArtGrade(artDef, owned.grade);
    if (gradeData?.dodge) dodge += gradeData.dodge;
  }
  return Math.min(dodge, 25); // 상한 25%
}

function calcNeigongPerSec(state: GameState): number {
  let base = 1;
  if (state.equippedSimbeop) {
    const artDef = getArtDef(state.equippedSimbeop);
    const owned = state.ownedArts.find(a => a.id === state.equippedSimbeop);
    if (artDef && owned) {
      const gradeData = getArtGrade(artDef, owned.grade);
      if (gradeData?.neigongPerSec) {
        base += gradeData.neigongPerSec;
      }
    }
  }
  return base;
}

function hasPassive(state: GameState, passiveId: string): boolean {
  const allArts = [...state.equippedArts];
  if (state.equippedSimbeop) allArts.push(state.equippedSimbeop);

  for (const artId of allArts) {
    const owned = state.ownedArts.find(a => a.id === artId);
    if (!owned) continue;
    const passives = getAllPassives(artId, owned.grade);
    if (passives.some(p => p.passive === passiveId)) return true;
  }
  return false;
}

function getTrainingSimdeuk(state: GameState, monsterId: string): number {
  if ((state.killCounts[monsterId] ?? 0) > 0) return 0;
  const mon = getMonsterDef(monsterId);
  return mon?.simdeuk ?? 0;
}

function spawnEnemy(monDef: MonsterDef): GameState['currentEnemy'] {
  return {
    id: monDef.id,
    hp: monDef.hp,
    maxHp: monDef.hp,
    attackPower: monDef.attackPower,
    attackInterval: monDef.attackInterval,
    regen: monDef.regen,
  };
}

function buildAchievementContext(state: GameState): AchievementContext {
  const artGrades: Record<string, number> = {};
  for (const a of state.ownedArts) artGrades[a.id] = a.grade;
  return {
    killCounts: state.killCounts,
    bossKillCounts: state.bossKillCounts,
    ownedArts: state.ownedArts.map(a => a.id),
    artGrades,
    totalStats: state.stats.sungi + state.stats.gyeongsin + state.stats.magi,
    totalSimdeuk: state.totalSimdeuk,
    tier: state.tier,
    achievements: state.achievements,
    hiddenEncountered: state.hiddenEncountered,
  };
}

/**
 * v1.1 무공 발동 로직 (1.4장)
 * 장착 액티브 무공 중 랜덤 선택 → 발동 판정 → 실패 시 다음 → 전부 실패 시 평타
 * 반환: { artDef, damage, isCritical, isDouble } 또는 평타
 */
function executeAttack(
  state: GameState,
  enemyId: string,
): { artDef: ArtDef | null; damage: number; isCritical: boolean; isDouble: boolean; artName: string } {
  // 장착 액티브 무공 후보 수집
  const candidates: { artDef: ArtDef; owned: { grade: number } }[] = [];
  for (const artId of state.equippedArts) {
    const artDef = getArtDef(artId);
    const owned = state.ownedArts.find(a => a.id === artId);
    if (!artDef || !owned) continue;
    if (artDef.artType !== 'active') continue; // 패시브 무공은 발동 판정 미참여
    candidates.push({ artDef, owned });
  }

  let fired = false;
  let damage = 5; // 평타
  let artName = '평타';
  let firedArtDef: ArtDef | null = null;
  let isCritical = false;
  let isDouble = false;

  // 랜덤 순서로 발동 시도
  const pool = [...candidates];
  while (pool.length > 0 && !fired) {
    const idx = Math.floor(Math.random() * pool.length);
    const { artDef, owned } = pool.splice(idx, 1)[0];
    const gradeData = getArtGrade(artDef, owned.grade);
    if (!gradeData?.triggerRate || !gradeData?.power) continue;

    if (Math.random() < gradeData.triggerRate) {
      damage = gradeData.power;

      // 진영 배율
      if (artDef.faction === 'righteous') {
        damage *= (1 + state.stats.sungi * 0.02);
      } else if (artDef.faction === 'evil') {
        damage *= (1 + state.stats.magi * 0.02);
      } else {
        damage *= (1 + state.stats.sungi * 0.01 + state.stats.magi * 0.01);
      }

      artName = artDef.name;
      firedArtDef = artDef;
      fired = true;
    }
  }

  // 치명타 패시브 (3% x1.3)
  if (fired && hasPassive(state, 'critical') && Math.random() < 0.03) {
    damage *= 1.3;
    isCritical = true;
  }

  // 2연타 패시브 (5% x2)
  if (fired && hasPassive(state, 'double_strike') && Math.random() < 0.05) {
    damage *= 2;
    isDouble = true;
  }

  damage = Math.floor(damage);

  return { artDef: firedArtDef, damage, isCritical, isDouble, artName };
}

// ============================================================
// Store
// ============================================================
export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialState(),

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────
  getNeigongPerSec: () => calcNeigongPerSec(get()),
  getAttackInterval: () => calcAttackInterval(get().stats.gyeongsin),
  getEvasion: () => calcEvasion(get()),
  getTotalStats: () => {
    const s = get().stats;
    return s.sungi + s.gyeongsin + s.magi;
  },
  getStatCost: (level: number) => calcStatCost(level),
  getUsedPoints: () => {
    const state = get();
    return state.equippedArts.reduce((sum, artId) => {
      const def = getArtDef(artId);
      return sum + (def?.cost ?? 0);
    }, 0);
  },
  getAvailablePoints: () => {
    const state = get();
    const used = state.equippedArts.reduce((sum, artId) => {
      const def = getArtDef(artId);
      return sum + (def?.cost ?? 0);
    }, 0);
    return state.artPoints - used;
  },
  isBattling: () => get().battleMode !== 'none',

  addFloatingText: (text: string, type: FloatingText['type']) => {
    set(s => {
      const id = s.nextFloatingId;
      const newTexts = [...s.floatingTexts, { id, text, type, timestamp: Date.now() }];
      if (newTexts.length > 15) newTexts.shift();
      return { floatingTexts: newTexts, nextFloatingId: id + 1 };
    });
  },

  // ─────────────────────────────────────────────
  // Stat investment (v1.1: totalSpentNeigong + HP log2 공식)
  // ─────────────────────────────────────────────
  investStat: (stat) => {
    const state = get();
    if (state.battleMode !== 'none') return;

    const level = state.stats[stat];
    const cost = calcStatCost(level);
    if (state.neigong < cost) return;

    const newStats = { ...state.stats, [stat]: level + 1 };
    const newTotalSpent = state.totalSpentNeigong + cost;
    const newMaxHp = calcMaxHp(newTotalSpent);

    set({
      neigong: state.neigong - cost,
      stats: newStats,
      totalSpentNeigong: newTotalSpent,
      maxHp: newMaxHp,
      hp: Math.min(state.hp, newMaxHp),
    });
  },

  // ─────────────────────────────────────────────
  // HP heal with neigong
  // ─────────────────────────────────────────────
  healWithNeigong: () => {
    const state = get();
    if (state.battleMode !== 'none') return;
    if (state.hp >= state.maxHp) return;

    const missing = state.maxHp - state.hp;
    const healAmount = Math.min(missing, state.neigong);
    if (healAmount <= 0) return;

    let bonus = 0;
    if (hasPassive(state, 'heal_bonus')) {
      bonus = Math.floor(healAmount * 0.05);
    }

    const totalHeal = Math.min(healAmount + bonus, missing);

    set({
      neigong: state.neigong - healAmount,
      hp: Math.min(state.hp + totalHeal, state.maxHp),
    });
  },

  // ─────────────────────────────────────────────
  // Arts equip/unequip
  // ─────────────────────────────────────────────
  equipArt: (artId) => {
    const state = get();
    if (state.battleMode !== 'none') return;

    const artDef = getArtDef(artId);
    if (!artDef || artDef.isSimbeop) return;

    const owned = state.ownedArts.find(a => a.id === artId);
    if (!owned) return;

    if (state.equippedArts.includes(artId)) return;

    const usedPoints = state.equippedArts.reduce((sum, id) => {
      const def = getArtDef(id);
      return sum + (def?.cost ?? 0);
    }, 0);
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
    const state = get();
    if (state.battleMode !== 'none') return;
    set({ equippedArts: state.equippedArts.filter(id => id !== artId) });
  },

  equipSimbeop: (artId) => {
    const state = get();
    if (state.battleMode !== 'none') return;

    const artDef = getArtDef(artId);
    if (!artDef || !artDef.isSimbeop) return;

    const owned = state.ownedArts.find(a => a.id === artId);
    if (!owned) return;

    const flags = { ...state.tutorialFlags };
    if (artId === 'samjae_simbeop') flags.equippedSimbeop = true;

    set({
      equippedSimbeop: artId,
      tutorialFlags: flags,
    });
  },

  unequipSimbeop: () => {
    const state = get();
    if (state.battleMode !== 'none') return;
    set({ equippedSimbeop: null });
  },

  // ─────────────────────────────────────────────
  // Battle start (v1.1: 타이머 초기화)
  // ─────────────────────────────────────────────
  startExplore: (fieldId) => {
    const state = get();
    if (state.battleMode !== 'none') return;

    const field = getFieldDef(fieldId);
    if (!field || !field.canExplore) return;

    const order = generateExploreOrder(field);
    const firstMon = getMonsterDef(order[0]);
    if (!firstMon) return;

    let hiddenEncountered = state.hiddenEncountered;
    if (order.some(id => {
      const m = getMonsterDef(id);
      return m?.isHidden;
    })) {
      hiddenEncountered = true;
    }

    const playerInterval = calcAttackInterval(state.stats.gyeongsin);

    set({
      battleMode: 'explore',
      currentField: fieldId,
      exploreOrder: order,
      exploreStep: 0,
      isBossPhase: false,
      bossTimer: 0,
      explorePendingRewards: { simdeuk: 0, drops: [] },
      currentEnemy: spawnEnemy(firstMon),
      battleLog: [`— ${firstMon.name} 등장 —`],
      battleResult: null,
      hiddenEncountered,
      playerAttackTimer: playerInterval,
      enemyAttackTimer: firstMon.attackInterval,
    });
  },

  startHunt: (fieldId, monsterId) => {
    const state = get();
    if (state.battleMode !== 'none') return;

    const monDef = getMonsterDef(monsterId);
    if (!monDef) return;

    const playerInterval = calcAttackInterval(state.stats.gyeongsin);

    set({
      battleMode: 'hunt',
      currentField: fieldId,
      huntTarget: monsterId,
      currentEnemy: spawnEnemy(monDef),
      exploreOrder: [],
      exploreStep: 0,
      isBossPhase: false,
      bossTimer: 0,
      explorePendingRewards: { simdeuk: 0, drops: [] },
      battleLog: [`— ${monDef.name} 사냥 시작 —`],
      battleResult: null,
      playerAttackTimer: playerInterval,
      enemyAttackTimer: monDef.attackInterval,
    });
  },

  abandonBattle: () => {
    const state = get();
    if (state.battleMode === 'none') return;

    if (state.battleMode === 'explore') {
      set({
        battleMode: 'none',
        currentEnemy: null,
        battleResult: {
          type: 'explore_fail',
          simdeuk: 0,
          drops: [],
          message: '답파를 포기했습니다. 보상이 없습니다.',
        },
      });
    } else {
      set({
        battleMode: 'none',
        currentEnemy: null,
        battleResult: null,
      });
    }
  },

  dismissBattleResult: () => {
    set({ battleResult: null });
  },

  // ─────────────────────────────────────────────
  // Tier breakthrough
  // ─────────────────────────────────────────────
  attemptBreakthrough: () => {
    const state = get();
    if (state.battleMode !== 'none') return;

    const nextTier = state.tier + 1;
    const tierDef = TIERS[nextTier];
    if (!tierDef || !tierDef.requirements) return;

    const reqs = tierDef.requirements;
    const totalStats = state.stats.sungi + state.stats.gyeongsin + state.stats.magi;

    if (reqs.totalStats && totalStats < reqs.totalStats) return;
    if (reqs.totalSimdeuk && state.totalSimdeuk < reqs.totalSimdeuk) return;
    if (reqs.bossKills && (state.bossKillCounts['tiger_boss'] ?? 0) < reqs.bossKills) return;

    let newPoints = state.artPoints;
    if (tierDef.rewards?.artPoints) {
      newPoints += tierDef.rewards.artPoints;
    }

    set({
      tier: nextTier,
      artPoints: newPoints,
      playerAnim: 'breakthrough',
    });
  },

  // ─────────────────────────────────────────────
  // Save / Load / Reset (v1.1: totalSpentNeigong + version 1.1)
  // ─────────────────────────────────────────────
  saveGame: () => {
    const state = get();
    const saveData = {
      version: '1.1',
      neigong: state.neigong,
      totalSimdeuk: state.totalSimdeuk,
      totalSpentNeigong: state.totalSpentNeigong,
      stats: state.stats,
      hp: state.hp,
      tier: state.tier,
      equippedSimbeop: state.equippedSimbeop,
      ownedArts: state.ownedArts,
      equippedArts: state.equippedArts,
      artPoints: state.artPoints,
      achievements: state.achievements,
      killCounts: state.killCounts,
      bossKillCounts: state.bossKillCounts,
      totalYasanKills: state.totalYasanKills,
      hiddenEncountered: state.hiddenEncountered,
      tutorialFlags: state.tutorialFlags,
      simbeopBurstTimer: state.simbeopBurstTimer,
    };
    localStorage.setItem('murim_save', JSON.stringify(saveData));
  },

  loadGame: () => {
    const raw = localStorage.getItem('murim_save');
    if (!raw) return;

    try {
      const data = JSON.parse(raw);

      // v1.0 → v1.1 마이그레이션
      let totalSpentNeigong = data.totalSpentNeigong;
      if (totalSpentNeigong === undefined) {
        let s = 0;
        const stats = data.stats ?? { sungi: 0, gyeongsin: 0, magi: 0 };
        for (const k of ['sungi', 'gyeongsin', 'magi'] as const) {
          for (let i = 0; i < (stats[k] ?? 0); i++) {
            s += Math.floor(10 * Math.pow(1.15, i));
          }
        }
        totalSpentNeigong = s;
      }

      const maxHp = calcMaxHp(totalSpentNeigong);
      set({
        neigong: data.neigong ?? 0,
        totalSimdeuk: data.totalSimdeuk ?? 0,
        totalSpentNeigong,
        stats: data.stats ?? { sungi: 0, gyeongsin: 0, magi: 0 },
        hp: Math.min(data.hp ?? maxHp, maxHp),
        maxHp,
        tier: data.tier ?? 0,
        equippedSimbeop: data.equippedSimbeop ?? null,
        ownedArts: data.ownedArts ?? [],
        equippedArts: data.equippedArts ?? [],
        artPoints: data.artPoints ?? 3,
        achievements: data.achievements ?? [],
        killCounts: data.killCounts ?? {},
        bossKillCounts: data.bossKillCounts ?? {},
        totalYasanKills: data.totalYasanKills ?? 0,
        hiddenEncountered: data.hiddenEncountered ?? false,
        tutorialFlags: data.tutorialFlags ?? createInitialState().tutorialFlags,
        simbeopBurstTimer: data.simbeopBurstTimer ?? 0,
        lastTickTime: Date.now(),
      });
    } catch {
      // corrupt save
    }
  },

  resetGame: () => {
    localStorage.removeItem('murim_save');
    set(createInitialState());
  },

  // ─────────────────────────────────────────────
  // Main tick — v1.1: 타이머 기반 전투
  // ─────────────────────────────────────────────
  tick: () => {
    set(state => {
      const now = Date.now();
      const rawDt = (now - state.lastTickTime) / 1000;
      const dt = Math.min(rawDt, 5); // cap at 5s
      if (dt < 0.05) return { lastTickTime: now };

      let {
        neigong, hp, maxHp, battleMode, currentEnemy,
        exploreStep, exploreOrder, isBossPhase, bossTimer,
        explorePendingRewards, battleLog, currentField,
        killCounts, bossKillCounts, totalSimdeuk, totalYasanKills,
        ownedArts, equippedArts, equippedSimbeop,
        simbeopBurstTimer, battleResult, hiddenEncountered,
        huntTarget, totalSpentNeigong,
        playerAttackTimer, enemyAttackTimer,
      } = state;
      const stats = { ...state.stats };

      // Clone mutable
      killCounts = { ...killCounts };
      bossKillCounts = { ...bossKillCounts };
      ownedArts = ownedArts.map(a => ({ ...a }));
      explorePendingRewards = {
        simdeuk: explorePendingRewards.simdeuk,
        drops: [...explorePendingRewards.drops],
      };
      battleLog = [...battleLog];
      if (battleLog.length > 100) battleLog = battleLog.slice(-40);

      const isBattling = battleMode !== 'none';

      // 1) 내공 생산 (전투 외만)
      if (!isBattling) {
        const neigongRate = calcNeigongPerSec(state);
        neigong += neigongRate * dt;
      }

      // 2) 심법 패시브 타이머 (neigong_burst: 60초마다)
      if (!isBattling && equippedSimbeop) {
        if (hasPassive(state, 'neigong_burst')) {
          simbeopBurstTimer += dt;
          if (simbeopBurstTimer >= 60) {
            const rate = calcNeigongPerSec(state);
            neigong += rate * 8;
            simbeopBurstTimer -= 60;
            battleLog.push(`심법 폭발! 내공 +${(rate * 8).toFixed(0)}`);
          }
        }
      }

      // 3) HP 자동회복 (전투 외)
      if (!isBattling) {
        maxHp = calcMaxHp(totalSpentNeigong);
        hp = Math.min(hp + maxHp * 0.05 * dt, maxHp);
      }

      // 4) 전투 (v1.1: 타이머 기반)
      if (isBattling && currentEnemy) {
        // 적 회복
        if (currentEnemy.regen > 0) {
          currentEnemy = { ...currentEnemy };
          currentEnemy.hp = Math.min(
            currentEnemy.hp + currentEnemy.regen * dt,
            currentEnemy.maxHp
          );
        }

        // 플레이어 공격 타이머
        playerAttackTimer -= dt;
        if (playerAttackTimer <= 0) {
          const attackInterval = calcAttackInterval(stats.gyeongsin);
          playerAttackTimer += attackInterval; // 잔여 이월

          // 무공 발동 로직 (1.4장)
          currentEnemy = { ...currentEnemy };
          const result = executeAttack(state, currentEnemy.id);
          currentEnemy.hp -= result.damage;

          // 로그 생성 (1.9장)
          const monDef = getMonsterDef(currentEnemy.id);
          const eName = monDef?.name ?? currentEnemy.id;

          if (result.isCritical) {
            battleLog.push(`치명타! ${result.artName}으로 ${eName}에게 ${result.damage} 피해!`);
          } else if (result.isDouble) {
            battleLog.push(`연속 공격! ${result.artName}으로 ${eName}에게 ${result.damage} 피해!`);
          } else if (result.artDef) {
            // 무공 공격 — 무공의 attackMessages 사용
            const msgs = result.artDef.attackMessages;
            if (msgs && msgs.length > 0) {
              const tmpl = msgs[Math.floor(Math.random() * msgs.length)];
              battleLog.push(`${tmpl} ${eName}에게 ${result.damage} 피해.`);
            } else {
              battleLog.push(`${result.artName}으로 ${eName}에게 ${result.damage} 피해를 입혔다.`);
            }
          } else {
            // 평타
            battleLog.push(`평타로 ${eName}에게 ${result.damage} 피해를 입혔다.`);
          }
        }

        // 적 사망 체크 (플레이어 먼저 판정 후)
        if (currentEnemy.hp <= 0) {
          const monDef = getMonsterDef(currentEnemy.id);
          if (monDef) {
            if (monDef.isHidden) hiddenEncountered = true;

            killCounts[monDef.id] = (killCounts[monDef.id] ?? 0) + 1;

            const yasanIds = ['squirrel','rabbit','fox','deer','boar','wolf','bear'];
            if (yasanIds.includes(monDef.id) || monDef.isHidden) {
              totalYasanKills++;
            }

            if (monDef.isBoss) {
              bossKillCounts[monDef.id] = (bossKillCounts[monDef.id] ?? 0) + 1;
            }

            // 심득
            let simdeuk = monDef.simdeuk;
            if (monDef.isTraining) {
              simdeuk = getTrainingSimdeuk(state, monDef.id);
              if (killCounts[monDef.id] > 1) simdeuk = 0;
            }
            if (hasPassive(state, 'simdeuk_bonus')) {
              simdeuk = Math.floor(simdeuk * 1.05);
            }

            // 드롭
            const drops: string[] = [];
            for (const drop of monDef.drops) {
              if (Math.random() < drop.chance) {
                if (!ownedArts.some(a => a.id === drop.artId)) {
                  drops.push(drop.artId);
                  ownedArts.push({ id: drop.artId, grade: 1, proficiency: 0 });
                  battleLog.push(`📜 ${getArtDef(drop.artId)?.name ?? drop.artId} 비급을 발견했다!`);
                }
              }
            }

            // lifesteal
            if (hasPassive(state, 'lifesteal')) {
              hp = Math.min(hp + maxHp * 0.02, maxHp);
            }
            if (hasPassive(state, 'lifesteal2')) {
              hp = Math.min(hp + maxHp * 0.04, maxHp);
            }

            if (battleMode === 'explore') {
              explorePendingRewards.simdeuk += simdeuk;
              explorePendingRewards.drops.push(...drops);
              battleLog.push(`— ${monDef.name} 처치. 심득 +${simdeuk} —`);

              const nextStep = exploreStep + 1;
              if (nextStep < exploreOrder.length) {
                const nextMon = getMonsterDef(exploreOrder[nextStep]);
                if (nextMon) {
                  currentEnemy = spawnEnemy(nextMon);
                  exploreStep = nextStep;
                  battleLog.push(`— ${nextMon.name} 등장 —`);
                  if (nextMon.isHidden) hiddenEncountered = true;
                  // 새 적 타이머 초기화
                  const pInterval = calcAttackInterval(stats.gyeongsin);
                  playerAttackTimer = pInterval;
                  enemyAttackTimer = nextMon.attackInterval;
                }
              } else if (!isBossPhase) {
                const field = getFieldDef(currentField!);
                if (field?.boss) {
                  const bossMon = getMonsterDef(field.boss);
                  if (bossMon) {
                    isBossPhase = true;
                    bossTimer = field.bossTimer ?? 60;
                    currentEnemy = spawnEnemy(bossMon);
                    battleLog.push(`— 보스 등장! ${bossMon.name}이(가) 나타났다! —`);
                    const pInterval = calcAttackInterval(stats.gyeongsin);
                    playerAttackTimer = pInterval;
                    enemyAttackTimer = bossMon.attackInterval;
                  }
                }
              } else {
                // 보스 처치 성공
                totalSimdeuk += explorePendingRewards.simdeuk;
                applySimdeuk(ownedArts, equippedArts, equippedSimbeop, explorePendingRewards.simdeuk, state.tier);

                battleResult = {
                  type: 'explore_win',
                  simdeuk: explorePendingRewards.simdeuk,
                  drops: explorePendingRewards.drops,
                  message: '답파 승리! 전체 보상 획득!',
                };
                battleMode = 'none';
                currentEnemy = null;
                battleLog.push('답파 승리!');

                if (hasPassive(state, 'post_battle_heal')) {
                  hp = Math.min(hp + maxHp * 0.05, maxHp);
                }
              }
            } else if (battleMode === 'hunt') {
              totalSimdeuk += simdeuk;
              applySimdeuk(ownedArts, equippedArts, equippedSimbeop, simdeuk, state.tier);
              battleLog.push(`— ${monDef.name} 처치. 심득 +${simdeuk} —`);

              if (huntTarget) {
                const nextMon = getMonsterDef(huntTarget);
                if (nextMon) {
                  currentEnemy = spawnEnemy(nextMon);
                  // 지정 사냥: 새 적 타이머 초기화
                  const pInterval = calcAttackInterval(stats.gyeongsin);
                  playerAttackTimer = pInterval;
                  enemyAttackTimer = nextMon.attackInterval;
                }
              }
            }
          }
        } else {
          // 적이 살아있으면 → 적 공격 타이머 (플레이어 먼저 판정 후)
          if (currentEnemy.attackPower > 0 && currentEnemy.attackInterval > 0) {
            enemyAttackTimer -= dt;
            if (enemyAttackTimer <= 0) {
              enemyAttackTimer += currentEnemy.attackInterval; // 잔여 이월

              const dodge = calcEvasion(state);
              if (Math.random() * 100 < dodge) {
                // 회피 성공 (금색)
                const monDef = getMonsterDef(currentEnemy.id);
                const eName = monDef?.name ?? currentEnemy.id;
                battleLog.push(`${eName}의 공격을 가볍게 피했다!`);
              } else {
                // 피격
                hp -= currentEnemy.attackPower;
                const monDef = getMonsterDef(currentEnemy.id);
                if (monDef) {
                  battleLog.push(getMonsterAttackMsg(monDef, currentEnemy.attackPower));
                }
              }
            }
          }
        }

        // HP <= 0: 전투 종료
        if (hp <= 0) {
          hp = 1;
          if (battleMode === 'explore') {
            battleResult = {
              type: 'death',
              simdeuk: 0,
              drops: [],
              message: '패배... 보상이 없습니다.',
            };
          } else {
            battleResult = {
              type: 'hunt_end',
              simdeuk: totalSimdeuk - state.totalSimdeuk,
              drops: [],
              message: '사망! 전투 종료.',
            };
          }
          battleMode = 'none';
          currentEnemy = null;

          if (hasPassive(state, 'post_battle_heal')) {
            hp = Math.min(hp + maxHp * 0.05, maxHp);
          }
        }

        // 보스 타이머
        if (isBossPhase && bossTimer > 0) {
          bossTimer -= dt;
          if (bossTimer <= 0) {
            battleResult = {
              type: 'explore_fail',
              simdeuk: 0,
              drops: [],
              message: '시간 초과! 보상이 없습니다.',
            };
            battleMode = 'none';
            currentEnemy = null;
          }
        }
      }

      // 5) 업적 체크
      let achievements = [...state.achievements];
      let artPoints = state.artPoints;
      const ctx = buildAchievementContext({
        ...state, killCounts, bossKillCounts, ownedArts,
        totalSimdeuk, achievements, hiddenEncountered,
        totalYasanKills,
      });

      for (const ach of ACHIEVEMENTS) {
        if (achievements.includes(ach.id)) continue;
        if (ach.prerequisite && !achievements.includes(ach.prerequisite)) continue;
        if (ach.check(ctx)) {
          achievements.push(ach.id);
          artPoints += 1;
          battleLog.push(`업적 달성: ${ach.name}! 포인트 +1`);
        }
      }

      // Tutorial flags
      const tutorialFlags = { ...state.tutorialFlags };
      if (killCounts['training_wood'] > 0) tutorialFlags.killedWood = true;
      if (killCounts['training_iron'] > 0) tutorialFlags.killedIron = true;
      if (tutorialFlags.equippedSword && tutorialFlags.equippedSimbeop) {
        tutorialFlags.yasanUnlocked = true;
      }

      return {
        neigong, hp, maxHp, battleMode, currentEnemy,
        exploreStep, exploreOrder, isBossPhase, bossTimer,
        explorePendingRewards, battleLog, killCounts,
        bossKillCounts, totalSimdeuk, totalYasanKills,
        ownedArts, simbeopBurstTimer, battleResult,
        achievements, artPoints, hiddenEncountered,
        tutorialFlags, lastTickTime: now, totalSpentNeigong,
        playerAttackTimer, enemyAttackTimer,
      };
    });
  },
}));

// ============================================================
// 심득 적용
// ============================================================
function applySimdeuk(
  ownedArts: GameState['ownedArts'],
  equippedArts: string[],
  equippedSimbeop: string | null,
  amount: number,
  tier: number,
) {
  if (amount <= 0) return;

  const allEquipped = [...equippedArts];
  if (equippedSimbeop) allEquipped.push(equippedSimbeop);

  const maxGrade = getMaxGrade(tier);

  for (const artId of allEquipped) {
    const owned = ownedArts.find(a => a.id === artId);
    if (!owned) continue;
    if (owned.grade >= maxGrade) continue;

    const artDef = getArtDef(artId);
    if (!artDef) continue;

    owned.proficiency += amount;

    const nextGrade = owned.grade + 1;
    const needed = getSimdeukForGrade(artDef.baseSimdeukCost, nextGrade);
    if (needed > 0 && owned.proficiency >= needed) {
      owned.proficiency -= needed;
      owned.grade = nextGrade;
    }
  }
}

// ============================================================
// 몬스터 정보 공개 레벨 (3장)
// ============================================================
export function getMonsterRevealLevel(killCount: number): number {
  if (killCount >= 20) return 5; // 전부
  if (killCount >= 10) return 4; // 간격
  if (killCount >= 5) return 3;  // 공격력
  if (killCount >= 3) return 2;  // HP
  if (killCount >= 1) return 1;  // 이름
  return 0;                      // ???
}
