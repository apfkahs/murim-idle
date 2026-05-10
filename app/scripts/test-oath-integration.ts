/**
 * test-oath-integration.ts
 * 맹세(oath) 시스템 통합 테스트
 *
 * 목적: processEnemyDeath가 실제 GameState의 oathSystem.lockedAt을 읽어
 *       materialDrops에 oathDropMult를 올바르게 적용하는지 검증.
 *
 * 방법: createTickContext + processEnemyDeath 직접 호출 (testAdapter 미사용)
 *       몬스터: wolf (torn_paper 0.12, stinky_leather 0.025)
 *       맹세: oath_qi_1(weight=1) + oath_hp_1(weight=2) → weightSum=3
 *             calcOathBoost(3) = 1 + (3×0.10) = 1.30
 *
 * 실행: cd D:\newidle\app && npx tsx scripts/test-oath-integration.ts
 */

import { createInitialState } from '../src/store/initialState';
import { createTickContext } from '../src/utils/combat/tickContext';
import { processEnemyDeath } from '../src/utils/combat/battleRewards';
import { calcOathBoost } from '../src/data/oaths';
import { getMonsterDef } from '../src/data/monsters';
import type { GameState } from '../src/store/types';

// ── 상수 ──
const N = 100_000;         // 반복 횟수
const MONSTER_ID = 'wolf';
const FIELD_ID = 'yasan';

// 검증할 맹세 ID 목록 (forbidOathIds 없는 oath, 서로 다른 exclusiveGroup)
const OATH_IDS = ['oath_qi_1', 'oath_hp_1'] as const;
// weightSum = 1 + 2 = 3 → oathDropMult = 1 + (3 × 0.10) = 1.30
const EXPECTED_WEIGHT_SUM = 3;
const { dropMult: EXPECTED_DROP_MULT } = calcOathBoost(EXPECTED_WEIGHT_SUM);

// wolf materialDrops 이론값
const WOLF_DROPS: { materialId: string; chance: number }[] = [
  { materialId: 'torn_paper', chance: 0.12 },
  { materialId: 'stinky_leather', chance: 0.025 },
];

// ── 헬퍼: 죽어있는 wolf enemy 객체 생성 ──
function makeDeadWolf() {
  const monDef = getMonsterDef(MONSTER_ID)!;
  return {
    id: monDef.id,
    hp: 0,               // 이미 죽어있음
    maxHp: monDef.hp,
    attackPower: monDef.attackPower,
    attackInterval: monDef.attackInterval,
    regen: monDef.regen,
    potionConsumedRage: false,
  };
}

// ── 헬퍼: GameState 빌드 ──
function buildState(oathLocked: boolean): GameState {
  const base = createInitialState();

  // yasan 필드 해금
  const state: GameState = {
    ...base,
    currentField: FIELD_ID,
    battleMode: 'hunt',
    huntTarget: MONSTER_ID,
    fieldUnlocks: { ...base.fieldUnlocks, yasan: true },
    currentEnemy: makeDeadWolf(),
    // equippedArts=[] → profTypes.size=0 → dropRateMultiplier=1 (숙련도 보정 없음)
    equippedArts: [],
    equippedSimbeop: null,
    // 맹세 설정
    oathSystem: oathLocked
      ? {
          activeOathIds: [...OATH_IDS],
          lockedAt: {
            fieldId: FIELD_ID,
            snapshotIds: [...OATH_IDS],
            lockedAtTimestamp: 0,
          },
        }
      : {
          activeOathIds: [],
          lockedAt: null,
        },
  };
  return state;
}

// ── 단일 케이스 실행 ──
function runCase(label: string, oathLocked: boolean): Record<string, number> {
  const drops: Record<string, number> = {};

  for (let i = 0; i < N; i++) {
    const state = buildState(oathLocked);
    const ctx = createTickContext(state, 1, true); // isSimulating=true

    // currentEnemy를 죽어있는 상태로 세팅 (ctx는 mutable)
    ctx.currentEnemy = makeDeadWolf();

    // materials 리셋 (각 iteration 독립)
    for (const k of Object.keys(ctx.materials)) {
      ctx.materials[k] = 0;
    }

    processEnemyDeath(ctx);

    // 재료 드롭 집계
    for (const { materialId } of WOLF_DROPS) {
      const got = ctx.materials[materialId] ?? 0;
      if (got > 0) drops[materialId] = (drops[materialId] ?? 0) + 1;
    }
  }

  return drops;
}

