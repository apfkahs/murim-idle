// 배화교 호위 전용 스킬 핸들러
import type { TickContext } from '../../tickContext';
import type { BossPatternDef, BossSkillDef } from '../../../../data/monsters';
import { BOSS_PATTERNS, getMonsterDef } from '../../../../data/monsters';
import { applyEmberStack, getEmberStacks } from '../../emberUtils';
import { PRE_SKILL_LOOP_HOOKS, SKILL_HANDLERS, type SkillHandlerResult } from '../registry';

const HOWI_ID = 'baehwa_howi';

// Sraosha 단계 동기: 매 공격 tick마다 불씨 스택 → tier 재계산 + 공격력/공속 갱신
// 항상 return false (skill 소비 안 함 — 이후 sortedSkills 루프/공격 phase 계속)
function advanceSraoshaTier(ctx: TickContext, _pattern: BossPatternDef | null): boolean {
  if (ctx.currentEnemy?.id !== HOWI_ID) return false;
  if (!ctx.bossPatternState || !ctx.currentEnemy) return false;

  const hwowi = BOSS_PATTERNS['baehwa_howi'];
  const sraoskill = hwowi?.skills.find(s => s.type === 'sraosha_response');
  const tiers = sraoskill?.sraoshaTiers ?? [];
  const stacks = getEmberStacks(ctx.bossPatternState.playerDotStacks);
  const frenzy = ctx.bossPatternState.howiSacredOathState?.phase === 'frenzy';
  let newTier = 0;
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (stacks >= tiers[i].stackMin) { newTier = i; break; }
  }
  if (frenzy) newTier = 3;
  const prev = ctx.bossPatternState.sraoshaLastLoggedTier ?? 0;
  const frenzyEnterLogged = ctx.bossPatternState.howiSacredOathState?.frenzyEnterLogged ?? false;
  // 광화 진입 로그가 이미 찍힌 경우 Sraosha 3단계 상승 중복 로그 방지
  if (newTier !== prev && !(frenzy && frenzyEnterLogged)) {
    const logsArr = newTier > prev ? sraoskill?.sraoshaRiseLogs : sraoskill?.sraoshaFallLogs;
    const bucket = logsArr?.find(b => b.toTier === newTier);
    if (bucket?.logs?.length) {
      const msg = bucket.logs[Math.floor(Math.random() * bucket.logs.length)];
      ctx.logFlavor(msg, 'right', { actor: 'enemy' });
    }
    ctx.bossPatternState.sraoshaLastLoggedTier = newTier;
  } else if (frenzy && frenzyEnterLogged && prev !== newTier) {
    // 광화 진입 이후엔 로그는 찍지 않되 lastLogged는 3으로 동기
    ctx.bossPatternState.sraoshaLastLoggedTier = newTier;
  }
  // tier 변화 없으면 buff 재계산 skip
  const oldTier = ctx.bossPatternState.sraoshaTier ?? -1;
  if (newTier !== oldTier) {
    ctx.bossPatternState.sraoshaTier = newTier;
    const t = tiers[newTier] ?? { atkBonus: 0, aspdBonus: 0 };
    const baseAtk = ctx.bossPatternState.baseAttackPower ?? ctx.currentEnemy.attackPower;
    const baseIv = ctx.bossPatternState.baseAttackInterval ?? ctx.currentEnemy.attackInterval;
    ctx.currentEnemy = {
      ...ctx.currentEnemy,
      attackPower: Math.floor(baseAtk * (1 + t.atkBonus)),
      attackInterval: baseIv / (1 + t.aspdBonus),
    };
  }
  return false;
}

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
  // PRE_SKILL_LOOP_HOOKS 등록 순서: oath awakening → sraosha sync
  //   (등록 순서 = 실행 순서. 전체 체인은 atar → oath → sraosha — registry.ts 참조)
  PRE_SKILL_LOOP_HOOKS.push(advanceSacredOathAwakening);
  PRE_SKILL_LOOP_HOOKS.push(advanceSraoshaTier);
  SKILL_HANDLERS['sacred_oath'] = handleSacredOath;
  // 후속 커밋에서 hwachang InAttackResolveHook 등록
}
