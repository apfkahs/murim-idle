// 배화교 경보사 전용 스킬 핸들러
// PER_TICK_HOOK:
//   - 자화 힐 1초 간격 틱
//   - 억압 디버프 카운트다운 (만료 시 playerAtkDebuffMult/playerAtkSpeedDebuffMult 복구)
//   - 활성 일반 규율 3종(단언·경보·집법) 타이머 감소 & 만료 역처리
//   - 의례 몰입(ceremonyLeft) 카운트다운, 임계 교차 시 구절 로그 / 해제 로그
//   - 단죄·절대 규율 DoT 로그 1초 간격 출력
// PRE_SKILL_LOOP_HOOK:
//   - 의례 몰입 중 공격 스킵 (+ enemyAttackTimer clamp 로 연타 방지)
//   - HP 50% 최초 진입 시 triggerDiscipline('hp_half') 후 이번 공격 스킵
// IN_ATTACK_RESOLVE_HOOK:
//   - skillDist 롤 → normal / suppression / selfHarmony / verdict 분기
//   - 분기 후 규율 스택 6 도달 체크 → triggerDiscipline('stack_full')
import type { TickContext } from '../../tickContext';
import type { BossPatternDef } from '../../../../data/monsters';
import { BOSS_PATTERNS, getMonsterDef } from '../../../../data/monsters';
import { calcEnemyDamage } from '../../damageCalc';
import { handleDodge } from '../../tickContext';
import { applyEmberStack } from '../../emberUtils';
import { applyDruzeSnapshot, applyAbsoluteSnapshot } from '../../druzeUtils';
import {
  PER_TICK_HOOKS, PRE_SKILL_LOOP_HOOKS, IN_ATTACK_RESOLVE_HOOKS, MONSTER_STATE_FACTORIES,
  type InAttackResolveExtras,
} from '../registry';

const GYEONGBOSA_ID = 'baehwa_gyeongbosa';
const ENFORCEMENT_BUFF_ID = 'gyeongbosa_enforcement';

export interface GyeongbosaState {
  readonly kind: typeof GYEONGBOSA_ID;

  // 규율 축
  disciplineStacks: number;        // 0~6 (억압 명중 / 단죄 발동 시 +1)
  disciplineCounter: number;       // 누적 발동 횟수 (1, 2, 3, 4, ...)
  hpHalfTriggered: boolean;        // HP 50% 임계 1회 발동 플래그

  // 자화 (자기 힐)
  healAuraLeft: number;            // 자화 남은 지속시간 (초)
  healTickAcc: number;             // 힐 틱 누적 타이머

  // 의례 몰입 (절대 규율)
  ceremonyLeft: number;            // 15 → 0 (공격 타이머 정지)
  ceremonyPhraseLogged5s: boolean; // 5초 경과 구절 로그 1회 플래그
  ceremonyPhraseLogged10s: boolean;// 10초 경과 구절 로그 1회 플래그

  // 활성 일반 규율 타이머 (20초)
  activeDisciplineTimers: {
    declaration?: number;
    lightStep?: number;
    enforcement?: number;
  };

  // 억압 디버프 남은 시간 (플레이어 ATK/ATS -25%)
  suppressionLeft: number;

  // 단죄 DoT 로그 틱 관리 (초당 1회만 출력)
  verdictDotLastLogSec: number;

  // 절대 규율 DoT 로그 틱 관리 (초당 1회만 출력)
  absoluteDotLastLogSec: number;
}

export function createGyeongbosaInitialState(): GyeongbosaState {
  return {
    kind: GYEONGBOSA_ID,
    disciplineStacks: 0,
    disciplineCounter: 0,
    hpHalfTriggered: false,
    healAuraLeft: 0,
    healTickAcc: 0,
    ceremonyLeft: 0,
    ceremonyPhraseLogged5s: false,
    ceremonyPhraseLogged10s: false,
    activeDisciplineTimers: {},
    suppressionLeft: 0,
    verdictDotLastLogSec: -999,
    absoluteDotLastLogSec: -999,
  };
}

