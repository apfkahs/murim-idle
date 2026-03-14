/**
 * 업적 데이터 (v1.0) — 18개, 각 +1 포인트
 */

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  check: (ctx: AchievementContext) => boolean;
  // 미해금 조건: 이전 업적이 달성되어야 표시
  prerequisite?: string;
}

export interface AchievementContext {
  killCounts: Record<string, number>;
  bossKillCounts: Record<string, number>;
  ownedArts: string[];
  artSimdeuks: Record<string, number>;
  totalStats: number;
  totalSimdeuk: number;
  tier: number;
  achievements: string[];
  hiddenEncountered: boolean;
  fieldUnlocks: Record<string, boolean>;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_step', name: '첫 걸음', description: '나무인형 처치',
    check: ctx => (ctx.killCounts['training_wood'] ?? 0) >= 1,
  },
  {
    id: 'training_graduate', name: '수련장 졸업', description: '철인형 처치',
    check: ctx => (ctx.killCounts['training_iron'] ?? 0) >= 1,
    prerequisite: 'first_step',
  },
  {
    id: 'yasan_entry', name: '야산 입문', description: '야산 첫 승리',
    check: ctx => {
      const yasanIds = ['squirrel','rabbit','fox','deer','boar','wolf','bear'];
      return yasanIds.some(id => (ctx.killCounts[id] ?? 0) >= 1);
    },
    prerequisite: 'training_graduate',
  },
  {
    id: 'field_inn', name: '허름한 객잔 발견',
    description: '야산의 곰을 처치하여 새로운 전장을 발견했다',
    check: ctx => ctx.fieldUnlocks['inn'] === true,
    prerequisite: 'yasan_entry',
  },
  {
    id: 'hunter_10', name: '사냥꾼', description: '야산 10마리',
    check: ctx => getYasanKills(ctx) >= 10,
    prerequisite: 'yasan_entry',
  },
  {
    id: 'hunter_50', name: '숙련 사냥꾼', description: '야산 50마리',
    check: ctx => getYasanKills(ctx) >= 50,
    prerequisite: 'hunter_10',
  },
  {
    id: 'hunter_200', name: '달인 사냥꾼', description: '야산 200마리',
    check: ctx => getYasanKills(ctx) >= 200,
    prerequisite: 'hunter_50',
  },
  {
    id: 'boss_first', name: '보스 도전', description: '보스 첫 처치',
    check: ctx => (ctx.bossKillCounts['tiger_boss'] ?? 0) >= 1,
    prerequisite: 'yasan_entry',
  },
  {
    id: 'boss_5', name: '보스 사냥꾼', description: '보스 5회',
    check: ctx => (ctx.bossKillCounts['tiger_boss'] ?? 0) >= 5,
    prerequisite: 'boss_first',
  },
  {
    id: 'hidden_encounter', name: '산해경 조우', description: '히든 첫 조우',
    check: ctx => ctx.hiddenEncountered,
    prerequisite: 'yasan_entry',
  },
  {
    id: 'art_collector', name: '무공 수집가', description: '무공 4종',
    check: ctx => ctx.ownedArts.length >= 4,
    prerequisite: 'yasan_entry',
  },
  {
    id: 'grade_2', name: '무공 숙련', description: '아무 무공 심득 100 이상',
    check: ctx => Object.values(ctx.artSimdeuks).some(s => s >= 100),
    prerequisite: 'first_step',
  },
  {
    id: 'grade_3', name: '무공 성장', description: '아무 무공 심득 300 이상',
    check: ctx => Object.values(ctx.artSimdeuks).some(s => s >= 300),
    prerequisite: 'grade_2',
  },
  {
    id: 'stats_10', name: '경맥 입문', description: '경맥합 10',
    check: ctx => ctx.totalStats >= 10,
  },
  {
    id: 'stats_30', name: '경맥 성장', description: '경맥합 30',
    check: ctx => ctx.totalStats >= 30,
    prerequisite: 'stats_10',
  },
  {
    id: 'tier_1', name: '삼류 중기', description: '삼류 중기 달성',
    check: ctx => ctx.tier >= 1,
    prerequisite: 'stats_30',
  },
  {
    id: 'tier_2', name: '삼류 후기', description: '삼류 후기 달성',
    check: ctx => ctx.tier >= 2,
    prerequisite: 'tier_1',
  },
  {
    id: 'simdeuk_500', name: '심득 500', description: '누적 500',
    check: ctx => ctx.totalSimdeuk >= 500,
    prerequisite: 'first_step',
  },
  {
    id: 'simdeuk_3000', name: '심득 3천', description: '누적 3,000',
    check: ctx => ctx.totalSimdeuk >= 3000,
    prerequisite: 'simdeuk_500',
  },
];

function getYasanKills(ctx: AchievementContext): number {
  const yasanIds = ['squirrel','rabbit','fox','deer','boar','wolf','bear'];
  return yasanIds.reduce((sum, id) => sum + (ctx.killCounts[id] ?? 0), 0);
}

export function getAchievementDef(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find(a => a.id === id);
}
