/**
 * v2.0 밸런스 테스트 (심화학습 업데이트)
 *
 * 테스트 항목:
 * 1. 검기 잔류 계수 탐색 (현재 0.35 기준 분석)
 * 2. 전투 중 내공 계수 분석 (현재 0.25)
 * 3. 기존 패시브 포인트화 영향 분석
 * 4. 60분 진행도 비교 (심화 활성 vs 미활성)
 * 5. 객잔 난이도 곡선 (전투 가능성 확인)
 * 6. 오프라인 시뮬레이션 성능
 * 7. 몹별 효율 재측정 (심화 활성 상태)
 */

import { resetGame, advanceTime, advanceTimeWithCheck, getState, callAction, setState } from '../src/testAdapter';

const results: string[] = [];
function log(msg: string) {
  console.log(msg);
  results.push(msg);
}

// ============================================================
// 유틸리티
// ============================================================
function totalStats() {
  const s = getState().stats;
  return s.sungi + s.gyeongsin + s.magi;
}

function investAllAvailable() {
  let invested = 0;
  while (true) {
    const s = getState();
    const costs = [
      { stat: 'sungi' as const, cost: callAction('getStatCost', s.stats.sungi) },
      { stat: 'gyeongsin' as const, cost: callAction('getStatCost', s.stats.gyeongsin) },
      { stat: 'magi' as const, cost: callAction('getStatCost', s.stats.magi) },
    ];
    costs.sort((a, b) => a.cost - b.cost);
    if (s.neigong < costs[0].cost) break;
    callAction('investStat', costs[0].stat);
    invested++;
  }
  return invested;
}

function setupBaseBuild(opts: {
  sungi: number; gyeongsin: number; magi: number;
  swordGrade: number; simbeopGrade: number;
  spent: number; tier: number;
  artPoints: number;
  extraOwned?: { id: string; grade: number; proficiency: number }[];
  extraEquipped?: string[];
  masteries?: Record<string, string[]>;
}) {
  resetGame();
  const ownedArts: { id: string; grade: number; proficiency: number }[] = [
    { id: 'samjae_sword', grade: opts.swordGrade, proficiency: 0 },
    { id: 'samjae_simbeop', grade: opts.simbeopGrade, proficiency: 0 },
    ...(opts.extraOwned ?? []),
  ];
  const equippedArts = ['samjae_sword', ...(opts.extraEquipped ?? [])];

  setState({
    ownedArts,
    equippedArts,
    equippedSimbeop: 'samjae_simbeop',
    stats: { sungi: opts.sungi, gyeongsin: opts.gyeongsin, magi: opts.magi },
    totalSpentNeigong: opts.spent,
    tier: opts.tier,
    artPoints: opts.artPoints,
    neigong: 500,
    hp: 999,
    tutorialFlags: {
      equippedSword: true, equippedSimbeop: true, yasanUnlocked: true,
      killedWood: true, killedIron: true,
    },
    fieldUnlocks: { training: true, yasan: true, inn: true },
    activeMasteries: opts.masteries ?? {},
  });
  // HP를 maxHp로 세팅
  const s = getState();
  setState({ hp: s.maxHp });
}

function runHuntTest(fieldId: string, monsterId: string, seconds: number) {
  callAction('startHunt', fieldId, monsterId);
  let kills = 0;
  let deaths = 0;
  const startSimdeuk = getState().totalSimdeuk;
  let minHpPct = 100;

  advanceTimeWithCheck(seconds, (state, elapsed) => {
    const hpPct = (state.hp / state.maxHp) * 100;
    if (hpPct < minHpPct) minHpPct = hpPct;

    if (state.battleMode === 'none') {
      // 사망으로 전투 종료
      deaths++;
      if (state.battleResult) {
        callAction('dismissBattleResult');
      }
      // HP 회복 후 재시작
      setState({ hp: state.maxHp });
      callAction('startHunt', fieldId, monsterId);
    }
    return false;
  });

  // 전투 종료
  const endState = getState();
  if (endState.battleMode !== 'none') {
    callAction('abandonBattle');
    if (endState.battleResult) callAction('dismissBattleResult');
  }

  const totalSimdeukGained = endState.totalSimdeuk - startSimdeuk;
  kills = Object.values(endState.killCounts).reduce((s, v) => s + v, 0);

  return { kills, deaths, totalSimdeukGained, minHpPct };
}

