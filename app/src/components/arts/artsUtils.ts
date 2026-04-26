import type { ArtDef } from '../../data/arts';
import { seonghwaEffects } from '../../utils/combat/baehwagyoEffects';

export function formatPassiveEffectSummary(
  def: ArtDef,
  activeMasteryIds: string[],
  starMultiplier: number = 1,
  bahwagyoNodeLevels?: Record<string, number>,
): string {
  let atkSpeed = 0;
  let dodge = 0;
  let critRate = 0;
  let regenPerSec = 0;
  let dodgeCounter = false;
  let dodgeHealPercent = 0;
  let dmgReductionPercent = 0;
  let hpPercent = 0;
  let counterChancePct = 0;
  let counterMult = 0;
  let minAtkSpeedFloor: number | undefined = undefined;

  const collect = (eff: ArtDef['baseEffects'], mult: number = 1) => {
    if (!eff) return;
    if (eff.bonusAtkSpeed) atkSpeed += eff.bonusAtkSpeed * mult;
    if (eff.bonusDodge) dodge += eff.bonusDodge * mult;
    if (eff.bonusCritRate) critRate += eff.bonusCritRate * mult;
    if (eff.bonusRegenPerSec) regenPerSec += eff.bonusRegenPerSec * mult;
    if (eff.dodgeCounterEnabled) dodgeCounter = true;
    if (eff.dodgeHealPercent) dodgeHealPercent += eff.dodgeHealPercent;
    if (eff.bonusDmgReductionPercent) dmgReductionPercent += eff.bonusDmgReductionPercent * mult;
    if (eff.bonusHpPercent) hpPercent += eff.bonusHpPercent * mult;
    if (eff.dodgeCounterChance) counterChancePct = Math.max(counterChancePct, eff.dodgeCounterChance * 100);
    if (eff.dodgeCounterMultiplier) counterMult = Math.max(counterMult, eff.dodgeCounterMultiplier);
    if (eff.minAtkSpeedOverride !== undefined) {
      minAtkSpeedFloor = minAtkSpeedFloor === undefined
        ? eff.minAtkSpeedOverride
        : Math.min(minAtkSpeedFloor, eff.minAtkSpeedOverride);
    }
  };

  collect(def.baseEffects, starMultiplier);
  for (const mId of activeMasteryIds) {
    const mDef = def.masteries.find(m => m.id === mId);
    collect(mDef?.effects);
  }
  if (def.id === 'baehwa_seonghwa_bobeop' && bahwagyoNodeLevels) {
    collect(seonghwaEffects(bahwagyoNodeLevels), 1);
  }

  const fmt = (n: number) => {
    const rounded = Math.round(n * 10) / 10;
    return Number(rounded.toFixed(1)).toString();
  };

  const parts: string[] = [];
  if (atkSpeed > 0) parts.push(`공속 +${fmt(atkSpeed)}s`);
  if (dodge > 0) parts.push(`회피 +${fmt(dodge)}%`);
  if (critRate > 0) parts.push(`치명 +${critRate}%`);
  if (regenPerSec > 0) parts.push(`회복 +${fmt(regenPerSec)}/초`);
  if (counterChancePct > 0) {
    parts.push(`회피반격 ${counterChancePct.toFixed(0)}%`);
  } else if (dodgeCounter) {
    parts.push('회피반격');
  }
  if (counterMult > 0 && counterMult !== 1) parts.push(`반격×${counterMult.toFixed(1)}`);
  if (minAtkSpeedFloor !== undefined) parts.push(`공속하한 ${minAtkSpeedFloor.toFixed(1)}s`);
  if (dodgeHealPercent > 0) parts.push(`회피회복 ${dodgeHealPercent}%`);
  if (dmgReductionPercent > 0) parts.push(`피감 -${dmgReductionPercent}%`);
  if (hpPercent > 0) parts.push(`체력 +${(hpPercent * 100).toFixed(0)}%`);
  return parts.join(' · ');
}

export const PROF_STAGE_LABELS = [
  '입문(入門)', '숙련(熟鍊)', '달인(達人)', '화경(化境)', '무극(無極)'
] as const;

export const STAR_HANJA = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'] as const;

export const GRADE_KOREAN = [
  '1성', '2성', '3성', '4성', '5성', '6성',
  '7성', '8성', '9성', '10성', '11성', '12성',
] as const;
