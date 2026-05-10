/**
 * 맹세(盟誓) 시스템 — 데이터 모델 및 옵션 카탈로그
 *
 * 플레이어가 스스로 부과하는 약화 효과. 가중치 합에 비례해 숙련도/드랍률 부스트.
 * 스펙: docs/맹세_시스템/맹세_시스템_스펙.md
 * 카탈로그: docs/맹세_시스템/맹세_옵션_카탈로그.md (수치가 단일 진실 원천)
 */

// ─────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────

export type OathCategory = 'maxQi' | 'maxHp' | 'output' | 'incoming' | 'future';

export interface OathEffect {
  // 자원
  maxQiPenaltyPct?: number;       // 0..1, 최대 내력 곱연산 감소 (effectiveMax = base × (1 - pct))
  maxHpPenaltyPct?: number;       // 0..0.99, 최대 체력 곱연산 감소 (effectiveMax = base × (1 - pct), 즉사 방지로 0.99 cap)

  // 데미지
  outDamagePenaltyPct?: number;   // 0..1, 출력 데미지 곱연산 감소. 0 미만 클램프(최소 1)
  inDamageBonusPct?: number;      // 0..1 이상, 받는 피해 곱연산 증가

  // 미래 확장 (v2+)
  monsterSkillVariantTrigger?: string;
}

export interface OathDef {
  id: string;
  name: string;
  nameHanja: string;      // 한자 표기 (UI 표시용)
  flavor: string;         // 무협체 이탤릭 한 줄
  description: string;    // 메커니즘 설명 한 줄
  category: OathCategory;
  weight: number;
  effect: OathEffect;
  exclusiveGroup?: string; // 같은 그룹 내 1개만 활성 (단계형 라디오)
}

// ─────────────────────────────────────────────
// 16개 옵션 카탈로그
// ─────────────────────────────────────────────

