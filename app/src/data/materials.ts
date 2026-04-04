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
  requiresUnlock?: boolean;     // true이면 unlockedRecipes에 있어야 제작 창에 표시
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
  {
    id: 'torn_paper',
    name: '찢겨진 종이',
    description: '야산 어딘가에 흩어져 있던 낡은 무공서의 조각들. 더 모으면 무언가를 복원할 수 있을 것 같다.',
  },
  // ── 비급 ──
  {
    id: 'bijup_samjae_sense',
    name: '삼재검법 비급: 삼재의 감각',
    description: '싸울수록 몸이 적의 움직임을 읽기 시작한다는 비전이 담긴 비급. 2등급 이상의 삼재검법 수련자만 소화할 수 있다.',
  },
  {
    id: 'bijup_samjae_mastery',
    name: '삼재검법 비급: 검의 숙련',
    description: '반복된 수련 끝에 검 자체와 하나가 되는 경지를 기록한 비급. 3등급 이상이 되어야 그 진의를 이해할 수 있다.',
  },
  {
    id: 'bijup_samjae_taesan',
    name: '삼재검법 비급: 태산압정',
    description: '삼재검법의 오의를 담은 극비 비급. 4등급에 이른 자만이 무게를 담은 일격을 구현할 수 있다.',
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

export interface ArtRecipeDef {
  id: string;
  name: string;
  description: string;
  materialId: string;
  materialCount: number;        // 필요 재료 수 (고정, 확률 없음)
  resultArtId?: string;         // ownedArts에 추가
  resultMasteryId?: string;     // discoveredMasteries에 추가
  resultMaterialId?: string;    // materials 인벤토리에 추가 (비급 제작 등)
  requiresArtId?: string;       // 이 무공 보유 시에만 표시
  requiresMasteryId?: string;   // 이 초식이 발견된 시에만 표시
}

// ── 비급(秘笈) 정의 ──
export interface BijupDef {
  materialId: string;        // materials 인벤토리 키 (MaterialDef.id)
  artId: string;             // 해당 무공 ID
  masteryId: string;         // 해금되는 초식 ID
  requiredArtGrade: number;  // 사용에 필요한 최소 무공 등급 (stageIndex + 1)
}

export const BIJUP_DEFS: BijupDef[] = [
  {
    materialId: 'bijup_samjae_sense',
    artId: 'samjae_sword',
    masteryId: 'samjae_sword_sense',
    requiredArtGrade: 2,
  },
  {
    materialId: 'bijup_samjae_mastery',
    artId: 'samjae_sword',
    masteryId: 'samjae_sword_mastery',
    requiredArtGrade: 3,
  },
  {
    materialId: 'bijup_samjae_taesan',
    artId: 'samjae_sword',
    masteryId: 'samjae_sword_taesan',
    requiredArtGrade: 4,
  },
];

export function getBijupDef(materialId: string): BijupDef | undefined {
  return BIJUP_DEFS.find(b => b.materialId === materialId);
}

export function getBijupDefByMastery(masteryId: string): BijupDef | undefined {
  return BIJUP_DEFS.find(b => b.masteryId === masteryId);
}

export const ART_RECIPES: ArtRecipeDef[] = [
  {
    id: 'art_recipe_crude_bobeop',
    name: '조악한 무명보법 복원',
    description: '흩어진 보법서 조각 20장을 이어붙여 낡은 보법의 원형을 복원한다.',
    materialId: 'torn_paper', materialCount: 20,
    resultArtId: 'crude_bobeop',
  },
  {
    id: 'art_recipe_crude_bobeop_1',
    name: '허술한 발놀림 해금',
    description: '30장을 더 모아 첫 번째 초식을 판독해낸다.',
    materialId: 'torn_paper', materialCount: 30,
    resultMasteryId: 'crude_bobeop_1',
    requiresArtId: 'crude_bobeop',
  },
  {
    id: 'art_recipe_crude_bobeop_2',
    name: '가벼운 보법 해금',
    description: '60장을 추가로 모아 두 번째 초식의 원리를 깨친다.',
    materialId: 'torn_paper', materialCount: 60,
    resultMasteryId: 'crude_bobeop_2',
    requiresArtId: 'crude_bobeop',
    requiresMasteryId: 'crude_bobeop_1',
  },
  {
    id: 'art_recipe_crude_bobeop_3',
    name: '바람걸음 해금',
    description: '100장을 더 모아 마침내 보법서 전체를 복원한다.',
    materialId: 'torn_paper', materialCount: 100,
    resultMasteryId: 'crude_bobeop_3',
    requiresArtId: 'crude_bobeop',
    requiresMasteryId: 'crude_bobeop_2',
  },
];

export function getArtRecipeDef(id: string): ArtRecipeDef | undefined {
  return ART_RECIPES.find(r => r.id === id);
}
