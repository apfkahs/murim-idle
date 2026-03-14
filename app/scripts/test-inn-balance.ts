/**
 * 객잔 밸런스 테스트 (2026-03-14)
 *
 * 시나리오 1: 객잔 도달 직후 플레이어 상태 시뮬레이션
 * 시나리오 2: 객잔 초반 몹 전투력 테스트 (강체술 없이)
 * 시나리오 3: 강체술 장착 후 비교
 * 시나리오 4: simdeuk 추천값 도출
 * 시나리오 5: 사기충천 15% 검증
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

function cleanupBattle() {
  if (getState().battleMode !== 'none') {
    callAction('abandonBattle');
  }
  if (getState().battleResult) {
    callAction('dismissBattleResult');
  }
}

// ============================================================
// 시나리오 1: 객잔 도달 직후 플레이어 상태
// ============================================================
function scenario1_growToInn(): void {
  console.log('\n========================================');
  console.log('  시나리오 1: 객잔 도달 직후 플레이어 상태');
  console.log('========================================');

  resetGame();

  // 수련장: 나무인형 -> 삼재검법
  callAction('startHunt', 'training', 'training_wood');
  advanceTime(30);
  cleanupBattle();
  callAction('equipArt', 'samjae_sword');

  // 수련장: 철인형 -> 삼재심법
  callAction('startHunt', 'training', 'training_iron');
  advanceTime(60);
  cleanupBattle();
  callAction('equipSimbeop', 'samjae_simbeop');

  // 내공 수련 500초
  advanceTime(500);
  investAllAvailable();

  // 야산 사냥 사이클: 약한 몹부터 성장
  const yasanMobs = ['squirrel', 'rabbit', 'fox', 'deer', 'boar', 'wolf', 'bear'];
  const yasanNames: Record<string, string> = {
    squirrel: '다람쥐', rabbit: '토끼', fox: '여우', deer: '사슴',
    boar: '멧돼지', wolf: '늑대', bear: '곰',
  };

  let currentTarget = 'squirrel';
  let elapsed = 0;
  const MAX_GROWTH_TIME = 3600; // 60분 성장 시간

  while (elapsed < MAX_GROWTH_TIME) {
    // 내공 수련 15초
    advanceTime(15);
    elapsed += 15;
    investAllAvailable();
    healIfNeeded();

    // HP가 충분하면 사냥
    if (getState().hp > getState().maxHp * 0.4) {
      callAction('startHunt', 'yasan', currentTarget);
      for (let t = 0; t < 30; t++) {
        advanceTime(1);
        elapsed++;
        const s = getState();
        if (s.battleMode === 'none') {
          if (s.battleResult) callAction('dismissBattleResult');
          if (s.hp < s.maxHp * 0.3) break;
          if (s.hp > s.maxHp * 0.4) {
            callAction('startHunt', 'yasan', currentTarget);
          } else break;
        }
        if (elapsed >= MAX_GROWTH_TIME) break;
      }
      cleanupBattle();
    }

    // 사냥 대상 상향 시도
    const currentIdx = yasanMobs.indexOf(currentTarget);
    const kills = (getState().killCounts[currentTarget] ?? 0) as number;
    if (kills >= 5 && currentIdx < yasanMobs.length - 1) {
      const next = yasanMobs[currentIdx + 1];
      // 시험 사냥
      healIfNeeded();
      if (getState().hp > getState().maxHp * 0.5) {
        callAction('startHunt', 'yasan', next);
        let survived = false;
        for (let t = 0; t < 30; t++) {
          advanceTime(1);
          elapsed++;
          const s = getState();
          if (s.battleMode === 'none') {
            if ((s.killCounts[next] ?? 0) > 0 && s.hp > 1) survived = true;
            if (s.battleResult) callAction('dismissBattleResult');
            break;
          }
          if ((s.killCounts[next] ?? 0) > 0 && s.hp > s.maxHp * 0.2) {
            survived = true;
            break;
          }
        }
        cleanupBattle();
        if (survived) currentTarget = next;
      }
    }

    // 무당보법 장착
    const s = getState();
    if (s.ownedArts.some((a: any) => a.id === 'mudang_step') && !s.equippedArts.includes('mudang_step')) {
      if (s.battleMode === 'none') callAction('equipArt', 'mudang_step');
    }

    // 경지 돌파
    if (getState().battleMode === 'none') callAction('attemptBreakthrough');
  }

  const final = getState();
  console.log('\n--- 객잔 도달 직후 예상 상태 ---');
  console.log(`  경과 시간: ${Math.floor(elapsed / 60)}분`);
  console.log(`  스탯: 선${final.stats.sungi}/경${final.stats.gyeongsin}/마${final.stats.magi} (합${totalStats()})`);
  console.log(`  HP: ${Math.floor(final.hp)}/${final.maxHp}`);
  console.log(`  내공: ${Math.floor(final.neigong)}`);
  console.log(`  총 심득: ${final.totalSimdeuk}`);
  console.log(`  경지: ${final.tier} (${['삼류 초입','삼류 중기','삼류 후기','이류 초입'][final.tier]})`);
  console.log(`  무공: ${final.ownedArts.map((a: any) => `${a.id}(${a.grade}성)`).join(', ')}`);
  console.log(`  장착: [${final.equippedArts.join(', ')}] 심법: ${final.equippedSimbeop}`);
  console.log(`  공격 간격: ${final.getAttackInterval().toFixed(2)}초`);
  console.log(`  회피율: ${final.getEvasion()}%`);
  console.log(`  사냥 대상: ${yasanNames[currentTarget] || currentTarget}`);
  console.log(`  처치 횟수:`);
  for (const [id, count] of Object.entries(final.killCounts)) {
    if ((count as number) > 0) {
      console.log(`    ${yasanNames[id] || id}: ${count}회`);
    }
  }
}

// 시나리오 1 상태를 저장해서 시나리오 2, 3에서 재사용
function setupInnReadyState(): { stats: any; totalSpentNeigong: number; ownedArts: any[]; equippedArts: string[]; equippedSimbeop: string | null; tier: number; totalSimdeuk: number; artPoints: number; activeMasteries: Record<string, string[]> } {
  // 시나리오 1 결과를 기반으로 근사 상태 설정
  // 60분 성장 후 대략적인 상태를 사용
  // 실제로 시나리오 1을 돌린 후 결과를 참조하되,
  // 먼저 돌려서 확인하고 여기에 반영

  // 일단 시나리오 1을 돌려서 상태를 가져온다
  scenario1_growToInn();
  const s = getState();
  return {
    stats: { ...s.stats },
    totalSpentNeigong: s.totalSpentNeigong,
    ownedArts: s.ownedArts.map((a: any) => ({ ...a })),
    equippedArts: [...s.equippedArts],
    equippedSimbeop: s.equippedSimbeop,
    tier: s.tier,
    totalSimdeuk: s.totalSimdeuk,
    artPoints: s.artPoints,
    activeMasteries: JSON.parse(JSON.stringify(s.activeMasteries)),
  };
}

// ============================================================
// 시나리오 2 & 3: 객잔 초반 몹 전투력 테스트
// ============================================================
function scenario2and3_innCombat(savedState: any) {
  console.log('\n========================================');
  console.log('  시나리오 2: 객잔 초반 몹 전투 (강체술 없이)');
  console.log('========================================');

  const innMobs = [
    { field: 'inn', id: 'drunk_thug', name: '취한 건달' },
    { field: 'inn', id: 'peddler', name: '떠돌이 행상' },
    { field: 'inn', id: 'troublemaker', name: '객잔 말썽꾼' },
  ];

  // 강체술 없이 테스트
  runInnCombatTest(savedState, innMobs, false);

  console.log('\n========================================');
  console.log('  시나리오 3: 객잔 초반 몹 전투 (강체술 장착)');
  console.log('========================================');

  // 강체술 장착하여 테스트
  runInnCombatTest(savedState, innMobs, true);
}

function runInnCombatTest(savedState: any, mobs: { field: string; id: string; name: string }[], withGangche: boolean) {
  const TRIALS = 10;

  for (const mon of mobs) {
    let totalKillTime = 0;
    let totalDamageTaken = 0;
    let deaths = 0;
    let kills = 0;
    let minHpPct = 100;

    for (let trial = 0; trial < TRIALS; trial++) {
      resetGame();

      const arts = savedState.ownedArts.map((a: any) => ({ ...a }));
      const equipped = [...savedState.equippedArts];

      if (withGangche) {
        // 강체술 1성 추가 (소유 + 장착)
        if (!arts.some((a: any) => a.id === 'gangche')) {
          arts.push({ id: 'gangche', grade: 1, proficiency: 0 });
        }
        if (!equipped.includes('gangche')) {
          equipped.push('gangche');
        }
      }

      setState({
        stats: { ...savedState.stats },
        totalSpentNeigong: savedState.totalSpentNeigong,
        ownedArts: arts,
        equippedArts: equipped,
        equippedSimbeop: savedState.equippedSimbeop,
        tier: savedState.tier,
        totalSimdeuk: savedState.totalSimdeuk,
        artPoints: savedState.artPoints + (withGangche ? 1 : 0), // 강체술 코스트 보정
        activeMasteries: JSON.parse(JSON.stringify(savedState.activeMasteries)),
        tutorialFlags: {
          equippedSword: true, equippedSimbeop: true, yasanUnlocked: true,
          killedWood: true, killedIron: true,
        },
        fieldUnlocks: { training: true, yasan: true, inn: true },
      });
      const maxHp = getState().maxHp;
      setState({ hp: maxHp });

      const startHp = getState().hp;
      const startMaxHp = getState().maxHp;

      callAction('startHunt', mon.field, mon.id);

      let killTime = 0;
      let damageTaken = 0;
      let died = false;
      let killed = false;

      for (let t = 0; t < 120; t++) {
        const beforeHp = getState().hp;
        advanceTime(1);
        killTime = t + 1;
        const afterState = getState();

        if (afterState.hp < beforeHp) {
          damageTaken += (beforeHp - afterState.hp);
        }

        const hpPct = (afterState.hp / afterState.maxHp) * 100;
        if (hpPct < minHpPct) minHpPct = hpPct;

        if (afterState.battleMode === 'none') {
          if (afterState.hp <= 1) {
            died = true;
          } else {
            killed = true;
          }
          if (afterState.battleResult) callAction('dismissBattleResult');
          break;
        }

        // 처치 확인
        if ((afterState.killCounts[mon.id] ?? 0) > 0) {
          killed = true;
          cleanupBattle();
          break;
        }
      }
      cleanupBattle();

      if (died) {
        deaths++;
      } else if (killed) {
        kills++;
        totalKillTime += killTime;
        totalDamageTaken += damageTaken;
      }
    }

    const avgKillTime = kills > 0 ? (totalKillTime / kills).toFixed(1) : 'N/A';
    const avgDmgTaken = kills > 0 ? (totalDamageTaken / kills).toFixed(0) : 'N/A';
    const survivalRate = ((kills / TRIALS) * 100).toFixed(0);
    const label = withGangche ? '(강체술O)' : '(강체술X)';

    console.log(`  ${mon.name} ${label}: 처치${kills}/${TRIALS}, 평균킬타임=${avgKillTime}초, 평균피해=${avgDmgTaken}, 생존율=${survivalRate}%, 최저HP%=${minHpPct.toFixed(0)}%`);
  }
}

// ============================================================
// 시나리오 4: simdeuk 추천값 도출
// ============================================================
function scenario4_simdeukRecommendation() {
  console.log('\n========================================');
  console.log('  시나리오 4: simdeuk 추천값 도출');
  console.log('========================================');

  // 야산 몬스터 데이터 (실제 데이터 파일에서 확인한 수치)
  const yasanData = [
    { id: 'squirrel', name: '다람쥐', hp: 25, atk: 4, interval: 3.5, simdeuk: 2 },
    { id: 'rabbit', name: '토끼', hp: 40, atk: 5, interval: 3.0, simdeuk: 4 },
    { id: 'fox', name: '여우', hp: 70, atk: 8, interval: 2.8, simdeuk: 7 },
    { id: 'deer', name: '사슴', hp: 110, atk: 6, interval: 3.0, simdeuk: 9 },
    { id: 'boar', name: '멧돼지', hp: 90, atk: 14, interval: 2.2, simdeuk: 10 },
    { id: 'wolf', name: '늑대', hp: 160, atk: 16, interval: 2.0, simdeuk: 15 },
    { id: 'bear', name: '곰', hp: 280, atk: 22, interval: 2.5, simdeuk: 25 },
    { id: 'tiger_boss', name: '산군(보스)', hp: 650, atk: 28, interval: 1.8, simdeuk: 120, isBoss: true },
  ];

  // 객잔 몬스터 데이터
  const innData = [
    { id: 'drunk_thug', name: '취한 건달', hp: 80, atk: 6, interval: 3.0 },
    { id: 'peddler', name: '떠돌이 행상', hp: 120, atk: 9, interval: 2.8 },
    { id: 'troublemaker', name: '객잔 말썽꾼', hp: 100, atk: 12, interval: 2.5 },
    { id: 'wanderer', name: '떠돌이 무사', hp: 180, atk: 14, interval: 2.4 },
    { id: 'bounty_hunter', name: '현상금 사냥꾼', hp: 150, atk: 18, interval: 2.2 },
    { id: 'ronin', name: '흑도 낭인', hp: 250, atk: 16, interval: 2.0 },
    { id: 'bandit_chief', name: '삼류 도적 두목', hp: 320, atk: 24, interval: 2.0 },
    { id: 'masked_swordsman', name: '가면 쓴 검객(히든)', hp: 600, atk: 28, interval: 1.8, isHidden: true },
    { id: 'innkeeper_true', name: '객잔 주인(히든)', hp: 900, atk: 20, interval: 1.5, isHidden: true },
    { id: 'bandit_leader', name: '흑풍채 채주(보스)', hp: 800, atk: 32, interval: 1.6, isBoss: true },
  ];

  // 난이도 지표 계산: HP x (atk / interval) -> 체력 x 초당공격력
  // 이 지표는 "이 몹을 상대하는 전체적인 부담"을 근사함
  function difficulty(hp: number, atk: number, interval: number): number {
    return hp * (atk / interval);
  }

  console.log('\n--- 야산 몬스터 난이도 vs simdeuk ---');
  console.log(`${'몬스터'.padEnd(12)} | ${'HP'.padStart(5)} | ${'공격력'.padStart(5)} | ${'간격'.padStart(4)} | ${'난이도'.padStart(8)} | ${'simdeuk'.padStart(7)} | ${'simdeuk/난이도'.padStart(12)}`);
  console.log('-'.repeat(75));

  const yasanRatios: number[] = [];
  for (const m of yasanData) {
    const diff = difficulty(m.hp, m.atk, m.interval);
    const ratio = m.simdeuk / diff;
    if (!('isBoss' in m) || !m.isBoss) {
      yasanRatios.push(ratio);
    }
    console.log(
      `${m.name.padEnd(12)} | ${String(m.hp).padStart(5)} | ${String(m.atk).padStart(5)} | ${m.interval.toFixed(1).padStart(4)} | ${diff.toFixed(0).padStart(8)} | ${String(m.simdeuk).padStart(7)} | ${ratio.toFixed(5).padStart(12)}`
    );
  }

  // 야산 일반몹 평균 비율
  const avgYasanRatio = yasanRatios.reduce((a, b) => a + b, 0) / yasanRatios.length;
  console.log(`\n  야산 일반몹 평균 simdeuk/난이도 비율: ${avgYasanRatio.toFixed(5)}`);

  // 야산 보스(산군)의 비율
  const tigerDiff = difficulty(650, 28, 1.8);
  const tigerRatio = 120 / tigerDiff;
  console.log(`  산군(보스) simdeuk/난이도 비율: ${tigerRatio.toFixed(5)}`);

  // 객잔 simdeuk 추천
  // 원칙: 객잔 초반은 야산 bear(simdeuk 25)보다 약간 높은 수준에서 시작
  // 객잔 몹은 야산보다 후반 컨텐츠이므로 비율을 약간 높게 설정
  // bear의 난이도 대비 simdeuk 비율을 기준으로 사용

  const bearDiff = difficulty(280, 22, 2.5);
  const bearRatio = 25 / bearDiff;

  // 객잔 비율: 야산 평균 비율의 1.2~1.5배 (후반 컨텐츠 보정)
  // 초반 몹은 bear와 비슷하거나 약간 높은 simdeuk
  // 후반 몹/보스는 더 높은 simdeuk
  const innMultiplier = 1.3; // 야산 평균 대비 30% 높게

  console.log('\n--- 객잔 몬스터 simdeuk 추천 ---');
  console.log(`${'몬스터'.padEnd(20)} | ${'HP'.padStart(5)} | ${'공격력'.padStart(5)} | ${'간격'.padStart(4)} | ${'난이도'.padStart(8)} | ${'추천simdeuk'.padStart(10)} | ${'산출 근거'}`);
  console.log('-'.repeat(90));

  const recommendations: { id: string; name: string; simdeuk: number }[] = [];

  for (const m of innData) {
    const diff = difficulty(m.hp, m.atk, m.interval);
    let recommendedSimdeuk: number;
    let basis: string;

    if ('isBoss' in m && m.isBoss) {
      // 보스는 산군과 같은 비율 기준, 하지만 객잔 보스는 산군보다 강하므로 보상도 높게
      recommendedSimdeuk = Math.round(diff * tigerRatio * 1.1);
      basis = `보스비율(산군x1.1)`;
    } else if ('isHidden' in m && m.isHidden) {
      // 히든은 보스보다 약간 낮되, 일반 대비 높은 보상
      // 야산 히든(비이 50, 당강 80) 참조
      const feiyi_diff = difficulty(500, 24, 2.0);
      const feiyi_ratio = 50 / feiyi_diff;
      recommendedSimdeuk = Math.round(diff * feiyi_ratio * 1.2);
      basis = `히든비율(비이x1.2)`;
    } else {
      // 일반 몹: 야산 평균 비율 x 객잔 보정
      recommendedSimdeuk = Math.round(diff * avgYasanRatio * innMultiplier);
      basis = `야산평균x${innMultiplier}`;
    }

    // 최소값 보정: 야산 bear(25)보다 객잔 초반이 약간 높아야 함
    if (!('isBoss' in m) && !('isHidden' in m)) {
      recommendedSimdeuk = Math.max(recommendedSimdeuk, 18); // 최소 18 (bear 25보다 약간 낮은 것 허용 - 초반 몹)
    }

    recommendations.push({ id: m.id, name: m.name, simdeuk: recommendedSimdeuk });
    console.log(
      `${m.name.padEnd(20)} | ${String(m.hp).padStart(5)} | ${String(m.atk).padStart(5)} | ${m.interval.toFixed(1).padStart(4)} | ${diff.toFixed(0).padStart(8)} | ${String(recommendedSimdeuk).padStart(10)} | ${basis}`
    );
  }

  // 수동 검토 및 조정
  console.log('\n--- 수동 조정 후 최종 추천 ---');
  console.log('원칙: 객잔 초반(취건달) >= 야산 곰(25)보다 약간 높게');

  // 난이도 순서 정렬 후 simdeuk이 단조 증가하도록 보정
  const sorted = [...recommendations].sort((a, b) => {
    const aDiff = difficulty(
      innData.find(m => m.id === a.id)!.hp,
      innData.find(m => m.id === a.id)!.atk,
      innData.find(m => m.id === a.id)!.interval,
    );
    const bDiff = difficulty(
      innData.find(m => m.id === b.id)!.hp,
      innData.find(m => m.id === b.id)!.atk,
      innData.find(m => m.id === b.id)!.interval,
    );
    return aDiff - bDiff;
  });

  console.log(`${'몬스터'.padEnd(20)} | ${'난이도'.padStart(8)} | ${'추천simdeuk'.padStart(10)}`);
  console.log('-'.repeat(50));
  for (const r of sorted) {
    const m = innData.find(x => x.id === r.id)!;
    const diff = difficulty(m.hp, m.atk, m.interval);
    console.log(`${r.name.padEnd(20)} | ${diff.toFixed(0).padStart(8)} | ${String(r.simdeuk).padStart(10)}`);
  }

  return recommendations;
}

// ============================================================
// 시나리오 5: 사기충천 15% 검증
// ============================================================
function scenario5_moraleTest() {
  console.log('\n========================================');
  console.log('  시나리오 5: 사기충천(heupgong_morale) 15% 검증');
  console.log('========================================');

  resetGame();

  // heupgong 2성 + morale 마스터리 활성 상태 설정
  // heupgong_morale는 stage 4, requiredGrade 5, requiredTier 2이므로
  // 높은 빌드 상태가 필요
  // 단, 테스트를 위해 setState로 직접 세팅

  // maxHp = 50 + floor(log2(1 + 50000) * 15) = 50 + floor(15.61 * 15) = 50 + 234 = 284
  const targetMaxHp = 50 + Math.floor(Math.log2(1 + 50000) * 15);
  setState({
    ownedArts: [
      { id: 'samjae_sword', grade: 3, proficiency: 0 },
      { id: 'samjae_simbeop', grade: 2, proficiency: 0 },
      { id: 'heupgong', grade: 5, proficiency: 0 },
    ],
    equippedArts: ['samjae_sword'],
    equippedSimbeop: 'heupgong',
    stats: { sungi: 30, gyeongsin: 30, magi: 30 },
    totalSpentNeigong: 50000,
    maxHp: targetMaxHp,
    hp: targetMaxHp,
    tier: 2,
    artPoints: 12,
    activeMasteries: {
      'heupgong': ['heupgong_combat', 'heupgong_heal_enhance', 'heupgong_accel', 'heupgong_morale'],
    },
    tutorialFlags: {
      equippedSword: true, equippedSimbeop: true, yasanUnlocked: true,
      killedWood: true, killedIron: true,
    },
    fieldUnlocks: { training: true, yasan: true, inn: true },
    moraleBuff: 0,
  });

  console.log(`  빌드: 삼재검법 3성, 흡공술 5성(사기충천 활성)`);
  console.log(`  스탯: 선30/경30/마30, HP: ${getState().maxHp}`);

  // 야산 곰 사냥 (simdeuk 25)으로 테스트
  console.log('\n--- 야산 곰(simdeuk=25) 사냥 시 사기충천 관찰 ---');

  callAction('startHunt', 'yasan', 'bear');

  let moraleActivations = 0;
  let totalMoraleBonus = 0;
  let moraleApplied = 0;
  let killCount = 0;
  const moraleBuffValues: number[] = [];

  for (let t = 0; t < 300; t++) {
    const beforeState = getState();
    const beforeMorale = beforeState.moraleBuff;
    const beforeLogLen = beforeState.battleLog.length;

    advanceTime(1);

    const afterState = getState();
    const newLogs = afterState.battleLog.slice(beforeLogLen);

    // 사기충천 버프 발생 확인
    for (const log of newLogs) {
      if (log.includes('사기충천')) {
        moraleActivations++;
        const match = log.match(/\+(\d+)/);
        if (match) {
          const bonus = parseInt(match[1]);
          moraleBuffValues.push(bonus);
          totalMoraleBonus += bonus;
        }
      }
    }

    // moraleBuff 소비 확인 (이전에 있었는데 없어진 경우)
    if (beforeMorale > 0 && afterState.moraleBuff === 0) {
      moraleApplied++;
    }

    // 사망 시 재시작
    if (afterState.battleMode === 'none') {
      killCount = (afterState.killCounts['bear'] ?? 0) as number;
      if (afterState.battleResult) callAction('dismissBattleResult');
      setState({ hp: targetMaxHp, maxHp: targetMaxHp });
      callAction('startHunt', 'yasan', 'bear');
    }
  }

  cleanupBattle();
  const finalKills = (getState().killCounts['bear'] ?? 0) as number;

  console.log(`  HP: ${targetMaxHp}`);
  console.log(`  300초 사냥 결과:`);
  console.log(`    곰 처치: ${finalKills}회`);
  console.log(`    사기충천 발동: ${moraleActivations}회`);
  console.log(`    사기충천 적용(소비): ${moraleApplied}회`);
  if (moraleBuffValues.length > 0) {
    const avgBonus = moraleBuffValues.reduce((a, b) => a + b, 0) / moraleBuffValues.length;
    const expectedBonus = Math.floor(25 * 0.15);
    console.log(`    평균 버프 위력: +${avgBonus.toFixed(1)} (기대값: +${expectedBonus}, 곰 simdeuk 25 x 15%)`);
    console.log(`    버프 값 목록: [${moraleBuffValues.join(', ')}]`);
  }

  // 추가: 약한 몹(다람쥐)으로도 morale 발동 테스트
  console.log('\n--- 야산 늑대(simdeuk=15) 사냥 시 사기충천 관찰 ---');
  setState({ hp: targetMaxHp, maxHp: targetMaxHp });
  callAction('startHunt', 'yasan', 'wolf');
  let wolfMoraleActivations = 0;
  let wolfKills = 0;
  const wolfMoraleValues: number[] = [];
  for (let t = 0; t < 300; t++) {
    const beforeLogLen = getState().battleLog.length;
    advanceTime(1);
    const afterState = getState();
    const newLogs = afterState.battleLog.slice(beforeLogLen);
    for (const log of newLogs) {
      if (log.includes('사기충천')) {
        wolfMoraleActivations++;
        const match = log.match(/\+(\d+)/);
        if (match) wolfMoraleValues.push(parseInt(match[1]));
      }
    }
    if (afterState.battleMode === 'none') {
      wolfKills = (afterState.killCounts['wolf'] ?? 0) as number;
      if (afterState.battleResult) callAction('dismissBattleResult');
      setState({ hp: targetMaxHp, maxHp: targetMaxHp });
      callAction('startHunt', 'yasan', 'wolf');
    }
  }
  cleanupBattle();
  wolfKills = (getState().killCounts['wolf'] ?? 0) as number;
  console.log(`  300초: 늑대 처치 ${wolfKills}회, 사기충천 발동 ${wolfMoraleActivations}회`);
  if (wolfMoraleValues.length > 0) {
    console.log(`  버프 값: [${wolfMoraleValues.join(', ')}] (기대값: ${Math.floor(15 * 0.15)})`);
  }

  // 삼재검법 3성 power = 26, 중립 진영 배율 = 1 + (sungi*0.01 + magi*0.01) = 1 + 0.6 = 1.6
  // 무공 데미지 약 41.6, 사기충천 보너스 +3 = 44.6 -> 약 7.2% 상승
  // 15%가 적절한지 판단을 위한 데이터
  console.log(`\n--- 사기충천 효과 분석 ---`);
  const samjaePower = 26; // 3성
  const factionMultiplier = 1 + 30 * 0.01 + 30 * 0.01; // 중립
  const expectedArtDmg = samjaePower * factionMultiplier;
  const expectedMoraleBonus = Math.floor(25 * 0.15);
  const dmgIncrease = (expectedMoraleBonus / expectedArtDmg) * 100;
  console.log(`  삼재검법 3성 기대 데미지: ${expectedArtDmg.toFixed(1)}`);
  console.log(`  곰(simdeuk25) 사기충천 보너스: +${expectedMoraleBonus}`);
  console.log(`  데미지 증가율(1회): ${dmgIncrease.toFixed(1)}%`);

  // 다른 몹에 대한 사기충천 보너스 비교
  console.log(`\n--- 다양한 simdeuk 값에서의 사기충천 보너스 ---`);
  console.log(`  ${'simdeuk'.padStart(8)} | ${'15%보너스'.padStart(8)} | ${'삼재3성대비증가'.padStart(12)}`);
  const simdeukValues = [2, 7, 15, 25, 50, 80, 120];
  for (const sd of simdeukValues) {
    const bonus = Math.floor(sd * 0.15);
    const increase = (bonus / expectedArtDmg) * 100;
    console.log(`  ${String(sd).padStart(8)} | ${('+' + bonus).padStart(8)} | ${increase.toFixed(1).padStart(11)}%`);
  }
}

// ============================================================
// 실행
// ============================================================
console.log('=== 객잔 밸런스 테스트 ===');
console.log('날짜: 2026-03-14');
console.log('');

// 시나리오 1 + 상태 저장
const savedState = setupInnReadyState();

// 시나리오 2 & 3
scenario2and3_innCombat(savedState);

// 시나리오 4
const simdeukRecommendations = scenario4_simdeukRecommendation();

// 시나리오 5
scenario5_moraleTest();

console.log('\n=== 테스트 완료 ===');
