/**
 * simulateTick — 순수 함수 (GameState → Partial<GameState>)
 * gameStore.ts에서 분리. 순환 의존성 방지를 위해 gameStore.ts를 import하지 않는다.
 *
 * 전투 로직은 combat/ 하위 모듈로 분할:
 * - tickContext.ts: 공유 상태(TickContext) 생성/유틸
 * - damageCalc.ts: 순수 데미지 계산
 * - playerCombat.ts: 플레이어 공격 페이즈
 * - enemyCombat.ts: 적 공격/보스 패턴
 * - battleRewards.ts: 적 처치 보상
 */
import { BALANCE_PARAMS } from '../data/balance';
import { getMonsterDef, BOSS_PATTERNS } from '../data/monsters';
import { getFieldDef, generateExploreOrder } from '../data/fields';
import { calcMaxHp, spawnEnemy } from './combatCalc';
import { createTickContext, applyBattleReset, buildResult, createBossPatternState } from './combat/tickContext';
import { buildAchievementContext, ACHIEVEMENTS } from './combat/damageCalc';
import { executePlayerAttackPhase } from './combat/playerCombat';
import { executeEnemyAttackPhase } from './combat/enemyCombat';
import { processEnemyDeath } from './combat/battleRewards';
import type { GameState } from '../store/types';

const B = BALANCE_PARAMS;

