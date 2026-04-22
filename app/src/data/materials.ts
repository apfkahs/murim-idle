/**
 * 재료 & 제작법 데이터
 */

export interface MaterialDef {
  id: string;
  name: string;
  description: string;
  excludeFromDropBonus?: boolean;  // 숙련도 차이 드랍률 보정 제외 여부
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
  {
    id: 'stinky_leather',
    name: '냄새나는 가죽 조각',
    description: '야산의 곰에게서 벗겨낸 두꺼운 가죽. 냄새가 고약하지만 가공하면 쓸 만한 방구를 만들 수 있다.',
  },
  {
    id: 'map_fragment',
    name: '지도 조각',
    description: '누군가 찢어놓은 지도의 일부. 뭔가를 가리키는 것 같다.',
  },
  {
    id: 'demonic_note',
    name: '마기에 물든 쪽지',
    description: '마기가 짙게 서려있는 쪽지. 내용을 해독하기 어렵다.',
  },
  {
    id: 'bijup_nokrim_geoksan',
    name: '격산타우(隔山打牛) 비급서',
    description: '녹림의 절기. 강렬한 일권을 격산타우로 승화시키는 비결이 담겨 있다.',
  },
  // ── 객잔 개편 신규 재료 ──
  {
    id: 'jeoposaem_scroll',
    name: '철포삼 수련법 책자',
    description: '철포삼의 기초 단련법이 기록된 낡은 책자. 몸을 강철처럼 만드는 외공의 첫걸음이 담겨 있다.',
  },
  {
    id: 'bijup_jeoposaem',
    name: '철포삼 비전서',
    description: '철포삼의 오의(奧義)가 담긴 비전서. 완전한 외공의 경지에 이른 자만이 그 진의를 이해할 수 있다.',
  },
  {
    id: 'hwan_do_fragment',
    name: '환도 파편',
    description: '삼류 도적 두목이 휘두르던 쌍도(雙刀)에서 떨어진 파편. 날이 무뎌졌지만 녹여 재단하면 쓸 만한 무기를 만들 수 있다.',
  },
  {
    id: 'samjae_simbeop_upper',
    name: '삼재심법 비급서 상편',
    description: '삼재심법의 상위 수련법이 담긴 비급서의 상편. 하편과 합쳐야 진의를 깨달을 수 있다.',
  },
  {
    id: 'samjae_simbeop_lower',
    name: '삼재심법 비급서 하편',
    description: '삼재심법의 오의가 담긴 비급서의 하편. 상편과 합쳐야 심법의 진수를 완성할 수 있다.',
  },
  {
    id: 'heugpungchae_map',
    name: '흑풍채 지도',
    description: '흑풍채로 가는 길이 표시된 지도. 지도 조각들을 이어붙여 만든 것이다.',
  },
  {
    id: 'gongdong_map',
    name: '공동파 지도',
    description: '공동파의 위치가 기록된 지도. 지도 조각들을 이어붙여 완성했다.',
  },
  {
    id: 'secret_order',
    name: '비밀 지령서',
    description: '마기에 물든 쪽지들을 해독하여 완성한 비밀 지령서. 어딘가 음험한 조직의 냄새가 난다.',
  },
  // ── 흑풍채 재료 ──
  {
    id: 'tough_leather',
    name: '질긴 가죽',
    description: '흑풍 목령견에게서 뜯어낸 단단하고 질긴 가죽. 보통 가죽보다 훨씬 내구성이 뛰어나 방어구 재료로 쓸 수 있을 것 같다.',
  },
  {
    id: 'heugpung_stone',
    name: '흑풍석',
    description: '흑풍채 일대에서만 채취되는 검은 기운이 서린 돌. 흑풍채 도적들이 기를 불어넣어 단련한 흔적이 있다.',
  },
  {
    id: 'heugpung_sword_fragment',
    name: '흑풍도 파편',
    description: '흑도 낭인이 사용하던 도(刀)에서 부러진 파편. 사파의 기운이 짙게 배어 있어 그냥 버리기도 찜찜하다.',
  },
  {
    id: 'bijup_nokrim_move1',
    name: '녹림보법 비급서 전편',
    description: '녹림의 발법(足法) 전반부가 담긴 비급서. 후편과 합쳐야 온전한 녹림보법을 익힐 수 있다.',
  },
  {
    id: 'bijup_nokrim_move2',
    name: '녹림보법 비급서 후편',
    description: '녹림의 발법(足法) 후반부가 담긴 비급서. 전편과 합쳐야 진정한 녹림의 신법을 완성할 수 있다.',
  },
  // ── 녹림맹 총순찰사자 재료 ──
  {
    id: 'bijup_nokrim_bobeop_3',
    name: '녹림보법 비급: 야수보법',
    description: '녹림보법의 최종 오의가 담긴 비급서. 야수의 본능으로 회피하고 반격하는 극의(極意)가 기록되어 있다. 10등급 이상의 녹림보법 수련자만 이해할 수 있다.',
  },
  {
    id: 'chanran_heugpung_stone',
    name: '찬란한 흑풍석',
    description: '총순찰사자가 남긴 특별한 흑풍석. 일반 흑풍석보다 훨씬 밀도 높은 기운이 깃들어 있어 장비를 확실하게 강화할 수 있다.',
  },
  // ── 배화교 재료 ──
  {
    id: 'huimihan_janbul',
    name: '희미한 잔불',
    description: '행자의 옷깃에서 떨어진 미세한 불씨. 아직 꺼지지 않은 성화의 숨결이 깃들어 있다.',
    excludeFromDropBonus: true,
  },
  {
    id: 'taoreuneun_bulggot_pyeon',
    name: '타오르는 불꽃 파편',
    description: '배화교 내문 수좌의 손끝에서 타오르던 불꽃이 응결된 파편. 잔불보다 거칠고 깊은 열기를 품고 있다.',
    excludeFromDropBonus: true,
  },
  {
    id: 'shinseonghan_bul_ui_jeongsu',
    name: '신성한 불의 정수',
    description: '배화교 사원 가장 안쪽, 성화가 스스로 응축된 한 점의 정수. 한 줌만으로도 일평생의 수련을 뒤흔든다.',
    excludeFromDropBonus: true,
  },
  {
    id: 'baekji_mugongseo',
    name: '백지무공서',
    description: '꿈 같은 공간에서 건네받은 아무것도 적히지 않은 비급. 진기를 불어넣으면 문양이 드러날 듯하다.',
  },
];

