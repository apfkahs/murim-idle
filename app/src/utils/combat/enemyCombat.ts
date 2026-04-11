/**
 * enemyCombat.ts — 적 공격 페이즈
 * gameLoop.ts에서 분리. 적 공격 타이머, 보스 패턴, 회피/카운터.
 */
import { getMonsterDef, getMonsterAttackMsg, BOSS_PATTERNS } from '../../data/monsters';
import { calcExternalDmgReduction } from '../combatCalc';
import { getProfStarInfo } from '../artUtils';
import { calcEnemyDamage } from './damageCalc';
import type { TickContext } from './tickContext';
import { handleDodge } from './tickContext';

export function executeEnemyAttackPhase(ctx: TickContext): void {
  if (!ctx.currentEnemy) return;
  if (ctx.currentEnemy.attackPower <= 0 || ctx.currentEnemy.attackInterval <= 0) return;

  ctx.enemyAttackTimer -= ctx.dt;
  if (ctx.enemyAttackTimer > 0) return;

  ctx.enemyAttackTimer += ctx.currentEnemy.attackInterval;

  // 광란 모드 HP 소모
  if (ctx.currentEnemy.rageModeActive) {
    const rageCost = ctx.currentEnemy.rageModeHpCost ?? 20;
    ctx.currentEnemy = {
      ...ctx.currentEnemy,
      hp: ctx.currentEnemy.hp - rageCost,
      rageModeHpCost: rageCost + 10,
    };
    if (ctx.currentEnemy.hp <= 0) {
      ctx.battleLog.push('폭혈단의 기운이 바닥나 스스로 쓰러졌다!');
    }
  }

  const monDef = getMonsterDef(ctx.currentEnemy.id);
  const eName = monDef?.name ?? ctx.currentEnemy.id;

  const pattern = ctx.bossPatternState ? BOSS_PATTERNS[ctx.currentEnemy.id] : null;
  let skillUsed = false;

  // 흑영참 스택 기반 강타 사전 체크
  const stackSmashSkill = pattern?.skills.find(s => s.type === 'stack_smash');
  if (stackSmashSkill && ctx.bossPatternState && (ctx.bossPatternState.stackCount ?? 0) >= (stackSmashSkill.stackTriggerCount ?? 3)) {
    ctx.bossPatternState.stackCount = 0;
    const smashDmg = calcEnemyDamage(ctx.currentEnemy.attackPower, stackSmashSkill.stackSmashMultiplier ?? 4, ctx.dmgReduction, undefined, ctx.equipStats.bonusFixedDmgReduction ?? 0);
    ctx.hp -= smashDmg;
    const smashMsg = `${stackSmashSkill.logMessages[0]} ${smashDmg} 피해! 회피불가!`;
    ctx.battleLog.push(smashMsg);
    ctx.lastEnemyAttack = { enemyName: eName, attackMessage: smashMsg };
    if (!ctx.isSimulating) ctx.enemyAnim = 'attack';
    skillUsed = true;
  }

  // bossChargeState 처리
  if (ctx.bossPatternState?.bossChargeState) {
    const cs = ctx.bossPatternState.bossChargeState;
    ctx.bossPatternState.bossChargeState = { ...cs, turnsLeft: cs.turnsLeft - 1 };
    if (ctx.bossPatternState.bossChargeState.turnsLeft <= 0) {
      const bypassDef = cs.bypassAllDmgReduction ? 0 : ctx.dmgReduction;
      const csDmg = calcEnemyDamage(ctx.currentEnemy.attackPower, cs.damageMultiplier, bypassDef, undefined, ctx.equipStats.bonusFixedDmgReduction ?? 0);
      if (!cs.undodgeable && Math.random() < ctx.dodgeRate) {
        handleDodge(ctx, eName);
      } else {
        ctx.hp -= csDmg;
        if (cs.stunAfterHit) ctx.playerStunTimer = cs.stunAfterHit;
        const chargeMsg = `격산타우! 보이지 않는 힘이 공간을 가로질러 폭발했다! ${csDmg} 피해!${cs.stunAfterHit ? ' 기절!' : ''}`;
        ctx.battleLog.push(chargeMsg);
        ctx.lastEnemyAttack = { enemyName: eName, attackMessage: chargeMsg };
        if (!ctx.isSimulating) ctx.enemyAnim = 'attack';
      }
      ctx.bossPatternState.bossChargeState = null;
    } else {
      ctx.battleLog.push('객잔 주인이 기를 응집하고 있다...');
    }
    skillUsed = true;
  }

  if (pattern && ctx.bossPatternState) {
    const sortedSkills = [...pattern.skills].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    for (const skill of sortedSkills) {
      let triggered = false;
      if (skill.triggerCondition === 'stamina_full' && ctx.bossPatternState.bossStamina >= (skill.staminaCost ?? pattern.stamina.max)) {
        triggered = true;
      } else if (skill.triggerCondition === 'hp_threshold' && skill.hpThreshold != null) {
        const alreadyUsed = skill.oneTime && ctx.bossPatternState.usedOneTimeSkills?.includes(skill.id);
        if (ctx.currentEnemy.hp / ctx.currentEnemy.maxHp <= skill.hpThreshold && !alreadyUsed) {
          triggered = true;
        }
      } else if (skill.triggerCondition === 'default') {
        triggered = true;
      }
      if (!triggered) continue;
      if (skill.oneTime && ctx.bossPatternState.usedOneTimeSkills?.includes(skill.id)) continue;
      if (skill.type === 'dot_apply' || skill.type === 'double_hit' || skill.type === 'multi_hit'
          || skill.type === 'passive_dodge' || skill.type === 'passive_crit'
          || skill.type === 'passive_dmg_absorb') continue;

      if (skill.type === 'charged_attack' && skill.chargeTime) {
        if (!ctx.bossPatternState.usedOneTimeSkills?.includes(skill.id)) {
          ctx.bossPatternState.bossChargeState = {
            skillId: skill.id,
            turnsLeft: skill.chargeTime,
            damageMultiplier: skill.damageMultiplier ?? 1,
            stunAfterHit: skill.stunAfterHit,
            bypassAllDmgReduction: skill.bypassAllDmgReduction,
            undodgeable: skill.undodgeable,
          };
          if (skill.staminaCost) ctx.bossPatternState.bossStamina -= skill.staminaCost;
          if (skill.oneTime) ctx.bossPatternState.usedOneTimeSkills = [...(ctx.bossPatternState.usedOneTimeSkills ?? []), skill.id];
          const chargeStartMsg = skill.logMessages[0] ?? '기를 응집하기 시작했다!';
          ctx.battleLog.push(`${eName}: ${chargeStartMsg}`);
        }
        skillUsed = true;
        break;
      }

      skillUsed = true;
      const logMsg = skill.logMessages[Math.floor(Math.random() * skill.logMessages.length)];

      if (skill.staminaCost) {
        ctx.bossPatternState.bossStamina -= skill.staminaCost;
      }

      if (skill.type === 'stun') {
        if (!skill.undodgeable && Math.random() < ctx.dodgeRate) {
          handleDodge(ctx, eName, `${eName}의 포효를 흘려냈다!`);
        } else {
          ctx.playerStunTimer = skill.stunDuration ?? 4;
          ctx.battleLog.push(`${eName}: ${logMsg}`);
          ctx.lastEnemyAttack = { enemyName: eName, attackMessage: logMsg };
        }
      } else if (skill.type === 'replace_normal' && !skill.useNormalDamage && !skill.damageMultiplier) {
        if (skill.staminaGain) {
          ctx.bossPatternState.bossStamina = Math.min(
            ctx.bossPatternState.bossStamina + skill.staminaGain,
            pattern.stamina.max,
          );
        }
        if (skill.selfHealPercent && ctx.currentEnemy) {
          const healAmt = ctx.currentEnemy.maxHp * (skill.selfHealPercent / 100);
          ctx.currentEnemy = { ...ctx.currentEnemy, hp: Math.min(ctx.currentEnemy.hp + healAmt, ctx.currentEnemy.maxHp) };
        }
        ctx.battleLog.push(`${eName}: ${logMsg}`);
        if (skill.debuffAtkPercent != null) {
          const usedAlready = ctx.bossPatternState.usedOneTimeSkills?.includes(skill.id);
          if (!(skill.oneTime && usedAlready)) {
            const mentalStarIndex = getProfStarInfo(ctx.proficiency.mental ?? 0).starIndex;
            if (skill.conditionMinSimbeopGrade != null && mentalStarIndex >= skill.conditionMinSimbeopGrade) {
              ctx.battleLog.push('살기를 꿰뚫어 보았다! 기백으로 압도한다!');
            } else {
              ctx.bossPatternState.playerAtkDebuffMult = 1 - (skill.debuffAtkPercent ?? 0);
              ctx.bossPatternState.playerAtkSpeedDebuffMult = 1 + (skill.debuffAtkSpeedPercent ?? 0);
              const killMsg = skill.logMessages[1] ?? skill.logMessages[0];
              ctx.battleLog.push(`${eName}: ${killMsg}`);
            }
            if (skill.oneTime) {
              ctx.bossPatternState.usedOneTimeSkills = [...(ctx.bossPatternState.usedOneTimeSkills ?? []), skill.id];
            }
          }
        }
      } else if (skill.type === 'freeze_attack') {
        const dmg = calcEnemyDamage(ctx.currentEnemy.attackPower, skill.damageMultiplier ?? 1, ctx.dmgReduction, skill.fixedDamage, ctx.equipStats.bonusFixedDmgReduction ?? 0);
        if (skill.undodgeable || Math.random() >= ctx.dodgeRate) {
          ctx.hp -= dmg;
          if (skill.freezeAttacks && ctx.bossPatternState) {
            ctx.bossPatternState.playerFreezeLeft = skill.freezeAttacks;
          }
          const freezeSuffix = skill.freezeAttacks ? ' 빙결!' : '';
          const attackMsg = `${eName}: ${logMsg} ${dmg} 피해!${freezeSuffix}`;
          ctx.battleLog.push(attackMsg);
          ctx.lastEnemyAttack = { enemyName: eName, attackMessage: attackMsg };
          if (!ctx.isSimulating) ctx.enemyAnim = 'attack';
        } else {
          handleDodge(ctx, eName);
        }
      } else if (skill.type === 'atk_buff_bypass') {
        ctx.currentEnemy = {
          ...ctx.currentEnemy,
          attackPower: Math.floor(ctx.currentEnemy.attackPower * (1 + (skill.atkBuffPercent ?? 0))),
          bypassExternalGradeActive: true,
        };
        ctx.battleLog.push(`${eName}: ${skill.logMessages[0]}`);
        if (skill.oneTime) {
          ctx.bossPatternState.usedOneTimeSkills = [...(ctx.bossPatternState.usedOneTimeSkills ?? []), skill.id];
        }
      } else if (skill.type === 'potion_heal') {
        const potionRoll = Math.random();
        let potionCumul = 0;
        let chosenOpt = skill.healOptions![0];
        for (const opt of skill.healOptions!) {
          potionCumul += opt.probability;
          if (potionRoll < potionCumul) { chosenOpt = opt; break; }
        }
        if (chosenOpt.rageMode) {
          ctx.currentEnemy = {
            ...ctx.currentEnemy,
            hp: ctx.currentEnemy.maxHp,
            attackInterval: chosenOpt.newAttackInterval ?? ctx.currentEnemy.attackInterval,
            rageModeActive: true,
            rageModeHpCost: 20,
            potionConsumedRage: true,
          };
          ctx.enemyAttackTimer = ctx.currentEnemy.attackInterval;
          ctx.battleLog.push(`${eName}: ${skill.logMessages[1] ?? skill.logMessages[0]}`);
        } else {
          ctx.currentEnemy = {
            ...ctx.currentEnemy,
            hp: Math.min(ctx.currentEnemy.hp + ctx.currentEnemy.maxHp * chosenOpt.healPercent, ctx.currentEnemy.maxHp),
          };
          ctx.battleLog.push(`${eName}: ${skill.logMessages[0]}`);
        }
        if (skill.oneTime) {
          ctx.bossPatternState.usedOneTimeSkills = [...(ctx.bossPatternState.usedOneTimeSkills ?? []), skill.id];
        }
      } else {
        if (skill.oneTime && skill.type === 'rage_attack') {
          ctx.bossPatternState.rageUsed = true;
        }
        const skillDmg = calcEnemyDamage(ctx.currentEnemy.attackPower, skill.damageMultiplier ?? 1, ctx.dmgReduction, undefined, ctx.equipStats.bonusFixedDmgReduction ?? 0);

        if (skill.undodgeable || Math.random() >= ctx.dodgeRate) {
          ctx.hp -= skillDmg;
          ctx.battleLog.push(`${eName}: ${logMsg} ${skillDmg} 피해!`);
          ctx.lastEnemyAttack = { enemyName: eName, attackMessage: `${eName}: ${logMsg} ${skillDmg} 피해!` };
          if (!ctx.isSimulating) {
            ctx.enemyAnim = 'attack';
          }
        } else {
          handleDodge(ctx, eName);
        }
      }
      break;
    }
  }

  if (!skillUsed) {
    // passive_crit 크리티컬 배율 계산
    const critSkill = pattern?.skills.find(s => s.type === 'passive_crit');
    let monAttackMult = 1;
    let monCritLog: string | null = null;
    if (critSkill) {
      const critRoll = Math.random();
      if (critRoll < (critSkill.critChanceAlt ?? 0)) {
        monAttackMult = critSkill.critMultiplierAlt ?? 4;
        monCritLog = critSkill.logMessages[1] ?? critSkill.logMessages[0];
      } else if (critRoll < (critSkill.critChanceAlt ?? 0) + (critSkill.critChance ?? 0)) {
        monAttackMult = critSkill.critMultiplier ?? 2;
        monCritLog = critSkill.logMessages[0];
      }
    }
    // 외공 bypass 적용
    const bypassActive = ctx.currentEnemy?.bypassExternalGradeActive ?? false;
    const externalDmgRed = calcExternalDmgReduction(ctx.state);
    const effectiveExternalDmgRed = bypassActive ? 0 : externalDmgRed;

    if (Math.random() < ctx.dodgeRate) {
      handleDodge(ctx, eName);
    } else {
      let incomingDmg = calcEnemyDamage(ctx.currentEnemy.attackPower, monAttackMult, ctx.dmgReduction, undefined, ctx.equipStats.bonusFixedDmgReduction ?? 0, effectiveExternalDmgRed);
      incomingDmg = Math.floor(incomingDmg * (1 + (ctx.equipStats.bonusDmgTakenPercent ?? 0)));
      ctx.hp -= incomingDmg;
      if (incomingDmg > 0 && monDef) {
        if (monCritLog) ctx.battleLog.push(`${eName}: ${monCritLog}`);
        const attackMsg = getMonsterAttackMsg(monDef, incomingDmg);
        ctx.battleLog.push(attackMsg);
        ctx.lastEnemyAttack = { enemyName: eName, attackMessage: attackMsg };
      }
      if (!ctx.isSimulating) {
        ctx.enemyAnim = 'attack';
      }
      const dotPattern2 = ctx.bossPatternState ? BOSS_PATTERNS[ctx.currentEnemy.id] : null;
      if (dotPattern2 && ctx.bossPatternState) {
        const dotSkill = dotPattern2.skills.find(s => s.type === 'dot_apply');
        if (dotSkill && Math.random() < (dotSkill.chance ?? 0)) {
          ctx.bossPatternState.bossStamina = Math.min(
            ctx.bossPatternState.bossStamina + (dotSkill.staminaGain ?? 1),
            dotPattern2.stamina.max,
          );
          const dmsg = dotSkill.logMessages[Math.floor(Math.random() * dotSkill.logMessages.length)];
          ctx.battleLog.push(`${eName}: ${dmsg}`);
        }
        const dblSkill = dotPattern2.skills.find(s => s.type === 'double_hit');
        if (dblSkill && Math.random() < (dblSkill.chance ?? 0)) {
          const dmsg = dblSkill.logMessages[Math.floor(Math.random() * dblSkill.logMessages.length)];
          if (Math.random() >= ctx.dodgeRate) {
            const dmg2 = calcEnemyDamage(ctx.currentEnemy.attackPower, dblSkill.hitMultiplier ?? 1, ctx.dmgReduction, undefined, ctx.equipStats.bonusFixedDmgReduction ?? 0);
            ctx.hp -= dmg2;
            ctx.battleLog.push(`${eName}: ${dmsg} ${dmg2} 피해!`);
          } else {
            ctx.battleLog.push(`${eName}: ${dmsg} — 회피!`);
            if (ctx.masteryEffects?.dodgeCounterEnabled && Math.random() < 0.5) {
              ctx.dodgeCounterActive = true;
            }
          }
          if (dblSkill.staminaGain) {
            ctx.bossPatternState.bossStamina = Math.min(
              ctx.bossPatternState.bossStamina + dblSkill.staminaGain,
              dotPattern2.stamina.max,
            );
          }
        }
        const tripleSkill = dotPattern2.skills.find(s => s.type === 'multi_hit');
        if (tripleSkill && Math.random() < (tripleSkill.chance ?? 0)) {
          const tripleMsg = tripleSkill.logMessages[Math.floor(Math.random() * tripleSkill.logMessages.length)];
          ctx.battleLog.push(`${eName}: ${tripleMsg}`);
          const hitCount = tripleSkill.hitCount ?? 3;
          for (let i = 0; i < hitCount; i++) {
            if (Math.random() >= ctx.dodgeRate) {
              const tDmg = calcEnemyDamage(ctx.currentEnemy.attackPower, tripleSkill.hitMultiplier ?? 1, ctx.dmgReduction, undefined, ctx.equipStats.bonusFixedDmgReduction ?? 0);
              ctx.hp -= tDmg;
              ctx.battleLog.push(`연격 ${i + 1}타! ${tDmg} 피해!`);
            } else {
              ctx.battleLog.push(`연격 ${i + 1}타 — 회피!`);
              if (ctx.masteryEffects?.dodgeCounterEnabled && Math.random() < 0.5) ctx.dodgeCounterActive = true;
            }
          }
          if (tripleSkill.staminaGain) {
            ctx.bossPatternState.bossStamina = Math.min(
              ctx.bossPatternState.bossStamina + tripleSkill.staminaGain,
              dotPattern2.stamina.max,
            );
          }
          // 흑영참 스택 증가 (dark_triple 발동 시)
          if (tripleSkill.id === 'dark_triple' && stackSmashSkill) {
            ctx.bossPatternState.stackCount = (ctx.bossPatternState.stackCount ?? 0) + 1;
          }
        }
      }
    }
  }
}
