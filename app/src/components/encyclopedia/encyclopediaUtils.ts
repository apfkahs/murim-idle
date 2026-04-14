import {
  TRAINING_MONSTERS, YASAN_MONSTERS, HIDDEN_MONSTERS, YASAN_BOSS,
  INN_MONSTERS, INN_HIDDEN_MONSTERS, INN_BOSS,
  HEUGPUNGCHAE_MONSTERS,
  RONIN_DEF, BANDIT_LEADER_DEF, NOKRIM_PATROL_CHIEF,
} from '../../data/monsters';

export const ALL_MONSTERS = [
  ...TRAINING_MONSTERS, ...YASAN_MONSTERS, ...HIDDEN_MONSTERS, YASAN_BOSS,
  ...INN_MONSTERS, ...INN_HIDDEN_MONSTERS, INN_BOSS,
  ...HEUGPUNGCHAE_MONSTERS, RONIN_DEF, BANDIT_LEADER_DEF, NOKRIM_PATROL_CHIEF,
];

const THRESHOLDS_NORMAL = [1, 10, 50, 100, 300, 1000];
const THRESHOLDS_BOSS   = [1,  5, 25,  50, 100,  300];
const THRESHOLDS_HIDDEN = [1,  3,  8,  15,  25,   50];

function getThresholds(mon?: { isBoss?: boolean; isHidden?: boolean }): number[] {
  if (mon?.isHidden) return THRESHOLDS_HIDDEN;
  if (mon?.isBoss)   return THRESHOLDS_BOSS;
  return THRESHOLDS_NORMAL;
}

/** 처치 수에 따른 도감 해금 단계 */
export function getDocRevealLevel(killCount: number, mon?: { isBoss?: boolean; isHidden?: boolean }): number {
  const t = getThresholds(mon);
  for (let i = t.length - 1; i >= 0; i--) {
    if (killCount >= t[i]) return i + 1;
  }
  return 0;
}

/** 다음 해금까지 필요한 처치 수 */
export function getNextThreshold(killCount: number, mon?: { isBoss?: boolean; isHidden?: boolean }): number | null {
  const t = getThresholds(mon);
  for (const threshold of t) {
    if (killCount < threshold) return threshold;
  }
  return null;
}
