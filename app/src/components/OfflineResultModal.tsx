/**
 * 오프라인 결과 모달 (v2.0)
 */
import type { OfflineResult } from '../store/gameStore';

interface Props {
  result: OfflineResult;
  onClose: () => void;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분`;
  return `${Math.floor(seconds)}초`;
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

export default function OfflineResultModal({ result, onClose }: Props) {
  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content" onClick={e => e.stopPropagation()}>
        <div className="modal-title">당신이 없는 동안...</div>
        <div className="offline-duration">({formatDuration(result.elapsedTime)})</div>

        <div className="offline-results">
          {result.qiGained > 0 && (
            <div className="offline-result-row">
              <span>자연의 기운</span>
              <span className="offline-result-value">+{formatNumber(Math.floor(result.qiGained))}</span>
            </div>
          )}
          {result.simdeukGained > 0 && (
            <div className="offline-result-row">
              <span>심득</span>
              <span className="offline-result-value">+{formatNumber(Math.floor(result.simdeukGained))}</span>
            </div>
          )}
          {result.killCount > 0 && (
            <div className="offline-result-row">
              <span>처치</span>
              <span className="offline-result-value">{result.killCount}마리</span>
            </div>
          )}
          {result.deathCount > 0 && (
            <div className="offline-result-row">
              <span>사망</span>
              <span className="offline-result-value offline-result-death">{result.deathCount}회</span>
            </div>
          )}
          {result.dropsGained.length > 0 && (
            <div className="offline-result-row">
              <span>획득</span>
              <span className="offline-result-value offline-result-drop">{result.dropsGained.join(', ')}</span>
            </div>
          )}
        </div>

        <button className="btn" onClick={onClose} style={{ marginTop: 16, width: '100%' }}>
          확인
        </button>
      </div>
    </div>
  );
}
