/**
 * 업적 탭 — UI개편 v2 (카테고리 접기/펼치기, 연쇄 이전 기록, progressMap 전면 업데이트)
 */
import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import {
  ACHIEVEMENTS,
  CATEGORY_LABELS,
  type AchievementDef,
  type AchievementCategory,
} from '../data/achievements';
import { getProficiencyGrade } from '../store/gameStore';
import { CODEX_MONSTERS } from '../data/achievements';

const INN_IDS = ['drunk_thug','peddler','troublemaker','wanderer','bandit_chief','masked_swordsman'];
const CHEONSAN_IDS = ['hwahyulsa','eunrang'];
const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS) as AchievementCategory[];

// 체인별 stages 맵 (순서 보장)
const CHAIN_STAGES_MAP = new Map<string, AchievementDef[]>();
for (const ach of ACHIEVEMENTS) {
  if (ach.chainId) {
    if (!CHAIN_STAGES_MAP.has(ach.chainId)) CHAIN_STAGES_MAP.set(ach.chainId, []);
    CHAIN_STAGES_MAP.get(ach.chainId)!.push(ach);
  }
}

// 카테고리별 전체 업적 목록 (반복 업적 제외)
const CATEGORY_ALL_MAP = new Map<AchievementCategory, AchievementDef[]>();
for (const cat of CATEGORY_ORDER) CATEGORY_ALL_MAP.set(cat, []);
for (const ach of ACHIEVEMENTS) {
  if (!ach.repeatable) CATEGORY_ALL_MAP.get(ach.category)?.push(ach);
}

/** 카테고리별 표시할 대표 업적 목록 (체인은 활성 단계 하나만) */
function getRepresentativesByCategory(
  completed: string[],
): Map<AchievementCategory, AchievementDef[]> {
  const result = new Map<AchievementCategory, AchievementDef[]>();
  for (const cat of CATEGORY_ORDER) result.set(cat, []);

  const processedChains = new Set<string>();

  for (const ach of ACHIEVEMENTS) {
    if (ach.repeatable) continue;
    if (!ach.chainId) {
      result.get(ach.category)?.push(ach);
      continue;
    }
    if (processedChains.has(ach.chainId)) continue;
    processedChains.add(ach.chainId);

    const stages = CHAIN_STAGES_MAP.get(ach.chainId)!;
    const active = stages.find(
      s => !completed.includes(s.id) && (!s.prerequisite || completed.includes(s.prerequisite)),
    );
    const representative = active
      ?? (stages.every(s => completed.includes(s.id)) ? stages[stages.length - 1] : stages[0]);
    result.get(representative.category)?.push(representative);
  }
  return result;
}

/** 섹션 표시 여부: 비밀+prerequisite 미충족인 업적만 있으면 숨김 */
function isSectionVisible(reps: AchievementDef[], completed: string[]): boolean {
  return reps.some(ach => {
    if (completed.includes(ach.id)) return true;
    if (!ach.secret) return true;
    return !ach.prerequisite || completed.includes(ach.prerequisite);
  });
}

