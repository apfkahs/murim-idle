/**
 * 전장 탭 — v1.1
 * 2단계 네비게이션 (전장목록 → 전장상세 → 전투)
 * 몬스터 정보 숨김 시스템 (getMonsterRevealLevel)
 * DPS 제거, 타이머 기반
 */
import { useEffect, useRef, useState } from 'react';
import { useGameStore, getMonsterRevealLevel, calcStamina } from '../store/gameStore';
import { getMonsterDef, YASAN_MONSTERS, INN_MONSTERS, BOSS_PATTERNS, type MonsterDef } from '../data/monsters';
import { getArtDef } from '../data/arts';
import { formatNumber } from '../utils/format';
import { getEnemyImage, getEnemyEmoji, getPlayerByTier, getFieldBackground } from '../assets';
import { getFieldDef } from '../data/fields';

const FIELD_DESCRIPTIONS: Record<string, string> = {
  training: '스승이 세워둔 수련 인형들이 묵묵히 서 있다.',
  yasan: '야생의 기운이 감도는 울창한 산길. 무엇이 나올지 모른다.',
  inn: '삐걱거리는 나무 바닥, 수상한 눈빛들. 방심하면 안 된다.',
};

export default function BattleTab() {
  const battleMode = useGameStore(s => s.battleMode);
  const battleResult = useGameStore(s => s.battleResult);

  if (battleResult) return <BattleResultScreen />;
  if (battleMode !== 'none') return <BattleScreen />;
  return <FieldNavigation />;
}

// ─────────────────────────────────────────────
// 2단계 네비게이션: 전장 목록 → 전장 상세
// ─────────────────────────────────────────────
function FieldNavigation() {
  const [selectedField, setSelectedField] = useState<string | null>(null);

  if (selectedField) {
    return <FieldDetailScreen fieldId={selectedField} onBack={() => setSelectedField(null)} />;
  }
  return <FieldListScreen onSelect={setSelectedField} />;
}

