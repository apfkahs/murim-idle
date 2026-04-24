import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { FIELDS } from '../../data/fields';
import { EQUIPMENT } from '../../data/equipment';
import { MATERIALS, RECIPES } from '../../data/materials';
import { ARTS } from '../../data/arts';
import { ALL_MONSTERS } from './encyclopediaUtils';

const RARITY_LABEL: Record<string, string> = {
  common: '하품', refined: '중품', superior: '명품',
};

const RARITY_COLOR: Record<string, string> = {
  common: 'var(--text-secondary)',
  refined: '#7ecfff',
  superior: '#ffd76e',
};

function formatChance(chance: number): string {
  const pct = chance * 100;
  if (pct >= 1)   return `${pct.toFixed(1)}%`;
  if (pct >= 0.1) return `${pct.toFixed(1)}%`;
  return `${pct.toFixed(2)}%`;
}

export default function ItemsScreen({ onBack }: { onBack: () => void }) {
  const craftedRecipes = useGameStore(s => s.craftedRecipes);
  const obtainedMaterials = useGameStore(s => s.obtainedMaterials);
  const fieldUnlocks = useGameStore(s => s.fieldUnlocks);
  const ownedArts = useGameStore(s => s.ownedArts);
  const inventory = useGameStore(s => s.inventory);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  // 전장별 재료 + 비급 목록 구성
  const fieldItems = FIELDS
    .filter(f => f.id === 'training' || (fieldUnlocks[f.id] ?? false))
    .map(field => {
      const allFieldMonsters = [
        ...field.monsters,
        ...field.hiddenMonsters,
        ...(field.boss ? [field.boss] : []),
      ];
      const mats = MATERIALS.filter(mat =>
        allFieldMonsters.some(mId => {
          const mon = ALL_MONSTERS.find(m => m.id === mId);
          return mon?.materialDrops?.some(d => d.materialId === mat.id);
        })
      );
      const artDrops = ARTS.filter(art =>
        allFieldMonsters.some(mId => {
          const mon = ALL_MONSTERS.find(m => m.id === mId);
          return mon?.drops?.some(d => d.artId === art.id);
        })
      );
      return { field, mats, artDrops };
    })
    .filter(({ mats, artDrops }) => mats.length > 0 || artDrops.length > 0);

  return (
    <div>
      <button className="field-back-btn" style={{ marginBottom: 12 }} onClick={onBack}>← 도감으로</button>
      <div className="card-label" style={{ padding: '0 4px', marginBottom: 12 }}>물건 도감</div>

      {fieldItems.length === 0 && (
        <p style={{ color: 'var(--text-dim)', fontSize: 12, textAlign: 'center', padding: '40px 0' }}>
          아직 기록된 물건이 없다.
        </p>
      )}

      {fieldItems.map(({ field, mats, artDrops }) => {
        const fieldKey = `field-${field.id}`;
        const isFieldOpen = expanded.has(fieldKey);

        const obtainedMatsCount = mats.filter(m => obtainedMaterials.includes(m.id)).length;
        const obtainedArtsCount = artDrops.filter(art =>
          ownedArts.some(a => a.id === art.id) || inventory.some(i => i.itemType === 'art_scroll' && i.artId === art.id)
        ).length;
        const totalObtained = obtainedMatsCount + obtainedArtsCount;
        const totalItems = mats.length + artDrops.length;

        return (
          <div key={field.id} style={{ marginBottom: 12 }}>
            {/* 전장 헤더 */}
            <div
              onClick={() => toggle(fieldKey)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                cursor: 'pointer', padding: '6px 4px', borderBottom: '1px solid var(--border)',
                marginBottom: isFieldOpen ? 8 : 0,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                {field.name}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                {totalObtained}/{totalItems} 발견 {isFieldOpen ? '▲' : '▼'}
              </span>
            </div>

            {/* 전장 내 아이템 목록 */}
            {isFieldOpen && (
              <div style={{ paddingLeft: 4 }}>
                {/* 재료 목록 */}
                {mats.map(mat => {
                  const isObtained = obtainedMaterials.includes(mat.id);
                  if (!isObtained) {
                    return (
                      <div key={mat.id} style={{
                        padding: '7px 12px', marginBottom: 6,
                        background: 'var(--bg-card)', borderRadius: 6,
                        border: '1px solid var(--border)',
                        color: 'var(--text-dim)', fontSize: 12, fontStyle: 'italic',
                      }}>
                        ???
                      </div>
                    );
                  }

                  const matKey = `mat-${field.id}-${mat.id}`;
                  const isOpen = expanded.has(matKey);
                  const dropSources = ALL_MONSTERS
                    .filter(m =>
                      field.monsters.concat(field.hiddenMonsters, field.boss ? [field.boss] : []).includes(m.id)
                      && m.materialDrops?.some(d => d.materialId === mat.id)
                    )
                    .map(m => ({ monster: m, chance: m.materialDrops!.find(d => d.materialId === mat.id)!.chance }));
                  const relatedRecipes = RECIPES.filter(r => r.materialId === mat.id);

                  return (
                    <div key={mat.id} className="card" style={{ marginBottom: 6 }}>
                      <div
                        onClick={() => toggle(matKey)}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                      >
                        <div>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{mat.name}</span>
                          {!isOpen && (
                            <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 8 }}>
                              제작법 {relatedRecipes.length}종
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-dim)', userSelect: 'none' }}>
                          {isOpen ? '▲' : '▼'}
                        </span>
                      </div>

                      {isOpen && (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 10, fontStyle: 'italic' }}>
                            {mat.description}
                          </div>
                          {dropSources.length > 0 && (
                            <div style={{ marginBottom: 10 }}>
                              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>드롭처</div>
                              {dropSources.map(({ monster, chance }) => (
                                <div key={monster.id} style={{
                                  display: 'flex', justifyContent: 'space-between',
                                  fontSize: 12, color: 'var(--text-primary)',
                                  padding: '3px 0', borderBottom: '1px solid var(--border)',
                                }}>
                                  <span>{monster.name}</span>
                                  <span style={{ color: 'var(--text-dim)' }}>{formatChance(chance)} 확률</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {relatedRecipes.length > 0 && (
                            <div>
                              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>제작 가능</div>
                              {relatedRecipes.map(recipe => {
                                const known = craftedRecipes.includes(recipe.id);
                                const resultDef = known ? EQUIPMENT.find(e => e.id === recipe.resultEquipId) : null;
                                return (
                                  <div key={recipe.id} style={{
                                    background: 'var(--bg-elevated)', borderRadius: 6,
                                    padding: '7px 10px', marginBottom: 6, border: '1px solid var(--border)',
                                  }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontSize: 12, fontWeight: 500 }}>
                                        {mat.name} 1~{recipe.maxUnits}개 →{' '}
                                        <span style={{ color: known ? 'var(--text-primary)' : 'var(--text-dim)' }}>
                                          {known ? recipe.name : '???'}
                                        </span>
                                      </span>
                                      {known && resultDef?.stats.bonusAtk != null && (
                                        <span style={{ fontSize: 11, color: 'var(--accent)' }}>공격력 +{resultDef.stats.bonusAtk}</span>
                                      )}
                                      {!known && <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>???</span>}
                                    </div>
                                    {known && (
                                      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3 }}>
                                        {recipe.description}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* 비급 목록 */}
                {artDrops.length > 0 && (
                  <div style={{ marginTop: mats.length > 0 ? 8 : 0 }}>
                    {mats.length > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6, paddingLeft: 2 }}>
                        비급(祕笈)
                      </div>
                    )}
                    {artDrops.map(art => {
                      const isArtObtained = ownedArts.some(a => a.id === art.id)
                        || inventory.some(i => i.itemType === 'art_scroll' && i.artId === art.id);

                      if (!isArtObtained) {
                        return (
                          <div key={art.id} style={{
                            padding: '7px 12px', marginBottom: 6,
                            background: 'var(--bg-card)', borderRadius: 6,
                            border: '1px solid var(--border)',
                            color: 'var(--text-dim)', fontSize: 12, fontStyle: 'italic',
                          }}>
                            ???
                          </div>
                        );
                      }

                      const artKey = `art-${field.id}-${art.id}`;
                      const isOpen = expanded.has(artKey);
                      const artDropSources = ALL_MONSTERS
                        .filter(m =>
                          field.monsters.concat(field.hiddenMonsters, field.boss ? [field.boss] : []).includes(m.id)
                          && m.drops?.some(d => d.artId === art.id)
                        )
                        .map(m => ({ monster: m, chance: m.drops!.find(d => d.artId === art.id)!.chance }));

                      return (
                        <div key={art.id} className="card" style={{ marginBottom: 6 }}>
                          <div
                            onClick={() => toggle(artKey)}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                          >
                            <div>
                              <span style={{ fontWeight: 600, fontSize: 13 }}>{art.name}</span>
                              <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 8 }}>비급(祕笈)</span>
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--text-dim)', userSelect: 'none' }}>
                              {isOpen ? '▲' : '▼'}
                            </span>
                          </div>

                          {isOpen && (
                            <div style={{ marginTop: 10 }}>
                              {(art as any).descriptionByStage?.[0] && (
                                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 10, fontStyle: 'italic' }}>
                                  {(art as any).descriptionByStage[0]}
                                </div>
                              )}
                              {artDropSources.length > 0 && (
                                <div>
                                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>드롭처</div>
                                  {artDropSources.map(({ monster, chance }) => (
                                    <div key={monster.id} style={{
                                      display: 'flex', justifyContent: 'space-between',
                                      fontSize: 12, color: 'var(--text-primary)',
                                      padding: '3px 0', borderBottom: '1px solid var(--border)',
                                    }}>
                                      <span>{monster.name}</span>
                                      <span style={{ color: 'var(--text-dim)' }}>{formatChance(chance)} 확률</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
