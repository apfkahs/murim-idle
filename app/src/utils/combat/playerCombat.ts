/**
 * playerCombat.ts — 플레이어 공격 페이즈
 * gameLoop.ts에서 분리. 스턴 가드 내부 전체.
 */
import { BALANCE_PARAMS } from '../../data/balance';
import { getArtDef } from '../../data/arts';
import { getMonsterDef, BOSS_PATTERNS, type BossSkillDef } from '../../data/monsters';
import { getEquipmentDef, type EquipSlot } from '../../data/equipment';
import {
  getArtDamageMultiplier, getEffectiveUltMultiplier, getProfDamageValue,
} from '../artUtils';
import { calcAttackDamage } from './damageCalc';
import {
  getEmberEntry, getEmberOutDamageMultiplier, getEmberAtkSpeedPenaltyMult, applyEmberStack,
} from './emberUtils';
import type { TickContext } from './tickContext';

const B = BALANCE_PARAMS;

export function executePlayerAttackPhase(ctx: TickContext): void {
  if (ctx.playerStunTimer > 0) {
    ctx.playerStunTimer = Math.max(0, ctx.playerStunTimer - ctx.dt);
    return;
  }

  // chargeRegenPenalty: 보스 차지 중 내력 회복속도 감소
  const regenPenalty = ctx.bossPatternState?.chargeRegenPenalty ?? 0;
  ctx.stamina = Math.min(ctx.stamina + Math.max(0, ctx.effectiveRegen - regenPenalty) * ctx.dt, ctx.maxStamina);

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
    // slow DoT 공속 반영
    let slowPenalty = 0;
    const slowDot = ctx.bossPatternState?.playerDotStacks?.find(d => d.type === 'slow');
    if (slowDot) {
      slowPenalty = (slowDot.slowAmount ?? 0) + (slowDot.slowPerStack ?? 0) * (slowDot.stacks - 1);
    }
    // 배화교 불씨(ember) 공속 감소: attackInterval에 곱셈 적용
    const emberEntryForSpd = getEmberEntry(ctx.bossPatternState?.playerDotStacks);
    const emberAtkSpdMult = getEmberAtkSpeedPenaltyMult(emberEntryForSpd);
    const attackInterval = Math.max((B.BASE_ATTACK_INTERVAL - atkSpeedBonus + slowPenalty) * atkSpeedDebuffMult * emberAtkSpdMult, B.ATK_SPEED_MIN);
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
          // 6-D: 철벽 감소 (finisher 경로)
          if (ctx.bossPatternState && (ctx.bossPatternState.cheolbyeokStacks ?? 0) > 0) {
            const fcMonPattern = BOSS_PATTERNS[ctx.currentEnemy!.id] ?? null;
            const fcCheolSkill = fcMonPattern?.skills.find((s: BossSkillDef) => s.type === 'cheolbyeok');
            const fcReduction = (ctx.bossPatternState.cheolbyeokStacks ?? 0) * (fcCheolSkill?.cheolbyeokReductionPerStack ?? 0.08);
            fcDmg = Math.floor(fcDmg * (1 - fcReduction));
          }
          // bossChargeDmgReduction (finisher 경로)
          if (ctx.bossPatternState?.bossChargeDmgReduction && ctx.bossPatternState.bossChargeDmgReduction > 0) {
            fcDmg = Math.floor(fcDmg * (1 - ctx.bossPatternState.bossChargeDmgReduction));
          }
          ctx.currentEnemy = { ...ctx.currentEnemy! };
          ctx.currentEnemy!.hp -= fcDmg;
          ctx.currentBattleDamageDealt += fcDmg;
          ctx.sessionTotalDamage += fcDmg;
          if (fcDmg > ctx.currentBattleMaxOutgoingHit) ctx.currentBattleMaxOutgoingHit = fcDmg;
          if (fcCrit) ctx.currentBattleCritCount += 1;
          // stunOnUlt 처리 (격산타우 경로)
          {
            let fcStunDur = 0;
            for (const m of (fcDef?.masteries ?? [])) {
              if (fcMasteryIds.includes(m.id) && m.effects?.stunOnUlt) {
                fcStunDur = m.effects.stunOnUlt;
              }
            }
            const fcEnemyDefStun = getMonsterDef(ctx.currentEnemy!.id);
            const fcChargeStunImmune = ctx.bossPatternState?.bossChargeStunImmune ?? false;
            if (fcStunDur > 0 && !fcChargeStunImmune && (!fcEnemyDefStun?.isBoss || fcEnemyDefStun?.stunnable)) {
              ctx.currentEnemy!.enemyStunTimer = fcStunDur;
              ctx.logFlavor(`적이 ${fcStunDur}초간 기절했다!`, 'right', { actor: 'enemy', minor: true });
              // 6-E: 스턴 시 연동 (finisher 경로)
              if (ctx.bossPatternState) {
                const fcMonPattern2 = BOSS_PATTERNS[ctx.currentEnemy!.id] ?? null;
                const fcCheolSkill2 = fcMonPattern2?.skills.find((s: BossSkillDef) => s.type === 'cheolbyeok');
                if (fcCheolSkill2?.cheolbyeokResetOnStun && !ctx.bossPatternState.phaseFlags?.['final_phase_active']) {
                  ctx.bossPatternState.cheolbyeokStacks = 0;
                }
                if (ctx.bossPatternState.enemyBuffs && ctx.bossPatternState.enemyBuffs.length > 0) {
                  const removedBuffs = ctx.bossPatternState.enemyBuffs.filter(b => b.removableByStun);
                  if (removedBuffs.length > 0 && ctx.bossPatternState.baseAttackPower != null) {
                    ctx.currentEnemy!.attackPower = ctx.bossPatternState.baseAttackPower;
                  }
                  ctx.bossPatternState.enemyBuffs = ctx.bossPatternState.enemyBuffs.filter(b => !b.removableByStun);
                }
              }
            }
          }
          // 6-D: revenge (finisher = 절초)
          if (ctx.bossPatternState) {
            const fcMonPattern3 = BOSS_PATTERNS[ctx.currentEnemy!.id] ?? null;
            if (fcMonPattern3?.skills.find((s: BossSkillDef) => s.type === 'revenge')) {
              ctx.bossPatternState.revengeActive = true;
            }
          }
          const fcUltChangeName = artMasteryIds2.map(id => fcDef!.masteries.find(m => m.id === id)?.effects?.ultChange?.name).find(Boolean);
          const fcAttackName = fcUltChangeName ?? fcDef!.ultMessages?.[0] ?? '절초';
          if (fcCrit) {
            ctx.logEvent({ side: 'outgoing', actor: 'player', name: fcAttackName, subName: '· 절초', tag: 'crit', value: fcDmg, valueTier: 'super-crit' });
          } else {
            ctx.logEvent({ side: 'outgoing', actor: 'player', name: fcAttackName, subName: '· 절초', tag: 'special', value: fcDmg, valueTier: 'special' });
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
          ctx.currentBattleSkillUseCount += 1;
          ctx.playerFinisherCharge = { artId: chosenId, attackFirst: false, timeLeft: ultChargeTime * effectiveInterval, chargeTotal: ultChargeTime * effectiveInterval };
          ctx.logFlavor('기를 응집하기 시작했다...', 'left', { actor: 'player', minor: true });
          isUlt = false;
        } else {
          isUlt = true;
          damage = calcAttackDamage(
            chosenDef.ultBaseDamage ?? 0, effectiveUltMultiplier, getProfDamageValue(ultProf),
            ultGradeMult, ctx.equipStats.bonusAtk ?? 0,
          );
          ctx.stamina -= effectiveUltCostFinal;
          ctx.ultCooldowns[chosenId] = chosenDef.ultCooldown ?? 0;
          ctx.currentBattleSkillUseCount += 1;
          attackName = ultChangeName ?? chosenDef.ultMessages?.[0] ?? '절초';
          artDefForBonuses = chosenDef;
          artMasteryIdsForBonuses = artMasteryIds;
          if (ultAtkFirst && ultChargeTime > 0) {
            ctx.playerFinisherCharge = { artId: chosenId, attackFirst: true, timeLeft: ultChargeTime * effectiveInterval, chargeTotal: ultChargeTime * effectiveInterval };
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
        damage *= ctx.masteryEffects?.dodgeCounterMultiplier ?? 1.2;
        ctx.dodgeCounterActive = false;
        isCounterHit = true;
      }

      // 사자의 깃발 특수효과: 5% 확률 → 이번 공격 +15%
      let sajaBuffTriggered = false;
      if (ctx.equipment.weapon?.defId === 'saja_gitbal' && Math.random() < 0.05) {
        damage *= 1.15;
        sajaBuffTriggered = true;
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

      // [A] 몬스터 passive_dodge 체크 (페이즈 게이팅 포함)
      const monPattern = BOSS_PATTERNS[ctx.currentEnemy!.id] ?? null;
      const monDodgeSkill = monPattern?.skills.find(s => {
        if (s.type !== 'passive_dodge') return false;
        if (s.deactivateAfterPhaseFlag && ctx.bossPatternState?.phaseFlags?.[s.deactivateAfterPhaseFlag]) return false;
        if (s.activateAfterPhaseFlag && !ctx.bossPatternState?.phaseFlags?.[s.activateAfterPhaseFlag]) return false;
        return true;
      });
      // dodge_buff_passive 체크 (야수보법 등)
      const dodgeBuffPassiveSkill = monPattern?.skills.find(s => {
        if (s.type !== 'dodge_buff_passive') return false;
        if (s.deactivateAfterPhaseFlag && ctx.bossPatternState?.phaseFlags?.[s.deactivateAfterPhaseFlag]) return false;
        if (s.activateAfterPhaseFlag && !ctx.bossPatternState?.phaseFlags?.[s.activateAfterPhaseFlag]) return false;
        return true;
      });
      let monsterDodged = false;
      // dodge_buff_passive 우선 (dodge_buff_passive가 있으면 passive_dodge와 택일이 아닌 별개)
      if (dodgeBuffPassiveSkill && Math.random() < (dodgeBuffPassiveSkill.dodgeChance ?? 0)) {
        monsterDodged = true;
        ctx.logFlavor(dodgeBuffPassiveSkill.logMessages[0], 'right', { actor: 'enemy' });
        if (!ctx.isSimulating) {
          ctx.floatingTexts = [...ctx.floatingTexts, { id: ctx.nextFloatingId++, text: '회피!', type: 'evade' as const, timestamp: Date.now() }];
          if (ctx.floatingTexts.length > 15) ctx.floatingTexts = ctx.floatingTexts.slice(-15);
        }
        // 회피 성공 시 ATK 버프 스택 추가
        if (ctx.bossPatternState && dodgeBuffPassiveSkill.dodgeBuffAtkPercent) {
          const buffs = ctx.bossPatternState.dodgeAtkBuffs ?? [];
          const maxStacks = dodgeBuffPassiveSkill.dodgeBuffMaxStacks ?? 2;
          if (buffs.length < maxStacks) {
            ctx.bossPatternState.dodgeAtkBuffs = [...buffs, {
              atkPercent: dodgeBuffPassiveSkill.dodgeBuffAtkPercent,
              remainingAttacks: dodgeBuffPassiveSkill.dodgeBuffAttackCount ?? 3,
            }];
          }
        }
      } else if (monDodgeSkill && Math.random() < (monDodgeSkill.dodgeChance ?? 0)) {
        monsterDodged = true;
        ctx.logFlavor(monDodgeSkill.logMessages[0], 'right', { actor: 'enemy' });
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
          ctx.logFlavor(absorbSkill.logMessages[0], 'right', { actor: 'enemy', minor: true });
        }

        // 6-D: 철벽 감소 (보스가 받는 피해 감소)
        if (ctx.bossPatternState && (ctx.bossPatternState.cheolbyeokStacks ?? 0) > 0) {
          const cheolSkill = monPattern?.skills.find(s => s.type === 'cheolbyeok');
          const reductionRate = (ctx.bossPatternState.cheolbyeokStacks ?? 0) * (cheolSkill?.cheolbyeokReductionPerStack ?? 0.08);
          damage = Math.floor(damage * (1 - reductionRate));
        }

        // 6-D: 목령견 dmgTakenIncrease (보스가 받는 피해 증가, 출혈 스택 기반)
        if (ctx.bossPatternState?.playerDotStacks) {
          const bleedEntry = ctx.bossPatternState.playerDotStacks.find(d => d.type === 'bleed' && d.id === 'passive_bleed');
          if (bleedEntry) {
            const passiveBleedSkill = monPattern?.skills.find(s => s.type === 'passive_bleed');
            if (passiveBleedSkill?.bleedSelfBuffs?.dmgTakenIncrease) {
              damage = Math.floor(damage * (1 + bleedEntry.stacks * passiveBleedSkill.bleedSelfBuffs.dmgTakenIncrease / 100));
            }
          }
        }

        // bossChargeDmgReduction: 차지 중 보스 피해 감소
        if (ctx.bossPatternState?.bossChargeDmgReduction && ctx.bossPatternState.bossChargeDmgReduction > 0) {
          damage = Math.floor(damage * (1 - ctx.bossPatternState.bossChargeDmgReduction));
        }

        // 배화교 행자 — 불씨(ember) 출력 피해 감소 (플레이어 → 적)
        const emberEntryForDmg = getEmberEntry(ctx.bossPatternState?.playerDotStacks);
        if (emberEntryForDmg && emberEntryForDmg.stacks > 0) {
          const emberMult = getEmberOutDamageMultiplier(emberEntryForDmg);
          damage = Math.floor(damage * emberMult);
        }

        // 배화교 행자 — 삼행의 율법 방호 (적이 받는 피해 0.5배)
        if (ctx.bossPatternState?.guardDamageTakenMultiplier != null
            && ctx.bossPatternState.guardDamageTakenMultiplier !== 1
            && damage > 0) {
          damage = Math.floor(damage * ctx.bossPatternState.guardDamageTakenMultiplier);
          // 첫 피격 1회 로그 (무공 미장착: A/B/C 중 랜덤)
          if (!ctx.bossPatternState.guardFirstHitLogged) {
            ctx.bossPatternState.guardFirstHitLogged = true;
            const guardSkill = BOSS_PATTERNS[ctx.currentEnemy!.id]?.skills.find(
              (s: BossSkillDef) => s.type === 'baehwa_guard');
            if (guardSkill?.firstHitLogMessagesNoArt && guardSkill.firstHitLogMessagesNoArt.length > 0) {
              const msg = guardSkill.firstHitLogMessagesNoArt[
                Math.floor(Math.random() * guardSkill.firstHitLogMessagesNoArt.length)];
              ctx.logFlavor(msg, 'left', { actor: 'player' });
            }
          }
        } else if (ctx.bossPatternState?.guardDamageTakenMultiplier === 1
                   && !ctx.bossPatternState.guardFirstHitLogged
                   && damage > 0) {
          // 조건 충족(배화교 무공 장착) 첫 피격 로그
          ctx.bossPatternState.guardFirstHitLogged = true;
          const guardSkill = BOSS_PATTERNS[ctx.currentEnemy!.id]?.skills.find(
            (s: BossSkillDef) => s.type === 'baehwa_guard');
          if (guardSkill?.firstHitLogMessagesWithArt && guardSkill.firstHitLogMessagesWithArt.length > 0) {
            const msg = guardSkill.firstHitLogMessagesWithArt[
              Math.floor(Math.random() * guardSkill.firstHitLogMessagesWithArt.length)];
            ctx.logFlavor(msg, 'left', { actor: 'player' });
          }
        }

        ctx.currentEnemy!.hp -= damage;
        ctx.currentBattleDamageDealt += damage;
        ctx.sessionTotalDamage += damage;
        if (damage > ctx.currentBattleMaxOutgoingHit) ctx.currentBattleMaxOutgoingHit = damage;
        if (isCritical) ctx.currentBattleCritCount += 1;

        // 배화교 호위 — 성화 맹세 각성 턴: 플레이어 공격 시 공격당 반사 불씨
        if (damage > 0 && ctx.bossPatternState?.howiSacredOathState?.phase === 'awakening') {
          const oathSkill = BOSS_PATTERNS[ctx.currentEnemy!.id]?.skills.find(
            (s: BossSkillDef) => s.type === 'sacred_oath');
          const reflectN = oathSkill?.sacredOathReflectPerHit ?? 1;
          ctx.bossPatternState.playerDotStacks = applyEmberStack(
            ctx.bossPatternState.playerDotStacks, reflectN);
          if (oathSkill?.sacredOathReflectLogs?.length) {
            const msg = oathSkill.sacredOathReflectLogs[
              Math.floor(Math.random() * oathSkill.sacredOathReflectLogs.length)];
            ctx.logFlavor(msg, 'right', { actor: 'enemy' });
            ctx.logEvent({ side: 'incoming', actor: 'enemy', chips: [{ kind: 'fire', label: '불씨', count: reflectN }] });
          }
        }

        // 배화교 행자 — 아타르로의 귀의: 플레이어 공격 시 공격당 불씨 +1 반사
        if (damage > 0 && ctx.bossPatternState?.atarSacrificeState) {
          const atar = ctx.bossPatternState.atarSacrificeState;
          const reflectN = atar.reflectStacks ?? 1;
          ctx.bossPatternState.playerDotStacks = applyEmberStack(
            ctx.bossPatternState.playerDotStacks, reflectN);
          const sacSkill = BOSS_PATTERNS[ctx.currentEnemy!.id]?.skills.find(
            (s: BossSkillDef) => s.type === 'baehwa_atar_sacrifice');
          if (sacSkill?.sacrificeReflectLogs && sacSkill.sacrificeReflectLogs.length > 0) {
            const msg = sacSkill.sacrificeReflectLogs[
              Math.floor(Math.random() * sacSkill.sacrificeReflectLogs.length)];
            ctx.logFlavor(msg, 'right', { actor: 'enemy' });
            ctx.logEvent({ side: 'incoming', actor: 'enemy', chips: [{ kind: 'fire', label: '불씨', count: reflectN }] });
          }
        }

        // stunOnUlt 처리
        if (isUlt && artDefForBonuses && ctx.currentEnemy) {
          let stunDur = 0;
          for (const m of artDefForBonuses.masteries) {
            if (artMasteryIdsForBonuses.includes(m.id) && m.effects?.stunOnUlt) {
              stunDur = m.effects.stunOnUlt;
            }
          }
          const stunEnemyDef = getMonsterDef(ctx.currentEnemy.id);
          // 차지 중 스턴면역 체크
          const chargeStunImmune = ctx.bossPatternState?.bossChargeStunImmune ?? false;
          if (stunDur > 0 && !chargeStunImmune && (!stunEnemyDef?.isBoss || stunEnemyDef?.stunnable)) {
            ctx.currentEnemy.enemyStunTimer = stunDur;
            ctx.logFlavor(`적이 ${stunDur}초간 기절했다!`, 'right', { actor: 'enemy', minor: true });

            // 6-E: 스턴 시 연동 처리
            if (ctx.bossPatternState) {
              // 철벽 초기화 (최후의 발악 중에는 고정)
              const cheolSkill = monPattern?.skills.find(s => s.type === 'cheolbyeok');
              if (cheolSkill?.cheolbyeokResetOnStun && !ctx.bossPatternState.phaseFlags?.['final_phase_active']) {
                ctx.bossPatternState.cheolbyeokStacks = 0;
              }
              // removableByStun 버프 제거
              if (ctx.bossPatternState.enemyBuffs && ctx.bossPatternState.enemyBuffs.length > 0) {
                const removedBuffs = ctx.bossPatternState.enemyBuffs.filter(b => b.removableByStun);
                if (removedBuffs.length > 0 && ctx.bossPatternState.baseAttackPower != null) {
                  ctx.currentEnemy.attackPower = ctx.bossPatternState.baseAttackPower;
                }
                ctx.bossPatternState.enemyBuffs = ctx.bossPatternState.enemyBuffs.filter(b => !b.removableByStun);
              }
            }
          } else if (stunDur > 0 && chargeStunImmune && ctx.bossPatternState?.howiSacredOathState?.phase === 'frenzy') {
            const oathSkill = BOSS_PATTERNS[ctx.currentEnemy!.id]?.skills.find(
              (s: BossSkillDef) => s.type === 'sacred_oath');
            if (oathSkill?.sacredOathStunImmuneLogs?.length) {
              const msg = oathSkill.sacredOathStunImmuneLogs[
                Math.floor(Math.random() * oathSkill.sacredOathStunImmuneLogs.length)];
              ctx.logFlavor(msg, 'right', { actor: 'enemy' });
            }
          }
        }

        // 6-D: cheolbyeok 적중 시 스택 증가
        if (ctx.bossPatternState && monPattern) {
          const cheolSkill = monPattern.skills.find(s => s.type === 'cheolbyeok');
          if (cheolSkill && Math.random() < (cheolSkill.cheolbyeokChance ?? 0)) {
            const maxStacks = cheolSkill.cheolbyeokMaxStacks ?? 5;
            if ((ctx.bossPatternState.cheolbyeokStacks ?? 0) < maxStacks) {
              ctx.bossPatternState.cheolbyeokStacks = (ctx.bossPatternState.cheolbyeokStacks ?? 0) + 1;
              const cheolMsg = cheolSkill.logMessages[Math.floor(Math.random() * cheolSkill.logMessages.length)];
              ctx.logFlavor(cheolMsg, 'right', { actor: 'enemy', minor: true });
            }
          }
        }

        // 6-D: revenge 절초 적중 시
        if (isUlt && ctx.bossPatternState && monPattern) {
          const revengeSkill = monPattern.skills.find(s => s.type === 'revenge');
          if (revengeSkill) {
            ctx.bossPatternState.revengeActive = true;
          }
        }

        // 장비 DoT 적용 (혈독 장갑 등)
        for (const slot of ['weapon', 'armor', 'gloves', 'boots'] as EquipSlot[]) {
          const inst = ctx.equipment[slot];
          if (!inst) continue;
          const eqDef = getEquipmentDef(inst.defId);
          if (!eqDef?.killCountGrowth) continue;
          const g = eqDef.killCountGrowth;
          if (Math.random() >= g.dotChance) continue;
          const kc = inst.killCount ?? 0;
          const bonusDmg = Math.floor(kc / g.damageGainPerKills);
          const bonusStacks = Math.floor(kc / g.stackGainPerKills);
          const currentDotDmg = g.baseDotDamage + bonusDmg;
          const currentMaxStacks = g.maxDotStacks + bonusStacks;

          const idx = ctx.equipmentDotOnEnemy.findIndex(d => d.equipId === eqDef.id);
          if (idx >= 0) {
            const existing = ctx.equipmentDotOnEnemy[idx];
            ctx.equipmentDotOnEnemy[idx] = {
              ...existing,
              stacks: Math.min(existing.stacks + 1, currentMaxStacks),
              remainingSec: existing.totalDuration,
              damagePerTick: currentDotDmg,
              maxStacks: currentMaxStacks,
            };
          } else {
            ctx.equipmentDotOnEnemy.push({
              equipId: eqDef.id,
              damagePerTick: currentDotDmg,
              stacks: 1,
              maxStacks: currentMaxStacks,
              remainingSec: g.dotDuration,
              totalDuration: g.dotDuration,
            });
          }
          const eName2 = getMonsterDef(ctx.currentEnemy!.id)?.name ?? ctx.currentEnemy!.id;
          ctx.logFlavor(`${eqDef.name}의 독이 ${eName2}에게 스며들었다!`, 'left', { actor: 'player', minor: true });
        }

        if (isUlt) {
          // 비기·절초가 치명타로 들어갈 때만 큰 크기(super-crit) 사용. 그 외엔 special.
          const ultTier: 'super-crit' | 'special' = isCritical ? 'super-crit' : 'special';
          const ultTag: 'crit' | 'special' = isCritical ? 'crit' : 'special';
          if (attackName === '태산압정') {
            ctx.logEvent({ side: 'outgoing', actor: 'player', name: '태산압정', subName: '· 비기', tag: ultTag, value: damage, valueTier: ultTier });
          } else {
            ctx.logEvent({ side: 'outgoing', actor: 'player', name: attackName, subName: '· 절초', tag: ultTag, value: damage, valueTier: ultTier });
          }
        } else if (isCritical) {
          ctx.logEvent({ side: 'outgoing', actor: 'player', name: attackName, tag: 'crit', value: damage, valueTier: 'crit' });
        } else if (!isUlt && damage > 0) {
          ctx.logEvent({ side: 'outgoing', actor: 'player', name: attackName, value: damage, valueTier: 'normal' });
        }
        if (isCounterHit) {
          ctx.logFlavor('적의 공격을 간파하고 강력한 공격을 가했다!', 'left', { actor: 'player', minor: true });
        }
        if (sajaBuffTriggered) {
          ctx.logFlavor('사자의 깃발이 전투의 고양을 불어넣었다!', 'left', { actor: 'player', minor: true });
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
