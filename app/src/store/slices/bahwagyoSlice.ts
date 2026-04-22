/**
 * bahwagyoSlice — 배화교 스킬트리 상태 (Phase 2)
 *
 * 기존 BahwagyoTab 의 useState 목업을 gameStore 로 이관.
 * resources/nodeLevels/unlockedTiers 등을 source-of-truth 로 두고, 세이브/로드 대상에 포함.
 * UI 전용 필드(selectedNodeId, showLockedModal)는 slice 에 유지하되 serialize 에서 제외.
 */
import type { StateCreator } from 'zustand';
import type { GameStore } from '../gameStore';
import type { BahwagyoState, BranchId } from '../../components/bahwagyo/bahwagyoTypes';
import {
  NODE_MAP, getNodeMax, getCostResource, getLevelUpCost,
  TIER2_UNLOCK_COST_EMBER, TIER2_UNLOCK_REQ_NODES, TIER2_UNLOCK_NODE_MIN_LEVEL,
  TIER3_UNLOCK_COST_FLAME, TIER3_UNLOCK_REQ_LEVEL,
  RESOURCE_MATERIAL_ID,
} from '../../components/bahwagyo/bahwagyoData';

// 배화교 루트 노드 1Lv 투자 시 자동으로 ownedArts 에 등록되는 무공 ID.
// 스펙 §5-1 심법 개방 · 외법 성화보법 개방 — "무공 창 등록" 동작.
const ROOT_NODE_TO_ART_ID: Record<string, string> = {
  'mind-t1-1': 'baehwa_sikhwa_simbeop',
  'outer-bobeop-open': 'baehwa_seonghwa_bobeop',
};

function registerBaehwagyoArtIfNeeded(
  nodeId: string,
  newLevel: number,
  ownedArts: { id: string }[],
): { id: string }[] | null {
  if (newLevel < 1) return null;
  const artId = ROOT_NODE_TO_ART_ID[nodeId];
  if (!artId) return null;
  if (ownedArts.some(a => a.id === artId)) return null;
  return [...ownedArts, { id: artId }];
}

// 구 세이브 노드 ID → 무공 ID 매핑 (보법 탭 폐지 이전 키)
const LEGACY_NODE_TO_ART_ID: Record<string, string> = {
  'step-t1-1': 'baehwa_seonghwa_bobeop',
};

/**
 * 기존 세이브 마이그레이션: bahwagyo.nodeLevels 가 이미 1Lv 이상인데
 * ownedArts 에 해당 무공이 없으면 보충. saveSlice hydrate 에서 1회 호출.
 * ROOT(현재) + LEGACY(구키) 병합 순회로 구 세이브 호환 유지.
 */
export function migrateBaehwagyoOwnedArts(
  nodeLevels: Record<string, number>,
  ownedArts: { id: string }[],
): { id: string }[] {
  let out = ownedArts;
  const combined = { ...LEGACY_NODE_TO_ART_ID, ...ROOT_NODE_TO_ART_ID };
  for (const [nodeId, artId] of Object.entries(combined)) {
    if ((nodeLevels[nodeId] ?? 0) >= 1 && !out.some(a => a.id === artId)) {
      out = [...out, { id: artId }];
    }
  }
  return out;
}

// dataVersion 1→2 마이그레이션: 구 step-*/outer-t* 노드 키를 제거하고
// activeBranch가 'step'이면 'sword'로 정규화.
export function migrateBaehwagyoOuterSplit(
  loadedBhw: Partial<BahwagyoState>,
  savedDataVersion: number,
): Partial<BahwagyoState> {
  if (savedDataVersion >= 2) return loadedBhw;
  const isLegacyKey = (k: string) =>
    k.startsWith('step-') || /^outer-t\d/.test(k);
  const filterKeys = <T>(rec: Record<string, T> | undefined): Record<string, T> => {
    if (!rec) return {};
    const out: Record<string, T> = {};
    for (const [k, v] of Object.entries(rec)) if (!isLegacyKey(k)) out[k] = v;
    return out;
  };
  const legacyKeys = Object.keys({ ...loadedBhw.nodeLevels, ...loadedBhw.scrolls, ...loadedBhw.unlockedTiers }).filter(isLegacyKey);
  if (legacyKeys.length > 0) {
    console.warn('[배화교 마이그레이션] dataVersion 2: 구 키 초기화 →', legacyKeys);
  }
  return {
    ...loadedBhw,
    nodeLevels: filterKeys(loadedBhw.nodeLevels),
    scrolls: filterKeys(loadedBhw.scrolls),
    unlockedTiers: filterKeys(loadedBhw.unlockedTiers as Record<string, boolean>),
    activeBranch: (loadedBhw.activeBranch as string) === 'step'
      ? 'sword'
      : loadedBhw.activeBranch,
  };
}

