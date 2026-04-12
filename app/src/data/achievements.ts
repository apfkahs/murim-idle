/**
 * 업적 데이터 (v3.2) — 58개
 * 카테고리 분류, 기존 임계값 상향, 신규 업적 추가
 * v3.1: 심득 수련 카테고리 → 숙련도 업적으로 교체 후 무공 수련 합산
 */
import { getProficiencyGrade, getMonsterRevealLevel } from '../utils/artUtils';

export type AchievementCategory =
  | 'explore'  // 탐험 기록 (기본 진행 + 탐험 + 도감)
  | 'arts'     // 수련 (무공 + 경맥 + 경지)
  | 'kills';   // 처치 기록 (처치 + 전장 + 보스)

export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  explore: '탐험 기록',
  arts:    '수련',
  kills:   '처치 기록',
};

// 도감 완성 기준 몬스터 목록 (수련장·히든 제외)
export const CODEX_MONSTERS = [
  'squirrel','rabbit','fox','deer','boar','wolf','bear',
  'drunk_thug','peddler','troublemaker','wanderer','bounty_hunter','bandit_chief',
  'tiger_boss','innkeeper_true','hwahyulsa','eunrang','ronin',
] as const;

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
  category: AchievementCategory;
}

export interface AchievementContext {
  killCounts: Record<string, number>;
  bossKillCounts: Record<string, number>;
  ownedArts: string[];
  totalStats: number;
  proficiency: Record<string, number>; // 숙련도 누적 경험치
  tier: number;
  achievements: string[];
  hiddenRevealedInField: Record<string, string | null>;
  fieldUnlocks: Record<string, boolean>;
  totalKills: number; // 전체 몬스터 처치 누계
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── 기본 진행 ──
  {
    id: 'training_complete', name: '수련 완료',
    description: '수련장의 나무인형과 철인형을 처치하다',
    check: ctx => (ctx.killCounts['training_wood'] ?? 0) >= 1 && (ctx.killCounts['training_iron'] ?? 0) >= 1,
    category: 'explore',
  },
  {
    id: 'yasan_entry', name: '야산 입문', description: '야산 첫 승리',
    check: ctx => {
      const yasanIds = ['squirrel','rabbit','fox','deer','boar','wolf','bear'];
      return yasanIds.some(id => (ctx.killCounts[id] ?? 0) >= 1);
    },
    prerequisite: 'training_complete',
    category: 'explore',
  },
  {
    id: 'field_inn', name: '허름한 객잔 발견',
    description: '야산의 곰을 처치하여 새로운 전장을 발견했다',
    check: ctx => ctx.fieldUnlocks['inn'] === true,
    prerequisite: 'yasan_entry',
    secret: true,
    category: 'explore',
  },

  // ── 야산 사냥 ──
  {
    id: 'hunter_50', name: '숙련 사냥꾼', description: '야산 100마리',
    check: ctx => getYasanKills(ctx) >= 100,
    prerequisite: 'yasan_entry',
    chainId: 'hunter_chain',
    category: 'kills',
  },
  {
    id: 'hunter_200', name: '달인 사냥꾼', description: '야산 500마리',
    check: ctx => getYasanKills(ctx) >= 500,
    prerequisite: 'hunter_50',
    chainId: 'hunter_chain',
    category: 'kills',
  },
  {
    id: 'hunter_2000', name: '야수의 왕', description: '야산 2,000마리',
    check: ctx => getYasanKills(ctx) >= 2000,
    prerequisite: 'hunter_200',
    chainId: 'hunter_chain',
    category: 'kills',
  },
  {
    id: 'hunter_10000', name: '산의 지배자', description: '야산 10,000마리',
    check: ctx => getYasanKills(ctx) >= 10000,
    prerequisite: 'hunter_2000',
    chainId: 'hunter_chain',
    category: 'kills',
  },

