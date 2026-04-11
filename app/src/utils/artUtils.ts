/**
 * 무공/숙련도 관련 순수 유틸 함수 모음
 * gameStore.ts에서 분리된 상태 독립 함수들
 */
import { getArtDef, type ArtDef } from '../data/arts';

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

/** 커스텀 최대 별 수와 첫 별 경험치로 등급 테이블 빌드 */
export function buildCustomGradeTable(maxStars: number, startExp: number): ProfStarEntry[] {
  const table: ProfStarEntry[] = [];
  let rawExp = startExp;
  let eff = ART_GRADE_BALANCE.START_EFFICIENCY;
  let dmg = ART_GRADE_BALANCE.BASE_DAMAGE;
  let totalExp = 0;
  for (let i = 1; i <= maxStars; i++) {
    if (i === 1) {
      totalExp += rawExp;
      table.push({ reqExp: rawExp, cumExp: totalExp, profDamage: 0 });
    } else {
      rawExp *= (i - 1) % maxStars === 0
        ? ART_GRADE_BALANCE.LEVEL_UP_MULTIPLIER
        : ART_GRADE_BALANCE.STAR_MULTIPLIER;
      eff *= ART_GRADE_BALANCE.EFFICIENCY_DECAY;
      const disp = Math.round(rawExp / 100) * 100;
      dmg += disp * eff;
      totalExp += disp;
      table.push({ reqExp: disp, cumExp: totalExp, profDamage: Math.floor(dmg) - ART_GRADE_BALANCE.BASE_DAMAGE });
    }
  }
  return table;
}

/**
 * PROF_TABLE 기반 무공 등급 테이블 빌더.
 * 성 쌍(1~2성, 3~4성, …): PROF_TABLE[baseGrade-1+pairIndex].reqExp × 0.2 (100단위 반올림)
 * maxStars는 반드시 짝수(6, 12 등).
 */
export function buildProfBasedGradeTable(baseGrade: number, maxStars: number): ProfStarEntry[] {
  const table: ProfStarEntry[] = [];
  let cumExp = 0;
  const pairs = maxStars / 2;
  for (let p = 0; p < pairs; p++) {
    const pairReq = Math.round(PROF_TABLE[baseGrade - 1 + p].reqExp * 0.2 / 100) * 100;
    for (let s = 0; s < 2; s++) {
      cumExp += pairReq;
      table.push({ reqExp: pairReq, cumExp, profDamage: 0 });
    }
  }
  return table;
}

/** 무공 정의의 gradeMaxStars 설정 여부에 따라 적절한 테이블 반환 */
export function getGradeTableForArt(artDef: ArtDef): ProfStarEntry[] {
  if (artDef.growth.gradeMaxStars) {
    return buildProfBasedGradeTable(
      artDef.baseGrade ?? 1,
      artDef.growth.gradeMaxStars,
    );
  }
  return ART_GRADE_TABLE;
}

/** 커스텀 테이블을 직접 받는 등급 정보 반환 */
export function getArtGradeInfoFromTable(cumExp: number, table: ProfStarEntry[]): ArtGradeInfo {
  if (cumExp < table[0].cumExp) {
    return { stageIndex: 0, star: 1, starIndex: 1, progress: cumExp / table[0].reqExp };
  }
  let si = 0;
  for (let i = 0; i < table.length; i++) {
    if (cumExp >= table[i].cumExp) si = i;
    else break;
  }
  const stageIndex = si;
  const star = si + 1;
  const isMax = si >= table.length - 1;
  const progress = isMax ? 1 : (cumExp - table[si].cumExp) / table[si + 1].reqExp;
  return { stageIndex, star, starIndex: si + 1, progress };
}

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

/** 무공의 현재 등급 = artGradeExp 기반 stageIndex + 1
 *  gradeMaxStars 무공: 커스텀 테이블 기준 1~maxStars
 *  일반 무공: ART_GRADE_TABLE 기준 1~5
 */
export function getArtCurrentGrade(
  artId: string,
  artGradeExp: Record<string, number>,
): number {
  const artDef = getArtDef(artId);
  const cumExp = artGradeExp[artId] ?? 0;
  if (artDef?.growth.gradeMaxStars) {
    const table = getGradeTableForArt(artDef);
    return getArtGradeInfoFromTable(cumExp, table).stageIndex + 1;
  }
  return getArtGradeInfo(cumExp).stageIndex + 1;
}

/** 무공의 등급·초식 배율 계산
 *  gradeDamageMultipliers가 없으면 1.0 반환
 *  stageIndex 초과 시 마지막 값으로 클램프
 *  gradeMaxStars 무공은 커스텀 테이블 기준 stageIndex 사용
 */
export function getArtDamageMultiplier(
  artDef: ArtDef,
  cumExp: number,
  activeIds: string[],
): number {
  const mults = artDef.gradeDamageMultipliers;
  if (!mults || mults.length === 0) return 1.0;

  let stageIndex: number;
  if (artDef.growth.gradeMaxStars) {
    const table = getGradeTableForArt(artDef);
    stageIndex = getArtGradeInfoFromTable(cumExp, table).stageIndex;
  } else {
    stageIndex = getArtGradeInfo(cumExp).stageIndex;
  }

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
// 절초 배율 (심득 ultMultiplierBonus 포함)
// ============================================================

/** 심득 ultMultiplierBonus를 포함한 실효 절초 배율 반환 */
export function getEffectiveUltMultiplier(
  artDef: { ultMultiplier?: number; masteries: { id: string; effects?: { ultChange?: { ultMultiplierBonus?: number } } }[] },
  activeIds: string[],
): number {
  let mult = artDef.ultMultiplier ?? 0;
  for (const m of artDef.masteries) {
    if (activeIds.includes(m.id) && m.effects?.ultChange?.ultMultiplierBonus != null) {
      mult += m.effects.ultChange.ultMultiplierBonus;
    }
  }
  return mult;
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
