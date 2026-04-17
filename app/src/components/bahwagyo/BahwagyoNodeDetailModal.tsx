// components/bahwagyo/BahwagyoNodeDetailModal.tsx
// 노드 상세 팝업 — 효과/레벨업/자원 선택

import { useState } from 'react';
import type { BahwagyoState } from './bahwagyoTypes';
import {
  NODE_MAP,
  getNodeMax,
  getCostResource,
  getLevelUpCost,
  RESOURCE_NAMES,
  RESOURCE_ICONS,
  getAbbrev,
  BRANCH_NAMES,
} from './bahwagyoData';
import type { BranchId } from './bahwagyoTypes';

interface Props {
  nodeId: string;
  state: BahwagyoState;
  onLevelUp: (nodeId: string, useScroll: boolean) => void;
  onClose: () => void;
}

export default function BahwagyoNodeDetailModal({ nodeId, state, onLevelUp, onClose }: Props) {
  const node = NODE_MAP[nodeId];
  if (!node) return null;

  const level = state.nodeLevels[nodeId] ?? 0;
  const max = getNodeMax(node, state.expandLevel);
  const isMaxed = level >= max;

  // 선행 조건 미충족 여부 (흐림 노드)
  const isLocked = node.requiresRoot
    ? (state.nodeLevels[`${node.branch}-t1-1`] ?? 0) < 1
    : false;

  // 자원 선택 로컬 상태
  const scrollKey = `${node.branch}-t${node.tier}`;
  const scrollCount = state.scrolls[scrollKey] ?? 0;
  const costRes = getCostResource(node, level);
  const costAmt = getLevelUpCost(node, level);
  const hasEssence = state.resources[costRes] >= costAmt;
  const hasScroll = scrollCount > 0;

  // 기본값: 보유량이 있는 쪽 우선 (둘 다 있으면 essence 우선)
  const defaultSel: 'essence' | 'scroll' = hasEssence ? 'essence' : hasScroll ? 'scroll' : 'essence';
  const [selectedResource, setSelectedResource] = useState<'essence' | 'scroll'>(defaultSel);

  // 현재/다음 효과 계산
  const currentEffect = level * node.effectPerLevel;
  const nextEffect = (level + 1) * node.effectPerLevel;

  function handleLevelUp() {
    if (isMaxed || isLocked) return;
    onLevelUp(nodeId, selectedResource === 'scroll');
  }

  const canLevelUp = !isMaxed && !isLocked && (
    (selectedResource === 'essence' && hasEssence) ||
    (selectedResource === 'scroll' && hasScroll)
  );

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content fire-popup" onClick={e => e.stopPropagation()}>
        <button className="fire-popup-close" onClick={onClose}>✕</button>

        {/* 헤더 */}
        <div className="fire-modal-header">
          <div className="fire-modal-icon">{getAbbrev(node.name)}</div>
          <div className="fire-modal-title">
            <h3>{node.name}</h3>
            <div className="fire-modal-level">현재 {level} / {max}</div>
          </div>
        </div>

        <div className="fire-modal-divider" />

        {/* 설명 */}
        <div className="fire-modal-desc">{node.description}</div>
        <div className="fire-modal-func">{node.functional}</div>

        <div className="fire-modal-divider" />

        {isLocked ? (
          <div className="fire-modal-locked-msg">
            먼저 초식 배율을 1레벨 이상 투자하라.
          </div>
        ) : (
          <>
            {/* 효과 수치 */}
            <div className="fire-modal-effect-row">
              <span className="fire-modal-effect-label">현재</span>
              <span className="fire-modal-effect-value">+{currentEffect}{node.effectUnit}</span>
            </div>
            {isMaxed ? (
              <div className="fire-modal-maxed">✨ 만렙 도달</div>
            ) : (
              <div className="fire-modal-effect-row">
                <span className="fire-modal-effect-label">다음</span>
                <span className="fire-modal-effect-value">+{nextEffect}{node.effectUnit}</span>
                <span className="fire-modal-effect-next">&nbsp;(▲ +{node.effectPerLevel}{node.effectUnit})</span>
              </div>
            )}

            {!isMaxed && (
              <>
                <div className="fire-modal-divider" />
                {/* 자원 선택 */}
                <div className="fire-resource-label">자원 선택:</div>
                <div className="fire-resource-options">
                  <button
                    className={`fire-resource-btn${selectedResource === 'essence' ? ' selected' : ''}`}
                    disabled={!hasEssence}
                    onClick={() => hasEssence && setSelectedResource('essence')}
                  >
                    {RESOURCE_ICONS[costRes]} {RESOURCE_NAMES[costRes]} {costAmt}개 사용
                    &nbsp;(보유: {state.resources[costRes].toLocaleString()})
                  </button>
                  <button
                    className={`fire-resource-btn${selectedResource === 'scroll' ? ' selected' : ''}`}
                    disabled={!hasScroll}
                    onClick={() => hasScroll && setSelectedResource('scroll')}
                  >
                    📜 {BRANCH_NAMES[node.branch as Exclude<BranchId, 'mystery'>] ?? node.branch} {node.tier}단계 비급 1권 사용
                    &nbsp;(보유: {scrollCount})
                  </button>
                </div>

                <button
                  className="fire-levelup-btn"
                  disabled={!canLevelUp}
                  onClick={handleLevelUp}
                >
                  레벨업
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

