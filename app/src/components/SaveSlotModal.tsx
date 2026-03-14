/**
 * 저장 슬롯 선택 모달 (v2.0)
 */
import { useState } from 'react';
import { useGameStore, type SaveMeta } from '../store/gameStore';

interface Props {
  onClose: () => void;
}

export default function SaveSlotModal({ onClose }: Props) {
  const getSaveSlots = useGameStore(s => s.getSaveSlots);
  const saveGame = useGameStore(s => s.saveGame);
  const loadGame = useGameStore(s => s.loadGame);
  const resetGame = useGameStore(s => s.resetGame);
  const currentSaveSlot = useGameStore(s => s.currentSaveSlot);

  const [confirmSlot, setConfirmSlot] = useState<number | null>(null);

  const slots = getSaveSlots();

  function formatDate(ts: number): string {
    const d = new Date(ts);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${month}/${day} ${h}:${m} 저장`;
  }

  function handleSlotClick(slotIndex: number, meta: SaveMeta | null) {
    if (slotIndex === currentSaveSlot) {
      // 현재 슬롯 — 저장만
      saveGame(slotIndex);
      onClose();
      return;
    }

    if (!meta) {
      // 빈 슬롯
      if (confirm('새 게임을 시작하시겠습니까?')) {
        resetGame(slotIndex);
        loadGame(slotIndex);
        onClose();
      }
      return;
    }

    // 다른 슬롯으로 전환
    setConfirmSlot(slotIndex);
  }

  function handleSaveAndLoad(slotIndex: number) {
    saveGame(currentSaveSlot);
    loadGame(slotIndex);
    setConfirmSlot(null);
    onClose();
  }

  function handleLoadWithoutSave(slotIndex: number) {
    loadGame(slotIndex);
    setConfirmSlot(null);
    onClose();
  }

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content" onClick={e => e.stopPropagation()}>
        <div className="modal-title">저장 슬롯 선택</div>

        <div className="save-slot-list">
          {slots.map((meta, i) => {
            const isCurrent = i === currentSaveSlot;

            return (
              <button
                key={i}
                className={`save-slot-item ${isCurrent ? 'save-slot-current' : ''}`}
                onClick={() => handleSlotClick(i, meta)}
              >
                <div className="save-slot-header">
                  <span className="save-slot-name">슬롯 {i + 1}</span>
                  {isCurrent && <span className="save-slot-badge">현재</span>}
                </div>
                {meta ? (
                  <div className="save-slot-info">
                    <span>{meta.tierName} 경맥{meta.totalStats}</span>
                    <span className="save-slot-date">{formatDate(meta.savedAt)}</span>
                  </div>
                ) : (
                  <div className="save-slot-empty">-- 새 게임 --</div>
                )}
              </button>
            );
          })}
        </div>

        {confirmSlot !== null && (
          <div className="save-slot-confirm">
            <div className="save-slot-confirm-text">현재 진행을 저장할까요?</div>
            <div className="save-slot-confirm-actions">
              <button className="btn btn-small" onClick={() => handleSaveAndLoad(confirmSlot)}>
                저장 후 불러오기
              </button>
              <button className="btn btn-small btn-danger" onClick={() => handleLoadWithoutSave(confirmSlot)}>
                저장하지 않고 불러오기
              </button>
              <button className="btn btn-small" onClick={() => setConfirmSlot(null)}>
                취소
              </button>
            </div>
          </div>
        )}

        {confirmSlot === null && (
          <button className="btn" onClick={onClose} style={{ marginTop: 16, width: '100%' }}>
            취소
          </button>
        )}
      </div>
    </div>
  );
}
