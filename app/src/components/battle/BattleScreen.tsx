import { useEffect, useState } from 'react';
import { useGameStore, getMonsterRevealLevel, calcStamina, calcTierMultiplier } from '../../store/gameStore';
import { getMonsterDef, BOSS_PATTERNS } from '../../data/monsters';
import { formatNumber } from '../../utils/format';
import { getEnemyImage, getEnemyEmoji, getPlayerByTier, getFieldBackground } from '../../assets';
import { getFieldDef } from '../../data/fields';
import BattleLog, { type DensityMode } from './BattleLog';

const DENSITY_KEY = 'battleLogDensity';

function readInitialDensity(): DensityMode {
  if (typeof window === 'undefined') return 'compact';
  const v = window.localStorage?.getItem(DENSITY_KEY);
  if (v === 'full' || v === 'compact' || v === 'minimal') return v;
  return 'compact';
}

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
  const battleLog = useGameStore(s => s.battleLog);
  const abandonBattle = useGameStore(s => s.abandonBattle);
  const killCounts = useGameStore(s => s.killCounts);
  const tier = useGameStore(s => s.tier);
  const bossPatternState = useGameStore(s => s.bossPatternState);
  const playerStunTimer = useGameStore(s => s.playerStunTimer);
  const currentBattleDuration = useGameStore(s => s.currentBattleDuration);
  const currentBattleDamageDealt = useGameStore(s => s.currentBattleDamageDealt);
  const equipmentDotOnEnemy = useGameStore(s => s.equipmentDotOnEnemy);

  const [density, setDensity] = useState<DensityMode>(readInitialDensity);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage?.setItem(DENSITY_KEY, density);
    }
  }, [density]);

  if (!currentEnemy) return null;

  const monDef = getMonsterDef(currentEnemy.id);
  const kills = killCounts[currentEnemy.id] ?? 0;
  const reveal = getMonsterRevealLevel(kills);
  // 전투 중 이름: 1회 이상 처치했으면 이름, 아니면 ???
  const enemyName = reveal >= 1 ? (monDef?.name ?? currentEnemy.id) : '???';
  const playerDps = currentBattleDuration >= 1
    ? Math.floor(currentBattleDamageDealt / currentBattleDuration)
    : 0;
  const maxStamina = calcStamina(stats.sim, calcTierMultiplier(tier));
  const enemyImg = getEnemyImage(currentEnemy.id);
  const player = getPlayerByTier(tier);
  const bgUrl = currentField ? getFieldBackground(currentField) : null;

  const isExplore = battleMode === 'explore';

  return (
    <div className="battle-layout">
      {/* 상단 바 */}
      <div className="battle-header" style={{ flexWrap: 'wrap', gap: 8 }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="density-toggle">
            {(['full', 'compact', 'minimal'] as DensityMode[]).map(m => (
              <button
                key={m}
                className={`density-btn ${density === m ? 'active' : ''}`}
                onClick={() => setDensity(m)}
              >
                {m === 'full' ? 'Full' : m === 'compact' ? 'Compact' : 'Numbers Only'}
              </button>
            ))}
          </div>
          <button className="btn btn-small btn-danger" onClick={abandonBattle}>포기</button>
        </div>
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

      {/* DPS 스트립 — 내/적 초당 피해 (다른 곳에 중복 안 된 유일 정보) */}
      <div className="combat-info-strip">
        <span>내 DPS <span className="num">{formatNumber(playerDps)}</span></span>
        <span>
          적 DPS <span className="num">
            {reveal >= 4
              ? (currentEnemy.attackInterval > 0
                  ? formatNumber(Math.floor(currentEnemy.attackPower / currentEnemy.attackInterval))
                  : '-')
              : '???'}
          </span>
        </span>
      </div>

      {/* 답파 진행 바 */}
      {isExplore && !isBossPhase && (
        <div style={{ padding: '4px 0' }}>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${((exploreStep + 1) / (exploreOrder.length + 1)) * 100}%` }} />
          </div>
        </div>
      )}

      {/* 전투 로그 (v6) */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <BattleLog entries={battleLog} playerMaxHp={maxHp} density={density} />
      </div>
    </div>
  );
}

