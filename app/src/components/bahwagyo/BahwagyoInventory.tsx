// components/bahwagyo/BahwagyoInventory.tsx
import type { BahwagyoState, BranchId } from './bahwagyoTypes';
import { RESOURCE_NAMES, RESOURCE_ICONS, BRANCH_NAMES } from './bahwagyoData';
import { useGameStore } from '../../store/gameStore';

interface Props {
  state: BahwagyoState;
  onReset?: () => void;
}

const SCROLL_LABELS = ['1단계', '2단계', '3단계'];
const SCROLL_TIERS = ['t1', 't2', 't3'] as const;

const resourceKeys = ['ember', 'flame', 'divine'] as const;
const valueClasses: Record<string, string> = {
  ember: 'fire-inventory-value',
  flame: 'fire-inventory-value flame',
  divine: 'fire-inventory-value divine',
};

export default function BahwagyoInventory({ state }: Props) {
  const { activeBranch, resources, scrolls } = state;
  const isMystery = activeBranch === 'mystery';
  const isOuter = activeBranch === 'outer';
  const isMind = activeBranch === 'mind';

  const guideCount = useGameStore(s => s.materials['simbeop_guide_basic'] ?? 0);
  const waebeopseCount = useGameStore(s => s.materials['waebeopse_basic'] ?? 0);

  return (
    <div className="fire-inventory">
      {resourceKeys.map((res, i) => {
        const scrollKey = isMystery ? null : `${activeBranch}-${SCROLL_TIERS[i]}`;
        const scrollCount = scrollKey ? (scrolls[scrollKey] ?? 0) : 0;
        const branchLabel = isMystery ? '' : BRANCH_NAMES[activeBranch as Exclude<BranchId, 'mystery'>];

        // 첫 번째 행 우측 슬롯에 외부 비급(지침서/외법서) 보유량 표시
        const showGuide = isMind && i === 0;
        const showWaebeopse = isOuter && i === 0;

        return (
          <div key={res} className="fire-inventory-row">
            {/* 좌측: 자원 */}
            <div className="fire-inventory-cell">
              <span>{RESOURCE_ICONS[res]}</span>
              <span className="fire-inventory-label">{RESOURCE_NAMES[res]}</span>
              <span className={valueClasses[res]}>{resources[res].toLocaleString()}</span>
            </div>
            {/* 우측: 비급 — 심법 탭은 1행에 지침서, 외법 탭은 1행에 외법서, 그 외 분기 비급 */}
            {showGuide ? (
              <div className="fire-inventory-cell">
                <span>📘</span>
                <span className="fire-inventory-scroll">초급 심법 지침서</span>
                <span className="fire-inventory-scroll-value">{guideCount}</span>
              </div>
            ) : showWaebeopse ? (
              <div className="fire-inventory-cell">
                <span>📙</span>
                <span className="fire-inventory-scroll">초급 외법서</span>
                <span className="fire-inventory-scroll-value">{waebeopseCount}</span>
              </div>
            ) : !isMystery && !isOuter ? (
              <div className="fire-inventory-cell">
                <span>📜</span>
                <span className="fire-inventory-scroll">{branchLabel} {SCROLL_LABELS[i]}</span>
                <span className="fire-inventory-scroll-value">{scrollCount}</span>
              </div>
            ) : (
              <div className="fire-inventory-cell" />
            )}
          </div>
        );
      })}
    </div>
  );
}
