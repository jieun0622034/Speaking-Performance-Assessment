# 기존 Node 서버 참고 코드

React + Spring Boot 환경으로 전환하기 전 `server.ts`, Bun lockfile, 패키지 구성을 보관합니다.
현재 `npm run dev`에서는 실행하지 않습니다. `@google/genai`, Express, dotenv, tsx는 활성 프로젝트 의존성에서 제외했습니다.

기존 AI 루브릭·말하기·쓰기·통합 채점·세특 생성 로직을 Spring Boot로 옮길 때 참고하세요.
Spring Boot의 같은 경로는 현재 501 `AI_MIGRATION_PENDING`을 반환하며 채점 결과를 만들지 않습니다.
원래 Node 서버에는 키가 없을 때 모의 결과를 반환하는 코드가 있으므로 실제 채점 구현 시 그대로 사용하지 마세요.
