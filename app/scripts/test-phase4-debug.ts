/**
 * Phase 4 FAIL 항목 심층 진단 스크립트
 * FAIL: 이연격, 삼연격, 격산타우 미발동 원인 분석
 */

import { getState, setState, advanceTime } from '../src/testAdapter';
import { BOSS_PATTERNS } from '../src/data/monsters';

function section(title: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}
function info(msg: string) { console.log(`  ${msg}`); }

// ── 공통 세팅 ──
function setupAndSpawn(hpPercent = 1.0, mentalProf = 1) {
  const maxHp = 2000;
  setState({
    stats: { gi: 50, sim: 50, che: 50 },
    proficiency: { sword: 10000, fist: 10000, palm: 10000, footwork: 10000, mental: mentalProf },
    hp: 999999, maxHp: 999999,
    tier: 3,
    stamina: 0,
    ultCooldowns: {},
    ownedArts: [
      { id: 'samjae_sword', totalSimdeuk: 500 },
      { id: 'samjae_simbeop', totalSimdeuk: 500 },
    ],
    equippedArts: ['samjae_sword'],
    equippedSimbeop: 'samjae_simbeop',
    activeMasteries: { samjae_sword: ['samjae_sword_ult'] },
    artPoints: 10,
    artGradeExp: { samjae_sword: 10000, samjae_simbeop: 10000 },
    currentField: 'inn',
    battleMode: 'hunt',
    huntTarget: 'innkeeper_true',
    currentEnemy: {
      id: 'innkeeper_true',
      hp: Math.floor(maxHp * hpPercent),
      maxHp,
      attackPower: 70,
      attackInterval: 2.2,
      regen: 0,
    },
    bossPatternState: {
      bossStamina: 0,
      rageUsed: false,
      playerFreezeLeft: 0,
      usedOneTimeSkills: [],
      bossChargeState: null,
    },
    playerAttackTimer: 2.0,
    enemyAttackTimer: 0.1,  // 거의 즉시 공격
    playerStunTimer: 0,
    playerFinisherCharge: null,
    battleLog: [],
    battleResult: null,
    lastEnemyAttack: null,
    fieldUnlocks: { training: true, yasan: true, inn: true, cheonsan_jangmak: false, cheonsan_godo: false, cheonsan_simjang: false },
    tutorialFlags: { equippedSword: true, equippedSimbeop: true, yasanUnlocked: true, killedWood: true, killedIron: true, firstBreakthroughNotified: true },
    inventory: [], discoveredMasteries: [], pendingEnlightenments: [],
    equipment: { weapon: null, armor: null, gloves: null, boots: null },
    equipmentInventory: [], materials: {}, craftedRecipes: [], unlockedRecipes: [],
    obtainedMaterials: [], knownEquipment: [],
    explorePendingRewards: { simdeuk: 0, drops: [] },
    exploreStep: 0, exploreOrder: [], isBossPhase: false, bossTimer: 0,
    totalSimdeuk: 0, totalSpentQi: 0, qi: 0,
    achievements: [], achievementCount: 0, totalKills: 0, totalYasanKills: 0,
    killCounts: {}, bossKillCounts: {}, hiddenRevealedInField: {},
    floatingTexts: [], nextFloatingId: 0, playerAnim: '', enemyAnim: '',
    gameSpeed: 1, currentSaveSlot: 0, autoExploreFields: {},
    dodgeCounterActive: false, pendingHuntRetry: false,
  });
}

// ── 진단 A: skillUsed 흐름 추적 ──
section('진단 A: innkeeper_true 스킬 우선순위 순서 확인');
info('BOSS_PATTERNS.innkeeper_true 스킬 목록 (priority 기준 정렬):');
const skills = [...BOSS_PATTERNS.innkeeper_true.skills].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
for (const s of skills) {
  info(`  id=${s.id}, type=${s.type}, priority=${s.priority ?? 0}, triggerCondition=${s.triggerCondition}, oneTime=${s.oneTime}, chance=${s.chance}`);
}

