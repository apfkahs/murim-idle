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

export interface EnhanceStep {
  maxUnits: number;           // 최대 투입량
  probabilityPerUnit: number; // 1개당 확률 증가분
  maxChance: number;          // 최대 성공 확률
  stats: EquipStats;          // 성공 시 교체되는 전체 스탯
}

export interface KillCountGrowth {
  effectType: 'dot';
  baseDotDamage: number;          // 30
  dotChance: number;              // 0.15
  maxDotStacks: number;           // 3 (초기)
  dotDuration: number;            // 10
  damageGainPerKills: number;     // 2500킬마다 독 데미지 +1
  stackGainPerKills: number;      // 50000킬마다 최대 스택 +1
  maxKillCount: number;           // 100000
}

export interface EquipmentDef {
  id: string;
  name: string;
  slot: EquipSlot;
  rarity: EquipRarity;
  stats: EquipStats;
  description: string;
  imageKey?: string;
  enhanceable?: boolean;
  enhanceMaterialId?: string;
  enhanceSteps?: EnhanceStep[];
  killCountGrowth?: KillCountGrowth;
}

export interface EquipmentInstance {
  instanceId: string;
  defId: string;
  obtainedFrom: string;
  obtainedAt: number;
  enhanceLevel?: number;   // 0~3, 기본 0
  killCount?: number;      // 킬카운트 성장용, 기본 0
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
  // ── 흑풍채 장비 ──
  {
    id: 'tough_armor',
    name: '질긴 갑옷',
    slot: 'armor',
    rarity: 'refined',
    stats: { bonusFixedDmgReduction: 25, bonusHpPercent: 0.15 },
    description: '흑풍 목령견의 가죽을 겹겹이 이어 만든 갑옷. 두꺼운 섬유가 칼날과 주먹을 모두 흡수한다. 받는 피해를 고정 25 감소시키고, 최대 체력이 15% 증가한다.',
    enhanceable: true,
    enhanceMaterialId: 'heugpung_stone',
    enhanceSteps: [
      { maxUnits: 20, probabilityPerUnit: 0.05, maxChance: 1.0, stats: { bonusFixedDmgReduction: 30, bonusHpPercent: 0.17 } },
      { maxUnits: 20, probabilityPerUnit: 0.04, maxChance: 0.8, stats: { bonusFixedDmgReduction: 35, bonusHpPercent: 0.19 } },
      { maxUnits: 20, probabilityPerUnit: 0.03, maxChance: 0.6, stats: { bonusFixedDmgReduction: 40, bonusHpPercent: 0.22 } },
    ],
  },
  {
    id: 'heugpung_sword',
    name: '흑풍검(黑風劍)',
    slot: 'weapon',
    rarity: 'superior',
    stats: { bonusAtk: 80, bonusCritRate: 0.07, bonusCritDmgPercent: 0.09 },
    description: '흑풍채 낭인의 도(刀)를 녹여 다시 벼린 검. 검신(劍身)에 검은 기운이 서려 있어 치명적인 일격을 더욱 날카롭게 만든다. 공격력 +80, 치명타 확률 +7%, 치명타 피해 +9%.',
    enhanceable: true,
    enhanceMaterialId: 'heugpung_stone',
    enhanceSteps: [
      { maxUnits: 20, probabilityPerUnit: 0.05, maxChance: 1.0, stats: { bonusAtk: 90, bonusCritRate: 0.08, bonusCritDmgPercent: 0.10 } },
      { maxUnits: 20, probabilityPerUnit: 0.04, maxChance: 0.8, stats: { bonusAtk: 110, bonusCritRate: 0.09, bonusCritDmgPercent: 0.12 } },
      { maxUnits: 20, probabilityPerUnit: 0.03, maxChance: 0.6, stats: { bonusAtk: 130, bonusCritRate: 0.10, bonusCritDmgPercent: 0.15 } },
    ],
  },
  {
    id: 'hyeoldok_gloves',
    name: '혈독 장갑',
    slot: 'gloves',
    rarity: 'superior',
    stats: {},
    description: '적의 피를 흡수할수록 독이 강해지는 보물 장갑. 흑풍채의 독 전문가가 비밀리에 제작했다 전해진다.',
    killCountGrowth: {
      effectType: 'dot',
      baseDotDamage: 30,
      dotChance: 0.15,
      maxDotStacks: 3,
      dotDuration: 10,
      damageGainPerKills: 2500,
      stackGainPerKills: 50000,
      maxKillCount: 100000,
    },
  },
  // ── 녹림맹 총순찰사자 장비 ──
  {
    id: 'nokrim_herald_boots',
    name: '녹림의 전령(綠林-傳令)',
    slot: 'boots',
    rarity: 'superior',
    stats: {},
    description: '녹림맹 총순찰사자가 지급하는 특수 신발. 장비 자체에 기본 능력은 없으나, 녹림의 영역 선포를 무시하며, 녹림권과 녹림보법을 함께 장착하면 숙련도 획득이 30% 증가한다.',
  },
  {
    id: 'saja_gitbal',
    name: '사자의 깃발(獅子-旗)',
    slot: 'weapon',
    rarity: 'superior',
    stats: { bonusAtk: 160, bonusCritRate: 0.12, bonusCritDmgPercent: 0.16 },
    description: '녹림맹 총순찰사자의 상징. 공격력 +160, 치명타 +12%, 치명타 피해 +16%. 매 공격 시 5% 확률로 공격력이 15% 증가하는 전투 고양을 부여한다(3턴, 합연산).',
  },
  // ── 배화교 장비 ──
  {
    id: 'sarajinun_bulggot_boots',
    name: '사라지는 불꽃',
    slot: 'boots',
    rarity: 'superior',
    stats: {},
    description: '배화교 성화의 마지막 숨결로 빚은 신발. 식화심법을 함께 익히면 기운 생산이 35% 증가하고, 성화보법과 함께 익히면 보법 숙련도 획득이 30% 증가한다. 불씨 스택을 10초마다 1씩 소각한다.',
    imageKey: 'sarajinun_bulggot_boots',
  },
  {
    id: 'tamsik_bulggot_weapon',
    name: '탐식하는 불꽃',
    slot: 'weapon',
    rarity: 'superior',
    // 검법 장착 시 절초배율 보너스: killStacksSum 5만 +1.0 / 10만 +2.0 (tamsikUtils.getTamsikSwordUltBonus).
    stats: { bonusAtk: 100, bonusCritRate: 0.05, bonusCritDmgPercent: 0.10 },
    description: '배화교 몬스터를 처치하고 잔불을 투입할수록 성장하는 무기. 공격력·치명타·치명타 피해가 스택에 따라 100/+5%/+10%에서 300/+15%/+30%까지 오른다.',
    imageKey: 'tamsik_bulggot_weapon',
  },
  // ── 배화교 검법 장비 ──
  {
    id: 'bulssui_sword',
    name: '불씨의 검',
    slot: 'weapon',
    rarity: 'superior',
    stats: { bonusAtk: 158, bonusCritRate: 0.11, bonusCritDmgPercent: 0.15 },
    description: '꺼지지 않은 한 점 불씨를 검신에 묶어 둔 도검. 적의 살 위에 옮겨 붙은 불씨가 짙어질수록 검 끝의 무게도 같이 자라난다. 강화할수록 불씨 스택당 추가 공격력이 붙는다.',
    imageKey: 'bulssui_sword',
    enhanceable: true,
    enhanceMaterialId: 'hayan_jae',
    enhanceSteps: [
      { maxUnits: 150, probabilityPerUnit: 1 / 150, maxChance: 1.0,
        stats: { bonusAtk: 172, bonusCritRate: 0.12, bonusCritDmgPercent: 0.17 } },
      { maxUnits: 300, probabilityPerUnit: 1 / 300, maxChance: 1.0,
        stats: { bonusAtk: 186, bonusCritRate: 0.13, bonusCritDmgPercent: 0.20 } },
      { maxUnits: 450, probabilityPerUnit: 1 / 450, maxChance: 1.0,
        stats: { bonusAtk: 200, bonusCritRate: 0.15, bonusCritDmgPercent: 0.22 } },
      { maxUnits: 600, probabilityPerUnit: 1 / 600, maxChance: 1.0,
        stats: { bonusAtk: 215, bonusCritRate: 0.16, bonusCritDmgPercent: 0.24 } },
      { maxUnits: 750, probabilityPerUnit: 1 / 750, maxChance: 1.0,
        stats: { bonusAtk: 235, bonusCritRate: 0.17, bonusCritDmgPercent: 0.26 } },
    ],
  },
  {
    id: 'ash_armor',
    name: '재의 갑옷',
    slot: 'armor',
    rarity: 'superior',
    stats: { bonusFixedDmgReduction: 42, bonusHpPercent: 0.22 },
    description: '식어버린 잿더미를 한 겹 한 겹 다져 빚은 갑옷. 살갗에 옮겨 붙은 불씨가 깊어질수록 잿빛 결이 두꺼워져, 적의 일격을 한 호흡 더 늦춘다.',
    imageKey: 'ash_armor',
    enhanceable: true,
    enhanceMaterialId: 'hayan_jae',
    enhanceSteps: [
      { maxUnits: 150, probabilityPerUnit: 1 / 150, maxChance: 1.0,
        stats: { bonusFixedDmgReduction: 50, bonusHpPercent: 0.25 } },
      { maxUnits: 300, probabilityPerUnit: 1 / 300, maxChance: 1.0,
        stats: { bonusFixedDmgReduction: 58, bonusHpPercent: 0.28 } },
      { maxUnits: 450, probabilityPerUnit: 1 / 450, maxChance: 1.0,
        stats: { bonusFixedDmgReduction: 68, bonusHpPercent: 0.32 } },
      { maxUnits: 600, probabilityPerUnit: 1 / 600, maxChance: 1.0,
        stats: { bonusFixedDmgReduction: 83, bonusHpPercent: 0.36 } },
      { maxUnits: 750, probabilityPerUnit: 1 / 750, maxChance: 1.0,
        stats: { bonusFixedDmgReduction: 100, bonusHpPercent: 0.40 } },
    ],
  },
];

export function getEquipmentDef(id: string): EquipmentDef | undefined {
  return EQUIPMENT.find(e => e.id === id);
}
