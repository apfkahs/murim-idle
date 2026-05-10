/**
 * test-baehwagyo-drops.ts
 *
 * 배화교 몬스터 대상 맹세 케이스별 하얀 재 / 희미한 잔불 드롭률 시뮬레이션.
 * createTickContext + processEnemyDeath 직접 임포트 방식.
 *
 * 실행: cd D:\newidle\app && npx tsx scripts/test-baehwagyo-drops.ts
 */

import { createTickContext } from '../src/utils/combat/tickContext';
import { processEnemyDeath } from '../src/utils/combat/battleRewards';
import { createInitialState } from '../src/store/initialState';
import { calcOathBoost, calcOathFlatBonuses, OATH_TIER2_EXTRA_DROPS } from '../src/data/oaths';
import type { GameState } from '../src/store/types';

// ─────────────────────────────────────────────────────────────
// 케이스 정의
// ─────────────────────────────────────────────────────────────

interface OathCase {
  label: string;
  weightSum: number;
  snapshotIds: string[];
}

const CASES: OathCase[] = [
  {
    label: '케이스0 (맹세 없음, ws=0)',
    weightSum: 0,
    snapshotIds: [],
  },
  {
    label: '케이스1 (ws=7, ~200%)',
    weightSum: 7,
    // oath_qi_3(w=3) + oath_hp_1(w=2) + oath_out_2(w=2) = 7
    snapshotIds: ['oath_qi_3', 'oath_hp_1', 'oath_out_2'],
  },
  {
    label: '케이스2 (ws=11, 200%+)',
    weightSum: 11,
    // oath_qi_4(w=6) + oath_hp_1(w=2) + oath_out_2(w=2) + oath_in_1(w=1) = 11
    snapshotIds: ['oath_qi_4', 'oath_hp_1', 'oath_out_2', 'oath_in_1'],
  },
  {
    label: '케이스3 (ws=21, 300%+/최대치 근접)',
    weightSum: 21,
    // oath_qi_4(w=6) + oath_hp_4(w=9) + oath_out_4(w=5) + oath_in_1(w=1) = 21
    snapshotIds: ['oath_qi_4', 'oath_hp_4', 'oath_out_4', 'oath_in_1'],
  },
];

// ─────────────────────────────────────────────────────────────
// 대상 몬스터
// ─────────────────────────────────────────────────────────────

interface MonsterTarget {
  id: string;
  name: string;
  fieldId: string;
}

const MONSTERS: MonsterTarget[] = [
  { id: 'baehwa_haengja', name: '배화교 행자', fieldId: 'baehwagyo_oemun' },
  { id: 'baehwa_howi',    name: '배화교 호위',   fieldId: 'baehwagyo_oemun' },
  { id: 'baehwa_gyeongbosa', name: '배화교 경보사', fieldId: 'baehwagyo_oemun' },
];

// 이론 dropMult 계산
function calcDropMult(weightSum: number): number {
  return calcOathBoost(weightSum).dropMult;
}

function calcExtraDropUnlocked(weightSum: number): boolean {
  return calcOathFlatBonuses(weightSum).extraDropTableUnlocked;
}

// ─────────────────────────────────────────────────────────────
// 기본 게임 상태 생성 (equippedArts=[], proficiency grade=1)
// ─────────────────────────────────────────────────────────────

function buildBaseState(oathCase: OathCase): GameState {
  const state = createInitialState();

  // 맹세 잠금 설정
  if (oathCase.snapshotIds.length > 0) {
    state.oathSystem = {
      activeOathIds: [...oathCase.snapshotIds],
      lockedAt: {
        fieldId: 'baehwagyo_oemun',
        lockedAtTimestamp: Date.now(),
        snapshotIds: [...oathCase.snapshotIds],
      },
    };
  } else {
    state.oathSystem = {
      activeOathIds: [],
      lockedAt: null,
    };
  }

  // 숙련도: grade 1 고정 (proficiency = 1 — 초기값 그대로)
  // equippedArts = [] — 초기값 그대로
  // battleMode = 'hunt'으로 설정 (explore 아님 → explorePendingRewards 관련 분기 회피)
  state.battleMode = 'hunt';
  state.currentField = 'baehwagyo_oemun';
  state.fieldUnlocks = {
    ...state.fieldUnlocks,
    baehwagyo_oemun: true,
  };

  return state;
}

// ─────────────────────────────────────────────────────────────
// 시뮬레이션 실행
// ─────────────────────────────────────────────────────────────

interface SimResult {
  monsterId: string;
  caseLabel: string;
  n: number;
  hayanJae: number;
  huimihanJanbul: number;
  taoreuneunBulggotPyeon: number;  // OATH_TIER2_EXTRA_DROPS (gyeongbosa/hwabosa)
}