// 초기 nodeLevels — 배화교 4 브랜치 × (t1×4 + t2×2 + t3×2) = 32
const INITIAL_NODE_LEVELS: Record<string, number> = {};
for (const id of Object.keys(NODE_MAP)) INITIAL_NODE_LEVELS[id] = 0;

export const INITIAL_BAHWAGYO_STATE: BahwagyoState = {
  activeBranch: 'sword',
  resources: { ember: 0, flame: 0, divine: 0 },
  scrolls: {
    'sword-t1': 0, 'sword-t2': 0, 'sword-t3': 0,
    'mind-t1': 0,  'mind-t2': 0,  'mind-t3': 0,
  },
  nodeLevels: INITIAL_NODE_LEVELS,
  unlockedTiers: {
    'sword-2': false, 'sword-3': false,
    'mind-2': false,  'mind-3': false,
    'outer-2': false, 'outer-3': false,
  },
  expandLevel: 0,
  mysteryFragments: { first: false, second: false },
  selectedNodeId: null,
  showLockedModal: null,
};

export type BahwagyoSlice = {
  bahwagyo: BahwagyoState;

  bahwagyoSetActiveBranch: (branch: BranchId) => void;
  bahwagyoLevelUpNode: (nodeId: string, useScroll?: boolean) => void;
  bahwagyoUnlockTier: (branch: Exclude<BranchId, 'mystery'>, tier: 2 | 3) => void;
  bahwagyoExchange: (from: 'ember' | 'flame' | 'divine', fromAmt: number, to: 'ember' | 'flame' | 'divine', toAmt: number) => void;
  bahwagyoSelectNode: (nodeId: string | null) => void;
  bahwagyoOpenLockedModal: (branch: Exclude<BranchId, 'mystery'>, tier: 2 | 3) => void;
  bahwagyoCloseLockedModal: () => void;
  bahwagyoReset: () => void;
};

