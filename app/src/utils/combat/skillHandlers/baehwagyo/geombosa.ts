// 배화교 검보사 전용 스킬 핸들러
// PRE_SKILL_LOOP_HOOK: 그로기 감소/해제, HP% 기반 태세 전환
// IN_ATTACK_RESOLVE_HOOK: 태세별 분포 추첨 → 검술/화염검/연격/점화/성화 처리
import type { TickContext } from '../../tickContext';
import type { BossPatternDef } from '../../../../data/monsters';
import { BOSS_PATTERNS, getMonsterDef } from '../../../../data/monsters';
import { calcEnemyDamage } from '../../damageCalc';
import { handleDodge, rollDodgeCounter } from '../../tickContext';
import {
  applyEmberStack, consumeEmberStacks, getEmberStacks,
} from '../../emberUtils';
import {
  PRE_SKILL_LOOP_HOOKS, IN_ATTACK_RESOLVE_HOOKS, MONSTER_STATE_FACTORIES,
  type InAttackResolveExtras,
} from '../registry';

const GEOMBOSA_ID = 'baehwa_geombosa';

type Stance = 'defense' | 'attack' | 'master';

export interface GeombosaState {
  readonly kind: typeof GEOMBOSA_ID;
  stance: Stance;
  seonghwaGauge: number;            // 0~100
  grogyLeft: number;                // 초 단위 남은 그로기 시간 (ctx.dt로 감소)
  seonghwaFiredOnce: boolean;       // 성화의 일격을 한 번이라도 쏘았는가 (처치 로그 분기용)
  stunImmune: boolean;              // 로그 조건용 (실 스턴 차단은 bossChargeStunImmune에 편승)
  attackStanceLogged: boolean;      // 66% 전환 로그 1회
  masterStanceLogged: boolean;      // 33% 전환 로그 1회
  seonghwaWarningLogged: boolean;   // 80% 경고 1회/사이클
  stunImmuneLoggedOnce: boolean;    // 스턴 면역 로그 최초 1회
}

export function createGeombosaInitialState(): GeombosaState {
  return {
    kind: GEOMBOSA_ID,
    stance: 'defense',
    seonghwaGauge: 0,
    grogyLeft: 0,
    seonghwaFiredOnce: false,
    stunImmune: false,
    attackStanceLogged: false,
    masterStanceLogged: false,
    seonghwaWarningLogged: false,
    stunImmuneLoggedOnce: false,
  };
}

function getGeombosaMeta(pattern: BossPatternDef | null) {
  const skill = pattern?.skills.find(s => s.type === 'geombosa_attack');
  return skill?.geombosaSkills ?? null;
}

function stanceOutMult(stance: Stance, meta: ReturnType<typeof getGeombosaMeta>): number {
  if (!meta) return 1;
  if (stance === 'defense') return meta.defenseOutMult;
  if (stance === 'attack') return meta.attackOutMult;
  return meta.masterOutMult;
}

// PRE_SKILL_LOOP_HOOK: 그로기 감소·해제, 태세 전환 감지
function advanceGeombosaPreAttack(ctx: TickContext, pattern: BossPatternDef | null): boolean {
  if (ctx.currentEnemy?.id !== GEOMBOSA_ID) return false;
  if (!ctx.bossPatternState || !ctx.currentEnemy) return false;
  const st = ctx.bossPatternState.monsterState;
  if (st?.kind !== GEOMBOSA_ID) return false;

  const meta = getGeombosaMeta(pattern);

  // 1. 그로기 감소 / 해제
  const grogyLeft = st.grogyLeft;
  if (grogyLeft > 0) {
    const next = Math.max(0, grogyLeft - ctx.dt);
    st.grogyLeft = next;
    if (next <= 0) {
      const exitLog = meta?.sacredFlame.grogyExitLog;
      if (exitLog) ctx.logFlavor(exitLog, 'right', { actor: 'enemy' });
      return false; // 정상 공격 재개
    }
    return true; // 그로기 지속 → 공격 스킵
  }

  // 2. 태세 전환 (HP% 단방향)
  const hpRatio = ctx.currentEnemy.hp / ctx.currentEnemy.maxHp;
  const stance = st.stance;
  const transitionLogs = meta?.stanceTransitionLogs;

  if (stance === 'attack' && hpRatio <= 0.33 && !st.masterStanceLogged) {
    st.stance = 'master';
    st.masterStanceLogged = true;
    st.seonghwaGauge = 0;
    st.stunImmune = true;
    ctx.bossPatternState.bossChargeStunImmune = true;
    st.seonghwaWarningLogged = false;
    if (transitionLogs?.attackToMaster) {
      ctx.logFlavor(transitionLogs.attackToMaster, 'right', { actor: 'enemy' });
    }
    return true; // 전환 턴 1회 스킵
  }
  if (stance === 'defense' && hpRatio <= 0.66 && !st.attackStanceLogged) {
    st.stance = 'attack';
    st.attackStanceLogged = true;
    if (transitionLogs?.defenseToAttack) {
      ctx.logFlavor(transitionLogs.defenseToAttack, 'right', { actor: 'enemy' });
    }
    return true;
  }

  return false;
}

