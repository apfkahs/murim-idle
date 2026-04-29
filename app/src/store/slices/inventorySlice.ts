import type { StateCreator } from 'zustand';
import type { GameStore } from '../gameStore';
import type { InventoryItem, GameState, PendingReveal } from '../types';
import { getArtDef } from '../../data/arts';
import { getEquipmentDef, type EquipSlot, type EquipmentInstance } from '../../data/equipment';
import {
  RECIPES, ART_RECIPES, BIJUP_DEFS, getBijupDef, COMPOUND_ART_RECIPES,
  SEONGHWA_DROP_TABLE, getConsumableRecipeDef, getMaterialDef,
  type SeonghwaDropEntry,
} from '../../data/materials';
import {
  TAMSIK_TOTAL_STACK_CAP, TAMSIK_EMBER_PER_JANBUL,
  getTamsikTotalStacks,
} from '../../utils/tamsikUtils';
import { getArtGradeInfo, getGradeTableForArt, getArtGradeInfoFromTable } from '../../utils/artUtils';
import { calcFullMaxHp } from '../../utils/combatCalc';

export type InventorySlice = {
  // ── state ──
  inventory: InventoryItem[];
  equipment: Record<EquipSlot, EquipmentInstance | null>;
  equipmentInventory: EquipmentInstance[];
  materials: Record<string, number>;
  craftedRecipes: string[];
  unlockedRecipes: string[];
  obtainedMaterials: string[];
  knownEquipment: string[];
  pendingReveal: PendingReveal | null;

  // ── actions ──
  learnScroll: (itemId: string) => void;
  discardItem: (itemId: string) => void;
  discardMaterial: (materialId: string, count: number) => void;
  craft: (recipeId: string, materialCount: number) => boolean;
  unlockRecipe: (recipeId: string) => void;
  craftArtRecipe: (recipeId: string) => boolean;
  craftCompoundArtRecipe: (recipeId: string) => boolean;
  useBijup: (bijupMaterialId: string) => boolean;
  equipItem: (instanceId: string) => void;
  unequipItem: (slot: EquipSlot) => void;
  discardEquipment: (instanceId: string) => void;
  enhanceEquipment: (instanceId: string, materialCount: number, useChanranStone?: boolean) => boolean;

  // ── 소비 아이템 제작/사용 ──
  craftConsumable: (recipeId: string, times: number) => boolean;
  useConsumable: (materialId: string) => boolean;
  useConsumableBatch: (id: string, count: number) => boolean;
  dismissPendingReveal: () => void;

  // ── 탐식하는 불꽃 잔불 강화 ──
  reinforceTamsik: (jaebulAmount: number) => number;
};

