import { useGameStore } from '../../store/gameStore';
import { getArtDef } from '../../data/arts';
import { getMonsterDef } from '../../data/monsters';

// ─────────────────────────────────────────────
// 전투 결과 화면
// ─────────────────────────────────────────────
export default function BattleResultScreen() {
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

      {battleResult.recentBattleLog && battleResult.recentBattleLog.length > 0 && (
        <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,80,80,0.25)', borderRadius: 4, padding: '8px 10px', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: '#ff8888', marginBottom: 6, letterSpacing: 1 }}>— 마지막 전투 기록 —</div>
          {battleResult.recentBattleLog.map((log, i) => (
            <div key={i} style={{ fontSize: 11, color: i === battleResult.recentBattleLog!.length - 1 ? '#ff6666' : 'var(--text-dim)', lineHeight: 1.6, fontStyle: i === battleResult.recentBattleLog!.length - 1 ? 'italic' : 'normal' }}>
              {log}
            </div>
          ))}
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
