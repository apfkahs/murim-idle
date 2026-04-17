// components/BahwagyoTab.tsx
// 배화교 스킬트리 메인 컴포넌트 — useState 목업 상태만 사용

import { useState } from 'react';
import type { BranchId, BahwagyoState } from './bahwagyo/bahwagyoTypes';
import {
  INITIAL_STATE,
  makeResetState,
  NODE_MAP,
  getNodeMax,
  getCostResource,
  getLevelUpCost,
  TIER2_UNLOCK_COST_EMBER,
  TIER2_UNLOCK_REQ_NODES,
  TIER2_UNLOCK_NODE_MIN_LEVEL,
  TIER3_UNLOCK_COST_FLAME,
  TIER3_UNLOCK_REQ_LEVEL,
} from './bahwagyo/bahwagyoData';
import BahwagyoTabBar from './bahwagyo/BahwagyoTabBar';
import BahwagyoInventory from './bahwagyo/BahwagyoInventory';
import BahwagyoTreeView from './bahwagyo/BahwagyoTreeView';
import BahwagyoNodeDetailModal from './bahwagyo/BahwagyoNodeDetailModal';
import BahwagyoLockedAreaModal from './bahwagyo/BahwagyoLockedAreaModal';
import BahwagyoExchangeUI from './bahwagyo/BahwagyoExchangeUI';
import BahwagyoMysteryNode from './bahwagyo/BahwagyoMysteryNode';

interface Props {
  onClose?: () => void;
}

