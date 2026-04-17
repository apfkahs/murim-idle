// components/bahwagyo/BahwagyoLockedAreaModal.tsx
// 잠긴 영역 해금 조건 팝업

import type { BahwagyoState, BranchId } from './bahwagyoTypes';
import {
  TIER2_UNLOCK_COST_EMBER,
  TIER2_UNLOCK_REQ_NODES,
  TIER2_UNLOCK_NODE_MIN_LEVEL,
  TIER3_UNLOCK_COST_FLAME,
  TIER3_UNLOCK_REQ_LEVEL,
  BRANCH_NAMES,
} from './bahwagyoData';

interface Props {
  branch: Exclude<BranchId, 'mystery'>;
  tier: 2 | 3;
  state: BahwagyoState;
  onUnlock: (branch: Exclude<BranchId, 'mystery'>, tier: 2 | 3) => void;
  onClose: () => void;
}

export default function BahwagyoLockedAreaModal({ branch, tier, state, onUnlock, onClose }: Props) {
  const { nodeLevels, resources } = state;

  let canUnlock = false;
  let qualCount = 0;
  let qualNeed = 0;
  let costLabel = '';
  let costHave = 0;
  let costNeed = 0;
  let reqDesc = '';

  if (tier === 2) {
    // 1단계 노드 중 2개 이상 20레벨
    const t1Levels = Object.entries(nodeLevels)
      .filter(([id]) => id.startsWith(`${branch}-t1`))
      .map(([, lv]) => lv);
    qualCount = t1Levels.filter(lv => lv >= TIER2_UNLOCK_NODE_MIN_LEVEL).length;
    qualNeed = TIER2_UNLOCK_REQ_NODES;
    costNeed = TIER2_UNLOCK_COST_EMBER;
    costHave = resources.ember;
    costLabel = '희미한 잔불';
    reqDesc = `1단계 노드 중 ${TIER2_UNLOCK_REQ_NODES}개 이상 ${TIER2_UNLOCK_NODE_MIN_LEVEL}레벨`;
    canUnlock = qualCount >= qualNeed && costHave >= costNeed;
  } else {
    // 2단계 노드 1개 이상 12레벨
    const t2Levels = Object.entries(nodeLevels)
      .filter(([id]) => id.startsWith(`${branch}-t2`))
      .map(([, lv]) => lv);
    qualCount = t2Levels.filter(lv => lv >= TIER3_UNLOCK_REQ_LEVEL).length;
    qualNeed = 1;
    costNeed = TIER3_UNLOCK_COST_FLAME;
    costHave = resources.flame;
    costLabel = '타오르는 불꽃 파편';
    reqDesc = `2단계 노드 중 1개가 ${TIER3_UNLOCK_REQ_LEVEL}레벨 이상`;
    canUnlock = qualCount >= qualNeed && costHave >= costNeed;
  }

  const qualMet = qualCount >= qualNeed;
  const costMet = costHave >= costNeed;

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content fire-popup" onClick={e => e.stopPropagation()}>
        <button className="fire-popup-close" onClick={onClose}>✕</button>

        <div className="fire-locked-modal-title">
          이 영역은 아직 잠겨있다.
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,150,60,0.5)', marginBottom: 8 }}>
          {BRANCH_NAMES[branch]} {tier}단계
        </div>

        <div className="fire-modal-divider" />

        <div className="fire-unlock-section">
          <div className="fire-unlock-path-title">비급 경로</div>
          <div className="fire-unlock-req">
            상위 무공의 비급서를 획득하라.
          </div>
        </div>

        <div className="fire-modal-divider" />

        <div className="fire-unlock-section">
          <div className="fire-unlock-path-title">정가(천장) 경로</div>
          <div className="fire-unlock-req">{reqDesc}</div>
          <div className={`fire-unlock-progress${qualMet ? ' met' : ''}`}>
            현재: {qualCount} / {qualNeed} {qualMet ? '✓' : ''}
          </div>
          <div className="fire-unlock-req">+ {costLabel} {costNeed.toLocaleString()}개</div>
          <div className={`fire-unlock-progress${costMet ? ' met' : ''}`}>
            보유: {costHave.toLocaleString()} / {costNeed.toLocaleString()} {costMet ? '✓' : ''}
          </div>
        </div>

        <button
          className="fire-unlock-btn"
          disabled={!canUnlock}
          onClick={() => { onUnlock(branch, tier); onClose(); }}
        >
          정수를 투자해 해금
        </button>
      </div>
    </div>
  );
}
