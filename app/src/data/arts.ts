/**
 * 무공 데이터 (v4.0) — 설계서 v3 기반 전면 재작성
 * ArtDef / MasteryDef / ArtGrowth 인터페이스
 * 삼재검법 (주공) + 삼재심법 (심법) 2종만 존재
 */

export type Faction = 'neutral' | 'righteous' | 'evil';
export type ArtType = 'active' | 'passive' | 'simbeop';
export type ProficiencyType = 'sword' | 'palm' | 'footwork' | 'mental' | 'fist';
// ── 발견 조건 ──
export interface MasteryDiscovery {
  type: 'boss' | 'event' | 'bijup' | 'artStar' | 'recipe';
  bossId?: string;           // boss 타입일 때 보스 ID
  starIndex?: number;        // artStar: 발견 조건 성 인덱스 (1-based)
  unlockStarIndex?: number;  // artStar: 자동 해금 성 인덱스 (미설정 시 starIndex와 동일)
}

// ── 초(招) 효과 ──
export interface MasteryEffects {
  unlockUlt?: boolean;
  bonusCritRate?: number;
  bonusDodge?: number;
  bonusDmgReduction?: number;
  bonusAtkSpeed?: number;
  bonusRegenPerSec?: number;
  bonusQiPerSec?: number;
  bonusCombatQiRatio?: number;
  normalMultiplierCapIncrease?: number;
  ultChange?: {
    name?: string;
    ultMultiplierBonus?: number;   // 절초 배율 +N (기존 ultMultiplier에 합산)
    ultCostBonus?: number;         // 절초 내력 비용 변경 (+10 = 40→50)
    ultAttackFirst?: boolean;      // true: 선공격 후 딜레이 (격산타우)
  };
  bonusCritDmg?: number;           // 치명타 데미지 % 증가 (10 = +10%)
  ultCooldownPersist?: boolean;    // true이면 적 전환 시 이 무공 절초 쿨타임 유지
  killBonusEnabled?: boolean;
  synergyArtId?: string;
  dodgeCounterEnabled?: boolean;  // 회피 성공 시 50% 확률 카운터 공격 활성화
  bonusDmgReductionPercent?: number;   // % 피해 감소 (철포삼 기본 15%, 비전서 +10%)
  bonusHpPercent?: number;             // 최대 HP % 증가 (철포삼 비전서 +10%)
  bonusCombatQiRatioFlat?: number;     // 전투 기운 비율 절대 덧셈 (삼재심법 오의 +0.10)
  simbeopQiMultiplier?: number;        // 장착 심법 자체 기운 생산 배율 (삼재심법 오의 ×1.2). gatherMasteryEffects 집계 대상 아님.
  attackIntervalMultiplierReduction?: number;  // 무공 공속 감소 배율 감소량 (녹림권 1.5→1.4→1.3)
  stunOnUlt?: number;                          // 절초 명중 시 적 기절 시간(초)
  bossHiddenDmgBonus?: number;                 // 보스/히든 몬스터 대상 피해 보너스 비율
}

// ── 초(招) 정의 ──
export interface MasteryDef {
  stage: number;
  id: string;
  name: string;
  description: string;
  flavorText?: string;
  requiredTier: number;
  pointCost: number;
  requires?: string[];
  discovery?: MasteryDiscovery;
  conditionMastery?: string;  // 이 초식의 효과 적용 조건: 해당 masteryId가 활성화되어야 함
  effects?: MasteryEffects;
  requiredArtGrade?: number;  // bijup 타입: 비급 사용에 필요한 최소 무공 등급
  autoActivate?: boolean;     // true이면 무공 획득 즉시 자동 활성화 (포인트 불필요)
  isUltSlot?: boolean;        // true: "절초 — X" 표시, 번호 초식 목록에서 제외
  isUltReplace?: boolean;     // true: 활성화 시 절초 슬롯 이름/설명 교체 (비급 타입)
  inlineInParent?: string;    // 부모 mastery ID — 별도 행 대신 부모 카드 내 인라인 렌더
}

// ── 성장 커브 ──
export interface ArtGrowth {
  // 초식 배율 성장 (active)
  baseNormalMultiplier?: number;
  normalGrowthRate?: number;

  // 심법 기운 생산 성장
  baseQiPerSec?: number;
  qiGrowthRate?: number;
  maxQiPerSec?: number;

