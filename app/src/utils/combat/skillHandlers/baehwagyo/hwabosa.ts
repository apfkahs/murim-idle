// 배화교 화보사 전용 스킬 핸들러
// PRE_SKILL_LOOP_HOOK: 오프닝 기도 타이머, 자기 불씨 공속 감쇠, 페이즈 전환 후 공격 스킵
// IN_ATTACK_RESOLVE_HOOK: 페이즈별 분포 추첨 → 평타/낙인/묵상/베레트라그나/드루즈 단죄/아타시 바흐람
//
// 자기 불씨 페널티 (계획 §3-3):
//   - 공격력 감쇠: prayer/worship/meditation 에서 적용, liberation/ascension 에서 해제
//   - 공속 감쇠: prayer/worship/meditation/liberation 에서 적용, ascension 에서 해제
import type { TickContext } from '../../tickContext';
import type { BossPatternDef } from '../../../../data/monsters';
import { BOSS_PATTERNS, getMonsterDef } from '../../../../data/monsters';
import { calcEnemyDamage } from '../../damageCalc';
import { handleDodge } from '../../tickContext';
import { applyEmberStack } from '../../emberUtils';
import { applyDruzeSnapshot } from '../../druzeUtils';
import {
  PER_TICK_HOOKS, PRE_SKILL_LOOP_HOOKS, IN_ATTACK_RESOLVE_HOOKS, MONSTER_STATE_FACTORIES,
  type InAttackResolveExtras,
} from '../registry';

const HWABOSA_ID = 'baehwa_hwabosa';

type Phase = 'prayer' | 'worship' | 'meditation' | 'liberation' | 'ascension';

type HwabosaSkillKind =
  | 'flameSwing'
  | 'atarBrand'
  | 'ashaMeditation'
  | 'verethragna'
  | 'druzVerdict'
  | 'atashBahram';

export interface HwabosaState {
  readonly kind: typeof HWABOSA_ID;
  phase: Phase;
  selfBurnStacks: number;        // 자신 불씨
  absorbedTotal: number;         // 누적 흡수 (0→6→16→31)
  prayerTimerSec: number | null; // 오프닝 10초 카운트다운 (null = 미초기화)
  prayerTicksDone: number;       // 0~5
  nextAttackBonus: number;       // 묵상 증폭 (0 = 없음)
  skipNextAttack: boolean;       // 페이즈 전환 후 1회 스킵
  bahramGauge: number;           // 0~30 (강림만 유효)
  bahramWarningLogged: boolean;  // 24 도달 1회 경고
  bahramFired: boolean;          // 아타시 발동 이력 (처치 로그 분기용)
}

export function createHwabosaInitialState(): HwabosaState {
  return {
    kind: HWABOSA_ID,
    phase: 'prayer',
    selfBurnStacks: 0,
    absorbedTotal: 0,
    prayerTimerSec: null,        // PER_TICK_HOOK에서 meta.prayerDurationSec로 초기화
    prayerTicksDone: 0,
    nextAttackBonus: 0,
    skipNextAttack: false,
    bahramGauge: 0,
    bahramWarningLogged: false,
    bahramFired: false,
  };
}

function getHwabosaMeta(pattern: BossPatternDef | null) {
  const skill = pattern?.skills.find(s => s.type === 'hwabosa_attack');
  return skill?.hwabosaSkills ?? null;
}

// 자기 불씨 공격력 감쇠 (1스택당 -5%, 최대 20스택 캡)
function hwabosaSelfBurnDamageMult(phase: Phase, stacks: number): number {
  if (phase === 'liberation' || phase === 'ascension') return 1.0;
  return Math.max(0, 1 - Math.min(stacks, 20) * 0.05);
}

// 자기 불씨 공속 감쇠 (interval ×(1 + 5% × stacks), 최대 16스택 캡 → ×1.8)
function hwabosaSelfBurnIntervalMult(phase: Phase, stacks: number): number {
  if (phase === 'ascension') return 1.0;
  return 1 + Math.min(stacks, 16) * 0.05;
}

