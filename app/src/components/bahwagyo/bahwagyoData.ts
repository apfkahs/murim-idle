// components/bahwagyo/bahwagyoData.ts
// 배화교 스킬트리 노드 데이터 + 환전 비율 + 초기 상태

import type { SkillNodeDef, ExchangeRate, BahwagyoState } from './bahwagyoTypes';

// ──────────────────────────────────────────
// 검법 노드 (8개)
// ──────────────────────────────────────────
const swordNodes: SkillNodeDef[] = [
  // 1단계 (4개) — 검법 가지 전면 잠금(placeholder). 설계 확정 시 placeholder 제거.
  {
    id: 'sword-t1-1',
    name: '초식 배율',
    type: 'multiplier',
    tier: 1,
    branch: 'sword',
    isRoot: true,
    placeholder: true,
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
    placeholder: true,
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
    placeholder: true,
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
    placeholder: true,
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
    placeholder: true,
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
    placeholder: true,
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
    placeholder: true,
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
    placeholder: true,
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
    name: '심법 개방',
    type: 'multiplier',
    tier: 1,
    branch: 'mind',
    isRoot: true,
    description: '내쉬는 숨에 성화 한 점이 스스로 잦아든다.',
    functional: '식화심법을 개방해 불씨를 25초마다 한 스택씩 자동으로 태운다.',
    effectSummary: '레벨당 기운 생산 +0.303%p · 1Lv 부터 전투 기운 비율 25% 확보',
    baseMax: 30,
    expandedMax: [45, 50],
    effectPerLevel: 0.303,
    effectUnit: '%',
    traits: [
      {
        level: 10,
        name: '깊은 호흡',
        description: '전투 중 기운 비율이 25% → 35% 로 확장되어 내력 수급이 빨라진다.',
      },
      {
        level: 30,
        name: '성화 일체',
        description: '전투 중 기운 비율이 35% → 50% 로 확장되어 장기전 내력이 크게 늘어난다.',
      },
    ],
  },
  {
    id: 'mind-t1-2',
    name: '재의 묵념',
    type: 'finisher',
    tier: 1,
    branch: 'mind',
    requiresRoot: true,
    description: '꺼진 불의 재 위에 잠시 숨을 얹는다. 몸은 그만큼 다시 살아난다.',
    functional: '불씨가 자동 소각될 때 남은 불씨 스택 수에 비례해 체력을 회복한다.',
    effectSummary: '레벨당 최대 체력 +0.01%p/스택 (1Lv = 0.2%/스택, 최대 20스택 참조)',
    baseMax: 30,
    expandedMax: [45, 50],
    effectPerLevel: 0.01,
    effectUnit: '%p/스택',
  },
  {
    id: 'mind-t1-3',
    name: '재의 맹세',
    type: 'critRate',
    tier: 1,
    branch: 'mind',
    requiresRoot: true,
    description: '사라진 불 하나하나가 팔 끝으로 옮겨 앉는다.',
    functional: '불씨가 자동 소각될 때 남은 불씨 스택 수에 비례해 공격력이 잠시 오른다. (최대 3중첩 · 20초 지속)',
    effectSummary: '레벨당 ATK +0.005%p/스택 (1Lv = 0.1%/스택)',
    baseMax: 30,
    expandedMax: [45, 50],
    effectPerLevel: 0.005,
    effectUnit: '%p/스택',
  },
  {
    id: 'mind-t1-4',
    name: '재의 빠름',
    type: 'critDmg',
    tier: 1,
    branch: 'mind',
    requiresRoot: true,
    description: '숨을 짧게 끊는다. 불은 그보다 더 짧게 꺼진다.',
    functional: '레벨이 오를수록 불씨 자동 소각 주기가 짧아진다. (25초 → 5초 @ 30Lv)',
    effectSummary: '레벨당 약 -0.625초 · 만렙 30 고정 (상위 재화 투자 불가)',
    baseMax: 30,
    expandedMax: [],  // 상위 재화 투자 불가 (스펙 §1-3-4)
    effectPerLevel: 0.625,
    effectUnit: '초 감소',
    traits: [
      {
        level: 10,
        name: '성화의 숨결',
        description: '절초 발동 시 25% 확률로 내 불씨 1스택을 즉시 삭제한다.',
      },
      {
        level: 20,
        name: '겹불꽃',
        description: '위 효과가 발동할 때 25% 확률로 불씨 2스택을 삭제한다.',
      },
      {
        level: 30,
        name: '재의 끝',
        description: '절초 발동 시 100% 확률로 불씨를 삭제한다. (겹불꽃 2스택 삭제 조건 유지)',
      },
    ],
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
// 외법 노드 (보법·방어법 2개 독립 무공 병렬 노출)
// ──────────────────────────────────────────
const outerNodes: SkillNodeDef[] = [
  {
    id: 'outer-bobeop-open',
    name: '성화보법 개방',
    type: 'multiplier',
    tier: 1,
    branch: 'outer',
    subArt: 'bobeop',
    description: '배화교의 수행자들이 성화를 이고 산등성이를 달리던 순례의 걸음. 그 걸음을 훔친 이단자의 발 아래에선, 성화는 더 이상 지켜야 할 것이 아니다.',
    functional: '레벨이 오를수록 회피와 회피 카운터 확률이 상승한다.',
    effectSummary: '레벨당 회피 +0.5%p · 카운터 +1%p (기본 공속 하한 1.5초)',
    baseMax: 30,
    effectPerLevel: 0.5,
    effectUnit: '%p',
    traits: [
      {
        level: 10,
        name: '가벼운 걸음',
        description: '공격 속도 하한이 1.5초 → 1.4초 로 낮아진다.',
      },
      {
        level: 20,
        name: '바람의 걸음',
        description: '공격 속도 하한이 1.4초 → 1.3초 로 더 낮아진다.',
      },
      {
        level: 30,
        name: '성화의 걸음',
        description: '공격 속도 하한이 1.3초 → 1.2초 로 낮아지고, 회피·카운터 확률이 추가로 소폭 보정된다.',
      },
    ],
  },
  {
    id: 'outer-defense-open',
    name: '방어법 (미공개)',
    type: 'multiplier',
    tier: 1,
    branch: 'outer',
    subArt: 'defense',
    placeholder: true,
    description: '아직 전해지지 않은 외공. 철포삼의 비의가 배화교에서 어떻게 변형될지는 밝혀지지 않았다.',
    functional: '설계 미확정',
    baseMax: 0,
    effectPerLevel: 0,
    effectUnit: '',
  },
];

// ──────────────────────────────────────────
// 전체 노드 맵
// ──────────────────────────────────────────
export const ALL_NODES: SkillNodeDef[] = [
  ...swordNodes,
  ...mindNodes,
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
// T1 1단계 노드(잔불) Lv 0→1 ~ 29→30 비용 테이블. index = currentLevel.
// 9/19/29 구간은 특성 레벨(10/20/30 도달) 돌파 비용이라 스파이크.
//
// 기본 라인: 4,500 잔불 (심법 개방 · 성화보법 개방 등 루트 노드)
const T1_EMBER_COST_DEFAULT = [
  100,  30,  35,  40,  45,  50,  55,  60,  65, 200,  // 0→1 ... 9→10
   80,  90, 100, 110, 120, 130, 140, 150, 160, 350,  // 10→11 ... 19→20
  170, 180, 190, 200, 210, 220, 230, 240, 250, 500,  // 20→21 ... 29→30
];
// 재의 묵념 / 재의 맹세: 4,035 잔불 (기본의 ~90%)
const T1_EMBER_COST_ASH_RECOVERY = [
   90,  25,  30,  35,  40,  45,  50,  55,  60, 180,
   73,  81,  90,  98, 107, 115, 124, 132, 141, 315,
  151, 160, 170, 179, 189, 198, 208, 217, 227, 450,
];
// 재의 빠름: 6,268 잔불 (기본의 ~140%, 특수 노드 — 상위 재화 투자 불가이므로 잔불 비중이 큼)
const T1_EMBER_COST_ASH_FAST = [
  125,  38,  44,  50,  57,  63,  69,  75,  82, 300,
  110, 124, 138, 152, 165, 179, 193, 207, 220, 525,
  234, 248, 262, 275, 289, 303, 317, 330, 344, 750,
];

// 노드 ID 별 T1 잔불 비용 오버라이드. 미정의 노드는 DEFAULT 라인.
const T1_EMBER_COST_OVERRIDES: Record<string, number[]> = {
  'mind-t1-2': T1_EMBER_COST_ASH_RECOVERY,  // 재의 묵념
  'mind-t1-3': T1_EMBER_COST_ASH_RECOVERY,  // 재의 맹세
  'mind-t1-4': T1_EMBER_COST_ASH_FAST,      // 재의 빠름
};

export function getLevelUpCost(node: SkillNodeDef, currentLevel: number): number {
  if (node.tier === 1) {
    if (currentLevel >= 45) return 5;
    if (currentLevel >= 30) return 3;
    const table = T1_EMBER_COST_OVERRIDES[node.id] ?? T1_EMBER_COST_DEFAULT;
    return table[currentLevel] ?? 50;
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

// 자원 ↔ data/materials.ts ID 매핑. bahwagyoSlice 와 UI 는 모두 state.materials 를 source-of-truth 로 사용.
export const RESOURCE_MATERIAL_ID: Record<'ember' | 'flame' | 'divine', string> = {
  ember: 'huimihan_janbul',
  flame: 'taoreuneun_bulggot_pyeon',
  divine: 'shinseonghan_bul_ui_jeongsu',
};

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
  outer: '외법',
};

// 노드 이름 → 한자 1글자 매핑 (비급 카드 내부 표기)
const NODE_ABBREV_BY_NAME: Record<string, string> = {
  // 검법
  '초식 배율': '焰',
  '절초': '絶',
  '치명타 확률': '命',
  '치명타 피해': '破',
  '절초 강화 1': '強',
  '공격 속도': '迅',
  '절초 강화 3': '極',
  '절초 강화 4': '滅',
  // 심법
  '심법 개방': '心',
  '재의 묵념': '黙',
  '재의 맹세': '誓',
  '재의 빠름': '速',
  '심공 강화 1': '功',
  '기운 순환': '環',
  '심공 강화 3': '玄',
  '심공 강화 4': '道',
  // 외법
  '성화보법 개방': '步',
  '방어법 (미공개)': '秘',
};

export function getAbbrev(name: string): string {
  const mapped = NODE_ABBREV_BY_NAME[name];
  if (mapped) return mapped;
  const chars = [...name];
  return chars[0] ?? '?';
}
