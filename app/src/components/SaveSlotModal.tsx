/**
 * 저장 슬롯 선택 모달 (v2.0)
 */
import { useState, useRef } from 'react';
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

  const deleteSlot = useGameStore(s => s.deleteSlot);
  const exportSave = useGameStore(s => s.exportSave);
  const importSave = useGameStore(s => s.importSave);

  const [confirmSlot, setConfirmSlot] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [slotRefreshKey, setSlotRefreshKey] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importTargetSlot = useRef<number>(-1);

  // slotRefreshKey 변화 시 슬롯 목록 갱신
  const slots = getSaveSlots();
  void slotRefreshKey;

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

  function handleExport(e: React.MouseEvent, slotIndex: number) {
    e.stopPropagation();
    exportSave(slotIndex);
  }

  function handleImportClick(e: React.MouseEvent, slotIndex: number) {
    e.stopPropagation();
    importTargetSlot.current = slotIndex;
    fileInputRef.current!.value = '';
    fileInputRef.current!.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const slot = importTargetSlot.current;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(text);
      } catch {
        alert('파일을 읽을 수 없습니다.');
        return;
      }
      if (!String(data.version ?? '').startsWith('4')) {
        alert('지원하지 않는 저장 버전입니다.');
        return;
      }
      const overwrite = slots[slot] !== null
        ? confirm(`슬롯 ${slot + 1}의 데이터를 덮어씁니다. 계속하시겠습니까?`)
        : true;
      if (!overwrite) return;
      const ok = importSave(slot, text);
      if (ok) {
        setSlotRefreshKey(k => k + 1);
      } else {
        alert('저장 데이터를 가져오는 데 실패했습니다.');
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content" onClick={e => e.stopPropagation()}>
        <div className="modal-title">저장 슬롯 선택</div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <div className="save-slot-list">
          {slots.map((meta, i) => {
            const isCurrent = i === currentSaveSlot;

            return (
              <div key={i} className="save-slot-row">
                <button
                  className={`save-slot-item ${isCurrent ? 'save-slot-current' : ''}`}
                  onClick={() => handleSlotClick(i, meta)}
                >
                  <div className="save-slot-header">
                    <span className="save-slot-name">슬롯 {i + 1}</span>
                    <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {isCurrent && <span className="save-slot-badge">현재</span>}
                      {meta && !isCurrent && (
                        <span
                          className="save-slot-delete"
                          onClick={e => { e.stopPropagation(); setDeleteTarget(i); }}
                          title="슬롯 삭제"
                        >✕</span>
                      )}
                    </span>
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
                <div className="save-slot-io-btns">
                  {meta && (
                    <button
                      className="btn btn-small"
                      onClick={e => handleExport(e, i)}
                      title="JSON 파일로 내보내기"
                    >
                      내보내기
                    </button>
                  )}
                  <button
                    className="btn btn-small"
                    onClick={e => handleImportClick(e, i)}
                    title="JSON 파일에서 가져오기"
                  >
                    가져오기
                  </button>
                </div>
              </div>
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

        {deleteTarget !== null && (
          <div className="save-slot-confirm">
            <div className="save-slot-confirm-text">
              슬롯 {deleteTarget + 1}의 저장 데이터를 삭제하시겠습니까?
            </div>
            <div className="save-slot-confirm-actions">
              <button className="btn btn-small btn-danger" onClick={() => {
                deleteSlot(deleteTarget);
                setDeleteTarget(null);
              }}>
                삭제
              </button>
              <button className="btn btn-small" onClick={() => setDeleteTarget(null)}>
                취소
              </button>
            </div>
          </div>
        )}

        {confirmSlot === null && deleteTarget === null && (
          <button className="btn" onClick={onClose} style={{ marginTop: 16, width: '100%' }}>
            취소
          </button>
        )}
      </div>
    </div>
  );
}
