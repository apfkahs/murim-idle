/**
 * 전낭 (인벤토리) 탭 — Phase 3
 */
import { useGameStore } from '../store/gameStore';
import { getArtDef } from '../data/arts';
import { getMonsterDef } from '../data/monsters';

export default function InventoryTab() {
  const inventory = useGameStore(s => s.inventory);
  const ownedArts = useGameStore(s => s.ownedArts);
  const learnScroll = useGameStore(s => s.learnScroll);
  const discardItem = useGameStore(s => s.discardItem);

  const scrollItems = inventory.filter(i => i.itemType === 'art_scroll');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span className="card-label" style={{ marginBottom: 0 }}>전낭</span>
        <span className="text-dim" style={{ fontSize: 11 }}>
          {inventory.length === 0 ? '비어 있음' : `${inventory.length}개 보관 중`}
        </span>
      </div>

      {inventory.length === 0 ? (
        <div className="inventory-empty">
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0' }}>
            전낭이 비어 있다.<br />
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              전장에서 획득한 비급이 이곳에 담긴다.
            </span>
          </p>
        </div>
      ) : (
        <div className="inventory-list">
          {scrollItems.map(item => {
            const artDef = item.artId ? getArtDef(item.artId) : null;
            const monDef = getMonsterDef(item.obtainedFrom);
            const alreadyOwned = item.artId ? ownedArts.some(a => a.id === item.artId) : false;

            return (
              <div key={item.id} className="inventory-item">
                <div className="inventory-item-info">
                  <span className="inventory-item-name">
                    {artDef ? `${artDef.name} 비급` : '알 수 없는 물건'}
                  </span>
                  <span className="inventory-item-origin">
                    {monDef ? `${monDef.name}에게서 획득` : '출처 불명'}
                  </span>
                </div>
                <div className="inventory-item-actions">
                  {item.itemType === 'art_scroll' && !alreadyOwned && (
                    <button
                      className="inventory-btn learn"
                      onClick={() => learnScroll(item.id)}
                    >
                      습득
                    </button>
                  )}
                  {alreadyOwned && (
                    <span className="inventory-owned-label">이미 습득</span>
                  )}
                  <button
                    className="inventory-btn discard"
                    onClick={() => discardItem(item.id)}
                  >
                    버리기
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
