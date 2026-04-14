/**
 * enemyCombat.ts — 적 공격 페이즈
 * gameLoop.ts에서 분리. 적 공격 타이머, 보스 패턴, 회피/카운터.
 */
import { getMonsterDef, getMonsterAttackMsg, BOSS_PATTERNS } from '../../data/monsters';
import { calcExternalDmgReduction } from '../combatCalc';
import { getProfStarInfo } from '../artUtils';
import { calcEnemyDamage, applyVariance } from './damageCalc';
import type { TickContext } from './tickContext';
import { handleDodge } from './tickContext';
import type { DotStackEntry } from '../../store/types';

export function executeEnemyAttackPhase(ctx: TickContext): void {
  if (!ctx.currentEnemy) return;
  if (ctx.currentEnemy.attackPower <= 0 || ctx.currentEnemy.attackInterval <= 0) return;

  // 적 기절 체크: 기절 중에는 공격 불가
  if (ctx.currentEnemy.enemyStunTimer && ctx.currentEnemy.enemyStunTimer > 0) {
    ctx.currentEnemy = { ...ctx.currentEnemy, enemyStunTimer: Math.max(0, ctx.currentEnemy.enemyStunTimer - ctx.dt) };
    return;
  }

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

  // ========================================
  // 6-A: 함수 진입 직후 사전 적용
  // ========================================
  if (pattern && ctx.bossPatternState) {
    // 1. berserker_scale: HP% 기반 공격력/공속 재계산
    const berserkerSkill = pattern.skills.find(s => s.type === 'berserker_scale');
    if (berserkerSkill && ctx.bossPatternState.baseAttackPower != null && ctx.bossPatternState.baseAttackInterval != null) {
      const hpLossPercent = (1 - ctx.currentEnemy.hp / ctx.currentEnemy.maxHp) * 100;
      ctx.currentEnemy = { ...ctx.currentEnemy };
      ctx.currentEnemy.attackPower = Math.floor(
        ctx.bossPatternState.baseAttackPower * (1 + hpLossPercent * (berserkerSkill.berserkAtkPerPercent ?? 0) / 100)
      );
      ctx.currentEnemy.attackInterval =
        ctx.bossPatternState.baseAttackInterval / (1 + hpLossPercent * (berserkerSkill.berserkSpdPerPercent ?? 0) / 100);
    }

    // 2. last_stand: HP 임계 이하면 lastStandActive 플래그 설정 (1회만)
    const lastStandSkill = pattern.skills.find(s => s.type === 'last_stand');
    if (lastStandSkill && !ctx.bossPatternState.lastStandActive && lastStandSkill.hpThreshold != null) {
      if (ctx.currentEnemy.hp / ctx.currentEnemy.maxHp <= lastStandSkill.hpThreshold) {
        ctx.bossPatternState.lastStandActive = true;
        const lsMsg = lastStandSkill.logMessages[Math.floor(Math.random() * lastStandSkill.logMessages.length)];
        ctx.battleLog.push(`${eName}: ${lsMsg}`);
      }
    }

    // 3. final_phase 자해: phaseFlags['final_phase_active'] === true
    const finalPhaseSkill = pattern.skills.find(s => s.type === 'final_phase');
    if (finalPhaseSkill && ctx.bossPatternState.phaseFlags?.['final_phase_active'] && finalPhaseSkill.finalSelfDmgPercent) {
      ctx.currentEnemy = { ...ctx.currentEnemy };
      ctx.currentEnemy.hp -= ctx.currentEnemy.maxHp * finalPhaseSkill.finalSelfDmgPercent;
    }
  }

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
      // 차지 스킬 정의 참조
      const chargeSkillDef = pattern?.skills.find(s => s.id === cs.skillId);
      if (!cs.undodgeable && Math.random() < ctx.dodgeRate) {
        handleDodge(ctx, eName);
      } else {
        ctx.hp -= csDmg;
        if (cs.stunAfterHit) ctx.playerStunTimer = cs.stunAfterHit;
        const chargeLogMsg = chargeSkillDef?.logMessages[1] ?? chargeSkillDef?.logMessages[0] ?? '강력한 일격!';
        const chargeMsg = `${eName}: ${chargeLogMsg} ${csDmg} 피해!${cs.stunAfterHit ? ' 기절!' : ''}`;
        ctx.battleLog.push(chargeMsg);
        ctx.lastEnemyAttack = { enemyName: eName, attackMessage: chargeMsg };
        if (!ctx.isSimulating) ctx.enemyAnim = 'attack';
      }
      // postFireSelfStun: 발사 후 영구 자기 스턴
      if (chargeSkillDef?.postFireSelfStun && ctx.currentEnemy) {
        ctx.currentEnemy = { ...ctx.currentEnemy, enemyStunTimer: 999999 };
        ctx.battleLog.push(`${eName}이(가) 무리한 반동으로 스스로 쓰러졌다!`);
      }
      // 차지 확장 플래그 클리어
      ctx.bossPatternState.bossChargeDmgReduction = 0;
      ctx.bossPatternState.bossChargeStunImmune = false;
      ctx.bossPatternState.chargeRegenPenalty = 0;
      ctx.bossPatternState.bossChargeState = null;
    } else {
      ctx.battleLog.push(`${eName}이(가) 기를 응집하고 있다...`);
    }
    skillUsed = true;
  }

  // ========================================
  // 6-B: 시퀀스 상태 처리 (bossChargeState 직후, sortedSkills 루프 직전)
  // ========================================
  if (!skillUsed && ctx.bossPatternState?.sequenceState != null && pattern) {
    const seq = ctx.bossPatternState.sequenceState;
    const seqSkill = pattern.skills.find(s => s.type === 'phase_sequence' && s.id === seq.skillId);
    if (seqSkill?.sequenceSteps) {
      const nextStep = seq.currentStep + 1;
      const step = seqSkill.sequenceSteps[nextStep];
      if (step) {
        ctx.battleLog.push(`${eName}: ${step.logMessage}`);
        ctx.currentEnemy = { ...ctx.currentEnemy };
        // 회복
        if (step.healPercent) {
          ctx.currentEnemy.hp = Math.min(
            ctx.currentEnemy.hp + ctx.currentEnemy.maxHp * step.healPercent,
            ctx.currentEnemy.maxHp,
          );
        }
        // 공격력/공속 변경
        if (step.atkPercentChange != null) {
          ctx.currentEnemy.attackPower = Math.floor(ctx.currentEnemy.attackPower * (1 + step.atkPercentChange));
          if (step.permanent && ctx.bossPatternState.baseAttackPower != null) {
            ctx.bossPatternState.baseAttackPower = ctx.currentEnemy.attackPower;
          }
        }
        if (step.atkSpeedChange != null) {
          ctx.currentEnemy.attackInterval = step.atkSpeedChange;
          if (step.permanent && ctx.bossPatternState.baseAttackInterval != null) {
            ctx.bossPatternState.baseAttackInterval = ctx.currentEnemy.attackInterval;
          }
        }
      }
      // 완료 판정
      if (nextStep >= seq.totalSteps - 1) {
        ctx.bossPatternState.sequenceState = null;
        ctx.bossPatternState.phaseFlags = { ...(ctx.bossPatternState.phaseFlags ?? {}), [seq.skillId]: true };
      } else {
        ctx.bossPatternState.sequenceState = { ...seq, currentStep: nextStep };
      }
    }
    skillUsed = true;
  }

  // ========================================
  // sortedSkills 루프
  // ========================================
  if (pattern && ctx.bossPatternState && !skillUsed) {
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
      // skip 목록: 패시브/별도 블록에서 처리되는 타입
      if (skill.type === 'dot_apply' || skill.type === 'double_hit' || skill.type === 'multi_hit'
          || skill.type === 'passive_dodge' || skill.type === 'passive_crit'
          || skill.type === 'passive_dmg_absorb'
          // 흑풍채 추가 skip
          || skill.type === 'passive_bleed'
          || skill.type === 'rapid_fire'
          || skill.type === 'multi_dot'
          || skill.type === 'condition_strike'
          || skill.type === 'berserker_scale'
          || skill.type === 'last_stand'
          || skill.type === 'cheolbyeok'
          || skill.type === 'revenge'
          || skill.type === 'conditional_passive'
          || skill.type === 'variable_multi_hit'
          || skill.type === 'dodge_buff_passive') continue;

      // ── 6-B2: timed_buff ──
      if (skill.type === 'timed_buff') {
        if (Math.random() >= (skill.chance ?? 1)) continue;
        if (skill.noDuplicate && ctx.bossPatternState.enemyBuffs?.some(b => b.id === skill.id)) continue;
        // 버프 추가
        const buffEntry = {
          id: skill.id,
          type: 'timed_atk_buff' as const,
          value: skill.buffAtkPercent ?? 0,
          remainingSec: skill.buffDuration,
          removableByStun: skill.removableByStun,
        };
        ctx.bossPatternState.enemyBuffs = [...(ctx.bossPatternState.enemyBuffs ?? []), buffEntry];
        ctx.currentEnemy = { ...ctx.currentEnemy };
        ctx.currentEnemy.attackPower = Math.floor(ctx.currentEnemy.attackPower * (1 + (skill.buffAtkPercent ?? 0)));
        const buffMsg = skill.logMessages[Math.floor(Math.random() * skill.logMessages.length)];
        ctx.battleLog.push(`${eName}: ${buffMsg}`);
        skillUsed = true;
        break;
      }

      // ── 6-B2: phase_sequence 초기 트리거 ──
      if (skill.type === 'phase_sequence' && skill.sequenceSteps) {
        ctx.bossPatternState.sequenceState = {
          skillId: skill.id,
          currentStep: 0,
          totalSteps: skill.sequenceSteps.length,
        };
        const firstStepMsg = skill.sequenceSteps[0].logMessage;
        ctx.battleLog.push(`${eName}: ${firstStepMsg}`);
        // stunOnTrigger: 시퀀스 발동 시 플레이어 스턴
        if (skill.stunOnTrigger) {
          ctx.playerStunTimer = skill.stunOnTrigger;
        }
        if (skill.oneTime) {
          ctx.bossPatternState.usedOneTimeSkills = [...(ctx.bossPatternState.usedOneTimeSkills ?? []), skill.id];
        }
        skillUsed = true;
        break;
      }

      // ── 6-B2: final_phase ──
      if (skill.type === 'final_phase') {
        ctx.currentEnemy = { ...ctx.currentEnemy };
        // 철벽 고정
        if (skill.finalCheolbyeokFixed != null) {
          ctx.bossPatternState.cheolbyeokStacks = skill.finalCheolbyeokFixed;
        }
        // 영구 데미지 보너스 플래그
        ctx.bossPatternState.phaseFlags = { ...(ctx.bossPatternState.phaseFlags ?? {}), final_phase_active: true };
        // conditional_passive 배율 변경
        if (skill.finalConditionalMultiplierChange) {
          const targetSkill = pattern.skills.find(s => s.type === 'conditional_passive' && s.activateAfterSkillId === skill.finalConditionalMultiplierChange!.targetSkillId);
          if (targetSkill) {
            (targetSkill as any)._runtimeMultiplier = skill.finalConditionalMultiplierChange.newMultiplier;
          }
        }
        // 자해
        if (skill.finalSelfDmgPercent) {
          ctx.currentEnemy.hp -= ctx.currentEnemy.maxHp * skill.finalSelfDmgPercent;
        }
        const fpMsg = skill.logMessages[Math.floor(Math.random() * skill.logMessages.length)];
        ctx.battleLog.push(`${eName}: ${fpMsg}`);
        if (skill.oneTime) {
          ctx.bossPatternState.usedOneTimeSkills = [...(ctx.bossPatternState.usedOneTimeSkills ?? []), skill.id];
        }
        skillUsed = true;
        break;
      }

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
          // 차지 확장: DR, 스턴면역, 내력 회복 감소
          if (skill.chargeDmgReduction) ctx.bossPatternState.bossChargeDmgReduction = skill.chargeDmgReduction;
          if (skill.chargeStunImmunity) ctx.bossPatternState.bossChargeStunImmune = true;
          if (skill.chargeDrainPerSec) ctx.bossPatternState.chargeRegenPenalty = skill.chargeDrainPerSec;
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
            // ── 영역선포: conditionRequiredArts 처리 ──
            if (skill.conditionRequiredArts && skill.conditionRequiredArts.length > 0) {
              // 장비 착용 시 조건 무시
              let ignoreByEquip = false;
              if (skill.ignoreByEquipId) {
                for (const slot of ['weapon', 'armor', 'gloves', 'boots'] as const) {
                  if (ctx.equipment[slot]?.defId === skill.ignoreByEquipId) {
                    ignoreByEquip = true;
                    break;
                  }
                }
              }
              const allArts = [...ctx.equippedArts, ...(ctx.equippedSimbeop ? [ctx.equippedSimbeop] : [])];
              const hasAllArts = skill.conditionRequiredArts.every(a => allArts.includes(a));
              if (ignoreByEquip) {
                // logMsg는 L329에서 이미 push됨, 결과만 추가
                ctx.battleLog.push('녹림의 전령이 영역의 압박을 막아냈다!');
              } else if (hasAllArts) {
                ctx.battleLog.push('녹림의 무공으로 영역을 꿰뚫어 보았다!');
              } else {
                // 디버프 적용 — 곱연산으로 기존 살기와 누적
                ctx.bossPatternState.playerAtkDebuffMult = (ctx.bossPatternState.playerAtkDebuffMult ?? 1) * (1 - (skill.debuffAtkPercent ?? 0));
                ctx.bossPatternState.playerAtkSpeedDebuffMult = (ctx.bossPatternState.playerAtkSpeedDebuffMult ?? 1) * (1 + (skill.debuffAtkSpeedPercent ?? 0));
                ctx.battleLog.push('녹림의 영역에 압도당했다! 공격력과 공격속도가 감소한다!');
              }
              if (skill.oneTime) {
                ctx.bossPatternState.usedOneTimeSkills = [...(ctx.bossPatternState.usedOneTimeSkills ?? []), skill.id];
              }
            } else {
              // 기존 살기 처리 (conditionRequiredArts가 없는 경우)
              const mentalStarIndex = getProfStarInfo(ctx.proficiency.mental ?? 0).starIndex;

              // Step 7: 살기 등급별 차등 처리
              if (skill.conditionGradeEffects && skill.conditionGradeEffects.length > 0) {
                // 높은 minGrade부터 순회, 매칭되는 첫 항목 적용
                const sortedGradeEffects = [...skill.conditionGradeEffects].sort((a, b) => b.minGrade - a.minGrade);
                let matched = false;
                for (const ge of sortedGradeEffects) {
                  if (mentalStarIndex >= ge.minGrade) {
                    ctx.bossPatternState.playerAtkDebuffMult = 1 - ge.debuffAtkPercent;
                    ctx.bossPatternState.playerAtkSpeedDebuffMult = 1 + ge.debuffAtkSpeedPercent;
                    ctx.battleLog.push(`${eName}: ${ge.logMessage}`);
                    matched = true;
                    break;
                  }
                }
                if (!matched) {
                  // 매칭 없으면 기본값 적용
                  ctx.bossPatternState.playerAtkDebuffMult = 1 - (skill.debuffAtkPercent ?? 0);
                  ctx.bossPatternState.playerAtkSpeedDebuffMult = 1 + (skill.debuffAtkSpeedPercent ?? 0);
                  const killMsg = skill.logMessages[1] ?? skill.logMessages[0];
                  ctx.battleLog.push(`${eName}: ${killMsg}`);
                }
              } else if (skill.conditionMinSimbeopGrade != null && mentalStarIndex >= skill.conditionMinSimbeopGrade) {
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
            } // end conditionRequiredArts else
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

  // ========================================
  // 6-C: !skillUsed 블록 (일반 공격 + 패시브)
  // ========================================
  if (!skillUsed) {
    let attackLanded = false;

    // Phase 0: 데미지 배율 사전 계산
    let monAttackMult = 1;
    let monCritLog: string | null = null;
    let conditionalPassiveTriggered = false;
    let disableCrit = false;

    // dodgeAtkBuffs 적용 (야수보법 회피 시 쌓인 공격 버프)
    if (ctx.bossPatternState?.dodgeAtkBuffs && ctx.bossPatternState.dodgeAtkBuffs.length > 0) {
      for (const buff of ctx.bossPatternState.dodgeAtkBuffs) {
        monAttackMult *= (1 + buff.atkPercent / 100);
      }
    }

    // passive_crit
    const critSkill = pattern?.skills.find(s => s.type === 'passive_crit');

    // last_stand: crit 무효화 먼저 체크
    const lastStandSkill2 = pattern?.skills.find(s => s.type === 'last_stand');
    if (lastStandSkill2 && ctx.bossPatternState?.lastStandActive) {
      monAttackMult *= lastStandSkill2.damageMultiplier ?? 1;
      if (lastStandSkill2.disableCrit) disableCrit = true;
    }

    if (critSkill && !disableCrit) {
      const critRoll = Math.random();
      if (critRoll < (critSkill.critChanceAlt ?? 0)) {
        monAttackMult *= critSkill.critMultiplierAlt ?? 4;
        monCritLog = critSkill.logMessages[1] ?? critSkill.logMessages[0];
      } else if (critRoll < (critSkill.critChanceAlt ?? 0) + (critSkill.critChance ?? critSkill.chance ?? 0)) {
        monAttackMult *= critSkill.critMultiplier ?? critSkill.damageMultiplier ?? 2;
        monCritLog = critSkill.logMessages[0];
      }
    }

    // conditional_passive
    const condPassiveSkill = pattern?.skills.find(s => s.type === 'conditional_passive');
    if (condPassiveSkill && ctx.bossPatternState?.phaseFlags?.[condPassiveSkill.activateAfterSkillId ?? '']) {
      if (Math.random() < (condPassiveSkill.chance ?? 0)) {
        conditionalPassiveTriggered = true;
        const runtimeMult = (condPassiveSkill as any)._runtimeMultiplier ?? condPassiveSkill.damageMultiplier ?? 1;
        monAttackMult *= runtimeMult;
      }
    }

    // final_phase 영구 데미지 보너스
    const finalPhaseSkill2 = pattern?.skills.find(s => s.type === 'final_phase');
    if (finalPhaseSkill2 && ctx.bossPatternState?.phaseFlags?.['final_phase_active']) {
      monAttackMult *= (1 + (finalPhaseSkill2.finalDmgBonus ?? 0));
    }

    // revenge
    if (ctx.bossPatternState?.revengeActive) {
      const revengeSkill = pattern?.skills.find(s => s.type === 'revenge');
      if (revengeSkill) {
        monAttackMult *= revengeSkill.revengeMultiplier ?? 1;
      }
      ctx.bossPatternState.revengeActive = false;
    }

    // 외공 bypass 적용
    const bypassActive = ctx.currentEnemy?.bypassExternalGradeActive ?? false;
    const externalDmgRed = calcExternalDmgReduction(ctx.state);
    const effectiveExternalDmgRed = bypassActive ? 0 : externalDmgRed;

    // Phase 1: 공격 판정
    // variable_multi_hit: 페이즈 게이팅 체크 후 확률 발동
    const variableMultiHitSkills = pattern?.skills.filter(s => s.type === 'variable_multi_hit') ?? [];
    let variableMultiHitTriggered = false;
    for (const vmhSkill of variableMultiHitSkills) {
      // 페이즈 게이팅
      if (vmhSkill.deactivateAfterPhaseFlag && ctx.bossPatternState?.phaseFlags?.[vmhSkill.deactivateAfterPhaseFlag]) continue;
      if (vmhSkill.activateAfterPhaseFlag && !ctx.bossPatternState?.phaseFlags?.[vmhSkill.activateAfterPhaseFlag]) continue;
      // hitTiers: 상위 티어(낮은 확률)부터 순회
      const tiers = vmhSkill.hitTiers ?? [];
      for (const tier of tiers) {
        if (Math.random() < tier.chance) {
          variableMultiHitTriggered = true;
          const vmhMsg = vmhSkill.logMessages[Math.floor(Math.random() * vmhSkill.logMessages.length)];
          ctx.battleLog.push(`${eName}: ${vmhMsg}`);
          for (let i = 0; i < tier.hitCount; i++) {
            if (Math.random() < ctx.dodgeRate) {
              ctx.battleLog.push(`${i + 1}타 — 회피!`);
              if (ctx.masteryEffects?.dodgeCounterEnabled && Math.random() < 0.5) ctx.dodgeCounterActive = true;
            } else {
              let vmhDmg = calcEnemyDamage(ctx.currentEnemy.attackPower, tier.hitMultipliers[i] * monAttackMult, ctx.dmgReduction, undefined, ctx.equipStats.bonusFixedDmgReduction ?? 0, effectiveExternalDmgRed);
              vmhDmg = Math.floor(vmhDmg * (1 + (ctx.equipStats.bonusDmgTakenPercent ?? 0)));
              ctx.hp -= vmhDmg;
              ctx.battleLog.push(`${i + 1}타! ${vmhDmg} 피해!`);
              attackLanded = true;
            }
          }
          if (!ctx.isSimulating) ctx.enemyAnim = 'attack';
          break;
        }
      }
      if (variableMultiHitTriggered) break;
    }

    const rapidFireSkill = pattern?.skills.find(s => s.type === 'rapid_fire');
    const condStrikeSkill = pattern?.skills.find(s => s.type === 'condition_strike');

    if (variableMultiHitTriggered) {
      // already handled above
    } else if (rapidFireSkill && Math.random() < (rapidFireSkill.chance ?? 0)) {
      // rapid_fire: N타 속사 (일반 공격 대체)
      const hits = rapidFireSkill.rapidFireHits ?? 5;
      const rfMult = rapidFireSkill.rapidFireMultiplier ?? 0.6;
      const damages: number[] = [];
      for (let i = 0; i < hits; i++) {
        if (Math.random() < ctx.dodgeRate) {
          // 개별 회피
          damages.push(0);
          if (ctx.masteryEffects?.dodgeCounterEnabled && Math.random() < 0.5) {
            ctx.dodgeCounterActive = true;
          }
        } else {
          let rfDmg = calcEnemyDamage(ctx.currentEnemy.attackPower, rfMult * monAttackMult, ctx.dmgReduction, undefined, ctx.equipStats.bonusFixedDmgReduction ?? 0, effectiveExternalDmgRed);
          rfDmg = Math.floor(rfDmg * (1 + (ctx.equipStats.bonusDmgTakenPercent ?? 0)));
          ctx.hp -= rfDmg;
          damages.push(rfDmg);
        }
      }
      const total = damages.reduce((a, b) => a + b, 0);
      const dmgStr = damages.map(d => d === 0 ? '회피' : d).join(', ');
      const rfMsg = `${eName}: ${rapidFireSkill.logMessages[0]} ${dmgStr} (총 ${total})`;
      ctx.battleLog.push(rfMsg);
      ctx.lastEnemyAttack = { enemyName: eName, attackMessage: rfMsg };
      if (!ctx.isSimulating) ctx.enemyAnim = 'attack';
      attackLanded = total > 0;
    } else if (condStrikeSkill && Math.random() < (condStrikeSkill.chance ?? 0)) {
      // condition_strike: 상태이상 기반 고정 데미지 (일반 공격 대체)
      const dotStacks = ctx.bossPatternState?.playerDotStacks ?? [];
      const debuffCount = dotStacks.length;
      const baseDmg = condStrikeSkill.baseFixedDamage ?? 150;
      let csDmg = Math.floor(baseDmg * (1 + debuffCount * (condStrikeSkill.perDebuffBonus ?? 0)));
      const threshold = condStrikeSkill.debuffCountThreshold ?? 2;
      const meetsThreshold = debuffCount >= threshold;

      if (meetsThreshold) {
        // 임계치 충족: 회피불가 + 철포삼 무시
        csDmg = Math.floor(csDmg * (1 - ctx.dmgReduction / 100));
        csDmg = Math.floor(csDmg * (1 + (ctx.equipStats.bonusDmgTakenPercent ?? 0)));
        ctx.hp -= csDmg;
        const csMsg = `${eName}: ${condStrikeSkill.logMessages[0]} ${csDmg} 피해! (회피불가!)`;
        ctx.battleLog.push(csMsg);
        ctx.lastEnemyAttack = { enemyName: eName, attackMessage: csMsg };
        if (!ctx.isSimulating) ctx.enemyAnim = 'attack';
        attackLanded = true;
      } else {
        // 임계치 미달: 회피/철포삼 정상 적용
        if (Math.random() < ctx.dodgeRate) {
          handleDodge(ctx, eName);
        } else {
          csDmg = Math.floor(csDmg * (1 - ctx.dmgReduction / 100) * (1 - effectiveExternalDmgRed));
          csDmg = Math.max(0, csDmg - (ctx.equipStats.bonusFixedDmgReduction ?? 0));
          csDmg = Math.floor(csDmg * (1 + (ctx.equipStats.bonusDmgTakenPercent ?? 0)));
          ctx.hp -= csDmg;
          const csMsg = `${eName}: ${condStrikeSkill.logMessages[0]} ${csDmg} 피해!`;
          ctx.battleLog.push(csMsg);
          ctx.lastEnemyAttack = { enemyName: eName, attackMessage: csMsg };
          if (!ctx.isSimulating) ctx.enemyAnim = 'attack';
          attackLanded = true;
        }
      }
    } else {
      // 기존 일반 공격
      if (Math.random() < ctx.dodgeRate) {
        handleDodge(ctx, eName);
      } else {
        let incomingDmg = calcEnemyDamage(ctx.currentEnemy.attackPower, monAttackMult, ctx.dmgReduction, undefined, ctx.equipStats.bonusFixedDmgReduction ?? 0, effectiveExternalDmgRed);
        incomingDmg = Math.floor(incomingDmg * (1 + (ctx.equipStats.bonusDmgTakenPercent ?? 0)));
        ctx.hp -= incomingDmg;
        if (incomingDmg > 0 && monDef) {
          if (monCritLog) ctx.battleLog.push(`${eName}: ${monCritLog}`);
          if (conditionalPassiveTriggered && condPassiveSkill) {
            const cpMsg = condPassiveSkill.logMessages[Math.floor(Math.random() * condPassiveSkill.logMessages.length)];
            ctx.battleLog.push(`${eName}: ${cpMsg}`);
          }
          const attackMsg = getMonsterAttackMsg(monDef, incomingDmg);
          ctx.battleLog.push(attackMsg);
          ctx.lastEnemyAttack = { enemyName: eName, attackMessage: attackMsg };
        }
        if (!ctx.isSimulating) {
          ctx.enemyAnim = 'attack';
        }
        attackLanded = true;
      }
    }

    // dodgeAtkBuffs 소모: 공격 1회 완료 후 remainingAttacks 감소 (연타=1회)
    if (ctx.bossPatternState?.dodgeAtkBuffs && ctx.bossPatternState.dodgeAtkBuffs.length > 0) {
      ctx.bossPatternState.dodgeAtkBuffs = ctx.bossPatternState.dodgeAtkBuffs
        .map(b => ({ ...b, remainingAttacks: b.remainingAttacks - 1 }))
        .filter(b => b.remainingAttacks > 0);
    }

    // Phase 2: 명중 후 ON-HIT 효과
    if (attackLanded && ctx.bossPatternState) {
      // passive_bleed: 출혈 DoT 부여 + 자기 버프
      const passiveBleedSkill = pattern?.skills.find(s => s.type === 'passive_bleed');
      if (passiveBleedSkill && Math.random() < (passiveBleedSkill.bleedChance ?? 0)) {
        const dotStacks = ctx.bossPatternState.playerDotStacks ?? [];
        const existing = dotStacks.find(d => d.type === 'bleed');
        if (existing) {
          if (existing.stacks < (passiveBleedSkill.bleedMaxStacks ?? 3)) {
            existing.stacks += 1;
            existing.remainingSec = existing.totalDuration;
            // 자기 버프 적용
            if (passiveBleedSkill.bleedSelfBuffs) {
              ctx.currentEnemy = { ...ctx.currentEnemy };
              ctx.currentEnemy.attackPower += passiveBleedSkill.bleedSelfBuffs.atkBonus;
              ctx.currentEnemy.attackInterval = Math.max(0.5, ctx.currentEnemy.attackInterval - passiveBleedSkill.bleedSelfBuffs.atkSpeedBonus);
            }
          } else {
            // 최대 스택: 지속시간만 리셋
            existing.remainingSec = existing.totalDuration;
          }
        } else {
          const newBleed: DotStackEntry = {
            id: 'passive_bleed',
            type: 'bleed',
            damagePerTick: passiveBleedSkill.bleedDamagePerTick ?? 0,
            damagePerStack: 0,
            stacks: 1,
            maxStacks: passiveBleedSkill.bleedMaxStacks ?? 3,
            remainingSec: passiveBleedSkill.bleedDuration ?? 15,
            totalDuration: passiveBleedSkill.bleedDuration ?? 15,
          };
          ctx.bossPatternState.playerDotStacks = [...dotStacks, newBleed];
          // 자기 버프 적용 (1스택)
          if (passiveBleedSkill.bleedSelfBuffs) {
            ctx.currentEnemy = { ...ctx.currentEnemy };
            ctx.currentEnemy.attackPower += passiveBleedSkill.bleedSelfBuffs.atkBonus;
            ctx.currentEnemy.attackInterval = Math.max(0.5, ctx.currentEnemy.attackInterval - passiveBleedSkill.bleedSelfBuffs.atkSpeedBonus);
          }
        }
        const bleedMsg = passiveBleedSkill.logMessages[Math.floor(Math.random() * passiveBleedSkill.logMessages.length)];
        ctx.battleLog.push(`${eName}: ${bleedMsg}`);
      }

      // multi_dot: 각 독립 롤
      const multiDotSkills = pattern?.skills.filter(s => s.type === 'multi_dot') ?? [];
      for (const mdSkill of multiDotSkills) {
        if (Math.random() >= (mdSkill.chance ?? 0)) continue;
        const dotStacks = ctx.bossPatternState.playerDotStacks ?? [];
        const existingDot = dotStacks.find(d => d.id === mdSkill.id);
        if (existingDot) {
          if (existingDot.stacks < (mdSkill.dotMaxStacks ?? 3)) {
            existingDot.stacks += 1;
          }
          existingDot.remainingSec = existingDot.totalDuration;
        } else {
          const newDot: DotStackEntry = {
            id: mdSkill.id,
            type: mdSkill.dotType ?? 'poison',
            damagePerTick: mdSkill.dotDamage ?? 0,
            damagePerStack: mdSkill.dotDamagePerStack ?? 0,
            stacks: 1,
            maxStacks: mdSkill.dotMaxStacks ?? 3,
            remainingSec: mdSkill.dotDuration ?? 10,
            totalDuration: mdSkill.dotDuration ?? 10,
            slowAmount: mdSkill.slowAmount,
            slowPerStack: mdSkill.slowPerStack,
          };
          ctx.bossPatternState.playerDotStacks = [...(ctx.bossPatternState.playerDotStacks ?? []), newDot];
        }
        const mdMsg = mdSkill.logMessages[Math.floor(Math.random() * mdSkill.logMessages.length)];
        ctx.battleLog.push(`${eName}: ${mdMsg}`);
      }

      // conditional_passive ON-HIT: 출혈 + 철벽
      if (conditionalPassiveTriggered && condPassiveSkill) {
        if (condPassiveSkill.conditionalBleed) {
          const cb = condPassiveSkill.conditionalBleed;
          const dotStacks = ctx.bossPatternState.playerDotStacks ?? [];
          const existingBleed = dotStacks.find(d => d.id === 'conditional_bleed');
          if (existingBleed) {
            existingBleed.stacks = Math.min(existingBleed.stacks + cb.stacks, existingBleed.maxStacks);
            existingBleed.remainingSec = existingBleed.totalDuration;
          } else {
            const newBleed: DotStackEntry = {
              id: 'conditional_bleed',
              type: 'bleed',
              damagePerTick: cb.damage,
              damagePerStack: 0,
              stacks: cb.stacks,
              maxStacks: cb.stacks * 5,
              remainingSec: cb.duration,
              totalDuration: cb.duration,
            };
            ctx.bossPatternState.playerDotStacks = [...dotStacks, newBleed];
          }
        }
        if (condPassiveSkill.conditionalCheolbyeokGain) {
          const cheolSkill = pattern?.skills.find(s => s.type === 'cheolbyeok');
          const maxStacks = cheolSkill?.cheolbyeokMaxStacks ?? 5;
          ctx.bossPatternState.cheolbyeokStacks = Math.min(
            (ctx.bossPatternState.cheolbyeokStacks ?? 0) + condPassiveSkill.conditionalCheolbyeokGain,
            maxStacks,
          );
        }
      }

      // 기존 dot_apply/double_hit/multi_hit
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
