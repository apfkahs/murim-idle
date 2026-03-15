/**
 * 무공/능력 탭 — v4.0
 * 삼재검법 + 삼재심법. 초식/절초/초(招) 패널.
 */
import { useGameStore, calcNormalMultiplier, calcQiPerSec, calcCombatQiRatio, calcEffectiveRegen, gatherMasteryEffects } from '../store/gameStore';
import { getArtDef, getMasteryDefsForArt, getMasteryDef, type ArtDef, type MasteryDef } from '../data/arts';
import { getTierDef, getMaxSimdeuk } from '../data/tiers';
import { BALANCE_PARAMS } from '../data/balance';

export default function ArtsTab() {
  const ownedArts = useGameStore(s => s.ownedArts);
  const equippedArts = useGameStore(s => s.equippedArts);
  const equippedSimbeop = useGameStore(s => s.equippedSimbeop);
  const artPoints = useGameStore(s => s.artPoints);
  const tier = useGameStore(s => s.tier);
  const battleMode = useGameStore(s => s.battleMode);
  const activeMasteries = useGameStore(s => s.activeMasteries);
  const discoveredMasteries = useGameStore(s => s.discoveredMasteries);
  const equipArt = useGameStore(s => s.equipArt);
  const unequipArt = useGameStore(s => s.unequipArt);
  const equipSimbeop = useGameStore(s => s.equipSimbeop);
  const unequipSimbeop = useGameStore(s => s.unequipSimbeop);
  const resetAllMasteries = useGameStore(s => s.resetAllMasteries);
  const getUsedPoints = useGameStore(s => s.getUsedPoints);
  const getAvailablePoints = useGameStore(s => s.getAvailablePoints);

  const battling = battleMode !== 'none';
  const usedPoints = getUsedPoints();
  const availablePoints = getAvailablePoints();

  // 삼재검법 (주공)
  const swordOwned = ownedArts.find(a => a.id === 'samjae_sword');
  const swordDef = getArtDef('samjae_sword');
  const swordEquipped = equippedArts.includes('samjae_sword');

  // 삼재심법 (심법)
  const simbeopOwned = ownedArts.find(a => a.id === 'samjae_simbeop');
  const simbeopDef = getArtDef('samjae_simbeop');
  const simbeopEquipped = equippedSimbeop === 'samjae_simbeop';

  // 초식 배율 정보
  const state = useGameStore.getState();
  const { multiplier: normalMult, cap: normalCap } = calcNormalMultiplier(state, 'samjae_sword');
  const effects = gatherMasteryEffects(state);

  function handleResetAllMasteries() {
    if (confirm('모든 초(招) 투자를 초기화하시겠습니까?')) {
      resetAllMasteries();
    }
  }

  return (
    <div>
      {/* 포인트 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span className="card-label" style={{ marginBottom: 0 }}>무공</span>
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

      {/* 삼재검법 카드 */}
      {swordDef && (
        <div className="card" style={{ marginBottom: 12, padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{swordDef.name}</span>
                <span className="badge-art-type badge-active">주공</span>
              </div>
            </div>
            {swordOwned && (
              swordEquipped ? (
                <button
                  className="btn btn-small btn-danger"
                  onClick={() => unequipArt('samjae_sword')}
                  disabled={battling}
                >
                  해제
                </button>
              ) : (
                <button
                  className="btn btn-small"
                  onClick={() => equipArt('samjae_sword')}
                  disabled={battling || availablePoints < swordDef.cost}
                >
                  장착
                </button>
              )
            )}
          </div>

          {swordOwned ? (
            <>
              {/* 초식 배율 */}
              <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 6 }}>
                초식 배율 {normalMult.toFixed(2)} / 상한 {normalCap.toFixed(1)}
              </div>

              {/* 절초 정보 */}
              {swordDef.ultMultiplier && (
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                  절초 배율 {swordDef.ultMultiplier.toFixed(1)}
                  {effects.ultChange?.simBonusW ? '+심 보정' : ''}
                  {' · '}코스트 {swordDef.ultCost}
                  {' · '}쿨타임 {swordDef.ultCooldown}초
                  {effects.unlockUlt ? '' : ' (미해금)'}
                </div>
              )}

              {/* 심득 */}
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
                심득 {swordOwned.totalSimdeuk}
              </div>

              {/* 초(招) 패널 */}
              <MasteryPanel
                artId="samjae_sword"
                totalSimdeuk={swordOwned.totalSimdeuk}
                tier={tier}
                discoveredMasteries={discoveredMasteries}
              />
            </>
          ) : (
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>미보유</div>
          )}
        </div>
      )}

      {/* 삼재심법 카드 */}
      {simbeopDef && (
        <div className="card" style={{ marginBottom: 12, padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{simbeopDef.name}</span>
                <span className="badge-art-type badge-passive">심법</span>
              </div>
            </div>
            {simbeopOwned && (
              simbeopEquipped ? (
                <button
                  className="btn btn-small btn-danger"
                  onClick={unequipSimbeop}
                  disabled={battling}
                >
                  해제
                </button>
              ) : (
                <button
                  className="btn btn-small"
                  onClick={() => equipSimbeop('samjae_simbeop')}
                  disabled={battling}
                >
                  장착
                </button>
              )
            )}
          </div>

          {simbeopOwned ? (
            <>
              {/* 기운 생산 정보 */}
              <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 6 }}>
                기운 생산 +{(calcQiPerSec(state) - BALANCE_PARAMS.BASE_QI_PER_SEC).toFixed(1)}/초
                {calcCombatQiRatio(state) > 0 && (
                  <span> · 전투 중 {(calcCombatQiRatio(state) * 100).toFixed(0)}%</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                내력 회복 보너스 +{((calcEffectiveRegen(state) - BALANCE_PARAMS.REGEN_BASE - BALANCE_PARAMS.REGEN_T_W * state.stats.che / (state.stats.che + BALANCE_PARAMS.REGEN_T_H))).toFixed(1)}/초
              </div>

              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
                심득 {simbeopOwned.totalSimdeuk}
              </div>

              <MasteryPanel
                artId="samjae_simbeop"
                totalSimdeuk={simbeopOwned.totalSimdeuk}
                tier={tier}
                discoveredMasteries={discoveredMasteries}
              />
            </>
          ) : (
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>미보유</div>
          )}
        </div>
      )}

      {battling && (
        <div className="battle-warning">
          전투 중에는 교체할 수 없습니다
        </div>
      )}
    </div>
  );
}

// ── 초(招) 패널 ──
function MasteryPanel({ artId, totalSimdeuk, tier, discoveredMasteries }: {
  artId: string;
  totalSimdeuk: number;
  tier: number;
  discoveredMasteries: string[];
}) {
  const activeMasteries = useGameStore(s => s.activeMasteries);
  const activateMastery = useGameStore(s => s.activateMastery);
  const deactivateMastery = useGameStore(s => s.deactivateMastery);
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

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.03)', fontSize: 12 }}>
      <div className="mastery-panel">
        <div className="mastery-panel-title">초(招)</div>

        {!isEquipped && currentActive.length > 0 && (
          <div className="mastery-unequipped-warn">효과 비활성 중 (미장착)</div>
        )}

        {masteries.map((m, idx) => {
          const isActive = currentActive.includes(m.id);
          const isDiscovered = !m.discovery || discoveredMasteries.includes(m.id);
          const availPts = getAvailablePoints();

          // 미발견: "???"
          if (!isDiscovered) {
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

          // 발견됨 — 상태 판별
          const simdeukMet = totalSimdeuk >= m.requiredSimdeuk;
          const tierMet = m.requiredTier === 0 || tier >= m.requiredTier;
          const requiresUnmet = m.requires ? m.requires.filter(rid => !currentActive.includes(rid)) : [];
          const prereqMet = requiresUnmet.length === 0;
          const canActivate = !isActive && simdeukMet && tierMet && prereqMet && availPts >= m.pointCost && isEquipped;

          let statusClass = 'mastery-locked-grade';
          if (isActive) statusClass = 'mastery-active';
          else if (simdeukMet && tierMet) statusClass = 'mastery-unlocked';
          else if (!tierMet) statusClass = 'mastery-locked-tier';

          return (
            <div key={m.id} className={`mastery-item ${statusClass}`}>
              <div className="mastery-item-header">
                <div className="mastery-item-left">
                  <span className="mastery-icon">
                    {isActive ? '☯' : (simdeukMet && tierMet) ? '☐' : '🔒'}
                  </span>
                  <span className={`mastery-name ${isActive ? 'mastery-name-active' : ''}`}
                    style={isActive ? { color: 'var(--gold)' } : undefined}
                  >
                    {m.stage}초 — {m.name}
                  </span>
                  <span className="mastery-cost">({m.pointCost}pt)</span>
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
                  {!isActive && simdeukMet && tierMet && (
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
                {!simdeukMet && (
                  <span className="mastery-lock-reason">심득 {totalSimdeuk}/{m.requiredSimdeuk} | </span>
                )}
                {simdeukMet && !tierMet && (
                  <span className="mastery-lock-reason">{getTierDef(m.requiredTier).name} 필요 | </span>
                )}
                {m.description}
              </div>
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
