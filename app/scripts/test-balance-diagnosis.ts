/**
 * 밸런스 진단 테스트 (testAdapter 사용)
 * 실제 게임 엔진(tick)을 돌려서 관찰만 한다.
 *
 * 테스트 항목:
 * 1. 몹별 심득/초 효율 비교 (다양한 빌드 상태에서)
 * 2. 0~60분 진행도 테스트 (합리적 플레이어)
 * 3. JK 피드백 검증:
 *    - 평타 데미지 고정 5 → 성장 체감 없음
 *    - 크리티컬 의존도
 *    - 다람쥐 효율 최고 문제
 *    - 멧돼지~곰 구간 벽
 *    - 무당보법 HP 회복 사냥 중 안 됨
 *    - 전투 중 내공 생산 0
 */

import { resetGame, advanceTime, advanceTimeWithCheck, getState, callAction, setState } from '../src/testAdapter';

// ============================================================
// 유틸리티
// ============================================================
function totalStats() {
  const s = getState().stats;
  return s.sungi + s.gyeongsin + s.magi;
}

function investAllAvailable() {
  // 가장 비용이 낮은 스탯에 반복 투자
  let invested = 0;
  while (true) {
    const s = getState();
    const costs = [
      { stat: 'sungi' as const, cost: s.getStatCost(s.stats.sungi) },
      { stat: 'gyeongsin' as const, cost: s.getStatCost(s.stats.gyeongsin) },
      { stat: 'magi' as const, cost: s.getStatCost(s.stats.magi) },
    ];
    costs.sort((a, b) => a.cost - b.cost);
    if (s.neigong < costs[0].cost) break;
    callAction('investStat', costs[0].stat);
    invested++;
  }
  return invested;
}

function healIfNeeded() {
  const s = getState();
  if (s.hp < s.maxHp * 0.8 && s.neigong > 0) {
    callAction('healWithNeigong');
  }
}