export const OATHS: Record<string, OathDef> = {

  // ── 1. 최대 내력 (exclusiveGroup: oath_maxqi) ──────────────────────

  oath_qi_1: {
    id: 'oath_qi_1',
    name: '절식의 맹세',
    nameHanja: '折息之盟',
    flavor: '호흡을 절반으로 거두니, 가벼운 발걸음만이 남는다.',
    description: '최대 내력 -33%',
    category: 'maxQi',
    weight: 1,
    effect: { maxQiPenaltyPct: 0.33 },
    exclusiveGroup: 'oath_maxqi',
  },

  oath_qi_2: {
    id: 'oath_qi_2',
    name: '단식의 맹세',
    nameHanja: '斷息之盟',
    flavor: '숨을 잘라 묶으니, 손은 쉬이 떨리되 마음은 평정하다.',
    description: '최대 내력 -66%',
    category: 'maxQi',
    weight: 2,
    effect: { maxQiPenaltyPct: 0.66 },
    exclusiveGroup: 'oath_maxqi',
  },

  oath_qi_3: {
    id: 'oath_qi_3',
    name: '절기의 맹세',
    nameHanja: '絶氣之盟',
    flavor: '기를 끊는 자리에서야 비로소 진경(眞境)이 보인다.',
    description: '최대 내력 -95%',
    category: 'maxQi',
    weight: 3,
    effect: { maxQiPenaltyPct: 0.95 },
    exclusiveGroup: 'oath_maxqi',
  },

  oath_qi_4: {
    id: 'oath_qi_4',
    name: '공허의 맹세',
    nameHanja: '空虛之盟',
    flavor: '기(氣)를 모두 비워내니 한 점의 운기(運氣)도 남지 않는다.',
    description: '최대 내력 -100%',
    category: 'maxQi',
    weight: 6,
    effect: { maxQiPenaltyPct: 1.0 },
    exclusiveGroup: 'oath_maxqi',
  },

  // ── 2. 최대 체력 (exclusiveGroup: oath_maxhp) ──────────────────────

  oath_hp_1: {
    id: 'oath_hp_1',
    name: '박체의 맹세',
    nameHanja: '薄體之盟',
    flavor: '몸을 야위게 거두니, 한 합(合)이 무겁게 닿는다.',
    description: '최대 체력 -30%',
    category: 'maxHp',
    weight: 2,
    effect: { maxHpPenaltyPct: 0.30 },
    exclusiveGroup: 'oath_maxhp',
  },

  oath_hp_2: {
    id: 'oath_hp_2',
    name: '약체의 맹세',
    nameHanja: '弱體之盟',
    flavor: '살이 마르고 뼈가 드러나니, 검 한 자루도 천근(千斤)이라.',
    description: '최대 체력 -60%',
    category: 'maxHp',
    weight: 3,
    effect: { maxHpPenaltyPct: 0.60 },
    exclusiveGroup: 'oath_maxhp',
  },

  oath_hp_3: {
    id: 'oath_hp_3',
    name: '누신의 맹세',
    nameHanja: '陋身之盟',
    flavor: '몸이 누(陋)하니 한 점의 살(殺)도 깊이 새겨진다.',
    description: '최대 체력 -90%',
    category: 'maxHp',
    weight: 5,
    effect: { maxHpPenaltyPct: 0.90 },
    exclusiveGroup: 'oath_maxhp',
  },

  oath_hp_4: {
    id: 'oath_hp_4',
    name: '잔명의 맹세',
    nameHanja: '殘命之盟',
    flavor: '한 줄기 명(命)만 남겨두니, 적의 한 수에도 흩어지기 직전이다.',
    description: '최대 체력 -98%',
    category: 'maxHp',
    weight: 9,
    effect: { maxHpPenaltyPct: 0.98 },
    exclusiveGroup: 'oath_maxhp',
  },

  // ── 3. 출력 데미지 (exclusiveGroup: oath_output) ───────────────────

  oath_out_1: {
    id: 'oath_out_1',
    name: '자제의 맹세',
    nameHanja: '自制之盟',
    flavor: '손을 거두는 법을 익히니, 한 푼의 살의(殺意)도 헛되지 않다.',
    description: '최종 데미지 -20%',
    category: 'output',
    weight: 1,
    effect: { outDamagePenaltyPct: 0.20 },
    exclusiveGroup: 'oath_output',
  },

  oath_out_2: {
    id: 'oath_out_2',
    name: '봉수의 맹세',
    nameHanja: '封手之盟',
    flavor: '손을 묶고도 적을 베는 자만이 진정한 무인(武人)이다.',
    description: '최종 데미지 -40%',
    category: 'output',
    weight: 2,
    effect: { outDamagePenaltyPct: 0.40 },
    exclusiveGroup: 'oath_output',
  },

  oath_out_3: {
    id: 'oath_out_3',
    name: '절살의 맹세',
    nameHanja: '絶殺之盟',
    flavor: '살의를 끊어두니, 검은 무겁고 발걸음은 가볍다.',
    description: '최종 데미지 -60%',
    category: 'output',
    weight: 3,
    effect: { outDamagePenaltyPct: 0.60 },
    exclusiveGroup: 'oath_output',
  },

  oath_out_4: {
    id: 'oath_out_4',
    name: '무력의 맹세',
    nameHanja: '無力之盟',
    flavor: '손에서 살(殺)이 빠져나가, 검은 무겁고 거의 닿지 않는다.',
    description: '최종 데미지 -80%',
    category: 'output',
    weight: 5,
    effect: { outDamagePenaltyPct: 0.80 },
    exclusiveGroup: 'oath_output',
  },

  oath_out_5: {
    id: 'oath_out_5',
    name: '공검의 맹세',
    nameHanja: '空劍之盟',
    flavor: '검이 비어있으니, 한 줌의 검의(劍意)만으로 적을 베어야 한다.',
    description: '최종 데미지 -95%',
    category: 'output',
    weight: 8,
    effect: { outDamagePenaltyPct: 0.95 },
    exclusiveGroup: 'oath_output',
  },

  // ── 4. 받는 피해 (exclusiveGroup: oath_incoming) ──────────────────

  oath_in_1: {
    id: 'oath_in_1',
    name: '노골의 맹세',
    nameHanja: '露骨之盟',
    flavor: '살을 드러내고 적을 맞으니, 일타(一打) 한 번이 깊이 새겨진다.',
    description: '받는 피해 +30%',
    category: 'incoming',
    weight: 1,
    effect: { inDamageBonusPct: 0.30 },
    exclusiveGroup: 'oath_incoming',
  },

  oath_in_2: {
    id: 'oath_in_2',
    name: '무방의 맹세',
    nameHanja: '無防之盟',
    flavor: '방비를 비우는 자리에 비로소 진정한 검의(劍意)가 든다.',
    description: '받는 피해 +80%',
    category: 'incoming',
    weight: 2,
    effect: { inDamageBonusPct: 0.80 },
    exclusiveGroup: 'oath_incoming',
  },

  oath_in_3: {
    id: 'oath_in_3',
    name: '임사의 맹세',
    nameHanja: '臨死之盟',
    flavor: '죽음의 문턱에 한 발을 두니, 검의 끝이 비로소 차다.',
    description: '받는 피해 +150%',
    category: 'incoming',
    weight: 3,
    effect: { inDamageBonusPct: 1.50 },
    exclusiveGroup: 'oath_incoming',
  },

  oath_in_4: {
    id: 'oath_in_4',
    name: '멸신의 맹세',
    nameHanja: '滅身之盟',
    flavor: '살을 다 내어주고 한 점만 남기니, 적의 한 수에도 명(命)이 흩어진다.',
    description: '받는 피해 +500%',
    category: 'incoming',
    weight: 7,
    effect: { inDamageBonusPct: 5.00 },
    exclusiveGroup: 'oath_incoming',
  },
};

