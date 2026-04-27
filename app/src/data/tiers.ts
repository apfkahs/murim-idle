/**
 * 경지 (돌파) 데이터 (v5.0)
 * 8대등급 × 3단계 = 24단계 (tier 0~23)
 * 삼류/이류/일류/절정/초절정/화경/현경/무극 각 초입/숙달/대성
 */

export interface TierDef {
  tier: number;
  name: string;
  requirements?: {
    totalStats?: number;    // 경맥합
    bossKills?: number;     // 보스 처치 횟수 합계 (전 보스 통합)
    totalKills?: number;    // 일반 몬스터 처치 수 합계
    achievementCount?: number; // 달성 업적 수
  };
  rewards?: {
    artPoints?: number;
  };
}

export const TIERS: TierDef[] = [
  // ── 삼류 ──
  { tier: 0, name: '삼류 초입' },
  {
    tier: 1, name: '삼류 숙달',
    requirements: { totalStats: 300 },
    rewards: { artPoints: 1 },
  },
  {
    tier: 2, name: '삼류 대성',
    requirements: { totalStats: 1000, achievementCount: 20 },
    rewards: { artPoints: 1 },
  },
  // ── 이류 ──
  {
    tier: 3, name: '이류 초입',
    requirements: { totalStats: 2000, achievementCount: 42, bossKills: 20 },
    rewards: { artPoints: 4 },
  },
  {
    tier: 4, name: '이류 숙달',
    requirements: { totalStats: 2500 },
    rewards: { artPoints: 2 },
  },
  {
    tier: 5, name: '이류 대성',
    requirements: { totalStats: 3200 },
    rewards: { artPoints: 2 },
  },
  // ── 일류 ──
  {
    tier: 6, name: '일류 초입',
    requirements: { totalStats: 4200 },
    rewards: { artPoints: 4 },
  },
  {
    tier: 7, name: '일류 숙달',
    requirements: { totalStats: 5500 },
    rewards: { artPoints: 2 },
  },
  {
    tier: 8, name: '일류 대성',
    requirements: { totalStats: 6500, bossKills: 2000, totalKills: 60000 },
    rewards: { artPoints: 2 },
  },
  // ── 절정 ──
  {
    tier: 9, name: '절정 초입',
    requirements: { totalStats: 27000, bossKills: 700 },
    rewards: { artPoints: 4 },
  },
  { tier: 10, name: '절정 숙달', rewards: { artPoints: 2 } },
  { tier: 11, name: '절정 대성', rewards: { artPoints: 2 } },
  // ── 초절정 ──
  { tier: 12, name: '초절정 초입', rewards: { artPoints: 4 } },
  { tier: 13, name: '초절정 숙달', rewards: { artPoints: 2 } },
  { tier: 14, name: '초절정 대성', rewards: { artPoints: 2 } },
  // ── 화경 ──
  { tier: 15, name: '화경 초입', rewards: { artPoints: 4 } },
  { tier: 16, name: '화경 숙달', rewards: { artPoints: 2 } },
  { tier: 17, name: '화경 대성', rewards: { artPoints: 2 } },
  // ── 현경 ──
  { tier: 18, name: '현경 초입', rewards: { artPoints: 4 } },
  { tier: 19, name: '현경 숙달', rewards: { artPoints: 2 } },
  { tier: 20, name: '현경 대성', rewards: { artPoints: 2 } },
  // ── 무극 ──
  { tier: 21, name: '무극 초입', rewards: { artPoints: 4 } },
  { tier: 22, name: '무극 숙달', rewards: { artPoints: 2 } },
  { tier: 23, name: '무극 대성', rewards: { artPoints: 2 } },
];

export function getTierDef(tier: number): TierDef {
  return TIERS[tier] ?? TIERS[0];
}

