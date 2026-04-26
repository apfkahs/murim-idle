// 배화교 외문수좌 — 2페이즈 보스 핸들러
//   P1-A: 사제 톤. 평타/공양/회수 + 성화 권능 게이지 (HP 50% 또는 게이지 100 → P1-B)
//   P1-B: 사제 톤. 영의 고함/권능의 구각/불꽃의 인/불의 단련 + 강림의 결 게이지 (게이지 100 → 성화의 강림)
//   전환: HP 0 도달 시 100% 회복 + 15초 양측 액션락 (gameLoop 가로채기 분기에서 처리)
//   P2: 광전사 톤. 광화 평타 ×1.3 / 광분의 연격 / 업화 일격 / 아타르의 채찍 + 분노 가속(50%/25%)
//
// 훅 분담:
//   PER_TICK: playerMaxQiBase 캡처, 페이즈 자동 전환, 게이지 자동 증감(P1-B), 디버프 타이머 감산,
//             p2 분노 가속, 권능의 구각 자가 힐
//   PRE_SKILL_LOOP: currentSkillId 추첨 (return false — globalActionLockTimer가 글로벌 가드)
//   IN_ATTACK_RESOLVE: phase별 데미지/효과 적용
import type { TickContext } from '../../tickContext';
import type { BossPatternDef } from '../../../../data/monsters';
import { getMonsterDef } from '../../../../data/monsters';
import { calcEnemyDamage } from '../../damageCalc';
import { handleDodge } from '../../tickContext';
import { calcStamina } from '../../../combatCalc';
import { applyEmberStack, getEmberStacks, consumeEmberStacks } from '../../emberUtils';
import { applyOemunBurnSnapshot } from '../../druzeUtils';
import {
  PER_TICK_HOOKS, PRE_SKILL_LOOP_HOOKS, IN_ATTACK_RESOLVE_HOOKS, MONSTER_STATE_FACTORIES,
  type InAttackResolveExtras,
} from '../registry';

const SUJA_ID = 'baehwa_oemun_suja';

// P1-B 추첨 키 (currentSkillId)
type P1bSkillId =
  | 'normal'
  | 'soul_shout'      // 영의 고함
  | 'power_shell'     // 권능의 구각
  | 'flame_seal'      // 불꽃의 인
  | 'flame_drill'     // 불의 단련
  | 'ascension';      // 성화의 강림

// P2 추첨 키
type P2SkillId =
  | 'normal'          // 광화 평타
  | 'frenzy_combo'    // 광분의 연격
  | 'pyre_strike'     // 업화 일격
  | 'atar_whip';      // 아타르의 채찍

export interface OemunSujaState {
  readonly kind: typeof SUJA_ID;
  phase: 'p1a' | 'p1b' | 'transition' | 'p2';
  sacredFireGauge: number;       // 0~100, P1-A 성화 권능 게이지
  descentGauge: number;          // 0~100, P1-B 강림의 결 게이지
  absorbedEmberStacks: number;   // P1 전체 누적 회수량 (P2 공양의 회수 산정 기준)
  transitionTimer: number;       // 페이즈 전환 카운트다운 (15.0 → 0)
  hasTriggeredP2: boolean;       // P2 회복 1회만 발동
  younguiCdRemaining: number;    // 영의 고함 자체 쿨 (10초)
  gugakRemaining: number;        // 권능의 구각 지속 (10초)
  younguiBuffRemaining: number;  // 영의 고함 자버프 지속 (6초)
  shellDodgeBuffStacks: number;  // 권능의 구각 회피 후 강화 타격 잔여 횟수 (0~3)
  currentSkillId: P1bSkillId | P2SkillId | null;
  p2Multipliers: { atkMult: number; dmgTakenMult: number } | null;
  p2RageStage: 0 | 1 | 2;        // 0: 정상, 1: HP50%↓ 1.7s, 2: HP25%↓ 1.4s (1회만 갱신)
  transitionLogStage: 0 | 1 | 2 | 3 | 4;  // 전환 연출 중 단계별 분위기 로그 진행도(0→4)
}

