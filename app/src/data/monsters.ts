/**
 * 몬스터 데이터 (v1.2)
 * 보스 패턴 시스템 추가
 */

// ── 보스 스킬/패턴 ──
export interface BossSkillDef {
  id: string;
  displayName: string;
  type: 'stun' | 'rage_attack' | 'replace_normal' | 'charged_attack'
     | 'dot_apply'
     | 'double_hit'
     | 'freeze_attack'
     | 'multi_hit'
     | 'passive_dodge' | 'passive_crit' | 'passive_dmg_absorb'
     | 'potion_heal' | 'atk_buff_bypass' | 'stack_smash'
     // ── 흑풍채 신규 ──
     | 'passive_bleed'      // 출혈 DoT + 자기 버프 (목령견)
     | 'rapid_fire'         // N타 감소배율 속사 (궁수)
     | 'timed_buff'         // 시한부 공격 버프 (흑풍장전)
     | 'multi_dot'          // 다중 DoT 종류 (사냥꾼 3독)
     | 'condition_strike'   // 상태이상 기반 데미지 (비열한 일격)
     | 'berserker_scale'    // HP% 연동 스케일링 (낭인 살의)
     | 'last_stand'         // 조건부 영구 증폭 (낭인/채주 최후의 발악)
     | 'cheolbyeok'         // 피격 반응 방어 스택 (채주 철벽)
     | 'revenge'            // 절초 피격 반응 (채주 복수심)
     | 'phase_sequence'     // 다단계 시퀀스 (채주 낭아대도)
     | 'conditional_passive'// 조건부 활성 패시브 (채주 낭아일격)
     | 'final_phase'        // 최종 페이즈 진입 (채주 최후의 발악)
     // ── 녹림맹 총순찰사자 신규 ──
     | 'variable_multi_hit' // 타격별 개별 배율 다연타
     | 'dodge_buff_passive' // 회피 시 공격 버프
     // ── 배화교 행자 신규 ──
     | 'baehwa_guard'          // 삼행의 율법 (전투 시작, 조건부 피해 감소)
     | 'baehwa_ember_song'     // 성화 송가 (70% 평타 / 30% 자가회복 + 불씨 부여)
     | 'baehwa_atar_sacrifice' // 아타르로의 귀의 (HP%, 3턴 반사 후 자폭)
     // ── 배화교 호위 신규 ──
     | 'baehwa_hwachang'       // 화창격 (확률 분기 3-way: 평타/1타/2격)
     | 'sraosha_response'      // 스라오샤의 응답 (ember 스택 연동 자기 버프)
     | 'sacred_oath'           // 성화 맹세 (HP 30% 임계 → 각성+광화 시퀀스)
     // ── 배화교 검보사 신규 ──
     | 'geombosa_attack'       // 검보사 공격 라우터 (검술/화염검/연격/점화/성화 + 3태세)
     | 'hwabosa_attack'       // 화보사 공격 라우터 (성화술 + 4페이즈)
     | 'gyeongbosa_attack';   // 경보사 공격 라우터 (경전 낭송 3종 + 규율 스택·카운터 + 절대 규율)
  triggerCondition: 'stamina_full' | 'hp_threshold' | 'default' | 'battle_start';
  staminaCost?: number;
  staminaGain?: number;
  hpThreshold?: number;
  oneTime?: boolean;
  stunDuration?: number;
  damageMultiplier?: number;
  useNormalDamage?: boolean;
  undodgeable?: boolean;
  logMessages: string[];
  priority?: number;
  chance?: number;
  fixedDamage?: number;
  freezeAttacks?: number;
  selfHealPercent?: number;  // 발동 시 자신 최대 HP의 N% 회복
  chargeTime?: number;                  // 차지 턴수 (격산타우: 2)
  stunAfterHit?: number;                // 명중 후 기절 시간 (격산타우: 4.5)
  bypassAllDmgReduction?: boolean;      // 모든 데미지 감소 무시
  hitCount?: number;                    // multi_hit 타격 횟수 (삼연격: 3)
  hitMultiplier?: number;               // 타격당 데미지 배율 (이연격: 0.75, 삼연격: 0.70)
  dodgeChance?: number;                 // passive_dodge: 회피 확률
  critChance?: number;                  // passive_crit: 크리 확률
  critMultiplier?: number;              // 크리 배율
  critChanceAlt?: number;               // 취권: 4배 크리 확률
  critMultiplierAlt?: number;           // 4배 크리 배율
  absorbChance?: number;                // passive_dmg_absorb: 발동 확률
  absorbMultiplier?: number;            // 피해 배율 (0.5 = 절반)
  healOptions?: Array<{                 // potion_heal: 회복 옵션
    probability: number;
    healPercent: number;
    newAttackInterval?: number;
    rageMode?: boolean;
  }>;
  atkBuffPercent?: number;              // atk_buff_bypass: ATK 증가율
  bypassExternalGrade?: number;         // 외공 무시 등급 (1 = 1등급 외공 무시)
  stackTriggerCount?: number;           // stack_smash: 스택 임계치
  stackSmashMultiplier?: number;        // 강타 배율
  debuffAtkPercent?: number;            // 살기: 플레이어 공격력 감소율 (0.2 = 20%)
  debuffAtkSpeedPercent?: number;       // 살기: 공격속도 감소율 (0.2 = 20% 느려짐)
  conditionMinSimbeopGrade?: number;    // 살기: 이 심법 등급 이상이면 무시 (4)
  conditionGradeEffects?: {             // 살기 등급별 차등 (bandit_leader)
    minGrade: number;
    debuffAtkPercent: number;
    debuffAtkSpeedPercent: number;
    logMessage: string;
  }[];
  // ── passive_bleed ──
  bleedChance?: number;
  bleedDamagePerTick?: number;          // 초당 출혈 데미지 (1스택)
  bleedMaxStacks?: number;
  bleedDuration?: number;              // 출혈 지속시간 (totalDuration)
  bleedSelfBuffs?: {
    atkSpeedBonus: number;              // 공속 증가 (attackInterval 감소)
    atkBonus: number;                   // 공격력 증가
    dmgTakenIncrease: number;          // 플레이어 → 적 데미지 증가율 (%)
  };
  // ── rapid_fire ──
  rapidFireHits?: number;
  rapidFireMultiplier?: number;
  singleLineLog?: boolean;
  // ── timed_buff ──
  buffDuration?: number;
  buffAtkPercent?: number;
  removableByStun?: boolean;
  noDuplicate?: boolean;
  // ── multi_dot ──
  dotType?: 'poison' | 'stamina_drain' | 'slow';
  dotDamage?: number;
  dotDamagePerStack?: number;           // 스킬 레벨의 스택당 추가 데미지
  dotMaxStacks?: number;
  dotDuration?: number;
  slowAmount?: number;
  slowPerStack?: number;
  // ── condition_strike ──
  baseFixedDamage?: number;
  perDebuffBonus?: number;
  debuffCountThreshold?: number;
  bypassJeoposaemOnThreshold?: boolean;
  undodgeableOnThreshold?: boolean;
  // ── berserker_scale ──
  berserkAtkPerPercent?: number;        // HP 손실 1%당 공격력 증가
  berserkSpdPerPercent?: number;        // HP 손실 1%당 공속 증가
  // ── last_stand ──
  disableCrit?: boolean;
  // ── cheolbyeok ──
  cheolbyeokChance?: number;
  cheolbyeokReductionPerStack?: number;
  cheolbyeokMaxStacks?: number;
  cheolbyeokResetOnStun?: boolean;
  // ── revenge ──
  revengeMultiplier?: number;
  // ── phase_sequence ──
  sequenceSteps?: {
    logMessage: string;
    healPercent?: number;
    atkSpeedChange?: number;
    atkPercentChange?: number;
    permanent?: boolean;
  }[];
  // ── conditional_passive ──
  activateAfterSkillId?: string;
  conditionalBleed?: { damage: number; stacks: number; duration: number };
  conditionalCheolbyeokGain?: number;
  // ── final_phase ──
  finalCheolbyeokFixed?: number;
  finalDmgBonus?: number;
  finalConditionalMultiplierChange?: { targetSkillId: string; newMultiplier: number };
  finalSelfDmgPercent?: number;
  // ── 영역선포: 장착 무공 조건 ──
  conditionRequiredArts?: string[];       // 이 무공들 모두 장착 안하면 디버프
  ignoreByEquipId?: string;              // 이 장비 착용 시 조건 무시
  // ── variable_multi_hit ──
  hitTiers?: { chance: number; hitCount: number; hitMultipliers: number[] }[];
  // ── phase_sequence 확장 ──
  stunOnTrigger?: number;                // 시퀀스 발동 시 플레이어 스턴(초)
  // ── 페이즈 게이팅 ──
  activateAfterPhaseFlag?: string;       // phaseFlags[X]===true일 때 활성
  deactivateAfterPhaseFlag?: string;     // phaseFlags[X]===true이면 비활성
  // ── dodge_buff_passive ──
  dodgeBuffAtkPercent?: number;          // 회피 성공 시 ATK 버프 %
  dodgeBuffAttackCount?: number;         // 공격 횟수 기반 지속 (연타=1회)
  dodgeBuffMaxStacks?: number;           // 최대 스택
  // ── charged_attack 확장 ──
  chargeDrainPerSec?: number;            // 차지 중 플레이어 내력 회복속도 감소량 (/초)
  chargeDmgReduction?: number;           // 차지 중 보스 데미지 감소 (0.30=30%)
  chargeStunImmunity?: boolean;          // 차지 중 스턴 면역
  postFireSelfStun?: boolean;            // 발사 후 영구 자기 스턴
  // ── 배화교 행자 신규 ──
  conditionRequiredFaction?: import('./arts').Faction;  // 이 faction 무공 하나라도 장착 시 조건 충족
  damageTakenMultiplierIfCondition?: number;            // 조건 불충족 시 적이 받는 피해 배율 (0.5)
  damageTakenMultiplierWhenFactionEquipped?: number;    // 조건 충족 시 적이 받는 피해 배율 (미지정 시 1.0 = 기존 동작)
  battleStartLogs?: string[];                            // 전투 시작 즉시 출력될 로그
  firstHitLogMessagesNoArt?: string[];                  // 조건 불충족 플레이어 첫 공격 시 로그(A/B/C)
  firstHitLogMessagesWithArt?: string[];                // 조건 충족 플레이어 첫 공격 시 로그
  emberApplyChance?: number;                            // 성화 송가: 불씨 부여 확률 (0.8)
  emberSongSuccessLogs?: string[];                      // 송가 불씨 부여 성공 로그 (4종)
  emberSongFailLogs?: string[];                         // 송가 불씨 부여 실패 로그 (4종)
  sacrificeDurationTurns?: number;                      // 귀의 지속 턴수 (3)
  sacrificeHealPercentPerTurn?: number;                 // 귀의 매 턴 자가 회복 비율 (0.08)
  sacrificeReflectEmberOnHit?: number;                  // 귀의 중 플레이어 공격 시 반사 불씨 (1)
  sacrificeEndPreEmber?: number;                        // 자폭 전 선 부여 불씨 (3)
  sacrificeDamageMultiplier?: number;                   // 자폭 피해: 스택 × 이 값 × 공격력 (1.5)
  sacrificeKillFailureOnDeath?: boolean;                // 자폭으로 사망 시 처치 실패 판정
  sacrificeOnTriggerLogs?: string[];                    // 귀의 발동 로그
  sacrificeHealLogs?: string[];                          // 귀의 매 턴 회복 로그
  sacrificeReflectLogs?: string[];                      // 귀의 중 반사 불씨 로그 (A/B/C)
  sacrificeSelfDestructLogs?: string[];                 // 자폭 로그
  sacrificeEarlyKillLogs?: string[];                    // 3턴 내 처치 시 로그
  // ── 배화교 호위 신규 ──
  // 화창격 (baehwa_hwachang)
  hwachangSingleChance?: number;
  hwachangSingleDamageMult?: number;
  hwachangSingleEmberChance?: number;
  hwachangDoubleChance?: number;
  hwachangDoubleDamageMult?: number;
  hwachangDoubleEmberChance?: number;
  hwachangFrenzySingleChance?: number;
  hwachangFrenzyDoubleChance?: number;
  hwachangSingleLogs?: string[];
  hwachangDoubleLogs?: string[];
  hwachangFrenzySingleLogs?: string[];
  hwachangFrenzyDoubleLogs?: string[];
  // 스라오샤 (sraosha_response)
  sraoshaTiers?: { stackMin: number; stackMax: number; atkBonus: number; aspdBonus: number }[];
  sraoshaRiseLogs?: { toTier: number; logs: string[] }[];
  sraoshaFallLogs?: { toTier: number; logs: string[] }[];
  // 성화 맹세 (sacred_oath)
  sacredOathHealPercent?: number;
  sacredOathInitialEmber?: number;
  sacredOathAwakeningTurns?: number;
  sacredOathReflectPerHit?: number;
  sacredOathBreathIntervalTurns?: number;
  sacredOathOnTriggerLogs?: string[];
  sacredOathReflectLogs?: string[];
  sacredOathFrenzyEnterLogs?: string[];
  sacredOathBreathLogs?: string[];
  sacredOathStunImmuneLogs?: string[];
  sacredOathKillFrenzyLogs?: string[];
  sacredOathKillEarlyLogs?: string[];
  // ── 배화교 검보사 신규 ──
  geombosaSkills?: {
    swordsmanship: { mult: number; logs?: string[] };
    flameSword:    { mult: number; emberApplyChance: number; logs: string[] };
    flameCombo:    { mult: number; hits: number; emberApplyChancePerHit: number; logs: string[] };
    emberIgnition: {
      baseMult: number;
      perStackMult: number;
      consumeStacks: number;
      logs: string[];
      dodgeLogs: string[];
    };
    sacredFlame: {
      mult: number;
      emberApply: number;
      logs: string[];
      dodgeLogs: string[];
      warningLog: string;
      grogyEnterLog: string;
      grogyExitLog: string;
      gaugePerNormalAttack: number;
      gaugeMax: number;
      warningThreshold: number;
      grogyDurationMs: number;   // 초 단위(이름은 유지; ms 아님)
    };
    stanceTransitionLogs: { defenseToAttack: string; attackToMaster: string };
    stunImmuneLogs: string[];
    killLogs: {
      defense: string[];
      attack: string[];
      masterPreSeonghwa: string;
      masterPostSeonghwa: string;
    };
    // 공격 태세 분포 (ember>=2)
    attackStanceDistWithEmber: { swordsmanship: number; flameSword: number; flameCombo: number; emberIgnition: number };
    // 공격 태세 분포 (ember<2) — 점화 슬롯을 검술로 치환
    attackStanceDistNoEmber: { swordsmanship: number; flameSword: number; flameCombo: number };
    // 방어 태세 분포
    defenseStanceDist: { swordsmanship: number; flameSword: number; flameCombo: number };
    // 명인 태세 분포 (성화 충전 중 일반 공격)
    masterStanceDist: { swordsmanship: number; flameSword: number; flameCombo: number };
    // 태세별 주는 피해 배율
    defenseOutMult: number;
    attackOutMult: number;
    masterOutMult: number;
    // 태세별 받는 피해 배율 (playerCombat.ts 참조)
    defenseInMult: number;
    attackInMult: number;
    masterInMult: number;
  };
  hwabosaSkills?: {
    flameSwing: { mult: number };
    atarBrand: {
      mult: number;
      selfEmberGain: number;
      playerEmberGain: number;
      logs: string[];
    };
    ashaMeditation: {
      maxAbsorbPerUse: number;
      healPercentPerStack: number;
      nextAttackBonusPerStack: number;
      logs: string[];
      emptyLogs: string[];
    };
    verethragna: {
      mult: number;
      selfEmberGain: number;
      playerEmberGain: number;
      logs: string[];
    };
    druzVerdict: {
      dotCoefficient: number;
      durationSec: number;
      selfEmberGain: number;
      log: string;
      tickLogs: string[];
    };
    atashBahram: {
      selfEmberGain: number;
      playerEmberGain: number;
      warningLog: string;
      activationLog: string;
    };
    phase1Dist: { flameSwing: number; atarBrand: number; ashaMeditation: number };
    phase2Dist: { flameSwing: number; atarBrand: number; ashaMeditation: number; verethragna: number };
    phase3Dist: { flameSwing: number; atarBrand: number; ashaMeditation: number; verethragna: number; druzVerdict: number };
    phase4Dist: { atarBrand: number; ashaMeditation: number; verethragna: number; druzVerdict: number; atashBahram: number };
    prayerDurationSec: number;
    prayerTickIntervalSec: number;
    prayerStackPerTick: number;
    prayerStartLog: string;
    prayerTickLogs: string[];
    prayerEndLog: string;
    bahramGaugeMax: number;
    bahramGainPerAttack: number;
    bahramGainPerAbsorbStack: number;
    bahramWarningThreshold: number;
    phaseAbsorptionThresholds: [number, number, number];
    phaseEntrySelfEmber: number;
    phaseTransitionLogs: {
      worshipToMeditation: string;
      gohoActivationLog: string;
      meditationToLiberation: string;
      liberationToAscension: string;
    };
    gohoDrPerStack: number;
    gohoDrMaxCap: number;
    druzBurnSelfOnly: boolean;
    killLogs: {
      worship: string[];
      meditation: string[];
      liberation: string[];
      ascensionPreBahram: string;
      ascensionPostBahram: string;
    };
  };
  // ── 배화교 경보사 (외문 상위 일반) ──
  gyeongbosaSkills?: {
    normal: { mult: number; logs: string[] };
    suppression: {
      mult: number;
      debuffAtkPercent: number;       // 0.25 = -25%
      debuffAtkSpeedPercent: number;  // 0.25 = -25%
      durationSec: number;            // 8
      playerEmberGain: number;        // 1
      logs: string[];                 // A/B/C/D
      hitSuffix: string;              // chip용 표시 문자열
    };
    selfHarmony: {
      healPercent: number;            // 0.006 (초당)
      tickIntervalSec: number;        // 1
      durationSec: number;            // 8
      nextAttackDodgeBonus: number;   // 0.30
      firstLogs: string[];            // A/B/C
      resetLogs: string[];            // A/B
    };
    verdict: {
      dotCoefficient: number;         // 0.35
      durationSec: number;            // 8
      playerEmberGain: number;        // 1
      logs: string[];                 // A/B/C
      tickLogs: string[];             // A/B
    };
    skillDist: {
      normal: number;
      suppression: number;
      selfHarmony: number;
      verdict: number;
    };
    discipline: {
      stackCap: number;               // 6
      hpHalfTriggerRatio: number;     // 0.5
      rngPool: ('declaration' | 'lightStep' | 'enforcement')[];
      absoluteMod: number;            // 4 (4의 배수마다 절대 규율)
      buffDurationSec: number;        // 20
      declaration: { playerCritRateOverride: number; log: string; banner: string };
      lightStep:   { enemyDodgeBonus: number;         log: string; banner: string };
      enforcement: { enemyAtkMult: number;            log: string; banner: string };
      absolute: {
        stunSec: number;              // 15
        dotCoefficient: number;       // 0.75
        dotDurationSec: number;       // 15
        ceremonySec: number;          // 15
        openLog: string;
        phraseLog5s: string;
        phraseLog10s: string;
        dotTickLogs: string[];
        endLog: string;
        stunBreakLog: string;
        stunResumeLog: string;
      };
      resetLog: string;               // 같은 규율 재발동 시 지속시간만 리셋
    };
    killLogs: {
      prePhase: string[];             // A/B — HP 50% 진입 전 처치
      midPhase: string[];             // A/B — 규율 1~3회차 구간
      nearAbsolute: string[];         // A/B — 절대 규율 발동 전 4회차 임박
      postAbsolute: string;           // 고정 — 절대 규율 이후 처치
    };
  };
}