// ── 진단 B: 살기 발동 이후 이연격 차단 여부 ──
section('진단 B: 살기 발동 후 이연격/삼연격 차단 여부');
info('살기(kill_intent)는 triggerCondition=default, replace_normal 타입.');
info('sorted에서 priority=10으로 최상위. 발동하면 skillUsed=true → break.');
info('이연격/삼연격은 "!skillUsed" 블록(1005~1074줄)에서만 처리됨.');
info('따라서: 살기가 every turn skillUsed=true를 만들면 이연격/삼연격은 영구 차단됨.');
info('');
info('코드 흐름 분석:');
info('  1. kill_intent: triggerCondition=default, oneTime=true');
info('  2. 첫 번째 발동 → usedOneTimeSkills에 kill_intent 추가, skillUsed=true');
info('  3. 이후 루프: kill_intent triggered=true BUT oneTime이라 다시 발동 안 함??');
info('');
info('  실제 코드(라인 952~968):');
info('    if (skill.debuffAtkPercent != null) {');
info('      const usedAlready = bossPatternState.usedOneTimeSkills?.includes(skill.id);');
info('      if (!(skill.oneTime && usedAlready)) { ... 디버프 적용 }');
info('    }');
info('  → debuffAtkPercent가 null이 아니면 내부에서 usedAlready 체크 후 debuff 적용 스킵');
info('  → 하지만 skillUsed=true와 break는 항상 실행됨!');
info('');
info('  즉, kill_intent는 oneTime=true지만 triggered=true이므로');
info('  라인 925: skillUsed=true, break 실행됨');
info('  → 이연격/삼연격 처리 블록(!skillUsed)에 절대 도달 못함');

// 실제 확인: 살기 발동 후 상태
setupAndSpawn(1.0, 1);
let killIntentUsed = false;
let skillUsedAfterKillIntent = false;

for (let i = 0; i < 20; i++) {
  setState({ battleLog: [] });
  advanceTime(1);
  const s = getState();
  const l = s.battleLog;

  if (l.some(x => x.includes('살기') || x.includes('압도당했다'))) {
    killIntentUsed = true;
    info(`살기 발동 확인 (${i+1}초)`);
  }

  if (s.bossPatternState?.usedOneTimeSkills?.includes('kill_intent')) {
    info(`kill_intent usedOneTimeSkills에 기록됨`);

    // 다음 턴: 이연격/삼연격 발동 여부 직접 체크
    // 살기는 이미 쓰였지만 triggerCondition=default이므로 여전히 triggered=true
    // 내부 debuff 로직은 skip되지만 skillUsed=true는 여전히 실행됨?
    // → replace_normal 분기에서: oneTime && usedAlready 면 debuff 스킵
    //   하지만 skillUsed는 라인 925에서 이미 true
    info(`따라서 kill_intent가 usedOneTimeSkills에 있어도 skillUsed=true가 됨`);
    info(`→ !skillUsed 블록은 실행 안 됨 → 이연격/삼연격 영구 차단`);
    break;
  }

  if (s.battleResult) {
    setState({ battleResult: null, hp: 999999 });
    spawnBossWithBPState(1.0, s.bossPatternState ?? null);
  }
}

function spawnBossWithBPState(hpPct: number, bps: any) {
  setState({
    battleMode: 'hunt',
    huntTarget: 'innkeeper_true',
    currentEnemy: {
      id: 'innkeeper_true',
      hp: Math.floor(2000 * hpPct),
      maxHp: 2000,
      attackPower: 70,
      attackInterval: 2.2,
      regen: 0,
    },
    bossPatternState: bps,
    playerAttackTimer: 2.0,
    enemyAttackTimer: 0.1,
    battleLog: [],
    battleResult: null,
    stamina: 0,
    playerStunTimer: 0,
  });
}

