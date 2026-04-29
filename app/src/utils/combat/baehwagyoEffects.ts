/**
 * baehwagyoEffects — 식화심법 / 성화보법 효과 계산 (Phase 2)
 *
 * 두 무공은 arts.ts 에 최소 ArtDef 엔트리만 두고, 실제 per-level 효과는
 * bahwagyoSlice 의 nodeLevels 를 참조해 본 모듈이 MasteryEffects 로 빚어낸다.
 * combatCalc.gatherMasteryEffects 마지막 단계에서 병합된다.
 */
import type { MasteryEffects } from '../../data/arts';
import type { BahwagyoState } from '../../components/bahwagyo/bahwagyoTypes';

// 노드 id (§2.1 — mind 노드는 기존 ID 유지, 성화보법은 outer-bobeop-open으로 이전)
export const SIKHWA_NODES = {
  open: 'mind-t1-1',        // 심법 개방
  mukneom: 'mind-t1-2',     // 재의 묵념 (HP 회복)
  maengse: 'mind-t1-3',     // 재의 맹세 (ATK 버프)
  ppareum: 'mind-t1-4',     // 재의 빠름 (주기 감소 + 절초 연동)
} as const;

export const SEONGHWA_NODE = 'outer-bobeop-open';  // 성화보법 개방

// 스펙 §1-2: coeff = 0.0970 + (Lv-1) × 0.00303 (1 ≤ Lv ≤ 30), 31+ 는 Lv30 값 유지
export function getSikhwaQiCoeff(openLv: number): number {
  const lv = Math.max(1, Math.min(openLv, 30));
  return 0.0970 + (lv - 1) * 0.00303;
}

// 스펙 §1-3-4: 재의 빠름 Lv → 소각 주기(초)
export function baehwaEmberIntervalSec(fastLv: number): number {
  if (fastLv <= 0) return 25;
  if (fastLv === 1) return 20;
  if (fastLv <= 9)  return 20 - (fastLv - 1) * (5 / 8);
  if (fastLv === 10) return 15;
  if (fastLv <= 19) return 15 - (fastLv - 10) * (5 / 9);
  if (fastLv === 20) return 10;
  if (fastLv <= 29) return 10 - (fastLv - 20) * (5 / 9);
  return 5;  // 30+
}

/**
 * 식화심법 장착 시 효과. 심법 개방 노드 Lv 에 따라 qiRatio/소각 주기/묵념·맹세 수치를 생성.
 * 심법 개방 0Lv 이면 효과 미발동 — 빈 객체 반환.
 */
export function sikhwaEffects(nodeLevels: Record<string, number>): MasteryEffects {
  const openLv = nodeLevels[SIKHWA_NODES.open] ?? 0;
  if (openLv < 1) return {};

  const mukneomLv = nodeLevels[SIKHWA_NODES.mukneom] ?? 0;
  const maengseLv = nodeLevels[SIKHWA_NODES.maengse] ?? 0;
  const ppareumLv = nodeLevels[SIKHWA_NODES.ppareum] ?? 0;

  const qiRatioOverride = openLv >= 30 ? 0.50 : openLv >= 10 ? 0.35 : 0.25;

  const eff: MasteryEffects = {
    qiRatioOverride,
    enableBaehwagyoEmberTick: true,
    emberBurnIntervalSec: baehwaEmberIntervalSec(ppareumLv),
    emberUltDeleteChance: ppareumLv >= 30 ? 1.0 : ppareumLv >= 10 ? 0.25 : 0,
    emberUltDeleteDoubleChance: ppareumLv >= 20 ? 0.25 : 0,
  };

  if (mukneomLv >= 1) {
    eff.emberBurnHpRecoveryPerStack = getMukneomHpRecoveryPerStack(mukneomLv);
    eff.emberBurnHpRecoveryStackCap = 20;
  }

  if (maengseLv >= 1) {
    eff.emberBurnAtkBuffPerStack = getMaengseAtkPerStack(maengseLv);
    eff.emberBurnAtkBuffStackMax = getMaengseStackMax(maengseLv);
    eff.emberBurnAtkBuffDurationSec = getMaengseDuration(maengseLv);
  }

  return eff;
}

