/**
 * tickContext.ts — TickContext 인터페이스와 생성/유틸 함수
 * simulateTick의 mutable 지역 변수를 객체로 공유하는 패턴.
 * 전투 로그 v6: 구조화된 BattleLogEntry + log* 헬퍼로 직접 push 대체.
 */
import { BALANCE_PARAMS } from '../../data/balance';
import { getArtDef } from '../../data/arts';
import { BOSS_PATTERNS, getMonsterDef } from '../../data/monsters';
import {
  calcCritDamageMultiplier, calcCritRate, calcDodge, calcDmgReduction, calcTierMultiplier,
  calcStamina, calcEffectiveRegen, calcQiPerSec, calcCombatQiRatio,
  gatherEquipmentStats, gatherMasteryEffects, calcFullMaxHp, calcPlayerAttackInterval,
} from '../combatCalc';
import type {
  GameState, FloatingText, BattleResult, InventoryItem, EquipmentDotEntry,
  BattleLogEntry, BattleLogActor, BattleLogChip, BattleLogTag, BattleLogValueTier,
} from '../../store/types';
import type { EquipSlot, EquipmentInstance } from '../../data/equipment';
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
  explorePendingRewards: {
    drops: string[];
    proficiencyGains?: Record<string, number>;
    materialDrops?: Record<string, number>;
  };
  battleLog: BattleLogEntry[];
  combatElapsed: number;
  logEntryIdSeq: number;
  lawActiveFromSkillId: string | null;
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
  equipment: Record<EquipSlot, EquipmentInstance | null>;
  equipmentInventory: EquipmentInstance[];
  equipmentDotOnEnemy: EquipmentDotEntry[];
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

  // log helpers
  logEvent(opts: LogEventOpts): void;
  logFlavor(text: string, side: 'left' | 'right' | 'both', opts?: LogFlavorOpts): void;
  logDialogue(text: string, side: 'left' | 'right' | 'both', opts?: LogFlavorOpts): void;
  logLaw(opts: LogLawOpts): void;
  logKill(opts: LogKillOpts): void;
  logCombatStart(opts: LogCombatStartOpts): void;
  logSystem(text: string): void;
  beginCombat(opts: LogCombatStartOpts): void;
}

// ── log helper 옵션 타입 ──
export interface LogEventOpts {
  side: 'outgoing' | 'incoming';
  actor: BattleLogActor;
  name?: string;
  subName?: string;
  tag?: BattleLogTag;
  value?: number | '—';
  valueTier?: BattleLogValueTier;
  chips?: BattleLogChip[];
}
export interface LogFlavorOpts {
  minor?: boolean;
  actor?: BattleLogActor;
}
export interface LogLawOpts {
  lawFlavor?: string;
  lawName: string;
  lawText?: string;
}
export interface LogKillOpts {
  enemyName: string;
  rewards: { label: string; value: string }[];
}
export interface LogCombatStartOpts {
  enemyId: string;
  playerAttackInterval: number;
  enemyAttackInterval: number;
  enemyHealInterval?: number;
}

