/**
 * 무림 방치록 v4.0 — 게임 스토어 (Zustand)
 * Phase 2: 무공 + UI 연결. 초식/절초/초(招) 시스템 가동.
 */
import { create } from 'zustand';
import {
  getArtDef, getMasteryDef, getMasteryDefsForArt,
  type ArtDef, type MasteryDef, type MasteryEffects,
} from '../data/arts';
import { getMonsterDef, getMonsterAttackMsg, type MonsterDef } from '../data/monsters';
import { TIERS, getTierDef, getMaxSimdeuk } from '../data/tiers';
import { FIELDS, getFieldDef, generateExploreOrder } from '../data/fields';
import { ACHIEVEMENTS, type AchievementContext } from '../data/achievements';
import { BALANCE_PARAMS } from '../data/balance';
import { getEquipmentDef, type EquipSlot, type EquipStats, type EquipmentInstance } from '../data/equipment';

// ============================================================
// Constants (shorthand)
// ============================================================
const B = BALANCE_PARAMS;

// ============================================================
// State interface
// ============================================================
export interface InventoryItem {
  id: string;
  itemType: 'art_scroll';
  artId?: string;
  obtainedFrom: string;
  obtainedAt: number;
}

export interface GameState {
  qi: number;                    // 자연의 기운 (구 neigong)
  totalSimdeuk: number;
  totalSpentQi: number;          // 구 totalSpentNeigong
  stats: { gi: number; sim: number; che: number };
  hp: number;
  maxHp: number;
  tier: number;

  // 전투 자원
  stamina: number;               // 현재 내력
  ultCooldowns: Record<string, number>;  // 무공별 절초 쿨타임
  currentBattleDuration: number; // 현재 적과의 전투 경과 시간

  equippedSimbeop: string | null;
  ownedArts: { id: string; totalSimdeuk: number }[];
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
  battleResult: BattleResult | null;

  // 전투 애니메이션 상태
  floatingTexts: FloatingText[];
  nextFloatingId: number;
  playerAnim: string;
  enemyAnim: string;

  // v2.0+ 필드
  activeMasteries: Record<string, string[]>;
  gameSpeed: number;
  currentSaveSlot: number;
  fieldUnlocks: Record<string, boolean>;
  inventory: InventoryItem[];
  discoveredMasteries: string[];
  pendingEnlightenments: { artId: string; masteryId: string; masteryName: string }[];

  // 장비 시스템
  equipment: Record<EquipSlot, EquipmentInstance | null>;
  equipmentInventory: EquipmentInstance[];
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

export interface OfflineResult {
  elapsedTime: number;
  qiGained: number;
  simdeukGained: number;
  killCount: number;
  deathCount: number;
  battleTime: number;
  idleTime: number;
  achievementsEarned: string[];
  dropsGained: string[];
}

export interface SaveMeta {
  slotIndex: number;
  savedAt: number;
  tierName: string;
  totalStats: number;
}

// ============================================================
// Actions interface
// ============================================================
export interface GameActions {
  tick: (forceDt?: number) => void;
  investStat: (stat: 'gi' | 'sim' | 'che') => void;
  healWithQi: () => void;

  equipArt: (artId: string) => void;
  unequipArt: (artId: string) => void;
  equipSimbeop: (artId: string) => void;
  unequipSimbeop: () => void;

  startExplore: (fieldId: string) => void;
  startHunt: (fieldId: string, monsterId: string) => void;
  abandonBattle: () => void;
  dismissBattleResult: () => void;

  attemptBreakthrough: () => void;

  saveGame: (slot?: number) => void;
  loadGame: (slot: number) => void;
  resetGame: (slot?: number) => void;
  deleteSlot: (slot: number) => void;
  getSaveSlots: () => (SaveMeta | null)[];

  setGameSpeed: (speed: number) => void;

  activateMastery: (artId: string, masteryId: string) => void;
  deactivateMastery: (artId: string, masteryId: string) => void;
  resetAllMasteries: () => void;

  processOfflineProgress: (elapsedSeconds: number) => OfflineResult;

  learnScroll: (itemId: string) => void;
  discardItem: (itemId: string) => void;
  dismissEnlightenment: () => void;

  equipItem: (instanceId: string) => void;
  unequipItem: (slot: EquipSlot) => void;
  discardEquipment: (instanceId: string) => void;