// PER_TICK_HOOK: 기도 타이머를 매 게임 틱마다 감소 (공격 이벤트와 무관)
function hwabosaPrayerTick(ctx: TickContext, pattern: BossPatternDef | null): void {
  if (ctx.currentEnemy?.id !== HWABOSA_ID) return;
  if (!ctx.bossPatternState) return;
  const st = ctx.bossPatternState.monsterState;
  if (st?.kind !== HWABOSA_ID) return;
  if (st.phase !== 'prayer') return;

  const meta = getHwabosaMeta(pattern);
  if (!meta) return;

  const prayerDur = meta.prayerDurationSec;
  const prayerTickInterval = meta.prayerTickIntervalSec;
  const prayerStackPerTick = meta.prayerStackPerTick;

  // 첫 호출 시 타이머 초기화 + 시작 로그
  if (st.prayerTimerSec === null) {
    st.prayerTimerSec = prayerDur;
    if (meta.prayerStartLog) {
      ctx.logFlavor(meta.prayerStartLog, 'right', { actor: 'enemy' });
    }
  }

  const prevTimer = st.prayerTimerSec;
  const nextTimer = Math.max(0, prevTimer - ctx.dt);
  st.prayerTimerSec = nextTimer;

  // prayerTickInterval 간격으로 쌍방 불씨 부여
  const elapsed = prayerDur - nextTimer;
  const maxTicks = Math.floor(prayerDur / prayerTickInterval);
  const targetTicksDone = Math.min(Math.floor(elapsed / prayerTickInterval), maxTicks);
  while (st.prayerTicksDone < targetTicksDone) {
    st.selfBurnStacks += prayerStackPerTick;
    ctx.bossPatternState.playerDotStacks = applyEmberStack(ctx.bossPatternState.playerDotStacks, prayerStackPerTick);
    const tickLogs = meta.prayerTickLogs;
    if (tickLogs && tickLogs.length > 0) {
      const msg = tickLogs[Math.floor(Math.random() * tickLogs.length)];
      ctx.logFlavor(msg, 'right', { actor: 'enemy' });
      ctx.logEvent({
        side: 'incoming', actor: 'enemy',
        chips: [{ kind: 'fire', label: '불씨', count: prayerStackPerTick }],
      });
    }
    st.prayerTicksDone += 1;
  }

  // 기도 종료 → worship 전환
  if (nextTimer <= 0) {
    st.phase = 'worship';
    if (meta.prayerEndLog) {
      ctx.logFlavor(meta.prayerEndLog, 'right', { actor: 'enemy' });
    }
  }
}

// PRE_SKILL_LOOP_HOOK: 공속 감쇠 재계산 → 기도 중 공격 스킵 → 페이즈 전환 후 공격 스킵
function advanceHwabosaPreAttack(ctx: TickContext, _pattern: BossPatternDef | null): boolean {
  if (ctx.currentEnemy?.id !== HWABOSA_ID) return false;
  if (!ctx.bossPatternState || !ctx.currentEnemy) return false;
  const st = ctx.bossPatternState.monsterState;
  if (st?.kind !== HWABOSA_ID) return false;

  const phase = st.phase;
  const selfBurn = st.selfBurnStacks;

  // 1. 자기 불씨 공속 감쇠 재계산
  if (ctx.bossPatternState.baseAttackInterval != null) {
    const intervalMult = hwabosaSelfBurnIntervalMult(phase, selfBurn);
    const newInterval = ctx.bossPatternState.baseAttackInterval * intervalMult;
    if (ctx.currentEnemy.attackInterval !== newInterval) {
      ctx.currentEnemy = { ...ctx.currentEnemy, attackInterval: newInterval };
    }
  }

  // 2. 기도 중 공격 스킵 (타이머 처리는 hwabosaPrayerTick PER_TICK_HOOK에서)
  if (phase === 'prayer') {
    return true;
  }

  // 3. 페이즈 전환 직후 1회 공격 스킵
  if (st.skipNextAttack) {
    st.skipNextAttack = false;
    return true;
  }

  return false;
}