// ============================================================
// 테스트 1: 몹별 심득/초 효율 비교
// ============================================================
function testMonsterEfficiency() {
  console.log('\n========================================');
  console.log('  테스트 1: 몹별 심득/초 효율 비교');
  console.log('========================================');

  const monsters = [
    { field: 'yasan', id: 'squirrel', name: '다람쥐' },
    { field: 'yasan', id: 'rabbit', name: '토끼' },
    { field: 'yasan', id: 'fox', name: '여우' },
    { field: 'yasan', id: 'deer', name: '사슴' },
    { field: 'yasan', id: 'boar', name: '멧돼지' },
    { field: 'yasan', id: 'wolf', name: '늑대' },
    { field: 'yasan', id: 'bear', name: '곰' },
  ];

  // 여러 빌드 상태에서 테스트
  const builds = [
    { name: '초반(경맥0)', sungi: 0, gyeongsin: 0, magi: 0, swordGrade: 1, spent: 0 },
    { name: '초중반(경맥10)', sungi: 4, gyeongsin: 3, magi: 3, swordGrade: 1, spent: 120 },
    { name: '중반(경맥20)', sungi: 7, gyeongsin: 7, magi: 6, swordGrade: 2, spent: 400 },
    { name: '중후반(경맥40)', sungi: 14, gyeongsin: 14, magi: 12, swordGrade: 2, spent: 2000 },
    { name: '후반(경맥60)', sungi: 20, gyeongsin: 20, magi: 20, swordGrade: 3, spent: 8000 },
  ];

  for (const build of builds) {
    console.log(`\n--- 빌드: ${build.name} (선${build.sungi}/경${build.gyeongsin}/마${build.magi}, 삼재검법 ${build.swordGrade}성) ---`);
    console.log(`${'몬스터'.padEnd(8)} | ${'처치수'.padStart(5)} | ${'사망수'.padStart(5)} | ${'총심득'.padStart(6)} | ${'심득/초'.padStart(7)} | ${'평균처치시간'.padStart(8)} | ${'잔여HP%'.padStart(7)}`);
    console.log('-'.repeat(75));

    for (const mon of monsters) {
      resetGame();

      // 수련장 무공 획득
      setState({
        ownedArts: [
          { id: 'samjae_sword', grade: build.swordGrade, proficiency: 0 },
          { id: 'samjae_simbeop', grade: 1, proficiency: 0 },
        ],
        equippedArts: ['samjae_sword'],
        equippedSimbeop: 'samjae_simbeop',
        stats: { sungi: build.sungi, gyeongsin: build.gyeongsin, magi: build.magi },
        totalSpentNeigong: build.spent,
        tutorialFlags: {
          equippedSword: true, equippedSimbeop: true, yasanUnlocked: true,
          killedWood: true, killedIron: true,
        },
      });
      // HP를 maxHp로 세팅
      const maxHp = getState().maxHp;
      setState({ hp: maxHp });

      // 120초 동안 해당 몹 사냥
      const testDuration = 120;
      let kills = 0;
      let deaths = 0;
      let totalSimdeukGained = 0;
      const startSimdeuk = getState().totalSimdeuk;
      let hpSamples: number[] = [];

      callAction('startHunt', mon.field, mon.id);

      for (let t = 0; t < testDuration; t++) {
        const beforeState = getState();
        advanceTime(1);
        const afterState = getState();

        // 사망 체크
        if (afterState.battleMode === 'none') {
          deaths++;
          // 사망 결과 dismiss하고 재도전
          if (afterState.battleResult) {
            callAction('dismissBattleResult');
          }
          // HP 회복 후 재도전
          setState({ hp: afterState.maxHp });
          callAction('startHunt', mon.field, mon.id);
        }

        // 킬 카운트
        const newKills = Object.values(afterState.killCounts).reduce((a: number, b: any) => a + (b as number), 0);
        const oldKills = kills + deaths; // rough

        if (t % 10 === 0) {
          hpSamples.push(afterState.hp / afterState.maxHp * 100);
        }
      }

      // 전투 중단
      if (getState().battleMode !== 'none') {
        callAction('abandonBattle');
      }
      if (getState().battleResult) {
        callAction('dismissBattleResult');
      }

      const finalState = getState();
      const totalKills = Object.entries(finalState.killCounts)
        .filter(([id]) => id === mon.id)
        .reduce((sum, [, c]) => sum + (c as number), 0);
      const simdeukGained = finalState.totalSimdeuk - startSimdeuk;
      const simdeukPerSec = simdeukGained / testDuration;
      const avgKillTime = totalKills > 0 ? testDuration / totalKills : Infinity;
      const avgHpPct = hpSamples.length > 0 ? hpSamples.reduce((a, b) => a + b, 0) / hpSamples.length : 0;

      console.log(
        `${mon.name.padEnd(8)} | ${String(totalKills).padStart(5)} | ${String(deaths).padStart(5)} | ${String(simdeukGained).padStart(6)} | ${simdeukPerSec.toFixed(2).padStart(7)} | ${avgKillTime.toFixed(1).padStart(8)}s | ${avgHpPct.toFixed(0).padStart(6)}%`
      );
    }
  }
}

