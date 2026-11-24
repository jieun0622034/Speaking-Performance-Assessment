# 교사 워크스페이스 API v1

모든 경로는 `/api` 기준입니다. 브라우저는 same-origin HttpOnly `JSESSIONID` 쿠키를 사용합니다. 교사 ID를 요청에 넣어 다른 사람을 지정할 수 없습니다. 웹앱은 `X-Workspace-Owner`에 화면을 연 계정 ID를 보내며, 다른 탭에서 로그인 계정이 바뀌면 409 `ACCOUNT_CHANGED`로 읽기·쓰기를 차단해 원래 계정으로 재인증합니다. 오류 형식은 `{ "code": "...", "error": "사용자 안내" }`입니다.

## 인증

| 메서드·경로 | 요청 | 응답 |
|---|---|---|
| GET `/auth/status` | 없음 | `{authenticated, csrfToken, user}`. 비로그인 user는 빈 객체 |
| POST `/auth/signup` | `{email,password,name,school?}` | `{user:{id,email,name}}`, 세션 발급 |
| POST `/auth/login` | `{email,password}` | `{user:{id,email,name}}`, 세션 갱신 |
| POST `/auth/logout` | `{}` | `{ok:true}`, 세션 폐기 |

상태 조회에서 받은 `csrfToken`을 모든 POST의 `X-CSRF-TOKEN` 헤더로 전송합니다. 가입·로그인 직후 GET `/auth/status`를 다시 호출해 새 토큰을 받습니다. 세션과 토큰은 함께 사용해야 하며 토큰 자체를 인증 수단으로 쓰지 않습니다. 인증 실패 401, CSRF 거절 403, 등록 충돌 409, 요청 제한 429. 이메일은 소문자로 정규화합니다. 비밀번호는 10자 이상·UTF-8 72바이트 이하이며 BCrypt로 해시합니다.

## 워크스페이스

GET `/workspace` → `{revision:number,data:StudioData}`

POST `/workspace` ← 동일한 구조. 성공 시 revision이 1 증가한 전체 자료를 반환합니다. 프런트 타입은 `frontend/src/studio/model.ts`의 `StudioData`, `Course`, `Student`, `Take`입니다.

- `data.version:1`, `profile:{name,school,subject}`, `courses:Course[]`, `takes:Take[]`.
- 학생 번호는 학급 내 중복 불가. 이름·식별자·항목·배점·점수 범위를 서버에서도 검사합니다.
- 녹음은 존재하는 수업·학생과 현재 계정이 업로드한 `blobId`를 참조해야 합니다. 예시 수업·예시 녹음 저장은 거절합니다.
- 확정 평가는 모든 항목의 범위 내 점수와 비어 있지 않은 피드백이 필요합니다.
- 성공할 때만 전체 자료를 저장합니다. 400이면 수정 없이 종료, 409 `REVISION_CONFLICT`이면 최신 자료를 다시 불러와야 합니다. 프런트는 자동 덮어쓰기하지 않습니다.

## 학기·명단 변경

`Course`에 선택적 `year`(2000~2100 정수), `semester`(1 또는 2), `archivedAt`(ISO instant)가 추가됐습니다. 이전 자료는 학기 속성 없이도 조회·저장할 수 있으며 보관 시에는 학기를 지정해야 합니다. 전체 workspace CAS 요청에서 여러 수업의 archivedAt을 설정하면 원자적으로 보관됩니다. 기존에 지정된 year/semester를 보관과 함께 다른 기간으로 바꾸면 거절됩니다. 학기가 미지정된 기존 수업만 보관 시 기간을 지정할 수 있습니다.

보관한 수업과 연결 평가의 수정·누락·새 녹음 추가는 400으로 거절됩니다. 복원 요청은 해당 수업의 archivedAt만 제거해야 하며 자료 수정은 복원 성공 후 다음 요청에서 수행합니다. 자동 폐기는 없습니다.

학생의 ID를 유지한 채 이름·번호를 수정합니다. 웹앱은 연결된 Take의 studentName/studentNumber도 함께 변경하며 원본 참조·점수·criteria 스냅샷은 유지합니다. 동일 학급 중복 번호 검증은 기존과 같습니다. 공통 기준은 선택한 수업의 task/prompt/rubric/criteria만 한 요청에서 변경하며 이미 존재하는 Take는 수정하지 않습니다.

## 원본

POST `/media/{key}`: multipart `file`. audio/webm, audio/mp4, audio/wav, audio/mpeg, audio/ogg, video/webm, video/mp4 지원. Content-Type의 codec 파라미터는 제거해 기록합니다. key는 영문·숫자·밑줄·하이픈 1~80자. 파일 200MB 이하·계정 한도 1GB. 응답 `{id,saved:true}`.

같은 계정·key·SHA-256의 재업로드는 성공으로 처리하며 다른 내용이면 409 `MEDIA_CONFLICT`입니다. 먼저 원본을 업로드하고 성공한 key를 녹음 `blobId`에 넣어 workspace를 저장합니다. workspace 실패 시 파일을 버리지 않고 같은 key로 재시도합니다. 워크스페이스 저장의 CAS 충돌은 원본 업로드와 별개입니다.

GET `/media/{key}`: 소유 계정만 원본 수신. Range 요청 206 지원. 다른 계정이나 없는 파일은 404, 비로그인은 401. `Cache-Control:no-store`.

## PDF와 AI

POST `/files/extract-text`: 인증 필요, multipart `file`, 12MB·30페이지 PDF. `{text,pages}`. 원본 PDF는 저장하지 않으며 스캔 OCR은 지원하지 않습니다.

POST `/rubric/generate`, `/grade/speaking`, `/grade/writing`, `/grade/both`, `/record/generate`: 인증·CSRF 검사 후 **501 `AI_MIGRATION_PENDING`**. AI 구현 완료를 가장하는 응답을 만들지 않습니다.

GET `/health`: 공개 상태 확인. Swagger `/swagger-ui.html`, OpenAPI `/v3/api-docs`는 개발 프로필에서 확인할 수 있습니다. 현재 JSON 문서 기반 endpoint의 세부 필드 계약은 위 타입과 이 문서를 함께 사용하며, 별도 엔티티 API/DTO 정규화가 남아 있습니다.