export interface BossPatternDef {
  stamina: { initial: number; max: number; regenPerSec: number };
  skills: BossSkillDef[];
  dotDamagePerStack?: number;
  staminaLabel?: string;
}

export const BOSS_PATTERNS: Record<string, BossPatternDef> = {
  tiger_boss: {
    stamina: { initial: 25, max: 25, regenPerSec: 0.8 },
    skills: [
      {
        id: 'tiger_roar', displayName: '포효(咆哮)', type: 'stun', triggerCondition: 'stamina_full',
        staminaCost: 25, stunDuration: 4, undodgeable: false, priority: 1,
        logMessages: ['무시무시한 포효에 온몸이 얼어붙었다...'],
      },
      {
        id: 'tiger_rage', displayName: '분노의 일격', type: 'rage_attack', triggerCondition: 'hp_threshold',
        hpThreshold: 0.3, oneTime: true, damageMultiplier: 2.5, undodgeable: true, priority: 2,
        logMessages: ['산군의 분노! 산군이 남아있는 힘을 모아 강력한 일격을 가했다!!'],
      },
    ],
  },
  dangkang: {
    stamina: { initial: 0, max: 50, regenPerSec: 0 },
    skills: [
      {
        id: 'earth_shatter', displayName: '대지분쇄(大地粉碎)', type: 'charged_attack', triggerCondition: 'stamina_full',
        staminaCost: 50, damageMultiplier: 10, undodgeable: true, priority: 1,
        logMessages: ['대지분쇄(大地粉碎)! 당강이 땅을 내리찍자 대지가 갈라졌다!', '대지분쇄(大地粉碎)! 산이 울릴 정도의 충격이 몸을 관통했다!'],
      },
      {
        id: 'harvest_qi', displayName: '풍년의 기운', type: 'replace_normal', triggerCondition: 'default',
        staminaGain: 10, useNormalDamage: false, undodgeable: false, priority: 0,
        selfHealPercent: 4,
        logMessages: ['당강이 풍년의 기운을 내뿜었다!', '당강의 몸에서 대지의 기운이 흘러나왔다!', '당강이 뿔을 들이밀며 기운을 모은다!'],
      },
    ],
  },
  hwahyulsa: {
    stamina: { initial: 0, max: 3, regenPerSec: 0 },
    dotDamagePerStack: 7,
    staminaLabel: '화혈독',
    skills: [
      {
        id: 'hwahyul_burst', displayName: '화혈분화(火血噴火)', type: 'freeze_attack',
        triggerCondition: 'stamina_full', staminaCost: 3,
        fixedDamage: 400, undodgeable: false, priority: 1,
        logMessages: ['화혈분화(火血噴火)! 온몸에 퍼진 독이 한꺼번에 터졌다!'],
      },
      {
        id: 'hwahyul_bite', displayName: '독니 물기', type: 'dot_apply',
        triggerCondition: 'default', chance: 0.4, staminaGain: 1, priority: 0,
        logMessages: ['화혈사의 독니가 살을 파고들었다! 화혈독이 퍼진다!'],
      },
    ],
  },
  innkeeper_true: {
    stamina: { initial: 0, max: 100, regenPerSec: 15 },
    skills: [
      {
        id: 'kill_intent',
        displayName: '살기(殺氣)',
        type: 'replace_normal',
        triggerCondition: 'default',
        oneTime: true,
        debuffAtkPercent: 0.2,
        debuffAtkSpeedPercent: 0.2,
        conditionMinSimbeopGrade: 4,
        priority: 10,
        logMessages: [
          '객잔 주인의 눈에서 살기가 뿜어져 나온다! 기가 눌린다!',
          '...심법이 충분하지 않다. 살기에 압도당했다!',
        ],
      },
      {
        id: 'geoksan_charge',
        displayName: '격산타우(隔山打牛)',
        type: 'charged_attack',
        triggerCondition: 'hp_threshold',
        hpThreshold: 0.30,
        oneTime: true,
        chargeTime: 2,
        damageMultiplier: 6,
        bypassAllDmgReduction: true,
        stunAfterHit: 4.5,
        undodgeable: true,
        priority: 5,
        logMessages: [
          '격산타우(隔山打牛)...! 객잔 주인이 기를 응집하기 시작했다!',
          '격산타우! 보이지 않는 힘이 공간을 가로질러 폭발했다!',
        ],
      },
      {
        id: 'double_strike',
        displayName: '이연격(二連擊)',
        type: 'double_hit',
        triggerCondition: 'default',
        chance: 0.15,
        hitMultiplier: 0.75,
        staminaGain: 3,
        logMessages: ['이연격(二連擊)!'],
      },
      {
        id: 'triple_strike',
        displayName: '삼연격(三連擊)',
        type: 'multi_hit',
        triggerCondition: 'default',
        chance: 0.05,
        hitCount: 3,
        hitMultiplier: 0.70,
        staminaGain: 5,
        logMessages: ['삼연격(三連擊)!'],
      },
    ],
  },
  eunrang: {
    stamina: { initial: 0, max: 3, regenPerSec: 0 },
    skills: [
      {
        id: 'hwanyeong_ice', displayName: '환영빙습(幻影氷襲)', type: 'freeze_attack',
        triggerCondition: 'stamina_full', staminaCost: 3,
        fixedDamage: 300, freezeAttacks: 3, undodgeable: false, priority: 1,
        logMessages: ['환영빙습(幻影氷襲)! 은랑의 형체가 흐릿해지더니 순식간에 덮쳐왔다!'],
      },
      {
        id: 'jeonkwang', displayName: '전광석화(電光石火)', type: 'double_hit',
        triggerCondition: 'default', chance: 0.2, staminaGain: 1, priority: 0,
        logMessages: ['전광석화(電光石火)! 은랑이 번개처럼 두 번 덮쳤다!'],
      },
    ],
  },
  // ── 객잔 일반 몬스터 패턴 ──
  drunk_thug: {
    stamina: { initial: 0, max: 0, regenPerSec: 0 },
    skills: [
      {
        id: 'drunk_dodge', displayName: '취권 — 비틀 회피', type: 'passive_dodge', triggerCondition: 'default',
        dodgeChance: 0.15,
        logMessages: ['건달이 비틀거리다 공격을 흘려냈다! (취권 — 회피)'],
      },
      {
        id: 'drunk_crit', displayName: '취권 — 우발 강타', type: 'passive_crit', triggerCondition: 'default',
        critChance: 0.15, critMultiplier: 2,
        critChanceAlt: 0.03, critMultiplierAlt: 4,
        logMessages: ['취권! 우연히 급소를 맞혔다!', '취권의 기적! 몸이 저절로 움직였다! 강력한 일격!'],
      },
    ],
  },
  troublemaker: {
    stamina: { initial: 0, max: 0, regenPerSec: 0 },
    skills: [
      {
        id: 'iron_shirt', displayName: '철포삼(鐵布衫)', type: 'passive_dmg_absorb', triggerCondition: 'default',
        absorbChance: 0.25, absorbMultiplier: 0.5,
        bypassExternalGrade: 1,
        logMessages: ['철포삼! 강인한 몸이 충격을 흡수했다!'],
      },
    ],
  },
  peddler: {
    stamina: { initial: 0, max: 0, regenPerSec: 0 },
    skills: [
      {
        id: 'potion_intake', displayName: '단약 복용', type: 'potion_heal',
        triggerCondition: 'hp_threshold', hpThreshold: 0.30, oneTime: true, priority: 5,
        healOptions: [
          { probability: 0.96, healPercent: 0.30 },
          { probability: 0.04, healPercent: 1.00, newAttackInterval: 2.0, rageMode: true },
        ],
        logMessages: ['단약을 꺼내 삼켰다! 상처가 아물기 시작한다...',
                      '폭혈단! 몸 전체에서 폭발적인 기운이 터져나왔다!'],
      },
    ],
  },
  bandit_chief: {
    stamina: { initial: 0, max: 0, regenPerSec: 0 },
    skills: [
      {
        id: 'low_nokrim_crit', displayName: '하급 녹림도법', type: 'passive_crit', triggerCondition: 'default',
        critChance: 0.15, critMultiplier: 2,
        logMessages: ['하급 녹림도법! 기세를 실은 일격이 급소를 파고들었다!'],
      },
    ],
  },
  wanderer: {
    stamina: { initial: 0, max: 0, regenPerSec: 0 },
    skills: [
      {
        id: 'sword_qi_manifest', displayName: '검기 발현(劍氣發現)', type: 'atk_buff_bypass',
        triggerCondition: 'hp_threshold', hpThreshold: 0.50, oneTime: true, priority: 5,
        atkBuffPercent: 0.20, bypassExternalGrade: 1,
        logMessages: ['검기 발현(劍氣發現)! 검에서 기(氣)가 피어올랐다! 공격력이 증가한다!'],
      },
    ],
  },
  // ── 흑풍채 패턴 ──
  heugpung_mokryeong: {
    stamina: { initial: 0, max: 0, regenPerSec: 0 },
    skills: [
      {
        id: 'mokryeong_bleed', displayName: '목령견 — 출혈', type: 'passive_bleed',
        triggerCondition: 'default',
        bleedChance: 0.20, bleedDamagePerTick: 25, bleedMaxStacks: 3,
        bleedDuration: 15,
        bleedSelfBuffs: { atkSpeedBonus: 0.3, atkBonus: 7, dmgTakenIncrease: 5 },
        logMessages: ['목령견의 이빨에서 피가 흐른다!', '날카로운 발톱이 살을 파고들었다!'],
      },
    ],
  },
  sanbaram_gungsu: {
    stamina: { initial: 0, max: 0, regenPerSec: 0 },
    skills: [
      {
        id: 'rapid_arrow', displayName: '속사(速射)', type: 'rapid_fire',
        triggerCondition: 'default',
        chance: 0.15, rapidFireHits: 5, rapidFireMultiplier: 0.6, singleLineLog: true,
        logMessages: ['속사!'],
      },
      {
        id: 'heugpung_janjeon', displayName: '흑풍장전(黑風裝箭)', type: 'timed_buff',
        triggerCondition: 'default',
        chance: 0.20, buffDuration: 15, buffAtkPercent: 0.35,
        removableByStun: true, noDuplicate: true,
        logMessages: ['궁수가 활시위를 팽팽히 당기며 집중한다...'],
      },
    ],
  },
  bounty_hunter: {
    stamina: { initial: 0, max: 0, regenPerSec: 0 },
    skills: [
      {
        id: 'busidok', displayName: '부시독 칼날', type: 'multi_dot',
        triggerCondition: 'default',
        chance: 0.15, dotType: 'poison', dotDamage: 40, dotDamagePerStack: 8,
        dotMaxStacks: 3, dotDuration: 10,
        logMessages: ['부시독 칼날! 독이 퍼진다!'],
      },
      {
        id: 'sangongdok', displayName: '산공독 칼날', type: 'multi_dot',
        triggerCondition: 'default',
        chance: 0.15, dotType: 'stamina_drain', dotDamage: 3, dotDamagePerStack: 0.7,
        dotMaxStacks: 3, dotDuration: 10,
        logMessages: ['산공독 칼날! 내공이 흐트러진다!'],
      },
      {
        id: 'mahyeoldok', displayName: '마혈독 칼날', type: 'multi_dot',
        triggerCondition: 'default',
        chance: 0.15, dotType: 'slow', slowAmount: 0.25, slowPerStack: 0.05,
        dotMaxStacks: 3, dotDuration: 10,
        logMessages: ['마혈독 칼날! 몸이 둔해진다!'],
      },
      {
        id: 'byeolhan_ilgyeok', displayName: '비열한 일격', type: 'condition_strike',
        triggerCondition: 'default',
        chance: 0.15, baseFixedDamage: 150, perDebuffBonus: 0.25,
        debuffCountThreshold: 2, bypassJeoposaemOnThreshold: true, undodgeableOnThreshold: true,
        logMessages: ['비열한 일격!'],
      },
    ],
  },
  ronin: {
    stamina: { initial: 0, max: 0, regenPerSec: 0 },
    skills: [
      {
        id: 'ronin_berserker', displayName: '살의(殺意)', type: 'berserker_scale',
        triggerCondition: 'default',
        berserkAtkPerPercent: 1.5, berserkSpdPerPercent: 1,
        logMessages: ['살의가 넘실거린다...'],
      },
      {
        id: 'ronin_crit', displayName: '흑도 치명타', type: 'passive_crit',
        triggerCondition: 'default',
        critChance: 0.15, critMultiplier: 3,
        logMessages: ['치명적인 일격!'],
      },
      {
        id: 'ronin_last_stand', displayName: '최후의 발악', type: 'last_stand',
        triggerCondition: 'default',
        hpThreshold: 0.15, damageMultiplier: 2, disableCrit: true,
        logMessages: ['최후의 발악! 낭인의 눈빛이 광기로 물들었다!'],
      },
    ],
  },
  bandit_leader: {
    stamina: { initial: 0, max: 0, regenPerSec: 0 },
    skills: [
      {
        id: 'boss_kill_intent', displayName: '살기(殺氣)', type: 'replace_normal',
        triggerCondition: 'default', oneTime: true, priority: 10,
        conditionGradeEffects: [
          { minGrade: 10, debuffAtkPercent: 0, debuffAtkSpeedPercent: 0, logMessage: '살기를 꿰뚫어 보았다!' },
          { minGrade: 9, debuffAtkPercent: 0.15, debuffAtkSpeedPercent: 0.15, logMessage: '살기에 약간 흔들렸다...' },
        ],
        debuffAtkPercent: 0.40, debuffAtkSpeedPercent: 0.40,
        logMessages: ['채주의 살기가 몰아친다!'],
      },
      {
        id: 'cheolbyeok', displayName: '철벽(鐵壁)', type: 'cheolbyeok',
        triggerCondition: 'default',
        cheolbyeokChance: 0.35, cheolbyeokReductionPerStack: 0.08,
        cheolbyeokMaxStacks: 5, cheolbyeokResetOnStun: true,
        logMessages: ['철벽! 채주가 기를 끌어올려 방어를 굳혔다!'],
      },
      {
        id: 'revenge', displayName: '복수심(復讐心)', type: 'revenge',
        triggerCondition: 'default',
        revengeMultiplier: 2,
        logMessages: ['복수심! 채주의 눈에 분노가 타오른다!'],
      },
      {
        id: 'nangadaedo', displayName: '낭아대도(狼牙大刀)', type: 'phase_sequence',
        triggerCondition: 'hp_threshold', hpThreshold: 0.60, oneTime: true,
        sequenceSteps: [
          { logMessage: '내 칼을 가져오너라!!' },
          { logMessage: '술을 마시며 상처를 치유한다...', healPercent: 0.25 },
          { logMessage: '도를 손에 들며 — 제대로 놀아보자!', atkSpeedChange: 2.0, atkPercentChange: 0.50, permanent: true },
        ],
        logMessages: ['낭아대도!'],
      },
      {
        id: 'nangadaedo_passive', displayName: '낭아일격(狼牙一擊)', type: 'conditional_passive',
        triggerCondition: 'default',
        activateAfterSkillId: 'nangadaedo', chance: 0.15, damageMultiplier: 2,
        conditionalBleed: { damage: 50, stacks: 1, duration: 10 },
        conditionalCheolbyeokGain: 1,
        logMessages: ['낭아일격!'],
      },
      {
        id: 'boss_last_stand', displayName: '최후의 발악(最後-)', type: 'final_phase',
        triggerCondition: 'hp_threshold', hpThreshold: 0.20, oneTime: true,
        finalCheolbyeokFixed: 5, finalDmgBonus: 0.20,
        finalConditionalMultiplierChange: { targetSkillId: 'nangadaedo_passive', newMultiplier: 2.5 },
        finalSelfDmgPercent: 0.02,
        logMessages: ['최후의 발악! 채주가 남은 모든 내력을 끌어올린다!'],
      },
    ],
  },
  nokrim_patrol_chief: {
    stamina: { initial: 0, max: 0, regenPerSec: 0 },
    skills: [
      // Phase 1
      {
        id: 'nokrim_kill_intent', displayName: '살기(殺氣)', type: 'replace_normal',
        triggerCondition: 'default', oneTime: true, priority: 10,
        conditionGradeEffects: [
          { minGrade: 11, debuffAtkPercent: 0, debuffAtkSpeedPercent: 0, logMessage: '심법의 깊은 내공이 살기를 막아냈다.' },
          { minGrade: 10, debuffAtkPercent: 0.15, debuffAtkSpeedPercent: 0.15, logMessage: '살기에 약간 흔들렸다...' },
        ],
        debuffAtkPercent: 0.40, debuffAtkSpeedPercent: 0.40,
        logMessages: ['총순찰사자의 살기가 사방을 뒤덮는다!'],
      },
      {
        id: 'nokrim_territory', displayName: '영역 선포(領域宣布)', type: 'replace_normal',
        triggerCondition: 'default', oneTime: true, priority: 9,
        conditionRequiredArts: ['nokrim_fist', 'nokrim_bobeop'],
        ignoreByEquipId: 'nokrim_herald_boots',
        debuffAtkPercent: 0.20, debuffAtkSpeedPercent: 0.20,
        logMessages: [
          '이 산은 녹림의 땅이다! 녹림의 법도를 모르는 자에게는 자비란 없다!',
        ],
      },
      {
        id: 'nokrim_fist_attack', displayName: '녹림권(綠林拳)', type: 'variable_multi_hit',
        triggerCondition: 'default',
        hitTiers: [
          { chance: 0.05, hitCount: 3, hitMultipliers: [0.6, 0.8, 1.0] },
          { chance: 0.15, hitCount: 2, hitMultipliers: [0.6, 0.8] },
        ],
        deactivateAfterPhaseFlag: 'nokrim_wiise',
        logMessages: ['녹림권!'],
      },
      {
        id: 'nokrim_bobeop_dodge', displayName: '녹림보법(綠林步法)', type: 'passive_dodge',
        triggerCondition: 'default',
        dodgeChance: 0.10,
        deactivateAfterPhaseFlag: 'nokrim_wiise',
        logMessages: ['총순찰사자가 녹림보법으로 공격을 흘려냈다!'],
      },
      // Phase 전환 (50% HP)
      {
        id: 'nokrim_wiise', displayName: '녹림의 위세(綠林-威勢)', type: 'phase_sequence',
        triggerCondition: 'hp_threshold', hpThreshold: 0.50, oneTime: true, priority: 8,
        stunOnTrigger: 4,
        sequenceSteps: [
          { logMessage: '...감히 이 몸에게 상처를 내다니. 진심으로 상대해 주마.' },
          { logMessage: '녹림십팔절예(綠林十八絶藝)! 녹림 무공의 진수를 보여주지!' },
        ],
        logMessages: ['녹림의 위세!'],
      },
      // Phase 2
      {
        id: 'nokrim_tiger_strike', displayName: '녹림맹호격(綠林猛虎擊)', type: 'variable_multi_hit',
        triggerCondition: 'default',
        hitTiers: [
          { chance: 0.10, hitCount: 2, hitMultipliers: [1.2, 1.4] },
          { chance: 0.20, hitCount: 3, hitMultipliers: [0.6, 0.7, 0.8] },
        ],
        activateAfterPhaseFlag: 'nokrim_wiise',
        logMessages: ['녹림맹호격!'],
      },
      {
        id: 'beast_bobeop', displayName: '야수보법(野獸步法)', type: 'dodge_buff_passive',
        triggerCondition: 'default',
        dodgeChance: 0.12,
        dodgeBuffAtkPercent: 15, dodgeBuffAttackCount: 3, dodgeBuffMaxStacks: 2,
        activateAfterPhaseFlag: 'nokrim_wiise',
        logMessages: ['총순찰사자가 야수처럼 움직여 공격을 흘려냈다!'],
      },
      // 최종기 (15% HP)
      {
        id: 'nokrim_final', displayName: '불완전한 녹림패왕격(綠林覇王擊)', type: 'charged_attack',
        triggerCondition: 'hp_threshold', hpThreshold: 0.15, oneTime: true, priority: 7,
        chargeTime: 5, damageMultiplier: 11, undodgeable: true,
        chargeDrainPerSec: 15, chargeDmgReduction: 0.30,
        chargeStunImmunity: true, postFireSelfStun: true,
        logMessages: [
          '불완전한 녹림패왕격...! 총순찰사자가 남은 모든 내력을 끌어올린다!',
          '녹림패왕격! 불완전하지만 그 위력은 충분히 치명적이다!',
        ],
      },
    ],
  },
  // ── 배화교 패턴 ──
  baehwa_haengja: {
    stamina: { initial: 0, max: 0, regenPerSec: 0 },
    skills: [
      {
        id: 'baehwa_guard',
        displayName: '삼행의 율법(三行律法)',
        type: 'baehwa_guard',
        triggerCondition: 'battle_start',
        oneTime: true,
        priority: 10,
        conditionRequiredFaction: 'baehwagyo',
        damageTakenMultiplierIfCondition: 0.5,
        battleStartLogs: [
          '*행자가 성화를 향해 두 손을 모은다.*',
          '*「삼행(三行)이 흐르지 않는 손은 우리의 살갗을 스치지 못하리라.」*',
        ],
        firstHitLogMessagesNoArt: [
          '*당신의 일격이 행자의 살갗 앞에서 흩어진다.*\n*「생각도, 말도, 행동도 — 아직 성화의 결을 따르지 못하는군요.」*',
          '*행자가 미소짓는다. 당신의 칼끝이 허공을 긋는다.*\n*「당신의 길은 아직 세 갈래로 갈라져 있습니다. 하나로 모으세요.」*',
          '*당신의 공격이 성화의 결 앞에서 무뎌진다.*\n*「길을 아직 걷지 않은 자의 것이군요.」*',
        ],
        firstHitLogMessagesWithArt: [
          '*당신의 일격이 행자의 방호를 찢는다. 행자의 눈빛이 흔들린다.*\n*「...당신도, 길을 걷고 있었군요.」*',
        ],
        logMessages: [],
      },
      {
        id: 'baehwa_ember_song',
        displayName: '성화 송가(聖火頌歌)',
        type: 'baehwa_ember_song',
        triggerCondition: 'default',
        chance: 0.30,
        priority: 5,
        selfHealPercent: 8,
        emberApplyChance: 0.80,
        emberSongSuccessLogs: [
          '*행자가 두 손을 모아 성화를 찬미한다. 목소리 끝에서 흰 불씨 하나가 당신에게 옮겨간다.*',
          '*「성화여, 이 미천한 자의 목소리를 들으소서.」*\n*행자의 기도 끝에서 불꽃이 피어나 당신의 옷자락에 옮겨 붙는다.*',
          '*행자가 눈을 감고 송가를 읊는다. 그 숨결이 당신의 몸을 스치며 미세한 불티를 남긴다.*',
          '*「... 타오르소서, 영원히 타오르소서.」*\n*행자의 기도가 그의 상처를 아물게 하고, 당신에게는 불씨 한 점을 건넨다.*',
        ],
        emberSongFailLogs: [
          '*행자가 성화를 향해 두 손을 모으고 송가를 읊는다. 상처가 아물어간다.*',
          '*「성화여, 당신의 종에게 빛을 내려주소서.」*\n*행자의 숨결이 고르게 돌아온다.*',
          '*행자가 무릎을 꿇고 기도한다. 그의 몸에서 희미한 온기가 감돈다.*',
          '*「이 미천한 자에게 성화의 숨을 허락하소서.」*\n*행자의 입가에 미소가 번진다.*',
        ],
        logMessages: [],
      },
      {
        id: 'baehwa_atar_sacrifice',
        displayName: '아타르로의 귀의(歸依) [Ātar]',
        type: 'baehwa_atar_sacrifice',
        triggerCondition: 'hp_threshold',
        hpThreshold: 0.30,
        oneTime: true,
        priority: 8,
        sacrificeDurationTurns: 3,
        sacrificeHealPercentPerTurn: 0.08,
        sacrificeReflectEmberOnHit: 1,
        sacrificeEndPreEmber: 3,
        sacrificeDamageMultiplier: 1.5,
        sacrificeKillFailureOnDeath: true,
        sacrificeOnTriggerLogs: [
          '*행자가 피 묻은 입가로 미소짓는다. 두 팔을 벌리고 성화를 향해 몸을 내민다.*\n*「아타르여, 이 미천한 몸을 받으소서.」*',
        ],
        sacrificeHealLogs: [
          '*행자의 상처가 흰 재로 덮이며 아물어간다.*',
        ],
        sacrificeReflectLogs: [
          '*당신의 칼이 행자의 살갗을 가른다. 그 자리에서 흰 불꽃이 튀어 당신에게 옮겨 붙는다.*',
          '*행자는 피하지 않는다. 상처에서 새어나온 불티가 당신의 손등에 내려앉는다.*',
          '*행자가 눈을 감은 채 흔들린다. 그의 몸에서 번진 불꽃이 당신의 옷자락을 물들인다.*',
        ],
        sacrificeSelfDestructLogs: [
          '*행자가 두 눈을 크게 뜬다. 그의 몸이 안에서부터 하얗게 타오른다.*\n*「아타르······ 아타르에게로······!」*\n*행자의 몸이 흰 불기둥이 되어 폭발한다.*',
        ],
        sacrificeEarlyKillLogs: [
          '*행자의 눈빛이 흐려진다. 그의 몸이 흰 재로 바스러져 흩어진다.*\n*「아타르에게······ 닿지······ 못······」*',
        ],
        logMessages: [],
      },
    ],
  },
  // ── 배화교 호위 패턴 ──
  baehwa_howi: {
    stamina: { initial: 0, max: 0, regenPerSec: 0 },
    skills: [
      {
        id: 'baehwa_guard_howi',
        displayName: '삼행의 율법(三行律法)',
        type: 'baehwa_guard',
        triggerCondition: 'battle_start',
        oneTime: true,
        priority: 10,
        conditionRequiredFaction: 'baehwagyo',
        damageTakenMultiplierIfCondition: 0.5,
        battleStartLogs: [
          '*호위가 창을 바로 세우며 자세를 낮춘다.*',
          '*「삼행(三行)의 율법 아래에 있지 않은 손은, 우리 교의 살갗에 닿을 수 없다.」*',
        ],
        firstHitLogMessagesNoArt: [
          '*당신의 일격이 호위의 갑주 앞에서 미끄러진다.*\n*「길이 갈라진 자의 창은 갑주를 가르지 못한다.」*',
          '*호위가 한 발도 물러서지 않는다. 창끝이 당신의 공격을 가볍게 받아넘긴다.*\n*「삼행이 하나로 모이지 않은 손끝이군.」*',
          '*당신의 공격이 호위의 살갗을 스치기 전에 흐트러진다.*\n*「율법을 모르는 자로군.」*',
        ],
        firstHitLogMessagesWithArt: [
          '*당신의 일격이 호위의 갑주를 찢는다. 호위의 눈빛이 달라진다.*\n*「...삼행을 걷는 자였군.」*',
        ],
        logMessages: [],
      },
      {
        id: 'sraosha_howi',
        displayName: '스라오샤의 응답(Sraosha 應答)',
        type: 'sraosha_response',
        triggerCondition: 'battle_start',
        oneTime: true,
        priority: 9,
        sraoshaTiers: [
          { stackMin: 0, stackMax: 1, atkBonus: 0, aspdBonus: 0 },
          { stackMin: 2, stackMax: 4, atkBonus: 0.10, aspdBonus: 0.05 },
          { stackMin: 5, stackMax: 8, atkBonus: 0.20, aspdBonus: 0.10 },
          { stackMin: 9, stackMax: 9999, atkBonus: 0.30, aspdBonus: 0.15 },
        ],
        sraoshaRiseLogs: [
          { toTier: 1, logs: ['*당신 몸의 불씨가 호위의 창끝을 감싼다. 호위의 창이 조금 빨라진다.*'] },
          { toTier: 2, logs: ['*호위가 당신의 불씨에 호흡을 맞춘다. 창끝이 붉게 타오른다.*'] },
          { toTier: 3, logs: ['*호위의 눈에서 광기가 비친다.*\n*「성화가 그대 안에 있다. 나는 그것에 응답할 뿐.」*'] },
        ],
        sraoshaFallLogs: [
          { toTier: 2, logs: ['*호위의 숨이 한 박자 무뎌진다. 창끝의 붉은 기운이 조금 가라앉는다.*\n*「…그대의 불이 잦아드는군.」*'] },
          { toTier: 1, logs: ['*호위의 창대에 감돌던 열기가 서서히 식어간다. 호위가 자세를 고쳐 잡는다.*'] },
          { toTier: 0, logs: ['*호위의 호흡이 정돈된다. 창끝이 원래의 차가운 빛을 되찾는다.*'] },
        ],
        logMessages: [],
      },
      {
        id: 'baehwa_hwachang_howi',
        displayName: '화창격(火槍擊)',
        type: 'baehwa_hwachang',
        triggerCondition: 'default',
        priority: 5,
        hwachangSingleChance: 0.21,
        hwachangDoubleChance: 0.09,
        hwachangSingleDamageMult: 1.8,
        hwachangDoubleDamageMult: 1.2,
        hwachangSingleEmberChance: 0.70,
        hwachangDoubleEmberChance: 0.60,
        hwachangFrenzySingleChance: 0.25,
        hwachangFrenzyDoubleChance: 0.10,
        hwachangSingleLogs: [
          '*호위가 창대를 양손에 모으고 발을 구른다. 다음 순간 창끝이 폭발적으로 내뻗친다.*',
          '*『성화의 이름으로.』 호위의 창이 한 호흡에 두 걸음을 파고든다.*',
          '*호위의 창대가 성화를 스친 듯 붉게 달아오른다. 창끝이 당신의 살갗을 꿰뚫는다.*',
          '*호위가 자세를 낮추며 창을 비스듬히 당긴다. 다음 순간, 붉은 궤적이 당신의 몸을 관통한다.*',
        ],
        hwachangDoubleLogs: [
          '*호위의 창이 두 번 번쩍인다. 첫 찌르기에 이어, 창대를 되돌린 두 번째 찌르기가 곧장 이어진다.*',
          '*『두 번. 두 번 그의 길을 끊으소서.』 호위의 창이 짧은 간격으로 두 번 내뻗친다.*',
          '*호위가 창을 한 차례 회전시키며 두 갈래의 궤적을 그린다. 두 궤적 모두가 당신의 몸을 스친다.*',
        ],
        hwachangFrenzySingleLogs: [
          '*『성화여.』 호위의 창이 붉은 궤적을 그리며 내리꽂힌다.*',
          '*호위의 창끝에서 흰 불티가 흩뿌려지며 당신을 꿰뚫는다.*',
        ],
        hwachangFrenzyDoubleLogs: [
          '*호위의 창이 두 번 번쩍인다. 두 번 모두 성화가 당신의 몸에 박힌다.*',
          '*『성화여, 두 번 — 두 번 그의 길을 끊으소서.』 호위의 창이 짧은 간격으로 두 번 당신을 꿰뚫는다.*',
        ],
        logMessages: [],
      },
      {
        id: 'sacred_oath_howi',
        displayName: '성화 맹세(聖火盟誓)',
        type: 'sacred_oath',
        triggerCondition: 'hp_threshold',
        hpThreshold: 0.30,
        oneTime: true,
        priority: 8,
        sacredOathHealPercent: 0.15,
        sacredOathInitialEmber: 1,
        sacredOathAwakeningTurns: 1,
        sacredOathReflectPerHit: 1,
        sacredOathBreathIntervalTurns: 4,
        sacredOathOnTriggerLogs: [
          '*호위가 창을 땅에 깊숙이 꽂고 한쪽 무릎을 꿇는다. 두 눈을 감고 성화를 향해 고개를 숙인다.*\n*「성화 앞에 맹세했다 — 이 문은 넘게 하지 않겠다.」*\n*호위의 갑주 틈새로 흰 불꽃이 스며 나와 당신의 살갗에 옮겨 붙는다.*',
        ],
        sacredOathReflectLogs: [
          '*당신의 일격이 기도하는 호위의 어깨를 쳤다. 상처에서 튄 흰 불꽃이 당신에게 내려앉는다.*',
          '*호위는 반응하지 않는다. 꽂힌 창을 붙잡은 자세 그대로, 벌어진 상처에서 불씨 한 점이 새어 나와 당신의 옷자락을 물들인다.*',
          '*「...」 호위는 말이 없다. 그러나 그의 몸에서 번져 나온 불꽃이 당신을 스치며 흔적을 남긴다.*',
        ],
        sacredOathFrenzyEnterLogs: [
          '*호위가 천천히 고개를 든다. 두 눈 속에서 흰 불꽃이 타오르고 있다.*\n*창을 뽑아 들자, 창대 전체에 성화가 옮겨붙어 일렁인다.*\n*「이제부터 당신을 찌르는 것은 — 내가 아니다. 성화다.」*',
        ],
        sacredOathBreathLogs: [
          '*호위의 살갗 틈새로 흘러나온 흰 불꽃이 당신에게 스며든다.*',
          '*호위 주변의 공기가 하얗게 일렁이더니, 그 파편이 당신 위로 내려앉는다.*',
          '*호위의 입가에서 흰 불씨가 번진다. 그 일부가 당신의 살갗에 닿는다.*',
        ],
        sacredOathStunImmuneLogs: [
          '*당신의 일격이 호위의 급소를 정확히 찍었다. 그러나 호위는 흔들리지 않는다. 두 눈 속 흰 불꽃이 오히려 더 깊게 타오른다.*',
          '*호위의 몸이 한 차례 비틀린다. 하지만 창은 놓지 않는다. 성화가 그의 의식을 붙잡고 있다.*',
        ],
        sacredOathKillFrenzyLogs: [
          '*호위가 창을 땅에 꽂고 무릎을 꿇는다. 몸을 감싸던 불꽃이 서서히 꺼진다.*\n*「성화여...... 이 몸으로는...... 부족했습니다......」*',
        ],
        sacredOathKillEarlyLogs: [
          '*호위가 창을 놓치며 무너진다. 피 묻은 입가로 성화 쪽을 바라본다.*\n*「...아직...... 성화 앞에...... 맹세를...... 드리지도...... 못했는데......」*',
        ],
        logMessages: [],
      },
    ],
  },
  // ── 배화교 검보사 패턴 ──
  baehwa_geombosa: {
    stamina: { initial: 0, max: 0, regenPerSec: 0 },
    skills: [
      {
        id: 'geombosa_three_law',
        displayName: '삼행의 율법(三行律法)',
        type: 'baehwa_guard',
        triggerCondition: 'battle_start',
        oneTime: true,
        priority: 10,
        conditionRequiredFaction: 'baehwagyo',
        damageTakenMultiplierIfCondition: 0.5,
        battleStartLogs: [
          '*검보사가 검을 아래로 드리운 채 한 걸음 물러선다. 가볍게 목례한다.*',
          '*「삼행(三行)의 율법 아래, 먼저 한 수 양보해 드리지요. 선수(先手)는 그대의 것입니다.」*',
        ],
        firstHitLogMessagesNoArt: [
          '*당신의 일격이 검보사의 검신(劍身) 표면을 스치는가 싶더니, 힘없이 미끄러진다.*\n*「…아직 길이 세 갈래로 나뉜 이의 검이군요.」*',
          '*검보사의 검이 당신의 공격을 종이 한 장 차이로 흘려보낸다. 한 발도 물러서지 않는다.*\n*「삼행을 걷지 않은 자에게는 저의 갑주가 너무 두껍습니다.」*',
          '*당신의 공격이 검보사의 옷자락을 스치고 그친다.*\n*「그대의 검에는 아직 성화의 결이 없군요.」*',
        ],
        firstHitLogMessagesWithArt: [
          '*당신의 일격이 검보사의 자세를 처음으로 무너뜨린다. 검보사의 눈빛이 조금 진지해진다.*\n*「…그대도 길을 걷는 분이셨군요. 결례했습니다.」*',
        ],
        logMessages: [],
      },
      {
        id: 'geombosa_router',
        displayName: '검보사 검술',
        type: 'geombosa_attack',
        triggerCondition: 'default',
        priority: 5,
        logMessages: [],
        geombosaSkills: {
          swordsmanship: { mult: 1.0 },
          flameSword: {
            mult: 1.8,
            emberApplyChance: 1.0,
            logs: [
              '*검보사의 검신(劍身)이 붉게 달아오른다. 검 끝이 그린 호(弧)가 당신의 살갗을 긋는다.*',
              '*「화염이 검의 혀(舌)가 되어.」 검보사의 검이 한 호흡에 당신의 간격으로 들어온다.*',
              '*검보사의 검이 공기를 베자 그 궤적에 붉은 실금이 남는다. 실금이 당신의 몸 위에서 살아난다.*',
              '*검보사가 검을 수평으로 뻗는다. 검끝이 스친 자리에서 잔불이 일렁인다.*',
            ],
          },
          flameCombo: {
            mult: 1.2,
            hits: 2,
            emberApplyChancePerHit: 0.6,
            logs: [
              '*검보사의 검이 두 번 번쩍인다. 올려베기 직후에 내려베기. 두 호(弧)가 X자로 당신의 몸을 가른다.*',
              '*「한 번은 경고이고, 두 번째는 응답입니다.」 검보사의 검이 좌우로 두 차례 뻗는다.*',
              '*검보사가 검을 몸 옆으로 끌어당기며 반 바퀴 돈다. 회전의 끝에서 두 줄기의 붉은 궤적이 당신의 몸에 닿는다.*',
            ],
          },
          emberIgnition: {
            baseMult: 2.2,
            perStackMult: 0.6,
            consumeStacks: 2,
            logs: [
              '*검보사가 왼손으로 당신의 몸에 남은 불씨를 향해 수인(手印)을 긋는다. 불씨가 검에 빨려 들어가듯 모여들더니, 검끝에서 폭발한다.*',
              '*「그대의 불, 제가 먼저 쓰겠습니다.」 검보사가 검 끝으로 당신의 몸을 가리킨다. 옮겨 붙어 있던 불꽃이 검을 타고 역류한다. 검이 한 호흡 만에 당신을 꿰뚫는다.*',
              '*검보사가 검을 가볍게 떤다. 당신의 살갗에서 번지던 불꽃 두 점이 허공으로 끌어올려지더니, 검신(劍身)을 타고 내려와 그대로 당신을 찌른다.*',
              '*검보사의 검이 붉다 못해 하얗게 달아오른다. 그가 한 걸음 내딛자, 당신의 몸에 붙어 있던 불씨가 사라지고 — 같은 양의 열이 검끝을 타고 돌아온다.*',
            ],
            dodgeLogs: [
              '*검보사가 불씨를 끌어모으려 하던 순간, 당신이 반 보 물러선다. 끌려가려던 불꽃이 허공에서 흩어진다.*',
              '*『…』 검보사의 검이 당신의 몸을 스치기 직전, 당신의 체술이 궤적을 흘린다. 검끝에 매달려 있던 불꽃이 바닥에 떨어져 꺼진다.*',
            ],
          },
          sacredFlame: {
            mult: 8.0,
            emberApply: 3,
            logs: [
              '*검보사가 한 호흡에 검을 수직으로 쳐올린다. 검끝에 모여 있던 흰 불꽃이 하늘 높이 치솟더니, 그대로 당신의 정수리를 향해 내리꽂힌다.*\n*「성화 — 하나.」*\n*일섬(一閃). 당신의 몸을 가로지른 궤적 위로 흰 불꽃이 타오른다.*',
            ],
            dodgeLogs: [
              '*검보사의 일격이 내리꽂히기 직전, 당신이 몸을 틀어 궤적을 비켜낸다. 흰 불꽃이 바닥에 내리꽂히며 돌바닥을 쪼갠다.*\n*그러나 검보사 자신도 그 일격을 다 토해냈다. 그는 검을 회수하지 못하고 한쪽 무릎을 꿇는다.*',
            ],
            warningLog: '*검보사의 검신을 타고 오르던 흰 불꽃이 검끝에 모인다. 검 주변 공기가 일렁이기 시작한다.*\n*「…준비되셨습니까.」*',
            grogyEnterLog: '*일격을 쏟아낸 검보사가 한쪽 무릎을 꿇고 검을 지팡이처럼 짚는다. 어깨가 크게 오르내리며 숨을 몰아쉰다.*\n*당분간은 — 당신의 시간이다.*',
            grogyExitLog: '*검보사가 천천히 일어선다. 검을 다시 세우는 그의 호흡이 고르게 돌아와 있다.*\n*「…다시 한 번. 성화의 이름으로.」*',
            gaugePerNormalAttack: 20,
            gaugeMax: 100,
            warningThreshold: 80,
            grogyDurationMs: 6,   // 초 단위
          },
          stanceTransitionLogs: {
            defenseToAttack: '*검보사가 검을 수직으로 세우며 한 걸음 뒤로 물러선다. 검의 결에 스며 있던 빛이 한 차례 갈라졌다가, 다시 모인다.*\n*「제법이시군요. 그럼 — 이후로는 제대로 해 보겠습니다.」*',
            attackToMaster: '*검보사가 검을 땅에 꽂고 잠시 눈을 감는다. 호흡을 고르는가 싶더니, 검을 뽑아 들 때 그의 자세가 완전히 달라져 있다.*\n*검신(劍身)을 따라 흰 불꽃 한 줄기가 아래에서 위로 천천히 올라간다.*\n*「…이제부터는 진심으로 상대하겠습니다. 성화의 이름으로.」*',
          },
          stunImmuneLogs: [
            '*당신의 스턴 기술이 검보사의 급소를 정확히 찍었다. 그러나 검보사는 흔들리지 않는다. 이미 반쯤 넘어간 그의 의식은 성화에 매여 있다.*',
            '*검보사의 몸이 한순간 비틀린다. 하지만 검을 놓지 않는다. 그의 호흡이 흐트러지지 않는다.*',
          ],
          killLogs: {
            defense: [
              '*검보사가 검을 떨어뜨리며 천천히 앉는다. 자세를 고쳐잡기도 전에 싸움이 끝났다.*\n*「…선수를 양보한 것이…… 결례가 되었군요.」*',
              '*검보사가 검 끝을 바닥에 짚으며 한쪽 무릎을 꿇는다. 그의 검신에는 아직 불꽃이 채 오르지도 않았다.*\n*「…죄송합니다. 아직 제 진심을…… 보여드리지 못했는데.」*',
            ],
            attack: [
              '*검보사의 검이 반쯤 올라가다 멈춘다. 검신의 불꽃이 일렁이다 꺼져간다.*\n*「그대의 불을 빌려 쓰려 했는데…… 그대가 한 수 빨랐군요.」*',
              '*검보사가 검을 내려놓는다. 검 끝의 잔불이 바닥에 떨어져 작은 선을 그리며 사라진다.*\n*「…삼행의 율법 아래에서 패한 것이라면, 원망할 것이 없습니다.」*',
            ],
            masterPreSeonghwa: '*검보사의 검이 허공에서 멈춘다. 검신에 오르던 흰 불꽃이 바닥으로 흘러내린다.*\n*「…성화여. 이 몸으로는 일격에 도달하지 못했습니다.」*\n*검보사가 검을 땅에 꽂고 고개를 숙인다.*',
            masterPostSeonghwa: '*검보사가 검을 놓고 두 손을 모은다. 그의 몸을 감싸던 흰 불꽃이 하나씩 꺼져간다.*\n*「…성화여. 한 번의 일격은…… 올리지 못한 것이 아닙니다.」*\n*「…그대가, 그 일격을 넘어선 것입니다.」*',
          },
          defenseStanceDist: { swordsmanship: 0.50, flameSword: 0.35, flameCombo: 0.15 },
          attackStanceDistWithEmber: { swordsmanship: 0.30, flameSword: 0.25, flameCombo: 0.25, emberIgnition: 0.20 },
          attackStanceDistNoEmber:  { swordsmanship: 0.50, flameSword: 0.25, flameCombo: 0.25 },
          masterStanceDist: { swordsmanship: 0.40, flameSword: 0.35, flameCombo: 0.25 },
          defenseOutMult: 1.0,
          attackOutMult: 1.3,
          masterOutMult: 1.3,
          defenseInMult: 0.7,
          attackInMult: 1.0,
          masterInMult: 0.7,
        },
      },
    ],
  },
  // ── 배화교 화보사 패턴 ──
  baehwa_hwabosa: {
    stamina: { initial: 0, max: 0, regenPerSec: 0 },
    skills: [
      {
        id: 'hwabosa_three_law',
        displayName: '삼행의 율법(三行律法)',
        type: 'baehwa_guard',
        triggerCondition: 'battle_start',
        oneTime: true,
        priority: 10,
        conditionRequiredFaction: 'baehwagyo',
        damageTakenMultiplierIfCondition: 0.5,
        battleStartLogs: [
          '*화보사가 두 손을 모은 채 눈을 감고 있다. 그의 앞에 작은 성화 한 점이 공중에 떠 있다.*',
          '*「삼행(三行)의 율법 아래에서 — 저는 지금 기도 중입니다. 지나가십시오.」*',
        ],
        firstHitLogMessagesNoArt: [
          '*당신의 일격이 화보사의 어깨를 스쳤으나, 옷자락 안쪽에서 희미한 불꽃이 일어나 그 힘을 받아낸다.*\n*「삼행의 길을 걷지 않은 이의 손은…… 저의 성화에 닿을 수 없습니다.」*',
          '*화보사가 눈을 뜨지 않은 채 한 걸음 비킨다. 당신의 공격이 허공을 가른다.*\n*「불경한 분이시군요. 성화가 당신의 걸음을 가엽게 여기고 있습니다.」*',
          '*당신의 타격이 화보사의 몸에 닿기 전에, 그의 주위를 도는 불씨 한 점이 타격의 결을 눅인다.*\n*「…아직은, 제 기도를 끊으실 자격이 없습니다.」*',
        ],
        firstHitLogMessagesWithArt: [
          '*당신의 일격이 화보사의 자세를 처음으로 흔든다. 그의 눈꺼풀이 떨리듯 열린다.*\n*「…같은 길을 걷는 분이시로군요. 그렇다면 — 진심으로 상대하겠습니다.」*',
        ],
        logMessages: [],
      },
      {
        id: 'hwabosa_router',
        displayName: '화보사 성화술',
        type: 'hwabosa_attack',
        triggerCondition: 'default',
        priority: 5,
        logMessages: [],
        hwabosaSkills: {
          flameSwing: { mult: 1.0 },
          atarBrand: {
            mult: 1.9,
            selfEmberGain: 1,
            playerEmberGain: 1,
            logs: [
              '*화보사가 손끝의 성화를 허공에 그어 한 점의 표식을 새긴다. 같은 표식이 그의 가슴과 당신의 살갗에 동시에 떠오른다.*',
              '*「아타르의 은총을 — 그대에게도.」 화보사의 손 안에서 불꽃이 갈라져, 하나는 자신에게, 하나는 당신에게 내려앉는다.*',
              '*화보사가 두 손을 모으자 그 사이에서 불꽃이 한 번 폭발한다. 퍼진 불씨가 자신과 당신의 몸에 각각 한 점씩 낙인을 찍는다.*',
              '*공중의 성화가 두 갈래로 갈라진다. 하나는 화보사의 이마에, 하나는 당신의 가슴에 새겨진다.*',
            ],
          },
          ashaMeditation: {
            maxAbsorbPerUse: 2,
            healPercentPerStack: 0.02,
            nextAttackBonusPerStack: 0.5,
            logs: [
              '*화보사가 눈을 감고 숨을 한 번 길게 들이쉰다. 그의 몸을 둘러싸던 불씨 몇 점이, 들숨을 따라 그의 가슴 안쪽으로 빨려 들어간다.*',
              '*「아샤여 — 당신의 진리로 이 불꽃을 다스리소서.」 화보사의 주위를 떠돌던 불씨가 그의 심장 부근으로 모여 사라진다.*',
              '*화보사가 왼손의 성화를 가슴에 품자, 그의 몸에 붙어 있던 불씨가 하나씩 그 안으로 빨려 들어간다. 그의 숨이 조금 길어진다.*',
            ],
            emptyLogs: [
              '*화보사가 눈을 감고 묵상을 시도하지만, 그의 주위에 거두어들일 불씨가 남아 있지 않다. 그가 천천히 눈을 뜬다.*',
              '*화보사가 숨을 길게 들이쉰다. 그러나 몸에 남은 성화의 결이 옅어, 묵상은 흐름만을 그리고 끝난다.*',
            ],
          },
          verethragna: {
            mult: 2.5,
            selfEmberGain: 2,
            playerEmberGain: 2,
            logs: [
              '*화보사의 손 위에서 성화가 창날 모양으로 뭉친다. 그가 팔을 뻗자, 창끝의 불꽃이 한 호흡에 당신의 몸을 관통한다.*',
              '*「베레트라그나 — 승리의 결을 이 일격에.」 화보사가 손바닥을 앞으로 내지른다. 그 앞에서 공기가 불꽃이 되어 당신을 내려친다.*',
              '*화보사의 성화가 한순간 푸른빛을 띤다. 다음 순간, 그 푸른 불꽃이 당신의 앞에서 되살아나 붉게 폭발한다.*',
              '*화보사가 공중의 성화를 움켜쥐자 성화가 한 자루의 짧은 검으로 응결된다. 그가 한 걸음 내딛자 — 그 불검이 당신을 가른다.*',
            ],
          },
          druzVerdict: {
            dotCoefficient: 0.07,
            durationSec: 5,
            selfEmberGain: 2,
            log: '*화보사가 눈을 뜬다. 그의 눈동자 안쪽에서 성화가 타고 있다.*\n*「드루즈(druj) — 거짓의 자여. 이 불꽃은 당신의 몸을 태우는 것이 아니라, 당신 안의 거짓을 태우는 것입니다.」*\n*그의 손에서 퍼진 불꽃이 당신의 몸을 휘감는다. 화상은 금방 가시지 않는다.*',
            tickLogs: [
              '*당신의 몸에서 성화가 한 번 더 타오른다.*',
              '*거짓을 태우는 불꽃이 당신의 살결을 파고든다.*',
              '*당신의 몸 위에서 성화의 낙인이 한 번 더 깊어진다.*',
            ],
          },
          atashBahram: {
            selfEmberGain: 15,
            playerEmberGain: 15,
            warningLog: '*화보사의 머리 위의 성화가 한 층 더 크게 부풀어오른다. 그 빛이 주위의 공기를 녹아내리게 한다.*\n*「이제 — 곧.」*',
            activationLog: '*화보사가 두 팔을 하늘 높이 들어올린다. 그의 머리 위의 성화가 폭발하듯 퍼지며, 온 천지가 한순간 붉게 물든다.*\n*「아타시 바흐람(Ātash Bahrām) — 승리의 성화시여. 이 자리의 모든 거짓을 태우소서.」*\n*불꽃의 비가 쏟아진다. 당신의 몸에도, 화보사의 몸에도 — 똑같은 무게의 성화가 내려앉는다.*',
          },
          phase1Dist: { flameSwing: 0.333, atarBrand: 0.333, ashaMeditation: 0.334 },
          phase2Dist: { flameSwing: 0.25, atarBrand: 0.25, ashaMeditation: 0.25, verethragna: 0.25 },
          phase3Dist: { flameSwing: 0.20, atarBrand: 0.20, ashaMeditation: 0.20, verethragna: 0.20, druzVerdict: 0.20 },
          phase4Dist: { atarBrand: 0.20, ashaMeditation: 0.20, verethragna: 0.20, druzVerdict: 0.20, atashBahram: 0.20 },
          prayerDurationSec: 7.5,
          prayerTickIntervalSec: 1.5,
          prayerStackPerTick: 1,
          prayerStartLog: '*화보사가 공중의 성화 앞으로 한 걸음 더 다가선다. 그의 숨에 맞춰 성화가 천천히 흔들리고, 그의 주위로 작은 불씨들이 하나둘씩 피어오른다.*\n*「아타르시여. 이 불경한 자리에서 — 당신을 모십니다.」*',
          prayerTickLogs: [
            '*화보사의 손 끝에서 피어난 불씨 한 점이 당신의 몸에 옮겨붙는다.*',
            '*공중의 성화에서 두 가닥의 불씨가 갈라져 나와, 하나는 화보사의 가슴에, 하나는 당신의 몸에 내려앉는다.*',
            '*화보사가 짧은 주문을 읊조리자, 주위의 공기에서 불씨가 맺혀 두 사람에게 나뉘어 붙는다.*',
          ],
          prayerEndLog: '*화보사가 눈을 뜬다. 공중의 성화가 그의 왼손 위로 내려앉는다.*\n*「기도를 방해하다니 — 불경한 자로군요. 성화께서 당신의 거짓을 아시게 될 겁니다.」*',
          bahramGaugeMax: 30,
          bahramGainPerAttack: 5,
          bahramGainPerAbsorbStack: 2,
          bahramWarningThreshold: 24,
          phaseAbsorptionThresholds: [6, 16, 31],
          phaseEntrySelfEmber: 5,
          phaseTransitionLogs: {
            worshipToMeditation: '*화보사가 두 팔을 천천히 벌린다. 그의 몸 안으로 삼켜졌던 성화가, 이번에는 그의 피부 바깥으로 다시 피어오른다. 한 점, 두 점, 다섯 점.*\n*「아타르께서 저를 감싸주시는군요. 이 몸이 불씨를 두른 채 — 그대를 맞이하겠습니다.」*',
            gohoActivationLog: '*화보사의 몸을 감싸는 불씨가 한 겹의 막을 이룬다. 당신의 공격이 그 막에 닿는 순간 조금씩 흐려진다.*',
            meditationToLiberation: '*화보사가 하늘을 향해 두 손을 벌린다. 그의 몸을 짓누르던 불씨의 무게가, 한 번의 숨과 함께 사라진다.*\n*그의 눈빛이 한 꺼풀 벗겨진다.*\n*「성화가 이 몸을 다 태우기 전에는 — 이 몸의 검은 무뎌지지 않습니다.」*',
            liberationToAscension: '*화보사가 한 걸음 앞으로 나온다. 그의 발걸음에는 이제 어떠한 지연도 없다.*\n*공중의 성화가 그의 정수리 위로 올라오더니, 점점 커져 그의 몸보다 커진다.*\n*「이 몸은 더 이상 저의 것이 아닙니다. 아타시 바흐람(Ātash Bahrām)께서 — 이 그릇을 거두어 주시기를.」*',
          },
          gohoDrPerStack: 0.05,
          gohoDrMaxCap: 0.50,
          druzBurnSelfOnly: false,
          killLogs: {
            worship: [
              '*화보사가 두 손을 모은 채 무릎을 꿇는다. 그의 앞에 떠 있던 성화가 한 번 크게 흔들리다, 꺼진다.*\n*「…아타르시여. 제 기도가, 이렇게 끝나도…… 괜찮은 것입니까.」*',
              '*화보사가 가슴에 손을 얹고 천천히 쓰러진다. 그의 몸을 감싸던 불씨들이 한 점씩 바닥으로 떨어져 사라진다.*\n*「성화의 결이 아직 얕은 몸이었군요. 그대의…… 불경이 이긴 것이 아닙니다.」*',
            ],
            meditation: [
              '*화보사가 숨을 짧게 몰아쉰다. 그의 몸을 두르던 불씨 막이 한 겹씩 벗겨져 나간다.*\n*「아타르의 가호가…… 이 몸에서 떠나기 전에. 부디, 다음 생에는.」*',
              '*화보사가 검(劍) 대신 가슴 앞에 두 손을 엇갈려 모은다. 그의 주위의 불씨가 천천히 꺼진다.*\n*「제가 거둔 불꽃이, 제 몸을 온전히 태우지 못했군요. 그대는…… 그 정도의 자격은 있는 분이시군요.」*',
            ],
            liberation: [
              '*화보사가 두 팔을 벌린 채 뒤로 넘어간다. 그의 몸에서 단죄의 불꽃이 한 번 더 타오르려다, 주인을 잃고 꺼진다.*\n*「…드루즈(druj)의 불이 저의 불보다 빨랐군요. 이상한 일입니다.」*',
              '*화보사가 한 손으로 가슴의 성화를 움켜쥔 채 천천히 앉는다. 그 불꽃이 그의 손가락 사이로 흘러내려 사라진다.*\n*「…성화의 결을 풀었지만 — 결국, 이 몸은 그 결을 다 받지 못했습니다.」*',
            ],
            ascensionPreBahram: '*화보사가 하늘을 향해 두 손을 든 채 멈춘다. 그의 머리 위에서 자라던 성화가, 더 이상 커지지 않고 그 자리에서 흔들린다.*\n*「아타시 바흐람(Ātash Bahrām)…… 이 그릇은, 당신을 다 담을 수 없었습니다.」*\n*성화가 한 번 크게 터지듯 흩어지더니, 그의 몸과 함께 천천히 무너진다.*',
            ascensionPostBahram: '*화보사가 두 손을 내린다. 그의 몸을 둘러싸던 불꽃이 이제 더는 타지 않는다.*\n*「저는…… 성화를 강림시켰습니다. 그대는, 그 강림 앞에서도 쓰러지지 않으셨군요.」*\n*「…이것은 — 삼행의 율법이 그대를 택했다는 뜻인지도 모르겠습니다. 부디, 길을 잃지 마시기를.」*\n*그의 몸이 마지막 한 번의 불꽃과 함께, 재가 되어 흩어진다.*',
          },
        },
      },
    ],
  },
  // ── 배화교 경보사 패턴 ──
  baehwa_gyeongbosa: {
    stamina: { initial: 0, max: 0, regenPerSec: 0 },
    skills: [
      {
        id: 'gyeongbosa_iron_rule',
        displayName: '삼행의 철칙(三行鐵則)',
        type: 'baehwa_guard',
        triggerCondition: 'battle_start',
        oneTime: true,
        priority: 10,
        conditionRequiredFaction: 'baehwagyo',
        damageTakenMultiplierIfCondition: 0.25,
        damageTakenMultiplierWhenFactionEquipped: 0.75,
        battleStartLogs: [
          '*경보사가 한 권의 낡은 경전을 가슴 앞에 받쳐 들고 있다. 그가 눈을 감은 채, 경전의 첫 장을 손가락으로 천천히 쓸어내린다.*',
          '*「삼행(三行)의 철칙(鐵則) 아래에서 — 그대는 아직 경(經)의 결을 읽지 못한 자입니다. 함부로 이 자리를 어지럽히지 마십시오.」*',
        ],
        firstHitLogMessagesNoArt: [
          '*당신의 일격이 경보사의 어깨 앞에서 멎는다. 그의 입에서 흘러나오는 경전의 구절이 그 힘을 조용히 깎아낸다.*\n*「율법이 아닌 철칙입니다. 미력한 자의 손으로는 이 한 구절조차 끊으실 수 없습니다.」*',
          '*경보사가 고개를 들지 않는다. 당신의 타격이 그의 몸에 닿기 전에, 읊조려진 문장 한 줄이 공기를 굳게 만든다.*\n*「그대의 손은 아직 경(經)의 무게를 지지 못하였습니다. 물러나십시오.」*',
          '*경보사의 손에서 경전이 한 번 떨린다. 그 떨림을 따라 공기가 조여들며, 당신의 일격이 힘을 잃는다.*\n*「철칙 앞에서는 — 정돈되지 않은 모든 것이 무력합니다.」*',
        ],
        firstHitLogMessagesWithArt: [
          '*당신의 일격이 경보사의 경전 한 귀퉁이를 찢는다. 그의 눈꺼풀이 천천히 열린다.*\n*「경(經)의 결을 어느 정도 읽을 줄 아는 분이시로군요. 그렇다면 — 저도 이 구절로 그대에게 응하겠습니다.」*',
        ],
        logMessages: [],
      },
      {
        id: 'gyeongbosa_router',
        displayName: '경보사 경전 낭송',
        type: 'gyeongbosa_attack',
        triggerCondition: 'default',
        priority: 5,
        logMessages: [],
        gyeongbosaSkills: {
          normal: {
            mult: 1.0,
            logs: [
              '*경보사가 경전을 한 손에 받친 채, 남은 손끝으로 허공에 짧은 구절을 쓴다. 그 획의 결이 당신의 몸을 한 번 베고 지나간다.*',
              '*경보사가 읊조리던 구절을 잠시 끊고, 손등으로 공기를 스친다. 경(經)의 무게가 그 궤적을 따라 당신에게 닿는다.*',
            ],
          },
          suppression: {
            mult: 1.3,
            debuffAtkPercent: 0.25,
            debuffAtkSpeedPercent: 0.25,
            durationSec: 8,
            playerEmberGain: 1,
            logs: [
              '*경보사가 한 구절을 소리 내어 읊자, 그 문장이 공기 중에 한 줄의 결로 새겨진다. 당신의 몸이 그 결에 묶이는 듯 무거워진다.*',
              '*「움직임을 규(規)로 묶고, 호흡을 율(律)로 매단다.」 경보사의 목소리가 당신의 숨에 스며든다.*',
              '*경보사가 경전의 한 장을 손톱으로 짚는다. 그 자국 위로 문장이 떠오르고, 문장이 당신의 어깨에 앉는다.*',
              '*「그대의 기(氣)는 아직 경(經)의 위에 있지 않습니다 — 이 구절로 잠시 그대를 단정히 합니다.」 경보사의 읊조림이 당신의 움직임을 무디게 한다.*',
            ],
            hitSuffix: '(적 ATK/ATS -25% · 8s / 불씨 +1)',
          },
          selfHarmony: {
            healPercent: 0.006,
            tickIntervalSec: 1,
            durationSec: 8,
            nextAttackDodgeBonus: 0.30,
            firstLogs: [
              '*경보사가 눈을 감고 경전의 한 구절을 길게 읊는다. 그 구절이 그의 몸 안쪽으로 스며들며, 상처가 조용히 아물기 시작한다.*',
              '*「몸을 경(經)으로 단정히 하고, 흐트러진 결을 구절로 여민다.」 경보사의 몸에서 어지러운 숨결이 가라앉는다.*',
              '*경보사가 한 손으로 가슴의 경전을 덮고, 남은 손으로 공중에 한 줄의 문장을 그린다. 그 문장이 그의 몸을 한 바퀴 돌며, 흐트러진 결을 다시 꿰맨다.*',
            ],
            resetLogs: [
              '*경보사가 같은 구절을 다시 읊는다. 그의 몸을 두르던 문장의 결이 한 번 더 단단히 여며진다.*',
              '*「한 번 단정히 한 것은 — 또 한 번 단정히 합니다.」 경보사의 숨이 한 번 더 길어진다.*',
            ],
          },
          verdict: {
            dotCoefficient: 0.35,
            durationSec: 8,
            playerEmberGain: 1,
            logs: [
              '*경보사가 경전의 한 단락을 펼쳐 소리 내어 읊는다. 그 단락의 이름은 — 단죄(斷罪).*\n*「그대의 언행이 교리와 어긋나 있습니다. 이 구절이 그 어긋남을 대신 베어내겠습니다.」*',
              '*「경(經)의 이름으로 — 그대를 불의(不義)로 규정합니다.」 경보사의 읊조림이 당신의 몸 주위에 원을 그리며, 그 원 안에서 당신의 살결이 미세하게 그을리기 시작한다.*',
              '*경보사가 손끝으로 경전의 한 글자를 짚는다. 그 글자가 떨어져 나와 당신의 가슴 위에 낙인처럼 새겨진다. 낙인은 경전의 낭송이 이어지는 동안 계속 달아오른다.*',
            ],
            tickLogs: [
              '*경보사의 읊조림이 한 줄 더 이어지자, 당신의 가슴에 새겨진 글자가 다시 달아오른다.*',
              '*경(經)의 낭송이 끊기지 않는다. 그 소리에 맞춰 낙인이 당신의 살결을 한 번 더 태운다.*',
            ],
          },
          skillDist: {
            normal: 0.30,
            suppression: 0.2333,
            selfHarmony: 0.2333,
            verdict: 0.2334,
          },
          discipline: {
            stackCap: 6,
            hpHalfTriggerRatio: 0.5,
            rngPool: ['declaration', 'lightStep', 'enforcement'],
            absoluteMod: 4,
            buffDurationSec: 20,
            declaration: {
              playerCritRateOverride: 0,
              log: '*경보사가 경전의 한 장을 크게 펼친다. 그 장의 제목은 **단언(斷言)** — 그의 목소리가 공기를 가르며 당신의 움직임 위로 내려앉는다.*\n*「그대의 검은 — 오늘 이 자리에서 예리함을 논할 자격이 없습니다.」*',
              banner: '플레이어 크리티컬 확률 0 · 20s',
            },
            lightStep: {
              enemyDodgeBonus: 0.65,
              log: '*경보사의 발끝이 경전의 결을 따라 한 걸음 비껴선다. 그의 몸이 문장 위를 밟고 선 듯, 무게를 잃는다.*\n*「경(經)의 결을 따라 걷는 발은 — 허공의 칼끝조차 밟지 않습니다.」*',
              banner: '경보사 회피 +65% · 20s',
            },
            enforcement: {
              enemyAtkMult: 2.0,
              log: '*경보사가 경전을 한 손에 말아 쥔다. 그 권(卷)이 그의 팔을 따라 길게 풀리며, 한 자루의 채찍처럼 굳어진다.*\n*「이 손은 — 경(經)을 지키는 손입니다. 오늘은 조금 더 무겁게 움직이겠습니다.」*',
              banner: '경보사 공격력 +100% · 20s',
            },
            absolute: {
              stunSec: 15,
              dotCoefficient: 0.75,
              dotDurationSec: 15,
              ceremonySec: 15,
              openLog: '*경보사가 경전을 양손으로 들어 가슴 앞에 펼친다. 그의 눈빛이 처음으로, 글자의 결이 아닌 사람의 결을 향한다.*\n*「그대는 세 번의 규율 앞에서도 고쳐지지 않으셨군요. 그렇다면 — 경(經)의 서문(序文)을 읊겠습니다. 이 몸도, 이 시간 동안은 오로지 그 구절에만 매이겠습니다.」*\n*「**서(序)하되 어지럽지 않고**,」*\n*그의 첫 구절이 공기 전체를 얼어붙게 한다. 당신의 말과 움직임이 한꺼번에 멎는다.*',
              phraseLog5s: '*경보사가 눈을 감은 채 다음 구절을 이어 읊는다. 그의 몸은 움직이지 않고, 입만이 경전의 결을 따라 천천히 열리고 닫힌다.*\n*「**······율(律)하되 무겁지 않으며**,」*',
              phraseLog10s: '*경보사의 마지막 구절이 가장 길게, 가장 조용하게 흘러나온다. 그는 이미 스스로를 경(經) 안에 완전히 가두어 놓은 듯 보인다.*\n*「**······행(行)하되 흐트러지지 않는다.**」*\n*세 구절이 하나의 문장으로 완성되자, 그 문장이 공기 중에 보이지 않는 결로 남아 당신의 몸을 한 겹 더 조인다.*',
              dotTickLogs: [
                '*경보사가 읊는 서문의 한 결이 당신의 몸을 또 한 번 지나간다. 그 결이 지나갈 때마다 당신의 살결에서 한 겹씩 무언가가 벗겨져 나간다.*',
                '*경전의 구절이 공기를 따라 당신의 뼛속까지 스며든다. 경보사는 여전히 움직이지 않은 채, 입만을 움직이고 있다.*',
                '*서문의 한 호흡이 끝날 때마다 당신의 숨이 한 번씩 더 얕아진다.*',
              ],
              endLog: '*경보사가 천천히 눈을 뜬다. 그의 손 위에서 경전이 조용히 덮인다. 공기의 결이 풀리며, 당신의 몸에 다시 움직임이 돌아온다. 경보사의 발끝도, 멈추어 있던 바닥을 다시 디딘다.*\n*「서문은 — 여기까지입니다. 이 몸도 이 시간 동안은 경(經)에 매여 있었습니다. 그대가 이 구간을 버티셨다면, 그 자체로 경의 한 결을 얻으신 것입니다. 이제 — 다시, 시작합니다.」*',
              stunBreakLog: '*경보사의 낭독이 한순간 끊긴다. 그의 몸이 잠시 흔들리며, 공기 중에 떠 있던 서문의 구절이 흩어진다.*',
              stunResumeLog: '*경보사가 다시 호흡을 고르고, 끊겼던 구절을 이어 읊는다. 서문의 결이 조금 늦게, 다시 공기 위에 얹힌다.*',
            },
            resetLog: '*경보사의 입에서 같은 구절이 다시 한 번 흘러나온다. 이미 드리워진 규율의 결이, 한 겹 더 단단히 여며진다.*',
          },
          killLogs: {
            prePhase: [
              '*경보사가 경전을 가슴 앞에 받친 채 무릎을 꿇는다. 펼쳐진 경전의 한 장이 바람에 넘어가며, 그의 손가락이 마지막 구절을 짚는다.*\n*「···경(經)의 한 구절도 제대로 읊지 못하고··· 이 자리를 떠나게 되었군요.」*',
              '*경보사가 경전을 가슴에 품은 채 천천히 쓰러진다. 그의 입에서 끝내지 못한 구절이 한 줄 흘러나온다.*\n*「율법(律法)은··· 아직 제게 무거웠습니다···.」*',
            ],
            midPhase: [
              '*경보사의 손에서 경전이 떨어진다. 펼쳐진 장 위에서 규율의 문장들이 한 줄씩 빛을 잃으며 사라진다.*\n*「···규(規)와 율(律)이 — 제 몸을 다 단속하지 못했군요. 그대는 그 어긋남을 보셨습니다.」*',
              '*경보사가 경전의 마지막 장을 조용히 닫는다. 그의 몸을 두르던 규율의 결이 한 겹씩 풀려 사라진다.*\n*「···단정(端正)히 매인 결이 끊어지는군요. 그대의 검이 — 제 구절보다 한 수 위였습니다.」*',
            ],
            nearAbsolute: [
              '*경보사가 경전의 서문(序文)을 펼치려는 동작에서 멎는다. 펼치다 만 장이 그의 손아귀에서 풀려 바닥으로 떨어진다.*\n*「···서문까지는 — 이르지 못했습니다. 그대의 돌파는 ··· 그 권위보다 빨랐군요.」*',
              '*경보사가 절대 규율의 첫 구절을 막 읊으려는 순간, 그의 입이 다물린다. 경전이 그의 가슴에서 바닥으로 미끄러져 내린다.*\n*「···경(經)의 서(序)를 — 이 자리에서 못 꺼내게 되었군요. 그대는 그것만으로도, 제게서 한 줄의 경을 얻으신 겁니다.」*',
            ],
            postAbsolute: '*경보사가 경전을 든 두 손을 천천히 내린다. 그의 손에서 경전이 미끄러져 바닥에 놓인다. 그는 처음으로, 경(經)이 아닌 사람의 눈으로 당신을 본다.*\n*「···서문(序文)의 세 구절 앞에서도, 그대는 — 스스로를 잃지 않으셨군요.」*\n*「경(經)의 결을 그렇게 걸으신다면, 언젠가 아타르의 성화 앞에서도 서실 수 있을 것입니다. 그 자리에서는, 부디··· 제 이름 한 자락이라도 기억해 주시기를.」*\n*그의 몸이 천천히 앞으로 기울어지며, 가슴 앞의 경전 위로 조용히 쓰러진다.*',
          },
        },
      },
    ],
  },
  masked_swordsman: {
    stamina: { initial: 0, max: 0, regenPerSec: 0 },
    skills: [
      {
        id: 'kill_intent_masked', displayName: '살기(殺氣)', type: 'replace_normal',
        triggerCondition: 'default', oneTime: true, priority: 10,
        debuffAtkPercent: 0.30, debuffAtkSpeedPercent: 0.30,
        conditionMinSimbeopGrade: 5,
        logMessages: ['가면 뒤에서 짙은 살기가 뿜어진다! 몸이 굳는다!',
                      '...압도당했다. 심법이 충분치 않다!'],
      },
      {
        id: 'masked_sword_qi', displayName: '검기 발현', type: 'atk_buff_bypass',
        triggerCondition: 'hp_threshold', hpThreshold: 0.80, oneTime: true, priority: 5,
        atkBuffPercent: 0.20, bypassExternalGrade: 1,
        logMessages: ['검기 발현! 검객의 검에서 검기가 용솟음쳤다!'],
      },
      {
        id: 'dark_shadow_dodge', displayName: '흑영검법 — 회피', type: 'passive_dodge', triggerCondition: 'default',
        dodgeChance: 0.10,
        logMessages: ['흑영검법! 그림자처럼 사라졌다!'],
      },
      {
        id: 'dark_double', displayName: '흑영이격(黑影二擊)', type: 'double_hit', triggerCondition: 'default',
        chance: 0.15, hitMultiplier: 0.70,
        logMessages: ['흑영이격(黑影二擊)!'],
      },
      {
        id: 'dark_triple', displayName: '흑영삼격(黑影三擊)', type: 'multi_hit', triggerCondition: 'default',
        chance: 0.05, hitCount: 3, hitMultiplier: 0.60,
        logMessages: ['흑영삼격(黑影三擊)!'],
      },
      {
        id: 'dark_shadow_smash', displayName: '흑영참(黑影斬)', type: 'stack_smash', triggerCondition: 'default',
        stackTriggerCount: 3, stackSmashMultiplier: 4, undodgeable: true,
        logMessages: ['흑영참(黑影斬)! 그림자가 실체가 되어 폭발했다!'],
      },
    ],
  },
};

