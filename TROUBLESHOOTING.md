# 무림방치록 트러블슈팅 가이드

> 프로젝트 개발 중 발생한 오류와 해결법을 기록합니다.
> 같은 오류 재발 시 빠르게 참고하세요.

---

## 목차
1. [Dev Server 관련](#1-dev-server-관련)
2. [Asset 생성 관련](#2-asset-생성-관련)
3. [빌드 / TypeScript 관련](#3-빌드--typescript-관련)
4. [게임 런타임 관련](#4-게임-런타임-관련)

---

## 1. Dev Server 관련

### 1-1. `npx` 명령어 ENOENT 오류 (Windows)

| 항목 | 내용 |
|------|------|
| **에러 메시지** | `Failed to start server: spawn npx ENOENT` |
| **원인** | Windows 환경에서 Claude Preview가 `npx`를 직접 spawn할 때 `.cmd` 확장자를 인식하지 못함 |
| **해결법** | `.claude/launch.json`에서 `npx vite` 대신 `node node_modules/vite/bin/vite.js`로 직접 실행 |

```json
// ❌ 실패하는 설정
{
  "runtimeExecutable": "npx",
  "runtimeArgs": ["vite", "--port", "5173"]
}

// ✅ 정상 작동하는 설정
{
  "runtimeExecutable": "node",
  "runtimeArgs": ["node_modules/vite/bin/vite.js", "--port", "5173"]
}
```

### 1-2. Preview Server "Process exited with code 1" (실제로는 정상)

| 항목 | 내용 |
|------|------|
| **에러 메시지** | `Failed to start preview server: Process exited with code 1` (하지만 로그에는 Vite ready 표시) |
| **원인** | `--host` 플래그 사용 시 포트 감지 타이밍 이슈, 또는 이전 프로세스가 포트 점유 |
| **해결법** | ① `--host` 플래그 제거 ② 포트 점유 확인 후 kill |

```bash
# 포트 점유 확인 (Windows)
netstat -ano | findstr :5173 | findstr LISTENING

# 프로세스 종료 (PID를 위 명령에서 확인)
taskkill /PID <PID> /F
```

### 1-3. 포트 충돌 (Port Already in Use)

| 항목 | 내용 |
|------|------|
| **에러 메시지** | `Port 5173 is already in use` |
| **원인** | 이전 dev server 프로세스가 종료되지 않고 남아있음 |
| **해결법** | 기존 프로세스 종료 후 재시작 |

```bash
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# 또는 node 프로세스 전체 종료
taskkill /IM node.exe /F
```

---

## 2. Asset 생성 관련

### 2-1. `.env` 파일 없음

| 항목 | 내용 |
|------|------|
| **에러 메시지** | `❌ .env 파일이 없습니다` |
| **원인** | 프로젝트 루트에 `.env` 파일이 없음 |
| **해결법** | 프로젝트 루트(`D:/newidle`)에 `.env` 파일 생성 |

```bash
# .env 파일 생성
echo OPENAI_API_KEY=sk-your-key-here > D:/newidle/.env
```

### 2-2. OpenAI API Key 미설정

| 항목 | 내용 |
|------|------|
| **에러 메시지** | `❌ OPENAI_API_KEY가 설정되지 않았습니다` |
| **원인** | `.env` 파일은 있으나 `OPENAI_API_KEY` 값이 비어있음 |
| **해결법** | `.env` 파일에 유효한 API 키 입력 |

### 2-3. DALL-E 이미지 생성 실패

| 항목 | 내용 |
|------|------|
| **에러 메시지** | `❌ 이미지 데이터 없음` 또는 API 에러 |
| **원인** | OpenAI API 호출 실패 (rate limit, 잘못된 키, 모델 미지원 등) |
| **해결법** | ① API 키 유효성 확인 ② rate limit 대기 후 재시도 ③ 이미 생성된 파일은 자동 스킵됨 |

```bash
# 에셋 생성 재실행 (이미 있는 파일은 건너뜀)
cd D:/newidle/app && npx tsx scripts/generate-assets.ts
```

---

## 3. 빌드 / TypeScript 관련

### 3-1. TypeScript 컴파일 에러

| 항목 | 내용 |
|------|------|
| **원인** | `tsconfig.app.json`에 strict 모드 활성화 (`noUnusedLocals`, `noUnusedParameters`) |
| **해결법** | 미사용 변수 앞에 `_` 접두사 붙이기, 또는 해당 코드 제거 |

```typescript
// ❌ 에러: 'data' is declared but never used
const data = something;

// ✅ 해결: underscore 접두사
const _data = something;
```

### 3-2. 빌드 시 타입 에러

```bash
# 타입 체크만 실행
cd D:/newidle/app && npx tsc --noEmit

# 빌드 (타입 체크 + 번들링)
cd D:/newidle/app && npm run build
```

---

## 4. 게임 런타임 관련

### 4-1. 세이브 데이터 손상

| 항목 | 내용 |
|------|------|
| **증상** | 게임 로드 시 아무 반응 없음 (데이터 불러오기 실패) |
| **원인** | `localStorage`의 `murim_save` 데이터가 손상됨 |
| **해결법** | 브라우저 콘솔에서 세이브 데이터 초기화 |

```javascript
// 브라우저 콘솔에서 실행
localStorage.removeItem('murim_save');
location.reload();
```

### 4-2. 버전 불일치로 세이브 로드 실패

| 항목 | 내용 |
|------|------|
| **원인** | 저장된 세이브의 `version`이 현재 코드의 버전(`1.0`)과 불일치 |
| **해결법** | 세이브 초기화 또는 마이그레이션 로직 추가 |

### 4-3. 무공 포인트 "초기화" 버튼 후 발견형 초식이 사라지고 복구 불가

| 항목 | 내용 |
|------|------|
| **증상** | 조악한 무명보법(`crude_bobeop`)처럼 레시피/비급으로 해금한 초식이 초기화 버튼 후 활성 목록에서 사라지고, "투자" 버튼이 동작하지 않으며 레시피도 재제작되지 않음 |
| **원인** | `resetAllMasteries` 필터가 `m.pointCost === 0`만 기준으로 삼아, `discovery` 필드의 의미(발견형=점수 외 경로로만 해금)를 명시하지 않음. 향후 데이터에서 pointCost가 바뀌면 즉시 재발. 또한 `activateMastery`는 `discovery.type === 'recipe'`를 조기반환하고, `craftArtRecipe`는 `discoveredMasteries` 가드로 재제작을 차단하므로 한 번 wipe되면 영구 stuck |
| **해결법** | 필터를 `if (m.discovery) return true; return m.pointCost === 0;`로 변경해 발견형 초식을 항상 보존 ([artsSlice.ts resetAllMasteries](app/src/store/slices/artsSlice.ts)) |

---

## 빠른 참조: 자주 쓰는 명령어

```bash
# Dev 서버 시작
cd D:/newidle/app && node node_modules/vite/bin/vite.js --port 5173

# 빌드
cd D:/newidle/app && npm run build

# 타입 체크
cd D:/newidle/app && npx tsc --noEmit

# 린트
cd D:/newidle/app && npm run lint

# 에셋 생성
cd D:/newidle/app && npx tsx scripts/generate-assets.ts

# 포트 확인 (Windows)
netstat -ano | findstr :5173

# localStorage 초기화 (브라우저 콘솔)
localStorage.removeItem('murim_save'); location.reload();
```

---

## 5. UI 개편 관련

### 5-1. Noto Serif KR 폰트 잔존

| 항목 | 내용 |
|------|------|
| **증상** | UI 개편 후에도 세리프 폰트가 일부 표시됨 |
| **원인** | `index.html`에서 Noto Serif KR CDN을 아직 로드하고 있음 |
| **해결법** | `index.html`의 Google Fonts 링크에서 Noto Serif KR 제거, Noto Sans KR만 `wght@300;400;500;600`으로 로드 |

### 5-2. 전투 배경 이미지 미표시 (CSS gradient 대체)

| 항목 | 내용 |
|------|------|
| **증상** | 전투 화면 배경이 이미지가 아닌 그라데이션으로 표시 |
| **원인** | `src/assets/backgrounds/`에 `training_ground.png` 또는 `mountain_forest.png` 파일 없음 |
| **해결법** | `generate-assets.ts`를 실행하여 배경 이미지 생성 |

```bash
cd D:/newidle/app && node node_modules/.bin/tsx scripts/generate-assets.ts
```

### 5-3. 탭바 하단 컨텐츠 가림

| 항목 | 내용 |
|------|------|
| **증상** | 페이지 하단 콘텐츠가 탭바에 가려서 보이지 않음 |
| **원인** | 탭바가 `position: fixed bottom`이지만 컨텐츠에 하단 패딩 없음 |
| **해결법** | `.app-content`에 `padding-bottom: 72px` 추가 (index.css에 이미 적용됨) |

### 5-4. docx 파일 읽기 오류 (Python)

| 항목 | 내용 |
|------|------|
| **증상** | `UnicodeEncodeError: 'cp949' codec can't encode character` |
| **원인** | Windows cp949 인코딩으로 한글+특수문자(☯ 등) 출력 시 실패 |
| **해결법** | Python stdout을 UTF-8로 래핑: `sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')` |

---

## 6. v1.1 전투 시스템 관련

### 6-1. v1.0 세이브 로드 시 HP 이상

| 항목 | 내용 |
|------|------|
| **증상** | v1.0 세이브를 v1.1에서 로드하면 HP가 비정상적으로 높거나 낮음 |
| **원인** | v1.0은 `calcMaxHp(stats)` = `50 + 스탯합*3`, v1.1은 `50 + log2(1+totalSpentNeigong)*15` |
| **해결법** | `loadGame()`에서 `totalSpentNeigong` 미존재 시 기존 스탯으로 역산하는 마이그레이션 코드 추가 |

### 6-2. DPS 관련 코드 잔존 에러

| 항목 | 내용 |
|------|------|
| **증상** | `getDPS is not a function` 또는 `dps` 프로퍼티 미존재 |
| **원인** | v1.1에서 DPS 개념 완전 폐기. `calcDPS`, `getDPS`, `getAttackSpeed` 제거됨 |
| **해결법** | `getAttackInterval()` (공격 간격)으로 대체. UI에서 DPS 표시 모두 제거 |

### 6-3. 공격이 발생하지 않음

| 항목 | 내용 |
|------|------|
| **증상** | 전투 시작 후 로그가 나오지 않음 |
| **원인** | v1.1 틱 간격이 1초(1000ms)로 변경됨. v1.0은 200ms였음 |
| **해결법** | `App.tsx`의 `setInterval` 간격이 1000ms인지 확인 |

### 6-4. 몬스터 `atk` 프로퍼티 미존재 에러

| 항목 | 내용 |
|------|------|
| **증상** | `currentEnemy.atk is undefined` |
| **원인** | v1.1에서 `atk` → `attackPower`로 필드명 변경 |
| **해결법** | `MonsterDef.atk` → `MonsterDef.attackPower`, `spawnEnemy` 등 모든 참조 수정 |

---

## 7. 시뮬레이션/테스트 스크립트 관련

### 7-1. `simulateTick` import 불가

| 항목 | 내용 |
|------|------|
| **에러 메시지** | `simulateTick is not exported` 또는 `has no exported member` |
| **원인** | `gameStore.ts`의 전투 함수들이 로컬 함수로 선언되어 export되지 않음 |
| **해결법** | `simulateTick`, `calcMaxHp`, `calcAttackInterval`, `spawnEnemy`, `createInitialState`에 `export` 키워드 추가 |

### 7-2. hunt 모드 승리 미감지

| 항목 | 내용 |
|------|------|
| **증상** | 몬스터를 처치해도 시뮬레이터가 승리를 감지하지 못함 |
| **원인** | hunt 모드에서 몬스터 사망 시 `battleResult`가 설정되지 않고 즉시 리스폰됨 |
| **해결법** | `killCounts[monsterId]` 변화를 감지하여 승리 판정 |

### 7-3. 시뮬레이션 데미지가 0

| 항목 | 내용 |
|------|------|
| **증상** | 가상 플레이어가 평타(5)만 발생하고 무공 데미지가 나오지 않음 |
| **원인** | `equippedArts`와 `ownedArts`가 올바르게 설정되지 않음 |
| **해결법** | `equippedArts: ['samjae_sword']`와 `ownedArts: [{ id: 'samjae_sword', totalSimdeuk: N }]` 양쪽 모두 설정 |

### 7-4. 수련 몬스터 시뮬레이션 무한루프

| 항목 | 내용 |
|------|------|
| **증상** | 나무인형/철인형 시뮬레이션이 타임아웃까지 무한 반복 |
| **원인** | `attackInterval: 0`이라 적이 공격하지 않아 플레이어가 죽지 않음 |
| **해결법** | `isTraining: true`인 몬스터는 시뮬레이션 건너뛰고 `grade: 0` 직접 할당 |

### 7-5. 전체 GameState 수동 구성 시 필드 누락

| 항목 | 내용 |
|------|------|
| **증상** | TypeScript 에러 또는 런타임 undefined 참조 |
| **원인** | GameState에 50개+ 필드가 있어 수동 구성 시 누락 발생 |
| **해결법** | `createInitialState()`를 export하여 기반 상태로 사용 후, 필요한 필드만 오버라이드 |

---

---

## 8. 배화교 행자 관련

### 8-1. "삼행의 율법" 연속 전투 미발동

| 항목 | 내용 |
|------|------|
| **증상** | `startExplore` / `startHunt`로 첫 전투를 시작할 때는 삼행의 율법이 정상 발동하지만, 답파 중 다음 몬스터로 전환되거나 수련 리트라이 시 발동하지 않아 `guardDamageTakenMultiplier`가 `undefined`로 남는다. `playerCombat.ts`의 `!= null` 체크가 `false`가 되어 피해 감소가 적용되지 않는다. |
| **원인** | `battleRewards.ts`에서 다음 몬스터 스폰 시 `createBossPatternState()`만 호출하고 `applyBattleStartSkills()`를 호출하지 않았다. `applyBattleStartSkills`가 `combatSlice.ts`의 private 함수였기 때문에 다른 파일에서 재사용 불가. |
| **해결법** | `applyBattleStartSkills`를 `tickContext.ts`에 `export function`으로 이동. `battleRewards.ts`의 3개 위치(explore 일반 전환, explore 보스 전환, hunt 리트라이)에서 `createBossPatternState()` 직후 `applyBattleStartSkills()` 호출 추가. `combatSlice.ts`에서 private 함수 삭제 후 `tickContext`에서 import. |

```typescript
// battleRewards.ts — 각 스폰 위치에 추가한 패턴
const newBps = createBossPatternState(nextMon.id);
// ...불씨 이월 코드...
if (ctx.bossPatternState) {
  const applied = applyBattleStartSkills(nextMon.id, ctx.equippedArts, ctx.bossPatternState, []);
  ctx.bossPatternState = applied.state;
  ctx.battleLog.push(...applied.battleLog);  // push 방식 — 재할당 금지
}
```

*마지막 업데이트: 2026-04-19*
