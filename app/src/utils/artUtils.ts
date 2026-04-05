/**
 * 무공/숙련도 관련 순수 유틸 함수 모음
 * gameStore.ts에서 분리된 상태 독립 함수들
 */

// ============================================================
// 숙련도 5단계/12성 (60성) 시스템
// ============================================================

export const PROF_STAGES = ['입문', '숙련', '달인', '화경', '무극'] as const;

const MA_BALANCE = {
  BASE_DAMAGE: 10,
  START_EXP: 5000,
  START_EFFICIENCY: 0.002,
  LEVEL_UP_MULTIPLIER: 2.0,
  STAR_MULTIPLIER: 1.15,
  EFFICIENCY_DECAY: 0.98,
  STARS_PER_STAGE: 12,
  TOTAL_STARS: 60,
} as const;

interface ProfStarEntry { reqExp: number; cumExp: number; profDamage: number; }

function buildProfTable(): ProfStarEntry[] {
  const table: ProfStarEntry[] = [];
  let rawExp = MA_BALANCE.START_EXP;
  let eff = MA_BALANCE.START_EFFICIENCY;
  let dmg = MA_BALANCE.BASE_DAMAGE;
  let totalExp = 0;
  for (let i = 1; i <= MA_BALANCE.TOTAL_STARS; i++) {
    if (i === 1) {
      totalExp += rawExp;
      table.push({ reqExp: rawExp, cumExp: totalExp, profDamage: 0 });
    } else {
      rawExp *= (i - 1) % MA_BALANCE.STARS_PER_STAGE === 0
        ? MA_BALANCE.LEVEL_UP_MULTIPLIER
        : MA_BALANCE.STAR_MULTIPLIER;
      eff *= MA_BALANCE.EFFICIENCY_DECAY;
      const disp = i <= MA_BALANCE.STARS_PER_STAGE
        ? Math.round(rawExp / 100) * 100
        : Math.round(rawExp / 1000) * 1000;
      dmg += disp * eff;
      totalExp += disp;
      table.push({ reqExp: disp, cumExp: totalExp, profDamage: Math.floor(dmg) - MA_BALANCE.BASE_DAMAGE });
    }
  }
  return table;
}

export const PROF_TABLE = buildProfTable();

// ── 무공 등급 시스템 (숙련도와 동일 공식, 필요 exp 1/3) ──
const ART_GRADE_BALANCE = {
  ...MA_BALANCE,
  START_EXP: Math.round(5000 / 3), // ≈ 1667
} as const;

function buildArtGradeTable(): ProfStarEntry[] {
  const table: ProfStarEntry[] = [];
  let rawExp = ART_GRADE_BALANCE.START_EXP;
  let eff = ART_GRADE_BALANCE.START_EFFICIENCY;
  let dmg = ART_GRADE_BALANCE.BASE_DAMAGE;
  let totalExp = 0;
  for (let i = 1; i <= ART_GRADE_BALANCE.TOTAL_STARS; i++) {
    if (i === 1) {
      totalExp += rawExp;
      table.push({ reqExp: rawExp, cumExp: totalExp, profDamage: 0 });
    } else {
      rawExp *= (i - 1) % ART_GRADE_BALANCE.STARS_PER_STAGE === 0
        ? ART_GRADE_BALANCE.LEVEL_UP_MULTIPLIER
        : ART_GRADE_BALANCE.STAR_MULTIPLIER;
      eff *= ART_GRADE_BALANCE.EFFICIENCY_DECAY;
      const disp = i <= ART_GRADE_BALANCE.STARS_PER_STAGE
        ? Math.round(rawExp / 100) * 100
        : Math.round(rawExp / 1000) * 1000;
      dmg += disp * eff;
      totalExp += disp;
      table.push({ reqExp: disp, cumExp: totalExp, profDamage: Math.floor(dmg) - ART_GRADE_BALANCE.BASE_DAMAGE });
    }
  }
  return table;
}

export const ART_GRADE_TABLE = buildArtGradeTable();

export interface ArtGradeInfo {
  stageIndex: number; // 0-4
  star: number;       // 1-12
  starIndex: number;  // 1-60
  progress: number;   // 0-1
}