// ── 재의 묵념 (mind-t1-2) ──
// 소각된 1스택당 HP 회복 비율 (lv1=0.5%, lv10=1.0%, lv20=2.5%, lv30=4.0%).
export function getMukneomHpRecoveryPerStack(lv: number): number {
  if (lv <= 0) return 0;
  if (lv === 1) return 0.005;
  if (lv <= 9) return 0.005 + (lv - 1) * 0.0005;
  if (lv === 10) return 0.010;
  if (lv <= 19) return 0.010 + (lv - 10) * 0.001;
  if (lv === 20) return 0.025;
  if (lv <= 29) return 0.025 + (lv - 20) * (0.01 / 9);
  return 0.040;
}

export interface MukneomTrait {
  threshold: number;     // 누적 소각 임계값 (10/8/6)
  duration: number;      // 버프 지속(초) (10/10/15)
  reduction: number;     // 피해감소율 (0.10/0.15/0.20)
}

// lv10/20/30 카운터형 피해감소 특성. 미달 시 null.
export function getMukneomTrait(lv: number): MukneomTrait | null {
  if (lv >= 30) return { threshold: 6, duration: 15, reduction: 0.20 };
  if (lv >= 20) return { threshold: 8, duration: 10, reduction: 0.15 };
  if (lv >= 10) return { threshold: 10, duration: 10, reduction: 0.10 };
  return null;
}

// ── 재의 맹세 (mind-t1-3) ──
export function getMaengseAtkPerStack(lv: number): number {
  if (lv <= 0) return 0;
  if (lv === 1) return 0.020;
  if (lv <= 9) return 0.020 + (lv - 1) * 0.001;
  if (lv === 10) return 0.035;
  if (lv <= 19) return 0.035 + (lv - 10) * 0.001;
  if (lv === 20) return 0.050;
  if (lv <= 29) return 0.050 + (lv - 20) * 0.001;
  return 0.070;
}

export function getMaengseStackMax(lv: number): number {
  if (lv <= 9) return 3;
  if (lv <= 19) return 4;
  return 5;
}

export function getMaengseDuration(lv: number): number {
  if (lv <= 9) return 20;
  if (lv <= 19) return 25;
  return 30;
}

/**
 * 성화보법 장착 시 효과. 개방 노드 Lv → 회피/카운터/공속 하한.
 * 스펙 §2-3 공식.
 */
export function seonghwaEffects(nodeLevels: Record<string, number>): MasteryEffects {
  const lv = nodeLevels[SEONGHWA_NODE] ?? 0;
  if (lv < 1) return {};

  let dodge = 0.10 + (lv - 1) * 0.005;
  let floorAS = 1.5;

  // 카운터 확률: 구간별 선형 (10Lv: 40%, 20Lv: 52.5%, 30Lv: 65%)
  let counter: number;
  if (lv >= 30)      counter = 0.65;
  else if (lv >= 20) counter = 0.525 + (lv - 20) * 0.0125;
  else if (lv >= 10) counter = 0.40  + (lv - 10) * 0.0125;
  else               counter = 0.20  + (lv - 1)  * (0.20 / 9);

  if (lv >= 10) floorAS = 1.4;
  if (lv >= 20) floorAS = 1.3;
  if (lv >= 30) {
    floorAS = 1.2;
    dodge += 0.005;  // 30Lv 묶음 보정 (24.5→25.0)
  }

  // bonusDodge 는 기존 집계에서 % 단위 (ex 5 = +5%p). 본 스펙은 0.10=10% → × 100 환산.
  const result: MasteryEffects = {
    bonusDodge: dodge * 100,
    dodgeCounterChance: counter,
    dodgeCounterMultiplier: 1.4,
    minAtkSpeedOverride: floorAS,
    bonusAtkSpeed: 1.0,
    dodgeCounterEnabled: true,
  };

  // 10Lv 특성: 회피 시 HP 4% 회복
  if (lv >= 10) result.dodgeHealPercent = 4;

  // 20Lv 특성: 회피 시 공격력 +15% (3타, 최대 2스택)
  if (lv >= 20) {
    result.dodgeAtkBuffPercent = 15;
    result.dodgeAtkBuffDuration = 3;
    result.dodgeAtkBuffMaxStacks = 2;
  }

  return result;
}

