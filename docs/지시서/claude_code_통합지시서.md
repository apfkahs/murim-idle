# 무림 방치록 업데이트 — 통합 지시서

기획서 `심화학습_기획_v5.md`를 참고하여 아래 Phase 1→2→3→4를 **자동으로 순차 진행**해.
각 Phase는 이전 Phase의 결과물에 의존하므로 순서를 지켜야 한다.
Phase 내부의 단계도 순서대로 진행하고, 각 단계 완료 후 정상 동작을 확인한 뒤 다음으로 넘어가.
중간에 문제가 생기면 해당 단계에서 멈추고 보고해.

모든 Phase 완료 후 최종 보고를 한 번에 해.

---

# Phase 1: combat-dev (코어 로직)

## 단계 1: simulateTick 순수 함수 분리

tick()의 set() 콜백 안에 있는 게임 로직을 `simulateTick(state: GameState, dt: number, isSimulating: boolean): GameState` 순수 함수로 분리해. 이 함수는 GameState를 받아 새 GameState를 반환하고 set()은 호출하지 않아.

기존 tick()은 simulateTick을 래핑해서 set()만 호출하는 구조로 변경.

isSimulating=true일 때 최적화:
- battleLog 마지막 10줄만 유지
- 업적 체크 60틱마다만 수행
- floatingText 생성 중단
- playerAnim/enemyAnim 업데이트 중단

tick(forceDt)의 기존 동작은 그대로 유지.

**참고**: 기획서 Part E2

**완료 확인**: 기존 tick()과 동일하게 동작하는지 확인. 이 단계가 나머지 전체의 토대.

---

## 단계 2: 데이터 구조 변경 + hasMastery 전환

### 2-a: arts.ts 변경
- MasteryDef 인터페이스 추가 (stage, requiredGrade, requiredTier, pointCost, id, name, description, requires?: string[])
- ArtGrade에서 passive, passiveDesc 필드 제거
- ArtDef에 masteries: MasteryDef[] 필드 추가
- getAllPassives() 함수 제거 또는 masteries 기반으로 변경

### 2-b: gameStore 상태 추가
- activeMasteries: Record<string, string[]> (초기값 {})
- gameSpeed: number (초기값 1)
- currentSaveSlot: number (초기값 0)
- fieldUnlocks: Record<string, boolean> (초기값 { training: true, yasan: false, inn: false })

### 2-c: hasPassive() → hasMastery() 전환
- hasMastery(state, masteryId): activeMasteries에 해당 ID 등록 AND 해당 무공이 장착(equippedArts 또는 equippedSimbeop) 상태일 때만 true
- 기존 코드에서 hasPassive()를 호출하는 모든 곳을 hasMastery()로 교체

**참고**: 기획서 Part A5, A6, B5

**완료 확인**: 컴파일 에러 없이 빌드 성공.

---

## 단계 3: 심화학습 액션 구현

activateMastery(artId, masteryId), deactivateMastery(artId, masteryId), resetAllMasteries() 구현.

규칙:
- 장착 중이어야 활성화 가능 (equippedArts 또는 equippedSimbeop)
- 전투 중(battleMode !== 'none') 변경 불가
- 해금 조건 확인: 해당 무공의 성급 ≥ requiredGrade, tier ≥ requiredTier
- requires 전제 심화 확인: requires에 명시된 심화가 모두 activeMasteries에 있어야 함
- 포인트 잔여 확인: getAvailablePoints() ≥ pointCost
- 비활성화 시 포인트 즉시 환불
- 비활성화 시 종속 심화 자동 해제: 같은 무공 내 다른 심화 중 requires에 해제 대상이 포함된 것도 함께 비활성화 + 포인트 환불
- resetAllMasteries: 전체 activeMasteries 비우고 포인트 전액 환불. 전투 중 불가.

getUsedPoints() 변경: 장착 cost 합 + activeMasteries 전체 pointCost 합.

**참고**: 기획서 Part A2, A5

---

## 단계 4: 전투 로직 변경

### 4-a: executeAttack — 검기 잔류 + 삼재관통
무공 전부 미발동 시:
- hasMastery('samjae_sword_residual') → damage = floor(현재 성급 power × RESIDUAL_RATIO)
- 미활성 → 기존 평타 5
- RESIDUAL_RATIO 상수 선언, 초기값 0.35

이연격/파쇄 판정 조건 변경:
- 기존: if (fired && ...)
- 변경: if (fired || (isResidual && hasMastery('samjae_sword_penetrate')))

