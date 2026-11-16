# Google 로그인 설정

로그인과 회원가입의 `Google로 계속하기`는 Supabase OAuth(PKCE)를 사용합니다. `/auth/callback`에서 인증 코드를 세션 쿠키로 교환하고, 안전한 내부 `next` 경로 또는 `/student/home`으로 이동합니다. 신규 사용자는 기존 `on_auth_user_created` 트리거로 학생 프로필이 생성됩니다.

## 연결

현재 운영 주소는 `https://vora-bice.vercel.app`입니다. `gossaem.com`은 아직 사용하지 않습니다.

| 설정 위치 | 입력값 |
| --- | --- |
| Google Cloud → 승인된 JavaScript 원본 | `https://vora-bice.vercel.app` |
| Google Cloud → 승인된 리디렉션 URI | `https://nwuanuqblzzikhrpwzwd.supabase.co/auth/v1/callback` |
| Supabase → URL Configuration → Site URL | `https://vora-bice.vercel.app` |
| Supabase → Redirect URLs | `https://vora-bice.vercel.app/auth/callback` 및 `https://vora-bice.vercel.app/auth/callback?next=**` |

Google 제공자의 Client IDs에는 프로젝트 이름이 아닌 `...apps.googleusercontent.com` 형식의 OAuth 클라이언트 ID를 입력합니다. 운영 도메인을 연결하면 그때 원본과 리디렉션 허용 목록을 추가하고 Site URL을 변경합니다.

1. `.env.local.example`을 참고해 `.env.local`에 실제 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 설정합니다.
2. Google Cloud Console에서 OAuth 동의 화면을 설정하고 웹 애플리케이션용 OAuth 클라이언트를 생성합니다. 테스트 모드라면 사용할 Google 계정을 테스트 사용자로 추가합니다.
3. Google 클라이언트의 승인된 JavaScript 원본에 `http://localhost:3005`와 실제 운영 사이트 원본을 등록합니다. 승인된 리디렉션 URI에는 **Supabase 대시보드에 표시되는** `https://<project-ref>.supabase.co/auth/v1/callback`을 등록합니다.
4. Supabase Authentication의 Google 제공자를 활성화하고 Google Client ID와 Client Secret을 입력합니다. Client Secret은 Supabase에만 저장하며 `NEXT_PUBLIC_*` 변수에 넣지 않습니다.
5. Supabase Authentication → URL Configuration에서 Site URL을 운영 사이트로 지정하고 Redirect URLs에 `http://localhost:3005/auth/callback`과 `https://<운영 도메인>/auth/callback`을 추가합니다. 앱은 `next` 쿼리를 붙이므로 해당 쿼리도 허용되도록 각 주소에 `?next=**` 패턴도 등록합니다. 개발 포트를 바꾸면 원본과 리디렉션 주소도 맞춰야 합니다.
6. 개발 서버를 재시작합니다.

Google의 리디렉션 URI는 Supabase 주소이고, Supabase의 Redirect URLs는 앱 주소입니다.

## 실제 계정 검증

- `/login`과 `/signup`에서 Google로 계속하기 → 계정 선택 → 학생 홈 진입.
- 신규 계정의 `profiles` 행 생성 및 새로고침 후 로그인 유지 확인.
- `/login?next=%2Fstudent%2Fbookings`에서 로그인 후 예약 목록으로 복귀.
- Google 동의 취소 시 로그인 화면에 안내가 표시되고 재시도 가능.
- 외부 URL을 `next`에 넣어도 학생 홈으로 이동.
- 로그아웃 후 보호된 페이지 접근 시 로그인 화면으로 이동.
- 기존 이메일 로그인과 회원가입도 정상 동작하는지 확인.

공식 문서: [Supabase Google 로그인](https://supabase.com/docs/guides/auth/social-login/auth-google), [리디렉션 URL 설정](https://supabase.com/docs/guides/auth/redirect-urls).
