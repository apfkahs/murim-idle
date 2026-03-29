/**
 * 업적 데이터 (v2.0) — 28개
 * kill_chain 연쇄 업적 + tier_3~6 경지 도달 업적 추가
 * 업적 달성 시 artPoints 지급 없음 (achievementCount만 증가)
 */

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  check: (ctx: AchievementContext) => boolean;
  // 미해금 조건: 이전 업적이 달성되어야 표시
  prerequisite?: string;
  // 연쇄 업적 그룹 ID — 같은 chainId끼리 한 슬롯으로 표시
  chainId?: string;
  // 비밀 업적 — 잠긴 상태에서 조건 숨김 (???)
  secret?: boolean;
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
  hiddenRevealedInField: Record<string, string | null>;
  fieldUnlocks: Record<string, boolean>;
  totalKills: number; // 전체 몬스터 처치 누계
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── 기본 진행 업적 ──
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
    secret: true,
  },

  // ── 야산 처치 업적 ──
  {
    id: 'hunter_10', name: '사냥꾼', description: '야산 10마리',
    check: ctx => getYasanKills(ctx) >= 10,
    prerequisite: 'yasan_entry',
    chainId: 'hunter_chain',
  },
  {
    id: 'hunter_50', name: '숙련 사냥꾼', description: '야산 50마리',
    check: ctx => getYasanKills(ctx) >= 50,
    prerequisite: 'hunter_10',
    chainId: 'hunter_chain',
  },
  {
    id: 'hunter_200', name: '달인 사냥꾼', description: '야산 200마리',
    check: ctx => getYasanKills(ctx) >= 200,
    prerequisite: 'hunter_50',
    chainId: 'hunter_chain',
  },

  // ── 보스 업적 ──
  {
    id: 'boss_first', name: '보스 도전', description: '보스 첫 처치',
    check: ctx => (ctx.bossKillCounts['tiger_boss'] ?? 0) >= 1,
    prerequisite: 'yasan_entry',
    chainId: 'boss_chain',
  },
  {
    id: 'boss_5', name: '보스 사냥꾼', description: '보스 5회',
    check: ctx => (ctx.bossKillCounts['tiger_boss'] ?? 0) >= 5,
    prerequisite: 'boss_first',
    chainId: 'boss_chain',
  },

  // ── 탐험 업적 ──
  {
    id: 'hidden_encounter', name: '산해경 조우', description: '히든 첫 조우',
    check: ctx => Object.values(ctx.hiddenRevealedInField).some(v => v != null),
    prerequisite: 'yasan_entry',
    secret: true,
  },

  // ── 무공 업적 ──
  {
    id: 'art_collector', name: '무공 수집가', description: '무공 4종',
    check: ctx => ctx.ownedArts.length >= 4,
    prerequisite: 'yasan_entry',
  },
  {
    id: 'grade_2', name: '무공 숙련', description: '아무 무공 심득 100 이상',
    check: ctx => Object.values(ctx.artSimdeuks).some(s => s >= 100),
    prerequisite: 'first_step',
    chainId: 'grade_chain',
  },
  {
    id: 'grade_3', name: '무공 성장', description: '아무 무공 심득 300 이상',
    check: ctx => Object.values(ctx.artSimdeuks).some(s => s >= 300),
    prerequisite: 'grade_2',
    chainId: 'grade_chain',
  },

  // ── 경맥 업적 ──
  {
    id: 'stats_10', name: '경맥 입문', description: '경맥합 10',
    check: ctx => ctx.totalStats >= 10,
    chainId: 'stats_chain',
  },
  {
    id: 'stats_30', name: '경맥 성장', description: '경맥합 30',
    check: ctx => ctx.totalStats >= 30,
    prerequisite: 'stats_10',
    chainId: 'stats_chain',
  },

  // ── 경지 도달 업적 ──
  {
    id: 'tier_1', name: '삼류 하 진입', description: '삼류 하에 이르다',
    check: ctx => ctx.tier >= 1,
    prerequisite: 'stats_30',
    chainId: 'tier_chain',
  },
  {
    id: 'tier_2', name: '삼류 중하 진입', description: '삼류 중하에 이르다',
    check: ctx => ctx.tier >= 2,
    prerequisite: 'tier_1',
    chainId: 'tier_chain',
  },
  {
    id: 'tier_3', name: '삼류 중 진입', description: '삼류 중에 이르다',
    check: ctx => ctx.tier >= 3,
    prerequisite: 'tier_2',
    chainId: 'tier_chain',
  },
  {
    id: 'tier_4', name: '삼류 중상 진입', description: '삼류 중상에 이르다',
    check: ctx => ctx.tier >= 4,
    prerequisite: 'tier_3',
    chainId: 'tier_chain',
  },
  {
    id: 'tier_5', name: '삼류 상 진입', description: '삼류 상에 이르다',
    check: ctx => ctx.tier >= 5,
    prerequisite: 'tier_4',
    chainId: 'tier_chain',
  },
  {
    id: 'tier_6', name: '삼류 최상 진입', description: '삼류 최상에 이르다',
    check: ctx => ctx.tier >= 6,
    prerequisite: 'tier_5',
    chainId: 'tier_chain',
  },

  // ── 심득 업적 ──
  {
    id: 'simdeuk_500', name: '심득 500', description: '누적 500',
    check: ctx => ctx.totalSimdeuk >= 500,
    prerequisite: 'first_step',
    chainId: 'simdeuk_chain',
  },
  {
    id: 'simdeuk_3000', name: '심득 3천', description: '누적 3,000',
    check: ctx => ctx.totalSimdeuk >= 3000,
    prerequisite: 'simdeuk_500',
    chainId: 'simdeuk_chain',
  },

  // ── 처치 연쇄 업적 (kill_chain) — UI에서 한 슬롯으로 표시 ──
  {
    id: 'kill_chain_50', name: '강호 입문', description: '총 처치 50마리',
    check: ctx => ctx.totalKills >= 50,
    chainId: 'kill_chain',
  },
  {
    id: 'kill_chain_300', name: '강호 무인', description: '총 처치 300마리',
    check: ctx => ctx.totalKills >= 300,
    prerequisite: 'kill_chain_50',
    chainId: 'kill_chain',
  },
  {
    id: 'kill_chain_1000', name: '강호 고수', description: '총 처치 1,000마리',
    check: ctx => ctx.totalKills >= 1000,
    prerequisite: 'kill_chain_300',
    chainId: 'kill_chain',
  },
  {
    id: 'kill_chain_2500', name: '강호 일류', description: '총 처치 2,500마리',
    check: ctx => ctx.totalKills >= 2500,
    prerequisite: 'kill_chain_1000',
    chainId: 'kill_chain',
  },
  {
    id: 'kill_chain_10000', name: '강호의 전설', description: '총 처치 10,000마리',
    check: ctx => ctx.totalKills >= 10000,
    prerequisite: 'kill_chain_2500',
    chainId: 'kill_chain',
  },
];

function getYasanKills(ctx: AchievementContext): number {
  const yasanIds = ['squirrel','rabbit','fox','deer','boar','wolf','bear'];
  return yasanIds.reduce((sum, id) => sum + (ctx.killCounts[id] ?? 0), 0);
}

export function getAchievementDef(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find(a => a.id === id);
}
