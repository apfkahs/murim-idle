/**
 * 전략 비교 프레임워크 헬퍼 함수 모음
 * 전략 함수 안에서 사용하는 편의 함수들을 제공한다.
 */
import { advanceTime, callAction, setState, resetGame, getState } from '../src/testAdapter';
import { getArtDef, getMasteryDef, getMasteryDefsForArt, type ProficiencyType } from '../src/data/arts';
import { getMonsterDef } from '../src/data/monsters';
import { getMaxSimdeuk } from '../src/data/tiers';
import {
  calcMaxHp, calcTierMultiplier, getArtCurrentGrade, getMaxEquippedArtGrade,
  type GameState,
} from '../src/store/gameStore';

// ============================================================
// 타입 정의
// ============================================================

export interface StrategyCtx {
  elapsed: number;
  milestones: { id: string; label: string; elapsed: number; value?: any }[];
  checkMilestone(id: string, label: string, check: (s: GameState) => any): void;
}

export interface StrategySnapshot {
  statsSum: number;
  totalSimdeuk: number;
  qi: number;
  tier: number;
  artPoints: number;
  usedArtPoints: number;
  achievementCount: number;
  activeMasteryCount: number;
  activeMasteries: Record<string, string[]>;
  artGrades: Record<string, number>;
  proficiency: Record<ProficiencyType, number>;
  simdeukCapStatus: { artId: string; current: number; cap: number; pct: number }[];
  equippedWeapon: string | null;
  battleMode: string;
}

export interface HuntResult {
  kills: number;
  deaths: number;
  simdeukGained: number;
  minHpPct: number;
  elapsed: number;
}

export interface ExploreResult {
  runs: number;
  wins: number;
  deaths: number;
  simdeukGained: number;
  bossKills: number;
  elapsed: number;
}

// ============================================================
// 내부 유틸
// ============================================================

/** calcUsedPoints는 gameStore 미export → 동일 로직 로컬 구현 */
function calcUsedPointsLocal(state: GameState): number {
  let used = state.equippedArts.reduce((s, id) => s + (getArtDef(id)?.cost ?? 0), 0);
  for (const [artId, mids] of Object.entries(state.activeMasteries)) {
    for (const mid of mids) {
      used += getMasteryDef(artId, mid)?.pointCost ?? 0;
    }
  }
  return used;
}

// ============================================================
// Context 생성
// ============================================================

export function createCtx(): StrategyCtx {
  const milestones: StrategyCtx['milestones'] = [];
  const ctx: StrategyCtx = {
    elapsed: 0,
    milestones,
    checkMilestone(id, label, check) {
      if (milestones.some(m => m.id === id)) return;
      const result = check(getState());
      if (result) {
        milestones.push({ id, label, elapsed: ctx.elapsed, value: result });
      }
    },
  };
  return ctx;
}

// ============================================================
// 빌드 세팅
// ============================================================

export function setupBuild(opts: {
  gi: number; sim: number; che: number;
  ownedArts?: { id: string; totalSimdeuk: number }[];
  equippedArts?: string[];
  equippedSimbeop?: string | null;
  spentQi?: number;
  tier?: number;
  artPoints?: number;
  masteries?: Record<string, string[]>;
  materials?: Record<string, number>;
  proficiency?: Partial<Record<ProficiencyType, number>>;
  fieldUnlocks?: Record<string, boolean>;
  tutorialFlags?: Partial<GameState['tutorialFlags']>;
}): void {
  resetGame();
  const tier = opts.tier ?? 0;
  const tierMult = calcTierMultiplier(tier);
  const maxHp = calcMaxHp(opts.che, 0, tierMult);

  const patch: Partial<GameState> = {
    stats: { gi: opts.gi, sim: opts.sim, che: opts.che },
    totalSpentQi: opts.spentQi ?? 0,
    tier,
    artPoints: opts.artPoints ?? 3,
    maxHp,
    fieldUnlocks: {
      training: true, yasan: true, inn: true,
      ...(opts.fieldUnlocks ?? {}),
    },
    tutorialFlags: {
      equippedSword: true, equippedSimbeop: true, yasanUnlocked: true,
      killedWood: true, killedIron: true,
      ...(opts.tutorialFlags ?? {}),
    },
  };

  if (opts.ownedArts !== undefined) patch.ownedArts = opts.ownedArts;
  if (opts.equippedArts !== undefined) patch.equippedArts = opts.equippedArts;
  if (opts.equippedSimbeop !== undefined) patch.equippedSimbeop = opts.equippedSimbeop;
  if (opts.masteries !== undefined) patch.activeMasteries = opts.masteries;
  if (opts.materials !== undefined) patch.materials = opts.materials;
  if (opts.proficiency !== undefined) (patch as any).proficiency = opts.proficiency;

  setState(patch);
  setState({ hp: getState().maxHp });
}