  // ── 보스 도전 ──
  {
    id: 'boss_first', name: '보스 도전', description: '보스 첫 처치',
    check: ctx => (ctx.bossKillCounts['tiger_boss'] ?? 0) >= 1,
    prerequisite: 'yasan_entry',
    chainId: 'boss_chain',
    category: 'kills',
  },
  {
    id: 'boss_5', name: '보스 사냥꾼', description: '보스 10회',
    check: ctx => (ctx.bossKillCounts['tiger_boss'] ?? 0) >= 10,
    prerequisite: 'boss_first',
    chainId: 'boss_chain',
    category: 'kills',
  },
  {
    id: 'boss_50', name: '보스 전문가', description: '보스 50회',
    check: ctx => (ctx.bossKillCounts['tiger_boss'] ?? 0) >= 50,
    prerequisite: 'boss_5',
    chainId: 'boss_chain',
    category: 'kills',
  },
  {
    id: 'boss_100', name: '보스 정복자', description: '보스 100회',
    check: ctx => (ctx.bossKillCounts['tiger_boss'] ?? 0) >= 100,
    prerequisite: 'boss_50',
    chainId: 'boss_chain',
    category: 'kills',
  },
  {
    id: 'boss_200', name: '산군의 천적', description: '보스 200회',
    check: ctx => (ctx.bossKillCounts['tiger_boss'] ?? 0) >= 200,
    prerequisite: 'boss_100',
    chainId: 'boss_chain',
    category: 'kills',
  },

  // ── 탐험 기록 ──
  {
    id: 'hidden_encounter', name: '산해경 조우', description: '기이한 존재와 첫 조우',
    check: ctx => Object.values(ctx.hiddenRevealedInField).some(v => v != null),
    prerequisite: 'yasan_entry',
    secret: true,
    category: 'explore',
  },
  {
    id: 'field_cheonsan', name: '천산의 입구', description: '천산 대맥의 문턱을 넘다',
    check: ctx => ctx.fieldUnlocks['cheonsan_jangmak'] === true,
    prerequisite: 'field_inn',
    secret: true,
    category: 'explore',
  },
  {
    id: 'field_heugpungchae', name: '흑풍채 침입', description: '흑풍채에 발을 들이다',
    check: ctx => ctx.fieldUnlocks['heugpungchae'] === true,
    secret: true,
    category: 'explore',
  },
  {
    id: 'field_gongdong', name: '공동파 입문', description: '공동파의 문하에 들어서다',
    check: ctx => ctx.fieldUnlocks['gongdong'] === true,
    secret: true,
    category: 'explore',
  },
  {
    id: 'hidden_3', name: '기이한 존재들',
    description: '세 곳 이상의 전장에서 기이한 존재를 목격하다',
    check: ctx => Object.values(ctx.hiddenRevealedInField).filter(v => v != null).length >= 3,
    prerequisite: 'hidden_encounter',
    secret: true,
    category: 'explore',
  },

