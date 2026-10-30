# Next.js App Router의 React #310 호환 패치

2026-10-30.

## 확인한 증거

사용자 콘솔의 `2117-804b74a2b6aa70f1.js:1:11428`은 배포된 공통 청크의 Next.js `Router` 함수에 해당한다. `useUnwrapState` 직후 pathname/searchParams를 만드는 `useMemo`에서 오류가 발생했다. React [오류 #310](https://react.dev/errors/310)의 의미는 이전 렌더보다 더 많은 훅을 호출했다는 것이다.

Next.js [이슈 #63121](https://github.com/vercel/next.js/issues/63121)에 보고된 비동기 라우터 상태 해제와 뒤따르는 훅 사이의 오류와 일치한다. 개별 학생·선생님 페이지의 조건부 훅 오류로 단정하지 않았다. 비로그인 상태의 기존 배포 페이지를 순서대로 이동하는 테스트에서는 사용자 오류가 재현되지 않았다. `contentscript.js`의 ObjectMultiplex 경고는 이 패치의 수정 대상이 아니다.

## 변경

`scripts/patch-next-router.cjs`가 설치된 Next **14.2.35**의 CJS와 ESM App Router 모듈을 함께 보정한다.

1. 초기 라우터 상태와 reducer 훅은 기존 Router에 유지한다.
2. 비동기 상태를 해제하는 `useUnwrapState`를 `RouterStateBoundary`로 분리한다.
3. pathname 등 나머지 화면 훅은 해제된 상태를 받는 `RouterContent`에서 호출한다.

인증·역할·DB 처리와 전역 Providers의 계정별 캐시 정리 동작은 변경하지 않았다. 페이지별 로딩 화면도 유지한다. 패치는 반복 실행해도 중복 삽입하지 않으며, Next 버전이나 대상 코드 구조가 달라지면 명시적으로 실패해 검토 없이 다른 버전에 적용하지 않는다. `next` 버전을 고정했고 `postinstall`, `predev`, `prebuild`에서 실행하므로 새 배포 설치·빌드에도 적용된다. `node_modules` 자체를 Git에 추가하지 않는다.

Next/React 업그레이드 시 업스트림 수정 포함 여부를 확인하고 이 호환 패치와 버전 고정을 함께 재검토해야 한다.

## 검증

- 호환 패치 테스트 4개: CJS/ESM 변환, 중복 실행, 알 수 없는 소스 거부, 설치된 두 모듈 확인.
- 타입 검사 통과.
- 실제 프로덕션 빌드 성공. 기존 폰트 설정과 Providers 의존성 관련 린트 경고는 남아 있다.
- 별도 `.tmp/next-production` 출력과 3001 포트에서 실제 Chrome 회귀 검증: 학생·선생님 시작 페이지와 가입 화면을 세 차례 왕복, 브라우저 뒤로가기, 학생 로그인 진입, 이전 주소 리다이렉트, 비로그인 보호 경로 접근. uncaught client exception 0건.

```powershell
node tests/next-router-patch.test.cjs
npm run type-check
# 기본 .next를 사용하는 개발 서버와 분리해서 검증할 때만 설정한다.
$env:NEXT_DIST_DIR = '.tmp/next-production'
npm run build
npm run start -- --port 3001
# 다른 터미널에서 설치된 Playwright와 Chrome 경로를 지정한다.
$env:TEST_BASE_URL = 'http://localhost:3001'
node tests/navigation.browser.cjs
```

Playwright가 프로젝트 의존성에 없다면 `PLAYWRIGHT_MODULE`, Chrome 경로가 자동 탐색되지 않으면 `CHROME_PATH`를 설정한다. 실제 사용자 로그인 세션에서의 재현·해결 확인은 별도로 필요하다.
