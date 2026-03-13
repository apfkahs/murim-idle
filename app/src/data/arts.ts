/**
 * 무공 데이터 (v1.1)
 * DPS 제거. power + triggerRate + artType 체계.
 * 4종: 삼재검법(액티브), 삼재심법(심법), 어설픈 무당보법(패시브), 조악한 흡공술(심법)
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
  passive?: string;
  passiveDesc?: string;
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
      { grade: 2, effect: '위력 18 / 발동 55%', power: 18, triggerRate: 0.55, passive: 'double_strike', passiveDesc: '5% 2연타' },
      { grade: 3, effect: '위력 26 / 발동 60%', power: 26, triggerRate: 0.60 },
      { grade: 4, effect: '위력 36 / 발동 60%', power: 36, triggerRate: 0.60, passive: 'critical', passiveDesc: '치명타 3% (x1.3)' },
      { grade: 5, effect: '위력 48 / 발동 65%', power: 48, triggerRate: 0.65 },
    ],
  },
  {
    id: 'samjae_simbeop',
    name: '삼재심법',
    faction: 'neutral',
    isSimbeop: true,
    artType: 'passive', // 심법은 passive (발동 판정 미참여)
    cost: 0,
    baseSimdeukCost: 60,
    attackMessages: [],
    grades: [
      { grade: 1, effect: '내공 +1/초', neigongPerSec: 1 },
      { grade: 2, effect: '내공 +1.5/초', neigongPerSec: 1.5, passive: 'heal_bonus', passiveDesc: '내공->HP 시 5% 추가' },
      { grade: 3, effect: '내공 +2.5/초', neigongPerSec: 2.5 },
      { grade: 4, effect: '내공 +3.5/초', neigongPerSec: 3.5, passive: 'neigong_burst', passiveDesc: '60초마다 내공 (생산량x8)' },
      { grade: 5, effect: '내공 +5/초', neigongPerSec: 5 },
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
      { grade: 2, effect: '회피 +5%', dodge: 5, passive: 'post_battle_heal', passiveDesc: '전투 종료 후 HP 5%' },
      { grade: 3, effect: '회피 +8%', dodge: 8 },
      { grade: 4, effect: '회피 +12%', dodge: 12, passive: 'simdeuk_bonus', passiveDesc: '심득 +5%' },
      { grade: 5, effect: '회피 +15%', dodge: 15 },
    ],
  },
  {
    id: 'heupgong',
    name: '조악한 흡공술',
    faction: 'evil',
    isSimbeop: true,
    artType: 'passive', // 심법은 passive
    cost: 0,
    baseSimdeukCost: 200,
    attackMessages: [],
    grades: [
      { grade: 1, effect: '내공 +3/초', neigongPerSec: 3 },
      { grade: 2, effect: '내공 +4.5/초', neigongPerSec: 4.5, passive: 'lifesteal', passiveDesc: '적 처치시 HP 2% 흡수' },
      { grade: 3, effect: '내공 +7/초', neigongPerSec: 7 },
      { grade: 4, effect: '내공 +10/초', neigongPerSec: 10, passive: 'lifesteal2', passiveDesc: '적 처치시 HP 4%' },
      { grade: 5, effect: '내공 +14/초', neigongPerSec: 14 },
    ],
  },
];

export function getArtDef(id: string): ArtDef | undefined {
  return ARTS.find(a => a.id === id);
}

export function getArtGrade(art: ArtDef, grade: number): ArtGrade | undefined {
  return art.grades.find(g => g.grade === grade);
}

export function getAllPassives(artId: string, currentGrade: number): ArtGrade[] {
  const art = getArtDef(artId);
  if (!art) return [];
  return art.grades.filter(g => g.grade <= currentGrade && g.passive);
}
