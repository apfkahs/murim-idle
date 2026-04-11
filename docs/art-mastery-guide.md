# 무공 초식(招) 설계 가이드

> **핵심 원칙**: 초식의 효과는 반드시 `MasteryDef.effects` 데이터로만 선언한다.  
> `gameLoop.ts` / `combatCalc.ts`의 전역 함수는 특정 무공 ID나 초식 ID를 하드코딩해서는 안 되며,  
> 새 초식을 추가할 때마다 수정되어서도 안 된다.

---

## 왜 이 원칙이 필요한가

초식 효과를 `effects` 데이터가 아닌 전역 로직에 직접 넣으면:

- 새 무공/초식을 추가할 때마다 전투 루프를 수정해야 한다 → 버그 위험 증가
- 어떤 초식이 어떤 시스템에 영향을 주는지 추적하기 어렵다
- 초식을 해제/장착해도 효과가 제대로 켜지고 꺼지지 않을 수 있다

올바른 구조에서는 `calcQiPerSec`, `gatherMasteryEffects` 같은 계산 함수들이 `effects` 필드를 읽어 알아서 처리한다.

---

## 금지 패턴 (Anti-patterns)

```typescript
// ❌ 금지: gameLoop.ts에서 특정 초식 ID를 직접 확인
if (activeMasteries['samjae_simbeop']?.includes('samjae_simbeop_oui')) {
  combatQiMult *= 1.2;
}

// ❌ 금지: 새 초식 추가 시 gameLoop.ts 기운 생산 로직 직접 수정
qi += qiPerSec * combatQiRatio * dt * qiMult * someNewMasteryFactor;

// ✅ 올바른 방법: arts.ts의 effects에 필드 추가 → combatCalc.ts 계산 함수에서 소비
// arts.ts
effects: { simbeopQiMultiplier: 1.2 }
// combatCalc.ts calcQiPerSec 내부
simbeopMult *= mDef.effects.simbeopQiMultiplier;
```

---

## 효과 적용 계층

### 1. 전역 집계형 — `gatherMasteryEffects`가 합산

장착된 모든 무공/심법의 활성 초식을 순회하며 누적한다.  
`conditionMastery` / `synergyArtId` 조건 검사도 이 함수에서 처리된다.

| 필드 | 소비 위치 | 설명 |
|---|---|---|
| `unlockUlt` | gameLoop.ts | 절초 해금 여부 |
| `bonusCritRate` | calcCritRate | 치명타 확률 추가 |
| `bonusDodge` | calcDodge | 회피율 추가 |
| `bonusDmgReduction` | calcDmgReduction | 피해 감소 (절댓값) |
| `bonusDmgReductionPercent` | calcExternalDmgReduction | 피해 감소 (%) |
| `bonusAtkSpeed` | gameLoop.ts | 공격 간격 단축 |
| `bonusRegenPerSec` | calcEffectiveRegen | 내력 회복 추가 |
| `bonusQiPerSec` | gameLoop.ts / progressSlice | 추가 기운/초 |
| `bonusCombatQiRatio` | calcCombatQiRatio | 전투 기운 비율 추가 |
| `bonusCombatQiRatioFlat` | calcCombatQiRatio | 전투 기운 비율 절대 덧셈 |
| `normalMultiplierCapIncrease` | getArtDamageMultiplier | 초식 배율 상한 증가 |
| `ultChange` | gameLoop.ts / getActiveUltName | 절초 변화 (이름/배율/선공격 등) |
| `bonusCritDmg` | calcCritDamageMultiplier | 치명타 피해 배율 |
| `bonusHpPercent` | gameLoop.ts (maxHp) | 최대 HP % 증가 |
| `killBonusEnabled` | gameLoop.ts | 처치 시 기운 보너스 활성 |
| `dodgeCounterEnabled` | gameLoop.ts | 회피 성공 시 카운터 공격 활성 |
| `ultCooldownPersist` | gameLoop.ts | 적 전환 시 절초 쿨타임 유지 |

### 2. 심법 내부 처리형 — 특정 계산 함수 내부에서만 소비

전역 집계 경로를 거치지 않고, 해당 심법의 계산 함수에서 직접 읽는다.

| 필드 | 소비 위치 | 설명 |
|---|---|---|
| `simbeopQiMultiplier` | `calcQiPerSec` | 장착 심법의 기운 생산 기여분에만 곱하는 배율. `BASE_QI_PER_SEC`와 경지 배율에는 영향 없음. |

### 3. 플래그형 — boolean, gatherMasteryEffects가 OR 집계

하나라도 활성화되면 전체가 true가 되는 방식.  
예: `unlockUlt`, `killBonusEnabled`, `dodgeCounterEnabled`

---

## conditionMastery 사용법

초식이 다른 초식의 활성화를 조건으로 할 때 사용한다.

```typescript
// arts.ts 예시: 삼재심법 오의는 '전투 심법'이 활성화된 경우에만 효과 적용
{
  id: 'samjae_simbeop_oui',
  conditionMastery: 'samjae_simbeop_kill',  // 전투 심법 id
  effects: { bonusCombatQiRatioFlat: 0.10, simbeopQiMultiplier: 1.2 },
}
```

- **전역 집계형** 효과: `gatherMasteryEffects` (combatCalc.ts:112)에서 자동으로 조건 검사
- **심법 내부 처리형** 효과: 해당 계산 함수 내부에서 직접 조건 검사 (calcQiPerSec 참고)

---

## 새 효과를 추가하는 올바른 절차

1. **`MasteryEffects` 타입** (`app/src/data/arts.ts`)에 새 필드 추가
   - 전역 집계형이면 주석에 소비 함수 명시
   - 심법 내부 처리형이면 `// gatherMasteryEffects 집계 대상 아님` 명시

2. **데이터** (`arts.ts` ARTS 배열)에 해당 초식의 `effects`에 값 설정

3. **소비 로직** 추가:
   - 전역 집계형: `gatherMasteryEffects`에 누적 라인 추가 → 해당 계산 함수에서 result 필드 사용
   - 심법 내부 처리형: `calcQiPerSec` 같은 심법 계산 함수 내부에서 직접 읽기

4. **`gameLoop.ts`는 가능한 한 건드리지 않는다.** 부득이하게 수정해야 한다면, 특정 초식 ID를 하드코딩하지 않고 `masteryEffects.새필드`를 읽는 형태로만 추가한다.

---

## 실제 사례: simbeopQiMultiplier 추가 과정

삼재심법 오의의 "기운 생산 ×1.2" 효과를 추가했을 때의 올바른 절차:

```
arts.ts      : effects: { simbeopQiMultiplier: 1.2 }
combatCalc.ts: calcQiPerSec 내부에서 simbeopMasteryIds를 순회, *= 곱셈 누적
gameLoop.ts  : 변경 없음 (qiPerSec = calcQiPerSec()가 이미 배율 포함)
```

잘못된 방식(과거 bonusQiMultiplier 패턴)과 비교:

```
// 과거 (잘못된 방식)
gameLoop.ts: combatQiMult = qiMult * masteryEffects.bonusQiMultiplier  ← 전투 중에만 적용, 전역 훅

// 현재 (올바른 방식)
combatCalc.ts calcQiPerSec: total += capped * simbeopMult  ← 심법 기여분에만, 항시 적용
```