// ============================================================
// 테스트 2: 평타 vs 무공 데미지 비율 관찰
// ============================================================
function testNormalAttackRatio() {
  console.log('\n========================================');
  console.log('  테스트 2: 평타 vs 무공 비율 관찰');
  console.log('========================================');

  const builds = [
    { name: '초반(경맥0)', sungi: 0, gyeongsin: 0, magi: 0, grade: 1 },
    { name: '중반(경맥20)', sungi: 7, gyeongsin: 7, magi: 6, grade: 2 },
    { name: '후반(경맥60)', sungi: 20, gyeongsin: 20, magi: 20, grade: 3 },
  ];

  for (const build of builds) {
    resetGame();
    setState({
      ownedArts: [
        { id: 'samjae_sword', grade: build.grade, proficiency: 0 },
        { id: 'samjae_simbeop', grade: 1, proficiency: 0 },
      ],
      equippedArts: ['samjae_sword'],
      equippedSimbeop: 'samjae_simbeop',
      stats: { sungi: build.sungi, gyeongsin: build.gyeongsin, magi: build.magi },
      totalSpentNeigong: 1000,
      tutorialFlags: {
        equippedSword: true, equippedSimbeop: true, yasanUnlocked: true,
        killedWood: true, killedIron: true,
      },
    });
    setState({ hp: getState().maxHp });

    callAction('startHunt', 'yasan', 'bear'); // 곰에게 테스트 (HP 높아서 오래 전투)

    let normalCount = 0;
    let artCount = 0;
    let normalDmgTotal = 0;
    let artDmgTotal = 0;
    let critCount = 0;
    let doubleCount = 0;

    // 300초 전투 (사망 시 부활)
    for (let t = 0; t < 300; t++) {
      const beforeLog = getState().battleLog.length;
      advanceTime(1);
      const afterState = getState();

      if (afterState.battleMode === 'none') {
        if (afterState.battleResult) callAction('dismissBattleResult');
        setState({ hp: afterState.maxHp });
        callAction('startHunt', 'yasan', 'bear');
        continue;
      }

      // 로그 분석
      const newLogs = afterState.battleLog.slice(beforeLog);
      for (const log of newLogs) {
        const dmgMatch = log.match(/(\d+) 피해/);
        if (!dmgMatch) continue;
        const dmg = parseInt(dmgMatch[1]);

        if (log.includes('평타')) {
          normalCount++;
          normalDmgTotal += dmg;
        } else if (log.includes('피해')) {
          if (log.includes('치명타')) critCount++;
          if (log.includes('연속')) doubleCount++;
          artCount++;
          artDmgTotal += dmg;
        }
      }
    }

    if (getState().battleMode !== 'none') callAction('abandonBattle');
    if (getState().battleResult) callAction('dismissBattleResult');

    const totalHits = normalCount + artCount;
    console.log(`\n--- ${build.name} (삼재검법 ${build.grade}성) ---`);
    console.log(`  총 공격: ${totalHits}회`);
    console.log(`  평타: ${normalCount}회 (${(normalCount/totalHits*100).toFixed(1)}%), 평균데미지: ${normalCount > 0 ? (normalDmgTotal/normalCount).toFixed(1) : 'N/A'}`);
    console.log(`  무공: ${artCount}회 (${(artCount/totalHits*100).toFixed(1)}%), 평균데미지: ${artCount > 0 ? (artDmgTotal/artCount).toFixed(1) : 'N/A'}`);
    console.log(`  치명타: ${critCount}회, 연속공격: ${doubleCount}회`);
    if (normalCount > 0 && artCount > 0) {
      console.log(`  무공/평타 데미지 비율: ${((artDmgTotal/artCount) / (normalDmgTotal/normalCount)).toFixed(2)}배`);
    }
  }
}