// 페이즈별 분포로 스킬 선택 (검보사 pickSkill 패턴)
function pickHwabosaSkill(
  phase: Phase,
  meta: NonNullable<ReturnType<typeof getHwabosaMeta>>,
): HwabosaSkillKind {
  const roll = Math.random();

  if (phase === 'worship') {
    const d = meta.phase1Dist;
    if (roll < d.flameSwing) return 'flameSwing';
    if (roll < d.flameSwing + d.atarBrand) return 'atarBrand';
    return 'ashaMeditation';
  }
  if (phase === 'meditation') {
    const d = meta.phase2Dist;
    let acc = d.flameSwing;
    if (roll < acc) return 'flameSwing';
    acc += d.atarBrand;
    if (roll < acc) return 'atarBrand';
    acc += d.ashaMeditation;
    if (roll < acc) return 'ashaMeditation';
    return 'verethragna';
  }
  if (phase === 'liberation') {
    const d = meta.phase3Dist;
    let acc = d.flameSwing;
    if (roll < acc) return 'flameSwing';
    acc += d.atarBrand;
    if (roll < acc) return 'atarBrand';
    acc += d.ashaMeditation;
    if (roll < acc) return 'ashaMeditation';
    acc += d.verethragna;
    if (roll < acc) return 'verethragna';
    return 'druzVerdict';
  }
  // ascension (phase 4)
  const d = meta.phase4Dist;
  let acc = d.atarBrand;
  if (roll < acc) return 'atarBrand';
  acc += d.ashaMeditation;
  if (roll < acc) return 'ashaMeditation';
  acc += d.verethragna;
  if (roll < acc) return 'verethragna';
  acc += d.druzVerdict;
  if (roll < acc) return 'druzVerdict';
  return 'atashBahram';
}