// 태세 × ember 스택으로 스킬 선택
type GeombosaSkillKind = 'swordsmanship' | 'flameSword' | 'flameCombo' | 'emberIgnition' | 'sacredFlame';

function pickSkill(
  stance: Stance,
  emberStacks: number,
  meta: NonNullable<ReturnType<typeof getGeombosaMeta>>,
): GeombosaSkillKind {
  const roll = Math.random();
  if (stance === 'defense') {
    const d = meta.defenseStanceDist;
    if (roll < d.swordsmanship) return 'swordsmanship';
    if (roll < d.swordsmanship + d.flameSword) return 'flameSword';
    return 'flameCombo';
  }
  if (stance === 'attack') {
    if (emberStacks >= 2) {
      const d = meta.attackStanceDistWithEmber;
      if (roll < d.swordsmanship) return 'swordsmanship';
      if (roll < d.swordsmanship + d.flameSword) return 'flameSword';
      if (roll < d.swordsmanship + d.flameSword + d.flameCombo) return 'flameCombo';
      return 'emberIgnition';
    }
    const d = meta.attackStanceDistNoEmber;
    if (roll < d.swordsmanship) return 'swordsmanship';
    if (roll < d.swordsmanship + d.flameSword) return 'flameSword';
    return 'flameCombo';
  }
  // master
  const d = meta.masterStanceDist;
  if (roll < d.swordsmanship) return 'swordsmanship';
  if (roll < d.swordsmanship + d.flameSword) return 'flameSword';
  return 'flameCombo';
}

