/**
 * 무공/능력 탭 — v4.0
 * 삼재검법 + 삼재심법. 초식/절초/초(招) 패널.
 */
import { useState } from 'react';
import { useGameStore, calcQiPerSec, calcCombatQiRatio, calcEffectiveRegen, calcStaminaRegen, gatherMasteryEffects, getArtCurrentGrade, getProfStarInfo, getProfDamageValue, getArtGradeInfo, getArtDamageMultiplier, getGradeTableForArt, getArtGradeInfoFromTable } from '../store/gameStore';
import { getArtDef, type ProficiencyType } from '../data/arts';
import { BALANCE_PARAMS } from '../data/balance';
import ArtGradeBar from './arts/ArtGradeBar';
import { MasteryPanel } from './arts/MasteryPanel';
import { formatPassiveEffectSummary, PROF_STAGE_LABELS, STAR_HANJA, GRADE_KOREAN } from './arts/artsUtils';

function getSamjaeGradeDisplay(cumExp: number): string {
  const artDef = getArtDef('samjae_simbeop')!;
  const table = getGradeTableForArt(artDef);
  const { starIndex } = getArtGradeInfoFromTable(cumExp, table);
  const maxStar = table.length;
  const star = Math.min(starIndex, maxStar);
  return star >= maxStar ? `${star}성 完` : `${star}성`;
}

