/**
 * 업적 탭 — UI개편 (6장: 연쇄 업적, achievementCount 표시)
 */
import { useGameStore } from '../store/gameStore';
import { ACHIEVEMENTS, type AchievementDef } from '../data/achievements';

function getVisibleAchievements(
  allAchs: AchievementDef[],
  completed: string[],
): AchievementDef[] {
  const chains = new Map<string, AchievementDef[]>();
  const standalone: AchievementDef[] = [];

  for (const ach of allAchs) {
    if (ach.chainId) {
      if (!chains.has(ach.chainId)) chains.set(ach.chainId, []);
      chains.get(ach.chainId)!.push(ach);
    } else {
      standalone.push(ach);
    }
  }

  const result: AchievementDef[] = [...standalone];
  for (const [, stages] of chains) {
    // 현재 진행 중인 단계: 완료 안 됐고 prerequisite 충족된 첫 번째
    const active = stages.find(
      s => !completed.includes(s.id) && (!s.prerequisite || completed.includes(s.prerequisite)),
    );
    if (active) {
      result.push(active);
    } else if (stages.every(s => completed.includes(s.id))) {
      // 모두 완료 → 마지막 단계 표시 (✓)
      result.push(stages[stages.length - 1]);
    } else {
      // 아직 시작 전 → 첫 단계 표시
      result.push(stages[0]);
    }
  }
  return result;
}

export default function AchievementTab() {
  const achievements = useGameStore(s => s.achievements);
  const achievementCount = useGameStore(s => s.achievementCount);
  const totalYasanKills = useGameStore(s => s.totalYasanKills);
  const bossKillCounts = useGameStore(s => s.bossKillCounts);
  const totalSimdeuk = useGameStore(s => s.totalSimdeuk);
  const ownedArts = useGameStore(s => s.ownedArts);
  const totalKills = useGameStore(s => s.totalKills);
  const stats = useGameStore(s => s.stats);

  const totalStats = stats.gi + stats.sim + stats.che;
  const maxArtSimdeuk = ownedArts.reduce((m, a) => Math.max(m, a.totalSimdeuk ?? 0), 0);
  const tigerBossKills = bossKillCounts['tiger_boss'] ?? 0;

  const visibleAchs = getVisibleAchievements(ACHIEVEMENTS, achievements);

  // 진행도 맵: achievementId → [현재값, 목표값]
  const progressMap: Record<string, [number, number]> = {
    hunter_10:       [totalYasanKills, 10],
    hunter_50:       [totalYasanKills, 50],
    hunter_200:      [totalYasanKills, 200],
    boss_first:      [tigerBossKills, 1],
    boss_5:          [tigerBossKills, 5],
    grade_2:         [maxArtSimdeuk, 100],
    grade_3:         [maxArtSimdeuk, 300],
    stats_10:        [totalStats, 10],
    stats_30:        [totalStats, 30],
    simdeuk_500:     [totalSimdeuk, 500],
    simdeuk_3000:    [totalSimdeuk, 3000],
    kill_chain_50:   [totalKills, 50],
    kill_chain_300:  [totalKills, 300],
    kill_chain_1000: [totalKills, 1000],
    kill_chain_2500: [totalKills, 2500],
    kill_chain_10000:[totalKills, 10000],
    art_collector:   [ownedArts.length, 4],
  };

  return (
    <div>
      {/* 상단 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span className="card-label" style={{ marginBottom: 0 }}>업적</span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          달성 업적: {achievementCount} / {ACHIEVEMENTS.length}개
        </span>
      </div>

      {visibleAchs.map(ach => {
        const achieved = achievements.includes(ach.id);
        const prerequisiteMet = !ach.prerequisite || achievements.includes(ach.prerequisite);
        const visible = achieved || prerequisiteMet;
        // 비밀 아닌 업적은 잠겨도 조건 표시
        const showDescription = achieved || visible || !ach.secret;

        // 진행도
        let progress: string | null = null;
        if (!achieved && visible && ach.id in progressMap) {
          const [cur, max] = progressMap[ach.id];
          progress = `${Math.min(cur, max)}/${max}`;
        }

        // 연쇄 업적 여부 표시
        const isChain = ach.chainId != null;

        return (
          <div
            key={ach.id}
            className="card"
            style={{
              marginBottom: 8,
              padding: 12,
              opacity: achieved ? 1 : visible ? 0.7 : 0.3,
              borderLeft: isChain ? '2px solid var(--gold)' : undefined,
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
                  {showDescription ? ach.name : '???'}
                </span>
                {showDescription && (
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
