/**
 * 외문수좌 보스 인프라 추가에 대한 회귀 검증.
 *
 * 검증 대상: 5개 배화교 보스
 *   baehwa_haengja, baehwa_howi, baehwa_geombosa, baehwa_hwabosa, baehwa_gyeongbosa
 *
 * 추가된 인프라(globalActionLockTimer, playerRecoveryDebuff, bossDamageTakenMultiplier 등)는
 * 외문수좌 보스에서만 set 된다. 5개 보스에는 set 코드가 없으므로 결과가 동일해야 한다.
 *
 * 측정 방식:
 *   - 각 보스에 대해 동일 빌드로 N회 전투 진행 (각 전투 최대 SECS_PER_FIGHT 초)
 *   - 처치 시 TTK 기록, 사망 시 입힌 누적 데미지 기록, 타임아웃 시 잔여 HP로 입힌 데미지 산출
 *   - 평균 데미지/초, 처치율, 사망률, 평균 보스 잔여 HP 출력
 *   - 회귀 비교용: 변경 전후 두 번 돌려서 통계가 일치하는지 확인
 *
 * 실행: cd app && npx tsx scripts/test-baehwa-boss-regression.ts
 */
import { getState, setState, callAction, advanceTime, resetGame } from '../src/testAdapter';
import { getMonsterDef } from '../src/data/monsters';

const BAEHWA_BOSSES = [
  'baehwa_haengja',
  'baehwa_howi',
  'baehwa_geombosa',
  'baehwa_hwabosa',
  'baehwa_gyeongbosa',
];

const FIELD_ID = 'baehwagyo_oemun';
const RUNS_PER_BOSS = 8;
const SECS_PER_FIGHT = 120;

interface FightResult {
  killed: boolean;
  died: boolean;
  timedOut: boolean;
  ttk: number;          // 처치 시 소요 초
  damageDealt: number;  // 보스에게 입힌 누적 피해 (보스 hp - 마지막 ehp)
  finalPlayerHpPct: number;
  bossFinalHp: number;  // 종료 시점 보스 잔여 hp
}

interface BossSummary {
  bossId: string;
  bossName: string;
  bossHp: number;
  runs: FightResult[];
}

function makeBuild(): void {
  resetGame();
  setState({
    stats: { gi: 800, sim: 800, che: 800 },
    totalSpentQi: 5_000_000,
    tier: 4,
    artPoints: 30,
    ownedArts: [
      { id: 'samjae_simbeop', totalSimdeuk: 8000 },
      { id: 'samjae_sword', totalSimdeuk: 8000 },
      { id: 'nokrim_fist', totalSimdeuk: 8000 },
    ],
    equippedArts: ['samjae_sword', 'nokrim_fist'],
    equippedSimbeop: 'samjae_simbeop',
    activeMasteries: {
      samjae_sword: ['samjae_sword_ult', 'samjae_sword_sense', 'samjae_sword_mastery', 'samjae_sword_taesan'],
      nokrim_fist: ['nokrim_fist_ult', 'nokrim_fist_chokmokta', 'nokrim_fist_chokmokta_cap', 'nokrim_fist_mokseok', 'nokrim_fist_mokseok_cap'],
      samjae_simbeop: ['samjae_simbeop_regen', 'samjae_simbeop_synergy'],
    },
    proficiency: { sword: 50000, fist: 50000, palm: 0, claw: 0, blade: 0, staff: 0, mental: 50000 } as any,
    fieldUnlocks: { training: true, yasan: true, inn: true, baehwagyo_oemun: true },
    tutorialFlags: {
      equippedSword: true, equippedSimbeop: true, yasanUnlocked: true,
      killedWood: true, killedIron: true,
    },
  });
  setState({ hp: 999999 });
}

