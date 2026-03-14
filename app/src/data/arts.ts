/**
 * 무공 데이터 (v2.0)
 * DPS 제거. power + triggerRate + artType 체계.
 * 심화학습(MasteryDef) 추가. 기존 패시브는 심화학습 트리로 이전.
 * 5종: 삼재검법(액티브), 삼재심법(심법), 어설픈 무당보법(패시브), 조악한 흡공술(심법), 강체술(패시브)
 */

export type Faction = 'neutral' | 'righteous' | 'evil';
export type ArtType = 'active' | 'passive';

export interface ArtGrade {
  grade: number; // 1~5성
  effect: string; // 표시용
  power?: number;         // 액티브 위력
  triggerRate?: number;    // 액티브 발동 확률 (0~1)
  neigongPerSec?: number;  // 심법 내공/초
  dodge?: number;          // 패시브 회피율 (%)
  hpBonus?: number;        // 패시브 최대HP 보너스 (강체술)
}

export interface MasteryDef {
  stage: number;          // 1~4단계
  requiredGrade: number;  // 필요 성급
  requiredTier: number;   // 필요 경지 (0 = 제한 없음)
  pointCost: number;      // 포인트 비용
  id: string;             // 고유 ID
  name: string;
  description: string;
  requires?: string[];    // 전제 심화 ID (전부 활성이어야 투자 가능)
}

export interface ArtDef {
  id: string;
  name: string;
  faction: Faction;
  isSimbeop: boolean;
  artType: ArtType;        // 'active' | 'passive'
  cost: number;            // 포인트 비용 (심법은 별개)
  baseSimdeukCost: number;
  attackMessages: string[];
  grades: ArtGrade[];
  masteries: MasteryDef[];
}

// 심득 비용 배율: 1→2: x1, 2→3: x2.5, 3→4: x6, 4→5: x12, 5→6: x25
export const GRADE_COST_MULTIPLIERS = [0, 1, 2.5, 6, 12, 25];

export function getSimdeukForGrade(baseCost: number, targetGrade: number): number {
  if (targetGrade <= 1) return 0;
  return Math.floor(baseCost * GRADE_COST_MULTIPLIERS[targetGrade - 1]);
}