export function createOemunSujaInitialState(): OemunSujaState {
  return {
    kind: SUJA_ID,
    phase: 'p1a',
    sacredFireGauge: 0,
    descentGauge: 0,
    absorbedEmberStacks: 0,
    transitionTimer: 0,
    hasTriggeredP2: false,
    younguiCdRemaining: 0,
    gugakRemaining: 0,
    younguiBuffRemaining: 0,
    shellDodgeBuffStacks: 0,
    currentSkillId: null,
    p2Multipliers: null,
    p2RageStage: 0,
    transitionLogStage: 0,
  };
}

// PER_TICK_HOOK: 캡처/전환/게이지/타이머/분노 가속
function perTickOemunSuja(ctx: TickContext, _pattern: BossPatternDef | null): void {
  if (ctx.currentEnemy?.id !== SUJA_ID) return;
  if (!ctx.bossPatternState || !ctx.currentEnemy) return;
  const st = ctx.bossPatternState.monsterState;
  if (st?.kind !== SUJA_ID) return;

  const dt = ctx.dt;

  // (a) playerMaxQiBase 캡처 (디버프 적용 전 원본 max stamina)
  if (ctx.bossPatternState.playerMaxQiBase == null) {
    ctx.bossPatternState.playerMaxQiBase = calcStamina(ctx.stats.sim, ctx.tierMult);
  }

  // (b) 디버프/지속 타이머 감산
  if (st.younguiCdRemaining > 0) st.younguiCdRemaining = Math.max(0, st.younguiCdRemaining - dt);
  if (st.younguiBuffRemaining > 0) st.younguiBuffRemaining = Math.max(0, st.younguiBuffRemaining - dt);
  if (st.gugakRemaining > 0) {
    const next = Math.max(0, st.gugakRemaining - dt);
    st.gugakRemaining = next;
    if (next <= 0) st.shellDodgeBuffStacks = 0; // 지속 종료 시 회피 강화 잔여 소멸
  }
  if (st.transitionTimer > 0) st.transitionTimer = Math.max(0, st.transitionTimer - dt);

  // (b-2) 전환 연출 중(15초) 사이사이 분위기 로그 출력 — 게임이 멈춘 게 아니라는 신호.
  // 진입 직후 큰 로그(아타시 바흐람 강림)는 gameLoop가 출력. 여기서는 12s/9s/6s/3s 시점에 한 줄씩.
  if (st.phase === 'transition' && st.transitionLogStage < 4) {
    const TRANSITION_THRESHOLDS = [12, 9, 6, 3] as const;
    const TRANSITION_FLAVORS = [
      '*외문수좌의 사제복 안쪽에서, 붉은 빛이 한 번 흘러나왔다 사라진다.*',
      '*그의 손등 위로 보이지 않는 불꽃이 결을 그리며 흘러내린다. 입가의 미소는 어느새 굳어 있다.*',
      '*외문수좌가 천천히 옷자락의 매듭 하나를 풀어낸다. 사제로서의 단정함이 한 겹 벗겨진다.*',
      '*그의 호흡이 점점 거칠어진다. 입에서 새어 나오는 한 줄의 청원이 어느새 짐승의 으르렁거림에 가까워진다.*',
    ] as const;
    const TRANSITION_DIALOGUES = [
      '「······잠시, 호흡을 고르겠습니다.」',
      '「······참아 왔던 것이, 손끝에서 자꾸 새어 나오는군요.」',
      '「······죄송합니다. 더는, 사제로서 마주할 수가 없겠습니다.」',
      '「······너는, 내가 직접 끝낸다.」',
    ] as const;
    const stage = st.transitionLogStage;
    if (st.transitionTimer <= TRANSITION_THRESHOLDS[stage]) {
      ctx.logFlavor(TRANSITION_FLAVORS[stage], 'right', { actor: 'enemy' });
      ctx.logDialogue(TRANSITION_DIALOGUES[stage], 'right', { actor: 'enemy' });
      st.transitionLogStage = (stage + 1) as 0 | 1 | 2 | 3 | 4;
    }
  }

  // (c) p1a → p1b 자동 전환 (HP ≤ 50% OR sacredFireGauge ≥ 100)
  if (st.phase === 'p1a') {
    const hpRatio = ctx.currentEnemy.hp / ctx.currentEnemy.maxHp;
    if (hpRatio <= 0.5 || st.sacredFireGauge >= 100) {
      st.phase = 'p1b';
      st.sacredFireGauge = 0;
      st.descentGauge = 0;
      st.younguiCdRemaining = 0;
      st.gugakRemaining = 0;
      st.younguiBuffRemaining = 0;
      st.shellDodgeBuffStacks = 0;
      ctx.logLaw({
        lawFlavor: '*외문수좌가 천천히 손을 가슴 앞으로 모은다. 그의 입에서 한 줄의 구절이 흘러나오자, 공기 위에 보이지 않는 결이 한 겹 더 쌓인다.*',
        lawName: '배화의 전언(傳言) · 외문수좌',
        lawText: '「이제부터는 조금 다르게 해 봅시다. 아타르께서 직접 거드실 차례입니다.」',
      });
    }
  }

  // (d) transition → p2 자동 전환 (transitionTimer 만료)
  if (st.phase === 'transition' && st.transitionTimer <= 0) {
    st.phase = 'p2';
    // P2 영구 버프: 광화 기본 강화 ×1.3 / 받피감 -25% + 공양의 회수 N 보너스(곱연산 누적)
    const N = st.absorbedEmberStacks;
    const P2_BASE_ATK_MULT = 1.3;      // 광화 — 기본 공격력 1.3배
    const P2_BASE_DMG_TAKEN_MULT = 0.75; // 광화 — 받는 피해 -25%
    const offeringAtkBonus = Math.min(1 + 0.06 * N, 4.0);
    const offeringDmgTakenBonus = Math.max(1 - 0.04 * N, 0.4);
    const atkMult = P2_BASE_ATK_MULT * offeringAtkBonus;
    const dmgTakenMult = P2_BASE_DMG_TAKEN_MULT * offeringDmgTakenBonus;
    st.p2Multipliers = { atkMult, dmgTakenMult };
    ctx.bossPatternState.bossDamageTakenMultiplier = dmgTakenMult;
    // 광화: 공속 2.1초로 영구 변경 (호위 패턴 — baseAttackInterval 권위 갱신).
    ctx.bossPatternState.baseAttackInterval = 2.1;
    ctx.currentEnemy = { ...ctx.currentEnemy, attackInterval: 2.1 };
    ctx.bossPatternState.bossChargeStunImmune = true; // 광화 — 스턴 면역
    const dmgTakenPct = Math.round((1 - dmgTakenMult) * 100);
    const atkPct = Math.round((atkMult - 1) * 100);
    ctx.logLaw({
      lawFlavor: '*수좌의 얼굴에서 사제의 단정함이 벗겨지고, 눈동자 안쪽에 붉은 불꽃이 자리를 잡는다.*',
      lawName: '공양의 회수(供養의 回收) · 외문수좌',
      lawText: `「네가 흘린 불씨, 남김없이 돌려받는다. — 받는 피해 -${dmgTakenPct}%, 공격력 +${atkPct}%.」`,
    });
  }

  // (e) p1b 강림의 결 게이지 자동 증감 (플레이어 불씨 스택 기반).
  // 매 틱 dt 만큼 비례 적용 — 공격 주기와 분리해 dt 단위로 감산/누적.
  // 메모: 사용자 메시지 "주기당 -5/+5/+10/+15"을 1초 기준으로 환산. (공격 주기 ~2.4s ≈ -12/+12/+24/+36 매 주기)
  // 게이지 100 도달 시 ascension 강제는 PRE_SKILL_LOOP 추첨에서 처리.
  if (st.phase === 'p1b') {
    const emberStacks = getEmberStacks(ctx.bossPatternState.playerDotStacks);
    let perSec = 0;
    if (emberStacks <= 2) perSec = -5 / 2.4;
    else if (emberStacks <= 5) perSec = 5 / 2.4;
    else if (emberStacks <= 8) perSec = 10 / 2.4;
    else perSec = 15 / 2.4;
    const next = st.descentGauge + perSec * dt;
    st.descentGauge = Math.min(100, Math.max(0, next));
  }

  // (f) p1b 권능의 구각 — 매 주기 자가 힐 (지속 동안 dt 비례 적용)
  // 1주기(2.4s)당 maxHp × emberStacks × 0.01 → dt 비례로 환산.
  if (st.phase === 'p1b' && st.gugakRemaining > 0) {
    const emberStacks = getEmberStacks(ctx.bossPatternState.playerDotStacks);
    if (emberStacks > 0) {
      const healPerSec = ctx.currentEnemy.maxHp * emberStacks * 0.01 / 2.4;
      const newHp = Math.min(ctx.currentEnemy.hp + healPerSec * dt, ctx.currentEnemy.maxHp);
      ctx.currentEnemy = { ...ctx.currentEnemy, hp: newHp };
    }
  }

  // (g) p2 분노 가속 — HP 50%/25% 진입 시 baseAttackInterval permanent 갱신 (각 단계 1회)
  if (st.phase === 'p2') {
    const hpRatio = ctx.currentEnemy.hp / ctx.currentEnemy.maxHp;
    if (st.p2RageStage < 2 && hpRatio <= 0.25) {
      st.p2RageStage = 2;
      ctx.bossPatternState.baseAttackInterval = 1.4;
      ctx.currentEnemy = { ...ctx.currentEnemy, attackInterval: 1.4 };
    } else if (st.p2RageStage < 1 && hpRatio <= 0.5) {
      st.p2RageStage = 1;
      ctx.bossPatternState.baseAttackInterval = 1.7;
      ctx.currentEnemy = { ...ctx.currentEnemy, attackInterval: 1.7 };
    }
  }

  // (h) 권능의 구각 활성 동안 보스 회피 25%, 비활성 시 0 (외문수좌 전투 한정)
  ctx.bossPatternState.enemyDodgeRate = st.gugakRemaining > 0 ? 0.25 : 0;
}

