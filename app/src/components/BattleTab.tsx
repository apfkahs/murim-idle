/**
 * 전장 탭 — v1.1
 * 2단계 네비게이션 (전장목록 → 전장상세 → 전투)
 * 몬스터 정보 숨김 시스템 (getMonsterRevealLevel)
 * DPS 제거, 타이머 기반
 */
import { useEffect, useRef, useState } from 'react';
import { useGameStore, getMonsterRevealLevel } from '../store/gameStore';
import { getMonsterDef, TRAINING_MONSTERS, YASAN_MONSTERS, YASAN_BOSS, type MonsterDef } from '../data/monsters';
import { getArtDef, getArtGrade } from '../data/arts';
import { formatNumber } from '../utils/format';
import { getEnemyImage, getEnemyEmoji, getPlayerByTier, getFieldBackground } from '../assets';
import { getFieldDef, FIELDS } from '../data/fields';
import Stars from './Stars';

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
  const tutorialFlags = useGameStore(s => s.tutorialFlags);
  const killCounts = useGameStore(s => s.killCounts);

  return (
    <div>
      <div className="card-label" style={{ padding: '0 4px', marginBottom: 8 }}>전장</div>

      {/* 수련장 */}
      <div
        className="card"
        style={{ cursor: 'pointer' }}
        onClick={() => onSelect('training')}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontWeight: 500, fontSize: 13 }}>수련장</span>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>답파불가 · 지정사냥</div>
          </div>
          <span style={{ fontSize: 14, opacity: 0.3 }}>→</span>
        </div>
      </div>

      {/* 야산 */}
      {tutorialFlags.yasanUnlocked ? (
        <div
          className="card"
          style={{ cursor: 'pointer' }}
          onClick={() => onSelect('yasan')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontWeight: 500, fontSize: 13 }}>야산</span>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                {Object.keys(killCounts).filter(id =>
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
        <div className="card" style={{ opacity: 0.4 }}>
          <span style={{ fontWeight: 500, fontSize: 13 }}>야산</span>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
            삼재검법과 삼재심법을 장착해야 해금됩니다
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// 2단계: 전장 상세 (4장 + 3장 정보 숨김)
// ─────────────────────────────────────────────
function FieldDetailScreen({ fieldId, onBack }: { fieldId: string; onBack: () => void }) {
  const startExplore = useGameStore(s => s.startExplore);
  const startHunt = useGameStore(s => s.startHunt);
  const killCounts = useGameStore(s => s.killCounts);

  const field = getFieldDef(fieldId);
  if (!field) return null;

  const isTraining = field.isTraining;
  const fieldName = field.name;

  // 전장의 몬스터 목록
  const monsters = field.monsters.map(id => getMonsterDef(id)).filter(Boolean) as MonsterDef[];

  // 보스
  const boss = field.boss ? getMonsterDef(field.boss) : null;

  return (
    <div>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{ fontSize: 14, cursor: 'pointer', opacity: 0.6 }}
            onClick={onBack}
          >
            ←
          </span>
          <span style={{ fontWeight: 500, fontSize: 14 }}>{fieldName}</span>
        </div>
        {field.canExplore && (
          <button className="btn btn-small btn-gold" onClick={() => startExplore(fieldId)}>답파</button>
        )}
      </div>

      {/* 몬스터 목록 */}
      <div className="card">
        {monsters.map(mon => {
          const kills = killCounts[mon.id] ?? 0;
          const reveal = getMonsterRevealLevel(kills);

          // 수련장은 정보 숨김 없음
          if (isTraining) {
            return (
              <div key={mon.id} className="stat-row">
                <div>
                  <span style={{ fontSize: 13 }}>{mon.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 8 }}>
                    HP{mon.hp} {mon.regen > 0 ? `회복${mon.regen}/초` : ''}
                  </span>
                  {kills > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--green)', marginLeft: 6 }}>처치완료</span>
                  )}
                </div>
                <button className="btn btn-small" onClick={() => startHunt(fieldId, mon.id)}>사냥</button>
              </div>
            );
          }

          // 야산: 정보 숨김 적용
          if (reveal === 0) {
            // 미조우
            return (
              <div key={mon.id} className="stat-row" style={{ opacity: 0.3 }}>
                <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>???</span>
              </div>
            );
          }

          return (
            <div key={mon.id} className="stat-row">
              <div>
                <span style={{ fontSize: 13 }}>{reveal >= 1 ? mon.name : '???'}</span>
                <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 8 }}>
                  HP{reveal >= 2 ? mon.hp : '???'}{' '}
                  공{reveal >= 3 ? mon.attackPower : '???'}
                  {reveal >= 4 ? ` 간격${mon.attackInterval}초` : ''}
                </span>
                {reveal >= 5 && mon.drops.length > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--gold)', marginLeft: 6 }}>
                    드롭:{mon.drops.map(d => {
                      const a = getArtDef(d.artId);
                      return `${a?.name ?? d.artId} ${Math.round(d.chance * 100)}%`;
                    }).join(', ')}
                  </span>
                )}
                {reveal >= 5 && mon.drops.length === 0 && (
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 6 }}>드롭:없음</span>
                )}
              </div>
              {reveal >= 1 && (
                <button className="btn btn-small" onClick={() => startHunt(fieldId, mon.id)}>사냥</button>
              )}
            </div>
          );
        })}

        {/* 보스 */}
        {boss && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.03)' }}>
            {(() => {
              const bossKills = killCounts[boss.id] ?? 0;
              const bossReveal = getMonsterRevealLevel(bossKills);
              return (
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  보스: {bossReveal >= 1 ? boss.name : '???'}
                  {bossReveal >= 2 ? ` HP${boss.hp}` : ''}
                  {bossReveal >= 3 ? ` 공${boss.attackPower}` : ''}
                  {field.bossTimer ? ` / ${field.bossTimer}초` : ''}
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
  const neigong = useGameStore(s => s.neigong);
  const equippedArts = useGameStore(s => s.equippedArts);
  const equippedSimbeop = useGameStore(s => s.equippedSimbeop);
  const ownedArts = useGameStore(s => s.ownedArts);
  const battleLog = useGameStore(s => s.battleLog);
  const abandonBattle = useGameStore(s => s.abandonBattle);
  const getAttackInterval = useGameStore(s => s.getAttackInterval);
  const getTotalStats = useGameStore(s => s.getTotalStats);
  const killCounts = useGameStore(s => s.killCounts);
  const tier = useGameStore(s => s.tier);

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
  const totalStats = getTotalStats();
  const enemyImg = getEnemyImage(currentEnemy.id);
  const player = getPlayerByTier(tier);
  const bgUrl = currentField ? getFieldBackground(currentField) : null;

  const isExplore = battleMode === 'explore';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      {/* 상단 바 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, padding: '0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>
            {currentField === 'training' ? '수련장' : '야산'}
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
              <div style={{ fontSize: 9, color: 'var(--text-dim)', marginBottom: 2 }}>내 HP</div>
              <div className="hp-bar-container">
                <div className="hp-bar-fill" style={{ width: `${(hp / maxHp) * 100}%` }} />
              </div>
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
            </div>
          </div>
        </div>
      </div>

      {/* 정보 바 (DPS 제거, 공격 간격으로 대체) */}
      <div className="info-bar">
        <div className="info-bar-item">
          <div className="info-bar-value">{atkInterval.toFixed(1)}초</div>
          <div className="info-bar-label">공격간격</div>
        </div>
        <div className="info-bar-item">
          <div className="info-bar-value">{Math.floor(hp)}</div>
          <div className="info-bar-label">HP</div>
        </div>
        <div className="info-bar-item">
          <div className="info-bar-value">{formatNumber(Math.floor(neigong))}</div>
          <div className="info-bar-label">내공</div>
        </div>
        <div className="info-bar-item">
          <div className="info-bar-value">{totalStats}</div>
          <div className="info-bar-label">경맥합</div>
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
          if (log.startsWith('—') || log.includes('등장') || log.includes('처치') || log.includes('사냥 시작')) {
            cls += ' log-system';
          } else if (log.includes('치명타') || log.includes('연속') || log.includes('피했다') || log.includes('📜') || log.includes('보스') || log.includes('승리') || log.includes('업적')) {
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
              {def.artType === 'active' ? '⚔' : '🛡'} {def.name} <Stars grade={owned.grade} maxGrade={5} />
            </span>
          );
        })}
        {equippedSimbeop && (() => {
          const def = getArtDef(equippedSimbeop);
          const owned = ownedArts.find(a => a.id === equippedSimbeop);
          if (!def || !owned) return null;
          return (
            <span className="chip chip-simbeop">
              {def.name} <Stars grade={owned.grade} maxGrade={5} />
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
  const healWithNeigong = useGameStore(s => s.healWithNeigong);
  const hp = useGameStore(s => s.hp);
  const maxHp = useGameStore(s => s.maxHp);
  const neigong = useGameStore(s => s.neigong);

  if (!battleResult) return null;

  const isWin = battleResult.type === 'explore_win';
  const isDeath = battleResult.type === 'death';

  return (
    <div className="card" style={{ textAlign: 'center', padding: 32 }}>
      <div style={{
        fontSize: 24,
        fontWeight: 600,
        color: isWin ? 'var(--gold)' : isDeath ? 'var(--red)' : 'var(--text-primary)',
        marginBottom: 16,
      }}>
        {isWin ? '승리!' : isDeath ? '패배...' : '전투 종료'}
      </div>

      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
        {battleResult.message}
      </div>

      {battleResult.simdeuk > 0 && (
        <div style={{ color: 'var(--gold)', marginBottom: 4, fontSize: 14 }}>
          심득 +{battleResult.simdeuk}
        </div>
      )}

      {battleResult.drops.length > 0 && (
        <div style={{ color: 'var(--gold)', marginBottom: 8, fontSize: 13 }}>
          {battleResult.drops.map(id => getArtDef(id)?.name ?? id).join(', ')} 획득!
        </div>
      )}

      {hp < maxHp && (
        <div style={{ marginTop: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>
            HP {Math.floor(hp)}/{maxHp}
          </div>
          <button
            className="btn btn-small"
            onClick={healWithNeigong}
            disabled={neigong < 1}
          >
            내공으로 HP 회복
          </button>
        </div>
      )}

      <button className="btn" onClick={dismissBattleResult} style={{ marginTop: 8 }}>돌아가기</button>
    </div>
  );
}
