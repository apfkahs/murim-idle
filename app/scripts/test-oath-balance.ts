/**
 * 맹세(盟誓) 시스템 밸런스 검증
 *
 * 3개 섹션:
 *   1) 시나리오 5개  — 실제 플레이 조합의 weightSum·profMult·패널티 종합 검증
 *   2) 12개 경계값   — 구간 경계·캡 등 calcOathBoost / flatBonuses / tier 단위 검증
 *   3) 몬테카를로    — 무작위 조합 10,000회 불변식(invariant) & 단조성(monotonicity) 검증
 */
import {
  OATHS, getOathDef,
  calcOathBoost, calcOathFlatBonuses, calcOathTier,
  type OathDef,
} from '../src/data/oaths';

// ─────────────────────────────────────────────
// 공통 헬퍼
// ─────────────────────────────────────────────

let passed = 0;
let failed = 0;

function approxEq(a: number, b: number, tol = 1e-9): boolean {
  return Math.abs(a - b) <= tol;
}

function assert(label: string, condition: boolean, detail?: string): void {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

function weightSumOf(ids: string[]): number {
  return ids.reduce((s, id) => s + (getOathDef(id)?.weight ?? 0), 0);
}

// ─────────────────────────────────────────────
// 섹션 1: 시나리오 5개
// ─────────────────────────────────────────────
// 실제 플레이에서 선택할 만한 5가지 조합을 정의하고
// weightSum / 배율 / 패널티 수치를 교차 검증한다.

interface Scenario {
  label: string;
  ids: string[];
  expectedWeightSum: number;
  expectedProfMult: number;  // 1 + capped_boost
  expectedTier: 1 | 2 | 3 | 4;
  expectedRankBonus: 0 | 1 | 2;
  expectedExtraDrop: boolean;
  penaltyChecks: Array<{
    field: keyof OathDef['effect'];
    expectedTotal: number;  // 검증 대상 효과 합산값 (단일 맹세이므로 해당 oathId 1개 기준)
    oathId: string;
  }>;
}

const SCENARIOS: Scenario[] = [
  {
    label: '선비의 도전 — 경량 2카테고리 (w=2)',
    ids: ['oath_qi_1', 'oath_out_1'],
    expectedWeightSum: 2,
    expectedProfMult: 1.20,
    expectedTier: 1,
    expectedRankBonus: 0,
    expectedExtraDrop: false,
    penaltyChecks: [
      { oathId: 'oath_qi_1',  field: 'maxQiPenaltyPct',     expectedTotal: 0.33 },
      { oathId: 'oath_out_1', field: 'outDamagePenaltyPct', expectedTotal: 0.20 },
    ],
  },
  {
    label: '사방 봉인 — 4카테고리 1단계 티어1 끝 (w=4)',
    ids: ['oath_qi_1', 'oath_recv_1', 'oath_out_1', 'oath_in_1'],
    expectedWeightSum: 4,
    expectedProfMult: 1.40,
    expectedTier: 1,
    expectedRankBonus: 0,
    expectedExtraDrop: false,
    penaltyChecks: [
      { oathId: 'oath_qi_1',    field: 'maxQiPenaltyPct',     expectedTotal: 0.33 },
      { oathId: 'oath_recv_1',  field: 'hpRegenPenaltyPct',   expectedTotal: 0.50 },
      { oathId: 'oath_out_1',   field: 'outDamagePenaltyPct', expectedTotal: 0.20 },
      { oathId: 'oath_in_1',    field: 'inDamageBonusPct',    expectedTotal: 0.30 },
    ],
  },
  {
    label: '협객의 맹약 — 중급 조합 티어2 (w=6)',
    ids: ['oath_qi_2', 'oath_recv_1', 'oath_out_2', 'oath_in_1'],
    expectedWeightSum: 6,
    expectedProfMult: 1.80,
    expectedTier: 2,
    expectedRankBonus: 0,
    expectedExtraDrop: true,
    penaltyChecks: [
      { oathId: 'oath_qi_2',   field: 'maxQiPenaltyPct',     expectedTotal: 0.66 },
      { oathId: 'oath_recv_1', field: 'hpRegenPenaltyPct',   expectedTotal: 0.50 },
      { oathId: 'oath_out_2',  field: 'outDamagePenaltyPct', expectedTotal: 0.40 },
      { oathId: 'oath_in_1',   field: 'inDamageBonusPct',    expectedTotal: 0.30 },
    ],
  },
  {
    label: '광인의 맹약 — 무모한 도전 티어3 진입 (w=10)',
    ids: ['oath_qi_3', 'oath_recv_2', 'oath_out_3', 'oath_in_2'],
    expectedWeightSum: 10,
    expectedProfMult: 2.70,
    expectedTier: 3,
    expectedRankBonus: 1,
    expectedExtraDrop: true,
    penaltyChecks: [
      { oathId: 'oath_qi_3',   field: 'maxQiPenaltyPct',     expectedTotal: 0.95 },
      { oathId: 'oath_recv_2', field: 'hpRegenPenaltyPct',   expectedTotal: 1.00 },
      { oathId: 'oath_out_3',  field: 'outDamagePenaltyPct', expectedTotal: 0.60 },
      { oathId: 'oath_in_2',   field: 'inDamageBonusPct',    expectedTotal: 0.80 },
    ],
  },
  {
    label: '절대의 맹세 — 최대 조합 티어4 (w=25)',
    ids: ['oath_qi_4', 'oath_recv_3', 'oath_out_5', 'oath_in_4'],
    expectedWeightSum: 25,
    expectedProfMult: 8.80,
    expectedTier: 4,
    expectedRankBonus: 2,
    expectedExtraDrop: true,
    penaltyChecks: [
      { oathId: 'oath_qi_4',   field: 'maxQiPenaltyPct',     expectedTotal: 1.00 },
      { oathId: 'oath_recv_3', field: 'hpRegenPenaltyPct',   expectedTotal: 1.00 },
      { oathId: 'oath_recv_3', field: 'hpDrainPctPerSec',    expectedTotal: 0.008 },
      { oathId: 'oath_out_5',  field: 'outDamagePenaltyPct', expectedTotal: 0.95 },
      { oathId: 'oath_in_4',   field: 'inDamageBonusPct',    expectedTotal: 5.00 },
    ],
  },
];

console.log('\n══════════════════════════════════════════');
console.log('   맹세 시스템 밸런스 검증');
console.log('══════════════════════════════════════════\n');

console.log('─── [1] 시나리오 5개 종합 검증 ───\n');

for (const sc of SCENARIOS) {
  console.log(`[${sc.label}]`);

  const ws = weightSumOf(sc.ids);
  assert(`weightSum = ${sc.expectedWeightSum}`, ws === sc.expectedWeightSum, `actual ${ws}`);

  const boost = calcOathBoost(ws);
  assert(
    `profMult = ${sc.expectedProfMult.toFixed(2)}`,
    approxEq(boost.profMult, sc.expectedProfMult),
    `actual ${boost.profMult.toFixed(4)}`,
  );
  assert(
    `profMult === dropMult`,
    approxEq(boost.profMult, boost.dropMult),
  );

  const flat = calcOathFlatBonuses(ws);
  assert(
    `tier = ${sc.expectedTier}`,
    calcOathTier(ws) === sc.expectedTier,
    `actual ${calcOathTier(ws)}`,
  );
  assert(
    `monsterRankBonus = ${sc.expectedRankBonus}`,
    flat.monsterRankBonus === sc.expectedRankBonus,
    `actual ${flat.monsterRankBonus}`,
  );
  assert(
    `extraDropTableUnlocked = ${sc.expectedExtraDrop}`,
    flat.extraDropTableUnlocked === sc.expectedExtraDrop,
  );

  // 패널티 수치 검증
  for (const pc of sc.penaltyChecks) {
    const def = getOathDef(pc.oathId);
    const actual = def?.effect[pc.field] ?? 0;
    assert(
      `${pc.oathId}.${pc.field} = ${pc.expectedTotal}`,
      approxEq(actual as number, pc.expectedTotal),
      `actual ${actual}`,
    );
  }
}

// 추가: oath_recv_3 drain 검증 (maxHp=1000 기준)
console.log('\n[oath_recv_3 드레인 생존 시간 검증]');
{
  const drainDef = getOathDef('oath_recv_3');
  const drainRate = drainDef?.effect.hpDrainPctPerSec ?? 0;
  const mockMaxHp = 1000;
  const drainPerSec = mockMaxHp * drainRate;
  const timeToZero = drainRate > 0 ? mockMaxHp / drainPerSec : Infinity;
  assert(
    `drainRate 0.8%/s → maxHp=1000 기준 drain=${drainPerSec}/s`,
    approxEq(drainPerSec, 8.0),
    `actual ${drainPerSec}`,
  );
  assert(
    `drain만으로 사망까지 ${timeToZero}초 (= 1/0.008 × 1)`,
    approxEq(timeToZero, 125.0),
    `actual ${timeToZero}`,
  );
}

// ─────────────────────────────────────────────
// 섹션 2: 12개 경계 케이스
// ─────────────────────────────────────────────
// calcOathBoost 수식을 코드와 별개로 독립 산정:
//   tier1 (0..4):  × 0.10/weight
//   tier2 (5..9):  + × 0.20/weight
//   tier3 (10..17): + × 0.30/weight
//   tier4 (18+):   + × 0.50/weight
//   캡: 10.0 → profMult 최대 11.0

interface BoundaryCase {
  weightSum: number;
  expectedMult: number;   // 1 + capped_boost
  expectedTier: 1 | 2 | 3 | 4;
  expectedRankBonus: 0 | 1 | 2;
  expectedExtraDrop: boolean;
}

const BOUNDARY_CASES: BoundaryCase[] = [
  { weightSum: 0,  expectedMult: 1.00, expectedTier: 1, expectedRankBonus: 0, expectedExtraDrop: false },
  { weightSum: 1,  expectedMult: 1.10, expectedTier: 1, expectedRankBonus: 0, expectedExtraDrop: false },
  { weightSum: 4,  expectedMult: 1.40, expectedTier: 1, expectedRankBonus: 0, expectedExtraDrop: false },
  { weightSum: 5,  expectedMult: 1.60, expectedTier: 2, expectedRankBonus: 0, expectedExtraDrop: true  },
  { weightSum: 9,  expectedMult: 2.40, expectedTier: 2, expectedRankBonus: 0, expectedExtraDrop: true  },
  { weightSum: 10, expectedMult: 2.70, expectedTier: 3, expectedRankBonus: 1, expectedExtraDrop: true  },
  { weightSum: 13, expectedMult: 3.60, expectedTier: 3, expectedRankBonus: 1, expectedExtraDrop: true  },
  { weightSum: 17, expectedMult: 4.80, expectedTier: 3, expectedRankBonus: 1, expectedExtraDrop: true  },
  { weightSum: 18, expectedMult: 5.30, expectedTier: 4, expectedRankBonus: 2, expectedExtraDrop: true  },
  { weightSum: 22, expectedMult: 7.30, expectedTier: 4, expectedRankBonus: 2, expectedExtraDrop: true  },
  { weightSum: 25, expectedMult: 8.80, expectedTier: 4, expectedRankBonus: 2, expectedExtraDrop: true  },
  { weightSum: 30, expectedMult: 11.0, expectedTier: 4, expectedRankBonus: 2, expectedExtraDrop: true  }, // 캡
];

console.log('\n─── [2] 12개 경계 케이스 ───\n');

for (const bc of BOUNDARY_CASES) {
  const w = bc.weightSum;
  const boost = calcOathBoost(w);
  const flat = calcOathFlatBonuses(w);
  const tier = calcOathTier(w);

  console.log(`[weightSum=${w}]`);
  assert(
    `profMult = ${bc.expectedMult.toFixed(2)}`,
    approxEq(boost.profMult, bc.expectedMult),
    `actual ${boost.profMult.toFixed(4)}`,
  );
  assert(
    `dropMult = profMult`,
    approxEq(boost.dropMult, boost.profMult),
  );
  assert(
    `tier = ${bc.expectedTier}`,
    tier === bc.expectedTier,
    `actual ${tier}`,
  );
  assert(
    `monsterRankBonus = ${bc.expectedRankBonus}`,
    flat.monsterRankBonus === bc.expectedRankBonus,
    `actual ${flat.monsterRankBonus}`,
  );
  assert(
    `extraDropTableUnlocked = ${bc.expectedExtraDrop}`,
    flat.extraDropTableUnlocked === bc.expectedExtraDrop,
  );
}

// 캡 오버슈트
console.log('\n[캡 초과 케이스]');
assert('weightSum=35 → profMult 11.0 (캡)',  approxEq(calcOathBoost(35).profMult,  11.0));
assert('weightSum=100 → profMult 11.0 (캡)', approxEq(calcOathBoost(100).profMult, 11.0));
assert('weightSum=999 → profMult 11.0 (캡)', approxEq(calcOathBoost(999).profMult, 11.0));

// ─────────────────────────────────────────────
// 섹션 3: 몬테카를로 10,000회
// ─────────────────────────────────────────────
// 무작위 유효 조합을 10,000번 생성해 불변식·단조성·분포를 검증한다.

console.log('\n─── [3] 몬테카를로 10,000회 ───\n');

// 그룹별 멤버 목록 (exclusiveGroup별 최대 1개 선택)
const GROUP_MEMBERS: Record<string, string[]> = {
  oath_maxqi:    ['oath_qi_1',   'oath_qi_2',   'oath_qi_3',   'oath_qi_4'],
  oath_recovery: ['oath_recv_1', 'oath_recv_2', 'oath_recv_3'],
  oath_output:   ['oath_out_1',  'oath_out_2',  'oath_out_3',  'oath_out_4', 'oath_out_5'],
  oath_incoming: ['oath_in_1',   'oath_in_2',   'oath_in_3',   'oath_in_4'],
};
const GROUPS = Object.keys(GROUP_MEMBERS);

// 결정적 LCG (재현 가능한 난수, Math.random 미사용)
let seed = 20250508;
function lcg(): number {
  seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
  return seed / 0x7fffffff;
}

function randomCombination(): string[] {
  const result: string[] = [];
  for (const group of GROUPS) {
    // 50% 확률로 그룹에서 1개 선택
    if (lcg() < 0.5) {
      const opts = GROUP_MEMBERS[group];
      result.push(opts[Math.floor(lcg() * opts.length)]);
    }
  }
  return result;
}

const RUNS = 10_000;
let mcFailed = 0;
const tierCounts: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };

