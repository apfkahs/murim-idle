/**
 * 사라지는 불꽃(sarajinun_bulggot_boots) — 불씨 스택 10초마다 1씩 소각.
 * baehwagyoEmberTick과는 독립 타이머 · 묵념/맹세 효과는 발동하지 않는다.
 * 스택 관리 편의만 제공.
 */
import { consumeEmberStacks, getEmberStacks } from './emberUtils';
import type { TickContext } from './tickContext';

const SARAJINUN_BOOTS_ID = 'sarajinun_bulggot_boots';
const SARAJINUN_INTERVAL_SEC = 10;

export function tickSarajinunBulggotBoots(ctx: TickContext, dtSec: number): void {
  const hasBoots = ctx.equipment.boots?.defId === SARAJINUN_BOOTS_ID;
  if (!hasBoots) {
    if (ctx.sarajinunBulggotTimer !== 0) ctx.sarajinunBulggotTimer = 0;
    return;
  }

  ctx.sarajinunBulggotTimer += dtSec;
  if (ctx.sarajinunBulggotTimer < SARAJINUN_INTERVAL_SEC) return;

  const dots = ctx.bossPatternState?.playerDotStacks ?? [];
  const stacks = getEmberStacks(dots);
  if (stacks <= 0) {
    ctx.sarajinunBulggotTimer = 0;
    return;
  }

  ctx.sarajinunBulggotTimer -= SARAJINUN_INTERVAL_SEC;
  const res = consumeEmberStacks(dots, 1);
  if (ctx.bossPatternState) {
    ctx.bossPatternState = { ...ctx.bossPatternState, playerDotStacks: res.dots };
  }
}