// ============================================================
// 테스트 3: 전투 중 내공 생산 검증
// ============================================================
function testNeigongDuringBattle() {
  console.log('\n========================================');
  console.log('  테스트 3: 전투 중 내공 생산 검증');
  console.log('========================================');

  resetGame();
  setState({
    ownedArts: [
      { id: 'samjae_sword', grade: 1, proficiency: 0 },
      { id: 'samjae_simbeop', grade: 1, proficiency: 0 },
    ],
    equippedArts: ['samjae_sword'],
    equippedSimbeop: 'samjae_simbeop',
    tutorialFlags: {
      equippedSword: true, equippedSimbeop: true, yasanUnlocked: true,
      killedWood: true, killedIron: true,
    },
  });
  setState({ hp: getState().maxHp });

  // 전투 외 30초
  const beforeIdle = getState().neigong;
  advanceTime(30);
  const afterIdle = getState().neigong;
  const idleRate = (afterIdle - beforeIdle) / 30;

  console.log(`  전투 외 내공 생산: ${beforeIdle.toFixed(1)} -> ${afterIdle.toFixed(1)} (${idleRate.toFixed(2)}/초)`);

  // 전투 중 30초
  const beforeBattle = getState().neigong;
  callAction('startHunt', 'yasan', 'squirrel');
  advanceTime(30);
  const afterBattle = getState().neigong;
  const battleRate = (afterBattle - beforeBattle) / 30;

  console.log(`  전투 중 내공 생산: ${beforeBattle.toFixed(1)} -> ${afterBattle.toFixed(1)} (${battleRate.toFixed(2)}/초)`);
  console.log(`  => 전투 중 내공 생산: ${battleRate === 0 ? '0 (확인됨)' : battleRate.toFixed(2) + '/초'}`);

  if (getState().battleMode !== 'none') callAction('abandonBattle');
  if (getState().battleResult) callAction('dismissBattleResult');
}

// ============================================================
// 테스트 4: 무당보법 HP 회복 검증 (전투 중 vs 전투 후)
// ============================================================
function testMudangStepHeal() {
  console.log('\n========================================');
  console.log('  테스트 4: 무당보법 HP 회복 검증');
  console.log('========================================');

  resetGame();
  setState({
    ownedArts: [
      { id: 'samjae_sword', grade: 2, proficiency: 0 },
      { id: 'samjae_simbeop', grade: 1, proficiency: 0 },
      { id: 'mudang_step', grade: 2, proficiency: 0 }, // 2성: post_battle_heal
    ],
    equippedArts: ['samjae_sword', 'mudang_step'],
    equippedSimbeop: 'samjae_simbeop',
    stats: { sungi: 10, gyeongsin: 10, magi: 10 },
    totalSpentNeigong: 1000,
    tutorialFlags: {
      equippedSword: true, equippedSimbeop: true, yasanUnlocked: true,
      killedWood: true, killedIron: true,
    },
  });
  setState({ hp: getState().maxHp });

  const maxHp = getState().maxHp;
  console.log(`  maxHp: ${maxHp}`);

  // 전투 중 HP 감소 관찰 (회복이 일어나는지)
  callAction('startHunt', 'yasan', 'squirrel');

  let hpLog: { t: number; hp: number }[] = [];
  let hpIncreases = 0;

  for (let t = 0; t < 60; t++) {
    const before = getState().hp;
    advanceTime(1);
    const after = getState().hp;

    if (getState().battleMode === 'none') {
      // 사망
      if (getState().battleResult) callAction('dismissBattleResult');
      break;
    }

    if (after > before && t > 0) {
      hpIncreases++;
      hpLog.push({ t, hp: after });
    }
  }

  if (getState().battleMode !== 'none') callAction('abandonBattle');
  if (getState().battleResult) callAction('dismissBattleResult');

  console.log(`  전투 중 HP 증가 횟수: ${hpIncreases}`);
  console.log(`  => 전투 중 자동 HP 회복: ${hpIncreases > 0 ? '있음' : '없음 (확인됨 - 전투 외에서만 회복)'}`);

  // 전투 외 HP 회복 테스트
  setState({ hp: Math.floor(maxHp * 0.5) });
  const hpBefore = getState().hp;
  advanceTime(10);
  const hpAfter = getState().hp;
  console.log(`  전투 외 10초 HP 회복: ${hpBefore.toFixed(0)} -> ${hpAfter.toFixed(0)} (+${(hpAfter - hpBefore).toFixed(0)})`);
}

