# 무공 성급 시스템 가이드

## 개요

무공 성급 시스템은 무공별 별도 경험치(`artGradeExp`)를 기반으로 해당 무공의 강화 단계를 표시하고,
성급에 따른 배율·계수를 적용하는 시스템이다.

---

## 테이블 구조

### 기본 테이블: ART_GRADE_TABLE (60성, 5단계)
`gradeMaxStars`가 없는 무공에 사용. 숙련도 5단계 × 12성 구조.
- `stageIndex`: 0~4 (단계)
- `star`: 1~12 (단계 내 별)
- `starIndex`: 1~60 (전체 누적 별)

### 커스텀 테이블: buildProfBasedGradeTable(baseGrade, maxStars)
`gradeMaxStars`가 있는 무공에 사용. PROF_TABLE 연동 완결형.

#### 공식
```
성 쌍(pair) 기반:
  pairReq = round(PROF_TABLE[baseGrade - 1 + p].reqExp × 0.2 / 100) × 100
각 별 = pairReq, 쌍(pair) 내 두 별은 동일 비용
```

예시 — baseGrade=1, maxStars=12:
| 별  | pairReq | cumExp |
|-----|---------|--------|
| 1성 | 1,000   | 1,000  |
| 2성 | 1,000   | 2,000  |
| 3성 | 1,200   | 3,200  |
| 4성 | 1,200   | 4,400  |
| 5성 | 1,300   | 5,700  |
| 6성 | 1,300   | 7,000  |
| 7성 | 1,500   | 8,500  |
| 8성 | 1,500   | 10,000 |
| 9성 | 1,700   | 11,700 |
|10성 | 1,700   | 13,400 |
|11성 | 2,000   | 15,400 |
|12성 | 2,000   | 17,400 |

커스텀 테이블에서:
- `stageIndex` = si (= starIndex - 1), 0~11
- `gradeDamageMultipliers[stageIndex]`으로 성별 배율 직접 참조
- `proficiencyCoefficientByGrade[stageIndex]`으로 성별 계수 직접 참조

---

## baseGrade 역할

`baseGrade`는 `buildProfBasedGradeTable` 호출 시 PROF_TABLE의 시작 위치를 결정한다.

| 무공 | baseGrade | PROF_TABLE 참조 범위 | 12성 총 exp |
|---|---|---|---|
| 삼재검법 | 1 | [0..5] | 17,400 |
| 삼재심법 | 1 | [0..5] | 17,400 |
| 마령심법 | 5 | [4..9] | 30,600 |

---

## gradeStartExp deprecated

`ArtGrowth.gradeStartExp`는 구 `buildCustomGradeTable` 전용 파라미터였으며,
`buildProfBasedGradeTable` 도입 후 사용되지 않는다.
기존 데이터에 남아 있더라도 새 빌더는 이 값을 무시한다.

---

## proficiencyCoefficientByGrade

심법에서 성급이 오를수록 기운 생산 계수가 증가하는 경우 사용.

```typescript
proficiencyCoefficientByGrade: number[]  // 인덱스 = stageIndex (0 = 1성)
```

`calcQiPerSec` 내부에서:
1. 현재 artGradeExp → getArtGradeInfoFromTable → stageIndex 확인
2. `proficiencyCoefficientByGrade[stageIndex]`를 coeff로 사용
3. `grown = baseQiPerSec + floor(coeff × mentalProfDamage)`

예시 — 마령심법 (1성 1/15 → 12성 2/15, 선형):
```typescript
proficiencyCoefficientByGrade: [
  0.0667, 0.0727, 0.0788, 0.0848, 0.0909, 0.0970,
  0.1030, 0.1091, 0.1152, 0.1212, 0.1273, 0.1333,
]
```

---

## 개별 예외

### proficiencyGainMultiplier (마령심법: 0.5)
artGradeExp 획득에는 적용되지 않고, 숙련도(`proficiency`) 획득에만 적용된다.
따라서 마령심법은 숙련도 성장보다 등급 성장이 상대적으로 빠르다.

---

## 새 무공 추가 시 체크리스트

1. `baseGrade` 설정 — PROF_TABLE 어느 위치에서 시작할지 결정
2. `gradeMaxStars` 설정 — 완결 성급 수 (짝수)
3. `gradeDamageMultipliers` — 길이가 `gradeMaxStars`와 일치하는지 확인
4. `proficiencyCoefficientByGrade` — 필요 시, 길이가 `gradeMaxStars`와 일치
5. `gradeStartExp`는 사용하지 않음
6. bijup 초식의 `requiredArtGrade` — 커스텀 테이블 무공은 stageIndex+1 = 별 번호와 동일
   (예: 3성 도달 조건 → `requiredArtGrade: 3`)
7. artStar 초식의 `starIndex/unlockStarIndex` — 12성 기준으로 설정
