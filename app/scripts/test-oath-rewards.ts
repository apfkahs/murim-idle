/**
 * 맹세(盟誓) 보상 부스트 단위 테스트
 *
 * 검증 대상: data/oaths.ts 의 calcOathBoost / calcOathFlatBonuses 가 카탈로그
 * 5-1 표(`docs/맹세_시스템/맹세_옵션_카탈로그.md`)와 정확히 일치하는지.
 *
 * battleRewards.ts L126/L155/L175/L210/L293+ 에 곱연산/평면 보너스/티어2 드랍을
 * 주입하기 전 단계에서, 산정 함수가 단일 진실 원천으로서 정확함을 보장한다.
 *
 * 12 케이스 (weightSum):
 *   0  — 비활성 baseline
 *   1  — 1단계 1개 (티어 1 시작)
 *   4  — 모든 카테고리 1단계 (티어 1 끝)
 *   5  — 티어 2 진입 (extraDrop 활성화)
 *   9  — 티어 2 끝
 *   10 — 티어 3 진입 (등급 +1)
 *   13 — 티어 3 중간 (모든 카테고리 3단계 13)
 *   17 — 티어 3 끝
 *   18 — 티어 4 진입 (등급 +2)
 *   22 — 티어 4 (예시 6+4+5+7)
 *   25 — MVP 최대 (6+4+8+7)
 *   30 — 캡 도달 (+1000%)
 */
import { calcOathBoost, calcOathFlatBonuses, calcOathTier } from '../src/data/oaths';

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

interface ExpectedRow {
  weightSum: number;
  // calcOathBoost: profMult/dropMult = 1 + capped boost
  expectedBoost: number;        // capped boost 그 자체 (1 + capped 와 동치)
  // calcOathFlatBonuses
  expectedRankBonus: 0 | 1 | 2;
  expectedExtraDrop: boolean;
  expectedTier: 1 | 2 | 3 | 4;
}

// 카탈로그 5-1 의 기대값 — 코드와 별개의 독립 산정으로 작성.
//   tier1: 0..4 → 0.10/weight
//   tier2: 5..9 → +0.20/weight
//   tier3: 10..17 → +0.30/weight
//   tier4: 18..  → +0.50/weight
//   캡: 1000% (=10.0)
const EXPECTED: ExpectedRow[] = [
  { weightSum: 0,  expectedBoost: 0.00, expectedRankBonus: 0, expectedExtraDrop: false, expectedTier: 1 },
  { weightSum: 1,  expectedBoost: 0.10, expectedRankBonus: 0, expectedExtraDrop: false, expectedTier: 1 },
  { weightSum: 4,  expectedBoost: 0.40, expectedRankBonus: 0, expectedExtraDrop: false, expectedTier: 1 },
  { weightSum: 5,  expectedBoost: 0.60, expectedRankBonus: 0, expectedExtraDrop: true,  expectedTier: 2 },
  { weightSum: 9,  expectedBoost: 1.40, expectedRankBonus: 0, expectedExtraDrop: true,  expectedTier: 2 },
  { weightSum: 10, expectedBoost: 1.70, expectedRankBonus: 1, expectedExtraDrop: true,  expectedTier: 3 },
  { weightSum: 13, expectedBoost: 2.60, expectedRankBonus: 1, expectedExtraDrop: true,  expectedTier: 3 },
  { weightSum: 17, expectedBoost: 3.80, expectedRankBonus: 1, expectedExtraDrop: true,  expectedTier: 3 },
  { weightSum: 18, expectedBoost: 4.30, expectedRankBonus: 2, expectedExtraDrop: true,  expectedTier: 4 },
  { weightSum: 22, expectedBoost: 6.30, expectedRankBonus: 2, expectedExtraDrop: true,  expectedTier: 4 },
  { weightSum: 25, expectedBoost: 7.80, expectedRankBonus: 2, expectedExtraDrop: true,  expectedTier: 4 },
  { weightSum: 30, expectedBoost: 10.00, expectedRankBonus: 2, expectedExtraDrop: true, expectedTier: 4 }, // 캡
];

console.log('\n=== 맹세 보상 산정 단위 테스트 (12 케이스) ===\n');

for (const row of EXPECTED) {
  const w = row.weightSum;
  const expectedMult = 1 + row.expectedBoost;
  const boost = calcOathBoost(w);
  const flat = calcOathFlatBonuses(w);
  const tier = calcOathTier(w);

  console.log(`[weightSum=${w}] (티어 ${row.expectedTier})`);
  assert(
    `profMult = ${expectedMult.toFixed(2)}`,
    approxEq(boost.profMult, expectedMult),
    `actual ${boost.profMult.toFixed(4)}`,
  );
  assert(
    `dropMult = ${expectedMult.toFixed(2)}`,
    approxEq(boost.dropMult, expectedMult),
    `actual ${boost.dropMult.toFixed(4)}`,
  );
  assert(
    `profMult === dropMult`,
    approxEq(boost.profMult, boost.dropMult),
  );
  assert(
    `monsterRankBonus = ${row.expectedRankBonus}`,
    flat.monsterRankBonus === row.expectedRankBonus,
    `actual ${flat.monsterRankBonus}`,
  );
  assert(
    `extraDropTableUnlocked = ${row.expectedExtraDrop}`,
    flat.extraDropTableUnlocked === row.expectedExtraDrop,
    `actual ${flat.extraDropTableUnlocked}`,
  );
  assert(
    `tier = ${row.expectedTier}`,
    tier === row.expectedTier,
    `actual ${tier}`,
  );
}

// ─────────────────────────────────────────────
// 카탈로그 5-1 핵심 표기 검증 (대표 6개 — 카탈로그가 직접 명시한 부스트%)
// ─────────────────────────────────────────────
console.log('\n[카탈로그 5-1 직접 명시값]');

const CATALOG_51: { weightSum: number; boostPct: number; tier: 1 | 2 | 3 | 4 }[] = [
  { weightSum: 1,  boostPct: 10,  tier: 1 },
  { weightSum: 4,  boostPct: 40,  tier: 1 },
  { weightSum: 8,  boostPct: 120, tier: 2 },
  { weightSum: 13, boostPct: 260, tier: 3 },
  { weightSum: 22, boostPct: 630, tier: 4 },
  { weightSum: 25, boostPct: 780, tier: 4 },
];

for (const c of CATALOG_51) {
  const boost = calcOathBoost(c.weightSum);
  const expectedMult = 1 + c.boostPct / 100;
  assert(
    `weightSum=${c.weightSum} → +${c.boostPct}% (profMult ${expectedMult.toFixed(2)})`,
    approxEq(boost.profMult, expectedMult),
    `actual ${boost.profMult.toFixed(4)}`,
  );
  assert(
    `weightSum=${c.weightSum} → tier ${c.tier}`,
    calcOathTier(c.weightSum) === c.tier,
  );
}

// ─────────────────────────────────────────────
// 캡 동작 (+1000%)
// ─────────────────────────────────────────────
console.log('\n[캡 동작]');

assert('weightSum=30 → capped at 11.0 (=+1000%)', approxEq(calcOathBoost(30).profMult, 11.0));
assert('weightSum=50 → capped at 11.0',           approxEq(calcOathBoost(50).profMult, 11.0));
assert('weightSum=100 → capped at 11.0',          approxEq(calcOathBoost(100).profMult, 11.0));

// ─────────────────────────────────────────────
// 결과
// ─────────────────────────────────────────────
console.log(`\n결과: ${passed}/${passed + failed} 통과${failed > 0 ? ` (실패 ${failed}개)` : ''}`);
if (failed > 0) process.exit(1);
