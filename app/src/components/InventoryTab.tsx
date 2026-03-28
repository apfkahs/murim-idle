/**
 * 전낭 (인벤토리) 탭 — Phase 3
 */
import { useGameStore } from '../store/gameStore';
import { getArtDef } from '../data/arts';
import { getMonsterDef } from '../data/monsters';
import { MATERIALS, RECIPES } from '../data/materials';
import { getEquipmentDef } from '../data/equipment';

export default function InventoryTab() {
  const inventory = useGameStore(s => s.inventory);
  const ownedArts = useGameStore(s => s.ownedArts);
  const materials = useGameStore(s => s.materials);
  const learnScroll = useGameStore(s => s.learnScroll);
  const discardItem = useGameStore(s => s.discardItem);
  const craft = useGameStore(s => s.craft);

  const scrollItems = inventory.filter(i => i.itemType === 'art_scroll');
  const hasMaterials = MATERIALS.some(m => (materials[m.id] ?? 0) > 0);
  const isEmpty = scrollItems.length === 0 && !hasMaterials;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span className="card-label" style={{ marginBottom: 0 }}>전낭</span>
        <span className="text-dim" style={{ fontSize: 11 }}>
          {isEmpty ? '비어 있음' : `비급 ${scrollItems.length}개${hasMaterials ? ' · 재료 보유 중' : ''}`}
        </span>
      </div>

      {/* 재료 & 제작 섹션 */}
      {hasMaterials && (
        <div style={{ marginBottom: 20 }}>
          <div className="card-label" style={{ fontSize: 12, marginBottom: 8 }}>재료</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {MATERIALS.filter(m => (materials[m.id] ?? 0) > 0).map(m => (
              <div key={m.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'var(--bg-card)', borderRadius: 6, padding: '6px 12px',
                border: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{m.name}</span>
                <span style={{ fontSize: 13, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
                  × {materials[m.id]}
                </span>
              </div>
            ))}
          </div>

          <div className="card-label" style={{ fontSize: 12, marginBottom: 8 }}>제작</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {RECIPES.map(recipe => {
              const canCraft = recipe.materialCosts.every(
                c => (materials[c.materialId] ?? 0) >= c.count
              );
              const resultDef = getEquipmentDef(recipe.resultEquipId);
              const bonusAtk = resultDef?.stats.bonusAtk;
              return (
                <div key={recipe.id} style={{
                  background: 'var(--bg-card)', borderRadius: 6, padding: '10px 12px',
                  border: `1px solid ${canCraft ? 'var(--accent)' : 'var(--border)'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div>
                      <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{recipe.name}</span>
                      {bonusAtk != null && (
                        <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 8 }}>
                          공격력 +{bonusAtk}
                        </span>
                      )}
                    </div>
                    <button
                      className={`inventory-btn${canCraft ? ' learn' : ''}`}
                      onClick={() => craft(recipe.id)}
                      disabled={!canCraft}
                      style={{ opacity: canCraft ? 1 : 0.4, cursor: canCraft ? 'pointer' : 'default' }}
                    >
                      제작
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                    {recipe.materialCosts.map(c => {
                      const mat = MATERIALS.find(m => m.id === c.materialId);
                      const have = materials[c.materialId] ?? 0;
                      return (
                        <span key={c.materialId} style={{ color: have >= c.count ? 'var(--text-secondary)' : 'var(--text-dim)' }}>
                          {mat?.name ?? c.materialId} {have}/{c.count}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 비급 목록 */}
      {isEmpty ? (
        <div className="inventory-empty">
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0' }}>
            전낭이 비어 있다.<br />
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              전장에서 획득한 비급이 이곳에 담긴다.
            </span>
          </p>
        </div>
      ) : scrollItems.length > 0 ? (
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
      ) : null}
    </div>
  );
}
