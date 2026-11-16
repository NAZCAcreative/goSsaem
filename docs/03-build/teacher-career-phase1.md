# 선생님 개인페이지 개편 1차

## 범위

- 메뉴: 홈 → 내 페이지 → 수업·학생 → 자료실 → 메시지.
- 수업 개설은 수업·학생 내부 CTA, 수익·정산은 `/teacher/settlement`.
- 내 페이지: 소개, 경력·자격·대표 작업, 공개 미리보기, 링크 공유. 수익 통계는 정산으로 분리.
- 소개 편집에 한 줄 소개 추가. 홈은 개인페이지 가꾸기를 먼저 안내.
- 대표 작업은 제목·설명·관련 외부 링크 방식. 자료실 파일의 공개 전환, 증빙 심사, PDF 출력, 기회 추천은 후속 범위.

## 저장 및 공개

`0026_teacher_portfolio.sql`로 `teacher_portfolio_entries` 추가. 새 항목은 기본 비공개.
본인은 전체 기록을 조회하고 수정·삭제할 수 있으며, 다른 사용자와 비로그인 방문자는 공개 기록만 조회한다.
공개 페이지에서도 `is_public = true` 조건을 명시해 소유자의 미리보기 역시 공개 항목만 표시한다.
경력과 자격은 모두 ‘본인 작성’이며 검증·공식 경력증명으로 표현하지 않는다.
공개를 해제하면 이후 조회부터 숨겨진다. 이미 외부로 공유되거나 열려 있는 화면의 사본까지 회수하는 기능은 없다.

## 호환성

- 기존 `/teacher/profile/materials` → `/teacher/materials`.
- 기존 `/teacher/profile/withdraw` → `/teacher/settlement`.
- 기존 `/teacher/profile/account` → `/teacher/settlement/account`.
- 저장된 메뉴 버전을 2로 전환. 기존 기본 선생님 메뉴를 교체하고 사용자 추가 링크와 학생 메뉴 설정은 유지한다.

## 검증

- `node --test tests/google-auth.test.cjs tests/teacher-portfolio.test.cjs`
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`
- `node tests/teacher-portfolio.browser.cjs`: 실제 React 컴포넌트 + 격리된 데이터로 모바일 390px/데스크톱 1440px의 저장·수정·재조회·삭제·실패 복구·공개 표시 검사.
- `tests/teacher-portfolio-rls.sql`: 실제 DB 트랜잭션에서 본인 CRUD, 타인 변경 차단, 익명 공개 조회, 비공개 전환 검증. 사용자와 기록을 포함한 모든 테스트 데이터 롤백.
- 브라우저 데이터는 테스트용이며 실제 계정 로그인부터 공유 링크까지의 통합 시나리오와 구분한다.

마이그레이션은 연결된 Supabase에 적용했다. 프런트엔드 배포는 별도다.

프로덕션 빌드와 라우터 패치 검증 통과. 이미지 최적화 및 기존 폰트·훅 관련 lint 경고는 빌드를 차단하지 않는다.
