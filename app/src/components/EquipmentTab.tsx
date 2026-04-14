/**
 * 장비 탭 — v1.1
 * 4슬롯 장비 (무기/갑옷/장갑/신발) + 장비 인벤토리 + 강화 시스템
 */
import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { getEquipmentDef, type EquipSlot, type EquipRarity, type EquipStats, type EquipmentInstance } from '../data/equipment';
import { MATERIALS } from '../data/materials';

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

const ENHANCE_COLORS = ['', 'rgba(120,200,120,0.9)', 'rgba(100,160,255,0.9)', 'var(--gold)'];

function formatStats(stats: EquipStats): string {
  const parts: string[] = [];
  if (stats.bonusAtk) parts.push(`공격 +${stats.bonusAtk}`);
  if (stats.bonusFixedDmgReduction) parts.push(`고정피해감소 +${stats.bonusFixedDmgReduction}`);
  if (stats.bonusHp) parts.push(`체력 +${stats.bonusHp}`);
  if (stats.bonusCritRate) parts.push(`치명 +${(stats.bonusCritRate * 100).toFixed(1)}%`);
  if (stats.bonusDodge) parts.push(`회피 +${stats.bonusDodge}%`);
  if (stats.bonusAtkSpeed) parts.push(`공속 +${stats.bonusAtkSpeed.toFixed(1)}`);
  if (stats.bonusDmgReduction) parts.push(`감소 +${(stats.bonusDmgReduction * 100).toFixed(1)}%`);
  if (stats.bonusQiMultiplier) parts.push(`기운 +${(stats.bonusQiMultiplier * 100).toFixed(0)}%`);
  if (stats.bonusCritDmgPercent) parts.push(`치명피해 +${(stats.bonusCritDmgPercent * 100).toFixed(0)}%`);
  if (stats.bonusDmgTakenPercent) parts.push(`받는피해 +${(stats.bonusDmgTakenPercent * 100).toFixed(0)}%`);
  if (stats.bonusHpPercent) parts.push(`최대HP +${(stats.bonusHpPercent * 100).toFixed(0)}%`);
  return parts.join(' / ') || '효과 없음';
}

function getEffectiveStats(instance: EquipmentInstance): EquipStats {
  const def = getEquipmentDef(instance.defId);
  if (!def) return {};
  const level = instance.enhanceLevel ?? 0;
  if (level > 0 && def.enhanceSteps && def.enhanceSteps[level - 1]) {
    return def.enhanceSteps[level - 1].stats;
  }
  return def.stats;
}

function getEnhanceName(instance: EquipmentInstance): string {
  const def = getEquipmentDef(instance.defId);
  if (!def) return '';
  const level = instance.enhanceLevel ?? 0;
  return level > 0 ? `${def.name} +${level}` : def.name;
}

function getKillCountInfo(instance: EquipmentInstance) {
  const def = getEquipmentDef(instance.defId);
  if (!def?.killCountGrowth) return null;
  const kc = instance.killCount ?? 0;
  const g = def.killCountGrowth;
  const bonusDmg = Math.floor(kc / g.damageGainPerKills);
  const bonusStacks = Math.floor(kc / g.stackGainPerKills);
  return {
    killCount: kc,
    maxKillCount: g.maxKillCount,
    currentDotDamage: g.baseDotDamage + bonusDmg,
    currentMaxStacks: g.maxDotStacks + bonusStacks,
    dotChance: g.dotChance,
    dotDuration: g.dotDuration,
  };
}

function EnhancePanel({ instance }: { instance: EquipmentInstance }) {
  const materials = useGameStore(s => s.materials);
  const enhanceEquipment = useGameStore(s => s.enhanceEquipment);
  const [inputCount, setInputCount] = useState(1);
  const [result, setResult] = useState<'success' | 'fail' | null>(null);

  const def = getEquipmentDef(instance.defId);
  if (!def?.enhanceable || !def.enhanceSteps || !def.enhanceMaterialId) return null;

  const currentLevel = instance.enhanceLevel ?? 0;
  if (currentLevel >= def.enhanceSteps.length) {
    return <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 6 }}>최대 강화 달성</div>;
  }

  const step = def.enhanceSteps[currentLevel];
  const have = materials[def.enhanceMaterialId] ?? 0;
  const max = Math.min(step.maxUnits, have);
  const count = Math.max(1, Math.min(inputCount, max));
  const chance = Math.min(count * step.probabilityPerUnit, step.maxChance);
  const matName = MATERIALS.find(m => m.id === def.enhanceMaterialId)?.name ?? def.enhanceMaterialId;

  function handleEnhance() {
    const success = enhanceEquipment(instance.instanceId, count);
    setResult(success ? 'success' : 'fail');
  }

  return (
    <div style={{
      marginTop: 8, padding: '8px 10px', background: 'var(--bg-elevated)',
      borderRadius: 6, border: '1px solid var(--border)',
    }}>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
        강화 +{currentLevel} → +{currentLevel + 1}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>
        재료: {matName} (보유 {have}개)
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6 }}>
        성공 시: {formatStats(step.stats)}
      </div>
      {have > 0 ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>투입량</span>
            <button
              style={{
                width: 24, height: 24, borderRadius: 4, border: '1px solid var(--border)',
                background: 'var(--bg-elevated)', color: 'var(--text-primary)',
                cursor: count > 1 ? 'pointer' : 'default',
                opacity: count > 1 ? 1 : 0.3, fontSize: 14, lineHeight: 1,
              }}
              onClick={() => { setInputCount(count - 1); setResult(null); }}
              disabled={count <= 1}
            >−</button>
            <input
              type="number"
              min={1}
              max={max}
              value={count}
              onChange={e => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v)) { setInputCount(v); setResult(null); }
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
                cursor: count < max ? 'pointer' : 'default',
                opacity: count < max ? 1 : 0.3, fontSize: 14, lineHeight: 1,
              }}
              onClick={() => { setInputCount(count + 1); setResult(null); }}
              disabled={count >= max}
            >+</button>
            <span style={{ fontSize: 12, color: 'var(--accent)', marginLeft: 'auto' }}>
              성공률 {(chance * 100).toFixed(0)}%
            </span>
          </div>
          <button
            className="btn btn-small btn-gold"
            onClick={handleEnhance}
            style={{ width: '100%' }}
          >
            강화 ({matName} {count}개 사용)
          </button>
          {result && (
            <div style={{
              marginTop: 4, fontSize: 12, textAlign: 'center',
              color: result === 'success' ? 'var(--gold)' : 'var(--hp-color)',
            }}>
              {result === 'success' ? '강화 성공!' : '강화 실패... 재료가 소모되었습니다.'}
            </div>
          )}
        </>
      ) : (
        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>재료가 부족합니다</div>
      )}
    </div>
  );
}

