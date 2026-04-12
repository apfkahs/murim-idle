import type { StateCreator } from 'zustand';
import type { GameStore } from '../gameStore';
import type { OfflineResult, SaveMeta, GameState } from '../types';
import { getTierDef } from '../../data/tiers';
import { getArtDef } from '../../data/arts';
import { calcMaxHp, calcTierMultiplier, calcStamina, spawnEnemy, CLEAR_BATTLE_STATE } from '../../utils/combatCalc';
import { simulateTick } from '../../utils/gameLoop';
import { buildAchievementContext } from '../../utils/combat/damageCalc';
import { ACHIEVEMENTS, CODEX_MONSTERS } from '../../data/achievements';
import { createInitialState } from '../initialState';
import { FIELDS, getFieldDef, generateExploreOrder } from '../../data/fields';
import { getMonsterDef, BOSS_PATTERNS } from '../../data/monsters';
import { BALANCE_PARAMS } from '../../data/balance';

export type SaveSlice = {
  // ── state ──
  lastTickTime: number;
  gameSpeed: number;
  currentSaveSlot: number;

  // ── actions ──
  saveGame: (slot?: number) => void;
  loadGame: (slot: number) => void;
  resetGame: (slot?: number) => void;
  deleteSlot: (slot: number) => void;
  getSaveSlots: () => (SaveMeta | null)[];
  exportSave: (slot: number) => void;
  importSave: (slot: number, jsonString: string) => boolean;
  processOfflineProgress: (elapsedSeconds: number) => OfflineResult;
};

