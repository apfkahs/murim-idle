/**
 * 무공/능력 탭 — v2.0
 * 심화학습 패널, 포인트 합산, 전체 초기화
 */
import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { getArtDef, getArtGrade, getSimdeukForGrade, getMasteryDefsForArt, getMasteryDef, type MasteryDef } from '../data/arts';
import { getMaxGrade, getTierDef } from '../data/tiers';
import Stars from './Stars';

export default function ArtsTab() {
  const ownedArts = useGameStore(s => s.ownedArts);
  const equippedArts = useGameStore(s => s.equippedArts);
  const equippedSimbeop = useGameStore(s => s.equippedSimbeop);
  const artPoints = useGameStore(s => s.artPoints);
  const tier = useGameStore(s => s.tier);
  const battleMode = useGameStore(s => s.battleMode);
  const activeMasteries = useGameStore(s => s.activeMasteries);
  const equipArt = useGameStore(s => s.equipArt);
  const unequipArt = useGameStore(s => s.unequipArt);
  const equipSimbeop = useGameStore(s => s.equipSimbeop);
  const unequipSimbeop = useGameStore(s => s.unequipSimbeop);
  const resetAllMasteries = useGameStore(s => s.resetAllMasteries);
  const getUsedPoints = useGameStore(s => s.getUsedPoints);
  const getAvailablePoints = useGameStore(s => s.getAvailablePoints);

  const [expandedArt, setExpandedArt] = useState<string | null>(null);

  const battling = battleMode !== 'none';
  const usedPoints = getUsedPoints();
  const availablePoints = getAvailablePoints();
  const maxGrade = getMaxGrade(tier);

  // 미장착 무공에 할당된 심화 포인트 계산
  const unequippedMasteryPoints = Object.entries(activeMasteries).reduce((sum, [artId, mIds]) => {
    const isEquipped = equippedArts.includes(artId) || equippedSimbeop === artId;
    if (isEquipped) return sum;
    let pts = 0;
    for (const mId of mIds) {
      const mDef = getMasteryDef(artId, mId);
      if (mDef) pts += mDef.pointCost;
    }
    return sum + pts;
  }, 0);

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

  function handleResetAllMasteries() {
    if (confirm('모든 심화학습을 초기화하시겠습니까?')) {
      resetAllMasteries();
    }
  }

  return (
    <div>
      {/* 심법 섹션 */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="points-display">
              포인트 {usedPoints}/{artPoints}
            </span>
            {Object.keys(activeMasteries).length > 0 && (
              <button
                className="btn btn-small btn-danger"
                onClick={handleResetAllMasteries}
                disabled={battling}
              >
                초기화
              </button>
            )}
          </div>
        </div>

        {unequippedMasteryPoints > 0 && (
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
            (미장착 심화 {unequippedMasteryPoints} pt 포함)
          </div>
        )}

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
        <div className="battle-warning">
          전투 중에는 교체할 수 없습니다
        </div>
      )}
    </div>
  );
}

/** 심화학습 개별 항목의 상태 */
type MasteryStatus = 'active' | 'unlocked' | 'locked-grade' | 'locked-tier';

function getMasteryStatus(
  mDef: MasteryDef,
  grade: number,
  tier: number,
): MasteryStatus {
  if (mDef.requiredGrade > grade) return 'locked-grade';
  if (mDef.requiredTier > 0 && tier < mDef.requiredTier) return 'locked-tier';
  return 'unlocked';
}

