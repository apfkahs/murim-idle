# 전투 UI 개편 — 분석 보고서

대상 mockup: `docs/combat-log/combat-log-v2.html`
대상 코드: `app/src/components/battle/BattleScreen.tsx` (외 관련 store/utils)
작업 브랜치: `worktree-combat-ui-v2`

---

## 1. 현재 구조 분석

### 1-1. BattleScreen.tsx 구성 (총 408 lines)

| 라인 | 섹션 | 비고 |
|------|------|------|
| 67–84 | 상단 헤더 | 필드명 · 답파/보스/수련 배지 · 포기 버튼 |
| 87–228 | `battle-scene` | 배경 + 포트레이트 + **HP/내력/DoT/스턴/빙결/철벽/보스내력/장비DoT 전부 인라인 오버레이** |
| 231 | `<FloatingTexts>` | 피해/회피/회복 플로팅 |
| 234–251 | `info-bar` (내 스탯) | 최대HP / 내 DPS / 최대내력 / 공격속도 |
| 254–291 | `info-bar` (적 스탯) | 적 최대HP / 적 DPS / 적 내력 / 적 공격속도 (reveal 게이팅) |
| 294–300 | 답파 진행 바 | `exploreStep / exploreOrder.length` |
| 303–321 | `battle-log` | 2축 레이아웃 + 클래스 기반 색상 |
| 324–345 | `chip-bar` | 장착 무공/심법 이름만 |

**문제점**
- HP·내력·DoT·스턴·빙결·철벽·보스내력 등 핵심 전투 정보가 `battle-scene` 내부 오버레이에 **혼재**되어 있어 좌우 분리가 아닌 "나란히 둔 2개 컬럼" 구조 (좌우 폭이 진영 값에 따라 불균등하게 보일 수 있음)
- 스킬 쿨다운/차징 시각화 없음 (현재는 로그 텍스트로만 확인)
- "내 정보"·"전투 통계"를 볼 창구가 없음 (장비/무공 확인하려면 전투를 종료해야 함)
- 카드 접기/펼치기 없음 — 세로 공간을 항상 고정적으로 점유

### 1-2. 관련 데이터 — 이미 있는 것

| 항목 | 경로 |
|------|------|
| `hp` · `maxHp` · `stamina` | `GameState` |
| `currentBattleDamageDealt` · `currentBattleDuration` | `GameState` (이번 전투 집계) |
| `ultCooldowns: Record<string, number>` | 절초 쿨다운 |
| `playerFinisherCharge: { artId, attackFirst, timeLeft }` | 절초 차징 (선공·후공) |
| `bossPatternState.bossChargeState: { skillId, turnsLeft, damageMultiplier, ... }` | 보스 차징 |
| `bossPatternState.playerDotStacks[]` | 플레이어에 걸린 DoT (출혈·독·산공·둔화) |
| `bossPatternState.cheolbyeokStacks` | 철벽 스택 |
| `bossPatternState.playerFreezeLeft` | 빙결 남은 횟수 |
| `playerStunTimer` | 경직 남은 시간 |
| `equipmentDotOnEnemy[]` | 장비 DoT (혈독 장갑 등) |
| `playerAttackTimer` · `enemyAttackTimer` · `attackInterval` | 공속 타이밍 |

### 1-3. 관련 데이터 — 필요하지만 없는 것

mockup의 "누적 피격 카드", "전투 통계 탭"을 구현하려면 다음 7개 집계 필드가 새로 필요하다.

| 필드 | 용도 |
|------|------|
| `currentBattleDamageTaken` | 이번 전투 누적 피격량 |
| `currentBattleCritCount` | 이번 전투 치명타 횟수 |
| `currentBattleDodgeCount` | 이번 전투 회피 성공 횟수 |
| `currentBattleHitTakenCount` | 이번 전투 피격 판정 횟수 (회피율 분모용) |
| `currentBattleMaxOutgoingHit` | 단일 최대 가한 피해 |
| `currentBattleMaxIncomingHit` | 단일 최대 받은 피해 |
| `currentBattleSkillUseCount` | 절초 발동 횟수 |

---

