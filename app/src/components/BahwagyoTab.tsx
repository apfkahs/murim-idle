// components/BahwagyoTab.tsx
// 배화교 스킬트리 메인 컴포넌트 — gameStore bahwagyoSlice 구독

import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { BranchId } from './bahwagyo/bahwagyoTypes';
import { RESOURCE_MATERIAL_ID } from './bahwagyo/bahwagyoData';
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
  const rawSt = useGameStore(s => s.bahwagyo);
  const materials = useGameStore(s => s.materials);
  const setActiveBranch = useGameStore(s => s.bahwagyoSetActiveBranch);
  const levelUpNode = useGameStore(s => s.bahwagyoLevelUpNode);
  const unlockTier = useGameStore(s => s.bahwagyoUnlockTier);
  const exchange = useGameStore(s => s.bahwagyoExchange);
  const selectNode = useGameStore(s => s.bahwagyoSelectNode);
  const openLockedModal = useGameStore(s => s.bahwagyoOpenLockedModal);
  const closeLockedModal = useGameStore(s => s.bahwagyoCloseLockedModal);
  const resetTree = useGameStore(s => s.bahwagyoReset);
  const exchangeSwordManualForAsh = useGameStore(s => s.exchangeSwordManualForAsh);
  const [softMode, setSoftMode] = useState(false);
  const [manualExchangeMsg, setManualExchangeMsg] = useState<string | null>(null);

  // resources 는 state.materials 를 단일 소스로 삼아 파생값으로 제공. bahwagyoSlice actions 도 동일.
  const derivedResources = {
    ember:  materials[RESOURCE_MATERIAL_ID.ember]  ?? 0,
    flame:  materials[RESOURCE_MATERIAL_ID.flame]  ?? 0,
    divine: materials[RESOURCE_MATERIAL_ID.divine] ?? 0,
  };
  const st = { ...rawSt, resources: derivedResources };
  const swordManualCount = materials['bahwagyo_sword_manual'] ?? 0;

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
      <BahwagyoTabBar active={st.activeBranch} onSelect={(b: BranchId) => setActiveBranch(b)} />
      <BahwagyoInventory state={st} onReset={resetTree} />

      <div className="fire-tree-scroll">
        {isMystery ? (
          <>
            <BahwagyoExchangeUI resources={st.resources} onExchange={exchange} />
            <div className="fire-exchange-section">
              <div className="fire-exchange-section-title">비급서 교환</div>
              <div className="fire-exchange-block">
                <div className="fire-exchange-title">📕 배화교 검법 비전서 → 🌫 하얀 재</div>
                <div className="fire-exchange-rate">1권 → 30개</div>
                <div className="fire-exchange-have">보유: {swordManualCount}권</div>
                <div className="fire-exchange-btns">
                  <button
                    className="fire-exchange-btn"
                    disabled={swordManualCount < 1}
                    onClick={() => {
                      const used = exchangeSwordManualForAsh(1);
                      setManualExchangeMsg(`비전서 ${used}권 → 하얀 재 ${used * 30}개`);
                    }}
                  >
                    1권
                  </button>
                  <button
                    className="fire-exchange-btn"
                    disabled={swordManualCount < 10}
                    onClick={() => {
                      const used = exchangeSwordManualForAsh(10);
                      setManualExchangeMsg(`비전서 ${used}권 → 하얀 재 ${used * 30}개`);
                    }}
                  >
                    10권
                  </button>
                  <button
                    className="fire-exchange-btn"
                    disabled={swordManualCount < 1}
                    onClick={() => {
                      const used = exchangeSwordManualForAsh(swordManualCount);
                      setManualExchangeMsg(`비전서 ${used}권 → 하얀 재 ${used * 30}개`);
                    }}
                  >
                    전부
                  </button>
                </div>
                {manualExchangeMsg && (
                  <div className="fire-exchange-result">{manualExchangeMsg}</div>
                )}
              </div>
            </div>
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
            onNodeClick={selectNode}
            onLockedClick={openLockedModal}
          />
        )}
      </div>

      {st.selectedNodeId && (
        <BahwagyoNodeDetailModal
          nodeId={st.selectedNodeId}
          state={st}
          onLevelUp={levelUpNode}
          onClose={() => selectNode(null)}
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