function ArtDetail({ artId, grade, proficiency, tier }: { artId: string; grade: number; proficiency: number; tier: number }) {
  const def = getArtDef(artId);
  const activeMasteries = useGameStore(s => s.activeMasteries);
  const activateMastery = useGameStore(s => s.activateMastery);
  const deactivateMastery = useGameStore(s => s.deactivateMastery);
  const equippedArts = useGameStore(s => s.equippedArts);
  const equippedSimbeop = useGameStore(s => s.equippedSimbeop);
  const battleMode = useGameStore(s => s.battleMode);
  const getAvailablePoints = useGameStore(s => s.getAvailablePoints);

  if (!def) return null;

  const battling = battleMode !== 'none';
  const maxGrade = getMaxGrade(tier);
  const nextGrade = grade + 1;
  const nextGradeData = nextGrade <= 5 ? getArtGrade(def, nextGrade) : null;
  const neededSimdeuk = nextGrade <= 5 ? getSimdeukForGrade(def.baseSimdeukCost, nextGrade) : 0;
  const progress = neededSimdeuk > 0 ? Math.min(proficiency / neededSimdeuk, 1) : 1;
  const masteries = getMasteryDefsForArt(artId);
  const currentActive = activeMasteries[artId] ?? [];
  const isEquipped = equippedArts.includes(artId) || equippedSimbeop === artId;

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.03)', fontSize: 12 }}>
      {/* 심화학습 패널 */}
      {masteries.length > 0 && (
        <div className="mastery-panel">
          <div className="mastery-panel-title">심화학습</div>

          {!isEquipped && currentActive.length > 0 && (
            <div className="mastery-unequipped-warn">효과 비활성 중 (미장착)</div>
          )}

          {masteries.map(m => {
            const isActive = currentActive.includes(m.id);
            const baseStatus = getMasteryStatus(m, grade, tier);
            const status: MasteryStatus = isActive ? 'active' : baseStatus;
            const availPts = getAvailablePoints();

            // 전제 조건 미충족 표시
            const requiresUnmet = m.requires
              ? m.requires.filter(reqId => !currentActive.includes(reqId))
              : [];

            // 해금은 되었지만 전제 조건 미충족이면 투자 불가
            const prereqMet = requiresUnmet.length === 0;
            const canActivate = status === 'unlocked' && prereqMet && availPts >= m.pointCost && isEquipped;

            return (
              <div key={m.id} className={`mastery-item mastery-${status}`}>
                <div className="mastery-item-header">
                  <div className="mastery-item-left">
                    <span className="mastery-icon">
                      {status === 'active' ? '☯' : status === 'unlocked' ? '☐' : '🔒'}
                    </span>
                    <span className={`mastery-name ${status === 'active' ? 'mastery-name-active' : ''}`}>
                      {m.name}
                    </span>
                    <span className="mastery-cost">({m.pointCost}pt)</span>
                  </div>
                  <div className="mastery-item-right">
                    {status === 'active' && (
                      <button
                        className="btn btn-small btn-danger"
                        onClick={(e) => { e.stopPropagation(); deactivateMastery(artId, m.id); }}
                        disabled={battling}
                      >
                        해제
                      </button>
                    )}
                    {status === 'unlocked' && (
                      <button
                        className="btn btn-small btn-gold"
                        onClick={(e) => { e.stopPropagation(); activateMastery(artId, m.id); }}
                        disabled={battling || !canActivate}
                      >
                        투자
                      </button>
                    )}
                  </div>
                </div>
                <div className={`mastery-desc ${status === 'active' ? 'mastery-desc-active' : ''}`}>
                  {status === 'locked-grade' && (
                    <span className="mastery-lock-reason">{m.requiredGrade}성 필요 | </span>
                  )}
                  {status === 'locked-tier' && (
                    <span className="mastery-lock-reason">{getTierDef(m.requiredTier).name} 필요 | </span>
                  )}
                  {m.description}
                </div>
                {requiresUnmet.length > 0 && status !== 'active' && (
                  <div className="mastery-prereq-warn">
                    {requiresUnmet.map(reqId => {
                      const reqDef = getMasteryDef(artId, reqId);
                      return reqDef ? `${reqDef.name} 필요` : '';
                    }).filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 다음 성급 */}
      {nextGradeData && grade < maxGrade ? (
        <div style={{ marginTop: 8 }}>
          <div style={{ color: 'var(--text-secondary)', marginBottom: 4, fontSize: 11 }}>
            다음 성급 ({nextGrade}성): {nextGradeData.effect}
          </div>
          <div className="progress-bar" style={{ marginBottom: 4 }}>
            <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
          </div>
          <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>
            심득 {proficiency}/{neededSimdeuk}
          </div>
        </div>
      ) : grade >= maxGrade ? (
        <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 8 }}>경지 돌파 필요 (성급 상한)</div>
      ) : (
        <div style={{ color: 'var(--gold)', fontSize: 11, marginTop: 8 }}>최대 성급 달성!</div>
      )}
    </div>
  );
}