  // 전투 수련 성장 (2초 해금 후)
  baseCombatQiRatio?: number;
  combatQiGrowthRate?: number;
  maxCombatQiRatio?: number;

  // 무공별 커스텀 등급 테이블
  gradeMaxStars?: number;   // 무공별 최대 별 수 (기본 60)
  gradeStartExp?: number;   // @deprecated — buildProfBasedGradeTable이 baseGrade에서 직접 계산
  proficiencyCoefficientByGrade?: number[];  // 성급별 proficiencyCoefficient 오버라이드 (stageIndex 기반)
}

// ── 무공 정의 ──
export interface ArtDef {
  id: string;
  name: string;
  faction: Faction;
  artType: ArtType;
  cost: number;
  baseGrade: number;

  // 등급별 데미지 배율 (index = stageIndex, 없으면 배율 1.0 고정)
  gradeDamageMultipliers?: number[];
  // 특정 초식 활성화 시 추가 데미지 배율 보너스 { masteryId: bonus }
  masteryGradeMultiplierBonus?: Record<string, number>;

  // 숙련도
  proficiencyType: ProficiencyType;
  proficiencyCoefficient: number;  // 초식/passive 계수. active: baseDamage + floor(coeff × getProfDamageValue(prof)), passive: 0이면 비활성
  baseDamage?: number;             // 초식 기본 피해 (숙련도 0일 때 기저값)
  ultBaseDamage?: number;          // 절초 기본 피해

  // 초식 (심법은 생략)
  normalMultiplierCap?: number;
  normalMessages?: string[];

  // 절초 (초(招) 해금 후)
  ultMultiplier?: number;
  ultCost?: number;
  ultCooldown?: number;
  ultMessages?: string[];

  attackIntervalMultiplier?: number;  // 이 무공 발동 후 다음 공격 간격 배율 (녹림권: 1.5)
  ultChargeTime?: number;             // 절초 발동 전 차지 턴수 (강렬한 일권: 1.5)
  ultBypassWeakDefense?: boolean;     // 약한 방어력 무시 플래그

  growth: ArtGrowth;
  masteries: MasteryDef[];

  // 확장
  baseEffects?: MasteryEffects;    // 무공 장착 시 mastery 없이도 적용되는 기본 효과
  descriptionByStage?: string[];
  imageKey?: string;
  autoActivateMastery?: boolean;   // true이면 craftArtRecipe로 심득 해금 시 자동 활성화 (pointCost 무시)
  externalDefenseGrade?: number;   // 외공 등급 (철포삼 = 1)
  proficiencyGainMultiplier?: number; // 숙련도 획득 배율 (마령심법 = 0.5)
}

// ============================================================
// 무공 데이터
// ============================================================