export default function BahwagyoTab({ onClose }: Props) {
  const [st, setSt] = useState<BahwagyoState>(INITIAL_STATE);
  const [softMode, setSoftMode] = useState(false);

  // ── 탭 전환
  function selectBranch(branch: BranchId) {
    setSt(s => ({
      ...s,
      activeBranch: branch,
      // 모달 상호 배제 해제
      selectedNodeId: null,
      showLockedModal: null,
    }));
  }

  // ── 초기화
  function handleReset() {
    setSt(s => makeResetState(s));
  }

  // ── 노드 레벨업
  function levelUpNode(nodeId: string, useScroll: boolean) {
    const node = NODE_MAP[nodeId];
    if (!node) return;
    setSt(s => {
      const current = s.nodeLevels[nodeId] ?? 0;
      const max = getNodeMax(node, s.expandLevel);
      if (current >= max) return s;

      if (useScroll) {
        const scrollKey = `${node.branch}-t${node.tier}`;
        const scrollCount = s.scrolls[scrollKey] ?? 0;
        if (scrollCount <= 0) return s;
        return {
          ...s,
          nodeLevels: { ...s.nodeLevels, [nodeId]: current + 1 },
          scrolls: { ...s.scrolls, [scrollKey]: scrollCount - 1 },
        };
      } else {
        const res = getCostResource(node, current);
        const cost = getLevelUpCost(node, current);
        if (s.resources[res] < cost) return s;
        return {
          ...s,
          nodeLevels: { ...s.nodeLevels, [nodeId]: current + 1 },
          resources: { ...s.resources, [res]: s.resources[res] - cost },
        };
      }
    });
  }

  // ── 2/3단계 해금
  function unlockTier(branch: Exclude<BranchId, 'mystery'>, tier: 2 | 3) {
    setSt(s => {
      const key = `${branch}-${tier}`;
      if (s.unlockedTiers[key]) return s; // 이미 해금

      if (tier === 2) {
        // 1단계 노드 중 2개 이상 TIER2_UNLOCK_NODE_MIN_LEVEL 이상
        const t1Nodes = Object.entries(s.nodeLevels)
          .filter(([id]) => id.startsWith(`${branch}-t1`))
          .map(([, lv]) => lv);
        const qualCount = t1Nodes.filter(lv => lv >= TIER2_UNLOCK_NODE_MIN_LEVEL).length;
        if (qualCount < TIER2_UNLOCK_REQ_NODES) return s;
        if (s.resources.ember < TIER2_UNLOCK_COST_EMBER) return s;
        return {
          ...s,
          resources: { ...s.resources, ember: s.resources.ember - TIER2_UNLOCK_COST_EMBER },
          unlockedTiers: { ...s.unlockedTiers, [key]: true },
          showLockedModal: null,
        };
      } else {
        // 3단계: 2단계 노드 1개 이상 TIER3_UNLOCK_REQ_LEVEL 이상 + 불꽃 파편
        const t2Levels = Object.entries(s.nodeLevels)
          .filter(([id]) => id.startsWith(`${branch}-t2`))
          .map(([, lv]) => lv);
        const hasQual = t2Levels.some(lv => lv >= TIER3_UNLOCK_REQ_LEVEL);
        if (!hasQual) return s;
        if (s.resources.flame < TIER3_UNLOCK_COST_FLAME) return s;
        return {
          ...s,
          resources: { ...s.resources, flame: s.resources.flame - TIER3_UNLOCK_COST_FLAME },
          unlockedTiers: { ...s.unlockedTiers, [key]: true },
          showLockedModal: null,
        };
      }
    });
  }

  // ExchangeUI용 직접 업데이트
  function applyExchange(fromRes: 'ember' | 'flame' | 'divine', fromAmt: number, toRes: 'ember' | 'flame' | 'divine', toAmt: number) {
    setSt(s => {
      if (s.resources[fromRes] < fromAmt) return s;
      return {
        ...s,
        resources: {
          ...s.resources,
          [fromRes]: s.resources[fromRes] - fromAmt,
          [toRes]: s.resources[toRes] + toAmt,
        },
      };
    });
  }

  // ── 모달 열기/닫기
  function openNodeModal(nodeId: string) {
    setSt(s => ({ ...s, selectedNodeId: nodeId, showLockedModal: null }));
  }

  function closeNodeModal() {
    setSt(s => ({ ...s, selectedNodeId: null }));
  }

  function openLockedModal(branch: Exclude<BranchId, 'mystery'>, tier: 2 | 3) {
    setSt(s => ({ ...s, showLockedModal: { branch, tier }, selectedNodeId: null }));
  }

  function closeLockedModal() {
    setSt(s => ({ ...s, showLockedModal: null }));
  }

  const isMystery = st.activeBranch === 'mystery';

  return (
    <div className={[
      onClose ? 'fire-skilltree-overlay' : undefined,
      softMode ? 'fire-theme-soft' : undefined,
    ].filter(Boolean).join(' ') || undefined}>
      {onClose && (
        <div className="fire-overlay-header">
          <button className="fire-overlay-back" onClick={onClose}>← 돌아가기</button>
          <span className="fire-overlay-title">배화교 비급</span>
          <button
            className={`fire-softmode-btn${softMode ? ' active' : ''}`}
            onClick={() => setSoftMode(v => !v)}
            title="약안 모드"
          >
            {softMode ? '🌙 약안' : '🌙 약안'}
          </button>
        </div>
      )}
      <div className="fire-skilltree">
      <BahwagyoTabBar active={st.activeBranch} onSelect={selectBranch} />
      <BahwagyoInventory state={st} onReset={handleReset} />

      <div className="fire-tree-scroll">
        {isMystery ? (
          <>
            <BahwagyoExchangeUI resources={st.resources} onExchange={applyExchange} />
            <BahwagyoMysteryNode fragments={st.mysteryFragments} />
          </>
        ) : (
          <BahwagyoTreeView
            branch={st.activeBranch as Exclude<BranchId, 'mystery'>}
            nodeLevels={st.nodeLevels}
            unlockedTiers={st.unlockedTiers}
            expandLevel={st.expandLevel}
            resources={st.resources}
            scrolls={st.scrolls}
            onNodeClick={openNodeModal}
            onLockedClick={openLockedModal}
          />
        )}
      </div>

      {st.selectedNodeId && (
        <BahwagyoNodeDetailModal
          nodeId={st.selectedNodeId}
          state={st}
          onLevelUp={levelUpNode}
          onClose={closeNodeModal}
        />
      )}

      {st.showLockedModal && (
        <BahwagyoLockedAreaModal
          branch={st.showLockedModal.branch}
          tier={st.showLockedModal.tier}
          state={st}
          onUnlock={unlockTier}
          onClose={closeLockedModal}
        />
      )}
      </div>
    </div>
  );
}