// 단조성: weightSum 0~30 범위의 모든 정수에서 profMult 비감소 확인
let prevMult = 0;
for (let w = 0; w <= 30; w++) {
  const m = calcOathBoost(w).profMult;
  if (m < prevMult - 1e-9) mcFailed++;
  prevMult = m;
}
assert('단조성: weightSum 0..30 에서 profMult 비감소', mcFailed === 0, `위반 ${mcFailed}건`);

// 불변식 검증
let invFailed = 0;
let symFailed = 0;
let capFailed = 0;

for (let r = 0; r < RUNS; r++) {
  const ids = randomCombination();
  const ws = weightSumOf(ids);
  const boost = calcOathBoost(ws);
  const tier = calcOathTier(ws);

  // 불변식 1: profMult >= 1.0
  if (boost.profMult < 1.0 - 1e-9) invFailed++;

  // 불변식 2: profMult <= 11.0 (캡)
  if (boost.profMult > 11.0 + 1e-9) capFailed++;

  // 불변식 3: profMult === dropMult
  if (!approxEq(boost.profMult, boost.dropMult)) symFailed++;

  // 티어 집계
  tierCounts[tier]++;
}

assert(`10,000회 모두 profMult >= 1.0`,   invFailed === 0, `위반 ${invFailed}건`);
assert(`10,000회 모두 profMult <= 11.0`,  capFailed === 0, `위반 ${capFailed}건`);
assert(`10,000회 모두 profMult === dropMult`, symFailed === 0, `위반 ${symFailed}건`);

