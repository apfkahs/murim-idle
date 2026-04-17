// components/bahwagyo/bahwagyoData.ts
// 배화교 스킬트리 노드 데이터 + 환전 비율 + 초기 상태

import type { SkillNodeDef, ExchangeRate, BahwagyoState } from './bahwagyoTypes';

// ──────────────────────────────────────────
// 검법 노드 (8개)
// ──────────────────────────────────────────
const swordNodes: SkillNodeDef[] = [
  // 1단계 (4개)
  {
    id: 'sword-t1-1',
    name: '초식 배율',
    type: 'multiplier',
    tier: 1,
    branch: 'sword',
    isRoot: true,
    description: '염화검법 초식의 위력을 높인다.',
    functional: '공격 시 배율 증가',
    baseMax: 30,
    expandedMax: [45, 50],
    effectPerLevel: 3,
    effectUnit: '%',
  },
  {
    id: 'sword-t1-2',
    name: '절초',
    type: 'finisher',
    tier: 1,
    branch: 'sword',
    requiresRoot: true,
    description: '염화검법의 절초를 해방한다.',
    functional: '절초 기술 추가',
    baseMax: 30,
    expandedMax: [45, 50],
    effectPerLevel: 2,
    effectUnit: '%',
  },
  {
    id: 'sword-t1-3',
    name: '치명타 확률',
    type: 'critRate',
    tier: 1,
    branch: 'sword',
    requiresRoot: true,
    description: '치명적 일격의 가능성을 키운다.',
    functional: '치명타 확률 증가',
    baseMax: 30,
    expandedMax: [45, 50],
    effectPerLevel: 1,
    effectUnit: '%',
  },
  {
    id: 'sword-t1-4',
    name: '치명타 피해',
    type: 'critDmg',
    tier: 1,
    branch: 'sword',
    requiresRoot: true,
    description: '치명적 일격의 파괴력을 높인다.',
    functional: '치명타 피해 증가',
    baseMax: 30,
    expandedMax: [45, 50],
    effectPerLevel: 2,
    effectUnit: '%',
  },
  // 2단계 (2개)
  {
    id: 'sword-t2-1',
    name: '절초 강화 1',
    type: 'finisherBoost',
    tier: 2,
    branch: 'sword',
    description: '염화검법 절초의 파괴력을 더욱 높인다.',
    functional: '절초 피해 증가',
    baseMax: 15,
    expandedMax: [20],
    effectPerLevel: 5,
    effectUnit: '%',
  },
  {
    id: 'sword-t2-2',
    name: '공격 속도',
    type: 'atkSpeed',
    tier: 2,
    branch: 'sword',
    description: '검을 휘두르는 속도를 높인다.',
    functional: '공격 속도 증가',
    baseMax: 15,
    expandedMax: [20],
    effectPerLevel: 2,
    effectUnit: '%',
  },
  // 3단계 (2개)
  {
    id: 'sword-t3-1',
    name: '절초 강화 3',
    type: 'finisherBoost',
    tier: 3,
    branch: 'sword',
    description: '극한까지 단련된 절초가 불꽃을 품는다.',
    functional: '절초 피해 대폭 증가',
    baseMax: 5,
    effectPerLevel: 10,
    effectUnit: '%',
  },
  {
    id: 'sword-t3-2',
    name: '절초 강화 4',
    type: 'finisherBoost',
    tier: 3,
    branch: 'sword',
    description: '화염이 절초에 깃들어 천하무적의 경지에 오른다.',
    functional: '절초 추가 효과',
    baseMax: 5,
    effectPerLevel: 10,
    effectUnit: '%',
  },
];

