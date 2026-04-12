import {
  TRAINING_MONSTERS, YASAN_MONSTERS, HIDDEN_MONSTERS, YASAN_BOSS,
  INN_MONSTERS, INN_HIDDEN_MONSTERS, INN_BOSS,
  HEUGPUNGCHAE_MONSTERS,
} from '../../data/monsters';

export const ALL_MONSTERS = [
  ...TRAINING_MONSTERS, ...YASAN_MONSTERS, ...HIDDEN_MONSTERS, YASAN_BOSS,
  ...INN_MONSTERS, ...INN_HIDDEN_MONSTERS, INN_BOSS,
  ...HEUGPUNGCHAE_MONSTERS,
];

/** 처치 수에 따른 도감 해금 단계 */
export function getDocRevealLevel(killCount: number): number {
  if (killCount >= 1000) return 6; // 드랍 확률 공개
  if (killCount >= 300)  return 5; // 드랍 아이템명+종류 공개
  if (killCount >= 100)  return 4; // 스탯 공개
  if (killCount >= 50)   return 3; // 등급 공개
  if (killCount >= 10)   return 2; // 설명 공개
  if (killCount >= 1)    return 1; // 이름+이미지 공개
  return 0;
}

/** 다음 해금까지 필요한 처치 수 */
export function getNextThreshold(killCount: number): number | null {
  if (killCount < 1)    return 1;
  if (killCount < 10)   return 10;
  if (killCount < 50)   return 50;
  if (killCount < 100)  return 100;
  if (killCount < 300)  return 300;
  if (killCount < 1000) return 1000;
  return null;
}
