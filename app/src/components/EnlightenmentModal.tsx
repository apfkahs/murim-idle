/**
 * 깨달음 모달 — Phase 5
 * pendingEnlightenments 대기열에서 하나씩 표시
 */
import { useGameStore } from '../store/gameStore';
import { getArtDef } from '../data/arts';

export default function EnlightenmentModal() {
  const pending = useGameStore(s => s.pendingEnlightenments);
  const dismiss = useGameStore(s => s.dismissEnlightenment);

  if (pending.length === 0) return null;

  const current = pending[0];
  const artDef = getArtDef(current.artId);

  return (
    <div className="popup-overlay" onClick={dismiss}>
      <div
        className="popup-content enlightenment-modal"
        onClick={e => e.stopPropagation()}
      >
        <div className="enlightenment-icon">✦</div>
        <h2 className="enlightenment-title">깨달음</h2>
        <p className="enlightenment-desc">
          수련 중 깊은 깨달음을 얻었다!
        </p>
        <div className="enlightenment-detail">
          <span className="enlightenment-art">{artDef?.name ?? current.artId}</span>
          <span className="enlightenment-mastery">{current.masteryName}</span>
        </div>
        <p className="enlightenment-hint">
          무공 화면에서 새로운 심화학습을 확인하세요.
        </p>
        <button className="enlightenment-confirm" onClick={dismiss}>
          확인
        </button>
        {pending.length > 1 && (
          <span className="enlightenment-remaining">
            +{pending.length - 1}개의 깨달음 대기 중
          </span>
        )}
      </div>
    </div>
  );
}