// IN_ATTACK_RESOLVE_HOOK: 화보사의 모든 공격 처리
function applyHwabosaAttack(
  ctx: TickContext,
  pattern: BossPatternDef | null,
  extras: InAttackResolveExtras,
): boolean {
  if (ctx.currentEnemy?.id !== HWABOSA_ID) return false;
  if (!ctx.bossPatternState || !ctx.currentEnemy) return false;
  const st = ctx.bossPatternState.monsterState;
  if (st?.kind !== HWABOSA_ID) return false;
  const meta = getHwabosaMeta(pattern);
  if (!meta) return false;

  const { monAttackMult, effectiveExternalDmgRed } = extras;
  const monDef = getMonsterDef(ctx.currentEnemy.id);
  const eName = monDef?.name ?? ctx.currentEnemy.id;
  const phase: Phase = st.phase;
  const selfBurn = st.selfBurnStacks;

  // 자기 불씨 공격력 감쇠 반영된 실효 공격력
  const damageMult = hwabosaSelfBurnDamageMult(phase, selfBurn);
  const effectiveAtk = ctx.currentEnemy.attackPower * damageMult;

  // 1. 스킬 선택
  let chosen: HwabosaSkillKind = pickHwabosaSkill(phase, meta);

  // 2. 강림 페이즈 치환: 아타시 바흐람 뽑혔는데 게이지 미충만 → 베레트라그나로 치환
  if (chosen === 'atashBahram' && st.bahramGauge < meta.bahramGaugeMax) {
    chosen = 'verethragna';
  }

  // 공통 데미지 적용 헬퍼 (묵상 nextAttackBonus 를 배율에 녹임 → 분산은 effectiveAtk 에만)
  const nextAttackBonus = st.nextAttackBonus;
  const applyDamage = (
    skillMult: number,
    name: string,
    chips?: { kind: 'fire'; label: string; count: number }[],
  ): number => {
    const finalMult = skillMult * monAttackMult * (1 + nextAttackBonus);
    let dmg = calcEnemyDamage(
      effectiveAtk,
      finalMult,
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

  // 피해 스킬 여부 (묵상 nextAttackBonus 소모 트리거)
  let damageDealtSkill = false;

  // 스킬별 분기
  if (chosen === 'flameSwing') {
    if (Math.random() < ctx.dodgeRate) {
      handleDodge(ctx, eName);
    } else {
      const attackMsgs = monDef?.attackMessages ?? [];
      const msg = attackMsgs.length ? attackMsgs[Math.floor(Math.random() * attackMsgs.length)] : '';
      if (msg) ctx.logFlavor(msg, 'right', { actor: 'enemy' });
      applyDamage(meta.flameSwing.mult, '성화 휘두르기');
      if (!ctx.isSimulating) ctx.enemyAnim = 'attack';
      damageDealtSkill = true;
    }
  } else if (chosen === 'atarBrand') {
    if (Math.random() < ctx.dodgeRate) {
      handleDodge(ctx, `${eName}의 아타르의 낙인`);
    } else {
      const logs = meta.atarBrand.logs;
      const msg = logs.length ? logs[Math.floor(Math.random() * logs.length)] : '';
      if (msg) ctx.logFlavor(msg, 'right', { actor: 'enemy' });
      // 쌍방 +N: 자기 + 플레이어
      st.selfBurnStacks += meta.atarBrand.selfEmberGain;
      ctx.bossPatternState.playerDotStacks = applyEmberStack(ctx.bossPatternState.playerDotStacks, meta.atarBrand.playerEmberGain);
      applyDamage(meta.atarBrand.mult, '아타르의 낙인',
        [{ kind: 'fire', label: '불씨', count: meta.atarBrand.playerEmberGain }]);
      if (!ctx.isSimulating) ctx.enemyAnim = 'attack';
      damageDealtSkill = true;
    }
  } else if (chosen === 'verethragna') {
    if (Math.random() < ctx.dodgeRate) {
      handleDodge(ctx, `${eName}의 베레트라그나`);
    } else {
      const logs = meta.verethragna.logs;
      const msg = logs.length ? logs[Math.floor(Math.random() * logs.length)] : '';
      if (msg) ctx.logFlavor(msg, 'right', { actor: 'enemy' });
      st.selfBurnStacks += meta.verethragna.selfEmberGain;
      ctx.bossPatternState.playerDotStacks = applyEmberStack(ctx.bossPatternState.playerDotStacks, meta.verethragna.playerEmberGain);
      applyDamage(meta.verethragna.mult, '베레트라그나',
        [{ kind: 'fire', label: '불씨', count: meta.verethragna.playerEmberGain }]);
      if (!ctx.isSimulating) ctx.enemyAnim = 'attack';
      damageDealtSkill = true;
    }
  } else if (chosen === 'ashaMeditation') {
    // 자기 불씨 흡수 → 힐 + nextAttackBonus 누적
    const absorb = Math.min(
      st.selfBurnStacks,
      meta.ashaMeditation.maxAbsorbPerUse,
    );
    if (absorb <= 0) {
      // 흡수할 불씨 없음 → emptyLogs 1종 송출, 피해 0
      const emptyLogs = meta.ashaMeditation.emptyLogs;
      if (emptyLogs && emptyLogs.length > 0) {
        const msg = emptyLogs[Math.floor(Math.random() * emptyLogs.length)];
        ctx.logFlavor(msg, 'right', { actor: 'enemy' });
      }
    } else {
      st.selfBurnStacks -= absorb;
      st.absorbedTotal += absorb;
      // 자기 힐 — ctx.currentEnemy 의 hp 를 수정 (ctx.hp/ctx.maxHp 는 플레이어)
      const healAmt = Math.floor(ctx.currentEnemy.maxHp * meta.ashaMeditation.healPercentPerStack * absorb);
      ctx.currentEnemy = {
        ...ctx.currentEnemy,
        hp: Math.min(ctx.currentEnemy.hp + healAmt, ctx.currentEnemy.maxHp),
      };
      // 다음 공격 버프 누적 (상한 없음 — 스펙 기본)
      st.nextAttackBonus += absorb * meta.ashaMeditation.nextAttackBonusPerStack;

      const logs = meta.ashaMeditation.logs;
      const msg = logs.length ? logs[Math.floor(Math.random() * logs.length)] : '';
      if (msg) ctx.logFlavor(msg, 'right', { actor: 'enemy' });
      ctx.logEvent({
        side: 'incoming', actor: 'enemy',
        name: '아샤의 묵상', tag: 'heal', value: healAmt, valueTier: 'heal',
        chips: [{ kind: 'fire', label: '자신 불씨', count: -absorb }],
      });

      // 강림 페이즈: 흡수 스택당 아타시 게이지 추가 충전
      if (phase === 'ascension') {
        const gained = absorb * meta.bahramGainPerAbsorbStack;
        st.bahramGauge = Math.min(meta.bahramGaugeMax, st.bahramGauge + gained);
      }
    }
    if (!ctx.isSimulating) ctx.enemyAnim = 'attack';
  } else if (chosen === 'druzVerdict') {
    // 드루즈 단죄 — 스냅샷 합산 스택 × 계수 × atk, 회피 불가
    const burnStacks = meta.druzBurnSelfOnly
      ? st.selfBurnStacks
      : st.selfBurnStacks
        + (ctx.bossPatternState.playerDotStacks?.find(d => d.id === 'ember')?.stacks ?? 0);

    // 스냅샷 damagePerTick — variance 는 gameLoop 의 tick 마다 적용
    // 기본 수식: atk × coefficient × burnStacks (감쇠·버프 미적용, 분산 없음 — gameLoop 에서 적용)
    const dmgPerTick = effectiveAtk * meta.druzVerdict.dotCoefficient * burnStacks;
    ctx.bossPatternState.playerDotStacks = applyDruzeSnapshot(
      ctx.bossPatternState.playerDotStacks ?? [],
      dmgPerTick,
      meta.druzVerdict.durationSec,
    );

    // 자기 불씨 +selfEmberGain
    st.selfBurnStacks += meta.druzVerdict.selfEmberGain;

    if (meta.druzVerdict.log) {
      ctx.logFlavor(meta.druzVerdict.log, 'right', { actor: 'enemy' });
    }
    ctx.logEvent({
      side: 'incoming', actor: 'enemy',
      name: '드루즈 단죄', tag: 'special', value: '—', valueTier: 'muted',
    });

    // 드루즈는 피해 0, nextAttackBonus 는 소모만 (실효 0)
    st.nextAttackBonus = 0;
    if (!ctx.isSimulating) ctx.enemyAnim = 'attack';
  } else if (chosen === 'atashBahram') {
    // 아타시 바흐람 — 피해 0, 쌍방 +15, 게이지 리셋
    st.selfBurnStacks += meta.atashBahram.selfEmberGain;
    ctx.bossPatternState.playerDotStacks = applyEmberStack(ctx.bossPatternState.playerDotStacks, meta.atashBahram.playerEmberGain);
    st.bahramGauge = 0;
    st.bahramWarningLogged = false; // 스펙 §9-2: 게이지 리셋 후 24 재도달 시 경고 재출력
    st.bahramFired = true;
    st.nextAttackBonus = 0; // 소모만, 실효 0

    if (meta.atashBahram.activationLog) {
      ctx.logFlavor(meta.atashBahram.activationLog, 'right', { actor: 'enemy' });
    }
    ctx.logEvent({
      side: 'incoming', actor: 'enemy',
      name: '아타시 바흐람', tag: 'special', value: '—', valueTier: 'muted',
      chips: [{ kind: 'fire', label: '불씨', count: meta.atashBahram.playerEmberGain }],
    });
    if (!ctx.isSimulating) ctx.enemyAnim = 'attack';
  }

  // 3. 피해 스킬이면 nextAttackBonus 소모 (판정 직후)
  //    드루즈/아타시는 위에서 직접 0 으로 처리했으므로 중복되어도 동일
  if (damageDealtSkill) {
    st.nextAttackBonus = 0;
  }

  // 4. 페이즈 전환 판정 (묵상 직후에만 absorbedTotal 이 변화하므로, 여기서 검사)
  //    단방향 락: phase enum 의 현재 값 가드만으로 로그 1회 보장.
  //    if-else-if 체인 → 한 턴에 1회만 전환, 남은 전환은 다음 묵상 턴에 이어짐.
  if (chosen === 'ashaMeditation') {
    const thresholds = meta.phaseAbsorptionThresholds;
    const absorbed = st.absorbedTotal;
    const entryEmber = meta.phaseEntrySelfEmber;
    const logs = meta.phaseTransitionLogs;

    if (phase === 'worship' && absorbed >= thresholds[0]) {
      st.phase = 'meditation';
      st.selfBurnStacks += entryEmber;
      st.skipNextAttack = true;
      if (logs.worshipToMeditation) {
        ctx.logFlavor(logs.worshipToMeditation, 'right', { actor: 'enemy' });
      }
      // 아타르의 가호 활성 로그 (meditation 진입 시)
      if (logs.gohoActivationLog) {
        ctx.logFlavor(logs.gohoActivationLog, 'right', { actor: 'enemy', minor: true });
      }
    } else if (phase === 'meditation' && absorbed >= thresholds[1]) {
      st.phase = 'liberation';
      st.selfBurnStacks += entryEmber;
      st.skipNextAttack = true;
      if (logs.meditationToLiberation) {
        ctx.logFlavor(logs.meditationToLiberation, 'right', { actor: 'enemy' });
      }
    } else if (phase === 'liberation' && absorbed >= thresholds[2]) {
      st.phase = 'ascension';
      st.selfBurnStacks += entryEmber;
      st.skipNextAttack = true;
      st.bahramGauge = 0; // 강림 진입 시 게이지 리셋 (최초 0→30 누적 시작)
      if (logs.liberationToAscension) {
        ctx.logFlavor(logs.liberationToAscension, 'right', { actor: 'enemy' });
      }
    }
  }

  // 5. 아타시 게이지 충전 (강림 페이즈에서만, 공격 1회당 +bahramGainPerAttack)
  //    묵상 흡수 스택당 추가 충전은 ashaMeditation 분기에서 이미 처리됨.
  //    게이지 경고: 24 도달 1회만 출력
  if (st.phase === 'ascension' && chosen !== 'atashBahram') {
    const before = st.bahramGauge;
    const after = Math.min(meta.bahramGaugeMax, before + meta.bahramGainPerAttack);
    st.bahramGauge = after;
    if (before < meta.bahramWarningThreshold
        && after >= meta.bahramWarningThreshold
        && !st.bahramWarningLogged) {
      st.bahramWarningLogged = true;
      if (meta.atashBahram.warningLog) {
        ctx.logFlavor(meta.atashBahram.warningLog, 'right', { actor: 'enemy' });
      }
    }
  }

  return true;
}

export function registerBaehwaHwabosa(): void {
  PER_TICK_HOOKS.push(hwabosaPrayerTick);
  PRE_SKILL_LOOP_HOOKS.push(advanceHwabosaPreAttack);
  IN_ATTACK_RESOLVE_HOOKS.push(applyHwabosaAttack);
  MONSTER_STATE_FACTORIES[HWABOSA_ID] = createHwabosaInitialState;
  // SKILL_HANDLERS 등록 없음 — hwabosa_attack 은 enemyCombat.ts skip 목록에서 통과
}

// BOSS_PATTERNS 간접 참조 제거용 no-op (tree-shake 방지)
void BOSS_PATTERNS;
