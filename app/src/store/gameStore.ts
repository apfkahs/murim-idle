/**
 * 무림 방치록 v4.0 — 게임 스토어 (Zustand)
 * Phase 2: 무공 + UI 연결. 초식/절초/초(招) 시스템 가동.
 */
import { create } from 'zustand';
import {
  getArtDef, getMasteryDef, getMasteryDefsForArt,
  type ArtDef, type MasteryDef, type MasteryEffects, type ProficiencyType,
} from '../data/arts';
import { getMonsterDef, getMonsterAttackMsg, BOSS_PATTERNS, type MonsterDef } from '../data/monsters';
import { TIERS, getTierDef, getMaxSimdeuk } from '../data/tiers';
import { FIELDS, getFieldDef, generateExploreOrder } from '../data/fields';
import { ACHIEVEMENTS, type AchievementContext } from '../data/achievements';
import { BALANCE_PARAMS } from '../data/balance';
import { getEquipmentDef, type EquipSlot, type EquipStats, type EquipmentInstance } from '../data/equipment';
import { MATERIALS, RECIPES, ART_RECIPES } from '../data/materials';

// ============================================================
// Constants (shorthand)
// ============================================================
const B = BALANCE_PARAMS;
const PROF_LABEL: Record<string, string> = {
  sword: '검법', palm: '장법', footwork: '보법', mental: '심법',
};

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
  proficiency: Record<ProficiencyType, number>;  // 숙련도 누적값
  hp: number;
  maxHp: number;
  tier: number;

  // 전투 자원
  stamina: number;               // 현재 내력
  ultCooldowns: Record<string, number>;  // 무공별 절초 쿨타임
  currentBattleDuration: number; // 현재 적과의 전투 경과 시간
  currentBattleDamageDealt: number; // 현재 적과의 교전에서 가한 누적 피해량

  equippedSimbeop: string | null;
  ownedArts: { id: string; totalSimdeuk: number }[];
  equippedArts: string[];
  artPoints: number;

  currentField: string | null;
  battleMode: 'none' | 'explore' | 'hunt';
  huntTarget: string | null;
  pendingHuntRetry: boolean;
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
  achievementCount: number;  // 달성한 업적 수 (경지 돌파 조건에 사용)
  killCounts: Record<string, number>;
  bossKillCounts: Record<string, number>;
  totalYasanKills: number;
  totalKills: number;        // 전체 몬스터 처치 누계
  hiddenRevealedInField: Record<string, string | null>;

  // 보스 패턴
  bossPatternState: { bossStamina: number; rageUsed: boolean } | null;
  playerStunTimer: number;
  lastEnemyAttack: { enemyName: string; attackMessage: string } | null;

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

  // 재료 보관함
  materials: Record<string, number>;

  // 제작 이력 (한 번이라도 만든 레시피 ID)
  craftedRecipes: string[];

  // 해금된 레시피 (requiresUnlock=true인 레시피는 이 목록에 있어야 제작 창에 표시)
  unlockedRecipes: string[];

  // 도감 해금
  obtainedMaterials: string[];  // 한 번이라도 얻은 재료 materialId
  knownEquipment: string[];     // 한 번이라도 얻은 장비 defId
}

export interface BattleResult {
  type: 'explore_win' | 'explore_fail' | 'hunt_end' | 'death';
  simdeuk: number;
  drops: string[];
  message: string;
  deathLog?: string;
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

  craft: (recipeId: string, materialCount: number) => boolean;
  unlockRecipe: (recipeId: string) => void;
  craftArtRecipe: (recipeId: string) => boolean;

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
    proficiency: { sword: 1, palm: 1, footwork: 1, mental: 1 },
    hp: B.HP_BASE,
    maxHp: B.HP_BASE,
    tier: 0,

    stamina: 0,
    ultCooldowns: {},
    currentBattleDuration: 0,
    currentBattleDamageDealt: 0,

    equippedSimbeop: null,
    ownedArts: [],
    equippedArts: [],
    artPoints: 3,
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
    achievements: [],
    achievementCount: 0,
    killCounts: {},
    bossKillCounts: {},
    totalYasanKills: 0,
    totalKills: 0,
    hiddenRevealedInField: {},
    bossPatternState: null,
    playerStunTimer: 0,
    lastEnemyAttack: null,
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
    materials: {},
    craftedRecipes: [],
    unlockedRecipes: [],
    obtainedMaterials: [],
    knownEquipment: [],
  };
}

// ============================================================
// 전투 수치 계산 함수 (설계서 8.3)
// ============================================================

/** CRIT_DMG = CRITD_BASE (고정값, 스탯 무관) */
export function calcCritDmg(): number {
  return B.CRITD_BASE;
}

/** 경지 돌파 누적 배율: 1.1^tier */
export function calcTierMultiplier(tier: number): number {
  return Math.pow(1.1, tier);
}