// ── 진단 C: 격산타우 미발동 원인 ──
section('진단 C: 격산타우 미발동 원인 분석');
info('격산타우: triggerCondition=hp_threshold (0.30), oneTime=true, priority=5');
info('kill_intent: triggerCondition=default, priority=10');
info('');
info('실행 흐름:');
info('  1. HP 25% → geoksan_charge triggered=true (hp_threshold 조건 충족)');
info('  2. kill_intent도 triggered=true (default)');
info('  3. priority 순정렬: kill_intent(10) > geoksan_charge(5)');
info('  4. kill_intent 먼저 처리 → skillUsed=true, break');
info('  5. geoksan_charge는 처리되지 않음');
info('');
info('kill_intent가 oneTime이고 usedOneTimeSkills에 있으면?:');
info('  triggered=true는 여전히 (default), continue 없음');
info('  라인 925: skillUsed=true, break');
info('  → 격산타우 역시 영구 차단됨');

// 실제 확인: HP 25%로 세팅 후 격산타우 조건 체크
setupAndSpawn(0.25, 1);

// 먼저 살기를 이미 사용된 상태로 세팅
setState({
  bossPatternState: {
    bossStamina: 0,
    rageUsed: false,
    playerFreezeLeft: 0,
    usedOneTimeSkills: ['kill_intent'],
    bossChargeState: null,
    playerAtkDebuffMult: 0.8,
    playerAtkSpeedDebuffMult: 1.2,
  },
});

info('');
info('kill_intent 이미 사용된 상태에서 HP 25% 격산타우 시도:');
for (let i = 0; i < 10; i++) {
  setState({ battleLog: [], enemyAttackTimer: 0.01 });
  advanceTime(1);
  const s = getState();
  const l = s.battleLog;
  info(`  tick ${i+1}: log=${JSON.stringify(l.slice(0,3))}, bossChargeState=${JSON.stringify(s.bossPatternState?.bossChargeState)}`);
  if (s.bossPatternState?.bossChargeState) {
    info('  → 격산타우 차지 설정됨!');
    break;
  }
  if (s.battleResult) {
    setState({ battleResult: null, hp: 999999 });
    setState({
      battleMode: 'hunt',
      huntTarget: 'innkeeper_true',
      currentEnemy: { id: 'innkeeper_true', hp: 500, maxHp: 2000, attackPower: 70, attackInterval: 2.2, regen: 0 },
      bossPatternState: {
        bossStamina: 0, rageUsed: false, playerFreezeLeft: 0,
        usedOneTimeSkills: ['kill_intent'], bossChargeState: null,
        playerAtkDebuffMult: 0.8, playerAtkSpeedDebuffMult: 1.2,
      },
      enemyAttackTimer: 0.01,
    });
  }
}

// ── 진단 D: 실제 버그 재현 ──
section('진단 D: 버그 재현 확인');
info('');
info('[버그 1: 이연격/삼연격 영구 차단]');
info('원인: innkeeper_true의 kill_intent가 triggerCondition=default이므로');
info('  매 공격 턴마다 "triggered=true" → skillUsed=true, break');
info('  → !skillUsed 블록(이연격/삼연격 처리)에 절대 도달 불가');
info('  → kill_intent가 oneTime이지만 "살기 로직 skip"만 할 뿐, skillUsed는 여전히 true');
info('');
info('[버그 2: 격산타우 영구 차단]');
info('원인: kill_intent(priority=10)가 geoksan_charge(priority=5)보다 먼저 처리됨');
info('  kill_intent triggered=true → skillUsed=true, break → geoksan_charge 미처리');
info('  kill_intent 이미 사용됐어도 동일함 (triggered=true이므로 분기는 들어가지만 break는 실행)');
info('');
info('[버그 3: 이연격/삼연격 이중 차단]');
info('코드 라인 904:');
info('  if (skill.type === "dot_apply" || skill.type === "double_hit" || skill.type === "multi_hit") continue;');
info('이 줄이 순회 도중 이연격/삼연격을 skip하지만, 이미 !skillUsed 블록에서 처리됨');
info('따라서 이 continue는 단순히 상위 루프에서 제외하는 것 (정상)');
info('진짜 문제는 kill_intent가 skillUsed=true를 매번 세팅하는 것');

