# 코드·DB 검증 — 2026-11-02

## 범위와 결과

현재 작업 트리(미커밋 변경 포함), 로컬 마이그레이션 0001~0021, 연결된 Supabase의 읽기 전용 REST 조회를 검토했다. 운영 데이터와 애플리케이션 코드는 수정하지 않았다. 아래에서 **실제 DB 확인**과 **코드 분석**을 구분한다. DB 함수 본문·RLS의 현재 배포 상태 전체를 SQL 카탈로그로 확인한 것은 아니다.

- `npm run type-check`: 통과.
- `npm run lint`: 오류 없음, 경고 4개(레이아웃 폰트 3개, providers useMemo 의존성 1개).
- `node --test --test-isolation=none tests/google-auth.test.cjs tests/system-integrity.test.cjs tests/teacherPortraits.test.cjs tests/next-router-patch.test.cjs`: 27개 통과. 기본 실행은 샌드박스의 자식 프로세스 생성 제한으로 실패해 동일 프로세스 옵션으로 재실행했다.
- 실제 DB에서 예약의 reserved_price/reserved_currency/expires_at, 결제의 verified_payment, 정산의 currency/verified_settlement 조회는 성공했다.
- 브라우저 로그인 종단 간 검증, 부하·동시성 테스트, 운영 SQL 변경은 수행하지 않았다. 기존 테스트 통과가 아래 사례를 보장하지 않는다.

## 발견 사항

### 1. [P1 / 실제 DB 확인] Google 선생님 인증 코드와 DB 배포 불일치

근거: `src/stores/auth-store.ts:120`, `src/app/auth/callback/route.ts:23`, `supabase/migrations/0036_google_signup_role.sql`.

- 실제 DB에서 `profiles.oauth_role_pending` 명시 조회가 `42703: column profiles.oauth_role_pending does not exist`로 실패했다.
- 익명 클라이언트 권한으로 읽기 전용 준비 확인 RPC `google_signup_role_ready()`를 호출하면 HTTP 404/PGRST202가 반환된다.
- 서비스 권한 OpenAPI에도 `complete_oauth_registration` 경로가 없다. reserve_lesson, checkout_free_booking, my_balance, my_teacher_overview, lesson_booking_slots는 있다.
- `loginWithGoogle`은 선생님 진입 시 준비 확인 오류를 받으면 OAuth 시작 전에 중단한다. 따라서 현재 코드에서는 Google 선생님 신규 가입뿐 아니라 기존 선생님의 해당 로그인 진입도 막힌다.
- 일반 프로필 로딩은 `select('*')`이므로 이 컬럼 부재만으로 모든 로그인이 실패한다고 해석하면 안 된다.

권장: 0021의 선행 조건과 SQL 테스트를 검토한 뒤 DB에 적용하고 익명 준비 확인 및 신규/기존 Google 계정 흐름을 검증한다. 이번 검증에서는 마이그레이션을 적용하지 않았다.

### 2. [P1 / 코드 분석] 결석 저장 후 해당 학생이 출석 명단에서 사라짐

근거: `src/lib/queries/attendance.ts:47`, `supabase/migrations/0014_preferences_maintenance.sql:55`.

수업 종료 후 absent를 저장하면 트리거가 예약을 no_show로 바꾼다. 그러나 명단 조회는 confirmed/completed만 포함한다. 명단을 다시 열면 결석 학생이 사라져 UI에서 출석·지각으로 정정할 수 없다. 통계 조회는 no_show를 포함해 서로 다른 기준을 사용한다.

권장: 명단 조회에 no_show를 포함하고 결석 저장 → 재조회 → 출석 정정 흐름을 검증한다. 현재 DB의 no_show 건수는 0건이라 기존 데이터 피해가 확인된 것은 아니다.

### 3. [P1 / 코드 분석] 수업 종료 전에 저장한 출석이 완료 상태로 전환되지 않을 수 있음

근거: `supabase/migrations/0014_preferences_maintenance.sql:27`, `:46`, `src/app/(main)/teacher/lessons/attendance/page.tsx:105`.

출석 화면과 트리거 모두 종료 전 출석 저장을 허용한다. 트리거는 INSERT/UPDATE 시점에 수업이 끝난 경우에만 예약을 completed/no_show로 바꾼다. 유지보수 함수는 만료 예약·알림만 처리한다. 수업 중 출석을 저장하고 종료 후 다시 저장하지 않으면 confirmed 상태로 남을 수 있고, completed에 의존하는 리뷰·정산 처리에서 빠진다.

권장: 종료 전 기록을 허용한다면 종료 후 확정 배치를 추가하거나, 출석 기록과 수업 완료를 별도 절차로 확정한다. 현재 조회에서 미래 수업의 출석 기록은 0건이었다. 이미 진행 중인 수업의 기록까지 없다고 확인한 것은 아니다.