export interface MonsterDef {
  id: string;
  name: string;
  hp: number;
  attackPower: number;       // 공격 위력 (1회)
  attackInterval: number;    // 공격 간격 (초). 0이면 공격 안 함
  regen: number;
  baseProficiency?: number;  // 숙련도 획득 기본값 (등급 배율 적용 전)
  drops: { artId: string; chance: number }[];
  isTraining?: boolean;
  isHidden?: boolean;
  isBoss?: boolean;
  stunnable?: boolean;  // true이면 isBoss임에도 기절 적용 가능 (흑풍채 등)
  grade: number;             // 0=등급외, 1~∞ (시뮬레이션 기반 수동 부여)
  imageKey: string;
  attackMessages?: string[];
  emberAttackLogs?: string[];      // 불씨 스택 보유 시 평타 로그 (미지정 시 DEFAULT_EMBER_ATTACK_LOGS)
  emberAttackBonus?: boolean;      // true면 평타가 ember 스택 배율 적용 (배화교 행자 등)
  equipDrops?: { equipId: string; chance: number }[];
  materialDrops?: { materialId: string; chance: number }[];
  description?: string;      // 도감 설명 (10마리 처치 시 해금)
  hiddenEncounterLogs?: string[];  // 히든 스폰 시 대사 로그
}

