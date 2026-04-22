import type { TickContext } from '../tickContext';
import type { BossSkillDef, BossPatternDef } from '../../../data/monsters';
import { registerBaehwaHaengja, type HaengjaState } from './baehwagyo/haengja';
import { registerBaehwaHowi, type HowiState } from './baehwagyo/howi';
import { registerBaehwaGeombosa, type GeombosaState } from './baehwagyo/geombosa';
import { registerBaehwaHwabosa, type HwabosaState } from './baehwagyo/hwabosa';
import { registerBaehwaGyeongbosa, type GyeongbosaState } from './baehwagyo/gyeongbosa';

export type MonsterState =
  | HaengjaState
  | HowiState
  | GeombosaState
  | HwabosaState
  | GyeongbosaState;

export interface SkillHandlerResult { consumed: boolean; }

export type SkillHandler = (
  ctx: TickContext, skill: BossSkillDef, pattern: BossPatternDef
) => SkillHandlerResult;

// 매 게임 틱마다 호출 (공격 이벤트와 무관) — 타이머·상태 갱신용
export type PerTickHook = (ctx: TickContext, pattern: BossPatternDef | null) => void;

// return true → skillUsed=true + skills 루프 break
export type PreSkillLoopHook = (ctx: TickContext, pattern: BossPatternDef | null) => boolean;

// return true → 일반 공격 후속 체인 전체 스킵 (legacy alternate chain + 기본 공격 모두 스킵)
// extras: Phase 0에서 계산된 공격 배율·외공 감소치 (hook이 같은 값을 재사용하도록 전달 — RNG 재소비 방지)
export interface InAttackResolveExtras {
  monAttackMult: number;
  effectiveExternalDmgRed: number;
}
export type InAttackResolveHook = (
  ctx: TickContext,
  pattern: BossPatternDef | null,
  extras: InAttackResolveExtras,
) => boolean;

export const SKILL_HANDLERS: Record<string, SkillHandler> = {};
export const PER_TICK_HOOKS: PerTickHook[] = [];
export const PRE_SKILL_LOOP_HOOKS: PreSkillLoopHook[] = [];
export const IN_ATTACK_RESOLVE_HOOKS: InAttackResolveHook[] = [];
export const MONSTER_STATE_FACTORIES: Partial<Record<string, () => MonsterState>> = {};

/**
 * HMR 안전: 매 호출 시 배열/맵 초기화 후 재등록.
 * Vite dev의 모듈 재평가로 initialized 플래그가 리셋되어도 중복 push 방지.
 */
export function initSkillRegistry(): void {
  PER_TICK_HOOKS.length = 0;
  PRE_SKILL_LOOP_HOOKS.length = 0;
  IN_ATTACK_RESOLVE_HOOKS.length = 0;
  for (const k of Object.keys(SKILL_HANDLERS)) delete SKILL_HANDLERS[k];
  for (const k of Object.keys(MONSTER_STATE_FACTORIES)) delete MONSTER_STATE_FACTORIES[k];
  registerBaehwaHaengja();
  registerBaehwaHowi();
  registerBaehwaGeombosa();
  registerBaehwaHwabosa();
  registerBaehwaGyeongbosa();
  // 신규 몬스터 추가 시 이 목록에 한 줄 추가
}