// ──────────────────────────────────────────
// 심법 노드
// ──────────────────────────────────────────
const mindNodes: SkillNodeDef[] = [
  {
    id: 'mind-t1-1',
    name: '심공 배율',
    type: 'multiplier',
    tier: 1,
    branch: 'mind',
    isRoot: true,
    description: '배화심공의 내력을 더욱 깊이 쌓는다.',
    functional: '내력 회복 배율 증가',
    baseMax: 30,
    expandedMax: [45, 50],
    effectPerLevel: 3,
    effectUnit: '%',
  },
  {
    id: 'mind-t1-2',
    name: '심공 연소',
    type: 'finisher',
    tier: 1,
    branch: 'mind',
    requiresRoot: true,
    description: '내력에 불의 기운을 담는다.',
    functional: '화염 속성 부여',
    baseMax: 30,
    expandedMax: [45, 50],
    effectPerLevel: 2,
    effectUnit: '%',
  },
  {
    id: 'mind-t1-3',
    name: '내력 증폭',
    type: 'critRate',
    tier: 1,
    branch: 'mind',
    requiresRoot: true,
    description: '단전에 쌓인 내력을 폭발적으로 방출한다.',
    functional: '내력 최대치 증가',
    baseMax: 30,
    expandedMax: [45, 50],
    effectPerLevel: 1,
    effectUnit: '%',
  },
  {
    id: 'mind-t1-4',
    name: '기운 집중',
    type: 'critDmg',
    tier: 1,
    branch: 'mind',
    requiresRoot: true,
    description: '기운을 한곳에 집중시켜 위력을 극대화한다.',
    functional: '집중 시 피해 증가',
    baseMax: 30,
    expandedMax: [45, 50],
    effectPerLevel: 2,
    effectUnit: '%',
  },
  {
    id: 'mind-t2-1',
    name: '심공 강화 1',
    type: 'finisherBoost',
    tier: 2,
    branch: 'mind',
    description: '심공의 기반을 더욱 단단히 쌓는다.',
    functional: '심공 효과 증가',
    baseMax: 15,
    expandedMax: [20],
    effectPerLevel: 5,
    effectUnit: '%',
  },
  {
    id: 'mind-t2-2',
    name: '기운 순환',
    type: 'atkSpeed',
    tier: 2,
    branch: 'mind',
    description: '기운의 흐름을 원활히 하여 전투력을 높인다.',
    functional: '기운 순환 속도 증가',
    baseMax: 15,
    expandedMax: [20],
    effectPerLevel: 2,
    effectUnit: '%',
  },
  {
    id: 'mind-t3-1',
    name: '심공 강화 3',
    type: 'finisherBoost',
    tier: 3,
    branch: 'mind',
    description: '심공이 극에 달하여 불꽃의 정수를 흡수한다.',
    functional: '심공 대폭 강화',
    baseMax: 5,
    effectPerLevel: 10,
    effectUnit: '%',
  },
  {
    id: 'mind-t3-2',
    name: '심공 강화 4',
    type: 'finisherBoost',
    tier: 3,
    branch: 'mind',
    description: '불의 도를 터득하여 천하제일의 심공을 완성한다.',
    functional: '심공 추가 효과',
    baseMax: 5,
    effectPerLevel: 10,
    effectUnit: '%',
  },
];

