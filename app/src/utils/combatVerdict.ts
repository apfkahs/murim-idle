/**
 * 전투 종합 판정 — TTK(Time-To-Kill) 비율 기반
 * CombatStatusCard 의 DPS 게이지 아래 뱃지로 사용한다.
 *
 * 우세(good) / 호각(neutral) / 열세(bad)
 * - myTTK   = enemyHp / playerDps   (내가 적을 잡기까지 걸리는 시간)
 * - enemyTTK = playerHp / enemyDps  (적이 나를 잡기까지 걸리는 시간)
 * - ratio = enemyTTK / myTTK  (1 초과면 내가 유리)
 */

export type Verdict = 'good' | 'neutral' | 'bad';

export interface VerdictResult {
  verdict: Verdict;
  label: string;    // '✓ 우세' / '— 호각' / '⚠ 종합 열세'
  dpsDelta: number; // 내 DPS - 적 DPS (signed)
  hpDelta: number;  // 내 HP - 적 HP (signed)
}

const LABELS: Record<Verdict, string> = {
  good: '✓ 우세',
  neutral: '— 호각',
  bad: '⚠ 종합 열세',
};

export function calcCombatVerdict(args: {
  playerHp: number;
  playerDps: number;
  enemyHp: number;
  enemyDps: number;
}): VerdictResult {
  const { playerHp, playerDps, enemyHp, enemyDps } = args;

  const dpsDelta = playerDps - enemyDps;
  const hpDelta = playerHp - enemyHp;

  // 0 나누기 가드
  const pd = playerDps <= 0;
  const ed = enemyDps <= 0;
  if (pd && ed) {
    return { verdict: 'neutral', label: LABELS.neutral, dpsDelta, hpDelta };
  }
  if (pd) return { verdict: 'bad', label: LABELS.bad, dpsDelta, hpDelta };
  if (ed) return { verdict: 'good', label: LABELS.good, dpsDelta, hpDelta };

  const myTTK = enemyHp / playerDps;
  const enemyTTK = playerHp / enemyDps;
  if (myTTK <= 0 || enemyTTK <= 0) {
    return { verdict: 'neutral', label: LABELS.neutral, dpsDelta, hpDelta };
  }

  const ratio = enemyTTK / myTTK;
  let verdict: Verdict;
  if (ratio >= 1.3) verdict = 'good';
  else if (ratio >= 0.8) verdict = 'neutral';
  else verdict = 'bad';

  return { verdict, label: LABELS[verdict], dpsDelta, hpDelta };
}