function getGyeongbosaMeta(pattern: BossPatternDef | null) {
  const skill = pattern?.skills.find(s => s.type === 'gyeongbosa_attack');
  return skill?.gyeongbosaSkills ?? null;
}

type GyeongbosaMeta = NonNullable<ReturnType<typeof getGyeongbosaMeta>>;

// ============================================================
// PER_TICK_HOOK: 타이머 감소, 힐 틱, 로그 틱
// ============================================================
function gyeongbosaPerTick(ctx: TickContext, pattern: BossPatternDef | null): void {
  if (ctx.currentEnemy?.id !== GYEONGBOSA_ID) return;
  if (!ctx.bossPatternState) return;
  const st = ctx.bossPatternState.monsterState;
  if (st?.kind !== GYEONGBOSA_ID) return;
  const meta = getGyeongbosaMeta(pattern);
  if (!meta) return;

  // 1. 자화 힐 처리 (남은 지속시간 > 0 일 때 1초 간격 틱)
  //    발동 턴 즉시 1틱(resolveSelfHarmony)에서 적용 후, 여기서 1초 간격 7틱 (총 8틱 — 스펙 §537).
  if (st.healAuraLeft > 0 && ctx.currentEnemy) {
    st.healAuraLeft = Math.max(0, st.healAuraLeft - ctx.dt);
    st.healTickAcc += ctx.dt;
    const tickInterval = meta.selfHarmony.tickIntervalSec;
    // healAuraLeft > 0 인 동안만 틱. 만료와 동시에는 틱하지 않음 (즉시 1틱 + 7번 = 총 8틱).
    while (st.healTickAcc >= tickInterval && st.healAuraLeft > 0) {
      const healAmt = Math.floor(ctx.currentEnemy.maxHp * meta.selfHarmony.healPercent);
      ctx.currentEnemy = {
        ...ctx.currentEnemy,
        hp: Math.min(ctx.currentEnemy.hp + healAmt, ctx.currentEnemy.maxHp),
      };
      st.healTickAcc -= tickInterval;
    }
    if (st.healAuraLeft <= 0) {
      st.healTickAcc = 0;
    }
  }

  // 2. 억압 디버프 카운트다운
  if (st.suppressionLeft > 0) {
    st.suppressionLeft = Math.max(0, st.suppressionLeft - ctx.dt);
    if (st.suppressionLeft <= 0) {
      ctx.bossPatternState.playerAtkDebuffMult = 1;
      ctx.bossPatternState.playerAtkSpeedDebuffMult = 1;
    }
  }

  // 3. 활성 일반 규율 타이머 감소 & 만료 역처리
  const timers = st.activeDisciplineTimers;

  if (timers.declaration !== undefined) {
    timers.declaration = Math.max(0, timers.declaration - ctx.dt);
    if (timers.declaration <= 0) {
      ctx.bossPatternState.playerCritRateOverride = undefined;
      delete timers.declaration;
    }
  }

  if (timers.lightStep !== undefined) {
    timers.lightStep = Math.max(0, timers.lightStep - ctx.dt);
    if (timers.lightStep <= 0) {
      ctx.bossPatternState.enemyDodgeRate = undefined;
      delete timers.lightStep;
    }
  }

  if (timers.enforcement !== undefined) {
    timers.enforcement = Math.max(0, timers.enforcement - ctx.dt);
    if (timers.enforcement <= 0) {
      // attackPower 복구는 gameLoop 의 enemyBuffs 자동 만료 로직이 수행.
      // 여기선 activeDisciplineTimers 만 정리 (UI 표시·재발동 판정용).
      delete timers.enforcement;
    }
  }

  // 4. 의례 몰입 카운트다운
  if (st.ceremonyLeft > 0) {
    const prev = st.ceremonyLeft;
    const next = Math.max(0, prev - ctx.dt);
    st.ceremonyLeft = next;

    // 의례 총 15s → 5초 경과 = ceremonyLeft <= 10 (phraseLog5s)
    const totalCeremony = meta.discipline.absolute.ceremonySec;
    const threshold5s = totalCeremony - 5;   // 10
    const threshold10s = totalCeremony - 10; // 5

    if (prev > threshold5s && next <= threshold5s && !st.ceremonyPhraseLogged5s) {
      st.ceremonyPhraseLogged5s = true;
      const msg = meta.discipline.absolute.phraseLog5s;
      if (msg) ctx.logFlavor(msg, 'right', { actor: 'enemy' });
    }
    if (prev > threshold10s && next <= threshold10s && !st.ceremonyPhraseLogged10s) {
      st.ceremonyPhraseLogged10s = true;
      const msg = meta.discipline.absolute.phraseLog10s;
      if (msg) ctx.logFlavor(msg, 'right', { actor: 'enemy' });
    }
    if (prev > 0 && next <= 0) {
      const msg = meta.discipline.absolute.endLog;
      if (msg) ctx.logFlavor(msg, 'right', { actor: 'enemy' });
      st.ceremonyLeft = 0;
    }
  }

  // 5. 단죄 DoT / 절대 규율 DoT 로그 틱 (초당 1회)
  const dots = ctx.bossPatternState.playerDotStacks ?? [];
  const druzeDot = dots.find(d => d.id === 'druze');
  const absDot = dots.find(d => d.id === 'absolute_discipline');
  const now = ctx.combatElapsed;

  if (druzeDot && now - st.verdictDotLastLogSec >= 1.0) {
    const logs = meta.verdict.tickLogs;
    if (logs && logs.length > 0) {
      const msg = logs[Math.floor(Math.random() * logs.length)];
      ctx.logFlavor(msg, 'right', { actor: 'enemy' });
    }
    st.verdictDotLastLogSec = now;
  }

  if (absDot && now - st.absoluteDotLastLogSec >= 1.0) {
    const logs = meta.discipline.absolute.dotTickLogs;
    if (logs && logs.length > 0) {
      const msg = logs[Math.floor(Math.random() * logs.length)];
      ctx.logFlavor(msg, 'right', { actor: 'enemy' });
    }
    st.absoluteDotLastLogSec = now;
  }
}

