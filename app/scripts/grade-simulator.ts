/**
 * 몬스터 등급 시뮬레이터
 * 실제 simulateTick을 직접 호출하여 전투 공식 변경 시 자동 반영.
 * 가상 플레이어 레벨을 이진탐색하여 각 몬스터의 '필요 레벨'을 산출하고 등급을 판정한다.
 *
 * 실행: cd app && npx tsx scripts/grade-simulator.ts
 */

import {
  createInitialState,
  calcMaxHp,
  calcAttackInterval,
  spawnEnemy,
  simulateTick,
  type GameState,
} from '../src/store/gameStore';
import {
  TRAINING_MONSTERS,
  YASAN_MONSTERS,
  HIDDEN_MONSTERS,
  YASAN_BOSS,
  INN_MONSTERS,
  INN_HIDDEN_MONSTERS,
  INN_BOSS,
  type MonsterDef,
} from '../src/data/monsters';

// ============================================================
// 설정
// ============================================================
const TRIALS = 200;        // 이진탐색 각 레벨당 시행 횟수
const MAX_TICKS = 1200;    // 최대 틱 (120초)
const DT = 0.1;            // 틱 간격 (초)
const BOSS_BONUS = 1.3;    // 보스 필요 레벨 가산 계수

// ============================================================
// 가상 플레이어 상태 생성
// ============================================================
function createSimState(playerLevel: number, monDef: MonsterDef): GameState {
  const totalSimdeuk = playerLevel * 10;
  const totalSpentNeigong = playerLevel * 50;
  const gyeongsin = playerLevel;
  const maxHp = calcMaxHp(totalSpentNeigong);

  const base = createInitialState();
  return {
    ...base,
    stats: { sungi: 0, gyeongsin, magi: 0 },
    totalSimdeuk,
    totalSpentNeigong,
    hp: maxHp,
    maxHp,
    neigong: 99999,
    equippedArts: ['samjae_sword'],
    ownedArts: [{ id: 'samjae_sword', totalSimdeuk }],
    battleMode: 'hunt' as const,
    huntTarget: monDef.id,
    currentEnemy: spawnEnemy(monDef),
    playerAttackTimer: calcAttackInterval(gyeongsin),
    enemyAttackTimer: monDef.attackInterval,
    currentField: 'yasan',
  };
}

// ============================================================
// 단일 전투 시뮬레이션
// ============================================================
function simulateFight(playerLevel: number, monDef: MonsterDef): boolean {
  let state = createSimState(playerLevel, monDef);
  for (let tick = 0; tick < MAX_TICKS; tick++) {
    const result = simulateTick(state, DT, true);
    state = { ...state, ...result };

    // 승리: 적 처치 감지
    if ((state.killCounts[monDef.id] ?? 0) > 0) return true;
    // 패배: battleResult 설정됨 (플레이어 사망)
    if (state.battleResult !== null) return false;
  }
  return false; // 타임아웃
}

// ============================================================
// 이진탐색: 승률 >= 50% 최소 레벨
// ============================================================
function findRequiredLevel(monDef: MonsterDef): number {
  let lo = 1;
  let hi = 500;

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    let wins = 0;
    for (let i = 0; i < TRIALS; i++) {
      if (simulateFight(mid, monDef)) wins++;
    }
    const winRate = wins / TRIALS;
    if (winRate >= 0.5) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }
  return lo;
}

// ============================================================
// 전체 몬스터 등급 판정
// ============================================================
interface MonsterGradeResult {
  name: string;
  id: string;
  field: string;
  type: string;
  requiredLevel: number;
  adjustedLevel: number; // 보스 가산 적용 후
  grade: number;
}

function getFieldName(monDef: MonsterDef): string {
  if (monDef.isTraining) return '수련장';
  // 야산 몬스터
  const yasanIds = YASAN_MONSTERS.map(m => m.id);
  const hiddenIds = HIDDEN_MONSTERS.map(m => m.id);
  if (yasanIds.includes(monDef.id) || hiddenIds.includes(monDef.id) || monDef.id === YASAN_BOSS.id) {
    return '야산';
  }
  return '객잔';
}

function getMonsterType(monDef: MonsterDef): string {
  if (monDef.isTraining) return '수련';
  if (monDef.isBoss) return '보스';
  if (monDef.isHidden) return '히든';
  return '일반';
}