// ──────────────────────────────────────────
// 보법 노드
// ──────────────────────────────────────────
const stepNodes: SkillNodeDef[] = [
  {
    id: 'step-t1-1',
    name: '신법 배율',
    type: 'multiplier',
    tier: 1,
    branch: 'step',
    isRoot: true,
    description: '화염보법의 이동 속도를 높인다.',
    functional: '이동 속도 배율 증가',
    baseMax: 30,
    expandedMax: [45, 50],
    effectPerLevel: 3,
    effectUnit: '%',
  },
  {
    id: 'step-t1-2',
    name: '잔영',
    type: 'finisher',
    tier: 1,
    branch: 'step',
    requiresRoot: true,
    description: '빠른 이동으로 잔영을 남긴다.',
    functional: '회피 확률 증가',
    baseMax: 30,
    expandedMax: [45, 50],
    effectPerLevel: 2,
    effectUnit: '%',
  },
  {
    id: 'step-t1-3',
    name: '연속 보법',
    type: 'critRate',
    tier: 1,
    branch: 'step',
    requiresRoot: true,
    description: '연속으로 방향을 바꾸며 적을 교란한다.',
    functional: '연속 회피 확률 증가',
    baseMax: 30,
    expandedMax: [45, 50],
    effectPerLevel: 1,
    effectUnit: '%',
  },
  {
    id: 'step-t1-4',
    name: '화염 궤적',
    type: 'critDmg',
    tier: 1,
    branch: 'step',
    requiresRoot: true,
    description: '발걸음마다 화염의 자취를 남긴다.',
    functional: '이동 시 화염 피해',
    baseMax: 30,
    expandedMax: [45, 50],
    effectPerLevel: 2,
    effectUnit: '%',
  },
  {
    id: 'step-t2-1',
    name: '신법 강화 1',
    type: 'finisherBoost',
    tier: 2,
    branch: 'step',
    description: '신법의 기초를 더욱 단단히 다진다.',
    functional: '신법 효과 증가',
    baseMax: 15,
    expandedMax: [20],
    effectPerLevel: 5,
    effectUnit: '%',
  },
  {
    id: 'step-t2-2',
    name: '순간 이동',
    type: 'atkSpeed',
    tier: 2,
    branch: 'step',
    description: '번개처럼 빠르게 위치를 바꾼다.',
    functional: '순간 이동 발동 확률',
    baseMax: 15,
    expandedMax: [20],
    effectPerLevel: 2,
    effectUnit: '%',
  },
  {
    id: 'step-t3-1',
    name: '신법 강화 3',
    type: 'finisherBoost',
    tier: 3,
    branch: 'step',
    description: '신법이 불의 춤처럼 아름답고 치명적으로 변한다.',
    functional: '신법 대폭 강화',
    baseMax: 5,
    effectPerLevel: 10,
    effectUnit: '%',
  },
  {
    id: 'step-t3-2',
    name: '신법 강화 4',
    type: 'finisherBoost',
    tier: 3,
    branch: 'step',
    description: '화염 속에서 피어나는 나비처럼 자유자재로 움직인다.',
    functional: '신법 추가 효과',
    baseMax: 5,
    effectPerLevel: 10,
    effectUnit: '%',
  },
];

// ──────────────────────────────────────────
// 외법 노드
// ──────────────────────────────────────────
const outerNodes: SkillNodeDef[] = [
  {
    id: 'outer-t1-1',
    name: '외공 배율',
    type: 'multiplier',
    tier: 1,
    branch: 'outer',
    isRoot: true,
    description: '배화외공의 방어력을 높인다.',
    functional: '방어 배율 증가',
    baseMax: 30,
    expandedMax: [45, 50],
    effectPerLevel: 3,
    effectUnit: '%',
  },
  {
    id: 'outer-t1-2',
    name: '불꽃 갑주',
    type: 'finisher',
    tier: 1,
    branch: 'outer',
    requiresRoot: true,
    description: '불꽃으로 몸을 감싸 방어막을 형성한다.',
    functional: '화염 방어막 생성',
    baseMax: 30,
    expandedMax: [45, 50],
    effectPerLevel: 2,
    effectUnit: '%',
  },
  {
    id: 'outer-t1-3',
    name: '반격',
    type: 'critRate',
    tier: 1,
    branch: 'outer',
    requiresRoot: true,
    description: '공격을 받는 순간 반격의 기회를 포착한다.',
    functional: '반격 확률 증가',
    baseMax: 30,
    expandedMax: [45, 50],
    effectPerLevel: 1,
    effectUnit: '%',
  },
  {
    id: 'outer-t1-4',
    name: '강인함',
    type: 'critDmg',
    tier: 1,
    branch: 'outer',
    requiresRoot: true,
    description: '강철 같은 육체로 어떤 타격도 버텨낸다.',
    functional: '피해 감소 증가',
    baseMax: 30,
    expandedMax: [45, 50],
    effectPerLevel: 2,
    effectUnit: '%',
  },
  {
    id: 'outer-t2-1',
    name: '외공 강화 1',
    type: 'finisherBoost',
    tier: 2,
    branch: 'outer',
    description: '외공의 기반을 더욱 견고히 다진다.',
    functional: '외공 효과 증가',
    baseMax: 15,
    expandedMax: [20],
    effectPerLevel: 5,
    effectUnit: '%',
  },
  {
    id: 'outer-t2-2',
    name: '불굴의 의지',
    type: 'atkSpeed',
    tier: 2,
    branch: 'outer',
    description: '어떤 역경에도 굴하지 않는 정신력을 기른다.',
    functional: '피격 시 반격 위력 증가',
    baseMax: 15,
    expandedMax: [20],
    effectPerLevel: 2,
    effectUnit: '%',
  },
  {
    id: 'outer-t3-1',
    name: '외공 강화 3',
    type: 'finisherBoost',
    tier: 3,
    branch: 'outer',
    description: '불꽃이 피부에 스며들어 천하제일의 방어를 이룬다.',
    functional: '외공 대폭 강화',
    baseMax: 5,
    effectPerLevel: 10,
    effectUnit: '%',
  },
  {
    id: 'outer-t3-2',
    name: '외공 강화 4',
    type: 'finisherBoost',
    tier: 3,
    branch: 'outer',
    description: '화신이 되어 어떤 공격도 튕겨낸다.',
    functional: '외공 추가 효과',
    baseMax: 5,
    effectPerLevel: 10,
    effectUnit: '%',
  },
];