// ============================================================
// PRE_SKILL_LOOP_HOOK: 의례 몰입 / HP 50% 임계
// ============================================================
function gyeongbosaPreAttack(ctx: TickContext, pattern: BossPatternDef | null): boolean {
  if (ctx.currentEnemy?.id !== GYEONGBOSA_ID) return false;
  if (!ctx.bossPatternState || !ctx.currentEnemy) return false;
  const st = ctx.bossPatternState.monsterState;
  if (st?.kind !== GYEONGBOSA_ID) return false;

  // 의례 몰입 중 → 공격 스킵. enemyAttackTimer 를 ceremonyLeft 까지 hold 해
  // (1) 의례 15초 내내 매 tick PRE_SKILL_LOOP 재진입을 피하고 (2) 의례 종료 시점에
  // 타이머가 자연스럽게 0 에 도달해 다음 공격 타이밍 복귀 (스펙 §326).
  if (st.ceremonyLeft > 0) {
    ctx.enemyAttackTimer = Math.max(ctx.enemyAttackTimer, st.ceremonyLeft);
    return true;
  }

  // HP 50% 최초 진입 → 규율 발동, 이번 공격 스킵
  const hpRatio = ctx.currentEnemy.hp / ctx.currentEnemy.maxHp;
  const meta = getGyeongbosaMeta(pattern);
  const threshold = meta?.discipline.hpHalfTriggerRatio ?? 0.5;
  if (!st.hpHalfTriggered && hpRatio <= threshold) {
    st.hpHalfTriggered = true;
    triggerDiscipline(ctx, st, pattern, 'hp_half');
    return true;
  }

  return false;
}

