/**
 * 재료 & 제작법 데이터
 */

export interface MaterialDef {
  id: string;
  name: string;
  description: string;
}

export interface RecipeDef {
  id: string;
  name: string;
  description: string;
  materialId: string;           // 사용 재료 ID
  probabilityPerUnit: number;   // 재료 1개당 성공 확률 (0~1)
  maxUnits: number;             // 최대 투입 가능 개수 (= 100% 성공 지점)
  resultEquipId: string;
}

export const MATERIALS: MaterialDef[] = [
  {
    id: 'wood_fragment',
    name: '나무 조각',
    description: '수련용 나무인형에서 깎여 나온 조각. 무언가를 만드는 데 쓸 수 있을 것 같다.',
  },
  {
    id: 'iron_fragment',
    name: '철 조각',
    description: '수련용 철인형에서 뜯겨 나온 쇳조각. 단단하게 단련된 무쇠의 기운이 남아 있다.',
  },
];

export const RECIPES: RecipeDef[] = [
  {
    id: 'recipe_sturdy_wooden_sword',
    name: '튼튼한 목검',
    description: '반듯하게 다듬어진 목검. 무게 중심이 잘 잡혀 실전에도 무리가 없다.',
    materialId: 'wood_fragment',
    probabilityPerUnit: 0.02,
    maxUnits: 50,
    resultEquipId: 'sturdy_wooden_sword',
  },
  {
    id: 'recipe_sturdy_iron_sword',
    name: '튼튼한 철검',
    description: '철 조각을 모아 벼려낸 검. 묵직한 무게가 일격에 담긴 내력을 배가시킨다.',
    materialId: 'iron_fragment',
    probabilityPerUnit: 0.01,
    maxUnits: 100,
    resultEquipId: 'sturdy_iron_sword',
  },
];

export function getMaterialDef(id: string): MaterialDef | undefined {
  return MATERIALS.find(m => m.id === id);
}

export function getRecipeDef(id: string): RecipeDef | undefined {
  return RECIPES.find(r => r.id === id);
}
