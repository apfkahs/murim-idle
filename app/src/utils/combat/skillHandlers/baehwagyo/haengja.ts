// 배화교 행자 전용 스킬 핸들러
import type { TickContext } from '../../tickContext';
import type { BossPatternDef, BossSkillDef } from '../../../../data/monsters';
import { getMonsterDef } from '../../../../data/monsters';
import { calcExternalDmgReduction } from '../../../combatCalc';
import { calcEnemyDamage } from '../../damageCalc';
import { applyEmberStack, getEmberStacks } from '../../emberUtils';
import {
  PRE_SKILL_LOOP_HOOKS, SKILL_HANDLERS, MONSTER_STATE_FACTORIES,
  type SkillHandlerResult,
} from '../registry';

const HAENGJA_ID = 'baehwa_haengja';

export interface HaengjaState {
  readonly kind: typeof HAENGJA_ID;
  atarSacrificeState: {
    skillId: string;
    turnsLeft: number;
    perTurnHealPercent: number;
    reflectStacks: number;
    endDamageMultiplier: number;
  } | null;
  killFailureSkipRewards: boolean;     // 이번 처치는 드랍·숙련도 미지급
}

export function createHaengjaInitialState(): HaengjaState {
  return {
    kind: HAENGJA_ID,
    atarSacrificeState: null,
    killFailureSkipRewards: false,
  };
}

// 아타르로의 귀의 활성 중 매 공격 tick 처리 (자가회복 + 턴 카운트 + 자폭)
function advanceAtarSacrificeTick(ctx: TickContext, pattern: BossPatternDef | null): boolean {
  if (ctx.currentEnemy?.id !== HAENGJA_ID) return false;
  if (!ctx.bossPatternState || !ctx.currentEnemy) return false;
  const st = ctx.bossPatternState.monsterState;
  if (st?.kind !== HAENGJA_ID) return false;
  if (!st.atarSacrificeState) return false;

  const atar = st.atarSacrificeState;
  const sacSkill = pattern?.skills.find(s => s.type === 'baehwa_atar_sacrifice');
  const monDef = getMonsterDef(ctx.currentEnemy.id);
  const eName = monDef?.name ?? ctx.currentEnemy.id;

  // 매 턴 자가 회복
  const healAmt = Math.floor(ctx.currentEnemy.maxHp * atar.perTurnHealPercent);
  ctx.currentEnemy = { ...ctx.currentEnemy, hp: Math.min(ctx.currentEnemy.hp + healAmt, ctx.currentEnemy.maxHp) };
  const healLogBase = sacSkill?.sacrificeHealLogs?.[0] ?? '*행자의 상처가 흰 재로 덮이며 아물어간다.*';
  ctx.logEvent({
    side: 'incoming', actor: 'enemy', name: eName,
    tag: 'heal', value: healAmt, valueTier: 'heal',
  });
  ctx.logFlavor(healLogBase, 'right', { actor: 'enemy', minor: true });

  const nextTurns = atar.turnsLeft - 1;
  if (nextTurns <= 0) {
    // 자폭 처리
    const preEmberN = sacSkill?.sacrificeEndPreEmber ?? 3;
    ctx.bossPatternState.playerDotStacks = applyEmberStack(ctx.bossPatternState.playerDotStacks, preEmberN);
    const curStacks = getEmberStacks(ctx.bossPatternState.playerDotStacks);
    const dmgMult = sacSkill?.sacrificeDamageMultiplier ?? 1.5;

    const bypassActive = ctx.currentEnemy?.bypassExternalGradeActive ?? false;
    const externalDmgRed = calcExternalDmgReduction(ctx.state);
    const effectiveExternalDmgRed = bypassActive ? 0 : externalDmgRed;

    const selfDmgBase = calcEnemyDamage(
      ctx.currentEnemy.attackPower,
      curStacks * dmgMult,
      ctx.dmgReduction,
      undefined,
      ctx.equipStats.bonusFixedDmgReduction ?? 0,
      effectiveExternalDmgRed,
    );
    const selfDmg = Math.floor(selfDmgBase * (1 + (ctx.equipStats.bonusDmgTakenPercent ?? 0)));
    ctx.hp -= selfDmg;
    // 플레이어 사망 시 처치 실패 플래그
    if (ctx.hp <= 0 && sacSkill?.sacrificeKillFailureOnDeath) {
      st.killFailureSkipRewards = true;
    }
    // 행자 자멸
    ctx.currentEnemy = { ...ctx.currentEnemy, hp: 0 };
    st.atarSacrificeState = null;
    const destructMsg = sacSkill?.sacrificeSelfDestructLogs?.[0] ?? '';
    ctx.logFlavor(destructMsg, 'right', { actor: 'enemy' });
    ctx.logEvent({
      side: 'incoming', actor: 'enemy', name: '행자의 폭발',
      tag: 'hit', value: selfDmg, valueTier: 'hit-heavy',
      chips: [{ kind: 'fire', label: '불씨', count: preEmberN }],
    });
    if (!ctx.isSimulating) ctx.enemyAnim = 'attack';
  } else {
    st.atarSacrificeState = { ...atar, turnsLeft: nextTurns };
  }
  return true;
}

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

// 아타르로의 귀의 (발동): 3턴 카운트다운 상태 진입
function handleAtarSacrifice(ctx: TickContext, skill: BossSkillDef, _pattern: BossPatternDef): SkillHandlerResult {
  if (ctx.currentEnemy?.id !== HAENGJA_ID) return { consumed: false };
  if (!ctx.bossPatternState) return { consumed: false };
  const st = ctx.bossPatternState.monsterState;
  if (st?.kind !== HAENGJA_ID) return { consumed: false };

  st.atarSacrificeState = {
    skillId: skill.id,
    turnsLeft: skill.sacrificeDurationTurns ?? 3,
    perTurnHealPercent: skill.sacrificeHealPercentPerTurn ?? 0.08,
    reflectStacks: skill.sacrificeReflectEmberOnHit ?? 1,
    endDamageMultiplier: skill.sacrificeDamageMultiplier ?? 1.5,
  };
  if (skill.oneTime) {
    ctx.bossPatternState.usedOneTimeSkills = [...(ctx.bossPatternState.usedOneTimeSkills ?? []), skill.id];
  }
  const logs = skill.sacrificeOnTriggerLogs ?? [];
  const msg = logs.length > 0 ? logs[0] : '';
  ctx.logFlavor(msg, 'right', { actor: 'enemy' });
  return { consumed: true };
}

export function registerBaehwaHaengja(): void {
  PRE_SKILL_LOOP_HOOKS.push(advanceAtarSacrificeTick);
  SKILL_HANDLERS['baehwa_ember_song'] = handleEmberSong;
  SKILL_HANDLERS['baehwa_atar_sacrifice'] = handleAtarSacrifice;
  MONSTER_STATE_FACTORIES[HAENGJA_ID] = createHaengjaInitialState;
}
