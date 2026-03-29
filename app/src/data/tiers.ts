/**
 * 경지 (돌파) 데이터 (v4.0)
 * 삼류 최하~이류 최하 8단계, achievementCount 조건 추가
 */

export interface TierDef {
  tier: number;
  name: string;
  maxSimdeuk: number; // 무공별 심득 누적 상한
  requirements?: {
    totalStats?: number;    // 경맥합
    totalSimdeuk?: number;  // 누적 심득 (레거시, 현재 미사용)
    bossKills?: number;     // 보스 처치 횟수
    achievementCount?: number; // 달성 업적 수
  };
  rewards?: {
    artPoints?: number;
  };
}

export const TIERS: TierDef[] = [
  { tier: 0, name: '삼류 최하', maxSimdeuk: 200 },
  {
    tier: 1, name: '삼류 하', maxSimdeuk: 400,
    requirements: { totalStats: 50 },
    rewards: { artPoints: 1 },
  },
  {
    tier: 2, name: '삼류 중하', maxSimdeuk: 800,
    requirements: { totalStats: 150 },
    rewards: { artPoints: 1 },
  },
  {
    tier: 3, name: '삼류 중', maxSimdeuk: 1500,
    requirements: { totalStats: 300, achievementCount: 12 },
    rewards: { artPoints: 1 },
  },
  {
    tier: 4, name: '삼류 중상', maxSimdeuk: 2500,
    requirements: { totalStats: 500, achievementCount: 16 },
    rewards: { artPoints: 1 },
  },
  {
    tier: 5, name: '삼류 상', maxSimdeuk: 4000,
    requirements: { totalStats: 800, achievementCount: 20 },
    rewards: { artPoints: 1 },
  },
  {
    tier: 6, name: '삼류 최상', maxSimdeuk: 6000,
    requirements: { totalStats: 1200, achievementCount: 26 },
    rewards: { artPoints: 1 },
  },
  {
    tier: 7, name: '이류 최하', maxSimdeuk: 10000,
    requirements: { totalStats: 2000, achievementCount: 27, bossKills: 5 },
    rewards: { artPoints: 3 },
  },
];

export function getTierDef(tier: number): TierDef {
  return TIERS[tier] ?? TIERS[0];
}

export function getMaxSimdeuk(tier: number): number {
  return getTierDef(tier).maxSimdeuk;
}
