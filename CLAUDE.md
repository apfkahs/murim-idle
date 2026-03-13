# 무림방치록 프로젝트 규칙

## 오류 기록 규칙
- 개발 중 새로운 오류가 발생하고 해결했을 때, 반드시 `TROUBLESHOOTING.md`에 해당 오류와 해결법을 추가한다.
- 기존 항목과 동일한 오류면 해결법을 보강하고, 새로운 오류면 적절한 카테고리에 항목을 추가한다.
- 형식: 에러 메시지, 원인, 해결법을 표로 정리하고 필요시 코드 블록 포함.

## 프로젝트 구조
- 앱 코드: `app/` 디렉토리 (Vite + React + TypeScript + Zustand)
- 에셋 생성: `app/scripts/generate-assets.ts` (DALL-E 이미지 생성)
- Dev 서버 설정: `.claude/launch.json` (name: "dev", port: 5173)
- Dev 서버 실행: `node node_modules/vite/bin/vite.js` (Windows에서 npx 사용 불가)