const N = 100_000;

function runSim(monster: MonsterTarget, oathCase: OathCase): SimResult {
  let hayanJae = 0;
  let huimihanJanbul = 0;
  let taoreuneunBulggotPyeon = 0;

  const baseState = buildBaseState(oathCase);

  for (let i = 0; i < N; i++) {
    // 매 iteration마다 상태를 복제하고 적 HP=0으로 설정
    const state = { ...baseState };

    // 재료/세션 리셋 (이전 드롭 누적 방지)
    state.materials = {};
    state.sessionDrops = {};
    state.killCounts = {};

    // 현재 적 설정 (HP=0 → 처치 판정)
    state.currentEnemy = {
      id: monster.id,
      hp: 0,
      maxHp: 100,
      attackPower: 100,
      attackInterval: 2.5,
      regen: 0,
    };
    state.currentField = monster.fieldId;

    // TickContext 생성 및 processEnemyDeath 호출
    const ctx = createTickContext(state, 1.0, true);
    processEnemyDeath(ctx);

    // 결과 집계
    hayanJae        += ctx.materials['hayan_jae']        ?? 0;
    huimihanJanbul  += ctx.materials['huimihan_janbul']  ?? 0;
    taoreuneunBulggotPyeon += ctx.materials['taoreuneun_bulggot_pyeon'] ?? 0;
  }

  return {
    monsterId: monster.id,
    caseLabel: oathCase.label,
    n: N,
    hayanJae,
    huimihanJanbul,
    taoreuneunBulggotPyeon,
  };
}

// ─────────────────────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────────────────────

console.log('\n=== 배화교 드롭 시뮬레이션 (N=100,000회/케이스/몬스터) ===\n');
console.log('* 숙련도 dropRateMultiplier=1 고정 (equippedArts=[])');
console.log('* 배화교 재료(hayan_jae/huimihan_janbul 등)는 oathDropMult 정상 적용');
console.log('* 사망 페널티 미반영 (skipRewards=false 고정)\n');

// ── 1. 이론 dropMult 표 ──────────────────────────────────────

console.log('── 1. 이론 dropMult 표 ──────────────────────────────────');
console.log('케이스        | ws | dropMult | extraDropUnlocked');
console.log('-------------|----|-----------|-----------------');
for (const c of CASES) {
  const dm   = calcDropMult(c.weightSum).toFixed(4);
  const extra = calcExtraDropUnlocked(c.weightSum) ? 'O (ws≥5)' : 'X';
  const label = c.label.padEnd(30);
  console.log(`${label} | ${String(c.weightSum).padStart(2)} | ${dm.padStart(9)} | ${extra}`);
}

console.log();

// ── 2. 몬스터별 × 케이스별 드롭률 표 ─────────────────────────

// 기준 드롭 확률 (monsters.ts에서 확인한 값)
const BASE_CHANCES: Record<string, { hayanJae: number; huimihanJanbul: number }> = {
  baehwa_haengja:   { hayanJae: 0.05,  huimihanJanbul: 0.025 }, // monsters.ts 실제값
  baehwa_howi:      { hayanJae: 0.07,  huimihanJanbul: 0.035 },
  baehwa_gyeongbosa:{ hayanJae: 0.20,  huimihanJanbul: 0.095 },
};

// OATH_TIER2_EXTRA_DROPS 확인
const EXTRA_DROPS_MAP = OATH_TIER2_EXTRA_DROPS;

// 결과 수집
const allResults: SimResult[] = [];

for (const monster of MONSTERS) {
  for (const oathCase of CASES) {
    process.stdout.write(`시뮬레이션 중: ${monster.name} × ${oathCase.label}...`);
    const result = runSim(monster, oathCase);
    allResults.push(result);
    console.log(' 완료');
  }
}

console.log('\n── 2. 몬스터별 × 케이스별 실제 드롭률 표 ─────────────────\n');

for (const monster of MONSTERS) {
  const base = BASE_CHANCES[monster.id];
  const extras = EXTRA_DROPS_MAP[monster.id];

  console.log(`[${monster.name} (${monster.id})]`);
  console.log(`  기본 확률: 하얀 재 ${(base.hayanJae * 100).toFixed(2)}%  ` +
              `희미한 잔불 ${base.huimihanJanbul > 0 ? (base.huimihanJanbul * 100).toFixed(2) + '%' : '없음'}`);
  if (extras) {
    for (const e of extras) {
      console.log(`  OATH 티어2 추가 드롭: ${e.materialId} ${(e.chance * 100).toFixed(3)}% (ws≥5 조건)`);
    }
  }
  console.log();

  console.log('  케이스                         | ws |  하얀 재  실측% | 잔불 실측% | 추가 드롭 실측%');
  console.log('  ------------------------------|----|-----------------|-----------|--------------');

  for (const r of allResults.filter(x => x.monsterId === monster.id)) {
    const hayanPct       = (r.hayanJae       / r.n * 100).toFixed(3);
    const janbulPct      = (r.huimihanJanbul / r.n * 100).toFixed(3);
    const extraPct       = (r.taoreuneunBulggotPyeon / r.n * 100).toFixed(4);
    const extraStr       = extras ? extraPct + '%' : '  N/A    ';

    const caseWs = CASES.find(c => c.label === r.caseLabel)!.weightSum;
    const label  = r.caseLabel.padEnd(30);
    console.log(
      `  ${label} | ${String(caseWs).padStart(2)} | ${hayanPct.padStart(15)}% | ${janbulPct.padStart(10)}% | ${extraStr}`,
    );
  }
  console.log();
}