// ============================================================
// 테스트 1: 검기 잔류 계수 탐색
// ============================================================
function test1_residualRatio() {
  log('\n========================================');
  log('  테스트 1: 검기 잔류 계수 분석 (현재 RESIDUAL_RATIO=0.35)');
  log('========================================');

  // 기획서 제공 데이터 기반 분석
  const grades = [
    { grade: 2, power: 18 },
    { grade: 3, power: 26 },
    { grade: 4, power: 36 },
    { grade: 5, power: 48 },
  ];
  const ratios = [0.3, 0.35, 0.4];
  const baseDmg = 5; // 평타

  log(`\n${'성급'.padEnd(4)} | ${'power'.padStart(5)} | ${'0.30'.padStart(5)} | ${'0.35'.padStart(5)} | ${'0.40'.padStart(5)} | ${'평타'.padStart(4)} | ${'0.30개선%'.padStart(8)} | ${'0.35개선%'.padStart(8)} | ${'0.40개선%'.padStart(8)}`);
  log('-'.repeat(85));

  for (const g of grades) {
    const residuals = ratios.map(r => Math.floor(g.power * r));
    const improvements = residuals.map(r => ((r - baseDmg) / baseDmg * 100).toFixed(0));
    log(`${g.grade}성`.padEnd(5) +
        `| ${String(g.power).padStart(5)} | ${String(residuals[0]).padStart(5)} | ${String(residuals[1]).padStart(5)} | ${String(residuals[2]).padStart(5)} | ${String(baseDmg).padStart(4)} | ${(improvements[0] + '%').padStart(8)} | ${(improvements[1] + '%').padStart(8)} | ${(improvements[2] + '%').padStart(8)}`);
  }

  // 실전 테스트: 2성 삼재검법으로 다람쥐 300초 사냥 (잔류 활성 vs 미활성)
  log('\n--- 실전: 2성 삼재검법 + 다람쥐 300초 ---');

  // 잔류 미활성
  setupBaseBuild({ sungi: 7, gyeongsin: 7, magi: 6, swordGrade: 2, simbeopGrade: 1, spent: 400, tier: 0, artPoints: 3 });
  const noRes = runHuntTest('yasan', 'squirrel', 300);

  // 잔류 활성
  setupBaseBuild({ sungi: 7, gyeongsin: 7, magi: 6, swordGrade: 2, simbeopGrade: 1, spent: 400, tier: 0, artPoints: 4,
    masteries: { samjae_sword: ['samjae_sword_residual'] }
  });
  const withRes = runHuntTest('yasan', 'squirrel', 300);

  log(`잔류 미활성: 처치 ${noRes.kills}회, 심득 ${noRes.totalSimdeukGained}, 사망 ${noRes.deaths}회`);
  log(`잔류 활성:   처치 ${withRes.kills}회, 심득 ${withRes.totalSimdeukGained}, 사망 ${withRes.deaths}회`);
  if (noRes.totalSimdeukGained > 0) {
    log(`효율 변화: +${((withRes.totalSimdeukGained / noRes.totalSimdeukGained - 1) * 100).toFixed(1)}%`);
  }
}