/**
 * 식화심법 + 성화보법 효과를 MIN/MAX/OVERRIDE 규칙에 맞춰 누적 result 에 병합.
 * - minAtkSpeedOverride: MIN
 * - dodgeCounterChance / dodgeCounterMultiplier: MAX
 * - qiRatioOverride / ember* 숫자 필드: OVERRIDE (단일 식화심법만 해당)
 * - enableBaehwagyoEmberTick: OR
 * - bonusDodge / bonusAtkSpeed / dodgeCounterEnabled: 덧셈/OR (기존 패턴 유지)
 */
export function mergeBaehwagyoEffects(result: MasteryEffects, eff: MasteryEffects): void {
  if (eff.bonusDodge) result.bonusDodge = (result.bonusDodge ?? 0) + eff.bonusDodge;
  if (eff.bonusAtkSpeed) result.bonusAtkSpeed = (result.bonusAtkSpeed ?? 0) + eff.bonusAtkSpeed;

  if (eff.dodgeCounterEnabled) result.dodgeCounterEnabled = true;
  if (eff.dodgeCounterMultiplier !== undefined) {
    result.dodgeCounterMultiplier = Math.max(result.dodgeCounterMultiplier ?? 1.2, eff.dodgeCounterMultiplier);
  }
  if (eff.dodgeCounterChance !== undefined) {
    result.dodgeCounterChance = result.dodgeCounterChance === undefined
      ? eff.dodgeCounterChance
      : Math.max(result.dodgeCounterChance, eff.dodgeCounterChance);
  }
  if (eff.minAtkSpeedOverride !== undefined) {
    result.minAtkSpeedOverride = result.minAtkSpeedOverride === undefined
      ? eff.minAtkSpeedOverride
      : Math.min(result.minAtkSpeedOverride, eff.minAtkSpeedOverride);
  }
  if (eff.dodgeHealPercent !== undefined) {
    result.dodgeHealPercent = Math.max(result.dodgeHealPercent ?? 0, eff.dodgeHealPercent);
  }
  if (eff.dodgeAtkBuffPercent !== undefined) {
    result.dodgeAtkBuffPercent = Math.max(result.dodgeAtkBuffPercent ?? 0, eff.dodgeAtkBuffPercent);
    result.dodgeAtkBuffDuration = Math.max(result.dodgeAtkBuffDuration ?? 0, eff.dodgeAtkBuffDuration ?? 0);
    result.dodgeAtkBuffMaxStacks = Math.max(result.dodgeAtkBuffMaxStacks ?? 0, eff.dodgeAtkBuffMaxStacks ?? 0);
  }

  if (eff.enableBaehwagyoEmberTick) result.enableBaehwagyoEmberTick = true;
  if (eff.qiRatioOverride !== undefined) result.qiRatioOverride = eff.qiRatioOverride;
  if (eff.emberBurnIntervalSec !== undefined) result.emberBurnIntervalSec = eff.emberBurnIntervalSec;
  if (eff.emberUltDeleteChance !== undefined) result.emberUltDeleteChance = eff.emberUltDeleteChance;
  if (eff.emberUltDeleteDoubleChance !== undefined) result.emberUltDeleteDoubleChance = eff.emberUltDeleteDoubleChance;
  if (eff.emberBurnHpRecoveryPerStack !== undefined) {
    result.emberBurnHpRecoveryPerStack = eff.emberBurnHpRecoveryPerStack;
    result.emberBurnHpRecoveryStackCap = eff.emberBurnHpRecoveryStackCap;
  }
  if (eff.emberBurnAtkBuffPerStack !== undefined) {
    result.emberBurnAtkBuffPerStack = eff.emberBurnAtkBuffPerStack;
    result.emberBurnAtkBuffStackMax = eff.emberBurnAtkBuffStackMax;
    result.emberBurnAtkBuffDurationSec = eff.emberBurnAtkBuffDurationSec;
  }
}

