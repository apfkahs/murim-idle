/**
 * 무공 데이터 (v3.0)
 * 성급(grade) 제거. 점진적 성장(totalSimdeuk 기반) 체계.
 * 심화학습(MasteryDef) — discovery 필드 추가로 발견 시스템 지원.
 * 5종: 삼재검법(액티브), 삼재심법(심법), 어설픈 무당보법(패시브), 조악한 흡공술(심법), 강체술(패시브)
 */

export type Faction = 'neutral' | 'righteous' | 'evil';
export type ArtType = 'active' | 'passive';

/** 점진적 성장 커브 정의 */
export interface ArtGrowth {
  // active arts
  basePower?: number;
  powerGrowth?: number;
  maxPower?: number;
  baseTriggerRate?: number;
  triggerGrowth?: number;
  maxTriggerRate?: number;
  // simbeop (내공 심법)
  baseNeigongPerSec?: number;
  neigongGrowth?: number;
  maxNeigongPerSec?: number;
  // passive dodge
  baseDodge?: number;
  dodgeGrowth?: number;
  maxDodge?: number;
  // passive hp
  baseHpBonus?: number;
  hpGrowth?: number;
  maxHpBonus?: number;
}

/** 심화학습 발견 조건 */
export interface MasteryDiscovery {
  type: 'art_simdeuk' | 'monster_kill';
  artSimdeuk?: number;        // 해당 무공 totalSimdeuk 임계값
  monsterId?: string;         // 특정 몬스터 ID
  monsterKillCount?: number;  // 필요 처치 수
}

export interface MasteryDef {
  stage: number;                // 1~4단계
  requiredSimdeuk: number;      // 해당 무공의 필요 누적 심득
  requiredTier: number;         // 필요 경지 (0 = 제한 없음)
  pointCost: number;            // 포인트 비용
  id: string;                   // 고유 ID
  name: string;
  description: string;
  requires?: string[];          // 전제 심화 ID
  discovery?: MasteryDiscovery; // 발견 조건 (없으면 기본 공개)
}

export interface ArtDef {
  id: string;
  name: string;
  faction: Faction;
  isSimbeop: boolean;
  artType: ArtType;        // 'active' | 'passive'
  cost: number;            // 포인트 비용 (심법은 별개)
  attackMessages: string[];
  growth: ArtGrowth;
  masteries: MasteryDef[];
}

/** 심득 기반 스탯 계산: base + growth * sqrt(totalSimdeuk), capped at max */
export interface ArtStats {
  power: number;
  triggerRate: number;
  neigongPerSec: number;
  dodge: number;
  hpBonus: number;
}

function growthCalc(base: number, rate: number, simdeuk: number, max: number): number {
  const val = base + rate * Math.sqrt(simdeuk);
  return Math.min(val, max);
}

export function getArtStats(art: ArtDef, totalSimdeuk: number): ArtStats {
  const g = art.growth;
  return {
    power: g.basePower != null ? Math.floor(growthCalc(g.basePower, g.powerGrowth ?? 0, totalSimdeuk, g.maxPower ?? 999)) : 0,
    triggerRate: g.baseTriggerRate != null ? growthCalc(g.baseTriggerRate, g.triggerGrowth ?? 0, totalSimdeuk, g.maxTriggerRate ?? 1) : 0,
    neigongPerSec: g.baseNeigongPerSec != null ? growthCalc(g.baseNeigongPerSec, g.neigongGrowth ?? 0, totalSimdeuk, g.maxNeigongPerSec ?? 999) : 0,
    dodge: g.baseDodge != null ? growthCalc(g.baseDodge, g.dodgeGrowth ?? 0, totalSimdeuk, g.maxDodge ?? 30) : 0,
    hpBonus: g.baseHpBonus != null ? Math.floor(growthCalc(g.baseHpBonus, g.hpGrowth ?? 0, totalSimdeuk, g.maxHpBonus ?? 999)) : 0,
  };
}

/**
 * Growth tuning notes:
 * - 삼재검법: power 12→48 over ~960 simdeuk. sqrt(960)≈31. rate=(48-12)/31≈1.16
 *   triggerRate 0.55→0.65 over ~960. rate=(0.65-0.55)/31≈0.003
 * - 삼재심법: neigong 1→5 over ~720. sqrt(720)≈26.8. rate=(5-1)/26.8≈0.149
 * - 무당보법: dodge 3→15 over ~1200 (base 100, grade5=2500). sqrt(1200)≈34.6. rate=(15-3)/34.6≈0.347
 * - 흡공술: neigong 3→14 over ~2400 (base 200). sqrt(2400)≈49. rate=(14-3)/49≈0.224
 * - 강체술: hp 20→110 over ~1800 (base 150). sqrt(1800)≈42.4. rate=(110-20)/42.4≈2.12
 */
