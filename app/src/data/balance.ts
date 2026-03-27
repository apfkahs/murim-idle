/**
 * 밸런스 파라미터 — 모든 공식의 상수를 한 곳에서 관리
 * 설계서 v3 4장 기준
 */
export const BALANCE_PARAMS = {
  // ── CRIT DMG (고정값) ──
  CRITD_BASE: 150,

  // ── CRIT RATE ──
  BASE_CRIT_RATE: 0.10,
  CRIT_RATE_CAP: 0.75,

  // ── DODGE ──
  DODGE_CAP: 1.00,

  // ── HP ──
  HP_BASE: 200,

  // ── STAMINA ──
  STAM_BASE: 20,

  // ── STAMINA REGEN ──
  REGEN_BASE: 1,

  // ── 선형 스탯 계수 ──
  STAT_K_GI: 0.05,   // 기 1당 내력 회복 +0.05/초
  STAT_K_SIM: 0.5,   // 심 1당 최대 내력 +0.5
  STAT_K_CHE: 2,     // 체 1당 최대 HP +2

  // ── COMBAT ──
  BASE_ATTACK_INTERVAL: 2.5,
  ATK_SPEED_MIN: 1.0,

  // ── QI PRODUCTION ──
  BASE_QI_PER_SEC: 1,
  QI_GROWTH_RATE: 0.075,

  // ── COMBAT QI ──
  COMBAT_QI_BASE: 0.05,
  COMBAT_QI_GROWTH_RATE: 0.006,
  COMBAT_QI_CAP: 0.25,

  // ── KILL BONUS ──
  KILL_BONUS_RATIO: 0.20,
} as const;
