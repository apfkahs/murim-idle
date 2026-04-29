// components/bahwagyo/BahwagyoNodeDetailModal.tsx
// 노드 상세 팝업 — 효과/레벨업/자원 선택 (+ 특성 점진 공개)

import { useLayoutEffect, useRef, useState } from 'react';
import type { BahwagyoState, BranchId, SkillNodeDef } from './bahwagyoTypes';
import {
  NODE_MAP,
  getNodeMax,
  getCostResource,
  getLevelUpCost,
  getGuideLevelUpCost,
  RESOURCE_NAMES,
  RESOURCE_ICONS,
  getAbbrev,
  BRANCH_NAMES,
} from './bahwagyoData';
import { baehwaEmberIntervalSec } from '../../utils/combat/baehwagyoEffects';
import { useGameStore } from '../../store/gameStore';

// 소수점이 있으면 최대 소수점 2자리까지만, 정수면 그대로
function formatNum(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  if (Number.isInteger(rounded)) return rounded.toString();
  return rounded.toFixed(2).replace(/\.?0+$/, '');
}

// 노드별 효과 수치 계산 — 기본은 선형, 특수 노드는 실제 게임 공식 참조
function computeEffectValue(node: SkillNodeDef, lv: number): number {
  // 재의 빠름: 소각 주기 감소 (누적) = 25 - baehwaEmberIntervalSec(lv)
  if (node.id === 'mind-t1-4') {
    return 25 - baehwaEmberIntervalSec(lv);
  }
  return lv * node.effectPerLevel;
}

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
  const isPlaceholder = node.placeholder === true;

  // 선행 조건 미충족 여부 (흐림 노드)
  const isLocked = !isPlaceholder && (node.requiresRoot
    ? (state.nodeLevels[`${node.branch}-t1-1`] ?? 0) < 1
    : false);

  // 자원 선택 로컬 상태
  // scroll 슬롯의 source-of-truth 는 노드 종류에 따라 분기:
  //   - T1 심법 노드 (mind tier 1)   → simbeop_guide_basic 재료 (지침서 N권, N = getGuideLevelUpCost)
  //   - sword-main 개방 (level === 0) → bahwagyo_sword_manual 재료 (비전서 1권)
  //   - 그 외 (T2/T3 등)              → state.scrolls[branch-tier] 카운터 (1권)
  const isMindT1 = node.branch === 'mind' && node.tier === 1;
  const isSwordMainOpen = node.id === 'sword-main' && level === 0;
  const allMaterials = useGameStore(s => s.materials);
  const guideCount = allMaterials['simbeop_guide_basic'] ?? 0;
  const swordManualCount = allMaterials['bahwagyo_sword_manual'] ?? 0;
  const guideCost = isMindT1 ? getGuideLevelUpCost(node, level) : 0;
  const scrollKey = `${node.branch}-t${node.tier}`;
  let scrollCount: number;
  let scrollCostAmt: number;
  if (isMindT1) {
    scrollCount = guideCount;
    scrollCostAmt = guideCost;
  } else if (isSwordMainOpen) {
    scrollCount = swordManualCount;
    scrollCostAmt = 1;
  } else {
    scrollCount = state.scrolls[scrollKey] ?? 0;
    scrollCostAmt = 1;
  }
  const costRes = getCostResource(node, level);
  const costAmt = getLevelUpCost(node, level);
  const hasEssence = state.resources[costRes] >= costAmt;
  const hasScroll = scrollCount >= scrollCostAmt;
  // sword 가지에서 scroll 옵션이 의미 있는 노드는 sword-main(개방) 뿐. sword-ult / sword-qi-manifest 는 잔불 결제만.
  const showScrollOption = node.branch !== 'outer'
    && !(node.branch === 'sword' && !isSwordMainOpen);

  // 기본값: 보유량이 있는 쪽 우선 (둘 다 있으면 essence 우선)
  const defaultSel: 'essence' | 'scroll' = hasEssence ? 'essence' : hasScroll ? 'scroll' : 'essence';
  const [selectedResource, setSelectedResource] = useState<'essence' | 'scroll'>(defaultSel);

  // 현재/다음 효과 계산 (특수 노드는 자체 공식 사용)
  const currentEffect = computeEffectValue(node, level);
  const nextEffect = computeEffectValue(node, level + 1);
  const effectDelta = nextEffect - currentEffect;

  function handleLevelUp() {
    if (isMaxed || isLocked) return;
    onLevelUp(nodeId, selectedResource === 'scroll');
  }

  const canLevelUp = !isMaxed && !isLocked && (
    (selectedResource === 'essence' && hasEssence) ||
    (selectedResource === 'scroll' && hasScroll)
  );

  // 클릭한 노드 위치 기준으로 모달을 앵커링
  const contentRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const anchor = document.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement | null;
    const content = contentRef.current;
    if (!anchor || !content) return;

    const a = anchor.getBoundingClientRect();
    const mW = content.offsetWidth;
    const mH = content.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const GAP = 10;
    const MARGIN = 8;

    let left = a.left + a.width / 2 - mW / 2;
    left = Math.max(MARGIN, Math.min(left, vw - mW - MARGIN));

    let top = a.bottom + GAP;
    if (top + mH > vh - MARGIN) {
      const aboveTop = a.top - GAP - mH;
      top = aboveTop >= MARGIN ? aboveTop : Math.max(MARGIN, vh - mH - MARGIN);
    }

    setCoords({ top, left });
  }, [nodeId]);

  const anchoredStyle: React.CSSProperties | undefined = coords
    ? { position: 'fixed', top: coords.top, left: coords.left, margin: 0, maxHeight: 'calc(100vh - 20px)', overflowY: 'auto' }
    : { visibility: 'hidden' };

  // ── 특성 점진 공개 ──
  // traits 를 레벨 오름차순으로 분류:
  //  - unlocked: level >= T
  //  - preview : 미해금 특성 중 가장 낮은 T 1개만 (다음 해금 미리보기)
  //  - hidden  : 그 뒤 특성들 (???)
  const traits = node.traits ?? [];
  const sortedTraits = [...traits].sort((a, b) => a.level - b.level);
  const firstLockedIdx = sortedTraits.findIndex(t => level < t.level);

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div
        ref={contentRef}
        className="popup-content fire-popup"
        style={anchoredStyle}
        onClick={e => e.stopPropagation()}
      >
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
        {node.effectSummary && (
          <div className="fire-modal-effect-summary">{node.effectSummary}</div>
        )}

        <div className="fire-modal-divider" />

        {isPlaceholder ? (
          <div className="fire-modal-locked-msg">
            아직 전해지지 않은 비의다. 다음 기운이 당도하기를 기다려라.
          </div>
        ) : isLocked ? (
          <div className="fire-modal-locked-msg">
            먼저 초식 배율을 1레벨 이상 투자하라.
          </div>
        ) : (
          <>
            {/* 효과 수치 */}
            <div className="fire-modal-effect-row">
              <span className="fire-modal-effect-label">현재</span>
              <span className="fire-modal-effect-value">+{formatNum(currentEffect)}{node.effectUnit}</span>
            </div>
            {isMaxed ? (
              <div className="fire-modal-maxed">✨ 만렙 도달</div>
            ) : (
              <div className="fire-modal-effect-row">
                <span className="fire-modal-effect-label">다음</span>
                <span className="fire-modal-effect-value">+{formatNum(nextEffect)}{node.effectUnit}</span>
                <span className="fire-modal-effect-next">&nbsp;(▲ +{formatNum(effectDelta)}{node.effectUnit})</span>
              </div>
            )}

            {/* 특성 패널 — 점진 공개 (10/20/30Lv 등 단계 해금) */}
            {sortedTraits.length > 0 && (
              <>
                <div className="fire-modal-divider" />
                <div className="fire-modal-traits-label">특성</div>
                <div className="fire-modal-traits">
                  {sortedTraits.map((trait, idx) => {
                    const unlocked = level >= trait.level;
                    const preview = !unlocked && idx === firstLockedIdx;
                    const hidden = !unlocked && !preview;
                    const cls = [
                      'fire-trait-item',
                      unlocked ? 'fire-trait-item--unlocked' : '',
                      preview ? 'fire-trait-item--preview' : '',
                      hidden ? 'fire-trait-item--hidden' : '',
                    ].filter(Boolean).join(' ');
                    return (
                      <div key={trait.level} className={cls}>
                        <div className="fire-trait-head">
                          <span className="fire-trait-level">{trait.level}Lv</span>
                          <span className="fire-trait-name">
                            {hidden ? '???' : trait.name}
                          </span>
                          {unlocked && <span className="fire-trait-badge">해금</span>}
                          {preview && (
                            <span className="fire-trait-badge fire-trait-badge--preview">다음 해금</span>
                          )}
                        </div>
                        <div className="fire-trait-desc">
                          {hidden
                            ? '이전 특성을 해금하면 공개됩니다.'
                            : trait.description}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {!isMaxed && (
              <>
                <div className="fire-modal-divider" />
                {/* 자원 선택 (outer 노드는 비급 없음) */}
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
                  {showScrollOption && (
                    <button
                      className={`fire-resource-btn${selectedResource === 'scroll' ? ' selected' : ''}`}
                      disabled={!hasScroll}
                      onClick={() => hasScroll && setSelectedResource('scroll')}
                    >
                      {isMindT1 ? (
                        <>📘 초급 심법 지침서 {guideCost}권 사용 &nbsp;(보유: {guideCount})</>
                      ) : isSwordMainOpen ? (
                        <>📕 검법 비전서 1권 사용 &nbsp;(보유: {swordManualCount})</>
                      ) : (
                        <>📜 {BRANCH_NAMES[node.branch as Exclude<BranchId, 'mystery'>] ?? node.branch} {node.tier}단계 비급 1권 사용
                        &nbsp;(보유: {scrollCount})</>
                      )}
                    </button>
                  )}
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
