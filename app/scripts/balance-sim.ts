/**
 * 밸런스 시뮬레이션 (v1.1)
 * GAME_GUIDE.md 5장: 합리적인 플레이어를 가정.
 * 사이클: 내공 수련 → 스탯 투자 → 전투 (HP 관리하며 반복)
 */

// ── 데이터 ──

interface MonData {
  id: string; name: string; hp: number; attackPower: number;
  attackInterval: number; regen: number; simdeuk: number;
  drops: { artId: string; chance: number }[];
  isTraining?: boolean; isBoss?: boolean;
}

const MONSTERS: MonData[] = [
  { id: 'training_wood', name: '나무인형', hp: 10, attackPower: 0, attackInterval: 0, regen: 0, simdeuk: 1, drops: [{ artId: 'samjae_sword', chance: 1.0 }], isTraining: true },
  { id: 'training_iron', name: '철인형', hp: 30, attackPower: 0, attackInterval: 0, regen: 2, simdeuk: 3, drops: [{ artId: 'samjae_simbeop', chance: 1.0 }], isTraining: true },
  { id: 'squirrel', name: '다람쥐', hp: 25, attackPower: 4, attackInterval: 3.5, regen: 0, simdeuk: 2, drops: [] },
  { id: 'rabbit', name: '토끼', hp: 40, attackPower: 5, attackInterval: 3.0, regen: 0, simdeuk: 4, drops: [] },
  { id: 'fox', name: '여우', hp: 70, attackPower: 8, attackInterval: 2.8, regen: 0, simdeuk: 7, drops: [{ artId: 'mudang_step', chance: 0.03 }] },
  { id: 'deer', name: '사슴', hp: 110, attackPower: 6, attackInterval: 3.0, regen: 0, simdeuk: 9, drops: [] },
  { id: 'boar', name: '멧돼지', hp: 90, attackPower: 14, attackInterval: 2.2, regen: 0, simdeuk: 10, drops: [] },
  { id: 'wolf', name: '늑대', hp: 160, attackPower: 16, attackInterval: 2.0, regen: 0, simdeuk: 15, drops: [{ artId: 'mudang_step', chance: 0.05 }] },
  { id: 'bear', name: '곰', hp: 280, attackPower: 22, attackInterval: 2.5, regen: 0, simdeuk: 25, drops: [{ artId: 'mudang_step', chance: 0.08 }] },
  { id: 'tiger_boss', name: '산군', hp: 650, attackPower: 28, attackInterval: 1.8, regen: 0, simdeuk: 120, drops: [{ artId: 'heupgong', chance: 0.15 }], isBoss: true },
];

const GRADE_COSTS = [0, 1, 2.5, 6, 12, 25]; // 심득 비용 배율
const BASE_SIMDEUK_COST: Record<string, number> = {
  samjae_sword: 80, samjae_simbeop: 60, mudang_step: 100, heupgong: 200,
};

// 무공별 성급 데이터
const ART_POWER: Record<string, number[]> = { samjae_sword: [0, 12, 18, 26, 36, 48] };
const ART_TRIGGER: Record<string, number[]> = { samjae_sword: [0, 0.55, 0.55, 0.60, 0.60, 0.65] };
const ART_DODGE: Record<string, number[]> = { mudang_step: [0, 3, 5, 8, 12, 15] };
const ART_NEIGONG: Record<string, number[]> = {
  samjae_simbeop: [0, 1, 1.5, 2.5, 3.5, 5],
  heupgong: [0, 3, 4.5, 7, 10, 14],
};
const ART_TYPE: Record<string, string> = {
  samjae_sword: 'active', mudang_step: 'passive',
  samjae_simbeop: 'simbeop', heupgong: 'simbeop',
};

// ── 공식 ──
function calcAttackInterval(gyeongsin: number): number {
  return Math.max(4 / (1 + Math.log(1 + gyeongsin * 0.05)), 1.0);
}
function calcMaxHp(totalSpent: number): number {
  return 50 + Math.floor(Math.log2(1 + totalSpent) * 15);
}
function calcStatCost(level: number): number {
  return Math.floor(10 * Math.pow(1.15, level));
}

// ── 상태 ──
interface SimState {
  neigong: number;
  totalSpentNeigong: number;
  stats: { sungi: number; gyeongsin: number; magi: number };
  hp: number; maxHp: number;
  ownedArts: Map<string, number>; // artId -> grade
  equippedArts: string[];
  equippedSimbeop: string | null;
  totalSimdeuk: number;
  artProficiency: Map<string, number>; // artId -> proficiency
  time: number;
  killCounts: Map<string, number>;
}