// ============================================================
// IN_ATTACK_RESOLVE_HOOK: 경전 낭송 RNG
// ============================================================
function applyGyeongbosaAttack(
  ctx: TickContext,
  pattern: BossPatternDef | null,
  extras: InAttackResolveExtras,
): boolean {
  if (ctx.currentEnemy?.id !== GYEONGBOSA_ID) return false;
  if (!ctx.bossPatternState || !ctx.currentEnemy) return false;
  const st = ctx.bossPatternState.monsterState;
  if (st?.kind !== GYEONGBOSA_ID) return false;
  const meta = getGyeongbosaMeta(pattern);
  if (!meta) return false;

  // 안전망: 의례 몰입 중이면 PRE_SKILL_LOOP 에서 이미 차단되지만 한 번 더 방어
  if (st.ceremonyLeft > 0) return true;

  const { monAttackMult, effectiveExternalDmgRed } = extras;
  const monDef = getMonsterDef(ctx.currentEnemy.id);
  const eName = monDef?.name ?? ctx.currentEnemy.id;

  // skillDist 누적 롤
  const roll = Math.random();
  const d = meta.skillDist;
  let kind: 'normal' | 'suppression' | 'selfHarmony' | 'verdict';
  let acc = d.normal;
  if (roll < acc) kind = 'normal';
  else if (roll < (acc += d.suppression)) kind = 'suppression';
  else if (roll < (acc += d.selfHarmony)) kind = 'selfHarmony';
  else kind = 'verdict';

  if (kind === 'normal') {
    resolveNormal(ctx, meta, monAttackMult, effectiveExternalDmgRed, eName);
  } else if (kind === 'suppression') {
    resolveSuppression(ctx, st, meta, monAttackMult, effectiveExternalDmgRed, eName);
  } else if (kind === 'selfHarmony') {
    resolveSelfHarmony(ctx, st, meta);
  } else {
    resolveVerdict(ctx, st, meta);
  }

  // 규율 스택 6 도달 체크
  if (st.disciplineStacks >= meta.discipline.stackCap) {
    triggerDiscipline(ctx, st, pattern, 'stack_full');
  }

  return true;
}

// ── 분기 처리: 평타 (mult 1.0, 부수효과 없음) ──
function resolveNormal(
  ctx: TickContext,
  meta: GyeongbosaMeta,
  monAttackMult: number,
  effectiveExternalDmgRed: number,
  eName: string,
): void {
  if (Math.random() < ctx.dodgeRate) {
    handleDodge(ctx, eName);
    return;
  }
  const logs = meta.normal.logs;
  if (logs && logs.length > 0) {
    const msg = logs[Math.floor(Math.random() * logs.length)];
    ctx.logFlavor(msg, 'right', { actor: 'enemy' });
  }
  const atk = ctx.currentEnemy!.attackPower;
  let dmg = calcEnemyDamage(
    atk,
    meta.normal.mult * monAttackMult,
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
    name: '경전 낭송', tag: 'hit',
    value: dmg, valueTier: dmg > ctx.maxHp * 0.25 ? 'hit-heavy' : 'normal',
  });
  if (!ctx.isSimulating) ctx.enemyAnim = 'attack';
}

