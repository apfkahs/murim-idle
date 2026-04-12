import { useGameStore } from '../../store/gameStore';
import { FIELDS } from '../../data/fields';
import { getMonsterDef, getGradeName, BOSS_PATTERNS } from '../../data/monsters';
import { ARTS } from '../../data/arts';
import { EQUIPMENT } from '../../data/equipment';
import { MATERIALS } from '../../data/materials';
import { getEnemyImage, getEnemyEmoji } from '../../assets/index';
import { ALL_MONSTERS, getDocRevealLevel, getNextThreshold } from './encyclopediaUtils';

// ── FieldListScreen ─────────────────────────────────────────────────────────

export function FieldListScreen({ onBack, onSelect }: {
  onBack: () => void;
  onSelect: (fieldId: string) => void;
}) {
  const killCounts = useGameStore(s => s.killCounts);
  const bossKillCounts = useGameStore(s => s.bossKillCounts);
  const fieldUnlocks = useGameStore(s => s.fieldUnlocks);

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

export function MonsterListScreen({ fieldId, onBack, onSelect }: {
  fieldId: string;
  onBack: () => void;
  onSelect: (monsterId: string) => void;
}) {
  const killCounts = useGameStore(s => s.killCounts);
  const bossKillCounts = useGameStore(s => s.bossKillCounts);

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

const SKILL_TYPE_LABELS: Record<string, string> = {
  stun: '기절',
  rage_attack: '분노 강타',
  replace_normal: '특수 패시브',
  charged_attack: '차지 공격',
  dot_apply: '독/지속피해',
  double_hit: '이중 타격',
  freeze_attack: '고정 피해',
  multi_hit: '다중 타격',
  passive_dodge: '회피 패시브',
  passive_crit: '치명 패시브',
  passive_dmg_absorb: '피해 흡수',
  potion_heal: '자가 회복',
  atk_buff_bypass: '공격력 강화',
  stack_smash: '누적 강타',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getTriggerLabel(skill: any): string {
  if (skill.triggerCondition === 'stamina_full') return '내력 만충 시';
  if (skill.triggerCondition === 'hp_threshold')
    return `HP ${Math.round((skill.hpThreshold ?? 0) * 100)}% 이하`;
  if (skill.chance) return `${Math.round(skill.chance * 100)}% 확률`;
  return '항시';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSkillEffectDesc(skill: any): string {
  switch (skill.type) {
    case 'stun': return `${skill.stunDuration}초 기절`;
    case 'rage_attack': return `피해 ×${skill.damageMultiplier}`;
    case 'charged_attack': return `피해 ×${skill.damageMultiplier}${skill.stunAfterHit ? `, ${skill.stunAfterHit}초 기절` : ''}`;
    case 'dot_apply': return '독 적용';
    case 'freeze_attack': return skill.fixedDamage ? `고정 ${skill.fixedDamage}` : `피해 ×${skill.damageMultiplier}`;
    case 'double_hit': return `2타 ×${skill.hitMultiplier}`;
    case 'multi_hit': return `${skill.hitCount}타 ×${skill.hitMultiplier}`;
    case 'passive_dodge': return `${Math.round((skill.dodgeChance ?? 0) * 100)}% 회피`;
    case 'passive_crit': return `${Math.round((skill.critChance ?? 0) * 100)}% 치명 ×${skill.critMultiplier}`;
    case 'passive_dmg_absorb': return `${Math.round((skill.absorbChance ?? 0) * 100)}% 흡수 ×${skill.absorbMultiplier}`;
    case 'potion_heal': return 'HP 회복';
    case 'atk_buff_bypass': return `공격력 +${Math.round((skill.atkBuffPercent ?? 0) * 100)}%`;
    case 'replace_normal': return '일반 공격 대체';
    case 'stack_smash': return `${skill.stackTriggerCount}회 누적 → ×${skill.stackSmashMultiplier}`;
    default: return '';
  }
}

function formatChance(chance: number): string {
  const pct = chance * 100;
  if (pct >= 1) return `${pct.toFixed(0)}%`;
  if (pct >= 0.1) return `${pct.toFixed(1)}%`;
  return `${pct.toFixed(2)}%`;
}

// ── MonsterDetailScreen ─────────────────────────────────────────────────────

export function MonsterDetailScreen({ monsterId, onBack }: {
  monsterId: string;
  onBack: () => void;
}) {
  const killCounts = useGameStore(s => s.killCounts);
  const bossKillCounts = useGameStore(s => s.bossKillCounts);

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
    ...(mon.materialDrops ?? []).map(d => {
      const mat = MATERIALS.find(m => m.id === d.materialId);
      return { name: mat?.name ?? d.materialId, type: '재료', chance: d.chance };
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

      {/* 사용 기술 */}
      {(() => {
        const pattern = BOSS_PATTERNS[monsterId];
        const skills = pattern?.skills ?? [];
        if (skills.length === 0) return null;
        return (
          <div className="card">
            <div className="card-label">사용 기술</div>
            {reveal >= 4 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {skills.map(skill => (
                  <div key={skill.id} style={{ fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{skill.displayName}</span>
                      <span style={{
                        fontSize: 10, padding: '1px 6px', borderRadius: 3,
                        background: 'rgba(255,255,255,0.06)', color: 'var(--text-dim)',
                      }}>
                        {SKILL_TYPE_LABELS[skill.type] ?? skill.type}
                      </span>
                    </div>
                    {reveal >= 5 && (
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, display: 'flex', gap: 8 }}>
                        <span>{getTriggerLabel(skill)}</span>
                        {getSkillEffectDesc(skill) && (
                          <span style={{ color: 'var(--accent-gold)' }}>{getSkillEffectDesc(skill)}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ color: 'var(--text-dim)', letterSpacing: 1, fontSize: 12 }}>???</span>
            )}
          </div>
        );
      })()}

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
                    {reveal >= 6 ? formatChance(d.chance) : QM}
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
