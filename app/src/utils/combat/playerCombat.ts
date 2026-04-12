/**
 * playerCombat.ts — 플레이어 공격 페이즈
 * gameLoop.ts에서 분리. 스턴 가드 내부 전체.
 */
import { BALANCE_PARAMS } from '../../data/balance';
import { getArtDef } from '../../data/arts';
import { getMonsterDef, BOSS_PATTERNS } from '../../data/monsters';
import {
  getArtDamageMultiplier, getEffectiveUltMultiplier, getProfDamageValue,
} from '../artUtils';
import { calcAttackDamage } from './damageCalc';
import type { TickContext } from './tickContext';

const B = BALANCE_PARAMS;

export function executePlayerAttackPhase(ctx: TickContext): void {
  if (ctx.playerStunTimer > 0) {
    ctx.playerStunTimer = Math.max(0, ctx.playerStunTimer - ctx.dt);
    return;
  }

  ctx.stamina = Math.min(ctx.stamina + ctx.effectiveRegen * ctx.dt, ctx.maxStamina);

  for (const artId of Object.keys(ctx.ultCooldowns)) {
    ctx.ultCooldowns[artId] -= ctx.dt;
    if (ctx.ultCooldowns[artId] <= 0) delete ctx.ultCooldowns[artId];
  }

  const freezeMultiplier = (ctx.bossPatternState?.playerFreezeLeft ?? 0) > 0 ? 2 : 1;
  ctx.playerAttackTimer -= ctx.dt / freezeMultiplier;
  if (ctx.playerFinisherCharge) ctx.playerFinisherCharge = { ...ctx.playerFinisherCharge, timeLeft: ctx.playerFinisherCharge.timeLeft - ctx.dt };

  if (ctx.playerAttackTimer <= 0) {
    if (ctx.bossPatternState?.playerFreezeLeft) {
      ctx.bossPatternState.playerFreezeLeft = Math.max(0, ctx.bossPatternState.playerFreezeLeft - 1);
    }
    const atkSpeedBonus = (ctx.masteryEffects?.bonusAtkSpeed ?? 0) + (ctx.equipStats.bonusAtkSpeed ?? 0);
    const atkSpeedDebuffMult = ctx.bossPatternState?.playerAtkSpeedDebuffMult ?? 1;
    const attackInterval = Math.max((B.BASE_ATTACK_INTERVAL - atkSpeedBonus) * atkSpeedDebuffMult, B.ATK_SPEED_MIN);
    ctx.playerAttackTimer += attackInterval;

    // playerFinisherCharge 처리
    let skipNormalAttack = false;
    if (ctx.playerFinisherCharge) {
      skipNormalAttack = true;
      const fcDef = getArtDef(ctx.playerFinisherCharge.artId);
      const fcId = ctx.playerFinisherCharge.artId;
      const fcMasteryIds = ctx.state.activeMasteries[fcId] ?? [];
      const fcBaseIntervalMult = fcDef?.attackIntervalMultiplier ?? 1;
      let fcIntervalReduction = 0;
      for (const m of (fcDef?.masteries ?? [])) {
        if (fcMasteryIds.includes(m.id) && m.effects?.attackIntervalMultiplierReduction) {
          fcIntervalReduction += m.effects.attackIntervalMultiplierReduction;
        }
      }
      const fcIntervalMult = Math.max(1, fcBaseIntervalMult - fcIntervalReduction);
      ctx.playerAttackTimer += attackInterval * (fcIntervalMult - 1);

      if (!ctx.playerFinisherCharge.attackFirst) {
        // 차지 후 공격: 차지 완료 시 데미지
        if (ctx.playerFinisherCharge.timeLeft <= 0) {
          const artMasteryIds2 = fcMasteryIds;
          const fcUltMultiplier = getEffectiveUltMultiplier(fcDef!, artMasteryIds2);
          const fcProfType = fcDef!.proficiencyType;
          const fcProfVal = getProfDamageValue(ctx.proficiency[fcProfType] ?? 0);
          const fcGradeMult = getArtDamageMultiplier(fcDef!, ctx.artGradeExp[fcId] ?? 0, artMasteryIds2);
          let fcDmg = calcAttackDamage(fcDef!.ultBaseDamage ?? 0, fcUltMultiplier, fcProfVal, fcGradeMult, ctx.equipStats.bonusAtk ?? 0);
          let fcCrit = false;
          if (Math.random() < ctx.critRate) { fcDmg *= ctx.critDmg / 100; fcCrit = true; }
          fcDmg = Math.floor(fcDmg * (ctx.bossPatternState?.playerAtkDebuffMult ?? 1));
          ctx.currentEnemy = { ...ctx.currentEnemy! };
          ctx.currentEnemy!.hp -= fcDmg;
          ctx.currentBattleDamageDealt += fcDmg;
          // stunOnUlt 처리 (격산타우 경로)
          {
            let fcStunDur = 0;
            for (const m of (fcDef?.masteries ?? [])) {
              if (fcMasteryIds.includes(m.id) && m.effects?.stunOnUlt) {
                fcStunDur = m.effects.stunOnUlt;
              }
            }
            const fcEnemyDefStun = getMonsterDef(ctx.currentEnemy!.id);
            if (fcStunDur > 0 && (!fcEnemyDefStun?.isBoss || fcEnemyDefStun?.stunnable)) {
              ctx.currentEnemy!.enemyStunTimer = fcStunDur;
              ctx.battleLog.push(`적이 ${fcStunDur}초간 기절했다!`);
            }
          }
          const fcUltChangeName = artMasteryIds2.map(id => fcDef!.masteries.find(m => m.id === id)?.effects?.ultChange?.name).find(Boolean);
          const fcAttackName = fcUltChangeName ?? fcDef!.ultMessages?.[0] ?? '절초';
          const fcEName = getMonsterDef(ctx.currentEnemy!.id)?.name ?? ctx.currentEnemy!.id;
          if (fcCrit) {
            ctx.battleLog.push(`치명타! 절초 — ${fcAttackName}! ${fcEName}에게 ${fcDmg} 피해!`);
          } else {
            ctx.battleLog.push(`절초 — ${fcAttackName}! ${fcEName}에게 ${fcDmg} 피해!`);
          }
          if (!ctx.isSimulating) {
            ctx.floatingTexts = [...ctx.floatingTexts, { id: ctx.nextFloatingId++, text: `${fcDmg} 절초!`, type: 'critical' as const, timestamp: Date.now() }];
            if (ctx.floatingTexts.length > 15) ctx.floatingTexts = ctx.floatingTexts.slice(-15);
            ctx.playerAnim = 'attack';
          }
          ctx.playerFinisherCharge = null;
        }
      } else {
        // 선공격 후 딜레이: 딜레이 완료 시 null
        if (ctx.playerFinisherCharge.timeLeft <= 0) {
          ctx.playerFinisherCharge = null;
        }
      }
    }

    if (!skipNormalAttack) {
      ctx.currentEnemy = { ...ctx.currentEnemy! };

      const { activeMasteries } = ctx.state;

      let damage = 0;
      let isCritical = false;
      let attackName = '평타';
      let isUlt = false;
      let artDefForBonuses: ReturnType<typeof getArtDef> | null = null;
      let artMasteryIdsForBonuses: string[] = [];

      // 절초 판정
      const ultCandidates = ctx.equippedArts.filter(artId => {
        const def = getArtDef(artId);
        if (!def?.ultMultiplier || def.ultCost == null) return false;
        const artActiveMasteries = activeMasteries[artId] ?? [];
        const hasUltUnlock = def.masteries.some(m =>
          artActiveMasteries.includes(m.id) && m.effects?.unlockUlt);
        if (!hasUltUnlock) return false;
        let effectiveUltCost = def.ultCost!;
        for (const m of def.masteries) {
          if ((activeMasteries[artId] ?? []).includes(m.id) && m.effects?.ultChange?.ultCostBonus) {
            effectiveUltCost += m.effects.ultChange.ultCostBonus;
          }
        }
        return ctx.stamina >= effectiveUltCost && (ctx.ultCooldowns[artId] ?? 0) <= 0;
      });

      if (ultCandidates.length > 0) {
        const chosenId = ultCandidates[Math.floor(Math.random() * ultCandidates.length)];
        const chosenDef = getArtDef(chosenId)!;

        const artMasteryIds = activeMasteries[chosenId] ?? [];
        let ultChangeName: string | undefined;
        let effectiveUltCostFinal = chosenDef.ultCost!;
        let ultAtkFirst = false;
        for (const m of chosenDef.masteries) {
          if (artMasteryIds.includes(m.id)) {
            if (m.effects?.ultChange?.name) ultChangeName = m.effects.ultChange.name;
            if (m.effects?.ultChange?.ultCostBonus) effectiveUltCostFinal += m.effects.ultChange.ultCostBonus;
            if (m.effects?.ultChange?.ultAttackFirst) ultAtkFirst = true;
          }
        }
        const baseArtIntervalMult = chosenDef.attackIntervalMultiplier ?? 1;
        let artIntervalReduction = 0;
        for (const m of chosenDef.masteries) {
          if (artMasteryIds.includes(m.id) && m.effects?.attackIntervalMultiplierReduction) {
            artIntervalReduction += m.effects.attackIntervalMultiplierReduction;
          }
        }
        const artIntervalMult = Math.max(1, baseArtIntervalMult - artIntervalReduction);
        ctx.playerAttackTimer += attackInterval * (artIntervalMult - 1);

        const ultProfType = chosenDef.proficiencyType;
        const ultProf = ctx.proficiency[ultProfType] ?? 0;
        const ultGradeMult = getArtDamageMultiplier(
          chosenDef,
          ctx.artGradeExp[chosenId] ?? 0,
          artMasteryIds,
        );
        const effectiveUltMultiplier = getEffectiveUltMultiplier(chosenDef, artMasteryIds);
        const effectiveInterval = attackInterval * artIntervalMult;
        const ultChargeTime = chosenDef.ultChargeTime ?? 0;

        if (ultChargeTime > 0 && !ultAtkFirst) {
          // 차지 후 공격: 즉시 데미지 없음
          ctx.stamina -= effectiveUltCostFinal;
          ctx.ultCooldowns[chosenId] = chosenDef.ultCooldown ?? 0;
          ctx.playerFinisherCharge = { artId: chosenId, attackFirst: false, timeLeft: ultChargeTime * effectiveInterval };
          ctx.battleLog.push('기를 응집하기 시작했다...');
          isUlt = false;
        } else {
          isUlt = true;
          damage = calcAttackDamage(
            chosenDef.ultBaseDamage ?? 0, effectiveUltMultiplier, getProfDamageValue(ultProf),
            ultGradeMult, ctx.equipStats.bonusAtk ?? 0,
          );
          ctx.stamina -= effectiveUltCostFinal;
          ctx.ultCooldowns[chosenId] = chosenDef.ultCooldown ?? 0;
          attackName = ultChangeName ?? chosenDef.ultMessages?.[0] ?? '절초';
          artDefForBonuses = chosenDef;
          artMasteryIdsForBonuses = artMasteryIds;
          if (ultAtkFirst && ultChargeTime > 0) {
            ctx.playerFinisherCharge = { artId: chosenId, attackFirst: true, timeLeft: ultChargeTime * effectiveInterval };
          }
        }
      } else {
        // 일반 초식: 균등 랜덤
        const activeCandidates = ctx.equippedArts
          .map(id => ({ id, def: getArtDef(id)!, owned: ctx.ownedArts.find(a => a.id === id) }))
          .filter(x => x.def && x.def.artType === 'active' && x.owned);

        if (activeCandidates.length > 0) {
          const chosen = activeCandidates[Math.floor(Math.random() * activeCandidates.length)];

          const normalProfType = chosen.def.proficiencyType;
          const normalProf = ctx.proficiency[normalProfType] ?? 0;
          const normalGradeMult = getArtDamageMultiplier(
            chosen.def,
            ctx.artGradeExp[chosen.id] ?? 0,
            ctx.state.activeMasteries[chosen.id] ?? [],
          );
          damage = calcAttackDamage(
            chosen.def.baseDamage ?? 0, chosen.def.proficiencyCoefficient, getProfDamageValue(normalProf),
            normalGradeMult, ctx.equipStats.bonusAtk ?? 0,
          );

          if (chosen.def.normalMessages && chosen.def.normalMessages.length > 0) {
            attackName = chosen.def.normalMessages[Math.floor(Math.random() * chosen.def.normalMessages.length)];
          } else {
            attackName = chosen.def.name;
          }

          // per-art 공격 간격 배율
          artDefForBonuses = chosen.def;
          artMasteryIdsForBonuses = ctx.state.activeMasteries[chosen.id] ?? [];
          const chosenBaseIntervalMult = chosen.def.attackIntervalMultiplier ?? 1;
          let chosenIntervalReduction = 0;
          for (const m of chosen.def.masteries) {
            if (artMasteryIdsForBonuses.includes(m.id) && m.effects?.attackIntervalMultiplierReduction) {
              chosenIntervalReduction += m.effects.attackIntervalMultiplierReduction;
            }
          }
          const chosenIntervalMult = Math.max(1, chosenBaseIntervalMult - chosenIntervalReduction);
          ctx.playerAttackTimer += attackInterval * (chosenIntervalMult - 1);
        } else {
          damage = 1;
        }
      }

      // 치명타 판정
      if (Math.random() < ctx.critRate) {
        damage *= ctx.critDmg / 100;
        isCritical = true;
      }

      // 회피 카운터 배율
      let isCounterHit = false;
      if (ctx.dodgeCounterActive) {
        damage *= 1.2;
        ctx.dodgeCounterActive = false;
        isCounterHit = true;
      }

      damage = Math.floor(damage);

      // 보스/히든 피해 보너스 적용
      if (artDefForBonuses && damage > 0) {
        const bossEnemyDef = ctx.currentEnemy ? getMonsterDef(ctx.currentEnemy.id) : null;
        if (bossEnemyDef?.isBoss || bossEnemyDef?.isHidden) {
          let bossHiddenBonus = 0;
          for (const m of artDefForBonuses.masteries) {
            if (artMasteryIdsForBonuses.includes(m.id) && m.effects?.bossHiddenDmgBonus) {
              bossHiddenBonus += m.effects.bossHiddenDmgBonus;
            }
          }
          if (bossHiddenBonus > 0) {
            damage = Math.floor(damage * (1 + bossHiddenBonus));
          }
        }
      }

      // 살기 데미지 디버프 적용
      if (ctx.bossPatternState?.playerAtkDebuffMult) {
        damage = Math.floor(damage * ctx.bossPatternState.playerAtkDebuffMult);
      }

      // [A] 몬스터 passive_dodge 체크
      const monPattern = BOSS_PATTERNS[ctx.currentEnemy!.id] ?? null;
      const monDodgeSkill = monPattern?.skills.find(s => s.type === 'passive_dodge');
      let monsterDodged = false;
      if (monDodgeSkill && Math.random() < (monDodgeSkill.dodgeChance ?? 0)) {
        monsterDodged = true;
        ctx.battleLog.push(monDodgeSkill.logMessages[0]);
        if (!ctx.isSimulating) {
          ctx.floatingTexts = [...ctx.floatingTexts, { id: ctx.nextFloatingId++, text: '회피!', type: 'evade' as const, timestamp: Date.now() }];
          if (ctx.floatingTexts.length > 15) ctx.floatingTexts = ctx.floatingTexts.slice(-15);
        }
        const monStackSmash = monPattern?.skills.find(s => s.type === 'stack_smash');
        if (monStackSmash && ctx.bossPatternState) {
          ctx.bossPatternState.stackCount = (ctx.bossPatternState.stackCount ?? 0) + 1;
        }
      }

      if (!monsterDodged) {
        // [B] passive_dmg_absorb 체크
        const absorbSkill = monPattern?.skills.find(s => s.type === 'passive_dmg_absorb');
        if (absorbSkill && Math.random() < (absorbSkill.absorbChance ?? 0)) {
          damage = Math.floor(damage * (absorbSkill.absorbMultiplier ?? 0.5));
          ctx.battleLog.push(absorbSkill.logMessages[0]);
        }

        ctx.currentEnemy!.hp -= damage;
        ctx.currentBattleDamageDealt += damage;

        // stunOnUlt 처리
        if (isUlt && artDefForBonuses && ctx.currentEnemy) {
          let stunDur = 0;
          for (const m of artDefForBonuses.masteries) {
            if (artMasteryIdsForBonuses.includes(m.id) && m.effects?.stunOnUlt) {
              stunDur = m.effects.stunOnUlt;
            }
          }
          const stunEnemyDef = getMonsterDef(ctx.currentEnemy.id);
          if (stunDur > 0 && (!stunEnemyDef?.isBoss || stunEnemyDef?.stunnable)) {
            ctx.currentEnemy.enemyStunTimer = stunDur;
            ctx.battleLog.push(`적이 ${stunDur}초간 기절했다!`);
          }
        }

        const monDef = getMonsterDef(ctx.currentEnemy!.id);
        const eName = monDef?.name ?? ctx.currentEnemy!.id;

        if (isUlt) {
          if (attackName === '태산압정') {
            ctx.battleLog.push(`비기 — 태산압정! ${eName}에게 ${damage}의 거대한 충격!`);
          } else {
            ctx.battleLog.push(`절초 — ${attackName}! ${eName}에게 ${damage} 피해!`);
          }
        } else if (isCritical) {
          ctx.battleLog.push(`치명타! ${attackName} ${eName}에게 ${damage} 피해!`);
        } else if (!isUlt && damage > 0) {
          ctx.battleLog.push(`${attackName} ${eName}에게 ${damage} 피해를 입혔다.`);
        }
        if (isCounterHit) {
          ctx.battleLog.push('적의 공격을 간파하고 강력한 공격을 가했다!');
        }

        if (!ctx.isSimulating) {
          if (isUlt) {
            ctx.floatingTexts = [...ctx.floatingTexts, { id: ctx.nextFloatingId++, text: `${damage} 절초!`, type: 'critical' as const, timestamp: Date.now() }];
          } else if (isCritical) {
            ctx.floatingTexts = [...ctx.floatingTexts, { id: ctx.nextFloatingId++, text: `${damage} 치명타!`, type: 'critical' as const, timestamp: Date.now() }];
          } else if (damage > 0) {
            ctx.floatingTexts = [...ctx.floatingTexts, { id: ctx.nextFloatingId++, text: `${damage}`, type: 'damage' as const, timestamp: Date.now() }];
          }
          if (ctx.floatingTexts.length > 15) ctx.floatingTexts = ctx.floatingTexts.slice(-15);
          ctx.playerAnim = 'attack';
        }
      } // end !monsterDodged
    } // end skipNormalAttack
  }
}