/** HP = HP_BASE + 체 × K_CHE × tierMult + hpBonus (선형) */
export function calcMaxHp(che: number, hpBonus: number = 0, tierMult: number = 1): number {
  return Math.floor(B.HP_BASE + che * B.STAT_K_CHE * tierMult + hpBonus);
}

/** STAMINA = STAM_BASE + 심 × K_SIM × tierMult (선형) */
export function calcStamina(sim: number, tierMult: number = 1): number {
  return Math.floor(B.STAM_BASE + sim * B.STAT_K_SIM * tierMult);
}

/** STAMINA_REGEN = REGEN_BASE + 기 × K_GI × tierMult (선형) */
export function calcStaminaRegen(gi: number, tierMult: number = 1): number {
  return B.REGEN_BASE + gi * B.STAT_K_GI * tierMult;
}

/** 숙련도 등급: floor(숙련도 / 20000) + 1 */
export function getProficiencyGrade(prof: number): number {
  return Math.floor(prof / 20000) + 1;
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
  const tierMult = calcTierMultiplier(state.tier);
  return calcStaminaRegen(state.stats.gi, tierMult) + (effects.bonusRegenPerSec ?? 0);
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

/** BASE_QI_PER_SEC + 심법 심득 성장분 + 해금된 MasteryDef bonusQiPerSec 합산, 경지 배율 적용 */
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
      // 심법 숙련도 등급에 따라 기운 생산 최대 10배
      const mentalProf = state.proficiency?.mental ?? 1;
      const profMult = Math.min(getProficiencyGrade(mentalProf), B.PROF_QI_MAX_MULT);
      total += capped * profMult;
    }
  }

  // 초(招) bonusQiPerSec
  const effects = gatherMasteryEffects(state);
  total += effects.bonusQiPerSec ?? 0;

  // 경지 돌파 배율 (1.1^tier)
  total *= calcTierMultiplier(state.tier);

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
  return Math.max(1, Math.floor(Math.pow(level, 1.25)));
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

