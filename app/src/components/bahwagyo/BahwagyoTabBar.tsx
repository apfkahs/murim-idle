// components/bahwagyo/BahwagyoTabBar.tsx
import type { BranchId } from './bahwagyoTypes';

interface Props {
  active: BranchId;
  onSelect: (b: BranchId) => void;
}

const TABS: { id: BranchId; label: string }[] = [
  { id: 'sword', label: '검법' },
  { id: 'mind', label: '심법' },
  { id: 'outer', label: '외법' },
  { id: 'mystery', label: '???' },
];

export default function BahwagyoTabBar({ active, onSelect }: Props) {
  return (
    <div className="fire-tab-bar">
      {TABS.map(tab => (
        <button
          key={tab.id}
          className={`fire-tab-btn${tab.id === 'mystery' ? ' mystery' : ''}${active === tab.id ? ' active' : ''}`}
          onClick={() => onSelect(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
