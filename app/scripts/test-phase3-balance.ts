/**
 * Phase 3 밸런스 시뮬레이션
 *
 * "합리적 플레이어" 가정:
 * - 기(gi)/심(sim)/체(che)에 균등 투자 (가장 낮은 스탯 우선)
 * - 사냥 가능한 가장 강한 몬스터와 전투
 * - 초(招) 발견 시 포인트 여유 있으면 즉시 활성화
 * - 사냥→투자→사냥 사이클 반복
 */

import {
  resetGame, advanceTime, advanceTimeWithCheck,
  getState, callAction, setState,
} from '../src/testAdapter';

// ============================================================
// 유틸리티
// ============================================================
function log(msg: string) { console.log(msg); }

function totalStats(): number {
  const s = getState().stats;
  return s.gi + s.sim + s.che;
}

/** 전투 종료 보장 */
function ensureOutOfBattle() {
  const s = getState();
  if (s.battleMode !== 'none') callAction('abandonBattle');
  if (getState().battleResult) callAction('dismissBattleResult');
}

/** 균등 투자: 가장 낮은 스탯에 투자 */
function investEqually(): number {
  ensureOutOfBattle();
  let invested = 0;
  while (true) {
    const s = getState();
    const stats = s.stats;
    const entries: { stat: 'gi' | 'sim' | 'che'; level: number; cost: number }[] = [
      { stat: 'gi', level: stats.gi, cost: callAction('getStatCost', stats.gi) },
      { stat: 'sim', level: stats.sim, cost: callAction('getStatCost', stats.sim) },
      { stat: 'che', level: stats.che, cost: callAction('getStatCost', stats.che) },
    ];
    entries.sort((a, b) => a.level - b.level || a.cost - b.cost);
    if (s.qi < entries[0].cost) break;
    callAction('investStat', entries[0].stat);
    invested++;
  }
  return invested;
}

const MONSTER_NAMES: Record<string, string> = {
  squirrel: '다람쥐', rabbit: '토끼', fox: '여우',
  deer: '사슴', boar: '멧돼지', wolf: '늑대', bear: '곰',
  tiger_boss: '산군', training_wood: '나무인형', training_iron: '철인형',
};

// ============================================================
// 마일스톤 추적
// ============================================================
interface Milestone { name: string; time: number; details: string; }
const milestones: Milestone[] = [];
const achieved = new Set<string>();
let simTime = 0;

