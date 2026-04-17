// components/bahwagyo/bahwagyoTypes.ts
// 배화교 스킬트리 타입 정의

export type BranchId = 'sword' | 'mind' | 'step' | 'outer' | 'mystery';

export type NodeType =
  | 'multiplier'
  | 'finisher'
  | 'critRate'
  | 'critDmg'
  | 'finisherBoost'
  | 'atkSpeed';

export interface SkillNodeDef {
  id: string;
  name: string;
  type: NodeType;
  tier: 1 | 2 | 3;
  branch: Exclude<BranchId, 'mystery'>;
  isRoot?: boolean;         // 최초 활성 노드 (초식 배율)
  requiresRoot?: boolean;   // 루트 1레벨 이상 필요
  description: string;
  functional: string;
  baseMax: number;           // 기본 만렙
  expandedMax?: number[];    // [expandLevel=1 만렙, expandLevel=2 만렙]
  // 레벨별 효과 (표시용)
  effectPerLevel: number;    // 레벨당 증가량
  effectUnit: string;        // '%' | '개' | 's' 등
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
