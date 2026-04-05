/**
 * 장비 시스템 데이터 (v1.0)
 * 무기/갑옷/장갑/신발 4슬롯, 3등급
 */

export type EquipSlot = 'weapon' | 'armor' | 'gloves' | 'boots';
export type EquipRarity = 'common' | 'refined' | 'superior';

export interface EquipStats {
  bonusAtk?: number;
  bonusHp?: number;
  bonusCritRate?: number;
  bonusDodge?: number;
  bonusAtkSpeed?: number;
  bonusDmgReduction?: number;
  bonusQiMultiplier?: number;
}

export interface EquipmentDef {
  id: string;
  name: string;
  slot: EquipSlot;
  rarity: EquipRarity;
  stats: EquipStats;
  description: string;
  imageKey?: string;
}

export interface EquipmentInstance {
  instanceId: string;
  defId: string;
  obtainedFrom: string;
  obtainedAt: number;
}

// 장비 정의
export const EQUIPMENT: EquipmentDef[] = [
  {
    id: 'crude_wooden_sword',
    name: '조잡한 목검',
    slot: 'weapon',
    rarity: 'common',
    stats: { bonusAtk: 3 },
    description: '나무를 대충 깎아 만든 목검. 균형은 엉망이지만 없는 것보다는 낫다. 공격력이 3 증가한다.',
  },
  {
    id: 'sturdy_wooden_sword',
    name: '튼튼한 목검',
    slot: 'weapon',
    rarity: 'refined',
    stats: { bonusAtk: 6 },
    description: '반듯하게 다듬어진 목검. 무게 중심이 잘 잡혀 실전에도 무리가 없다. 공격력이 6 증가한다.',
  },
  {
    id: 'sturdy_iron_sword',
    name: '튼튼한 철검',
    slot: 'weapon',
    rarity: 'refined',
    stats: { bonusAtk: 10 },
    description: '철 조각을 모아 벼려낸 검. 묵직한 무게가 일격에 담긴 내력을 배가시킨다. 공격력이 10 증가한다.',
  },
  {
    id: 'gusan_gloves',
    name: '구산팔해(九山八海)의 풍요',
    slot: 'gloves',
    rarity: 'superior',
    stats: { bonusQiMultiplier: 0.15 },
    description: '당강에게서 얻은 대지의 기운이 깃든 장갑. 자연의 기운 획득량이 15% 증가한다.',
    imageKey: 'gusan_gloves',
  },
];

export function getEquipmentDef(id: string): EquipmentDef | undefined {
  return EQUIPMENT.find(e => e.id === id);
}
