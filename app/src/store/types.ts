/**
 * 무림 방치록 — 게임 스토어 타입 정의 (순환 의존성 방지용 분리)
 * gameStore.ts / gameLoop.ts / slices 모두 이 파일에서 타입을 가져온다.
 */
import type { ProficiencyType } from '../data/arts';
import type { EquipSlot, EquipmentInstance } from '../data/equipment';

// ============================================================
// 인벤토리 아이템
// ============================================================
export interface InventoryItem {
  id: string;
  itemType: 'art_scroll';
  artId?: string;
  obtainedFrom: string;
  obtainedAt: number;
}

// ============================================================
// 전투 결과
// ============================================================
export interface BattleResult {
  type: 'explore_win' | 'explore_fail' | 'hunt_end' | 'death';
  drops: string[];
  message: string;
  deathLog?: string;
  recentBattleLog?: string[];
  proficiencyGains?: Record<string, number>;
  materialDrops?: Record<string, number>;
}

// ============================================================
// 부유 텍스트 (전투 애니메이션)
// ============================================================
export interface FloatingText {
  id: number;
  text: string;
  type: 'damage' | 'drop' | 'heal' | 'evade' | 'critical' | 'dot';
  timestamp: number;
}

// ============================================================
// 오프라인 진행 결과
// ============================================================
export interface OfflineResult {
  elapsedTime: number;
  qiGained: number;
  killCount: number;
  deathCount: number;
  battleTime: number;
  idleTime: number;
  achievementsEarned: string[];
  dropsGained: string[];
}

// ============================================================
// 세이브 슬롯 메타데이터
// ============================================================
export interface SaveMeta {
  slotIndex: number;
  savedAt: number;
  tierName: string;
  totalStats: number;
}

// ============================================================
// DoT (지속 피해) 스택 엔트리
// ============================================================
export interface DotStackEntry {
  id: string;
  type: 'bleed' | 'poison' | 'stamina_drain' | 'slow';
  damagePerTick: number;       // 초당 데미지 (slow=0)
  damagePerStack: number;      // 스택당 추가 초당 데미지
  stacks: number;
  maxStacks: number;
  remainingSec: number;        // 남은 지속시간
  totalDuration: number;       // 스택 갱신 시 remainingSec 리셋용
  slowAmount?: number;         // slow: 기본 공속 증가량 (초)
  slowPerStack?: number;       // slow: 스택당 추가 공속 증가량
}

// ============================================================
// 장비 DoT (적에게 적용되는 독 등)
// ============================================================
export interface EquipmentDotEntry {
  equipId: string;
  damagePerTick: number;     // 초당 데미지
  stacks: number;
  maxStacks: number;
  remainingSec: number;
  totalDuration: number;
}

// ============================================================
// 적 버프 엔트리
// ============================================================
export interface EnemyBuffEntry {
  id: string;
  type: 'timed_atk_buff';
  value: number;
  remainingSec?: number;
  removableByStun?: boolean;
}

// ============================================================
// 게임 스테이트
// ============================================================
export interface GameState {
  qi: number;
  totalSpentQi: number;
  stats: { gi: number; sim: number; che: number };
  proficiency: Record<ProficiencyType, number>;
  hp: number;
  maxHp: number;
  tier: number;

  // 전투 자원
  stamina: number;
  ultCooldowns: Record<string, number>;
  currentBattleDuration: number;
  currentBattleDamageDealt: number;

  equippedSimbeop: string | null;
  ownedArts: { id: string }[];
  equippedArts: string[];
  artPoints: number;
  artGradeExp: Record<string, number>;

  currentField: string | null;
  battleMode: 'none' | 'explore' | 'hunt';
  huntTarget: string | null;
  pendingHuntRetry: boolean;
  pendingAutoExplore: boolean;
  currentEnemy: {
    id: string; hp: number; maxHp: number; attackPower: number;
    attackInterval: number; regen: number;
    rageModeActive?: boolean;           // 폭혈단 광란 모드
    rageModeHpCost?: number;            // 현재 광란 HP 소모량 (20→30→40...)
    bypassExternalGradeActive?: boolean; // 검기 발현 후 1등급 외공 무시
    potionConsumedRage?: boolean;       // 폭혈단 복용 여부 (처치 시 특수 드롭 조건)
    enemyStunTimer?: number;            // 적 기절 남은 시간(초)
  } | null;
  exploreStep: number;
  exploreOrder: string[];
  isBossPhase: boolean;
  bossTimer: number;
  explorePendingRewards: {
    drops: string[];
    proficiencyGains?: Record<string, number>;
    materialDrops?: Record<string, number>;
  };
  battleLog: string[];

  playerAttackTimer: number;
  enemyAttackTimer: number;

  achievements: string[];
  achievementCount: number;
  killCounts: Record<string, number>;
  bossKillCounts: Record<string, number>;
  totalYasanKills: number;
  totalKills: number;
  hiddenRevealedInField: Record<string, string | null>;

  // 보스 패턴
  bossPatternState: {
    bossStamina: number;
    rageUsed: boolean;
    playerFreezeLeft?: number;
    bossChargeState?: {
      skillId: string;
      turnsLeft: number;
      damageMultiplier: number;
      stunAfterHit?: number;
      bypassAllDmgReduction?: boolean;
      undodgeable?: boolean;
    } | null;
    usedOneTimeSkills?: string[];
    playerAtkDebuffMult?: number;
    playerAtkSpeedDebuffMult?: number;
    stackCount?: number;          // 흑영참 스택 (0~3)
    // === 흑풍채 신규 ===
    playerDotStacks?: DotStackEntry[];
    enemyBuffs?: EnemyBuffEntry[];
    cheolbyeokStacks?: number;    // 철벽 스택 (0~5)
    revengeActive?: boolean;      // 복수심 활성
    sequenceState?: {             // 다단계 시퀀스 상태
      skillId: string;
      currentStep: number;
      totalSteps: number;
    } | null;
    phaseFlags?: Record<string, boolean>;
    lastStandActive?: boolean;
    baseAttackPower?: number;     // 버서커/페이즈용 원본 공격력
    baseAttackInterval?: number;  // 원본 공격 간격
    // === 녹림맹 총순찰사자 신규 ===
    dodgeAtkBuffs?: { atkPercent: number; remainingAttacks: number }[];
    bossChargeDmgReduction?: number;
    bossChargeStunImmune?: boolean;
    chargeRegenPenalty?: number;       // 차지 중 내력 회복속도 감소량 (/초)
  } | null;
  playerFinisherCharge?: {
    artId: string;
    attackFirst: boolean;
    timeLeft: number;
  } | null;
  playerStunTimer: number;
  lastEnemyAttack: { enemyName: string; attackMessage: string } | null;
  dodgeCounterActive: boolean;
  autoExploreFields: Record<string, boolean>;

  tutorialFlags: {
    equippedSword: boolean;
    equippedSimbeop: boolean;
    yasanUnlocked: boolean;
    killedWood: boolean;
    killedIron: boolean;
    firstBreakthroughNotified: boolean;
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

  // 장비 DoT (적에게 적용)
  equipmentDotOnEnemy: EquipmentDotEntry[];

  // 제작 이력
  craftedRecipes: string[];

  // 해금된 레시피
  unlockedRecipes: string[];

  // 도감 해금
  obtainedMaterials: string[];
  knownEquipment: string[];
}
