/**
 * 배화교 식화심법 — 불씨(ember) 소각 틱 훅 (Phase 2)
 *
 * gameLoop 의 전투 루프 중 DoT 처리 직후 / 플레이어 공격 페이즈 직전에 호출된다.
 * 식화심법 장착 (masteryEffects.enableBaehwagyoEmberTick) 상태에서만 본문 실행.
 *
 *  - 타이머 누적 → interval 경과 시 불씨 1스택 소각
 *  - 불씨 0 이면 옵션 A(스킵): 타이머 0 으로 리셋, 소각 이벤트 발생 안 함
 *  - 소각 발생 시 재의 묵념(HP 회복) + 재의 맹세(ATK 버프 FIFO 3중첩) 트리거
 *  - 로그: "불씨 하나가 조용히 꺼진다."
 */
import { consumeEmberStacks, getEmberStacks } from './emberUtils';
import type { TickContext } from './tickContext';

/** 만료된 ashOath 버프 in-place 스윕 — 배열 재할당 금지 */
export function sweepAshOathBuffs(ctx: TickContext): void {
  for (let i = ctx.baehwagyoAshOathBuffs.length - 1; i >= 0; i--) {
    if (ctx.baehwagyoAshOathBuffs[i].expiresAtSec <= ctx.combatElapsed) {
      ctx.baehwagyoAshOathBuffs.splice(i, 1);
    }
  }
}

/** 현재 ashOath 버프들의 ATK mult 누적곱 (만료 버프 포함 방지 위해 호출 전 sweep 선행) */
export function getAshOathAtkMult(ctx: TickContext): number {
  let m = 1;
  for (const b of ctx.baehwagyoAshOathBuffs) m *= b.atkMult;
  return m;
}

function applyAshMukneom(ctx: TickContext, stacksBefore: number): void {
  const eff = ctx.masteryEffects;
  const perStack = eff?.emberBurnHpRecoveryPerStack;
  if (!perStack) return;
  const cap = eff?.emberBurnHpRecoveryStackCap ?? 20;
  const stacks = Math.min(stacksBefore, cap);
  let heal = Math.floor(ctx.maxHp * stacks * perStack);
  // 외문수좌 인프라 — playerRecoveryDebuff 적용
  const recDebuffMuk = ctx.bossPatternState?.playerRecoveryDebuff;
  if (recDebuffMuk && recDebuffMuk.remainingSec > 0) heal = Math.floor(heal * (1 - recDebuffMuk.pct));
  if (heal <= 0) return;
  ctx.hp = Math.min(ctx.hp + heal, ctx.maxHp);
  if (!ctx.isSimulating) {
    ctx.floatingTexts = [...ctx.floatingTexts, {
      id: ctx.nextFloatingId++, text: `+${heal}`, type: 'heal' as const, timestamp: Date.now(),
    }];
    if (ctx.floatingTexts.length > 15) ctx.floatingTexts = ctx.floatingTexts.slice(-15);
  }
}

function applyAshMaengse(ctx: TickContext, stacksBefore: number): void {
  const eff = ctx.masteryEffects;
  const perStack = eff?.emberBurnAtkBuffPerStack;
  if (!perStack) return;
  const maxStacks = eff?.emberBurnAtkBuffStackMax ?? 3;
  const duration = eff?.emberBurnAtkBuffDurationSec ?? 20;
  const atkMult = 1 + stacksBefore * perStack;
  ctx.baehwagyoAshOathBuffs.push({
    expiresAtSec: ctx.combatElapsed + duration,
    atkMult,
  });
  while (ctx.baehwagyoAshOathBuffs.length > maxStacks) {
    ctx.baehwagyoAshOathBuffs.shift();
  }
}

export function tickBaehwagyoEmber(ctx: TickContext, dtSec: number): void {
  const eff = ctx.masteryEffects;
  if (!eff?.enableBaehwagyoEmberTick) return;

  sweepAshOathBuffs(ctx);

  const interval = eff.emberBurnIntervalSec ?? 25;
  ctx.baehwagyoEmberTimer += dtSec;
  if (ctx.baehwagyoEmberTimer < interval) return;

  const dots = ctx.bossPatternState?.playerDotStacks ?? [];
  const stacksBefore = getEmberStacks(dots);
  if (stacksBefore <= 0) {
    // 옵션 A 스킵: 타이머만 0 으로 리셋, 소각 이벤트 발생 안 함
    ctx.baehwagyoEmberTimer = 0;
    return;
  }

  ctx.baehwagyoEmberTimer -= interval;
  const res = consumeEmberStacks(dots, 1);
  if (ctx.bossPatternState) {
    ctx.bossPatternState = { ...ctx.bossPatternState, playerDotStacks: res.dots };
  }
  ctx.logFlavor('불씨 하나가 조용히 꺼진다.', 'right', { actor: 'player' });
  applyAshMukneom(ctx, stacksBefore);
  applyAshMaengse(ctx, stacksBefore);
}
