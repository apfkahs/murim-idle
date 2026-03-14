/**
 * 무림 방치록 v3.0 — 게임 스토어 (Zustand)
 * simulateTick 순수 함수 분리. 심화학습 시스템. 저장 슬롯. 오프라인 진행.
 * v3.0: grade/proficiency → totalSimdeuk 점진 성장. 인벤토리. 심화학습 발견.
 */
import { create } from 'zustand';
import {
  getArtDef, getArtStats, getMasteryDef, getMasteryDefsForArt, migrateGradeToSimdeuk,
  type ArtDef,
} from '../data/arts';
import { getMonsterDef, getMonsterAttackMsg, type MonsterDef } from '../data/monsters';
import { TIERS, getTierDef, getMaxSimdeuk } from '../data/tiers';
import { getFieldDef, generateExploreOrder } from '../data/fields';
import { ACHIEVEMENTS, type AchievementContext } from '../data/achievements';

// ============================================================
// Constants
// ============================================================
function getResidualRatio(totalSimdeuk: number): number {
  if (totalSimdeuk >= 1500) return 0.45;
  if (totalSimdeuk >= 500) return 0.42;
  if (totalSimdeuk >= 100) return 0.38;
  return 0.35;
}
const COMBAT_NEIGONG_RATIO = 0.25;
const COMBAT_NEIGONG_MASTERY_BONUS = 0.1;

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
  neigong: number;
  totalSimdeuk: number;
  totalSpentNeigong: number;
  stats: { sungi: number; gyeongsin: number; magi: number };
  hp: number;
  maxHp: number;
  tier: number;

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
  simbeopBurstTimer: number;
  battleResult: BattleResult | null;

  // 전투 애니메이션 상태
  floatingTexts: FloatingText[];
  nextFloatingId: number;
  playerAnim: string;
  enemyAnim: string;

  // v2.0 신규 필드
  activeMasteries: Record<string, string[]>;
  gameSpeed: number;
  currentSaveSlot: number;
  fieldUnlocks: Record<string, boolean>;
  inventory: InventoryItem[];
  discoveredMasteries: string[];
  pendingEnlightenments: { artId: string; masteryId: string; masteryName: string }[];
  moraleBuff: number; // 사기충천 보너스 데미지 (0이면 미적용)
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
  neigongGained: number;
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
    activeMasteries: {},
    gameSpeed: 1,
    currentSaveSlot: 0,
    fieldUnlocks: { training: true, yasan: false, inn: false },
    inventory: [],
    discoveredMasteries: [],
    pendingEnlightenments: [],
    moraleBuff: 0,
  };
}

// ============================================================
// Helper calculations
// ============================================================

/** v1.1 HP: 50 + floor(log2(1 + totalSpentNeigong) * 15) + hpBonus */
function calcMaxHp(totalSpentNeigong: number, state?: GameState): number {
  let base = 50 + Math.floor(Math.log2(1 + totalSpentNeigong) * 15);

  if (state) {
    let hpBonusTotal = 0;
    for (const artId of state.equippedArts) {
      const owned = state.ownedArts.find(a => a.id === artId);
      const artDef = getArtDef(artId);
      if (!owned || !artDef) continue;
      const stats = getArtStats(artDef, owned.totalSimdeuk);
      if (stats.hpBonus) hpBonusTotal += stats.hpBonus;
    }
    if (hpBonusTotal > 0 && hasMastery(state, 'gangche_reinforce')) {
      hpBonusTotal = Math.floor(hpBonusTotal * 1.5);
    }
    base += hpBonusTotal;
  }

  return base;
}

function calcStatCost(level: number): number {
  return Math.floor(10 * Math.pow(1.15, level));
}

/** v1.1 공격 간격: 4 / (1 + ln(1 + 경신 * 0.05)), 최소 1초 */
function calcAttackInterval(gyeongsin: number): number {
  const raw = 4 / (1 + Math.log(1 + gyeongsin * 0.05));
  return Math.max(raw, 1.0);
}