export default function EquipmentTab() {
  const equipment = useGameStore(s => s.equipment);
  const equipmentInventory = useGameStore(s => s.equipmentInventory);
  const battleMode = useGameStore(s => s.battleMode);
  const equipItem = useGameStore(s => s.equipItem);
  const unequipItem = useGameStore(s => s.unequipItem);
  const discardEquipment = useGameStore(s => s.discardEquipment);
  const [enhancingId, setEnhancingId] = useState<string | null>(null);

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
          const enhanceLevel = instance?.enhanceLevel ?? 0;
          const kcInfo = instance ? getKillCountInfo(instance) : null;

          return (
            <div key={slot} className={`card equip-slot-card ${def ? 'equip-slot-filled' : ''}`}>
              <div className="equip-slot-header">
                <span className="equip-slot-name">{SLOT_NAMES[slot]}</span>
                {instance && def && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    {def.enhanceable && (
                      <button
                        className="btn btn-small"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--accent)', border: '1px solid var(--accent)', fontSize: 11 }}
                        onClick={() => setEnhancingId(enhancingId === instance.instanceId ? null : instance.instanceId)}
                        disabled={battling}
                      >
                        강화
                      </button>
                    )}
                    <button
                      className="btn btn-small btn-danger"
                      onClick={() => unequipItem(slot)}
                      disabled={battling}
                    >
                      해제
                    </button>
                  </div>
                )}
              </div>
              {instance && def ? (
                <div className="equip-slot-info">
                  <span
                    className="equip-item-name"
                    style={{ color: enhanceLevel > 0 ? ENHANCE_COLORS[enhanceLevel] : RARITY_COLORS[def.rarity] }}
                  >
                    {getEnhanceName(instance)}
                  </span>
                  <span className="equip-item-stats">{formatStats(getEffectiveStats(instance))}</span>
                  {kcInfo && (
                    <span style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
                      처치 {kcInfo.killCount.toLocaleString()}/{kcInfo.maxKillCount.toLocaleString()} | 독 {kcInfo.currentDotDamage} x{kcInfo.currentMaxStacks}
                    </span>
                  )}
                </div>
              ) : (
                <div className="equip-slot-empty">(빈 슬롯)</div>
              )}
              {instance && enhancingId === instance.instanceId && (
                <EnhancePanel instance={instance} />
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
              const enhanceLevel = instance.enhanceLevel ?? 0;
              const kcInfo = getKillCountInfo(instance);

              return (
                <div key={instance.instanceId} className="equip-inventory-item">
                  <div className="equip-inventory-item-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        className="equip-item-name"
                        style={{ color: enhanceLevel > 0 ? ENHANCE_COLORS[enhanceLevel] : RARITY_COLORS[def.rarity] }}
                      >
                        {getEnhanceName(instance)}
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
                    <span className="equip-item-stats">{formatStats(getEffectiveStats(instance))}</span>
                    <span className="equip-item-slot">
                      {SLOT_NAMES[def.slot]}
                    </span>
                    {kcInfo && (
                      <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                        처치 {kcInfo.killCount.toLocaleString()}/{kcInfo.maxKillCount.toLocaleString()} | 독 {kcInfo.currentDotDamage} x{kcInfo.currentMaxStacks}
                      </span>
                    )}
                  </div>
                  <div className="equip-inventory-item-actions">
                    {def.enhanceable && (
                      <button
                        className="btn btn-small"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--accent)', border: '1px solid var(--accent)', fontSize: 11 }}
                        onClick={() => setEnhancingId(enhancingId === instance.instanceId ? null : instance.instanceId)}
                        disabled={battling}
                      >
                        강화
                      </button>
                    )}
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
                        if (confirm(`${getEnhanceName(instance)}을(를) 버리시겠습니까?`)) {
                          discardEquipment(instance.instanceId);
                        }
                      }}
                      disabled={battling}
                    >
                      버리기
                    </button>
                  </div>
                  {enhancingId === instance.instanceId && (
                    <EnhancePanel instance={instance} />
                  )}
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