export const ARTS: ArtDef[] = [
  {
    id: 'samjae_sword',
    name: '삼재검법',
    faction: 'neutral',
    isSimbeop: false,
    artType: 'active',
    cost: 1,
    baseSimdeukCost: 80,
    attackMessages: [
      '삼재검법의 검기가 빛난다!',
      '삼재의 이치를 담은 일격!',
      '삼재검법으로 베어냈다!',
    ],
    grades: [
      { grade: 1, effect: '위력 12 / 발동 55%', power: 12, triggerRate: 0.55 },
      { grade: 2, effect: '위력 18 / 발동 55%', power: 18, triggerRate: 0.55 },
      { grade: 3, effect: '위력 26 / 발동 60%', power: 26, triggerRate: 0.60 },
      { grade: 4, effect: '위력 36 / 발동 60%', power: 36, triggerRate: 0.60 },
      { grade: 5, effect: '위력 48 / 발동 65%', power: 48, triggerRate: 0.65 },
    ],
    masteries: [
      {
        stage: 1, requiredGrade: 2, requiredTier: 0, pointCost: 1,
        id: 'samjae_sword_residual',
        name: '검기 잔류',
        description: '미발동 시 데미지 = floor(현재 성급 power x 계수). 평타 5 대체',
      },
      {
        stage: 2, requiredGrade: 3, requiredTier: 0, pointCost: 1,
        id: 'samjae_sword_double',
        name: '이연격',
        description: '5% 확률 2연타',
      },
      {
        stage: 3, requiredGrade: 4, requiredTier: 1, pointCost: 2,
        id: 'samjae_sword_critical',
        name: '파쇄',
        description: '3% 치명타 x1.3',
      },
      {
        stage: 4, requiredGrade: 5, requiredTier: 2, pointCost: 2,
        id: 'samjae_sword_penetrate',
        name: '삼재관통',
        description: '검기 잔류 히트에도 이연격/파쇄 판정 적용',
        requires: ['samjae_sword_residual'],
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
    baseSimdeukCost: 60,
    attackMessages: [],
    grades: [
      { grade: 1, effect: '내공 +1/초', neigongPerSec: 1 },
      { grade: 2, effect: '내공 +1.5/초', neigongPerSec: 1.5 },
      { grade: 3, effect: '내공 +2.5/초', neigongPerSec: 2.5 },
      { grade: 4, effect: '내공 +3.5/초', neigongPerSec: 3.5 },
      { grade: 5, effect: '내공 +5/초', neigongPerSec: 5 },
    ],
    masteries: [
      {
        stage: 1, requiredGrade: 2, requiredTier: 0, pointCost: 1,
        id: 'samjae_simbeop_combat',
        name: '전투 수련',
        description: '전투 중 내공 = 비전투 생산 x 계수',
      },
      {
        stage: 2, requiredGrade: 3, requiredTier: 0, pointCost: 1,
        id: 'samjae_simbeop_heal',
        name: '기혈순환',
        description: '내공->HP 변환 추가 보너스 5%',
      },
      {
        stage: 3, requiredGrade: 4, requiredTier: 1, pointCost: 2,
        id: 'samjae_simbeop_burst',
        name: '내공 폭발',
        description: '60초마다 내공 burst (비전투 시에만)',
      },
      {
        stage: 4, requiredGrade: 5, requiredTier: 2, pointCost: 2,
        id: 'samjae_simbeop_mastery',
        name: '심법 대성',
        description: '전투 중 내공 회복률 추가 상승',
        requires: ['samjae_simbeop_combat'],
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
    baseSimdeukCost: 100,
    attackMessages: [],
    grades: [
      { grade: 1, effect: '회피 +3%', dodge: 3 },
      { grade: 2, effect: '회피 +5%', dodge: 5 },
      { grade: 3, effect: '회피 +8%', dodge: 8 },
      { grade: 4, effect: '회피 +12%', dodge: 12 },
      { grade: 5, effect: '회피 +15%', dodge: 15 },
    ],
    masteries: [
      {
        stage: 1, requiredGrade: 2, requiredTier: 0, pointCost: 1,
        id: 'mudang_step_gyeongbo',
        name: '경보',
        description: 'hunt 킬 시에도 HP 5% 회복',
      },
      {
        stage: 2, requiredGrade: 3, requiredTier: 0, pointCost: 1,
        id: 'mudang_step_simdeuk',
        name: '심득 강화',
        description: '심득 +5%',
      },
      {
        stage: 3, requiredGrade: 4, requiredTier: 1, pointCost: 2,
        id: 'mudang_step_dodge',
        name: '보법 숙련',
        description: '회피 상한 25% -> 30%',
      },
      {
        stage: 4, requiredGrade: 5, requiredTier: 2, pointCost: 2,
        id: 'mudang_step_fullbody',
        name: '무당 전신',
        description: '회피 성공 시 HP 소량 회복',
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
    baseSimdeukCost: 200,
    attackMessages: [],
    grades: [
      { grade: 1, effect: '내공 +3/초', neigongPerSec: 3 },
      { grade: 2, effect: '내공 +4.5/초', neigongPerSec: 4.5 },
      { grade: 3, effect: '내공 +7/초', neigongPerSec: 7 },
      { grade: 4, effect: '내공 +10/초', neigongPerSec: 10 },
      { grade: 5, effect: '내공 +14/초', neigongPerSec: 14 },
    ],
    masteries: [
      {
        stage: 1, requiredGrade: 2, requiredTier: 0, pointCost: 1,
        id: 'heupgong_combat',
        name: '전투 수련',
        description: '전투 중 내공 생산 (삼재심법과 동일 구조)',
      },
      {
        stage: 2, requiredGrade: 3, requiredTier: 0, pointCost: 1,
        id: 'heupgong_heal_enhance',
        name: '흡혈 강화',
        description: '처치 시 HP 4% 흡수',
      },
      {
        stage: 3, requiredGrade: 4, requiredTier: 1, pointCost: 2,
        id: 'heupgong_accel',
        name: '흡공 가속',
        description: '적 HP 낮을수록 흡수량 증가',
        requires: ['heupgong_heal_enhance'],
      },
      {
        stage: 4, requiredGrade: 5, requiredTier: 2, pointCost: 2,
        id: 'heupgong_morale',
        name: '사기충천',
        description: '처치 시 다음 1회 공격에 심득의 n% power 가산. 중첩 불가',
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
    baseSimdeukCost: 150,
    attackMessages: [],
    grades: [
      { grade: 1, effect: '최대HP +20', hpBonus: 20 },
      { grade: 2, effect: '최대HP +35', hpBonus: 35 },
      { grade: 3, effect: '최대HP +55', hpBonus: 55 },
      { grade: 4, effect: '최대HP +80', hpBonus: 80 },
      { grade: 5, effect: '최대HP +110', hpBonus: 110 },
    ],
    masteries: [
      {
        stage: 1, requiredGrade: 2, requiredTier: 0, pointCost: 1,
        id: 'gangche_tough',
        name: '강인',
        description: '받는 피해 5% 감소',
      },
      {
        stage: 2, requiredGrade: 3, requiredTier: 0, pointCost: 1,
        id: 'gangche_reinforce',
        name: '근골강화',
        description: '강체술 HP 보너스 x1.5',
      },
      {
        stage: 3, requiredGrade: 4, requiredTier: 1, pointCost: 2,
        id: 'gangche_unyielding',
        name: '불굴',
        description: 'HP 30% 이하일 때 받는 피해 10% 추가 감소',
        requires: ['gangche_tough'],
      },
      {
        stage: 4, requiredGrade: 5, requiredTier: 2, pointCost: 2,
        id: 'gangche_ironwall',
        name: '철벽지체',
        description: '3% 확률로 피해 완전 무효화',
      },
    ],
  },
];

export function getArtDef(id: string): ArtDef | undefined {
  return ARTS.find(a => a.id === id);
}

export function getArtGrade(art: ArtDef, grade: number): ArtGrade | undefined {
  return art.grades.find(g => g.grade === grade);
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
