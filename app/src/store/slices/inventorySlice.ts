import type { StateCreator } from 'zustand';
import type { GameStore } from '../gameStore';
import type { InventoryItem, GameState } from '../types';
import { getArtDef } from '../../data/arts';
import { getEquipmentDef, type EquipSlot, type EquipmentInstance } from '../../data/equipment';
import { RECIPES, ART_RECIPES, BIJUP_DEFS, getBijupDef } from '../../data/materials';
import { getArtGradeInfo } from '../../utils/artUtils';
import { calcMaxHp, calcTierMultiplier, gatherEquipmentStats } from '../../utils/combatCalc';

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

  // ── actions ──
  learnScroll: (itemId: string) => void;
  discardItem: (itemId: string) => void;
  craft: (recipeId: string, materialCount: number) => boolean;
  unlockRecipe: (recipeId: string) => void;
  craftArtRecipe: (recipeId: string) => boolean;
  useBijup: (bijupMaterialId: string) => boolean;
  equipItem: (instanceId: string) => void;
  unequipItem: (slot: EquipSlot) => void;
  discardEquipment: (instanceId: string) => void;
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
      ownedArts: [...state.ownedArts, { id: artId, totalSimdeuk: 0 }],
      artGradeExp: { ...state.artGradeExp, [artId]: state.artGradeExp[artId] ?? 0 },
      inventory: state.inventory.filter(i => i.id !== itemId),
      activeMasteries: newActiveMasteries,
    });
  },

  discardItem: (itemId) => {
    const state = get() as GameStore;
    set({ inventory: state.inventory.filter(i => i.id !== itemId) });
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
    if (recipe.resultArtId && state.ownedArts.some(a => a.id === recipe.resultArtId)) return false;
    if (recipe.resultMasteryId && state.discoveredMasteries.includes(recipe.resultMasteryId)) return false;
    const newMaterials = { ...state.materials, [recipe.materialId]: have - recipe.materialCount };
    const newOwnedArts = recipe.resultArtId
      ? [...state.ownedArts, { id: recipe.resultArtId, totalSimdeuk: 0 }]
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

  useBijup: (bijupMaterialId) => {
    const state = get() as GameStore;
    const bijupDef = getBijupDef(bijupMaterialId);
    if (!bijupDef) return false;
    if ((state.materials[bijupMaterialId] ?? 0) < 1) return false;
    const { artId, masteryId, requiredArtGrade } = bijupDef;
    if (!state.equippedArts.includes(artId) && state.equippedSimbeop !== artId) return false;
    const currentGrade = getArtGradeInfo(state.artGradeExp[artId] ?? 0).stageIndex + 1;
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

    const eqStats = gatherEquipmentStats({ ...state, equipment: newEquipment });
    const newMaxHp = calcMaxHp(state.stats.che, eqStats.bonusHp ?? 0, calcTierMultiplier(state.tier));

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

    const eqStats = gatherEquipmentStats({ ...state, equipment: newEquipment });
    const newMaxHp = calcMaxHp(state.stats.che, eqStats.bonusHp ?? 0, calcTierMultiplier(state.tier));

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
});