export default function AchievementTab() {
  const achievements = useGameStore(s => s.achievements);
  const achievementCount = useGameStore(s => s.achievementCount);
  const totalYasanKills = useGameStore(s => s.totalYasanKills);
  const bossKillCounts = useGameStore(s => s.bossKillCounts);
  const ownedArts = useGameStore(s => s.ownedArts);
  const totalKills = useGameStore(s => s.totalKills);
  const stats = useGameStore(s => s.stats);
  const killCounts = useGameStore(s => s.killCounts);
  const proficiency = useGameStore(s => s.proficiency);
  const repeatableAchCounts = useGameStore(s => s.repeatableAchCounts);
  const totalSeonghwaUsed = useGameStore(s => s.totalSeonghwaUsed ?? 0);
  const seonghwaRewardsClaimed = useGameStore(s => s.seonghwaRewardsClaimed ?? 0);
  const claimSeonghwaReward = useGameStore(s => s.claimSeonghwaReward);

  const totalStats = stats.gi + stats.sim + stats.che;
  const tigerBossKills = bossKillCounts['tiger_boss'] ?? 0;
  const innKills = INN_IDS.reduce((sum, id) => sum + (killCounts[id] ?? 0), 0);
  const cheonsanKills = CHEONSAN_IDS.reduce((sum, id) => sum + (killCounts[id] ?? 0), 0);
  const profValues = Object.values(proficiency as Record<string, number>);
  const maxProfGrade = profValues.reduce((m, v) => Math.max(m, getProficiencyGrade(v)), 1);
  const typesAtDalIn = profValues.filter(v => getProficiencyGrade(v) >= 3).length;
  const typesAtMugeuk = profValues.filter(v => getProficiencyGrade(v) >= 5).length;
  const codexDiscovered = CODEX_MONSTERS.filter(id => (killCounts[id] ?? 0) >= 1).length;
  const codexComplete = CODEX_MONSTERS.filter(id => (killCounts[id] ?? 0) >= 1000).length;

  const [collapsedCategories, setCollapsedCategories] = useState<Set<AchievementCategory>>(new Set());
  const [chainHistoryOpen, setChainHistoryOpen] = useState<Set<string>>(new Set());

  function toggleCategory(cat: AchievementCategory) {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  }

  function toggleChainHistory(chainId: string) {
    setChainHistoryOpen(prev => {
      const next = new Set(prev);
      if (next.has(chainId)) next.delete(chainId); else next.add(chainId);
      return next;
    });
  }

  // 진행도 맵: achievementId → [현재값, 목표값]
  const progressMap: Record<string, [number, number]> = {
    // 야산 사냥
    hunter_50:           [totalYasanKills, 100],
    hunter_200:          [totalYasanKills, 500],
    hunter_2000:         [totalYasanKills, 2000],
    hunter_10000:        [totalYasanKills, 10000],
    // 보스 도전
    boss_first:          [tigerBossKills, 1],
    boss_5:              [tigerBossKills, 10],
    boss_50:             [tigerBossKills, 50],
    boss_100:            [tigerBossKills, 100],
    boss_200:            [tigerBossKills, 200],
    // 몬스터 도감
    codex_first:         [codexDiscovered, 5],
    codex_1:             [codexComplete, 1],
    codex_3:             [codexComplete, 3],
    codex_5:             [codexComplete, 5],
    codex_8:             [codexComplete, 8],
    codex_12:            [codexComplete, 12],
    codex_17:            [codexComplete, 17],
    codex_all:           [codexComplete, CODEX_MONSTERS.length],
    // 무공 수련
    art_collector:       [ownedArts.length, 4],
    art_collector_6:     [ownedArts.length, 6],
    art_collector_all:   [ownedArts.length, 9],
    // 경맥 단련
    stats_30:            [totalStats, 50],
    stats_300:           [totalStats, 300],
    stats_1000:          [totalStats, 1000],
    stats_3000:          [totalStats, 3000],
    // 무공 숙련도 (단계: 1입문~5무극)
    prof_grade_2:        [maxProfGrade, 2],
    prof_grade_3:        [maxProfGrade, 3],
    prof_grade_4:        [maxProfGrade, 4],
    prof_grade_5:        [maxProfGrade, 5],
    prof_dual_3:         [typesAtDalIn, 2],
    prof_all_5:          [typesAtMugeuk, 5],
    // 처치 기록
    kill_chain_300:      [totalKills, 500],
    kill_chain_1000:     [totalKills, 2000],
    kill_chain_2500:     [totalKills, 5000],
    kill_chain_10000:    [totalKills, 20000],
    kill_chain_100000:   [totalKills, 100000],
    kill_chain_1000000:  [totalKills, 1000000],
    kill_chain_10000000: [totalKills, 10000000],
    // 전장 처치 — 객잔
    inn_hunter_100:      [innKills, 100],
    inn_hunter_500:      [innKills, 500],
    inn_hunter_3000:     [innKills, 3000],
    // 전장 처치 — 천산
    cheonsan_entry:      [cheonsanKills, 1],
    cheonsan_100:        [cheonsanKills, 100],
    cheonsan_1000:       [cheonsanKills, 1000],
    // 성화 순환
    seonghwa_rekindler:  [totalSeonghwaUsed, ((repeatableAchCounts?.['seonghwa_rekindler'] ?? 0) + 1) * 15],
  };

  const repsByCategory = getRepresentativesByCategory(achievements);

  return (
    <div>
      {/* 상단 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span className="card-label" style={{ marginBottom: 0 }}>업적</span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          달성 업적: {achievementCount} / {ACHIEVEMENTS.length}개
        </span>
      </div>

      {CATEGORY_ORDER.map(cat => {
        const reps = repsByCategory.get(cat) ?? [];
        if (reps.length === 0) return null;
        if (!isSectionVisible(reps, achievements)) return null;

        const allInCat = CATEGORY_ALL_MAP.get(cat) ?? [];
        const catCompleted = allInCat.filter(a => achievements.includes(a.id)).length;
        const isCollapsed = collapsedCategories.has(cat);

        return (
          <div key={cat} style={{ marginBottom: 10 }}>
            {/* 섹션 헤더 */}
            <div
              onClick={() => toggleCategory(cat)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '5px 10px',
                background: 'var(--bg-card)',
                borderRadius: 6,
                cursor: 'pointer',
                marginBottom: isCollapsed ? 0 : 5,
                userSelect: 'none',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                {CATEGORY_LABELS[cat]}
              </span>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  달성 {catCompleted}/{allInCat.length}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                  {isCollapsed ? '▼' : '▲'}
                </span>
              </span>
            </div>

            {/* 업적 목록 */}
            {!isCollapsed && reps.map(ach => {
              const achieved = achievements.includes(ach.id);
              const prerequisiteMet = !ach.prerequisite || achievements.includes(ach.prerequisite);
              const visible = achieved || prerequisiteMet;
              const showDescription = achieved || visible || !ach.secret;

              // 진행도
              let progress: string | null = null;
              if (!achieved && visible && ach.id in progressMap) {
                const [cur, max] = progressMap[ach.id];
                progress = `${Math.min(cur, max).toLocaleString()}/${max.toLocaleString()}`;
              }

              const isChain = ach.chainId != null;
              const completedHistory = isChain
                ? (CHAIN_STAGES_MAP.get(ach.chainId!) ?? []).filter(
                    s => achievements.includes(s.id) && s.id !== ach.id,
                  )
                : [];
              const hasHistory = completedHistory.length > 0;
              const historyOpen = isChain && chainHistoryOpen.has(ach.chainId!);

              return (
                <div key={ach.id}>
                  <div
                    className="card"
                    style={{
                      marginBottom: hasHistory && historyOpen ? 0 : 5,
                      padding: 10,
                      opacity: achieved ? 1 : visible ? 0.7 : 0.3,
                      borderLeft: isChain ? '2px solid var(--gold)' : undefined,
                      borderBottomLeftRadius: hasHistory && historyOpen ? 0 : undefined,
                      borderBottomRightRadius: hasHistory && historyOpen ? 0 : undefined,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 14, flexShrink: 0 }}>
                        {achieved
                          ? <span style={{ color: 'var(--gold)' }}>✓</span>
                          : visible ? '☐' : '🔒'}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        {progress && (
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            {progress}
                          </span>
                        )}
                        {hasHistory && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              toggleChainHistory(ach.chainId!);
                            }}
                            style={{
                              fontSize: 10,
                              color: 'var(--text-dim)',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '2px 4px',
                              lineHeight: 1,
                            }}
                          >
                            {historyOpen ? '▴ 이전 기록' : '▾ 이전 기록'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 이전 기록 패널 */}
                  {historyOpen && (
                    <div
                      style={{
                        background: 'var(--bg-card)',
                        borderLeft: '2px solid var(--gold)',
                        borderBottomLeftRadius: 6,
                        borderBottomRightRadius: 6,
                        padding: '5px 10px 5px 34px',
                        marginBottom: 5,
                      }}
                    >
                      {completedHistory.map(s => (
                        <div key={s.id} style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.8 }}>
                          <span style={{ color: 'var(--gold)', marginRight: 4 }}>✓</span>
                          {s.name} — {s.description}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* 반복 업적 섹션 */}
      {(() => {
        const repAchs = ACHIEVEMENTS.filter(a => a.repeatable);
        if (repAchs.length === 0) return null;
        return (
          <div style={{ marginTop: 10 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '5px 10px', background: 'var(--bg-card)', borderRadius: 6, marginBottom: 5,
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>반복 업적</span>
            </div>
            {repAchs.map(ach => {
              const count = repeatableAchCounts?.[ach.id] ?? 0;

              // 불씨의 순환 — 수동 수령 방식
              if (ach.id === 'seonghwa_rekindler') {
                const unclaimed = count - seonghwaRewardsClaimed;
                const nextThreshold = (count + 1) * 15;
                return (
                  <div key={ach.id} className="card" style={{ marginBottom: 5, padding: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 14, flexShrink: 0, color: 'var(--text-dim)' }}>↻</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-primary)' }}>
                            {ach.name}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                            총 {totalSeonghwaUsed}개 사용 · {count}회 달성
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                          {ach.description}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                        {unclaimed > 0 && (
                          <button
                            onClick={() => claimSeonghwaReward()}
                            style={{
                              fontSize: 11, padding: '3px 8px', borderRadius: 4, cursor: 'pointer',
                              background: 'var(--gold)', color: 'var(--bg-primary)',
                              border: 'none', fontWeight: 600,
                            }}
                          >
                            성화 수령 {unclaimed > 1 ? `(${unclaimed}개 대기)` : ''}
                          </button>
                        )}
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          {totalSeonghwaUsed}/{nextThreshold}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }

              // 살생의 업 등 기존 반복 업적
              const maxCount = 10;
              const isDone = count >= maxCount;
              const nextThreshold = isDone ? null : Math.floor(10000 * (count + 1) * (count + 2) / 2);
              const remaining = nextThreshold != null ? Math.max(0, nextThreshold - totalKills) : 0;
              return (
                <div key={ach.id} className="card" style={{ marginBottom: 5, padding: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 14, flexShrink: 0, color: isDone ? 'var(--gold)' : 'var(--text-dim)' }}>
                      {isDone ? '✓' : '↻'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 500, fontSize: 13, color: isDone ? 'var(--gold)' : 'var(--text-primary)' }}>
                          {ach.name}
                        </span>
                        <span style={{
                          fontSize: 10, padding: '1px 5px', borderRadius: 4,
                          background: isDone ? 'var(--gold)' : 'var(--bg-secondary)',
                          color: isDone ? 'var(--bg-primary)' : 'var(--text-dim)',
                        }}>
                          {count}/{maxCount}회
                        </span>
                        {ach.reward?.artPoints && (
                          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                            무공포인트 +{ach.reward.artPoints}/회
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                        {ach.description}
                      </div>
                    </div>
                    {!isDone && (
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>
                        {remaining.toLocaleString()}마리 남음
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}
