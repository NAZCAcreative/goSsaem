// Real React UI with isolated data fixtures. DB persistence/RLS is tested separately.
const fs = require('node:fs');
const ts = require('typescript');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.TEST_BASE_URL || 'http://localhost:3005';
const sources = {
  './TeacherEarningsSummary': 'src/components/features/teacher/TeacherEarningsSummary.tsx',
  students: 'src/app/(main)/teacher/students/page.tsx',
  tasks: 'src/app/(main)/teacher/tasks/page.tsx',
  nav: 'src/components/shared/TeacherWorkspaceNavigation.tsx',
  '@/components/features/teacher/TeacherTasks': 'src/components/features/teacher/TeacherTasks.tsx',
  './TeacherTasks': 'src/components/features/teacher/TeacherTasks.tsx',
  application: 'src/app/(main)/teacher/apply/page.tsx',
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
  await page.addStyleTag({ content: fs.readFileSync('src/components/features/teacher/TeacherWorkspaceDashboard.module.css', 'utf8').replace('/img/teacher/workspace-studio.png', 'data:image/png;base64,' + fs.readFileSync('public/img/teacher/workspace-studio.png').toString('base64')) });
  await page.addScriptTag({ path: require.resolve('react').replace(/index\.js$/, 'umd/react.development.js') });
  await page.addScriptTag({ path: require.resolve('react-dom').replace(/index\.js$/, 'umd/react-dom.development.js') });
  await page.evaluate(() => { window.react = window.React; });
  await page.addScriptTag({ path: 'node_modules/lucide-react/dist/umd/lucide-react.js' });
  await page.evaluate(({ code, mode }) => {
    const R = window.React;
    window.rows = [];
    window.tasks = []; window.notes = {}; window.emptyStudents = false;
    window.failSave = false;
    window.failLoad = false;
    window.meetingLink = null;
    window.dashboardEntries = 0;
    let nextId = 0;
    const user = { id: 'teacher-fixture', role: 'teacher', name: '지민' };
    const imports = {
      '@/lib/queries/settlement': { getBalanceSummary: async () => { if (window.failBalance) throw Error('offline'); return { thisMonthSettled: 120000, availableBalance: 80000, totalSettled: 360000, totalWithdrawn: 280000 }; } },
      './TeacherWorkspaceDashboard.module.css': { default: new Proxy({}, { get: (_, key) => key }) },
      './SettingsDialog': { SettingsDialog: () => R.createElement('button', { 'aria-label': '설정', className: 'h-11 w-11' }, '설정') },
      '@/lib/queries/teacherTools': {
        listTeacherTasks: async () => [...window.tasks],
        createTeacherTask: async (teacher_id,title,due_date) => { if (window.failSave) throw Error('저장 실패 테스트'); const task = { id: String(++nextId), teacher_id,title,due_date,is_done:false,updated_at:String(nextId) }; window.tasks.push(task); return task; },
        toggleTeacherTask: async (_, task) => { const next = {...task,is_done:!task.is_done}; window.tasks = window.tasks.map(row => row.id===task.id ? next : row); return next; },
        deleteTeacherTask: async (_,task) => { window.tasks = window.tasks.filter(row => row.id!==task.id); },
        getMonthSummary: async () => ({ completed: 0, students: 0, rating: null, reviews: 0 }),
        listTeacherStudents: async () => window.emptyStudents ? [] : [{id:'student1',name:'민지',lessons:2},{id:'student2',name:'서준',lessons:1}],
        getStudentNote: async (_,id) => { if (window.failLoad) throw Error('노트 불러오기 실패'); return window.notes[id] || null; },
        saveStudentNote: async (_,id,values) => { if (window.failSave) throw Error('노트 저장 실패'); const note={...values,id,student_id:id,updated_at:new Date().toISOString()};window.notes[id]=note;return note; },
      },
      '@/lib/auth-redirect': { enterTeacherDashboard: () => { window.dashboardEntries++; } },
      react: R,
      'lucide-react': window.LucideReact,
      'react/jsx-runtime': { Fragment: R.Fragment, jsx: (type, props, key) => R.createElement(type, { ...props, key }), jsxs: (type, props, key) => R.createElement(type, { ...props, key }) },
      'next/link': { default: props => R.createElement('a', props) },
      'next/navigation': { useRouter: () => ({ push() {} }), usePathname: () => '/teacher/home' },
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
      '@/lib/queries/teacherApplications': {
        getMyTeacherApplication: async () => { if (window.failReview) throw Error('offline'); return { status: window.applicationStatus || 'approved', feedback: '', updated_at: 'fixture-version' }; },
        submitTeacherApplication: async expected => {
          if (expected !== 'fixture-version') throw Error('Missing version');
          if (window.failSave) throw Error('신청 실패 테스트');
          window.applicationStatus = 'review_pending';
          return { status: 'review_pending', feedback: '', updated_at: 'submitted-version' };
        },
      },
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
    window.remount = nextMode => { const current = nextMode || mode; const component = req(current); const node = R.createElement(component.default || component.TeacherWorkspaceDashboard || component.MeetingLinkEditor, { key: ++revision, sessionId: 'session-1', teacherId: user.id, initialUrl: window.meetingLink }); root.render(current === 'dashboard' ? R.createElement(R.Fragment,null,R.createElement(req('nav').TeacherWorkspaceNavigation,{onNotifications(){},unreadCount:0,isAdmin:false}),R.createElement('div',{className:'lg:pl-56'},node)) : node); };
    window.remount();
  }, { code, mode });
}
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
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
      await page.getByRole('heading', { name: '지민 선생님, 반가워요!' }).waitFor();
      assert.equal(await page.getByRole('link', { name: '공개 미리보기' }).getAttribute('href'), '/teachers/teacher-fixture');
      assert.equal(await page.getByRole('link', { name: '출석 관리', exact: true }).getAttribute('href'), '/teacher/lessons/attendance?session=session-1');
      assert.equal(await page.getByRole('link', { name: '수업 개설 새로운 만남 준비하기' }).count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: `.tmp/teacher-phase1/dashboard-${width}.png`, fullPage: true });
      await page.evaluate(() => { window.failReview = true; window.remount('dashboard'); });
      await page.getByRole('alert').waitFor();
      assert.equal(await page.getByRole('link', { name: '수업 개설 새로운 만남 준비하기' }).count(), 0);
      await page.getByRole('heading', { name: '데이터로 연결한 수업' }).waitFor();
      await page.evaluate(() => { window.failReview = false; });
      await page.getByRole('button', { name: '다시 시도', exact: true }).click();
      await page.getByRole('link', { name: '수업 개설 새로운 만남 준비하기' }).waitFor();
      console.log(`Workspace UI ${width}px: data, links, review failure isolation and retry passed`);
      const earnings = page.getByRole('region',{name:'수익·정산 요약'});
      await earnings.getByText('120,000원',{exact:true}).waitFor();
      await earnings.getByText('80,000원',{exact:true}).waitFor();
      await earnings.getByText('360,000원',{exact:true}).waitFor();
      assert.equal(await earnings.getByRole('link').getAttribute('href'),'/teacher/settlement');
      await page.evaluate(() => {window.failBalance=true;window.remount('dashboard');});
      await earnings.getByRole('alert').waitFor();
      assert.equal(await earnings.getByText('0원',{exact:true}).count(),0);
      await page.evaluate(() => {window.failBalance=false;});
      await earnings.getByRole('button',{name:'금액 다시 불러오기'}).click();
      await earnings.getByText('80,000원',{exact:true}).waitFor();
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
      await page.evaluate(() => { window.applicationStatus = 'not_applied'; window.remount('application'); });
      await page.getByRole('button', { name: '선생님 신청하기', exact: true }).waitFor();
      assert.equal(await page.getByRole('link', { name: '소개 작성·수정' }).getAttribute('href'), '/teacher/profile/edit?from=application');
      assert.equal(await page.getByRole('link', { name: '대시보드로 이동 →' }).count(), 0);
      await page.evaluate(() => { window.failSave = true; });
      await page.getByRole('button', { name: '선생님 신청하기', exact: true }).click();
      await page.getByRole('alert').waitFor();
      await page.evaluate(() => { window.failSave = false; });
      await page.getByRole('button', { name: '선생님 신청하기', exact: true }).click();
      await page.getByRole('heading', { name: '선생님 신청을 검토하고 있습니다' }).waitFor();
      assert.equal(await page.getByRole('button', { name: '선생님 신청하기', exact: true }).count(), 0);
      await page.evaluate(() => { window.applicationStatus = 'needs_changes'; });
      await page.getByRole('button', { name: '신청 상태 새로고침' }).click();
      await page.getByRole('button', { name: '보완 후 재신청' }).waitFor();
      await page.getByRole('button', { name: '보완 후 재신청' }).click();
      await page.getByRole('heading', { name: '선생님 신청을 검토하고 있습니다' }).waitFor();
      await page.evaluate(() => { window.failReview = true; window.dispatchEvent(new Event('focus')); });
      await page.getByRole('alert').waitFor();
      assert.equal(await page.evaluate(() => window.dashboardEntries), 0);
      await page.evaluate(() => { window.failReview = false; window.applicationStatus = 'approved'; });
      // The 5-second poll detects approval without the refresh button.
      await page.waitForFunction(() => window.dashboardEntries === 1, { timeout: 10000 });
      assert.equal(await page.getByRole('link', { name: '대시보드로 이동 →' }).getAttribute('href'), '/teacher/home');
      await page.evaluate(() => window.remount('application'));
      await page.waitForFunction(() => window.dashboardEntries === 2);
      await page.evaluate(() => { window.applicationStatus = 'review_pending'; window.remount('application'); });
      await page.getByRole('heading', { name: '선생님 신청을 검토하고 있습니다' }).waitFor();
      await page.evaluate(() => { window.applicationStatus = 'approved'; window.dispatchEvent(new Event('focus')); });
      await page.waitForFunction(() => window.dashboardEntries === 3);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: `.tmp/teacher-phase1/application-${width}.png`, fullPage: true });
      await page.evaluate(() => { window.failReview = true; });
      await page.getByRole('button', { name: '신청 상태 새로고침' }).click();
      await page.getByRole('alert').filter({ hasText: '신청 상태를 불러오지 못했습니다' }).waitFor();
      await page.getByRole('link', { name: '대시보드로 이동 →' }).waitFor({ state: 'detached' });
      console.log(`Application UI ${width}px: submit, errors, pending, revision and approval passed`);
      await page.evaluate(() => { window.failSave=false; window.failLoad=false; window.remount('tasks'); });
      await page.getByLabel('새 할 일').fill('다음 수업 준비');
      await page.getByRole('button', {name:'할 일 추가',exact:true}).click();
      await page.getByLabel('다음 수업 준비 완료').waitFor();
      await page.evaluate(() => window.remount('tasks'));
      await page.getByLabel('완료한 일 보기').check();
      await page.getByLabel('다음 수업 준비 완료').check();
      assert.equal(await page.getByLabel('다음 수업 준비 완료').isChecked(),true);
      await page.getByRole('button',{name:'다음 수업 준비 삭제'}).click();
      await page.getByLabel('다음 수업 준비 완료').waitFor({state:'detached'});
      await page.evaluate(() => {window.failSave=true;});
      await page.getByLabel('새 할 일').fill('저장 실패 보존');
      await page.getByRole('button',{name:'할 일 추가',exact:true}).click();
      await page.getByRole('alert').waitFor();
      assert.equal(await page.getByLabel('새 할 일').inputValue(),'저장 실패 보존');
      await page.evaluate(() => {window.failSave=false;window.remount('students');});
      await page.getByLabel('학습 목표·관심사').fill('한국 회사에서 일하기');
      await page.getByLabel('수업 관찰·피드백').fill('받침 발음 연습');
      await page.getByRole('button',{name:'학생 노트 저장'}).click();
      await page.getByText('저장되었습니다.',{exact:true}).waitFor();
      await page.evaluate(() => window.remount('students'));
      await page.waitForFunction(() => document.querySelector('textarea')?.value==='한국 회사에서 일하기');
      await page.getByRole('button',{name:'서준 수업 예약 1회'}).click();
      await page.getByRole('heading',{name:'서준 학생 노트'}).waitFor();
      await page.getByLabel('학습 목표·관심사').waitFor();
      assert.equal(await page.getByLabel('학습 목표·관심사').inputValue(),'');
      await page.getByLabel('학습 목표·관심사').fill('여행 회화');
      page.once('dialog', dialog => dialog.dismiss());
      await page.getByRole('button',{name:'민지 수업 예약 2회'}).click();
      await page.getByRole('heading',{name:'서준 학생 노트'}).waitFor();
      await page.evaluate(() => {window.failSave=true;});
      await page.getByRole('button',{name:'학생 노트 저장'}).click();
      await page.getByRole('alert').waitFor();
      assert.equal(await page.getByLabel('학습 목표·관심사').inputValue(),'여행 회화');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth),true);
      await page.screenshot({path:`.tmp/teacher-phase1/student-notes-${width}.png`,fullPage:true});
      await page.evaluate(() => {window.failLoad=true;window.remount('students');});
      await page.getByRole('button',{name:'다시 불러오기'}).waitFor();
      assert.equal(await page.getByRole('button',{name:'학생 노트 저장'}).count(),0);
      await page.evaluate(() => {window.emptyStudents=true;window.remount('students');});
      await page.getByRole('heading',{name:'아직 연결된 학생이 없습니다'}).waitFor();
      console.log(`Teacher tools ${width}px: tasks CRUD, notes persistence, student isolation, failure retention and empty states passed`);
    }
    for (const width of [320, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await mount(page,'dashboard');
      await page.getByRole('heading',{name:'지민 선생님, 반가워요!'}).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth),true);
      assert.equal(await page.getByRole('navigation',{name:'선생님 작업 메뉴'}).isVisible(),width>=1024);
      assert.equal(await page.getByRole('navigation',{name:'선생님 추가 메뉴'}).isVisible(),width<1024);
      await page.screenshot({path:`.tmp/teacher-phase1/dashboard-${width}.png`,fullPage:true});
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
