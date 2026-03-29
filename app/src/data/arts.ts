/**
 * 무공 데이터 (v4.0) — 설계서 v3 기반 전면 재작성
 * ArtDef / MasteryDef / ArtGrowth 인터페이스
 * 삼재검법 (주공) + 삼재심법 (심법) 2종만 존재
 */

export type Faction = 'neutral' | 'righteous' | 'evil';
export type ArtType = 'active' | 'passive' | 'simbeop';
export type ProficiencyType = 'sword' | 'palm' | 'footwork' | 'mental';
// ── 발견 조건 ──
export interface MasteryDiscovery {
  type: 'simdeuk' | 'boss' | 'event';
  threshold?: number;     // simdeuk 타입일 때 발견 심득
  bossId?: string;        // boss 타입일 때 보스 ID
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
    simBonusW?: number;
    simBonusH?: number;
  };
  killBonusEnabled?: boolean;
  synergyArtId?: string;
  dodgeCounterEnabled?: boolean;  // 회피 성공 시 50% 확률 카운터 공격 활성화
}

// ── 초(招) 정의 ──
export interface MasteryDef {
  stage: number;
  id: string;
  name: string;
  description: string;
  flavorText?: string;
  requiredSimdeuk: number;
  requiredTier: number;
  pointCost: number;
  requires?: string[];
  discovery?: MasteryDiscovery;
  effects?: MasteryEffects;
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
}

// ── 무공 정의 ──
export interface ArtDef {
  id: string;
  name: string;
  faction: Faction;
  artType: ArtType;
  cost: number;
  baseGrade: number;

  // 숙련도
  proficiencyType: ProficiencyType;
  proficiencyCoefficient: number;  // 초식 데미지 = baseDamage + floor(proficiencyCoefficient × 숙련도)
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

  growth: ArtGrowth;
  masteries: MasteryDef[];

  // 확장
  baseEffects?: MasteryEffects;    // 무공 장착 시 mastery 없이도 적용되는 기본 효과
  descriptionByStage?: string[];
  imageKey?: string;
  autoActivateMastery?: boolean;   // true이면 craftArtRecipe로 심득 해금 시 자동 활성화 (pointCost 무시)
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

    proficiencyType: 'sword',
    proficiencyCoefficient: 0.00475,  // 초식: 5 + floor(0.00475 × prof) → prof=20000에서 100
    baseDamage: 5,
    ultBaseDamage: 15,
    ultMultiplier: 0.01425,           // 절초: 15 + floor(0.01425 × prof) → prof=20000에서 300

    normalMultiplierCap: 1.3,
    normalMessages: ['삼재검법의 검기가 빛난다!', '삼재의 이치를 담은 일격!'],
    ultCost: 30,
    ultCooldown: 10,
    ultMessages: ['강한 내려치기!', '묵직한 일격이 내리꽂힌다!'],

    growth: {
      baseNormalMultiplier: 0.7,
      // normalGrowthRate 생략 → BALANCE_PARAMS.NORMAL_GROWTH_RATE (0.02)
    },

