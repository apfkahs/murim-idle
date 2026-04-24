/**
 * 배화교 5종 몬스터의 '희미한 잔불' / '하얀 재' 드랍률 검증
 *
 * 유저 피드백: "재가 잔불보다 적게 나온다"
 * 데이터상: 재가 잔불보다 2~3배 높음 (경보사는 잔불 없음)
 *
 * 검증 방법:
 *   battleRewards.ts:274-292 의 드랍 루프를 격리 재현.
 *   - materialDrops 배열 순회
 *   - 각 항목 독립 Math.random()
 *   - excludeFromDropBonus: true → dropRateMultiplier 미적용 (=1)
 *
 * 실행:
 *   cd app && npx tsx scripts/test-baehwa-drop.ts
 */
import { BAEHWAGYO_MONSTERS } from '../src/data/monsters';
import { MATERIALS } from '../src/data/materials';

const TRIALS = 100_000; // 10,000보다 크게 잡아 표본오차 축소

interface Row {
  monsterId: string;
  monsterName: string;
  materialId: string;
  defined: number;  // 데이터 정의값
  observed: number; // 실측 드랍률
  drops: number;    // 드랍 횟수
  diff: number;     // observed - defined (%p)
}

const rows: Row[] = [];

for (const mon of BAEHWAGYO_MONSTERS) {
  if (!mon.materialDrops) continue;

  // 몬스터별 드랍 카운트
  const counts: Record<string, number> = {};
  for (const d of mon.materialDrops) counts[d.materialId] = 0;

  // battleRewards.ts 의 드랍 루프 재현
  for (let i = 0; i < TRIALS; i++) {
    for (const mDrop of mon.materialDrops) {
      const matDef = MATERIALS.find(m => m.id === mDrop.materialId);
      const dropRateMultiplier = 1; // 테스트 기준값
      const effectiveMultiplier = matDef?.excludeFromDropBonus ? 1 : dropRateMultiplier;
      if (Math.random() < Math.min(mDrop.chance * effectiveMultiplier, 1)) {
        counts[mDrop.materialId]++;
      }
    }
  }

  for (const mDrop of mon.materialDrops) {
    const observed = counts[mDrop.materialId] / TRIALS;
    rows.push({
      monsterId: mon.id,
      monsterName: mon.name,
      materialId: mDrop.materialId,
      defined: mDrop.chance,
      observed,
      drops: counts[mDrop.materialId],
      diff: (observed - mDrop.chance) * 100,
    });
  }
}

// 출력
console.log(`\n=== 배화교 몬스터 드랍률 검증 (시행 ${TRIALS.toLocaleString()}회/몬스터) ===\n`);
console.log('몬스터               | 재료             | 정의값   | 실측     | 드랍수   | 오차(%p)');
console.log('-'.repeat(90));
for (const r of rows) {
  const matName = MATERIALS.find(m => m.id === r.materialId)?.name ?? r.materialId;
  console.log(
    `${r.monsterName.padEnd(18)} | ${matName.padEnd(14)} | ${(r.defined * 100).toFixed(2).padStart(6)}% | ` +
    `${(r.observed * 100).toFixed(3).padStart(7)}% | ${String(r.drops).padStart(7)} | ${r.diff >= 0 ? '+' : ''}${r.diff.toFixed(3)}`,
  );
}

// 잔불 vs 재 합계 비교
console.log('\n=== 잔불 vs 재 총합 비교 ===');
let totalJanbul = 0;
let totalJae = 0;
for (const r of rows) {
  if (r.materialId === 'huimihan_janbul') totalJanbul += r.drops;
  if (r.materialId === 'hayan_jae') totalJae += r.drops;
}
console.log(`잔불 총 드랍: ${totalJanbul.toLocaleString()}회`);
console.log(`재 총 드랍:   ${totalJae.toLocaleString()}회`);
console.log(`재/잔불 비율: ${(totalJae / totalJanbul).toFixed(3)}x`);

// 유의미한 편차 검사 (>0.5%p)
const significantDeviations = rows.filter(r => Math.abs(r.diff) > 0.5);
console.log('\n=== 결론 ===');
if (significantDeviations.length > 0) {
  console.log('유의미한 편차 발견:');
  for (const r of significantDeviations) {
    console.log(`  - ${r.monsterName} / ${r.materialId}: ${r.diff >= 0 ? '+' : ''}${r.diff.toFixed(3)}%p`);
  }
} else {
  console.log('모든 몬스터의 실측 드랍률이 정의값과 0.5%p 이내로 일치.');
  console.log('드랍 로직은 정상 — 체감 문제로 판단.');
}
