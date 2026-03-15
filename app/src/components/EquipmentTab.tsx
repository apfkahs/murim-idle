/**
 * 장비 탭 — v1.0
 * 4슬롯 장비 (무기/갑옷/장갑/신발) + 장비 인벤토리
 */
import { useGameStore } from '../store/gameStore';
import { getEquipmentDef, type EquipSlot, type EquipRarity, type EquipStats } from '../data/equipment';

const SLOT_NAMES: Record<EquipSlot, string> = {
  weapon: '무기',
  armor: '갑옷',
  gloves: '장갑',
  boots: '신발',
};

const SLOT_ORDER: EquipSlot[] = ['weapon', 'armor', 'gloves', 'boots'];

const RARITY_NAMES: Record<EquipRarity, string> = {
  common: '범용',
  refined: '정제',
  superior: '명품',
};

const RARITY_COLORS: Record<EquipRarity, string> = {
  common: 'rgba(255,255,255,0.6)',
  refined: 'rgba(120,180,255,0.9)',
  superior: 'var(--gold)',
};

function formatStats(stats: EquipStats): string {
  const parts: string[] = [];
  if (stats.bonusAtk) parts.push(`공격 +${stats.bonusAtk}`);
  if (stats.bonusHp) parts.push(`체력 +${stats.bonusHp}`);
  if (stats.bonusCritRate) parts.push(`치명 +${(stats.bonusCritRate * 100).toFixed(1)}%`);
  if (stats.bonusDodge) parts.push(`회피 +${stats.bonusDodge}%`);
  if (stats.bonusAtkSpeed) parts.push(`공속 +${stats.bonusAtkSpeed.toFixed(1)}`);
  if (stats.bonusDmgReduction) parts.push(`감소 +${(stats.bonusDmgReduction * 100).toFixed(1)}%`);
  if (stats.bonusQiMultiplier) parts.push(`기운 +${(stats.bonusQiMultiplier * 100).toFixed(0)}%`);
  return parts.join(' / ') || '효과 없음';
}

export default function EquipmentTab() {
  const equipment = useGameStore(s => s.equipment);
  const equipmentInventory = useGameStore(s => s.equipmentInventory);
  const battleMode = useGameStore(s => s.battleMode);
  const equipItem = useGameStore(s => s.equipItem);
  const unequipItem = useGameStore(s => s.unequipItem);
  const discardEquipment = useGameStore(s => s.discardEquipment);

  const battling = battleMode !== 'none';

  return (
    <div>
      {/* 헤더 */}
      <div style={{ marginBottom: 12 }}>
        <span className="card-label" style={{ marginBottom: 0 }}>장비</span>
      </div>

      {/* 장비 슬롯 그리드 */}
      <div className="equip-slot-grid">
        {SLOT_ORDER.map(slot => {
          const instance = equipment[slot];
          const def = instance ? getEquipmentDef(instance.defId) : null;

          return (
            <div key={slot} className={`card equip-slot-card ${def ? 'equip-slot-filled' : ''}`}>
              <div className="equip-slot-header">
                <span className="equip-slot-name">{SLOT_NAMES[slot]}</span>
                {instance && def && (
                  <button
                    className="btn btn-small btn-danger"
                    onClick={() => unequipItem(slot)}
                    disabled={battling}
                  >
                    해제
                  </button>
                )}
              </div>
              {instance && def ? (
                <div className="equip-slot-info">
                  <span
                    className="equip-item-name"
                    style={{ color: RARITY_COLORS[def.rarity] }}
                  >
                    {def.name}
                  </span>
                  <span className="equip-item-stats">{formatStats(def.stats)}</span>
                </div>
              ) : (
                <div className="equip-slot-empty">(빈 슬롯)</div>
              )}
            </div>
          );
        })}
      </div>

      {/* 장비 인벤토리 */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-label">보유 장비</div>

        {equipmentInventory.length === 0 ? (
          <div className="equip-inventory-empty">
            보유한 장비가 없습니다
          </div>
        ) : (
          <div className="equip-inventory-list">
            {equipmentInventory.map(instance => {
              const def = getEquipmentDef(instance.defId);
              if (!def) return null;

              return (
                <div key={instance.instanceId} className="equip-inventory-item">
                  <div className="equip-inventory-item-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        className="equip-item-name"
                        style={{ color: RARITY_COLORS[def.rarity] }}
                      >
                        {def.name}
                      </span>
                      <span
                        className="equip-rarity-badge"
                        style={{
                          color: RARITY_COLORS[def.rarity],
                          borderColor: RARITY_COLORS[def.rarity],
                        }}
                      >
                        {RARITY_NAMES[def.rarity]}
                      </span>
                    </div>
                    <span className="equip-item-stats">{formatStats(def.stats)}</span>
                    <span className="equip-item-slot">
                      {SLOT_NAMES[def.slot]}
                    </span>
                  </div>
                  <div className="equip-inventory-item-actions">
                    <button
                      className="btn btn-small btn-gold"
                      onClick={() => equipItem(instance.instanceId)}
                      disabled={battling}
                    >
                      장착
                    </button>
                    <button
                      className="btn btn-small btn-danger"
                      onClick={() => {
                        if (confirm(`${def.name}을(를) 버리시겠습니까?`)) {
                          discardEquipment(instance.instanceId);
                        }
                      }}
                      disabled={battling}
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

      {battling && (
        <div className="battle-warning">
          전투 중에는 장비를 변경할 수 없습니다
        </div>
      )}
    </div>
  );
}
