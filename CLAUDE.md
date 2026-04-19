# 무림방치록 프로젝트 규칙

## 오류 기록 규칙
- 개발 중 새로운 오류가 발생하고 해결했을 때, 반드시 `TROUBLESHOOTING.md`에 해당 오류와 해결법을 추가한다.
- 기존 항목과 동일한 오류면 해결법을 보강하고, 새로운 오류면 적절한 카테고리에 항목을 추가한다.
- 형식: 에러 메시지, 원인, 해결법을 표로 정리하고 필요시 코드 블록 포함.

## 무공 카드 UI 규칙

모든 무공 카드는 `ArtsTab.tsx`에서 다음 형식을 따른다.

### 공통 구조 (접기/펼치기)
- **헤더 (항상 표시)**: `이름 — N등급` + 핵심 수치 요약(접힌 상태에만) + 장착/해제 버튼 + ▼▲ 토글
  - 헤더 클릭 시 본문 토글
- **본문 (펼쳤을 때)**:
  1. 무협 세계관 설명 (이탤릭, `var(--text-dim)`)
  2. 수치 블록 (타입별, 아래 표 참고)
  3. 심득 표시
  4. 초(招) 패널

### 타입별 수치 블록

| artType | 블록 내용 |
|---|---|
| `active` (공격 무공) | 배경 어두운 박스: `무공명 · 초식` 라벨 + `피해 N  치명(致命) M` |
| `active` + 절초 해금 | 위 아래에 골드 좌측 보더 박스: `절초명 · 절초` + 내력/쿨타임 + `피해 N  치명(致命) M` |
| `simbeop` (심법) | 기운 생산/내력 회복 수치 박스 |
| `passive` (패시브) | `descriptionByStage` 기반 단계별 효과 박스 |

### 접혔을 때 핵심 수치 요약
- `active`: `피해 N` (절초 해금 시 `피해 N / 절초명 M`)
- `simbeop`: `기운 +X/초`
- `passive`: `formatPassiveEffectSummary(def, activeMasteryIds)` — baseEffects + 활성화된 심득 효과 수치 요약 (예: `공속 +0.5s · 회피 +10% · 회피반격`)

### 데미지 계산 공식
- 초식: `floor(applyVariance(baseDamage + floor(proficiencyCoefficient × proficiency[type]) + bonusAtk))`
- 절초: `floor(applyVariance(ultBaseDamage + floor(ultMultiplier × proficiency[type]) + bonusAtk))`
- 분산: `applyVariance(x) = x × (0.9 + random × 0.2)` — 기본 데미지 + 무기 공격력 합계에 ±10% 분산 적용 후, 치명타·회피카운터 배율 곱하고 floor
- 치명타: `floor(damage × 1.5)` (CRITD_BASE = 150%)
- 몬스터 데미지: `floor(applyVariance(attackPower) × multiplier × (1 - dmgReduction/100))` — fixedDamage와 DoT는 분산 제외

## 프로젝트 구조
- 앱 코드: `app/` 디렉토리 (Vite + React + TypeScript + Zustand)
- 에셋 생성: `app/scripts/generate-assets.ts` (DALL-E 이미지 생성)
- Dev 서버 설정: `.claude/launch.json` (name: "dev", port: 5173)
- Dev 서버 실행: `node node_modules/vite/bin/vite.js` (Windows에서 npx 사용 불가)

## 핵심 파일 맵
모든 경로는 `app/src/` 기준.

| 영역 | 파일 |
|------|------|
| **데이터** | `data/arts.ts`, `monsters.ts`, `materials.ts`, `equipment.ts`, `fields.ts`, `achievements.ts`, `tiers.ts`, `balance.ts` |
| **게임 로직** | `utils/gameLoop.ts` (오케스트레이터), `utils/combat/tickContext.ts` (공유 상태), `utils/combat/damageCalc.ts` (데미지 계산), `utils/combat/playerCombat.ts` (플레이어 공격), `utils/combat/enemyCombat.ts` (적 공격/보스), `utils/combat/battleRewards.ts` (처치 보상), `utils/combat/skillHandlers/*` (몬스터별 스킬 핸들러/훅 레지스트리), `utils/combatCalc.ts` (전투 수식), `utils/artUtils.ts` (무공 유틸) |
| **스토어** | `store/gameStore.ts` (진입점), `store/slices/` (artsSlice, combatSlice, inventorySlice, progressSlice, saveSlice), `store/types.ts`, `store/initialState.ts`, `store/utils/sliceHelpers.ts` (공유 헬퍼) |
| **UI (탭)** | `components/ArtsTab.tsx`, `BattleTab.tsx`, `NeigongTab.tsx`, `InventoryTab.tsx`, `EquipmentTab.tsx`, `EncyclopediaTab.tsx`, `AchievementTab.tsx` + 서브: `arts/` (ArtGradeBar, MasteryPanel, artsUtils), `battle/`, `encyclopedia/` |
| **UI (모달)** | `components/EnlightenmentModal.tsx`, `OfflineResultModal.tsx`, `SaveSlotModal.tsx` |
| **유틸(기타)** | `utils/format.ts` (포맷팅) |
| **타입** | `types/index.ts` |
| **스타일** | `styles/variables.css`, `layout.css`, `components.css`, `battle.css`, `field.css`, `arts.css`, `modals.css`, `misc.css`, `inventory.css`, `equipment.css` |
| **테스트** | `testAdapter.ts` (테스트 인터페이스), `scripts/test-*.ts` (밸런스 테스트) |
| **에셋** | `assets/index.ts` (에셋 매핑, 이미지 폴더는 .claudeignore 제외) |