// ── 분기 처리: 억압 (mult 1.3, 명중 시 디버프 + 불씨 + 규율 스택) ──
function resolveSuppression(
  ctx: TickContext,
  st: GyeongbosaState,
  meta: GyeongbosaMeta,
  monAttackMult: number,
  effectiveExternalDmgRed: number,
  eName: string,
): void {
  // 플레이어 회피 판정
  if (Math.random() < ctx.dodgeRate) {
    handleDodge(ctx, `${eName}의 억압`);
    return;
  }

  const logs = meta.suppression.logs;
  if (logs && logs.length > 0) {
    const msg = logs[Math.floor(Math.random() * logs.length)];
    ctx.logFlavor(msg, 'right', { actor: 'enemy' });
  }

  const atk = ctx.currentEnemy!.attackPower;
  let dmg = calcEnemyDamage(
    atk,
    meta.suppression.mult * monAttackMult,
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
    name: '억압', tag: 'hit',
    value: dmg, valueTier: dmg > ctx.maxHp * 0.25 ? 'hit-heavy' : 'normal',
    chips: [{ kind: 'fire', label: '불씨', count: meta.suppression.playerEmberGain }],
  });

  // 피해 적용 후 부수효과: 디버프 / 지속시간 리셋, 불씨 +1, 규율 스택 +1
  ctx.bossPatternState!.playerAtkDebuffMult = 1 - meta.suppression.debuffAtkPercent;
  ctx.bossPatternState!.playerAtkSpeedDebuffMult = 1 + meta.suppression.debuffAtkSpeedPercent;
  st.suppressionLeft = meta.suppression.durationSec;

  ctx.bossPatternState!.playerDotStacks = applyEmberStack(
    ctx.bossPatternState!.playerDotStacks,
    meta.suppression.playerEmberGain,
  );

  st.disciplineStacks += 1;

  if (!ctx.isSimulating) ctx.enemyAnim = 'attack';
}

// ── 분기 처리: 자화 (피해 없음, 자기 힐 + 다음 공격 회피 +30%) ──
function resolveSelfHarmony(
  ctx: TickContext,
  st: GyeongbosaState,
  meta: GyeongbosaMeta,
): void {
  const alreadyActive = st.healAuraLeft > 0;
  const logs = alreadyActive ? meta.selfHarmony.resetLogs : meta.selfHarmony.firstLogs;
  if (logs && logs.length > 0) {
    const msg = logs[Math.floor(Math.random() * logs.length)];
    ctx.logFlavor(msg, 'right', { actor: 'enemy' });
  }

  // 지속시간 리셋 / 신규 부여
  st.healAuraLeft = meta.selfHarmony.durationSec;
  st.healTickAcc = 0;

  // 즉시 1틱 힐 (PER_TICK_HOOK 의 1초 간격 틱과 별개)
  if (ctx.currentEnemy) {
    const healAmt = Math.floor(ctx.currentEnemy.maxHp * meta.selfHarmony.healPercent);
    ctx.currentEnemy = {
      ...ctx.currentEnemy,
      hp: Math.min(ctx.currentEnemy.hp + healAmt, ctx.currentEnemy.maxHp),
    };
    ctx.logEvent({
      side: 'incoming', actor: 'enemy',
      name: '자화', tag: 'heal', value: healAmt, valueTier: 'heal',
    });
  }

  // 다음 1회 공격 회피 +30% (미소모분이 남아있으면 유지, 소모됐거나 미설정이면 새로 부여)
  const existingBonus = ctx.bossPatternState!.enemyNextAttackDodgeBonus ?? 0;
  if (existingBonus <= 0) {
    ctx.bossPatternState!.enemyNextAttackDodgeBonus = meta.selfHarmony.nextAttackDodgeBonus;
  }

  if (!ctx.isSimulating) ctx.enemyAnim = 'attack';
}

