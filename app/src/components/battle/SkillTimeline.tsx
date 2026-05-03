import { useGameStore, getMonsterRevealLevel } from '../../store/gameStore';
import { getArtDef, type ArtDef } from '../../data/arts';
import { BOSS_PATTERNS } from '../../data/monsters';
import { SEONGHWA_GEOMBEOP_ART_ID, SWORD_NODES } from '../../utils/combat/baehwagyoEffects';

/**
 * 스킬 타임라인 — 절초(플레이어) + 보스 차징(적) 통합 표시.
 * 행 1개도 없으면 섹션 자체를 렌더하지 않는다.
 *
 * 플레이어 절초:
 *   1) 차징 중 → `playerFinisherCharge.artId === artId` 일 때 warn 강조
 *   2) 쿨다운 → `ultCooldowns[artId] > 0`
 *   3) 준비됨 → 그 외 (stamina 부족 시 회색)
 *
 * 보스 차징:
 *   `bossPatternState.bossChargeState != null` 일 때 1행.
 *   reveal < 4 이면 스킬명 "???"
 */
export default function SkillTimeline() {
  const currentEnemy = useGameStore(s => s.currentEnemy);
  const equippedArts = useGameStore(s => s.equippedArts);
  const activeMasteries = useGameStore(s => s.activeMasteries);
  const ultCooldowns = useGameStore(s => s.ultCooldowns);
  const playerFinisherCharge = useGameStore(s => s.playerFinisherCharge);
  const stamina = useGameStore(s => s.stamina);
  const bossPatternState = useGameStore(s => s.bossPatternState);
  const killCounts = useGameStore(s => s.killCounts);
  const bahwagyoNodeLevels = useGameStore(s => s.bahwagyo?.nodeLevels ?? {});

  if (!currentEnemy) return null;

  const reveal = getMonsterRevealLevel(killCounts[currentEnemy.id] ?? 0);

  type Row = {
    key: string;
    side: 'ally' | 'enemy';
    state: 'ready' | 'cool' | 'charge';
    disabled?: boolean;
    icon: string;
    name: string;
    tag?: { label: string; kind: 'ready' | 'warn' };
    progressPct: number;
    timeText: string;
  };
  const rows: Row[] = [];

  // ── 플레이어 절초 행 ──
  for (const artId of equippedArts) {
    const def = getArtDef(artId);
    if (!def) continue;
    if (def.ultMultiplier == null) continue;

    const masteryIds = activeMasteries[artId] ?? [];
    // 절초 해금 여부 — 성화검법은 bahwagyo sword-main lv5+ 조건, 나머지는 unlockUlt 마스터리
    const ultUnlocked = artId === SEONGHWA_GEOMBEOP_ART_ID
      ? (bahwagyoNodeLevels[SWORD_NODES.main] ?? 0) >= 5
      : def.masteries.some(m => masteryIds.includes(m.id) && m.effects?.unlockUlt === true);
    if (!ultUnlocked) continue;

    const ultName = getUltNameForArt(def, masteryIds);
    const effectiveUltCost = computeEffectiveUltCost(def, masteryIds);
    const cooldownLeft = ultCooldowns[artId] ?? 0;
    const chargeState = playerFinisherCharge && playerFinisherCharge.artId === artId
      ? playerFinisherCharge
      : null;

    if (chargeState && chargeState.timeLeft > 0) {
      const chargeTotal = chargeState.chargeTotal;
      const progress = chargeTotal > 0
        ? Math.min(100, Math.max(0, ((chargeTotal - chargeState.timeLeft) / chargeTotal) * 100))
        : 100;
      rows.push({
        key: `art-${artId}-charge`,
        side: 'ally',
        state: 'charge',
        icon: '◈',
        name: ultName,
        tag: { label: '차징 중', kind: 'warn' },
        progressPct: progress,
        timeText: `${chargeState.timeLeft.toFixed(1)}s 후`,
      });
    } else if (cooldownLeft > 0 && def.ultCooldown && def.ultCooldown > 0) {
      const progress = Math.min(100, Math.max(0, ((def.ultCooldown - cooldownLeft) / def.ultCooldown) * 100));
      rows.push({
        key: `art-${artId}-cd`,
        side: 'ally',
        state: 'cool',
        icon: '⚔',
        name: ultName,
        progressPct: progress,
        timeText: `${cooldownLeft.toFixed(1)}s 쿨`,
      });
    } else {
      const notEnough = stamina < effectiveUltCost;
      rows.push({
        key: `art-${artId}-rdy`,
        side: 'ally',
        state: 'ready',
        disabled: notEnough,
        icon: '◈',
        name: ultName,
        tag: { label: notEnough ? '내력 부족' : '준비됨', kind: 'ready' },
        progressPct: 100,
        timeText: notEnough ? '내력 부족' : '발동 대기',
      });
    }
  }

  // ── 보스 차징 행 ──
  const chargeState = bossPatternState?.bossChargeState;
  if (chargeState) {
    const bossPat = BOSS_PATTERNS[currentEnemy.id];
    const skillDef = bossPat?.skills.find(s => s.id === chargeState.skillId);
    const chargeTotal = skillDef?.chargeTime ?? 0;
    const turnsLeft = chargeState.turnsLeft;
    const progress = chargeTotal > 0
      ? Math.min(100, Math.max(0, ((chargeTotal - turnsLeft) / chargeTotal) * 100))
      : 100;
    const nameShown = reveal >= 4 ? (skillDef?.displayName ?? chargeState.skillId) : '???';
    rows.push({
      key: `boss-${chargeState.skillId}`,
      side: 'enemy',
      state: 'charge',
      icon: '🔥',
      name: nameShown,
      tag: { label: `⚠ ${turnsLeft}턴 뒤 발동`, kind: 'warn' },
      progressPct: progress,
      timeText: `${turnsLeft}턴 후`,
    });
  }

  if (rows.length === 0) return null;

  return (
    <div className="skill-lane">
      <div className="lane-header">
        <span className="lane-title">◈ 스킬 쿨다운 · 예정 발동</span>
        <span className="lane-note">실시간</span>
      </div>
      <div className="skill-list">
        {rows.map(row => {
          const rowCls = [
            'skill-row',
            row.side,
            row.state === 'charge' ? 'warn' : '',
            row.state === 'ready' && !row.disabled ? 'ready' : '',
          ].filter(Boolean).join(' ');
          const fillCls = row.state === 'charge' ? 'warn' : row.side;
          const nameCls = row.disabled ? 'skill-name disabled' : 'skill-name';
          return (
            <div key={row.key} className={rowCls}>
              <span className="skill-side">{row.side === 'ally' ? '나' : '적'}</span>
              <span className="skill-icon">{row.icon}</span>
              <span className={nameCls}>{row.name}</span>
              {row.tag ? (
                <span className={`skill-tag ${row.tag.kind}`}>{row.tag.label}</span>
              ) : (
                <span />
              )}
              <div className="skill-progress">
                <div
                  className={`skill-progress-fill ${fillCls}`}
                  style={{ width: `${row.progressPct}%` }}
                />
              </div>
              <span className="skill-time">{row.timeText}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 절초 이름: ultChange.name > ultMessages[0] > `{artName} 절초` */
function getUltNameForArt(def: ArtDef, activeMasteryIds: string[]): string {
  for (const mId of activeMasteryIds) {
    const m = def.masteries.find(x => x.id === mId);
    const name = m?.effects?.ultChange?.name;
    if (name) return name;
  }
  return def.ultMessages?.[0] ?? `${def.name} 절초`;
}

/** 절초 내력 비용 — 활성 masteries 의 ultCostBonus 합산 */
function computeEffectiveUltCost(def: ArtDef, activeMasteryIds: string[]): number {
  let cost = def.ultCost ?? 0;
  for (const mId of activeMasteryIds) {
    const m = def.masteries.find(x => x.id === mId);
    const bonus = m?.effects?.ultChange?.ultCostBonus;
    if (bonus) cost += bonus;
  }
  return cost;
}
