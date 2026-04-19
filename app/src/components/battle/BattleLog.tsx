/**
 * BattleLog.tsx — v6 전투 로그 렌더러
 * 평탄한 BattleLogEntry[] 를 받아 2축 타임라인으로 표시.
 * density 상태는 부모(BattleScreen)에서 hoist 관리 — 이 컴포넌트는 presentational.
 */
import { useEffect, useMemo, useRef } from 'react';
import type { BattleLogEntry } from '../../store/types';
import { getMonsterDef } from '../../data/monsters';
import { adaptBattleLog, formatNumberCompact, type CombatBlock, type RenderItem, type TurnGroup } from './battleLogAdapter';
import '../../styles/battle-log.css';

export type DensityMode = 'full' | 'compact' | 'minimal';

export default function BattleLog({
  entries,
  playerMaxHp,
  density,
}: {
  entries: BattleLogEntry[];
  playerMaxHp: number;
  density: DensityMode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (rootRef.current) rootRef.current.scrollTop = rootRef.current.scrollHeight;
  }, [entries]);

  const items: RenderItem[] = useMemo(
    () => adaptBattleLog(entries, playerMaxHp),
    [entries, playerMaxHp],
  );

  return (
    <div className={`battle-log-root mode-${density}`} ref={rootRef}>
      <div className="log">
        {items.map((item, i) => {
          if (item.kind === 'divider') {
            return (
              <div key={`div-${item.entry.id}`} className="section-divider">
                {item.entry.text ?? ''}
              </div>
            );
          }
          return <CombatView key={`combat-${item.combat.header.id}-${i}`} block={item.combat} />;
        })}
      </div>
    </div>
  );
}

