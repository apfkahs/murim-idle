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
