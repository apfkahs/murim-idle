/**
 * MasteryPanel — 무공 초(招) 패널
 * ArtsTab.tsx에서 분리.
 */
import { useGameStore, getArtGradeInfo, getGradeTableForArt, getArtGradeInfoFromTable } from '../../store/gameStore';
import { getArtDef, getMasteryDefsForArt, getMasteryDef } from '../../data/arts';
import { getTierDef } from '../../data/tiers';
import { getBijupDefByMastery } from '../../data/materials';

interface MasteryPanelProps {
  artId: string;
  artGradeExp: number;
  materials: Record<string, number>;
  tier: number;
  discoveredMasteries: string[];
}

export function MasteryPanel({ artId, artGradeExp, materials, tier, discoveredMasteries }: MasteryPanelProps) {
  const activeMasteries = useGameStore(s => s.activeMasteries);
  const activateMastery = useGameStore(s => s.activateMastery);
  const deactivateMastery = useGameStore(s => s.deactivateMastery);
  const useBijup = useGameStore(s => s.useBijup);
  const equippedArts = useGameStore(s => s.equippedArts);
  const equippedSimbeop = useGameStore(s => s.equippedSimbeop);
  const battleMode = useGameStore(s => s.battleMode);
  const getAvailablePoints = useGameStore(s => s.getAvailablePoints);

  const artDef = getArtDef(artId);
  if (!artDef) return null;

  const battling = battleMode !== 'none';
  const masteries = getMasteryDefsForArt(artId);
  const currentActive = activeMasteries[artId] ?? [];
  const isEquipped = equippedArts.includes(artId) || equippedSimbeop === artId;

  const gradeTable = getGradeTableForArt(artDef);
  const currentGrade = gradeTable.length < 60
    ? getArtGradeInfoFromTable(artGradeExp, gradeTable).stageIndex + 1
    : getArtGradeInfo(artGradeExp).stageIndex + 1;
  const currentStarIndex = gradeTable.length < 60
    ? getArtGradeInfoFromTable(artGradeExp, gradeTable).starIndex
    : getArtGradeInfo(artGradeExp).starIndex;

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.03)', fontSize: 12 }}>
      <div className="mastery-panel">
        <div className="mastery-panel-title">초(招)</div>

        {!isEquipped && currentActive.length > 0 && (
          <div className="mastery-unequipped-warn">효과 비활성 중 (미장착)</div>
        )}

        {masteries.map((m, idx) => {
          const isActive = currentActive.includes(m.id);
          const isBijupType = m.discovery?.type === 'bijup';
          const isArtStarType = m.discovery?.type === 'artStar';

          // ── 비급 타입 처리 ──
          if (isBijupType) {
            if (isActive) {
              return (
                <div key={m.id} className="mastery-item mastery-active">
                  <div className="mastery-item-header">
                    <div className="mastery-item-left">
                      <span className="mastery-icon">☯</span>
                      <span className="mastery-name mastery-name-active" style={{ color: 'var(--gold)' }}>
                        {m.stage}초 — {m.name}
                      </span>
                    </div>
                  </div>
                  <div className="mastery-desc mastery-desc-active">{m.description}</div>
                  {m.flavorText && (
                    <div style={{ fontSize: 10, fontStyle: 'italic', color: 'var(--text-dim)', marginTop: 2, paddingLeft: 22 }}>
                      "{m.flavorText}"
                    </div>
                  )}
                </div>
              );
            }

            const bijupDef = getBijupDefByMastery(m.id);
            const hasBijup = bijupDef ? (materials[bijupDef.materialId] ?? 0) > 0 : false;

            if (!hasBijup) return null;

            const gradeMet = currentGrade >= m.requiredArtGrade!;
            return (
              <div key={m.id} className="mastery-item mastery-unlocked">
                <div className="mastery-item-header">
                  <div className="mastery-item-left">
                    <span className="mastery-icon">📜</span>
                    <span className="mastery-name">
                      {m.stage}초 — {m.name}
                    </span>
                    <span className="mastery-cost" style={{ color: 'var(--gold)', fontSize: 10 }}>비급 보유</span>
                  </div>
                  <div className="mastery-item-right">
                    <button
                      className="btn btn-small btn-gold"
                      onClick={(e) => { e.stopPropagation(); useBijup(bijupDef!.materialId); }}
                      disabled={battling || !gradeMet || !isEquipped}
                    >
                      사용
                    </button>
                  </div>
                </div>
                <div className="mastery-desc">
                  {!gradeMet && (
                    <span className="mastery-lock-reason">{m.requiredArtGrade}등급 필요 (현재 {currentGrade}등급) | </span>
                  )}
                  {!isEquipped && gradeMet && (
                    <span className="mastery-lock-reason">장착 필요 | </span>
                  )}
                  {m.description}
                </div>
                {m.flavorText && (
                  <div style={{ fontSize: 10, fontStyle: 'italic', color: 'var(--text-dim)', marginTop: 2, paddingLeft: 22 }}>
                    "{m.flavorText}"
                  </div>
                )}
              </div>
            );
          }

          // ── artStar 타입 처리 ──
          if (isArtStarType) {
            const discoverStar = m.discovery!.starIndex!;
            const unlockStar = m.discovery!.unlockStarIndex ?? discoverStar;
            const discovered = currentStarIndex >= discoverStar;

            if (isActive) {
              return (
                <div key={m.id} className="mastery-item mastery-active">
                  <div className="mastery-item-header">
                    <div className="mastery-item-left">
                      <span className="mastery-icon">☯</span>
                      <span className="mastery-name mastery-name-active" style={{ color: 'var(--gold)' }}>
                        {m.stage}초 — {m.name}
                      </span>
                    </div>
                  </div>
                  <div className="mastery-desc mastery-desc-active">{m.description}</div>
                  {m.flavorText && (
                    <div style={{ fontSize: 10, fontStyle: 'italic', color: 'var(--text-dim)', marginTop: 2, paddingLeft: 22 }}>
                      "{m.flavorText}"
                    </div>
                  )}
                </div>
              );
            }

            if (!discovered) {
              return (
                <div key={m.id} className="mastery-item mastery-locked-grade">
                  <div className="mastery-item-header">
                    <div className="mastery-item-left">
                      <span className="mastery-icon">🔒</span>
                      <span className="mastery-name" style={{ color: 'var(--text-dim)' }}>
                        {m.stage}초 — ???
                      </span>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={m.id} className="mastery-item mastery-unlocked">
                <div className="mastery-item-header">
                  <div className="mastery-item-left">
                    <span className="mastery-icon">⭐</span>
                    <span className="mastery-name">{m.stage}초 — {m.name}</span>
                    <span className="mastery-cost" style={{ color: 'var(--text-secondary)', fontSize: 10 }}>
                      {unlockStar}성 도달 시 자동 해금
                    </span>
                  </div>
                </div>
                <div className="mastery-desc">{m.description}</div>
                {m.flavorText && (
                  <div style={{ fontSize: 10, fontStyle: 'italic', color: 'var(--text-dim)', marginTop: 2, paddingLeft: 22 }}>
                    "{m.flavorText}"
                  </div>
                )}
              </div>
            );
          }

          // ── 일반 타입 처리 ──
          const isDiscovered = !m.discovery || discoveredMasteries.includes(m.id);
          const availPts = getAvailablePoints();

          const prevMastery = idx > 0 ? masteries[idx - 1] : null;
          const prevDiscovered = prevMastery
            ? (!prevMastery.discovery || discoveredMasteries.includes(prevMastery.id))
            : true;

          if (!isDiscovered) {
            if (!prevDiscovered) return null;
            return (
              <div key={m.id} className="mastery-item mastery-locked-grade">
                <div className="mastery-item-header">
                  <div className="mastery-item-left">
                    <span className="mastery-icon">🔒</span>
                    <span className="mastery-name" style={{ color: 'var(--text-dim)' }}>
                      {m.stage}초 — ???
                    </span>
                  </div>
                </div>
              </div>
            );
          }

          const tierMet = m.requiredTier === 0 || tier >= m.requiredTier;
          const requiresUnmet = m.requires ? m.requires.filter(rid => !currentActive.includes(rid)) : [];
          const prereqMet = requiresUnmet.length === 0;
          const canActivate = !isActive && tierMet && prereqMet && availPts >= m.pointCost && isEquipped;

          let statusClass = 'mastery-locked-grade';
          if (isActive) statusClass = 'mastery-active';
          else if (tierMet) statusClass = 'mastery-unlocked';
          else if (!tierMet) statusClass = 'mastery-locked-tier';

          return (
            <div key={m.id} className={`mastery-item ${statusClass}`}>
              <div className="mastery-item-header">
                <div className="mastery-item-left">
                  <span className="mastery-icon">
                    {isActive ? '☯' : tierMet ? '☐' : '🔒'}
                  </span>
                  <span className={`mastery-name ${isActive ? 'mastery-name-active' : ''}`}
                    style={isActive ? { color: 'var(--gold)' } : undefined}
                  >
                    {m.stage}초 — {m.name}
                  </span>
                  {m.pointCost > 0 && <span className="mastery-cost">({m.pointCost}pt)</span>}
                </div>
                <div className="mastery-item-right">
                  {isActive && (
                    <button
                      className="btn btn-small btn-danger"
                      onClick={(e) => { e.stopPropagation(); deactivateMastery(artId, m.id); }}
                      disabled={battling}
                    >
                      해제
                    </button>
                  )}
                  {!isActive && tierMet && (
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
              <div className={`mastery-desc ${isActive ? 'mastery-desc-active' : ''}`}>
                {!tierMet && (
                  <span className="mastery-lock-reason">{getTierDef(m.requiredTier).name} 필요 | </span>
                )}
                {m.description}
              </div>
              {m.flavorText && (
                <div style={{ fontSize: 10, fontStyle: 'italic', color: 'var(--text-dim)', marginTop: 2, paddingLeft: 22 }}>
                  "{m.flavorText}"
                </div>
              )}
              {requiresUnmet.length > 0 && !isActive && (
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
    </div>
  );
}
