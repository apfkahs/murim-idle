/**
 * simulateTick — 순수 함수 (GameState → Partial<GameState>)
 * gameStore.ts에서 분리. 순환 의존성 방지를 위해 gameStore.ts를 import하지 않는다.
 */
import { BALANCE_PARAMS } from '../data/balance';
import { getArtDef, type ProficiencyType } from '../data/arts';
import { getMonsterDef, getMonsterAttackMsg, BOSS_PATTERNS } from '../data/monsters';
import { FIELDS, getFieldDef } from '../data/fields';
import { ACHIEVEMENTS, type AchievementContext } from '../data/achievements';
import { MATERIALS } from '../data/materials';
import { getEquipmentDef, type EquipmentInstance } from '../data/equipment';
import { getMaxSimdeuk } from '../data/tiers';
import {
  getArtDamageMultiplier, getMaxEquippedArtGrade,
  getArtGradeInfo, getProfStarInfo, getProfDamageValue,
} from './artUtils';
import {
  calcCritDmg, calcCritRate, calcDodge, calcDmgReduction, calcTierMultiplier,
  calcStamina, calcEffectiveRegen, calcMaxHp, calcQiPerSec, calcCombatQiRatio,
  gatherEquipmentStats, gatherMasteryEffects, spawnEnemy,
} from './combatCalc';
import type { GameState } from '../store/types';

const B = BALANCE_PARAMS;

// ── simulateTick 전용 상수 ──
const PROF_LABEL: Record<string, string> = {
  sword: '검법', palm: '장법', footwork: '보법', mental: '심법',
};

// ── 심득 성장 메시지 ──
const GROWTH_MESSAGES = {
  power: [
    '어렴풋이 더 효율적으로 공격할 수 있게 된 것 같다..',
    '일격에 실리는 힘이 전보다 묵직하게 느껴진다..',
  ],
  qi: [
    '기운이 모이는 속도가 조금 늘어난 것 같다..',
    '단전에 기운이 더 자연스럽게 모여든다..',
  ],
} as const;

