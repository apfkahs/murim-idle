import { useState } from 'react';
import type { BattleLogEntry } from '../../store/types';
import BattleLog, { type DensityMode } from './BattleLog';
import CharacterInfoTab from './CharacterInfoTab';
import CombatStatsTab from './CombatStatsTab';

type TabKey = 'log' | 'info' | 'stats';

/**
 * 로그 영역 3-탭 컨테이너.
 * - 첫 탭은 main BattleLog (BattleLogEntry[] 기반 · 2축 타임라인 · density). sparkline/turn group/danger 하이라이트는 BattleLog 내부에서 관리.
 * - 탭 전환 상태는 로컬 useState (전투 종료 시 unmount로 자연스럽게 초기화).
 * - 3개 탭을 모두 마운트한 채 `visibility: hidden` 으로 숨겨 유지 → BattleLog 내부 rootRef.scrollHeight 가 0 이 되지 않아 자동 스크롤이 탭 전환 후에도 정상 동작.
 */
const DENSITY_LABELS: Record<DensityMode, string> = {
  full: '많음',
  compact: '보통',
  minimal: '최소',
};

export default function BattleLogTabs({
  entries,
  playerMaxHp,
  density,
  onDensityChange,
}: {
  entries: BattleLogEntry[];
  playerMaxHp: number;
  density: DensityMode;
  onDensityChange: (d: DensityMode) => void;
}) {
  const [tab, setTab] = useState<TabKey>('log');

  const hidden = (isActive: boolean): React.CSSProperties => ({
    position: 'absolute',
    inset: 0,
    visibility: isActive ? 'visible' : 'hidden',
    pointerEvents: isActive ? 'auto' : 'none',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  });

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div className="log-tabs">
        <button
          type="button"
          className={`log-tab ${tab === 'log' ? 'active' : ''}`}
          onClick={() => setTab('log')}
        >
          전투 로그 <span className="badge">live</span>
        </button>
        <button
          type="button"
          className={`log-tab ${tab === 'info' ? 'active' : ''}`}
          onClick={() => setTab('info')}
        >
          내 정보
        </button>
        <button
          type="button"
          className={`log-tab ${tab === 'stats' ? 'active' : ''}`}
          onClick={() => setTab('stats')}
        >
          전투 통계
        </button>
      </div>

      {/* 로그 출력량 토글 — 전투 로그 탭에서만 의미 있으므로 log 탭 활성 시에만 표시 */}
      {tab === 'log' && (
        <div className="density-bar">
          <span className="density-label">로그 출력량</span>
          <div className="density-toggle">
            {(['full', 'compact', 'minimal'] as DensityMode[]).map(m => (
              <button
                key={m}
                type="button"
                className={`density-btn ${density === m ? 'active' : ''}`}
                onClick={() => onDensityChange(m)}
              >
                {DENSITY_LABELS[m]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {/* 전투 로그 탭 — 항상 마운트 · visibility 로만 토글하여 scrollHeight 유지 */}
        <div style={hidden(tab === 'log')}>
          <BattleLog entries={entries} playerMaxHp={playerMaxHp} density={density} />
        </div>

        {/* 내 정보 탭 */}
        <div style={{ ...hidden(tab === 'info'), overflowY: 'auto', padding: '12px 14px' }}>
          <CharacterInfoTab />
        </div>

        {/* 전투 통계 탭 */}
        <div style={{ ...hidden(tab === 'stats'), overflowY: 'auto', padding: '12px 14px' }}>
          <CombatStatsTab />
        </div>
      </div>
    </div>
  );
}