function getNeigongRate(s: SimState): number {
  let r = 1;
  if (s.equippedSimbeop && ART_NEIGONG[s.equippedSimbeop]) {
    const g = s.ownedArts.get(s.equippedSimbeop) ?? 1;
    r += ART_NEIGONG[s.equippedSimbeop][g] ?? 0;
  }
  return r;
}

function getDodge(s: SimState): number {
  let d = 0;
  for (const artId of s.equippedArts) {
    if (ART_DODGE[artId]) {
      const g = s.ownedArts.get(artId) ?? 1;
      d += ART_DODGE[artId][g] ?? 0;
    }
  }
  return Math.min(d, 25);
}

function avgDmgPerHit(s: SimState): number {
  // 액티브 무공만
  const activeArts = s.equippedArts.filter(id => ART_TYPE[id] === 'active');
  if (activeArts.length === 0) return 5;

  let totalE = 0;
  let probNone = 1;
  for (const artId of activeArts) {
    const g = s.ownedArts.get(artId) ?? 1;
    const power = ART_POWER[artId]?.[g] ?? 0;
    const rate = ART_TRIGGER[artId]?.[g] ?? 0;
    let dmg = power * (1 + s.stats.sungi * 0.01 + s.stats.magi * 0.01);
    totalE += rate * dmg; // 이 무공이 발동됐을 때 기대 피해
    probNone *= (1 - rate);
  }
  totalE += probNone * 5; // 전부 실패 시 평타
  return totalE;
}

// 몬스터 1마리 전투 시뮬 (세밀 틱)
function fightMonster(s: SimState, mon: MonData): { killTime: number; survived: boolean; hpAfter: number; kills: number } {
  const atkInterval = calcAttackInterval(s.stats.gyeongsin);
  const dodge = getDodge(s) / 100;
  let playerTimer = atkInterval;
  let enemyTimer = mon.attackInterval;
  let enemyHp = mon.hp;
  let hp = s.hp;
  let t = 0;
  let kills = 0;
  const maxFightTime = 120; // 최대 2분

  while (t < maxFightTime) {
    t += 1;

    // 적 회복
    if (mon.regen > 0) {
      enemyHp = Math.min(enemyHp + mon.regen, mon.hp);
    }

    // 플레이어 공격
    playerTimer -= 1;
    if (playerTimer <= 0) {
      playerTimer += atkInterval;
      const dmg = avgDmgPerHit(s);
      enemyHp -= dmg;
    }

    // 적 사망
    if (enemyHp <= 0) {
      kills++;
      return { killTime: t, survived: true, hpAfter: hp, kills };
    }

    // 적 공격
    if (mon.attackPower > 0 && mon.attackInterval > 0) {
      enemyTimer -= 1;
      if (enemyTimer <= 0) {
        enemyTimer += mon.attackInterval;
        if (Math.random() >= dodge) {
          hp -= mon.attackPower;
        }
      }
    }

    if (hp <= 0) {
      return { killTime: t, survived: false, hpAfter: 1, kills };
    }
  }

  return { killTime: t, survived: hp > 0, hpAfter: hp, kills };
}

// 스탯 투자
function investAll(s: SimState): void {
  while (true) {
    // 가장 싼 스탯에 투자 (경신 약간 우선)
    const entries: { key: 'sungi' | 'gyeongsin' | 'magi'; cost: number }[] = [
      { key: 'sungi', cost: calcStatCost(s.stats.sungi) },
      { key: 'gyeongsin', cost: calcStatCost(s.stats.gyeongsin) },
      { key: 'magi', cost: calcStatCost(s.stats.magi) },
    ];
    entries.sort((a, b) => a.cost - b.cost);

    const best = entries[0];
    if (s.neigong < best.cost) break;

    s.neigong -= best.cost;
    s.totalSpentNeigong += best.cost;
    s.stats[best.key]++;
    s.maxHp = calcMaxHp(s.totalSpentNeigong);
    s.hp = s.maxHp; // 투자 시 풀힐 가정
  }
}

// 심득 → 숙련도 → 성급 업
function applySimdeuk(s: SimState, amount: number): void {
  const allEquipped = [...s.equippedArts];
  if (s.equippedSimbeop) allEquipped.push(s.equippedSimbeop);

  for (const artId of allEquipped) {
    const grade = s.ownedArts.get(artId) ?? 1;
    if (grade >= 5) continue;

    const prof = (s.artProficiency.get(artId) ?? 0) + amount;
    const nextGrade = grade + 1;
    const baseCost = BASE_SIMDEUK_COST[artId] ?? 100;
    const needed = Math.floor(baseCost * GRADE_COSTS[nextGrade - 1]);

    if (needed > 0 && prof >= needed) {
      s.artProficiency.set(artId, prof - needed);
      s.ownedArts.set(artId, nextGrade);
    } else {
      s.artProficiency.set(artId, prof);
    }
  }
}