function main() {
  console.log('=== 몬스터 등급 시뮬레이터 ===');
  console.log(`설정: ${TRIALS}회 시행, 최대 ${MAX_TICKS * DT}초, 보스 가산 x${BOSS_BONUS}`);
  console.log('');

  const allMonsters: MonsterDef[] = [
    ...TRAINING_MONSTERS,
    ...YASAN_MONSTERS,
    ...HIDDEN_MONSTERS,
    YASAN_BOSS,
    ...INN_MONSTERS,
    ...INN_HIDDEN_MONSTERS,
    INN_BOSS,
  ];

  const results: MonsterGradeResult[] = [];

  for (const mon of allMonsters) {
    // 수련 몬스터: 시뮬레이션 건너뛰기, 등급외 직접 할당
    if (mon.isTraining) {
      results.push({
        name: mon.name,
        id: mon.id,
        field: '수련장',
        type: '수련',
        requiredLevel: 0,
        adjustedLevel: 0,
        grade: 0,
      });
      console.log(`  [등급외] ${mon.name} (수련용, 시뮬레이션 건너뜀)`);
      continue;
    }

    process.stdout.write(`  시뮬레이션 중: ${mon.name}...`);
    const reqLevel = findRequiredLevel(mon);
    const adjusted = mon.isBoss ? Math.round(reqLevel * BOSS_BONUS) : reqLevel;

    results.push({
      name: mon.name,
      id: mon.id,
      field: getFieldName(mon),
      type: getMonsterType(mon),
      requiredLevel: reqLevel,
      adjustedLevel: adjusted,
      grade: 0, // 나중에 할당
    });

    console.log(` 필요 레벨: ${reqLevel}${mon.isBoss ? ` → 보정: ${adjusted}` : ''}`);
  }

  // 등급 구간 결정: 필요 레벨 기반 자연 경계
  const combatResults = results.filter(r => r.adjustedLevel > 0);
  combatResults.sort((a, b) => a.adjustedLevel - b.adjustedLevel);

  // 필요 레벨 분포 출력
  console.log('\n=== 필요 레벨 분포 ===');
  for (const r of combatResults) {
    const bar = '█'.repeat(Math.min(r.adjustedLevel, 80));
    console.log(`  ${r.name.padEnd(14)} Lv${String(r.adjustedLevel).padStart(3)} ${bar}`);
  }

  // 4등급 구간: 로그 스케일 기반 (지수적 성장에 적합)
  const levels = combatResults.map(r => r.adjustedLevel);
  const minLv = Math.max(levels[0], 1);
  const maxLv = levels[levels.length - 1];
  const logMin = Math.log(minLv);
  const logMax = Math.log(maxLv);
  const logStep = (logMax - logMin) / 4;
  const t1 = Math.round(Math.exp(logMin + logStep));
  const t2 = Math.round(Math.exp(logMin + logStep * 2));
  const t3 = Math.round(Math.exp(logMin + logStep * 3));

  console.log(`\n=== 등급 구간 (로그 스케일) ===`);
  console.log(`  1등급: Lv 1 ~ ${t1}`);
  console.log(`  2등급: Lv ${t1 + 1} ~ ${t2}`);
  console.log(`  3등급: Lv ${t2 + 1} ~ ${t3}`);
  console.log(`  4등급: Lv ${t3 + 1}+`);

  // 등급 할당
  for (const r of results) {
    if (r.adjustedLevel <= 0) {
      r.grade = 0;
    } else if (r.adjustedLevel <= t1) {
      r.grade = 1;
    } else if (r.adjustedLevel <= t2) {
      r.grade = 2;
    } else if (r.adjustedLevel <= t3) {
      r.grade = 3;
    } else {
      r.grade = 4;
    }
  }

  // 최종 결과 테이블
  const GRADE_NAMES = ['등급외', '1등급', '2등급', '3등급', '4등급'];
  console.log('\n=== 최종 등급 판정 결과 ===');
  console.log('  ' + '몬스터'.padEnd(14) + '전장'.padEnd(6) + '유형'.padEnd(6) + '필요Lv'.padStart(6) + '  보정Lv'.padStart(6) + '  등급');
  console.log('  ' + '-'.repeat(56));

  for (const r of results) {
    console.log(
      '  ' +
      r.name.padEnd(14) +
      r.field.padEnd(6) +
      r.type.padEnd(6) +
      String(r.requiredLevel).padStart(6) +
      String(r.adjustedLevel).padStart(8) +
      '  ' + GRADE_NAMES[r.grade]
    );
  }

  // monsters.ts에 넣을 grade 값 목록
  console.log('\n=== monsters.ts 반영용 grade 값 ===');
  for (const r of results) {
    console.log(`  { id: '${r.id}', grade: ${r.grade} },  // ${r.name} (Lv${r.adjustedLevel})`);
  }
}

main();
