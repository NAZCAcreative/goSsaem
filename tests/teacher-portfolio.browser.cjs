// Real React UI with isolated data fixtures. DB persistence/RLS is tested separately.
const fs = require('node:fs');
const ts = require('typescript');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.TEST_BASE_URL || 'http://localhost:3005';
const sources = {
  dashboard: 'src/components/features/teacher/TeacherWorkspaceDashboard.tsx',
  meeting: 'src/components/features/teacher/MeetingLinkEditor.tsx',
  editor: 'src/app/(main)/teacher/profile/portfolio/page.tsx',
  profile: 'src/app/(main)/teacher/profile/page.tsx',
  '@/components/features/teacher/PortfolioSections': 'src/components/features/teacher/PortfolioSections.tsx',
};
const code = Object.entries(sources).map(([id, path]) => `modules[${JSON.stringify(id)}]=function(exports,require){${ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText}};`).join('\n');
async function mount(page, mode) {
  const response = await page.request.get(base + '/login');
  assert.equal(response.status(), 200);
  const markup = await response.text();
  const styles = [...markup.matchAll(/<link\b[^>]*>/g)].map(match => match[0]).filter(tag => /rel="stylesheet"/.test(tag)).map(tag => new URL(tag.match(/href="([^"]+)"/)[1].replaceAll('&amp;', '&'), base).href).filter(url => url.startsWith(base));
  assert.ok(styles.length, 'Preview must include stylesheets');
  const css = await Promise.all(styles.map(async url => {
    const response = await page.request.get(url);
    assert.equal(response.status(), 200, 'Stylesheet must load');
    return response.text();
  }));
  await page.goto('about:blank');
  await page.setContent('<html lang="ko" data-design="gossaem"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="fixture"></div></body></html>');
  await page.addStyleTag({ content: css.join('\n') });
  await page.addScriptTag({ path: require.resolve('react').replace(/index\.js$/, 'umd/react.development.js') });
  await page.addScriptTag({ path: require.resolve('react-dom').replace(/index\.js$/, 'umd/react-dom.development.js') });
  await page.evaluate(() => { window.react = window.React; });
  await page.addScriptTag({ path: 'node_modules/lucide-react/dist/umd/lucide-react.js' });
  await page.evaluate(({ code, mode }) => {
    const R = window.React;
    window.rows = [];
    window.failSave = false;
    window.failLoad = false;
    window.meetingLink = null;
    let nextId = 0;
    const user = { id: 'teacher-fixture', role: 'teacher', name: '지민' };
    const imports = {
      react: R,
      'lucide-react': window.LucideReact,
      'react/jsx-runtime': { jsx: (type, props, key) => R.createElement(type, { ...props, key }), jsxs: (type, props, key) => R.createElement(type, { ...props, key }) },
      'next/link': { default: props => R.createElement('a', props) },
      'next/navigation': { useRouter: () => ({ push() {} }) },
      '@/stores/auth-store': { useAuthStore: selector => selector({ user, isHydrated: true }) },
      '@/components/shared/AlertDialog': { showConfirm: async () => true, showError() {} },
      '@/components/shared/Toast': { showToast() {} },
      '@/components/shared/PageLoading': { PageLoading: () => R.createElement('p', null, 'Loading') },
      '@/components/shared/TeacherReviewStatus': { TeacherReviewStatus: () => null },
      '@/components/shared/AdminEntry': { AdminEntry: () => null },
      '@/lib/supabase/client': { createClient: () => ({ rpc: async (name, payload) => {
        if (name !== 'update_teacher_meeting_link') throw Error('Unexpected RPC');
        if (window.failSave) return { error: { message: 'offline' } };
        window.meetingLink = payload.p_url;
        return { data: null, error: null };
      } }) },
      '@/lib/queries/materials': { listMaterials: async () => [] },
      '@/lib/queries/teacherWorkspace': { listTodayTeacherSessions: async () => [{ id: 'session-1', teacher_lesson_id: 'lesson-1', title: '데이터로 연결한 수업', scheduled_at: '2026-11-11T01:00:00Z', duration_minutes: 50, enrolled_count: 1, capacity: 2, status: 'scheduled' }] },
      '@/lib/queries/teacherApplications': { getMyTeacherApplication: async () => { if (window.failReview) throw Error('offline'); return { status: 'approved', feedback: '' }; } },
      '@/lib/queries/teachers': { getTeacherDetail: async () => ({ ...user, specialties: ['비즈니스 한국어'], headline: '취업 한국어를 함께 준비합니다', bio: '소개', avatarUrl: null }) },
      '@/lib/queries/teacherPortfolio': {
        portfolioLabels: { career: '경력', qualification: '자격·교육', work: '대표 작업' },
        portfolioSchema: { safeParse: data => ({ success: true, data }) },
        listPortfolio: async () => { if (window.failLoad) throw Error('불러오기 실패'); return [...window.rows]; },
        savePortfolio: async (teacherId, input, id) => {
          if (window.failSave) throw Error('저장 실패 테스트');
          const row = { ...input, teacher_id: teacherId, id: id || String(++nextId) };
          window.rows = id ? window.rows.map(item => item.id === id ? row : item) : [row, ...window.rows];
          return row;
        },
        deletePortfolio: async (_, id) => { window.rows = window.rows.filter(item => item.id !== id); },
      },
    };
    const modules = {}, cache = {};
    new Function('modules', code)(modules);
    const req = id => { if (imports[id]) return imports[id]; if (!cache[id]) { cache[id] = {}; modules[id](cache[id], req); } return cache[id]; };
    const root = window.ReactDOM.createRoot(document.getElementById('fixture'));
    let revision = 0;
    window.remount = nextMode => { const component = req(nextMode || mode); root.render(R.createElement(component.default || component.TeacherWorkspaceDashboard || component.MeetingLinkEditor, { key: ++revision, sessionId: 'session-1', teacherId: user.id, initialUrl: window.meetingLink })); };
    window.remount();
  }, { code, mode });
}
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    fs.mkdirSync('.tmp/teacher-phase1', { recursive: true });
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await mount(page, 'editor');
      await page.getByRole('button', { name: '기록 저장', exact: true }).waitFor();
      await page.getByLabel('제목 · 필수').fill('비즈니스 한국어 강사');
      await page.getByLabel('기관 또는 프로젝트').fill('샘플 교육기관');
      await page.getByRole('button', { name: '기록 저장', exact: true }).click();
      await page.getByRole('heading', { name: '비즈니스 한국어 강사', exact: true }).waitFor();
      assert.equal(await page.evaluate(() => window.rows[0].is_public), false);
      await page.getByRole('button', { name: /수정\s*:\s*비즈니스 한국어 강사/ }).click();
      await page.getByLabel('개인페이지에 공개').check();
      await page.getByRole('button', { name: '수정 저장' }).click();
      await page.waitForFunction(() => window.rows[0].is_public);
      await page.evaluate(() => window.remount());
      await page.getByRole('heading', { name: '비즈니스 한국어 강사', exact: true }).waitFor();
      await page.getByLabel('분류').selectOption('work');
      await page.getByLabel('제목 · 필수').fill('비공개 활동지');
      await page.evaluate(() => { window.failSave = true; });
      await page.getByRole('button', { name: '기록 저장', exact: true }).click();
      await page.getByRole('alert').waitFor();
      assert.equal(await page.getByLabel('제목 · 필수').inputValue(), '비공개 활동지');
      await page.evaluate(() => { window.failSave = false; });
      await page.getByRole('button', { name: '기록 저장', exact: true }).click();
      await page.getByRole('heading', { name: '비공개 활동지', exact: true }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: `.tmp/teacher-phase1/editor-${width}.png`, fullPage: true });
      await page.evaluate(() => window.remount('profile'));
      await page.getByRole('heading', { name: '내 페이지', exact: true }).waitFor();
      assert.equal(await page.getByRole('heading', { name: '비공개 활동지', exact: true }).count(), 0);
      assert.equal(await page.getByRole('link', { name: '공개 미리보기' }).getAttribute('href'), '/teachers/teacher-fixture');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: `.tmp/teacher-phase1/profile-${width}.png`, fullPage: true });
      await page.evaluate(() => window.remount('editor'));
      await page.getByRole('button', { name: /삭제\s*:\s*비공개 활동지/ }).click();
      await page.waitForFunction(() => window.rows.length === 1);
      await page.evaluate(() => { window.failLoad = true; window.remount('editor'); });
      await page.getByRole('alert').waitFor();
      assert.equal(await page.getByRole('button', { name: '기록 저장', exact: true }).isDisabled(), true);
      await page.evaluate(() => { window.failLoad = false; });
      await page.getByRole('button', { name: '다시 시도' }).click();
      await page.getByRole('heading', { name: '비즈니스 한국어 강사', exact: true }).waitFor();
      console.log(`Portfolio UI ${width}px: save, edit, reload, privacy, failure recovery, delete and layout passed`);
      await page.evaluate(() => window.remount('dashboard'));
      await page.getByRole('heading', { name: '안녕하세요, 지민 선생님' }).waitFor();
      assert.equal(await page.getByRole('link', { name: '공개 미리보기' }).getAttribute('href'), '/teachers/teacher-fixture');
      assert.equal(await page.getByRole('link', { name: '출석 관리', exact: true }).getAttribute('href'), '/teacher/lessons/attendance?session=session-1');
      assert.equal(await page.getByRole('link', { name: '수업 개설하기 →' }).count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: `.tmp/teacher-phase1/dashboard-${width}.png`, fullPage: true });
      await page.evaluate(() => { window.failReview = true; window.remount('dashboard'); });
      await page.getByRole('alert').waitFor();
      assert.equal(await page.getByRole('link', { name: '수업 개설하기 →' }).count(), 0);
      await page.getByRole('heading', { name: '데이터로 연결한 수업' }).waitFor();
      await page.evaluate(() => { window.failReview = false; });
      await page.getByRole('button', { name: '다시 시도', exact: true }).click();
      await page.getByRole('link', { name: '수업 개설하기 →' }).waitFor();
      console.log(`Workspace UI ${width}px: data, links, review failure isolation and retry passed`);
      await page.evaluate(() => window.remount('meeting'));
      await page.getByLabel('온라인 수업 링크').fill('https://meet.google.com/fixture-room');
      await page.getByRole('button', { name: '링크 저장' }).click();
      await page.getByRole('status').waitFor();
      await page.evaluate(() => window.remount('meeting'));
      assert.equal(await page.getByLabel('온라인 수업 링크').inputValue(), 'https://meet.google.com/fixture-room');
      assert.equal(await page.getByRole('link', { name: '저장된 수업 링크 열기 ↗' }).getAttribute('href'), 'https://meet.google.com/fixture-room');
      await page.getByLabel('온라인 수업 링크').fill('https://example.test/new');
      await page.evaluate(() => { window.failSave = true; });
      await page.getByRole('button', { name: '링크 저장' }).click();
      await page.getByRole('alert').waitFor();
      assert.equal(await page.getByLabel('온라인 수업 링크').inputValue(), 'https://example.test/new');
      await page.evaluate(() => { window.failSave = false; });
      await page.getByLabel('온라인 수업 링크').fill('');
      await page.getByRole('button', { name: '링크 저장' }).click();
      await page.waitForFunction(() => window.meetingLink === null);
      console.log(`Meeting link ${width}px: save, reload, failure and removal passed`);
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