function buildAchievementContext(state: GameState & { totalKills?: number }): AchievementContext {
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
    hiddenRevealedInField: state.hiddenRevealedInField,
    fieldUnlocks: state.fieldUnlocks,
    totalKills: state.totalKills ?? 0,
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
    battleResult,
    huntTarget, totalSpentQi,
    playerAttackTimer, enemyAttackTimer,
    floatingTexts, nextFloatingId, playerAnim, enemyAnim,
    fieldUnlocks, inventory,
    discoveredMasteries, pendingEnlightenments,
    stamina, currentBattleDuration, currentBattleDamageDealt,
    bossPatternState, playerStunTimer, lastEnemyAttack,
    pendingHuntRetry,
  } = state;
  let totalKills = state.totalKills ?? 0;
  let hiddenRevealedInField = { ...state.hiddenRevealedInField };
  let equipmentInventory = [...state.equipmentInventory];
  let materials = { ...state.materials };
  let obtainedMaterials = [...state.obtainedMaterials];
  let knownEquipment = [...state.knownEquipment];
  let ultCooldowns = { ...state.ultCooldowns };
  if (bossPatternState) bossPatternState = { ...bossPatternState };
  const stats = { ...state.stats };
  const proficiency = { ...state.proficiency };

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
  const critDmg = calcCritDmg();
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
  const tierMult = calcTierMultiplier(state.tier);
  const maxStamina = calcStamina(sim, tierMult);
  const effectiveRegen = calcEffectiveRegen(state);
  const qiPerSec = calcQiPerSec(state);
  const combatQiRatio = calcCombatQiRatio(state);
  const masteryEffects = isBattling ? gatherMasteryEffects(state) : null;

  const qiMult = 1 + (equipStats.bonusQiMultiplier ?? 0);

  // 1) 기운 생산 (비전투)
  if (!isBattling) {
    qi += qiPerSec * dt * qiMult;
  }

  // 1-1) 전투 중 기운 생산
  if (isBattling && combatQiRatio > 0) {
    qi += qiPerSec * combatQiRatio * dt * qiMult;
  }

  // 2) HP 자동회복 (전투 외)
  if (!isBattling) {
    maxHp = calcMaxHp(che, equipStats.bonusHp ?? 0, tierMult);
    hp = Math.min(hp + maxHp * 0.05 * dt, maxHp);

    // 재도전 대기 중 + HP 완전 회복 → 자동 재전투 시작
    if (pendingHuntRetry && hp >= maxHp && huntTarget && currentField) {
      const retryMon = getMonsterDef(huntTarget);
      if (retryMon) {
        pendingHuntRetry = false;
        battleMode = 'hunt';
        currentEnemy = spawnEnemy(retryMon);
        battleResult = null;
        playerAttackTimer = B.BASE_ATTACK_INTERVAL;
        enemyAttackTimer = retryMon.attackInterval;
        stamina = 0;
        ultCooldowns = {};
        currentBattleDuration = 0;
        currentBattleDamageDealt = 0;
        bossPatternState = BOSS_PATTERNS[huntTarget]
          ? { bossStamina: BOSS_PATTERNS[huntTarget].stamina.initial, rageUsed: false }
          : null;
        playerStunTimer = 0;
        lastEnemyAttack = null;
        if (!isSimulating) battleLog = [...battleLog, `— ${retryMon.name} 자동 재도전 —`];
      }
    }
  }

  // 3) 전투 (타이머 기반)
  if (isBattling && currentEnemy) {
    // 전투 경과 시간 추적 (스턴 중에도 계속)
    currentBattleDuration += dt;

    // 적 회복 (스턴 중에도 계속)
    if (currentEnemy.regen > 0) {
      currentEnemy = { ...currentEnemy };
      currentEnemy.hp = Math.min(
        currentEnemy.hp + currentEnemy.regen * dt,
        currentEnemy.maxHp
      );
    }

    // 보스 내력 자연회복 (스턴 중에도 계속)
    if (bossPatternState) {
      const pattern = BOSS_PATTERNS[currentEnemy.id];
      if (pattern) {
        bossPatternState.bossStamina = Math.min(
          bossPatternState.bossStamina + pattern.stamina.regenPerSec * dt,
          pattern.stamina.max
        );
      }
    }

    // 스턴 타이머 감소
    if (playerStunTimer > 0) {
      playerStunTimer = Math.max(0, playerStunTimer - dt);
    }

    // 플레이어 관련 로직: 스턴 아닐 때만 실행
    if (playerStunTimer <= 0) {
      // 내력 회복
      stamina = Math.min(stamina + effectiveRegen * dt, maxStamina);

      // 절초 쿨타임 감소 (무공별 독립)
      for (const artId of Object.keys(ultCooldowns)) {
        ultCooldowns[artId] -= dt;
        if (ultCooldowns[artId] <= 0) delete ultCooldowns[artId];
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

        // ultChange: 해당 무공의 active mastery에서 이름만 조회 (per-art)
        const artMasteryIds = activeMasteries[chosenId] ?? [];
        let ultChangeName: string | undefined;
        for (const mId of artMasteryIds) {
          const mDef = chosenDef.masteries.find(m => m.id === mId);
          if (mDef?.effects?.ultChange?.name) {
            ultChangeName = mDef.effects.ultChange.name;
          }
        }

        const ultProfType = chosenDef.proficiencyType;
        const ultProf = proficiency[ultProfType] ?? 0;
        damage = (chosenDef.ultBaseDamage ?? 0) + Math.floor(chosenDef.ultMultiplier! * ultProf);
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

          const normalProfType = chosen.def.proficiencyType;
          const normalProf = proficiency[normalProfType] ?? 0;
          damage = (chosen.def.baseDamage ?? 0) + Math.floor(chosen.def.proficiencyCoefficient * normalProf);

          // 초식 메시지 랜덤 선택
          if (chosen.def.normalMessages && chosen.def.normalMessages.length > 0) {
            attackName = chosen.def.normalMessages[Math.floor(Math.random() * chosen.def.normalMessages.length)];
          } else {
            attackName = chosen.def.name;
          }
        } else {
          // 무공 없음: 평타 (기본 데미지 1)
          damage = 1;
        }
      }

      // 무기 고정 공격력 적용 (치명타 배율 포함)
      damage += (equipStats.bonusAtk ?? 0);

      // 치명타 판정
      if (Math.random() < critRate) {
        damage *= critDmg / 100;
        isCritical = true;
      }

      damage = Math.floor(damage);
      currentEnemy.hp -= damage;
      currentBattleDamageDealt += damage;

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
    } // end stun guard

    // 적 사망 체크
    if (currentEnemy.hp <= 0) {
      const monDef = getMonsterDef(currentEnemy.id);
      if (monDef) {
        if (monDef.isHidden && currentField) {
          hiddenRevealedInField[currentField] = monDef.id;
        }

        killCounts[monDef.id] = (killCounts[monDef.id] ?? 0) + 1;
        totalKills++;

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
        } else if (monDef.grade > 0) {
          const maxArtGrade = getMaxEquippedArtGrade(equippedArts, equippedSimbeop, state.activeMasteries);
          if (maxArtGrade > 0) {
            const diff = maxArtGrade - monDef.grade;
            if (diff >= 3) {
              simdeuk = 0;
              if (Math.random() < 0.05) battleLog.push('너무 약한 상대라 심득을 얻지 못했다.');
            } else if (diff === 2) {
              simdeuk = Math.floor(simdeuk * 0.2);
            } else if (diff === 1) {
              simdeuk = Math.floor(simdeuk * 0.5);
            }
          }
        }

        // 숙련도 획득·분배
        const profTypeCount: Partial<Record<ProficiencyType, number>> = {};
        for (const artId of [...equippedArts, ...(equippedSimbeop ? [equippedSimbeop] : [])]) {
          const artDef = getArtDef(artId);
          if (artDef?.proficiencyType) {
            profTypeCount[artDef.proficiencyType] = (profTypeCount[artDef.proficiencyType] ?? 0) + 1;
          }
        }
        const totalProfArts = Object.values(profTypeCount).reduce((a, b) => a + b, 0);
        const profGainParts: string[] = [];
        if (!monDef.isTraining && totalProfArts > 0 && (monDef.baseProficiency ?? 0) > 0) {
          const baseProfGain = monDef.baseProficiency!;
          const monsterGrade = monDef.grade >= 1 ? monDef.grade : 1;
          for (const [pType, count] of Object.entries(profTypeCount) as [ProficiencyType, number][]) {
            const currentGrade = getProficiencyGrade(proficiency[pType] ?? 0);
            const multiplier = Math.pow(2.5, monsterGrade - currentGrade);
            const gain = baseProfGain * multiplier * (count / totalProfArts);
            proficiency[pType] = (proficiency[pType] ?? 0) + gain;
            profGainParts.push(`${PROF_LABEL[pType] ?? pType} +${gain.toFixed(1)}`);
          }
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

        // 장비 드롭 처리 (중복 방지)
        if (monDef.equipDrops) {
          for (const eqDrop of monDef.equipDrops) {
            if (Math.random() < eqDrop.chance) {
              const alreadyOwned = Object.values(state.equipment).some(e => e?.defId === eqDrop.equipId)
                || equipmentInventory.some(e => e.defId === eqDrop.equipId);
              if (alreadyOwned) continue;
              const eqDef = getEquipmentDef(eqDrop.equipId);
              if (eqDef) {
                const instance: EquipmentInstance = {
                  instanceId: `eq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                  defId: eqDrop.equipId,
                  obtainedFrom: monDef.id,
                  obtainedAt: Date.now(),
                };
                equipmentInventory.push(instance);
                if (!knownEquipment.includes(eqDrop.equipId)) knownEquipment.push(eqDrop.equipId);
                battleLog.push(`${eqDef.name}을(를) 획득했다!`);
              }
            }
          }
        }

        // 재료 드롭 처리
        if (monDef.materialDrops) {
          for (const mDrop of monDef.materialDrops) {
            if (Math.random() < mDrop.chance) {
              materials[mDrop.materialId] = (materials[mDrop.materialId] ?? 0) + 1;
              if (!obtainedMaterials.includes(mDrop.materialId)) {
                obtainedMaterials.push(mDrop.materialId);
              }
              const matName = MATERIALS.find(m => m.id === mDrop.materialId)?.name ?? mDrop.materialId;
              battleLog.push(`${matName}을(를) 주웠다! (${materials[mDrop.materialId]}개)`);
            }
          }
        }

        // 처치 시 기운 보너스 (4초 전투 심법)
        if (masteryEffects?.killBonusEnabled && combatQiRatio > 0) {
          const combatQiRate = qiPerSec * combatQiRatio;
          const bonusQi = combatQiRate * currentBattleDuration * B.KILL_BONUS_RATIO;
          qi += bonusQi * qiMult;
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
          battleLog.push(`— ${monDef.name} 처치. 심득 +${simdeuk}${profGainParts.length > 0 ? `  ${profGainParts.join('  ')}` : ''} —`);

          // 히든 처치 = 답파 즉시 승리
          if (monDef.isHidden) {
            totalSimdeuk += explorePendingRewards.simdeuk;
            applySimdeuk(ownedArts, equippedArts, equippedSimbeop, explorePendingRewards.simdeuk, state.tier, battleLog);
            battleResult = {
              type: 'explore_win',
              simdeuk: explorePendingRewards.simdeuk,
              drops: explorePendingRewards.drops,
              message: '히든 처치! 답파 대성공!',
            };
            battleMode = 'none';
            currentEnemy = null;
            stamina = 0;
            ultCooldowns = {};
            currentBattleDuration = 0;
            currentBattleDamageDealt = 0;
            bossPatternState = null;
            playerStunTimer = 0;
            battleLog.push('괴이한 존재를 물리치고 답파에 성공했다!');
          } else {
            const nextStep = exploreStep + 1;
            if (nextStep < exploreOrder.length) {
              const nextMon = getMonsterDef(exploreOrder[nextStep]);
              if (nextMon) {
                currentEnemy = spawnEnemy(nextMon);
                exploreStep = nextStep;
                currentBattleDuration = 0;
                currentBattleDamageDealt = 0;
                stamina = 0;
                ultCooldowns = {};
                battleLog.push(`— ${nextMon.name} 등장 —`);
                if (nextMon.isHidden && currentField) {
                  if (!hiddenRevealedInField[currentField]) {
                    battleLog.push('산군이 쓰러진 틈에 괴이한 존재가 침입한 것 같다..');
                  }
                  hiddenRevealedInField[currentField] = nextMon.id;
                }
                // 패턴 초기화 (히든 당강 등)
                bossPatternState = BOSS_PATTERNS[nextMon.id]
                  ? { bossStamina: BOSS_PATTERNS[nextMon.id].stamina.initial, rageUsed: false }
                  : null;
                playerStunTimer = 0;
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
                  currentBattleDamageDealt = 0;
                  stamina = 0;
                  ultCooldowns = {};
                  battleLog.push(`— 보스 등장! ${bossMon.name}이(가) 나타났다! —`);
                  // 보스 패턴 초기화
                  bossPatternState = BOSS_PATTERNS[bossMon.id]
                    ? { bossStamina: BOSS_PATTERNS[bossMon.id].stamina.initial, rageUsed: false }
                    : null;
                  playerStunTimer = 0;
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
              currentBattleDamageDealt = 0;
              bossPatternState = null;
              playerStunTimer = 0;
              battleLog.push('답파 승리!');
            }
          }
        } else if (battleMode === 'hunt') {
          totalSimdeuk += simdeuk;
          applySimdeuk(ownedArts, equippedArts, equippedSimbeop, simdeuk, state.tier, battleLog);
          battleLog.push(`— ${monDef.name} 처치. 심득 +${simdeuk}${profGainParts.length > 0 ? `  ${profGainParts.join('  ')}` : ''} —`);

          if (huntTarget) {
            const nextMon = getMonsterDef(huntTarget);
            if (nextMon) {
              currentEnemy = spawnEnemy(nextMon);
              // hunt: 내력 유지 (지정 사냥 중 몬스터 간 내력 유지)
              currentBattleDuration = 0;
              currentBattleDamageDealt = 0;
              playerAttackTimer = B.BASE_ATTACK_INTERVAL;
              enemyAttackTimer = nextMon.attackInterval;
              // 패턴 초기화 (보스/히든 사냥 시)
              if (BOSS_PATTERNS[huntTarget]) {
                bossPatternState = { bossStamina: BOSS_PATTERNS[huntTarget].stamina.initial, rageUsed: false };
              }
              playerStunTimer = 0;
            }
          }
        }
      }
    } else {
      // 적이 살아있으면 → 적 공격 타이머 (스턴 중에도 적은 공격)
      if (currentEnemy.attackPower > 0 && currentEnemy.attackInterval > 0) {
        enemyAttackTimer -= dt;
        if (enemyAttackTimer <= 0) {
          enemyAttackTimer += currentEnemy.attackInterval;
          const monDef = getMonsterDef(currentEnemy.id);
          const eName = monDef?.name ?? currentEnemy.id;

          // 보스 패턴 스킬 체크
          const pattern = bossPatternState ? BOSS_PATTERNS[currentEnemy.id] : null;
          let skillUsed = false;

          if (pattern && bossPatternState) {
            // priority 내림차순으로 매칭 스킬 찾기
            const sortedSkills = [...pattern.skills].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
            for (const skill of sortedSkills) {
              let triggered = false;
              if (skill.triggerCondition === 'stamina_full' && bossPatternState.bossStamina >= (skill.staminaCost ?? pattern.stamina.max)) {
                triggered = true;
              } else if (skill.triggerCondition === 'hp_threshold' && skill.hpThreshold != null) {
                if (currentEnemy.hp / currentEnemy.maxHp <= skill.hpThreshold && !(skill.oneTime && bossPatternState.rageUsed)) {
                  triggered = true;
                }
              } else if (skill.triggerCondition === 'default') {
                triggered = true;
              }
              if (!triggered) continue;

              skillUsed = true;
              const logMsg = skill.logMessages[Math.floor(Math.random() * skill.logMessages.length)];

              if (skill.staminaCost) {
                bossPatternState.bossStamina -= skill.staminaCost;
              }

              if (skill.type === 'stun') {
                // 스턴: 회피 가능 여부 체크
                if (!skill.undodgeable && Math.random() < dodgeRate) {
                  battleLog.push(`${eName}의 포효를 흘려냈다!`);
                  if (!isSimulating) {
                    floatingTexts = [...floatingTexts, { id: nextFloatingId++, text: '회피!', type: 'evade' as const, timestamp: Date.now() }];
                    if (floatingTexts.length > 15) floatingTexts = floatingTexts.slice(-15);
                  }
                } else {
                  playerStunTimer = skill.stunDuration ?? 4;
                  battleLog.push(logMsg);
                  lastEnemyAttack = { enemyName: eName, attackMessage: logMsg };
                }
              } else if (skill.type === 'replace_normal' && !skill.useNormalDamage && !skill.damageMultiplier) {
                // 풍년의 기운: 데미지 없이 내력만 획득
                if (skill.staminaGain) {
                  bossPatternState.bossStamina = Math.min(
                    bossPatternState.bossStamina + skill.staminaGain,
                    pattern.stamina.max
                  );
                }
                battleLog.push(logMsg);
              } else {
                // 데미지 스킬 (rage_attack, charged_attack)
                if (skill.oneTime && skill.type === 'rage_attack') {
                  bossPatternState.rageUsed = true;
                }
                const mult = skill.damageMultiplier ?? 1;
                const skillDmg = Math.floor(currentEnemy.attackPower * mult * (1 - dmgReduction / 100));

                if (skill.undodgeable || Math.random() >= dodgeRate) {
                  hp -= skillDmg;
                  battleLog.push(`${logMsg} ${skillDmg} 피해!`);
                  lastEnemyAttack = { enemyName: eName, attackMessage: `${logMsg} ${skillDmg} 피해!` };
                  if (!isSimulating) {
                    enemyAnim = 'attack';
                  }
                } else {
                  battleLog.push(`${eName}의 공격을 가볍게 피했다!`);
                  if (!isSimulating) {
                    floatingTexts = [...floatingTexts, { id: nextFloatingId++, text: '회피!', type: 'evade' as const, timestamp: Date.now() }];
                    if (floatingTexts.length > 15) floatingTexts = floatingTexts.slice(-15);
                  }
                }
              }
              break; // 최우선 스킬 하나만 발동
            }
          }

          if (!skillUsed) {
            // 일반 공격 (패턴 없는 적 or 조건 미충족)
            if (Math.random() < dodgeRate) {
              battleLog.push(`${eName}의 공격을 가볍게 피했다!`);
              if (!isSimulating) {
                floatingTexts = [...floatingTexts, { id: nextFloatingId++, text: '회피!', type: 'evade' as const, timestamp: Date.now() }];
                if (floatingTexts.length > 15) floatingTexts = floatingTexts.slice(-15);
              }
            } else {
              const incomingDmg = Math.floor(currentEnemy.attackPower * (1 - dmgReduction / 100));
              hp -= incomingDmg;
              if (incomingDmg > 0 && monDef) {
                const attackMsg = getMonsterAttackMsg(monDef, incomingDmg);
                battleLog.push(attackMsg);
                lastEnemyAttack = { enemyName: eName, attackMessage: attackMsg };
              }
              if (!isSimulating) {
                enemyAnim = 'attack';
              }
            }
          }
        }
      }
    }

    // HP <= 0: 전투 종료
    if (hp <= 0) {
      hp = 1;
      const deathLog = lastEnemyAttack
        ? `${lastEnemyAttack.enemyName}의 공격을 받아 쓰러졌습니다...`
        : undefined;
      if (battleMode === 'explore') {
        battleResult = {
          type: 'death',
          simdeuk: 0,
          drops: [],
          message: '패배... 보상이 없습니다.',
          deathLog,
        };
      } else {
        battleResult = {
          type: 'hunt_end',
          simdeuk: totalSimdeuk - state.totalSimdeuk,
          drops: [],
          message: '사망! 전투 종료.',
          deathLog,
        };
        pendingHuntRetry = true;
      }
      battleMode = 'none';
      currentEnemy = null;
      stamina = 0;
      ultCooldowns = {};
      currentBattleDuration = 0;
      currentBattleDamageDealt = 0;
      bossPatternState = null;
      playerStunTimer = 0;
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
        currentBattleDamageDealt = 0;
        bossPatternState = null;
        playerStunTimer = 0;
      }
    }
  }

  // 4) 업적 체크
  let achievements = [...state.achievements];
  let achievementCount = state.achievementCount ?? 0;
  const artPoints = state.artPoints;

  const ctx = buildAchievementContext({
    ...state, killCounts, bossKillCounts, ownedArts,
    totalSimdeuk, achievements, hiddenRevealedInField,
    totalYasanKills, fieldUnlocks, totalKills,
  });

  for (const ach of ACHIEVEMENTS) {
    if (achievements.includes(ach.id)) continue;
    if (ach.prerequisite && !achievements.includes(ach.prerequisite)) continue;
    if (ach.check(ctx)) {
      achievements.push(ach.id);
      achievementCount += 1;
      battleLog.push(`업적 달성: ${ach.name}!`);
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
    bossKillCounts, totalSimdeuk, totalYasanKills, totalKills,
    ownedArts, battleResult,
    achievements, achievementCount, artPoints, hiddenRevealedInField,
    tutorialFlags, totalSpentQi,
    playerAttackTimer, enemyAttackTimer,
    fieldUnlocks, inventory,
    discoveredMasteries, pendingEnlightenments,
    stamina, ultCooldowns, currentBattleDuration, currentBattleDamageDealt,
    equipmentInventory, materials, obtainedMaterials, knownEquipment,
    bossPatternState, playerStunTimer, lastEnemyAttack,
    proficiency, pendingHuntRetry,
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
  getQiPerSec: () => {
    const state = get();
    const equipStats = gatherEquipmentStats(state);
    const qiMult = 1 + (equipStats.bonusQiMultiplier ?? 0);
    return calcQiPerSec(state) * qiMult;
  },
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
    const tierMult = calcTierMultiplier(state.tier);
    const newMaxHp = calcMaxHp(newStats.che, eqStats.bonusHp ?? 0, tierMult);

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

    const order = generateExploreOrder(field, state.bossKillCounts);
    const firstMon = getMonsterDef(order[0]);
    if (!firstMon) return;

    const hiddenRevealedInField = { ...state.hiddenRevealedInField };
    if (firstMon.isHidden) {
      hiddenRevealedInField[fieldId] = order[0];
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
      hiddenRevealedInField,
      playerAttackTimer: B.BASE_ATTACK_INTERVAL,
      enemyAttackTimer: firstMon.attackInterval,
      stamina: 0,
      ultCooldowns: {},
      currentBattleDuration: 0,
      currentBattleDamageDealt: 0,
      bossPatternState: BOSS_PATTERNS[order[0]]
        ? { bossStamina: BOSS_PATTERNS[order[0]].stamina.initial, rageUsed: false }
        : null,
      playerStunTimer: 0,
      lastEnemyAttack: null,
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
      currentBattleDamageDealt: 0,
      bossPatternState: BOSS_PATTERNS[monsterId]
        ? { bossStamina: BOSS_PATTERNS[monsterId].stamina.initial, rageUsed: false }
        : null,
      playerStunTimer: 0,
      lastEnemyAttack: null,
      pendingHuntRetry: false,
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
        currentBattleDamageDealt: 0,
        bossPatternState: null,
        playerStunTimer: 0,
        lastEnemyAttack: null,
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
        currentBattleDamageDealt: 0,
        bossPatternState: null,
        playerStunTimer: 0,
        lastEnemyAttack: null,
        battleResult: null,
      });
    }
  },

  dismissBattleResult: () => {
    set({ battleResult: null, pendingHuntRetry: false });
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
    if (reqs.achievementCount && (state.achievementCount ?? 0) < reqs.achievementCount) return;

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
    const newMaxHp = calcMaxHp(state.stats.che, eqStats.bonusHp ?? 0, calcTierMultiplier(state.tier));

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
    const newMaxHp = calcMaxHp(state.stats.che, eqStats.bonusHp ?? 0, calcTierMultiplier(state.tier));

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

  craft: (recipeId: string, materialCount: number) => {
    const recipe = RECIPES.find(r => r.id === recipeId);
    if (!recipe) return false;
    const count = Math.max(1, Math.min(materialCount, recipe.maxUnits));
    const state = get();
    if ((state.materials[recipe.materialId] ?? 0) < count) return false;
    const newMaterials = { ...state.materials };
    newMaterials[recipe.materialId] = (newMaterials[recipe.materialId] ?? 0) - count;
    const success = Math.random() < count * recipe.probabilityPerUnit;
    if (success) {
      const instance: EquipmentInstance = {
        instanceId: `eq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        defId: recipe.resultEquipId,
        obtainedFrom: 'craft',
        obtainedAt: Date.now(),
      };
      const newCraftedRecipes = state.craftedRecipes.includes(recipe.id)
        ? state.craftedRecipes
        : [...state.craftedRecipes, recipe.id];
      const newKnownEquipment = state.knownEquipment.includes(recipe.resultEquipId)
        ? state.knownEquipment
        : [...state.knownEquipment, recipe.resultEquipId];
      set({ materials: newMaterials, equipmentInventory: [...state.equipmentInventory, instance], craftedRecipes: newCraftedRecipes, knownEquipment: newKnownEquipment });
    } else {
      set({ materials: newMaterials });
    }
    return success;
  },

  unlockRecipe: (recipeId: string) => {
    set(state => ({
      unlockedRecipes: state.unlockedRecipes.includes(recipeId)
        ? state.unlockedRecipes
        : [...state.unlockedRecipes, recipeId],
    }));
  },

  craftArtRecipe: (recipeId: string) => {
    const recipe = ART_RECIPES.find(r => r.id === recipeId);
    if (!recipe) return false;
    const state = get();
    const have = state.materials[recipe.materialId] ?? 0;
    if (have < recipe.materialCount) return false;
    if (recipe.resultArtId && state.ownedArts.some(a => a.id === recipe.resultArtId)) return false;
    if (recipe.resultMasteryId && state.discoveredMasteries.includes(recipe.resultMasteryId)) return false;
    const newMaterials = { ...state.materials, [recipe.materialId]: have - recipe.materialCount };
    const newOwnedArts = recipe.resultArtId
      ? [...state.ownedArts, { id: recipe.resultArtId, totalSimdeuk: 0 }]
      : state.ownedArts;
    const newDiscoveredMasteries = recipe.resultMasteryId
      ? [...state.discoveredMasteries, recipe.resultMasteryId]
      : state.discoveredMasteries;
    set({ materials: newMaterials, ownedArts: newOwnedArts, discoveredMasteries: newDiscoveredMasteries });
    return true;
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
      achievementCount: state.achievementCount,
      killCounts: state.killCounts,
      bossKillCounts: state.bossKillCounts,
      totalYasanKills: state.totalYasanKills,
      totalKills: state.totalKills,
      hiddenRevealedInField: state.hiddenRevealedInField,
      bossPatternState: state.bossPatternState,
      playerStunTimer: state.playerStunTimer,
      lastEnemyAttack: state.lastEnemyAttack,
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
      currentBattleDamageDealt: state.currentBattleDamageDealt,
      equipment: state.equipment,
      equipmentInventory: state.equipmentInventory,
      materials: state.materials,
      craftedRecipes: state.craftedRecipes,
      unlockedRecipes: state.unlockedRecipes,
      obtainedMaterials: state.obtainedMaterials,
      knownEquipment: state.knownEquipment,
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

      const tier = data.tier ?? 0;
      const tierMult = calcTierMultiplier(tier);
      const maxHp = calcMaxHp(data.stats?.che ?? 0, 0, tierMult);
      set({
        qi: data.qi ?? 0,
        totalSimdeuk: data.totalSimdeuk ?? 0,
        totalSpentQi: data.totalSpentQi ?? 0,
        stats: data.stats ?? { gi: 0, sim: 0, che: 0 },
        proficiency: data.proficiency ?? { sword: 1, palm: 1, footwork: 1, mental: 1 },
        hp: Math.min(data.hp ?? maxHp, maxHp),
        maxHp,
        tier,
        equippedSimbeop: data.equippedSimbeop ?? null,
        ownedArts: data.ownedArts ?? [],
        equippedArts: data.equippedArts ?? [],
        artPoints: data.artPoints ?? 3,
        achievements: data.achievements ?? [],
        achievementCount: data.achievementCount ?? 0,
        killCounts: data.killCounts ?? {},
        bossKillCounts: data.bossKillCounts ?? {},
        totalYasanKills: data.totalYasanKills ?? 0,
        totalKills: data.totalKills ?? 0,
        hiddenRevealedInField: data.hiddenRevealedInField ?? {},
        bossPatternState: data.bossPatternState ?? null,
        playerStunTimer: data.playerStunTimer ?? 0,
        lastEnemyAttack: data.lastEnemyAttack ?? null,
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
        currentBattleDamageDealt: data.currentBattleDamageDealt ?? 0,
        equipment: data.equipment ?? { weapon: null, armor: null, gloves: null, boots: null },
        equipmentInventory: data.equipmentInventory ?? [],
        materials: data.materials ?? {},
        craftedRecipes: data.craftedRecipes ?? [],
        unlockedRecipes: data.unlockedRecipes ?? [],
        obtainedMaterials: data.obtainedMaterials ?? [],
        knownEquipment: data.knownEquipment ?? [],
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
    currentState.equipmentInventory = [...currentState.equipmentInventory];
    currentState.hiddenRevealedInField = { ...currentState.hiddenRevealedInField };
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
        changes.achievementCount = currentState.achievementCount;
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

/** 무공의 현재 등급 = baseGrade + 활성화된 mastery 수 */
export function getArtCurrentGrade(
  artId: string,
  activeMasteries: Record<string, string[]>,
): number {
  const artDef = getArtDef(artId);
  if (!artDef) return 0;
  return artDef.baseGrade + (activeMasteries[artId] ?? []).length;
}

/** 장착된 모든 무공(보법/심법 포함) 중 최대 등급 반환 */
export function getMaxEquippedArtGrade(
  equippedArts: string[],
  equippedSimbeop: string | null,
  activeMasteries: Record<string, string[]>,
): number {
  const allArts = equippedSimbeop ? [...equippedArts, equippedSimbeop] : [...equippedArts];
  if (allArts.length === 0) return 0;
  return Math.max(...allArts.map(id => getArtCurrentGrade(id, activeMasteries)));
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