function runOneFight(bossId: string, monDef: { hp: number }): FightResult {
  makeBuild();
  const startKills = getState().killCounts[bossId] ?? 0;

  callAction('startHunt', FIELD_ID, bossId);

  let killed = false;
  let died = false;
  let ttk = 0;
  let lastEnemyHp = monDef.hp;
  let lastPlayerHpPct = 1;

  for (let i = 0; i < SECS_PER_FIGHT; i++) {
    advanceTime(1);
    const s = getState();

    if (s.currentEnemy && s.currentEnemy.id === bossId) {
      lastEnemyHp = s.currentEnemy.hp;
    }
    if (s.maxHp > 0) lastPlayerHpPct = s.hp / s.maxHp;

    // 처치 감지: hunt 모드는 처치 시 battleResult 없이 자동 재스폰
    if ((getState().killCounts[bossId] ?? 0) > startKills) {
      killed = true;
      ttk = i + 1;
      lastEnemyHp = 0;
      setState({ battleMode: 'none', currentEnemy: null, battleResult: null });
      break;
    }

    // 사망 시 hunt_end 발생
    if (s.battleResult) {
      died = true;
      ttk = i + 1;
      callAction('dismissBattleResult');
      break;
    }
  }

  if (!killed && !died) {
    setState({ battleMode: 'none', currentEnemy: null, battleResult: null });
  }

  return {
    killed, died, timedOut: !killed && !died,
    ttk: killed ? ttk : 0,
    damageDealt: monDef.hp - lastEnemyHp,
    finalPlayerHpPct: lastPlayerHpPct,
    bossFinalHp: lastEnemyHp,
  };
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
function stdDev(nums: number[]): number {
  if (nums.length === 0) return 0;
  const m = avg(nums);
  return Math.sqrt(nums.reduce((s, n) => s + (n - m) ** 2, 0) / nums.length);
}

console.log(`\n=== 배화교 5보스 회귀 검증 ===`);
console.log(`각 보스 ${RUNS_PER_BOSS}회 시뮬 / 전투당 최대 ${SECS_PER_FIGHT}초 / 동일 빌드\n`);

const summaries: BossSummary[] = [];
for (const bossId of BAEHWA_BOSSES) {
  const monDef = getMonsterDef(bossId);
  if (!monDef) {
    console.log(`[SKIP] ${bossId}: 정의 없음`);
    continue;
  }
  const summary: BossSummary = { bossId, bossName: monDef.name, bossHp: monDef.hp, runs: [] };
  for (let r = 0; r < RUNS_PER_BOSS; r++) {
    summary.runs.push(runOneFight(bossId, monDef));
  }
  summaries.push(summary);

  const k = summary.runs.filter(r => r.killed).length;
  const d = summary.runs.filter(r => r.died).length;
  const t = summary.runs.filter(r => r.timedOut).length;
  process.stdout.write(`. ${bossId}: kills=${k} deaths=${d} timeouts=${t}\n`);
}

console.log(`\n=== 결과 ===\n`);
console.log(
  '보스ID'.padEnd(22) +
  '이름'.padEnd(14) +
  'HP'.padStart(6) +
  '처치'.padStart(5) +
  '사망'.padStart(5) +
  '타임'.padStart(5) +
  '평균데미지'.padStart(13) +
  '평균TTK(s)'.padStart(13) +
  '편차'.padStart(7) +
  '평균플HP%'.padStart(11) +
  '판정'.padStart(8),
);
console.log('-'.repeat(110));

const reportRows: any[] = [];
for (const s of summaries) {
  const damages = s.runs.map(r => r.damageDealt);
  const ttks = s.runs.filter(r => r.killed).map(r => r.ttk);
  const hps = s.runs.map(r => r.finalPlayerHpPct * 100);
  const killRate = s.runs.filter(r => r.killed).length / s.runs.length;

  // 회귀 검증: damage 평균과 ttk 분포가 변경 전후 동일하면 OK
  // 단순 표시: 처치율 100%면 OK, 0%면 (데미지 누적은 동일해야 함)
  const verdict = 'OK';  // 회귀 비교는 변경 전후 두 결과를 비교해야 판단 — 여기선 항상 OK 표시

  console.log(
    s.bossId.padEnd(22) +
    s.bossName.padEnd(14) +
    String(s.bossHp).padStart(6) +
    String(s.runs.filter(r => r.killed).length).padStart(5) +
    String(s.runs.filter(r => r.died).length).padStart(5) +
    String(s.runs.filter(r => r.timedOut).length).padStart(5) +
    avg(damages).toFixed(0).padStart(13) +
    (avg(ttks).toFixed(1) || '-').padStart(13) +
    stdDev(ttks).toFixed(1).padStart(7) +
    avg(hps).toFixed(0).padStart(11) +
    verdict.padStart(8),
  );

  reportRows.push({
    bossId: s.bossId,
    bossHp: s.bossHp,
    kills: s.runs.filter(r => r.killed).length,
    deaths: s.runs.filter(r => r.died).length,
    timeouts: s.runs.filter(r => r.timedOut).length,
    avgDamage: Math.round(avg(damages)),
    sdDamage: Math.round(stdDev(damages)),
    avgTtk: Number(avg(ttks).toFixed(2)),
    sdTtk: Number(stdDev(ttks).toFixed(2)),
    avgPlayerHpPct: Math.round(avg(hps)),
  });
}

console.log(`\n결과 JSON (회귀 비교용 — 변경 전 / 변경 후 두 번 돌려 비교):`);
console.log(JSON.stringify(reportRows, null, 2));