// ============================================================
// 테스트 5: 60분 진행도 시뮬레이션 (합리적 플레이어)
// ============================================================
function testProgression60min() {
  console.log('\n========================================');
  console.log('  테스트 5: 60분 진행도 시뮬레이션');
  console.log('========================================');

  resetGame();

  const milestones: { name: string; time: number; stats: string; hp: string; simdeuk: number }[] = [];
  const achieved = new Set<string>();
  function ms(name: string) {
    if (achieved.has(name)) return;
    achieved.add(name);
    const s = getState();
    milestones.push({
      name,
      time: elapsed,
      stats: `선${s.stats.sungi}/경${s.stats.gyeongsin}/마${s.stats.magi}`,
      hp: `${Math.floor(s.hp)}/${s.maxHp}`,
      simdeuk: s.totalSimdeuk,
    });
  }

  let elapsed = 0;
  const MAX_TIME = 3600; // 60분

  // 5분 간격 스냅샷
  const snapshots: {
    time: number; stats: string; hp: string; neigong: number;
    totalSimdeuk: number; huntTarget: string; killsThisPeriod: number;
    artGrades: string;
  }[] = [];

  // Phase 0: 수련장
  // 나무인형 처치
  callAction('startHunt', 'training', 'training_wood');
  for (let t = 0; t < 30; t++) {
    advanceTime(1);
    elapsed++;
    if (getState().battleMode === 'none') break;
  }
  if (getState().battleResult) callAction('dismissBattleResult');

  // 삼재검법 장착
  if (getState().ownedArts.some((a: any) => a.id === 'samjae_sword')) {
    callAction('equipArt', 'samjae_sword');
    ms('나무인형 처치 + 삼재검법 획득');
  }

  // 철인형 처치
  callAction('startHunt', 'training', 'training_iron');
  for (let t = 0; t < 60; t++) {
    advanceTime(1);
    elapsed++;
    if (getState().battleMode === 'none') break;
  }
  if (getState().battleResult) callAction('dismissBattleResult');

  // 삼재심법 장착
  if (getState().ownedArts.some((a: any) => a.id === 'samjae_simbeop')) {
    callAction('equipSimbeop', 'samjae_simbeop');
    ms('철인형 처치 + 삼재심법 장착');
  }

  // Phase 1: 야산 사이클
  const yasanMobs = ['squirrel', 'rabbit', 'fox', 'deer', 'boar', 'wolf', 'bear'];
  const yasanNames: Record<string, string> = {
    squirrel: '다람쥐', rabbit: '토끼', fox: '여우', deer: '사슴',
    boar: '멧돼지', wolf: '늑대', bear: '곰',
  };

  let currentHuntTarget = 'squirrel';
  let lastSnapshotTime = 0;
  let killsSinceSnapshot = 0;
  let previousKillCounts = { ...getState().killCounts };

  while (elapsed < MAX_TIME) {
    // 스냅샷 (5분 간격)
    if (elapsed - lastSnapshotTime >= 300) {
      const s = getState();
      const currentKills = { ...s.killCounts };
      let periodKills = 0;
      for (const [id, count] of Object.entries(currentKills)) {
        periodKills += (count as number) - ((previousKillCounts as any)[id] ?? 0);
      }

      const artGrades = s.ownedArts.map((a: any) => `${a.id.replace('samjae_', '').replace('mudang_', '')}${a.grade}성`).join(', ');

      snapshots.push({
        time: elapsed,
        stats: `선${s.stats.sungi}/경${s.stats.gyeongsin}/마${s.stats.magi}(합${totalStats()})`,
        hp: `${Math.floor(s.hp)}/${s.maxHp}`,
        neigong: Math.floor(s.neigong),
        totalSimdeuk: s.totalSimdeuk,
        huntTarget: yasanNames[currentHuntTarget] || currentHuntTarget,
        killsThisPeriod: periodKills,
        artGrades,
      });
      previousKillCounts = currentKills;
      lastSnapshotTime = elapsed;
    }

    // 1) 내공 수련 (15초)
    advanceTime(15);
    elapsed += 15;

    // 2) 스탯 투자
    const invested = investAllAvailable();

    // 3) HP 관리
    healIfNeeded();

    // 4) 사냥 대상 결정: 위에서부터 시도
    let bestTarget = 'squirrel';
    // 간단한 휴리스틱: 현재 사냥 중인 몹에서 10회 이상 처치했으면 다음 몹 시도
    const currentIdx = yasanMobs.indexOf(currentHuntTarget);
    const killCount = (getState().killCounts[currentHuntTarget] as number) ?? 0;

    if (killCount >= 5 && currentIdx < yasanMobs.length - 1) {
      // 다음 몹 시도 사냥
      const nextTarget = yasanMobs[currentIdx + 1];
      // 시험 사냥: 1마리 잡아보기
      const testHp = getState().hp;
      callAction('startHunt', 'yasan', nextTarget);
      let testSurvived = false;
      let testKilled = false;
      for (let t = 0; t < 30; t++) {
        advanceTime(1);
        elapsed++;
        const s = getState();
        if (s.battleMode === 'none') {
          if (s.battleResult) {
            if (s.battleResult.type === 'hunt_end' && (s.killCounts[nextTarget] ?? 0) > (killCount)) {
              testKilled = true;
              testSurvived = true;
            }
            callAction('dismissBattleResult');
          }
          break;
        }
        // 처치 성공
        if ((s.killCounts[nextTarget] ?? 0) > 0 && s.hp > s.maxHp * 0.3) {
          testKilled = true;
          testSurvived = true;
          callAction('abandonBattle');
          if (s.battleResult) callAction('dismissBattleResult');
          break;
        }
      }
      if (getState().battleMode !== 'none') {
        callAction('abandonBattle');
        if (getState().battleResult) callAction('dismissBattleResult');
      }

      if (testKilled && testSurvived && getState().hp > getState().maxHp * 0.3) {
        currentHuntTarget = nextTarget;
        ms(`${yasanNames[nextTarget]} 첫 사냥 성공`);
      }
    }

    // 5) 본격 사냥 (30초)
    if (getState().hp > getState().maxHp * 0.4) {
      callAction('startHunt', 'yasan', currentHuntTarget);

      for (let t = 0; t < 30; t++) {
        advanceTime(1);
        elapsed++;

        const s = getState();
        if (s.battleMode === 'none') {
          if (s.battleResult) callAction('dismissBattleResult');
          // HP 1이면 위험 -- 사냥 중단
          if (s.hp < s.maxHp * 0.3) break;
          // 다시 시작
          if (s.hp > s.maxHp * 0.4) {
            callAction('startHunt', 'yasan', currentHuntTarget);
          } else {
            break;
          }
        }

        if (elapsed >= MAX_TIME) break;
      }

      if (getState().battleMode !== 'none') {
        callAction('abandonBattle');
        if (getState().battleResult) callAction('dismissBattleResult');
      }
    }

    // 무당보법 드랍 체크 및 장착
    const s = getState();
    if (s.ownedArts.some((a: any) => a.id === 'mudang_step') && !s.equippedArts.includes('mudang_step')) {
      if (s.battleMode === 'none') {
        callAction('equipArt', 'mudang_step');
        ms('무당보법 획득 및 장착');
      }
    }

    // 경지 돌파 시도
    if (s.battleMode === 'none') {
      callAction('attemptBreakthrough');
      const afterBreak = getState();
      if (afterBreak.tier > s.tier) {
        ms(`경지 돌파: ${afterBreak.tier === 1 ? '삼류 중기' : afterBreak.tier === 2 ? '삼류 후기' : '이류 초입'}`);
      }
    }
  }

  // 최종 스냅샷
  const finalState = getState();
  snapshots.push({
    time: elapsed,
    stats: `선${finalState.stats.sungi}/경${finalState.stats.gyeongsin}/마${finalState.stats.magi}(합${totalStats()})`,
    hp: `${Math.floor(finalState.hp)}/${finalState.maxHp}`,
    neigong: Math.floor(finalState.neigong),
    totalSimdeuk: finalState.totalSimdeuk,
    huntTarget: yasanNames[currentHuntTarget] || currentHuntTarget,
    killsThisPeriod: 0,
    artGrades: finalState.ownedArts.map((a: any) => `${a.id}(${a.grade}성)`).join(', '),
  });

  // 출력
  console.log('\n--- 마일스톤 ---');
  console.log(`${'시간'.padEnd(8)} | ${'이벤트'.padEnd(25)} | ${'스탯'.padEnd(20)} | ${'HP'.padEnd(12)} | ${'심득'.padStart(6)}`);
  console.log('-'.repeat(85));
  for (const m of milestones) {
    const min = Math.floor(m.time / 60);
    const sec = m.time % 60;
    console.log(
      `${(min + '분' + sec + '초').padEnd(8)} | ${m.name.padEnd(25)} | ${m.stats.padEnd(20)} | ${m.hp.padEnd(12)} | ${String(m.simdeuk).padStart(6)}`
    );
  }

  console.log('\n--- 5분 간격 스냅샷 ---');
  console.log(`${'시간'.padEnd(6)} | ${'스탯'.padEnd(25)} | ${'HP'.padEnd(12)} | ${'내공'.padStart(8)} | ${'심득'.padStart(6)} | ${'사냥대상'.padEnd(8)} | ${'처치수'.padStart(5)} | 무공`);
  console.log('-'.repeat(115));
  for (const snap of snapshots) {
    const min = Math.floor(snap.time / 60);
    console.log(
      `${(min + '분').padEnd(6)} | ${snap.stats.padEnd(25)} | ${snap.hp.padEnd(12)} | ${String(snap.neigong).padStart(8)} | ${String(snap.totalSimdeuk).padStart(6)} | ${snap.huntTarget.padEnd(8)} | ${String(snap.killsThisPeriod).padStart(5)} | ${snap.artGrades}`
    );
  }

  // 최종 처치 횟수
  console.log('\n--- 최종 처치 횟수 ---');
  const kc = finalState.killCounts;
  for (const [id, count] of Object.entries(kc)) {
    if ((count as number) > 0) {
      console.log(`  ${yasanNames[id] || id}: ${count}회`);
    }
  }

  console.log(`\n--- 최종 상태 ---`);
  console.log(`  경과 시간: ${Math.floor(elapsed/60)}분`);
  console.log(`  스탯: 선${finalState.stats.sungi}/경${finalState.stats.gyeongsin}/마${finalState.stats.magi} (합${totalStats()})`);
  console.log(`  HP: ${Math.floor(finalState.hp)}/${finalState.maxHp}`);
  console.log(`  내공: ${Math.floor(finalState.neigong)}`);
  console.log(`  총 심득: ${finalState.totalSimdeuk}`);
  console.log(`  경지: ${finalState.tier}`);
  console.log(`  무공: ${finalState.ownedArts.map((a: any) => `${a.id}(${a.grade}성)`).join(', ')}`);
  console.log(`  사냥 대상: ${yasanNames[currentHuntTarget] || currentHuntTarget}`);
}