// ──────────────────────────────────────────
// 전체 노드 맵
// ──────────────────────────────────────────
export const ALL_NODES: SkillNodeDef[] = [
  ...swordNodes,
  ...mindNodes,
  ...stepNodes,
  ...outerNodes,
];

export const NODE_MAP: Record<string, SkillNodeDef> = Object.fromEntries(
  ALL_NODES.map(n => [n.id, n])
);

// ──────────────────────────────────────────
// 환전 비율
// ──────────────────────────────────────────
export const EXCHANGE_RATES: ExchangeRate[] = [
  { id: 'up-1', direction: 'up', fromResource: 'ember', toResource: 'flame', fromAmount: 400, toAmount: 20 },
  { id: 'up-2', direction: 'up', fromResource: 'flame', toResource: 'divine', fromAmount: 20, toAmount: 1 },
  { id: 'down-1', direction: 'down', fromResource: 'divine', toResource: 'flame', fromAmount: 1, toAmount: 5 },
  { id: 'down-2', direction: 'down', fromResource: 'flame', toResource: 'ember', fromAmount: 5, toAmount: 25 },
];

// ──────────────────────────────────────────
// 초기 상태 (목업)
// ──────────────────────────────────────────
export const INITIAL_STATE: BahwagyoState = {
  activeBranch: 'sword',
  resources: {
    ember: 1234,
    flame: 45,
    divine: 2,
  },
  scrolls: {
    'sword-t1': 3,
    'sword-t2': 1,
    'sword-t3': 0,
    'mind-t1': 0,
    'mind-t2': 0,
    'mind-t3': 0,
    'step-t1': 0,
    'step-t2': 0,
    'step-t3': 0,
    'outer-t1': 0,
    'outer-t2': 0,
    'outer-t3': 0,
  },
  nodeLevels: {
    'sword-t1-1': 5,
    'sword-t1-2': 3,
    'sword-t1-3': 0,
    'sword-t1-4': 0,
    'sword-t2-1': 0,
    'sword-t2-2': 0,
    'sword-t3-1': 0,
    'sword-t3-2': 0,
    'mind-t1-1': 0,
    'mind-t1-2': 0,
    'mind-t1-3': 0,
    'mind-t1-4': 0,
    'mind-t2-1': 0,
    'mind-t2-2': 0,
    'mind-t3-1': 0,
    'mind-t3-2': 0,
    'step-t1-1': 0,
    'step-t1-2': 0,
    'step-t1-3': 0,
    'step-t1-4': 0,
    'step-t2-1': 0,
    'step-t2-2': 0,
    'step-t3-1': 0,
    'step-t3-2': 0,
    'outer-t1-1': 0,
    'outer-t1-2': 0,
    'outer-t1-3': 0,
    'outer-t1-4': 0,
    'outer-t2-1': 0,
    'outer-t2-2': 0,
    'outer-t3-1': 0,
    'outer-t3-2': 0,
  },
  unlockedTiers: {
    'sword-2': false,
    'sword-3': false,
    'mind-2': false,
    'mind-3': false,
    'step-2': false,
    'step-3': false,
    'outer-2': false,
    'outer-3': false,
  },
  expandLevel: 0,
  mysteryFragments: {
    first: true,
    second: false,
  },
  selectedNodeId: null,
  showLockedModal: null,
};

