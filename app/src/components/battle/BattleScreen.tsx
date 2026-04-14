import { useEffect, useRef, useState } from 'react';
import { useGameStore, getMonsterRevealLevel, calcStamina } from '../../store/gameStore';
import { getMonsterDef, BOSS_PATTERNS } from '../../data/monsters';
import { getArtDef } from '../../data/arts';
import { formatNumber } from '../../utils/format';
import { getEnemyImage, getEnemyEmoji, getPlayerByTier, getFieldBackground } from '../../assets';
import { getFieldDef } from '../../data/fields';
import type { FloatingText } from '../../store/types';

// ─────────────────────────────────────────────
// 전투 화면 (v1.1: DPS 제거, 공격 간격 표시)
// ─────────────────────────────────────────────
export default function BattleScreen() {
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
  const equipmentDotOnEnemy = useGameStore(s => s.equipmentDotOnEnemy);
  const floatingTexts = useGameStore(s => s.floatingTexts);

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
            {currentField ? (getFieldDef(currentField)?.name ?? currentField) : ''}
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
              <div style={{ fontSize: 9, color: 'var(--text-dim)', marginBottom: 2 }}>체력 {Math.floor(hp)}/{maxHp}</div>
              <div className="hp-bar-container">
                <div className="hp-bar-fill" style={{ width: `${(hp / maxHp) * 100}%` }} />
              </div>
              {/* 스턴 표시 */}
              {playerStunTimer > 0 && (
                <div style={{ fontSize: 11, color: '#ff4444', fontWeight: 600, marginTop: 4 }}>
                  경직! ({playerStunTimer.toFixed(1)}초)
                </div>
              )}
              {/* 빙결 표시 */}
              {(bossPatternState?.playerFreezeLeft ?? 0) > 0 && (
                <div style={{ fontSize: 11, color: '#88ccff', fontWeight: 600, marginTop: 4 }}>
                  빙결! (공격 {bossPatternState!.playerFreezeLeft}회 남음)
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
              {/* DoT 상태이상 표시 */}
              {bossPatternState?.playerDotStacks && bossPatternState.playerDotStacks.length > 0 && (
                <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                  {bossPatternState.playerDotStacks.map(dot => {
                    const dotColors: Record<string, string> = {
                      bleed: '#ff4444', poison: '#88dd44', stamina_drain: '#cc88ff', slow: '#88ccff',
                    };
                    const dotLabels: Record<string, string> = {
                      bleed: '출혈', poison: '독', stamina_drain: '산공', slow: '둔화',
                    };
                    return (
                      <span key={dot.id} style={{
                        fontSize: 10, color: dotColors[dot.type] ?? '#ccc',
                        fontWeight: 600, padding: '1px 4px',
                        border: `1px solid ${dotColors[dot.type] ?? '#666'}`,
                        borderRadius: 3,
                      }}>
                        {dotLabels[dot.type] ?? dot.type} x{dot.stacks} ({Math.ceil(dot.remainingSec)}s)
                      </span>
                    );
                  })}
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
              {/* 철벽 스택 표시 */}
              {bossPatternState != null && (bossPatternState.cheolbyeokStacks ?? 0) > 0 && (() => {
                const cheolPattern = BOSS_PATTERNS[currentEnemy.id];
                const cheolSkill = cheolPattern?.skills.find(s => s.type === 'cheolbyeok');
                const reductionPct = Math.round((bossPatternState.cheolbyeokStacks ?? 0) * (cheolSkill?.cheolbyeokReductionPerStack ?? 0.08) * 100);
                return (
                  <div style={{ fontSize: 10, color: '#88ccff', fontWeight: 600, marginTop: 2, textAlign: 'right' }}>
                    철벽 {'■'.repeat(bossPatternState.cheolbyeokStacks ?? 0)}{'□'.repeat(Math.max(0, (cheolSkill?.cheolbyeokMaxStacks ?? 5) - (bossPatternState.cheolbyeokStacks ?? 0)))} (-{reductionPct}%)
                  </div>
                );
              })()}
              {/* 보스 내력 바 */}
              {bossPatternState != null && BOSS_PATTERNS[currentEnemy.id] && BOSS_PATTERNS[currentEnemy.id].stamina.max > 0 && (
                <div style={{ marginTop: 4 }}>
                  <div style={{ fontSize: 9, color: 'var(--text-dim)', marginBottom: 2, textAlign: 'right' }}>
                    {BOSS_PATTERNS[currentEnemy.id].staminaLabel ?? '내력'}{' '}
                    {Math.floor(bossPatternState.bossStamina)}/{BOSS_PATTERNS[currentEnemy.id].stamina.max}
                  </div>
                  <div className="hp-bar-container">
                    <div className="hp-bar-fill" style={{
                      width: `${(bossPatternState.bossStamina / BOSS_PATTERNS[currentEnemy.id].stamina.max) * 100}%`,
                      background: 'var(--gold, #d4a853)',
                    }} />
                  </div>
                </div>
              )}
              {/* 장비 DoT (독) 상태 표시 */}
              {equipmentDotOnEnemy.length > 0 && (
                <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {equipmentDotOnEnemy.map(dot => (
                    <span key={dot.equipId} style={{
                      fontSize: 10, color: '#88dd44', fontWeight: 600,
                      padding: '1px 4px', border: '1px solid #88dd44',
                      borderRadius: 3,
                    }}>
                      독 x{dot.stacks} ({Math.ceil(dot.remainingSec)}s)
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 플로팅 텍스트 */}
      <FloatingTexts texts={floatingTexts} />

      {/* 내 스탯 바 */}
      <div className="info-bar">
        <div className="info-bar-item">
          <div className="info-bar-value">{formatNumber(maxHp)}</div>
          <div className="info-bar-label">최대 체력</div>
        </div>
        <div className="info-bar-item">
          <div className="info-bar-value">{formatNumber(playerDps)}</div>
          <div className="info-bar-label">초당 피해</div>
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
          <div className="info-bar-label">적 최대 체력</div>
        </div>
        <div className="info-bar-item">
          <div className="info-bar-value">
            {reveal >= 4
              ? (currentEnemy.attackInterval > 0
                  ? formatNumber(Math.floor(currentEnemy.attackPower / currentEnemy.attackInterval))
                  : '-')
              : '???'}
          </div>
          <div className="info-bar-label">적 초당 피해</div>
        </div>
        <div className="info-bar-item">
          <div className="info-bar-value">
            {reveal >= 4
              ? (BOSS_PATTERNS[currentEnemy.id] && BOSS_PATTERNS[currentEnemy.id].stamina.max > 0
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
          const actualEnemyName = monDef?.name ?? currentEnemy.id;
          let cls = 'battle-log-line';
          if (log.startsWith('비기 — 태산압정')) {
            cls += ' log-ult-taesan';
          } else if (log.startsWith('절초 —')) {
            cls += ' log-ult';
          } else if (log.startsWith(actualEnemyName + ':')) {
            const isStrong = log.includes(' 피해!') || log.includes('빙결') || log.includes('경직');
            cls += isStrong ? ' log-enemy-strong' : ' log-enemy';
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

// ── 플로팅 텍스트 컴포넌트 ──
function FloatingTexts({ texts }: { texts: FloatingText[] }) {
  const [visible, setVisible] = useState<(FloatingText & { key: number })[]>([]);
  const seenRef = useRef(new Set<number>());

  useEffect(() => {
    const newOnes: typeof visible = [];
    for (const t of texts) {
      if (!seenRef.current.has(t.id)) {
        seenRef.current.add(t.id);
        newOnes.push({ ...t, key: t.id });
      }
    }
    if (newOnes.length > 0) {
      setVisible(prev => [...prev, ...newOnes].slice(-8));
      // 자동 제거
      const timer = setTimeout(() => {
        setVisible(prev => prev.filter(v => !newOnes.some(n => n.key === v.key)));
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [texts]);

  // seenRef 정리 (오래된 ID 제거)
  useEffect(() => {
    if (seenRef.current.size > 100) {
      const ids = texts.map(t => t.id);
      seenRef.current = new Set(ids);
    }
  }, [texts.length]);

  if (visible.length === 0) return null;

  const colorMap: Record<string, string> = {
    damage: 'var(--text)', critical: '#ffcc00', dot: '#88dd44',
    heal: '#44dd88', evade: '#88ccff', drop: '#d4a853',
  };

  return (
    <div style={{ position: 'relative', height: 0, overflow: 'visible', pointerEvents: 'none' }}>
      {visible.map((ft, i) => (
        <div key={ft.key} className="floating-text-anim" style={{
          position: 'absolute',
          right: ft.type === 'dot' ? 8 : '50%',
          transform: ft.type === 'dot' ? 'none' : 'translateX(50%)',
          top: -(20 + i * 18),
          fontSize: ft.type === 'critical' ? 14 : 12,
          fontWeight: 600,
          color: colorMap[ft.type] ?? 'var(--text)',
          textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          whiteSpace: 'nowrap',
        }}>
          {ft.text}
        </div>
      ))}
    </div>
  );
}