// ============================================================
// 스탯 투자
// ============================================================

export function investAllAvailable(): number {
  let count = 0;
  while (true) {
    const s = getState();
    if (s.battleMode !== 'none') break;
    const { gi, sim, che } = s.stats;
    let stat: 'gi' | 'sim' | 'che';
    if (gi <= sim && gi <= che) stat = 'gi';
    else if (sim <= che) stat = 'sim';
    else stat = 'che';
    const level = s.stats[stat];
    const cost = Math.max(1, Math.floor(Math.pow(level, 1.25)));
    if (s.qi < cost) break;
    callAction('investStat', stat);
    count++;
  }
  return count;
}

// ============================================================
// 사냥 루프
// ============================================================

function checkHuntMilestones(ctx: StrategyCtx, monsterId: string): void {
  const s = getState();

  // stats{N}: 50 단위 경계 체크
  const statsSum = s.stats.gi + s.stats.sim + s.stats.che;
  const milestone50 = Math.floor(statsSum / 50) * 50;
  if (milestone50 >= 50) {
    ctx.checkMilestone(`stats${milestone50}`, `스탯합 ${milestone50} 도달`, () => true);
  }

  // {monsterId}_first
  ctx.checkMilestone(
    `${monsterId}_first`, `${monsterId} 첫 처치`,
    st => (st.killCounts[monsterId] ?? 0) >= 1 ? true : null,
  );

  // simdeuk_cap_{artId}
  const cap = getMaxSimdeuk(s.tier);
  for (const art of s.ownedArts) {
    const isEquipped = s.equippedArts.includes(art.id) || s.equippedSimbeop === art.id;
    if (isEquipped && art.totalSimdeuk >= cap) {
      ctx.checkMilestone(`simdeuk_cap_${art.id}`, `${art.id} 심득 캡 도달`, () => true);
    }
  }

  // simdeuk_decay_start: maxArtGrade > 현재 사냥 몬스터 grade
  const monDef = getMonsterDef(monsterId);
  if (monDef) {
    const maxGrade = getMaxEquippedArtGrade(s.equippedArts, s.equippedSimbeop, s.activeMasteries);
    if (maxGrade > monDef.grade) {
      ctx.checkMilestone('simdeuk_decay_start', '심득 감쇠 시작', () => true);
    }
  }
}