// ── 분기 처리: 단죄 (직피 0, DoT 부여, 불씨 +1, 규율 스택 +1) ──
function resolveVerdict(
  ctx: TickContext,
  st: GyeongbosaState,
  meta: GyeongbosaMeta,
): void {
  const logs = meta.verdict.logs;
  if (logs && logs.length > 0) {
    const msg = logs[Math.floor(Math.random() * logs.length)];
    ctx.logFlavor(msg, 'right', { actor: 'enemy' });
  }

  // DoT 스냅샷 — monAttackMult 는 적용하지 않음 (화보사 드루즈 단죄와 동일 원칙)
  const atk = ctx.currentEnemy!.attackPower;
  const dmgPerTick = atk * meta.verdict.dotCoefficient;
  ctx.bossPatternState!.playerDotStacks = applyDruzeSnapshot(
    ctx.bossPatternState!.playerDotStacks ?? [],
    dmgPerTick,
    meta.verdict.durationSec,
  );

  // 로그 틱 재시작을 위해 verdictDotLastLogSec 갱신 (지금은 로그 출력 안함 — 부여만)
  st.verdictDotLastLogSec = ctx.combatElapsed;

  ctx.logEvent({
    side: 'incoming', actor: 'enemy',
    name: '단죄', tag: 'special', value: '—', valueTier: 'muted',
    chips: [{ kind: 'fire', label: '불씨', count: meta.verdict.playerEmberGain }],
  });

  // 불씨 +1, 규율 스택 +1
  ctx.bossPatternState!.playerDotStacks = applyEmberStack(
    ctx.bossPatternState!.playerDotStacks,
    meta.verdict.playerEmberGain,
  );
  st.disciplineStacks += 1;

  if (!ctx.isSimulating) ctx.enemyAnim = 'attack';
}

// ============================================================
// triggerDiscipline: 규율 발동 서브루틴
// ============================================================
function triggerDiscipline(
  ctx: TickContext,
  st: GyeongbosaState,
  pattern: BossPatternDef | null,
  kind: 'hp_half' | 'stack_full',
): void {
  const meta = getGyeongbosaMeta(pattern);
  if (!meta) return;
  const disc = meta.discipline;

  // 카운터 증가
  st.disciplineCounter += 1;
  const counter = st.disciplineCounter;

  // stack_full 이면 스택 리셋
  if (kind === 'stack_full') {
    st.disciplineStacks = 0;
  }

  // 4의 배수 = 절대 규율
  if (counter % disc.absoluteMod === 0) {
    applyAbsoluteDiscipline(ctx, st, meta);
    return;
  }

  // 일반 규율 RNG
  const pool = disc.rngPool;
  const picked = pool[Math.floor(Math.random() * pool.length)];

  const timers = st.activeDisciplineTimers;
  const alreadyActive = timers[picked] !== undefined && (timers[picked] ?? 0) > 0;

  if (alreadyActive) {
    // 지속시간만 20초로 리셋 + resetLog (수치는 이미 걸려 있음 — 재부여 없음)
    timers[picked] = disc.buffDurationSec;
    // enforcement 는 enemyBuffs 에도 remainingSec 동기화 (gameLoop 가 이 타이머로 attackPower 복구)
    if (picked === 'enforcement') {
      const buffs = ctx.bossPatternState!.enemyBuffs ?? [];
      ctx.bossPatternState!.enemyBuffs = buffs.map(b =>
        b.id === ENFORCEMENT_BUFF_ID ? { ...b, remainingSec: disc.buffDurationSec } : b,
      );
    }
    if (disc.resetLog) ctx.logFlavor(disc.resetLog, 'right', { actor: 'enemy' });
    return;
  }

  // 신규 적용
  if (picked === 'declaration') {
    ctx.bossPatternState!.playerCritRateOverride = disc.declaration.playerCritRateOverride;
    timers.declaration = disc.buffDurationSec;
    if (disc.declaration.log) ctx.logFlavor(disc.declaration.log, 'right', { actor: 'enemy' });
    ctx.logEvent({
      side: 'incoming', actor: 'enemy',
      name: '단언', tag: 'special', value: '—', valueTier: 'muted',
      chips: [{ kind: 'status', label: disc.declaration.banner }],
    });
  } else if (picked === 'lightStep') {
    ctx.bossPatternState!.enemyDodgeRate = disc.lightStep.enemyDodgeBonus;
    timers.lightStep = disc.buffDurationSec;
    if (disc.lightStep.log) ctx.logFlavor(disc.lightStep.log, 'right', { actor: 'enemy' });
    ctx.logEvent({
      side: 'incoming', actor: 'enemy',
      name: '경보의 율', tag: 'special', value: '—', valueTier: 'muted',
      chips: [{ kind: 'status', label: disc.lightStep.banner }],
    });
  } else if (picked === 'enforcement') {
    // enemyBuffs 에서 기존 enforcement 제거 후 재부여
    const buffs = ctx.bossPatternState!.enemyBuffs ?? [];
    ctx.bossPatternState!.enemyBuffs = [
      ...buffs.filter(b => b.id !== ENFORCEMENT_BUFF_ID),
      {
        id: ENFORCEMENT_BUFF_ID,
        type: 'timed_atk_buff',
        value: disc.enforcement.enemyAtkMult,
        remainingSec: disc.buffDurationSec,
      },
    ];
    // currentEnemy.attackPower 를 base × mult 로 즉시 반영
    if (ctx.currentEnemy) {
      const base = ctx.bossPatternState!.baseAttackPower ?? ctx.currentEnemy.attackPower;
      ctx.currentEnemy = { ...ctx.currentEnemy, attackPower: base * disc.enforcement.enemyAtkMult };
    }
    timers.enforcement = disc.buffDurationSec;
    if (disc.enforcement.log) ctx.logFlavor(disc.enforcement.log, 'right', { actor: 'enemy' });
    ctx.logEvent({
      side: 'incoming', actor: 'enemy',
      name: '집법의 율', tag: 'special', value: '—', valueTier: 'muted',
      chips: [{ kind: 'status', label: disc.enforcement.banner }],
    });
  }
}

