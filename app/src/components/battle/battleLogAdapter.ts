/**
 * battleLogAdapter.ts — 평탄한 BattleLogEntry[] 를 렌더 구조로 변환하는 순수 함수.
 * combat-start 엔트리를 경계로 Combat 블록을 구성하고,
 * time 단위로 turn-group 을 묶어 2축 타임라인 렌더에 넘긴다.
 */
import type { BattleLogEntry } from '../../store/types';

export interface TurnGroup {
  time: number;
  entries: BattleLogEntry[];   // event / flavor / dialogue
  /** danger turn: 한 턴에 받은 피해가 전투 총 피격의 50% 이상 혹은 단일 피격이 maxHp 25%+ */
  danger: boolean;
}

export interface CombatBlock {
  header: BattleLogEntry;           // kind: 'combat-start'
  lawBanner: BattleLogEntry | null; // kind: 'law' (0~1개)
  turnGroups: TurnGroup[];
  killBanner: BattleLogEntry | null; // kind: 'kill'
  /** combat 통계 (헤더에 표시) */
  totalOutgoing: number;
  totalIncoming: number;
  totalFireChips: number;
  sparkline: string;
  combatDuration: number;           // 마지막 엔트리 time - 0
  isFinished: boolean;              // killBanner 가 있으면 true
}

export interface SectionItem {
  kind: 'combat';
  combat: CombatBlock;
}
export interface DividerItem {
  kind: 'divider';
  entry: BattleLogEntry;            // kind: 'system'
}

export type RenderItem = SectionItem | DividerItem;

const SPARK_GLYPHS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

function buildSparkline(values: number[]): string {
  if (values.length === 0) return '';
  const max = Math.max(...values, 1);
  return values
    .map(v => {
      if (v <= 0) return '▁';
      const ratio = v / max;
      const idx = Math.min(
        SPARK_GLYPHS.length - 1,
        Math.max(0, Math.floor(ratio * (SPARK_GLYPHS.length - 1))),
      );
      return SPARK_GLYPHS[idx];
    })
    .join('');
}

/**
 * entries 를 순회하며 CombatBlock 배열 + 중간 system divider 배열을 동시에 구성.
 * system 엔트리는 두 combat 사이에 있으면 DividerItem 으로 분리.
 */
export function adaptBattleLog(entries: BattleLogEntry[], playerMaxHp = 1): RenderItem[] {
  const items: RenderItem[] = [];
  let current: CombatBlock | null = null;
  let turnGroupsByTime: Map<number, TurnGroup> | null = null;

  function finalizeCombat() {
    if (!current || !turnGroupsByTime) return;
    const groups = Array.from(turnGroupsByTime.values()).sort((a, b) => a.time - b.time);
    // 각 group 의 outgoing 합을 스파크라인으로
    const outgoingPerGroup = groups.map(g =>
      g.entries.filter(e => e.kind === 'event' && e.side === 'outgoing' && typeof e.value === 'number')
        .reduce((s, e) => s + (typeof e.value === 'number' ? e.value : 0), 0),
    );
    current.sparkline = buildSparkline(outgoingPerGroup);
    // danger 판정
    const totalIncoming = current.totalIncoming;
    for (const g of groups) {
      const gIncoming = g.entries
        .filter(e => e.kind === 'event' && e.side === 'incoming' && e.tag === 'hit' && typeof e.value === 'number')
        .reduce((s, e) => s + (typeof e.value === 'number' ? e.value : 0), 0);
      const maxSingle = g.entries
        .filter(e => e.kind === 'event' && e.side === 'incoming' && e.tag === 'hit' && typeof e.value === 'number')
        .reduce((m, e) => Math.max(m, typeof e.value === 'number' ? e.value : 0), 0);
      const dangerByRatio = totalIncoming > 0 && gIncoming / totalIncoming >= 0.5 && gIncoming > 0;
      const dangerBySingle = maxSingle >= playerMaxHp * 0.25;
      if (dangerByRatio || dangerBySingle) g.danger = true;
    }
    current.turnGroups = groups;
    const lastEntry = groups.length > 0 ? groups[groups.length - 1].entries[groups[groups.length - 1].entries.length - 1] : null;
    current.combatDuration = lastEntry ? lastEntry.time : 0;
    items.push({ kind: 'combat', combat: current });
    current = null;
    turnGroupsByTime = null;
  }

  for (const entry of entries) {
    if (entry.kind === 'combat-start') {
      finalizeCombat();
      current = {
        header: entry,
        lawBanner: null,
        turnGroups: [],
        killBanner: null,
        totalOutgoing: 0,
        totalIncoming: 0,
        totalFireChips: 0,
        sparkline: '',
        combatDuration: 0,
        isFinished: false,
      };
      turnGroupsByTime = new Map();
      continue;
    }
    if (entry.kind === 'system') {
      if (!current) {
        items.push({ kind: 'divider', entry });
      } else {
        // combat 중간의 system 은 그 combat 에 flavor 취급 (간단히 system divider 처리)
        items.push({ kind: 'divider', entry });
      }
      continue;
    }
    if (!current || !turnGroupsByTime) {
      // combat 경계 밖의 event/flavor/law/kill 은 임시 combat 블록 생성
      current = {
        header: { id: entry.id, time: 0, actor: 'system', kind: 'combat-start', enemyId: '', playerAttackInterval: 0, enemyAttackInterval: 0 },
        lawBanner: null,
        turnGroups: [],
        killBanner: null,
        totalOutgoing: 0,
        totalIncoming: 0,
        totalFireChips: 0,
        sparkline: '',
        combatDuration: 0,
        isFinished: false,
      };
      turnGroupsByTime = new Map();
    }

    if (entry.kind === 'law') {
      current.lawBanner = entry;
      continue;
    }
    if (entry.kind === 'kill') {
      current.killBanner = entry;
      current.isFinished = true;
      continue;
    }
    if (entry.kind === 'event' || entry.kind === 'flavor' || entry.kind === 'dialogue') {
      const t = entry.time;
      let group = turnGroupsByTime.get(t);
      if (!group) {
        group = { time: t, entries: [], danger: false };
        turnGroupsByTime.set(t, group);
      }
      group.entries.push(entry);
      // 통계 누적
      if (entry.kind === 'event' && typeof entry.value === 'number') {
        if (entry.side === 'outgoing') current.totalOutgoing += entry.value;
        else if (entry.side === 'incoming' && entry.tag === 'hit') current.totalIncoming += entry.value;
      }
      if (entry.kind === 'event' && entry.chips) {
        for (const c of entry.chips) {
          if (c.kind === 'fire') current.totalFireChips += c.count ?? 1;
        }
      }
    }
  }
  finalizeCombat();
  return items;
}

/** 숫자를 3자리 콤마로 포맷 */
export function formatNumberCompact(n: number): string {
  return n.toLocaleString('en-US');
}