// ============================================================
// 테스트 2: 전투 중 내공 계수 분석
// ============================================================
function test2_combatNeigong() {
  log('\n========================================');
  log('  테스트 2: 전투 중 내공 계수 분석 (현재 COMBAT_NEIGONG_RATIO=0.25)');
  log('========================================');

  // 각 심법 성급별 비전투 내공 생산량 대비 전투 중 비율 분석
  const simbeopGrades = [
    { grade: 1, neigong: 1, total: 2 },  // 기본 1 + 심법 1 = 2/초
    { grade: 2, neigong: 1.5, total: 2.5 },
    { grade: 3, neigong: 2.5, total: 3.5 },
  ];
  const ratios = [0.2, 0.25, 0.3];

  log(`\n${'심법성급'.padEnd(8)} | ${'비전투'.padStart(7)} | ${'0.20전투'.padStart(8)} | ${'0.25전투'.padStart(8)} | ${'0.30전투'.padStart(8)}`);
  log('-'.repeat(55));

  for (const g of simbeopGrades) {
    const combats = ratios.map(r => (g.total * r).toFixed(2));
    log(`삼재${g.grade}성`.padEnd(9) +
        `| ${(g.total + '/초').padStart(7)} | ${(combats[0] + '/초').padStart(8)} | ${(combats[1] + '/초').padStart(8)} | ${(combats[2] + '/초').padStart(8)}`);
  }

  // 실전: 전투 수련 활성 vs 미활성, 300초 사냥하며 내공 축적 비교
  log('\n--- 실전: 삼재심법 2성 + 다람쥐 300초 사냥, 내공 축적 비교 ---');

  // 전투 수련 미활성
  setupBaseBuild({ sungi: 7, gyeongsin: 7, magi: 6, swordGrade: 2, simbeopGrade: 2, spent: 400, tier: 0, artPoints: 3 });
  setState({ neigong: 0 });
  callAction('startHunt', 'yasan', 'squirrel');
  advanceTime(300);
  const noMasteryNeigong = getState().neigong;
  callAction('abandonBattle');

  // 전투 수련 활성
  setupBaseBuild({ sungi: 7, gyeongsin: 7, magi: 6, swordGrade: 2, simbeopGrade: 2, spent: 400, tier: 0, artPoints: 4,
    masteries: { samjae_simbeop: ['samjae_simbeop_combat'] }
  });
  setState({ neigong: 0 });
  callAction('startHunt', 'yasan', 'squirrel');
  advanceTime(300);
  const withMasteryNeigong = getState().neigong;
  callAction('abandonBattle');

  log(`전투 수련 미활성: 300초 후 내공 ${noMasteryNeigong.toFixed(1)}`);
  log(`전투 수련 활성:   300초 후 내공 ${withMasteryNeigong.toFixed(1)}`);
  log(`전투 중에도 비전투 내공의 25%가 생산되어야 함`);
  log(`비전투 기대치(삼재심법2성): 2.5/초 x 300초 = 750`);
  log(`전투 중 기대치: 2.5 x 0.25 x 300 = 187.5 (사냥 사이 비전투 구간도 있으므로 더 높을 수 있음)`);
}