// ── 진단 E: 정상 동작 확인 (innkeeper가 아닌 경우) ──
section('진단 E: 다른 보스(이연격 있는 은랑) 비교');
info('은랑(eunrang): kill_intent 없음, double_hit만 있음');
info('BOSS_PATTERNS.eunrang:');
const eunrangSkills = [...(BOSS_PATTERNS.eunrang?.skills ?? [])].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
for (const s of eunrangSkills) {
  info(`  id=${s.id}, type=${s.type}, priority=${s.priority ?? 0}, triggerCondition=${s.triggerCondition}, chance=${s.chance}`);
}

// 은랑 테스트
setState({
  battleMode: 'hunt',
  huntTarget: 'eunrang',
  currentEnemy: {
    id: 'eunrang',
    hp: 1000,
    maxHp: 1000,
    attackPower: 50,
    attackInterval: 1.5,
    regen: 0,
  },
  bossPatternState: {
    bossStamina: 0,
    rageUsed: false,
    playerFreezeLeft: 0,
    usedOneTimeSkills: [],
    bossChargeState: null,
  },
  playerAttackTimer: 2.0,
  enemyAttackTimer: 0.1,
  battleLog: [],
  battleResult: null,
  stamina: 0,
  playerStunTimer: 0,
  hp: 999999,
  maxHp: 999999,
});

let eunrangDoubleHit = 0;
const eunrangLogs: string[] = [];

for (let i = 0; i < 60; i++) {
  setState({ battleLog: [] });
  advanceTime(1);
  const l = getState().battleLog;
  eunrangLogs.push(...l);
  for (const line of l) {
    if (line.includes('전광석화') || line.includes('이연격') || line.includes('두 번')) eunrangDoubleHit++;
  }
  const s = getState();
  if (s.battleResult) {
    setState({ battleResult: null, hp: 999999,
      battleMode: 'hunt', huntTarget: 'eunrang',
      currentEnemy: { id: 'eunrang', hp: 1000, maxHp: 1000, attackPower: 50, attackInterval: 1.5, regen: 0 },
      bossPatternState: { bossStamina: 0, rageUsed: false, playerFreezeLeft: 0, usedOneTimeSkills: [], bossChargeState: null },
      enemyAttackTimer: 0.1, playerStunTimer: 0,
    });
  }
}

info(`\n은랑 double_hit 발동: ${eunrangDoubleHit}회`);
if (eunrangDoubleHit > 0) {
  info('→ 은랑의 double_hit는 정상 발동 (kill_intent 없으므로 !skillUsed 블록 도달 가능)');
} else {
  info('→ 은랑도 이연격 미발동 — 다른 원인 있음');
}

const eunrangDoubleLines = eunrangLogs.filter(l => l.includes('전광석화'));
info(`은랑 이연격 로그 샘플:`);
for (const line of eunrangDoubleLines.slice(0, 3)) {
  info(`  "${line}"`);
}

// ── 최종 결론 ──
section('최종 버그 진단 결론');
info('');
info('버그 #1: innkeeper_true 이연격/삼연격 영구 차단');
info('  원인: kill_intent(default+replace_normal) → 매 턴 skillUsed=true');
info('         → !skillUsed 블록 미실행 → double_hit/multi_hit 불발');
info('  영향: kill_intent 발동 이후 이연격/삼연격이 한 번도 발동 안 됨');
info('  수정 방안 A: kill_intent 처리 후 skillUsed를 true로 설정하지 말고,');
info('              double_hit/multi_hit를 별도 블록으로 분리');
info('  수정 방안 B: replace_normal 타입에서 oneTime+usedAlready이면 skillUsed=false 처리');
info('');
info('버그 #2: innkeeper_true 격산타우 영구 차단');
info('  원인: kill_intent(priority=10) > geoksan_charge(priority=5)');
info('         kill_intent triggered=true(default) → 먼저 break → geoksan_charge 미처리');
info('  영향: HP 30% 이하여도 격산타우 차지 시작 불가');
info('  수정 방안: oneTime 스킬이 이미 사용됐으면 triggered=false 처리 (상위에서 early continue)');