// ── 생성 ──
export function createTickContext(state: GameState, dt: number, isSimulating: boolean): TickContext {
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
  let combatElapsed = state.combatElapsed ?? 0;
  let logEntryIdSeq = state.logEntryIdSeq ?? 0;
  let lawActiveFromSkillId = state.lawActiveFromSkillId ?? null;
  const hiddenRevealedInField = { ...state.hiddenRevealedInField };
  const equipment = { ...state.equipment };
  const equipmentInventory = [...state.equipmentInventory];
  const equipmentDotOnEnemy = [...(state.equipmentDotOnEnemy ?? [])];
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
    proficiencyGains: { ...(explorePendingRewards.proficiencyGains ?? {}) },
    materialDrops: { ...(explorePendingRewards.materialDrops ?? {}) },
  };
  battleLog = sliceBattleLog([...battleLog], isSimulating);
  fieldUnlocks = { ...fieldUnlocks };
  inventory = [...inventory];
  discoveredMasteries = [...discoveredMasteries];
  pendingEnlightenments = [...pendingEnlightenments];

  if (!isSimulating) {
    floatingTexts = [...floatingTexts];
  }

  const isBattling = battleMode !== 'none';

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

  maxHp = calcFullMaxHp(state);

  const ctx: TickContext = {
    qi, hp, maxHp, battleMode, currentEnemy,
    exploreStep, exploreOrder, isBossPhase, bossTimer,
    explorePendingRewards, battleLog,
    combatElapsed, logEntryIdSeq, lawActiveFromSkillId,
    currentField,
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
    equipment, equipmentInventory, equipmentDotOnEnemy, materials, artGradeExp, activeMasteries,
    obtainedMaterials, knownEquipment, ultCooldowns,
    stats, proficiency,

    isSimulating, dt, state, isBattling,
    equipStats, masteryEffects, critDmg, critRate, dodgeRate,
    dmgReduction, tierMult, maxStamina, effectiveRegen,
    qiPerSec, combatQiRatio, qiMult,

    // ── log helpers ──
    logEvent(opts) {
      const chips: BattleLogChip[] = [...(opts.chips ?? [])];
      if (this.lawActiveFromSkillId != null && opts.side === 'outgoing'
          && !chips.some(c => c.kind === 'status' && c.label === '무뎌짐')) {
        chips.push({ kind: 'status', label: '무뎌짐' });
      }
      this.battleLog.push({
        id: this.logEntryIdSeq++,
        time: Math.round(this.combatElapsed * 10) / 10,
        actor: opts.actor,
        kind: 'event',
        side: opts.side,
        name: opts.name,
        subName: opts.subName,
        tag: opts.tag,
        value: opts.value,
        valueTier: opts.valueTier,
        chips: chips.length > 0 ? chips : undefined,
      });
    },
    logFlavor(text, side, opts) {
      this.battleLog.push({
        id: this.logEntryIdSeq++,
        time: Math.round(this.combatElapsed * 10) / 10,
        actor: opts?.actor ?? 'system',
        kind: 'flavor',
        text,
        textSide: side,
        minor: opts?.minor ?? false,
      });
    },
    logDialogue(text, side, opts) {
      this.battleLog.push({
        id: this.logEntryIdSeq++,
        time: Math.round(this.combatElapsed * 10) / 10,
        actor: opts?.actor ?? 'enemy',
        kind: 'dialogue',
        text,
        textSide: side,
        minor: opts?.minor ?? false,
      });
    },
    logLaw(opts) {
      this.battleLog.push({
        id: this.logEntryIdSeq++,
        time: Math.round(this.combatElapsed * 10) / 10,
        actor: 'enemy',
        kind: 'law',
        lawFlavor: opts.lawFlavor,
        lawName: opts.lawName,
        lawText: opts.lawText,
      });
    },
    logKill(opts) {
      this.battleLog.push({
        id: this.logEntryIdSeq++,
        time: Math.round(this.combatElapsed * 10) / 10,
        actor: 'system',
        kind: 'kill',
        enemyName: opts.enemyName,
        rewards: opts.rewards,
      });
    },
    logCombatStart(opts) {
      this.battleLog.push({
        id: this.logEntryIdSeq++,
        time: 0,
        actor: 'system',
        kind: 'combat-start',
        enemyId: opts.enemyId,
        playerAttackInterval: opts.playerAttackInterval,
        enemyAttackInterval: opts.enemyAttackInterval,
        enemyHealInterval: opts.enemyHealInterval,
      });
    },
    logSystem(text) {
      this.battleLog.push({
        id: this.logEntryIdSeq++,
        time: Math.round(this.combatElapsed * 10) / 10,
        actor: 'system',
        kind: 'system',
        text,
      });
    },
    beginCombat(opts) {
      // 매 새 적 등장 시 이전 로그 완전 초기화 (의도적 재할당 — buildResult 경로로만
      // 외부 반영되므로 안전, §리스크 참조)
      this.battleLog = [];
      this.combatElapsed = 0;
      this.lawActiveFromSkillId = null;
      this.logCombatStart(opts);
    },
  };
  return ctx;
}

/**
 * battleLog slice 전략 (v6 후속 조정):
 * - 매 새 적 등장마다 beginCombat이 배열을 비우므로 combat 블록 경계 유지 로직 불필요.
 * - 방어적 하드캡만 유지: 시뮬레이션 30, 일반 500. 초과 시 slice(-N).
 */