// ============================================================
// 테스트 3: 기존 패시브 포인트화 영향
// ============================================================
function test3_pointTradeoff() {
  log('\n========================================');
  log('  테스트 3: 패시브 포인트화 영향 분석');
  log('========================================');

  log('\n--- 포인트 배분 시뮬레이션 ---');
  log('초기 포인트: 3pt (기본)');
  log('업적으로 추가 가능한 pt: 18개 (업적 달성시 각 +1)');
  log('경지 보상: 삼류중기 +1, 삼류후기 +1, 이류초입 +2');
  log('');
  log('v1.x (자동 패시브): 삼재검법(1pt) 장착만 하면 2성 이연격 자동 해금');
  log('v2.0 (심화학습):');
  log('  - 삼재검법 장착: 1pt');
  log('  - 검기 잔류 (2성): 1pt');
  log('  - 이연격 (3성): 1pt');
  log('  - 전투 수련 (2성): 1pt');
  log('  = 기본 세팅만 4pt 필요 (초기 3pt로 부족)');
  log('');

  // 경지별 포인트 예산 분석
  const tiers = [
    { name: '삼류 초입 (tier 0)', pts: 3, note: '기본' },
    { name: '삼류 초입 + 업적 5개', pts: 8, note: '야산 초반' },
    { name: '삼류 중기 (tier 1)', pts: 9, note: '+1 from breakthrough' },
    { name: '삼류 중기 + 업적 10개', pts: 14, note: '야산 중반' },
    { name: '삼류 후기 (tier 2)', pts: 15, note: '+1 from breakthrough' },
  ];

  // 가능한 심화 세팅 및 비용
  const masteryOptions = [
    { name: '삼재검법 장착', cost: 1, desc: '기본 액티브 무공' },
    { name: '검기 잔류', cost: 1, desc: '미발동 시 대체 데미지' },
    { name: '이연격', cost: 1, desc: '5% 2연타' },
    { name: '파쇄', cost: 2, desc: '3% x1.3 치명타' },
    { name: '전투 수련', cost: 1, desc: '전투 중 내공' },
    { name: '기혈순환', cost: 1, desc: 'HP변환 +5%' },
    { name: '무당보법 장착', cost: 1, desc: '회피 패시브' },
    { name: '경보', cost: 1, desc: 'hunt 킬 시 HP 5%' },
  ];

  log(`\n${'경지 상태'.padEnd(25)} | ${'보유pt'.padStart(5)} | 가능한 빌드`);
  log('-'.repeat(80));

  for (const t of tiers) {
    // 빌드 조합
    let builds: string[] = [];
    if (t.pts >= 3) builds.push(`검법+잔류+전투수련(3pt)`);
    if (t.pts >= 4) builds.push(`검법+잔류+전투수련+보법(4pt)`);
    if (t.pts >= 5) builds.push(`검법+잔류+이연격+전투수련+보법(5pt)`);
    if (t.pts >= 7) builds.push(`검법+잔류+이연격+전투수련+기혈순환+보법+경보(7pt)`);
    log(`${t.name.padEnd(25)} | ${String(t.pts).padStart(5)} | ${builds.join(', ') || '검법만 가능'}`);
  }

  // 실전 비교: 3pt vs 5pt 빌드로 토끼 300초
  log('\n--- 실전: 3pt 빌드 vs 5pt 빌드, 토끼 300초 ---');

  // 3pt: 검법 + 잔류 + 전투수련
  setupBaseBuild({ sungi: 7, gyeongsin: 7, magi: 6, swordGrade: 2, simbeopGrade: 2, spent: 400, tier: 0, artPoints: 3,
    masteries: { samjae_sword: ['samjae_sword_residual'], samjae_simbeop: ['samjae_simbeop_combat'] }
  });
  const build3 = runHuntTest('yasan', 'rabbit', 300);

  // 5pt: 검법 + 잔류 + 이연격 + 전투수련 + 보법
  setupBaseBuild({ sungi: 7, gyeongsin: 7, magi: 6, swordGrade: 3, simbeopGrade: 2, spent: 400, tier: 1, artPoints: 5,
    extraOwned: [{ id: 'mudang_step', grade: 1, proficiency: 0 }],
    extraEquipped: ['mudang_step'],
    masteries: { samjae_sword: ['samjae_sword_residual', 'samjae_sword_double'], samjae_simbeop: ['samjae_simbeop_combat'] }
  });
  const build5 = runHuntTest('yasan', 'rabbit', 300);

  log(`3pt 빌드: 처치 ${build3.kills}, 심득 ${build3.totalSimdeukGained}, 사망 ${build3.deaths}`);
  log(`5pt 빌드: 처치 ${build5.kills}, 심득 ${build5.totalSimdeukGained}, 사망 ${build5.deaths}`);
}