/** 식화심법이 심법 슬롯에 장착되어 있는지 */
export function isSikhwaEquipped(equippedSimbeop: string | null): boolean {
  return equippedSimbeop === 'baehwa_sikhwa_simbeop';
}

// ── 성화검법 (sword 가지) ──
export const SEONGHWA_GEOMBEOP_ART_ID = 'baehwa_seonghwa_geombeop';

export const SWORD_NODES = {
  main: 'sword-main',
  ult: 'sword-ult',
  qiManifest: 'sword-qi-manifest',
} as const;

/** 성화검법 메인 등급 배율 (초식·절초 공용 grade mult) */
export function getSwordGradeMult(lv: number): number {
  if (lv <= 0) return 1.0;
  if (lv === 1) return 1.5;
  if (lv <= 9) return 1.5 + (lv - 1) * 0.05;
  if (lv === 10) return 2.1;
  if (lv <= 19) return 2.1 + (lv - 10) * (0.4 / 9);
  return 2.8;
}

/** 검법 절초 ult 배율 (sword-ult lv 기준, lv0 기본 3.0) */
export function getSwordUltMult(lv: number): number {
  if (lv <= 0) return 3.0;
  if (lv <= 9) return 3.0 + lv * (1 / 9);
  if (lv === 10) return 4.5;
  if (lv <= 19) return 4.5 + (lv - 10) * (1 / 9);
  return 6.0;
}

/** 검기 발현 X 배율 (sword-qi-manifest lv 기준) */
export function getSwordQiManifestX(lv: number): number {
  if (lv <= 0) return 0;
  if (lv === 1) return 3.0;
  if (lv <= 9) return 3.0 + (lv - 1) * (3 / 8);
  if (lv === 10) return 7.5;
  if (lv <= 19) return 7.5 + (lv - 10) * (1 / 3);
  return 12.0;
}

/** 검기 발현 슬라이더 상한 (Y) */
export function getSwordQiMaxDrainRate(lv: number): number {
  if (lv <= 0) return 0;
  if (lv <= 9) return 0.05;
  if (lv <= 14) return 0.075;
  if (lv <= 19) return 0.10;
  return 0.125;
}

/** 검법 절초 쿨타임 — sword-ult lv5/15 특성에 따라 단축 */
export function getSwordUltCooldown(ultLv: number): number {
  if (ultLv >= 15) return 25;
  if (ultLv >= 5) return 35;
  return 42;
}

/** 검법(성화검법)이 무공 슬롯에 장착되어 있는지 */
export function isSeonghwaGeombeopEquipped(equippedArts: readonly string[]): boolean {
  return equippedArts.includes(SEONGHWA_GEOMBEOP_ART_ID);
}

/** 성화보법이 주공/보공 슬롯에 장착되어 있는지 */
export function isSeonghwaEquipped(equippedArts: readonly string[]): boolean {
  return equippedArts.includes('baehwa_seonghwa_bobeop');
}

/**
 * 주어진 state 로부터 식화/성화 효과를 계산해 result 에 병합한다.
 * gatherMasteryEffects 마지막 단계에서 호출.
 */
export function applyBaehwagyoArtEffects(
  result: MasteryEffects,
  state: {
    equippedSimbeop: string | null;
    equippedArts: string[];
    bahwagyo?: BahwagyoState;
  },
): void {
  const bhw = state.bahwagyo;
  if (!bhw) return;
  if (isSikhwaEquipped(state.equippedSimbeop)) {
    mergeBaehwagyoEffects(result, sikhwaEffects(bhw.nodeLevels));
  }
  if (isSeonghwaEquipped(state.equippedArts)) {
    mergeBaehwagyoEffects(result, seonghwaEffects(bhw.nodeLevels));
  }
}