export function runHuntCycle(
  fieldId: string, monsterId: string, seconds: number,
  ctx: StrategyCtx,
  opts: { autoRetry?: boolean } = {},
): HuntResult {
  const autoRetry = opts.autoRetry ?? true;
  const startKills = getState().killCounts[monsterId] ?? 0;
  const startSimdeuk = getState().totalSimdeuk;
  let deaths = 0;
  let minHpPct = 1;

  callAction('startHunt', fieldId, monsterId);

  for (let i = 0; i < seconds; i++) {
    advanceTime(1);
    ctx.elapsed += 1;

    const s = getState();
    const hpPct = s.maxHp > 0 ? s.hp / s.maxHp : 1;
    if (hpPct < minHpPct) minHpPct = hpPct;

    if (s.battleResult) {
      deaths++;
      callAction('dismissBattleResult');
      if (autoRetry) {
        setState({ hp: getState().maxHp });
        callAction('startHunt', fieldId, monsterId);
      }
    }

    checkHuntMilestones(ctx, monsterId);
  }

  // 타이머 종료 후 전투 강제 중단 (startHunt는 battleMode='none'일 때만 동작)
  if (getState().battleMode !== 'none') {
    setState({ battleMode: 'none', currentEnemy: null, battleResult: null });
  }

  const endState = getState();
  return {
    kills: (endState.killCounts[monsterId] ?? 0) - startKills,
    deaths,
    simdeukGained: endState.totalSimdeuk - startSimdeuk,
    minHpPct,
    elapsed: seconds,
  };
}

// ============================================================
// 탐방 루프
// ============================================================

export function runExploreCycle(
  fieldId: string, ctx: StrategyCtx,
  opts: { maxRuns?: number; maxSecondsPerRun?: number } = {},
): ExploreResult {
  const maxSecondsPerRun = opts.maxSecondsPerRun ?? 600;
  const maxRuns = opts.maxRuns ?? Infinity;
  let runs = 0, wins = 0, deaths = 0;
  const startSimdeuk = getState().totalSimdeuk;
  const startBossKills = Object.values(getState().bossKillCounts).reduce((a, b) => a + b, 0);
  let totalElapsed = 0;

  while (runs < maxRuns) {
    callAction('startExplore', fieldId);
    let waited = 0;
    let settled = false;

    while (waited < maxSecondsPerRun) {
      advanceTime(1);
      ctx.elapsed += 1;
      totalElapsed += 1;
      waited += 1;

      const s = getState();
      if (s.battleResult) {
        runs++;
        if (s.battleResult.type === 'explore_win') wins++;
        else deaths++;
        callAction('dismissBattleResult');
        settled = true;
        break;
      }
      if (s.battleMode === 'none') {
        settled = true;
        break;
      }
    }

    if (!settled) break;
  }

  const endBossKills = Object.values(getState().bossKillCounts).reduce((a, b) => a + b, 0);
  return {
    runs,
    wins,
    deaths,
    simdeukGained: getState().totalSimdeuk - startSimdeuk,
    bossKills: endBossKills - startBossKills,
    elapsed: totalElapsed,
  };
}

// ============================================================
// 대기
// ============================================================

export function idle(seconds: number, ctx: StrategyCtx): void {
  advanceTime(seconds);
  ctx.elapsed += seconds;
}

// ============================================================
// 재료 파밍
// ============================================================

export function getMaterialCount(materialId: string): number {
  return getState().materials[materialId] ?? 0;
}

export function huntUntilMaterials(
  fieldId: string, monsterId: string,
  materialId: string, targetCount: number,
  maxWait: number, ctx: StrategyCtx,
): { elapsed: number; collected: number; kills: number } {
  const startMat = getMaterialCount(materialId);
  const startKills = getState().killCounts[monsterId] ?? 0;
  let elapsed = 0;

  callAction('startHunt', fieldId, monsterId);

  while (elapsed < maxWait) {
    advanceTime(1);
    ctx.elapsed += 1;
    elapsed += 1;

    const s = getState();
    if (s.battleResult) {
      callAction('dismissBattleResult');
      setState({ hp: getState().maxHp });
      callAction('startHunt', fieldId, monsterId);
    }

    if (getMaterialCount(materialId) - startMat >= targetCount) break;
  }

  // 파밍 종료 후 전투 강제 중단
  if (getState().battleMode !== 'none') {
    setState({ battleMode: 'none', currentEnemy: null, battleResult: null });
  }

  return {
    elapsed,
    collected: getMaterialCount(materialId) - startMat,
    kills: (getState().killCounts[monsterId] ?? 0) - startKills,
  };
}