// ============================================================
// 테스트 4: 60분 진행도 비교
// ============================================================
function test4_60minProgress() {
  log('\n========================================');
  log('  테스트 4: 60분 진행도 비교 (심화 활성 vs 미활성)');
  log('========================================');

  // 시나리오 A: 심화 미활성 (2성 빌드에서 시작)
  log('\n--- 시나리오 A: 심화 미활성, 경맥20 + 삼재검법2성 ---');
  setupBaseBuild({ sungi: 7, gyeongsin: 7, magi: 6, swordGrade: 2, simbeopGrade: 1, spent: 400, tier: 0, artPoints: 3 });

  const startStateA = { ...getState().stats, neigong: getState().neigong, totalSimdeuk: getState().totalSimdeuk };

  // 60분 = 3600초 동안 주기적으로 사냥 + 투자
  let huntTime = 0;
  let idleTime = 0;
  for (let cycle = 0; cycle < 12; cycle++) {
    // 5분 사냥
    callAction('startHunt', 'yasan', 'squirrel');
    advanceTimeWithCheck(300, (state) => {
      if (state.battleMode === 'none') {
        if (state.battleResult) callAction('dismissBattleResult');
        setState({ hp: state.maxHp });
        callAction('startHunt', 'yasan', 'squirrel');
      }
      return false;
    });
    if (getState().battleMode !== 'none') callAction('abandonBattle');
    if (getState().battleResult) callAction('dismissBattleResult');
    huntTime += 300;

    // 투자 + 회복
    investAllAvailable();
    setState({ hp: getState().maxHp });
  }

  const endA = getState();
  log(`최종 스탯: 선${endA.stats.sungi}/경${endA.stats.gyeongsin}/마${endA.stats.magi} (합: ${totalStats()})`);
  log(`내공: ${endA.neigong.toFixed(0)}, 심득: ${endA.totalSimdeuk}, HP: ${endA.hp}/${endA.maxHp}`);
  log(`사냥시간: ${huntTime}초, 대기시간: ${idleTime}초`);

  // 시나리오 B: 심화 활성 (같은 빌드 + 검기잔류 + 전투수련)
  log('\n--- 시나리오 B: 심화 활성 (검기잔류 + 전투수련), 경맥20 + 삼재검법2성 ---');
  setupBaseBuild({ sungi: 7, gyeongsin: 7, magi: 6, swordGrade: 2, simbeopGrade: 2, spent: 400, tier: 0, artPoints: 4,
    masteries: { samjae_sword: ['samjae_sword_residual'], samjae_simbeop: ['samjae_simbeop_combat'] }
  });

  huntTime = 0;
  for (let cycle = 0; cycle < 12; cycle++) {
    callAction('startHunt', 'yasan', 'squirrel');
    advanceTimeWithCheck(300, (state) => {
      if (state.battleMode === 'none') {
        if (state.battleResult) callAction('dismissBattleResult');
        setState({ hp: state.maxHp });
        callAction('startHunt', 'yasan', 'squirrel');
      }
      return false;
    });
    if (getState().battleMode !== 'none') callAction('abandonBattle');
    if (getState().battleResult) callAction('dismissBattleResult');
    huntTime += 300;

    investAllAvailable();
    setState({ hp: getState().maxHp });
  }

  const endB = getState();
  log(`최종 스탯: 선${endB.stats.sungi}/경${endB.stats.gyeongsin}/마${endB.stats.magi} (합: ${totalStats()})`);
  log(`내공: ${endB.neigong.toFixed(0)}, 심득: ${endB.totalSimdeuk}, HP: ${endB.hp}/${endB.maxHp}`);
  log(`사냥시간: ${huntTime}초`);

  log('\n--- 비교 ---');
  const simdeukDiff = endB.totalSimdeuk - endA.totalSimdeuk;
  log(`심득 차이: ${simdeukDiff} (${((endB.totalSimdeuk / endA.totalSimdeuk - 1) * 100).toFixed(1)}%)`);
  log(`내공 차이: ${(endB.neigong - endA.neigong).toFixed(0)}`);
}