// ============================================================
// applyAbsoluteDiscipline: 절대 규율 발동
// ============================================================
function applyAbsoluteDiscipline(
  ctx: TickContext,
  st: GyeongbosaState,
  meta: GyeongbosaMeta,
): void {
  const abs = meta.discipline.absolute;

  // 1. 플레이어 스턴
  ctx.playerStunTimer = abs.stunSec;

  // 2. 절대 규율 DoT (단죄 DoT 와 별도 id 로 동시 존재)
  const atk = ctx.currentEnemy!.attackPower;
  const dmgPerTick = atk * abs.dotCoefficient;
  ctx.bossPatternState!.playerDotStacks = applyAbsoluteSnapshot(
    ctx.bossPatternState!.playerDotStacks ?? [],
    dmgPerTick,
    abs.dotDurationSec,
  );
  st.absoluteDotLastLogSec = ctx.combatElapsed;

  // 3. 의례 몰입
  st.ceremonyLeft = abs.ceremonySec;
  st.ceremonyPhraseLogged5s = false;
  st.ceremonyPhraseLogged10s = false;

  // 4. 로그
  if (abs.openLog) ctx.logFlavor(abs.openLog, 'right', { actor: 'enemy' });
  ctx.logEvent({
    side: 'incoming', actor: 'enemy',
    name: '절대 규율', tag: 'special', value: '—', valueTier: 'muted',
    chips: [{
      kind: 'status',
      label: `스턴 ${abs.stunSec}s · 단죄 초당 ${Math.floor(dmgPerTick)} · ${abs.dotDurationSec}s · 의례 몰입`,
    }],
  });
}

// ============================================================
// 등록
// ============================================================
export function registerBaehwaGyeongbosa(): void {
  PER_TICK_HOOKS.push(gyeongbosaPerTick);
  PRE_SKILL_LOOP_HOOKS.push(gyeongbosaPreAttack);
  IN_ATTACK_RESOLVE_HOOKS.push(applyGyeongbosaAttack);
  MONSTER_STATE_FACTORIES[GYEONGBOSA_ID] = createGyeongbosaInitialState;
}

// tree-shake 방지용 no-op
void BOSS_PATTERNS;