// IN_ATTACK_RESOLVE_HOOK: 검보사 모든 공격을 처리
function applyGeombosaAttack(
  ctx: TickContext,
  pattern: BossPatternDef | null,
  extras: InAttackResolveExtras,
): boolean {
  if (ctx.currentEnemy?.id !== GEOMBOSA_ID) return false;
  if (!ctx.bossPatternState || !ctx.currentEnemy) return false;
  const st = ctx.bossPatternState.monsterState;
  if (st?.kind !== GEOMBOSA_ID) return false;
  const meta = getGeombosaMeta(pattern);
  if (!meta) return false;

  const { monAttackMult, effectiveExternalDmgRed } = extras;
  const stance = st.stance;
  const monDef = getMonsterDef(ctx.currentEnemy.id);
  const eName = monDef?.name ?? ctx.currentEnemy.id;

  const outMult = stanceOutMult(stance, meta);

  // 1. 명인 태세 + 게이지 풀차 → 성화의 일격 강제
  let chosen: GeombosaSkillKind;
  if (stance === 'master' && st.seonghwaGauge >= meta.sacredFlame.gaugeMax) {
    chosen = 'sacredFlame';
  } else {
    const emberStacks = getEmberStacks(ctx.bossPatternState.playerDotStacks);
    chosen = pickSkill(stance, emberStacks, meta);
  }

  // 공통 데미지 계산 + 적용 + 이벤트 로그
  const applyDamage = (mult: number, name: string, chips?: { kind: 'fire'; label: string; count: number }[]): number => {
    let dmg = calcEnemyDamage(
      ctx.currentEnemy!.attackPower,
      mult * outMult * monAttackMult,
      ctx.dmgReduction,
      undefined,
      ctx.equipStats.bonusFixedDmgReduction ?? 0,
      effectiveExternalDmgRed,
    );
    dmg = Math.floor(dmg * (1 + (ctx.equipStats.bonusDmgTakenPercent ?? 0)));
    ctx.hp -= dmg;
    ctx.currentBattleDamageTaken += dmg;
    ctx.currentBattleHitTakenCount += 1;
    if (dmg > ctx.currentBattleMaxIncomingHit) ctx.currentBattleMaxIncomingHit = dmg;
    ctx.logEvent({
      side: 'incoming', actor: 'enemy',
      name, tag: 'hit', value: dmg, valueTier: dmg > ctx.maxHp * 0.25 ? 'hit-heavy' : 'normal',
      chips,
    });
    return dmg;
  };

  // 스킬별 처리
  if (chosen === 'swordsmanship') {
    if (Math.random() < ctx.dodgeRate) {
      handleDodge(ctx, eName);
    } else {
      const attackMsgs = monDef?.attackMessages ?? [];
      const msg = attackMsgs.length ? attackMsgs[Math.floor(Math.random() * attackMsgs.length)] : '';
      if (msg) ctx.logFlavor(msg, 'right', { actor: 'enemy' });
      applyDamage(meta.swordsmanship.mult, '검술');
      if (!ctx.isSimulating) ctx.enemyAnim = 'attack';
    }
  } else if (chosen === 'flameSword') {
    if (Math.random() < ctx.dodgeRate) {
      handleDodge(ctx, `${eName}의 화염검`);
    } else {
      const logs = meta.flameSword.logs;
      const msg = logs.length ? logs[Math.floor(Math.random() * logs.length)] : '';
      if (msg) ctx.logFlavor(msg, 'right', { actor: 'enemy' });
      let chips: { kind: 'fire'; label: string; count: number }[] | undefined;
      if (Math.random() < meta.flameSword.emberApplyChance) {
        ctx.bossPatternState.playerDotStacks = applyEmberStack(ctx.bossPatternState.playerDotStacks, 1);
        chips = [{ kind: 'fire', label: '불씨', count: 1 }];
      }
      applyDamage(meta.flameSword.mult, '화염검', chips);
      if (!ctx.isSimulating) ctx.enemyAnim = 'attack';
    }
  } else if (chosen === 'flameCombo') {
    const logs = meta.flameCombo.logs;
    const msg = logs.length ? logs[Math.floor(Math.random() * logs.length)] : '';
    if (msg) ctx.logFlavor(msg, 'right', { actor: 'enemy' });
    const hitChips: { kind: 'fire'; label: string; count: number }[] = [];
    for (let hi = 0; hi < meta.flameCombo.hits; hi++) {
      if (Math.random() < ctx.dodgeRate) {
        ctx.currentBattleDodgeCount += 1;
        ctx.logEvent({
          side: 'incoming', actor: 'enemy',
          name: `${hi + 1}타`, tag: 'dodge', value: '—', valueTier: 'muted',
        });
        if (rollDodgeCounter(ctx)) ctx.dodgeCounterActive = true;
      } else {
        applyDamage(meta.flameCombo.mult, `${hi + 1}타`);
        if (Math.random() < meta.flameCombo.emberApplyChancePerHit) {
          ctx.bossPatternState.playerDotStacks = applyEmberStack(ctx.bossPatternState.playerDotStacks, 1);
          hitChips.push({ kind: 'fire', label: '불씨', count: 1 });
        }
      }
    }
    if (hitChips.length > 0) {
      ctx.logEvent({ side: 'incoming', actor: 'enemy', chips: hitChips });
    }
    if (!ctx.isSimulating) ctx.enemyAnim = 'attack';
  } else if (chosen === 'emberIgnition') {
    // 회피 판정 먼저
    if (Math.random() < ctx.dodgeRate) {
      const dLogs = meta.emberIgnition.dodgeLogs;
      const dMsg = dLogs.length ? dLogs[Math.floor(Math.random() * dLogs.length)] : '';
      handleDodge(ctx, `${eName}의 불씨 점화`, dMsg || undefined);
    } else {
      const need = meta.emberIgnition.consumeStacks;
      const { dots: consumedDots, consumed } = consumeEmberStacks(ctx.bossPatternState.playerDotStacks, need);
      if (consumed !== need) {
        // 가드: 라우터가 스택 부족을 걸러내야 함. 만에 하나 실패 시 검술로 fallback.
        const attackMsgs = monDef?.attackMessages ?? [];
        const msg = attackMsgs.length ? attackMsgs[Math.floor(Math.random() * attackMsgs.length)] : '';
        if (msg) ctx.logFlavor(msg, 'right', { actor: 'enemy' });
        applyDamage(meta.swordsmanship.mult, '검술');
      } else {
        ctx.bossPatternState.playerDotStacks = consumedDots;
        const logs = meta.emberIgnition.logs;
        const msg = logs.length ? logs[Math.floor(Math.random() * logs.length)] : '';
        if (msg) ctx.logFlavor(msg, 'right', { actor: 'enemy' });
        const effectiveMult = meta.emberIgnition.baseMult * (1 + need * meta.emberIgnition.perStackMult);
        applyDamage(effectiveMult, '불씨 점화', [{ kind: 'fire', label: '불씨', count: -need }]);
      }
      if (!ctx.isSimulating) ctx.enemyAnim = 'attack';
    }
  } else if (chosen === 'sacredFlame') {
    if (Math.random() < ctx.dodgeRate) {
      const dLogs = meta.sacredFlame.dodgeLogs;
      const dMsg = dLogs.length ? dLogs[Math.floor(Math.random() * dLogs.length)] : '';
      handleDodge(ctx, `${eName}의 성화의 일격`, dMsg || undefined);
    } else {
      const logs = meta.sacredFlame.logs;
      const msg = logs.length ? logs[Math.floor(Math.random() * logs.length)] : '';
      if (msg) ctx.logFlavor(msg, 'right', { actor: 'enemy' });
      ctx.bossPatternState.playerDotStacks = applyEmberStack(ctx.bossPatternState.playerDotStacks, meta.sacredFlame.emberApply);
      applyDamage(meta.sacredFlame.mult, '성화의 일격', [{ kind: 'fire', label: '불씨', count: meta.sacredFlame.emberApply }]);
      if (!ctx.isSimulating) ctx.enemyAnim = 'attack';
    }
    // 회피/명중 무관: 게이지 리셋 + 그로기 진입 + firedOnce true
    st.seonghwaGauge = 0;
    st.grogyLeft = meta.sacredFlame.grogyDurationMs; // 초 단위
    st.seonghwaFiredOnce = true;
    if (meta.sacredFlame.grogyEnterLog) {
      ctx.logFlavor(meta.sacredFlame.grogyEnterLog, 'right', { actor: 'enemy' });
    }
  }

  // 2. 명인 태세 일반 공격 → 게이지 +20 + 80% 경고
  if (stance === 'master'
      && (chosen === 'swordsmanship' || chosen === 'flameSword' || chosen === 'flameCombo')) {
    const before = st.seonghwaGauge;
    const after = Math.min(meta.sacredFlame.gaugeMax, before + meta.sacredFlame.gaugePerNormalAttack);
    st.seonghwaGauge = after;
    if (before < meta.sacredFlame.warningThreshold
        && after >= meta.sacredFlame.warningThreshold
        && !st.seonghwaWarningLogged) {
      st.seonghwaWarningLogged = true;
      if (meta.sacredFlame.warningLog) {
        ctx.logFlavor(meta.sacredFlame.warningLog, 'right', { actor: 'enemy' });
      }
    }
  }

  return true;
}

export function registerBaehwaGeombosa(): void {
  PRE_SKILL_LOOP_HOOKS.push(advanceGeombosaPreAttack);
  IN_ATTACK_RESOLVE_HOOKS.push(applyGeombosaAttack);
  MONSTER_STATE_FACTORIES[GEOMBOSA_ID] = createGeombosaInitialState;
  // SKILL_HANDLERS 등록 없음 — geombosa_attack 은 enemyCombat.ts skip 목록으로 sortedSkills 에서 통과
}

// BOSS_PATTERNS 간접 참조 제거용 no-op (tree-shake 방지)
void BOSS_PATTERNS;