// ============================================================
// 테스트 5: 객잔 난이도 곡선
// ============================================================
function test5_innDifficulty() {
  log('\n========================================');
  log('  테스트 5: 객잔 난이도 곡선 (전투 가능성 확인)');
  log('========================================');
  log('빌드: 경맥합60, 삼재검법3성, 삼재심법2성, 무당보법2성, tier 1');

  const innMonsters = [
    { id: 'drunk_thug', name: '취한 건달' },
    { id: 'peddler', name: '떠돌이 행상' },
    { id: 'troublemaker', name: '객잔 말썽꾼' },
    { id: 'wanderer', name: '떠돌이 무사' },
    { id: 'bounty_hunter', name: '현상금 사냥꾼' },
    { id: 'ronin', name: '흑도 낭인' },
    { id: 'bandit_chief', name: '삼류 도적 두목' },
  ];

  log(`\n${'몬스터'.padEnd(14)} | ${'HP'.padStart(4)} | ${'ATK'.padStart(4)} | ${'간격'.padStart(4)} | ${'처치수'.padStart(5)} | ${'사망수'.padStart(5)} | ${'심득'.padStart(5)} | ${'최저HP%'.padStart(7)}`);
  log('-'.repeat(75));

  for (const mon of innMonsters) {
    setupBaseBuild({
      sungi: 20, gyeongsin: 20, magi: 20, swordGrade: 3, simbeopGrade: 2, spent: 8000, tier: 1, artPoints: 9,
      extraOwned: [{ id: 'mudang_step', grade: 2, proficiency: 0 }],
      extraEquipped: ['mudang_step'],
      masteries: {
        samjae_sword: ['samjae_sword_residual', 'samjae_sword_double'],
        samjae_simbeop: ['samjae_simbeop_combat'],
        mudang_step: ['mudang_step_gyeongbo'],
      }
    });

    const result = runHuntTest('inn', mon.id, 120);

    // 몬스터 스탯 정보
    const monData = (() => {
      // 데이터 파일에서 가져온 정보
      const data: Record<string, { hp: number; atk: number; interval: number }> = {
        drunk_thug: { hp: 80, atk: 6, interval: 3.0 },
        peddler: { hp: 120, atk: 9, interval: 2.8 },
        troublemaker: { hp: 100, atk: 12, interval: 2.5 },
        wanderer: { hp: 180, atk: 14, interval: 2.4 },
        bounty_hunter: { hp: 150, atk: 18, interval: 2.2 },
        ronin: { hp: 250, atk: 16, interval: 2.0 },
        bandit_chief: { hp: 320, atk: 24, interval: 2.0 },
      };
      return data[mon.id];
    })();

    log(`${mon.name.padEnd(14)} | ${String(monData.hp).padStart(4)} | ${String(monData.atk).padStart(4)} | ${String(monData.interval).padStart(4)} | ${String(result.kills).padStart(5)} | ${String(result.deaths).padStart(5)} | ${String(result.totalSimdeukGained).padStart(5)} | ${result.minHpPct.toFixed(0).padStart(6)}%`);
  }

  log('\n참고: 객잔 몹의 simdeuk은 현재 0 (TODO)이므로 심득 효율 측정 불가. 전투 가능 여부만 확인.');
}

// ============================================================
// 테스트 6: 오프라인 시뮬레이션 성능
// ============================================================
function test6_offlinePerf() {
  log('\n========================================');
  log('  테스트 6: 오프라인 시뮬레이션 성능');
  log('========================================');

  // 비전투 상태로 오프라인
  setupBaseBuild({ sungi: 10, gyeongsin: 10, magi: 10, swordGrade: 2, simbeopGrade: 2, spent: 1000, tier: 0, artPoints: 3 });

  log('\n--- 비전투 상태 8시간 오프라인 ---');
  const start1 = Date.now();
  const result1 = callAction('processOfflineProgress', 28800);
  const elapsed1 = Date.now() - start1;
  log(`소요시간: ${elapsed1}ms`);
  log(`내공 획득: ${result1.neigongGained.toFixed(0)}, 심득: ${result1.simdeukGained}, 킬: ${result1.killCount}, 사망: ${result1.deathCount}`);

  // 전투 중 상태로 오프라인
  setupBaseBuild({ sungi: 10, gyeongsin: 10, magi: 10, swordGrade: 2, simbeopGrade: 2, spent: 1000, tier: 0, artPoints: 4,
    masteries: { samjae_sword: ['samjae_sword_residual'], samjae_simbeop: ['samjae_simbeop_combat'] }
  });
  callAction('startHunt', 'yasan', 'squirrel');

  log('\n--- 전투 중 상태 8시간 오프라인 ---');
  const start2 = Date.now();
  const result2 = callAction('processOfflineProgress', 28800);
  const elapsed2 = Date.now() - start2;
  log(`소요시간: ${elapsed2}ms`);
  log(`내공 획득: ${result2.neigongGained.toFixed(0)}, 심득: ${result2.simdeukGained}, 킬: ${result2.killCount}, 사망: ${result2.deathCount}`);
  log(`전투시간: ${result2.battleTime}초, 대기시간: ${result2.idleTime}초`);

  log('\n성능 기준: 8시간(28800틱)을 5초 이내 처리하면 양호');
}