// PRE_SKILL_LOOP_HOOK: 매 공격 주기 발동할 스킬을 추첨해 monsterState.currentSkillId 에 저장만.
// return false — globalActionLockTimer 가 글로벌 가드 역할(playerCombat/enemyCombat 진입부에서 차단).
function preSkillOemunSuja(ctx: TickContext, _pattern: BossPatternDef | null): boolean {
  if (ctx.currentEnemy?.id !== SUJA_ID) return false;
  if (!ctx.bossPatternState || !ctx.currentEnemy) return false;
  const st = ctx.bossPatternState.monsterState;
  if (st?.kind !== SUJA_ID) return false;

  // transition: 액션락 중 — 추첨 X
  if (st.phase === 'transition') {
    st.currentSkillId = null;
    return false;
  }

  // p1a: 평타/공양/회수 분배 (40 / 35 / 25)
  if (st.phase === 'p1a') {
    const r = Math.random();
    let id: P1bSkillId;
    if (r < 0.35) id = 'flame_seal';      // 임시 키 재사용 — IN_ATTACK_RESOLVE에서 p1a 분기로 재해석
    else if (r < 0.60) id = 'flame_drill'; // 임시 키 재사용 (p1a: 회수)
    else id = 'normal';
    st.currentSkillId = id;
    // 주의: p1a는 IN_ATTACK_RESOLVE 에서 자체 키('p1a_offering' 등 대신) 분기 — 아래 처리에서 직접 다시 추첨.
    return false;
  }

  // p1b: 강림의 결 게이지 100 → ascension 강제
  if (st.phase === 'p1b') {
    if (st.descentGauge >= 100) {
      st.currentSkillId = 'ascension';
      return false;
    }
    // 추첨 (영의 고함 25 / 권능의 구각 30 / 불꽃의 인 25 / 불의 단련 20). 영의 고함 쿨 중이면 제외 후 정규화.
    const younguiAvail = st.younguiCdRemaining <= 0;
    const w = {
      soul_shout: younguiAvail ? 25 : 0,
      power_shell: 30,
      flame_seal: 25,
      flame_drill: 20,
    };
    const total = w.soul_shout + w.power_shell + w.flame_seal + w.flame_drill;
    let r = Math.random() * total;
    let chosen: P1bSkillId;
    if ((r -= w.soul_shout) < 0) chosen = 'soul_shout';
    else if ((r -= w.power_shell) < 0) chosen = 'power_shell';
    else if ((r -= w.flame_seal) < 0) chosen = 'flame_seal';
    else chosen = 'flame_drill';
    st.currentSkillId = chosen;
    return false;
  }

  // p2: 광화 평타 / 광분의 연격 30 / 업화 일격 25 / 아타르의 채찍 20 / 평타 25
  if (st.phase === 'p2') {
    const r = Math.random();
    let chosen: P2SkillId;
    if (r < 0.30) chosen = 'frenzy_combo';
    else if (r < 0.55) chosen = 'pyre_strike';
    else if (r < 0.75) chosen = 'atar_whip';
    else chosen = 'normal';
    st.currentSkillId = chosen;
    return false;
  }

  return false;
}

