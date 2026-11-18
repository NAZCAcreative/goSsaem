const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const files = {
  '@/lib/account-role': 'src/lib/account-role.ts',
  guard: 'src/components/shared/AccountRoleGuard.tsx',
};
const code = Object.entries(files).map(([id, file]) => `modules[${JSON.stringify(id)}] = function(exports, require) {${ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText}\n};`).join('\n');

async function mountGuard(page) {
  const styles = await page.locator('link[rel="stylesheet"]').evaluateAll(links => links.map(link => link.href));
  await page.setContent(`<html data-design="gossaem" data-audience="teacher"><head>${styles.map(href => `<link rel="stylesheet" href="${href}">`).join('')}</head><body><div id="fixture"></div></body></html>`);
  await page.addScriptTag({ path: require.resolve('react').replace(/index\.js$/, 'umd/react.development.js') });
  await page.addScriptTag({ path: require.resolve('react-dom').replace(/index\.js$/, 'umd/react-dom.development.js') });
  await page.evaluate(code => {
    const R = window.React;
    const listeners = new Set();
    const state = { user: { id: 'student-fixture', role: 'student' }, logout: async () => {
      window.fixtureLoggedOut = true;
      state.user = null;
      listeners.forEach(listener => listener());
    } };
    window.fixtureRoutes = [];
    const modules = {};
    const values = {
      react: R,
      'react/jsx-runtime': { jsx: (type, props) => R.createElement(type, props), jsxs: (type, props) => R.createElement(type, props) },
      'next/navigation': { usePathname: () => '/signup/teacher', useSearchParams: () => new URLSearchParams(), useRouter: () => ({ replace: value => window.fixtureRoutes.push(value) }) },
      '@/stores/auth-store': { useAuthStore: selector => R.useSyncExternalStore(listener => { listeners.add(listener); return () => listeners.delete(listener); }, () => selector(state)) },
    };
    const require = id => {
      if (values[id]) return values[id];
      const exports = {};
      modules[id](exports, require);
      return values[id] = exports;
    };
    eval(code);
    const { AccountRoleGuard } = require('guard');
    window.fixtureRoot = window.ReactDOM.createRoot(document.getElementById('fixture'));
    window.fixtureRoot.render(R.createElement(AccountRoleGuard));
  }, code);
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/teacher');
    await page.waitForFunction(() => document.documentElement.dataset.audience === 'teacher');
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()), '27 91 84');
    await page.screenshot({ path: '.tmp/teacher-studio-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base + '/signup/teacher');
    await page.getByRole('button', { name: 'Google로 계속하기', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: '쌤으로 가입하기', exact: true }).evaluate(button => getComputedStyle(button).backgroundColor), 'rgb(27, 91, 84)', 'Teacher action has no student pink override');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Teacher signup fits mobile viewport');
    await page.screenshot({ path: '.tmp/teacher-signup-mobile.png', fullPage: true });
    await page.route('**/rest/v1/rpc/google_signup_role_ready', route => route.fulfill({ status: 404, contentType: 'application/json', body: '{"message":"Missing migration"}' }));
    await page.getByRole('button', { name: 'Google로 계속하기', exact: true }).click();
    await page.getByText('Google 쌤 가입 설정을 준비 중입니다. 이메일로 가입하거나 잠시 후 다시 시도해주세요.', { exact: true }).waitFor();
    assert.equal(new URL(page.url()).pathname, '/signup/teacher');
    await page.unroute('**/rest/v1/rpc/google_signup_role_ready');
    await page.route('**/rest/v1/rpc/google_signup_role_ready', route => route.fulfill({ status: 200, contentType: 'application/json', body: 'true' }));
    let oauthUrl;
    await page.route('**/auth/v1/authorize?**', route => {
      oauthUrl = new URL(route.request().url());
      return route.fulfill({ status: 200, contentType: 'text/html', body: '<p>OAuth navigation intercepted by local test; no account created.</p>' });
    });
    await page.getByRole('button', { name: 'Google로 계속하기', exact: true }).click();
    await page.waitForURL('**/auth/v1/authorize?**');
    assert.equal(new URL(oauthUrl.searchParams.get('redirect_to')).searchParams.get('role'), 'teacher');
    assert.equal(oauthUrl.searchParams.get('prompt'), 'select_account');
    await page.goto(base + '/student');
    await page.waitForFunction(() => document.documentElement.dataset.audience === 'student');
    assert.notEqual(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()), '27 91 84', 'Student palette is preserved');
    await page.goto(base + '/signup/teacher');
    await page.getByRole('button', { name: 'Google로 계속하기', exact: true }).waitFor();
    assert.deepEqual(errors, [], 'Real pages render without client exceptions');

    // Actual dialog component with a local authenticated-student fixture; no real login or writes.
    await mountGuard(page);
    await page.getByRole('dialog', { name: '이미 학생으로 가입된 계정입니다' }).waitFor();
    assert.equal(await page.getByRole('button', { name: '학생 페이지로 이동', exact: true }).evaluate(button => getComputedStyle(button).backgroundColor), 'rgb(27, 91, 84)');
    await page.screenshot({ path: '.tmp/student-account-notice.png', fullPage: true });
    await page.getByRole('button', { name: '학생 페이지로 이동', exact: true }).click();
    assert.deepEqual(await page.evaluate(() => window.fixtureRoutes), ['/student/home']);
    await page.goto(base + '/signup/teacher');
    await page.getByRole('button', { name: 'Google로 계속하기', exact: true }).waitFor();
    await mountGuard(page);
    await page.getByRole('button', { name: '다른 계정으로 로그인', exact: true }).click();
    await page.waitForFunction(() => window.fixtureLoggedOut === true && window.fixtureRoutes.length > 0);
    assert.equal(await page.evaluate(() => window.fixtureRoutes[0]), '/login?next=%2Fteacher%2Fhome');
    console.log('Teacher Google readiness gate/role redirect, teacher/student palettes, mobile layout and authenticated-student popup actions passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