const GRADE_NAMES = ['등급외', '1등급', '2등급', '3등급', '4등급'];

/** 등급명 조회 (5등급 이상은 "N등급" 형식) */
export function getGradeName(grade: number): string {
  return GRADE_NAMES[grade] ?? `${grade}등급`;
}

/** 참고용 전투력 산출 (등급 판정 보조) */
export function getMonsterPower(m: MonsterDef): number {
  if (m.attackInterval === 0) return 0;
  const base = m.hp * m.attackPower / m.attackInterval;
  return m.isBoss ? base * 1.5 : base;
}

// 수련장 몬스터
export const TRAINING_MONSTERS: MonsterDef[] = [
  {
    id: 'training_wood',
    name: '나무인형',
    hp: 10, attackPower: 0, attackInterval: 0, regen: 0, baseProficiency: 50,
    drops: [{ artId: 'samjae_sword', chance: 1.0 }],
    materialDrops: [{ materialId: 'wood_fragment', chance: 0.4 }],
    isTraining: true, grade: 0,
    imageKey: 'training_wood',
    description: '무림에 입문한 자들이 처음으로 마주하는 상대. 수천 번의 타격을 견뎌온 낡은 목체(木體)에서 선배 무인들의 땀 냄새가 난다. 이 인형을 이기지 못하면 진짜 무인을 마주할 자격이 없다.',
  },
  {
    id: 'training_iron',
    name: '철인형',
    hp: 30, attackPower: 0, attackInterval: 0, regen: 1.5, baseProficiency: 100,
    drops: [{ artId: 'samjae_simbeop', chance: 1.0 }],
    materialDrops: [{ materialId: 'iron_fragment', chance: 0.4 }],
    isTraining: true, grade: 0,
    imageKey: 'training_iron',
    description: '단단한 무쇠로 빚어진 수련 인형. 아무리 강한 일격도 흠집조차 남기기 어렵다 하나, 올바른 내공을 담은 일격만은 통한다고 한다. 몸 전체로 내력을 느끼게 하는 최고의 스승.',
  },
];