export const ARTS: ArtDef[] = [
  {
    id: 'samjae_sword',
    name: '삼재검법',
    faction: 'neutral',
    isSimbeop: false,
    artType: 'active',
    cost: 1,
    attackMessages: [
      '삼재검법의 검기가 빛난다!',
      '삼재의 이치를 담은 일격!',
      '삼재검법으로 베어냈다!',
    ],
    growth: {
      basePower: 12, powerGrowth: 1.16, maxPower: 48,
      baseTriggerRate: 0.55, triggerGrowth: 0.003, maxTriggerRate: 0.65,
    },
    masteries: [
      {
        stage: 1, requiredSimdeuk: 80, requiredTier: 0, pointCost: 1,
        id: 'samjae_sword_residual',
        name: '검기 잔류',
        description: '무공이 발동하지 않아도 잔류하는 검기가 적을 스친다',
        discovery: { type: 'art_simdeuk', artSimdeuk: 150 },
      },
      {
        stage: 2, requiredSimdeuk: 200, requiredTier: 0, pointCost: 1,
        id: 'samjae_sword_double',
        name: '이연격',
        description: '간혹 검을 한 번 더 휘두를 수 있게 된다',
        discovery: { type: 'art_simdeuk', artSimdeuk: 400 },
      },
      {
        stage: 3, requiredSimdeuk: 480, requiredTier: 1, pointCost: 2,
        id: 'samjae_sword_critical',
        name: '파쇄',
        description: '급소를 노리는 일격을 가할 수 있게 된다',
        discovery: { type: 'monster_kill', monsterId: 'tiger_boss', monsterKillCount: 1 },
      },
      {
        stage: 4, requiredSimdeuk: 960, requiredTier: 2, pointCost: 2,
        id: 'samjae_sword_penetrate',
        name: '삼재관통',
        description: '잔류하는 검기에도 연격과 파쇄의 이치가 깃든다',
        requires: ['samjae_sword_residual'],
        discovery: { type: 'art_simdeuk', artSimdeuk: 800 },
      },
    ],
  },
  {
    id: 'samjae_simbeop',
    name: '삼재심법',
    faction: 'neutral',
    isSimbeop: true,
    artType: 'passive',
    cost: 0,
    attackMessages: [],
    growth: {
      baseNeigongPerSec: 1, neigongGrowth: 0.149, maxNeigongPerSec: 5,
    },
    masteries: [
      {
        stage: 1, requiredSimdeuk: 60, requiredTier: 0, pointCost: 1,
        id: 'samjae_simbeop_combat',
        name: '전투 수련',
        description: '전투 중에도 내공이 서서히 생성된다',
        discovery: { type: 'art_simdeuk', artSimdeuk: 120 },
      },
      {
        stage: 2, requiredSimdeuk: 150, requiredTier: 0, pointCost: 1,
        id: 'samjae_simbeop_heal',
        name: '기혈순환',
        description: '내공으로 상처를 치유하는 효율이 향상된다',
        discovery: { type: 'art_simdeuk', artSimdeuk: 300 },
      },
      {
        stage: 3, requiredSimdeuk: 360, requiredTier: 1, pointCost: 2,
        id: 'samjae_simbeop_burst',
        name: '내공 폭발',
        description: '수련에 집중하면 간헐적으로 내공이 폭발적으로 생성된다',
        discovery: { type: 'monster_kill', monsterId: 'tiger_boss', monsterKillCount: 1 },
      },
      {
        stage: 4, requiredSimdeuk: 720, requiredTier: 2, pointCost: 2,
        id: 'samjae_simbeop_mastery',
        name: '심법 대성',
        description: '전투 중 내공 회복이 한층 더 깊어진다',
        requires: ['samjae_simbeop_combat'],
        discovery: { type: 'art_simdeuk', artSimdeuk: 600 },
      },
    ],
  },
  {
    id: 'mudang_step',
    name: '어설픈 무당보법',
    faction: 'righteous',
    isSimbeop: false,
    artType: 'passive',
    cost: 1,
    attackMessages: [],
    growth: {
      baseDodge: 3, dodgeGrowth: 0.347, maxDodge: 15,
    },
    masteries: [
      {
        stage: 1, requiredSimdeuk: 100, requiredTier: 0, pointCost: 1,
        id: 'mudang_step_gyeongbo',
        name: '경보',
        description: '적을 처치한 후 가벼운 발놀림으로 기력을 회복한다',
        discovery: { type: 'art_simdeuk', artSimdeuk: 200 },
      },
      {
        stage: 2, requiredSimdeuk: 250, requiredTier: 0, pointCost: 1,
        id: 'mudang_step_simdeuk',
        name: '심득 강화',
        description: '몸의 움직임에서 더 깊은 깨달음을 얻는다',
        discovery: { type: 'art_simdeuk', artSimdeuk: 500 },
      },
      {
        stage: 3, requiredSimdeuk: 600, requiredTier: 1, pointCost: 2,
        id: 'mudang_step_dodge',
        name: '보법 숙련',
        description: '몸놀림이 한계를 넘어 더 높은 경지에 이른다',
        discovery: { type: 'monster_kill', monsterId: 'feiyi', monsterKillCount: 1 },
      },
      {
        stage: 4, requiredSimdeuk: 1200, requiredTier: 2, pointCost: 2,
        id: 'mudang_step_fullbody',
        name: '무당 전신',
        description: '적의 공격을 피할 때마다 기혈이 소량 회복된다',
        discovery: { type: 'art_simdeuk', artSimdeuk: 1000 },
      },
    ],
  },
  {
    id: 'heupgong',
    name: '조악한 흡공술',
    faction: 'evil',
    isSimbeop: true,
    artType: 'passive',
    cost: 0,
    attackMessages: [],
    growth: {
      baseNeigongPerSec: 3, neigongGrowth: 0.224, maxNeigongPerSec: 14,
    },
    masteries: [
      {
        stage: 1, requiredSimdeuk: 200, requiredTier: 0, pointCost: 1,
        id: 'heupgong_combat',
        name: '전투 수련',
        description: '전투 중에도 주변의 기운을 흡수할 수 있다',
        discovery: { type: 'art_simdeuk', artSimdeuk: 400 },
      },
      {
        stage: 2, requiredSimdeuk: 500, requiredTier: 0, pointCost: 1,
        id: 'heupgong_heal_enhance',
        name: '흡혈 강화',
        description: '적을 처치할 때 그 생명력의 일부를 빼앗는다',
        discovery: { type: 'art_simdeuk', artSimdeuk: 800 },
      },
      {
        stage: 3, requiredSimdeuk: 1200, requiredTier: 1, pointCost: 2,
        id: 'heupgong_accel',
        name: '흡공 가속',
        description: '상대가 약해질수록 흡수하는 기운이 강해진다',
        requires: ['heupgong_heal_enhance'],
        discovery: { type: 'monster_kill', monsterId: 'bandit_leader', monsterKillCount: 1 },
      },
      {
        stage: 4, requiredSimdeuk: 2400, requiredTier: 2, pointCost: 2,
        id: 'heupgong_morale',
        name: '사기충천',
        description: '적을 쓰러뜨린 기세로 다음 일격이 한층 강해진다',
        discovery: { type: 'art_simdeuk', artSimdeuk: 2000 },
      },
    ],
  },
  {
    id: 'gangche',
    name: '강체술',
    faction: 'neutral',
    isSimbeop: false,
    artType: 'passive',
    cost: 1,
    attackMessages: [],
    growth: {
      baseHpBonus: 20, hpGrowth: 2.12, maxHpBonus: 110,
    },
    masteries: [
      {
        stage: 1, requiredSimdeuk: 150, requiredTier: 0, pointCost: 1,
        id: 'gangche_tough',
        name: '강인',
        description: '단련된 육체가 적의 공격을 일부 상쇄한다',
        discovery: { type: 'art_simdeuk', artSimdeuk: 300 },
      },
      {
        stage: 2, requiredSimdeuk: 375, requiredTier: 0, pointCost: 1,
        id: 'gangche_reinforce',
        name: '근골강화',
        description: '근골이 한층 단단해져 체력이 크게 상승한다',
        discovery: { type: 'art_simdeuk', artSimdeuk: 600 },
      },
      {
        stage: 3, requiredSimdeuk: 900, requiredTier: 1, pointCost: 2,
        id: 'gangche_unyielding',
        name: '불굴',
        description: '궁지에 몰릴수록 더 강인해지는 의지가 피해를 줄인다',
        requires: ['gangche_tough'],
        discovery: { type: 'monster_kill', monsterId: 'dangkang', monsterKillCount: 1 },
      },
      {
        stage: 4, requiredSimdeuk: 1800, requiredTier: 2, pointCost: 2,
        id: 'gangche_ironwall',
        name: '철벽지체',
        description: '때로 적의 공격을 완전히 무시할 수 있는 경지에 이른다',
        discovery: { type: 'art_simdeuk', artSimdeuk: 1500 },
      },
    ],
  },
];

export function getArtDef(id: string): ArtDef | undefined {
  return ARTS.find(a => a.id === id);
}

export function getMasteryDef(artId: string, masteryId: string): MasteryDef | undefined {
  const art = getArtDef(artId);
  if (!art) return undefined;
  return art.masteries.find(m => m.id === masteryId);
}

export function getMasteryDefsForArt(artId: string): MasteryDef[] {
  const art = getArtDef(artId);
  return art?.masteries ?? [];
}

/** 세이브 마이그레이션용: 기존 grade+proficiency → totalSimdeuk 역산 */
const GRADE_COST_MULTIPLIERS = [0, 1, 2.5, 6, 12, 25];
const BASE_SIMDEUK_COSTS: Record<string, number> = {
  samjae_sword: 80, samjae_simbeop: 60, mudang_step: 100, heupgong: 200, gangche: 150,
};
export function migrateGradeToSimdeuk(artId: string, grade: number, proficiency: number): number {
  const baseCost = BASE_SIMDEUK_COSTS[artId] ?? 100;
  let total = 0;
  for (let g = 2; g <= grade; g++) {
    total += Math.floor(baseCost * GRADE_COST_MULTIPLIERS[g - 1]);
  }
  return total + proficiency;
}