function sliceBattleLog(entries: BattleLogEntry[], isSimulating: boolean): BattleLogEntry[] {
  if (entries.length === 0) return entries;
  const cap = isSimulating ? 30 : 500;
  return entries.length > cap ? entries.slice(-cap) : entries;
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
  ctx.equipmentDotOnEnemy = [];
  ctx.combatElapsed = 0;
  ctx.lawActiveFromSkillId = null;
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
  ctx.logEvent({
    side: 'incoming', actor: 'enemy', name: `${eName}의 공격`,
    tag: 'dodge', value: '—', valueTier: 'muted',
  });
  if (customMsg) {
    ctx.logFlavor(customMsg, 'right', { actor: 'enemy' });
  }
  if (!ctx.isSimulating) {
    ctx.floatingTexts = [...ctx.floatingTexts, { id: ctx.nextFloatingId++, text: '회피!', type: 'evade' as const, timestamp: Date.now() }];
    if (ctx.floatingTexts.length > 15) ctx.floatingTexts = ctx.floatingTexts.slice(-15);
  }
  if (ctx.masteryEffects?.dodgeCounterEnabled && Math.random() < 0.5) {
    ctx.dodgeCounterActive = true;
  }
  const healPct = ctx.masteryEffects?.dodgeHealPercent;
  if (healPct) {
    const healAmt = Math.floor(ctx.maxHp * healPct / 100);
    ctx.hp = Math.min(ctx.hp + healAmt, ctx.maxHp);
    if (!ctx.isSimulating) {
      ctx.floatingTexts = [...ctx.floatingTexts, { id: ctx.nextFloatingId++, text: `+${healAmt}`, type: 'heal' as const, timestamp: Date.now() }];
      if (ctx.floatingTexts.length > 15) ctx.floatingTexts = ctx.floatingTexts.slice(-15);
    }
  }
}

// ── bossPatternState 팩토리 ──
export function createBossPatternState(monsterId: string): NonNullable<GameState['bossPatternState']> | null {
  const pattern = BOSS_PATTERNS[monsterId];
  if (!pattern) return null;
  const monDef = getMonsterDef(monsterId);
  return {
    bossStamina: pattern.stamina.initial,
    rageUsed: false,
    playerFreezeLeft: 0,
    usedOneTimeSkills: [],
    bossChargeState: null,
    playerDotStacks: [],
    enemyBuffs: [],
    cheolbyeokStacks: 0,
    revengeActive: false,
    sequenceState: null,
    phaseFlags: {},
    lastStandActive: false,
    baseAttackPower: monDef?.attackPower,
    baseAttackInterval: monDef?.attackInterval,
    dodgeAtkBuffs: [],
    bossChargeDmgReduction: 0,
    bossChargeStunImmune: false,
    chargeRegenPenalty: 0,
    sraoshaTier: 0,
    sraoshaLastLoggedTier: 0,
    howiSacredOathState: null,
  };
}

// ── battle_start 트리거 스킬 처리 ──
/**
 * battle_start 조건 스킬을 순회하여 bossPatternState에 초기값을 적용하고
 * 필요 시 law-banner 엔트리를 배틀 로그에 삽입한다.
 *
 * v6 리팩터 후: 문자열 배열 대신 BattleLogEntry[] 사용, 반환값에 lawActiveFromSkillId 포함.
 */
export function applyBattleStartSkills(
  monsterId: string,
  equippedArts: string[],
  state: NonNullable<GameState['bossPatternState']>,
  battleLog: BattleLogEntry[],
  logEntryIdSeq: number,
): {
  battleLog: BattleLogEntry[];
  state: NonNullable<GameState['bossPatternState']>;
  lawActiveFromSkillId: string | null;
  logEntryIdSeq: number;
} {
  const pattern = BOSS_PATTERNS[monsterId];
  if (!pattern) return { battleLog, state, lawActiveFromSkillId: null, logEntryIdSeq };
  const next = { ...state };
  const usedOne = [...(next.usedOneTimeSkills ?? [])];
  const logs = [...battleLog];
  let seq = logEntryIdSeq;
  let lawActive: string | null = null;
  for (const skill of pattern.skills) {
    if (skill.triggerCondition !== 'battle_start') continue;
    if (skill.type === 'baehwa_guard') {
      const required = skill.conditionRequiredFaction;
      const hasFactionArt = required
        ? equippedArts.some(id => getArtDef(id)?.faction === required)
        : true;
      next.guardDamageTakenMultiplier = hasFactionArt ? 1.0 : (skill.damageTakenMultiplierIfCondition ?? 0.5);
      next.guardFirstHitLogged = false;
      // law-banner 엔트리
      const displayName = (skill as { displayName?: string }).displayName ?? skill.id;
      const battleStartLogs = skill.battleStartLogs ?? [];
      const lawFlavor = battleStartLogs[0];
      const lawText = battleStartLogs.slice(1).join(' ') || undefined;
      logs.push({
        id: seq++,
        time: 0,
        actor: 'enemy',
        kind: 'law',
        lawFlavor,
        lawName: `${displayName} · 발동`,
        lawText,
      });
      if (!hasFactionArt) lawActive = skill.id;
      if (skill.oneTime) usedOne.push(skill.id);
    }
    if (skill.type === 'sraosha_response') {
      next.sraoshaTier = 0;
      next.sraoshaLastLoggedTier = 0;
      if (skill.oneTime) usedOne.push(skill.id);
    }
  }
  next.usedOneTimeSkills = usedOne;
  return { battleLog: logs, state: next, lawActiveFromSkillId: lawActive, logEntryIdSeq: seq };
}