export function getArtGradeInfo(cumExp: number): ArtGradeInfo {
  if (cumExp < ART_GRADE_TABLE[0].cumExp) {
    return { stageIndex: 0, star: 1, starIndex: 1, progress: cumExp / ART_GRADE_TABLE[0].reqExp };
  }
  let si = 0;
  for (let i = 0; i < ART_GRADE_TABLE.length; i++) {
    if (cumExp >= ART_GRADE_TABLE[i].cumExp) si = i;
    else break;
  }
  const stageIndex = Math.floor(si / ART_GRADE_BALANCE.STARS_PER_STAGE);
  const star = (si % ART_GRADE_BALANCE.STARS_PER_STAGE) + 1;
  const isMax = si >= ART_GRADE_TABLE.length - 1;
  const progress = isMax ? 1 : (cumExp - ART_GRADE_TABLE[si].cumExp) / ART_GRADE_TABLE[si + 1].reqExp;
  return { stageIndex, star, starIndex: si + 1, progress };
}

export interface ProfStarInfo {
  stageIndex: number; // 0-4
  star: number;       // 1-12
  starIndex: number;  // 1-60
  progress: number;   // 0-1 (다음 성 향한 진행도)
  isFinal?: boolean;  // true이면 終 상태 (더 이상 증가 없음)
}

export function getProfStarInfo(cumExp: number): ProfStarInfo {
  if (cumExp < PROF_TABLE[0].cumExp) {
    return { stageIndex: 0, star: 1, starIndex: 1, progress: cumExp / PROF_TABLE[0].reqExp };
  }
  let si = 0;
  for (let i = 0; i < PROF_TABLE.length; i++) {
    if (cumExp >= PROF_TABLE[i].cumExp) si = i;
    else break;
  }
  if (si >= PROF_TABLE.length - 1) {
    return { stageIndex: 4, star: 12, starIndex: 60, progress: 1, isFinal: true };
  }
  // si+1 오프셋: si=0 → 입문 2성, ..., si=58 → 무극 12성 (입문 1성은 early exit이 담당)
  const shiftedSi = si + 1;
  const stageIndex = Math.floor(shiftedSi / MA_BALANCE.STARS_PER_STAGE);
  const star = (shiftedSi % MA_BALANCE.STARS_PER_STAGE) + 1;
  const progress = (cumExp - PROF_TABLE[si].cumExp) / PROF_TABLE[si + 1].reqExp;
  return { stageIndex, star, starIndex: shiftedSi, progress };
}

export function getProfDamageValue(cumExp: number): number {
  const { starIndex } = getProfStarInfo(cumExp);
  return PROF_TABLE[starIndex - 1].profDamage;
}

/** 숙련도 단계(1-5) 반환. 5단계 구조 기준 */
export function getProficiencyGrade(cumExp: number): number {
  return getProfStarInfo(cumExp).stageIndex + 1;
}

// ============================================================
// 무공 등급 유틸
// ============================================================

/** 무공의 현재 등급 = artGradeExp 기반 stageIndex + 1 (1-5) */
export function getArtCurrentGrade(
  artId: string,
  artGradeExp: Record<string, number>,
): number {
  return getArtGradeInfo(artGradeExp[artId] ?? 0).stageIndex + 1;
}

/** 무공의 등급·초식 배율 계산
 *  gradeDamageMultipliers가 없으면 1.0 반환
 *  stageIndex 초과 시 마지막 값으로 클램프
 */
export function getArtDamageMultiplier(
  artDef: { gradeDamageMultipliers?: number[]; masteryGradeMultiplierBonus?: Record<string, number> },
  cumExp: number,
  activeIds: string[],
): number {
  const mults = artDef.gradeDamageMultipliers;
  if (!mults || mults.length === 0) return 1.0;
  const stageIndex = getArtGradeInfo(cumExp).stageIndex;
  let base = mults[Math.min(stageIndex, mults.length - 1)];
  const bonus = artDef.masteryGradeMultiplierBonus ?? {};
  for (const id of activeIds) {
    if (bonus[id] != null) base += bonus[id];
  }
  return base;
}

/** 장착된 모든 무공(보법/심법 포함) 중 최대 등급 반환 */
export function getMaxEquippedArtGrade(
  equippedArts: string[],
  equippedSimbeop: string | null,
  artGradeExp: Record<string, number>,
): number {
  const allArts = equippedSimbeop ? [...equippedArts, equippedSimbeop] : [...equippedArts];
  if (allArts.length === 0) return 0;
  return Math.max(...allArts.map(id => getArtCurrentGrade(id, artGradeExp)));
}

// ============================================================
// 몬스터 정보 공개 레벨
// ============================================================
export function getMonsterRevealLevel(killCount: number): number {
  if (killCount >= 20) return 5;
  if (killCount >= 10) return 4;
  if (killCount >= 5) return 3;
  if (killCount >= 3) return 2;
  if (killCount >= 1) return 1;
  return 0;
}