  // ── 몬스터 도감 ──
  {
    id: 'codex_first', name: '도감 입문', description: '몬스터 5종 발견',
    check: ctx => CODEX_MONSTERS.filter(id => (ctx.killCounts[id] ?? 0) >= 1).length >= 5,
    chainId: 'codex_chain',
    category: 'explore',
  },
  {
    id: 'codex_1', name: '도감 첫걸음', description: '몬스터 1종 도감 완성 (1,000회 처치)',
    check: ctx => CODEX_MONSTERS.filter(id => (ctx.killCounts[id] ?? 0) >= 1000).length >= 1,
    prerequisite: 'codex_first',
    chainId: 'codex_chain',
    category: 'explore',
  },
  {
    id: 'codex_3', name: '도감 연구가', description: '몬스터 3종 도감 완성',
    check: ctx => CODEX_MONSTERS.filter(id => (ctx.killCounts[id] ?? 0) >= 1000).length >= 3,
    prerequisite: 'codex_1',
    chainId: 'codex_chain',
    category: 'explore',
  },
  {
    id: 'codex_5', name: '도감 수집가', description: '몬스터 5종 도감 완성',
    check: ctx => CODEX_MONSTERS.filter(id => (ctx.killCounts[id] ?? 0) >= 1000).length >= 5,
    prerequisite: 'codex_3',
    chainId: 'codex_chain',
    category: 'explore',
  },
  {
    id: 'codex_8', name: '도감 탐구가', description: '몬스터 8종 도감 완성',
    check: ctx => CODEX_MONSTERS.filter(id => (ctx.killCounts[id] ?? 0) >= 1000).length >= 8,
    prerequisite: 'codex_5',
    chainId: 'codex_chain',
    category: 'explore',
  },
  {
    id: 'codex_12', name: '도감 전문가', description: '몬스터 12종 도감 완성',
    check: ctx => CODEX_MONSTERS.filter(id => (ctx.killCounts[id] ?? 0) >= 1000).length >= 12,
    prerequisite: 'codex_8',
    chainId: 'codex_chain',
    category: 'explore',
  },
  {
    id: 'codex_17', name: '도감 박사', description: '몬스터 17종 도감 완성',
    check: ctx => CODEX_MONSTERS.filter(id => (ctx.killCounts[id] ?? 0) >= 1000).length >= 17,
    prerequisite: 'codex_12',
    chainId: 'codex_chain',
    category: 'explore',
  },
  {
    id: 'codex_all', name: '강호 도감', description: `전 몬스터 도감 완성 (${CODEX_MONSTERS.length}종)`,
    check: ctx => CODEX_MONSTERS.every(id => (ctx.killCounts[id] ?? 0) >= 1000),
    prerequisite: 'codex_17',
    chainId: 'codex_chain',
    category: 'explore',
  },

  // ── 무공 수련 ──
  {
    id: 'art_collector', name: '무공 수집가', description: '무공 4종 보유',
    check: ctx => ctx.ownedArts.length >= 4,
    prerequisite: 'yasan_entry',
    chainId: 'collector_chain',
    category: 'arts',
  },
  {
    id: 'art_collector_6', name: '무공 전문가', description: '무공 6종 보유',
    check: ctx => ctx.ownedArts.length >= 6,
    prerequisite: 'art_collector',
    chainId: 'collector_chain',
    category: 'arts',
  },
  {
    id: 'art_collector_all', name: '무공 완성자', description: '전 무공 9종 보유',
    check: ctx => ctx.ownedArts.length >= 9,
    prerequisite: 'art_collector_6',
    chainId: 'collector_chain',
    category: 'arts',
  },

  // ── 경맥 단련 ──
  {
    id: 'stats_30', name: '경맥 성장', description: '경맥합 50',
    check: ctx => ctx.totalStats >= 50,
    chainId: 'stats_chain',
    category: 'arts',
  },
  {
    id: 'stats_300', name: '경맥 단련', description: '경맥합 300',
    check: ctx => ctx.totalStats >= 300,
    prerequisite: 'stats_30',
    chainId: 'stats_chain',
    category: 'arts',
  },
  {
    id: 'stats_1000', name: '경맥 통달', description: '경맥합 1,000',
    check: ctx => ctx.totalStats >= 1000,
    prerequisite: 'stats_300',
    chainId: 'stats_chain',
    category: 'arts',
  },
  {
    id: 'stats_3000', name: '경맥 대성', description: '경맥합 3,000',
    check: ctx => ctx.totalStats >= 3000,
    prerequisite: 'stats_1000',
    chainId: 'stats_chain',
    category: 'arts',
  },