// ── 결과 빌드 ──
export function buildResult(ctx: TickContext, extras: {
  achievements: string[];
  achievementCount: number;
  artPoints: number;
  tutorialFlags: GameState['tutorialFlags'];
  repeatableAchCounts: Record<string, number>;
}): Partial<GameState> {
  const result: Partial<GameState> = {
    qi: ctx.qi, hp: ctx.hp, maxHp: ctx.maxHp, battleMode: ctx.battleMode, currentEnemy: ctx.currentEnemy,
    exploreStep: ctx.exploreStep, exploreOrder: ctx.exploreOrder, isBossPhase: ctx.isBossPhase, bossTimer: ctx.bossTimer,
    explorePendingRewards: ctx.explorePendingRewards, battleLog: ctx.battleLog,
    combatElapsed: ctx.combatElapsed, logEntryIdSeq: ctx.logEntryIdSeq, lawActiveFromSkillId: ctx.lawActiveFromSkillId,
    killCounts: ctx.killCounts,
    bossKillCounts: ctx.bossKillCounts, totalYasanKills: ctx.totalYasanKills, totalKills: ctx.totalKills,
    ownedArts: ctx.ownedArts, battleResult: ctx.battleResult,
    achievements: extras.achievements, achievementCount: extras.achievementCount, artPoints: extras.artPoints,
    repeatableAchCounts: extras.repeatableAchCounts,
    hiddenRevealedInField: ctx.hiddenRevealedInField,
    tutorialFlags: extras.tutorialFlags, totalSpentQi: ctx.totalSpentQi,
    playerAttackTimer: ctx.playerAttackTimer, enemyAttackTimer: ctx.enemyAttackTimer,
    fieldUnlocks: ctx.fieldUnlocks, inventory: ctx.inventory,
    discoveredMasteries: ctx.discoveredMasteries, pendingEnlightenments: ctx.pendingEnlightenments,
    stamina: ctx.stamina, ultCooldowns: ctx.ultCooldowns,
    currentBattleDuration: ctx.currentBattleDuration, currentBattleDamageDealt: ctx.currentBattleDamageDealt,
    equipment: ctx.equipment, equipmentInventory: ctx.equipmentInventory,
    equipmentDotOnEnemy: ctx.equipmentDotOnEnemy, materials: ctx.materials,
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

/**
 * BattleLogEntry 를 사망 요약용 짧은 문자열로 평탄화.
 * BattleResult.recentBattleLog는 string[]이라 재집계해서 최소 정보만 남긴다.
 */
export function flattenEntryForDeathLog(entry: BattleLogEntry): string {
  switch (entry.kind) {
    case 'event': {
      const bits: string[] = [];
      if (entry.tag) bits.push(`[${entry.tag}]`);
      if (entry.name) bits.push(entry.name);
      if (entry.value != null) bits.push(String(entry.value));
      return bits.join(' ');
    }
    case 'flavor':
    case 'dialogue':
    case 'system':
      return entry.text ?? '';
    case 'law':
      return `${entry.lawName ?? ''}${entry.lawText ? ` — ${entry.lawText}` : ''}`.trim();
    case 'kill':
      return `★ 처치 · ${entry.enemyName ?? ''}`;
    case 'combat-start':
      return `— ${entry.enemyId ?? ''} 등장 —`;
    default:
      return '';
  }
}