// ── 3. 핵심 발견 사항 ──────────────────────────────────────────

console.log('── 3. 핵심 발견 사항 ────────────────────────────────────\n');

// 하얀 재 케이스0 vs 케이스3 비교
for (const monster of MONSTERS) {
  const base = BASE_CHANCES[monster.id];
  const r0 = allResults.find(r => r.monsterId === monster.id && r.caseLabel === CASES[0].label)!;
  const r3 = allResults.find(r => r.monsterId === monster.id && r.caseLabel === CASES[3].label)!;

  const hayan0 = (r0.hayanJae / r0.n * 100).toFixed(3);
  const hayan3 = (r3.hayanJae / r3.n * 100).toFixed(3);
  const janbul0 = (r0.huimihanJanbul / r0.n * 100).toFixed(3);
  const janbul3 = (r3.huimihanJanbul / r3.n * 100).toFixed(3);

  const hayanDiff = parseFloat(hayan3) - parseFloat(hayan0);
  const hayanIncreased = hayanDiff > 1.0; // oathDropMult ×6.8 → 케이스3 비율이 유의미하게 증가해야 함

  console.log(`[${monster.name}]`);
  console.log(`  하얀 재  — 케이스0: ${hayan0}%  케이스3: ${hayan3}%  → ` +
              `${hayanIncreased ? '맹세 배율 정상 적용 확인 (증가)' : '증가 없음 — 검토 필요'}`);
  if (base.huimihanJanbul > 0) {
    const janbulDiff = parseFloat(janbul3) - parseFloat(janbul0);
    const janbulIncreased = janbulDiff > 0.5;
    console.log(`  희미한 잔불 — 케이스0: ${janbul0}%  케이스3: ${janbul3}%  → ` +
                `${janbulIncreased ? '맹세 배율 정상 적용 확인 (증가)' : '증가 없음 — 검토 필요'}`);
  }

  // OATH_TIER2_EXTRA_DROPS — extraMult 배율 적용 검증
  // ws=7: extraMult=max(1, 2.0-1.4)=1.0 (배율 없음), ws=21: extraMult=max(1, 6.8-1.4)=5.4
  const extras = EXTRA_DROPS_MAP[monster.id];
  if (extras) {
    const extra0 = (r0.taoreuneunBulggotPyeon / r0.n * 100).toFixed(4);
    const r1 = allResults.find(r => r.monsterId === monster.id && r.caseLabel === CASES[1].label)!;
    const extra1Pct = (r1.taoreuneunBulggotPyeon / r1.n * 100).toFixed(4);
    const extra3Pct = (r3.taoreuneunBulggotPyeon / r3.n * 100).toFixed(4);
    // ws=21 실측치가 ws=7 실측치보다 유의미하게 높으면 extraMult 정상 적용
    const extraMultApplied = parseFloat(extra3Pct) > parseFloat(extra1Pct) * 2.0;
    console.log(`  추가 드롭 — ws=0(미발동): ${extra0}%  ws=7(×1.0): ${extra1Pct}%  ws=21(×5.4): ${extra3Pct}%`);
    console.log(`             → ${extraMultApplied ? 'extraMult 배율 적용 확인' : '배율 미적용 — 검토 필요'}`);
  }
  console.log();
}

console.log('── 이론 정리 ─────────────────────────────────────────────');
console.log('배화교 재료 드랍 경로 (battleRewards.ts):');
console.log('  const effectiveMultiplier = matDef?.excludeFromDropBonus ? 1 : dropRateMultiplier;');
console.log('→ hayan_jae / huimihan_janbul 등은 excludeFromDropBonus 없음 → oathDropMult 정상 적용.');
console.log('→ OATH_TIER2_EXTRA_DROPS (taoreuneun_bulggot_pyeon) 는 ws≥5 조건에서만 발동,');
console.log('  extraMult = max(1, oathDropMult - 1.4) 적용 (무모한 도전 ws≥10 이상부터 실질 보너스).');
