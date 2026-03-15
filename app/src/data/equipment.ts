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
}

export interface EquipmentDef {
  id: string;
  name: string;
  slot: EquipSlot;
  rarity: EquipRarity;
  stats: EquipStats;
  description: string;
}

export interface EquipmentInstance {
  instanceId: string;
  defId: string;
  obtainedFrom: string;
  obtainedAt: number;
}

// 장비 정의 -- 추후 데이터 추가
export const EQUIPMENT: EquipmentDef[] = [];

export function getEquipmentDef(id: string): EquipmentDef | undefined {
  return EQUIPMENT.find(e => e.id === id);
}