function CombatView({ block }: { block: CombatBlock }) {
  const header = block.header;
  const enemyName = header.enemyId
    ? (getMonsterDef(header.enemyId)?.name ?? header.enemyId)
    : '';
  const playerInterval = header.playerAttackInterval ?? 0;
  const enemyInterval = header.enemyAttackInterval ?? 0;
  const durationLabel = block.isFinished
    ? `· ${block.combatDuration.toFixed(1)}초 전투`
    : `· ${block.combatDuration.toFixed(1)}초 진행중`;
  const sparkLabel = playerInterval > 0
    ? `${playerInterval.toFixed(1)}s 간격 피해`
    : '턴별 피해';

  return (
    <div className="combat">
      <div className="combat-header">
        <span className="combat-target">
          {enemyName}<span className="turn-count">{durationLabel}</span>
          {playerInterval > 0 && (
            <span className="speeds">
              내 공속 <code>{playerInterval.toFixed(1)}s</code>
              {enemyInterval > 0 && <> · 적 공속 <code>{enemyInterval.toFixed(1)}s</code></>}
            </span>
          )}
        </span>
        <div className="combat-stats">
          <span className="stat">피해 <span className="num">{formatNumberCompact(block.totalOutgoing)}</span></span>
          <span className="stat">피격 <span className="num">{formatNumberCompact(block.totalIncoming)}</span></span>
          {block.totalFireChips > 0 && (
            <span className="stat">불씨 <span className="num">+{block.totalFireChips}</span></span>
          )}
          {block.sparkline.length > 0 && (
            <span className="stat-sparkline">
              <span className="label">{sparkLabel}</span>
              <span className="sparkline">{block.sparkline}</span>
            </span>
          )}
        </div>
      </div>

      {block.lawBanner && (
        <div className="law-banner">
          {block.lawBanner.lawFlavor && (
            <div className="law-flavor">{block.lawBanner.lawFlavor}</div>
          )}
          <div className="law-name">{block.lawBanner.lawName ?? ''}</div>
          {block.lawBanner.lawText && (
            <div className="law-text">{block.lawBanner.lawText}</div>
          )}
        </div>
      )}

      <div className="combat-body">
        {block.turnGroups.map(group => (
          <TurnGroupView key={`tg-${group.time}-${group.entries[0]?.id ?? 'x'}`} group={group} />
        ))}
      </div>

      {block.killBanner && (
        <div className="kill-banner">
          <div className="title">처치 · {block.killBanner.enemyName ?? ''}</div>
          {block.killBanner.rewards && block.killBanner.rewards.length > 0 && (
            <div className="rewards">
              {block.killBanner.rewards.map((r, i) => (
                <span key={i} className="reward-chip">
                  <span className="label">{r.label}</span>
                  <span className="val">{r.value}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TurnGroupView({ group }: { group: TurnGroup }) {
  return (
    <div className={`turn-group ${group.danger ? 'danger' : ''}`}>
      <div className="turn-label">
        {group.time.toFixed(1)}<span className="unit">s</span>
        {group.danger && <span className="marker">▲</span>}
      </div>
      <div className="turn-events">
        {group.entries.map(entry => {
          if (entry.kind === 'event') return <EventRow key={entry.id} entry={entry} danger={group.danger} />;
          if (entry.kind === 'flavor') return <FlavorRow key={entry.id} entry={entry} />;
          if (entry.kind === 'dialogue') return <DialogueRow key={entry.id} entry={entry} />;
          return null;
        })}
      </div>
    </div>
  );
}

function EventRow({ entry, danger }: { entry: BattleLogEntry; danger: boolean }) {
  const isStatus = (entry.chips && entry.chips.length > 0) && (entry.value == null || entry.value === 0) && !entry.name;
  const isHitHeavy = danger && entry.side === 'incoming' && entry.tag === 'hit' && entry.valueTier === 'hit-heavy';
  const classes = ['event'];
  if (entry.side) classes.push(entry.side);
  if (isStatus) classes.push('status-row');
  if (isHitHeavy) classes.push('hit-heavy-row');

  const tag = entry.tag ? <span className={`tag ${entry.tag}`}>{tagLabel(entry.tag)}</span> : null;
  const name = entry.name ? (
    <span className="name">
      {entry.name}
      {entry.subName && <span className="sub">{entry.subName}</span>}
    </span>
  ) : null;
  const valueEl = entry.value != null ? (
    <span className={`value ${entry.valueTier ?? 'normal'}`}>{entry.value}</span>
  ) : null;

  const chips = entry.chips?.map((c, i) => {
    if (c.kind === 'fire') {
      return (
        <span key={i} className="fire-chip">
          {c.label}
          {c.count != null && <span className="count">+{c.count}</span>}
        </span>
      );
    }
    return <span key={i} className="status-chip">{c.label}</span>;
  });

  return (
    <div className={classes.join(' ')}>
      <div className="side">
        {entry.side === 'outgoing' ? (
          <>
            {tag}
            {name}
            {chips}
            {valueEl}
          </>
        ) : (
          <>
            {valueEl}
            {name}
            {chips}
            {tag}
          </>
        )}
      </div>
    </div>
  );
}

function FlavorRow({ entry }: { entry: BattleLogEntry }) {
  const side = entry.textSide === 'left' ? 'side-left' : entry.textSide === 'both' ? 'both' : 'side-right';
  return (
    <div className={`flavor ${side} ${entry.minor ? 'minor' : 'major'}`}>
      {entry.text ?? ''}
    </div>
  );
}

function DialogueRow({ entry }: { entry: BattleLogEntry }) {
  const side = entry.textSide === 'left' ? 'side-left' : 'side-right';
  return (
    <div className={`dialogue ${side} ${entry.minor ? 'minor' : 'major'}`}>
      {entry.text ?? ''}
    </div>
  );
}

function tagLabel(tag: string): string {
  switch (tag) {
    case 'crit': return '치명';
    case 'special': return '비기';
    case 'hit': return '피격';
    case 'heal': return '적회복';
    case 'block': return '차단';
    case 'dodge': return '회피';
    default: return tag;
  }
}
