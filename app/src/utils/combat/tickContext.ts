/**
 * tickContext.ts — TickContext 인터페이스와 생성/유틸 함수
 * simulateTick의 mutable 지역 변수를 객체로 공유하는 패턴.
 */
import { BALANCE_PARAMS } from '../../data/balance';
import { getArtDef } from '../../data/arts';
import {
  calcCritDamageMultiplier, calcCritRate, calcDodge, calcDmgReduction, calcTierMultiplier,
  calcStamina, calcEffectiveRegen, calcQiPerSec, calcCombatQiRatio,
  gatherEquipmentStats, gatherMasteryEffects,
} from '../combatCalc';
import type { GameState, FloatingText, BattleResult, InventoryItem } from '../../store/types';
import type { EquipmentInstance } from '../../data/equipment';
import type { ProficiencyType } from '../../data/arts';

const B = BALANCE_PARAMS;

// ── 장비/심득 스탯 타입 (combatCalc에서 반환하는 타입) ──
export type EquipStats = ReturnType<typeof gatherEquipmentStats>;
export type MasteryEffects = ReturnType<typeof gatherMasteryEffects>;

// ── TickContext ──
export interface TickContext {
  // mutable state
  qi: number;
  hp: number;
  maxHp: number;
  battleMode: GameState['battleMode'];
  currentEnemy: GameState['currentEnemy'];
  exploreStep: number;
  exploreOrder: string[];
  isBossPhase: boolean;
  bossTimer: number;
  explorePendingRewards: { drops: string[] };
  battleLog: string[];
  currentField: string | null;
  killCounts: Record<string, number>;
  bossKillCounts: Record<string, number>;
  totalYasanKills: number;
  ownedArts: GameState['ownedArts'];
  equippedArts: string[];
  equippedSimbeop: string | null;
  battleResult: BattleResult | null;
  huntTarget: string | null;
  totalSpentQi: number;
  playerAttackTimer: number;
  enemyAttackTimer: number;
  floatingTexts: FloatingText[];
  nextFloatingId: number;
  playerAnim: string;
  enemyAnim: string;
  fieldUnlocks: Record<string, boolean>;
  inventory: InventoryItem[];
  discoveredMasteries: string[];
  pendingEnlightenments: GameState['pendingEnlightenments'];
  stamina: number;
  currentBattleDuration: number;
  currentBattleDamageDealt: number;
  bossPatternState: GameState['bossPatternState'];
  playerStunTimer: number;
  lastEnemyAttack: GameState['lastEnemyAttack'];
  pendingHuntRetry: boolean;
  pendingAutoExplore: boolean;
  dodgeCounterActive: boolean;
  playerFinisherCharge: GameState['playerFinisherCharge'];
  totalKills: number;
  hiddenRevealedInField: Record<string, string | null>;
  equipmentInventory: EquipmentInstance[];
  materials: Record<string, number>;
  artGradeExp: Record<string, number>;
  activeMasteries: Record<string, string[]>;
  obtainedMaterials: string[];
  knownEquipment: string[];
  ultCooldowns: Record<string, number>;
  stats: { gi: number; sim: number; che: number };
  proficiency: Record<ProficiencyType, number>;

  // readonly derived
  readonly isSimulating: boolean;
  readonly dt: number;
  readonly state: GameState;
  readonly isBattling: boolean;
  readonly equipStats: EquipStats;
  readonly masteryEffects: MasteryEffects;
  readonly critDmg: number;
  readonly critRate: number;
  readonly dodgeRate: number;
  readonly dmgReduction: number;
  readonly tierMult: number;
  readonly maxStamina: number;
  readonly effectiveRegen: number;
  readonly qiPerSec: number;
  readonly combatQiRatio: number;
  readonly qiMult: number;
}

