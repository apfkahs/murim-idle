import { useState } from 'react';
import { useGameStore, getMonsterRevealLevel } from '../../store/gameStore';
import { getMonsterDef } from '../../data/monsters';
import { getEnemyImage, getEnemyEmoji, getActiveProfile, getFieldBackground } from '../../assets';
import CollapsibleCard from './CollapsibleCard';

type SceneSize = 'md' | 'lg';

/**
 * 전투 장면 카드 — 포트레이트 + 배경 이미지.
 * 기존 `.battle-scene` 시각(배경, 애니메이션, 이미지)은 유지하면서
 * mockup combat-log-v2.html 의 `.card #card-scene` 처럼 접기 가능한 카드로 감싼다.
 * 헤더 좌측: "대결" / 우측: "나 vs {적 이름}" (reveal 1단계 미만이면 "나 vs ???")
 */
export default function BattleScene() {
  const currentEnemy = useGameStore(s => s.currentEnemy);
  const currentField = useGameStore(s => s.currentField);
  const tier = useGameStore(s => s.tier);
  const killCounts = useGameStore(s => s.killCounts);
  const isBossPhase = useGameStore(s => s.isBossPhase);
  const bossPatternState = useGameStore(s => s.bossPatternState);
  const selectedProfileKey = useGameStore(s => s.selectedProfileKey);
  const customProfileUrl = useGameStore(s => s.customProfileUrl);
  const [size, setSize] = useState<SceneSize>('md');

  if (!currentEnemy) return null;

  const monDef = getMonsterDef(currentEnemy.id);
  const kills = killCounts[currentEnemy.id] ?? 0;
  const reveal = getMonsterRevealLevel(kills);
  const enemyName = reveal >= 1 ? (monDef?.name ?? currentEnemy.id) : '???';
  const enemyImg = getEnemyImage(currentEnemy.id);
  const player = getActiveProfile(selectedProfileKey, customProfileUrl, tier);
  const bgUrl = currentField ? getFieldBackground(currentField) : null;

  return (
    <CollapsibleCard
      title="대결"
      headerRight={`나 vs ${enemyName}`}
      bodyClassName={`combat-card-body-scene combat-card-body-scene--${size}`}
    >
      <button
        type="button"
        className="scene-size-toggle"
        title={size === 'md' ? '크게 보기' : '작게 보기'}
        onClick={(e) => {
          e.stopPropagation();
          setSize(prev => prev === 'md' ? 'lg' : 'md');
        }}
      >
        {size === 'md' ? '⤢' : '⤡'}
      </button>
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
            <div className={isBossPhase ? 'anim-boss' : ''} style={{ textAlign: 'center', position: 'relative', display: 'inline-block' }}>
              {enemyImg ? (
                <img src={enemyImg} alt={enemyName} className="battle-char" />
              ) : (
                <span className="battle-char-emoji">{getEnemyEmoji(currentEnemy.id)}</span>
              )}
              {currentEnemy.id === 'baehwa_geombosa' && bossPatternState?.monsterState?.kind === 'baehwa_geombosa' && bossPatternState.monsterState.grogyLeft > 0 && (
                <div className="groggy-overlay">
                  <span className="groggy-badge">그로기</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </CollapsibleCard>
  );
}