  getQiPerSec: () => number;
  getAttackInterval: () => number;
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
export function createInitialState(): GameState {
  return {
    qi: 0,
    totalSimdeuk: 0,
    totalSpentQi: 0,
    stats: { gi: 0, sim: 0, che: 0 },
    hp: B.HP_BASE,
    maxHp: B.HP_BASE,
    tier: 0,

    stamina: 0,
    ultCooldowns: {},
    currentBattleDuration: 0,

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
    battleResult: null,
    floatingTexts: [],
    nextFloatingId: 0,
    playerAnim: '',
    enemyAnim: '',
    activeMasteries: {},
    gameSpeed: 1,
    currentSaveSlot: 0,
    fieldUnlocks: { training: true, yasan: false, inn: false },
    inventory: [],
    discoveredMasteries: [],
    pendingEnlightenments: [],
    equipment: { weapon: null, armor: null, gloves: null, boots: null },
    equipmentInventory: [],
  };
}

// ============================================================
// 전투 수치 계산 함수 (설계서 8.3)
// ============================================================

/** ATK = ATK_BASE + ATK_G_W × G/(G+ATK_G_H) + ATK_M_W × M/(M+ATK_M_H) + ATK_T_W × T/(T+ATK_T_H) */
export function calcATK(gi: number, sim: number, che: number): number {
  return B.ATK_BASE
       + B.ATK_G_W * gi / (gi + B.ATK_G_H)
       + B.ATK_M_W * sim / (sim + B.ATK_M_H)
       + B.ATK_T_W * che / (che + B.ATK_T_H);
}

/** CRIT_DMG = CRITD_BASE + CRITD_M_W × M/(M+CRITD_M_H) */
export function calcCritDmg(sim: number): number {
  return B.CRITD_BASE + B.CRITD_M_W * sim / (sim + B.CRITD_M_H);
}

/** HP = HP_BASE + HP_T_W × T/(T+HP_T_H) + HP_G_W × G/(G+HP_G_H) + hpBonus */
export function calcMaxHp(che: number, gi: number, hpBonus: number = 0): number {
  return Math.floor(
    B.HP_BASE
    + B.HP_T_W * che / (che + B.HP_T_H)
    + B.HP_G_W * gi / (gi + B.HP_G_H)
    + hpBonus
  );
}

/** STAMINA = STAM_BASE + STAM_M_W × M/(M+STAM_M_H) */
export function calcStamina(sim: number): number {
  return Math.floor(B.STAM_BASE + B.STAM_M_W * sim / (sim + B.STAM_M_H));
}

/** STAMINA_REGEN = REGEN_BASE + REGEN_T_W × T/(T+REGEN_T_H) */
export function calcStaminaRegen(che: number): number {
  return B.REGEN_BASE + B.REGEN_T_W * che / (che + B.REGEN_T_H);
}

// ============================================================
// Mastery effects aggregation
// ============================================================

/** 해금된 MasteryDef의 effects를 순회하여 합산. synergyArtId 조건 적용. */
export function gatherMasteryEffects(state: GameState): MasteryEffects {
  const result: MasteryEffects = {};
  const { activeMasteries, equippedArts, equippedSimbeop } = state;

  for (const [artId, masteryIds] of Object.entries(activeMasteries)) {
    const artDef = getArtDef(artId);
    if (!artDef) continue;
    // 무공이 장착 중이어야 효과 적용
    const isEquipped = equippedArts.includes(artId) || equippedSimbeop === artId;
    if (!isEquipped) continue;

    for (const mId of masteryIds) {
      const mDef = artDef.masteries.find(m => m.id === mId);
      if (!mDef?.effects) continue;
      const eff = mDef.effects;

      // synergyArtId 확인
      if (eff.synergyArtId) {
        const synergyEquipped = equippedArts.includes(eff.synergyArtId) || equippedSimbeop === eff.synergyArtId;
        if (!synergyEquipped) continue; // 시너지 대상 미장착 → 효과 스킵
      }

      if (eff.unlockUlt) result.unlockUlt = true;
      if (eff.bonusCritRate) result.bonusCritRate = (result.bonusCritRate ?? 0) + eff.bonusCritRate;
      if (eff.bonusDodge) result.bonusDodge = (result.bonusDodge ?? 0) + eff.bonusDodge;
      if (eff.bonusDmgReduction) result.bonusDmgReduction = (result.bonusDmgReduction ?? 0) + eff.bonusDmgReduction;
      if (eff.bonusAtkSpeed) result.bonusAtkSpeed = (result.bonusAtkSpeed ?? 0) + eff.bonusAtkSpeed;
      if (eff.bonusRegenPerSec) result.bonusRegenPerSec = (result.bonusRegenPerSec ?? 0) + eff.bonusRegenPerSec;
      if (eff.bonusQiPerSec) result.bonusQiPerSec = (result.bonusQiPerSec ?? 0) + eff.bonusQiPerSec;
      if (eff.bonusCombatQiRatio) result.bonusCombatQiRatio = (result.bonusCombatQiRatio ?? 0) + eff.bonusCombatQiRatio;
      if (eff.normalMultiplierCapIncrease) result.normalMultiplierCapIncrease = (result.normalMultiplierCapIncrease ?? 0) + eff.normalMultiplierCapIncrease;
      if (eff.ultChange) result.ultChange = eff.ultChange; // 마지막 것이 우선
      if (eff.killBonusEnabled) result.killBonusEnabled = true;
    }
  }
  return result;
}

/** 장착 장비의 스탯 합산 */
export function gatherEquipmentStats(state: GameState): EquipStats {
  const result: EquipStats = {};
  for (const slot of ['weapon', 'armor', 'gloves', 'boots'] as EquipSlot[]) {
    const inst = state.equipment[slot];
    if (!inst) continue;
    const def = getEquipmentDef(inst.defId);
    if (!def) continue;
    for (const [key, val] of Object.entries(def.stats)) {
      if (typeof val === 'number') {
        (result as any)[key] = ((result as any)[key] ?? 0) + val;
      }
    }
  }
  return result;
}

/** 심법의 2초(전투 수련)가 해금되어 있는지 확인 */
function isCombatQiUnlocked(state: GameState): boolean {
  if (!state.equippedSimbeop) return false;
  const masteryIds = state.activeMasteries[state.equippedSimbeop] ?? [];
  const artDef = getArtDef(state.equippedSimbeop);
  if (!artDef) return false;
  // stage 2인 mastery가 해금되어 있는지
  return artDef.masteries.some(m => m.stage === 2 && masteryIds.includes(m.id));
}

/** BASE_CRIT_RATE + 해금된 MasteryDef bonusCritRate 합산, 캡 적용 */
export function calcCritRate(state: GameState): number {
  const effects = gatherMasteryEffects(state);
  return Math.min(B.BASE_CRIT_RATE + (effects.bonusCritRate ?? 0), B.CRIT_RATE_CAP);
}

/** 스탯 기반 회복 + 해금된 MasteryDef bonusRegenPerSec 합산 */
export function calcEffectiveRegen(state: GameState): number {
  const effects = gatherMasteryEffects(state);
  return calcStaminaRegen(state.stats.che) + (effects.bonusRegenPerSec ?? 0);
}

/** 해금된 MasteryDef bonusDmgReduction 합산 */
export function calcDmgReduction(state: GameState): number {
  const effects = gatherMasteryEffects(state);
  return effects.bonusDmgReduction ?? 0;
}

/** 해금된 MasteryDef bonusDodge 합산, DODGE_CAP 적용 */
export function calcDodge(state: GameState): number {
  const effects = gatherMasteryEffects(state);
  return Math.min((effects.bonusDodge ?? 0) / 100, B.DODGE_CAP);
}

/** BASE_QI_PER_SEC + 심법 심득 성장분 + 해금된 MasteryDef bonusQiPerSec 합산 */
export function calcQiPerSec(state: GameState): number {
  let total = B.BASE_QI_PER_SEC;

  // 심법 심득 성장분
  if (state.equippedSimbeop) {
    const artDef = getArtDef(state.equippedSimbeop);
    const owned = state.ownedArts.find(a => a.id === state.equippedSimbeop);
    if (artDef && owned && artDef.growth.baseQiPerSec != null) {
      const rate = artDef.growth.qiGrowthRate ?? B.QI_GROWTH_RATE;
      const grown = artDef.growth.baseQiPerSec + rate * Math.sqrt(owned.totalSimdeuk);
      const capped = Math.min(grown, artDef.growth.maxQiPerSec ?? Infinity);
      total += capped;
    }
  }

  // 초(招) bonusQiPerSec
  const effects = gatherMasteryEffects(state);
  total += effects.bonusQiPerSec ?? 0;

  return total;
}

/** 전투 중 기운 생산 비율. 2초 해금 후만 활성. */
export function calcCombatQiRatio(state: GameState): number {
  if (!isCombatQiUnlocked(state)) return 0;

  const artDef = state.equippedSimbeop ? getArtDef(state.equippedSimbeop) : null;
  const owned = state.equippedSimbeop ? state.ownedArts.find(a => a.id === state.equippedSimbeop) : null;

  let ratio = B.COMBAT_QI_BASE;
  if (artDef && owned) {
    const rate = artDef.growth.combatQiGrowthRate ?? B.COMBAT_QI_GROWTH_RATE;
    ratio = (artDef.growth.baseCombatQiRatio ?? B.COMBAT_QI_BASE) + rate * Math.sqrt(owned.totalSimdeuk);
  }
  const cap = artDef?.growth.maxCombatQiRatio ?? B.COMBAT_QI_CAP;
  ratio = Math.min(ratio, cap);

  // 초(招) bonusCombatQiRatio (캡 밖에서 가산)
  const effects = gatherMasteryEffects(state);
  ratio += effects.bonusCombatQiRatio ?? 0;

  return ratio;
}

/** 무공의 초식 배율 계산 (심득 기반 성장 + 상한). artId 지정 시 해당 무공, 미지정 시 첫 번째 장착 active 무공. */
export function calcNormalMultiplier(state: GameState, artId?: string): { multiplier: number; cap: number; artDef: ArtDef | null } {
  // 대상 무공 찾기
  const targetId = artId ?? state.equippedArts.find(id => {
    const def = getArtDef(id);
    return def && def.artType === 'active';
  });
  if (!targetId) return { multiplier: B.BARE_HAND_MULTIPLIER, cap: B.BARE_HAND_MULTIPLIER, artDef: null };

  const artDef = getArtDef(targetId)!;
  if (!artDef) return { multiplier: B.BARE_HAND_MULTIPLIER, cap: B.BARE_HAND_MULTIPLIER, artDef: null };
  const owned = state.ownedArts.find(a => a.id === targetId);
  const simdeuk = owned?.totalSimdeuk ?? 0;

  const baseM = artDef.growth.baseNormalMultiplier ?? 1.0;
  const rate = artDef.growth.normalGrowthRate ?? B.NORMAL_GROWTH_RATE;

  // per-art: 해당 무공의 active mastery에서 normalMultiplierCapIncrease 직접 조회
  const artMasteryIds = state.activeMasteries[targetId] ?? [];
  let capIncrease = 0;
  for (const mId of artMasteryIds) {
    const mDef = artDef.masteries.find(m => m.id === mId);
    capIncrease += mDef?.effects?.normalMultiplierCapIncrease ?? 0;
  }
  const effectiveCap = (artDef.normalMultiplierCap ?? 1.0) + capIncrease;

  const multiplier = Math.min(baseM + rate * Math.sqrt(simdeuk), effectiveCap);
  return { multiplier, cap: effectiveCap, artDef };
}

/** 장착된 무공 중 ult 가능한 첫 번째의 절초 이름 (ultChange 반영) */
export function getActiveUltName(state: GameState): string {
  // 장착 무공 중 ult 있는 첫 번째 찾기
  for (const artId of state.equippedArts) {
    const artDef = getArtDef(artId);
    if (!artDef?.ultMultiplier) continue;

    // 해당 무공의 active mastery에서 ultChange 조회
    const artMasteryIds = state.activeMasteries[artId] ?? [];
    for (const mId of artMasteryIds) {
      const mDef = artDef.masteries.find(m => m.id === mId);
      if (mDef?.effects?.ultChange?.name) return mDef.effects.ultChange.name;
    }
    if (artDef.ultMessages?.[0]) return artDef.ultMessages[0];
  }
  return '절초';
}

function calcStatCost(level: number): number {
  return Math.floor(B.COST_BASE * Math.pow(B.COST_RATE, level));
}

// ============================================================
// Helper functions
// ============================================================

function getTrainingSimdeuk(state: GameState, monsterId: string): number {
  if ((state.killCounts[monsterId] ?? 0) > 0) return 0;
  const mon = getMonsterDef(monsterId);
  return mon?.simdeuk ?? 0;
}

export function spawnEnemy(monDef: MonsterDef): GameState['currentEnemy'] {
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
  const artSimdeuks: Record<string, number> = {};
  for (const a of state.ownedArts) artSimdeuks[a.id] = a.totalSimdeuk;
  return {
    killCounts: state.killCounts,
    bossKillCounts: state.bossKillCounts,
    ownedArts: state.ownedArts.map(a => a.id),
    artSimdeuks,
    totalStats: state.stats.gi + state.stats.sim + state.stats.che,
    totalSimdeuk: state.totalSimdeuk,
    tier: state.tier,
    achievements: state.achievements,
    hiddenEncountered: state.hiddenEncountered,
    fieldUnlocks: state.fieldUnlocks,
  };
}

/** usedPoints 계산: 장착 무공 cost + activeMasteries pointCost 합산 */
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

// ============================================================
// simulateTick — 순수 함수 (설계서 8.4~8.6)
// ============================================================
export function simulateTick(state: GameState, dt: number, isSimulating: boolean): Partial<GameState> {
  let {
    qi, hp, maxHp, battleMode, currentEnemy,
    exploreStep, exploreOrder, isBossPhase, bossTimer,
    explorePendingRewards, battleLog, currentField,
    killCounts, bossKillCounts, totalSimdeuk, totalYasanKills,
    ownedArts, equippedArts, equippedSimbeop,
    battleResult, hiddenEncountered,
    huntTarget, totalSpentQi,
    playerAttackTimer, enemyAttackTimer,
    floatingTexts, nextFloatingId, playerAnim, enemyAnim,
    fieldUnlocks, inventory,
    discoveredMasteries, pendingEnlightenments,
    stamina, currentBattleDuration,
  } = state;
  let equipmentInventory = [...state.equipmentInventory];
  let ultCooldowns = { ...state.ultCooldowns };
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
  if (isSimulating) {
    if (battleLog.length > 10) battleLog = battleLog.slice(-10);
  } else {
    if (battleLog.length > 100) battleLog = battleLog.slice(-40);
  }
  fieldUnlocks = { ...fieldUnlocks };
  inventory = [...inventory];
  discoveredMasteries = [...discoveredMasteries];
  pendingEnlightenments = [...pendingEnlightenments];

  if (!isSimulating) {
    floatingTexts = [...floatingTexts];
  }

  const isBattling = battleMode !== 'none';

  // 전투 수치 계산
  const { gi, sim, che } = stats;
  const equipStats = gatherEquipmentStats(state);
  const atk = calcATK(gi, sim, che) + (equipStats.bonusAtk ?? 0);
  const critDmg = calcCritDmg(sim);
  const critRate = Math.min(
    calcCritRate(state) + (equipStats.bonusCritRate ?? 0),
    B.CRIT_RATE_CAP
  );
  const masteryDodge = calcDodge(state);
  const dodgeRate = Math.min(
    masteryDodge + (equipStats.bonusDodge ?? 0) / 100,
    B.DODGE_CAP
  );
  const dmgReduction = calcDmgReduction(state) + (equipStats.bonusDmgReduction ?? 0);
  const maxStamina = calcStamina(sim);
  const effectiveRegen = calcEffectiveRegen(state);
  const qiPerSec = calcQiPerSec(state);
  const combatQiRatio = calcCombatQiRatio(state);
  const masteryEffects = isBattling ? gatherMasteryEffects(state) : null;

  // 1) 기운 생산 (비전투)
  if (!isBattling) {
    qi += qiPerSec * dt;
  }

  // 1-1) 전투 중 기운 생산
  if (isBattling && combatQiRatio > 0) {
    qi += qiPerSec * combatQiRatio * dt;
  }

  // 2) HP 자동회복 (전투 외)
  if (!isBattling) {
    maxHp = calcMaxHp(che, gi, equipStats.bonusHp ?? 0);
    hp = Math.min(hp + maxHp * 0.05 * dt, maxHp);
  }

  // 3) 전투 (타이머 기반)
  if (isBattling && currentEnemy) {
    // 전투 경과 시간 추적
    currentBattleDuration += dt;

    // 내력 회복
    stamina = Math.min(stamina + effectiveRegen * dt, maxStamina);

    // 절초 쿨타임 감소 (무공별 독립)
    for (const artId of Object.keys(ultCooldowns)) {
      ultCooldowns[artId] -= dt;
      if (ultCooldowns[artId] <= 0) delete ultCooldowns[artId];
    }

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
      const atkSpeedBonus = (masteryEffects?.bonusAtkSpeed ?? 0) + (equipStats.bonusAtkSpeed ?? 0);
      const attackInterval = Math.max(B.BASE_ATTACK_INTERVAL - atkSpeedBonus, B.ATK_SPEED_MIN);
      playerAttackTimer += attackInterval;

      currentEnemy = { ...currentEnemy };

      const effects = masteryEffects!;
      const { activeMasteries } = state;

      let damage: number;
      let isCritical = false;
      let attackName = '평타';
      let isUlt = false;

      // 절초 판정: 무공별 독립 (장착 무공 중 절초 발동 가능 후보 필터링)
      const ultCandidates = equippedArts.filter(artId => {
        const def = getArtDef(artId);
        if (!def?.ultMultiplier || def.ultCost == null) return false;
        const artActiveMasteries = activeMasteries[artId] ?? [];
        const hasUltUnlock = def.masteries.some(m =>
          artActiveMasteries.includes(m.id) && m.effects?.unlockUlt);
        if (!hasUltUnlock) return false;
        return stamina >= def.ultCost! && (ultCooldowns[artId] ?? 0) <= 0;
      });

      if (ultCandidates.length > 0) {
        // 절초 발동 (후보 중 랜덤 1개)
        const chosenId = ultCandidates[Math.floor(Math.random() * ultCandidates.length)];
        const chosenDef = getArtDef(chosenId)!;

        isUlt = true;
        let ultMult = chosenDef.ultMultiplier!;

        // ultChange: 해당 무공의 active mastery에서 직접 조회 (per-art)
        const artMasteryIds = activeMasteries[chosenId] ?? [];
        let ultChangeName: string | undefined;
        for (const mId of artMasteryIds) {
          const mDef = chosenDef.masteries.find(m => m.id === mId);
          if (mDef?.effects?.ultChange) {
            if (mDef.effects.ultChange.simBonusW) {
              ultMult += mDef.effects.ultChange.simBonusW * sim / (sim + (mDef.effects.ultChange.simBonusH ?? 120));
            }
            ultChangeName = mDef.effects.ultChange.name;
          }
        }

        damage = atk * ultMult;
        stamina -= chosenDef.ultCost!;
        ultCooldowns[chosenId] = chosenDef.ultCooldown ?? 0;
        attackName = ultChangeName ?? chosenDef.ultMessages?.[0] ?? '절초';
      } else {
        // 일반 초식: 균등 랜덤 (모든 장착 active 무공)
        const activeCandidates = equippedArts
          .map(id => ({ id, def: getArtDef(id)!, owned: ownedArts.find(a => a.id === id) }))
          .filter(x => x.def && x.def.artType === 'active' && x.owned);

        if (activeCandidates.length > 0) {
          const chosen = activeCandidates[Math.floor(Math.random() * activeCandidates.length)];
          const baseM = chosen.def.growth.baseNormalMultiplier ?? 1.0;
          const rate = chosen.def.growth.normalGrowthRate ?? B.NORMAL_GROWTH_RATE;

          // normalMultiplierCapIncrease: 해당 무공의 mastery에서 직접 조회 (per-art)
          const artMasteryIds = activeMasteries[chosen.id] ?? [];
          let capIncrease = 0;
          for (const mId of artMasteryIds) {
            const mDef = chosen.def.masteries.find(m => m.id === mId);
            capIncrease += mDef?.effects?.normalMultiplierCapIncrease ?? 0;
          }
          const effectiveCap = (chosen.def.normalMultiplierCap ?? 1.0) + capIncrease;
          const normalMult = Math.min(baseM + rate * Math.sqrt(chosen.owned!.totalSimdeuk), effectiveCap);

          damage = atk * normalMult;

          // 초식 메시지 랜덤 선택
          if (chosen.def.normalMessages && chosen.def.normalMessages.length > 0) {
            attackName = chosen.def.normalMessages[Math.floor(Math.random() * chosen.def.normalMessages.length)];
          } else {
            attackName = chosen.def.name;
          }
        } else {
          // 무공 없음: 평타
          damage = atk * B.BARE_HAND_MULTIPLIER;
        }
      }

      // 치명타 판정
      if (Math.random() < critRate) {
        damage *= critDmg / 100;
        isCritical = true;
      }

      damage = Math.floor(damage);
      currentEnemy.hp -= damage;

      // 로그 생성
      const monDef = getMonsterDef(currentEnemy.id);
      const eName = monDef?.name ?? currentEnemy.id;

      if (isUlt) {
        // 절초 로그 (강조)
        if (attackName === '태산압정') {
          battleLog.push(`비기 — 태산압정! ${eName}에게 ${damage}의 거대한 충격!`);
        } else {
          battleLog.push(`절초 — ${attackName}! ${eName}에게 ${damage} 피해!`);
        }
      } else if (isCritical) {
        battleLog.push(`치명타! ${attackName} ${eName}에게 ${damage} 피해!`);
      } else {
        battleLog.push(`${attackName} ${eName}에게 ${damage} 피해를 입혔다.`);
      }

      if (!isSimulating) {
        if (isUlt) {
          floatingTexts = [...floatingTexts, { id: nextFloatingId++, text: `${damage} 절초!`, type: 'critical' as const, timestamp: Date.now() }];
        } else if (isCritical) {
          floatingTexts = [...floatingTexts, { id: nextFloatingId++, text: `${damage} 치명타!`, type: 'critical' as const, timestamp: Date.now() }];
        } else if (damage > 0) {
          floatingTexts = [...floatingTexts, { id: nextFloatingId++, text: `${damage}`, type: 'damage' as const, timestamp: Date.now() }];
        }
        if (floatingTexts.length > 15) floatingTexts = floatingTexts.slice(-15);
        playerAnim = 'attack';
      }
    }

    // 적 사망 체크
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

        // 드롭
        const drops: string[] = [];
        for (const drop of monDef.drops) {
          if (Math.random() < drop.chance) {
            if (!ownedArts.some(a => a.id === drop.artId) && !inventory.some(i => i.artId === drop.artId)) {
              drops.push(drop.artId);
              inventory.push({
                id: `${Date.now()}_${drop.artId}`,
                itemType: 'art_scroll',
                artId: drop.artId,
                obtainedFrom: monDef.id,
                obtainedAt: Date.now(),
              });
              battleLog.push(`${getArtDef(drop.artId)?.name ?? drop.artId} 비급이 전낭에 담겼다!`);
            }
          }
        }

        // 장비 드롭 처리
        if (monDef.equipDrops) {
          for (const eqDrop of monDef.equipDrops) {
            if (Math.random() < eqDrop.chance) {
              const eqDef = getEquipmentDef(eqDrop.equipId);
              if (eqDef) {
                const instance: EquipmentInstance = {
                  instanceId: `eq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                  defId: eqDrop.equipId,
                  obtainedFrom: monDef.id,
                  obtainedAt: Date.now(),
                };
                equipmentInventory.push(instance);
                battleLog.push(`${eqDef.name}을(를) 획득했다!`);
              }
            }
          }
        }

        // 처치 시 기운 보너스 (4초 전투 심법)
        if (masteryEffects?.killBonusEnabled && combatQiRatio > 0) {
          const combatQiRate = qiPerSec * combatQiRatio;
          const bonusQi = combatQiRate * currentBattleDuration * B.KILL_BONUS_RATIO;
          qi += bonusQi;
        }

        // 초(招) 발견 체크 (새 discovery 포맷)
        const allArts = [...new Set([...equippedArts, ...(equippedSimbeop ? [equippedSimbeop] : [])])];
        for (const artId of allArts) {
          const artDef = getArtDef(artId);
          const artOwned = ownedArts.find(a => a.id === artId);
          if (!artDef || !artOwned) continue;
          for (const m of artDef.masteries) {
            if (!m.discovery) continue;
            if (discoveredMasteries.includes(m.id)) continue;
            let discovered = false;
            if (m.discovery.type === 'simdeuk' && m.discovery.threshold != null) {
              if (artOwned.totalSimdeuk >= m.discovery.threshold) discovered = true;
            } else if (m.discovery.type === 'boss' && m.discovery.bossId) {
              if ((bossKillCounts[m.discovery.bossId] ?? 0) >= 1) discovered = true;
            }
            if (discovered) {
              discoveredMasteries.push(m.id);
              pendingEnlightenments.push({ artId, masteryId: m.id, masteryName: m.name });
              battleLog.push(`깨달음! ${artDef.name}의 오의 '${m.name}'을(를) 깨우쳤다!`);
            }
          }
        }

        // 선언적 전장 해금: unlockCondition 체크
        if (monDef.isBoss) {
          for (const field of FIELDS) {
            if (fieldUnlocks[field.id]) continue;
            const cond = field.unlockCondition;
            if (!cond) continue;
            const bossOk = !cond.bossKill || cond.bossKill === monDef.id;
            const tierOk = cond.minTier == null || state.tier >= cond.minTier;
            if (bossOk && tierOk) {
              fieldUnlocks[field.id] = true;
            }
          }
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
              currentBattleDuration = 0;
              stamina = 0;
              ultCooldowns = {};
              battleLog.push(`— ${nextMon.name} 등장 —`);
              if (nextMon.isHidden) hiddenEncountered = true;
              playerAttackTimer = B.BASE_ATTACK_INTERVAL;
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
                currentBattleDuration = 0;
                stamina = 0;
                ultCooldowns = {};
                battleLog.push(`— 보스 등장! ${bossMon.name}이(가) 나타났다! —`);
                playerAttackTimer = B.BASE_ATTACK_INTERVAL;
                enemyAttackTimer = bossMon.attackInterval;
              }
            }
          } else {
            // 보스 처치 성공
            totalSimdeuk += explorePendingRewards.simdeuk;
            applySimdeuk(ownedArts, equippedArts, equippedSimbeop, explorePendingRewards.simdeuk, state.tier, battleLog);

            battleResult = {
              type: 'explore_win',
              simdeuk: explorePendingRewards.simdeuk,
              drops: explorePendingRewards.drops,
              message: '답파 승리! 전체 보상 획득!',
            };
            battleMode = 'none';
            currentEnemy = null;
            stamina = 0;
            ultCooldowns = {};
            currentBattleDuration = 0;
            battleLog.push('답파 승리!');
          }
        } else if (battleMode === 'hunt') {
          totalSimdeuk += simdeuk;
          applySimdeuk(ownedArts, equippedArts, equippedSimbeop, simdeuk, state.tier, battleLog);
          battleLog.push(`— ${monDef.name} 처치. 심득 +${simdeuk} —`);

          if (huntTarget) {
            const nextMon = getMonsterDef(huntTarget);
            if (nextMon) {
              currentEnemy = spawnEnemy(nextMon);
              // hunt: 내력 유지 (지정 사냥 중 몬스터 간 내력 유지)
              currentBattleDuration = 0;
              playerAttackTimer = B.BASE_ATTACK_INTERVAL;
              enemyAttackTimer = nextMon.attackInterval;
            }
          }
        }
      }
    } else {
      // 적이 살아있으면 → 적 공격 타이머
      if (currentEnemy.attackPower > 0 && currentEnemy.attackInterval > 0) {
        enemyAttackTimer -= dt;
        if (enemyAttackTimer <= 0) {
          enemyAttackTimer += currentEnemy.attackInterval;

          // 회피 판정 (설계서 5.5)
          if (Math.random() < dodgeRate) {
            // 회피 성공
            const monDef = getMonsterDef(currentEnemy.id);
            const eName = monDef?.name ?? currentEnemy.id;
            battleLog.push(`${eName}의 공격을 가볍게 피했다!`);

            if (!isSimulating) {
              floatingTexts = [...floatingTexts, { id: nextFloatingId++, text: '회피!', type: 'evade' as const, timestamp: Date.now() }];
              if (floatingTexts.length > 15) floatingTexts = floatingTexts.slice(-15);
            }
          } else {
            // 피격: 피해 = 적 공격력 × (1 - dmgReduction / 100)
            const incomingDmg = Math.floor(currentEnemy.attackPower * (1 - dmgReduction / 100));

            hp -= incomingDmg;

            if (incomingDmg > 0) {
              const monDef = getMonsterDef(currentEnemy.id);
              if (monDef) {
                battleLog.push(getMonsterAttackMsg(monDef, incomingDmg));
              }
            }

            if (!isSimulating) {
              enemyAnim = 'attack';
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
      stamina = 0;
      ultCooldowns = {};
      currentBattleDuration = 0;
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
        stamina = 0;
        ultCooldowns = {};
        currentBattleDuration = 0;
      }
    }
  }

  // 4) 업적 체크
  let achievements = [...state.achievements];
  let artPoints = state.artPoints;

  const ctx = buildAchievementContext({
    ...state, killCounts, bossKillCounts, ownedArts,
    totalSimdeuk, achievements, hiddenEncountered,
    totalYasanKills, fieldUnlocks,
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
    fieldUnlocks.yasan = true;
  }

  const result: Partial<GameState> = {
    qi, hp, maxHp, battleMode, currentEnemy,
    exploreStep, exploreOrder, isBossPhase, bossTimer,
    explorePendingRewards, battleLog, killCounts,
    bossKillCounts, totalSimdeuk, totalYasanKills,
    ownedArts, battleResult,
    achievements, artPoints, hiddenEncountered,
    tutorialFlags, totalSpentQi,
    playerAttackTimer, enemyAttackTimer,
    fieldUnlocks, inventory,
    discoveredMasteries, pendingEnlightenments,
    stamina, ultCooldowns, currentBattleDuration,
    equipmentInventory,
  };

  if (!isSimulating) {
    result.floatingTexts = floatingTexts;
    result.nextFloatingId = nextFloatingId;
    result.playerAnim = playerAnim;
    result.enemyAnim = enemyAnim;
  }

  return result;
}

// ============================================================
// Store
// ============================================================
export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialState(),

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────
  getQiPerSec: () => calcQiPerSec(get()),
  getAttackInterval: () => {
    const state = get();
    const effects = gatherMasteryEffects(state);
    const equipStats = gatherEquipmentStats(state);
    const bonus = (effects.bonusAtkSpeed ?? 0) + (equipStats.bonusAtkSpeed ?? 0);
    return Math.max(B.BASE_ATTACK_INTERVAL - bonus, B.ATK_SPEED_MIN);
  },
  getTotalStats: () => {
    const s = get().stats;
    return s.gi + s.sim + s.che;
  },
  getStatCost: (level: number) => calcStatCost(level),
  getUsedPoints: () => calcUsedPoints(get()),
  getAvailablePoints: () => {
    const state = get();
    return state.artPoints - calcUsedPoints(state);
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
  // Stat investment
  // ─────────────────────────────────────────────
  investStat: (stat) => {
    const state = get();
    if (state.battleMode !== 'none') return;

    const level = state.stats[stat];
    const cost = calcStatCost(level);
    if (state.qi < cost) return;

    const newStats = { ...state.stats, [stat]: level + 1 };
    const newTotalSpent = state.totalSpentQi + cost;
    const eqStats = gatherEquipmentStats(state);
    const newMaxHp = calcMaxHp(newStats.che, newStats.gi, eqStats.bonusHp ?? 0);

    set({
      qi: state.qi - cost,
      stats: newStats,
      totalSpentQi: newTotalSpent,
      maxHp: newMaxHp,
      hp: Math.min(state.hp, newMaxHp),
    });
  },

  // ─────────────────────────────────────────────
  // HP heal with qi
  // ─────────────────────────────────────────────
  healWithQi: () => {
    const state = get();
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

  // ─────────────────────────────────────────────
  // Arts equip/unequip
  // ─────────────────────────────────────────────
  equipArt: (artId) => {
    const state = get();
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
    const state = get();
    if (state.battleMode !== 'none') return;
    set({ equippedArts: state.equippedArts.filter(id => id !== artId) });
  },

  equipSimbeop: (artId) => {
    const state = get();
    if (state.battleMode !== 'none') return;

    const artDef = getArtDef(artId);
    if (!artDef || artDef.artType !== 'simbeop') return;

    const owned = state.ownedArts.find(a => a.id === artId);
    if (!owned) return;

    const flags = { ...state.tutorialFlags };
    if (artId === 'samjae_simbeop') flags.equippedSimbeop = true;

    const fieldUnlocksUpdate: Record<string, boolean> = { ...state.fieldUnlocks };
    if (flags.equippedSword && flags.equippedSimbeop) {
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
    const state = get();
    if (state.battleMode !== 'none') return;
    set({ equippedSimbeop: null });
  },

  // ─────────────────────────────────────────────
  // Battle start
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
      playerAttackTimer: B.BASE_ATTACK_INTERVAL,
      enemyAttackTimer: firstMon.attackInterval,
      stamina: 0,
      ultCooldowns: {},
      currentBattleDuration: 0,
    });
  },

  startHunt: (fieldId, monsterId) => {
    const state = get();
    if (state.battleMode !== 'none') return;

    const monDef = getMonsterDef(monsterId);
    if (!monDef) return;

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
      playerAttackTimer: B.BASE_ATTACK_INTERVAL,
      enemyAttackTimer: monDef.attackInterval,
      stamina: 0,
      ultCooldowns: {},
      currentBattleDuration: 0,
    });
  },

  abandonBattle: () => {
    const state = get();
    if (state.battleMode === 'none') return;

    if (state.battleMode === 'explore') {
      set({
        battleMode: 'none',
        currentEnemy: null,
        stamina: 0,
        ultCooldowns: {},
        currentBattleDuration: 0,
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
        stamina: 0,
        ultCooldowns: {},
        currentBattleDuration: 0,
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
    const totalStats = state.stats.gi + state.stats.sim + state.stats.che;

    if (reqs.totalStats && totalStats < reqs.totalStats) return;
    if (reqs.totalSimdeuk && state.totalSimdeuk < reqs.totalSimdeuk) return;
    if (reqs.bossKills && (state.bossKillCounts['tiger_boss'] ?? 0) < reqs.bossKills) return;

    let newPoints = state.artPoints;
    if (tierDef.rewards?.artPoints) {
      newPoints += tierDef.rewards.artPoints;
    }

    // 경지 상승으로 인한 전장 해금 체크
    const fieldUnlocks = { ...state.fieldUnlocks };
    for (const field of FIELDS) {
      if (field.unlockCondition?.minTier != null && !fieldUnlocks[field.id]) {
        if (nextTier >= field.unlockCondition.minTier) {
          fieldUnlocks[field.id] = true;
        }
      }
    }

    set({
      tier: nextTier,
      artPoints: newPoints,
      fieldUnlocks,
      playerAnim: 'breakthrough',
    });
  },

  // ─────────────────────────────────────────────
  // Game speed
  // ─────────────────────────────────────────────
  setGameSpeed: (speed: number) => {
    set({ gameSpeed: speed });
  },

  // ─────────────────────────────────────────────
  // Mastery actions (심화학습)
  // ─────────────────────────────────────────────
  activateMastery: (artId: string, masteryId: string) => {
    const state = get();
    if (state.battleMode !== 'none') return;

    if (!state.equippedArts.includes(artId) && state.equippedSimbeop !== artId) return;

    const owned = state.ownedArts.find(a => a.id === artId);
    if (!owned) return;

    const mDef = getMasteryDef(artId, masteryId);
    if (!mDef) return;

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

  deactivateMastery: (artId: string, masteryId: string) => {
    const state = get();
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
    const state = get();
    if (state.battleMode !== 'none') return;
    set({ activeMasteries: {} });
  },

  // ─────────────────────────────────────────────
  // Inventory & Enlightenment
  // ─────────────────────────────────────────────
  learnScroll: (itemId: string) => {
    const state = get();
    const item = state.inventory.find(i => i.id === itemId);
    if (!item || item.itemType !== 'art_scroll' || !item.artId) return;
    if (state.ownedArts.some(a => a.id === item.artId)) return;
    set({
      ownedArts: [...state.ownedArts, { id: item.artId!, totalSimdeuk: 0 }],
      inventory: state.inventory.filter(i => i.id !== itemId),
    });
  },
  discardItem: (itemId: string) => {
    const state = get();
    set({ inventory: state.inventory.filter(i => i.id !== itemId) });
  },
  dismissEnlightenment: () => {
    const state = get();
    set({ pendingEnlightenments: state.pendingEnlightenments.slice(1) });
  },

  // ─────────────────────────────────────────────
  // Equipment actions
  // ─────────────────────────────────────────────
  equipItem: (instanceId: string) => {
    const state = get();
    if (state.battleMode !== 'none') return;

    const idx = state.equipmentInventory.findIndex(e => e.instanceId === instanceId);
    if (idx === -1) return;
    const instance = state.equipmentInventory[idx];
    const def = getEquipmentDef(instance.defId);
    if (!def) return;

    const slot = def.slot;
    const newInventory = [...state.equipmentInventory];
    newInventory.splice(idx, 1);

    const newEquipment = { ...state.equipment };
    // 기존 장비가 있으면 인벤토리로 이동
    if (newEquipment[slot]) {
      newInventory.push(newEquipment[slot]!);
    }
    newEquipment[slot] = instance;

    // HP 재계산
    const eqStats = gatherEquipmentStats({ ...state, equipment: newEquipment });
    const newMaxHp = calcMaxHp(state.stats.che, state.stats.gi, eqStats.bonusHp ?? 0);

    set({
      equipment: newEquipment,
      equipmentInventory: newInventory,
      maxHp: newMaxHp,
      hp: Math.min(state.hp, newMaxHp),
    });
  },

  unequipItem: (slot: EquipSlot) => {
    const state = get();
    if (state.battleMode !== 'none') return;

    const equipped = state.equipment[slot];
    if (!equipped) return;

    const newEquipment = { ...state.equipment };
    newEquipment[slot] = null;

    const newInventory = [...state.equipmentInventory, equipped];

    // HP 재계산
    const eqStats = gatherEquipmentStats({ ...state, equipment: newEquipment });
    const newMaxHp = calcMaxHp(state.stats.che, state.stats.gi, eqStats.bonusHp ?? 0);

    set({
      equipment: newEquipment,
      equipmentInventory: newInventory,
      maxHp: newMaxHp,
      hp: Math.min(state.hp, newMaxHp),
    });
  },

  discardEquipment: (instanceId: string) => {
    const state = get();
    const newInventory = state.equipmentInventory.filter(e => e.instanceId !== instanceId);
    set({ equipmentInventory: newInventory });
  },

  // ─────────────────────────────────────────────
  // Save / Load / Reset
  // ─────────────────────────────────────────────
  saveGame: (slot?: number) => {
    const state = get();
    const targetSlot = slot ?? state.currentSaveSlot;

    const saveData = {
      version: '4.0',
      qi: state.qi,
      totalSimdeuk: state.totalSimdeuk,
      totalSpentQi: state.totalSpentQi,
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
      battleMode: state.battleMode,
      huntTarget: state.huntTarget,
      currentField: state.currentField,
      currentEnemy: state.currentEnemy,
      exploreStep: state.exploreStep,
      exploreOrder: state.exploreOrder,
      isBossPhase: state.isBossPhase,
      bossTimer: state.bossTimer,
      explorePendingRewards: state.explorePendingRewards,
      playerAttackTimer: state.playerAttackTimer,
      enemyAttackTimer: state.enemyAttackTimer,
      activeMasteries: state.activeMasteries,
      fieldUnlocks: state.fieldUnlocks,
      inventory: state.inventory,
      discoveredMasteries: state.discoveredMasteries,
      stamina: state.stamina,
      ultCooldowns: state.ultCooldowns,
      currentBattleDuration: state.currentBattleDuration,
      equipment: state.equipment,
      equipmentInventory: state.equipmentInventory,
      currentSaveSlot: targetSlot,
      lastTickTime: Date.now(),
      savedAt: Date.now(),
    };

    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(`murim_save_slot_${targetSlot}`, JSON.stringify(saveData));
      localStorage.setItem('murim_save_current', String(targetSlot));
    }
  },

  loadGame: (slot: number) => {
    if (typeof window === 'undefined' || !window.localStorage) return;

    const raw = localStorage.getItem(`murim_save_slot_${slot}`);
    if (!raw) return;

    try {
      const data = JSON.parse(raw);

      // v4.0 전용 — 마이그레이션 없음, 구버전 세이브는 무시
      if (!data.version || !data.version.startsWith('4')) {
        return;
      }

      const maxHp = calcMaxHp(data.stats?.che ?? 0, data.stats?.gi ?? 0);
      set({
        qi: data.qi ?? 0,
        totalSimdeuk: data.totalSimdeuk ?? 0,
        totalSpentQi: data.totalSpentQi ?? 0,
        stats: data.stats ?? { gi: 0, sim: 0, che: 0 },
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
        lastTickTime: Date.now(),
        battleMode: data.battleMode ?? 'none',
        huntTarget: data.huntTarget ?? null,
        currentField: data.currentField ?? null,
        currentEnemy: data.currentEnemy ?? null,
        exploreStep: data.exploreStep ?? 0,
        exploreOrder: data.exploreOrder ?? [],
        isBossPhase: data.isBossPhase ?? false,
        bossTimer: data.bossTimer ?? 0,
        explorePendingRewards: data.explorePendingRewards ?? { simdeuk: 0, drops: [] },
        playerAttackTimer: data.playerAttackTimer ?? 0,
        enemyAttackTimer: data.enemyAttackTimer ?? 0,
        activeMasteries: data.activeMasteries ?? {},
        fieldUnlocks: data.fieldUnlocks ?? { training: true, yasan: false, inn: false },
        inventory: data.inventory ?? [],
        discoveredMasteries: data.discoveredMasteries ?? [],
        pendingEnlightenments: data.pendingEnlightenments ?? [],
        stamina: data.stamina ?? 0,
        ultCooldowns: data.ultCooldowns ?? {},
        currentBattleDuration: data.currentBattleDuration ?? 0,
        equipment: data.equipment ?? { weapon: null, armor: null, gloves: null, boots: null },
        equipmentInventory: data.equipmentInventory ?? [],
        currentSaveSlot: slot,
        battleResult: null,
        battleLog: [],
      });
    } catch {
      // corrupt save
    }
  },

  resetGame: (slot?: number) => {
    const state = get();
    const targetSlot = slot ?? state.currentSaveSlot;

    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(`murim_save_slot_${targetSlot}`);
    }
    const initialState = createInitialState();
    initialState.currentSaveSlot = targetSlot;
    set(initialState);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('murim_save_current', String(targetSlot));
    }
  },

  deleteSlot: (slot: number) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(`murim_save_slot_${slot}`);
    }
  },

  getSaveSlots: (): (SaveMeta | null)[] => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [null, null, null];
    }

    const slots: (SaveMeta | null)[] = [];
    for (let i = 0; i < 3; i++) {
      try {
        const raw = localStorage.getItem(`murim_save_slot_${i}`);
        if (!raw) {
          slots.push(null);
          continue;
        }
        const data = JSON.parse(raw);
        const stats = data.stats ?? { gi: 0, sim: 0, che: 0 };
        const tierDef = getTierDef(data.tier ?? 0);
        slots.push({
          slotIndex: i,
          savedAt: data.savedAt ?? Date.now(),
          tierName: tierDef.name,
          totalStats: (stats.gi ?? 0) + (stats.sim ?? 0) + (stats.che ?? 0),
        });
      } catch {
        slots.push(null);
      }
    }
    return slots;
  },

  // ─────────────────────────────────────────────
  // Offline progress
  // ─────────────────────────────────────────────
  processOfflineProgress: (elapsedSeconds: number): OfflineResult => {
    const maxSeconds = Math.min(elapsedSeconds, 28800);
    let currentState = { ...get() } as GameState;
    currentState.stats = { ...currentState.stats };
    currentState.killCounts = { ...currentState.killCounts };
    currentState.bossKillCounts = { ...currentState.bossKillCounts };
    currentState.ownedArts = currentState.ownedArts.map(a => ({ ...a }));
    currentState.equippedArts = [...currentState.equippedArts];
    currentState.achievements = [...currentState.achievements];
    currentState.battleLog = [...currentState.battleLog];
    currentState.explorePendingRewards = {
      simdeuk: currentState.explorePendingRewards.simdeuk,
      drops: [...currentState.explorePendingRewards.drops],
    };
    currentState.tutorialFlags = { ...currentState.tutorialFlags };
    currentState.activeMasteries = { ...currentState.activeMasteries };
    currentState.fieldUnlocks = { ...currentState.fieldUnlocks };
    currentState.inventory = [...currentState.inventory];
    currentState.discoveredMasteries = [...currentState.discoveredMasteries];
    currentState.pendingEnlightenments = [...currentState.pendingEnlightenments];
    currentState.floatingTexts = [];

    const startQi = currentState.qi;
    const startSimdeuk = currentState.totalSimdeuk;
    const startAchievements = [...currentState.achievements];
    let killCount = 0;
    let deathCount = 0;
    let battleTime = 0;
    let idleTime = 0;
    const dropsGained: string[] = [];

    let tickCounter = 0;

    for (let i = 0; i < maxSeconds; i++) {
      tickCounter++;

      const shouldCheckAchievements = (tickCounter % 60 === 0);

      const changes = simulateTick(currentState, 1, true);

      if (!shouldCheckAchievements) {
        changes.achievements = currentState.achievements;
        changes.artPoints = currentState.artPoints;
      }

      if (currentState.battleMode !== 'none') {
        battleTime++;
      } else {
        idleTime++;
      }

      if (changes.killCounts) {
        for (const [mId, count] of Object.entries(changes.killCounts)) {
          const prev = currentState.killCounts[mId] ?? 0;
          if (count > prev) killCount += (count - prev);
        }
      }

      if (changes.battleResult && (changes.battleResult.type === 'death' || changes.battleResult.type === 'hunt_end')) {
        if (changes.hp !== undefined && changes.hp <= 1) {
          deathCount++;
        }
      }

      if (changes.inventory) {
        for (const item of changes.inventory) {
          if (!currentState.inventory.some(i => i.id === item.id)) {
            const artDef = item.artId ? getArtDef(item.artId) : null;
            dropsGained.push(artDef?.name ?? item.artId ?? '???');
          }
        }
      }

      currentState = { ...currentState, ...changes } as GameState;
    }

    set({
      ...currentState,
      lastTickTime: Date.now(),
      floatingTexts: [],
      playerAnim: '',
      enemyAnim: '',
    });

    const achievementsEarned = currentState.achievements.filter(
      a => !startAchievements.includes(a)
    );

    return {
      elapsedTime: maxSeconds,
      qiGained: currentState.qi - startQi,
      simdeukGained: currentState.totalSimdeuk - startSimdeuk,
      killCount,
      deathCount,
      battleTime,
      idleTime,
      achievementsEarned,
      dropsGained,
    };
  },

  // ─────────────────────────────────────────────
  // Main tick
  // ─────────────────────────────────────────────
  tick: (forceDt?: number) => {
    set(state => {
      let dt: number;
      let now: number;
      if (forceDt !== undefined) {
        dt = forceDt;
        now = state.lastTickTime + forceDt * 1000;
      } else {
        now = Date.now();
        const rawDt = (now - state.lastTickTime) / 1000;
        dt = Math.min(rawDt * state.gameSpeed, 5);
        if (dt < 0.05) return { lastTickTime: now };
      }

      const changes = simulateTick(state, dt, false);
      return { ...changes, lastTickTime: now };
    });
  },
}));

// ============================================================
// 심득 적용
// ============================================================
const GROWTH_MESSAGES = {
  power: [
    '어렴풋이 더 효율적으로 공격할 수 있게 된 것 같다..',
    '일격에 실리는 힘이 전보다 묵직하게 느껴진다..',
  ],
  qi: [
    '기운이 모이는 속도가 조금 늘어난 것 같다..',
    '단전에 기운이 더 자연스럽게 모여든다..',
  ],
} as const;

function pickGrowthMsg(stat: keyof typeof GROWTH_MESSAGES): string {
  const pool = GROWTH_MESSAGES[stat];
  return pool[Math.floor(Math.random() * pool.length)];
}

function applySimdeuk(
  ownedArts: GameState['ownedArts'],
  equippedArts: string[],
  equippedSimbeop: string | null,
  amount: number,
  tier: number,
  battleLog: string[],
) {
  if (amount <= 0) return;
  const maxSd = getMaxSimdeuk(tier);
  const allEquipped = [...equippedArts];
  if (equippedSimbeop) allEquipped.push(equippedSimbeop);
  for (const artId of allEquipped) {
    const owned = ownedArts.find(a => a.id === artId);
    if (!owned) continue;
    if (owned.totalSimdeuk >= maxSd) continue;

    const before = owned.totalSimdeuk;
    owned.totalSimdeuk = Math.min(owned.totalSimdeuk + amount, maxSd);

    // Phase 1: 간단한 성장 메시지만 (art stats는 Phase 2에서 재설계)
    if (owned.totalSimdeuk > before && Math.random() < 0.1) {
      battleLog.push(pickGrowthMsg('power'));
    }
  }
}

// ============================================================
// 몬스터 정보 공개 레벨
// ============================================================
export function getMonsterRevealLevel(killCount: number): number {
  if (killCount >= 20) return 5;
  if (killCount >= 10) return 4;
  if (killCount >= 5) return 3;
  if (killCount >= 3) return 2;
  if (killCount >= 1) return 1;
  return 0;
}
