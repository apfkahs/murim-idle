/**
 * 무공 데이터 (v4.0) — 설계서 v3 기반 전면 재작성
 * ArtDef / MasteryDef / ArtGrowth 인터페이스
 * 삼재검법 (주공) + 삼재심법 (심법) 2종만 존재
 */

export type Faction = 'neutral' | 'righteous' | 'evil';
export type ArtType = 'active' | 'passive' | 'simbeop';
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
}

// ── 초(招) 정의 ──
export interface MasteryDef {
  stage: number;
  id: string;
  name: string;
  description: string;
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

    normalMultiplierCap: 1.3,
    normalMessages: ['삼재검법의 검기가 빛난다!', '삼재의 이치를 담은 일격!'],

    ultMultiplier: 3.0,
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
