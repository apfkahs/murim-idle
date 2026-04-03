/**
 * 전략 비교 시뮬레이션: 다람쥐 집중 vs 단계적 성장
 * 실행: cd app && npx tsx scripts/test-strategy-compare.ts
 */
import { callAction } from '../src/testAdapter';
import {
  setupBuild, runHuntCycle, huntUntilMaterials, craftEquip, idle, investAllAvailable,
  attemptBreakthroughIfReady, activateMasteriesIfReady, snapshot,
  compareStrategies, type StrategyCtx,
} from './test-helpers';

// 각 사냥 주기: 400s 사냥 + 80s 휴식(qi 축적) = 480s
const HUNT_SEC = 400;
const REST_SEC = 80;

// ============================================================
// 전략 A — 다람쥐 집중 후 점프
// ============================================================

function strategyA(ctx: StrategyCtx) {
  setupBuild({
    gi: 5, sim: 5, che: 5,
    ownedArts: [
      { id: 'samjae_sword', totalSimdeuk: 0 },
      { id: 'samjae_simbeop', totalSimdeuk: 0 },
    ],
    equippedArts: ['samjae_sword'],
    equippedSimbeop: 'samjae_simbeop',
    artPoints: 3,
  });

  // 수련장 파밍 → 목검 제작
  huntUntilMaterials('training', 'training_wood', 'wood_fragment', 50, 600, ctx);
  const swordId = craftEquip('recipe_sturdy_wooden_sword', 50);
  if (swordId) callAction('equipItem', swordId);

  // 다람쥐 집중 5회 (사냥 + 휴식)
  for (let i = 0; i < 5; i++) {
    runHuntCycle('yasan', 'squirrel', HUNT_SEC, ctx);
    idle(REST_SEC, ctx);
    investAllAvailable();
    attemptBreakthroughIfReady(ctx);
    activateMasteriesIfReady(ctx);
  }

  // 남은 시간 늑대 도전
  const remaining = 3600 - ctx.elapsed;
  if (remaining > 0) runHuntCycle('yasan', 'wolf', remaining, ctx);
  investAllAvailable();

  return snapshot();
}

// ============================================================
// 전략 B — 단계적 성장
// ============================================================

function strategyB(ctx: StrategyCtx) {
  setupBuild({
    gi: 5, sim: 5, che: 5,
    ownedArts: [
      { id: 'samjae_sword', totalSimdeuk: 0 },
      { id: 'samjae_simbeop', totalSimdeuk: 0 },
    ],
    equippedArts: ['samjae_sword'],
    equippedSimbeop: 'samjae_simbeop',
    artPoints: 3,
  });

  // 수련장 파밍 → 목검 제작
  huntUntilMaterials('training', 'training_wood', 'wood_fragment', 50, 600, ctx);
  const swordId = craftEquip('recipe_sturdy_wooden_sword', 50);
  if (swordId) callAction('equipItem', swordId);

  // 5단계 몬스터 (사냥 + 휴식)
  for (const monster of ['squirrel', 'rabbit', 'fox', 'deer', 'boar']) {
    runHuntCycle('yasan', monster, HUNT_SEC, ctx);
    idle(REST_SEC, ctx);
    investAllAvailable();
    attemptBreakthroughIfReady(ctx);
    activateMasteriesIfReady(ctx);
  }

  // 남은 시간 늑대 도전
  const remaining = 3600 - ctx.elapsed;
  if (remaining > 0) runHuntCycle('yasan', 'wolf', remaining, ctx);
  investAllAvailable();

  return snapshot();
}

// ============================================================
// 비교 실행
// ============================================================

compareStrategies(
  [
    { label: '다람쥐집중', fn: strategyA },
    { label: '단계적성장', fn: strategyB },
  ],
  {
    runs: 3,
    milestoneIds: [
      'tier1', 'stats50', 'wolf_first',
      'simdeuk_cap_samjae_sword', 'simdeuk_decay_start', 'combat_qi_unlocked',
    ],
  },
);