// ============================================================
// 제작
// ============================================================

export function craftEquip(recipeId: string, materialCount: number): string | null {
  const before = getState().equipmentInventory.length;
  const success = callAction('craft', recipeId, materialCount);
  if (!success) return null;
  const inv = getState().equipmentInventory;
  return inv.length > before ? inv[inv.length - 1].instanceId : null;
}

export function craftArt(recipeId: string): boolean {
  return callAction('craftArtRecipe', recipeId);
}

// ============================================================
// 용권(두루마리) 자동 학습
// ============================================================

export function learnAvailableScrolls(): string[] {
  const learned: string[] = [];
  const scrolls = getState().inventory.filter(i => i.itemType === 'art_scroll');
  for (const scroll of scrolls) {
    callAction('learnScroll', scroll.id);
    if (scroll.artId) learned.push(scroll.artId);
  }
  return learned;
}

// ============================================================
// 경지 돌파
// ============================================================

export function attemptBreakthroughIfReady(ctx: StrategyCtx): boolean {
  const before = getState().tier;
  callAction('attemptBreakthrough');
  const after = getState().tier;
  if (after > before) {
    ctx.milestones.push({ id: `tier${after}`, label: `경지 ${after} 돌파`, elapsed: ctx.elapsed });
    return true;
  }
  return false;
}

// ============================================================
// 마스터리 자동 활성화
// ============================================================

export function activateMasteriesIfReady(ctx: StrategyCtx): string[] {
  const activated: string[] = [];
  let changed = true;

  while (changed) {
    changed = false;
    const s = getState();
    const allArts = [...s.equippedArts];
    if (s.equippedSimbeop) allArts.push(s.equippedSimbeop);

    outer:
    for (const artId of allArts) {
      const owned = s.ownedArts.find(a => a.id === artId);
      if (!owned) continue;
      const masteryDefs = getMasteryDefsForArt(artId);
      const currentMasteries = s.activeMasteries[artId] ?? [];

      for (const mDef of masteryDefs) {
        if (currentMasteries.includes(mDef.id)) continue;
        if (owned.totalSimdeuk < mDef.requiredSimdeuk) continue;
        if (mDef.requiredTier > 0 && s.tier < mDef.requiredTier) continue;
        if (mDef.requires?.some((r: string) => !currentMasteries.includes(r))) continue;
        const usedPts = calcUsedPointsLocal(s);
        if (s.artPoints - usedPts < mDef.pointCost) continue;

        callAction('activateMastery', artId, mDef.id);
        activated.push(mDef.id);
        ctx.milestones.push({
          id: `mastery_${mDef.id}`, label: `마스터리 ${mDef.id} 활성화`, elapsed: ctx.elapsed,
        });

        // combat_qi_unlocked: simbeop stage2 마스터리 활성화 여부 직접 체크
        ctx.checkMilestone('combat_qi_unlocked', '전투 qi 해금', st => {
          if (!st.equippedSimbeop) return null;
          const aDef = getArtDef(st.equippedSimbeop);
          const isUnlocked = aDef?.masteries.some(
            m => m.stage === 2 && (st.activeMasteries[st.equippedSimbeop!] ?? []).includes(m.id),
          ) ?? false;
          return isUnlocked ? true : null;
        });

        changed = true;
        break outer;
      }
    }
  }

  return activated;
}

// ============================================================
// 스냅샷
// ============================================================

