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
  bonusFixedDmgReduction?: number;  // 고정 데미지 감소 (절댓값, 분산 후 차감)
  bonusHpPercent?: number;          // 최대 HP % 증가 (0.10 = +10%)
  bonusCritDmgPercent?: number;     // 치명타 피해 % 증가 (0.10 = +10%)
  bonusDmgTakenPercent?: number;    // 받는 피해 % 증가 패널티 (0.05 = +5%)
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
    id: 'crude_leather_armor',
    name: '조잡한 가죽 갑옷',
    slot: 'armor',
    rarity: 'common',
    stats: { bonusFixedDmgReduction: 5 },
    description: '냄새나는 가죽 조각으로 만든 투박한 갑옷. 적의 공격에서 받는 피해를 5 감소시킨다.',
  },
  {
    id: 'sturdy_leather_armor',
    name: '튼튼한 가죽 갑옷',
    slot: 'armor',
    rarity: 'refined',
    stats: { bonusFixedDmgReduction: 12, bonusHpPercent: 0.10 },
    description: '꼼꼼히 겹쳐 만든 가죽 갑옷. 적의 공격 피해를 12 감소시키고, 최대 체력이 10% 증가한다.',
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
  {
    id: 'steel_hwando',
    name: '강철 환도',
    slot: 'weapon',
    rarity: 'refined',
    stats: { bonusAtk: 30, bonusCritRate: 0.05 },
    description: '환도 파편을 모아 강철로 벼려낸 묵직한 환도. 공격력 +30, 치명타 확률 +5%.',
  },
  {
    id: 'heugak_sword',
    name: '흑영검(黑影劍)',
    slot: 'weapon',
    rarity: 'superior',
    stats: { bonusAtk: 100, bonusCritRate: 0.08, bonusCritDmgPercent: 0.10, bonusDmgTakenPercent: 0.05 },
    description: '사기(邪氣)가 깃든 검. 공격력 +100, 치명타 +8%, 치명타 피해 +10%. 받는 피해 5% 증가.',
  },
];

export function getEquipmentDef(id: string): EquipmentDef | undefined {
  return EQUIPMENT.find(e => e.id === id);
}
