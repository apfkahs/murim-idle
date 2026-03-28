/**
 * 전낭 (인벤토리) 탭 — Phase 3
 */
import { useState } from 'react';
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

  const [materialInputs, setMaterialInputs] = useState<Record<string, number>>({});
  const [craftResults, setCraftResults] = useState<Record<string, 'success' | 'fail' | null>>({});

  const scrollItems = inventory.filter(i => i.itemType === 'art_scroll');
  const hasMaterials = MATERIALS.some(m => (materials[m.id] ?? 0) > 0);
  const isEmpty = scrollItems.length === 0 && !hasMaterials;

  function getInput(recipeId: string, maxUnits: number, materialId: string): number {
    const have = materials[materialId] ?? 0;
    const max = Math.min(maxUnits, have);
    const raw = materialInputs[recipeId];
    if (raw === undefined) return Math.min(1, max);
    return Math.max(1, Math.min(raw, max));
  }

  function setInput(recipeId: string, value: number) {
    setMaterialInputs(prev => ({ ...prev, [recipeId]: value }));
    setCraftResults(prev => ({ ...prev, [recipeId]: null }));
  }

  function handleCraft(recipeId: string, materialCount: number) {
    const success = craft(recipeId, materialCount);
    setCraftResults(prev => ({ ...prev, [recipeId]: success ? 'success' : 'fail' }));
  }

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
            {RECIPES.filter(recipe => (materials[recipe.materialId] ?? 0) > 0).map(recipe => {
              const have = materials[recipe.materialId] ?? 0;
              const max = Math.min(recipe.maxUnits, have);
              const inputVal = getInput(recipe.id, recipe.maxUnits, recipe.materialId);
              const prob = Math.min(inputVal * recipe.probabilityPerUnit * 100, 100);
              const canCraft = have >= inputVal && inputVal >= 1;
              const resultDef = getEquipmentDef(recipe.resultEquipId);
              const craftResult = craftResults[recipe.id];

              return (
                <div key={recipe.id} style={{
                  background: 'var(--bg-card)', borderRadius: 6, padding: '10px 12px',
                  border: `1px solid ${canCraft ? 'var(--accent)' : 'var(--border)'}`,
                }}>
                  {/* 헤더 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{recipe.name}</span>
                      {resultDef?.stats.bonusAtk != null && (
                        <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 8 }}>
                          공격력 +{resultDef.stats.bonusAtk}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 투입량 조절 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)', flex: 1 }}>
                      {MATERIALS.find(m => m.id === recipe.materialId)?.name} 투입
                    </span>
                    <button
                      style={{
                        width: 24, height: 24, borderRadius: 4, border: '1px solid var(--border)',
                        background: 'var(--bg-elevated)', color: 'var(--text-primary)',
                        cursor: inputVal > 1 ? 'pointer' : 'default',
                        opacity: inputVal > 1 ? 1 : 0.3, fontSize: 14, lineHeight: 1,
                      }}
                      onClick={() => setInput(recipe.id, inputVal - 1)}
                      disabled={inputVal <= 1}
                    >−</button>
                    <input
                      type="number"
                      min={1}
                      max={max}
                      value={inputVal}
                      onChange={e => {
                        const v = parseInt(e.target.value, 10);
                        if (!isNaN(v)) setInput(recipe.id, v);
                      }}
                      style={{
                        width: 52, textAlign: 'center', background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)', borderRadius: 4,
                        color: 'var(--text-primary)', fontSize: 13, padding: '2px 4px',
                      }}
                    />
                    <button
                      style={{
                        width: 24, height: 24, borderRadius: 4, border: '1px solid var(--border)',
                        background: 'var(--bg-elevated)', color: 'var(--text-primary)',
                        cursor: inputVal < max ? 'pointer' : 'default',
                        opacity: inputVal < max ? 1 : 0.3, fontSize: 14, lineHeight: 1,
                      }}
                      onClick={() => setInput(recipe.id, inputVal + 1)}
                      disabled={inputVal >= max}
                    >+</button>
                    <button
                      style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 11,
                        border: '1px solid var(--border)', background: 'var(--bg-elevated)',
                        color: 'var(--text-dim)', cursor: inputVal < max ? 'pointer' : 'default',
                        opacity: inputVal < max ? 1 : 0.3,
                      }}
                      onClick={() => setInput(recipe.id, max)}
                      disabled={inputVal >= max}
                    >최대</button>
                  </div>

                  {/* 확률 표시 & 제작 버튼 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: prob >= 100 ? 'var(--accent)' : 'var(--text-secondary)' }}>
                      성공 확률 {prob.toFixed(0)}%
                      <span style={{ color: 'var(--text-dim)', marginLeft: 6, fontSize: 11 }}>
                        ({inputVal}/{recipe.maxUnits}개)
                      </span>
                    </span>
                    <button
                      className={`inventory-btn${canCraft ? ' learn' : ''}`}
                      onClick={() => handleCraft(recipe.id, inputVal)}
                      disabled={!canCraft}
                      style={{ opacity: canCraft ? 1 : 0.4, cursor: canCraft ? 'pointer' : 'default' }}
                    >
                      제작
                    </button>
                  </div>

                  {/* 결과 표시 */}
                  {craftResult != null && (
                    <div style={{
                      marginTop: 6, fontSize: 12, fontWeight: 600,
                      color: craftResult === 'success' ? '#4caf50' : '#e57373',
                    }}>
                      {craftResult === 'success' ? '제작 성공!' : '제작 실패...'}
                    </div>
                  )}
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