  // ── 경지 돌파 ──
  {
    id: 'tier_iru', name: '이류 초입', description: '이류에 이르다',
    check: ctx => ctx.tier >= 3,
    prerequisite: 'stats_30',
    chainId: 'tier_chain',
    category: 'arts',
  },
  {
    id: 'tier_ilru', name: '일류 초입', description: '일류에 이르다',
    check: ctx => ctx.tier >= 6,
    prerequisite: 'tier_iru',
    chainId: 'tier_chain',
    category: 'arts',
  },
  {
    id: 'tier_jeoljung', name: '절정 초입', description: '절정에 이르다',
    check: ctx => ctx.tier >= 9,
    prerequisite: 'tier_ilru',
    chainId: 'tier_chain',
    secret: true,
    category: 'arts',
  },
  {
    id: 'tier_chojeoljung', name: '초절정 초입', description: '초절정에 이르다',
    check: ctx => ctx.tier >= 12,
    prerequisite: 'tier_jeoljung',
    chainId: 'tier_chain',
    secret: true,
    category: 'arts',
  },
  {
    id: 'tier_hwagyeong', name: '화경 초입', description: '화경에 이르다',
    check: ctx => ctx.tier >= 15,
    prerequisite: 'tier_chojeoljung',
    chainId: 'tier_chain',
    secret: true,
    category: 'arts',
  },
  {
    id: 'tier_hyeong', name: '현경 초입', description: '현경에 이르다',
    check: ctx => ctx.tier >= 18,
    prerequisite: 'tier_hwagyeong',
    chainId: 'tier_chain',
    secret: true,
    category: 'arts',
  },
  {
    id: 'tier_mugeuk', name: '무극 초입', description: '무극에 이르다',
    check: ctx => ctx.tier >= 21,
    prerequisite: 'tier_hyeong',
    chainId: 'tier_chain',
    secret: true,
    category: 'arts',
  },

  // ── 무공 숙련도 ──
  {
    id: 'prof_grade_2', name: '숙련 입문', description: '하나의 무공 숙련도가 숙련에 이르다',
    check: ctx => Object.values(ctx.proficiency).some(v => getProficiencyGrade(v) >= 2),
    prerequisite: 'training_complete',
    chainId: 'prof_chain',
    category: 'arts',
  },
  {
    id: 'prof_grade_3', name: '숙련 달인', description: '하나의 무공 숙련도가 달인에 이르다',
    check: ctx => Object.values(ctx.proficiency).some(v => getProficiencyGrade(v) >= 3),
    prerequisite: 'prof_grade_2',
    chainId: 'prof_chain',
    category: 'arts',
  },
  {
    id: 'prof_grade_4', name: '숙련 화경', description: '하나의 무공 숙련도가 화경에 이르다',
    check: ctx => Object.values(ctx.proficiency).some(v => getProficiencyGrade(v) >= 4),
    prerequisite: 'prof_grade_3',
    chainId: 'prof_chain',
    category: 'arts',
  },
  {
    id: 'prof_grade_5', name: '숙련 무극', description: '하나의 무공 숙련도가 무극에 이르다',
    check: ctx => Object.values(ctx.proficiency).some(v => getProficiencyGrade(v) >= 5),
    prerequisite: 'prof_grade_4',
    chainId: 'prof_chain',
    category: 'arts',
  },
  {
    id: 'prof_dual_3', name: '쌍수 달인', description: '두 가지 무공 숙련도가 달인에 이르다',
    check: ctx => Object.values(ctx.proficiency).filter(v => getProficiencyGrade(v) >= 3).length >= 2,
    prerequisite: 'prof_grade_3',
    chainId: 'prof_multi_chain',
    category: 'arts',
  },
  {
    id: 'prof_all_5', name: '오행 무극', description: '다섯 가지 무공 숙련도가 모두 무극에 이르다',
    check: ctx => Object.values(ctx.proficiency).filter(v => getProficiencyGrade(v) >= 5).length >= 5,
    prerequisite: 'prof_dual_3',
    chainId: 'prof_multi_chain',
    category: 'arts',
  },

