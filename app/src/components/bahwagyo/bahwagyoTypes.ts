// components/bahwagyo/bahwagyoTypes.ts
// 배화교 스킬트리 타입 정의

export type BranchId = 'sword' | 'mind' | 'outer' | 'mystery';

export type NodeType =
  | 'multiplier'
  | 'finisher'
  | 'critRate'
  | 'critDmg'
  | 'finisherBoost'
  | 'atkSpeed';

/**
 * 노드에 해금되는 단계별 특성(10/20/30 Lv 등).
 * 무공 초식과 유사하게 모달 하단에 카드로 노출되며,
 * 아직 도달하지 못한 특성은 "직전 1개만 미리보기, 나머지는 ???" 규칙으로 점진 공개된다.
 */
export interface TraitDef {
  level: number;        // 해금 요구 레벨 (예: 10, 20, 30)
  name: string;         // 특성 이름 (예: "성화의 숨결")
  description: string;  // 효과 설명 (한두 줄)
}

export interface SkillNodeDef {
  id: string;
  name: string;
  type: NodeType;
  tier: 1 | 2 | 3;
  branch: Exclude<BranchId, 'mystery'>;
  subArt?: 'bobeop' | 'defense';  // outer 노드에만 사용
  isRoot?: boolean;         // 최초 활성 노드 (초식 배율)
  requiresRoot?: boolean;   // 루트 1레벨 이상 필요
  description: string;      // 무협 세계관 플레이버 (이탤릭체)
  functional: string;       // 기능 요약 — 한 줄로 "무엇을 하는지"
  effectSummary?: string;   // 레벨당 성장 요약 (예: "레벨당 기운 생산 +0.303%p") — 있으면 functional 밑에 별도 줄로 노출
  baseMax: number;           // 기본 만렙
  expandedMax?: number[];    // [expandLevel=1 만렙, expandLevel=2 만렙]
  // 레벨별 효과 (표시용)
  effectPerLevel: number;    // 레벨당 증가량
  effectUnit: string;        // '%' | '개' | 's' 등
  // 설계가 확정되지 않은 placeholder 노드 — 레벨업 불가, 회색 표시
  placeholder?: boolean;
  // 단계 해금형 특성 (10/20/30Lv 등). 정렬된 순서로 제공.
  traits?: TraitDef[];
}

export interface ExchangeRate {
  id: string;
  direction: 'up' | 'down';
  fromResource: 'ember' | 'flame' | 'divine';
  toResource: 'ember' | 'flame' | 'divine';
  fromAmount: number;
  toAmount: number;
}

// 비용 자원 결정
export type CostResource = 'ember' | 'flame' | 'divine';

export interface BahwagyoState {
  activeBranch: BranchId;
  resources: {
    ember: number;
    flame: number;
    divine: number;
  };
  // 비급: 'sword-t1', 'sword-t2', ... 형태
  scrolls: Record<string, number>;
  // 노드 레벨: 'sword-t1-1', ... 형태
  nodeLevels: Record<string, number>;
  // 단계 해금: 'sword-2', 'sword-3', ... 형태
  unlockedTiers: Record<string, boolean>;
  // 만렙 확장 레벨 (0=기본, 1=상위, 2=최상위)
  expandLevel: 0 | 1 | 2;
  mysteryFragments: {
    first: boolean;
    second: boolean;
  };
  // 모달 상태
  selectedNodeId: string | null;
  showLockedModal: { branch: Exclude<BranchId, 'mystery'>; tier: 2 | 3 } | null;
}

export type NodeState = 'normal' | 'dimmed' | 'no_resource' | 'maxed';
