/**
 * 내공/경맥 탭 — v1.1
 * 경신 = 공격 간격만 (회피 제거)
 * HP = totalSpentNeigong 기반 log2 공식
 */
import { useGameStore } from '../store/gameStore';
import { getTierDef, TIERS } from '../data/tiers';
import { getArtDef, getArtGrade } from '../data/arts';
import { getPlayerByTier } from '../assets';
import { formatNumber } from '../utils/format';
import Stars from './Stars';

export default function NeigongTab() {
  const neigong = useGameStore(s => s.neigong);
  const stats = useGameStore(s => s.stats);
  const hp = useGameStore(s => s.hp);
  const maxHp = useGameStore(s => s.maxHp);
  const tier = useGameStore(s => s.tier);
  const equippedSimbeop = useGameStore(s => s.equippedSimbeop);
  const ownedArts = useGameStore(s => s.ownedArts);
  const investStat = useGameStore(s => s.investStat);
  const healWithNeigong = useGameStore(s => s.healWithNeigong);
  const getNeigongPerSec = useGameStore(s => s.getNeigongPerSec);
  const getStatCost = useGameStore(s => s.getStatCost);
  const getTotalStats = useGameStore(s => s.getTotalStats);
  const getAttackInterval = useGameStore(s => s.getAttackInterval);
  const getEvasion = useGameStore(s => s.getEvasion);
  const attemptBreakthrough = useGameStore(s => s.attemptBreakthrough);
  const equipSimbeop = useGameStore(s => s.equipSimbeop);
  const unequipSimbeop = useGameStore(s => s.unequipSimbeop);
  const battleMode = useGameStore(s => s.battleMode);

  const battling = battleMode !== 'none';
  const tierDef = getTierDef(tier);
  const neigongRate = getNeigongPerSec();
  const totalStats = getTotalStats();
  const player = getPlayerByTier(tier);
  const atkInterval = getAttackInterval();
  const evasion = getEvasion();

  const nextTier = TIERS[tier + 1];
  const canBreakthrough = nextTier?.requirements ? (() => {
    const reqs = nextTier.requirements!;
    if (reqs.totalStats && totalStats < reqs.totalStats) return false;
    if (reqs.totalSimdeuk) {
      const ts = useGameStore.getState().totalSimdeuk;
      if (ts < reqs.totalSimdeuk) return false;
    }
    if (reqs.bossKills) {
      const bk = useGameStore.getState().bossKillCounts['tiger_boss'] ?? 0;
      if (bk < reqs.bossKills) return false;
    }
    return true;
  })() : false;

  const simbeopArts = ownedArts.filter(a => getArtDef(a.id)?.isSimbeop);

  const statEntries: { key: 'sungi' | 'gyeongsin' | 'magi'; name: string; dot: string; desc: string }[] = [
    { key: 'sungi', name: '선기', dot: 'var(--dot-sungi)', desc: '정파 위력' },
    { key: 'gyeongsin', name: '경신', dot: 'var(--dot-gyeongsin)', desc: `공격간격 ${atkInterval.toFixed(1)}초` },
    { key: 'magi', name: '마기', dot: 'var(--dot-magi)', desc: '사파 위력' },
  ];

  return (
    <div>
      {/* 캐릭터 + 내공 */}
      <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
        <div className="char-circle">
          {player.url ? (
            <img src={player.url} alt="캐릭터" />
          ) : (
            <span style={{ fontSize: 40 }}>{player.emoji}</span>
          )}
        </div>
        <div className="neigong-value">
          {formatNumber(Math.floor(neigong))}
        </div>
        <div className="neigong-rate">
          {battling ? (
            (() => {
              const s = useGameStore.getState();
              const am = s.activeMasteries;
              const hasCombatMastery = Object.entries(am).some(([artId, ids]) =>
                ids.some(id => id === 'samjae_simbeop_combat' || id === 'heupgong_combat') &&
                (s.equippedArts.includes(artId) || s.equippedSimbeop === artId)
              );
              if (hasCombatMastery) {
                const combatRate = neigongRate * 0.25;
                return `+${combatRate.toFixed(1)}/초 (전투 수련)`;
              }
              return '전투 중 생산 중단';
            })()
          ) : `+${neigongRate.toFixed(1)}/초`}
        </div>
      </div>

      {/* HP 카드 */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>HP</span>
          <span style={{ fontSize: 13 }}>{Math.floor(hp)}/{maxHp}</span>
        </div>
        <div className="hp-bar-container">
          <div className="hp-bar-fill" style={{ width: `${(hp / maxHp) * 100}%` }} />
        </div>
        <div
          className={`heal-link ${(battling || hp >= maxHp || neigong < 1) ? 'disabled' : ''}`}
          onClick={() => { if (!battling && hp < maxHp && neigong >= 1) healWithNeigong(); }}
        >
          내공으로 회복 →
        </div>
      </div>

      {/* 경지 카드 */}
      <div className="card">
        <div className="tier-row">
          <span className="badge badge-gold">{tierDef.name}</span>
          {nextTier && (
            <button
              className={`btn btn-small btn-gold ${canBreakthrough ? 'glow' : ''}`}
              onClick={attemptBreakthrough}
              disabled={battling || !canBreakthrough}
            >
              경지 돌파
            </button>
          )}
        </div>
        {nextTier?.requirements && (
          <div className="tier-requirements">
            {nextTier.requirements.totalStats && (
              <span>경맥합 {totalStats}/{nextTier.requirements.totalStats}</span>
            )}
            {nextTier.requirements.totalSimdeuk && (
              <span style={{ marginLeft: 12 }}>
                심득 {formatNumber(useGameStore.getState().totalSimdeuk)}/{formatNumber(nextTier.requirements.totalSimdeuk)}
              </span>
            )}
            {nextTier.requirements.bossKills && (
              <span style={{ marginLeft: 12 }}>
                보스 {useGameStore.getState().bossKillCounts['tiger_boss'] ?? 0}/{nextTier.requirements.bossKills}회
              </span>
            )}
          </div>
        )}
      </div>

      {/* 경맥 투자 */}
      <div className="card">
        <div className="card-label">경맥</div>
        {statEntries.map(({ key, name, dot, desc }) => {
          const level = stats[key];
          const cost = getStatCost(level);
          return (
            <div key={key} className="stat-row">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="stat-dot" style={{ background: dot }} />
                <div>
                  <span className="stat-label">{name}</span>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>{desc}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="stat-level">Lv.{level}</span>
                <span className="stat-cost">{formatNumber(cost)}</span>
                <button
                  className="btn btn-plus"
                  onClick={() => investStat(key)}
                  disabled={battling || neigong < cost}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
        {/* 회피 정보 (패시브 무공 기반) */}
        {evasion > 0 && (
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.03)' }}>
            회피율: {evasion.toFixed(0)}% (패시브 무공)
          </div>
        )}
      </div>

      {/* 심법 */}
      <div className="card">
        <div className="card-label">심법</div>
        {equippedSimbeop ? (() => {
          const artDef = getArtDef(equippedSimbeop);
          const owned = ownedArts.find(a => a.id === equippedSimbeop);
          if (!artDef || !owned) return null;
          const gradeData = getArtGrade(artDef, owned.grade);
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="simbeop-icon">📖</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--blue)' }}>
                  {artDef.name} <Stars grade={owned.grade} maxGrade={5} />
                </div>
                {gradeData && (
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{gradeData.effect}</div>
                )}
              </div>
              <button className="btn btn-small" onClick={unequipSimbeop} disabled={battling}>교체</button>
            </div>
          );
        })() : (
          <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>심법 미장착</div>
        )}

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
    </div>
  );
}