### 4-b: 전투 중 내공 생산
simulateTick 내 전투 중일 때:
- hasMastery로 전투수련(삼재심법/흡공술) 확인
- 활성이면 neigong += neigongRate × COMBAT_NEIGONG_RATIO × dt
- 심법대성 활성이면 ratio 추가 상승
- COMBAT_NEIGONG_RATIO 상수 선언, 초기값 0.25
- neigong_burst는 비전투 시에만 (기존 유지)

### 4-c: gameSpeed 적용
실시간 tick에서: dt = Math.min(rawDt * gameSpeed, 5)
forceDt에는 배속 미적용.

### 4-d: hunt 킬 시 경보
hunt 모드 적 처치 시 hasMastery('mudang_step_gyeongbo') → hp = Math.min(hp + maxHp * 0.05, maxHp)

**참고**: 기획서 Part A3, A6, D2

---

## 단계 5: 오프라인 진행 + 저장 슬롯 + 전장 해금

### 5-a: processOfflineProgress
processOfflineProgress(elapsedSeconds) 구현:
- 최대 8시간(28800초). simulateTick(state, 1, true) 반복, 마지막에 set() 한 번.
- OfflineResult: elapsedTime, neigongGained, simdeukGained, killCount, deathCount(battleResult?.type === 'death'로 판별), battleTime, idleTime, achievementsEarned, dropsGained
- 앱 시작 시 loadGame 직후 elapsed > 5초이면 호출

### 5-b: 저장 슬롯
saveGame/loadGame을 3슬롯 구조로 변경:
- 키: murim_save_slot_0~2, murim_save_current
- 전투 상태 포함: battleMode, huntTarget, currentField, currentEnemy, exploreStep, exploreOrder, isBossPhase, bossTimer, explorePendingRewards, playerAttackTimer, enemyAttackTimer
- 신규 필드 포함: activeMasteries, fieldUnlocks
- gameSpeed는 저장하지 않음
- 기존 murim_save 있으면 slot_0으로 1회 이전, 실패 시 무시
- 신규 필드 폴백: activeMasteries ?? {}, fieldUnlocks ?? { training: true, yasan: false, inn: false }
- SaveMeta: slotIndex, savedAt, tierName, totalStats
- getSaveSlots() → (SaveMeta | null)[] 추가

### 5-c: fieldUnlocks
- tutorialFlags.yasanUnlocked를 fieldUnlocks.yasan으로 대체
- 검법+심법 장착 → fieldUnlocks.yasan = true
- 산군(tiger_boss) 첫 클리어 → fieldUnlocks.inn = true
- BattleTab 전장 접근 로직이 fieldUnlocks를 체크하도록 변경
- training은 항상 true — 수련장이 잠기지 않도록 확인

**참고**: 기획서 Part E, C, B5

---

## 단계 6: testAdapter + GAME_GUIDE 마무리

- testAdapter의 getState/setState에 activeMasteries, fieldUnlocks, gameSpeed 반영
- GAME_GUIDE.md 수정:
  - 6절 금지 사항: "전투 중 스탯 투자, 무공 교체, 심화학습 변경을 허용하지 않는다. 전투 중 내공 생산은 심법 심화학습을 통해서만 일부 허용된다."
  - 2절 밸런스 원칙 추가: "무공의 심화학습은 등급 성장의 보상으로 해당 무공의 약점을 보완한다. 활성화에 무공 포인트가 필요하여, 장착 슬롯과 심화 깊이 사이에 트레이드오프가 존재한다. 기존 등급 자동 패시브는 모두 심화학습 트리로 이전되어 포인트 선택의 대상이 된다."

**참고**: 기획서 Part A8

---

# Phase 2: content-writer (콘텐츠)

> Phase 1 완료 후 자동 진행.

## 작업 1: 4종 무공 심화학습 데이터

arts.ts의 각 무공(삼재검법, 삼재심법, 어설픈 무당보법, 조악한 흡공술)에 masteries 데이터를 작성해.

기획서 Part A3의 4종 무공 심화학습 테이블과 Part A2의 종속 관계 테이블을 참고.

종속 관계 (requires 필드):
- 삼재검법 삼재관통: requires: ['samjae_sword_residual']
- 삼재심법 심법대성: requires: ['samjae_simbeop_combat']
- 흡공술 흡공가속: requires: ['heupgong_heal_enhance']
- 무당보법: 전부 독립 (requires 없음)

## 작업 2: 객잔 몬스터 + 전장 데이터