// IN_ATTACK_RESOLVE_HOOK
// return true: 외문수좌가 공격을 직접 처리했으니 후속 체인(평타/legacy 스킬) 전체 스킵
function inResolveOemunSuja(
  ctx: TickContext,
  _pattern: BossPatternDef | null,
  extras: InAttackResolveExtras,
): boolean {
  if (ctx.currentEnemy?.id !== SUJA_ID) return false;
  if (!ctx.bossPatternState || !ctx.currentEnemy) return false;
  const st = ctx.bossPatternState.monsterState;
  if (st?.kind !== SUJA_ID) return false;

  // transition: 액션락 — 후속 체인 스킵
  if (st.phase === 'transition') return true;

  const monDef = getMonsterDef(SUJA_ID);
  const eName = monDef?.name ?? '외문수좌';
  const { monAttackMult: baseMonAttackMult, effectiveExternalDmgRed } = extras;

  // 영의 고함 자버프 ×1.3 (P1-B/P2 양쪽에서 공통 적용)
  const younguiBuff = st.younguiBuffRemaining > 0 ? 1.3 : 1;

  // P2 공양의 회수 atkMult (P1에서는 1.0)
  const p2Atk = st.phase === 'p2' && st.p2Multipliers ? st.p2Multipliers.atkMult : 1;

  // P2 불씨 동조 — 모든 공격에 ×(1 + 0.05 × min(emberStacks, 10)), 상한 +50%
  let emberSync = 1;
  if (st.phase === 'p2') {
    const ember = Math.min(getEmberStacks(ctx.bossPatternState.playerDotStacks), 10);
    emberSync = 1 + 0.05 * ember;
  }

  const monAttackMult = baseMonAttackMult * younguiBuff * p2Atk * emberSync;

  // 공통: 데미지 적용 헬퍼 (회피/방어 감산은 calcEnemyDamage 가 담당, 보스 받피감 등은 외부 layer)
  const applyHit = (mult: number, name: string, chips?: { kind: 'fire'; label: string; count: number }[]): boolean => {
    if (Math.random() < ctx.dodgeRate) {
      handleDodge(ctx, `${eName}의 ${name}`);
      return false;
    }
    let dmg = calcEnemyDamage(
      ctx.currentEnemy!.attackPower,
      mult * monAttackMult,
      ctx.dmgReduction,
      undefined,
      ctx.equipStats.bonusFixedDmgReduction ?? 0,
      effectiveExternalDmgRed,
    );
    dmg = Math.floor(dmg * (1 + (ctx.equipStats.bonusDmgTakenPercent ?? 0)));
    // 권능의 구각 회피 후 강화 타격 — stacks > 0 시 ×1.5 후 stacks 차감
    if (st.shellDodgeBuffStacks > 0 && dmg > 0) {
      dmg = Math.floor(dmg * 1.5);
      st.shellDodgeBuffStacks = Math.max(0, st.shellDodgeBuffStacks - 1);
    }
    ctx.hp -= dmg;
    ctx.currentBattleDamageTaken += dmg;
    ctx.currentBattleHitTakenCount += 1;
    if (dmg > ctx.currentBattleMaxIncomingHit) ctx.currentBattleMaxIncomingHit = dmg;
    ctx.logEvent({
      side: 'incoming', actor: 'enemy',
      name, tag: 'hit', value: dmg,
      valueTier: dmg > ctx.maxHp * 0.25 ? 'hit-heavy' : 'normal',
      chips,
    });
    if (!ctx.isSimulating) ctx.enemyAnim = 'attack';
    return true;
  };

  // ─────────────────────────────────────────────────────────────
  // P1-A: 평타 40 / 공양 35 / 회수 25 (currentSkillId 의 임시 키와 무관하게 자체 추첨)
  // ─────────────────────────────────────────────────────────────
  if (st.phase === 'p1a') {
    const r = Math.random();
    if (r < 0.35) {
      // 불씨의 공양 — ×1.0, 50% 확률 불씨+1, 게이지 +10
      const hit = applyHit(1.0, '불씨의 공양');
      if (hit) {
        st.sacredFireGauge = Math.min(100, st.sacredFireGauge + 10);
        if (Math.random() < 0.5) {
          ctx.bossPatternState.playerDotStacks = applyEmberStack(ctx.bossPatternState.playerDotStacks, 1);
          ctx.logEvent({ side: 'incoming', actor: 'enemy', chips: [{ kind: 'fire', label: '불씨', count: 1 }] });
        }
        ctx.logDialogue('「이 한 점을, 그대에게 의탁합니다. 부디 잘 보살펴 주십시오.」', 'right', { actor: 'enemy' });
      }
      return true;
    }
    if (r < 0.60) {
      // 불씨의 회수 — ×0.8, 명중 시 1~3 무작위 흡수, absorbedEmberStacks += 흡수, 플레이어 불씨 +2 되돌림, 게이지 +(흡수×5)
      // (회피되면 흡수 X)
      if (Math.random() < ctx.dodgeRate) {
        handleDodge(ctx, `${eName}의 불씨의 회수`);
        return true;
      }
      const playerEmber = getEmberStacks(ctx.bossPatternState.playerDotStacks);
      const want = 1 + Math.floor(Math.random() * 3); // 1~3
      const target = Math.min(want, playerEmber);
      let absorbed = 0;
      if (target > 0) {
        const { dots: consumedDots, consumed } = consumeEmberStacks(ctx.bossPatternState.playerDotStacks, target);
        if (consumed > 0) {
          ctx.bossPatternState.playerDotStacks = consumedDots;
          absorbed = consumed;
          st.absorbedEmberStacks += absorbed;
          st.sacredFireGauge = Math.min(100, st.sacredFireGauge + absorbed * 5);
        }
      }
      // 플레이어 불씨 +2 되돌림
      ctx.bossPatternState.playerDotStacks = applyEmberStack(ctx.bossPatternState.playerDotStacks, 2);
      const chips: { kind: 'fire'; label: string; count: number }[] = [];
      if (absorbed > 0) chips.push({ kind: 'fire', label: '회수', count: -absorbed });
      chips.push({ kind: 'fire', label: '불씨', count: 2 });
      applyHit(0.8, '불씨의 회수', chips);
      ctx.logDialogue('「맡기신 것 가운데 일부는, 다시 거두어 가겠습니다. 대신 작은 것 하나를 돌려드리지요.」', 'right', { actor: 'enemy' });
      return true;
    }
    // 평타 — ×1.0, 명중 시 게이지 +5
    const hit = applyHit(1.0, '평타');
    if (hit) st.sacredFireGauge = Math.min(100, st.sacredFireGauge + 5);
    return true;
  }

  // ─────────────────────────────────────────────────────────────
  // P1-B: currentSkillId 분기
  // ─────────────────────────────────────────────────────────────
  if (st.phase === 'p1b') {
    const id = st.currentSkillId;
    if (id === 'soul_shout') {
      // 영의 고함 — 발동 즉시 플레이어 스턴 2.5초, 자버프 +30% 6초, 자체 쿨 10초. 데미지 없음.
      ctx.playerStunTimer = Math.max(ctx.playerStunTimer, 2.5);
      st.younguiBuffRemaining = 6;
      st.younguiCdRemaining = 10;
      ctx.logFlavor('*외문수좌가 양손을 모으고 한 번 길게 호흡한다. 그의 입에서 흘러나온 한 줄이 당신의 숨을 멎게 한다.*', 'right', { actor: 'enemy' });
      ctx.logDialogue('「잠시만 말을 아껴 주시지요. 제 목소리가 들려야 합니다.」', 'right', { actor: 'enemy' });
      ctx.logEvent({ side: 'incoming', actor: 'enemy', name: '영의 고함', tag: 'special', value: '—', valueTier: 'muted' });
      return true;
    }
    if (id === 'power_shell') {
      // 권능의 구각 — gugakRemaining=10 (갱신). 발동 시 데미지 없음. 지속 효과는 PER_TICK + applyHit 분기에서 처리.
      st.gugakRemaining = 10;
      ctx.logFlavor('*외문수좌가 한 발짝 물러나, 사제복의 옷자락을 손으로 살짝 추켜올린다. 그의 발 아래 보이지 않는 결이 한 겹 깔린다.*', 'right', { actor: 'enemy' });
      ctx.logDialogue('「한 발짝 물러나 호흡을 고르겠습니다. 잠시 지켜보시지요.」', 'right', { actor: 'enemy' });
      ctx.logEvent({ side: 'incoming', actor: 'enemy', name: '권능의 구각', tag: 'special', value: '—', valueTier: 'muted' });
      return true;
    }
    if (id === 'flame_seal') {
      // 불꽃의 인 — ×1.4, 25% 불씨+1, 회복 -30% 8초 부여
      const hit = applyHit(1.4, '불꽃의 인');
      if (hit) {
        if (Math.random() < 0.25) {
          ctx.bossPatternState.playerDotStacks = applyEmberStack(ctx.bossPatternState.playerDotStacks, 1);
          ctx.logEvent({ side: 'incoming', actor: 'enemy', chips: [{ kind: 'fire', label: '불씨', count: 1 }] });
        }
        ctx.bossPatternState.playerRecoveryDebuff = { remainingSec: 8, pct: 0.3 };
        ctx.logDialogue('「이 인(印)이 새겨지는 동안은, 상처가 쉽게 아물지 않을 겁니다.」', 'right', { actor: 'enemy' });
      }
      return true;
    }
    if (id === 'flame_drill') {
      // 불의 단련 — ×0.7 × 3타. 각 타마다 25% 불씨+1.
      ctx.logFlavor('*외문수좌가 짧은 호흡을 세 번 끊어 낸다. 그 끊김의 결마다 채찍 같은 일격이 당신을 후린다.*', 'right', { actor: 'enemy' });
      ctx.logDialogue('「조금 더 숙련되도록 도와드리겠습니다. 세 번, 새겨 두십시오.」', 'right', { actor: 'enemy' });
      const hitChips: { kind: 'fire'; label: string; count: number }[] = [];
      for (let hi = 0; hi < 3; hi++) {
        const hit = applyHit(0.7, `${hi + 1}타`);
        if (hit && Math.random() < 0.25) {
          ctx.bossPatternState.playerDotStacks = applyEmberStack(ctx.bossPatternState.playerDotStacks, 1);
          hitChips.push({ kind: 'fire', label: '불씨', count: 1 });
        }
      }
      if (hitChips.length > 0) {
        ctx.logEvent({ side: 'incoming', actor: 'enemy', chips: hitChips });
      }
      return true;
    }
    if (id === 'ascension') {
      // 성화의 강림 — 기본 = atk×5 + 누적불씨×atk×0.8, playerMaxQiBase 만큼 고정 차감, floor(1) 보장,
      // 그 후 일반 감산(철칙·방어력 등) 정상 적용. 게이지 -100.
      // 분산은 적용하지 않는다 (스펙: 고정 차감 후 일반 감산).
      const atk = ctx.currentEnemy.attackPower;
      const playerEmber = getEmberStacks(ctx.bossPatternState.playerDotStacks);
      const rawBase = atk * 5 + playerEmber * atk * 0.8;
      const maxQiBase = ctx.bossPatternState.playerMaxQiBase ?? 0;
      const afterQiSubtract = Math.max(1, Math.floor(rawBase - maxQiBase));
      const reducer = (1 - ctx.dmgReduction / 100) * (1 - effectiveExternalDmgRed);
      let dmg = Math.max(0, Math.floor(afterQiSubtract * reducer) - (ctx.equipStats.bonusFixedDmgReduction ?? 0));
      dmg = Math.floor(dmg * (1 + (ctx.equipStats.bonusDmgTakenPercent ?? 0)));
      if (dmg < 1) dmg = 1;
      // 권능의 구각 회피 후 강화 타격 잔여
      if (st.shellDodgeBuffStacks > 0) {
        dmg = Math.floor(dmg * 1.5);
        st.shellDodgeBuffStacks = Math.max(0, st.shellDodgeBuffStacks - 1);
      }
      ctx.hp -= dmg;
      ctx.currentBattleDamageTaken += dmg;
      ctx.currentBattleHitTakenCount += 1;
      if (dmg > ctx.currentBattleMaxIncomingHit) ctx.currentBattleMaxIncomingHit = dmg;
      st.descentGauge = Math.max(0, st.descentGauge - 100);
      ctx.logLaw({
        lawFlavor: '*외문수좌가 두 손을 가슴 위로 모은다. 그의 입에서 한 줄의 청원이 흘러나오자, 머리 위로 거대한 그림자가 드리워진다.*',
        lawName: '성화의 강림(聖火의 降臨) · 외문수좌',
        lawText: '「아타르시여, 이 자리에 잠시 그림자를 드리워 주십시오. 모든 짐을 거두어 주시길.」',
      });
      ctx.logFlavor(`*플레이어가 전신에 남은 내력을 한꺼번에 발산해, 강림의 기세를 정면으로 흩뜨린다. (피해 감소 -${maxQiBase})*`, 'left', { actor: 'player' });
      ctx.logEvent({
        side: 'incoming', actor: 'enemy',
        name: '성화의 강림', tag: 'special',
        value: dmg, valueTier: dmg > ctx.maxHp * 0.5 ? 'super-crit' : 'hit-heavy',
      });
      if (!ctx.isSimulating) ctx.enemyAnim = 'attack';
      return true;
    }
    // 평타 fallback (정상 분포에서는 발생하지 않으나 안전망)
    applyHit(1.0, '평타');
    return true;
  }

  // ─────────────────────────────────────────────────────────────
  // P2: 광화 평타 ×1.3 / 광분의 연격 / 업화 일격 / 아타르의 채찍
  // ─────────────────────────────────────────────────────────────
  if (st.phase === 'p2') {
    const id = st.currentSkillId;
    if (id === 'frenzy_combo') {
      // 광분의 연격 — ×0.7 × 3타
      ctx.logFlavor('*외문수좌가 빠르게 세 번 발을 디뎌 거리를 좁힌다. 한 호흡 안에 세 번의 일격이 당신에게 닿는다.*', 'right', { actor: 'enemy' });
      ctx.logDialogue('「막아 봐라.」', 'right', { actor: 'enemy' });
      for (let hi = 0; hi < 3; hi++) {
        applyHit(0.7, `${hi + 1}타`);
      }
      return true;
    }
    if (id === 'pyre_strike') {
      // 업화 일격 — ×2.2 + 5초 DoT (atk × 0.3, 드루즈 규칙). 회피 가능.
      const hit = applyHit(2.2, '업화 일격');
      // DoT는 명중/회피 무관하게 부여 — 스펙 "회피 불가"이므로 명중 시점에 부여, 회피되면 보류.
      if (hit) {
        const dpt = Math.floor(ctx.currentEnemy.attackPower * 0.3 * monAttackMult);
        ctx.bossPatternState.playerDotStacks = applyOemunBurnSnapshot(
          ctx.bossPatternState.playerDotStacks ?? [],
          dpt,
          5,
        );
        ctx.logDialogue('「끝내자.」', 'right', { actor: 'enemy' });
      }
      return true;
    }
    if (id === 'atar_whip') {
      // 아타르의 채찍 — ×1.4, 30% 불씨+1, 회복 -30% 8초 (덮어쓰기)
      const hit = applyHit(1.4, '아타르의 채찍');
      if (hit) {
        if (Math.random() < 0.3) {
          ctx.bossPatternState.playerDotStacks = applyEmberStack(ctx.bossPatternState.playerDotStacks, 1);
          ctx.logEvent({ side: 'incoming', actor: 'enemy', chips: [{ kind: 'fire', label: '불씨', count: 1 }] });
        }
        ctx.bossPatternState.playerRecoveryDebuff = { remainingSec: 8, pct: 0.3 };
        ctx.logDialogue('「타라.」', 'right', { actor: 'enemy' });
      }
      return true;
    }
    // 광화 평타 — ×1.3
    applyHit(1.3, '광화 평타');
    return true;
  }

  return false;
}

export function registerBaehwaOemunSuja(): void {
  PER_TICK_HOOKS.push(perTickOemunSuja);
  PRE_SKILL_LOOP_HOOKS.push(preSkillOemunSuja);
  IN_ATTACK_RESOLVE_HOOKS.push(inResolveOemunSuja);
  MONSTER_STATE_FACTORIES[SUJA_ID] = createOemunSujaInitialState;
}