## 2. Mockup ↔ 코드 매핑표

| mockup 섹션 | 매핑 / 재사용 | 처리 방식 |
|-------------|---------------|-----------|
| 헤더 (타이틀·▶▶·⚙) | App.tsx 영역 | **이번 작업 범위 외** |
| 서브 헤더 (필드명·Full/Compact/Numbers Only·포기) | `BattleScreen.tsx:69-84` | 기존 유지 |
| `.card #card-scene` (포트레이트+VS) | `BattleScreen.tsx:87-114` | `BattleScene.tsx` 로 추출 + 접기 가능한 카드로 |
| `.bars` (좌우 HP/MP + 버프 칩) | `BattleScreen.tsx:117-226` 인라인 | `CombatBars.tsx` 로 완전 재작성. `grid 1fr 1fr` 좌우 분리 |
| `.card #card-dps` (DPS 대결 + 타이밍 + 피해 카드 + 스킬 타임라인) | **신규** | `CombatStatusCard.tsx` + `SkillTimeline.tsx` |
| `.dps-battle` (DPS 게이지 + verdict) | `BattleScreen.tsx:256-270` 의 info-bar 대체 | `CombatStatusCard` 의 첫 섹션 |
| `.timing-row` (공속 바) | `playerAttackTimer` / `enemyAttackTimer` 기존 데이터 | `CombatStatusCard` 의 두 번째 섹션 |
| `.dmg-row` (누적 피해/피격 2장) | `currentBattleDamageDealt` + **신규 `currentBattleDamageTaken`** | `CombatStatusCard` 의 세 번째 섹션 |
| `.skill-lane` (쿨다운+차징) | `ultCooldowns` · `playerFinisherCharge` · `bossChargeState` 기존 | `SkillTimeline.tsx` |
| `.log-tabs` (3 탭) | **신규** | `BattleLogTabs.tsx` (useState 로컬, `display:none` 토글) |
| 전투 로그 탭 | 기존 `BattleScreen.tsx:303-321` + `battle-log` 스타일 | 그대로 유지 |
| 내 정보 탭 | 기존 스탯 헬퍼 재사용 | `CharacterInfoTab.tsx` (신규) |
| 전투 통계 탭 | 7개 신규 집계 필드 + 기존 DamageDealt/Duration | `CombatStatsTab.tsx` (신규) |
| "원보" · "오행" · "명중/관통/이속" · "문파/타이틀/Lv." | 게임에 없음 | **표시 안 함** |
| "이번 사냥 세션" 통계 | 세션 누적은 후속 | 본 작업 범위 외 (이번 전투 한정) |

---

## 3. 변경 계획서

### 3-1. 데이터 레이어
- `store/types.ts` : `GameState` 에 7개 집계 필드 추가
- `store/initialState.ts` : 7필드 0 초기화
- `utils/combatCalc.ts` : `CLEAR_BATTLE_STATE` 에 7필드 추가 (전투 종료/다음 몬스터 등 spread 경로 일괄 적용)
- `utils/combat/battleRewards.ts` : next spawn 3곳의 `currentBattleDuration = 0` 옆에 7필드 0 할당 추가
- `utils/combat/tickContext.ts`
  - `TickContext` 인터페이스에 7필드 추가
  - `applyBattleReset(ctx)` 에 7필드 0 할당 추가
  - `buildResult` 의 result 객체에 7필드 포함
- `store/slices/saveSlice.ts` : `saveGame` 직렬화 + `loadGame` 역직렬화 (`data.field ?? 0`)

### 3-2. 전투 로직 레이어 — 집계 위치

| 필드 | 집계 지점 |
|------|-----------|
| `currentBattleDamageTaken` | `enemyCombat.ts` 의 모든 `ctx.hp -= dmg` 지점 (`+= dmg`) |
| `currentBattleHitTakenCount` | 위와 동일 (한 번의 공격 이벤트당 +1, per-hit) |
| `currentBattleMaxIncomingHit` | 위와 동일 (`Math.max`) |
| `currentBattleDodgeCount` | `enemyCombat.ts` 의 `handleDodge(...)` 직전 + rapid_fire/multi_hit 개별 회피 분기 |
| `currentBattleMaxOutgoingHit` | `playerCombat.ts` 의 모든 `ctx.currentEnemy!.hp -= damage` 직전 (normal + ult + finisher) |
| `currentBattleCritCount` | `playerCombat.ts` 의 `isCritical = true` / `fcCrit = true` 분기 |
| `currentBattleSkillUseCount` | `playerCombat.ts` 의 절초 `stamina -= effectiveUltCostFinal` 지점 (2곳) |