// 야산 일반 몬스터 (v1.1 수치)
export const YASAN_MONSTERS: MonsterDef[] = [
  {
    id: 'squirrel', name: '다람쥐',
    hp: 25, attackPower: 4, attackInterval: 3.5, regen: 0, baseProficiency: 1,
    drops: [], grade: 1, imageKey: 'squirrel',
    materialDrops: [{ materialId: 'torn_paper', chance: 0.01 }],
    attackMessages: ['다람쥐가 재빠르게 물었다!', '다람쥐가 도토리를 던졌다!'],
    description: '야산 어귀를 쉼 없이 오가는 작은 짐승이다. 도토리 하나를 지키기 위해 사람에게도 달려드는 대담함이 있으나, 내공 앞엔 어이없이 무너진다. 수련을 막 시작한 무인이 기운을 익히기에 적당한 상대.',
  },
  {
    id: 'rabbit', name: '토끼',
    hp: 40, attackPower: 5, attackInterval: 3.0, regen: 0, baseProficiency: 1,
    drops: [], grade: 1, imageKey: 'rabbit',
    materialDrops: [{ materialId: 'torn_paper', chance: 0.02 }],
    attackMessages: ['토끼가 뒷발로 찼다!', '토끼가 돌진했다!'],
    description: '언뜻 보면 무해한 야생 토끼이지만, 위협받으면 뒷발 차기를 날린다. 몸이 가볍고 방향 전환이 빨라 허점을 잡기 전까진 의외로 성가신 상대다.',
  },
  {
    id: 'fox', name: '여우',
    hp: 70, attackPower: 8, attackInterval: 2.8, regen: 0, baseProficiency: 2,
    drops: [], grade: 1, imageKey: 'fox',
    materialDrops: [{ materialId: 'torn_paper', chance: 0.04 }],
    attackMessages: ['여우가 꼬리를 휘둘렀다!', '여우가 날카롭게 물었다!'],
    description: '영리하고 간사하여 상대의 허점을 끈질기게 기다릴 줄 안다. 날카로운 이빨과 꼬리치기가 특기이며, 섣불리 덤볐다간 제법 쪽팔린 꼴을 당하기 쉽다.',
  },
  {
    id: 'deer', name: '사슴',
    hp: 110, attackPower: 6, attackInterval: 3.0, regen: 0, baseProficiency: 2,
    drops: [], grade: 1, imageKey: 'deer',
    materialDrops: [{ materialId: 'torn_paper', chance: 0.06 }],
    attackMessages: ['사슴이 뿔로 받았다!', '사슴이 돌진해왔다!'],
    description: '야산에서 가장 온순한 외모를 지닌 짐승이나, 뿔로 들이받는 힘은 결코 가볍지 않다. 분노하면 무작정 돌진하는 성질이 있으니, 겉모습에 방심했다간 혼이 날 것이다.',
  },
  {
    id: 'boar', name: '멧돼지',
    hp: 90, attackPower: 14, attackInterval: 2.2, regen: 0, baseProficiency: 3,
    drops: [], grade: 1, imageKey: 'boar',
    materialDrops: [{ materialId: 'torn_paper', chance: 0.08 }],
    attackMessages: ['멧돼지가 이빨로 들이받았다!', '멧돼지의 돌진!'],
    description: '울퉁불퉁한 몸통과 날카로운 엄니로 야산을 누비는 짐승이다. 한번 달려들면 방향을 바꾸지 않는 단순한 습성이지만, 그 돌진의 파괴력은 초보 무인에겐 충분히 위협적이다.',
  },
  {
    id: 'wolf', name: '늑대',
    hp: 160, attackPower: 16, attackInterval: 2.0, regen: 0, baseProficiency: 2,
    drops: [], grade: 2, imageKey: 'wolf',
    materialDrops: [
      { materialId: 'torn_paper', chance: 0.12 },
      { materialId: 'stinky_leather', chance: 0.025 },
    ],
    attackMessages: ['늑대가 발톱으로 할퀴었다!', '늑대가 물어뜯었다!'],
    description: '홀로 산을 떠도는 이리다. 무리에서 쫓겨난 것인지 스스로 선택한 고독인지는 알 수 없다. 발톱이 날카롭고 반응이 빠르며, 상대가 흔들리는 순간을 귀신같이 포착한다.',
  },
  {
    id: 'bear', name: '곰',
    hp: 280, attackPower: 22, attackInterval: 2.5, regen: 0, baseProficiency: 2,
    drops: [], grade: 3, imageKey: 'bear',
    materialDrops: [
      { materialId: 'torn_paper', chance: 0.20 },
      { materialId: 'stinky_leather', chance: 0.05 },
    ],
    attackMessages: ['곰이 거대한 앞발로 내리쳤다!', '곰의 포효와 함께 강타!'],
    description: '야산의 군주라 불리는 큰 곰이다. 맞닥뜨리는 순간 터져 나오는 포효 하나만으로 간담을 서늘하게 만든다. 거대한 앞발 한 방이면 웬만한 무인은 날아간다는 말이 있다.',
  },
];