// ──────────────────────────────────────────
// 초기화용 리셋 상태 (nodeLevels 모두 0, 자원 복원)
// ──────────────────────────────────────────
export function makeResetState(current: BahwagyoState): BahwagyoState {
  const resetLevels: Record<string, number> = {};
  for (const key of Object.keys(current.nodeLevels)) {
    resetLevels[key] = 0;
  }
  return {
    ...INITIAL_STATE,
    activeBranch: current.activeBranch,
    nodeLevels: resetLevels,
    unlockedTiers: {
      'sword-2': false, 'sword-3': false,
      'mind-2': false, 'mind-3': false,
      'step-2': false, 'step-3': false,
      'outer-2': false, 'outer-3': false,
    },
    selectedNodeId: null,
    showLockedModal: null,
  };
}

// ──────────────────────────────────────────
// 헬퍼: 노드의 현재 만렙 계산
// ──────────────────────────────────────────
export function getNodeMax(node: SkillNodeDef, expandLevel: 0 | 1 | 2): number {
  if (!node.expandedMax || node.expandedMax.length === 0) return node.baseMax;
  if (expandLevel === 2 && node.expandedMax.length >= 2) return node.expandedMax[1];
  if (expandLevel >= 1 && node.expandedMax.length >= 1) return node.expandedMax[0];
  return node.baseMax;
}

// ──────────────────────────────────────────
// 헬퍼: 레벨업 비용 자원 결정
// ──────────────────────────────────────────
export function getCostResource(node: SkillNodeDef, currentLevel: number): 'ember' | 'flame' | 'divine' {
  if (node.tier === 1) {
    if (currentLevel >= 45) return 'divine';
    if (currentLevel >= 30) return 'flame';
    return 'ember';
  }
  return node.tier === 2 ? 'flame' : 'divine';
}

// ──────────────────────────────────────────
// 헬퍼: 레벨업 비용 (정수 개수)
// ──────────────────────────────────────────
export function getLevelUpCost(node: SkillNodeDef, currentLevel: number): number {
  if (node.tier === 1) {
    if (currentLevel >= 45) return 5;
    if (currentLevel >= 30) return 3;
    return 50;
  }
  if (node.tier === 2) return 30;
  return 10;
}

// ──────────────────────────────────────────
// 헬퍼: 2단계 해금 비용
// ──────────────────────────────────────────
export const TIER2_UNLOCK_COST_EMBER = 10000;
export const TIER2_UNLOCK_REQ_NODES = 2;
export const TIER2_UNLOCK_NODE_MIN_LEVEL = 20;

export const TIER3_UNLOCK_COST_FLAME = 500;
export const TIER3_UNLOCK_REQ_LEVEL = 12;

// 자원 이름 표시
export const RESOURCE_NAMES: Record<string, string> = {
  ember: '희미한 잔불',
  flame: '타오르는 불꽃 파편',
  divine: '신성한 불의 정수',
};

export const RESOURCE_ICONS: Record<string, string> = {
  ember: '🔥',
  flame: '🔥',
  divine: '✨',
};

// 브랜치 이름 매핑 (공용)
export const BRANCH_NAMES: Record<Exclude<import('./bahwagyoTypes').BranchId, 'mystery'>, string> = {
  sword: '검법',
  mind: '심법',
  step: '보법',
  outer: '외법',
};

// 노드 이름 약어 (앞 두 글자)
export function getAbbrev(name: string): string {
  const chars = [...name];
  if (chars.length >= 2) return chars[0] + chars[1];
  return chars[0] ?? '?';
}