// ── 95% 신뢰구간 (이항분포 Wilson interval) ──
function wilsonCI(k: number, n: number): [number, number] {
  const p = k / n;
  const z = 1.96;
  const denom = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denom;
  const margin = (z * Math.sqrt(p * (1 - p) / n + (z * z) / (4 * n * n))) / denom;
  return [center - margin, center + margin];
}

// ── 메인 ──
function main() {
  console.log('=== 맹세 시스템 통합 테스트 ===');
  console.log(`날짜: 2026-05-11`);
  console.log(`몬스터: ${MONSTER_ID} (${FIELD_ID})`);
  console.log(`반복 횟수: ${N.toLocaleString()}회`);
  console.log(`맹세: ${OATH_IDS.join(', ')} (weightSum=${EXPECTED_WEIGHT_SUM})`);
  console.log(`이론 oathDropMult: ${EXPECTED_DROP_MULT.toFixed(4)}배 (${((EXPECTED_DROP_MULT - 1) * 100).toFixed(0)}% 증가)`);
  console.log('');

  console.log('[케이스 A] 맹세 없음 (lockedAt=null) 실행 중...');
  const dropsA = runCase('A', false);
  console.log('[케이스 B] 맹세 있음 (lockedAt 설정) 실행 중...');
  const dropsB = runCase('B', true);

  console.log('');
  console.log('=== 결과 ===');
  console.log('');

  let allPass = true;

  for (const { materialId, chance } of WOLF_DROPS) {
    const kA = dropsA[materialId] ?? 0;
    const kB = dropsB[materialId] ?? 0;
    const rateA = kA / N;
    const rateB = kB / N;
    const [ciAlo, ciAhi] = wilsonCI(kA, N);
    const [ciBlo, ciBhi] = wilsonCI(kB, N);

    const theoreticalA = chance;                     // 맹세 없음: 기본 확률
    const theoreticalB = Math.min(chance * EXPECTED_DROP_MULT, 1); // 맹세 있음: 부스트 적용

    // 실제 배율 (케이스 B / 케이스 A)
    const actualMult = rateA > 0 ? rateB / rateA : NaN;

    // 판정: B의 실제 드롭률이 A의 이론 × dropMult 95% CI 내에 있는가
    const inCI = ciBlo <= theoreticalB && theoreticalB <= ciBhi;

    // 배율 오차 (이론값과 실제값의 차이)
    const multError = Math.abs(actualMult - EXPECTED_DROP_MULT) / EXPECTED_DROP_MULT;
    const multPass = multError < 0.05; // 5% 이내

    const passA = ciAlo <= theoreticalA && theoreticalA <= ciAhi;
    const passB = inCI;
    const pass = passA && passB && multPass;
    if (!pass) allPass = false;

    console.log(`재료: ${materialId}`);
    console.log(`  이론 드롭률  A=${(theoreticalA * 100).toFixed(3)}%  B=${(theoreticalB * 100).toFixed(3)}%`);
    console.log(`  실제 드롭률  A=${(rateA * 100).toFixed(3)}%  B=${(rateB * 100).toFixed(3)}%`);
    console.log(`  95% CI       A=[${(ciAlo * 100).toFixed(3)}%, ${(ciAhi * 100).toFixed(3)}%]`);
    console.log(`               B=[${(ciBlo * 100).toFixed(3)}%, ${(ciBhi * 100).toFixed(3)}%]`);
    console.log(`  실제 배율    B/A=${actualMult.toFixed(4)}x (이론: ${EXPECTED_DROP_MULT.toFixed(4)}x, 오차: ${(multError * 100).toFixed(2)}%)`);
    console.log(`  판정 A (이론값이 A의 CI 안에 있는가): ${passA ? 'PASS' : 'FAIL'}`);
    console.log(`  판정 B (이론값이 B의 CI 안에 있는가): ${passB ? 'PASS' : 'FAIL'}`);
    console.log(`  판정 배율 (오차 5% 이내):             ${multPass ? 'PASS' : 'FAIL'}`);
    console.log('');
  }

  console.log('=== 종합 판정 ===');
  if (allPass) {
    console.log('PASS: 맹세 드롭 보너스가 실제 게임 루프에 올바르게 적용되고 있습니다.');
  } else {
    console.log('FAIL: 일부 항목이 이론값 범위를 벗어났습니다. 상세 내용을 검토하세요.');
  }

  console.log('');
  console.log('[주의] 사망 페널티 미반영: ctx.hp를 조작하지 않았으므로 처치 후 전투 재개 없음');
  console.log('[주의] profTypes.size=0 (equippedArts=[]) → 숙련도 기반 dropRateMultiplier=1 (기준값)');
}

main();
