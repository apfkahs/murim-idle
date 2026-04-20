import { useGameStore, getMonsterRevealLevel, calcStamina, calcTierMultiplier } from '../../store/gameStore';
import { getMonsterDef, BOSS_PATTERNS } from '../../data/monsters';
import CollapsibleCard from './CollapsibleCard';

/**
 * 좌우 분리 HP/MP + 진영별 버프/디버프 칩.
 * mockup combat-log-v2.html 의 `.bars`/`.side` 구조 재현.
 * - grid 1fr 1fr — 두 진영이 절대 서로 영역을 침범하지 않음
 * - 내 MP(내력)·적 MP(보스 스태미나)는 각자 진영 폭만 사용
 * - 적이 MP 시스템 없으면 "내력 없음" placeholder
 * - 모든 적 값은 reveal 단계에 따라 마스킹 (BattleScreen 원본 정책 일관)
 */
export default function CombatBars() {
  const hp = useGameStore(s => s.hp);
  const maxHp = useGameStore(s => s.maxHp);
  const stamina = useGameStore(s => s.stamina);
  const stats = useGameStore(s => s.stats);
  const tier = useGameStore(s => s.tier);
  const currentEnemy = useGameStore(s => s.currentEnemy);
  const killCounts = useGameStore(s => s.killCounts);
  const bossPatternState = useGameStore(s => s.bossPatternState);
  const playerStunTimer = useGameStore(s => s.playerStunTimer);
  const equipmentDotOnEnemy = useGameStore(s => s.equipmentDotOnEnemy);

  if (!currentEnemy) return null;

  const monDef = getMonsterDef(currentEnemy.id);
  const kills = killCounts[currentEnemy.id] ?? 0;
  const reveal = getMonsterRevealLevel(kills);
  const enemyName = reveal >= 1 ? (monDef?.name ?? currentEnemy.id) : '???';

  const maxStamina = calcStamina(stats.sim, calcTierMultiplier(tier));
  const hpPct = maxHp > 0 ? Math.max(0, (hp / maxHp) * 100) : 0;
  const staminaPct = maxStamina > 0 ? Math.max(0, (stamina / maxStamina) * 100) : 0;
  const enemyHpPct = currentEnemy.maxHp > 0 ? Math.max(0, (currentEnemy.hp / currentEnemy.maxHp) * 100) : 0;

  const bossPat = BOSS_PATTERNS[currentEnemy.id];
  const enemyHasStamina = bossPat != null && bossPat.stamina.max > 0;
  const enemyStaminaPct = enemyHasStamina && bossPatternState
    ? Math.max(0, ((bossPatternState.bossStamina ?? 0) / bossPat.stamina.max) * 100)
    : 0;
  const enemyStaminaLabel = bossPat?.staminaLabel ?? '내력';

  const dotLabels: Record<string, string> = {
    bleed: '출혈', poison: '독', stamina_drain: '산공', slow: '둔화',
  };

  // ── 플레이어 진영 버프 칩 ──
  const allyChips: { key: string; label: string }[] = [];
  if (playerStunTimer > 0) {
    allyChips.push({ key: 'stun', label: `경직 ${playerStunTimer.toFixed(1)}초` });
  }
  const freezeLeft = bossPatternState?.playerFreezeLeft ?? 0;
  if (freezeLeft > 0) {
    allyChips.push({ key: 'freeze', label: `빙결 ${freezeLeft}회 남음` });
  }
  for (const dot of bossPatternState?.playerDotStacks ?? []) {
    const label = dotLabels[dot.type] ?? dot.type;
    allyChips.push({
      key: `pdot-${dot.id}`,
      label: `${label} x${dot.stacks} (${Math.ceil(dot.remainingSec)}s)`,
    });
  }

  // ── 적 진영 버프/디버프 칩 ──
  const enemyChips: { key: string; label: string }[] = [];
  const cheolStacks = bossPatternState?.cheolbyeokStacks ?? 0;
  if (cheolStacks > 0) {
    const cheolSkill = bossPat?.skills.find(s => s.type === 'cheolbyeok');
    const maxStacks = cheolSkill?.cheolbyeokMaxStacks ?? 5;
    const reductionPct = Math.round(cheolStacks * (cheolSkill?.cheolbyeokReductionPerStack ?? 0.08) * 100);
    enemyChips.push({
      key: 'cheolbyeok',
      label: `철벽 ${cheolStacks}/${maxStacks} (-${reductionPct}%)`,
    });
  }
  for (const dot of equipmentDotOnEnemy) {
    enemyChips.push({
      key: `edot-${dot.equipId}`,
      label: `독 x${dot.stacks} (${Math.ceil(dot.remainingSec)}s)`,
    });
  }
  for (const buff of bossPatternState?.enemyBuffs ?? []) {
    const remain = buff.remainingSec != null ? ` (${Math.ceil(buff.remainingSec)}s)` : '';
    const pct = Math.round(buff.value * 100);
    const name = buff.type === 'timed_atk_buff' ? `공격력 +${pct}%` : buff.type;
    enemyChips.push({ key: `ebuff-${buff.id}`, label: `${name}${remain}` });
  }
  // main 추가: 흑풍채 흑영참 스택 / 복수심 / 최후의 저항
  const stackCount = bossPatternState?.stackCount ?? 0;
  if (stackCount > 0) {
    enemyChips.push({ key: 'blackstack', label: `흑영참 ${stackCount}` });
  }
  if (bossPatternState?.revengeActive) {
    enemyChips.push({ key: 'revenge', label: '복수심' });
  }
  if (bossPatternState?.lastStandActive) {
    enemyChips.push({ key: 'laststand', label: '최후의 저항' });
  }
  // main 추가: 녹림맹 회피 후 공격력 버프
  for (const buff of bossPatternState?.dodgeAtkBuffs ?? []) {
    const pct = Math.round(buff.atkPercent * 100);
    enemyChips.push({
      key: `dodgebuff-${buff.atkPercent}-${buff.remainingAttacks}`,
      label: `공격력 +${pct}% (${buff.remainingAttacks}회)`,
    });
  }
  // main 추가: 보스 차징 중 피해감소
  const chargeRed = bossPatternState?.bossChargeDmgReduction ?? 0;
  if (chargeRed > 0) {
    enemyChips.push({ key: 'chargered', label: `차지 방어 -${Math.round(chargeRed * 100)}%` });
  }
  // main 추가: 배화교 행자 보호 배율
  const guardMult = bossPatternState?.guardDamageTakenMultiplier;
  if (guardMult != null && guardMult < 1) {
    const reductionPct = Math.round((1 - guardMult) * 100);
    enemyChips.push({ key: 'guard', label: `보호 -${reductionPct}%` });
  }
  // main 추가: 배화교 행자 자폭 phase
  const atar = bossPatternState?.atarSacrificeState;
  if (atar) {
    enemyChips.push({ key: 'atar', label: `자폭 ${atar.turnsLeft}턴` });
  }
  // main 추가: 배화교 호위 단계
  const sraoshaTier = bossPatternState?.sraoshaTier ?? 0;
  if (sraoshaTier > 0) {
    enemyChips.push({ key: 'sraosha', label: `호위 ${sraoshaTier}단계` });
  }
  // main 추가: 배화교 호위 성맹 phase
  const howi = bossPatternState?.howiSacredOathState;
  if (howi) {
    if (howi.phase === 'awakening') {
      enemyChips.push({ key: 'howi', label: `성맹 ${howi.awakeningTurnsLeft}턴` });
    } else {
      enemyChips.push({ key: 'howi', label: '광분' });
    }
  }

  const enemyHpText = reveal >= 2
    ? `${Math.max(0, Math.floor(currentEnemy.hp))} / ${currentEnemy.maxHp}`
    : '??? / ???';

  return (
    <CollapsibleCard noHead title="">
      <div className="combat-bars">
        {/* 아군 진영 */}
        <div className="combat-side combat-side-ally">
          <div className="side-header">
            <span className="side-name">내 캐릭터</span>
          </div>
          <div className="bar-wrap bar-hp">
            <div className="fill fill-hp" style={{ width: `${hpPct}%` }} />
            <div className="bar-text">
              <span className="k">체력</span>
              <span className="v">{Math.floor(hp)} / {maxHp}</span>
            </div>
          </div>
          <div className="bar-wrap bar-mp">
            {maxStamina > 0 ? (
              <>
                <div className="fill fill-mp" style={{ width: `${staminaPct}%` }} />
                <div className="bar-text">
                  <span className="k">내력</span>
                  <span className="v">{Math.floor(stamina)} / {maxStamina}</span>
                </div>
              </>
            ) : (
              <div className="bar-empty">내력 없음</div>
            )}
          </div>
          <div className="side-buffs">
            {allyChips.map(chip => (
              <span key={chip.key} className="buff-chip">{chip.label}</span>
            ))}
          </div>
        </div>

        {/* 적 진영 */}
        <div className="combat-side combat-side-enemy">
          <div className="side-header">
            <span className="side-name">{enemyName}</span>
          </div>
          <div className="bar-wrap bar-hp">
            <div className="fill fill-enemy-hp" style={{ width: `${enemyHpPct}%` }} />
            <div className="bar-text rtl">
              <span className="k">체력</span>
              <span className="v">{enemyHpText}</span>
            </div>
          </div>
          <div className="bar-wrap bar-mp">
            {enemyHasStamina ? (
              <>
                <div className="fill fill-enemy-mp" style={{ width: `${enemyStaminaPct}%` }} />
                <div className="bar-text rtl">
                  <span className="k">{enemyStaminaLabel}</span>
                  <span className="v">
                    {reveal >= 4
                      ? `${Math.floor(bossPatternState?.bossStamina ?? 0)} / ${bossPat.stamina.max}`
                      : '??? / ???'}
                  </span>
                </div>
              </>
            ) : (
              <div className="bar-empty rtl">내력 없음</div>
            )}
          </div>
          <div className="side-buffs">
            {enemyChips.map(chip => (
              <span key={chip.key} className="buff-chip">{chip.label}</span>
            ))}
          </div>
        </div>
      </div>
    </CollapsibleCard>
  );
}
