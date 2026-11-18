# 쌤 프로필 2.0 구현·검증 기록

## 화면과 공개 범위

- 기본 소개 편집: `/teacher/profile/edit`. 사진 미리보기·정사각형 자르기·교체·삭제, 한 줄 소개 미리보기, 전문 분야 기반 초안 선택.
- 프로필 관리: `/teacher/profile`. 기본 소개 → 선택 카드 → 판매 준비로 이동한다. 공개 예정 카드와 최근 30일 로그인 학생 유입을 확인한다.
- 카드 편집: `/teacher/profile/portfolio`. K-pop 그룹·영화·드라마·기타 관심사는 작품 또는 그룹별로 각각 저장한다. 다섯 수업 스타일은 본인이 직접 고르는 1~5단계다. 자기소개·시범 수업 영상, 다른 언어로 작성한 소개, 기존 경력·자격·대표 작업도 카드별로 공개한다. 동일 탭의 새로고침에 대비해 기본 소개와 카드 초안을 계정별 세션 저장소에 보관한다.
- 언어 공개: `/teacher/profile/matching`. 기존 언어 공개 상태는 유지하고 새 프로필은 비공개로 시작한다. 매칭 허용과 공개 여부는 별개다.
- 학생 검색: `/student/teachers`. 공개 취향 최대 3개, 수업 유형, 다음 확정 회차가 있으면 시각을 표시한다. 후기 없는 쌤은 신규로 표시한다.
- 학생 상세: `/teachers/<쌤 ID>`. 공개 카드·언어, 수업 유형·시간·잔여석, 수업별 상세/예약 링크. 남은 자리는 조회 시점 값이며 확정은 기존 예약 절차에서 처리한다.
- 유입: 쌤의 공유 버튼이 발급받은 서버 토큰과 방문 쌤이 일치할 때만 공유 유입으로 분류한다. 동일 학생·쌤·한국 날짜의 첫 유입으로 중복 제거하며, 30일 요약은 학생 수 기준이다. 방문 후 같은 쌤의 예약이 확정·완료된 학생 비율을 표시한다. 정산 금액과 수수료에 사용하지 않는다.

## 이번 변경 파일

- 쌤 화면: `src/app/(main)/teacher/profile/page.tsx`, `profile/edit/page.tsx`, `profile/portfolio/page.tsx` (뒤 두 경로도 같은 teacher 디렉터리 기준).
- 학생 화면: `src/app/(main)/teachers/[id]/page.tsx`, `src/app/(main)/teachers/[id]/layout.tsx`, `src/app/(main)/student/teachers/page.tsx`.
- 컴포넌트: `src/components/features/MatchingProfileEditor.tsx`, `src/components/features/teacher/{PortfolioSections,ProfileClip,PortraitCrop,TeacherWorkspaceDashboard}.tsx`.
- 데이터: `src/lib/queries/{teacherPortfolio,matching,teachers,bookings}.ts`, `src/types/database.generated.ts`.
- DB: `supabase/migrations/0057_profile_showcase.sql` (기존 포트폴리오 종류 확장, 스타일 및 공개 권한, 비공개 영상 버킷, 언어 공개, 회차 요약), `0058_teacher_profile_activity.sql` (공유 토큰, 학생별 방문·선택과 쌤 본인 집계).
- 검증: `tests/teacher-languages-db.sql`, `tests/teacher-portfolio-rls.sql`, `tests/teacher-portfolio.browser.cjs`, `tests/profile-showcase.test.cjs`.

## 운영 전 확인

로컬에서 기존 DB 마이그레이션을 모두 적용해 DB 타입을 생성하고, 단위·DB 테스트, 브라우저 프로필 테스트, 타입 검사, 린트와 Next 빌드를 실행했다. 브라우저 테스트는 실제 React 컴포넌트에 모의 데이터를 연결한다. 운영 로그인·실결제나 실제 Storage 업로드를 수행한 검사는 아니다.

```
npm run db:types
node --experimental-test-isolation=none --test tests/*.test.cjs
node tests/teacher-portfolio.browser.cjs --profile-only
npm run type-check -- --incremental false
npm run lint
npm run build
```

스테이징에서 0057 → 0058 순으로 적용하고 실제 승인 계정과 학생 계정으로 업로드·비공개 전환·재생·예약을 점검한 뒤 운영 DB와 웹을 배포한다. 별도 AI 키나 신규 유료 서비스가 필요하지 않다. 기존 Supabase 프로젝트와 Storage, 운영용 APP_ORIGIN을 사용한다.

## 적용 범위와 남은 항목

- 기존 가입·심사·수업·예약·결제·정산 경로를 재사용한다. 쌤 본인의 선택 카드 미리보기와 실제 학생 공개는 승인 전 다를 수 있다.
- 영상 재생용 서명 URL은 60초간 유효하다. 파일 크기와 허용 MIME은 버킷에서도 제한하고, 재생 가능 여부·길이·파일 헤더는 브라우저에서 확인한다. 서버 영상 분석·자동 자막·트랜스코딩과 장기 미사용 업로드 정리는 추가 작업이다. 외부 링크는 제공자의 접근 정책을 따른다.
- 한 줄 소개는 입력한 전문 분야만 활용하는 로컬 초안이다. 자동 번역·전체 사이트 다국어 전환·언어별 SEO는 미구현이며 번역 소개는 직접 작성하고 공개한다.
- 일반 공유와 주소 복사, 프로필별 canonical·Open Graph를 지원한다. 별도 카카오 SDK와 익명 방문 추적은 연결하지 않았다. 검색의 다음 시간은 생성된 회차 기준이며 신청형 가능 시간은 예약 화면에서 조회한다.