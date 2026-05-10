/**
 * 맹세(oath) 시스템 드롭률 검증 스크립트
 *
 * 목적: calcOathBoost()의 이론값과 실제 시뮬레이션 드롭률이 일치하는지 검증
 *
 * 테스트 대상:
 *   - 배화교 호위 (baehwa_howi): chance 0.035/0.07/0.00167 (모두 oathDropMult 적용)
 *   - 야산 늑대 (wolf): chance 0.12/0.025
 *   - 야산 곰 (bear): chance 0.20/0.05
 *   - 배화교 화보사 (baehwa_hwabosa): OATH_TIER2_EXTRA_DROPS 보유
 *   - 배화교 경보사 (baehwa_gyeongbosa): OATH_TIER2_EXTRA_DROPS 보유
 *
 * 전제:
 *   - proficiency 보정 없음 (dropRateMultiplier = oathDropMult)
 *   - 일반 드랍: Math.random() < Math.min(chance * oathDropMult, 1)
 *     단, excludeFromDropBonus=true 재료는 effectiveMultiplier=1 (shinseonghan_bul, huimihan_seonghwa)
 *   - OATH_TIER2_EXTRA_DROPS: extraMult = max(1, oathDropMult - 1.4), ws≥5 조건 충족 시에만 발동
 */

import { calcOathBoost, calcOathFlatBonuses, OATH_TIER2_EXTRA_DROPS } from '../src/data/oaths.js';
import { MATERIALS } from '../src/data/materials.js';

// ── 시뮬레이션 상수 ──────────────────────────────────────────────────────────

const N = 100_000;

// ── 테스트할 weightSum 케이스 ──────────────────────────────────────────────

const WEIGHT_SUM_CASES = [0, 5, 10, 18] as const;

// OATH_TIER2_EXTRA_DROPS 검증 케이스: ws=0은 미발동이므로 제외
const EXTRA_WS_CASES = [5, 10, 18] as const;

// ── 재료 데이터 (인라인 정의, data에서 추출) ─────────────────────────────────

interface DropEntry {
  materialId: string;
  chance: number;
}

interface MonsterTestCase {
  monsterId: string;
  monsterName: string;
  materialDrops: DropEntry[];
}

const MONSTER_CASES: MonsterTestCase[] = [
  {
    monsterId: 'wolf',
    monsterName: '야산 늑대',
    materialDrops: [
      { materialId: 'torn_paper',    chance: 0.12  },
      { materialId: 'stinky_leather', chance: 0.025 },
    ],
  },
  {
    monsterId: 'bear',
    monsterName: '야산 곰',
    materialDrops: [
      { materialId: 'torn_paper',    chance: 0.20 },
      { materialId: 'stinky_leather', chance: 0.05 },
    ],
  },
  {
    monsterId: 'baehwa_howi',
    monsterName: '배화교 호위',
    materialDrops: [
      { materialId: 'huimihan_janbul',  chance: 0.035   },
      { materialId: 'hayan_jae',        chance: 0.07    },
      { materialId: 'waebeopse_basic',  chance: 0.00167 },
    ],
  },
  {
    monsterId: 'baehwa_hwabosa',
    monsterName: '배화교 화보사',
    materialDrops: [
      { materialId: 'huimihan_janbul',    chance: 0.07        },
      { materialId: 'hayan_jae',          chance: 0.15        },
      { materialId: 'simbeop_guide_basic', chance: 0.07 / 23  },
      { materialId: 'waebeopse_basic',    chance: 0.00167     },
    ],
  },
  {
    monsterId: 'baehwa_gyeongbosa',
    monsterName: '배화교 경보사',
    materialDrops: [
      { materialId: 'huimihan_janbul',    chance: 0.095       },
      { materialId: 'hayan_jae',          chance: 0.20        },
      { materialId: 'simbeop_guide_basic', chance: 0.095 / 15 },
      { materialId: 'waebeopse_basic',    chance: 0.00167     },
    ],
  },
];

// ── 헬퍼 함수 ────────────────────────────────────────────────────────────────

function isExcludedFromBonus(materialId: string): boolean {
  const def = MATERIALS.find(m => m.id === materialId);
  return def?.excludeFromDropBonus === true;
}