// ============================================================
// 테스트 6: HP 지속 가능성 (몹별 생존 턴 수)
// ============================================================
function testSurvivalTurns() {
  console.log('\n========================================');
  console.log('  테스트 6: 몹별 생존 턴 수 (초반 빌드)');
  console.log('========================================');

  const monsters = [
    { field: 'yasan', id: 'squirrel', name: '다람쥐' },
    { field: 'yasan', id: 'rabbit', name: '토끼' },
    { field: 'yasan', id: 'fox', name: '여우' },
    { field: 'yasan', id: 'deer', name: '사슴' },
    { field: 'yasan', id: 'boar', name: '멧돼지' },
    { field: 'yasan', id: 'wolf', name: '늑대' },
    { field: 'yasan', id: 'bear', name: '곰' },
  ];

  const builds = [
    { name: '초반(경맥0,HP50)', sungi: 0, gyeongsin: 0, magi: 0, spent: 0 },
    { name: '초중반(경맥10,HP~100)', sungi: 4, gyeongsin: 3, magi: 3, spent: 120 },
    { name: '중반(경맥30,HP~150)', sungi: 10, gyeongsin: 10, magi: 10, spent: 1000 },
  ];

  for (const build of builds) {
    console.log(`\n--- ${build.name} ---`);
    console.log(`${'몬스터'.padEnd(8)} | ${'생존시간'.padStart(8)} | ${'적공격횟수'.padStart(8)} | ${'피격횟수'.padStart(6)} | ${'총피해'.padStart(6)} | ${'처치성공'.padStart(6)}`);
    console.log('-'.repeat(60));

    for (const mon of monsters) {
      resetGame();
      setState({
        ownedArts: [
          { id: 'samjae_sword', grade: 1, proficiency: 0 },
          { id: 'samjae_simbeop', grade: 1, proficiency: 0 },
        ],
        equippedArts: ['samjae_sword'],
        equippedSimbeop: 'samjae_simbeop',
        stats: { sungi: build.sungi, gyeongsin: build.gyeongsin, magi: build.magi },
        totalSpentNeigong: build.spent,
        tutorialFlags: {
          equippedSword: true, equippedSimbeop: true, yasanUnlocked: true,
          killedWood: true, killedIron: true,
        },
      });
      const maxHp = getState().maxHp;
      setState({ hp: maxHp });

      callAction('startHunt', 'yasan', mon.id);

      let survivalTime = 0;
      let enemyAttacks = 0;
      let hits = 0;
      let totalDmgTaken = 0;
      let killed = false;
      const startHp = getState().hp;

      for (let t = 0; t < 120; t++) {
        const beforeHp = getState().hp;
        const beforeLog = getState().battleLog.length;
        advanceTime(1);
        survivalTime = t + 1;
        const afterState = getState();
        const afterHp = afterState.hp;

        // 로그에서 적 공격 확인
        const newLogs = afterState.battleLog.slice(beforeLog);
        for (const log of newLogs) {
          if (log.includes('피해.') && !log.includes('에게')) {
            // 적의 공격 로그
            enemyAttacks++;
            const dmgMatch = log.match(/(\d+) 피해/);
            if (dmgMatch) {
              hits++;
              totalDmgTaken += parseInt(dmgMatch[1]);
            }
          }
          if (log.includes('피했다')) {
            enemyAttacks++;
          }
        }

        if (afterState.battleMode === 'none') {
          if (afterState.battleResult) {
            killed = afterState.killCounts[mon.id] > 0;
            callAction('dismissBattleResult');
          }
          break;
        }

        // 몹 처치 확인
        if ((afterState.killCounts[mon.id] ?? 0) > 0) {
          killed = true;
          callAction('abandonBattle');
          if (getState().battleResult) callAction('dismissBattleResult');
          break;
        }
      }

      if (getState().battleMode !== 'none') {
        callAction('abandonBattle');
        if (getState().battleResult) callAction('dismissBattleResult');
      }

      console.log(
        `${mon.name.padEnd(8)} | ${(survivalTime + '초').padStart(8)} | ${String(enemyAttacks).padStart(8)} | ${String(hits).padStart(6)} | ${String(totalDmgTaken).padStart(6)} | ${killed ? '성공' : '실패'.padStart(6)}`
      );
    }
  }
}

// ============================================================
// 실행
// ============================================================
console.log('=== 무림 방치록 밸런스 진단 ===');
console.log('날짜: 2026-03-14');
console.log('테스트 방법: testAdapter를 사용한 실제 게임 엔진 실행');
console.log('');

testNeigongDuringBattle();
testMudangStepHeal();
testNormalAttackRatio();
testMonsterEfficiency();
testSurvivalTurns();
testProgression60min();

console.log('\n=== 테스트 완료 ===');
