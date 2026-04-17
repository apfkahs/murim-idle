// components/bahwagyo/BahwagyoInventory.tsx
import type { BahwagyoState, BranchId } from './bahwagyoTypes';
import { RESOURCE_NAMES, RESOURCE_ICONS, BRANCH_NAMES } from './bahwagyoData';

interface Props {
  state: BahwagyoState;
  onReset: () => void;
}

const SCROLL_LABELS = ['1단계', '2단계', '3단계'];
const SCROLL_TIERS = ['t1', 't2', 't3'] as const;

const resourceKeys = ['ember', 'flame', 'divine'] as const;
const valueClasses: Record<string, string> = {
  ember: 'fire-inventory-value',
  flame: 'fire-inventory-value flame',
  divine: 'fire-inventory-value divine',
};

export default function BahwagyoInventory({ state, onReset }: Props) {
  const { activeBranch, resources, scrolls } = state;
  const isMystery = activeBranch === 'mystery';

  return (
    <div className="fire-inventory">
      {resourceKeys.map((res, i) => {
        const scrollKey = isMystery ? null : `${activeBranch}-${SCROLL_TIERS[i]}`;
        const scrollCount = scrollKey ? (scrolls[scrollKey] ?? 0) : 0;
        const branchLabel = isMystery ? '' : BRANCH_NAMES[activeBranch as Exclude<BranchId, 'mystery'>];

        return (
          <div key={res} className="fire-inventory-row">
            {/* 좌측: 자원 */}
            <div className="fire-inventory-cell">
              <span>{RESOURCE_ICONS[res]}</span>
              <span className="fire-inventory-label">{RESOURCE_NAMES[res]}</span>
              <span className={valueClasses[res]}>{resources[res].toLocaleString()}</span>
            </div>
            {/* 우측: 비급 (??? 탭 숨김) */}
            {!isMystery ? (
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
      <button className="fire-reset-btn" onClick={onReset}>
        초기화 (프로토타입용)
      </button>
    </div>
  );
}
