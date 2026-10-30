# 학생·선생님 계정 분리 검토 및 적용 내역

검토일: 2026-10-30 (한국 시간).

## 실제 DB 점검 결과

로컬 `.env.local`에 연결된 Supabase 프로젝트를 서비스 역할로 **읽기 전용 REST 조회**했다. 개인별 ID, 이름, 이메일은 보고서에 저장하지 않고 집계만 남겼다. 재실행: `node scripts/audit-account-roles.mjs`. 원본 집계: `account-role-audit.json`.

| 항목 | 행 수 |
| --- | ---: |
| 공통 회원 profiles | 157 |
| 학생 계정 | 53 |
| 선생님 계정 / teacher_profiles | 104 / 104 |
| 수업 상품 teacher_lessons | 214 |
| 수업 일정 lesson_sessions | 251 |
| 수강 예약 enrollments | 583 |

선생님 프로필이 있는 학생, 선생님 프로필 없는 선생님, 수업·일정의 역할 불일치, 학생 외 계정의 수강 예약, 가르치기와 수강 이력이 함께 있는 계정은 모두 0건이었다. 이 점검은 조회 시점의 결과이며 동시에 발생한 쓰기를 잠근 트랜잭션 스냅샷은 아니다. 마이그레이션은 적용 시점에 핵심 충돌을 다시 검사한다.

## 데이터 분리 방식 결정

**단일 Supabase 프로젝트 + 공통 회원 정보 + 역할별 상세 정보**를 유지한다.

- 인증·이메일 유일성: 기존 `auth.users`와 Supabase Auth가 담당한다. 같은 이메일로 두 계정을 만들지 않는다.
- 공통 회원 정보와 고정 역할: `profiles` 한 행. 앱의 역할 판단은 `user.role` 하나로 통일한다.
- 선생님 전용 정보: `teacher_profiles`를 회원 UUID로 1:1 연결한다. 신규 선생님 가입 시 생성하고 기존 트리거로 심사 대기 행도 만든다.
- 수업 상품·일정·예약·결제 등은 기존 외래 키와 별도 테이블을 유지한다. 개인정보나 비밀번호를 별도 학생·선생님 인증 테이블로 복제하지 않는다.
- 학생만의 추가 필드가 실질적으로 늘면 `student_profiles(profile_id)`를 도입할 수 있다. 현재 사용하지 않을 빈 테이블은 추가하지 않는다.
- 앱의 `activeRole` 상태, 프로필 속성, 전환 훅과 사용하지 않는 가입 폼을 제거했다. DB `active_role`은 기존 배포와의 호환을 위해 당장 삭제하지 않고 고정 역할로 동기화한다. 새 코드의 권한 판단에서는 사용하지 않는다.
- 역할 필터·등록일 정렬에 맞춘 `(role, created_at desc, id desc)` 복합 인덱스를 추가하는 SQL을 준비했다. 실제 성능 향상 수치는 측정하지 않았다.

157개 회원과 수백 개 수업·예약이라는 관측 규모에서는 학생/선생님 DB 분리나 샤딩, 파티셔닝의 이점이 입증되지 않는다. 오히려 예약·결제·채팅의 교차 조회와 트랜잭션, 공통 인증 관리를 복잡하게 만든다는 판단이다. 대량의 채팅·알림 등 실제로 커지는 테이블은 이후 용량·실행 계획·보관 정책을 측정해 날짜별 파티셔닝이나 보관 분리를 검토한다.

검토 근거:

