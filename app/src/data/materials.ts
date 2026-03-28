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
  materialCosts: { materialId: string; count: number }[];
  resultEquipId: string;
}

export const MATERIALS: MaterialDef[] = [
  {
    id: 'wood_fragment',
    name: '나무 조각',
    description: '수련용 나무인형에서 깎여 나온 조각. 무언가를 만드는 데 쓸 수 있을 것 같다.',
  },
];

export const RECIPES: RecipeDef[] = [
  {
    id: 'recipe_crude_wooden_sword',
    name: '조잡한 목검',
    description: '나무 조각을 대충 깎아 만든 목검. 실전보다는 감각 유지에 가깝다.',
    materialCosts: [{ materialId: 'wood_fragment', count: 10 }],
    resultEquipId: 'crude_wooden_sword',
  },
  {
    id: 'recipe_sturdy_wooden_sword',
    name: '튼튼한 목검',
    description: '반듯하게 다듬어진 목검. 무게 중심이 잘 잡혀 실전에도 무리가 없다.',
    materialCosts: [{ materialId: 'wood_fragment', count: 100 }],
    resultEquipId: 'sturdy_wooden_sword',
  },
];

export function getMaterialDef(id: string): MaterialDef | undefined {
  return MATERIALS.find(m => m.id === id);
}

export function getRecipeDef(id: string): RecipeDef | undefined {
  return RECIPES.find(r => r.id === id);
}
