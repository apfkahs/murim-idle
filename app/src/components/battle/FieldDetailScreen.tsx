import { useGameStore, getMonsterRevealLevel } from '../../store/gameStore';
import { getMonsterDef, BOSS_PATTERNS, type MonsterDef } from '../../data/monsters';
import { getFieldDef } from '../../data/fields';
import { getEnemyImage, getEnemyEmoji, getFieldBackground } from '../../assets';
import { FIELD_DESCRIPTIONS, getMonsterHint } from './battleUtils';

// ─────────────────────────────────────────────
// 2단계: 전장 상세 (4장 + 3장 정보 숨김)
// ─────────────────────────────────────────────
export default function FieldDetailScreen({ fieldId, onBack }: { fieldId: string; onBack: () => void }) {
  const startExplore = useGameStore(s => s.startExplore);
  const startHunt = useGameStore(s => s.startHunt);
  const killCounts = useGameStore(s => s.killCounts);
  const bossKillCounts = useGameStore(s => s.bossKillCounts);
  const hiddenRevealedInField = useGameStore(s => s.hiddenRevealedInField);
  const autoExploreFields = useGameStore(s => s.autoExploreFields);
  const toggleAutoExplore = useGameStore(s => s.toggleAutoExplore);

  const field = getFieldDef(fieldId);
  if (!field) return null;

  const isTraining = field.isTraining;
  const fieldName = field.name;
  const fieldDesc = FIELD_DESCRIPTIONS[fieldId] ?? '';
  const bgUrl = getFieldBackground(fieldId);

  // 답파 완료 여부
  const cleared = field.boss
    ? (bossKillCounts[field.boss] ?? 0) > 0
    : field.monsters.length > 0 && (killCounts[field.monsters[field.monsters.length - 1]] ?? 0) > 0;
  const autoOn = autoExploreFields[fieldId] ?? false;

  // 전장의 몬스터 목록
  const monsters = field.monsters.map(id => getMonsterDef(id)).filter(Boolean) as MonsterDef[];

  // 보스
  const boss = field.boss ? getMonsterDef(field.boss) : null;

  return (
    <div>
      {/* 배경 배너 헤더 */}
      <div className="field-detail-banner" style={bgUrl ? { backgroundImage: `url(${bgUrl})` } : {}}>
        <div className="field-detail-banner-overlay">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="field-back-btn" onClick={onBack}>←</button>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{fieldName}</div>
              {fieldDesc && <div style={{ fontSize: 11, opacity: 0.7 }}>{fieldDesc}</div>}
            </div>
          </div>
          {field.canExplore && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button className="btn btn-small btn-gold" onClick={() => startExplore(fieldId)}>답파</button>
              {cleared && (
                <button
                  className={`btn btn-small ${autoOn ? 'btn-gold' : ''}`}
                  style={{ opacity: autoOn ? 1 : 0.5 }}
                  onClick={() => toggleAutoExplore(fieldId)}
                >
                  자동{autoOn ? ' ON' : ' OFF'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 몬스터 목록 */}
      <div className="card">
        {monsters.map(mon => {
          const kills = killCounts[mon.id] ?? 0;
          const reveal = getMonsterRevealLevel(kills);
          const enemyImg = getEnemyImage(mon.imageKey);

          // 수련장도 서술형 설명 사용
          if (isTraining) {
            const hint = mon.hp <= 10 ? '반격하지 않는 나무 허수아비' : '스스로 회복하는 단단한 수련 인형';
            return (
              <div key={mon.id} className="stat-row" style={{ alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {enemyImg ? (
                    <img src={enemyImg} alt={mon.name} className="monster-thumb" />
                  ) : (
                    <div className="monster-emoji-thumb">{getEnemyEmoji(mon.id)}</div>
                  )}
                  <div>
                    <span style={{ fontSize: 13 }}>{mon.name}</span>
                    {kills > 0 && (
                      <span style={{ fontSize: 11, color: 'var(--green)', marginLeft: 6 }}>처치완료</span>
                    )}
                    <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{hint}</div>
                  </div>
                </div>
                <button className="btn btn-small" onClick={() => startHunt(fieldId, mon.id)}>사냥</button>
              </div>
            );
          }

          // 미조우
          if (reveal === 0) {
            return (
              <div key={mon.id} className="stat-row" style={{ opacity: 0.3, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="monster-emoji-thumb" style={{ opacity: 0.3 }}>?</div>
                  <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>???</span>
                </div>
              </div>
            );
          }

          return (
            <div key={mon.id} className="stat-row" style={{ alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {enemyImg ? (
                  <img src={enemyImg} alt={mon.name} className="monster-thumb" />
                ) : (
                  <div className="monster-emoji-thumb">{getEnemyEmoji(mon.id)}</div>
                )}
                <div>
                  <span style={{ fontSize: 13 }}>{mon.name}</span>
                  {reveal >= 5 && mon.drops.length > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--gold)', marginLeft: 6 }}>
                      무언가를 지니고 있는 듯하다
                    </span>
                  )}
                  <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{getMonsterHint(mon, reveal)}</div>
                </div>
              </div>
              <button className="btn btn-small" onClick={() => startHunt(fieldId, mon.id)}>사냥</button>
            </div>
          );
        })}

        {/* 미구현 몬스터 슬롯 (??? 표시) */}
        {field.totalMonsterSlots && field.totalMonsterSlots > field.monsters.length && (
          Array.from({ length: field.totalMonsterSlots - field.monsters.length }).map((_, i) => (
            <div key={`unknown_${i}`} className="stat-row" style={{ opacity: 0.3, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="monster-emoji-thumb" style={{ opacity: 0.3 }}>?</div>
                <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>???</span>
              </div>
            </div>
          ))
        )}

        {/* 보스 */}
        {boss ? (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.03)' }}>
            {(() => {
              const bossKills = killCounts[boss.id] ?? 0;
              const bossReveal = getMonsterRevealLevel(bossKills);
              const bossImg = getEnemyImage(boss.imageKey);
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {bossReveal >= 1 ? (
                    bossImg ? (
                      <img src={bossImg} alt={boss.name} className="monster-thumb" />
                    ) : (
                      <div className="monster-emoji-thumb">{getEnemyEmoji(boss.id)}</div>
                    )
                  ) : (
                    <div className="monster-emoji-thumb" style={{ opacity: 0.3 }}>?</div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                    보스: {bossReveal >= 1 ? boss.name : '???'}
                    {bossReveal >= 1 ? ` — ${getMonsterHint(boss, bossReveal)}` : ''}
                    {(bossKillCounts[boss.id] ?? 0) > 0 && (
                      <span style={{ color: 'var(--green)', marginLeft: 6 }}>답파 성공</span>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : field.totalMonsterSlots && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.03)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', opacity: 0.4 }}>
              보스: ???
            </div>
          </div>
        )}

        {/* 히든 몬스터 */}
        {field.hiddenMonsters.length > 0 && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.03)' }}>
            {(() => {
              const revealedId = hiddenRevealedInField[fieldId];
              const isActualHidden = !!revealedId && field.hiddenMonsters.includes(revealedId);
              if (isActualHidden) {
                const hiddenMon = getMonsterDef(revealedId!);
                return (
                  <div style={{ fontSize: 11, color: 'var(--gold)' }}>
                    히든: {hiddenMon?.name ?? revealedId}
                  </div>
                );
              }
              return (
                <div style={{ fontSize: 11, color: 'var(--text-dim)', opacity: 0.4 }}>
                  히든: ???
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
