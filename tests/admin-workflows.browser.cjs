// Local React fixtures exercise the actual components; SQL tests cover the real DB.
// Requires Playwright, a running dev server, and optionally CHROME_PATH.
const fs = require('node:fs');
const ts = require('typescript');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TEST_BASE_URL || 'http://localhost:3005';
const files = {
  '@/lib/admin': 'src/lib/admin.ts',
  './AdminIcon': 'src/components/features/admin/AdminIcon.tsx',
  './AdminDialogs': 'src/components/features/admin/AdminDialogs.tsx',
  admin: 'src/components/features/admin/AdminConsole.tsx',
  support: 'src/app/(main)/support/page.tsx',
  teacher: 'src/components/shared/TeacherReviewStatus.tsx',
};
// SVG icon rendering is checked separately; fixture icons avoid bundling lucide.
delete files['./AdminIcon'];
const code = Object.entries(files).map(([id, file]) => `modules[${JSON.stringify(id)}] = function(exports, require) {${ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText}\n};`).join('\n');

async function mount(page, mode, section = 'teachers') {
  await page.goto(base + '/__ui_fixture');
  await page.setContent(`<html lang="ko" data-design="gossaem"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="${base}/_next/static/css/app/layout.css"></head><body><div id="fixture"></div></body></html>`);
  await page.addScriptTag({ path: require.resolve('react').replace(/index\.js$/, 'umd/react.development.js') });
  await page.addScriptTag({ path: require.resolve('react-dom').replace(/index\.js$/, 'umd/react-dom.development.js') });
  await page.evaluate(({ code, mode, section }) => {
    const R = window.React;
    const teacherId = 'teacher-fixture';
    const application = { status: 'needs_changes', feedback: '소개를 조금 더 자세히 작성해주세요.', internal_note: '심사 내부 메모', updated_at: '2026-09-09T03:00:00Z', reviewed_at: '2026-09-09T03:00:00Z' };
    const ticket = { id: 'ticket-fixture', requester_id: 'member-fixture', requester_name: '샘플 학생', requester_role: 'student', kind: 'report', category: 'lesson', title: '수업 이용 관련 신고', body: '수업 이용 중 발생한 상황을 확인해주세요.', status: 'ticket_open', response: '', internal_note: '상담 내부 메모', created_at: '2026-09-09T03:00:00Z', updated_at: '2026-09-09T03:00:00Z' };
    const teacher = { id: teacherId, name: '샘플 선생님', review_status: application.status, specialties: ['회화', 'TOPIK'], rating_avg: 4.8, lessons: 3, created_at: '2026-09-09T03:00:00Z' };
    const tickets = [];
    window.fixtureCalls = [];
    window.fixtureToasts = [];
    let revision = 0;
    const rpc = async (name, args = {}) => {
      window.fixtureCalls.push({ name, args });
      const copy = value => JSON.parse(JSON.stringify(value));
      if (name === 'admin_list') return { data: { rows: [copy(args.p_section === 'tickets' ? ticket : { ...teacher, review_status: application.status })], total: 1, page: 1, pageSize: 20 }, error: null };
      if (name === 'admin_member') return { data: { profile: { id: teacherId, name: teacher.name, updated_at: application.updated_at }, teacher: { is_verified: application.status === 'approved', bio: '한국어 회화를 가르칩니다.' }, application: copy(application), email: 'fixture@example.test', note: '', noteUpdatedAt: null, bookings: 0, lessons: 3, sessions: 2, reviews: 1 }, error: null };
      if (name === 'admin_mutate') {
        const target = args.p_action === 'teacher_review' ? application : ticket;
        if (target.updated_at !== args.p_expected.updated_at) return { error: { code: '40001' } };
        Object.assign(target, args.p_data, { updated_at: 'revision-' + ++revision });
        return { data: { ok: true }, error: null };
      }
      if (name === 'my_teacher_application' || name === 'submit_teacher_application') {
        if (name === 'submit_teacher_application') application.status = 'review_pending';
        const { internal_note, ...visible } = application;
        return { data: copy(visible), error: null };
      }
      if (name === 'my_support_tickets') return { data: { rows: copy(tickets), total: tickets.length, page: 1, pageSize: 10 }, error: null };
      if (name === 'create_support_ticket') {
        if (!tickets.some(t => t.id === args.p_request_id)) tickets.unshift({ ...ticket, id: args.p_request_id, kind: args.p_kind, category: args.p_category, title: args.p_title, body: args.p_body, internal_note: undefined });
        return { data: args.p_request_id, error: null };
      }
      throw Error('Unexpected RPC: ' + name);
    };
    const Nav = R.createContext(null);
    const link = ({ children, href, ...props }) => R.createElement('a', { href, ...props }, children);
    const stubs = {
      react: R,
      'react/jsx-runtime': { jsx: (type, props, key) => R.createElement(type, { ...props, key }), jsxs: (type, props, key) => R.createElement(type, { ...props, key }), Fragment: R.Fragment },
      'next/link': { default: link },
      'next/navigation': { useRouter: () => R.useContext(Nav).router, usePathname: () => '/admin', useSearchParams: () => R.useContext(Nav).params },
      '@/lib/supabase/client': { createClient: () => ({ rpc }) },
      '@/stores/auth-store': { useAuthStore: selector => selector({ user: { id: 'member-fixture', role: 'student' }, activeRole: 'student', isHydrated: true }) },
      '@/components/shared/Toast': { showToast: message => window.fixtureToasts.push(message) },
      './AdminIcon': { AdminIcon: () => R.createElement('span', { 'aria-hidden': true }, '•') },
    };
    const modules = {}, cache = {};
    new Function('modules', code)(modules);
    const req = id => {
      if (stubs[id]) return stubs[id];
      if (!cache[id]) { cache[id] = {}; modules[id](cache[id], req); }
      return cache[id];
    };
    function Fixture() {
      const [url, setUrl] = R.useState('/admin?section=' + section);
      const Component = mode === 'admin' ? req('admin').AdminConsole : mode === 'support' ? req('support').default : req('teacher').TeacherReviewStatus;
      return R.createElement(Nav.Provider, { value: { params: new URLSearchParams(url.split('?')[1]), router: { push: setUrl } } }, R.createElement(Component, { profileId: teacherId }));
    }
    window.ReactDOM.createRoot(document.getElementById('fixture')).render(R.createElement(Fixture));
  }, { code, mode, section });
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    // No login, credentials or remote DB traffic is used by these fixtures.
    await page.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
    await page.route(base + '/__ui_fixture', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body></body></html>' }));
    await mount(page, 'admin');
    await page.getByRole('button', { name: '샘플 선생님 상세 보기' }).click();
    await page.getByRole('button', { name: '심사 결과 작성' }).click();
    await page.getByLabel('처리 상태').selectOption('approved');
    await page.getByLabel('선생님에게 공개되는 심사 안내').fill('승인되었습니다.');
    await page.getByLabel('변경 사유').fill('프로필 심사 완료');
    await page.getByRole('button', { name: '변경 저장' }).click();
    await page.getByRole('cell', { name: '승인', exact: true }).waitFor();
    if (await page.locator('dialog').count()) throw Error('Review modal did not close');
    await page.getByRole('button', { name: '신고·문의', exact: true }).click();
    await page.getByRole('button', { name: '수업 이용 관련 신고 상세 보기' }).click();
    await page.getByRole('button', { name: '답변·처리 상태 변경' }).click();
    await page.getByLabel('처리 상태').selectOption('ticket_resolved');
    await page.getByLabel('회원에게 공개되는 답변').fill('확인 후 처리를 완료했습니다.');
    await page.getByLabel('관리자 내부 메모').fill('내부 확인 기록');
    await page.getByLabel('변경 사유').fill('상담 처리 완료');
    await page.getByRole('button', { name: '변경 저장' }).click();
    await page.getByRole('cell', { name: '처리 완료', exact: true }).waitFor();
    console.log('PASS actual admin components: tabs, detail, review save, ticket response/status save');

    await page.setViewportSize({ width: 390, height: 844 });
    await mount(page, 'support');
    await page.getByLabel('제목', { exact: true }).fill('예약 확인 문의');
    await page.getByRole('textbox', { name: /^내용/ }).fill('예약한 수업의 날짜와 시간을 확인하고 싶습니다.');
    await page.getByRole('button', { name: '문의 접수하기' }).click();
    await page.getByText('접수되었습니다.', { exact: false }).waitFor();
    await page.locator('summary').click();
    await page.getByRole('heading', { name: '운영자 답변' }).waitFor();
    if (await page.getByText('상담 내부 메모', { exact: true }).count()) throw Error('Internal note visible');
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw Error('Support mobile overflow');
    fs.mkdirSync('.tmp', { recursive: true });
    await page.screenshot({ path: '.tmp/support-workflow-390.png', fullPage: true, animations: 'disabled' });
    console.log('PASS actual support component: submit, success, own details, mobile layout');

    await mount(page, 'teacher');
    await page.getByRole('button', { name: '재심사 요청', exact: true }).click();
    await page.getByText('심사 대기', { exact: true }).waitFor();
    if (await page.getByText('심사 내부 메모', { exact: true }).count()) throw Error('Review note visible');
    console.log('PASS actual teacher component: feedback and resubmission');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