- [Supabase 사용자 데이터 관리](https://supabase.com/docs/guides/auth/managing-user-data): 공개 스키마의 사용자 테이블을 `auth.users` 기본 키에 연결하고 RLS로 보호하는 구조.
- [PostgreSQL 복합 인덱스](https://www.postgresql.org/docs/current/indexes-multicolumn.html): 선두 컬럼의 동등 조건을 고려한 인덱스 설계.
- [PostgreSQL 파티셔닝](https://www.postgresql.org/docs/current/ddl-partitioning.html): 대형 테이블에서의 이점과 운영 비용. 현재 규모에 대한 선택은 이 문서와 실제 조회 결과를 바탕으로 한 프로젝트 판단이다.

## 페이지와 관리자 기능

| 목적 | 이름 | 경로 |
| --- | --- | --- |
| 학생 서비스 입구 | 한국어 배우기 · 학생 | `/student` |
| 선생님 서비스 입구 | 한국어 가르치기 · 선생님 | `/teacher` |
| 가입 입구 | 회원가입 안내 | `/signup` |
| 학생 가입 | 학생 회원가입 | `/signup/student` |
| 선생님 가입 | 선생님 회원가입 | `/signup/teacher` |
| 공통 로그인 | 로그인 | `/login` |
| 수업 만들기 | 수업 개설 | `/teacher/lessons/new` |
| 수업 상세 입력 / 최종 확인 / 완료 | 수업 개설 단계 | `/teacher/lessons/new/details`, `/confirm`, `/complete` |

기존 `/signup?role=teacher`, `/signup?role=student`, `/register`, `/teacher/register/*` 주소는 새 경로로 안내한다. 선생님 가입은 현재 이메일 방식이고 학생의 Google 가입과 기존 계정 Google 로그인은 유지한다. Google 계정으로 새로운 선생님 역할을 선택하는 기능은 포함하지 않는다.

기본 `/` 주소는 `/student`로 연결한다. 학생 시작 페이지는 학습·선생님 검색을 안내하고, 선생님 시작 페이지는 선생님 가입·수업 개설·관리 기능을 안내한다. 각각 전용 가입 주소와 역할별 홈을 목적지로 하는 로그인 링크를 제공한다. 공개 시작 페이지에는 로그인 후 사용하는 하단 메뉴를 표시하지 않는다. 도메인이나 인증 서버를 분리하는 변경은 하지 않았다.

관리자의 **회원 관리 안의 전체 회원 / 학생 / 선생님 탭은 조회 필터**이므로 유지한다. 계정 유형 변경은 관리자에게도 제공하지 않는다. 심사 승인·반려는 선생님 인증 상태를 바꾸는 별도 업무로 유지한다. 수업 공개·비공개 역시 유지한다. 관리자에서 일반 서비스로 돌아가는 링크는 현재 계정 유형의 마이페이지를 가리키며, 관리자 화면에서는 학생·선생님 하단 메뉴와 채팅 버튼을 숨긴다. 디자인 설정의 화면 테마 선택은 계정 역할과 무관하므로 유지한다.

관리자 권한은 기존 `admin_members`와 `admin_is_authorized()`로 분리해 유지한다. 회원가입 메타데이터의 `admin` 값은 학생으로 처리하고 관리자 권한을 부여하지 않는다.

## DB 적용 상태 및 실행

**소스 수정과 실제 DB 조회는 완료. 아래 DDL과 DB 회귀 테스트는 아직 원격 DB에서 실행하지 않았다.** 현재 환경에는 REST 서비스 키만 있고 `SUPABASE_ACCESS_TOKEN`이나 PostgreSQL 직접 연결이 없다. 서비스 키를 관리 API 토큰으로 사용하지 않는다.

준비한 마이그레이션:

1. `0019_fixed_account_roles.sql`: 적용 전 역할 충돌 검사, 가입 역할 제한, 선생님 상세·심사 자동 생성, 역할 변경 차단, 수업·예약·일정·채팅·가능 시간의 참여자 역할 검증. 실제 테이블명 `teacher_lessons`를 사용한다. 기존 이력과 계정은 삭제·복제하거나 다른 역할로 변경하지 않는다.
2. `0020_account_role_reporting.sql`: 관리자 학생·선생님 목록과 집계를 `profiles.role` 기준으로 통일하고 복합 인덱스 추가.

로컬에 관리 토큰을 설정한 뒤 실행하거나, Supabase SQL Editor에서 두 마이그레이션을 순서대로 실행한다. 관리 토큰은 채팅이나 코드에 붙여 넣지 않는다.

```powershell
node scripts/supabase-query.mjs supabase/migrations/0019_fixed_account_roles.sql --apply
node scripts/supabase-query.mjs supabase/migrations/0020_account_role_reporting.sql --apply
node scripts/supabase-query.mjs supabase/tests/fixed_account_roles.sql --apply
node scripts/supabase-query.mjs supabase/tests/admin_console.sql --apply
node scripts/audit-account-roles.mjs
```

SQL 테스트 파일은 테스트 계정과 쓰기를 트랜잭션 안에서 만들고 마지막에 롤백한다. 마이그레이션 두 개는 각각 커밋한다. 기존 수업 개설·예약 RPC와 관리자 심사 기능을 유지한다.

## 완료한 검증

- `node tests/google-auth.test.cjs`: 6개 통과. 역할별 이동, 가입 역할 전달·중복 이메일, 분리된 가입 폼, 공용 화면의 계정별 메뉴와 관리자 하단 메뉴 숨김 검증.
- `node tests/system-integrity.test.cjs`: 9개 통과. 인증 오류·재시도, 계정 변경과 응답 경합, 인증 이메일 대기 등 기존 동작 회귀 검증 포함.
- `npm run type-check`: 통과.
- `npm run lint`: 오류 없이 완료. 기존 루트 레이아웃의 폰트 설정과 Providers 훅 의존성 경고가 남아 있다.
- 실제 개발 서버 HTTP 확인: 가입 안내·학생 가입·선생님 가입 200, 구 가입 링크 307, 비로그인 수업 개설 확인 페이지는 로그인으로 307.
- 원격 SQL 회귀 테스트는 관리 토큰 연결 후 실행해야 한다. 실제 신규 이메일 가입·메일 수신·로그인까지 이어지는 통합 테스트는 수행하지 않았다.