    masteries: [
      {
        stage: 1,
        id: 'samjae_sword_ult',
        name: '강한 내려치기',
        description: '절초 사용 가능. 내력이 충분하고 쿨타임이 돌아왔을 때 자동 발동.',
        flavorText: '내력을 실어 묵직하게 내려치는 기본 절초.',
        requiredSimdeuk: 150,
        requiredTier: 0,
        pointCost: 3,
        discovery: { type: 'simdeuk', threshold: 80 },
        effects: { unlockUlt: true },
      },
      {
        stage: 2,
        id: 'samjae_sword_sense',
        name: '삼재의 감각',
        description: '치명타 확률 +5%, 회피 +5%, 데미지 감소 +5%',
        flavorText: '싸울수록 몸이 적의 움직임에 익숙해진다.',
        requiredSimdeuk: 400,
        requiredTier: 0,
        pointCost: 1,
        discovery: { type: 'simdeuk', threshold: 200 },
        effects: {
          bonusCritRate: 0.05,
          bonusDodge: 5,
          bonusDmgReduction: 5,
        },
      },
      {
        stage: 3,
        id: 'samjae_sword_mastery',
        name: '검의 숙련',
        description: '초식 배율 상한 +0.5, 치명타 확률 +5%',
        flavorText: '반복된 수련으로 검을 다루는 솜씨가 한 단계 올랐다.',
        requiredSimdeuk: 500,
        requiredTier: 1,
        pointCost: 2,
        discovery: { type: 'simdeuk', threshold: 500 },
        effects: {
          normalMultiplierCapIncrease: 0.5,
          bonusCritRate: 0.05,
        },
      },
      {
        stage: 4,
        id: 'samjae_sword_taesan',
        name: '비기: 태산압정',
        description: '절초가 태산압정으로 변화. 심(心)이 절초 위력에 기여. 초식 상한 +0.5.',
        flavorText: '무거운 일격으로 적을 짓누르는 삼재검법의 오의.',
        requiredSimdeuk: 960,
        requiredTier: 2,
        pointCost: 3,
        requires: ['samjae_sword_ult'],
        discovery: { type: 'simdeuk', threshold: 800 },
        effects: {
          ultChange: {
            name: '태산압정',
            simBonusW: 1.5,
            simBonusH: 120,
          },
          normalMultiplierCapIncrease: 0.5,
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
    proficiencyCoefficient: 0.03,

    growth: {
      baseQiPerSec: 1.0,
      maxQiPerSec: 3.0,
      // qiGrowthRate 생략 → BALANCE_PARAMS.QI_GROWTH_RATE (0.075)
      // baseCombatQiRatio/combatQiGrowthRate/maxCombatQiRatio 생략 → BALANCE_PARAMS 기본값
    },

    masteries: [
      {
        stage: 1,
        id: 'samjae_simbeop_regen',
        name: '기맥 순환',
        description: '내력 회복 +1/초',
        flavorText: '호흡을 고르며 기맥의 흐름을 바로잡는다.',
        requiredSimdeuk: 120,
        requiredTier: 0,
        pointCost: 1,
        discovery: { type: 'simdeuk', threshold: 60 },
        effects: { bonusRegenPerSec: 1 },
      },
      {
        stage: 2,
        id: 'samjae_simbeop_combat',
        name: '전투 수련',
        description: '전투 중에도 자연의 기운을 생산할 수 있게 된다',
        flavorText: '싸우면서도 자연의 기운을 조금씩 받아들인다.',
        requiredSimdeuk: 300,
        requiredTier: 0,
        pointCost: 1,
        discovery: { type: 'simdeuk', threshold: 150 },
        // effects 없음 — 2초 해금 여부로 combatQiRatio 활성 판단
      },
      {
        stage: 3,
        id: 'samjae_simbeop_synergy',
        name: '삼재 조화',
        description: '삼재검법 장착 시: 기운 +2/초, 전투 중 기운 +10%',
        flavorText: '검법과 심법을 함께 익혀 서로의 부족함을 메운다.',
        requiredSimdeuk: 500,
        requiredTier: 1,
        pointCost: 1,
        discovery: { type: 'simdeuk', threshold: 400 },
        effects: {
          bonusQiPerSec: 2,
          bonusCombatQiRatio: 0.10,
          synergyArtId: 'samjae_sword',
        },
      },
      {
        stage: 4,
        id: 'samjae_simbeop_kill',
        name: '전투 심법',
        description: '처치 시 전투시간 20%에 해당하는 기운 즉시 획득. 내력 회복 +1/초.',
        flavorText: '적을 쓰러뜨릴 때 흩어지는 기운을 거둬들인다.',
        requiredSimdeuk: 720,
        requiredTier: 2,
        pointCost: 2,
        requires: ['samjae_simbeop_regen'],
        discovery: { type: 'simdeuk', threshold: 600 },
        effects: {
          killBonusEnabled: true,
          bonusRegenPerSec: 1,
        },
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
    proficiencyCoefficient: 0.02,
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
        requiredSimdeuk: 0,
        requiredTier: 0,
        pointCost: 0,
        effects: { bonusAtkSpeed: 0.1 },
      },
      {
        stage: 2,
        id: 'crude_bobeop_2',
        name: '가벼운 보법',
        description: '공격 속도 0.1초 추가 감소, 회피 +10%',
        flavorText: '몸이 한결 가볍게 느껴지며 적의 공격을 흘릴 수 있게 되었다.',
        requiredSimdeuk: 0,
        requiredTier: 0,
        pointCost: 0,
        requires: ['crude_bobeop_1'],
        effects: { bonusAtkSpeed: 0.1, bonusDodge: 10 },
      },
      {
        stage: 3,
        id: 'crude_bobeop_3',
        name: '바람걸음',
        description: '공격 속도 0.1초 추가 감소, 회피 성공 시 50% 확률로 다음 공격 최종 피해 1.2배',
        flavorText: '바람처럼 흘리고 나면 적의 빈틈이 보인다.',
        requiredSimdeuk: 0,
        requiredTier: 0,
        pointCost: 0,
        requires: ['crude_bobeop_2'],
        effects: { bonusAtkSpeed: 0.1, dodgeCounterEnabled: true },
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
