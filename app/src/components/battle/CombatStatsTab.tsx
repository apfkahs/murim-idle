import { useGameStore } from '../../store/gameStore';
import { getFieldDef } from '../../data/fields';
import { getArtDef, type ProficiencyType } from '../../data/arts';
import { PROF_LABEL } from '../../utils/combat/damageCalc';
import { formatNumber } from '../../utils/format';

const PROF_ORDER: ProficiencyType[] = ['sword', 'palm', 'fist', 'footwork', 'mental'];

/**
 * 로그 영역 "전투 통계" 탭.
 * ① 이번 전투(진행 중) 집계 — CLEAR_BATTLE_STATE 로 전투 시작마다 리셋
 * ② 이번 사냥 세션 집계 — 전장 바뀔 때만 리셋, 오프라인 진행도 누적
 */
export default function CombatStatsTab() {
  // ─── 현재 전투 ───
  const currentBattleDuration = useGameStore(s => s.currentBattleDuration);
  const currentBattleDamageDealt = useGameStore(s => s.currentBattleDamageDealt);
  const currentBattleDamageTaken = useGameStore(s => s.currentBattleDamageTaken);
  const currentBattleCritCount = useGameStore(s => s.currentBattleCritCount);
  const currentBattleDodgeCount = useGameStore(s => s.currentBattleDodgeCount);
  const currentBattleHitTakenCount = useGameStore(s => s.currentBattleHitTakenCount);
  const currentBattleMaxOutgoingHit = useGameStore(s => s.currentBattleMaxOutgoingHit);
  const currentBattleMaxIncomingHit = useGameStore(s => s.currentBattleMaxIncomingHit);
  const currentBattleSkillUseCount = useGameStore(s => s.currentBattleSkillUseCount);

  // ─── 세션 ───
  const sessionFieldId = useGameStore(s => s.sessionFieldId);
  const sessionStartedAt = useGameStore(s => s.sessionStartedAt);
  const sessionKills = useGameStore(s => s.sessionKills);
  const sessionQiGained = useGameStore(s => s.sessionQiGained);
  const sessionTotalDamage = useGameStore(s => s.sessionTotalDamage);
  const sessionActiveTime = useGameStore(s => s.sessionActiveTime);
  const sessionMaxDps = useGameStore(s => s.sessionMaxDps);
  const sessionBattleWins = useGameStore(s => s.sessionBattleWins);
  const sessionDeaths = useGameStore(s => s.sessionDeaths);
  const sessionDrops = useGameStore(s => s.sessionDrops);
  const sessionProfGains = useGameStore(s => s.sessionProfGains);
  const equippedArts = useGameStore(s => s.equippedArts);
  const equippedSimbeop = useGameStore(s => s.equippedSimbeop);

  // ── 현재 전투 derived ──
  const divDur = Math.max(1, currentBattleDuration);
  const avgDealt = (currentBattleDamageDealt / divDur).toFixed(1);
  const avgTaken = (currentBattleDamageTaken / divDur).toFixed(1);
  const net = Math.floor(currentBattleDamageDealt - currentBattleDamageTaken);
  const netCls = net > 0 ? 'pos' : net < 0 ? 'neg' : 'neutral';
  const netText = net > 0 ? `+${formatNumber(net)}` : net < 0 ? `−${formatNumber(Math.abs(net))}` : '0';

  const dodgeAttempts = currentBattleDodgeCount + currentBattleHitTakenCount;
  const dodgeRate = dodgeAttempts > 0
    ? Math.round((currentBattleDodgeCount / dodgeAttempts) * 100)
    : 0;

  // ── 세션 derived ──
  const sessionActive = !!sessionFieldId && sessionStartedAt > 0;
  const sessionFieldName = sessionFieldId ? (getFieldDef(sessionFieldId)?.name ?? sessionFieldId) : '';
  const sessionElapsedSec = sessionActive ? Math.max(0, Math.floor((Date.now() - sessionStartedAt) / 1000)) : 0;
  const sessionElapsedText = formatDuration(sessionElapsedSec);

  const killsPerMin = sessionElapsedSec > 0
    ? (sessionKills / (sessionElapsedSec / 60)).toFixed(1)
    : '0.0';
  const qiPerMin = sessionElapsedSec > 0
    ? (sessionQiGained / (sessionElapsedSec / 60)).toFixed(1)
    : '0.0';

  const avgDpsSession = sessionActiveTime >= 1
    ? (sessionTotalDamage / sessionActiveTime).toFixed(1)
    : '0.0';

  const totalBattles = sessionBattleWins + sessionDeaths;
  const survivalPct = totalBattles > 0
    ? Math.round((sessionBattleWins / totalBattles) * 100)
    : 100;

  const dropKinds = Object.keys(sessionDrops).length;
  const dropTotal = Object.values(sessionDrops).reduce((a, b) => a + b, 0);

  // 장착 무공별 숙련도 획득 (pType 기반 저장, 무공명으로 매핑 표시)
  const equippedAll = [...(equippedSimbeop ? [equippedSimbeop] : []), ...equippedArts];
  const profRows = equippedAll
    .map(artId => {
      const def = getArtDef(artId);
      if (!def?.proficiencyType) return null;
      const gain = sessionProfGains[def.proficiencyType] ?? 0;
      return { artId, name: def.name, gain };
    })
    .filter((r): r is { artId: string; name: string; gain: number } => r !== null);
  const hasProfGains = profRows.some(r => r.gain > 0);

  // 타입별 숙련도 획득 (검법/장법/권법/보법/심법) — gain > 0인 항목만
  const profTypeRows = PROF_ORDER
    .map(pType => ({ pType, label: PROF_LABEL[pType] ?? pType, gain: sessionProfGains[pType] ?? 0 }))
    .filter(r => r.gain > 0);
  const hasProfTypeGains = profTypeRows.length > 0;

  return (
    <div>
      <div className="cstats-section-title">
        ◈ 이번 전투 ({currentBattleDuration.toFixed(1)}s)
      </div>
      <div className="cstats">
        <div className="cstat">
          <div className="cstat-k">누적 피해</div>
          <div className="cstat-v pos">{formatNumber(Math.floor(currentBattleDamageDealt))}</div>
          <div className="cstat-sub">평균 {avgDealt} / 초</div>
        </div>
        <div className="cstat">
          <div className="cstat-k">누적 피격</div>
          <div className="cstat-v neg">{formatNumber(Math.floor(currentBattleDamageTaken))}</div>
          <div className="cstat-sub">평균 {avgTaken} / 초</div>
        </div>
        <div className="cstat">
          <div className="cstat-k">순손익</div>
          <div className={`cstat-v ${netCls}`}>{netText}</div>
          <div className="cstat-sub">HP 효율</div>
        </div>
        <div className="cstat">
          <div className="cstat-k">치명타</div>
          <div className="cstat-v warn">{currentBattleCritCount} 회</div>
          <div className="cstat-sub">최대 {formatNumber(Math.floor(currentBattleMaxOutgoingHit))}</div>
        </div>
        <div className="cstat">
          <div className="cstat-k">회피</div>
          <div className="cstat-v">{currentBattleDodgeCount} 회</div>
          <div className="cstat-sub">회피율 {dodgeRate}%</div>
        </div>
        <div className="cstat">
          <div className="cstat-k">절초 발동</div>
          <div className="cstat-v gold">{currentBattleSkillUseCount} 회</div>
          <div className="cstat-sub">최대 피격 {formatNumber(Math.floor(currentBattleMaxIncomingHit))}</div>
        </div>
      </div>

      {sessionActive && (
        <>
          <div className="cstats-section-title">
            ◈ 이번 사냥 세션 · {sessionFieldName} ({sessionElapsedText})
          </div>
          <div className="cstats">
            <div className="cstat">
              <div className="cstat-k">처치</div>
              <div className="cstat-v gold">{formatNumber(sessionKills)}</div>
              <div className="cstat-sub">{killsPerMin} / 분</div>
            </div>
            <div className="cstat">
              <div className="cstat-k">획득 기운</div>
              <div className="cstat-v pos">{formatNumber(Math.floor(sessionQiGained))}</div>
              <div className="cstat-sub">{qiPerMin} / 분</div>
            </div>
            <div className="cstat">
              <div className="cstat-k">평균 DPS</div>
              <div className="cstat-v pos">{avgDpsSession}</div>
              <div className="cstat-sub">최대 {formatNumber(Math.floor(sessionMaxDps))}</div>
            </div>
            <div className="cstat">
              <div className="cstat-k">생존율</div>
              <div className={`cstat-v ${survivalPct >= 100 ? 'pos' : survivalPct >= 70 ? 'warn' : 'neg'}`}>{survivalPct}%</div>
              <div className="cstat-sub">승 {sessionBattleWins} · 사망 {sessionDeaths}</div>
            </div>
            <div className="cstat">
              <div className="cstat-k">드롭</div>
              <div className="cstat-v warn">{formatNumber(dropTotal)}</div>
              <div className="cstat-sub">{dropKinds}종</div>
            </div>
            <div className="cstat">
              <div className="cstat-k">전투 시간</div>
              <div className="cstat-v">{sessionActiveTime.toFixed(0)}s</div>
              <div className="cstat-sub">활전 / 총 {sessionElapsedText}</div>
            </div>
          </div>

          {hasProfTypeGains && (
            <>
              <div className="cstats-section-title">◈ 숙련도 획득</div>
              <div className="prof-gain-list">
                {profTypeRows.map(r => (
                  <div className="prof-gain-row" key={`ptype-${r.pType}`}>
                    <span className="prof-gain-name">{r.label}</span>
                    <span className="prof-gain-val pos">+{r.gain.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {hasProfGains && (
            <>
              <div className="cstats-section-title">◈ 무공별 숙련도 획득</div>
              <div className="prof-gain-list">
                {profRows.map(r => (
                  <div className="prof-gain-row" key={r.artId}>
                    <span className="prof-gain-name">{r.name}</span>
                    <span className={`prof-gain-val ${r.gain > 0 ? 'pos' : 'dim'}`}>
                      {r.gain > 0 ? `+${r.gain.toFixed(1)}` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}초`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return s > 0 ? `${m}분 ${s}초` : `${m}분`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}시간 ${rm}분` : `${h}시간`;
}