// ── 메인 ──
function runSimulation() {
  const s: SimState = {
    neigong: 0, totalSpentNeigong: 0,
    stats: { sungi: 0, gyeongsin: 0, magi: 0 },
    hp: 50, maxHp: 50,
    ownedArts: new Map(), equippedArts: [], equippedSimbeop: null,
    totalSimdeuk: 0, artProficiency: new Map(),
    time: 0, killCounts: new Map(),
  };

  const milestones: { name: string; time: number }[] = [];
  const achieved = new Set<string>();
  function ms(name: string) {
    if (!achieved.has(name)) { achieved.add(name); milestones.push({ name, time: s.time }); }
  }

  const MAX_TIME = 7200; // 2시간

  // Phase 0: 수련장
  // 나무인형 (맨손: 평타5, HP10, 간격4초) → 2타 = 8초
  s.time += 8;
  s.ownedArts.set('samjae_sword', 1); s.artProficiency.set('samjae_sword', 0);
  s.equippedArts = ['samjae_sword'];
  s.killCounts.set('training_wood', 1);
  ms('나무인형 첫 처치');

  // 철인형 (삼재검법1성, HP30, regen2)
  {
    const r = fightMonster(s, MONSTERS[1]);
    s.time += r.killTime;
    s.hp = r.hpAfter;
  }
  s.ownedArts.set('samjae_simbeop', 1); s.artProficiency.set('samjae_simbeop', 0);
  s.equippedSimbeop = 'samjae_simbeop';
  s.killCounts.set('training_iron', 1);
  ms('철인형 첫 처치');

  // Phase 1: 사이클 (내공 수련 → 투자 → 전투)
  const YASAN = MONSTERS.filter(m => !m.isTraining && !m.isBoss);
  const BOSS = MONSTERS.find(m => m.id === 'tiger_boss')!;

  // 전략: 20초 수련 → 투자 → 사냥 가능한 가장 강한 몬스터 연속 사냥 (HP 50% 이하면 중단)
  while (s.time < MAX_TIME) {
    // 1) 내공 수련 (20초)
    const farmTime = 20;
    const rate = getNeigongRate(s);
    s.neigong += rate * farmTime;
    s.hp = Math.min(s.hp + s.maxHp * 0.05 * farmTime, s.maxHp); // HP 회복
    s.time += farmTime;

    // 2) 스탯 투자
    investAll(s);

    // 3) HP 관리: 내공으로 회복
    if (s.hp < s.maxHp * 0.8) {
      const heal = Math.min(s.maxHp - s.hp, s.neigong);
      s.hp += heal;
      s.neigong -= heal;
    }

    // 4) 사냥
    // 사냥 가능한 가장 강한 몬스터 결정 (안전 마진: HP 30% 이상 남아야 함)
    let target: MonData | null = null;
    for (let i = YASAN.length - 1; i >= 0; i--) {
      const testResult = fightMonster(s, YASAN[i]);
      if (testResult.survived && testResult.hpAfter > s.maxHp * 0.3) {
        target = YASAN[i];
        break;
      }
    }
    if (!target) {
      // 가장 약한 몬스터라도
      const testResult = fightMonster(s, YASAN[0]);
      if (testResult.survived) target = YASAN[0];
    }

    if (!target) continue; // 더 성장 필요

    // 연속 사냥 (HP 50% 이하까지)
    let huntCount = 0;
    while (s.hp > s.maxHp * 0.5 && s.time < MAX_TIME) {
      const result = fightMonster(s, target);
      s.time += result.killTime;

      if (!result.survived) {
        s.hp = 1;
        break;
      }

      s.hp = result.hpAfter;
      huntCount++;

      const kills = (s.killCounts.get(target.id) ?? 0) + 1;
      s.killCounts.set(target.id, kills);

      s.totalSimdeuk += target.simdeuk;
      applySimdeuk(s, target.simdeuk);

      // 드롭
      for (const drop of target.drops) {
        if (Math.random() < drop.chance && !s.ownedArts.has(drop.artId)) {
          s.ownedArts.set(drop.artId, 1);
          s.artProficiency.set(drop.artId, 0);
          if (ART_TYPE[drop.artId] === 'passive') {
            s.equippedArts.push(drop.artId);
            ms(`${drop.artId} 획득`);
          }
          if (ART_TYPE[drop.artId] === 'simbeop') {
            // 더 좋은 심법이면 교체
            const newRate = ART_NEIGONG[drop.artId]?.[1] ?? 0;
            const curRate = getNeigongRate(s) - 1;
            if (newRate > curRate) {
              s.equippedSimbeop = drop.artId;
              ms(`${drop.artId} 심법 교체`);
            }
          }
        }
      }

      // 마일스톤
      ms(`${target.name} 안정 사냥`);
    }

    // 보스 도전: 곰 안정 사냥 가능 + HP 충분
    if (achieved.has('곰 안정 사냥') && !achieved.has('산군(보스) 첫 클리어')) {
      // HP 풀충 후 도전
      s.hp = s.maxHp;
      const bossResult = fightMonster(s, BOSS);
      if (bossResult.survived && bossResult.killTime <= 60) {
        s.time += bossResult.killTime;
        s.hp = bossResult.hpAfter;
        s.killCounts.set('tiger_boss', 1);
        s.totalSimdeuk += BOSS.simdeuk;
        applySimdeuk(s, BOSS.simdeuk);
        ms('산군(보스) 첫 클리어');

        for (const drop of BOSS.drops) {
          if (Math.random() < drop.chance && !s.ownedArts.has(drop.artId)) {
            s.ownedArts.set(drop.artId, 1);
            s.artProficiency.set(drop.artId, 0);
            ms(`${drop.artId} 획득`);
          }
        }
      }
    }
  }

  // ── 결과 출력 ──
  console.log('\n═══════════════════════════════════════');
  console.log('  무림 방치록 v1.1 밸런스 시뮬레이션');
  console.log('═══════════════════════════════════════\n');

  console.log('마일스톤 도달 시간:');
  console.log('─────────────────────────────────────');
  for (const m of milestones) {
    const min = Math.floor(m.time / 60);
    const sec = Math.floor(m.time % 60);
    console.log(`  ${min.toString().padStart(4)}분 ${sec.toString().padStart(2, '0')}초  │  ${m.name}`);
  }

  const totalStats = s.stats.sungi + s.stats.gyeongsin + s.stats.magi;
  console.log(`\n최종 상태 (${Math.floor(s.time / 60)}분):`);
  console.log('─────────────────────────────────────');
  console.log(`  내공: ${Math.floor(s.neigong)} | 총투자: ${s.totalSpentNeigong}`);
  console.log(`  HP: ${Math.floor(s.hp)}/${s.maxHp}`);
  console.log(`  스탯: 선${s.stats.sungi} 경${s.stats.gyeongsin} 마${s.stats.magi} (합${totalStats})`);
  console.log(`  공격간격: ${calcAttackInterval(s.stats.gyeongsin).toFixed(2)}초`);
  console.log(`  회피: ${getDodge(s)}%`);
  console.log(`  총심득: ${s.totalSimdeuk}`);
  console.log(`  무공: ${[...s.ownedArts.entries()].map(([id, g]) => `${id}(${g}성)`).join(', ')}`);
  console.log(`  평균 피해/타: ${avgDmgPerHit(s).toFixed(1)}`);

  console.log('\n처치 횟수:');
  for (const [id, c] of s.killCounts) if (c > 0) console.log(`  ${id}: ${c}회`);

  console.log('\n═══ 밸런스 체크리스트 ═══');
  console.log(`  [${achieved.has('나무인형 첫 처치') ? '✓' : '✗'}] 맨손으로 수련장 클리어`);
  console.log(`  [${achieved.has('다람쥐 안정 사냥') ? '✓' : '✗'}] 첫 전장 가장 약한 몬스터 안정 사냥`);
  console.log(`  [${achieved.has('곰 안정 사냥') ? '✓' : '✗'}] 첫 전장 가장 강한 몬스터 안정 사냥`);
  console.log(`  [${achieved.has('산군(보스) 첫 클리어') ? '✓' : '✗'}] 보스 첫 클리어 (60초 내)`);

  if (milestones.length > 1) {
    console.log('\n마일스톤 간 격차:');
    for (let i = 1; i < milestones.length; i++) {
      const gap = milestones[i].time - milestones[i-1].time;
      const gm = Math.floor(gap / 60), gs = Math.floor(gap % 60);
      console.log(`  ${milestones[i-1].name} → ${milestones[i].name}: ${gm}분 ${gs}초`);
    }
  }
}

runSimulation();