// ============================================================
// 테스트 7: 몹별 효율 재측정 (심화 활성)
// ============================================================
function test7_monsterEfficiency() {
  log('\n========================================');
  log('  테스트 7: 몹별 효율 재측정 (심화 활성 상태)');
  log('========================================');
  log('빌드: 경맥20, 삼재검법2성, 삼재심법2성, 검기잔류 활성');

  const monsters = [
    { id: 'squirrel', name: '다람쥐', hp: 25, simdeuk: 2 },
    { id: 'rabbit', name: '토끼', hp: 40, simdeuk: 4 },
    { id: 'fox', name: '여우', hp: 70, simdeuk: 7 },
    { id: 'deer', name: '사슴', hp: 110, simdeuk: 9 },
    { id: 'boar', name: '멧돼지', hp: 90, simdeuk: 10 },
    { id: 'wolf', name: '늑대', hp: 160, simdeuk: 15 },
    { id: 'bear', name: '곰', hp: 280, simdeuk: 25 },
  ];

  log(`\n${'몬스터'.padEnd(8)} | ${'HP'.padStart(4)} | ${'심득'.padStart(4)} | ${'처치수'.padStart(5)} | ${'사망수'.padStart(5)} | ${'총심득'.padStart(6)} | ${'심득/초'.padStart(7)} | ${'최저HP%'.padStart(7)}`);
  log('-'.repeat(70));

  for (const mon of monsters) {
    setupBaseBuild({ sungi: 7, gyeongsin: 7, magi: 6, swordGrade: 2, simbeopGrade: 2, spent: 400, tier: 0, artPoints: 4,
      masteries: { samjae_sword: ['samjae_sword_residual'], samjae_simbeop: ['samjae_simbeop_combat'] }
    });

    const result = runHuntTest('yasan', mon.id, 300);
    const effPerSec = (result.totalSimdeukGained / 300).toFixed(3);

    log(`${mon.name.padEnd(8)} | ${String(mon.hp).padStart(4)} | ${String(mon.simdeuk).padStart(4)} | ${String(result.kills).padStart(5)} | ${String(result.deaths).padStart(5)} | ${String(result.totalSimdeukGained).padStart(6)} | ${effPerSec.padStart(7)} | ${result.minHpPct.toFixed(0).padStart(6)}%`);
  }

  // 비교: 심화 미활성 상태
  log('\n--- 비교: 같은 빌드, 심화 미활성 ---');
  log(`${'몬스터'.padEnd(8)} | ${'처치수'.padStart(5)} | ${'사망수'.padStart(5)} | ${'총심득'.padStart(6)} | ${'심득/초'.padStart(7)}`);
  log('-'.repeat(50));

  for (const mon of monsters) {
    setupBaseBuild({ sungi: 7, gyeongsin: 7, magi: 6, swordGrade: 2, simbeopGrade: 2, spent: 400, tier: 0, artPoints: 3 });

    const result = runHuntTest('yasan', mon.id, 300);
    const effPerSec = (result.totalSimdeukGained / 300).toFixed(3);

    log(`${mon.name.padEnd(8)} | ${String(result.kills).padStart(5)} | ${String(result.deaths).padStart(5)} | ${String(result.totalSimdeukGained).padStart(6)} | ${effPerSec.padStart(7)}`);
  }
}

// ============================================================
// 실행
// ============================================================
console.log('=== v2.0 밸런스 테스트 시작 ===\n');

test1_residualRatio();
test2_combatNeigong();
test3_pointTradeoff();
test4_60minProgress();
test5_innDifficulty();
test6_offlinePerf();
test7_monsterEfficiency();

console.log('\n=== 테스트 완료 ===');
