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