  // ── 처치 기록 ──
  {
    id: 'kill_chain_300', name: '강호 무인', description: '총 처치 500마리',
    check: ctx => ctx.totalKills >= 500,
    chainId: 'kill_chain',
    category: 'kills',
  },
  {
    id: 'kill_chain_1000', name: '강호 고수', description: '총 처치 2,000마리',
    check: ctx => ctx.totalKills >= 2000,
    prerequisite: 'kill_chain_300',
    chainId: 'kill_chain',
    category: 'kills',
  },
  {
    id: 'kill_chain_2500', name: '강호 일류', description: '총 처치 5,000마리',
    check: ctx => ctx.totalKills >= 5000,
    prerequisite: 'kill_chain_1000',
    chainId: 'kill_chain',
    category: 'kills',
  },
  {
    id: 'kill_chain_10000', name: '강호의 전설', description: '총 처치 20,000마리',
    check: ctx => ctx.totalKills >= 20000,
    prerequisite: 'kill_chain_2500',
    chainId: 'kill_chain',
    category: 'kills',
  },
  {
    id: 'kill_chain_100000', name: '천하무적', description: '총 처치 100,000마리',
    check: ctx => ctx.totalKills >= 100000,
    prerequisite: 'kill_chain_10000',
    chainId: 'kill_chain',
    category: 'kills',
  },
  {
    id: 'kill_chain_1000000', name: '살신성인', description: '총 처치 1,000,000마리',
    check: ctx => ctx.totalKills >= 1000000,
    prerequisite: 'kill_chain_100000',
    chainId: 'kill_chain',
    category: 'kills',
  },
  {
    id: 'kill_chain_10000000', name: '강호의 화신', description: '총 처치 10,000,000마리',
    check: ctx => ctx.totalKills >= 10000000,
    prerequisite: 'kill_chain_1000000',
    chainId: 'kill_chain',
    category: 'kills',
  },

  // ── 전장 처치 — 객잔 ──
  {
    id: 'inn_hunter_100', name: '객잔 단골', description: '객잔 합산 100마리',
    check: ctx => getInnKills(ctx) >= 100,
    prerequisite: 'field_inn',
    chainId: 'inn_chain',
    category: 'kills',
  },
  {
    id: 'inn_hunter_500', name: '객잔 청소부', description: '객잔 합산 500마리',
    check: ctx => getInnKills(ctx) >= 500,
    prerequisite: 'inn_hunter_100',
    chainId: 'inn_chain',
    category: 'kills',
  },
  {
    id: 'inn_hunter_3000', name: '객잔의 악몽', description: '객잔 합산 3,000마리',
    check: ctx => getInnKills(ctx) >= 3000,
    prerequisite: 'inn_hunter_500',
    chainId: 'inn_chain',
    category: 'kills',
  },

  // ── 전장 처치 — 천산 대맥 ──
  {
    id: 'cheonsan_entry', name: '천산 첫 승리', description: '천산 대맥 첫 처치',
    check: ctx => getCheonsanKills(ctx) >= 1,
    prerequisite: 'field_cheonsan',
    chainId: 'cheonsan_chain',
    category: 'kills',
  },
  {
    id: 'cheonsan_100', name: '천산 탐험가', description: '천산 대맥 100마리',
    check: ctx => getCheonsanKills(ctx) >= 100,
    prerequisite: 'cheonsan_entry',
    chainId: 'cheonsan_chain',
    category: 'kills',
  },
  {
    id: 'cheonsan_1000', name: '천산 정복자', description: '천산 대맥 1,000마리',
    check: ctx => getCheonsanKills(ctx) >= 1000,
    prerequisite: 'cheonsan_100',
    chainId: 'cheonsan_chain',
    category: 'kills',
  },
];

export function getYasanKills(ctx: AchievementContext): number {
  const yasanIds = ['squirrel','rabbit','fox','deer','boar','wolf','bear'];
  return yasanIds.reduce((sum, id) => sum + (ctx.killCounts[id] ?? 0), 0);
}

export function getInnKills(ctx: AchievementContext): number {
  const innIds = ['drunk_thug','peddler','troublemaker','wanderer','bounty_hunter','bandit_chief','masked_swordsman'];
  return innIds.reduce((sum, id) => sum + (ctx.killCounts[id] ?? 0), 0);
}

export function getCheonsanKills(ctx: AchievementContext): number {
  // 천산 대맥 전장 몬스터: hwahyulsa, eunrang (godo/simjang는 미구현)
  const cheonsanIds = ['hwahyulsa','eunrang'];
  return cheonsanIds.reduce((sum, id) => sum + (ctx.killCounts[id] ?? 0), 0);
}

export function getAchievementDef(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find(a => a.id === id);
}