export function snapshot(): StrategySnapshot {
  const s = getState();
  const allArts = [...s.equippedArts];
  if (s.equippedSimbeop) allArts.push(s.equippedSimbeop);

  const artGrades: Record<string, number> = {};
  for (const artId of allArts) {
    artGrades[artId] = getArtCurrentGrade(artId, s.activeMasteries);
  }

  const cap = getMaxSimdeuk(s.tier);
  const simdeukCapStatus = s.ownedArts
    .filter(a => allArts.includes(a.id))
    .map(a => ({
      artId: a.id,
      current: a.totalSimdeuk,
      cap,
      pct: Math.round((a.totalSimdeuk / cap) * 100),
    }));

  let usedArtPoints = s.equippedArts.reduce((sum, id) => sum + (getArtDef(id)?.cost ?? 0), 0);
  for (const [artId, mids] of Object.entries(s.activeMasteries)) {
    for (const mid of mids) {
      usedArtPoints += getMasteryDef(artId, mid)?.pointCost ?? 0;
    }
  }

  const activeMasteryCount = Object.values(s.activeMasteries).reduce((sum, arr) => sum + arr.length, 0);

  return {
    statsSum: s.stats.gi + s.stats.sim + s.stats.che,
    totalSimdeuk: s.totalSimdeuk,
    qi: s.qi,
    tier: s.tier,
    artPoints: s.artPoints,
    usedArtPoints,
    achievementCount: s.achievementCount,
    activeMasteryCount,
    activeMasteries: { ...s.activeMasteries },
    artGrades,
    proficiency: { ...s.proficiency },
    simdeukCapStatus,
    equippedWeapon: s.equipment.weapon?.defId ?? null,
    battleMode: s.battleMode,
  };
}

// ============================================================
// 전략 비교
// ============================================================