export const RECIPES: RecipeDef[] = [
  {
    id: 'recipe_crude_wooden_sword',
    name: '조잡한 목검',
    description: '나무를 대충 깎아 만든 목검. 균형은 엉망이지만 없는 것보다는 낫다.',
    materialId: 'wood_fragment',
    probabilityPerUnit: 1.0,
    maxUnits: 1,
    resultEquipId: 'crude_wooden_sword',
  },
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
  {
    id: 'recipe_crude_leather_armor',
    name: '조잡한 가죽 갑옷',
    description: '냄새나는 가죽 조각으로 엮어 만든 방어구. 조잡하지만 없는 것보다는 낫다.',
    materialId: 'stinky_leather',
    probabilityPerUnit: 0.10,
    maxUnits: 10,
    resultEquipId: 'crude_leather_armor',
  },
  {
    id: 'recipe_sturdy_leather_armor',
    name: '튼튼한 가죽 갑옷',
    description: '가죽 조각을 꼼꼼히 겹쳐 만든 방어구. 몸을 든든하게 지켜준다.',
    materialId: 'stinky_leather',
    probabilityPerUnit: 0.01,
    maxUnits: 100,
    resultEquipId: 'sturdy_leather_armor',
  },
  {
    id: 'recipe_steel_hwando',
    name: '강철 환도',
    description: '환도 파편을 모아 강철로 벼려낸 묵직한 환도. 공격력과 치명타 확률이 오른다.',
    materialId: 'hwan_do_fragment',
    probabilityPerUnit: 0.01,
    maxUnits: 100,
    resultEquipId: 'steel_hwando',
  },
  // ── 흑풍채 장비 레시피 ──
  {
    id: 'recipe_tough_armor',
    name: '질긴 갑옷',
    description: '흑풍 목령견의 질긴 가죽을 엮어 만든 갑옷. 받는 피해를 줄이고 체력을 크게 늘려준다.',
    materialId: 'tough_leather',
    probabilityPerUnit: 0.01,
    maxUnits: 100,
    resultEquipId: 'tough_armor',
  },
  {
    id: 'recipe_heugpung_sword',
    name: '흑풍검',
    description: '흑풍도 파편을 녹여 다시 벼린 검. 치명적인 일격이 더욱 날카로워진다.',
    materialId: 'heugpung_sword_fragment',
    probabilityPerUnit: 0.01,
    maxUnits: 100,
    resultEquipId: 'heugpung_sword',
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
  {
    materialId: 'bijup_nokrim_geoksan',
    artId: 'nokrim_fist',
    masteryId: 'nokrim_fist_geoksan',
    requiredArtGrade: 4,
  },
  {
    materialId: 'bijup_jeoposaem',
    artId: 'jeoposaem',
    masteryId: 'jeoposaem_secret',
    requiredArtGrade: 1,
  },
  // ── 녹림보법 비급 ──
  {
    materialId: 'bijup_nokrim_move1',
    artId: 'nokrim_bobeop',
    masteryId: 'nokrim_bobeop_move1',
    requiredArtGrade: 8,
  },
  {
    materialId: 'bijup_nokrim_move2',
    artId: 'nokrim_bobeop',
    masteryId: 'nokrim_bobeop_move2',
    requiredArtGrade: 8,
  },
  {
    materialId: 'bijup_nokrim_bobeop_3',
    artId: 'nokrim_bobeop',
    masteryId: 'nokrim_bobeop_move3',
    requiredArtGrade: 10,
  },
];

export function getBijupDef(materialId: string): BijupDef | undefined {
  return BIJUP_DEFS.find(b => b.materialId === materialId);
}

export function getBijupDefByMastery(masteryId: string): BijupDef | undefined {
  return BIJUP_DEFS.find(b => b.masteryId === masteryId);
}

export const ART_RECIPES: ArtRecipeDef[] = [
  // ── 객잔 개편 신규 레시피 ──
  {
    id: 'art_recipe_jeoposaem',
    name: '철포삼 해금',
    description: '철포삼 수련법 책자를 통해 외공의 기초를 익힌다.',
    materialId: 'jeoposaem_scroll',
    materialCount: 1,
    resultArtId: 'jeoposaem',
  },
  {
    id: 'art_recipe_heugpungchae_map',
    name: '흑풍채 지도 제작',
    description: '지도 조각 20장을 이어붙여 흑풍채로 가는 길을 완성한다.',
    materialId: 'map_fragment',
    materialCount: 20,
    resultMaterialId: 'heugpungchae_map',
  },
  {
    id: 'art_recipe_gongdong_map',
    name: '공동파 지도 제작',
    description: '지도 조각 30장을 이어붙여 공동파의 위치를 특정한다.',
    materialId: 'map_fragment',
    materialCount: 30,
    resultMaterialId: 'gongdong_map',
  },
  {
    id: 'art_recipe_secret_order',
    name: '비밀 지령서 해독',
    description: '마기에 물든 쪽지 50장을 해독하여 비밀 지령서를 완성한다.',
    materialId: 'demonic_note',
    materialCount: 50,
    resultMaterialId: 'secret_order',
  },
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

// ── 복합 재료 제작 레시피 (복수 재료 소모, 무공 해금) ──
export interface CompoundArtRecipeDef {
  id: string;
  name: string;
  description: string;
  materials: { materialId: string; materialCount: number }[];
  requiresArtId?: string;     // 이 무공 보유 시에만 표시
  resultMasteryId?: string;   // discoveredMasteries에 추가
  resultArtId?: string;       // ownedArts에 추가
}

export const COMPOUND_ART_RECIPES: CompoundArtRecipeDef[] = [
  {
    id: 'compound_samjae_simbeop_oui',
    name: '삼재심법 오의 해금',
    description: '삼재심법 비급서 상·하편을 합쳐 심법의 진수를 깨닫는다.',
    materials: [
      { materialId: 'samjae_simbeop_upper', materialCount: 1 },
      { materialId: 'samjae_simbeop_lower', materialCount: 1 },
    ],
    requiresArtId: 'samjae_simbeop',
    resultMasteryId: 'samjae_simbeop_oui',
  },
];

export function getCompoundArtRecipeDef(id: string): CompoundArtRecipeDef | undefined {
  return COMPOUND_ART_RECIPES.find(r => r.id === id);
}
