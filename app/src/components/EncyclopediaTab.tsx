/**
 * 도감 탭 — 몬스터 도감 + 업적
 */
import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { FIELDS } from '../data/fields';
import {
  TRAINING_MONSTERS, YASAN_MONSTERS, HIDDEN_MONSTERS, YASAN_BOSS,
  INN_MONSTERS, INN_HIDDEN_MONSTERS, INN_BOSS,
  getMonsterDef, getGradeName,
} from '../data/monsters';
import { ARTS } from '../data/arts';
import { EQUIPMENT } from '../data/equipment';
import { MATERIALS, RECIPES } from '../data/materials';
import { getEnemyImage, getEnemyEmoji } from '../assets/index';
import AchievementTab from './AchievementTab';

// 전체 몬스터 풀
const ALL_MONSTERS = [
  ...TRAINING_MONSTERS, ...YASAN_MONSTERS, ...HIDDEN_MONSTERS, YASAN_BOSS,
  ...INN_MONSTERS, ...INN_HIDDEN_MONSTERS, INN_BOSS,
];

type EncScreen =
  | { view: 'home' }
  | { view: 'monster_fields' }
  | { view: 'monster_list'; fieldId: string }
  | { view: 'monster_detail'; monsterId: string; fieldId: string }
  | { view: 'achievements' }
  | { view: 'items' }
  | { view: 'equipment_codex' };

/** 처치 수에 따른 도감 해금 단계 */
function getDocRevealLevel(killCount: number): number {
  if (killCount >= 1000) return 6; // 드랍 확률 공개
  if (killCount >= 300)  return 5; // 드랍 아이템명+종류 공개
  if (killCount >= 100)  return 4; // 스탯 공개
  if (killCount >= 50)   return 3; // 등급 공개
  if (killCount >= 10)   return 2; // 설명 공개
  if (killCount >= 1)    return 1; // 이름+이미지 공개
  return 0;
}

/** 다음 해금까지 필요한 처치 수 */
function getNextThreshold(killCount: number): number | null {
  if (killCount < 1)    return 1;
  if (killCount < 10)   return 10;
  if (killCount < 50)   return 50;
  if (killCount < 100)  return 100;
  if (killCount < 300)  return 300;
  if (killCount < 1000) return 1000;
  return null;
}

export default function EncyclopediaTab() {
  const killCounts = useGameStore(s => s.killCounts);
  const bossKillCounts = useGameStore(s => s.bossKillCounts);
  const fieldUnlocks = useGameStore(s => s.fieldUnlocks);

  const [screen, setScreen] = useState<EncScreen>({ view: 'home' });

  if (screen.view === 'home') {
    return (
      <HomeScreen
        onMonsters={() => setScreen({ view: 'monster_fields' })}
        onAchievements={() => setScreen({ view: 'achievements' })}
        onItems={() => setScreen({ view: 'items' })}
        onEquipment={() => setScreen({ view: 'equipment_codex' })}
      />
    );
  }
  if (screen.view === 'items') {
    return <ItemsScreen onBack={() => setScreen({ view: 'home' })} />;
  }
  if (screen.view === 'equipment_codex') {
    return <EquipmentCodexScreen onBack={() => setScreen({ view: 'home' })} />;
  }
  if (screen.view === 'monster_fields') {
    return (
      <FieldListScreen
        killCounts={killCounts}
        bossKillCounts={bossKillCounts}
        fieldUnlocks={fieldUnlocks}
        onBack={() => setScreen({ view: 'home' })}
        onSelect={(fieldId) => setScreen({ view: 'monster_list', fieldId })}
      />
    );
  }
  if (screen.view === 'monster_list') {
    return (
      <MonsterListScreen
        fieldId={screen.fieldId}
        killCounts={killCounts}
        bossKillCounts={bossKillCounts}
        onBack={() => setScreen({ view: 'monster_fields' })}
        onSelect={(id) => setScreen({ view: 'monster_detail', monsterId: id, fieldId: screen.fieldId })}
      />
    );
  }
  if (screen.view === 'monster_detail') {
    return (
      <MonsterDetailScreen
        monsterId={screen.monsterId}
        killCounts={killCounts}
        bossKillCounts={bossKillCounts}
        onBack={() => setScreen({ view: 'monster_list', fieldId: screen.fieldId })}
      />
    );
  }
  if (screen.view === 'achievements') {
    return (
      <div>
        <button className="field-back-btn" style={{ marginBottom: 12 }} onClick={() => setScreen({ view: 'home' })}>← 도감으로</button>
        <AchievementTab />
      </div>
    );
  }
  return null;
}

