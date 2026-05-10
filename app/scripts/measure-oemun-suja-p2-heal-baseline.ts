/**
 * 식화심법 장착 외문수좌 P2 회복량 baseline 측정
 *
 * 목적: PR3(맹세 시스템 페널티 파이프라인) 도입 후 식화심법(재의 묵념)이
 *       외문수좌 P2 단계에서 얼마나 회복하는지 baseline 을 기록한다.
 *
 *  - 맹세 회복 페널티는 폐지됨(maxHp 페널티로 교체) → applyHealing은 외문수좌
 *    playerRecoveryDebuff 만 적용. lockedAt 여부와 회복량은 무관.
 *  - playerRecoveryDebuff 가 외문수좌 P2 진입 시점에 잔존 시 적용됨.
 *
 * 측정 방식:
 *   1. 식화심법 장착(emberBurnHpRecoveryPerStack 활성)
 *   2. 외문수좌 P2 페이즈로 setState 강제, hp=50% 로 깎기
 *   3. 1소각당 회복량 = floor(maxHp × stacks × perStack)
 *   4. 30초 동안 회복 누적 추이 기록
 *
 * 실행: cd app && npx tsx scripts/measure-oemun-suja-p2-heal-baseline.ts
 */
import { getState, setState, callAction, advanceTime, resetGame } from '../src/testAdapter';
import { getMonsterDef } from '../src/data/monsters';

const SUJA_ID = 'baehwa_oemun_suja';
const FIELD_ID = 'baehwagyo_oemun';

function buildSikhwaPlayer() {
  resetGame();
  setState({
    stats: { gi: 800, sim: 800, che: 800 },
    totalSpentQi: 5_000_000,
    tier: 4,
    artPoints: 30,
    ownedArts: [
      // 식화심법 (배화교 simbeop) — emberBurnHpRecoveryPerStack 활성
      { id: 'baehwa_seonghwa_simbeop', totalSimdeuk: 8000 },
      { id: 'samjae_sword', totalSimdeuk: 8000 },
    ],
    equippedArts: ['samjae_sword'],
    equippedSimbeop: 'baehwa_seonghwa_simbeop',
    activeMasteries: {
      samjae_sword: ['samjae_sword_ult'],
    },
    proficiency: { sword: 50000, fist: 0, palm: 0, claw: 0, blade: 0, staff: 0, mental: 50000 } as any,
    fieldUnlocks: { training: true, yasan: true, inn: true, baehwagyo_oemun: true },
    tutorialFlags: {
      equippedSword: true, equippedSimbeop: true, yasanUnlocked: true,
      killedWood: true, killedIron: true, firstBreakthroughNotified: true,
    },
    bahwagyo: {
      nodeLevels: {
        // 식화심법 트리 — emberBurnHpRecoveryPerStack/StackCap/IntervalSec 활성화 노드
        'mind-1': 30, 'mind-2': 30, 'mind-3': 30, 'mind-4': 30,
      },
    } as any,
    hp: 999999,
  });
}

console.log('=== 식화심법 외문수좌 P2 회복량 baseline 측정 ===\n');

buildSikhwaPlayer();
callAction('startHunt', FIELD_ID, SUJA_ID);
advanceTime(1);

const monDef = getMonsterDef(SUJA_ID)!;
const s = getState();
if (!s.bossPatternState || s.bossPatternState.monsterState?.kind !== SUJA_ID) {
  console.error('FAIL: bossPatternState 또는 monsterState 접근 실패');
  process.exit(1);
}

// P2 페이즈로 강제 전환 + 플레이어 HP 50%
const playerMaxHp = s.maxHp;
const targetPlayerHp = Math.floor(playerMaxHp * 0.5);

setState({
  hp: targetPlayerHp,
  currentEnemy: {
    ...(s.currentEnemy!),
    hp: Math.floor(monDef.hp * 0.5),
  },
  bossPatternState: {
    ...s.bossPatternState,
    playerRecoveryDebuff: undefined,  // P2 진입 직후 디버프 미적용 가정
    monsterState: {
      ...s.bossPatternState.monsterState,
      phase: 'p2',
      hasTriggeredP2: true,
      transitionTimer: 0,
      absorbedEmberStacks: 10,
      p2Multipliers: { atkMult: 1.6, dmgTakenMult: 0.6 },
    } as any,
  },
});

// 식화심법 효과 확인
const masteryEff = (getState() as any);
const eff = masteryEff?.activeMasteries;
console.log(`[INFO] equippedSimbeop = ${getState().equippedSimbeop}`);
console.log(`[INFO] player maxHp = ${playerMaxHp}, 시작 hp = ${targetPlayerHp}`);

// 30초 동안 추적 — 매 5초마다 hp 기록
const samples: { tSec: number; hp: number; gain: number; hasDebuff: boolean }[] = [];
let lastHp = getState().hp;
samples.push({ tSec: 0, hp: lastHp, gain: 0, hasDebuff: false });

for (let t = 5; t <= 30; t += 5) {
  advanceTime(5);
  const cur = getState();
  const hp = cur.hp;
  const debuff = cur.bossPatternState?.playerRecoveryDebuff;
  const hasDebuff = !!(debuff && debuff.remainingSec > 0);
  samples.push({ tSec: t, hp, gain: hp - lastHp, hasDebuff });
  lastHp = hp;
}

console.log('\n[측정] 시간(초) → HP, 5초간 변화, recoveryDebuff 잔존 여부');
console.log('  t=  0s | hp =', samples[0].hp);
for (let i = 1; i < samples.length; i++) {
  const s = samples[i];
  console.log(
    `  t=${String(s.tSec).padStart(3, ' ')}s | hp = ${String(s.hp).padStart(7, ' ')} | Δ = ${s.gain >= 0 ? '+' : ''}${s.gain} | debuff=${s.hasDebuff ? 'O' : 'X'}`
  );
}

const totalGain = samples[samples.length - 1].hp - samples[0].hp;
console.log(`\n[종합] 30초간 총 HP 변화: ${totalGain >= 0 ? '+' : ''}${totalGain}`);
console.log(`        (양수=회복 우세, 음수=피해 우세)`);

console.log('\n[기록] 본 baseline 은 외문수좌 P2 회복량. 맹세 회복 페널티는 폐지되었으므로');
console.log('       lockedAt 여부와 무관하게 동일한 회복량이 측정되어야 한다.');