export const ARTS: ArtDef[] = [
  // ── 삼재검법 (주공, 균형형) ──
  {
    id: 'samjae_sword',
    name: '삼재검법',
    faction: 'neutral',
    artType: 'active',
    cost: 1,
    baseGrade: 1,

    gradeDamageMultipliers: [0.70, 0.73, 0.76, 0.79, 0.82, 0.85, 0.88, 0.91, 0.94, 0.97, 1.00, 1.03],
    masteryGradeMultiplierBonus: {
      samjae_sword_mastery: 0.1,
      samjae_sword_taesan: 0.1,
    },

    proficiencyType: 'sword',
    proficiencyCoefficient: 1,  // 초식: baseDamage + floor(1 × getProfDamageValue(prof))
    baseDamage: 5,
    ultBaseDamage: 15,
    ultMultiplier: 3,           // 절초: ultBaseDamage + floor(3 × getProfDamageValue(prof)) (3:1 비율 유지)

    normalMultiplierCap: 1.3,
    normalMessages: ['삼재검법의 검기가 빛난다!', '삼재의 이치를 담은 일격!'],
    ultCost: 20,
    ultCooldown: 10,
    ultMessages: ['강한 내려치기!', '묵직한 일격이 내리꽂힌다!'],

    growth: {
      baseNormalMultiplier: 0.7,
      gradeMaxStars: 12,
      // normalGrowthRate 생략 → BALANCE_PARAMS.NORMAL_GROWTH_RATE (0.02)
    },

    masteries: [
      {
        stage: 1,
        id: 'samjae_sword_ult',
        name: '강한 내려치기',
        description: '절초 사용 가능. 내력이 충분하고 쿨타임이 돌아왔을 때 자동 발동.',
        flavorText: '내력을 실어 묵직하게 내려치는 기본 절초.',
        requiredTier: 0,
        pointCost: 0,
        autoActivate: true,  // 삼재검법 획득 즉시 자동 활성화
        effects: { unlockUlt: true },
      },
      {
        stage: 2,
        id: 'samjae_sword_sense',
        name: '삼재의 감각',
        description: '치명타 확률 +5%, 회피 +5%',
        flavorText: '싸울수록 몸이 적의 움직임에 익숙해진다.',
        requiredTier: 0,
        pointCost: 0,
        requiredArtGrade: 2,
        discovery: { type: 'bijup' },
        effects: {
          bonusCritRate: 0.05,
          bonusDodge: 5,
        },
      },
      {
        stage: 3,
        id: 'samjae_sword_mastery',
        name: '검의 숙련',
        description: '초식 배율 상한 +0.5, 치명타 확률 +5%, 치명타 데미지 +10%',
        flavorText: '반복된 수련으로 검을 다루는 솜씨가 한 단계 올랐다.',
        requiredTier: 0,
        pointCost: 0,
        requiredArtGrade: 3,
        discovery: { type: 'bijup' },
        requires: ['samjae_sword_ult'],
        effects: {
          normalMultiplierCapIncrease: 0.5,
          bonusCritRate: 0.05,
          bonusCritDmg: 10,
        },
      },
      {
        stage: 4,
        id: 'samjae_sword_taesan',
        name: '비기: 태산압정',
        description: '절초가 태산압정으로 변화. 절초 배율 +1(총 ×4). 초식 상한 +0.5. 쿨타임 유지.',
        flavorText: '무거운 일격으로 적을 짓누르는 삼재검법의 오의.',
        requiredTier: 0,
        pointCost: 0,
        requiredArtGrade: 4,
        requires: ['samjae_sword_ult'],
        discovery: { type: 'bijup' },
        effects: {
          ultChange: {
            name: '태산압정',
            ultMultiplierBonus: 1,
          },
          normalMultiplierCapIncrease: 0.5,
          ultCooldownPersist: true,
        },
      },
    ],
  },

  // ── 삼재심법 (심법) ──
  {
    id: 'samjae_simbeop',
    name: '삼재심법',
    faction: 'neutral',
    artType: 'simbeop',
    cost: 0,
    baseGrade: 1,

    proficiencyType: 'mental',
    proficiencyCoefficient: 1 / 15,

    growth: {
      baseQiPerSec: 1.0,
      maxQiPerSec: 100_000_000,
      baseCombatQiRatio: 0.15,  // 처음부터 15% 전투 기운 비율
      gradeMaxStars: 12,         // 12성 완결 독립 시스템
      // qiGrowthRate 생략 → BALANCE_PARAMS.QI_GROWTH_RATE (0.075)
    },

    masteries: [
      {
        stage: 1,
        id: 'samjae_simbeop_regen',
        name: '기맥 순환',
        description: '내력 회복 +1/초',
        flavorText: '호흡을 고르며 기맥의 흐름을 바로잡는다.',
        requiredTier: 0,
        pointCost: 0,
        discovery: { type: 'artStar', starIndex: 1, unlockStarIndex: 4 },  // 처음부터 표시, 4성 도달 시 자동 해금
        effects: { bonusRegenPerSec: 1 },
      },
      {
        stage: 2,
        id: 'samjae_simbeop_synergy',
        name: '삼재 조화',
        description: '삼재검법 장착 시: 기운 +2/초, 전투 중 기운 +10%',
        flavorText: '검법과 심법을 함께 익혀 서로의 부족함을 메운다.',
        requiredTier: 0,
        pointCost: 0,
        discovery: { type: 'artStar', starIndex: 6, unlockStarIndex: 8 },  // 6성 발견, 8성 자동 해금
        effects: {
          bonusQiPerSec: 2,
          bonusCombatQiRatio: 0.10,
          synergyArtId: 'samjae_sword',
        },
      },
      {
        stage: 3,
        id: 'samjae_simbeop_kill',
        name: '전투 심법',
        description: '처치 시 전투시간 20%에 해당하는 기운 즉시 획득. 내력 회복 +1/초.',
        flavorText: '적을 쓰러뜨릴 때 흩어지는 기운을 거둬들인다.',
        requiredTier: 0,
        pointCost: 0,
        discovery: { type: 'artStar', starIndex: 10, unlockStarIndex: 12 },  // 10성 발견, 12성 자동 해금
        effects: {
          killBonusEnabled: true,
          bonusRegenPerSec: 1,
        },
      },
      {
        stage: 4,
        id: 'samjae_simbeop_oui',
        name: '삼재심법 오의',
        description: '삼재심법의 진수. 기운 생산이 1.2배로 증가하고, 전투 기운 비율이 30%로 오른다.',
        flavorText: '세 가지 이치가 하나로 합쳐질 때, 천지의 기운이 손끝으로 모여든다.',
        requiredTier: 0,
        pointCost: 0,
        discovery: { type: 'bijup' },
        conditionMastery: 'samjae_simbeop_kill',  // 전투 심법 활성 시에만 효과 적용
        effects: { bonusCombatQiRatioFlat: 0.10, simbeopQiMultiplier: 1.2 },
      },
    ],
  },

  // ── 조악한 무명보법 (보법, passive) ──
  {
    id: 'crude_bobeop',
    name: '조악한 무명보법',
    faction: 'neutral',
    artType: 'passive',
    cost: 0,
    baseGrade: 1,
    imageKey: 'crude_bobeop',
    autoActivateMastery: true,

    proficiencyType: 'footwork',
    proficiencyCoefficient: 0,  // 0이면 숙련도 스케일링 비활성
    baseEffects: { bonusAtkSpeed: 0.2 },
    descriptionByStage: [
      '야산 곳곳에서 주운 낡은 보법서 조각들을 이어붙였다. 완전하지 않지만 몸이 조금 가벼워진 것 같다.',
      '첫 초식의 윤곽이 잡혔다. 발이 한결 더 빨라졌다.',
      '두 번째 초식을 익혔다. 적의 공격을 흘리는 법을 터득했다.',
      '마침내 보법서가 완전히 복원되었다. 적의 빈틈을 읽고 강력한 일격을 가할 수 있게 되었다.',
    ],
    growth: {},
    masteries: [
      {
        stage: 1,
        id: 'crude_bobeop_1',
        name: '허술한 발놀림',
        description: '공격 속도 0.1초 추가 감소',
        flavorText: '발이 한결 더 빨라지는 것 같다.',
        requiredTier: 0,
        pointCost: 0,
        discovery: { type: 'recipe' },
        effects: { bonusAtkSpeed: 0.1 },
      },
      {
        stage: 2,
        id: 'crude_bobeop_2',
        name: '가벼운 보법',
        description: '공격 속도 0.1초 추가 감소, 회피 +10%',
        flavorText: '몸이 한결 가볍게 느껴지며 적의 공격을 흘릴 수 있게 되었다.',
        requiredTier: 0,
        pointCost: 0,
        requires: ['crude_bobeop_1'],
        discovery: { type: 'recipe' },
        effects: { bonusAtkSpeed: 0.1, bonusDodge: 10 },
      },
      {
        stage: 3,
        id: 'crude_bobeop_3',
        name: '바람걸음',
        description: '공격 속도 0.1초 추가 감소, 회피 성공 시 50% 확률로 다음 공격 최종 피해 1.2배',
        flavorText: '바람처럼 흘리고 나면 적의 빈틈이 보인다.',
        requiredTier: 0,
        pointCost: 0,
        requires: ['crude_bobeop_2'],
        discovery: { type: 'recipe' },
        effects: { bonusAtkSpeed: 0.1, dodgeCounterEnabled: true },
      },
    ],
  },

  // ── 녹림권 (권법, active) ──
  {
    id: 'nokrim_fist',
    name: '녹림권(綠林拳)',
    faction: 'neutral',
    artType: 'active',
    proficiencyType: 'fist',
    proficiencyCoefficient: 1,
    baseDamage: 8,
    normalMultiplierCap: 1.6,
    baseGrade: 5,
    cost: 2,
    attackIntervalMultiplier: 1.5,
    ultBaseDamage: 20,
    ultMultiplier: 4.5,
    ultCost: 30,
    ultCooldown: 15,
    ultChargeTime: 1.5,
    ultBypassWeakDefense: true,
    gradeDamageMultipliers: [1.50, 1.55, 1.61, 1.66, 1.72, 1.77, 1.83, 1.88, 1.94, 1.99, 2.05, 2.10],
    masteryGradeMultiplierBonus: {
      nokrim_fist_chokmokta_cap: 0.20,
      nokrim_fist_mokseok_cap: 0.20,
      nokrim_fist_gomokpa_cap: 0.20,
    },
    normalMessages: ['녹림권의 일격!', '거친 권풍이 몰아친다!'],
    ultMessages: ['강렬한 일권(一拳)! 기를 응집하여 폭발적인 일격을 날린다!'],
    descriptionByStage: [
      '녹림(綠林)의 거친 산야에서 다듬어진 실전 권법.\n화려한 초식도, 심오한 이치도 없다. 오직 상대를 쓰러뜨리겠다는 하나의 집념만이 이 권법을 이루고 있다.',
    ],
    growth: { gradeMaxStars: 12 },
    masteries: [
      {
        stage: 1,
        id: 'nokrim_fist_ult',
        name: '강렬한 일권',
        description: '절초 강렬한 일권 사용 가능. 1.5턴 차지 후 공격력의 7배 데미지.',
        requiredTier: 0,
        pointCost: 0,
        effects: { unlockUlt: true },
        autoActivate: true,
        isUltSlot: true,
      },
      {
        stage: 2,
        id: 'nokrim_fist_geoksan',
        name: '격산타우(隔山打牛)',
        description: '강렬한 일권이 격산타우로 변화. 선공격 후 1.5턴 딜레이, 5.5배 데미지, 내력 35 필요.',
        requiredTier: 0,
        pointCost: 0,
        requiredArtGrade: 4,
        discovery: { type: 'bijup' },
        isUltReplace: true,
        effects: {
          ultChange: {
            name: '격산타우(隔山打牛)',
            ultMultiplierBonus: 1,
            ultCostBonus: 5,
            ultAttackFirst: true,
          },
          normalMultiplierCapIncrease: 0.25,
        },
      },
      {
        stage: 1,
        id: 'nokrim_fist_chokmokta',
        name: '초목타(草木打)',
        description: '치명타 확률 +10%, 공격 간격 배율 1.5→1.4',
        flavorText: '초목처럼 유연하게 치고 빠지는 녹림 권법의 기초.',
        requiredTier: 0,
        pointCost: 0,
        discovery: { type: 'artStar', starIndex: 3, unlockStarIndex: 5 },
        effects: {
          bonusCritRate: 0.10,
          attackIntervalMultiplierReduction: 0.1,
        },
      },
      {
        stage: 4,
        id: 'nokrim_fist_chokmokta_cap',
        name: '초목타 배율 강화',
        description: '초식 배율 상한 +0.35',
        flavorText: '초목의 유연함이 초식에 담기며 일격의 무게가 깊어진다.',
        requiredTier: 0,
        pointCost: 2,
        requires: ['nokrim_fist_chokmokta'],
        inlineInParent: 'nokrim_fist_chokmokta',
        effects: {},
      },
      {
        stage: 2,
        id: 'nokrim_fist_mokseok',
        name: '목석격(木石擊)',
        description: '절초 명중 시 적 기절 2초 (보스 면역)',
        flavorText: '나무와 돌처럼 굳은 일격으로 상대의 동작을 완전히 멈춘다.',
        requiredTier: 0,
        pointCost: 0,
        discovery: { type: 'artStar', starIndex: 7, unlockStarIndex: 9 },
        effects: {
          stunOnUlt: 2,
        },
      },
      {
        stage: 6,
        id: 'nokrim_fist_mokseok_cap',
        name: '목석격 배율 강화',
        description: '초식 배율 상한 +0.35',
        flavorText: '목석의 무게가 초식에 더해져 파괴력이 한층 높아진다.',
        requiredTier: 0,
        pointCost: 2,
        requires: ['nokrim_fist_mokseok'],
        inlineInParent: 'nokrim_fist_mokseok',
        effects: {},
      },
      {
        stage: 3,
        id: 'nokrim_fist_gomokpa',
        name: '고목파(古木破)',
        description: '보스/히든 몬스터 대상 피해 +10%, 공격 간격 배율 추가 1.4→1.3',
        flavorText: '수백 년 고목을 쪼개는 힘. 강인한 적 앞에서 진가를 발휘한다.',
        requiredTier: 0,
        pointCost: 0,
        discovery: { type: 'artStar', starIndex: 12, unlockStarIndex: 12 },
        effects: {
          bossHiddenDmgBonus: 0.10,
          attackIntervalMultiplierReduction: 0.1,
        },
      },
      {
        stage: 8,
        id: 'nokrim_fist_gomokpa_cap',
        name: '고목파 배율 강화',
        description: '초식 배율 상한 +0.35',
        flavorText: '고목을 쪼개는 힘이 초식에 녹아들어 최고의 경지에 이른다.',
        requiredTier: 0,
        pointCost: 2,
        requires: ['nokrim_fist_gomokpa'],
        inlineInParent: 'nokrim_fist_gomokpa',
        effects: {},
      },
    ],
  },

  // ── 철포삼 (외공, passive) ──
  {
    id: 'jeoposaem',
    name: '철포삼(鐵布衫)',
    faction: 'neutral',
    artType: 'passive',
    cost: 1,
    baseGrade: 1,
    externalDefenseGrade: 1,
    proficiencyType: 'fist',
    proficiencyCoefficient: 0,
    descriptionByStage: [
      '온 몸을 강철처럼 단련하는 외공(外功). 상대의 공격을 맨몸으로 받아내는 기초를 익혔다. 받는 피해가 15% 감소한다.',
      '철포삼의 오의를 깨쳤다. 받는 피해가 추가로 10% 감소하고, 최대 체력이 10% 증가한다.',
    ],
    growth: {},
    baseEffects: { bonusDmgReductionPercent: 15 },
    masteries: [
      {
        stage: 1,
        id: 'jeoposaem_secret',
        name: '철포삼 오의',
        description: '받는 피해 추가 10% 감소, 최대 체력 +10%',
        flavorText: '강철 같은 몸이 완성될 때, 비로소 진정한 외공의 경지에 이른다.',
        requiredTier: 0,
        pointCost: 0,
        requiredArtGrade: 1,
        discovery: { type: 'bijup' },
        effects: { bonusDmgReductionPercent: 10, bonusHpPercent: 0.10 },
      },
    ],
  },

  // ── 마령심법 (심법, evil) ──
  {
    id: 'maryeong_simbeop',
    name: '마령심법(魔靈心法)',
    faction: 'evil',
    artType: 'simbeop',
    cost: 0,
    baseGrade: 5,
    proficiencyType: 'mental',
    proficiencyCoefficient: 1 / 15,
    proficiencyGainMultiplier: 0.5,
    descriptionByStage: [
      '사도(邪道)의 기운을 억지로 받아들이는 수련법. 마기가 몸속을 거스르는 탓에 숙련도가 쌓이는 속도가 절반에 그치지만, 기운만은 보통 심법보다 빠르게 차오른다.',
    ],
    growth: {
      baseQiPerSec: 2.0,
      maxQiPerSec: 100_000_000,
      baseCombatQiRatio: 0.35,
      gradeMaxStars: 12,
      proficiencyCoefficientByGrade: [
        0.0667, 0.0727, 0.0788, 0.0848, 0.0909, 0.0970,
        0.1030, 0.1091, 0.1152, 0.1212, 0.1273, 0.1333,
      ],
    },
    masteries: [
      {
        stage: 1,
        id: 'maryeong_combat',
        name: '마령 전투 수련',
        description: '전투 중에도 자연의 기운을 생산할 수 있게 된다.',
        flavorText: '마기를 삼켜 자신의 것으로 만들면, 싸우는 순간에도 기운이 샘솟는다.',
        requiredTier: 0,
        pointCost: 0,
        autoActivate: true,
        effects: {},
      },
    ],
  },
];

// ============================================================
// Lookup helpers
// ============================================================

export function getArtDef(id: string): ArtDef | undefined {
  return ARTS.find(a => a.id === id);
}

export function getMasteryDef(artId: string, masteryId: string): MasteryDef | undefined {
  const art = getArtDef(artId);
  return art?.masteries.find(m => m.id === masteryId);
}

export function getMasteryDefsForArt(artId: string): MasteryDef[] {
  return getArtDef(artId)?.masteries ?? [];
}

/** 모든 무공의 모든 mastery 중 id가 일치하는 것을 찾아 [artId, MasteryDef] 반환 */
export function findMasteryById(masteryId: string): [string, MasteryDef] | undefined {
  for (const art of ARTS) {
    const m = art.masteries.find(m => m.id === masteryId);
    if (m) return [art.id, m];
  }
  return undefined;
}