// 히든 몬스터
export const HIDDEN_MONSTERS: MonsterDef[] = [
  {
    id: 'dangkang', name: '당강',
    hp: 1500, attackPower: 50, attackInterval: 3.0, regen: 0, baseProficiency: 5,
    drops: [], isHidden: true, grade: 4, imageKey: 'dangkang',
    attackMessages: ['당강이 뿔로 들이받았다!', '당강의 거대한 몸이 돌진했다!'],
    equipDrops: [{ equipId: 'gusan_gloves', chance: 0.002 }],
    materialDrops: [{ materialId: 'bijup_samjae_taesan', chance: 0.05 }],
    description: '전설 속에만 존재한다는 대형 짐승. 풍요의 신령이 깃든 몸에서 대지의 기운이 흘러나오며, 뿔에 한 번 받히면 산도 무너진다는 말이 있다. 마주했다는 것 자체가 이미 행운인지 불운인지 모를 일.',
  },
];

// 객잔 일반 몬스터
export const INN_MONSTERS: MonsterDef[] = [
  {
    id: 'drunk_thug', name: '취한 건달',
    hp: 250, attackPower: 20, attackInterval: 2.2, regen: 0, baseProficiency: 3,
    drops: [],
    grade: 3, imageKey: 'drunk_thug',
    materialDrops: [{ materialId: 'map_fragment', chance: 0.001 }],
    attackMessages: ['건달이 비틀거리며 주먹을 휘둘렀다!', '건달이 술병을 내던졌다!'],
    description: '낮부터 술독에 빠져 객잔을 어지럽히는 자다. 취기로 인해 판단력이 무뎌졌으나, 술주정으로 단련된 막무가내 주먹질이 의외로 성가시다. 무림인이 상대하기엔 너무 아까운 상대.',
  },
  {
    id: 'peddler', name: '떠돌이 행상',
    hp: 450, attackPower: 30, attackInterval: 2.5, regen: 0, baseProficiency: 3.5,
    drops: [],
    grade: 4, imageKey: 'peddler',
    materialDrops: [{ materialId: 'map_fragment', chance: 0.001 }],
    attackMessages: ['행상이 짐짝을 휘둘렀다!', '행상이 지팡이로 내리쳤다!'],
    description: '객잔을 드나들며 온갖 물건을 팔아치우는 상인이다. 낯선 이에게는 경계심이 강하고, 짐짝을 무기 삼아 싸우는 요령이 몸에 배어있다. 본업은 장사이지만 뒤가 구린 구석이 있어 보인다.',
  },
  {
    id: 'troublemaker', name: '객잔 말썽꾼',
    hp: 350, attackPower: 25, attackInterval: 2.2, regen: 0, baseProficiency: 6,
    drops: [],
    grade: 3, imageKey: 'troublemaker',
    materialDrops: [
      { materialId: 'map_fragment', chance: 0.001 },
      { materialId: 'jeoposaem_scroll', chance: 0.03 },
      { materialId: 'bijup_jeoposaem', chance: 0.001 },
    ],
    attackMessages: ['말썽꾼이 의자를 집어 던졌다!', '말썽꾼의 거친 주먹이 날아온다!'],
    description: '사사건건 트집을 잡으며 객잔의 분위기를 망치는 자다. 의자와 술상을 마구 집어 던지는 거친 싸움 방식으로 무고한 이들을 괴롭힌다. 상대하다 보면 이게 무림인인지 건달인지 헷갈린다.',
  },
  {
    id: 'wanderer', name: '떠돌이 무사',
    hp: 750, attackPower: 55, attackInterval: 2.5, regen: 0, baseProficiency: 2.5,
    drops: [],
    grade: 5, imageKey: 'wanderer',
    materialDrops: [
      { materialId: 'map_fragment', chance: 0.001 },
      { materialId: 'samjae_simbeop_upper', chance: 0.01 },
      { materialId: 'samjae_simbeop_lower', chance: 0.01 },
    ],
    attackMessages: ['무사가 빠르게 검을 뽑아 베었다!', '무사의 날카로운 일격!'],
    description: '정처 없이 강호를 떠도는 2류 무인이다. 제법 무공을 익혔으나 뜻을 이루지 못하고 객잔에서 술로 세월을 보내고 있다. 칼을 뽑는 속도만큼은 일류에 버금간다는 소문이 있다.',
  },
  {
    id: 'bandit_chief', name: '삼류 도적 두목',
    hp: 550, attackPower: 40, attackInterval: 2.2, regen: 0, baseProficiency: 4.5,
    drops: [],
    grade: 4, imageKey: 'bandit_chief',
    materialDrops: [
      { materialId: 'map_fragment', chance: 0.001 },
      { materialId: 'hwan_do_fragment', chance: 0.03 },
    ],
    attackMessages: ['두목이 쌍도를 휘둘렀다!', '두목의 기합과 함께 강타!'],
    description: '일대의 소패(小霸)를 자처하는 도적 집단의 우두머리다. 쌍도(雙刀)를 들고 호기롭게 덤벼들지만, 강호에 내로라하는 고수들에게는 삼류라는 평가를 벗어나지 못하고 있다.',
  },
];

