/**
 * 경지 (돌파) 데이터 (v1.0)
 */

export interface TierDef {
  tier: number;
  name: string;
  maxGrade: number; // 성급 상한
  requirements?: {
    totalStats?: number;    // 경맥합
    totalSimdeuk?: number;  // 누적 심득
    bossKills?: number;     // 보스 처치 횟수
  };
  rewards?: {
    artPoints?: number;
  };
}

export const TIERS: TierDef[] = [
  { tier: 0, name: '삼류 초입', maxGrade: 2 },
  {
    tier: 1, name: '삼류 중기', maxGrade: 3,
    requirements: { totalStats: 30 },
    rewards: { artPoints: 1 },
  },
  {
    tier: 2, name: '삼류 후기', maxGrade: 4,
    requirements: { totalStats: 80, totalSimdeuk: 3000 },
    rewards: { artPoints: 1 },
  },
  {
    tier: 3, name: '이류 초입', maxGrade: 5,
    requirements: { totalStats: 180, totalSimdeuk: 15000, bossKills: 5 },
    rewards: { artPoints: 2 },
  },
];

export function getTierDef(tier: number): TierDef {
  return TIERS[tier] ?? TIERS[0];
}

export function getMaxGrade(tier: number): number {
  return getTierDef(tier).maxGrade;
}