### monsters.ts에 추가
기획서 Part B3의 객잔 몬스터 전부 추가 (일반 7종 + 히든 2종 + 보스 1종).
- regen: 전부 0
- simdeuk: 0으로 임시 설정, 주석으로 `// TODO: 기획자 설계 후 반영`
- drops: [] 빈 배열, 주석으로 `// TODO: 기획자 설계 후 반영`
- 공격 메시지: 기획서 B3 참고
- isHidden, isBoss 플래그 정확히 설정
- imageKey: ID와 동일하게

### fields.ts에 추가
기획서 Part B4 참고. 객잔 전장 데이터 추가.

---

# Phase 3: balance-tester (밸런스 검증)

> Phase 2 완료 후 자동 진행.

## 테스트 항목

1. **검기 잔류 계수 탐색**: RESIDUAL_RATIO를 0.3/0.35/0.4로 각각 설정하고 60분 진행도 비교.
2. **전투 중 내공 계수 탐색**: COMBAT_NEIGONG_RATIO를 0.2/0.25/0.3으로 각각 설정하고 60분 진행도 비교.
3. **기존 패시브 포인트화 영향**: 동일 성급에서 기존 대비 전투력 변화.
4. **최적 심화 투자 순서**: 합리적 플레이어 기준 시뮬레이션.
5. **사기충천 수치 제안**: "처치 시 다음 1회 공격에 심득의 n% power 가산"의 적정 n.
6. **객잔 난이도 곡선**: 야산→객잔 전환 자연스러움, 몹별 효율 비교.
7. **객잔 보스 60초 타이머 적정성**.
8. **오프라인 시뮬레이션 성능**: 8시간(28800틱) 처리 시간. 목표: 모바일 3초/데스크톱 1초.
9. **몹별 효율 재측정**: 심화 활성 상태에서 기존 보고서 항목 재수행.

보고서 형식은 기존 밸런스 보고서 양식 준수.

---

# Phase 4: ui-dev (UI)

> Phase 3 완료 후 자동 진행.

## 작업 1: 심화학습 UI

### ArtsTab — ArtDetail 내 심화학습 패널
- 4가지 상태: 활성(체크+해제버튼), 해금됨 미활성(투자버튼), 미해금-성급부족(🔒+필요성급), 미해금-경지부족(🔒+필요경지)
- 종속 경고: 삼재관통에 "이연격 또는 파쇄가 필요합니다" ⚠ 표시
- 미장착 무공의 활성 심화: "효과 비활성 중 (미장착)" 회색 표시
- 전투 중 모든 버튼 disabled
- 기획서 Part A7 참고

### 포인트 표시
- 사용중/보유 (장착+심화 합산)
- 미장착 심화에 포인트 할당된 경우 "(미장착 심화 n pt 포함)" 안내

### 전체 심화 초기화 버튼
- ArtsTab 상단 포인트 표시 옆, confirm 확인, 전투 중 disabled

### NeigongTab
- 전투 중 내공 심화 활성 시: '+{n}/초 (전투 수련)' — var(--text-dim)
- 미활성: '전투 중 생산 중단' (기존 유지)

## 작업 2: 저장 슬롯 UI

### 슬롯 선택 모달
- 3슬롯: 메타데이터(경지, 경맥합, 저장시간)
- 빈 슬롯: "— 새 게임 —", 클릭 시 confirm 후 새 게임
- 기획서 Part C3 참고

### 슬롯 전환 확인 모달
- [저장 후 불러오기] / [저장하지 않고 불러오기] / [취소]
- 기획서 Part C4 참고

## 작업 3: 배속 + 오프라인 + 전장

### 배속 토글
- 헤더에 [▶ 1x] ↔ [▶▶ 2x] 토글
- 전투 중에도 변경 가능

### 오프라인 결과 모달
- "당신이 없는 동안..." + 경과시간
- 내공, 심득, 처치, 사망, 업적, 드랍 표시
- 기획서 Part E5 참고

### 전장 선택
- 객잔 추가
- fieldUnlocks 기반 해금/잠금 표시
- 잠긴 전장: 해금 조건 안내 (예: "산군 처치 시 해금")

---

# 최종 보고

모든 Phase 완료 후 아래 내용을 한 번에 보고:

1. **Phase별 변경 파일 목록**
2. **GAME_GUIDE 반영 내용 요약**
3. **balance-tester 보고서 요약** (핵심 수치 제안)
4. **발견된 이슈** (있을 경우)
5. **기획자 결정이 필요한 사항** (있을 경우)