export function compareStrategies(
  strategies: Array<{ label: string; fn: (ctx: StrategyCtx) => StrategySnapshot }>,
  opts: { runs?: number; milestoneIds?: string[] } = {},
): void {
  const runs = opts.runs ?? 3;
  const milestoneIds = opts.milestoneIds ?? [];

  type RunResult = { snap: StrategySnapshot; ctx: StrategyCtx };
  const results: RunResult[][] = strategies.map(() => []);

  for (let r = 0; r < runs; r++) {
    for (let si = 0; si < strategies.length; si++) {
      const ctx = createCtx();
      const snap = strategies[si].fn(ctx);
      results[si].push({ snap, ctx });
    }
  }

  // ── 통계 유틸 ──
  function avg(nums: number[]): number {
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }
  function stdDev(nums: number[]): number {
    const mean = avg(nums);
    return Math.sqrt(nums.reduce((s, n) => s + (n - mean) ** 2, 0) / nums.length);
  }
  function fmtN(n: number): string {
    return n >= 10000 ? n.toLocaleString('ko-KR') : String(Math.round(n));
  }
  function fmtStat(nums: number[]): string {
    const mean = avg(nums);
    const sd = stdDev(nums);
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    if (runs === 1) return fmtN(mean);
    return `${fmtN(mean)} ±${fmtN(sd)} [${fmtN(min)}~${fmtN(max)}]`;
  }

  const COL_W = 32;
  const LABEL_W = 22;

  console.log(`\n=== 전략 비교 결과 (${runs}회 평균) ===\n`);
  console.log(
    '항목'.padEnd(LABEL_W) +
    strategies.map(s => s.label.padEnd(COL_W)).join('') +
    '판정',
  );
  console.log('─'.repeat(LABEL_W + strategies.length * COL_W + 12));

  type Row = { label: string; values: string[]; verdict: string };

  function makeRow(
    label: string,
    getter: (snap: StrategySnapshot) => number,
    unit = '',
    higherIsBetter = true,
  ): Row {
    const valArrays = strategies.map((_, si) => results[si].map(r => getter(r.snap)));
    const values = valArrays.map(v => fmtStat(v) + unit);
    const means = valArrays.map(v => avg(v));
    let verdict = '동일';
    if (strategies.length === 2 && Math.abs(means[0] - means[1]) > 0.001) {
      const winnerIdx = higherIsBetter
        ? (means[0] > means[1] ? 0 : 1)
        : (means[0] < means[1] ? 0 : 1);
      const base = Math.min(Math.abs(means[0]), Math.abs(means[1]));
      if (base > 0) {
        const diff = Math.abs(means[0] - means[1]);
        const pct = ((diff / base) * 100).toFixed(1);
        verdict = `${strategies[winnerIdx].label} +${pct}%`;
      }
    }
    return { label, values, verdict };
  }

  function printRow(row: Row): void {
    console.log(
      row.label.padEnd(LABEL_W) +
      row.values.map(v => v.padEnd(COL_W)).join('') +
      row.verdict,
    );
  }

  // ── 주요 수치 행 ──
  printRow(makeRow('최종 심득', s => s.totalSimdeuk));
  printRow(makeRow('최종 스탯합', s => s.statsSum));
  printRow(makeRow('경지', s => s.tier));
  printRow(makeRow('usedArtPoints', s => s.usedArtPoints, 'pt'));
  printRow(makeRow('activeMasteries', s => s.activeMasteryCount, '개'));
  printRow(makeRow('업적 수', s => s.achievementCount, '개'));

  // ── artGrade 행 (장착 무공별) ──
  const allArtIds = new Set<string>();
  for (const runSet of results) {
    for (const r of runSet) Object.keys(r.snap.artGrades).forEach(id => allArtIds.add(id));
  }
  for (const artId of allArtIds) {
    printRow(makeRow(`artGrade(${artId})`, s => s.artGrades[artId] ?? 0));
  }

  // ── 심득 캡 달성률 ──
  const capArtIds = new Set<string>();
  for (const runSet of results) {
    for (const r of runSet) r.snap.simdeukCapStatus.forEach(c => capArtIds.add(c.artId));
  }
  for (const artId of capArtIds) {
    const valArrays = strategies.map((_, si) =>
      results[si].map(r => r.snap.simdeukCapStatus.find(x => x.artId === artId)?.pct ?? 0),
    );
    const values = valArrays.map(v => `${fmtN(avg(v))}%`);
    const maxPct = Math.max(...valArrays.flatMap(v => v));
    console.log(
      `심득캡(${artId})`.padEnd(LABEL_W) +
      values.map(v => v.padEnd(COL_W)).join('') +
      (maxPct >= 100 ? '⚠ 캡 도달' : ''),
    );
  }

  // ── 마일스톤 ──
  if (milestoneIds.length > 0) {
    console.log('\n마일스톤 (평균 경과 초):');
    for (const id of milestoneIds) {
      const values = strategies.map((_, si) => {
        const times = results[si]
          .map(r => r.ctx.milestones.find(m => m.id === id)?.elapsed)
          .filter((t): t is number => t !== undefined);
        return times.length === 0 ? '없음'.padEnd(COL_W) : fmtStat(times).padEnd(COL_W);
      });
      console.log(`  ${id}`.padEnd(LABEL_W) + values.join(''));
    }
  }

  // ── 총평 ──
  const simdeukMeans = strategies.map((_, si) => avg(results[si].map(r => r.snap.totalSimdeuk)));
  const maxIdx = simdeukMeans.indexOf(Math.max(...simdeukMeans));
  const minIdx = simdeukMeans.indexOf(Math.min(...simdeukMeans));
  if (Math.abs(simdeukMeans[maxIdx] - simdeukMeans[minIdx]) > 0.001) {
    const diff = ((simdeukMeans[maxIdx] - simdeukMeans[minIdx]) / simdeukMeans[minIdx] * 100).toFixed(1);
    const winner = strategies[maxIdx].label;
    const flag = maxIdx !== 0 ? '' : ' ⚠ 다람쥐 집중이 유리 — 밸런스 검토 필요';
    console.log(`\n총평: 심득 기준 ${winner} +${diff}% 우위${flag}`);
  } else {
    console.log('\n총평: 두 전략 심득 동일');
  }
}