export const createBahwagyoSlice: StateCreator<GameStore, [], [], BahwagyoSlice> = (set, get) => ({
  bahwagyo: INITIAL_BAHWAGYO_STATE,

  bahwagyoSetActiveBranch: (branch) => {
    set(s => ({
      bahwagyo: { ...(s as GameStore).bahwagyo, activeBranch: branch, selectedNodeId: null, showLockedModal: null },
    }));
  },

  bahwagyoLevelUpNode: (nodeId, useScroll = false) => {
    const state = get() as GameStore;
    if (state.battleMode !== 'none') return;
    const node = NODE_MAP[nodeId];
    if (!node) return;
    if (node.placeholder) return;  // 설계 미확정 노드 — 레벨업 차단
    const bhw = state.bahwagyo;
    const current = bhw.nodeLevels[nodeId] ?? 0;
    const max = getNodeMax(node, bhw.expandLevel);
    if (current >= max) return;

    const newLevel = current + 1;
    const newOwnedArts = registerBaehwagyoArtIfNeeded(nodeId, newLevel, state.ownedArts);

    if (useScroll) {
      const scrollKey = `${node.branch}-t${node.tier}`;
      const scrollCount = bhw.scrolls[scrollKey] ?? 0;
      if (scrollCount <= 0) return;
      set({
        bahwagyo: {
          ...bhw,
          nodeLevels: { ...bhw.nodeLevels, [nodeId]: newLevel },
          scrolls: { ...bhw.scrolls, [scrollKey]: scrollCount - 1 },
        },
        ...(newOwnedArts ? { ownedArts: newOwnedArts } : {}),
      });
      return;
    }

    const res = getCostResource(node, current);
    const cost = getLevelUpCost(node, current);
    const matId = RESOURCE_MATERIAL_ID[res];
    const have = state.materials[matId] ?? 0;
    if (have < cost) return;
    set({
      bahwagyo: {
        ...bhw,
        nodeLevels: { ...bhw.nodeLevels, [nodeId]: newLevel },
      },
      materials: { ...state.materials, [matId]: have - cost },
      ...(newOwnedArts ? { ownedArts: newOwnedArts } : {}),
    });
  },

  bahwagyoUnlockTier: (branch, tier) => {
    const state = get() as GameStore;
    if (state.battleMode !== 'none') return;
    const bhw = state.bahwagyo;
    const key = `${branch}-${tier}`;
    if (bhw.unlockedTiers[key]) return;

    if (tier === 2) {
      const t1Levels = Object.entries(bhw.nodeLevels)
        .filter(([id]) => id.startsWith(`${branch}-t1`))
        .map(([, lv]) => lv);
      const qual = t1Levels.filter(lv => lv >= TIER2_UNLOCK_NODE_MIN_LEVEL).length;
      if (qual < TIER2_UNLOCK_REQ_NODES) return;
      const emberId = RESOURCE_MATERIAL_ID.ember;
      const haveEmber = state.materials[emberId] ?? 0;
      if (haveEmber < TIER2_UNLOCK_COST_EMBER) return;
      set({
        bahwagyo: {
          ...bhw,
          unlockedTiers: { ...bhw.unlockedTiers, [key]: true },
          showLockedModal: null,
        },
        materials: { ...state.materials, [emberId]: haveEmber - TIER2_UNLOCK_COST_EMBER },
      });
      return;
    }

    // tier 3
    const t2Levels = Object.entries(bhw.nodeLevels)
      .filter(([id]) => id.startsWith(`${branch}-t2`))
      .map(([, lv]) => lv);
    const hasQual = t2Levels.some(lv => lv >= TIER3_UNLOCK_REQ_LEVEL);
    if (!hasQual) return;
    const flameId = RESOURCE_MATERIAL_ID.flame;
    const haveFlame = state.materials[flameId] ?? 0;
    if (haveFlame < TIER3_UNLOCK_COST_FLAME) return;
    set({
      bahwagyo: {
        ...bhw,
        unlockedTiers: { ...bhw.unlockedTiers, [key]: true },
        showLockedModal: null,
      },
      materials: { ...state.materials, [flameId]: haveFlame - TIER3_UNLOCK_COST_FLAME },
    });
  },

  bahwagyoExchange: (from, fromAmt, to, toAmt) => {
    const state = get() as GameStore;
    const fromId = RESOURCE_MATERIAL_ID[from];
    const toId = RESOURCE_MATERIAL_ID[to];
    const haveFrom = state.materials[fromId] ?? 0;
    if (haveFrom < fromAmt) return;
    const haveTo = state.materials[toId] ?? 0;
    set({
      materials: {
        ...state.materials,
        [fromId]: haveFrom - fromAmt,
        [toId]: haveTo + toAmt,
      },
    });
  },

  bahwagyoSelectNode: (nodeId) => {
    set(s => ({
      bahwagyo: { ...(s as GameStore).bahwagyo, selectedNodeId: nodeId, showLockedModal: null },
    }));
  },

  bahwagyoOpenLockedModal: (branch, tier) => {
    set(s => ({
      bahwagyo: { ...(s as GameStore).bahwagyo, showLockedModal: { branch, tier }, selectedNodeId: null },
    }));
  },

  bahwagyoCloseLockedModal: () => {
    set(s => ({
      bahwagyo: { ...(s as GameStore).bahwagyo, showLockedModal: null },
    }));
  },

  bahwagyoReset: () => {
    const bhw = (get() as GameStore).bahwagyo;
    const resetLevels: Record<string, number> = {};
    for (const id of Object.keys(bhw.nodeLevels)) resetLevels[id] = 0;
    set({
      bahwagyo: {
        ...INITIAL_BAHWAGYO_STATE,
        activeBranch: bhw.activeBranch,
        nodeLevels: resetLevels,
      },
    });
  },
});