export default function ArtsTab() {
  const ownedArts = useGameStore(s => s.ownedArts);
  const equippedArts = useGameStore(s => s.equippedArts);
  const equippedSimbeop = useGameStore(s => s.equippedSimbeop);
  const artPoints = useGameStore(s => s.artPoints);
  const tier = useGameStore(s => s.tier);
  const battleMode = useGameStore(s => s.battleMode);
  const activeMasteries = useGameStore(s => s.activeMasteries);
  const discoveredMasteries = useGameStore(s => s.discoveredMasteries);
  const artGradeExp = useGameStore(s => s.artGradeExp);
  const materials = useGameStore(s => s.materials);
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

  const calcQiForArt = (artId: string) =>
    calcQiPerSec({ ...state, equippedSimbeop: artId }) - BALANCE_PARAMS.BASE_QI_PER_SEC;
  const calcCombatRatioForArt = (artId: string) =>
    calcCombatQiRatio({ ...state, equippedSimbeop: artId });
  const calcRegenBonusForArt = (artId: string) =>
    Math.max(0, calcEffectiveRegen({ ...state, equippedSimbeop: artId }) - calcStaminaRegen(state.stats.gi));

  const PROF_TYPE_LABEL: Record<ProficiencyType, string> = {
    sword: '검법', palm: '장법', footwork: '보법', mental: '심법', fist: '권법',
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
          const cumExp = proficiency?.[pType] ?? 0;
          const { stageIndex, star, starIndex, progress, isFinal } = getProfStarInfo(cumExp);
          const isMax = isFinal === true;
          const stageLabel = PROF_STAGE_LABELS[stageIndex];
          const starLabel = STAR_HANJA[star - 1];

          return (
            <div key={pType} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <span style={{ fontSize: 13 }}>
                  {PROF_TYPE_LABEL[pType]}
                  <span style={{ color: 'var(--gold)', marginLeft: 4, fontSize: 11 }}>
                    {isFinal ? '終' : stageLabel}
                  </span>
                </span>
                <span style={{ fontSize: 16, color: 'var(--gold)', fontFamily: "'Ma Shan Zheng', serif" }}>
                  {isFinal ? '終' : `${starLabel}星`}
                </span>
              </div>
              <div className="hp-bar-container">
                <div className="hp-bar-fill" style={{ width: `${progress * 100}%`, background: 'var(--gold)', opacity: 0.85 }} />
              </div>
              <div style={{ textAlign: 'right', fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
                {isMax ? '終' : `${(progress * 100).toFixed(1)}%`}
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
        const swordGradeMult = getArtDamageMultiplier(swordDef, artGradeExp['samjae_sword'] ?? 0, activeMasteries['samjae_sword'] ?? []);
        const normalDmg = Math.floor(((swordDef.baseDamage ?? 0) + Math.floor(swordDef.proficiencyCoefficient * getProfDamageValue(prof))) * swordGradeMult);
        const normalCrit = Math.floor(normalDmg * 1.5);
        const showUlt = effects.unlockUlt && !!swordDef.ultMultiplier;
        const ultName = effects.ultChange?.name ?? '강한 내려치기';
        const ultDmg = Math.floor(((swordDef.ultBaseDamage ?? 0) + Math.floor((swordDef.ultMultiplier ?? 0) * getProfDamageValue(prof))) * swordGradeMult);
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
                  {GRADE_KOREAN[getArtCurrentGrade('samjae_sword', artGradeExp) - 1]}
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

                {/* 등급 진행 바 */}
                <ArtGradeBar artId="samjae_sword" artGradeExp={artGradeExp} />

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

                {/* 초(招) 패널 */}
                <MasteryPanel
                  artId="samjae_sword"
                  artGradeExp={artGradeExp['samjae_sword'] ?? 0}
                  materials={materials}
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
        const qiBonus = calcQiForArt('samjae_simbeop').toFixed(1);
        const combatRatio = calcCombatRatioForArt('samjae_simbeop');
        const regenBonus = calcRegenBonusForArt('samjae_simbeop');
        return (
          <div className="card" style={{ marginBottom: 12, padding: 12 }}>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setSimbeopExpanded(v => !v)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{simbeopDef.name}</span>
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  {getSamjaeGradeDisplay(artGradeExp['samjae_simbeop'] ?? 0)}
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

                {/* 등급 진행 바 */}
                <ArtGradeBar artId="samjae_simbeop" artGradeExp={artGradeExp} />

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

                <MasteryPanel
                  artId="samjae_simbeop"
                  artGradeExp={artGradeExp['samjae_simbeop'] ?? 0}
                  materials={materials}
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
          const artGradeMult = getArtDamageMultiplier(def, artGradeExp[owned.id] ?? 0, activeMasteries[owned.id] ?? []);
          const normalDmg = Math.floor(((def.baseDamage ?? 0) + Math.floor(def.proficiencyCoefficient * getProfDamageValue(prof))) * artGradeMult);
          const normalCrit = Math.floor(normalDmg * 1.5);

          // 접힌 요약
          let collapsedSummary: string;
          if (def.artType === 'active') {
            collapsedSummary = `피해 ${normalDmg}`;
          } else if (def.artType === 'passive') {
            collapsedSummary = formatPassiveEffectSummary(def, activeMasteries[owned.id] ?? []);
          } else if (def.artType === 'simbeop') {
            collapsedSummary = `기운 +${calcQiForArt(owned.id).toFixed(1)}/초`;
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
                  {def.growth.gradeMaxStars && (
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                      {GRADE_KOREAN[getArtCurrentGrade(owned.id, artGradeExp) - 1]}
                    </span>
                  )}
                  {!expanded && collapsedSummary && (
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 4 }}>
                      {collapsedSummary}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
                  {isEquipped ? (
                    <button className="btn btn-small btn-danger" onClick={() => def.artType === 'simbeop' ? unequipSimbeop() : unequipArt(owned.id)} disabled={battling}>해제</button>
                  ) : (
                    <button className="btn btn-small" onClick={() => def.artType === 'simbeop' ? equipSimbeop(owned.id) : equipArt(owned.id)} disabled={battling || (def.artType !== 'simbeop' && availablePoints < def.cost)}>장착</button>
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

                  {/* 등급 진행 바 (성급 시스템 있는 무공만) */}
                  {def.growth.gradeMaxStars && <ArtGradeBar artId={owned.id} artGradeExp={artGradeExp} />}

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

                  {def.artType === 'passive' && (() => {
                    const summary = formatPassiveEffectSummary(def, activeMasteries[owned.id] ?? []);
                    return summary ? (
                      <div style={{ marginTop: 10, padding: '7px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>패시브 효과</div>
                        <div style={{ fontSize: 13, color: 'var(--accent)' }}>{summary}</div>
                      </div>
                    ) : null;
                  })()}

                  {def.artType === 'simbeop' && (() => {
                    const qiBonus = calcQiForArt(owned.id).toFixed(1);
                    const combatRatio = calcCombatRatioForArt(owned.id);
                    const regenBonus = calcRegenBonusForArt(owned.id);
                    return (
                      <div style={{ marginTop: 10, padding: '7px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>{def.name} · 효과</div>
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
                        {def.proficiencyGainMultiplier != null && def.proficiencyGainMultiplier !== 1 && (
                          <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>
                            숙련도 획득 <span style={{ color: 'var(--text-danger, #e06c75)' }}>×{def.proficiencyGainMultiplier}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <MasteryPanel
                    artId={owned.id}
                    artGradeExp={artGradeExp[owned.id] ?? 0}
                    materials={materials}
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