// 객잔 히든 몬스터
export const INN_HIDDEN_MONSTERS: MonsterDef[] = [
  {
    id: 'masked_swordsman', name: '가면 쓴 검객',
    hp: 3600, attackPower: 110, attackInterval: 1.9, regen: 0, baseProficiency: 6,
    drops: [{ artId: 'maryeong_simbeop', chance: 0.01 }],
    materialDrops: [{ materialId: 'demonic_note', chance: 0.10 }],
    equipDrops: [{ equipId: 'heugak_sword', chance: 0.01 }],
    isHidden: true, stunnable: true, grade: 7, imageKey: 'masked_swordsman',
    attackMessages: ['검객의 검이 섬광처럼 스쳤다!', '가면 뒤에서 살기가 뿜어져 나왔다!'],
    description: '객잔 한켠에 조용히 앉아 있다가 어느 순간 홀연히 나타난 자다. 가면 뒤의 얼굴은 물론 이름도 출신도 알 수 없다. 그러나 뽑아 드는 검에서 느껴지는 살기만은 거짓이 없다.',
  },
];

// 흑풍채 일반 몬스터
export const HEUGPUNGCHAE_MONSTERS: MonsterDef[] = [
  {
    id: 'heugpung_mokryeong', name: '흑풍 목령견',
    hp: 1550, attackPower: 75, attackInterval: 2.5, regen: 0, baseProficiency: 2.5,
    drops: [],
    materialDrops: [
      { materialId: 'tough_leather', chance: 0.02 },
      { materialId: 'heugpung_stone', chance: 0.001 },
    ],
    grade: 8, imageKey: 'heugpung_mokryeong',
    attackMessages: ['목령견이 날카로운 이빨로 물어뜯었다!', '목령견의 발톱이 공기를 가르며 내려쳤다!'],
    description: '흑풍채 산세를 지키는 기이한 짐승이다. 나무와 금속으로 빚어진 몸에서 검은 기운이 흘러나오며, 한 번 물리면 상처가 쉽게 아물지 않는다. 흑풍채 도적들이 기를 불어넣어 만든 수호견이라는 소문이 있다.',
  },
  {
    id: 'sanbaram_gungsu', name: '산바람 궁수',
    hp: 1750, attackPower: 95, attackInterval: 2.2, regen: 0, baseProficiency: 3.3,
    drops: [{ artId: 'nokrim_bobeop', chance: 0.01 }],
    materialDrops: [
      { materialId: 'heugpung_stone', chance: 0.001 },
    ],
    grade: 8, imageKey: 'sanbaram_gungsu',
    attackMessages: ['산바람 궁수의 화살이 바람을 가르며 날아왔다!', '궁수가 연속으로 시위를 당겼다!'],
    description: '흑풍채의 산세를 이용해 먼 거리에서 활을 쏘는 궁수 도적이다. 바람을 읽는 탁월한 눈썰미로 멀리서도 정확하게 급소를 노린다. 집중력이 높아질수록 공격이 더욱 강해진다 하니, 방심은 금물이다.',
  },
  {
    id: 'bounty_hunter', name: '현상금 사냥꾼',
    hp: 2100, attackPower: 140, attackInterval: 2.0, regen: 0, baseProficiency: 2,
    drops: [],
    materialDrops: [
      { materialId: 'heugpung_stone', chance: 0.001 },
    ],
    equipDrops: [{ equipId: 'hyeoldok_gloves', chance: 0.0005 }],
    grade: 9, imageKey: 'bounty_hunter',
    attackMessages: ['사냥꾼이 독 묻은 단검을 날렸다!', '사냥꾼의 독칼날이 섬광처럼 스쳤다!'],
    description: '돈이 되는 목표라면 수단을 가리지 않는 독(毒)의 전문가다. 세 가지 독을 조합해 상대의 몸을 서서히 무너뜨리는 것이 특기이며, 독에 충분히 잠식된 상대에게는 치명적인 비열한 일격을 날린다. 정당한 싸움을 기대하지 마라.',
  },
];

