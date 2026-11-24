# Speaking Performance Assessment

영어 말하기·쓰기 수행평가 도구의 **React + Spring Boot 개발 환경**입니다.
저장소에 있던 React 화면은 유지하고, Node 서버 코드는 `legacy/node-server/`에 보관했습니다.

## 빠른 시작

필수: **Node.js 24**, **Java 17~25**. npm을 사용하며 Maven은 Wrapper가 설치합니다. 기본 실행에는 Docker나 AI 키가 필요하지 않습니다.

```sh
# 저장소 루트
cp .env.example .env.local
npm ci
npm run dev
```

Windows에서는 `.env.example`을 `.env.local`로 복사한 뒤 같은 npm 명령을 실행하세요. Node와 Java가 PATH에 등록되어 있어야 합니다.

| 주소 | 용도 |
|---|---|
| http://127.0.0.1:5173 | 기존 React 앱 |
| http://127.0.0.1:5173/api/health | React 개발 서버 → Spring Boot → DB 연결 확인 |
| http://127.0.0.1:8080/api/health | Spring Boot·DB 직접 확인 |
| http://127.0.0.1:8080/swagger-ui.html | Swagger UI |
| http://127.0.0.1:8080/v3/api-docs | OpenAPI JSON |
| http://127.0.0.1:8080/actuator/health | 운영 상태 확인용 기본 health |

정상 API 응답:

```json
{"status":"UP","service":"speaking-assessment-api","database":"UP"}
```

첫 실행은 의존성 다운로드에 시간이 걸립니다. 종료는 실행 창에서 Control+C입니다. 기본 접속 주소는 이 컴퓨터의 localhost입니다.

## 이번에 구성한 범위

- `frontend/`: 기존 React·TypeScript·Tailwind 화면, Vite 개발 서버와 `/api` 프록시
- `backend/`: Java 17·Spring Boot 3.5·Maven Wrapper, JDBC, Flyway, H2/PostgreSQL 프로필
- Swagger UI와 OpenAPI, 서버·DB 연결 확인 API, 공통 오류 형식
- 루트 npm workspace와 통합 실행 명령, 버전 파일, 환경변수 예제, GitHub Actions CI
- 기존 Node AI API 5개는 이식 예정 상태를 명시하는 **501 응답**으로 연결

**이 작업은 개발 환경 전환입니다. 기존 기능의 백엔드 이식이 끝난 상태는 아닙니다.**

현재 프런트엔드의 로그인·평가·명단 자료는 기존 코드대로 브라우저 localStorage/IndexedDB를 사용합니다. 기존 로그인은 브라우저 데모 구현이며 서버 인증이 아닙니다. 실제 비밀번호나 학생 개인정보를 넣어 사용하지 마세요. Spring Boot DB에는 아직 교사·학생·평가 테이블이 없습니다. Flyway 기준 버전만 준비했으며, ERD 확정 후 추가합니다.

AI 키를 넣어도 기존 Gemini 로직은 자동으로 실행되지 않습니다. 새 백엔드로 API별 이식·권한 검사·저장을 구현해야 합니다. GitHub Pages는 정적 화면 미리보기만 가능하며 Spring Boot API를 실행할 수 없습니다.

## 명령어

| 명령 | 동작 |
|---|---|
| `npm run dev` | Spring Boot와 React 동시 실행 |
| `npm run dev:frontend` | React만 실행 |
| `npm run dev:backend` | Spring Boot만 실행 |
| `npm run typecheck` | 프런트 TypeScript 검사 |
| `npm test` | 프런트 API 계약 테스트 |
| `npm run test:backend` | Spring Boot·DB·Swagger·이식 상태 테스트 |
| `npm run build` | 프런트 타입 검사와 정적 빌드 → `frontend/dist/` |
| `npm run build:backend` | 실행 JAR 생성 → `backend/target/` |
| `npm run build:all` | 두 빌드 수행 |
| `npm run check` | 타입 검사·테스트·프런트 빌드·백엔드 테스트 |

백엔드는 독립적으로도 실행할 수 있습니다.