export const createSaveSlice: StateCreator<GameStore, [], [], SaveSlice> = (set, get) => ({
  // ── 초기 상태 ──
  lastTickTime: Date.now(),
  gameSpeed: 1,
  currentSaveSlot: 0,

  // ── 액션 ──
  saveGame: (slot) => {
    const state = get() as GameStore;
    const targetSlot = slot ?? state.currentSaveSlot;

    const saveData = {
      version: '4.0',
      qi: state.qi,
      totalSpentQi: state.totalSpentQi,
      stats: state.stats,
      hp: state.hp,
      tier: state.tier,
      equippedSimbeop: state.equippedSimbeop,
      ownedArts: state.ownedArts,
      equippedArts: state.equippedArts,
      artPoints: state.artPoints,
      artGradeExp: state.artGradeExp,
      achievements: state.achievements,
      achievementCount: state.achievementCount,
      killCounts: state.killCounts,
      bossKillCounts: state.bossKillCounts,
      totalYasanKills: state.totalYasanKills,
      totalKills: state.totalKills,
      hiddenRevealedInField: state.hiddenRevealedInField,
      bossPatternState: state.bossPatternState,
      playerStunTimer: state.playerStunTimer,
      lastEnemyAttack: state.lastEnemyAttack,
      tutorialFlags: state.tutorialFlags,
      battleMode: state.battleMode,
      huntTarget: state.huntTarget,
      currentField: state.currentField,
      currentEnemy: state.currentEnemy,
      exploreStep: state.exploreStep,
      exploreOrder: state.exploreOrder,
      isBossPhase: state.isBossPhase,
      bossTimer: state.bossTimer,
      explorePendingRewards: state.explorePendingRewards,
      playerAttackTimer: state.playerAttackTimer,
      enemyAttackTimer: state.enemyAttackTimer,
      activeMasteries: state.activeMasteries,
      fieldUnlocks: state.fieldUnlocks,
      inventory: state.inventory,
      discoveredMasteries: state.discoveredMasteries,
      stamina: state.stamina,
      ultCooldowns: state.ultCooldowns,
      currentBattleDuration: state.currentBattleDuration,
      currentBattleDamageDealt: state.currentBattleDamageDealt,
      equipment: state.equipment,
      equipmentInventory: state.equipmentInventory,
      materials: state.materials,
      craftedRecipes: state.craftedRecipes,
      unlockedRecipes: state.unlockedRecipes,
      obtainedMaterials: state.obtainedMaterials,
      knownEquipment: state.knownEquipment,
      proficiency: state.proficiency,
      autoExploreFields: state.autoExploreFields,
      pendingAutoExplore: state.pendingAutoExplore,
      currentSaveSlot: targetSlot,
      lastTickTime: Date.now(),
      savedAt: Date.now(),
    };

    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(`murim_save_slot_${targetSlot}`, JSON.stringify(saveData));
      localStorage.setItem('murim_save_current', String(targetSlot));
    }
  },

  loadGame: (slot) => {
    if (typeof window === 'undefined' || !window.localStorage) return;

    const raw = localStorage.getItem(`murim_save_slot_${slot}`);
    if (!raw) return;

    try {
      const data = JSON.parse(raw);

      if (!data.version || !data.version.startsWith('4')) {
        return;
      }

      // fieldUnlocks IIFE 안에서 참조하기 위해 set() 밖에서 먼저 계산
      const migratedBossKillCounts: Record<string, number> = (() => {
        if (data.bossKillCounts && Object.keys(data.bossKillCounts).length > 0) {
          return data.bossKillCounts;
        }
        const bossIds = ['tiger_boss', 'innkeeper_true', 'bandit_leader'];
        const migrated: Record<string, number> = {};
        for (const id of bossIds) {
          const n = (data.killCounts ?? {})[id] ?? 0;
          if (n > 0) migrated[id] = n;
        }
        return migrated;
      })();

      const tier = data.tier ?? 0;
      const tierMult = calcTierMultiplier(tier);
      const maxHp = calcMaxHp(data.stats?.che ?? 0, 0, tierMult);
      const maxStamina = calcStamina(data.stats?.sim ?? 0, tierMult);
      set({
        qi: data.qi ?? 0,
        totalSpentQi: data.totalSpentQi ?? 0,
        stats: data.stats ?? { gi: 0, sim: 0, che: 0 },
        proficiency: { sword: 1, palm: 1, footwork: 1, mental: 1, fist: 1, ...(data.proficiency ?? {}) },
        autoExploreFields: data.autoExploreFields ?? {},
        hp: Math.min(data.hp ?? maxHp, maxHp),
        maxHp,
        tier,
        equippedSimbeop: data.equippedSimbeop ?? null,
        ownedArts: (data.ownedArts ?? []).map((a: { id: string }) => ({ id: a.id })),
        equippedArts: data.equippedArts ?? [],
        artPoints: data.artPoints ?? 3,
        artGradeExp: data.artGradeExp ?? {},
        achievements: (() => {
          const achs: string[] = data.achievements ?? [];
          // 마이그레이션: 구 체인(first→3→5→10→all) → 신 체인(first→1→3→5→8→12→17→all)
          // 구 데이터에 있을 수 있는 체인 공백 소급 부여
          if (achs.includes('codex_5') && !achs.includes('codex_3')) achs.push('codex_3');
          if (achs.includes('codex_3') && !achs.includes('codex_1')) achs.push('codex_1');
          if (achs.includes('codex_10') && !achs.includes('codex_8')) achs.push('codex_8');
          // codex_all 재검증: ronin 등 신규 CODEX_MONSTERS 추가로 조건이 강화됐을 수 있음
          // 현재 기준 미충족 시 제거 → 이후 sweep에서 정확히 재부여
          const codexAllIdx = achs.indexOf('codex_all');
          if (codexAllIdx >= 0) {
            const kc: Record<string, number> = data.killCounts ?? {};
            if (!CODEX_MONSTERS.every(id => (kc[id] ?? 0) >= 1000)) {
              achs.splice(codexAllIdx, 1);
            }
          }
          return achs;
        })(),
        achievementCount: data.achievementCount ?? 0,
        killCounts: data.killCounts ?? {},
        bossKillCounts: migratedBossKillCounts,
        totalYasanKills: Math.max(
          data.totalYasanKills ?? 0,
          ['squirrel', 'rabbit', 'fox', 'deer', 'boar', 'wolf', 'bear']
            .reduce((s, id) => s + ((data.killCounts ?? {})[id] ?? 0), 0),
        ),
        totalKills: Math.max(
          data.totalKills ?? 0,
          Object.values((data.killCounts ?? {}) as Record<string, number>).reduce((s, n) => s + n, 0),
        ),
        hiddenRevealedInField: data.hiddenRevealedInField ?? {},
        bossPatternState: data.bossPatternState ?? null,
        playerStunTimer: data.playerStunTimer ?? 0,
        lastEnemyAttack: data.lastEnemyAttack ?? null,
        tutorialFlags: {
          ...(data.tutorialFlags ?? createInitialState().tutorialFlags),
          firstBreakthroughNotified: data.tutorialFlags?.firstBreakthroughNotified ?? false,
        },
        lastTickTime: Date.now(),
        battleMode: data.battleMode ?? 'none',
        huntTarget: data.huntTarget ?? null,
        currentField: data.currentField ?? null,
        currentEnemy: data.currentEnemy ?? null,
        exploreStep: data.exploreStep ?? 0,
        exploreOrder: data.exploreOrder ?? [],
        isBossPhase: data.isBossPhase ?? false,
        bossTimer: data.bossTimer ?? 0,
        explorePendingRewards: { drops: data.explorePendingRewards?.drops ?? [] },
        playerAttackTimer: data.playerAttackTimer ?? 0,
        enemyAttackTimer: data.enemyAttackTimer ?? 0,
        activeMasteries: data.activeMasteries ?? {},
        fieldUnlocks: (() => {
          const saved = data.fieldUnlocks ?? {
            training: true, yasan: false, inn: false,
            cheonsan_jangmak: false, cheonsan_godo: false, cheonsan_simjang: false,
          };
          const rawKillCounts: Record<string, number> = data.killCounts ?? {};
          const mats: Record<string, number> = data.materials ?? {};
          const revalidated = { ...saved };
          for (const field of FIELDS) {
            const cond = field.unlockCondition;
            if (!cond) continue;
            // bossKill/monsterKill: 처치 기록이 있으면 해금 (영구적 조건, 취소 없음)
            if (cond.bossKill && (migratedBossKillCounts[cond.bossKill] ?? 0) > 0) {
              revalidated[field.id] = true;
            }
            if (cond.monsterKill && (rawKillCounts[cond.monsterKill] ?? 0) > 0) {
              revalidated[field.id] = true;
            }
            // materialOwned: 재료 소지 여부로 해금 상태 결정
            // (구 세이브에 필드가 없던 경우에도 재료가 있으면 새로 해금됨)
            if (cond.materialOwned) {
              revalidated[field.id] = (mats[cond.materialOwned] ?? 0) > 0;
            }
          }
          return revalidated;
        })(),
        inventory: data.inventory ?? [],
        discoveredMasteries: data.discoveredMasteries ?? [],
        pendingEnlightenments: data.pendingEnlightenments ?? [],
        stamina: Math.min(data.stamina ?? 0, maxStamina),
        ultCooldowns: data.ultCooldowns ?? {},
        currentBattleDuration: data.currentBattleDuration ?? 0,
        currentBattleDamageDealt: data.currentBattleDamageDealt ?? 0,
        equipment: data.equipment ?? { weapon: null, armor: null, gloves: null, boots: null },
        equipmentInventory: data.equipmentInventory ?? [],
        materials: data.materials ?? {},
        craftedRecipes: data.craftedRecipes ?? [],
        unlockedRecipes: data.unlockedRecipes ?? [],
        obtainedMaterials: data.obtainedMaterials ?? [],
        knownEquipment: data.knownEquipment ?? [],
        dodgeCounterActive: data.dodgeCounterActive ?? false,
        pendingAutoExplore: data.pendingAutoExplore ?? false,
        currentSaveSlot: slot,
        battleResult: null,
        battleLog: [],
      });

      // 로드 후 업적 전체 재계산: 누락 업적 소급 부여 + achievementCount 정정
      // (fieldUnlocks/totalKills 등이 위에서 정확히 재계산된 상태를 사용)
      const loaded = get() as GameStore;
      const achCtx = buildAchievementContext(loaded);
      const achs = [...loaded.achievements];
      let changed = true;
      while (changed) {
        changed = false;
        for (const ach of ACHIEVEMENTS) {
          if (achs.includes(ach.id)) continue;
          if (ach.prerequisite && !achs.includes(ach.prerequisite)) continue;
          if (ach.check(achCtx)) {
            achs.push(ach.id);
            changed = true;
          }
        }
      }
      if (achs.length !== loaded.achievements.length || achs.length !== loaded.achievementCount) {
        set({ achievements: achs, achievementCount: achs.length });
      }
    } catch {
      // corrupt save
    }
  },

  resetGame: (slot) => {
    const state = get() as GameStore;
    const targetSlot = slot ?? state.currentSaveSlot;

    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(`murim_save_slot_${targetSlot}`);
    }
    const initialState = createInitialState();
    initialState.currentSaveSlot = targetSlot;
    set(initialState);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('murim_save_current', String(targetSlot));
    }
  },

  deleteSlot: (slot) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(`murim_save_slot_${slot}`);
    }
  },

  exportSave: (slot) => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const raw = localStorage.getItem(`murim_save_slot_${slot}`);
    if (!raw) return;
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `murim_slot${slot + 1}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importSave: (slot, jsonString) => {
    try {
      const data = JSON.parse(jsonString);
      if (!data.version?.startsWith('4')) return false;
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(`murim_save_slot_${slot}`, jsonString);
      }
      return true;
    } catch {
      return false;
    }
  },

  getSaveSlots: () => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [null, null, null];
    }

    const slots: (SaveMeta | null)[] = [];
    for (let i = 0; i < 3; i++) {
      try {
        const raw = localStorage.getItem(`murim_save_slot_${i}`);
        if (!raw) {
          slots.push(null);
          continue;
        }
        const data = JSON.parse(raw);
        const stats = data.stats ?? { gi: 0, sim: 0, che: 0 };
        const tierDef = getTierDef(data.tier ?? 0);
        slots.push({
          slotIndex: i,
          savedAt: data.savedAt ?? Date.now(),
          tierName: tierDef.name,
          totalStats: (stats.gi ?? 0) + (stats.sim ?? 0) + (stats.che ?? 0),
        });
      } catch {
        slots.push(null);
      }
    }
    return slots;
  },

  processOfflineProgress: (elapsedSeconds) => {
    const maxSeconds = Math.min(elapsedSeconds, 28800);
    let currentState = { ...(get() as GameStore) } as GameState;
    currentState.stats = { ...currentState.stats };
    currentState.killCounts = { ...currentState.killCounts };
    currentState.bossKillCounts = { ...currentState.bossKillCounts };
    currentState.ownedArts = currentState.ownedArts.map(a => ({ ...a }));
    currentState.equippedArts = [...currentState.equippedArts];
    currentState.achievements = [...currentState.achievements];
    currentState.battleLog = [...currentState.battleLog];
    currentState.explorePendingRewards = {
      drops: [...currentState.explorePendingRewards.drops],
    };
    currentState.tutorialFlags = { ...currentState.tutorialFlags };
    currentState.activeMasteries = { ...currentState.activeMasteries };
    currentState.fieldUnlocks = { ...currentState.fieldUnlocks };
    currentState.inventory = [...currentState.inventory];
    currentState.discoveredMasteries = [...currentState.discoveredMasteries];
    currentState.pendingEnlightenments = [...currentState.pendingEnlightenments];
    currentState.equipmentInventory = [...currentState.equipmentInventory];
    currentState.hiddenRevealedInField = { ...currentState.hiddenRevealedInField };
    currentState.floatingTexts = [];

    const startQi = currentState.qi;
    const startAchievements = [...currentState.achievements];
    let killCount = 0;
    let deathCount = 0;
    let battleTime = 0;
    let idleTime = 0;
    const dropsGained: string[] = [];

    let tickCounter = 0;

    for (let i = 0; i < maxSeconds; i++) {
      tickCounter++;

      const shouldCheckAchievements = (tickCounter % 60 === 0);

      const changes = simulateTick(currentState, 1, true);

      if (!shouldCheckAchievements) {
        changes.achievements = currentState.achievements;
        changes.achievementCount = currentState.achievementCount;
      }

      if (currentState.battleMode !== 'none') {
        battleTime++;
      } else {
        idleTime++;
      }

      if (changes.killCounts) {
        for (const [mId, count] of Object.entries(changes.killCounts)) {
          const prev = currentState.killCounts[mId] ?? 0;
          if (count > prev) killCount += (count - prev);
        }
      }

      if (changes.battleResult && (changes.battleResult.type === 'death' || changes.battleResult.type === 'hunt_end')) {
        if (changes.hp !== undefined && changes.hp <= 1) {
          deathCount++;
        }
      }

      if (changes.inventory) {
        for (const item of changes.inventory) {
          if (!currentState.inventory.some(i => i.id === item.id)) {
            const artDef = item.artId ? getArtDef(item.artId) : null;
            dropsGained.push(artDef?.name ?? item.artId ?? '???');
          }
        }
      }

      currentState = { ...currentState, ...changes } as GameState;

      // 자동 답파 재시작 (오프라인/백그라운드 시뮬레이션 중)
      if (
        currentState.battleResult?.type === 'explore_win' &&
        currentState.currentField &&
        currentState.autoExploreFields[currentState.currentField]
      ) {
        const fieldId = currentState.currentField;
        const field = getFieldDef(fieldId);
        if (field?.canExplore) {
          const order = generateExploreOrder(field);
          const firstMon = getMonsterDef(order[0]);
          if (firstMon) {
            const hiddenRevealedInField = { ...currentState.hiddenRevealedInField };
            if (firstMon.isHidden) {
              hiddenRevealedInField[fieldId] = order[0];
            }
            currentState = {
              ...currentState,
              ...CLEAR_BATTLE_STATE,
              battleMode: 'explore',
              currentEnemy: spawnEnemy(firstMon),
              bossPatternState: BOSS_PATTERNS[order[0]]
                ? { bossStamina: BOSS_PATTERNS[order[0]].stamina.initial, rageUsed: false, playerFreezeLeft: 0, usedOneTimeSkills: [], bossChargeState: null }
                : null,
              currentField: fieldId,
              exploreOrder: order,
              exploreStep: 0,
              isBossPhase: false,
              bossTimer: 0,
              explorePendingRewards: { drops: [] },
              battleResult: null,
              hiddenRevealedInField,
              playerAttackTimer: BALANCE_PARAMS.BASE_ATTACK_INTERVAL,
              enemyAttackTimer: firstMon.attackInterval,
            } as GameState;
          }
        }
      }
      // 사망 + 자동 답파: result 닫고 pendingAutoExplore 예약
      if (
        currentState.battleResult?.type === 'death' &&
        currentState.currentField &&
        currentState.autoExploreFields[currentState.currentField]
      ) {
        currentState = {
          ...currentState,
          battleResult: null,
          pendingAutoExplore: true,
        } as GameState;
      }
    }

    set({
      ...currentState,
      lastTickTime: Date.now(),
      floatingTexts: [],
      playerAnim: '',
      enemyAnim: '',
    });

    const achievementsEarned = currentState.achievements.filter(
      a => !startAchievements.includes(a),
    );

    return {
      elapsedTime: maxSeconds,
      qiGained: currentState.qi - startQi,
      killCount,
      deathCount,
      battleTime,
      idleTime,
      achievementsEarned,
      dropsGained,
    };
  },
});
