/**
 * battleRewards.ts — 적 사망 처리 (보상, 드롭, 탐험/수련 진행)
 * gameLoop.ts에서 분리.
 */
import { BALANCE_PARAMS } from '../../data/balance';
import { getArtDef, type ProficiencyType } from '../../data/arts';
import { getMonsterDef, BOSS_PATTERNS } from '../../data/monsters';
import { FIELDS, getFieldDef } from '../../data/fields';
import { MATERIALS } from '../../data/materials';
import { getEquipmentDef, type EquipmentInstance, type EquipSlot } from '../../data/equipment';
import {
  getMaxEquippedArtGrade, getArtGradeInfo, getProfStarInfo,
  PROF_TABLE, getGradeTableForArt, getArtGradeInfoFromTable,
  getProficiencyGrade,
} from '../artUtils';
import { spawnEnemy, calcPlayerAttackInterval } from '../combatCalc';
import { PROF_LABEL } from './damageCalc';
import type { TickContext } from './tickContext';
import { applyBattleReset, applyUltCooldownReset, createBossPatternState, applyBattleStartSkills } from './tickContext';
import { getEmberEntry } from './emberUtils';

const B = BALANCE_PARAMS;

export function processEnemyDeath(ctx: TickContext): void {
  if (!ctx.currentEnemy || ctx.currentEnemy.hp > 0) return;

  const potionConsumedRage = ctx.currentEnemy.potionConsumedRage ?? false;
  const monDef = getMonsterDef(ctx.currentEnemy.id);
  if (!monDef) return;

  if (monDef.isHidden && ctx.currentField) {
    ctx.hiddenRevealedInField[ctx.currentField] = monDef.id;
  }

  ctx.killCounts[monDef.id] = (ctx.killCounts[monDef.id] ?? 0) + 1;
  ctx.totalKills++;

  const yasanIds = ['squirrel', 'rabbit', 'fox', 'deer', 'boar', 'wolf', 'bear'];
  if (yasanIds.includes(monDef.id) || monDef.isHidden) {
    ctx.totalYasanKills++;
  }

  if (monDef.isBoss) {
    ctx.bossKillCounts[monDef.id] = (ctx.bossKillCounts[monDef.id] ?? 0) + 1;
  }

  // 배화교 행자 — 아타르 자폭으로 플레이어 사망 시 처치 실패: 드롭·숙련도·깨달음 미지급
  const skipRewards = ctx.bossPatternState?.killFailureSkipRewards === true;
  if (ctx.bossPatternState?.killFailureSkipRewards) {
    ctx.bossPatternState.killFailureSkipRewards = false;
  }
  if (skipRewards) {
    ctx.logKill({ enemyName: monDef.name, rewards: [] });
    ctx.logFlavor('불씨에 스러져 보상을 얻지 못했다.', 'both', { minor: true });
  }

  // 배화교 호위 처치 로그 분기
  if (monDef.id === 'baehwa_howi' && ctx.bossPatternState) {
    const phase = ctx.bossPatternState.howiSacredOathState?.phase;
    const oathSkill = BOSS_PATTERNS['baehwa_howi']?.skills.find(s => s.type === 'sacred_oath');
    const killLogs = phase === 'frenzy' ? oathSkill?.sacredOathKillFrenzyLogs : oathSkill?.sacredOathKillEarlyLogs;
    if (killLogs?.length) {
      ctx.logFlavor(killLogs[0], 'right', { actor: 'enemy' });
    }
  }

  // 숙련도 독립 획득
  const profGainParts: string[] = [];
  if (!skipRewards && !monDef.isTraining && (monDef.baseProficiency ?? 0) > 0) {
    const baseProfGain = monDef.baseProficiency!;
    const monsterGrade = monDef.grade >= 1 ? monDef.grade : 1;
    const profGainMap: Partial<Record<ProficiencyType, number>> = {};
    for (const artId of [...ctx.equippedArts, ...(ctx.equippedSimbeop ? [ctx.equippedSimbeop] : [])]) {
      const artDef = getArtDef(artId);
      if (!artDef?.proficiencyType) continue;
      const pType = artDef.proficiencyType;
      if (pType in profGainMap) continue;
      const currentGrade = getProfStarInfo(ctx.proficiency[pType] ?? 0).starIndex;
      const diff = monsterGrade - currentGrade;
      const multiplier = diff >= 0 ? Math.pow(3, diff) : Math.pow(1 / 4, -diff);
      const artProfMult = artDef.proficiencyGainMultiplier ?? 1.0;
      // 녹림의 전령 특수효과: 녹림권+녹림보법 동시 장착 시 숙련도 +30%
      let heraldBonus = 1;
      const hasHeraldBoots = Object.values(ctx.equipment).some(e => e?.defId === 'nokrim_herald_boots');
      if (hasHeraldBoots) {
        const allArts = [...ctx.equippedArts, ...(ctx.equippedSimbeop ? [ctx.equippedSimbeop] : [])];
        if (allArts.includes('nokrim_fist') && allArts.includes('nokrim_bobeop')) {
          heraldBonus = 1.3;
        }
      }
      profGainMap[pType] = baseProfGain * multiplier * artProfMult * heraldBonus;
    }
    for (const [pType, gain] of Object.entries(profGainMap) as [ProficiencyType, number][]) {
      ctx.proficiency[pType] = Math.min((ctx.proficiency[pType] ?? 0) + gain, PROF_TABLE[PROF_TABLE.length - 1].cumExp);
      profGainParts.push(`${PROF_LABEL[pType] ?? pType} +${gain.toFixed(1)}`);
    }
    if (ctx.battleMode === 'explore') {
      for (const [pType, gain] of Object.entries(profGainMap) as [ProficiencyType, number][]) {
        const pg = ctx.explorePendingRewards.proficiencyGains ?? {};
        pg[pType] = (pg[pType] ?? 0) + gain;
        ctx.explorePendingRewards.proficiencyGains = pg;
      }
    }

    const allEquippedArts = [...new Set([...ctx.equippedArts, ...(ctx.equippedSimbeop ? [ctx.equippedSimbeop] : [])])];
    for (const artId of allEquippedArts) {
      const currentArtStar = getArtGradeInfo(ctx.artGradeExp[artId] ?? 0).starIndex;
      const artDiff = monsterGrade - currentArtStar;
      const artGradeMultiplier = artDiff >= 0 ? Math.pow(3, artDiff) : Math.pow(1 / 9, -artDiff);
      ctx.artGradeExp[artId] = (ctx.artGradeExp[artId] ?? 0) + baseProfGain * artGradeMultiplier;
    }

    // artStar 타입 초식 발견 + 자동 해금 처리
    for (const artId of allEquippedArts) {
      const artDef = getArtDef(artId);
      if (!artDef) continue;
      const table = getGradeTableForArt(artDef);
      const currentStarIdx = getArtGradeInfoFromTable(ctx.artGradeExp[artId] ?? 0, table).starIndex;

      for (const m of artDef.masteries) {
        if (m.discovery?.type !== 'artStar') continue;
        const discoverStar = m.discovery.starIndex!;
        const unlockStar = m.discovery.unlockStarIndex ?? discoverStar;

        if (currentStarIdx >= discoverStar && !ctx.discoveredMasteries.includes(m.id)) {
          ctx.discoveredMasteries.push(m.id);
          ctx.pendingEnlightenments.push({ artId, masteryId: m.id, masteryName: m.name });
          ctx.logSystem(`깨달음! ${artDef.name}의 오의 '${m.name}'을(를) 깨우쳤다!`);
        }

        if (currentStarIdx >= unlockStar && !(ctx.activeMasteries[artId] ?? []).includes(m.id)) {
          ctx.activeMasteries[artId] = [...(ctx.activeMasteries[artId] ?? []), m.id];
          ctx.logSystem(`'${m.name}' 자동 해금!`);
        }
      }
    }
  }

  // 드랍률 보정: 장착 무공 숙련도 평균 vs 몬스터 등급
  const profTypes = new Set<ProficiencyType>();
  for (const aId of [...ctx.equippedArts, ...(ctx.equippedSimbeop ? [ctx.equippedSimbeop] : [])]) {
    const aDef = getArtDef(aId);
    if (aDef?.proficiencyType) profTypes.add(aDef.proficiencyType);
  }
  let dropRateMultiplier = 1;
  if (profTypes.size > 0 && monDef.grade >= 1) {
    let gradeSum = 0;
    for (const pt of profTypes) gradeSum += getProficiencyGrade(ctx.proficiency[pt] ?? 0);
    const avgGrade = gradeSum / profTypes.size;
    const diff = monDef.grade - avgGrade;
    if (diff >= 2) {
      dropRateMultiplier = 1 + Math.min((diff - 1) * 0.5, 2.0);
    }
  }

  // 드롭
  const drops: string[] = [];
  if (!skipRewards) {
    for (const drop of monDef.drops) {
      if (Math.random() < Math.min(drop.chance * dropRateMultiplier, 1)) {
        if (!ctx.ownedArts.some(a => a.id === drop.artId) && !ctx.inventory.some(i => i.artId === drop.artId)) {
          drops.push(drop.artId);
          ctx.inventory.push({
            id: `${Date.now()}_${drop.artId}`,
            itemType: 'art_scroll',
            artId: drop.artId,
            obtainedFrom: monDef.id,
            obtainedAt: Date.now(),
          });
          ctx.logSystem(`${getArtDef(drop.artId)?.name ?? drop.artId} 비급이 전낭에 담겼다!`);
        }
      }
    }
  }

  // 장비 드롭
  if (!skipRewards && monDef.equipDrops) {
    for (const eqDrop of monDef.equipDrops) {
      if (Math.random() < Math.min(eqDrop.chance * dropRateMultiplier, 1)) {
        const alreadyOwned = Object.values(ctx.state.equipment).some(e => e?.defId === eqDrop.equipId)
          || ctx.equipmentInventory.some(e => e.defId === eqDrop.equipId);
        if (alreadyOwned) continue;
        const eqDef = getEquipmentDef(eqDrop.equipId);
        if (eqDef) {
          const instance: EquipmentInstance = {
            instanceId: `eq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            defId: eqDrop.equipId,
            obtainedFrom: monDef.id,
            obtainedAt: Date.now(),
          };
          ctx.equipmentInventory.push(instance);
          if (!ctx.knownEquipment.includes(eqDrop.equipId)) ctx.knownEquipment.push(eqDrop.equipId);
          ctx.logSystem(`${eqDef.name}을(를) 획득했다!`);
        }
      }
    }
  }

  // 재료 드롭
  if (skipRewards) {
    // 처치 실패 — 재료 드롭 스킵
  } else if (monDef.id === 'training_wood' && ctx.killCounts[monDef.id] === 1) {
    ctx.materials['wood_fragment'] = (ctx.materials['wood_fragment'] ?? 0) + 1;
    if (!ctx.obtainedMaterials.includes('wood_fragment')) ctx.obtainedMaterials.push('wood_fragment');
    ctx.logSystem('나무 조각 1개를 주웠다. 무언가를 만드는 데 쓸 수 있을 것 같다...');
  } else if (monDef.materialDrops) {
    for (const mDrop of monDef.materialDrops) {
      if (Math.random() < Math.min(mDrop.chance * dropRateMultiplier, 1)) {
        ctx.materials[mDrop.materialId] = (ctx.materials[mDrop.materialId] ?? 0) + 1;
        if (!ctx.obtainedMaterials.includes(mDrop.materialId)) {
          ctx.obtainedMaterials.push(mDrop.materialId);
        }
        const matName = MATERIALS.find(m => m.id === mDrop.materialId)?.name ?? mDrop.materialId;
        ctx.logSystem(`${matName}을(를) 주웠다! (${ctx.materials[mDrop.materialId]}개)`);
        if (ctx.battleMode === 'explore') {
          const md = ctx.explorePendingRewards.materialDrops ?? {};
          md[mDrop.materialId] = (md[mDrop.materialId] ?? 0) + 1;
          ctx.explorePendingRewards.materialDrops = md;
        }
      }
    }
  }

  // 장비 킬카운트 증가 (장착 장비 중 killCountGrowth가 있는 것)
  for (const slot of ['weapon', 'armor', 'gloves', 'boots'] as EquipSlot[]) {
    const inst = ctx.equipment[slot];
    if (!inst) continue;
    const eqDef = getEquipmentDef(inst.defId);
    if (!eqDef?.killCountGrowth) continue;
    const currentKC = inst.killCount ?? 0;
    if (currentKC >= eqDef.killCountGrowth.maxKillCount) continue;
    const newKC = Math.min(currentKC + 1, eqDef.killCountGrowth.maxKillCount);
    ctx.equipment[slot] = { ...inst, killCount: newKC };
  }

  // 폭혈단 복용 후 처치 시 demonic_note +5%
  if (!skipRewards && potionConsumedRage && Math.random() < 0.05) {
    ctx.materials['demonic_note'] = (ctx.materials['demonic_note'] ?? 0) + 1;
    if (!ctx.obtainedMaterials.includes('demonic_note')) ctx.obtainedMaterials.push('demonic_note');
    ctx.logSystem('마기에 물든 쪽지를 발견했다!');
  }

  // 처치 시 기운 보너스
  if (!skipRewards && ctx.masteryEffects?.killBonusEnabled && ctx.combatQiRatio > 0) {
    const combatQiRate = ctx.qiPerSec * ctx.combatQiRatio;
    const bonusQi = combatQiRate * ctx.currentBattleDuration * B.KILL_BONUS_RATIO;
    ctx.qi += bonusQi * ctx.qiMult;
  }

  // 초(招) 발견 체크
  if (!skipRewards) {
    const allArts = [...new Set([...ctx.equippedArts, ...(ctx.equippedSimbeop ? [ctx.equippedSimbeop] : [])])];
    for (const artId of allArts) {
      const artDef = getArtDef(artId);
      const artOwned = ctx.ownedArts.find(a => a.id === artId);
      if (!artDef || !artOwned) continue;
      for (const m of artDef.masteries) {
        if (!m.discovery) continue;
        if (m.discovery.type === 'bijup') continue;
        if (ctx.discoveredMasteries.includes(m.id)) continue;
        let discovered = false;
        if (m.discovery.type === 'boss' && m.discovery.bossId) {
          if ((ctx.bossKillCounts[m.discovery.bossId] ?? 0) >= 1) discovered = true;
        }
        if (discovered) {
          ctx.discoveredMasteries.push(m.id);
          ctx.pendingEnlightenments.push({ artId, masteryId: m.id, masteryName: m.name });
          ctx.logSystem(`깨달음! ${artDef.name}의 오의 '${m.name}'을(를) 깨우쳤다!`);
        }
      }
    }
  }

  // 선언적 전장 해금 — 보스 처치
  if (monDef.isBoss) {
    for (const field of FIELDS) {
      if (ctx.fieldUnlocks[field.id]) continue;
      const cond = field.unlockCondition;
      if (!cond?.bossKill) continue;
      if (cond.bossKill !== monDef.id) continue;
      const tierOk = cond.minTier == null || ctx.state.tier >= cond.minTier;
      if (tierOk) {
        ctx.fieldUnlocks[field.id] = true;
      }
    }
  }
  // 선언적 전장 해금 — 일반 몬스터 처치
  for (const field of FIELDS) {
    if (ctx.fieldUnlocks[field.id]) continue;
    const cond = field.unlockCondition;
    if (!cond?.monsterKill) continue;
    if (cond.monsterKill === monDef.id) {
      const tierOk = cond.minTier == null || ctx.state.tier >= cond.minTier;
      if (tierOk) ctx.fieldUnlocks[field.id] = true;
    }
  }
  // 선언적 전장 해금 — 재료 소지
  for (const field of FIELDS) {
    if (ctx.fieldUnlocks[field.id]) continue;
    const cond = field.unlockCondition;
    if (!cond?.materialOwned) continue;
    if ((ctx.materials[cond.materialOwned] ?? 0) > 0) {
      ctx.fieldUnlocks[field.id] = true;
      ctx.logSystem(`새로운 전장 '${field.name}'이(가) 개방됐다!`);
    }
  }

  // ── 전투 모드별 처리 ──
  if (ctx.battleMode === 'explore') {
    processExploreMode(ctx, drops, profGainParts, monDef);
  } else if (ctx.battleMode === 'hunt') {
    processHuntMode(ctx, profGainParts, monDef);
  }
}

// ── 탐험 모드 ──
function processExploreMode(
  ctx: TickContext,
  drops: string[],
  profGainParts: string[],
  monDef: ReturnType<typeof getMonsterDef> & {},
): void {
  ctx.explorePendingRewards.drops.push(...drops);
  {
    const rewards = profGainParts.map(s => {
      const m = s.match(/^(.+?)\s+(\S+)$/);
      return m ? { label: m[1], value: m[2] } : { label: s, value: '' };
    });
    ctx.logKill({ enemyName: monDef.name, rewards });
  }

  if (monDef.isHidden) {
    ctx.battleResult = {
      type: 'explore_win',
      drops: ctx.explorePendingRewards.drops,
      proficiencyGains: ctx.explorePendingRewards.proficiencyGains,
      materialDrops: ctx.explorePendingRewards.materialDrops,
      message: '히든 처치! 답파 대성공!',
    };
    ctx.battleMode = 'none';
    ctx.currentEnemy = null;
    applyBattleReset(ctx);
    ctx.logSystem('괴이한 존재를 물리치고 답파에 성공했다!');
  } else {
    // 일반 처치 후 HP 15% 회복
    const exploreHeal = Math.floor(ctx.maxHp * 0.15);
    ctx.hp = Math.min(ctx.hp + exploreHeal, ctx.maxHp);
    ctx.logSystem(`적을 격파한 후 휴식을 취해 일부 체력을 회복했다! (+${exploreHeal})`);

    const nextStep = ctx.exploreStep + 1;
    if (nextStep < ctx.exploreOrder.length) {
      const nextMon = getMonsterDef(ctx.exploreOrder[nextStep]);
      if (nextMon) {
        ctx.currentEnemy = spawnEnemy(nextMon);
        ctx.equipmentDotOnEnemy = [];
        ctx.exploreStep = nextStep;
        ctx.currentBattleDuration = 0;
        ctx.currentBattleDamageDealt = 0;
        ctx.stamina = 0;
        applyUltCooldownReset(ctx);
        if (nextMon.isHidden && ctx.currentField) {
          if (!ctx.hiddenRevealedInField[ctx.currentField]) {
            ctx.logFlavor('산군이 쓰러진 틈에 괴이한 존재가 침입한 것 같다..', 'both', { minor: true });
          }
          // 히든 조우 연출
          if (nextMon.hiddenEncounterLogs && nextMon.hiddenEncounterLogs.length > 0) {
            for (const line of nextMon.hiddenEncounterLogs) {
              ctx.logDialogue(line, 'right', { actor: 'enemy' });
            }
          }
          ctx.hiddenRevealedInField[ctx.currentField] = nextMon.id;
        }
        // 답파 불씨(魂焰) 유지 — 다음 전투로 이월
        const carriedEmber = getEmberEntry(ctx.bossPatternState?.playerDotStacks);
        ctx.bossPatternState = createBossPatternState(nextMon.id);
        if (carriedEmber && ctx.bossPatternState) {
          ctx.bossPatternState.playerDotStacks = [
            ...(ctx.bossPatternState.playerDotStacks ?? []),
            carriedEmber,
          ];
        }
        ctx.beginCombat({
          enemyId: nextMon.id,
          playerAttackInterval: calcPlayerAttackInterval(ctx.state),
          enemyAttackInterval: nextMon.attackInterval,
        });
        // battle_start 스킬 적용 (삼행의 율법 등)
        if (ctx.bossPatternState) {
          const applied = applyBattleStartSkills(nextMon.id, ctx.equippedArts, ctx.bossPatternState, ctx.battleLog, ctx.logEntryIdSeq);
          ctx.bossPatternState = applied.state;
          ctx.battleLog = applied.battleLog;
          ctx.logEntryIdSeq = applied.logEntryIdSeq;
          ctx.lawActiveFromSkillId = applied.lawActiveFromSkillId;
        }
        ctx.playerStunTimer = 0;
        ctx.playerAttackTimer = B.BASE_ATTACK_INTERVAL;
        ctx.enemyAttackTimer = nextMon.attackInterval;
        // 히든 조우 시 공격 타이머 지연
        if (nextMon.isHidden && nextMon.hiddenEncounterLogs && nextMon.hiddenEncounterLogs.length > 0) {
          ctx.playerAttackTimer += 3;
          ctx.enemyAttackTimer += 3;
        }
      }
    } else if (!ctx.isBossPhase) {
      const field = getFieldDef(ctx.currentField!);
      if (field?.boss) {
        // 보스 기처치 시 10% 확률로 히든이 보스 슬롯 대체
        const bossKilledBefore = (ctx.bossKillCounts[field.boss] ?? 0) > 0;
        const canSpawnHiddenAtBoss = bossKilledBefore && field.hiddenMonsters.length > 0;
        const spawnHiddenAtBoss = canSpawnHiddenAtBoss && Math.random() < 0.1;
        const nextMonId = spawnHiddenAtBoss
          ? field.hiddenMonsters[Math.floor(Math.random() * field.hiddenMonsters.length)]
          : field.boss;
        const nextMon = getMonsterDef(nextMonId);
        if (nextMon) {
          ctx.isBossPhase = true;
          ctx.bossTimer = field.bossTimer ?? 60;
          ctx.currentEnemy = spawnEnemy(nextMon);
          ctx.equipmentDotOnEnemy = [];
          ctx.currentBattleDuration = 0;
          ctx.currentBattleDamageDealt = 0;
          ctx.stamina = 0;
          applyUltCooldownReset(ctx);
          if (spawnHiddenAtBoss) {
            // 히든 조우 연출: 대사 로그 출력 + 공격 타이머 지연
            if (nextMon.hiddenEncounterLogs && nextMon.hiddenEncounterLogs.length > 0) {
              for (const line of nextMon.hiddenEncounterLogs) {
                ctx.logDialogue(line, 'right', { actor: 'enemy' });
              }
              ctx.playerAttackTimer += 3;
              ctx.enemyAttackTimer += 3;
            }
            if (ctx.currentField) ctx.hiddenRevealedInField[ctx.currentField] = nextMon.id;
          }
          // 답파 불씨(魂焰) 유지 — 보스 전환에도 이월
          const carriedEmberBoss = getEmberEntry(ctx.bossPatternState?.playerDotStacks);
          ctx.bossPatternState = createBossPatternState(nextMon.id);
          if (carriedEmberBoss && ctx.bossPatternState) {
            ctx.bossPatternState.playerDotStacks = [
              ...(ctx.bossPatternState.playerDotStacks ?? []),
              carriedEmberBoss,
            ];
          }
          ctx.beginCombat({
            enemyId: nextMon.id,
            playerAttackInterval: calcPlayerAttackInterval(ctx.state),
            enemyAttackInterval: nextMon.attackInterval,
          });
          // battle_start 스킬 적용 (삼행의 율법 등)
          if (ctx.bossPatternState) {
            const applied = applyBattleStartSkills(nextMon.id, ctx.equippedArts, ctx.bossPatternState, ctx.battleLog, ctx.logEntryIdSeq);
            ctx.bossPatternState = applied.state;
            ctx.battleLog = applied.battleLog;
            ctx.logEntryIdSeq = applied.logEntryIdSeq;
            ctx.lawActiveFromSkillId = applied.lawActiveFromSkillId;
          }
          ctx.playerStunTimer = 0;
          ctx.playerAttackTimer = B.BASE_ATTACK_INTERVAL;
          ctx.enemyAttackTimer = nextMon.attackInterval;
        }
      } else {
        // 보스 미구현 필드: 몬스터 소진 시 즉시 답파 완료
        ctx.battleResult = {
          type: 'explore_win',
          drops: ctx.explorePendingRewards.drops,
          proficiencyGains: ctx.explorePendingRewards.proficiencyGains,
          materialDrops: ctx.explorePendingRewards.materialDrops,
          message: '답파 완료!',
        };
        ctx.battleMode = 'none';
        ctx.currentEnemy = null;
        applyBattleReset(ctx);
      }
    } else {
      // 보스 처치 성공
      ctx.battleResult = {
        type: 'explore_win',
        drops: ctx.explorePendingRewards.drops,
        proficiencyGains: ctx.explorePendingRewards.proficiencyGains,
        materialDrops: ctx.explorePendingRewards.materialDrops,
        message: '답파 승리! 전체 보상 획득!',
      };
      ctx.battleMode = 'none';
      ctx.currentEnemy = null;
      applyBattleReset(ctx);
      ctx.logSystem('답파 승리!');
    }
  }
}

// ── 수련 모드 ──
function processHuntMode(
  ctx: TickContext,
  profGainParts: string[],
  monDef: ReturnType<typeof getMonsterDef> & {},
): void {
  {
    const rewards = profGainParts.map(s => {
      const m = s.match(/^(.+?)\s+(\S+)$/);
      return m ? { label: m[1], value: m[2] } : { label: s, value: '' };
    });
    ctx.logKill({ enemyName: monDef.name, rewards });
  }

  if (ctx.huntTarget) {
    const nextMon = getMonsterDef(ctx.huntTarget);
    if (nextMon) {
      ctx.currentEnemy = spawnEnemy(nextMon);
      ctx.equipmentDotOnEnemy = [];
      ctx.currentBattleDuration = 0;
      ctx.currentBattleDamageDealt = 0;
      ctx.playerAttackTimer = B.BASE_ATTACK_INTERVAL;
      ctx.enemyAttackTimer = nextMon.attackInterval;
      const newBps = createBossPatternState(ctx.huntTarget);
      ctx.bossPatternState = newBps;
      ctx.beginCombat({
        enemyId: nextMon.id,
        playerAttackInterval: calcPlayerAttackInterval(ctx.state),
        enemyAttackInterval: nextMon.attackInterval,
      });
      if (newBps) {
        const applied = applyBattleStartSkills(ctx.huntTarget, ctx.equippedArts, newBps, ctx.battleLog, ctx.logEntryIdSeq);
        ctx.bossPatternState = applied.state;
        ctx.battleLog = applied.battleLog;
        ctx.logEntryIdSeq = applied.logEntryIdSeq;
        ctx.lawActiveFromSkillId = applied.lawActiveFromSkillId;
      }
      ctx.playerStunTimer = 0;
    }
  }
}
