import type { TickContext } from '../tickContext';
import type { BossSkillDef, BossPatternDef } from '../../../data/monsters';
import { registerBaehwaHaengja } from './baehwagyo/haengja';
import { registerBaehwaHowi } from './baehwagyo/howi';

export interface SkillHandlerResult { consumed: boolean; }

export type SkillHandler = (
  ctx: TickContext, skill: BossSkillDef, pattern: BossPatternDef
) => SkillHandlerResult;

// return true → skillUsed=true + skills 루프 break
export type PreSkillLoopHook = (ctx: TickContext, pattern: BossPatternDef | null) => boolean;

// return true → 일반 공격 후속 체인 전체 스킵
export type InAttackResolveHook = (ctx: TickContext, pattern: BossPatternDef | null) => boolean;

export const SKILL_HANDLERS: Record<string, SkillHandler> = {};
export const PRE_SKILL_LOOP_HOOKS: PreSkillLoopHook[] = [];
export const IN_ATTACK_RESOLVE_HOOKS: InAttackResolveHook[] = [];

/**
 * HMR 안전: 매 호출 시 배열/맵 초기화 후 재등록.
 * Vite dev의 모듈 재평가로 initialized 플래그가 리셋되어도 중복 push 방지.
 */
export function initSkillRegistry(): void {
  PRE_SKILL_LOOP_HOOKS.length = 0;
  IN_ATTACK_RESOLVE_HOOKS.length = 0;
  for (const k of Object.keys(SKILL_HANDLERS)) delete SKILL_HANDLERS[k];
  registerBaehwaHaengja();
  registerBaehwaHowi();
  // 신규 몬스터 추가 시 이 목록에 한 줄 추가
}