export const createInventorySlice: StateCreator<GameStore, [], [], InventorySlice> = (set, get) => ({
  // ── 초기 상태 ──
  inventory: [],
  equipment: { weapon: null, armor: null, gloves: null, boots: null },
  equipmentInventory: [],
  materials: {},
  craftedRecipes: [],
  unlockedRecipes: [],
  obtainedMaterials: [],
  knownEquipment: [],
  pendingReveal: null,

  // ── 액션 ──
  learnScroll: (itemId) => {
    const state = get() as GameStore;
    const item = state.inventory.find(i => i.id === itemId);
    if (!item || item.itemType !== 'art_scroll' || !item.artId) return;
    const artId = item.artId!;
    if (state.ownedArts.some(a => a.id === artId)) return;
    const artDef = getArtDef(artId);
    const autoIds = artDef?.masteries.filter(m => m.autoActivate).map(m => m.id) ?? [];
    const newActiveMasteries = autoIds.length > 0
      ? { ...state.activeMasteries, [artId]: [...(state.activeMasteries[artId] ?? []), ...autoIds] }
      : state.activeMasteries;
    set({
      ownedArts: [...state.ownedArts, { id: artId }],
      artGradeExp: { ...state.artGradeExp, [artId]: state.artGradeExp[artId] ?? 0 },
      inventory: state.inventory.filter(i => i.id !== itemId),
      activeMasteries: newActiveMasteries,
    });
  },

  discardItem: (itemId) => {
    const state = get() as GameStore;
    set({ inventory: state.inventory.filter(i => i.id !== itemId) });
  },

  discardMaterial: (materialId, count) => {
    const state = get() as GameStore;
    const have = state.materials[materialId] ?? 0;
    const actual = Math.max(0, Math.min(count, have));
    if (actual <= 0) return;
    set({ materials: { ...state.materials, [materialId]: have - actual } });
  },

  craft: (recipeId, materialCount) => {
    const recipe = RECIPES.find(r => r.id === recipeId);
    if (!recipe) return false;
    const count = Math.max(1, Math.min(materialCount, recipe.maxUnits));
    const state = get() as GameStore;
    if ((state.materials[recipe.materialId] ?? 0) < count) return false;
    const newMaterials = { ...state.materials };
    newMaterials[recipe.materialId] = (newMaterials[recipe.materialId] ?? 0) - count;
    const success = Math.random() < count * recipe.probabilityPerUnit;
    if (success) {
      const instance: EquipmentInstance = {
        instanceId: `eq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        defId: recipe.resultEquipId,
        obtainedFrom: 'craft',
        obtainedAt: Date.now(),
      };
      const newCraftedRecipes = state.craftedRecipes.includes(recipe.id)
        ? state.craftedRecipes
        : [...state.craftedRecipes, recipe.id];
      const newKnownEquipment = state.knownEquipment.includes(recipe.resultEquipId)
        ? state.knownEquipment
        : [...state.knownEquipment, recipe.resultEquipId];
      set({
        materials: newMaterials,
        equipmentInventory: [...state.equipmentInventory, instance],
        craftedRecipes: newCraftedRecipes,
        knownEquipment: newKnownEquipment,
      });
    } else {
      set({ materials: newMaterials });
    }
    return success;
  },

  unlockRecipe: (recipeId) => {
    set(s => ({
      unlockedRecipes: (s as GameStore).unlockedRecipes.includes(recipeId)
        ? (s as GameStore).unlockedRecipes
        : [...(s as GameStore).unlockedRecipes, recipeId],
    }));
  },

  craftArtRecipe: (recipeId) => {
    const recipe = ART_RECIPES.find(r => r.id === recipeId);
    if (!recipe) return false;
    const state = get() as GameStore;
    const have = state.materials[recipe.materialId] ?? 0;
    if (have < recipe.materialCount) return false;
    if (recipe.requiresArtId && !state.ownedArts.some(a => a.id === recipe.requiresArtId)) return false;
    if (recipe.requiresMasteryId && !state.discoveredMasteries.includes(recipe.requiresMasteryId)) return false;
    if (recipe.resultArtId && state.ownedArts.some(a => a.id === recipe.resultArtId)) return false;
    if (recipe.resultMasteryId && state.discoveredMasteries.includes(recipe.resultMasteryId)) return false;
    const newMaterials = { ...state.materials, [recipe.materialId]: have - recipe.materialCount };
    const newOwnedArts = recipe.resultArtId
      ? [...state.ownedArts, { id: recipe.resultArtId }]
      : state.ownedArts;
    const newDiscoveredMasteries = recipe.resultMasteryId
      ? [...state.discoveredMasteries, recipe.resultMasteryId]
      : state.discoveredMasteries;
    const requiresArtDef = recipe.requiresArtId ? getArtDef(recipe.requiresArtId) : null;
    const newActiveMasteries =
      (recipe.resultMasteryId && recipe.requiresArtId && requiresArtDef?.autoActivateMastery)
        ? {
            ...state.activeMasteries,
            [recipe.requiresArtId]: [...(state.activeMasteries[recipe.requiresArtId] ?? []), recipe.resultMasteryId],
          }
        : state.activeMasteries;
    const newMaterials2 = recipe.resultMaterialId
      ? { ...newMaterials, [recipe.resultMaterialId]: (newMaterials[recipe.resultMaterialId] ?? 0) + 1 }
      : newMaterials;
    let newActiveMasteries2 = newActiveMasteries;
    let newArtGradeExp = state.artGradeExp;
    if (recipe.resultArtId) {
      const newArtDef = getArtDef(recipe.resultArtId);
      const autoIds = newArtDef?.masteries.filter(m => m.autoActivate).map(m => m.id) ?? [];
      if (autoIds.length > 0) {
        newActiveMasteries2 = {
          ...newActiveMasteries,
          [recipe.resultArtId]: [...(newActiveMasteries[recipe.resultArtId] ?? []), ...autoIds],
        };
      }
      newArtGradeExp = { ...state.artGradeExp, [recipe.resultArtId]: state.artGradeExp[recipe.resultArtId] ?? 0 };
    }
    set({
      materials: newMaterials2,
      ownedArts: newOwnedArts,
      discoveredMasteries: newDiscoveredMasteries,
      activeMasteries: newActiveMasteries2,
      artGradeExp: newArtGradeExp,
    });
    return true;
  },

  craftCompoundArtRecipe: (recipeId) => {
    const recipe = COMPOUND_ART_RECIPES.find(r => r.id === recipeId);
    if (!recipe) return false;
    const state = get() as GameStore;

    // 재료 충족 확인 (복수 재료 모두)
    for (const mat of recipe.materials) {
      if ((state.materials[mat.materialId] ?? 0) < mat.materialCount) return false;
    }
    // 선행 무공 보유 확인
    if (recipe.requiresArtId && !state.ownedArts.some(a => a.id === recipe.requiresArtId)) return false;
    // 이미 해금된 경우 차단
    if (recipe.resultMasteryId && state.discoveredMasteries.includes(recipe.resultMasteryId)) return false;
    if (recipe.resultArtId && state.ownedArts.some(a => a.id === recipe.resultArtId)) return false;

    // 재료 차감
    const newMaterials = { ...state.materials };
    for (const mat of recipe.materials) {
      newMaterials[mat.materialId] = (newMaterials[mat.materialId] ?? 0) - mat.materialCount;
    }

    // discoveredMasteries + activeMasteries 동시 추가
    const newDiscoveredMasteries = recipe.resultMasteryId
      ? [...state.discoveredMasteries, recipe.resultMasteryId]
      : state.discoveredMasteries;

    let newActiveMasteries = state.activeMasteries;
    if (recipe.resultMasteryId && recipe.requiresArtId) {
      newActiveMasteries = {
        ...state.activeMasteries,
        [recipe.requiresArtId]: [
          ...(state.activeMasteries[recipe.requiresArtId] ?? []),
          recipe.resultMasteryId,
        ],
      };
    }

    const newOwnedArts = recipe.resultArtId
      ? [...state.ownedArts, { id: recipe.resultArtId }]
      : state.ownedArts;

    set({ materials: newMaterials, discoveredMasteries: newDiscoveredMasteries,
          activeMasteries: newActiveMasteries, ownedArts: newOwnedArts });
    return true;
  },

  useBijup: (bijupMaterialId) => {
    const state = get() as GameStore;
    const bijupDef = getBijupDef(bijupMaterialId);
    if (!bijupDef) return false;
    if ((state.materials[bijupMaterialId] ?? 0) < 1) return false;
    const { artId, masteryId, requiredArtGrade } = bijupDef;
    if (!state.equippedArts.includes(artId) && state.equippedSimbeop !== artId) return false;
    const artDefForGrade = getArtDef(artId);
    const cumExpForGrade = state.artGradeExp[artId] ?? 0;
    const currentGrade = artDefForGrade?.growth.gradeMaxStars
      ? getArtGradeInfoFromTable(cumExpForGrade, getGradeTableForArt(artDefForGrade)).stageIndex + 1
      : getArtGradeInfo(cumExpForGrade).stageIndex + 1;
    if (currentGrade < requiredArtGrade) return false;
    if ((state.activeMasteries[artId] ?? []).includes(masteryId)) return false;
    const newMaterials = { ...state.materials, [bijupMaterialId]: (state.materials[bijupMaterialId] ?? 0) - 1 };
    const newDiscoveredMasteries = state.discoveredMasteries.includes(masteryId)
      ? state.discoveredMasteries
      : [...state.discoveredMasteries, masteryId];
    const newActiveMasteries = {
      ...state.activeMasteries,
      [artId]: [...(state.activeMasteries[artId] ?? []), masteryId],
    };
    set({ materials: newMaterials, discoveredMasteries: newDiscoveredMasteries, activeMasteries: newActiveMasteries });
    return true;
  },

  equipItem: (instanceId) => {
    const state = get() as GameStore;
    if (state.battleMode !== 'none') return;

    const idx = state.equipmentInventory.findIndex(e => e.instanceId === instanceId);
    if (idx === -1) return;
    const instance = state.equipmentInventory[idx];
    const def = getEquipmentDef(instance.defId);
    if (!def) return;

    const slot = def.slot;
    const newInventory = [...state.equipmentInventory];
    newInventory.splice(idx, 1);

    const newEquipment = { ...state.equipment };
    if (newEquipment[slot]) {
      newInventory.push(newEquipment[slot]!);
    }
    newEquipment[slot] = instance;

    const newMaxHp = calcFullMaxHp({ ...state, equipment: newEquipment } as GameState);

    set({
      equipment: newEquipment,
      equipmentInventory: newInventory,
      maxHp: newMaxHp,
      hp: Math.min(state.hp, newMaxHp),
    });
  },

  unequipItem: (slot) => {
    const state = get() as GameStore;
    if (state.battleMode !== 'none') return;

    const equipped = state.equipment[slot];
    if (!equipped) return;

    const newEquipment = { ...state.equipment };
    newEquipment[slot] = null;

    const newInventory = [...state.equipmentInventory, equipped];

    const newMaxHp = calcFullMaxHp({ ...state, equipment: newEquipment } as GameState);

    set({
      equipment: newEquipment,
      equipmentInventory: newInventory,
      maxHp: newMaxHp,
      hp: Math.min(state.hp, newMaxHp),
    });
  },

  discardEquipment: (instanceId) => {
    const state = get() as GameStore;
    const newInventory = state.equipmentInventory.filter(e => e.instanceId !== instanceId);
    set({ equipmentInventory: newInventory });
  },

  enhanceEquipment: (instanceId, materialCount, useChanranStone) => {
    const state = get() as GameStore;
    // 장착 중인 장비 또는 인벤토리에서 찾기
    let instance: EquipmentInstance | null = null;
    let location: 'equipped' | 'inventory' = 'inventory';
    let equippedSlot: EquipSlot | null = null;

    for (const slot of ['weapon', 'armor', 'gloves', 'boots'] as EquipSlot[]) {
      if (state.equipment[slot]?.instanceId === instanceId) {
        instance = state.equipment[slot]!;
        location = 'equipped';
        equippedSlot = slot;
        break;
      }
    }
    if (!instance) {
      const found = state.equipmentInventory.find(e => e.instanceId === instanceId);
      if (found) { instance = found; location = 'inventory'; }
    }
    if (!instance) return false;

    const def = getEquipmentDef(instance.defId);
    if (!def?.enhanceable || !def.enhanceSteps || !def.enhanceMaterialId) return false;

    const currentLevel = instance.enhanceLevel ?? 0;
    if (currentLevel >= def.enhanceSteps.length) return false; // 최대 강화

    // 찬란한 흑풍석 강화: enhanceMaterialId가 'heugpung_stone'인 장비에 대체 재료 사용
    if (useChanranStone && def.enhanceMaterialId === 'heugpung_stone') {
      const chanranCosts = [1, 2, 3]; // 0강→+1: 1개, +1→+2: 2개, +2→+3: 3개
      const requiredChanran = chanranCosts[currentLevel] ?? 999;
      if ((state.materials['chanran_heugpung_stone'] ?? 0) < requiredChanran) return false;

      const newMaterials = { ...state.materials };
      newMaterials['chanran_heugpung_stone'] = (newMaterials['chanran_heugpung_stone'] ?? 0) - requiredChanran;

      // 100% 성공
      const enhanced: EquipmentInstance = { ...instance, enhanceLevel: currentLevel + 1 };
      if (location === 'equipped' && equippedSlot) {
        const newEquipment = { ...state.equipment, [equippedSlot]: enhanced };
        const newMaxHp = calcFullMaxHp({ ...state, equipment: newEquipment } as GameState);
        set({ materials: newMaterials, equipment: newEquipment, maxHp: newMaxHp, hp: Math.min(state.hp, newMaxHp) });
      } else {
        const newInv = state.equipmentInventory.map(e => e.instanceId === instanceId ? enhanced : e);
        set({ materials: newMaterials, equipmentInventory: newInv });
      }
      return true;
    }

    const step = def.enhanceSteps[currentLevel];
    const count = Math.max(1, Math.min(materialCount, step.maxUnits));
    if ((state.materials[def.enhanceMaterialId] ?? 0) < count) return false;

    // 재료 차감
    const newMaterials = { ...state.materials };
    newMaterials[def.enhanceMaterialId] = (newMaterials[def.enhanceMaterialId] ?? 0) - count;

    // 확률 계산
    const chance = Math.min(count * step.probabilityPerUnit, step.maxChance);
    const success = Math.random() < chance;

    if (success) {
      const enhanced: EquipmentInstance = { ...instance, enhanceLevel: currentLevel + 1 };
      if (location === 'equipped' && equippedSlot) {
        const newEquipment = { ...state.equipment, [equippedSlot]: enhanced };
        const newMaxHp = calcFullMaxHp({ ...state, equipment: newEquipment } as GameState);
        set({ materials: newMaterials, equipment: newEquipment, maxHp: newMaxHp, hp: Math.min(state.hp, newMaxHp) });
      } else {
        const newInv = state.equipmentInventory.map(e => e.instanceId === instanceId ? enhanced : e);
        set({ materials: newMaterials, equipmentInventory: newInv });
      }
    } else {
      set({ materials: newMaterials });
    }
    return success;
  },

  craftConsumable: (recipeId, times) => {
    const recipe = getConsumableRecipeDef(recipeId);
    if (!recipe) return false;
    const repeats = Math.max(1, Math.floor(times));
    const state = get() as GameStore;
    const totalCost = recipe.materialCount * repeats;
    const have = state.materials[recipe.materialId] ?? 0;
    if (have < totalCost) return false;
    const newMaterials = { ...state.materials };
    newMaterials[recipe.materialId] = have - totalCost;
    newMaterials[recipe.resultId] =
      (newMaterials[recipe.resultId] ?? 0) + recipe.resultCount * repeats;
    const newObtained = state.obtainedMaterials.includes(recipe.resultId)
      ? state.obtainedMaterials
      : [...state.obtainedMaterials, recipe.resultId];
    set({ materials: newMaterials, obtainedMaterials: newObtained });
    return true;
  },

  useConsumable: (materialId) => {
    const state = get() as GameStore;
    const matDef = getMaterialDef(materialId);
    if (!matDef?.consumable) return false;
    if ((state.materials[materialId] ?? 0) < 1) return false;

    // ── 뜨거운 재 → 하얀 재 +30 ──
    if (materialId === 'hot_ash') {
      const newMaterials = { ...state.materials };
      newMaterials['hot_ash'] = (newMaterials['hot_ash'] ?? 0) - 1;
      newMaterials['hayan_jae'] = (newMaterials['hayan_jae'] ?? 0) + 30;
      const newObtained = state.obtainedMaterials.includes('hayan_jae')
        ? state.obtainedMaterials
        : [...state.obtainedMaterials, 'hayan_jae'];
      set({ materials: newMaterials, obtainedMaterials: newObtained });
      (get() as GameStore).saveGame();
      return true;
    }

    // 배화교 검법 비전서는 인벤토리에서 직접 사용하지 않는다.
    // BahwagyoNodeDetailModal 의 sword-main 노드 결제 UI 에서 scroll(비급) 슬롯으로 소비된다.
    // (잔불 500 또는 비전서 1개 — 택 1)

    if (materialId !== 'huimihan_seonghwa') return false;

    const roll = Math.random();
    let acc = 0;
    let picked: SeonghwaDropEntry | null = null;
    let dropIndex = 0;
    for (const [idx, entry] of SEONGHWA_DROP_TABLE.entries()) {
      acc += entry.chance;
      if (roll < acc) { picked = entry; dropIndex = idx; break; }
    }
    if (!picked) { picked = SEONGHWA_DROP_TABLE[0]; dropIndex = 0; }

    const newMaterials = { ...state.materials };
    newMaterials[materialId] = (newMaterials[materialId] ?? 0) - 1;

    let newEquipmentInventory = state.equipmentInventory;
    let newKnownEquipment = state.knownEquipment;
    let newObtained = state.obtainedMaterials;

    if (picked.equipId) {
      const alreadyOwned =
        Object.values(state.equipment).some(e => e?.defId === picked!.equipId) ||
        state.equipmentInventory.some(e => e.defId === picked!.equipId);

      if (alreadyOwned) {
        const fallbackQty = 100;
        newMaterials['huimihan_janbul'] =
          (newMaterials['huimihan_janbul'] ?? 0) + fallbackQty;
        if (!newObtained.includes('huimihan_janbul')) {
          newObtained = [...newObtained, 'huimihan_janbul'];
        }
      } else {
        const instance: EquipmentInstance = {
          instanceId: `eq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          defId: picked.equipId,
          obtainedFrom: 'huimihan_seonghwa',
          obtainedAt: Date.now(),
        };
        newEquipmentInventory = [...state.equipmentInventory, instance];
        if (!state.knownEquipment.includes(picked.equipId)) {
          newKnownEquipment = [...state.knownEquipment, picked.equipId];
        }
      }
    } else if (picked.materialId) {
      const qty = picked.materialCount ?? 0;
      newMaterials[picked.materialId] =
        (newMaterials[picked.materialId] ?? 0) + qty;
      if (!newObtained.includes(picked.materialId)) {
        newObtained = [...newObtained, picked.materialId];
      }
    }

    set({
      materials: newMaterials,
      equipmentInventory: newEquipmentInventory,
      knownEquipment: newKnownEquipment,
      obtainedMaterials: newObtained,
      totalSeonghwaUsed: (state.totalSeonghwaUsed ?? 0) + 1,
      pendingReveal: {
        materialId,
        rolls: [{ dropIndex, reward: { materialId: picked.materialId, materialCount: picked.materialCount, equipId: picked.equipId } }],
      },
    });
    // 성화 소비/보상 지급 직후 즉시 저장하여 모달 중 새로고침으로 재료가 복구되는 것을 막음
    (get() as GameStore).saveGame();
    return true;
  },

  useConsumableBatch: (id, count) => {
    const state = get() as GameStore;
    if ((state.materials[id] ?? 0) < count) return false;
    if (id !== 'huimihan_seonghwa') return false;

    let newMaterials = { ...state.materials };
    let newEquipmentInventory = [...state.equipmentInventory];
    let newKnownEquipment = [...state.knownEquipment];
    let newObtained = [...state.obtainedMaterials];

    const rolls: Array<{ dropIndex: number; reward: Omit<SeonghwaDropEntry, 'chance'> }> = [];

    // 재료 먼저 count만큼 감소
    newMaterials[id] = (newMaterials[id] ?? 0) - count;

    for (let i = 0; i < count; i++) {
      const roll = Math.random();
      let acc = 0;
      let picked: SeonghwaDropEntry | null = null;
      let dropIndex = 0;
      for (const [idx, entry] of SEONGHWA_DROP_TABLE.entries()) {
        acc += entry.chance;
        if (roll < acc) { picked = entry; dropIndex = idx; break; }
      }
      if (!picked) { picked = SEONGHWA_DROP_TABLE[0]; dropIndex = 0; }

      // 보상 지급
      if (picked.equipId) {
        const alreadyOwned =
          Object.values(state.equipment).some(e => e?.defId === picked!.equipId) ||
          newEquipmentInventory.some(e => e.defId === picked!.equipId);
        if (alreadyOwned) {
          newMaterials['huimihan_janbul'] = (newMaterials['huimihan_janbul'] ?? 0) + 100;
          if (!newObtained.includes('huimihan_janbul')) newObtained = [...newObtained, 'huimihan_janbul'];
        } else {
          const instance: EquipmentInstance = {
            instanceId: `eq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            defId: picked.equipId,
            obtainedFrom: 'huimihan_seonghwa',
            obtainedAt: Date.now(),
          };
          newEquipmentInventory = [...newEquipmentInventory, instance];
          if (!newKnownEquipment.includes(picked.equipId)) {
            newKnownEquipment = [...newKnownEquipment, picked.equipId];
          }
        }
      } else if (picked.materialId) {
        const qty = picked.materialCount ?? 0;
        newMaterials[picked.materialId] = (newMaterials[picked.materialId] ?? 0) + qty;
        if (!newObtained.includes(picked.materialId)) newObtained = [...newObtained, picked.materialId];
      }

      rolls.push({ dropIndex, reward: { materialId: picked.materialId, materialCount: picked.materialCount, equipId: picked.equipId } });
    }

    set({
      materials: newMaterials,
      equipmentInventory: newEquipmentInventory,
      knownEquipment: newKnownEquipment,
      obtainedMaterials: newObtained,
      totalSeonghwaUsed: (state.totalSeonghwaUsed ?? 0) + count,
      pendingReveal: { materialId: id, rolls },
    });
    // 성화 소비/보상 지급 직후 즉시 저장하여 모달 중 새로고침으로 재료가 복구되는 것을 막음
    (get() as GameStore).saveGame();
    return true;
  },

  dismissPendingReveal: () => set({ pendingReveal: null }),

  reinforceTamsik: (jaebulAmount) => {
    const state = get() as GameStore;
    const requested = Math.max(0, Math.floor(jaebulAmount));
    if (requested <= 0) return 0;

    const have = state.materials['huimihan_janbul'] ?? 0;
    if (have <= 0) return 0;

    const info = getTamsikTotalStacks(state);
    const maxByCapacity = Math.floor(info.remainingCapacity / TAMSIK_EMBER_PER_JANBUL);
    const effective = Math.min(requested, have, maxByCapacity);
    if (effective <= 0) return 0;

    const addedStacks = effective * TAMSIK_EMBER_PER_JANBUL;
    const newEmber = Math.min(
      TAMSIK_TOTAL_STACK_CAP,
      (state.tamsikEmberStacks ?? 0) + addedStacks,
    );
    const newMaterials = { ...state.materials };
    newMaterials['huimihan_janbul'] = have - effective;

    set({
      materials: newMaterials,
      tamsikEmberStacks: newEmber,
    });
    return effective;
  },
});
