/**
 * 무공/능력 탭 — v4.0
 * 삼재검법 + 삼재심법. 초식/절초/초(招) 패널.
 */
import { useState } from 'react';
import { useGameStore, calcQiPerSec, calcCombatQiRatio, calcEffectiveRegen, calcStaminaRegen, gatherMasteryEffects, getArtCurrentGrade, getProficiencyGrade } from '../store/gameStore';
import { getArtDef, getMasteryDefsForArt, getMasteryDef, type ArtDef, type MasteryDef, type ProficiencyType } from '../data/arts';
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

  const proficiency = useGameStore(s => s.proficiency);
  const state = useGameStore.getState();
  const effects = gatherMasteryEffects(state);

  const PROF_TYPE_LABEL: Record<ProficiencyType, string> = {
    sword: '검법', palm: '장법', footwork: '보법', mental: '심법',
  };

  const [swordExpanded, setSwordExpanded] = useState(false);
  const [simbeopExpanded, setSimbeopExpanded] = useState(false);
  const [expandedArts, setExpandedArts] = useState<Record<string, boolean>>({});


  function handleResetAllMasteries() {
    if (confirm('모든 초(招) 투자를 초기화하시겠습니까?')) {
      resetAllMasteries();
    }
  }

  // 장착 무공에서 사용되는 숙련도 타입만 추출 (중복 제거, 순서 유지)
  const equippedProfTypes = Array.from(new Set(
    [...equippedArts, ...(equippedSimbeop ? [equippedSimbeop] : [])]
      .map(id => getArtDef(id)?.proficiencyType)
      .filter((t): t is ProficiencyType => !!t)
  ));

  return (
    <div>
      {/* 숙련도 카드 */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-label">숙련도</div>
        {equippedProfTypes.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>장착한 무공이 없습니다.</div>
        )}
        {equippedProfTypes.map(pType => {
          const pVal = proficiency?.[pType] ?? 0;
          const pGrade = getProficiencyGrade(pVal);
          const gradeStart = (pGrade - 1) * 20000;
          const gradeEnd = pGrade * 20000;
          const pct = Math.min(100, ((pVal - gradeStart) / (gradeEnd - gradeStart)) * 100);
          return (
            <div key={pType} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <span style={{ fontSize: 12 }}>
                  {PROF_TYPE_LABEL[pType]}
                  <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 6 }}>{pGrade}등급</span>
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>???</span>
              </div>
              <div className="hp-bar-container">
                <div className="hp-bar-fill" style={{
                  width: `${pct}%`,
                  background: 'var(--gold)',
                  opacity: 0.85,
                }} />
              </div>
            </div>
          );
        })}
      </div>

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
      {swordDef && swordOwned && (() => {
        const prof = proficiency?.sword ?? 0;
        const normalDmg = (swordDef.baseDamage ?? 0) + Math.floor(swordDef.proficiencyCoefficient * prof);
        const normalCrit = Math.floor(normalDmg * 1.5);
        const showUlt = effects.unlockUlt && !!swordDef.ultMultiplier;
        const ultName = effects.ultChange?.name ?? '강한 내려치기';
        const ultDmg = (swordDef.ultBaseDamage ?? 0) + Math.floor((swordDef.ultMultiplier ?? 0) * prof);
        const ultCrit = Math.floor(ultDmg * 1.5);
        return (
          <div className="card" style={{ marginBottom: 12, padding: 12 }}>
            {/* 헤더 (항상 표시) */}
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setSwordExpanded(v => !v)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{swordDef.name}</span>
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  {getArtCurrentGrade('samjae_sword', activeMasteries)}등급
                </span>
                {/* 접혔을 때 데미지 요약 */}
                {!swordExpanded && (
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 4 }}>
                    피해 {normalDmg}
                    {showUlt && <span style={{ color: 'var(--gold)', marginLeft: 6 }}>/ {ultName} {ultDmg}</span>}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
                {swordEquipped ? (
                  <button className="btn btn-small btn-danger" onClick={() => unequipArt('samjae_sword')} disabled={battling}>해제</button>
                ) : (
                  <button className="btn btn-small" onClick={() => equipArt('samjae_sword')} disabled={battling || availablePoints < swordDef.cost}>장착</button>
                )}
                <span style={{ fontSize: 12, color: 'var(--text-dim)', padding: '0 4px' }}>
                  {swordExpanded ? '▲' : '▼'}
                </span>
              </div>
            </div>

            {/* 펼쳐진 내용 */}
            {swordExpanded && (
              <>
                {/* 무협 설명 */}
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8, fontStyle: 'italic', lineHeight: 1.6 }}>
                  하늘·땅·사람 삼재(三才)의 이치를 검에 담은 기초 검결.<br />
                  화려함 없이 순리를 따르되, 어떤 상황에서도 흔들림이 없다.
                </div>

                {/* 초식 데미지 */}
                <div style={{ marginTop: 10, padding: '7px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>삼재검법 · 초식</div>
                  <div style={{ fontSize: 16, fontWeight: 500 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)', marginRight: 6, fontWeight: 400 }}>피해</span>
                    {normalDmg.toLocaleString()}
                    <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 8, fontWeight: 400 }}>치명(致命) {normalCrit.toLocaleString()}</span>
                  </div>
                </div>

                {/* 절초 데미지 (해금 시) */}
                {showUlt && (
                  <div style={{ marginTop: 6, padding: '7px 10px', background: 'rgba(212,175,55,0.06)', borderRadius: 6, borderLeft: '2px solid var(--gold)' }}>
                    <div style={{ fontSize: 10, marginBottom: 4 }}>
                      <span style={{ color: 'var(--gold)' }}>{ultName} · 절초</span>
                      <span style={{ color: 'var(--text-dim)', marginLeft: 8 }}>내력 {swordDef.ultCost} · 쿨타임 {swordDef.ultCooldown}초</span>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 500 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-dim)', marginRight: 6, fontWeight: 400 }}>피해</span>
                      {ultDmg.toLocaleString()}
                      <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 8, fontWeight: 400 }}>치명(致命) {ultCrit.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                {/* 심득 */}
                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 8 }}>
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
            )}
          </div>
        );
      })()}

      {/* 삼재심법 카드 */}
      {simbeopDef && simbeopOwned && (() => {
        const qiBonus = (calcQiPerSec(state) - BALANCE_PARAMS.BASE_QI_PER_SEC).toFixed(1);
        const combatRatio = calcCombatQiRatio(state);
        const regenBonus = Math.max(0, calcEffectiveRegen(state) - calcStaminaRegen(state.stats.gi));
        return (
          <div className="card" style={{ marginBottom: 12, padding: 12 }}>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setSimbeopExpanded(v => !v)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{simbeopDef.name}</span>
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  {getArtCurrentGrade('samjae_simbeop', activeMasteries)}등급
                </span>
                {!simbeopExpanded && (
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 4 }}>
                    기운 +{qiBonus}/초
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
                {simbeopEquipped ? (
                  <button className="btn btn-small btn-danger" onClick={unequipSimbeop} disabled={battling}>해제</button>
                ) : (
                  <button className="btn btn-small" onClick={() => equipSimbeop('samjae_simbeop')} disabled={battling}>장착</button>
                )}
                <span style={{ fontSize: 12, color: 'var(--text-dim)', padding: '0 4px' }}>
                  {simbeopExpanded ? '▲' : '▼'}
                </span>
              </div>
            </div>

            {simbeopExpanded && (
              <>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8, fontStyle: 'italic', lineHeight: 1.6 }}>
                  삼재(三才)의 이치를 호흡 속에 녹여 천지자연의 기운과 하나 되는 수련법.<br />
                  마음이 고요해질수록 기운의 흐름이 맑아진다.
                </div>

                <div style={{ marginTop: 10, padding: '7px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>삼재심법 · 효과</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    기운 <span style={{ color: 'var(--gold)' }}>+{qiBonus}/초</span>
                    {combatRatio > 0 && (
                      <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 8, fontWeight: 400 }}>
                        전투 중 {(combatRatio * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  {regenBonus > 0 && (
                    <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>
                      내력 회복 <span style={{ color: 'var(--gold)' }}>+{regenBonus.toFixed(1)}/초</span>
                    </div>
                  )}
                </div>

                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 8 }}>
                  심득 {simbeopOwned.totalSimdeuk}
                </div>

                <MasteryPanel
                  artId="samjae_simbeop"
                  totalSimdeuk={simbeopOwned.totalSimdeuk}
                  tier={tier}
                  discoveredMasteries={discoveredMasteries}
                />
              </>
            )}
          </div>
        );
      })()}

      {/* 보법/기타 무공 카드 (동적) */}
      {ownedArts
        .filter(a => a.id !== 'samjae_sword' && a.id !== 'samjae_simbeop')
        .map(owned => {
          const def = getArtDef(owned.id);
          if (!def) return null;
          const isEquipped = equippedArts.includes(owned.id) || equippedSimbeop === owned.id;
          const unlockedCount = (activeMasteries[owned.id] ?? []).length;
          const expanded = expandedArts[owned.id] ?? false;
          const toggle = () => setExpandedArts(v => ({ ...v, [owned.id]: !v[owned.id] }));

          const stageDesc = def.descriptionByStage
            ? def.descriptionByStage[Math.min(unlockedCount, def.descriptionByStage.length - 1)]
            : undefined;

          // active 무공 데미지
          const prof = proficiency?.[def.proficiencyType] ?? 0;
          const normalDmg = (def.baseDamage ?? 0) + Math.floor(def.proficiencyCoefficient * prof);
          const normalCrit = Math.floor(normalDmg * 1.5);

          // 접힌 요약
          let collapsedSummary: string;
          if (def.artType === 'active') {
            collapsedSummary = `피해 ${normalDmg}`;
          } else {
            collapsedSummary = stageDesc ? stageDesc.slice(0, 24) + (stageDesc.length > 24 ? '…' : '') : '';
          }

          return (
            <div key={owned.id} className="card" style={{ marginBottom: 12, padding: 12 }}>
              {/* 헤더 */}
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={toggle}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{def.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                    {getArtCurrentGrade(owned.id, activeMasteries)}등급
                  </span>
                  {!expanded && collapsedSummary && (
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 4 }}>
                      {collapsedSummary}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
                  {isEquipped ? (
                    <button className="btn btn-small btn-danger" onClick={() => unequipArt(owned.id)} disabled={battling}>해제</button>
                  ) : (
                    <button className="btn btn-small" onClick={() => equipArt(owned.id)} disabled={battling || availablePoints < def.cost}>장착</button>
                  )}
                  <span style={{ fontSize: 12, color: 'var(--text-dim)', padding: '0 4px' }}>
                    {expanded ? '▲' : '▼'}
                  </span>
                </div>
              </div>

              {/* 펼친 내용 */}
              {expanded && (
                <>
                  {stageDesc && (
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8, fontStyle: 'italic', lineHeight: 1.6 }}>
                      {stageDesc}
                    </div>
                  )}

                  {def.artType === 'active' && (
                    <div style={{ marginTop: 10, padding: '7px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>{def.name} · 초식</div>
                      <div style={{ fontSize: 16, fontWeight: 500 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-dim)', marginRight: 6, fontWeight: 400 }}>피해</span>
                        {normalDmg.toLocaleString()}
                        <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 8, fontWeight: 400 }}>치명(致命) {normalCrit.toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 8 }}>
                    심득 {owned.totalSimdeuk}
                  </div>

                  <MasteryPanel
                    artId={owned.id}
                    totalSimdeuk={owned.totalSimdeuk}
                    tier={tier}
                    discoveredMasteries={discoveredMasteries}
                  />
                </>
              )}
            </div>
          );
        })}

      {/* 미보유 안내 */}
      {ownedArts.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', padding: '20px 0' }}>
          아직 익힌 무공이 없습니다.
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

          // Progressive reveal: 이전 단계가 발견되어야 다음 단계 ??? 표시
          const prevMastery = idx > 0 ? masteries[idx - 1] : null;
          const prevDiscovered = prevMastery
            ? (!prevMastery.discovery || discoveredMasteries.includes(prevMastery.id))
            : true; // stage 1은 항상 표시 가능

          // 미발견: 이전 단계 미발견이면 숨김, 발견됐으면 ??? 표시
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
