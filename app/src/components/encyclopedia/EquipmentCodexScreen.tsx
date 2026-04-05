import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { EQUIPMENT } from '../../data/equipment';

const RARITY_LABEL: Record<string, string> = {
  common: '하품', refined: '중품', superior: '명품',
};

const RARITY_COLOR: Record<string, string> = {
  common: 'var(--text-secondary)',
  refined: '#7ecfff',
  superior: '#ffd76e',
};

export default function EquipmentCodexScreen({ onBack }: { onBack: () => void }) {
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
