/**
 * 밸런스 파라미터 — 모든 공식의 상수를 한 곳에서 관리
 * 설계서 v3 4장 기준
 */
export const BALANCE_PARAMS = {
  // ── ATK ──
  ATK_BASE: 5,
  ATK_G_W: 100,    ATK_G_H: 200,
  ATK_M_W: 70,     ATK_M_H: 200,
  ATK_T_W: 35,     ATK_T_H: 200,

  // ── CRIT DMG ──
  CRITD_BASE: 150,
  CRITD_M_W: 100,  CRITD_M_H: 200,

  // ── CRIT RATE ──
  BASE_CRIT_RATE: 0.10,
  CRIT_RATE_CAP: 0.75,

  // ── DODGE ──
  DODGE_CAP: 1.00,

  // ── HP ──
  HP_BASE: 500,
  HP_T_W: 350,     HP_T_H: 150,
  HP_G_W: 100,     HP_G_H: 100,

  // ── STAMINA ──
  STAM_BASE: 50,
  STAM_M_W: 140,   STAM_M_H: 150,

  // ── STAMINA REGEN ──
  REGEN_BASE: 3,
  REGEN_T_W: 12,   REGEN_T_H: 180,

  // ── COMBAT ──
  BASE_ATTACK_INTERVAL: 2.5,
  ATK_SPEED_MIN: 1.0,
  BARE_HAND_MULTIPLIER: 0.5,

  // ── NORMAL ATTACK GROWTH ──
  NORMAL_GROWTH_RATE: 0.02,

  // ── QI PRODUCTION ──
  BASE_QI_PER_SEC: 1,
  QI_GROWTH_RATE: 0.075,

  // ── COMBAT QI ──
  COMBAT_QI_BASE: 0.05,
  COMBAT_QI_GROWTH_RATE: 0.006,
  COMBAT_QI_CAP: 0.25,

  // ── KILL BONUS ──
  KILL_BONUS_RATIO: 0.20,

  // ── TAESAN (참조용) ──
  TAESAN_SIM_W: 1.5,
  TAESAN_SIM_H: 120,

  // ── STAT COST ──
  COST_BASE: 10,
  COST_RATE: 1.15,
} as const;
