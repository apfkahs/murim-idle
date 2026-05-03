// components/bahwagyo/bahwagyoData.ts
// 배화교 스킬트리 노드 데이터 + 환전 비율 + 초기 상태

import type { SkillNodeDef, ExchangeRate, BahwagyoState } from './bahwagyoTypes';

// ──────────────────────────────────────────
// 검법 노드 (성화검법) — 5개
// sword-main (루트, lv5 절초 해금) + sword-ult, sword-qi-manifest + 특성 placeholder 2개
// ──────────────────────────────────────────
const swordNodes: SkillNodeDef[] = [
  {
    id: 'sword-main',
    name: '성화검법(聖火劍法)',
    type: 'multiplier',
    tier: 1,
    branch: 'sword',
    isRoot: true,
    description: '배화교의 검은 불을 베지 않는다. 성화의 마음으로 사람의 몸을 베고, 그 길의 끝에서 다시 불을 본다.',
    functional: '초식 데미지 배율 증가, 5Lv에서 절초 해금.',
    effectSummary: '배율 성장 (1Lv = 1.5×, 20Lv 이상 = 2.8× 고정)',
    baseMax: 20,
    expandedMax: [30, 40],
    effectPerLevel: 5,
    effectUnit: '%',
    traits: [
      {
        level: 5,
        name: '검화합일(劍火合一)',
        description: '절초 해금. 이후 절초 배율 노드(sword-ult)가 함께 열린다.',
      },
      {
        level: 10,
        name: '화골입수(火骨入髓)',
        description: '성화의 기가 뼛속까지 스며든다. 검세가 한 차원 깊어진다. (초식 배율 도약 · 2.1×)',
      },
      {
        level: 20,
        name: '성화일도(聖火一刀)',
        description: '검이 곧 성화다. 한 줄의 검이 한 줄의 불이 된다. 성화검법의 극의에 이른다. (배율 2.8×)',
      },
    ],
  },
  {
    id: 'sword-ult',
    name: '검법 절초',
    type: 'finisher',
    tier: 1,
    branch: 'sword',
    requiresRoot: true,
    description: '검 하나에 호흡 셋, 그 마지막을 한 줄로 모은다.',
    functional: '절초 배율 증가. 특정 레벨에서 쿨타임 단축·내력폭발·성화공명 특성을 얻는다.',
    effectSummary: '배율 성장 (lv0 = 3.0×, 20Lv 이상 = 6.0× 고정)',
    baseMax: 20,
    expandedMax: [30, 40],
    effectPerLevel: 5,
    effectUnit: '%',
    traits: [
      { level: 5,  name: '검화숙련(劍火熟練)', description: '검과 불의 합일이 익숙해진다. 절초의 호흡이 빨라진다. (쿨타임 42초 → 35초)' },
      { level: 10, name: '기화폭발(氣火爆發)', description: '절초 발동 시 남은 내력이 성화와 함께 폭발한다. (최대 내력 20% 흡수 → 추가 피해, 검기 발현 X × 2)' },
      { level: 15, name: '성화일체(聖火一體)', description: '검·불·기운이 하나로 합쳐진다. 절초의 호흡이 다시 한번 빨라진다. (쿨타임 35초 → 25초)' },
      { level: 20, name: '성화공명(聖火共鳴)', description: '검법 단독 장착 시, 절초 10% 확률로 쿨타임을 소모하지 않는다.' },
    ],
  },
  {
    id: 'sword-qi-manifest',
    name: '검기 발현',
    type: 'finisherBoost',
    tier: 1,
    branch: 'sword',
    description: '검 끝에서 불씨가 솟구쳐 손에 닿지 않는 자도 베어낸다.',
    functional: '내력을 일부 소모해 절초에 추가 피해를 더한다.',
    effectSummary: '배율 성장 (1Lv = 3.5×, 20Lv 이상 = 15.0× 고정)',
    baseMax: 20,
    expandedMax: [30, 40],
    effectPerLevel: 0.5,
    effectUnit: 'X',
    traits: [
      {
        level: 10,
        name: '기날(氣刃)',
        description: '검 끝의 기운이 날을 이룬다. 내력을 더 깊이 소모해 검기를 불릴 수 있다. (소모 상한 5% → 7.5%)',
      },
      {
        level: 15,
        name: '기세(氣勢)',
        description: '검기가 더 넓게 뻗어나간다. 더 많은 내력을 검기로 전환할 수 있다. (소모 상한 7.5% → 10%)',
      },
      {
        level: 20,
        name: '성화기류(聖火氣流)',
        description: '검기와 성화가 하나의 흐름으로 합쳐진다. 내력 소모 한도가 최고에 달한다. (소모 상한 10% → 12.5%)',
      },
    ],
  },
  {
    id: 'sword-strike-trait',
    name: '초식 특성',
    type: 'multiplier',
    tier: 1,
    branch: 'sword',
    placeholder: true,
    description: '추후 업데이트 예정.',
    functional: '추후 업데이트 예정.',
    baseMax: 1,
    effectPerLevel: 0,
    effectUnit: '',
  },
  {
    id: 'sword-ult-trait',
    name: '절초 특성',
    type: 'finisherBoost',
    tier: 1,
    branch: 'sword',
    placeholder: true,
    description: '추후 업데이트 예정.',
    functional: '추후 업데이트 예정.',
    baseMax: 1,
    effectPerLevel: 0,
    effectUnit: '',
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
    effectSummary: '레벨당 회피 +0.5%p · 카운터 구간 성장 (기본 공속 하한 1.5초)',
    baseMax: 30,
    effectPerLevel: 0.5,
    effectUnit: '%p',
    traits: [
      {
        level: 10,
        name: '가벼운 걸음',
        description: '공격 속도 하한이 1.5초 → 1.4초로 낮아진다. 카운터 확률이 40%로 도약하며, 회피 성공 시 HP 4%를 회복한다.',
      },
      {
        level: 20,
        name: '바람의 걸음',
        description: '공격 속도 하한이 1.4초 → 1.3초로 더 낮아진다. 카운터 확률 52.5%. 회피 성공 시 공격력 +15% 버프 획득 (3공격 지속, 최대 2스택).',
      },
      {
        level: 30,
        name: '성화의 걸음',
        description: '공격 속도 하한이 1.3초 → 1.2초로 낮아진다. 카운터 확률 65%, 회피 25%로 최고치에 달한다.',
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
  // 잔불 → 하얀 재 (장비 강화 재료) 교환
  { id: 'mat-1', direction: 'material', fromResource: 'ember', toMaterial: 'hayan_jae', fromAmount: 1, toAmount: 3 },
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
export const SWORD_DYNAMIC_NODE_IDS = new Set(['sword-main', 'sword-ult', 'sword-qi-manifest']);

export function getCostResource(node: SkillNodeDef, currentLevel: number): 'ember' | 'flame' | 'divine' {
  // 검법 노드: 만렙 20 기준 9→10 / 19→20 마일스톤이 flame 결제 구간.
  // currentLevel 0~8 = ember (잔불), 9+ = flame (불꽃).
  if (SWORD_DYNAMIC_NODE_IDS.has(node.id)) {
    if (currentLevel >= 9) return 'flame';
    return 'ember';
  }
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

// sword-ult 잠금 해제 임계값 — sword-main 이 이 레벨 이상이어야 sword-ult 활성
export const SWORD_ULT_UNLOCK_THRESHOLD = 5;

// ──────────────────────────────────────────
// 검법 노드 비용 — 0~8 ember (잔불), 9+ flame (불꽃).
// 9→10, 19→20 마일스톤은 큰 단가. 만렙 확장(30/40) 시 last-entry 폴백.
// ──────────────────────────────────────────
// sword-main: lv0→1 = 500 (오픈 비용 — 비전서 1개의 잔불 대체 결제 수단), lv1→2~lv8→9 는 지시서 표 그대로.
// 비전서(`bahwagyo_sword_manual`) 사용 시 inventorySlice 가 무료로 0→1 처리하므로, 잔불 결제와 비전서 사용이 택 1.
const SWORD_EMBER_COST_MAIN = [500, 180, 190, 200, 210, 220, 230, 240, 250];
const SWORD_FLAME_COST_MAIN = [100, 30, 35, 40, 45, 50, 55, 60, 65, 200];      // 9→19 + 19→20 milestone

// sword-ult: lv0→1 = 350 (오픈 비용), lv1→2~lv8→9 는 검법 메인과 동일 (180~250).
const SWORD_EMBER_COST_ULT = [350, 180, 190, 200, 210, 220, 230, 240, 250];
const SWORD_FLAME_COST_ULT = [100, 30, 35, 40, 45, 50, 55, 60, 65, 200];

// sword-qi-manifest: lv0→1 = 394 (오픈 비용, 기존 525의 3/4), lv1→2~lv8→9 는 지시서 표 그대로 (기존의 3/4).
const SWORD_EMBER_COST_QI = [394, 186, 197, 206, 217, 227, 238, 248, 258];
const SWORD_FLAME_COST_QI = [94, 29, 33, 38, 43, 47, 52, 56, 62, 225];

interface SwordCostTable {
  ember: number[];
  flame: number[];
}
const SWORD_COST_TABLES: Record<string, SwordCostTable> = {
  'sword-main': { ember: SWORD_EMBER_COST_MAIN, flame: SWORD_FLAME_COST_MAIN },
  'sword-ult': { ember: SWORD_EMBER_COST_ULT, flame: SWORD_FLAME_COST_ULT },
  'sword-qi-manifest': { ember: SWORD_EMBER_COST_QI, flame: SWORD_FLAME_COST_QI },
};

export function getLevelUpCost(node: SkillNodeDef, currentLevel: number): number {
  // 검법 동적 노드 — lv 0~8 ember, lv 9+ flame. 만렙 확장 시 마지막 entry 폴백.
  const swordTable = SWORD_COST_TABLES[node.id];
  if (swordTable) {
    if (currentLevel >= 9) {
      const idx = currentLevel - 9;
      return swordTable.flame[idx] ?? swordTable.flame[swordTable.flame.length - 1];
    }
    return swordTable.ember[currentLevel] ?? swordTable.ember[swordTable.ember.length - 1];
  }
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
// 초급 심법 지침서 — T1 심법 노드 결제 비용 테이블 (잔불 비용 라인을 dimensionless 권수로 환산)
// 0~29 = 0→1...29→30 비용. 30+ 는 만렙 확장 비용 폴백(default 5).
// ──────────────────────────────────────────
const GUIDE_COST_DEFAULT = [
  5, 1, 1, 1, 2, 2, 2, 3, 3, 10,   // 0→10 (마일스톤=10권)
  4, 4, 5, 5, 6, 6, 7, 7, 8, 17,   // 10→20
  8, 9, 9, 10, 10, 11, 11, 12, 12, 25, // 20→30
];
const GUIDE_COST_ASH_RECOVERY = [
  4, 1, 1, 1, 2, 2, 2, 2, 3, 9,
  3, 4, 4, 5, 5, 6, 6, 7, 7, 16,
  7, 8, 8, 9, 9, 10, 10, 11, 11, 23,
];
const GUIDE_COST_ASH_FAST = [
  7, 2, 2, 2, 3, 3, 3, 4, 4, 15,
  5, 6, 7, 8, 8, 9, 10, 10, 11, 26,
  12, 12, 13, 14, 14, 15, 16, 17, 17, 38,
];

const GUIDE_COST_OVERRIDES: Record<string, number[]> = {
  'mind-t1-2': GUIDE_COST_ASH_RECOVERY,
  'mind-t1-3': GUIDE_COST_ASH_RECOVERY,
  'mind-t1-4': GUIDE_COST_ASH_FAST,
};

export function getGuideLevelUpCost(node: SkillNodeDef, currentLevel: number): number {
  const table = GUIDE_COST_OVERRIDES[node.id] ?? GUIDE_COST_DEFAULT;
  return table[currentLevel] ?? 5;
}

// ──────────────────────────────────────────
// 초급 외법서 — 성화보법 개방 노드 레벨업 비용 (waebeopse_basic)
// GUIDE_COST_DEFAULT 와 동일한 비용 테이블 사용
// ──────────────────────────────────────────
export function getWaebeopseBobeoplevelUpCost(currentLevel: number): number {
  return GUIDE_COST_DEFAULT[currentLevel] ?? 5;
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
  // 검법 (성화검법)
  '성화검법(聖火劍法)': '聖',
  '검법 절초': '絶',
  '검기 발현': '気',
  '초식 특성': '招',
  '절초 특성': '極',
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