## 자주 수정하는 파일 (최근 30커밋 기준, 정기 갱신 필요)

| 순위 | 파일 | 수정 횟수 |
|------|------|-----------|
| 1 | `store/gameStore.ts` | 21 |
| 2 | `components/ArtsTab.tsx` | 15 |
| 3 | `data/arts.ts` | 13 |
| 4 | `data/monsters.ts` | 12 |
| 5 | `components/BattleTab.tsx` | 11 |
| 6 | `styles/*.css` (구 index.css) | 7 |
| 7 | `components/NeigongTab.tsx` | 7 |
| 8 | `components/InventoryTab.tsx` | 7 |
| 9 | `utils/gameLoop.ts` | 6 |
| 10 | `data/materials.ts` | 6 |

마지막 갱신: `ee3b688`

## 접근 제한 영역

| 경로 | 상태 | 비고 |
|------|------|------|
| `app/src/assets/` (이미지 폴더) | .claudeignore 제외 | `assets/index.ts` 매핑만 접근 가능 |
| `reports/` | .claudeignore 제외 | balance-tester가 생성, 직접 접근 불가 |
| `unpacked_ui/` | .claudeignore 제외 | 아카이브, 접근 불가 |
| `docs/버전히스토리/` | 읽기 전용 | 수정 금지 |

## 에이전트별 작업 범위 (에이전트 .md 수정 시 이 표도 갱신)

| 에이전트 | 접근 파일 | 역할 |
|----------|-----------|------|
| **combat-dev** | `store/gameStore.ts`, `store/slices/*`, `store/utils/*`, `utils/gameLoop.ts`, `utils/combat/*`, `utils/combatCalc.ts`, `testAdapter.ts` | 전투/성장 로직 구현 |
| **content-writer** | `data/arts.ts`, `data/monsters.ts`, `data/fields.ts`, `data/achievements.ts`, `data/materials.ts`, `scripts/generate-assets.ts` | 무공/몬스터/전장/업적 데이터 추가 |
| **ui-dev** | `components/*.tsx`, `components/arts/*`, `styles/*.css`, `App.tsx` | UI 레이아웃/스타일/애니메이션 |
| **balance-tester** | `scripts/test-*.ts`, `scripts/test-helpers.ts`, `testAdapter.ts` (읽기), `data/*.ts` (읽기) | 밸런스 테스트 & 리포트 |

## 자동 유지보수 규칙
- 새 파일을 생성하면 "핵심 파일 맵"에 추가
- 파일을 삭제/이동하면 파일 맵에서 제거
- 새 에셋 폴더가 추가되면 .claudeignore에 추가
- 에이전트 .md를 수정하면 "에이전트별 작업 범위" 표도 갱신
- 수정 빈도 TOP 10: 40커밋마다 갱신 (마지막 갱신 커밋 해시를 표 아래에 기록)
- **버전 자동 갱신**: 코드 수정 작업 완료 시 `app/package.json`의 `version`을 올린다.
  - 패치(x.x.+1): 버그 수정, 수치 조정, 소규모 UI 변경
  - 마이너(x.+1.0): 새 기능·콘텐츠 추가, 시스템 확장
  - 메이저(+1.0.0): 대규모 리팩토링, 아키텍처 변경

### 새 보스/몬스터 스킬 추가 절차
1. `data/monsters.ts` BOSS_PATTERNS 에 skill 정의
2. 기존 skill type(legacy/문파용) 재사용 가능하면 데이터만 추가
3. 새 type 필요 시:
   - `skillHandlers/<문파>/<몬스터>.ts` 에 핸들러/훅 작성
   - `skillHandlers/registry.ts` 에 등록
   - 훅은 PRE_SKILL_LOOP / IN_ATTACK_RESOLVE 중 위치에 맞게 선택
   - 몬스터 id 체크는 훅·핸들러 첫 줄 guard clause
4. `enemyCombat.ts` 는 건드리지 않음
5. balance-tester 또는 수동 플레이로 해당 전장 회귀

### bossPatternState 리팩터 트리거 (일회성)
몬스터 추가 작업 완료 시 `app/src/store/types.ts` 의 `bossPatternState` 객체 필드 수를 확인할 것.

**트리거 조건** (둘 중 하나 충족 시 사용자에게 즉시 보고):
- 전체 필드 수 **40개 초과**
- 특정 몬스터 전용 필드 **20개 초과** (prefix 기준: `atarX_`, `howiX_`, `sraoshaX_` 등 단일 몬스터 소유 필드 카운트)

**보고 메시지 예시**: "bossPatternState가 현재 N개 필드. namespace 격리 리팩터 권장 시점입니다. 계획 참조 필요."

**자가 삭제 조건**: `bossPatternState` 에 `monsterState: Record<string, unknown>` 필드가 생기고 기존 몬스터 전용 필드 대부분(80% 이상)이 해당 namespace로 이관되면, **이 섹션을 CLAUDE.md에서 삭제**할 것. 리팩터가 완료되었다는 신호이므로 트리거 규칙은 더 이상 불필요.