### 4. [P2 / 코드 분석] 최근 예약 수가 전체 예약 수가 아니라 본인 예약 수로 표시됨

근거: `src/lib/queries/teachers.ts:129`, `:142`, `supabase/migrations/0001_init.sql:451`, `src/app/(main)/teachers/[id]/page.tsx:250`.

브라우저에서 enrollments를 직접 조회해 선생님별 예약 수를 계산한다. 저장소의 RLS는 학생 본인 또는 담당 선생님에게만 예약 조회를 허용한다. 이 정책대로 배포되어 있으면 학생은 자신의 예약만 집계하게 되지만, 화면은 전체 인기 지표처럼 “최근 30일 N회 예약”을 표시한다. 취소·결제 대기 상태도 제외하지 않는다.

권장: 개인정보를 반환하지 않는 공개 집계 전용 함수로 정의하고 집계에 포함할 상태를 명시한다. 현재 배포 RLS 원문은 확인하지 않았으므로 실제 사용자 권한 검증이 추가로 필요하다.

### 5. [P2 / 코드 분석] 무료 체험 사용 여부의 클라이언트와 DB 기준 불일치

근거: `src/lib/queries/bookings.ts:119`, `supabase/migrations/0013_system_integrity.sql:81`, `src/app/(main)/student/booking/confirm/page.tsx:192`.

DB 예약 함수는 pending_payment이면서 expires_at이 지난 예약을 사용 이력에서 제외한다. 클라이언트는 cancelled가 아닌 모든 예약을 사용 이력으로 취급한다. 만료와 유지보수 배치 실행 사이에 무료 체험 버튼이 비활성화되어 DB가 허용하는 재예약을 UI가 막는다.

권장: 클라이언트도 confirmed/completed/no_show 또는 유효한 pending_payment만 판정한다. 실제 조회 시 만료된 무료 체험 대기 예약은 0건이었다.

### 6. [P2 / 코드 분석] 검색 목록 전체 로딩과 서버 응답 상한에 따른 누락 가능성

근거: `src/lib/queries/teachers.ts:51`, `:142`, `:169`, `src/app/(main)/student/search/page.tsx:449`.

선생님 목록, 최근 예약, 가능 시간 조회에 DB 페이지 범위가 없다. 검색 화면의 더보기는 이미 받은 배열을 slice하는 방식이다. 선생님별 수업명과 가격도 모두 중첩 조회한다. 데이터가 늘면 초기 응답과 브라우저 필터 비용이 증가하고, API 반환 상한을 넘는 행은 더보기를 눌러도 복구되지 않는다. 최근 예약 집계도 누락될 수 있다.

권장: 검색·필터·정렬·페이지 처리를 DB에서 수행하고 카드에는 집계된 최소 가격만 반환한다. 실제 선생님 프로필 104건, 수업 214건으로 조회됐으며 현재 상한 초과를 재현한 것은 아니다.

### 7. [P2 / 코드 분석] 시간대 필터가 분 단위를 버려 검색 결과를 누락

근거: `src/lib/queries/teachers.ts:176`.

시간대 판정이 HH:mm에서 시만 추출한다. 예를 들어 11:30~12:30은 오전과 오후에 겹치지만 endHour=12로 계산해 오후 조건(endHour > 12)을 만족하지 못한다. 17:30~18:30도 저녁 검색에서 누락된다.

권장: 시·분을 총 분으로 변환해 구간 겹침을 비교한다.

### 8. [P2 / 코드 분석] 사용 가능 쿠폰 수와 실제 쿠폰 목록의 기준 불일치

근거: `src/lib/queries/studentProfile.ts:56`, `src/lib/queries/coupons.ts:25`, `supabase/migrations/0001_init.sql:475`.

프로필 통계는 user_coupons.status='available'만 세며 만료·활성 여부를 확인하지 않는다. 실제 목록은 만료 쿠폰을 제외하고 활성 쿠폰 RLS의 영향도 받는다. 따라서 프로필에 표시된 사용 가능 개수와 목록이 달라질 수 있다.

권장: 활성 상태와 만료 기준을 동일한 DB 집계로 통일한다.

## 검증 구조 개선

`src/lib/supabase/client.ts:3`의 TODO처럼 생성된 Database 타입이 연결되지 않았다. 쿼리 문자열, RPC 이름·인자, 수동 타입 단언이 실제 스키마 변경을 충분히 검증하지 못한다. DB 타입 생성과 마이그레이션 적용 여부 확인을 배포 검증에 포함해야 한다. 이는 위 기능 오류와 별도로 권장하는 예방 조치다.

수정 우선순위: Google 인증 DB 배포 불일치 → 출석 상태·정정 → 예약 집계·무료 체험 → 검색 조회·시간대 → 쿠폰 집계.