export function simulateTick(state: GameState, dt: number, isSimulating: boolean): Partial<GameState> {
  const ctx = createTickContext(state, dt, isSimulating);

  // 1) 기운 생산 (비전투)
  if (!ctx.isBattling) {
    ctx.qi += ctx.qiPerSec * dt * ctx.qiMult;
  }

  // 1-1) 전투 중 기운 생산
  if (ctx.isBattling && ctx.combatQiRatio > 0) {
    ctx.qi += ctx.qiPerSec * ctx.combatQiRatio * dt * ctx.qiMult;
  }

  // 2) HP 자동회복 (전투 외)
  if (!ctx.isBattling) {
    ctx.maxHp = Math.floor(calcMaxHp(ctx.stats.che, ctx.equipStats.bonusHp ?? 0, ctx.tierMult) * (1 + (ctx.equipStats.bonusHpPercent ?? 0) + (ctx.masteryEffects.bonusHpPercent ?? 0)));
    ctx.hp = Math.min(ctx.hp + ctx.maxHp * 0.05 * dt, ctx.maxHp);

    if (ctx.pendingHuntRetry && ctx.hp >= ctx.maxHp && ctx.huntTarget && ctx.currentField) {
      const retryMon = getMonsterDef(ctx.huntTarget);
      if (retryMon) {
        ctx.pendingHuntRetry = false;
        ctx.battleMode = 'hunt';
        ctx.currentEnemy = spawnEnemy(retryMon);
        ctx.equipmentDotOnEnemy = [];
        ctx.battleResult = null;
        ctx.playerAttackTimer = B.BASE_ATTACK_INTERVAL;
        ctx.enemyAttackTimer = retryMon.attackInterval;
        applyBattleReset(ctx);
        ctx.bossPatternState = createBossPatternState(ctx.huntTarget);
        if (!isSimulating) ctx.battleLog = [...ctx.battleLog, `— ${retryMon.name} 자동 재도전 —`];
      }
    }

    // 자동 답파 재시작 (사망 후 HP 회복 시)
    if (ctx.pendingAutoExplore && ctx.hp >= ctx.maxHp * 0.5 && ctx.currentField && state.autoExploreFields?.[ctx.currentField]) {
      const field = getFieldDef(ctx.currentField);
      if (field?.canExplore) {
        const order = generateExploreOrder(field);
        const firstMon = getMonsterDef(order[0]);
        if (firstMon) {
          ctx.pendingAutoExplore = false;
          ctx.battleMode = 'explore';
          ctx.currentEnemy = spawnEnemy(firstMon);
          ctx.equipmentDotOnEnemy = [];
          ctx.exploreOrder = order;
          ctx.exploreStep = 0;
          ctx.isBossPhase = false;
          ctx.bossTimer = 0;
          ctx.explorePendingRewards = { drops: [] };
          ctx.battleResult = null;
          ctx.playerAttackTimer = B.BASE_ATTACK_INTERVAL;
          ctx.enemyAttackTimer = firstMon.attackInterval;
          ctx.bossPatternState = createBossPatternState(order[0]);
          ctx.playerStunTimer = 0;
          if (!ctx.isSimulating) ctx.battleLog = [`— ${firstMon.name} 등장 —`];
        } else {
          ctx.pendingAutoExplore = false;
        }
      } else {
        ctx.pendingAutoExplore = false;
      }
    }
  }

  // 3) 전투 (타이머 기반)
  if (ctx.isBattling && ctx.currentEnemy) {
    ctx.currentBattleDuration += dt;

    // pre-combat: 적 HP회복
    if (ctx.currentEnemy.regen > 0) {
      ctx.currentEnemy = { ...ctx.currentEnemy };
      ctx.currentEnemy.hp = Math.min(
        ctx.currentEnemy.hp + ctx.currentEnemy.regen * dt,
        ctx.currentEnemy.maxHp,
      );
    }

    // pre-combat: 보스 스태미나 회복
    if (ctx.bossPatternState) {
      const pattern = BOSS_PATTERNS[ctx.currentEnemy.id];
      if (pattern) {
        ctx.bossPatternState.bossStamina = Math.min(
          ctx.bossPatternState.bossStamina + pattern.stamina.regenPerSec * dt,
          pattern.stamina.max,
        );
      }
    }

    // pre-combat: DoT 데미지 (기존 스태미나 기반)
    if (ctx.bossPatternState && ctx.currentEnemy) {
      const dotPattern = BOSS_PATTERNS[ctx.currentEnemy.id];
      if (dotPattern?.dotDamagePerStack && ctx.bossPatternState.bossStamina > 0) {
        const dotDmg = dotPattern.dotDamagePerStack * ctx.bossPatternState.bossStamina * dt * (1 - ctx.dmgReduction / 100);
        ctx.hp -= dotDmg;
      }
    }

    // pre-combat: playerDotStacks 틱 데미지
    if (ctx.bossPatternState?.playerDotStacks && ctx.bossPatternState.playerDotStacks.length > 0 && ctx.currentEnemy) {
      const pattern = BOSS_PATTERNS[ctx.currentEnemy.id];
      const expiredDots: Array<{ dot: typeof ctx.bossPatternState.playerDotStacks[0] }> = [];
      const remaining: typeof ctx.bossPatternState.playerDotStacks = [];

      for (const dot of ctx.bossPatternState.playerDotStacks) {
        const newRemaining = dot.remainingSec - dt;
        if (newRemaining <= 0) {
          expiredDots.push({ dot });
        } else {
          const updatedDot = { ...dot, remainingSec: newRemaining };
          if (dot.type === 'bleed' || dot.type === 'poison') {
            const tickDmg = (dot.damagePerTick + dot.damagePerStack * (dot.stacks - 1)) * dt * (1 - ctx.dmgReduction / 100);
            ctx.hp -= tickDmg;
          } else if (dot.type === 'stamina_drain') {
            const drainAmt = (dot.damagePerTick + dot.damagePerStack * (dot.stacks - 1)) * dt;
            ctx.stamina = Math.max(0, ctx.stamina - drainAmt);
          }
          // slow: 데미지 없음, playerCombat에서 공속 반영
          remaining.push(updatedDot);
        }
      }

      // 출혈 만료 시 자기 버프 롤백
      for (const { dot } of expiredDots) {
        if (dot.type === 'bleed' && pattern) {
          const passiveBleedSkill = pattern.skills.find(s => s.type === 'passive_bleed');
          if (passiveBleedSkill?.bleedSelfBuffs) {
            ctx.currentEnemy = { ...ctx.currentEnemy };
            ctx.currentEnemy.attackPower -= passiveBleedSkill.bleedSelfBuffs.atkBonus * dot.stacks;
            ctx.currentEnemy.attackInterval += passiveBleedSkill.bleedSelfBuffs.atkSpeedBonus * dot.stacks;
          }
        }
      }

      ctx.bossPatternState.playerDotStacks = remaining;
    }

    // pre-combat: enemyBuffs 타이머 감소
    if (ctx.bossPatternState?.enemyBuffs && ctx.bossPatternState.enemyBuffs.length > 0 && ctx.currentEnemy) {
      const remainingBuffs: typeof ctx.bossPatternState.enemyBuffs = [];
      for (const buff of ctx.bossPatternState.enemyBuffs) {
        if (buff.remainingSec != null) {
          const newRemaining = buff.remainingSec - dt;
          if (newRemaining <= 0) {
            // timed_atk_buff 만료: 공격력 원래 값으로 복원
            if (buff.type === 'timed_atk_buff' && ctx.bossPatternState.baseAttackPower != null) {
              ctx.currentEnemy = { ...ctx.currentEnemy };
              ctx.currentEnemy.attackPower = ctx.bossPatternState.baseAttackPower;
            }
          } else {
            remainingBuffs.push({ ...buff, remainingSec: newRemaining });
          }
        } else {
          remainingBuffs.push(buff);
        }
      }
      ctx.bossPatternState.enemyBuffs = remainingBuffs;
    }

    // pre-combat: 장비 DoT (적에게 적용된 독)
    if (ctx.equipmentDotOnEnemy.length > 0 && ctx.currentEnemy) {
      const remaining: typeof ctx.equipmentDotOnEnemy = [];
      for (const dot of ctx.equipmentDotOnEnemy) {
        const newRemaining = dot.remainingSec - dt;
        if (newRemaining <= 0) {
          // 만료
        } else {
          const tickDmg = dot.damagePerTick * dot.stacks * dt;
          ctx.currentEnemy = { ...ctx.currentEnemy };
          ctx.currentEnemy.hp -= tickDmg;
          remaining.push({ ...dot, remainingSec: newRemaining });
        }
      }
      ctx.equipmentDotOnEnemy = remaining;
    }

    // 플레이어 공격 페이즈
    executePlayerAttackPhase(ctx);

    // 적 사망 체크
    if (ctx.currentEnemy && ctx.currentEnemy.hp <= 0) {
      processEnemyDeath(ctx);
    } else if (ctx.currentEnemy) {
      // 적 공격 페이즈
      executeEnemyAttackPhase(ctx);
    }

    // HP <= 0: 전투 종료
    if (ctx.hp <= 0) {
      ctx.hp = 1;
      const deathLog = ctx.lastEnemyAttack
        ? `${ctx.lastEnemyAttack.enemyName}의 공격을 받아 쓰러졌습니다...`
        : undefined;
      const recentBattleLog = ctx.battleLog.slice(-8);
      if (ctx.battleMode === 'explore') {
        ctx.battleResult = {
          type: 'death',
          drops: [],
          message: '패배... 보상이 없습니다.',
          deathLog,
          recentBattleLog,
        };
      } else {
        ctx.battleResult = {
          type: 'hunt_end',
          drops: [],
          message: '사망! 전투 종료.',
          deathLog,
          recentBattleLog,
        };
        ctx.pendingHuntRetry = true;
      }
      ctx.battleMode = 'none';
      ctx.currentEnemy = null;
      applyBattleReset(ctx);
    }
  }

  // 4) 업적 체크
  let achievements = [...state.achievements];
  let achievementCount = state.achievementCount ?? 0;
  const artPoints = state.artPoints;

  const achCtx = buildAchievementContext({
    ...state, killCounts: ctx.killCounts, bossKillCounts: ctx.bossKillCounts, ownedArts: ctx.ownedArts,
    achievements, hiddenRevealedInField: ctx.hiddenRevealedInField,
    totalYasanKills: ctx.totalYasanKills, fieldUnlocks: ctx.fieldUnlocks, totalKills: ctx.totalKills,
  });

  for (const ach of ACHIEVEMENTS) {
    if (achievements.includes(ach.id)) continue;
    if (ach.prerequisite && !achievements.includes(ach.prerequisite)) continue;
    if (ach.check(achCtx)) {
      achievements.push(ach.id);
      achievementCount += 1;
      ctx.battleLog.push(`업적 달성: ${ach.name}!`);
    }
  }

  // Tutorial flags
  const tutorialFlags = { ...state.tutorialFlags };
  if (ctx.killCounts['training_wood'] > 0) tutorialFlags.killedWood = true;
  if (ctx.killCounts['training_iron'] > 0) tutorialFlags.killedIron = true;
  const totalStatSum = state.stats.gi + state.stats.sim + state.stats.che;
  if (tutorialFlags.equippedSword && tutorialFlags.equippedSimbeop && totalStatSum >= 10) {
    tutorialFlags.yasanUnlocked = true;
    ctx.fieldUnlocks.yasan = true;
  }

  return buildResult(ctx, { achievements, achievementCount, artPoints, tutorialFlags });
}