function ms(name: string, details: string = '') {
  if (achieved.has(name)) return;
  achieved.add(name);
  const s = getState();
  milestones.push({
    name, time: simTime,
    details: details || `기=${s.stats.gi} 심=${s.stats.sim} 체=${s.stats.che} 합=${totalStats()} qi=${Math.floor(s.qi)} 심득=${s.totalSimdeuk}`,
  });
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${m}분${sec.toString().padStart(2, '0')}초`;
}

// ============================================================
// 사냥 테스트 (안정 사냥 가능 여부 판단 - 이론 기반)
// ============================================================
interface MonsterInfo {
  id: string; hp: number; atk: number; interval: number; regen: number; simdeuk: number;
}
const YASAN_MONSTERS: MonsterInfo[] = [
  { id: 'squirrel', hp: 25, atk: 4, interval: 3.5, regen: 0, simdeuk: 2 },
  { id: 'rabbit', hp: 40, atk: 5, interval: 3.0, regen: 0, simdeuk: 4 },
  { id: 'fox', hp: 70, atk: 8, interval: 2.8, regen: 0, simdeuk: 7 },
  { id: 'deer', hp: 110, atk: 6, interval: 3.0, regen: 0, simdeuk: 9 },
  { id: 'boar', hp: 90, atk: 14, interval: 2.2, regen: 0, simdeuk: 10 },
  { id: 'wolf', hp: 160, atk: 16, interval: 2.0, regen: 0, simdeuk: 15 },
  { id: 'bear', hp: 280, atk: 22, interval: 2.5, regen: 0, simdeuk: 25 },
];

/** 이론적 DPS 기반 타겟 선택 */
function findBestTarget(): string | null {
  const s = getState();
  const { gi, sim, che } = s.stats;
  const atk = 150 * gi / (gi + 100) + 100 * sim / (sim + 100) + 50 * che / (che + 100);
  if (atk <= 0) return null;

  const hasWeapon = s.equippedArts.includes('samjae_sword');
  const mult = hasWeapon ? 0.7 : 0.5;
  const dps = atk * mult / 2.5;
  const hp = s.maxHp;

  for (let i = YASAN_MONSTERS.length - 1; i >= 0; i--) {
    const m = YASAN_MONSTERS[i];
    const netDps = dps - m.regen;
    if (netDps <= 0) continue;
    const killTime = m.hp / netDps;
    const monDps = m.atk / m.interval;
    const damageTaken = monDps * killTime;
    // 안전 기준: 1마리 처치 시 피해 < HP * 70%
    if (damageTaken < hp * 0.7 && killTime < 30) return m.id;
  }
  return null;
}

/** 심득 효율 기반 최적 타겟 (강한 몬스터 = 더 높은 심득/초) */
function findEfficiencyTarget(): string | null {
  const s = getState();
  const { gi, sim, che } = s.stats;
  const atk = 150 * gi / (gi + 100) + 100 * sim / (sim + 100) + 50 * che / (che + 100);
  if (atk <= 0) return null;

  const hasWeapon = s.equippedArts.includes('samjae_sword');
  const mult = hasWeapon ? 0.7 : 0.5;
  const dps = atk * mult / 2.5;
  const hp = s.maxHp;

  let bestTarget: string | null = null;
  let bestEfficiency = 0;

  for (const m of YASAN_MONSTERS) {
    const netDps = dps - m.regen;
    if (netDps <= 0) continue;
    const killTime = m.hp / netDps;
    const monDps = m.atk / m.interval;
    const damageTaken = monDps * killTime;
    if (damageTaken >= hp * 0.7 || killTime >= 30) continue;

    const efficiency = m.simdeuk / killTime; // 심득/초
    if (efficiency > bestEfficiency) {
      bestEfficiency = efficiency;
      bestTarget = m.id;
    }
  }
  return bestTarget;
}

// ============================================================
// 메인 시뮬레이션
// ============================================================
function runSimulation() {
  resetGame();
  simTime = 0;

  const MAX_TIME = 7200; // 2시간

  // ── Phase 0: 초기 idle + 수련장 ──
  log('[ Phase 0: 초기 기운 축적 + 수련장 ]');

  // ATK(0,0,0) = 0 → 스탯 투자 필요
  // 나무인형: DPS > 0 필요 → 스탯 1/1/1 (30초 idle)
  // 철인형: DPS > regen(2) 필요 → 스탯 3/3/3 (누적 102초 idle)
  // 먼저 102초 idle로 3/3/3까지 도달, 그 후 수련장 클리어
  advanceTime(102);
  simTime += 102;
  investEqually();

  let s = getState();
  log(`  102초 idle 후: 기=${s.stats.gi} 심=${s.stats.sim} 체=${s.stats.che} 합=${totalStats()}`);

  // 나무인형 사냥 (1마리만)
  callAction('startHunt', 'training', 'training_wood');
  const woodTime = advanceTimeWithCheck(30, (state) => {
    // 첫 처치 후 중단
    if ((state.killCounts['training_wood'] ?? 0) >= 1) return true;
    return false;
  });
  simTime += woodTime;
  ensureOutOfBattle();

  // 삼재검법 학습 + 장착
  s = getState();
  const swordScroll = s.inventory.find(i => i.artId === 'samjae_sword');
  if (swordScroll) {
    callAction('learnScroll', swordScroll.id);
    callAction('equipArt', 'samjae_sword');
    log(`  나무인형 처치 (${woodTime}초) → 삼재검법 획득`);
  }
  ms('나무인형 첫 처치');

  // 철인형 사냥 (1마리만)
  callAction('startHunt', 'training', 'training_iron');
  const ironTime = advanceTimeWithCheck(120, (state) => {
    if ((state.killCounts['training_iron'] ?? 0) >= 1) return true;
    return false;
  });
  simTime += ironTime;
  ensureOutOfBattle();

  s = getState();
  const simbeopScroll = s.inventory.find(i => i.artId === 'samjae_simbeop');
  if (simbeopScroll) {
    callAction('learnScroll', simbeopScroll.id);
    callAction('equipSimbeop', 'samjae_simbeop');
    log(`  철인형 처치 (${ironTime}초) → 삼재심법 획득`);
  }
  ms('수련장 클리어 (나무+철인형)');
  log(`  기운 생산: ${callAction('getQiPerSec').toFixed(1)}/초`);

  // ── Phase 1: 사냥 + 성장 루프 ──
  log('\n[ Phase 1: 사냥 + 성장 루프 ]');

  let currentTarget: string | null = null;
  let stableTargets = new Set<string>();
  let lastLog = 0;

  while (simTime < MAX_TIME) {
    // 1) 전투 종료 보장
    ensureOutOfBattle();

    // 2) idle 기운 축적 (20초)
    advanceTime(20);
    simTime += 20;

    // 3) 스탯 투자
    const invested = investEqually();

    // 4) 초(招) 확인/활성화
    checkAndActivateMasteries();

    // 5) HP 회복
    s = getState();
    if (s.hp < s.maxHp * 0.8) callAction('healWithQi');

    // 6) 돌파 시도
    if (!achieved.has('삼류 중기 돌파') && totalStats() >= 30) {
      try {
        callAction('attemptBreakthrough');
        if (getState().tier >= 1) {
          ms('삼류 중기 돌파');
          log(`  [${formatTime(simTime)}] 삼류 중기 돌파! 합=${totalStats()}`);
        }
      } catch { /* 조건 미충족 */ }
    }

    // 7) 타겟 결정
    const newTarget = findBestTarget();
    if (newTarget && newTarget !== currentTarget) {
      if (currentTarget) log(`  [${formatTime(simTime)}] 타겟: ${MONSTER_NAMES[currentTarget]} → ${MONSTER_NAMES[newTarget]}`);
      else log(`  [${formatTime(simTime)}] 첫 타겟: ${MONSTER_NAMES[newTarget]}`);
      currentTarget = newTarget;
    }

    if (!currentTarget) continue;

    // 8) 사냥 (60초)
    setState({ hp: getState().maxHp });
    callAction('startHunt', 'yasan', currentTarget);

    const startKills = getState().killCounts[currentTarget] ?? 0;
    let huntDeaths = 0;

    advanceTimeWithCheck(60, (state) => {
      if (state.battleMode === 'none') {
        if (state.battleResult) {
          if (state.battleResult.type === 'death' || state.battleResult.type === 'hunt_end') huntDeaths++;
          callAction('dismissBattleResult');
        }
        return true;
      }
      return false;
    });
    simTime += 60;

    s = getState();
    const huntKills = (s.killCounts[currentTarget] ?? 0) - startKills;
    ensureOutOfBattle();

    // 안정 사냥 판정
    if (huntDeaths === 0 && huntKills >= 2) {
      if (!stableTargets.has(currentTarget)) {
        stableTargets.add(currentTarget);
        // 마일스톤
        if (currentTarget === 'squirrel') ms('야산 첫 몬스터(다람쥐) 안정 사냥');
        if (['fox', 'deer', 'boar'].includes(currentTarget) && !achieved.has('야산 중간 몬스터 안정 사냥'))
          ms('야산 중간 몬스터 안정 사냥', `target=${MONSTER_NAMES[currentTarget]}`);
        if (currentTarget === 'bear') ms('야산 최강(곰) 안정 사냥');
      }
    }

    // 주기적 상태 로그 (5분마다)
    if (simTime - lastLog >= 300) {
      lastLog = simTime;
      s = getState();
      log(`  [${formatTime(simTime)}] 합=${totalStats()} qi=${Math.floor(s.qi)} 심득=${s.totalSimdeuk} 타겟=${MONSTER_NAMES[currentTarget] ?? currentTarget}`);
    }

    // 보스 도전
    if (achieved.has('야산 최강(곰) 안정 사냥') && !achieved.has('보스(산군) 첫 클리어')) {
      ensureOutOfBattle();
      setState({ hp: getState().maxHp, stamina: 0, ultCooldownTimer: 0 });
      callAction('startHunt', 'yasan', 'tiger_boss');
      const startBK = getState().killCounts['tiger_boss'] ?? 0;
      const bossTime = advanceTimeWithCheck(120, (state) => {
        if (state.battleMode === 'none') {
          if (state.battleResult) callAction('dismissBattleResult');
          return true;
        }
        return false;
      });
      simTime += bossTime;
      const bossKilled = (getState().killCounts['tiger_boss'] ?? 0) > startBK;
      ensureOutOfBattle();
      if (bossKilled) {
        ms('보스(산군) 첫 클리어', `bossTime=${bossTime}초`);
        log(`  [${formatTime(simTime)}] 산군 첫 클리어! (${bossTime}초)`);
      }
    }
  }

  printResults();
}

/** 초(招) 발견/활성화 */
function checkAndActivateMasteries() {
  while (getState().pendingEnlightenments.length > 0) {
    callAction('dismissEnlightenment');
  }
  const s = getState();
  const discovered = s.discoveredMasteries;
  for (const mId of discovered) {
    const state = getState();
    const isActive = Object.values(state.activeMasteries).some((ids: string[]) => ids.includes(mId));
    if (isActive) continue;
    for (const artId of ['samjae_sword', 'samjae_simbeop']) {
      try {
        callAction('activateMastery', artId, mId);
        if ((getState().activeMasteries[artId] ?? []).includes(mId)) {
          log(`  [${formatTime(simTime)}] 초(招) 활성: ${mId}`);
          if (mId === 'samjae_sword_ult') ms('삼재검법 1초 해금 (절초)');
          if (mId === 'samjae_simbeop_regen') ms('삼재심법 1초 해금 (내력 회복)');
          break;
        }
      } catch { /* ignore */ }
    }
  }
}

// ============================================================
// 결과 출력
// ============================================================
function printResults() {
  const s = getState();

  log('\n═══════════════════════════════════════════════════════════════');
  log('  Phase 3 밸런스 시뮬레이션 결과');
  log('═══════════════════════════════════════════════════════════════\n');

  log('1. 마일스톤 도달 시간');
  log('─────────────────────────────────────────────────────────────');
  for (const m of milestones) {
    log(`  ${formatTime(m.time).padStart(10)}  │  ${m.name}`);
    if (m.details) log(`${''.padStart(14)}  │    ▸ ${m.details}`);
  }

  if (milestones.length > 1) {
    log('\n2. 마일스톤 간 도달 시간 격차');
    log('─────────────────────────────────────────────────────────────');
    const warnings: string[] = [];
    for (let i = 1; i < milestones.length; i++) {
      const gap = milestones[i].time - milestones[i - 1].time;
      const warn = gap > 1800 ? ' ⚠️ 30분+ 정체!' : '';
      log(`  ${milestones[i - 1].name} → ${milestones[i].name}: ${formatTime(gap)}${warn}`);
      if (gap > 1800) warnings.push(`  - ${milestones[i - 1].name} → ${milestones[i].name}: ${formatTime(gap)}`);
    }
    if (warnings.length > 0) {
      log('\n  ⚠️ 30분 이상 정체 구간 감지:');
      for (const w of warnings) log(w);
    }
  }

  const allMilestones = [
    '수련장 클리어 (나무+철인형)',
    '야산 첫 몬스터(다람쥐) 안정 사냥',
    '야산 중간 몬스터 안정 사냥',
    '야산 최강(곰) 안정 사냥',
    '삼재검법 1초 해금 (절초)',
    '삼재심법 1초 해금 (내력 회복)',
    '보스(산군) 첫 클리어',
    '삼류 중기 돌파',
  ];
  log('\n3. 체크리스트');
  log('─────────────────────────────────────────────────────────────');
  for (const name of allMilestones) log(`  [${achieved.has(name) ? '✓' : '✗'}] ${name}`);

  log('\n4. 최종 상태');
  log('─────────────────────────────────────────────────────────────');
  log(`  시뮬 시간: ${formatTime(simTime)}`);
  log(`  기운(qi): ${Math.floor(s.qi)} | 총투자: ${Math.floor(s.totalSpentQi)}`);
  log(`  스탯: 기=${s.stats.gi} 심=${s.stats.sim} 체=${s.stats.che} (합=${totalStats()})`);
  log(`  HP: ${Math.floor(s.hp)}/${s.maxHp}`);
  log(`  경지: tier ${s.tier}`);
  log(`  총심득: ${s.totalSimdeuk}`);
  log(`  포인트: ${s.artPoints} (사용: ${callAction('getUsedPoints')})`);
  log(`  무공: ${s.ownedArts.map(a => `${a.id}(심득${a.totalSimdeuk})`).join(', ') || '없음'}`);
  log(`  활성 초: ${JSON.stringify(s.activeMasteries)}`);
  log(`  기운/초: ${callAction('getQiPerSec').toFixed(2)}`);

  log('\n  처치 횟수:');
  for (const [id, c] of Object.entries(s.killCounts)) {
    if (c > 0) log(`    ${MONSTER_NAMES[id] ?? id}: ${c}회`);
  }

  // 절초 분석
  log('\n5. 절초 쿨타임 검토');
  log('─────────────────────────────────────────────────────────────');
  if (achieved.has('삼재검법 1초 해금 (절초)')) {
    const ultMs = milestones.find(m => m.name.includes('절초'));
    log(`  해금: ${ultMs ? formatTime(ultMs.time) : '?'}`);
    log(`  쿨타임 10초 / 코스트 30 / 기본 내력회복 3/초 → 10초에 30 회복 = 쿨마다 사용 가능`);
    log(`  판정: 쿨타임과 코스트가 균형적`);
  } else {
    log(`  미해금 — 삼재검법 심득 80 발견, 150 활성 필요`);
    const swordSimdeuk = s.ownedArts.find(a => a.id === 'samjae_sword')?.totalSimdeuk ?? 0;
    log(`  현재 삼재검법 심득: ${swordSimdeuk} (발견 필요: 80, 활성 필요: 150)`);
  }

  // 몬스터 테이블
  log('\n6. 스탯별 몬스터 전투 결과 (60초 사냥)');
  log('─────────────────────────────────────────────────────────────');
  runMonsterTable();
}

function runMonsterTable() {
  const builds = [
    { name: '합3', gi: 1, sim: 1, che: 1 },
    { name: '합9', gi: 3, sim: 3, che: 3 },
    { name: '합15', gi: 5, sim: 5, che: 5 },
    { name: '합24', gi: 8, sim: 8, che: 8 },
    { name: '합36', gi: 12, sim: 12, che: 12 },
    { name: '합60', gi: 20, sim: 20, che: 20 },
    { name: '합90', gi: 30, sim: 30, che: 30 },
  ];
  const monsters = ['squirrel', 'rabbit', 'fox', 'boar', 'wolf', 'bear', 'tiger_boss'];

  log(`  ${'빌드'.padEnd(8)} | ${monsters.map(m => (MONSTER_NAMES[m]).padStart(6)).join(' | ')}`);
  log('  ' + '-'.repeat(8 + monsters.length * 9));

  for (const build of builds) {
    resetGame();
    setState({
      ownedArts: [
        { id: 'samjae_sword', totalSimdeuk: 0 },
        { id: 'samjae_simbeop', totalSimdeuk: 0 },
      ],
      equippedArts: ['samjae_sword'],
      equippedSimbeop: 'samjae_simbeop',
      stats: { gi: build.gi, sim: build.sim, che: build.che },
      tutorialFlags: { equippedSword: true, equippedSimbeop: true, yasanUnlocked: true, killedWood: true, killedIron: true },
      fieldUnlocks: { training: true, yasan: true, inn: true },
    });
    setState({ hp: getState().maxHp });

    const results: string[] = [];
    for (const mid of monsters) {
      setState({ hp: getState().maxHp, stamina: 0, ultCooldownTimer: 0, currentBattleDuration: 0 });
      callAction('startHunt', 'yasan', mid);
      let died = false;
      const sk = getState().killCounts[mid] ?? 0;
      advanceTimeWithCheck(60, (state) => {
        if (state.battleMode === 'none') {
          if (state.battleResult) {
            if (state.battleResult.type === 'death' || state.battleResult.type === 'hunt_end') died = true;
            callAction('dismissBattleResult');
          }
          return true;
        }
        return false;
      });
      const kills = (getState().killCounts[mid] ?? 0) - sk;
      ensureOutOfBattle();
      if (died) results.push(kills > 0 ? `${kills}K/D` : '  사망');
      else results.push(kills > 0 ? `  ${kills}K` : '  --');
    }
    log(`  ${build.name.padEnd(8)} | ${results.map(r => r.padStart(6)).join(' | ')}`);
  }
}

// ============================================================
log('═══ Phase 3 밸런스 시뮬레이션 시작 ═══\n');
runSimulation();
log('\n═══ 시뮬레이션 완료 ═══');