// ─────────────────────────────────────────────
// 1단계: 전장 목록 (4장)
// ─────────────────────────────────────────────
function FieldListScreen({ onSelect }: { onSelect: (id: string) => void }) {
  const fieldUnlocks = useGameStore(s => s.fieldUnlocks);
  const killCounts = useGameStore(s => s.killCounts);

  return (
    <div>
      <div className="card-label" style={{ padding: '0 4px', marginBottom: 8 }}>전장</div>

      {/* 수련장 */}
      <div
        className="card field-card"
        onClick={() => onSelect('training')}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontWeight: 500, fontSize: 13 }}>수련장</span>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>무공의 기초를 다지는 곳 · 지정사냥</div>
          </div>
          <span style={{ fontSize: 14, opacity: 0.3 }}>→</span>
        </div>
      </div>

      {/* 야산 */}
      {fieldUnlocks.yasan ? (
        <div
          className="card field-card"
          onClick={() => onSelect('yasan')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontWeight: 500, fontSize: 13 }}>야산</span>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                수련장 너머 펼쳐진 야산 · {Object.keys(killCounts).filter(id =>
                  YASAN_MONSTERS.some(m => m.id === id) && killCounts[id] > 0
                ).length > 0 ? (
                  `${YASAN_MONSTERS.filter(m => (killCounts[m.id] ?? 0) > 0).length}종 발견`
                ) : '???'}
              </div>
            </div>
            <span style={{ fontSize: 14, opacity: 0.3 }}>→</span>
          </div>
        </div>
      ) : (
        <div className="card field-card locked">
          <span style={{ fontWeight: 500, fontSize: 13 }}>🔒 야산</span>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
            삼재검법과 삼재심법을 장착해야 해금됩니다
          </div>
        </div>
      )}

      {/* 허름한 객잔 */}
      {fieldUnlocks.inn ? (
        <div
          className="card field-card"
          onClick={() => onSelect('inn')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontWeight: 500, fontSize: 13 }}>허름한 객잔</span>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                산길 끝 허름한 주막 · {INN_MONSTERS.filter(m => (killCounts[m.id] ?? 0) > 0).length > 0
                  ? `${INN_MONSTERS.filter(m => (killCounts[m.id] ?? 0) > 0).length}종 발견`
                  : '???'}
              </div>
            </div>
            <span style={{ fontSize: 14, opacity: 0.3 }}>→</span>
          </div>
        </div>
      ) : fieldUnlocks.yasan ? (
        <div className="card field-card locked">
          <span style={{ fontWeight: 500, fontSize: 13 }}>🔒 ???</span>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
            아직 발견하지 못한 전장
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getMonsterHint(mon: MonsterDef, revealLevel: number): string {
  if (revealLevel < 1) return '';
  const power = mon.hp * mon.attackPower / mon.attackInterval;
  if (power > 8000) return '압도적인 위압감이 느껴진다';
  if (power > 3000) return '상당히 위험해 보인다';
  if (power > 1000) return '만만치 않은 상대다';
  if (power > 300) return '위협적이다';
  if (power > 100) return '조심해야 한다';
  return '약해 보인다';
}

// ─────────────────────────────────────────────
// 2단계: 전장 상세 (4장 + 3장 정보 숨김)
// ─────────────────────────────────────────────
function FieldDetailScreen({ fieldId, onBack }: { fieldId: string; onBack: () => void }) {
  const startExplore = useGameStore(s => s.startExplore);
  const startHunt = useGameStore(s => s.startHunt);
  const killCounts = useGameStore(s => s.killCounts);
  const bossKillCounts = useGameStore(s => s.bossKillCounts);
  const hiddenRevealedInField = useGameStore(s => s.hiddenRevealedInField);

  const field = getFieldDef(fieldId);
  if (!field) return null;

  const isTraining = field.isTraining;
  const fieldName = field.name;
  const fieldDesc = FIELD_DESCRIPTIONS[fieldId] ?? '';
  const bgUrl = getFieldBackground(fieldId);

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
            <button className="btn btn-small btn-gold" onClick={() => startExplore(fieldId)}>답파</button>
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

        {/* 보스 */}
        {boss && (
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
        )}

        {/* 히든 몬스터 */}
        {field.hiddenMonsters.length > 0 && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.03)' }}>
            {(() => {
              const revealedId = hiddenRevealedInField[fieldId];
              if (revealedId) {
                const hiddenMon = getMonsterDef(revealedId);
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

// ─────────────────────────────────────────────
// 전투 화면 (v1.1: DPS 제거, 공격 간격 표시)
// ─────────────────────────────────────────────
function BattleScreen() {
  const battleMode = useGameStore(s => s.battleMode);
  const currentEnemy = useGameStore(s => s.currentEnemy);
  const currentField = useGameStore(s => s.currentField);
  const exploreStep = useGameStore(s => s.exploreStep);
  const exploreOrder = useGameStore(s => s.exploreOrder);
  const isBossPhase = useGameStore(s => s.isBossPhase);
  const bossTimer = useGameStore(s => s.bossTimer);
  const hp = useGameStore(s => s.hp);
  const maxHp = useGameStore(s => s.maxHp);
  const stamina = useGameStore(s => s.stamina);
  const stats = useGameStore(s => s.stats);
  const equippedArts = useGameStore(s => s.equippedArts);
  const equippedSimbeop = useGameStore(s => s.equippedSimbeop);
  const ownedArts = useGameStore(s => s.ownedArts);
  const battleLog = useGameStore(s => s.battleLog);
  const abandonBattle = useGameStore(s => s.abandonBattle);
  const getAttackInterval = useGameStore(s => s.getAttackInterval);
  const killCounts = useGameStore(s => s.killCounts);
  const tier = useGameStore(s => s.tier);
  const bossPatternState = useGameStore(s => s.bossPatternState);
  const playerStunTimer = useGameStore(s => s.playerStunTimer);
  const currentBattleDuration = useGameStore(s => s.currentBattleDuration);
  const currentBattleDamageDealt = useGameStore(s => s.currentBattleDamageDealt);

  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [battleLog.length]);

  if (!currentEnemy) return null;

  const monDef = getMonsterDef(currentEnemy.id);
  const kills = killCounts[currentEnemy.id] ?? 0;
  const reveal = getMonsterRevealLevel(kills);
  // 전투 중 이름: 1회 이상 처치했으면 이름, 아니면 ???
  const enemyName = reveal >= 1 ? (monDef?.name ?? currentEnemy.id) : '???';
  const atkInterval = getAttackInterval();
  const playerDps = currentBattleDuration >= 1
    ? Math.floor(currentBattleDamageDealt / currentBattleDuration)
    : 0;
  const maxStamina = calcStamina(stats.sim);
  const enemyImg = getEnemyImage(currentEnemy.id);
  const player = getPlayerByTier(tier);
  const bgUrl = currentField ? getFieldBackground(currentField) : null;

  const isExplore = battleMode === 'explore';

  return (
    <div className="battle-layout">
      {/* 상단 바 */}
      <div className="battle-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>
            {currentField === 'training' ? '수련장' : currentField === 'inn' ? '허름한 객잔' : '야산'}
          </span>
          {isExplore && (
            <span className="badge badge-gold" style={{ fontSize: 11, padding: '2px 8px' }}>
              {isBossPhase ? '보스전' : `답파 ${exploreStep + 1}/${exploreOrder.length}`}
            </span>
          )}
          {!isExplore && (
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>지정 사냥</span>
          )}
        </div>
        <button className="btn btn-small btn-danger" onClick={abandonBattle}>포기</button>
      </div>

      {/* 전투 장면 */}
      <div className={`battle-scene ${isBossPhase ? 'boss-darken' : ''}`}>
        <div
          className="battle-scene-bg"
          style={bgUrl ? { backgroundImage: `url(${bgUrl})` } : {
            background: 'linear-gradient(135deg, rgba(20,20,40,0.8), rgba(12,12,20,0.95))',
          }}
        />

        <div className="battle-scene-content">
          {isBossPhase && bossTimer > 0 && (
            <div className="boss-timer-bar" style={{ marginBottom: 12 }}>
              <div className="boss-timer-fill" style={{ width: `${(bossTimer / 60) * 100}%` }} />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', minHeight: 120 }}>
            <div className="anim-attack" style={{ textAlign: 'center' }}>
              {player.url ? (
                <img src={player.url} alt="캐릭터" className="battle-char" />
              ) : (
                <span className="battle-char-emoji">{player.emoji}</span>
              )}
            </div>

            <div style={{ fontSize: 16, opacity: 0.3, color: 'var(--text-dim)' }}>⚔</div>

            <div className={isBossPhase ? 'anim-boss' : ''} style={{ textAlign: 'center' }}>
              {enemyImg ? (
                <img src={enemyImg} alt={enemyName} className="battle-char" />
              ) : (
                <span className="battle-char-emoji">{getEnemyEmoji(currentEnemy.id)}</span>
              )}
            </div>
          </div>

          {/* HP 바 오버레이 */}
          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: 'var(--text-dim)', marginBottom: 2 }}>HP {Math.floor(hp)}/{maxHp}</div>
              <div className="hp-bar-container">
                <div className="hp-bar-fill" style={{ width: `${(hp / maxHp) * 100}%` }} />
              </div>
              {/* 스턴 표시 */}
              {playerStunTimer > 0 && (
                <div style={{ fontSize: 11, color: '#ff4444', fontWeight: 600, marginTop: 4 }}>
                  경직! ({playerStunTimer.toFixed(1)}초)
                </div>
              )}
              {/* 내력 게이지 */}
              {maxStamina > 0 && (
                <div style={{ marginTop: 4 }}>
                  <div style={{ fontSize: 9, color: 'var(--text-dim)', marginBottom: 2 }}>내력 {Math.floor(stamina)}/{maxStamina}</div>
                  <div className="hp-bar-container">
                    <div className="hp-bar-fill" style={{
                      width: `${(stamina / maxStamina) * 100}%`,
                      background: 'var(--blue, #4a9eff)',
                    }} />
                  </div>
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: 'var(--text-dim)', marginBottom: 2, textAlign: 'right' }}>{enemyName}</div>
              <div className="hp-bar-container">
                <div className="hp-bar-fill enemy-hp-fill" style={{
                  width: `${Math.max(0, (currentEnemy.hp / currentEnemy.maxHp) * 100)}%`
                }} />
              </div>
              {/* 적 HP 수치: reveal < 2이면 ???/??? */}
              <div style={{ fontSize: 9, color: 'var(--text-dim)', textAlign: 'right', marginTop: 1 }}>
                {reveal >= 2
                  ? `${Math.max(0, Math.floor(currentEnemy.hp))}/${currentEnemy.maxHp}`
                  : '???/???'
                }
              </div>
              {/* 보스 내력 바 */}
              {bossPatternState != null && BOSS_PATTERNS[currentEnemy.id] && (
                <div style={{ marginTop: 4 }}>
                  <div style={{ fontSize: 9, color: 'var(--text-dim)', marginBottom: 2, textAlign: 'right' }}>
                    내력 {Math.floor(bossPatternState.bossStamina)}/{BOSS_PATTERNS[currentEnemy.id].stamina.max}
                  </div>
                  <div className="hp-bar-container">
                    <div className="hp-bar-fill" style={{
                      width: `${(bossPatternState.bossStamina / BOSS_PATTERNS[currentEnemy.id].stamina.max) * 100}%`,
                      background: 'var(--gold, #d4a853)',
                    }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 내 스탯 바 */}
      <div className="info-bar">
        <div className="info-bar-item">
          <div className="info-bar-value">{formatNumber(maxHp)}</div>
          <div className="info-bar-label">최대HP</div>
        </div>
        <div className="info-bar-item">
          <div className="info-bar-value">{formatNumber(playerDps)}</div>
          <div className="info-bar-label">DPS</div>
        </div>
        <div className="info-bar-item">
          <div className="info-bar-value">{maxStamina > 0 ? formatNumber(maxStamina) : '-'}</div>
          <div className="info-bar-label">최대내력</div>
        </div>
        <div className="info-bar-item">
          <div className="info-bar-value">{atkInterval.toFixed(1)}초</div>
          <div className="info-bar-label">공격속도</div>
        </div>
      </div>

      {/* 적 스탯 바 */}
      <div className="info-bar" style={{ borderTop: '1px solid var(--border)', opacity: 0.85 }}>
        <div className="info-bar-item">
          <div className="info-bar-value">
            {reveal >= 2 ? formatNumber(currentEnemy.maxHp) : '???'}
          </div>
          <div className="info-bar-label">적 최대HP</div>
        </div>
        <div className="info-bar-item">
          <div className="info-bar-value">
            {reveal >= 4
              ? (currentEnemy.attackInterval > 0
                  ? formatNumber(Math.floor(currentEnemy.attackPower / currentEnemy.attackInterval))
                  : '-')
              : '???'}
          </div>
          <div className="info-bar-label">적 DPS</div>
        </div>
        <div className="info-bar-item">
          <div className="info-bar-value">
            {reveal >= 4
              ? (BOSS_PATTERNS[currentEnemy.id]
                  ? formatNumber(BOSS_PATTERNS[currentEnemy.id].stamina.max)
                  : '-')
              : '???'}
          </div>
          <div className="info-bar-label">적 최대내력</div>
        </div>
        <div className="info-bar-item">
          <div className="info-bar-value">
            {reveal >= 4
              ? (currentEnemy.attackInterval > 0
                  ? currentEnemy.attackInterval.toFixed(1) + '초'
                  : '-')
              : '???'}
          </div>
          <div className="info-bar-label">적 공격속도</div>
        </div>
      </div>

      {/* 답파 진행 바 */}
      {isExplore && !isBossPhase && (
        <div style={{ padding: '4px 0' }}>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${((exploreStep + 1) / (exploreOrder.length + 1)) * 100}%` }} />
          </div>
        </div>
      )}

      {/* 전투 로그 */}
      <div className="battle-log" ref={logRef} style={{ flex: 1, minHeight: 0 }}>
        {battleLog.map((log, i) => {
          let cls = 'battle-log-line';
          if (log.startsWith('비기 — 태산압정')) {
            cls += ' log-ult-taesan';
          } else if (log.startsWith('절초 —')) {
            cls += ' log-ult';
          } else if (log.startsWith('—') || log.includes('등장') || log.includes('처치') || log.includes('사냥 시작')) {
            cls += ' log-system';
          } else if (log.includes('치명타') || log.includes('연속') || log.includes('피했다') || log.includes('📜') || log.includes('보스') || log.includes('승리') || log.includes('업적') || log.endsWith('..')) {
            cls += ' log-gold';
          }
          return <div key={i} className={cls}>{log}</div>;
        })}
      </div>

      {/* 무공 칩 바 */}
      <div className="chip-bar">
        {equippedArts.map(artId => {
          const def = getArtDef(artId);
          const owned = ownedArts.find(a => a.id === artId);
          if (!def || !owned) return null;
          return (
            <span key={artId} className="chip">
              {def.name}
            </span>
          );
        })}
        {equippedSimbeop && (() => {
          const def = getArtDef(equippedSimbeop);
          const owned = ownedArts.find(a => a.id === equippedSimbeop);
          if (!def || !owned) return null;
          return (
            <span className="chip chip-simbeop">
              {def.name}
            </span>
          );
        })()}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 전투 결과 화면
// ─────────────────────────────────────────────
function BattleResultScreen() {
  const battleResult = useGameStore(s => s.battleResult);
  const dismissBattleResult = useGameStore(s => s.dismissBattleResult);
  const healWithQi = useGameStore(s => s.healWithQi);
  const hp = useGameStore(s => s.hp);
  const maxHp = useGameStore(s => s.maxHp);
  const qi = useGameStore(s => s.qi);
  const pendingHuntRetry = useGameStore(s => s.pendingHuntRetry);
  const huntTarget = useGameStore(s => s.huntTarget);

  if (!battleResult) return null;

  const isWin = battleResult.type === 'explore_win';
  const isDeath = battleResult.type === 'death';

  return (
    <div className="card battle-result">
      <div className={`battle-result-title ${isWin ? 'win' : isDeath ? 'lose' : ''}`}>
        {isWin ? '승리!' : isDeath ? '패배...' : '전투 종료'}
      </div>

      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
        {battleResult.message}
      </div>

      {battleResult.deathLog && (
        <div style={{ fontSize: 12, color: '#ff6666', marginBottom: 8, fontStyle: 'italic' }}>
          {battleResult.deathLog}
        </div>
      )}

      {battleResult.simdeuk > 0 && (
        <div style={{ color: 'var(--gold)', marginBottom: 4, fontSize: 14 }}>
          심득 +{battleResult.simdeuk}
        </div>
      )}

      {battleResult.drops.length > 0 && (
        <div style={{ color: 'var(--gold)', marginBottom: 8, fontSize: 13 }}>
          {battleResult.drops.map(id => getArtDef(id)?.name ?? id).join(', ')} 획득! 전낭에 담겼습니다.
        </div>
      )}

      {battleResult.type === 'hunt_end' && pendingHuntRetry && huntTarget && (
        <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(255,160,0,0.08)', border: '1px solid rgba(255,160,0,0.3)', borderRadius: 4, fontSize: 12 }}>
          <div style={{ color: 'var(--gold)', marginBottom: 4 }}>
            ⟳ 체력 회복 후 자동 재도전...
          </div>
          <div style={{ color: 'var(--text-dim)' }}>
            {getMonsterDef(huntTarget)?.name ?? huntTarget}와의 전투를 재개합니다.
          </div>
        </div>
      )}

      {hp < maxHp && (
        <div style={{ marginTop: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>
            HP {Math.floor(hp)}/{maxHp}
          </div>
          <button
            className="btn btn-small"
            onClick={healWithQi}
            disabled={qi < 1}
          >
            기운으로 HP 회복
          </button>
        </div>
      )}

      <button className="btn battle-result-actions" onClick={dismissBattleResult}>
        {pendingHuntRetry ? '닫기 (재도전 취소)' : '돌아가기'}
      </button>
    </div>
  );
}
