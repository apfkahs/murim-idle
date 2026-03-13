/**
 * 무공/능력 탭 — v1.1
 * 최상단 심법 섹션 + 액티브/패시브 태그
 */
import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { getArtDef, getArtGrade, getAllPassives, getSimdeukForGrade } from '../data/arts';
import { getMaxGrade } from '../data/tiers';
import Stars from './Stars';

export default function ArtsTab() {
  const ownedArts = useGameStore(s => s.ownedArts);
  const equippedArts = useGameStore(s => s.equippedArts);
  const equippedSimbeop = useGameStore(s => s.equippedSimbeop);
  const artPoints = useGameStore(s => s.artPoints);
  const tier = useGameStore(s => s.tier);
  const battleMode = useGameStore(s => s.battleMode);
  const equipArt = useGameStore(s => s.equipArt);
  const unequipArt = useGameStore(s => s.unequipArt);
  const equipSimbeop = useGameStore(s => s.equipSimbeop);
  const unequipSimbeop = useGameStore(s => s.unequipSimbeop);
  const getUsedPoints = useGameStore(s => s.getUsedPoints);
  const getAvailablePoints = useGameStore(s => s.getAvailablePoints);

  const [expandedArt, setExpandedArt] = useState<string | null>(null);

  const battling = battleMode !== 'none';
  const usedPoints = getUsedPoints();
  const availablePoints = getAvailablePoints();
  const maxGrade = getMaxGrade(tier);

  // 심법 데이터
  const simbeopArts = ownedArts.filter(a => getArtDef(a.id)?.isSimbeop);
  const equippedSimbeopData = equippedSimbeop ? (() => {
    const owned = ownedArts.find(a => a.id === equippedSimbeop);
    const def = getArtDef(equippedSimbeop);
    return owned && def ? { owned, def } : null;
  })() : null;

  // 장착 무공 (심법 제외)
  const equippedArtData = equippedArts.map(id => ({
    owned: ownedArts.find(a => a.id === id),
    def: getArtDef(id),
  })).filter(a => a.owned && a.def);

  // 미장착 무공 (심법 제외)
  const unequippedArts = ownedArts.filter(a => {
    const def = getArtDef(a.id);
    return def && !def.isSimbeop && !equippedArts.includes(a.id);
  });

  return (
    <div>
      {/* 심법 섹션 (5.2장) */}
      <div className="card">
        <div className="card-label">심법</div>
        {equippedSimbeopData ? (() => {
          const { owned, def } = equippedSimbeopData;
          const gradeData = getArtGrade(def, owned.grade);
          const isExpanded = expandedArt === def.id;
          const neededSimdeuk = owned.grade < 5 ? getSimdeukForGrade(def.baseSimdeukCost, owned.grade + 1) : 0;
          const progress = neededSimdeuk > 0 ? Math.min(owned.proficiency / neededSimdeuk, 1) : 1;

          return (
            <div
              style={{ cursor: 'pointer' }}
              onClick={() => setExpandedArt(isExpanded ? null : def.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="simbeop-icon">☯</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'var(--blue)' }}>
                    {def.name} <Stars grade={owned.grade} maxGrade={5} />
                  </div>
                  {gradeData && (
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{gradeData.effect}</div>
                  )}
                  {neededSimdeuk > 0 && (
                    <div style={{ marginTop: 4 }}>
                      <div className="progress-bar" style={{ marginBottom: 2 }}>
                        <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                        숙련도 {owned.proficiency}/{neededSimdeuk}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  className="btn btn-small"
                  onClick={(e) => { e.stopPropagation(); unequipSimbeop(); }}
                  disabled={battling}
                >
                  교체
                </button>
              </div>
              {isExpanded && (
                <ArtDetail artId={def.id} grade={owned.grade} proficiency={owned.proficiency} tier={tier} />
              )}
            </div>
          );
        })() : (
          <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>심법 미장착</div>
        )}

        {/* 미장착 심법 목록 */}
        {simbeopArts.length > 0 && !battling && (
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            {simbeopArts
              .filter(a => a.id !== equippedSimbeop)
              .map(a => {
                const def = getArtDef(a.id);
                if (!def) return null;
                return (
                  <button
                    key={a.id}
                    className="btn btn-small"
                    onClick={() => equipSimbeop(a.id)}
                  >
                    {def.name} 장착
                  </button>
                );
              })}
          </div>
        )}
      </div>

      {/* 장착 중 */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span className="card-label" style={{ marginBottom: 0 }}>장착 중</span>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            포인트 {usedPoints}/{artPoints}
          </span>
        </div>

        {equippedArtData.length === 0 && (
          <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>장착된 무공이 없습니다</div>
        )}

        {equippedArtData.map(({ owned, def }) => {
          if (!owned || !def) return null;
          const gradeData = getArtGrade(def, owned.grade);
          const isExpanded = expandedArt === def.id;

          return (
            <div
              key={def.id}
              className="card"
              style={{ cursor: 'pointer', marginBottom: 8, padding: 12 }}
              onClick={() => setExpandedArt(isExpanded ? null : def.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 500, fontSize: 13 }}>{def.name}</span>
                    <span className={`badge-art-type ${def.artType === 'active' ? 'badge-active' : 'badge-passive'}`}>
                      {def.artType === 'active' ? '액티브' : '패시브'}
                    </span>
                  </div>
                  <div style={{ marginTop: 2 }}>
                    <Stars grade={owned.grade} maxGrade={maxGrade} />{' '}
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{gradeData?.effect}</span>
                  </div>
                </div>
                <button
                  className="btn btn-small btn-danger"
                  onClick={(e) => { e.stopPropagation(); unequipArt(def.id); }}
                  disabled={battling}
                >
                  해제
                </button>
              </div>
              {isExpanded && (
                <ArtDetail artId={def.id} grade={owned.grade} proficiency={owned.proficiency} tier={tier} />
              )}
            </div>
          );
        })}
      </div>

      {/* 보유 무공 */}
      <div className="card">
        <div className="card-label">보유 무공</div>

        {unequippedArts.length === 0 && (
          <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>미장착 무공 없음</div>
        )}

        {unequippedArts.map(owned => {
          const def = getArtDef(owned.id);
          if (!def) return null;
          const gradeData = getArtGrade(def, owned.grade);
          const isExpanded = expandedArt === def.id;

          return (
            <div
              key={def.id}
              className="card"
              style={{ cursor: 'pointer', marginBottom: 8, padding: 12 }}
              onClick={() => setExpandedArt(isExpanded ? null : def.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 500, fontSize: 13 }}>{def.name}</span>
                    {def.faction === 'righteous' && <span className="badge-faction-righteous">정</span>}
                    {def.faction === 'evil' && <span className="badge-faction-evil">사</span>}
                    <span className={`badge-art-type ${def.artType === 'active' ? 'badge-active' : 'badge-passive'}`}>
                      {def.artType === 'active' ? '액티브' : '패시브'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>비용{def.cost}</span>
                  </div>
                  <div style={{ marginTop: 2 }}>
                    <Stars grade={owned.grade} maxGrade={maxGrade} />{' '}
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{gradeData?.effect}</span>
                  </div>
                </div>
                <button
                  className="btn btn-small"
                  onClick={(e) => { e.stopPropagation(); equipArt(def.id); }}
                  disabled={battling || availablePoints < def.cost}
                >
                  장착
                </button>
              </div>
              {isExpanded && (
                <ArtDetail artId={def.id} grade={owned.grade} proficiency={owned.proficiency} tier={tier} />
              )}
            </div>
          );
        })}
      </div>

      {battling && (
        <div style={{ fontSize: 12, color: 'var(--red)', textAlign: 'center', marginTop: 8 }}>
          전투 중에는 교체할 수 없습니다
        </div>
      )}
    </div>
  );
}

function ArtDetail({ artId, grade, proficiency, tier }: { artId: string; grade: number; proficiency: number; tier: number }) {
  const def = getArtDef(artId);
  if (!def) return null;

  const maxGrade = getMaxGrade(tier);
  const nextGrade = grade + 1;
  const nextGradeData = nextGrade <= 5 ? getArtGrade(def, nextGrade) : null;
  const neededSimdeuk = nextGrade <= 5 ? getSimdeukForGrade(def.baseSimdeukCost, nextGrade) : 0;
  const progress = neededSimdeuk > 0 ? Math.min(proficiency / neededSimdeuk, 1) : 1;
  const allPassives = getAllPassives(artId, grade);

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.03)', fontSize: 12 }}>
      {allPassives.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ color: 'var(--text-secondary)', marginBottom: 4, fontSize: 11 }}>패시브</div>
          {allPassives.map(p => (
            <div key={p.passive} style={{ color: 'var(--gold)', paddingLeft: 8, lineHeight: 1.6 }}>{p.passiveDesc}</div>
          ))}
        </div>
      )}

      {nextGradeData && grade < maxGrade ? (
        <div>
          <div style={{ color: 'var(--text-secondary)', marginBottom: 4, fontSize: 11 }}>
            다음 성급 ({nextGrade}성): {nextGradeData.effect}
            {nextGradeData.passiveDesc && ` + ${nextGradeData.passiveDesc}`}
          </div>
          <div className="progress-bar" style={{ marginBottom: 4 }}>
            <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
          </div>
          <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>
            심득 {proficiency}/{neededSimdeuk}
          </div>
        </div>
      ) : grade >= maxGrade ? (
        <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>경지 돌파 필요 (성급 상한)</div>
      ) : (
        <div style={{ color: 'var(--gold)', fontSize: 11 }}>최대 성급 달성!</div>
      )}
    </div>
  );
}
