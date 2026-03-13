/**
 * 업적 탭 — UI개편 (5장)
 */
import { useGameStore } from '../store/gameStore';
import { ACHIEVEMENTS } from '../data/achievements';

export default function AchievementTab() {
  const achievements = useGameStore(s => s.achievements);
  const artPoints = useGameStore(s => s.artPoints);
  const totalYasanKills = useGameStore(s => s.totalYasanKills);
  const bossKillCounts = useGameStore(s => s.bossKillCounts);
  const totalSimdeuk = useGameStore(s => s.totalSimdeuk);
  const ownedArts = useGameStore(s => s.ownedArts);

  return (
    <div>
      {/* 상단 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span className="card-label" style={{ marginBottom: 0 }}>업적</span>
        <span style={{ color: 'var(--gold)', fontSize: 13 }}>무공 포인트: {artPoints}</span>
      </div>

      {ACHIEVEMENTS.map(ach => {
        const achieved = achievements.includes(ach.id);
        const prerequisiteMet = !ach.prerequisite || achievements.includes(ach.prerequisite);
        const visible = achieved || prerequisiteMet;

        // 진행도
        let progress: string | null = null;
        if (!achieved && visible) {
          if (ach.id === 'hunter_10') progress = `${totalYasanKills}/10`;
          else if (ach.id === 'hunter_50') progress = `${totalYasanKills}/50`;
          else if (ach.id === 'hunter_200') progress = `${totalYasanKills}/200`;
          else if (ach.id === 'boss_5') progress = `${bossKillCounts['tiger_boss'] ?? 0}/5`;
          else if (ach.id === 'simdeuk_500') progress = `${Math.min(totalSimdeuk, 500)}/500`;
          else if (ach.id === 'simdeuk_3000') progress = `${Math.min(totalSimdeuk, 3000)}/3000`;
          else if (ach.id === 'stats_10') {
            const s = useGameStore.getState().stats;
            progress = `${s.sungi + s.gyeongsin + s.magi}/10`;
          }
          else if (ach.id === 'stats_30') {
            const s = useGameStore.getState().stats;
            progress = `${s.sungi + s.gyeongsin + s.magi}/30`;
          }
          else if (ach.id === 'art_collector') progress = `${ownedArts.length}/4`;
        }

        return (
          <div
            key={ach.id}
            className="card"
            style={{
              marginBottom: 8,
              padding: 12,
              opacity: achieved ? 1 : visible ? 0.7 : 0.3,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>
                {achieved ? (
                  <span style={{ color: 'var(--gold)' }}>✓</span>
                ) : visible ? '☐' : '🔒'}
              </span>
              <div style={{ flex: 1 }}>
                <span style={{
                  fontWeight: 500,
                  fontSize: 13,
                  color: achieved ? 'var(--gold)' : 'var(--text-primary)',
                }}>
                  {visible ? ach.name : '???'}
                </span>
                {visible && (
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                    {ach.description}
                  </div>
                )}
              </div>
              {progress && (
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>
                  {progress}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