// ── 생성 ──
export function createTickContext(state: GameState, dt: number, isSimulating: boolean): TickContext {
  // destructure mutable copies
  let {
    qi, hp, maxHp, battleMode, currentEnemy,
    exploreStep, exploreOrder, isBossPhase, bossTimer,
    explorePendingRewards, battleLog, currentField,
    killCounts, bossKillCounts, totalYasanKills,
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
  let pendingAutoExplore = state.pendingAutoExplore ?? false;
  let dodgeCounterActive = state.dodgeCounterActive ?? false;
  let playerFinisherCharge = state.playerFinisherCharge ?? null;
  let totalKills = state.totalKills ?? 0;
  const hiddenRevealedInField = { ...state.hiddenRevealedInField };
  const equipmentInventory = [...state.equipmentInventory];
  const materials = { ...state.materials };
  const artGradeExp = { ...state.artGradeExp };
  const activeMasteries = { ...state.activeMasteries };
  const obtainedMaterials = [...state.obtainedMaterials];
  const knownEquipment = [...state.knownEquipment];
  let ultCooldowns = { ...state.ultCooldowns };
  if (bossPatternState) bossPatternState = { ...bossPatternState };
  const stats = { ...state.stats };
  const proficiency = { ...state.proficiency };

  killCounts = { ...killCounts };
  bossKillCounts = { ...bossKillCounts };
  ownedArts = ownedArts.map(a => ({ ...a }));
  explorePendingRewards = {
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

  // derived combat stats
  const equipStats = gatherEquipmentStats(state);
  const masteryEffects = gatherMasteryEffects(state);
  const critDmg = calcCritDamageMultiplier(state);
  const critRate = Math.min(
    calcCritRate(state) + (equipStats.bonusCritRate ?? 0),
    B.CRIT_RATE_CAP,
  );
  const masteryDodge = calcDodge(state);
  const dodgeRate = Math.min(
    masteryDodge + (equipStats.bonusDodge ?? 0) / 100,
    B.DODGE_CAP,
  );
  const dmgReduction = calcDmgReduction(state) + (equipStats.bonusDmgReduction ?? 0);
  const tierMult = calcTierMultiplier(state.tier);
  const maxStamina = calcStamina(stats.sim, tierMult);
  const effectiveRegen = calcEffectiveRegen(state);
  const qiPerSec = calcQiPerSec(state);
  const combatQiRatio = calcCombatQiRatio(state);
  const qiMult = 1 + (equipStats.bonusQiMultiplier ?? 0);

  return {
    qi, hp, maxHp, battleMode, currentEnemy,
    exploreStep, exploreOrder, isBossPhase, bossTimer,
    explorePendingRewards, battleLog, currentField,
    killCounts, bossKillCounts, totalYasanKills,
    ownedArts, equippedArts, equippedSimbeop,
    battleResult, huntTarget, totalSpentQi,
    playerAttackTimer, enemyAttackTimer,
    floatingTexts, nextFloatingId, playerAnim, enemyAnim,
    fieldUnlocks, inventory,
    discoveredMasteries, pendingEnlightenments,
    stamina, currentBattleDuration, currentBattleDamageDealt,
    bossPatternState, playerStunTimer, lastEnemyAttack,
    pendingHuntRetry, pendingAutoExplore, dodgeCounterActive, playerFinisherCharge,
    totalKills, hiddenRevealedInField,
    equipmentInventory, materials, artGradeExp, activeMasteries,
    obtainedMaterials, knownEquipment, ultCooldowns,
    stats, proficiency,

    isSimulating, dt, state, isBattling,
    equipStats, masteryEffects, critDmg, critRate, dodgeRate,
    dmgReduction, tierMult, maxStamina, effectiveRegen,
    qiPerSec, combatQiRatio, qiMult,
  };
}

// ── 유틸 함수 ──
export function applyBattleReset(ctx: TickContext): void {
  ctx.stamina = 0;
  applyUltCooldownReset(ctx);
  ctx.currentBattleDuration = 0;
  ctx.currentBattleDamageDealt = 0;
  ctx.bossPatternState = null;
  ctx.playerStunTimer = 0;
  ctx.dodgeCounterActive = false;
  ctx.lastEnemyAttack = null;
  ctx.playerFinisherCharge = null;
}

export function applyUltCooldownReset(ctx: TickContext): void {
  const { activeMasteries } = ctx.state;
  for (const artId of Object.keys(ctx.ultCooldowns)) {
    const artDef = getArtDef(artId);
    const activeIds = activeMasteries[artId] ?? [];
    const persist = artDef?.masteries.some(
      m => activeIds.includes(m.id) && m.effects?.ultCooldownPersist
    );
    if (!persist) delete ctx.ultCooldowns[artId];
  }
}

export function handleDodge(ctx: TickContext, eName: string, customMsg?: string): void {
  ctx.battleLog.push(customMsg ?? `${eName}의 공격을 가볍게 피했다!`);
  if (!ctx.isSimulating) {
    ctx.floatingTexts = [...ctx.floatingTexts, { id: ctx.nextFloatingId++, text: '회피!', type: 'evade' as const, timestamp: Date.now() }];
    if (ctx.floatingTexts.length > 15) ctx.floatingTexts = ctx.floatingTexts.slice(-15);
  }
  if (ctx.masteryEffects?.dodgeCounterEnabled && Math.random() < 0.5) {
    ctx.dodgeCounterActive = true;
  }
}

// ── 결과 빌드 ──
export function buildResult(ctx: TickContext, extras: {
  achievements: string[];
  achievementCount: number;
  artPoints: number;
  tutorialFlags: GameState['tutorialFlags'];
}): Partial<GameState> {
  const result: Partial<GameState> = {
    qi: ctx.qi, hp: ctx.hp, maxHp: ctx.maxHp, battleMode: ctx.battleMode, currentEnemy: ctx.currentEnemy,
    exploreStep: ctx.exploreStep, exploreOrder: ctx.exploreOrder, isBossPhase: ctx.isBossPhase, bossTimer: ctx.bossTimer,
    explorePendingRewards: ctx.explorePendingRewards, battleLog: ctx.battleLog, killCounts: ctx.killCounts,
    bossKillCounts: ctx.bossKillCounts, totalYasanKills: ctx.totalYasanKills, totalKills: ctx.totalKills,
    ownedArts: ctx.ownedArts, battleResult: ctx.battleResult,
    achievements: extras.achievements, achievementCount: extras.achievementCount, artPoints: extras.artPoints,
    hiddenRevealedInField: ctx.hiddenRevealedInField,
    tutorialFlags: extras.tutorialFlags, totalSpentQi: ctx.totalSpentQi,
    playerAttackTimer: ctx.playerAttackTimer, enemyAttackTimer: ctx.enemyAttackTimer,
    fieldUnlocks: ctx.fieldUnlocks, inventory: ctx.inventory,
    discoveredMasteries: ctx.discoveredMasteries, pendingEnlightenments: ctx.pendingEnlightenments,
    stamina: ctx.stamina, ultCooldowns: ctx.ultCooldowns,
    currentBattleDuration: ctx.currentBattleDuration, currentBattleDamageDealt: ctx.currentBattleDamageDealt,
    equipmentInventory: ctx.equipmentInventory, materials: ctx.materials,
    obtainedMaterials: ctx.obtainedMaterials, knownEquipment: ctx.knownEquipment,
    bossPatternState: ctx.bossPatternState, playerStunTimer: ctx.playerStunTimer, lastEnemyAttack: ctx.lastEnemyAttack,
    proficiency: ctx.proficiency, artGradeExp: ctx.artGradeExp, activeMasteries: ctx.activeMasteries,
    pendingHuntRetry: ctx.pendingHuntRetry, pendingAutoExplore: ctx.pendingAutoExplore, dodgeCounterActive: ctx.dodgeCounterActive,
    playerFinisherCharge: ctx.playerFinisherCharge,
  };

  if (!ctx.isSimulating) {
    result.floatingTexts = ctx.floatingTexts;
    result.nextFloatingId = ctx.nextFloatingId;
    result.playerAnim = ctx.playerAnim;
    result.enemyAnim = ctx.enemyAnim;
  }

  return result;
}