```sh
cd backend
./mvnw spring-boot:run
# Windows: mvnw.cmd spring-boot:run
```

이 방식에서는 루트 `.env.local`을 자동으로 읽지 않습니다. 환경변수를 직접 내보내거나 `npm run dev:backend`를 사용하세요. 루트 실행 스크립트는 `.env.local` → `.env` 순으로 읽고 이미 내보낸 환경변수를 우선합니다.

## 환경변수

실제 값은 루트 `.env.local`에 작성하고 Git에 올리지 않습니다. `VITE_` 접두사가 붙은 값은 브라우저에 노출될 수 있으므로 비밀키에 사용하지 않습니다.

| 변수 | 기본 / 설명 |
|---|---|
| `FRONTEND_PORT` | `5173` |
| `BACKEND_PORT` | `8080` |
| `BACKEND_URL` | `http://127.0.0.1:8080`, Vite 프록시 대상 |
| `SERVER_ADDRESS` | `127.0.0.1` |
| `SPRING_PROFILES_ACTIVE` | `local` 또는 `postgres` |
| `VITE_BASE_PATH` | `/`, 정적 서브경로 배포 시에만 변경 |
| `DB_URL`, `DB_USER`, `DB_PASSWORD` | PostgreSQL 연결 설정 |
| `POSTGRES_PORT` | Docker의 로컬 PostgreSQL 포트, 기본 `5432` |

백엔드 포트를 바꿀 때는 `BACKEND_PORT`와 `BACKEND_URL`을 함께 수정하세요.

## DB

### 기본: H2

`local` 프로필은 메모리 H2 DB를 사용합니다. 별도 DB 설치 없이 실행·연결 테스트할 수 있으며 서버를 종료하면 초기화됩니다. **기존 React 앱의 브라우저 저장 자료와는 별개입니다.**

### 선택: PostgreSQL

Docker를 설치·실행한 상태에서:

```sh
docker compose --env-file .env.local up -d postgres
```

`.env.local`에서 `SPRING_PROFILES_ACTIVE=postgres`로 바꾼 뒤 `npm run dev`를 실행하세요. DB 비밀번호는 예제의 로컬 개발용 값에서 변경할 수 있습니다. DB 데이터는 Docker named volume에 유지됩니다. Compose 설정은 PostgreSQL 포트를 localhost에만 엽니다.

마이그레이션은 `backend/src/main/resources/db/migration/`에 추가합니다. 이미 실행한 파일을 수정하지 말고 `V2__...sql`처럼 새 버전을 작성하세요. Docker가 없는 환경에서도 기본 H2 개발과 테스트는 가능합니다.

## 폴더

```text
frontend/                 기존 React 화면·타입·브라우저 저장·테스트
backend/
  src/main/java/kr/speakingassessment/
    config/               OpenAPI 설정
    health/               API·DB 연결 확인
    common/               공통 오류
    migration/            Node AI API의 이식 예정 응답
  src/main/resources/
    application*.yml      local/postgres 프로필
    db/migration/         Flyway 버전 관리
  src/test/               통합 테스트
legacy/node-server/       원래 Node 구현 참고용
scripts/                  루트 환경변수를 읽는 백엔드 실행 도우미
.github/workflows/ci.yml  프런트 검사·빌드 / 백엔드 검증
```

## 다음 개발 순서

1. 교사·학급·학생·평가·제출·채점의 ERD와 API 요청/응답 확정
2. 서버 회원가입·로그인·접근 권한 구현 → 기존 브라우저 데모 인증 교체
3. 학생·평가·제출 자료의 DB 저장 및 파일 업로드 구현
4. 기존 Node AI API를 Spring Boot로 이식하고 Swagger에 DTO·오류·예시 추가
5. 실제 기기 녹음·채점 근거·교사 확정 통합 검증

기술 참고: [Vite base 설정](https://vite.dev/config/shared-options.html#base), [Spring Boot 3.5 요구사항](https://docs.spring.io/spring-boot/3.5/system-requirements.html), [springdoc](https://springdoc.org/).