// ─────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────

export function getOathDef(id: string): OathDef | undefined {
  return OATHS[id];
}

export function getOathsByCategory(cat: OathCategory): OathDef[] {
  return Object.values(OATHS).filter(o => o.category === cat);
}

export function getExclusiveGroupMembers(group: string): OathDef[] {
  return Object.values(OATHS).filter(o => o.exclusiveGroup === group);
}

// ─────────────────────────────────────────────
// 보상 계산 함수 (스펙 5-3-1 의사코드 그대로)
// ─────────────────────────────────────────────

/** 가중치 합 → 숙련도/드랍률 배율 (piecewise + cap +1000%) */
export function calcOathBoost(weightSum: number): { profMult: number; dropMult: number } {
  let boost = 0;
  let remaining = weightSum;
  const tier1 = Math.min(remaining, 4);  boost += tier1 * 0.10; remaining -= tier1;
  const tier2 = Math.min(remaining, 5);  boost += tier2 * 0.20; remaining -= tier2;
  const tier3 = Math.min(remaining, 8);  boost += tier3 * 0.30; remaining -= tier3;
  /* tier4 */                             boost += remaining * 0.50;
  const capped = Math.min(boost, 10.0);  // 캡 +1000% (11배)
  return { profMult: 1 + capped, dropMult: 1 + capped };
}

/** 가중치 합 → 평면 보너스 (등급+N, 티어2 추가 드랍) */
export function calcOathFlatBonuses(weightSum: number): {
  monsterRankBonus: number;
  extraDropTableUnlocked: boolean;
} {
  if (weightSum >= 18) return { monsterRankBonus: 2, extraDropTableUnlocked: true };
  if (weightSum >= 10) return { monsterRankBonus: 1, extraDropTableUnlocked: true };
  if (weightSum >= 5)  return { monsterRankBonus: 0, extraDropTableUnlocked: true };
  return { monsterRankBonus: 0, extraDropTableUnlocked: false };
}

/** 가중치 합 → 티어 번호 (1~4) */
export function calcOathTier(weightSum: number): 1 | 2 | 3 | 4 {
  if (weightSum >= 18) return 4;
  if (weightSum >= 10) return 3;
  if (weightSum >= 5)  return 2;
  return 1;
}

/** 티어 번호 → 도전 등급 레이블 */
export const OATH_TIER_LABELS: Record<number, string> = {
  1: '적당한 도전',
  2: '힘겨운 도전',
  3: '무모한 도전',
  4: '불가능한 도전',
};

// ─────────────────────────────────────────────
// 티어 2 추가 드랍 레지스트리
// ─────────────────────────────────────────────
// extraDropTableUnlocked (weightSum >= 5) 조건 충족 시에만 롤.
// 적용 배율: extraMult = max(1, oathDropMult - 1.4) — 무모한 도전(ws≥10)부터 실질 보너스.

export const OATH_TIER2_EXTRA_DROPS: Record<string, { materialId: string; chance: number }[]> = {
  baehwa_hwabosa: [
    { materialId: 'taoreuneun_bulggot_pyeon', chance: 0.002 },
  ],
  baehwa_gyeongbosa: [
    { materialId: 'taoreuneun_bulggot_pyeon', chance: 0.004 },
  ],
};