/** v2.0 회피: 패시브 무공의 dodge 합산, 상한 25% (보법 숙련 시 30%) */
function calcEvasion(stateParam: GameState): number {
  let dodge = 0;
  for (const artId of stateParam.equippedArts) {
    const owned = stateParam.ownedArts.find(a => a.id === artId);
    const artDef = getArtDef(artId);
    if (!owned || !artDef) continue;
    const stats = getArtStats(artDef, owned.totalSimdeuk);
    if (stats.dodge) dodge += stats.dodge;
  }
  let cap = 25;
  if (hasMastery(stateParam, 'mudang_step_dodge')) cap = 30;
  return Math.min(dodge, cap);
}

function calcNeigongPerSec(state: GameState): number {
  let base = 1;
  if (state.equippedSimbeop) {
    const artDef = getArtDef(state.equippedSimbeop);
    const owned = state.ownedArts.find(a => a.id === state.equippedSimbeop);
    if (artDef && owned) {
      const stats = getArtStats(artDef, owned.totalSimdeuk);
      if (stats.neigongPerSec) {
        base += stats.neigongPerSec;
      }
    }
  }
  return base;
}

/** v2.0 심화학습 보유 체크 */
function hasMastery(state: GameState, masteryId: string): boolean {
  for (const [artId, mIds] of Object.entries(state.activeMasteries)) {
    if (!mIds.includes(masteryId)) continue;
    if (state.equippedArts.includes(artId) || state.equippedSimbeop === artId)
      return true;
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
  const artSimdeuks: Record<string, number> = {};
  for (const a of state.ownedArts) artSimdeuks[a.id] = a.totalSimdeuk;
  return {
    killCounts: state.killCounts,
    bossKillCounts: state.bossKillCounts,
    ownedArts: state.ownedArts.map(a => a.id),
    artSimdeuks,
    totalStats: state.stats.sungi + state.stats.gyeongsin + state.stats.magi,
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

/**
 * v2.0 무공 발동 로직
 * 반환에 isResidual 추가
 */
function executeAttack(
  state: GameState,
  _enemyId: string,
): { artDef: ArtDef | null; damage: number; isCritical: boolean; isDouble: boolean; artName: string; isResidual: boolean; usedMorale: boolean } {
  // 장착 액티브 무공 후보 수집
  const candidates: { artDef: ArtDef; owned: { totalSimdeuk: number } }[] = [];
  for (const artId of state.equippedArts) {
    const artDef = getArtDef(artId);
    const owned = state.ownedArts.find(a => a.id === artId);
    if (!artDef || !owned) continue;
    if (artDef.artType !== 'active') continue;
    candidates.push({ artDef, owned });
  }

  let fired = false;
  let damage = 5; // 평타
  let artName = '평타';
  let firedArtDef: ArtDef | null = null;
  let isCritical = false;
  let isDouble = false;
  let isResidual = false;

  // 랜덤 순서로 발동 시도
  const pool = [...candidates];
  while (pool.length > 0 && !fired) {
    const idx = Math.floor(Math.random() * pool.length);
    const { artDef, owned } = pool.splice(idx, 1)[0];
    const artStats = getArtStats(artDef, owned.totalSimdeuk);
    if (!artStats.triggerRate || !artStats.power) continue;

    if (Math.random() < artStats.triggerRate) {
      damage = artStats.power;

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

  // 미발동 시 검기 잔류
  if (!fired) {
    if (hasMastery(state, 'samjae_sword_residual')) {
      const swordOwned = state.ownedArts.find(a => a.id === 'samjae_sword');
      const swordDef = getArtDef('samjae_sword');
      if (swordOwned && swordDef) {
        const swordStats = getArtStats(swordDef, swordOwned.totalSimdeuk);
        if (swordStats.power) {
          const ratio = getResidualRatio(swordOwned.totalSimdeuk);
          damage = Math.floor(swordStats.power * ratio);
          artName = '검기 잔류';
          isResidual = true;
        }
      }
    }
    // else damage = 5 (기존 평타)
  }

  // 사기충천 보너스
  const usedMorale = state.moraleBuff > 0;
  if (state.moraleBuff > 0) {
    damage += state.moraleBuff;
  }

  // 이연격/파쇄 판정
  const canProc = fired || (isResidual && hasMastery(state, 'samjae_sword_penetrate'));
  if (canProc && hasMastery(state, 'samjae_sword_critical') && Math.random() < 0.03) {
    damage *= 1.3;
    isCritical = true;
  }
  if (canProc && hasMastery(state, 'samjae_sword_double') && Math.random() < 0.05) {
    damage *= 2;
    isDouble = true;
  }

  damage = Math.floor(damage);

  return { artDef: firedArtDef, damage, isCritical, isDouble, artName, isResidual, usedMorale };
}

// ============================================================
// simulateTick — 순수 함수
// ============================================================
function simulateTick(state: GameState, dt: number, isSimulating: boolean): Partial<GameState> {
  let {
    neigong, hp, maxHp, battleMode, currentEnemy,
    exploreStep, exploreOrder, isBossPhase, bossTimer,
    explorePendingRewards, battleLog, currentField,
    killCounts, bossKillCounts, totalSimdeuk, totalYasanKills,
    ownedArts, equippedArts, equippedSimbeop,
    simbeopBurstTimer, battleResult, hiddenEncountered,
    huntTarget, totalSpentNeigong,
    playerAttackTimer, enemyAttackTimer,
    floatingTexts, nextFloatingId, playerAnim, enemyAnim,
    fieldUnlocks, inventory,
    discoveredMasteries, pendingEnlightenments,
    moraleBuff,
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

  // stateForCheck: hasMastery 등에서 사용할 상태 (activeMasteries는 변하지 않으므로 원래 state 사용 가능)
  // 단, equippedArts/equippedSimbeop도 tick 중 변하지 않으므로 state를 그대로 사용
  const stateForCheck = state;

  // 1) 내공 생산 (전투 외)
  if (!isBattling) {
    const neigongRate = calcNeigongPerSec(state);
    neigong += neigongRate * dt;
  }

  // 1-1) 전투 중 내공 생산 (심화학습)
  if (isBattling) {
    let combatRatio = 0;
    if (hasMastery(stateForCheck, 'samjae_simbeop_combat')) combatRatio = COMBAT_NEIGONG_RATIO;
    if (hasMastery(stateForCheck, 'heupgong_combat')) combatRatio = COMBAT_NEIGONG_RATIO;
    if (hasMastery(stateForCheck, 'samjae_simbeop_mastery')) combatRatio += COMBAT_NEIGONG_MASTERY_BONUS;
    if (combatRatio > 0) {
      const neigongRate = calcNeigongPerSec(stateForCheck);
      neigong += neigongRate * combatRatio * dt;
    }
  }

  // 2) 심법 패시브 타이머 (neigong_burst: 60초마다, 비전투 시에만)
  if (!isBattling && equippedSimbeop) {
    if (hasMastery(stateForCheck, 'samjae_simbeop_burst')) {
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
    maxHp = calcMaxHp(totalSpentNeigong, state);
    hp = Math.min(hp + maxHp * 0.05 * dt, maxHp);
  }

  // 4) 전투 (타이머 기반)
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
      playerAttackTimer += attackInterval;

      // 무공 발동 로직
      currentEnemy = { ...currentEnemy };
      const result = executeAttack({ ...state, moraleBuff }, currentEnemy.id);
      currentEnemy.hp -= result.damage;

      // 사기충천 사용 후 초기화
      if (result.usedMorale) {
        moraleBuff = 0;
      }

      // 로그 생성
      const monDef = getMonsterDef(currentEnemy.id);
      const eName = monDef?.name ?? currentEnemy.id;

      if (result.isCritical) {
        battleLog.push(`치명타! ${result.artName}으로 ${eName}에게 ${result.damage} 피해!`);
      } else if (result.isDouble) {
        battleLog.push(`연속 공격! ${result.artName}으로 ${eName}에게 ${result.damage} 피해!`);
      } else if (result.isResidual) {
        battleLog.push(`검기 잔류로 ${eName}에게 ${result.damage} 피해.`);
      } else if (result.artDef) {
        const msgs = result.artDef.attackMessages;
        if (msgs && msgs.length > 0) {
          const tmpl = msgs[Math.floor(Math.random() * msgs.length)];
          battleLog.push(`${tmpl} ${eName}에게 ${result.damage} 피해.`);
        } else {
          battleLog.push(`${result.artName}으로 ${eName}에게 ${result.damage} 피해를 입혔다.`);
        }
      } else {
        battleLog.push(`평타로 ${eName}에게 ${result.damage} 피해를 입혔다.`);
      }

      if (!isSimulating) {
        // 플로팅 텍스트
        if (result.isCritical) {
          floatingTexts = [...floatingTexts, { id: nextFloatingId++, text: `${result.damage} 치명타!`, type: 'critical' as const, timestamp: Date.now() }];
        } else if (result.damage > 0) {
          floatingTexts = [...floatingTexts, { id: nextFloatingId++, text: `${result.damage}`, type: 'damage' as const, timestamp: Date.now() }];
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
        if (hasMastery(stateForCheck, 'mudang_step_simdeuk')) {
          simdeuk = Math.floor(simdeuk * 1.05);
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

        // 심화학습 발견 체크
        const allArts = [...new Set([...equippedArts, ...(equippedSimbeop ? [equippedSimbeop] : [])])];
        for (const artId of allArts) {
          const artDef = getArtDef(artId);
          const artOwned = ownedArts.find(a => a.id === artId);
          if (!artDef || !artOwned) continue;
          for (const m of artDef.masteries) {
            if (!m.discovery) continue;
            if (discoveredMasteries.includes(m.id)) continue;
            let discovered = false;
            if (m.discovery.type === 'art_simdeuk' && m.discovery.artSimdeuk != null) {
              if (artOwned.totalSimdeuk >= m.discovery.artSimdeuk) discovered = true;
            } else if (m.discovery.type === 'monster_kill' && m.discovery.monsterId) {
              if ((killCounts[m.discovery.monsterId] ?? 0) >= (m.discovery.monsterKillCount ?? 1)) discovered = true;
            }
            if (discovered) {
              discoveredMasteries.push(m.id);
              pendingEnlightenments.push({ artId, masteryId: m.id, masteryName: m.name });
              battleLog.push(`깨달음! ${artDef.name}의 오의 '${m.name}'을(를) 깨우쳤다!`);
            }
          }
        }

        // 흡혈 (heupgong_heal_enhance 통합)
        if (hasMastery(stateForCheck, 'heupgong_heal_enhance')) {
          let healRate = 0.04;
          if (hasMastery(stateForCheck, 'heupgong_accel')) {
            healRate += 0.02;
          }
          hp = Math.min(hp + maxHp * healRate, maxHp);
        }

        // 사기충천: 처치 시 다음 1회 공격에 심득의 15% 가산
        if (hasMastery(stateForCheck, 'heupgong_morale') && monDef.simdeuk > 0) {
          moraleBuff = Math.floor(monDef.simdeuk * 0.15);
          if (moraleBuff > 0) {
            battleLog.push(`사기충천! 다음 공격에 +${moraleBuff} 위력 가산!`);
          }
        }

        // 곰 처치 시 inn 해금
        if (monDef.id === 'bear' && !fieldUnlocks.inn) {
          fieldUnlocks.inn = true;
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

            // 경보: 보스 처치 후 HP 5% 회복
            if (hasMastery(stateForCheck, 'mudang_step_gyeongbo')) {
              hp = Math.min(hp + maxHp * 0.05, maxHp);
            }

            // 산군 첫 클리어 (기존 inn 해금 조건이었으나 곰 처치로 완화됨)
          }
        } else if (battleMode === 'hunt') {
          totalSimdeuk += simdeuk;
          applySimdeuk(ownedArts, equippedArts, equippedSimbeop, simdeuk, state.tier);
          battleLog.push(`— ${monDef.name} 처치. 심득 +${simdeuk} —`);

          // hunt 킬 시 경보 HP 회복
          if (hasMastery(stateForCheck, 'mudang_step_gyeongbo')) {
            hp = Math.min(hp + maxHp * 0.05, maxHp);
          }

          if (huntTarget) {
            const nextMon = getMonsterDef(huntTarget);
            if (nextMon) {
              currentEnemy = spawnEnemy(nextMon);
              const pInterval = calcAttackInterval(stats.gyeongsin);
              playerAttackTimer = pInterval;
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

          const dodge = calcEvasion(stateForCheck);
          if (Math.random() * 100 < dodge) {
            // 회피 성공
            const monDef = getMonsterDef(currentEnemy.id);
            const eName = monDef?.name ?? currentEnemy.id;
            battleLog.push(`${eName}의 공격을 가볍게 피했다!`);

            // 무당 전신: 회피 시 HP 1% 회복
            if (hasMastery(stateForCheck, 'mudang_step_fullbody')) {
              hp = Math.min(hp + maxHp * 0.01, maxHp);
            }

            if (!isSimulating) {
              floatingTexts = [...floatingTexts, { id: nextFloatingId++, text: '회피!', type: 'evade' as const, timestamp: Date.now() }];
              if (floatingTexts.length > 15) floatingTexts = floatingTexts.slice(-15);
            }
          } else {
            // 피격
            let incomingDmg = currentEnemy.attackPower;

            // 철벽지체: 3% 완전 무효화
            if (hasMastery(stateForCheck, 'gangche_ironwall') && Math.random() < 0.03) {
              incomingDmg = 0;
              battleLog.push('철벽지체! 피해를 완전히 무효화했다!');
            } else {
              // 강인: 5% 피해 감소
              if (hasMastery(stateForCheck, 'gangche_tough')) {
                incomingDmg = Math.floor(incomingDmg * 0.95);
              }
              // 불굴: HP 30% 이하일 때 추가 10% 감소
              if (hasMastery(stateForCheck, 'gangche_unyielding') && hp <= maxHp * 0.3) {
                incomingDmg = Math.floor(incomingDmg * 0.90);
              }
            }

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

      // 경보: 사망 후 HP 5% 회복
      if (hasMastery(stateForCheck, 'mudang_step_gyeongbo')) {
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

  // isSimulating 시 업적 체크 빈도 조절은 호출자 측에서 처리
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
    neigong, hp, maxHp, battleMode, currentEnemy,
    exploreStep, exploreOrder, isBossPhase, bossTimer,
    explorePendingRewards, battleLog, killCounts,
    bossKillCounts, totalSimdeuk, totalYasanKills,
    ownedArts, simbeopBurstTimer, battleResult,
    achievements, artPoints, hiddenEncountered,
    tutorialFlags, totalSpentNeigong,
    playerAttackTimer, enemyAttackTimer,
    fieldUnlocks, inventory,
    discoveredMasteries, pendingEnlightenments,
    moraleBuff,
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
  getNeigongPerSec: () => calcNeigongPerSec(get()),
  getAttackInterval: () => calcAttackInterval(get().stats.gyeongsin),
  getEvasion: () => calcEvasion(get()),
  getTotalStats: () => {
    const s = get().stats;
    return s.sungi + s.gyeongsin + s.magi;
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
    if (state.neigong < cost) return;

    const newStats = { ...state.stats, [stat]: level + 1 };
    const newTotalSpent = state.totalSpentNeigong + cost;
    const newMaxHp = calcMaxHp(newTotalSpent, state);

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
    if (hasMastery(state, 'samjae_simbeop_heal')) {
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
    if (!artDef || !artDef.isSimbeop) return;

    const owned = state.ownedArts.find(a => a.id === artId);
    if (!owned) return;

    const flags = { ...state.tutorialFlags };
    if (artId === 'samjae_simbeop') flags.equippedSimbeop = true;

    // fieldUnlocks.yasan도 동시에 세팅
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

    // 장착 확인
    if (!state.equippedArts.includes(artId) && state.equippedSimbeop !== artId) return;

    // 해당 무공 보유 확인
    const owned = state.ownedArts.find(a => a.id === artId);
    if (!owned) return;

    // 심화 정의 확인
    const mDef = getMasteryDef(artId, masteryId);
    if (!mDef) return;

    // 이미 활성화
    const currentMasteries = state.activeMasteries[artId] ?? [];
    if (currentMasteries.includes(masteryId)) return;

    // 심득 확인
    if (owned.totalSimdeuk < mDef.requiredSimdeuk) return;

    // 경지 확인
    if (mDef.requiredTier > 0 && state.tier < mDef.requiredTier) return;

    // 전제 심화 확인
    if (mDef.requires) {
      for (const reqId of mDef.requires) {
        if (!currentMasteries.includes(reqId)) return;
      }
    }

    // 포인트 확인
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

    // 종속 자동 해제: 같은 무공 내 다른 심화 중 requires에 해제 대상이 포함된 것도 함께 비활성화
    const toRemove = new Set<string>();
    toRemove.add(masteryId);

    // 반복적으로 종속 탐색
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
    if (state.ownedArts.some(a => a.id === item.artId)) return; // 이미 보유
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
  // Save / Load / Reset (v2.0: 3슬롯)
  // ─────────────────────────────────────────────
  saveGame: (slot?: number) => {
    const state = get();
    const targetSlot = slot ?? state.currentSaveSlot;

    const saveData = {
      version: '3.0',
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
      // 전투 상태 저장
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
      moraleBuff: state.moraleBuff,
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

    // 기존 murim_save → slot_0 이전 (1회)
    try {
      const oldSave = localStorage.getItem('murim_save');
      if (oldSave && !localStorage.getItem('murim_save_slot_0')) {
        localStorage.setItem('murim_save_slot_0', oldSave);
        localStorage.removeItem('murim_save');
      }
    } catch {
      // 실패 시 무시
    }

    const raw = localStorage.getItem(`murim_save_slot_${slot}`);
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

      // v2 → v3 마이그레이션: grade/proficiency → totalSimdeuk
      let loadedOwnedArts = data.ownedArts ?? [];
      if (loadedOwnedArts.length > 0 && loadedOwnedArts[0].grade !== undefined) {
        loadedOwnedArts = loadedOwnedArts.map((a: any) => ({
          id: a.id,
          totalSimdeuk: migrateGradeToSimdeuk(a.id, a.grade ?? 1, a.proficiency ?? 0),
        }));
      }

      // discoveredMasteries 마이그레이션
      let discoveredMasteries = data.discoveredMasteries;
      if (!discoveredMasteries) {
        // 기존 활성화된 마스터리 + requiredSimdeuk가 낮은 기본 마스터리 자동 발견
        discoveredMasteries = [];
        const loadedActiveMasteries = data.activeMasteries ?? {};
        for (const [_artId, mIds] of Object.entries(loadedActiveMasteries)) {
          discoveredMasteries.push(...(mIds as string[]));
        }
      }

      // Build a temporary state-like object for calcMaxHp (needs equippedArts, ownedArts, activeMasteries)
      const loadedEquippedArts = data.equippedArts ?? [];
      const loadedEquippedSimbeop = data.equippedSimbeop ?? null;
      const loadedActiveMasteries = data.activeMasteries ?? {};
      const tempStateForHp = {
        equippedArts: loadedEquippedArts,
        ownedArts: loadedOwnedArts,
        equippedSimbeop: loadedEquippedSimbeop,
        activeMasteries: loadedActiveMasteries,
      } as GameState;
      const maxHp = calcMaxHp(totalSpentNeigong, tempStateForHp);
      set({
        neigong: data.neigong ?? 0,
        totalSimdeuk: data.totalSimdeuk ?? 0,
        totalSpentNeigong,
        stats: data.stats ?? { sungi: 0, gyeongsin: 0, magi: 0 },
        hp: Math.min(data.hp ?? maxHp, maxHp),
        maxHp,
        tier: data.tier ?? 0,
        equippedSimbeop: data.equippedSimbeop ?? null,
        ownedArts: loadedOwnedArts,
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
        // 전투 상태 복원
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
        discoveredMasteries,
        pendingEnlightenments: data.pendingEnlightenments ?? [],
        moraleBuff: data.moraleBuff ?? 0,
        currentSaveSlot: slot,
        // 전투 결과/로그는 저장하지 않으므로 초기화
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
        const stats = data.stats ?? { sungi: 0, gyeongsin: 0, magi: 0 };
        const tierDef = getTierDef(data.tier ?? 0);
        slots.push({
          slotIndex: i,
          savedAt: data.savedAt ?? Date.now(),
          tierName: tierDef.name,
          totalStats: (stats.sungi ?? 0) + (stats.gyeongsin ?? 0) + (stats.magi ?? 0),
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
    const maxSeconds = Math.min(elapsedSeconds, 28800); // 최대 8시간
    let currentState = { ...get() } as GameState;
    // Deep clone mutable fields
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

    const startNeigong = currentState.neigong;
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

      // 업적 체크 빈도 조절: 60틱마다만
      const shouldCheckAchievements = (tickCounter % 60 === 0);

      const changes = simulateTick(currentState, 1, true);

      // 업적 체크 스킵 시 이전 achievements/artPoints 유지
      if (!shouldCheckAchievements) {
        changes.achievements = currentState.achievements;
        changes.artPoints = currentState.artPoints;
      }

      // 통계 수집
      if (currentState.battleMode !== 'none') {
        battleTime++;
      } else {
        idleTime++;
      }

      // 킬 카운트 변경 감지
      if (changes.killCounts) {
        for (const [mId, count] of Object.entries(changes.killCounts)) {
          const prev = currentState.killCounts[mId] ?? 0;
          if (count > prev) killCount += (count - prev);
        }
      }

      // 사망 감지
      if (changes.battleResult && (changes.battleResult.type === 'death' || changes.battleResult.type === 'hunt_end')) {
        if (changes.hp !== undefined && changes.hp <= 1) {
          deathCount++;
        }
      }

      // 드롭 감지 (inventory 기반)
      if (changes.inventory) {
        for (const item of changes.inventory) {
          if (!currentState.inventory.some(i => i.id === item.id)) {
            const artDef = item.artId ? getArtDef(item.artId) : null;
            dropsGained.push(artDef?.name ?? item.artId ?? '???');
          }
        }
      }

      // 상태 병합
      currentState = { ...currentState, ...changes } as GameState;
    }

    // 마지막에 set() 한 번
    set({
      ...currentState,
      lastTickTime: Date.now(),
      floatingTexts: [],
      playerAnim: '',
      enemyAnim: '',
    });

    // 새로 획득한 업적
    const achievementsEarned = currentState.achievements.filter(
      a => !startAchievements.includes(a)
    );

    return {
      elapsedTime: maxSeconds,
      neigongGained: currentState.neigong - startNeigong,
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
  // Main tick — v2.0: simulateTick 래핑
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
function applySimdeuk(
  ownedArts: GameState['ownedArts'],
  equippedArts: string[],
  equippedSimbeop: string | null,
  amount: number,
  tier: number,
) {
  if (amount <= 0) return;
  const maxSd = getMaxSimdeuk(tier);
  const allEquipped = [...equippedArts];
  if (equippedSimbeop) allEquipped.push(equippedSimbeop);
  for (const artId of allEquipped) {
    const owned = ownedArts.find(a => a.id === artId);
    if (!owned) continue;
    if (owned.totalSimdeuk >= maxSd) continue;
    owned.totalSimdeuk = Math.min(owned.totalSimdeuk + amount, maxSd);
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
