// 배화교 호위 전용 스킬 핸들러
import type { TickContext } from '../../tickContext';
import type { BossPatternDef, BossSkillDef } from '../../../../data/monsters';
import { getMonsterDef } from '../../../../data/monsters';
import { applyEmberStack } from '../../emberUtils';
import { SKILL_HANDLERS, type SkillHandlerResult } from '../registry';

const HOWI_ID = 'baehwa_howi';

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
  SKILL_HANDLERS['sacred_oath'] = handleSacredOath;
  // 후속 커밋에서 oath awakening, sraosha, hwachang 등록
}