### 3-3. 신규 유틸
- `utils/combatVerdict.ts` : TTK 비율 기반 종합 판정 (`good` / `neutral` / `bad`)

### 3-4. CSS 토대
- `styles/variables.css` : `--hp` / `--enemy-hp` / `--mp` / `--ember` / `--warn` / `--panel` / `--panel-2` / `--panel-3` / `--border-soft` / `--gold-warm` / `--gold-warm-bright` 추가 (`--gold` 충돌 방지 prefix 변경)
- `styles/battle-v2.css` **신규** : mockup의 모든 새 클래스 정의 (`.combat-bars` / `.combat-side` / `.dps-battle` / `.dps-gauge` / `.verdict.{good,neutral,bad}` / `.timing-row` / `.dmg-row` / `.skill-lane` / `.log-tabs` / `.tab-view` / `.collapsible-card` / `.char-grid` / `.cstats` 등). 기존 `battle.css` / `battle-log.css` 는 **변경하지 않음** — 클래스 네임스페이스 prefix 로 충돌 회피 (`.card` → `.combat-card`, `.bars` → `.combat-bars`, `.side` → `.combat-side`)
- `main.tsx` : `battle-v2.css` import 추가

### 3-5. 컴포넌트 계층
```
BattleScreen
├─ (헤더 기존 유지)
├─ BattleScene           (CollapsibleCard, 포트레이트)
├─ CombatBars            (좌우 HP/MP + 버프 칩)
├─ CombatStatusCard      (CollapsibleCard)
│   ├─ DPS 대결 게이지 + verdict
│   ├─ 공속 타이밍 바
│   ├─ 누적 피해/피격 카드 2장
│   └─ SkillTimeline     (절초 + 보스 차징)
├─ (답파 진행 바 기존 유지)
└─ BattleLogTabs         (useState 로컬 탭)
    ├─ [전투 로그]  → 기존 BattleLog 재사용
    ├─ [내 정보]    → CharacterInfoTab
    └─ [전투 통계]  → CombatStatsTab
```

공통 헬퍼: `CollapsibleCard.tsx` — chevron 토글 + `card-head` + `card-body` 구조.

### 3-6. 범위 제한
게임에 존재하지 않는 항목은 **절대 UI 에 등장시키지 않는다** (사용자 메모리 `feedback_clean_drops.md` 와 동일 원칙):
- 오행 / 명중 / 관통 / 이속 / 원보 / 문파 / 타이틀 / Lv. 숫자

### 3-7. 구현 순서 (체크리스트)
1. 워크트리 생성 ✅
2. 본 분석 보고서 ✅
3. 7 집계 필드 + saveSlice + tickContext + CLEAR_BATTLE_STATE + 전투 훅 집계 호출
4. `utils/combatVerdict.ts`
5. CSS 토대 (`variables.css` + `battle-v2.css` + `main.tsx` import)
6. `CollapsibleCard.tsx`
7. `CombatBars.tsx`
8. `BattleScene.tsx`
9. `SkillTimeline.tsx`
10. `CombatStatusCard.tsx`
11. `CharacterInfoTab.tsx` + `CombatStatsTab.tsx`
12. `BattleLogTabs.tsx`
13. `BattleScreen.tsx` 재조립 (인라인 제거)
14. 타입 체크
15. `CLAUDE.md` 파일 맵 갱신 + `app/package.json` 마이너 버전 +1
16. 사용자 미리보기

본 세션(step 1~6)에서 다루는 범위는 데이터/유틸/CSS 토대 + 공통 컴포넌트 1개까지. step 7 이후는 다음 세션.
