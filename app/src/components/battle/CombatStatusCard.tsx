import { useGameStore, getMonsterRevealLevel } from '../../store/gameStore';
import { formatNumber } from '../../utils/format';
import { calcCombatVerdict } from '../../utils/combatVerdict';
import CollapsibleCard from './CollapsibleCard';
import SkillTimeline from './SkillTimeline';

/**
 * 전투 현황 카드.
 * 1) DPS 대결 게이지 + 종합 판정 뱃지 (적 DPS 미공개면 마스킹)
 * 2) 공속 진행 바 (plye/enemy attackTimer)
 * 3) 누적 피해/피격 카드 2장
 * 4) SkillTimeline (절초 + 보스 차징)
 *
 * reveal 정책:
 * - reveal >= 4 : 적 DPS / 적 공속 공개
 * - 그 미만     : 적 DPS "???", verdict 미표시, DPS 게이지 비활성 회색
 */
export default function CombatStatusCard() {
  const hp = useGameStore(s => s.hp);
  const currentEnemy = useGameStore(s => s.currentEnemy);
  const killCounts = useGameStore(s => s.killCounts);
  const currentBattleDuration = useGameStore(s => s.currentBattleDuration);
  const currentBattleDamageDealt = useGameStore(s => s.currentBattleDamageDealt);
  const currentBattleDamageTaken = useGameStore(s => s.currentBattleDamageTaken);
  const currentBattleMaxOutgoingHit = useGameStore(s => s.currentBattleMaxOutgoingHit);
  const currentBattleMaxIncomingHit = useGameStore(s => s.currentBattleMaxIncomingHit);
  const playerAttackTimer = useGameStore(s => s.playerAttackTimer);
  const enemyAttackTimer = useGameStore(s => s.enemyAttackTimer);
  const getAttackInterval = useGameStore(s => s.getAttackInterval);

  if (!currentEnemy) return null;

  const reveal = getMonsterRevealLevel(killCounts[currentEnemy.id] ?? 0);
  const playerInterval = getAttackInterval();
  const enemyInterval = currentEnemy.attackInterval;

  const playerDps = currentBattleDuration >= 1
    ? Math.floor(currentBattleDamageDealt / currentBattleDuration)
    : 0;

  const enemyDpsRaw = enemyInterval > 0 ? Math.floor(currentEnemy.attackPower / enemyInterval) : 0;
  const enemyDpsKnown = reveal >= 4;
  const enemyDps = enemyDpsKnown ? enemyDpsRaw : null;

  // DPS 게이지 폭
  let allyGaugePct = 50;
  let enemyGaugePct = 50;
  if (enemyDps != null) {
    const total = playerDps + enemyDps;
    if (total > 0) {
      allyGaugePct = (playerDps / total) * 100;
      enemyGaugePct = 100 - allyGaugePct;
    }
  }

  // verdict
  const verdict = enemyDps != null
    ? calcCombatVerdict({
        playerHp: hp,
        playerDps,
        enemyHp: currentEnemy.hp,
        enemyDps,
      })
    : null;

  // 공속 진행
  const allyTimingPct = clampProgress(playerInterval, playerAttackTimer);
  const enemyTimingPct = clampProgress(enemyInterval, enemyAttackTimer);
  const allyNextSec = Math.max(0, playerAttackTimer);
  const enemyNextSec = Math.max(0, enemyAttackTimer);
  const enemyTimingKnown = reveal >= 4;

  // 피해 집계
  const divDur = Math.max(1, currentBattleDuration);
  const avgDealt = Math.floor(currentBattleDamageDealt / divDur);
  const avgTaken = Math.floor(currentBattleDamageTaken / divDur);

  const headerRight = `${currentBattleDuration.toFixed(1)}s 진행중`;

  return (
    <CollapsibleCard title="전투 현황" headerRight={headerRight}>
      {/* 1) DPS 대결 */}
      <div className="dps-battle">
        <div className={`dps-side ally ${enemyDps == null ? 'masked' : ''}`}>
          <div className="dps-label">내 DPS</div>
          <div className="dps-val">{formatNumber(playerDps)}</div>
        </div>
        <div className="dps-gauge">
          <div className={`dps-gauge-bar ${enemyDps == null ? 'masked' : ''}`}>
            <div className="gauge-ally" style={{ width: `${allyGaugePct}%` }} />
            <div className="gauge-enemy" style={{ width: `${enemyGaugePct}%` }} />
          </div>
          {verdict && (
            <div className="dps-balance">
              <span className="deltas">
                <span>DPS <SignedDelta value={verdict.dpsDelta} /></span>
                <span className="sep">·</span>
                <span>HP <SignedDelta value={verdict.hpDelta} /></span>
              </span>
              <span className={`verdict ${verdict.verdict}`}>{verdict.label}</span>
            </div>
          )}
        </div>
        <div className={`dps-side enemy ${enemyDps == null ? 'masked' : ''}`}>
          <div className="dps-label">적 DPS</div>
          <div className="dps-val">{enemyDps != null ? formatNumber(enemyDps) : '???'}</div>
        </div>
      </div>

      {/* 2) 공속 타이밍 */}
      <div className="timing-row">
        <div className="timing-cell ally">
          <div className="timing-icon">⚔</div>
          <div className="timing-bar-wrap">
            <div className="timing-bar">
              <div className="timing-fill ally" style={{ width: `${allyTimingPct}%` }} />
            </div>
            <div className="timing-text">
              내 공격 <b>{playerInterval.toFixed(1)}s</b> · 다음 <b>{allyNextSec.toFixed(1)}s</b>
            </div>
          </div>
        </div>
        <div className="timing-cell enemy">
          <div className="timing-icon">🛡</div>
          <div className="timing-bar-wrap">
            <div className="timing-bar">
              <div
                className="timing-fill enemy-fill"
                style={{ width: `${enemyTimingKnown ? enemyTimingPct : 0}%` }}
              />
            </div>
            <div className="timing-text">
              {enemyTimingKnown ? (
                <>적 공격 <b>{enemyInterval.toFixed(1)}s</b> · 다음 <b>{enemyNextSec.toFixed(1)}s</b></>
              ) : (
                <>적 공격 <b>???</b> · 다음 <b>???</b></>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3) 누적 피해 / 피격 */}
      <div className="dmg-row">
        <div className="dmg-card">
          <div className="dmg-card-label">누적 피해</div>
          <div className="dmg-card-val pos">{formatNumber(Math.floor(currentBattleDamageDealt))}</div>
          <div className="dmg-card-sub">
            평균 <b>{formatNumber(avgDealt)}</b>/s · 최대 <b>{formatNumber(Math.floor(currentBattleMaxOutgoingHit))}</b>
          </div>
        </div>
        <div className="dmg-card">
          <div className="dmg-card-label">누적 피격</div>
          <div className="dmg-card-val neg">{formatNumber(Math.floor(currentBattleDamageTaken))}</div>
          <div className="dmg-card-sub">
            평균 <b>{formatNumber(avgTaken)}</b>/s · 최대 <b>{formatNumber(Math.floor(currentBattleMaxIncomingHit))}</b>
          </div>
        </div>
      </div>

      {/* 4) 스킬 타임라인 */}
      <SkillTimeline />
    </CollapsibleCard>
  );
}

function clampProgress(interval: number, timer: number): number {
  if (interval <= 0 || timer < 0) return 100;
  return Math.max(0, Math.min(100, ((interval - timer) / interval) * 100));
}

function SignedDelta({ value }: { value: number }) {
  if (value > 0) return <span className="pos">+{formatNumber(Math.floor(value))}</span>;
  if (value < 0) return <span className="neg">−{formatNumber(Math.abs(Math.floor(value)))}</span>;
  return <span>0</span>;
}