/** 95% 신뢰구간 반지름 (Wilson 근사) */
function ci95(p: number, n: number): number {
  return 1.96 * Math.sqrt(p * (1 - p) / n);
}

/** 이론 드롭률 (effectiveMultiplier 적용 후 min(..., 1)) */
function theoreticalRate(chance: number, dropMult: number, excluded: boolean): number {
  const mult = excluded ? 1 : dropMult;
  return Math.min(chance * mult, 1);
}

/** N회 시뮬레이션 → 실제 드롭 횟수 */
function simulate(chance: number, dropMult: number, excluded: boolean, n: number): number {
  const effectiveMult = excluded ? 1 : dropMult;
  const threshold = Math.min(chance * effectiveMult, 1);
  let hits = 0;
  for (let i = 0; i < n; i++) {
    if (Math.random() < threshold) hits++;
  }
  return hits;
}

/** OATH_TIER2_EXTRA_DROPS 시뮬레이션 (extraMult = max(1, oathDropMult - 1.4)) */
function simulateExtraDrop(chance: number, extraMult: number, n: number): number {
  const threshold = Math.min(chance * extraMult, 1);
  let hits = 0;
  for (let i = 0; i < n; i++) {
    if (Math.random() < threshold) hits++;
  }
  return hits;
}

// ── 결과 출력 ────────────────────────────────────────────────────────────────

function fmt(n: number, digits = 4): string {
  return n.toFixed(digits);
}

