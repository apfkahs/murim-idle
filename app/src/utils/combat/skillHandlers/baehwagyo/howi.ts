// 배화교 호위 전용 스킬 핸들러
import type { TickContext } from '../../tickContext';
import type { BossPatternDef, BossSkillDef } from '../../../../data/monsters';
import { BOSS_PATTERNS, getMonsterDef } from '../../../../data/monsters';
import { applyEmberStack } from '../../emberUtils';
import { PRE_SKILL_LOOP_HOOKS, SKILL_HANDLERS, type SkillHandlerResult } from '../registry';

const HOWI_ID = 'baehwa_howi';

// 성화 맹세 각성 턴 처리: 광화 전이 시 return false (같은 tick에 공격 재개), 각성 지속 시 return true (공격 스킵)
function advanceSacredOathAwakening(ctx: TickContext, _pattern: BossPatternDef | null): boolean {
  if (ctx.currentEnemy?.id !== HOWI_ID) return false;
  if (ctx.bossPatternState?.howiSacredOathState?.phase !== 'awakening' || !ctx.currentEnemy) return false;

  const oath = ctx.bossPatternState.howiSacredOathState;
  const nextTurns = oath.awakeningTurnsLeft - 1;
  const oathSkill = BOSS_PATTERNS['baehwa_howi']?.skills.find(s => s.type === 'sacred_oath');
  if (nextTurns <= 0) {
    // 광화 전환: 같은 tick에 공격 재개(스펙 §4-2 "1 공격 타이밍" 준수) → skillUsed 세팅 X
    ctx.bossPatternState.howiSacredOathState = {
      ...oath,
      phase: 'frenzy',
      awakeningTurnsLeft: 0,
      breathTurnCounter: 0,
      frenzyEnterLogged: true,
    };
    ctx.bossPatternState.bossChargeStunImmune = true;
    const msg = oathSkill?.sacredOathFrenzyEnterLogs?.[0] ?? '';
    if (msg) ctx.logFlavor(msg, 'right', { actor: 'enemy' });
    return false; // Sraosha sync + 공격 phase(frenzy)가 같은 tick에 실행
  }
  ctx.bossPatternState.howiSacredOathState = { ...oath, awakeningTurnsLeft: nextTurns };
  return true; // 각성 지속 tick은 공격 스킵
}

// 성화 맹세 (발동): 각성 페이즈 진입 + 초기 회복/불씨
function handleSacredOath(ctx: TickContext, skill: BossSkillDef, _pattern: BossPatternDef): SkillHandlerResult {
  if (ctx.currentEnemy?.id !== HOWI_ID) return { consumed: false };
  if (!ctx.bossPatternState || !ctx.currentEnemy) return { consumed: false };

  const monDef = getMonsterDef(ctx.currentEnemy.id);
  const eName = monDef?.name ?? ctx.currentEnemy.id;

  const heal = Math.floor(ctx.currentEnemy.maxHp * (skill.sacredOathHealPercent ?? 0.15));
  ctx.currentEnemy = { ...ctx.currentEnemy, hp: Math.min(ctx.currentEnemy.hp + heal, ctx.currentEnemy.maxHp) };
  const initE = skill.sacredOathInitialEmber ?? 1;
  ctx.bossPatternState.playerDotStacks = applyEmberStack(ctx.bossPatternState.playerDotStacks, initE);
  ctx.bossPatternState.howiSacredOathState = {
    phase: 'awakening',
    awakeningTurnsLeft: skill.sacredOathAwakeningTurns ?? 1,
    breathTurnCounter: 0,
    frenzyEnterLogged: false,
  };
  if (skill.oneTime) ctx.bossPatternState.usedOneTimeSkills = [...(ctx.bossPatternState.usedOneTimeSkills ?? []), skill.id];
  ctx.logFlavor(skill.sacredOathOnTriggerLogs?.[0] ?? '', 'right', { actor: 'enemy' });
  ctx.logEvent({ side: 'incoming', actor: 'enemy', name: eName, tag: 'heal', value: heal, valueTier: 'heal' });
  ctx.logEvent({ side: 'incoming', actor: 'enemy', chips: [{ kind: 'fire', label: '불씨', count: initE }] });
  return { consumed: true };
}

export function registerBaehwaHowi(): void {
  PRE_SKILL_LOOP_HOOKS.push(advanceSacredOathAwakening);
  SKILL_HANDLERS['sacred_oath'] = handleSacredOath;
  // 후속 커밋에서 sraosha, hwachang 등록
}