// 티어 분포 출력
const total = RUNS;
console.log('\n  [티어 분포]');
for (const tier of [1, 2, 3, 4] as const) {
  const count = tierCounts[tier];
  const pct = ((count / total) * 100).toFixed(1);
  console.log(`    티어 ${tier}: ${count.toLocaleString('ko-KR')}회 (${pct}%)`);
}

// 티어1 조합이 가장 많아야 함 (4그룹 각 50% 선택 → 빈 조합 포함 낮은 weightSum 多)
assert(
  '티어1 조합 비율 > 40% (저난이도 입문 접근성)',
  tierCounts[1] / total > 0.40,
  `실제 ${((tierCounts[1] / total) * 100).toFixed(1)}%`,
);

// 티어4 조합도 존재해야 함 (극한 도전 가능)
assert(
  '티어4 조합 최소 1회 이상 등장',
  tierCounts[4] >= 1,
  `실제 ${tierCounts[4]}회`,
);

// 추가: exclusiveGroup 제약 — 동일 그룹 두 맹세가 동시 활성화되지 않는지
// randomCombination은 이미 그룹당 최대 1개를 선택하므로 위반 불가 확인
console.log('\n  [exclusiveGroup 제약 검증]');
let groupConflict = 0;
for (let r = 0; r < 1000; r++) {
  const ids = randomCombination();
  const seenGroups = new Set<string>();
  for (const id of ids) {
    const grp = getOathDef(id)?.exclusiveGroup;
    if (grp) {
      if (seenGroups.has(grp)) groupConflict++;
      seenGroups.add(grp);
    }
  }
}
assert('1,000회 무작위 조합에서 exclusiveGroup 충돌 0건', groupConflict === 0, `충돌 ${groupConflict}건`);

// ─────────────────────────────────────────────
// 결과
// ─────────────────────────────────────────────
console.log('\n══════════════════════════════════════════');
console.log(`결과: ${passed}/${passed + failed} 통과${failed > 0 ? ` (실패 ${failed}개)` : ' ✓'}`);
console.log('══════════════════════════════════════════\n');
if (failed > 0) process.exit(1);