function pickGrowthMsg(stat: keyof typeof GROWTH_MESSAGES): string {
  const pool = GROWTH_MESSAGES[stat];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── 내부 헬퍼 ──
/** 데미지에 ±10% 분산 적용 */
function applyVariance(value: number): number {
  return value * (0.9 + Math.random() * 0.2);
}

/** 플레이어 공격 데미지 */
function calcAttackDamage(
  baseDmg: number, profCoeff: number, profVal: number,
  gradeMult: number, bonusAtk: number,
): number {
  return applyVariance((baseDmg + Math.floor(profCoeff * profVal) + bonusAtk) * gradeMult);
}

/** 적 공격 데미지 */
function calcEnemyDamage(
  atkPower: number, mult: number, dmgReduction: number,
  fixedDmg?: number,
): number {
  if (fixedDmg != null) return fixedDmg;
  return Math.floor(applyVariance(atkPower) * mult * (1 - dmgReduction / 100));
}

function getTrainingSimdeuk(state: GameState, monsterId: string): number {
  if ((state.killCounts[monsterId] ?? 0) > 0) return 0;
  const mon = getMonsterDef(monsterId);
  return mon?.simdeuk ?? 0;
}

function buildAchievementContext(
  state: GameState & { totalKills?: number },
): AchievementContext {
  const artSimdeuks: Record<string, number> = {};
  for (const a of state.ownedArts) artSimdeuks[a.id] = a.totalSimdeuk;
  return {
    killCounts: state.killCounts,
    bossKillCounts: state.bossKillCounts,
    ownedArts: state.ownedArts.map(a => a.id),
    artSimdeuks,
    totalStats: state.stats.gi + state.stats.sim + state.stats.che,
    totalSimdeuk: state.totalSimdeuk,
    tier: state.tier,
    achievements: state.achievements,
    hiddenRevealedInField: state.hiddenRevealedInField,
    fieldUnlocks: state.fieldUnlocks,
    totalKills: state.totalKills ?? 0,
  };
}

function applySimdeuk(
  ownedArts: GameState['ownedArts'],
  equippedArts: string[],
  equippedSimbeop: string | null,
  amount: number,
  tier: number,
  battleLog: string[],
) {
  if (amount <= 0) return;
  const maxSd = getMaxSimdeuk(tier);
  const allEquipped = [...equippedArts];
  if (equippedSimbeop) allEquipped.push(equippedSimbeop);
  for (const artId of allEquipped) {
    const owned = ownedArts.find(a => a.id === artId);
    if (!owned) continue;
    if (owned.totalSimdeuk >= maxSd) continue;
    const before = owned.totalSimdeuk;
    owned.totalSimdeuk = Math.min(owned.totalSimdeuk + amount, maxSd);
    if (owned.totalSimdeuk > before && Math.random() < 0.1) {
      battleLog.push(pickGrowthMsg('power'));
    }
  }
}

// ============================================================
// simulateTick — 순수 함수 (설계서 8.4~8.6)
// ============================================================
export function simulateTick(state: GameState, dt: number, isSimulating: boolean): Partial<GameState> {
  let {
    qi, hp, maxHp, battleMode, currentEnemy,
    exploreStep, exploreOrder, isBossPhase, bossTimer,
    explorePendingRewards, battleLog, currentField,
    killCounts, bossKillCounts, totalSimdeuk, totalYasanKills,
    ownedArts, equippedArts, equippedSimbeop,
    battleResult,
    huntTarget, totalSpentQi,
    playerAttackTimer, enemyAttackTimer,
    floatingTexts, nextFloatingId, playerAnim, enemyAnim,
    fieldUnlocks, inventory,
    discoveredMasteries, pendingEnlightenments,
    stamina, currentBattleDuration, currentBattleDamageDealt,
    bossPatternState, playerStunTimer, lastEnemyAttack,
    pendingHuntRetry,
  } = state;
  let dodgeCounterActive = state.dodgeCounterActive ?? false;
  let totalKills = state.totalKills ?? 0;
  let hiddenRevealedInField = { ...state.hiddenRevealedInField };
  let equipmentInventory = [...state.equipmentInventory];
  let materials = { ...state.materials };
  let artGradeExp = { ...state.artGradeExp };
  let obtainedMaterials = [...state.obtainedMaterials];
  let knownEquipment = [...state.knownEquipment];
  let ultCooldowns = { ...state.ultCooldowns };
  if (bossPatternState) bossPatternState = { ...bossPatternState };
  const stats = { ...state.stats };
  const proficiency = { ...state.proficiency };

  killCounts = { ...killCounts };
  bossKillCounts = { ...bossKillCounts };
  ownedArts = ownedArts.map(a => ({ ...a }));
  explorePendingRewards = {
    simdeuk: explorePendingRewards.simdeuk,
    drops: [...explorePendingRewards.drops],
  };
  battleLog = [...battleLog];
  if (isSimulating) {
    if (battleLog.length > 10) battleLog = battleLog.slice(-10);
  } else {
    if (battleLog.length > 100) battleLog = battleLog.slice(-40);
  }
  fieldUnlocks = { ...fieldUnlocks };
  inventory = [...inventory];
  discoveredMasteries = [...discoveredMasteries];
  pendingEnlightenments = [...pendingEnlightenments];

  if (!isSimulating) {
    floatingTexts = [...floatingTexts];
  }

  const isBattling = battleMode !== 'none';

  function applyBattleReset() {
    stamina = 0;
    ultCooldowns = {};
    currentBattleDuration = 0;
    currentBattleDamageDealt = 0;
    bossPatternState = null;
    playerStunTimer = 0;
    dodgeCounterActive = false;
    lastEnemyAttack = null;
  }

  const handleDodge = (eName: string, customMsg?: string) => {
    battleLog.push(customMsg ?? `${eName}의 공격을 가볍게 피했다!`);
    if (!isSimulating) {
      floatingTexts = [...floatingTexts, { id: nextFloatingId++, text: '회피!', type: 'evade' as const, timestamp: Date.now() }];
      if (floatingTexts.length > 15) floatingTexts = floatingTexts.slice(-15);
    }
    if (masteryEffects?.dodgeCounterEnabled && Math.random() < 0.5) {
      dodgeCounterActive = true;
    }
  };

  // 전투 수치 계산
  const { gi, sim, che } = stats;
  const equipStats = gatherEquipmentStats(state);
  const critDmg = calcCritDmg();
  const critRate = Math.min(
    calcCritRate(state) + (equipStats.bonusCritRate ?? 0),
    B.CRIT_RATE_CAP,
  );
  const masteryDodge = calcDodge(state);
  const dodgeRate = Math.min(
    masteryDodge + (equipStats.bonusDodge ?? 0) / 100,
    B.DODGE_CAP,
  );
  const dmgReduction = calcDmgReduction(state) + (equipStats.bonusDmgReduction ?? 0);
  const tierMult = calcTierMultiplier(state.tier);
  const maxStamina = calcStamina(sim, tierMult);
  const effectiveRegen = calcEffectiveRegen(state);
  const qiPerSec = calcQiPerSec(state);
  const combatQiRatio = calcCombatQiRatio(state);
  const masteryEffects = isBattling ? gatherMasteryEffects(state) : null;

  const qiMult = 1 + (equipStats.bonusQiMultiplier ?? 0);

  // 1) 기운 생산 (비전투)
  if (!isBattling) {
    qi += qiPerSec * dt * qiMult;
  }

  // 1-1) 전투 중 기운 생산
  if (isBattling && combatQiRatio > 0) {
    qi += qiPerSec * combatQiRatio * dt * qiMult;
  }

  // 2) HP 자동회복 (전투 외)
  if (!isBattling) {
    maxHp = calcMaxHp(che, equipStats.bonusHp ?? 0, tierMult);
    hp = Math.min(hp + maxHp * 0.05 * dt, maxHp);

    if (pendingHuntRetry && hp >= maxHp && huntTarget && currentField) {
      const retryMon = getMonsterDef(huntTarget);
      if (retryMon) {
        pendingHuntRetry = false;
        battleMode = 'hunt';
        currentEnemy = spawnEnemy(retryMon);
        battleResult = null;
        playerAttackTimer = B.BASE_ATTACK_INTERVAL;
        enemyAttackTimer = retryMon.attackInterval;
        applyBattleReset();
        bossPatternState = BOSS_PATTERNS[huntTarget]
          ? { bossStamina: BOSS_PATTERNS[huntTarget].stamina.initial, rageUsed: false, playerFreezeLeft: 0 }
          : null;
        if (!isSimulating) battleLog = [...battleLog, `— ${retryMon.name} 자동 재도전 —`];
      }
    }
  }

  // 3) 전투 (타이머 기반)
  if (isBattling && currentEnemy) {
    currentBattleDuration += dt;

    if (currentEnemy.regen > 0) {
      currentEnemy = { ...currentEnemy };
      currentEnemy.hp = Math.min(
        currentEnemy.hp + currentEnemy.regen * dt,
        currentEnemy.maxHp,
      );
    }

    if (bossPatternState) {
      const pattern = BOSS_PATTERNS[currentEnemy.id];
      if (pattern) {
        bossPatternState.bossStamina = Math.min(
          bossPatternState.bossStamina + pattern.stamina.regenPerSec * dt,
          pattern.stamina.max,
        );
      }
    }

    if (bossPatternState && currentEnemy) {
      const dotPattern = BOSS_PATTERNS[currentEnemy.id];
      if (dotPattern?.dotDamagePerStack && bossPatternState.bossStamina > 0) {
        const dotDmg = dotPattern.dotDamagePerStack * bossPatternState.bossStamina * dt * (1 - dmgReduction / 100);
        hp -= dotDmg;
      }
    }

    if (playerStunTimer > 0) {
      playerStunTimer = Math.max(0, playerStunTimer - dt);
    }

    if (playerStunTimer <= 0) {
      stamina = Math.min(stamina + effectiveRegen * dt, maxStamina);

      for (const artId of Object.keys(ultCooldowns)) {
        ultCooldowns[artId] -= dt;
        if (ultCooldowns[artId] <= 0) delete ultCooldowns[artId];
      }

      const freezeMultiplier = (bossPatternState?.playerFreezeLeft ?? 0) > 0 ? 2 : 1;
      playerAttackTimer -= dt / freezeMultiplier;
      if (playerAttackTimer <= 0) {
        if (bossPatternState?.playerFreezeLeft) {
          bossPatternState.playerFreezeLeft = Math.max(0, bossPatternState.playerFreezeLeft - 1);
        }
        const atkSpeedBonus = (masteryEffects?.bonusAtkSpeed ?? 0) + (equipStats.bonusAtkSpeed ?? 0);
        const attackInterval = Math.max(B.BASE_ATTACK_INTERVAL - atkSpeedBonus, B.ATK_SPEED_MIN);
        playerAttackTimer += attackInterval;

        currentEnemy = { ...currentEnemy };

        const effects = masteryEffects!;
        const { activeMasteries } = state;

        let damage: number;
        let isCritical = false;
        let attackName = '평타';
        let isUlt = false;

        // 절초 판정
        const ultCandidates = equippedArts.filter(artId => {
          const def = getArtDef(artId);
          if (!def?.ultMultiplier || def.ultCost == null) return false;
          const artActiveMasteries = activeMasteries[artId] ?? [];
          const hasUltUnlock = def.masteries.some(m =>
            artActiveMasteries.includes(m.id) && m.effects?.unlockUlt);
          if (!hasUltUnlock) return false;
          return stamina >= def.ultCost! && (ultCooldowns[artId] ?? 0) <= 0;
        });

        if (ultCandidates.length > 0) {
          const chosenId = ultCandidates[Math.floor(Math.random() * ultCandidates.length)];
          const chosenDef = getArtDef(chosenId)!;

          isUlt = true;

          const artMasteryIds = activeMasteries[chosenId] ?? [];
          let ultChangeName: string | undefined;
          for (const mId of artMasteryIds) {
            const mDef = chosenDef.masteries.find(m => m.id === mId);
            if (mDef?.effects?.ultChange?.name) {
              ultChangeName = mDef.effects.ultChange.name;
            }
          }

          const ultProfType = chosenDef.proficiencyType;
          const ultProf = proficiency[ultProfType] ?? 0;
          const ultGradeMult = getArtDamageMultiplier(
            chosenDef,
            artGradeExp[chosenId] ?? 0,
            state.activeMasteries[chosenId] ?? [],
          );
          damage = calcAttackDamage(
            chosenDef.ultBaseDamage ?? 0, chosenDef.ultMultiplier!, getProfDamageValue(ultProf),
            ultGradeMult, equipStats.bonusAtk ?? 0,
          );
          stamina -= chosenDef.ultCost!;
          ultCooldowns[chosenId] = chosenDef.ultCooldown ?? 0;
          attackName = ultChangeName ?? chosenDef.ultMessages?.[0] ?? '절초';
        } else {
          // 일반 초식: 균등 랜덤
          const activeCandidates = equippedArts
            .map(id => ({ id, def: getArtDef(id)!, owned: ownedArts.find(a => a.id === id) }))
            .filter(x => x.def && x.def.artType === 'active' && x.owned);

          if (activeCandidates.length > 0) {
            const chosen = activeCandidates[Math.floor(Math.random() * activeCandidates.length)];

            const normalProfType = chosen.def.proficiencyType;
            const normalProf = proficiency[normalProfType] ?? 0;
            const normalGradeMult = getArtDamageMultiplier(
              chosen.def,
              artGradeExp[chosen.id] ?? 0,
              state.activeMasteries[chosen.id] ?? [],
            );
            damage = calcAttackDamage(
              chosen.def.baseDamage ?? 0, chosen.def.proficiencyCoefficient, getProfDamageValue(normalProf),
              normalGradeMult, equipStats.bonusAtk ?? 0,
            );

            if (chosen.def.normalMessages && chosen.def.normalMessages.length > 0) {
              attackName = chosen.def.normalMessages[Math.floor(Math.random() * chosen.def.normalMessages.length)];
            } else {
              attackName = chosen.def.name;
            }
          } else {
            damage = 1;
          }
        }

        // 치명타 판정
        if (Math.random() < critRate) {
          damage *= critDmg / 100;
          isCritical = true;
        }

        // 회피 카운터 배율
        let isCounterHit = false;
        if (dodgeCounterActive) {
          damage *= 1.2;
          dodgeCounterActive = false;
          isCounterHit = true;
        }

        damage = Math.floor(damage);
        currentEnemy.hp -= damage;
        currentBattleDamageDealt += damage;

        const monDef = getMonsterDef(currentEnemy.id);
        const eName = monDef?.name ?? currentEnemy.id;

        if (isUlt) {
          if (attackName === '태산압정') {
            battleLog.push(`비기 — 태산압정! ${eName}에게 ${damage}의 거대한 충격!`);
          } else {
            battleLog.push(`절초 — ${attackName}! ${eName}에게 ${damage} 피해!`);
          }
        } else if (isCritical) {
          battleLog.push(`치명타! ${attackName} ${eName}에게 ${damage} 피해!`);
        } else {
          battleLog.push(`${attackName} ${eName}에게 ${damage} 피해를 입혔다.`);
        }
        if (isCounterHit) {
          battleLog.push('적의 공격을 간파하고 강력한 공격을 가했다!');
        }

        if (!isSimulating) {
          if (isUlt) {
            floatingTexts = [...floatingTexts, { id: nextFloatingId++, text: `${damage} 절초!`, type: 'critical' as const, timestamp: Date.now() }];
          } else if (isCritical) {
            floatingTexts = [...floatingTexts, { id: nextFloatingId++, text: `${damage} 치명타!`, type: 'critical' as const, timestamp: Date.now() }];
          } else if (damage > 0) {
            floatingTexts = [...floatingTexts, { id: nextFloatingId++, text: `${damage}`, type: 'damage' as const, timestamp: Date.now() }];
          }
          if (floatingTexts.length > 15) floatingTexts = floatingTexts.slice(-15);
          playerAnim = 'attack';
        }
      }
    } // end stun guard

    // 적 사망 체크
    if (currentEnemy.hp <= 0) {
      const monDef = getMonsterDef(currentEnemy.id);
      if (monDef) {
        if (monDef.isHidden && currentField) {
          hiddenRevealedInField[currentField] = monDef.id;
        }

        killCounts[monDef.id] = (killCounts[monDef.id] ?? 0) + 1;
        totalKills++;

        const yasanIds = ['squirrel', 'rabbit', 'fox', 'deer', 'boar', 'wolf', 'bear'];
        if (yasanIds.includes(monDef.id) || monDef.isHidden) {
          totalYasanKills++;
        }

        if (monDef.isBoss) {
          bossKillCounts[monDef.id] = (bossKillCounts[monDef.id] ?? 0) + 1;
        }

        // 심득
        let simdeuk = monDef.simdeuk;
        if (monDef.isTraining) {
          simdeuk = getTrainingSimdeuk(state, monDef.id);
          if (killCounts[monDef.id] > 1) simdeuk = 0;
        } else if (monDef.grade > 0) {
          const maxArtGrade = getMaxEquippedArtGrade(equippedArts, equippedSimbeop, artGradeExp);
          if (maxArtGrade > 0) {
            const diff = maxArtGrade - monDef.grade;
            if (diff >= 3) {
              simdeuk = 0;
              if (Math.random() < 0.05) battleLog.push('너무 약한 상대라 심득을 얻지 못했다.');
            } else if (diff === 2) {
              simdeuk = Math.floor(simdeuk * 0.2);
            } else if (diff === 1) {
              simdeuk = Math.floor(simdeuk * 0.5);
            }
          }
        }

        // 숙련도 독립 획득
        const profGainParts: string[] = [];
        if (!monDef.isTraining && (monDef.baseProficiency ?? 0) > 0) {
          const baseProfGain = monDef.baseProficiency!;
          const monsterGrade = monDef.grade >= 1 ? monDef.grade : 1;
          const profGainMap: Partial<Record<ProficiencyType, number>> = {};
          for (const artId of [...equippedArts, ...(equippedSimbeop ? [equippedSimbeop] : [])]) {
            const artDef = getArtDef(artId);
            if (!artDef?.proficiencyType) continue;
            const pType = artDef.proficiencyType;
            if (pType in profGainMap) continue;
            const currentGrade = getProfStarInfo(proficiency[pType] ?? 0).starIndex;
            const multiplier = Math.pow(2.5, monsterGrade - currentGrade);
            profGainMap[pType] = baseProfGain * multiplier;
          }
          for (const [pType, gain] of Object.entries(profGainMap) as [ProficiencyType, number][]) {
            proficiency[pType] = (proficiency[pType] ?? 0) + gain;
            profGainParts.push(`${PROF_LABEL[pType] ?? pType} +${gain.toFixed(1)}`);
          }

          const allEquippedArts = [...new Set([...equippedArts, ...(equippedSimbeop ? [equippedSimbeop] : [])])];
          for (const artId of allEquippedArts) {
            const currentArtStar = getArtGradeInfo(artGradeExp[artId] ?? 0).starIndex;
            const artGradeMultiplier = Math.pow(2.5, monsterGrade - currentArtStar);
            artGradeExp[artId] = (artGradeExp[artId] ?? 0) + baseProfGain * artGradeMultiplier;
          }
        }

        // 드롭
        const drops: string[] = [];
        for (const drop of monDef.drops) {
          if (Math.random() < drop.chance) {
            if (!ownedArts.some(a => a.id === drop.artId) && !inventory.some(i => i.artId === drop.artId)) {
              drops.push(drop.artId);
              inventory.push({
                id: `${Date.now()}_${drop.artId}`,
                itemType: 'art_scroll',
                artId: drop.artId,
                obtainedFrom: monDef.id,
                obtainedAt: Date.now(),
              });
              battleLog.push(`${getArtDef(drop.artId)?.name ?? drop.artId} 비급이 전낭에 담겼다!`);
            }
          }
        }

        // 장비 드롭
        if (monDef.equipDrops) {
          for (const eqDrop of monDef.equipDrops) {
            if (Math.random() < eqDrop.chance) {
              const alreadyOwned = Object.values(state.equipment).some(e => e?.defId === eqDrop.equipId)
                || equipmentInventory.some(e => e.defId === eqDrop.equipId);
              if (alreadyOwned) continue;
              const eqDef = getEquipmentDef(eqDrop.equipId);
              if (eqDef) {
                const instance: EquipmentInstance = {
                  instanceId: `eq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                  defId: eqDrop.equipId,
                  obtainedFrom: monDef.id,
                  obtainedAt: Date.now(),
                };
                equipmentInventory.push(instance);
                if (!knownEquipment.includes(eqDrop.equipId)) knownEquipment.push(eqDrop.equipId);
                battleLog.push(`${eqDef.name}을(를) 획득했다!`);
              }
            }
          }
        }

        // 재료 드롭
        if (monDef.id === 'training_wood' && killCounts[monDef.id] === 1) {
          materials['wood_fragment'] = (materials['wood_fragment'] ?? 0) + 1;
          if (!obtainedMaterials.includes('wood_fragment')) obtainedMaterials.push('wood_fragment');
          battleLog.push('나무 조각 1개를 주웠다. 무언가를 만드는 데 쓸 수 있을 것 같다...');
        } else if (monDef.materialDrops) {
          for (const mDrop of monDef.materialDrops) {
            if (Math.random() < mDrop.chance) {
              materials[mDrop.materialId] = (materials[mDrop.materialId] ?? 0) + 1;
              if (!obtainedMaterials.includes(mDrop.materialId)) {
                obtainedMaterials.push(mDrop.materialId);
              }
              const matName = MATERIALS.find(m => m.id === mDrop.materialId)?.name ?? mDrop.materialId;
              battleLog.push(`${matName}을(를) 주웠다! (${materials[mDrop.materialId]}개)`);
            }
          }
        }

        // 처치 시 기운 보너스
        if (masteryEffects?.killBonusEnabled && combatQiRatio > 0) {
          const combatQiRate = qiPerSec * combatQiRatio;
          const bonusQi = combatQiRate * currentBattleDuration * B.KILL_BONUS_RATIO;
          qi += bonusQi * qiMult;
        }

        // 초(招) 발견 체크
        const allArts = [...new Set([...equippedArts, ...(equippedSimbeop ? [equippedSimbeop] : [])])];
        for (const artId of allArts) {
          const artDef = getArtDef(artId);
          const artOwned = ownedArts.find(a => a.id === artId);
          if (!artDef || !artOwned) continue;
          for (const m of artDef.masteries) {
            if (!m.discovery) continue;
            if (m.discovery.type === 'bijup') continue;
            if (discoveredMasteries.includes(m.id)) continue;
            let discovered = false;
            if (m.discovery.type === 'simdeuk' && m.discovery.threshold != null) {
              if (artOwned.totalSimdeuk >= m.discovery.threshold) discovered = true;
            } else if (m.discovery.type === 'boss' && m.discovery.bossId) {
              if ((bossKillCounts[m.discovery.bossId] ?? 0) >= 1) discovered = true;
            }
            if (discovered) {
              discoveredMasteries.push(m.id);
              pendingEnlightenments.push({ artId, masteryId: m.id, masteryName: m.name });
              battleLog.push(`깨달음! ${artDef.name}의 오의 '${m.name}'을(를) 깨우쳤다!`);
            }
          }
        }

        // 선언적 전장 해금
        if (monDef.isBoss) {
          for (const field of FIELDS) {
            if (fieldUnlocks[field.id]) continue;
            const cond = field.unlockCondition;
            if (!cond) continue;
            const bossOk = !cond.bossKill || cond.bossKill === monDef.id;
            const tierOk = cond.minTier == null || state.tier >= cond.minTier;
            if (bossOk && tierOk) {
              fieldUnlocks[field.id] = true;
            }
          }
        }

        if (battleMode === 'explore') {
          explorePendingRewards.simdeuk += simdeuk;
          explorePendingRewards.drops.push(...drops);
          battleLog.push(`— ${monDef.name} 처치. 심득 +${simdeuk}${profGainParts.length > 0 ? `  ${profGainParts.join('  ')}` : ''} —`);

          if (monDef.isHidden) {
            totalSimdeuk += explorePendingRewards.simdeuk;
            applySimdeuk(ownedArts, equippedArts, equippedSimbeop, explorePendingRewards.simdeuk, state.tier, battleLog);
            battleResult = {
              type: 'explore_win',
              simdeuk: explorePendingRewards.simdeuk,
              drops: explorePendingRewards.drops,
              message: '히든 처치! 답파 대성공!',
            };
            battleMode = 'none';
            currentEnemy = null;
            applyBattleReset();
            battleLog.push('괴이한 존재를 물리치고 답파에 성공했다!');
          } else {
            const nextStep = exploreStep + 1;
            if (nextStep < exploreOrder.length) {
              const nextMon = getMonsterDef(exploreOrder[nextStep]);
              if (nextMon) {
                currentEnemy = spawnEnemy(nextMon);
                exploreStep = nextStep;
                currentBattleDuration = 0;
                currentBattleDamageDealt = 0;
                stamina = 0;
                ultCooldowns = {};
                battleLog.push(`— ${nextMon.name} 등장 —`);
                if (nextMon.isHidden && currentField) {
                  if (!hiddenRevealedInField[currentField]) {
                    battleLog.push('산군이 쓰러진 틈에 괴이한 존재가 침입한 것 같다..');
                  }
                  hiddenRevealedInField[currentField] = nextMon.id;
                }
                bossPatternState = BOSS_PATTERNS[nextMon.id]
                  ? { bossStamina: BOSS_PATTERNS[nextMon.id].stamina.initial, rageUsed: false, playerFreezeLeft: 0 }
                  : null;
                playerStunTimer = 0;
                playerAttackTimer = B.BASE_ATTACK_INTERVAL;
                enemyAttackTimer = nextMon.attackInterval;
              }
            } else if (!isBossPhase) {
              const field = getFieldDef(currentField!);
              if (field?.boss) {
                const bossMon = getMonsterDef(field.boss);
                if (bossMon) {
                  isBossPhase = true;
                  bossTimer = field.bossTimer ?? 60;
                  currentEnemy = spawnEnemy(bossMon);
                  currentBattleDuration = 0;
                  currentBattleDamageDealt = 0;
                  stamina = 0;
                  ultCooldowns = {};
                  battleLog.push(`— 보스 등장! ${bossMon.name}이(가) 나타났다! —`);
                  bossPatternState = BOSS_PATTERNS[bossMon.id]
                    ? { bossStamina: BOSS_PATTERNS[bossMon.id].stamina.initial, rageUsed: false, playerFreezeLeft: 0 }
                    : null;
                  playerStunTimer = 0;
                  playerAttackTimer = B.BASE_ATTACK_INTERVAL;
                  enemyAttackTimer = bossMon.attackInterval;
                }
              } else {
                // 보스 미구현 필드: 몬스터 소진 시 즉시 답파 완료
                totalSimdeuk += explorePendingRewards.simdeuk;
                applySimdeuk(ownedArts, equippedArts, equippedSimbeop, explorePendingRewards.simdeuk, state.tier, battleLog);
                battleResult = {
                  type: 'explore_win',
                  simdeuk: explorePendingRewards.simdeuk,
                  drops: explorePendingRewards.drops,
                  message: '답파 완료!',
                };
                battleMode = 'none';
                currentEnemy = null;
                applyBattleReset();
              }
            } else {
              // 보스 처치 성공
              totalSimdeuk += explorePendingRewards.simdeuk;
              applySimdeuk(ownedArts, equippedArts, equippedSimbeop, explorePendingRewards.simdeuk, state.tier, battleLog);

              battleResult = {
                type: 'explore_win',
                simdeuk: explorePendingRewards.simdeuk,
                drops: explorePendingRewards.drops,
                message: '답파 승리! 전체 보상 획득!',
              };
              battleMode = 'none';
              currentEnemy = null;
              applyBattleReset();
              battleLog.push('답파 승리!');
            }
          }
        } else if (battleMode === 'hunt') {
          totalSimdeuk += simdeuk;
          applySimdeuk(ownedArts, equippedArts, equippedSimbeop, simdeuk, state.tier, battleLog);
          battleLog.push(`— ${monDef.name} 처치. 심득 +${simdeuk}${profGainParts.length > 0 ? `  ${profGainParts.join('  ')}` : ''} —`);

          if (huntTarget) {
            const nextMon = getMonsterDef(huntTarget);
            if (nextMon) {
              currentEnemy = spawnEnemy(nextMon);
              currentBattleDuration = 0;
              currentBattleDamageDealt = 0;
              playerAttackTimer = B.BASE_ATTACK_INTERVAL;
              enemyAttackTimer = nextMon.attackInterval;
              if (BOSS_PATTERNS[huntTarget]) {
                bossPatternState = { bossStamina: BOSS_PATTERNS[huntTarget].stamina.initial, rageUsed: false, playerFreezeLeft: 0 };
              }
              playerStunTimer = 0;
            }
          }
        }
      }
    } else {
      // 적 공격 타이머
      if (currentEnemy.attackPower > 0 && currentEnemy.attackInterval > 0) {
        enemyAttackTimer -= dt;
        if (enemyAttackTimer <= 0) {
          enemyAttackTimer += currentEnemy.attackInterval;
          const monDef = getMonsterDef(currentEnemy.id);
          const eName = monDef?.name ?? currentEnemy.id;

          const pattern = bossPatternState ? BOSS_PATTERNS[currentEnemy.id] : null;
          let skillUsed = false;

          if (pattern && bossPatternState) {
            const sortedSkills = [...pattern.skills].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
            for (const skill of sortedSkills) {
              let triggered = false;
              if (skill.triggerCondition === 'stamina_full' && bossPatternState.bossStamina >= (skill.staminaCost ?? pattern.stamina.max)) {
                triggered = true;
              } else if (skill.triggerCondition === 'hp_threshold' && skill.hpThreshold != null) {
                if (currentEnemy.hp / currentEnemy.maxHp <= skill.hpThreshold && !(skill.oneTime && bossPatternState.rageUsed)) {
                  triggered = true;
                }
              } else if (skill.triggerCondition === 'default') {
                triggered = true;
              }
              if (!triggered) continue;
              if (skill.type === 'dot_apply' || skill.type === 'double_hit') continue;

              skillUsed = true;
              const logMsg = skill.logMessages[Math.floor(Math.random() * skill.logMessages.length)];

              if (skill.staminaCost) {
                bossPatternState.bossStamina -= skill.staminaCost;
              }

              if (skill.type === 'stun') {
                if (!skill.undodgeable && Math.random() < dodgeRate) {
                  handleDodge(eName, `${eName}의 포효를 흘려냈다!`);
                } else {
                  playerStunTimer = skill.stunDuration ?? 4;
                  battleLog.push(logMsg);
                  lastEnemyAttack = { enemyName: eName, attackMessage: logMsg };
                }
              } else if (skill.type === 'replace_normal' && !skill.useNormalDamage && !skill.damageMultiplier) {
                if (skill.staminaGain) {
                  bossPatternState.bossStamina = Math.min(
                    bossPatternState.bossStamina + skill.staminaGain,
                    pattern.stamina.max,
                  );
                }
                battleLog.push(logMsg);
              } else if (skill.type === 'freeze_attack') {
                const dmg = calcEnemyDamage(currentEnemy.attackPower, skill.damageMultiplier ?? 1, dmgReduction, skill.fixedDamage);
                if (skill.undodgeable || Math.random() >= dodgeRate) {
                  hp -= dmg;
                  if (skill.freezeAttacks && bossPatternState) {
                    bossPatternState.playerFreezeLeft = skill.freezeAttacks;
                  }
                  const freezeSuffix = skill.freezeAttacks ? ' 빙결!' : '';
                  const attackMsg = `${logMsg} ${dmg} 피해!${freezeSuffix}`;
                  battleLog.push(attackMsg);
                  lastEnemyAttack = { enemyName: eName, attackMessage: attackMsg };
                  if (!isSimulating) enemyAnim = 'attack';
                } else {
                  handleDodge(eName);
                }
              } else {
                if (skill.oneTime && skill.type === 'rage_attack') {
                  bossPatternState.rageUsed = true;
                }
                const skillDmg = calcEnemyDamage(currentEnemy.attackPower, skill.damageMultiplier ?? 1, dmgReduction);

                if (skill.undodgeable || Math.random() >= dodgeRate) {
                  hp -= skillDmg;
                  battleLog.push(`${logMsg} ${skillDmg} 피해!`);
                  lastEnemyAttack = { enemyName: eName, attackMessage: `${logMsg} ${skillDmg} 피해!` };
                  if (!isSimulating) {
                    enemyAnim = 'attack';
                  }
                } else {
                  handleDodge(eName);
                }
              }
              break;
            }
          }

          if (!skillUsed) {
            if (Math.random() < dodgeRate) {
              handleDodge(eName);
            } else {
              const incomingDmg = calcEnemyDamage(currentEnemy.attackPower, 1, dmgReduction);
              hp -= incomingDmg;
              if (incomingDmg > 0 && monDef) {
                const attackMsg = getMonsterAttackMsg(monDef, incomingDmg);
                battleLog.push(attackMsg);
                lastEnemyAttack = { enemyName: eName, attackMessage: attackMsg };
              }
              if (!isSimulating) {
                enemyAnim = 'attack';
              }
              const dotPattern2 = bossPatternState ? BOSS_PATTERNS[currentEnemy.id] : null;
              if (dotPattern2 && bossPatternState) {
                const dotSkill = dotPattern2.skills.find(s => s.type === 'dot_apply');
                if (dotSkill && Math.random() < (dotSkill.chance ?? 0)) {
                  bossPatternState.bossStamina = Math.min(
                    bossPatternState.bossStamina + (dotSkill.staminaGain ?? 1),
                    dotPattern2.stamina.max,
                  );
                  const dmsg = dotSkill.logMessages[Math.floor(Math.random() * dotSkill.logMessages.length)];
                  battleLog.push(dmsg);
                }
                const dblSkill = dotPattern2.skills.find(s => s.type === 'double_hit');
                if (dblSkill && Math.random() < (dblSkill.chance ?? 0)) {
                  const dmsg = dblSkill.logMessages[Math.floor(Math.random() * dblSkill.logMessages.length)];
                  if (Math.random() >= dodgeRate) {
                    const dmg2 = calcEnemyDamage(currentEnemy.attackPower, 1, dmgReduction);
                    hp -= dmg2;
                    battleLog.push(`${dmsg} ${dmg2} 피해!`);
                  } else {
                    battleLog.push(`${dmsg} — 회피!`);
                    if (masteryEffects?.dodgeCounterEnabled && Math.random() < 0.5) {
                      dodgeCounterActive = true;
                    }
                  }
                  if (dblSkill.staminaGain) {
                    bossPatternState.bossStamina = Math.min(
                      bossPatternState.bossStamina + dblSkill.staminaGain,
                      dotPattern2.stamina.max,
                    );
                  }
                }
              }
            }
          }
        }
      }
    }

    // HP <= 0: 전투 종료
    if (hp <= 0) {
      hp = 1;
      const deathLog = lastEnemyAttack
        ? `${lastEnemyAttack.enemyName}의 공격을 받아 쓰러졌습니다...`
        : undefined;
      const recentBattleLog = battleLog.slice(-8);
      if (battleMode === 'explore') {
        battleResult = {
          type: 'death',
          simdeuk: 0,
          drops: [],
          message: '패배... 보상이 없습니다.',
          deathLog,
          recentBattleLog,
        };
      } else {
        battleResult = {
          type: 'hunt_end',
          simdeuk: totalSimdeuk - state.totalSimdeuk,
          drops: [],
          message: '사망! 전투 종료.',
          deathLog,
          recentBattleLog,
        };
        pendingHuntRetry = true;
      }
      battleMode = 'none';
      currentEnemy = null;
      applyBattleReset();
    }

    // 보스 타이머
    if (isBossPhase && bossTimer > 0) {
      bossTimer -= dt;
      if (bossTimer <= 0) {
        battleResult = {
          type: 'explore_fail',
          simdeuk: 0,
          drops: [],
          message: '시간 초과! 보상이 없습니다.',
        };
        battleMode = 'none';
        currentEnemy = null;
        applyBattleReset();
      }
    }
  }

  // 4) 업적 체크
  let achievements = [...state.achievements];
  let achievementCount = state.achievementCount ?? 0;
  const artPoints = state.artPoints;

  const ctx = buildAchievementContext({
    ...state, killCounts, bossKillCounts, ownedArts,
    totalSimdeuk, achievements, hiddenRevealedInField,
    totalYasanKills, fieldUnlocks, totalKills,
  });

  for (const ach of ACHIEVEMENTS) {
    if (achievements.includes(ach.id)) continue;
    if (ach.prerequisite && !achievements.includes(ach.prerequisite)) continue;
    if (ach.check(ctx)) {
      achievements.push(ach.id);
      achievementCount += 1;
      battleLog.push(`업적 달성: ${ach.name}!`);
    }
  }

  // Tutorial flags
  const tutorialFlags = { ...state.tutorialFlags };
  if (killCounts['training_wood'] > 0) tutorialFlags.killedWood = true;
  if (killCounts['training_iron'] > 0) tutorialFlags.killedIron = true;
  if (tutorialFlags.equippedSword && tutorialFlags.equippedSimbeop) {
    tutorialFlags.yasanUnlocked = true;
    fieldUnlocks.yasan = true;
  }

  const result: Partial<GameState> = {
    qi, hp, maxHp, battleMode, currentEnemy,
    exploreStep, exploreOrder, isBossPhase, bossTimer,
    explorePendingRewards, battleLog, killCounts,
    bossKillCounts, totalSimdeuk, totalYasanKills, totalKills,
    ownedArts, battleResult,
    achievements, achievementCount, artPoints, hiddenRevealedInField,
    tutorialFlags, totalSpentQi,
    playerAttackTimer, enemyAttackTimer,
    fieldUnlocks, inventory,
    discoveredMasteries, pendingEnlightenments,
    stamina, ultCooldowns, currentBattleDuration, currentBattleDamageDealt,
    equipmentInventory, materials, obtainedMaterials, knownEquipment,
    bossPatternState, playerStunTimer, lastEnemyAttack,
    proficiency, artGradeExp, pendingHuntRetry, dodgeCounterActive,
  };

  if (!isSimulating) {
    result.floatingTexts = floatingTexts;
    result.nextFloatingId = nextFloatingId;
    result.playerAnim = playerAnim;
    result.enemyAnim = enemyAnim;
  }

  return result;
}
