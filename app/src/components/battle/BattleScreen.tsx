import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getFieldDef } from '../../data/fields';
import { getMonsterDef } from '../../data/monsters';
import { getOathDef, calcOathBoost, calcOathFlatBonuses } from '../../data/oaths';
import { type DensityMode } from './BattleLog';
import BattleScene from './BattleScene';
import CombatBars from './CombatBars';
import CombatStatusCard from './CombatStatusCard';
import BattleLogTabs from './BattleLogTabs';

const DENSITY_KEY = 'battleLogDensity';

function readInitialDensity(): DensityMode {
  if (typeof window === 'undefined') return 'compact';
  const v = window.localStorage?.getItem(DENSITY_KEY);
  if (v === 'full' || v === 'compact' || v === 'minimal') return v;
  return 'compact';
}

// ─────────────────────────────────────────────
// 전투 화면 (v2: 좌우 HP/MP 분리 + 전투 현황 카드 + 3탭 로그)
// ─────────────────────────────────────────────
export default function BattleScreen() {
  const battleMode = useGameStore(s => s.battleMode);
  const currentEnemy = useGameStore(s => s.currentEnemy);
  const currentField = useGameStore(s => s.currentField);
  const exploreStep = useGameStore(s => s.exploreStep);
  const exploreOrder = useGameStore(s => s.exploreOrder);
  const isBossPhase = useGameStore(s => s.isBossPhase);
  const maxHp = useGameStore(s => s.maxHp);
  const battleLog = useGameStore(s => s.battleLog);
  const oathSystem = useGameStore(s => s.oathSystem);
  const abandonBattle = useGameStore(s => s.abandonBattle);

  // 맹세 활성 정보 (lockedAt + forbid 합산 → 효과 적용 중인 맹세만 카운트)
  const oathInfo = (() => {
    const locked = oathSystem.lockedAt;
    if (!locked) return null;
    const fieldDef = currentField ? getFieldDef(currentField) : null;
    const enemyMonDef = currentEnemy ? getMonsterDef(currentEnemy.id) : null;
    const forbids = [
      ...(fieldDef?.forbidOathIds ?? []),
      ...(enemyMonDef?.forbidOathIds ?? []),
    ];
    const activeIds = locked.snapshotIds.filter(id => !forbids.includes(id));
    if (activeIds.length === 0) return null;
    const weightSum = activeIds.reduce((sum, id) => sum + (getOathDef(id)?.weight ?? 0), 0);
    const boost = calcOathBoost(weightSum);
    const flat = calcOathFlatBonuses(weightSum);
    const names = activeIds.map(id => getOathDef(id)?.name ?? id);
    return {
      count: activeIds.length,
      weightSum,
      profPct: Math.round((boost.profMult - 1) * 100),
      dropPct: Math.round((boost.dropMult - 1) * 100),
      rankBonus: flat.monsterRankBonus,
      names,
    };
  })();

  const [density, setDensity] = useState<DensityMode>(readInitialDensity);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage?.setItem(DENSITY_KEY, density);
    }
  }, [density]);

  if (!currentEnemy) return null;

  const isExplore = battleMode === 'explore';

  return (
    <div className="battle-layout">
      {/* 상단 바 — 필드명/답파 진행 표기 + density 토글 + 포기 */}
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
          {oathInfo && (
            <span
              className="badge"
              style={{
                fontSize: 11,
                padding: '2px 8px',
                background: 'rgba(255,215,0,0.12)',
                color: 'var(--gold)',
                border: '1px solid rgba(255,215,0,0.35)',
                fontWeight: 500,
              }}
              title={
                `활성 맹세 ${oathInfo.count}종 (가중치 ${oathInfo.weightSum})\n` +
                `· 숙련도 +${oathInfo.profPct}%\n` +
                `· 드랍률 +${oathInfo.dropPct}%` +
                (oathInfo.rankBonus > 0 ? `\n· 몬스터 등급 +${oathInfo.rankBonus}` : '') +
                `\n\n[ ${oathInfo.names.join(' · ')} ]`
              }
            >
              誓 {oathInfo.count}종 · 숙련 +{oathInfo.profPct}% / 드랍 +{oathInfo.dropPct}%
              {oathInfo.rankBonus > 0 && ` · 등급 +${oathInfo.rankBonus}`}
            </span>
          )}
        </div>
        <button className="btn btn-small btn-danger" onClick={abandonBattle}>포기</button>
      </div>

      {/* 1) 전투 장면 카드 (접기 가능) */}
      <BattleScene />

      {/* 2) 좌우 분리 HP/MP + 버프 칩 */}
      <CombatBars />

      {/* 3) 전투 현황 카드 — DPS 대결 + 종합 판정 + 공속 + 피해 카드 + 스킬 타임라인 */}
      <CombatStatusCard />

      {/* 4) 답파 진행 바 */}
      {isExplore && !isBossPhase && (
        <div style={{ padding: '4px 0' }}>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${((exploreStep + 1) / (exploreOrder.length + 1)) * 100}%` }} />
          </div>
        </div>
      )}

      {/* 5) 로그 3탭 컨테이너 */}
      <div style={{ flex: 1, minHeight: 500, display: 'flex', flexDirection: 'column' }}>
        <BattleLogTabs entries={battleLog} playerMaxHp={maxHp} density={density} onDensityChange={setDensity} />
      </div>
    </div>
  );
}