// ── HomeScreen ──────────────────────────────────────────────────────────────

function HomeScreen({ onMonsters, onAchievements, onItems, onEquipment }: {
  onMonsters: () => void;
  onAchievements: () => void;
  onItems: () => void;
  onEquipment: () => void;
}) {
  return (
    <div>
      <div className="card-label" style={{ padding: '0 4px', marginBottom: 8 }}>도감</div>
      <div className="card field-card" onClick={onMonsters}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontWeight: 500, fontSize: 13 }}>몬스터 도감</span>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>처치한 몬스터의 정보를 기록</div>
          </div>
          <span style={{ fontSize: 14, opacity: 0.3 }}>→</span>
        </div>
      </div>
      <div className="card field-card" onClick={onItems}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontWeight: 500, fontSize: 13 }}>물건 도감</span>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>전장별 드롭 재료와 제작법</div>
          </div>
          <span style={{ fontSize: 14, opacity: 0.3 }}>→</span>
        </div>
      </div>
      <div className="card field-card" onClick={onEquipment}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontWeight: 500, fontSize: 13 }}>장비 도감</span>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>획득·제작한 장비 목록</div>
          </div>
          <span style={{ fontSize: 14, opacity: 0.3 }}>→</span>
        </div>
      </div>
      <div className="card field-card" onClick={onAchievements}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontWeight: 500, fontSize: 13 }}>업적</span>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>강호에서 이룬 발자취</div>
          </div>
          <span style={{ fontSize: 14, opacity: 0.3 }}>→</span>
        </div>
      </div>
    </div>
  );
}

// ── ItemsScreen (물건 도감 — 전장별 분류) ────────────────────────────────────

const SLOT_LABEL: Record<string, string> = {
  weapon: '무기', armor: '갑옷', gloves: '장갑', boots: '신발',
};

const RARITY_LABEL: Record<string, string> = {
  common: '하품', refined: '중품', superior: '명품',
};

const RARITY_COLOR: Record<string, string> = {
  common: 'var(--text-secondary)',
  refined: '#7ecfff',
  superior: '#ffd76e',
};

