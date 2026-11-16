# 선생님 Google 가입 · 계정 유형 안내 · Teacher Studio 테마

2026-10-30.

## 적용한 화면과 동작

- `/signup/teacher`에도 Google 가입 버튼을 표시한다. Google 인증으로 이동할 때 `role=teacher`, 선생님 홈 목적지, `prompt=select_account`를 전달한다.
- Google 인증이 성공한 뒤 기존 학생 계정이면 역할을 변경하지 않고 선생님 로그인 화면으로 돌아와 안내 팝업을 표시한다.
- 학생 계정으로 선생님 소개·가입·로그인·보호 화면에 접근한 경우에도 공통 팝업을 표시한다. 학생 페이지 이동, 로그아웃 후 다른 계정 로그인, 닫기를 지원한다. 다른 계정 로그아웃에 실패하면 현재 세션을 유지하고 오류를 표시한다.
- 이메일 로그인에서도 인증 성공 후 실제 DB 역할과 진입 역할을 비교한다. 인증 전 이메일만으로 가입 유형을 조회하거나 노출하지 않는다.
- 반대 방향인 선생님 계정의 학생 화면 진입도 대칭적으로 안내한다. 관리자 권한은 변경하지 않는다.

## 새 Google 계정의 역할 저장

기존 계정을 학생에서 선생님으로 바꾸는 방식으로 구현하지 않는다. `0036_google_signup_role.sql`은 **마이그레이션 이후 새로 생성한 Google 계정에만** `profiles.oauth_role_pending=true`를 설정한다. 기존 계정은 모두 기본값 false이므로 기존 역할이 유지된다.

콜백은 pending 계정에 한해서 인증된 사용자의 `complete_oauth_registration` RPC로 학생 또는 선생님 역할을 한 번 확정한다. 선생님 역할 확정 시 전용 프로필을 만들고 기존 트리거가 심사 대기 정보를 생성한다. 이미 확정된 계정에 같은 RPC를 호출해도 저장된 역할을 반환하며 변경하지 않는다. 관리자 역할은 입력할 수 없다.

pending 상태·역할의 직접 REST 변경을 차단하고, pending 계정의 학생 활동도 막는다. 회원 행 잠금으로 역할 확정과 학생 활동 쓰기를 직렬화한다. 콜백 URL의 역할 값은 신규 가입 선택값이며 기존 계정의 권한을 변경하는 근거로 사용하지 않는다.

Supabase의 [OAuth 로그인 API](https://supabase.com/docs/reference/javascript/auth-signinwithoauth)와 [사용자 프로필 관리](https://supabase.com/docs/guides/auth/managing-user-data)를 참고했다. Google의 동의 화면을 통한 실제 가입과 DB 트리거 실행은 배포 환경에서 별도로 확인해야 한다.

## DB 적용 상태

**아직 원격 DB에 적용하지 않았다.** 현재 로컬 환경에 SQL 실행용 `SUPABASE_ACCESS_TOKEN`이 없다. 적용 전에는 공개 준비 확인 RPC가 존재하지 않으므로 선생님 Google 가입을 시작하지 않고 “가입 설정을 준비 중” 안내를 표시한다. 따라서 마이그레이션보다 앱이 먼저 배포되어도 새 Google 계정이 잘못된 기본 역할로 생성되는 것을 막는다.

미적용된 `0019`, `0020`, `0021`을 순서대로 적용한다. 이미 적용한 마이그레이션은 다시 실행하지 않는다. `0021`은 `0019`의 역할 고정 트리거가 없으면 트랜잭션을 중단한다.

```powershell
node scripts/supabase-query.mjs supabase/migrations/0019_fixed_account_roles.sql --apply
node scripts/supabase-query.mjs supabase/migrations/0020_account_role_reporting.sql --apply
node scripts/supabase-query.mjs supabase/migrations/0036_google_signup_role.sql --apply
node scripts/supabase-query.mjs supabase/tests/google_signup_role.sql --apply
```

SQL Editor에서도 같은 파일을 순서대로 실행할 수 있다. 테스트 SQL은 생성한 계정과 쓰기를 모두 롤백한다. SQL 테스트는 아직 원격에서 실행하지 않았다.

## 선생님 테마

공통 의미별 색상 토큰을 선생님 문맥에서 덮어쓴다. 딥틸 `#1B5B54`, 차콜 그린, 세이지 보조색, 밝은 스톤 배경을 사용한다. 버튼과 카드의 과한 둥근 모서리·핑크 그라데이션·애니메이션 강조를 정리했다. 학생 테마는 그대로 유지한다.

선생님 소개, 가입, 로그인, 홈, 수업·일정, 채팅, 프로필·정산과 공통 모달·상하단 메뉴에 적용한다. 공용 화면에서는 로그인 계정의 역할을 사용하며 관리자 화면은 기존 테마를 유지한다. 헤드 스크립트는 첫 페인트 전에 주소로 테마를 정하고, 페이지 이동 때는 공통 테마 컴포넌트가 동기화한다. 소개와 업무 홈에 `TEACHER STUDIO` 문맥을 추가했다.

## 완료한 검증

- 인증·Google 역할·중복 계정·콜백 분기 단위 테스트 9개 통과.
- 기존 인증 회귀 테스트 9개와 라우터 호환 패치 테스트 4개 통과.
- 타입 검사와 프로덕션 빌드 통과. 기존 폰트·Providers 의존성 린트 경고만 남아 있다.
- 실제 Chrome: 선생님·학생 팔레트 분리, 선생님 가입 Google 버튼, 모바일 가로 넘침 없음, DB 미설정 안내, 역할·목적지를 담은 Google 이동 검증. Google 이동은 가로채어 실제 외부 인증이나 계정 생성을 하지 않았다.
- 실제 팝업 컴포넌트에 로컬 학생 세션 fixture를 연결해 표시·학생 페이지 이동·다른 계정 로그인을 검증했다. 실제 사용자 세션으로 DB에 로그인한 통합 테스트와 구분한다.
- 실제 프로덕션 서버에서 페이지 왕복·가입·로그인·이전 주소 이동 중 uncaught client exception 0건.

브라우저 검증 파일: `tests/teacher-auth.browser.cjs`, `tests/navigation.browser.cjs`.