// 흑도 낭인 — 흑풍채
export const RONIN_DEF: MonsterDef = {
  id: 'ronin', name: '흑도 낭인',
  hp: 2100, attackPower: 105, attackInterval: 3.0, regen: 0, baseProficiency: 2.5,
  drops: [],
  materialDrops: [
    { materialId: 'heugpung_sword_fragment', chance: 0.03 },
    { materialId: 'heugpung_stone', chance: 0.001 },
  ],
  grade: 9, imageKey: 'ronin',
  attackMessages: ['낭인이 묵직한 도를 내리쳤다!', '낭인의 눈에 광기가 번득이며 일격이 날아왔다!'],
  description: '사파(邪派)의 길을 걷다 흑풍채에 흘러들어 온 떠돌이 검사다. 상처가 깊어질수록 더욱 흉포해지는 기이한 무공을 익혔으며, 벼랑 끝에 몰리면 아무것도 두려워하지 않는 광기가 깨어난다고 한다.',
};

// 흑풍채 채주 — 보스
export const BANDIT_LEADER_DEF: MonsterDef = {
  id: 'bandit_leader', name: '흑풍채 채주',
  hp: 4500, attackPower: 140, attackInterval: 2.5, regen: 0, baseProficiency: 4,
  drops: [],
  materialDrops: [
    { materialId: 'heugpung_stone', chance: 0.02 },
    { materialId: 'bijup_nokrim_move1', chance: 0.0015 },
    { materialId: 'bijup_nokrim_move2', chance: 0.0015 },
  ],
  isBoss: true, stunnable: true, grade: 10, imageKey: 'bandit_leader',
  attackMessages: ['채주의 대도가 흑풍을 일으키며 내리쳤다!', '채주가 포효하며 강렬한 일격을 날렸다!'],
  description: '흑풍채를 이끄는 수장이다. 한때 강호에서 이름을 날리던 무인이 타락의 길을 걸어 이 자리에 이르렀다. 검은 바람을 일으키는 대도법(大刀法)으로 수하들에게 절대적인 공포를 심어놓고 있다. 벼랑에 내몰리면 모든 내력을 폭발시키는 최후의 발악을 펼친다 하니, 방심은 곧 죽음이다.',
};

// 배화교 일반 몬스터
export const BAEHWAGYO_MONSTERS: MonsterDef[] = [
  {
    id: 'baehwa_haengja', name: '배화교 행자',
    hp: 3800, attackPower: 160, attackInterval: 2.5, regen: 0, baseProficiency: 7,
    drops: [],
    materialDrops: [
      { materialId: 'huimihan_janbul', chance: 0.025 },
    ],
    grade: 10, imageKey: 'baehwa_haengja',
    emberAttackBonus: true,
    attackMessages: [
      '행자가 성화를 향해 두 손을 모은다. 그 기도 끝에서 불꽃이 튀어올랐다!',
      '행자의 손끝에서 불씨가 튀어 당신의 살갗에 닿았다!',
    ],
    emberAttackLogs: [
      '*행자의 손끝이 당신의 몸에 남은 불씨를 건드린다. 불꽃이 되살아난다.*',
      '*행자가 당신을 가볍게 밀친다. 몸에 붙은 불씨가 그 자리에서 피어오른다.*',
      '*행자의 기도 소리에 맞춰, 당신의 살갗 위 불씨가 다시 타오른다.*',
      '*꺼져가던 불씨가 행자의 숨결에 살아난다. 당신의 몸을 조금씩 갉아먹는다.*',
    ],
    description: '배화교의 가장 낮은 자리에 있는 잡일꾼. 무공은 익히지 못했으나, 매일 성화 앞에서 기도하며 광기의 첫 불씨를 품게 된 자들이다. 무력으로는 위협적이지 않지만, 그 몸에 옮겨 붙은 불씨는 생각보다 오래 타오른다.',
  },
  {
    id: 'baehwa_howi', name: '배화교 호위',
    hp: 5000, attackPower: 220, attackInterval: 2.2, regen: 0, baseProficiency: 10,
    drops: [],
    materialDrops: [
      { materialId: 'huimihan_janbul', chance: 0.035 },
    ],
    grade: 10, imageKey: 'baehwa_howi',
    attackMessages: [
      '호위가 창을 바로 세우고 빠르게 내뻗쳤다!',
      '호위의 창끝이 날카롭게 당신을 파고들었다!',
      '호위가 성화를 향해 고개를 끄덕인 뒤 창을 찌른다!',
    ],
    description: '배화교 호교당(護敎堂)의 외문 경비를 맡은 무사. 정식 무공을 익힌 사제는 아니지만, 교단의 기본 호법 창법과 성화에 대한 맹세만으로 창끝이 흐트러지지 않는다. 상대의 몸에 옮겨 붙은 불씨가 짙어질수록, 그의 창끝도 함께 뜨거워진다.',
  },
  {
    id: 'baehwa_geombosa', name: '배화교 검보사',
    hp: 7200, attackPower: 330, attackInterval: 2.5, regen: 0, baseProficiency: 5,
    drops: [],
    materialDrops: [
      { materialId: 'huimihan_janbul', chance: 0.05 },
      // 검법 비급 드랍은 검법 무공 정의 후 별도 추가
    ],
    grade: 11, imageKey: 'baehwa_geombosa',
    attackMessages: [
      '검보사의 검이 섬광처럼 당신의 살갗을 스쳤다!',
      '검보사가 자세를 낮추며 검 끝을 내뻗쳤다!',
      '검보사의 검신(劍身)이 호(弧)를 그리며 당신을 베었다!',
      '검보사가 한 호흡에 간격을 좁히며 검을 내찔렀다!',
    ],
    description: '배화교 외문에서 검을 익힌 정규 무사. 교단의 검법을 정식으로 전수받은 몇 안 되는 외문 소속이며, 세 번 태세를 바꾸어 적을 맞이한다. 첫 태세는 상대의 실력을 가늠하기 위한 양보이고, 두 번째는 진면목이며, 마지막은 성화를 향한 봉헌이다. 그의 검이 세 번째 자세에 들어서는 순간부터, 이 싸움은 더 이상 무술이 아닌 의식이 된다.',
  },
  {
    id: 'baehwa_hwabosa', name: '배화교 화보사',
    hp: 8500, attackPower: 350, attackInterval: 2.3, regen: 0, baseProficiency: 6.5,
    drops: [],
    materialDrops: [
      { materialId: 'huimihan_janbul', chance: 0.05 },
    ],
    grade: 11, imageKey: 'baehwa_hwabosa',
    attackMessages: [
      '*화보사가 왼손 위의 성화를 한 번 부드럽게 흔든다. 흩어진 불꽃이 당신의 몸을 스친다.*',
      '*「불꽃의 한 결을.」 화보사가 손등으로 허공을 쓸자, 그 궤적에 남은 잔열이 당신에게 닿는다.*',
    ],
    description: '배화교 외문에서 성화를 수호하는 사제. 검보사가 검을 배운 무인이라면, 화보사는 불꽃 그 자체를 섬기는 수행자이다. 그는 싸움을 목적으로 삼지 않고, 싸움조차도 성화에 바치는 봉헌으로 여긴다. 기도를 방해받을 때 그는 처음엔 꾸짖듯 말하지만, 전투가 길어질수록 자신의 몸마저 성화의 그릇으로 내어주기 시작한다. 마지막 순간 그가 부르는 것은 아타시 바흐람(Ātash Bahrām) — 조로아스터의 가장 높은 성화이며, 그 강림 앞에서는 적과 자신의 구별조차 사라진다.',
  },
  {
    id: 'baehwa_gyeongbosa', name: '배화교 경보사',
    hp: 9800, attackPower: 380, attackInterval: 2.4, regen: 0, baseProficiency: 7.5,
    drops: [],
    materialDrops: [],
    grade: 11, imageKey: 'baehwa_gyeongbosa',
    attackMessages: [
      '*경보사가 경전을 한 손에 받친 채, 남은 손끝으로 허공에 짧은 구절을 쓴다. 그 획의 결이 당신의 몸을 한 번 베고 지나간다.*',
      '*경보사가 읊조리던 구절을 잠시 끊고, 손등으로 공기를 스친다. 경(經)의 무게가 그 궤적을 따라 당신에게 닿는다.*',
    ],
    description: '배화교 외문에서 경전(經)을 지키는 사제. 그는 무기로 싸우지 않고, 경전의 구절로 싸운다. 그가 읊는 한 줄은 적을 규정하고, 한 호흡은 자신을 규율에 매단다. 교리의 엄중함 앞에서 그는 스스로를 더욱 가혹하게 단속하는데, 자신의 규율이 어지러워질 때마다 더 높은 권위가 더 무거운 규율로 내려온다. 마지막 순간 그가 부르는 것은 경전의 서문 첫 구절 — 교리 그 자체이며, 그 권위 앞에서는 적의 말과 움직임이 함께 얼어붙는다.',
  },
];

// 흑풍채 히든 보스 — 녹림맹 총순찰사자
export const NOKRIM_PATROL_CHIEF: MonsterDef = {
  id: 'nokrim_patrol_chief', name: '녹림맹 총순찰사자',
  hp: 7500, attackPower: 200, attackInterval: 2.5, regen: 0, baseProficiency: 4,
  drops: [],
  materialDrops: [
    { materialId: 'bijup_nokrim_bobeop_3', chance: 0.015 },
    { materialId: 'chanran_heugpung_stone', chance: 0.01 },
  ],
  equipDrops: [
    { equipId: 'nokrim_herald_boots', chance: 0.01 },
    { equipId: 'saja_gitbal', chance: 0.008 },
  ],
  isHidden: true, grade: 11, imageKey: 'nokrim_patrol_chief',
  attackMessages: ['총순찰사자의 주먹이 바람을 가르며 날아왔다!', '총순찰사자가 기합과 함께 강타를 날렸다!'],
  hiddenEncounterLogs: [
    '...하필 내가 순찰 온 날 이런 난리가 나다니.',
    '네놈이 우리 채를 어지럽힌 쥐새끼로구나.',
    '좋다. 녹림맹 총순찰사자가 직접 상대해 주마.',
  ],
  description: '녹림맹(綠林盟)이 흑풍채에 파견한 감찰관이다. 평소에는 산세를 순찰하며 모습을 드러내지 않으나, 채가 크게 소란스러워지면 비로소 나타난다. 녹림십팔절예를 불완전하게나마 익힌 실력자로, 그 주먹 하나에 산채의 질서가 담겨 있다 한다.',
};

// 객잔 보스
export const INN_BOSS: MonsterDef = {
  id: 'innkeeper_true', name: '객잔 주인',
  hp: 2500, attackPower: 70, attackInterval: 2.2, regen: 0, baseProficiency: 6,
  drops: [{ artId: 'nokrim_fist', chance: 0.01 }],
  materialDrops: [
    { materialId: 'map_fragment', chance: 0.05 },
    { materialId: 'demonic_note', chance: 0.004 },
    { materialId: 'bijup_nokrim_geoksan', chance: 0.002 },
  ],
  isBoss: true, stunnable: true, grade: 6, imageKey: 'innkeeper_true',
  attackMessages: ['주인의 손가락이 번개처럼 혈도를 찔렀다!', '주인이 가볍게 손을 뻗었는데 엄청난 장력이!'],
  description: '오랫동안 객잔을 운영하며 평범한 노인처럼 보였으나, 그 뒤에 감춰진 경지가 드러나는 순간 모든 것이 달라진다. 손가락 하나로 혈도를 짚는 지법(指法)의 정수를 몸에 담고 있다.',
};

// 야산 보스 (v1.1 수치)
export const YASAN_BOSS: MonsterDef = {
  id: 'tiger_boss', name: '산군',
  hp: 650, attackPower: 28, attackInterval: 1.8, regen: 0, baseProficiency: 5,
  drops: [],
  materialDrops: [
    { materialId: 'bijup_samjae_sense',   chance: 0.01 },
    { materialId: 'bijup_samjae_mastery', chance: 0.01 },
  ],
  isBoss: true, grade: 4, imageKey: 'tiger_boss',
  attackMessages: ['산군의 발톱이 번개처럼 스쳤다!', '산군이 포효하며 덮쳤다!'],
  description: '야산 전체를 세력권으로 삼는 호랑이의 왕이다. 산군(山君)이라 불리며 야산의 모든 생명이 그 앞에 머리를 조아린다. 포효 하나로 하늘을 진동시키고, 노하면 3리 밖에서도 그 살기가 느껴진다.',
};

// 새외(塞外) 몬스터 — 천산 대맥(天山大脈)
// 스펙은 임시 수치. 정확한 수치는 별도 채팅에서 결정.
export const SAEWOE_MONSTERS: MonsterDef[] = [
  {
    id: 'hwahyulsa',
    name: '화혈사(火血蛇)',
    hp: 12000, attackPower: 25, attackInterval: 2, regen: 5,
    drops: [],
    grade: 3,
    imageKey: 'hwahyulsa',
    attackMessages: ['화혈사가 불타는 독니로 물었다!', '화혈사의 뜨거운 몸이 스쳤다!'],
    description: '천산의 추위를 버티기 위해 피를 뜨겁게 만든 뱀. 하지만 한계가 있어 천산의 기슭에서만 서식한다.',
  },
  {
    id: 'eunrang',
    name: '은랑(銀狼)',
    hp: 20000, attackPower: 75, attackInterval: 1.5, regen: 8,
    drops: [],
    grade: 3,
    imageKey: 'eunrang',
    attackMessages: ['은랑이 날카로운 발톱으로 할퀴었다!', '은랑이 빙판 위를 미끄러지듯 덮쳤다!'],
    description: '은빛 털을 가진 거대 늑대. 눈 위를 달려도 발자국이 남지 않는다.',
  },
];

export function getMonsterDef(id: string): MonsterDef | undefined {
  return [...TRAINING_MONSTERS, ...YASAN_MONSTERS, ...HIDDEN_MONSTERS, YASAN_BOSS,
          ...INN_MONSTERS, ...INN_HIDDEN_MONSTERS, INN_BOSS, ...SAEWOE_MONSTERS,
          ...HEUGPUNGCHAE_MONSTERS, RONIN_DEF, BANDIT_LEADER_DEF, NOKRIM_PATROL_CHIEF,
          ...BAEHWAGYO_MONSTERS]
    .find(m => m.id === id);
}

/** 몬스터 공격 메시지 랜덤 선택 */
export function getMonsterAttackMsg(monDef: MonsterDef, damage: number): string {
  const msgs = monDef.attackMessages;
  if (!msgs || msgs.length === 0) {
    return `${monDef.name}의 공격! ${damage} 피해.`;
  }
  const msg = msgs[Math.floor(Math.random() * msgs.length)];
  return `${msg} ${damage} 피해.`;
}
