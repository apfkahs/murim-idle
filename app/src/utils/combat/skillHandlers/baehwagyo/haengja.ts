// 배화교 행자 전용 스킬 핸들러
import type { TickContext } from '../../tickContext';
import type { BossPatternDef, BossSkillDef } from '../../../../data/monsters';
import { getMonsterDef } from '../../../../data/monsters';
import { applyEmberStack } from '../../emberUtils';
import { SKILL_HANDLERS, type SkillHandlerResult } from '../registry';

const HAENGJA_ID = 'baehwa_haengja';

// 성화 송가 (발동): 70% 폴스루(일반 공격) · 30% 자가회복 + 불씨 부여 확률
function handleEmberSong(ctx: TickContext, skill: BossSkillDef, _pattern: BossPatternDef): SkillHandlerResult {
  if (ctx.currentEnemy?.id !== HAENGJA_ID) return { consumed: false };
  if (!ctx.bossPatternState || !ctx.currentEnemy) return { consumed: false };
  if (Math.random() >= (skill.chance ?? 0.3)) return { consumed: false }; // 70% → 일반 공격으로 폴스루

  const monDef = getMonsterDef(ctx.currentEnemy.id);
  const eName = monDef?.name ?? ctx.currentEnemy.id;

  // 송가 발동 (30%): 자가 회복 + 불씨 부여 확률
  const healPct = (skill.selfHealPercent ?? 8) / 100;
  const healAmt = Math.floor(ctx.currentEnemy.maxHp * healPct);
  ctx.currentEnemy = { ...ctx.currentEnemy, hp: Math.min(ctx.currentEnemy.hp + healAmt, ctx.currentEnemy.maxHp) };
  const applyE = Math.random() < (skill.emberApplyChance ?? 0.8);
  if (applyE) {
    ctx.bossPatternState.playerDotStacks = applyEmberStack(ctx.bossPatternState.playerDotStacks, 1);
    const logs = skill.emberSongSuccessLogs ?? [];
    const msg = logs.length > 0 ? logs[Math.floor(Math.random() * logs.length)] : '';
    ctx.logEvent({
      side: 'incoming', actor: 'enemy', name: eName,
      tag: 'heal', value: healAmt, valueTier: 'heal',
    });
    ctx.logFlavor(msg, 'right', { actor: 'enemy' });
    ctx.logEvent({
      side: 'incoming', actor: 'enemy',
      chips: [{ kind: 'fire', label: '불씨', count: 1 }],
    });
  } else {
    const logs = skill.emberSongFailLogs ?? [];
    const msg = logs.length > 0 ? logs[Math.floor(Math.random() * logs.length)] : '';
    ctx.logEvent({
      side: 'incoming', actor: 'enemy', name: eName,
      tag: 'heal', value: healAmt, valueTier: 'heal',
    });
    ctx.logFlavor(msg, 'right', { actor: 'enemy' });
  }
  return { consumed: true };
}

export function registerBaehwaHaengja(): void {
  SKILL_HANDLERS['baehwa_ember_song'] = handleEmberSong;
}