function ItemsScreen({ onBack }: { onBack: () => void }) {
  const craftedRecipes = useGameStore(s => s.craftedRecipes);
  const obtainedMaterials = useGameStore(s => s.obtainedMaterials);
  const fieldUnlocks = useGameStore(s => s.fieldUnlocks);

  // 전장별로 확장된 key: `field-${fieldId}` 또는 `mat-${fieldId}-${matId}`
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  // 전장별 재료 목록 구성
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
      return { field, mats };
    })
    .filter(({ mats }) => mats.length > 0);

  return (
    <div>
      <button className="field-back-btn" style={{ marginBottom: 12 }} onClick={onBack}>← 도감으로</button>
      <div className="card-label" style={{ padding: '0 4px', marginBottom: 12 }}>물건 도감</div>

      {fieldItems.length === 0 && (
        <p style={{ color: 'var(--text-dim)', fontSize: 12, textAlign: 'center', padding: '40px 0' }}>
          아직 기록된 물건이 없다.
        </p>
      )}

      {fieldItems.map(({ field, mats }) => {
        const fieldKey = `field-${field.id}`;
        const isFieldOpen = expanded.has(fieldKey);
        const obtainedInField = mats.filter(m => obtainedMaterials.includes(m.id));

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
                {obtainedInField.length}/{mats.length} 발견 {isFieldOpen ? '▲' : '▼'}
              </span>
            </div>

            {/* 전장 내 재료 목록 */}
            {isFieldOpen && (
              <div style={{ paddingLeft: 4 }}>
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
                                  <span style={{ color: 'var(--text-dim)' }}>{Math.round(chance * 100)}% 확률</span>
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
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── EquipmentCodexScreen (장비 도감) ─────────────────────────────────────────

function EquipmentCodexScreen({ onBack }: { onBack: () => void }) {
  const knownEquipment = useGameStore(s => s.knownEquipment);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const SLOTS: { id: string; label: string }[] = [
    { id: 'weapon', label: '무기' },
    { id: 'armor', label: '갑옷' },
    { id: 'gloves', label: '장갑' },
    { id: 'boots', label: '신발' },
  ];

  const anyKnown = knownEquipment.length > 0;

  return (
    <div>
      <button className="field-back-btn" style={{ marginBottom: 12 }} onClick={onBack}>← 도감으로</button>
      <div className="card-label" style={{ padding: '0 4px', marginBottom: 12 }}>장비 도감</div>

      {!anyKnown && (
        <p style={{ color: 'var(--text-dim)', fontSize: 12, textAlign: 'center', padding: '40px 0' }}>
          아직 기록된 장비가 없다.
        </p>
      )}

      {SLOTS.map(slot => {
        const slotEquipment = EQUIPMENT.filter(
          e => e.slot === slot.id && knownEquipment.includes(e.id)
        );
        if (slotEquipment.length === 0) return null;

        const slotKey = `slot-${slot.id}`;
        const isOpen = expanded.has(slotKey);

        return (
          <div key={slot.id} style={{ marginBottom: 12 }}>
            {/* 슬롯 헤더 */}
            <div
              onClick={() => toggle(slotKey)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                cursor: 'pointer', padding: '6px 4px', borderBottom: '1px solid var(--border)',
                marginBottom: isOpen ? 8 : 0,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                {slot.label}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                {slotEquipment.length}종 {isOpen ? '▲' : '▼'}
              </span>
            </div>

            {/* 장비 목록 */}
            {isOpen && (
              <div style={{ paddingLeft: 4 }}>
                {slotEquipment.map(eq => {
                  const eqKey = `eq-${eq.id}`;
                  const isEqOpen = expanded.has(eqKey);
                  const statParts: string[] = [];
                  if (eq.stats.bonusAtk) statParts.push(`공격력 +${eq.stats.bonusAtk}`);
                  if (eq.stats.bonusHp) statParts.push(`체력 +${eq.stats.bonusHp}`);
                  if (eq.stats.bonusCritRate) statParts.push(`치명률 +${(eq.stats.bonusCritRate * 100).toFixed(0)}%`);
                  if (eq.stats.bonusDodge) statParts.push(`회피 +${eq.stats.bonusDodge}`);
                  if (eq.stats.bonusAtkSpeed) statParts.push(`공속 +${eq.stats.bonusAtkSpeed.toFixed(1)}초`);
                  if (eq.stats.bonusDmgReduction) statParts.push(`감소 +${eq.stats.bonusDmgReduction}`);
                  if (eq.stats.bonusQiMultiplier) statParts.push(`기운 +${(eq.stats.bonusQiMultiplier * 100).toFixed(0)}%`);

                  return (
                    <div key={eq.id} className="card" style={{ marginBottom: 6 }}>
                      <div
                        onClick={() => toggle(eqKey)}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                      >
                        <div>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{eq.name}</span>
                          <span style={{ fontSize: 11, color: RARITY_COLOR[eq.rarity] ?? 'var(--text-dim)', marginLeft: 8 }}>
                            {RARITY_LABEL[eq.rarity] ?? eq.rarity}
                          </span>
                          {!isEqOpen && statParts.length > 0 && (
                            <span style={{ fontSize: 11, color: 'var(--accent)', marginLeft: 8 }}>
                              {statParts[0]}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-dim)', userSelect: 'none' }}>
                          {isEqOpen ? '▲' : '▼'}
                        </span>
                      </div>
                      {isEqOpen && (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 6 }}>
                            {statParts.join('  ')}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-dim)', fontStyle: 'italic' }}>
                            {eq.description}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── FieldListScreen ─────────────────────────────────────────────────────────

function FieldListScreen({ killCounts, bossKillCounts, fieldUnlocks, onBack, onSelect }: {
  killCounts: Record<string, number>;
  bossKillCounts: Record<string, number>;
  fieldUnlocks: Record<string, boolean>;
  onBack: () => void;
  onSelect: (fieldId: string) => void;
}) {
  // 해금된 전장만 표시
  const unlockedFields = FIELDS.filter(f => {
    if (f.id === 'training') return true;
    return fieldUnlocks[f.id] ?? false;
  });

  return (
    <div>
      <div className="field-detail-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="field-back-btn" onClick={onBack}>←</button>
          <div style={{ fontWeight: 500, fontSize: 14 }}>전장 선택</div>
        </div>
      </div>

      {unlockedFields.map(field => {
        const allIds = [...field.monsters, ...(field.boss ? [field.boss] : [])];
        const encountered = allIds.filter(id => (killCounts[id] ?? 0) + (bossKillCounts[id] ?? 0) >= 1).length;
        const hiddenEncountered = field.hiddenMonsters.filter(id => (killCounts[id] ?? 0) >= 1).length;
        const totalVisible = allIds.length + hiddenEncountered;
        const encTotal = encountered + hiddenEncountered;

        return (
          <div
            key={field.id}
            className="card field-card"
            onClick={() => onSelect(field.id)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{field.name}</span>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                  {encTotal} / {totalVisible} 조우
                </div>
              </div>
              <span style={{ fontSize: 14, opacity: 0.3 }}>→</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── MonsterListScreen ───────────────────────────────────────────────────────

function MonsterListScreen({ fieldId, killCounts, bossKillCounts, onBack, onSelect }: {
  fieldId: string;
  killCounts: Record<string, number>;
  bossKillCounts: Record<string, number>;
  onBack: () => void;
  onSelect: (monsterId: string) => void;
}) {
  const field = FIELDS.find(f => f.id === fieldId);
  if (!field) return null;

  const allIds = [
    ...field.monsters,
    ...field.hiddenMonsters,
    ...(field.boss ? [field.boss] : []),
  ];

  return (
    <div>
      <div className="field-detail-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="field-back-btn" onClick={onBack}>←</button>
          <div style={{ fontWeight: 500, fontSize: 14 }}>{field.name}</div>
        </div>
      </div>

      <div className="card">
        {allIds.map((id, idx) => {
          const mon = getMonsterDef(id);
          if (!mon) return null;
          const kc = mon.isBoss ? (bossKillCounts[id] ?? 0) : (killCounts[id] ?? 0);

          // 히든 몬스터 미조우 시 미표시
          if (mon.isHidden && kc === 0) return null;

          const reveal = getDocRevealLevel(kc);
          const isFirst = idx === 0;

          return (
            <div
              key={id}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0',
                borderTop: isFirst ? 'none' : '1px solid rgba(255,255,255,0.05)',
                cursor: reveal >= 1 ? 'pointer' : 'default',
                opacity: reveal >= 1 ? 1 : 0.5,
              }}
              onClick={() => reveal >= 1 && onSelect(id)}
            >
              <span style={{ fontSize: 13 }}>
                {reveal >= 1 ? mon.name : '???'}
                {mon.isBoss && (
                  <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--accent-gold)', border: '1px solid var(--accent-gold)', borderRadius: 3, padding: '1px 4px' }}>보스</span>
                )}
                {mon.isHidden && (
                  <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-dim)', border: '1px solid var(--border-card)', borderRadius: 3, padding: '1px 4px' }}>은신</span>
                )}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                {reveal >= 1 ? `${kc}마리` : '미조우'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MonsterDetailScreen ─────────────────────────────────────────────────────

function MonsterDetailScreen({ monsterId, killCounts, bossKillCounts, onBack }: {
  monsterId: string;
  killCounts: Record<string, number>;
  bossKillCounts: Record<string, number>;
  onBack: () => void;
}) {
  const mon = getMonsterDef(monsterId);
  if (!mon) return null;

  const kc = mon.isBoss ? (bossKillCounts[monsterId] ?? 0) : (killCounts[monsterId] ?? 0);
  const reveal = getDocRevealLevel(kc);
  const nextThreshold = getNextThreshold(kc);

  const imgUrl = getEnemyImage(mon.imageKey);
  const emoji = getEnemyEmoji(mon.imageKey);

  // 드랍 아이템 목록
  const drops: { name: string; type: string; chance: number }[] = [
    ...mon.drops.map(d => {
      const art = ARTS.find(a => a.id === d.artId);
      return { name: art?.name ?? d.artId, type: '무공서', chance: d.chance };
    }),
    ...(mon.equipDrops ?? []).map(d => {
      const equip = EQUIPMENT.find(e => e.id === d.equipId);
      return { name: equip?.name ?? d.equipId, type: '장비', chance: d.chance };
    }),
  ];

  const QM = <span style={{ color: 'var(--text-dim)', letterSpacing: 1 }}>???</span>;

  return (
    <div>
      <div className="field-detail-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="field-back-btn" onClick={onBack}>←</button>
          <div style={{ fontWeight: 500, fontSize: 14 }}>
            {mon.name}
            {mon.isBoss && (
              <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--accent-gold)', border: '1px solid var(--accent-gold)', borderRadius: 3, padding: '1px 4px' }}>보스</span>
            )}
            {mon.isHidden && (
              <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-dim)', border: '1px solid var(--border-card)', borderRadius: 3, padding: '1px 4px' }}>은신</span>
            )}
          </div>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>처치 {kc}마리</span>
      </div>

      {/* 이미지 + 설명 + 스탯 */}
      <div className="card">
        <div style={{ display: 'flex', gap: 14 }}>
          {/* 이미지 */}
          <div style={{ flexShrink: 0, width: 84, height: 84, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-deep)', borderRadius: 8, overflow: 'hidden' }}>
            {imgUrl
              ? <img src={imgUrl} alt={mon.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : <span style={{ fontSize: 44 }}>{emoji}</span>}
          </div>

          {/* 설명 + 스탯 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* 설명 */}
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-dim)', fontStyle: 'italic', lineHeight: 1.7 }}>
              {reveal >= 2 ? (mon.description ?? '기록된 설명이 없다.') : QM}
            </p>

            {/* 등급 */}
            <div style={{ fontSize: 12 }}>
              <span style={{ color: 'var(--text-dim)' }}>등급</span>{' '}
              {reveal >= 3
                ? <span style={{ color: 'var(--accent-gold)' }}>{getGradeName(mon.grade)}</span>
                : QM}
            </div>
          </div>
        </div>

        {/* 스탯 (100마리 이상) */}
        {reveal >= 4 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 20px', fontSize: 12, marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <StatItem label="생명" value={mon.hp} />
            <StatItem label="공격" value={mon.attackPower} />
            {mon.attackInterval > 0 && <StatItem label="공속" value={`${mon.attackInterval}초`} />}
            {mon.regen > 0 && <StatItem label="회복" value={`${mon.regen}/초`} />}
            {(mon.baseProficiency ?? 0) > 0 && <StatItem label="숙련도" value={mon.baseProficiency!} />}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            생명 {QM}　공격 {QM}　숙련도 {QM}
          </div>
        )}
      </div>

      {/* 드랍 아이템 */}
      <div className="card">
        <div className="card-label">드랍 아이템</div>
        {drops.length === 0 ? (
          <p style={{ color: 'var(--text-dim)', fontSize: 12, margin: 0 }}>드랍 아이템 없음</p>
        ) : reveal < 5 ? (
          <p style={{ color: 'var(--text-dim)', fontSize: 12, margin: 0, letterSpacing: 1 }}>???</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ color: 'var(--text-dim)', textAlign: 'left' }}>
                <th style={{ paddingBottom: 6, fontWeight: 400 }}>이름</th>
                <th style={{ paddingBottom: 6, fontWeight: 400 }}>종류</th>
                <th style={{ paddingBottom: 6, fontWeight: 400, textAlign: 'right' }}>확률</th>
              </tr>
            </thead>
            <tbody>
              {drops.map((d, i) => (
                <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '6px 0' }}>{d.name}</td>
                  <td style={{ padding: '6px 0', color: 'var(--text-dim)' }}>{d.type}</td>
                  <td style={{ padding: '6px 0', textAlign: 'right' }}>
                    {reveal >= 6 ? `${(d.chance * 100).toFixed(0)}%` : QM}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 해금 진행도 */}
      {nextThreshold !== null ? (
        <div className="card" style={{ fontSize: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-dim)', marginBottom: 6 }}>
            <span>다음 해금</span>
            <span>{kc} / {nextThreshold}마리</span>
          </div>
          <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--accent-gold)', width: `${Math.min(100, (kc / nextThreshold) * 100)}%`, borderRadius: 2 }} />
          </div>
        </div>
      ) : (
        <div className="card" style={{ fontSize: 12, textAlign: 'center', color: 'var(--accent-gold)', letterSpacing: 2 }}>
          도감 완성
        </div>
      )}
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <span>
      <span style={{ color: 'var(--text-dim)' }}>{label}</span>{' '}
      <span style={{ color: 'var(--text-primary)' }}>{value}</span>
    </span>
  );
}