function pct(n: number): string {
  return (n * 100).toFixed(2) + '%';
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

console.log('=== 맹세(oath) 드롭률 검증 ===');
console.log(`시뮬레이션 횟수: N = ${N.toLocaleString()}`);
console.log('');

// calcOathBoost 이론값 먼저 출력
console.log('── calcOathBoost 이론값 ──────────────────────────────────────────');
console.log('weightSum | boost 계산 경로                                   | dropMult');
console.log('----------|--------------------------------------------------------|---------');
for (const ws of WEIGHT_SUM_CASES) {
  const { dropMult } = calcOathBoost(ws);
  let path = '';
  let r = ws;
  const t1 = Math.min(r, 4);  path += `tier1(${t1})×0.10=${(t1*0.10).toFixed(2)}`; r -= t1;
  const t2 = Math.min(r, 5);  if (t2>0) path += ` + tier2(${t2})×0.20=${(t2*0.20).toFixed(2)}`; r -= t2;
  const t3 = Math.min(r, 8);  if (t3>0) path += ` + tier3(${t3})×0.30=${(t3*0.30).toFixed(2)}`; r -= t3;
  if (r > 0)                   path += ` + tier4(${r})×0.50=${(r*0.50).toFixed(2)}`;
  console.log(`   ${String(ws).padStart(6)}   ${path.padEnd(52)} ${fmt(dropMult, 3)}`);
}
console.log('');

// 맹세 flat 보너스 출력
console.log('── calcOathFlatBonuses 이론값 ────────────────────────────────────');
console.log('weightSum | monsterRankBonus | extraDropTableUnlocked');
console.log('----------|-----------------|------------------------');
for (const ws of WEIGHT_SUM_CASES) {
  const flat = calcOathFlatBonuses(ws);
  console.log(`   ${String(ws).padStart(6)}   ${String(flat.monsterRankBonus).padEnd(17)} ${flat.extraDropTableUnlocked}`);
}
console.log('');

// ── 몬스터별 재료 드롭 시뮬레이션 ──────────────────────────────────────────

console.log('=== 재료 드롭률 시뮬레이션 결과 ===');
console.log('(오차율 기준: |actual - theory| / theory × 100%)');
console.log('(95% CI 안에 있으면 [OK], 벗어나면 [!!])');
console.log('');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks: string[] = [];

for (const mc of MONSTER_CASES) {
  console.log(`── ${mc.monsterName} (${mc.monsterId}) ─────────────────────────────────────────`);

  const header =
    'materialId                | excl | wSum | theory  | actual  | error%  | 95%CI   | 판정';
  const sep =
    '--------------------------|------|------|---------|---------|---------|---------|------';
  console.log(header);
  console.log(sep);

  for (const drop of mc.materialDrops) {
    const excluded = isExcludedFromBonus(drop.materialId);

    for (const ws of WEIGHT_SUM_CASES) {
      const { dropMult } = calcOathBoost(ws);
      const theory = theoreticalRate(drop.chance, dropMult, excluded);
      const hits = simulate(drop.chance, dropMult, excluded, N);
      const actual = hits / N;
      const ciRadius = ci95(theory, N);
      const errorPct = theory > 0 ? Math.abs(actual - theory) / theory * 100 : 0;
      const inCI = Math.abs(actual - theory) <= ciRadius;
      const verdict = inCI ? '[OK]' : '[!!]';

      totalChecks++;
      if (inCI) {
        passedChecks++;
      } else {
        failedChecks.push(`${mc.monsterId}/${drop.materialId}/ws=${ws}`);
      }

      const matLabel = drop.materialId.substring(0, 24).padEnd(24);
      const exclLabel = excluded ? 'Y   ' : 'N   ';
      const wsLabel = String(ws).padStart(4);
      const theoryLabel = pct(theory).padEnd(7);
      const actualLabel = pct(actual).padEnd(7);
      const errorLabel = errorPct.toFixed(2).padEnd(7) + '%';
      const ciLabel = ('±' + pct(ciRadius)).padEnd(7);

      console.log(
        `${matLabel} | ${exclLabel} | ${wsLabel} | ${theoryLabel} | ${actualLabel} | ${errorLabel} | ${ciLabel} | ${verdict}`
      );
    }
    console.log('');
  }
}

// ── OATH_TIER2_EXTRA_DROPS 시뮬레이션 ─────────────────────────────────────
// extraMult = max(1, oathDropMult - 1.4)
// ws=0: extraDropTableUnlocked=false → 미발동
// ws=5: extraMult = max(1, 1.6-1.4) = 1   (기본 확률만)
// ws=10: extraMult = max(1, 2.7-1.4) = 1.3
// ws=18: extraMult = max(1, 5.3-1.4) = 3.9

console.log('=== 맹세 티어2 추가 드롭 (OATH_TIER2_EXTRA_DROPS) 시뮬레이션 ===');
console.log('(extraMult = max(1, oathDropMult − 1.4) — ws≥5 조건 충족 시에만 발동)');
console.log('(ws=0: 미발동, ws=5: extraMult=1.0, ws=10: ×1.3, ws=18: ×3.9)');
console.log('');

const extraCasesLabel =
  'monsterId              | materialId                    | ws | extraMult | theory  | actual  | 95%CI   | 판정';
const extraCasesSep =
  '-----------------------|-------------------------------|----|-----------|---------|---------|---------|---------';
console.log(extraCasesLabel);
console.log(extraCasesSep);

for (const [monsterId, extras] of Object.entries(OATH_TIER2_EXTRA_DROPS)) {
  for (const ed of extras) {
    for (const ws of EXTRA_WS_CASES) {
      const { dropMult } = calcOathBoost(ws);
      const extraMult = Math.max(1, dropMult - 1.4);
      const theory = Math.min(ed.chance * extraMult, 1);
      const hits = simulateExtraDrop(ed.chance, extraMult, N);
      const actual = hits / N;
      const ciRadius = ci95(theory, N);
      const errorPct = theory > 0 ? Math.abs(actual - theory) / theory * 100 : 0;
      const inCI = Math.abs(actual - theory) <= ciRadius;
      const verdict = inCI ? '[OK]' : '[!!]';

      totalChecks++;
      if (inCI) {
        passedChecks++;
      } else {
        failedChecks.push(`EXTRA:${monsterId}/${ed.materialId}/ws=${ws}`);
      }

      const midLabel = monsterId.substring(0, 22).padEnd(22);
      const matLabel = ed.materialId.substring(0, 29).padEnd(29);
      const wsLabel = String(ws).padStart(2);
      const multLabel = extraMult.toFixed(2).padStart(9);
      const theoryLabel = pct(theory).padEnd(7);
      const actualLabel = pct(actual).padEnd(7);
      const ciLabel = ('±' + pct(ciRadius)).padEnd(7);
      const errorLabel = errorPct.toFixed(2) + '%';

      console.log(
        `${midLabel} | ${matLabel} | ${wsLabel} | ${multLabel} | ${theoryLabel} | ${actualLabel} | ${ciLabel} | ${verdict} (err ${errorLabel})`
      );
    }
    console.log('');
  }
}

console.log('');

// ── 배화교 재료 oathDropMult 적용 검증 ────────────────────────────────────
// 배화교 드랍 재료(huimihan_janbul 등)는 excludeFromDropBonus 플래그를 제거했으므로
// oathDropMult가 정상 적용됨. wolf/torn_paper와 동일하게 weightSum 증가 시 드랍률 상승 확인.

console.log('=== 배화교 재료 oathDropMult 적용 검증 ===');
console.log('(배화교 재료도 oathDropMult 적용 — weightSum 증가 시 드랍률 상승 확인)');
console.log('');

const baehwaChance = 0.035;
const baehwaMatName = 'huimihan_janbul';
console.log(`몬스터: baehwa_howi, 재료: ${baehwaMatName} (chance=${baehwaChance}, excl=false)`);
console.log('weightSum | dropMult | effectiveMult | theory  | actual  | 변화?');
console.log('----------|----------|---------------|---------|---------|------');

const baehwaResults: number[] = [];
for (const ws of WEIGHT_SUM_CASES) {
  const { dropMult } = calcOathBoost(ws);
  const excluded = false; // 배화교 재료는 excludeFromDropBonus 없음
  const effectiveMult = dropMult;
  const theory = Math.min(baehwaChance * effectiveMult, 1);
  const hits = simulate(baehwaChance, dropMult, excluded, N);
  const actual = hits / N;
  baehwaResults.push(actual);
  const wsLabel = String(ws).padStart(8);
  const dmLabel = fmt(dropMult, 3).padEnd(8);
  const emLabel = fmt(effectiveMult, 3).padEnd(13);
  const thLabel = pct(theory).padEnd(7);
  const acLabel = pct(actual).padEnd(7);
  console.log(`${wsLabel} | ${dmLabel} | ${emLabel} | ${thLabel} | ${acLabel} | 증가`);
}
const baehwaVariance = Math.max(...baehwaResults) - Math.min(...baehwaResults);
console.log('');
console.log(`  → 실제 드롭률 최대변동폭: ${pct(baehwaVariance)} (oathDropMult 적용 시 유의미한 증가여야 정상)`);
console.log('');

// wolf / torn_paper와 비교 (동일 패턴)
const wolfChance = 0.12;
console.log(`비교: wolf / torn_paper (chance=${wolfChance}, excl=false)`);
console.log('weightSum | dropMult | effectiveMult | theory  | actual  | 변화?');
console.log('----------|----------|---------------|---------|---------|------');

const wolfResults: number[] = [];
for (const ws of WEIGHT_SUM_CASES) {
  const { dropMult } = calcOathBoost(ws);
  const effectiveMult = dropMult;
  const theory = Math.min(wolfChance * effectiveMult, 1);
  const hits = simulate(wolfChance, dropMult, false, N);
  const actual = hits / N;
  wolfResults.push(actual);
  const wsLabel = String(ws).padStart(8);
  const dmLabel = fmt(dropMult, 3).padEnd(8);
  const emLabel = fmt(effectiveMult, 3).padEnd(13);
  const thLabel = pct(theory).padEnd(7);
  const acLabel = pct(actual).padEnd(7);
  console.log(`${wsLabel} | ${dmLabel} | ${emLabel} | ${thLabel} | ${acLabel} | 증가`);
}
console.log('');

// ── 종합 결과 ────────────────────────────────────────────────────────────────

console.log('=== 종합 결과 ===');
console.log(`총 검증 케이스: ${totalChecks}`);
console.log(`95% CI 통과:   ${passedChecks} / ${totalChecks}`);
if (failedChecks.length === 0) {
  console.log('결론: 모든 케이스가 95% 신뢰구간 안에 있음 — 이론값과 실제값 일치 확인');
} else {
  console.log('결론: 아래 케이스가 95% CI를 벗어남 (추가 확인 필요)');
  for (const fc of failedChecks) {
    console.log('  [!!] ' + fc);
  }
}
console.log('');
console.log('참고: 95% CI는 통계적 기대 범위. 100회 중 ~5회는 우연히 벗어날 수 있음.');
console.log('     [!!]가 전체의 5% 이하이면 정상 범위 내 오차.');
