// Actual payment screen and SDK adapter, with local-only API/provider fixtures.
const fs = require('node:fs');
const ts = require('typescript');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.TEST_BASE_URL || 'http://localhost:3100';
const files = { screen: 'src/app/(main)/student/payment/page.tsx', '@/lib/payment-client': 'src/lib/payment-client.ts' };
const code = Object.entries(files).map(([id, file]) => `modules[${JSON.stringify(id)}]=function(exports,require){${ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText}};`).join('\n');
async function mount(page, enabled, mockAvailable = false) {
  await page.goto(base + '/guide');
  const css = await page.locator('link[rel="stylesheet"]').evaluateAll(nodes => nodes.map(node => node.href));
  await page.setContent(`<!doctype html><html lang="ko" data-design="gossaem"><head><meta name="viewport" content="width=device-width,initial-scale=1">${css.map(href => `<link rel="stylesheet" href="${href}">`).join('')}</head><body><div id="fixture"></div></body></html>`);
  await page.addScriptTag({ path: require.resolve('react').replace(/index\.js$/, 'umd/react.development.js') });
  await page.addScriptTag({ path: require.resolve('react-dom').replace(/index\.js$/, 'umd/react-dom.development.js') });
  await page.evaluate(({ code, enabled, mockAvailable }) => {
    const R = window.React;
    window.paymentCalls = [];
    window.fetch = async (url, input) => {
      window.paymentCalls.push({ url, body: input?.body });
      if (url === '/api/payments/config') return { json: async () => ({ enabled, mockAvailable, mode: 'test', clientKey: enabled ? 'test_ck_fixture' : null }) };
      if (url === '/api/payments/mock') return { ok: true, json: async () => ({ status: 'paid', enrollmentId: 'fixture-enrollment', mode: 'mock' }) };
      if (url === '/api/payments/prepare') return { ok: true, json: async () => ({ orderId: 'fixture-order', enrollmentId: 'fixture-enrollment', orderName: '테스트 회화 수업', amount: 10000, currency: 'KRW', mode: 'test' }) };
      throw new Error('Unexpected fixture URL ' + url);
    };
    window.TossPayments = key => ({ payment: ({ customerKey }) => ({ requestPayment: async input => window.paymentCalls.push({ sdk: true, key, customerKey, input }) }) });
    const user = { id: 'fixture-student', role: 'student' };
    const imports = {
      react: R, 'react/jsx-runtime': { jsx: (type, props, key) => R.createElement(type, { ...props, key }), jsxs: (type, props, key) => R.createElement(type, { ...props, key }) },
      'next/link': { default: ({ children, href, ...props }) => R.createElement('a', { href, ...props }, children) },
      'next/navigation': { useRouter: () => ({ push: url => window.paymentCalls.push({ navigation: url }) }), useSearchParams: () => new URLSearchParams('enrollment=fixture-enrollment') },
      '@/components/shared/PageLoading': { PageLoading: () => R.createElement('p', null, 'Loading') },
      '@/stores/auth-store': { useAuthStore: selector => selector({ user, isHydrated: true }) },
      '@/components/shared/Toast': { showToast: message => window.paymentCalls.push({ toast: message }) },
      '@/lib/queries/teachers': { listWishlistedTeacherIds: async () => new Set(), addWishlist: async () => {}, removeWishlist: async () => {} },
      '@/lib/queries/coupons': { listMyCoupons: async () => [], computeDiscount: () => 0 },
      '@/lib/queries/bookings': {
        getEnrollmentDetail: async () => ({ id: 'fixture-enrollment', teacherId: 'fixture-teacher', teacherName: '테스트 쌤', sessionTitle: '테스트 회화 수업', scheduledAt: '2026-12-10T01:30:00Z', durationMinutes: 50, price: 10000, currency: 'KRW' }),
        confirmPayment: async () => { throw new Error('Paid checkout must use provider verification'); },
      },
    };
    const modules = {}, cache = {}; new Function('modules', code)(modules);
    const req = id => { if (imports[id]) return imports[id]; if (!cache[id]) { cache[id] = {}; modules[id](cache[id], req); } return cache[id]; };
    window.ReactDOM.createRoot(document.getElementById('fixture')).render(R.createElement(req('screen').default));
  }, { code, enabled, mockAvailable });
}
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await browser.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await mount(page, false);
      assert.equal(await page.getByRole('button', { name: '테스트 결제 준비 중' }).isDisabled(), true);
      await mount(page, true);
      await page.getByRole('status').filter({ hasText: '실제 금액은 청구되지 않으며' }).waitFor();
      await page.getByRole('button', { name: '테스트 결제창으로 이동' }).click();
      await page.waitForFunction(() => window.paymentCalls.some(call => call.sdk));
      const calls = await page.evaluate(() => window.paymentCalls);
      assert.equal(calls.find(call => call.sdk).key, 'test_ck_fixture');
      assert.equal(calls.find(call => call.sdk).input.amount.value, 10000);
      assert.equal(calls.find(call => call.sdk).input.orderId, 'fixture-order');
      assert.deepEqual(JSON.parse(calls.find(call => call.url === '/api/payments/prepare').body), { enrollmentId: 'fixture-enrollment', couponId: null });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await mount(page, false, true);
      await page.getByRole('status').filter({ hasText: '관리자 전용 모의 결제' }).waitFor();
      await page.getByRole('button', { name: '모의 결제로 예약 확정 (관리자)' }).click();
      await page.waitForFunction(() => window.paymentCalls.some(call => call.navigation === '/student/confirmation?enrollment=fixture-enrollment'));
      const mockCalls = await page.evaluate(() => window.paymentCalls);
      assert.equal(mockCalls.some(call => call.sdk), false);
      assert.deepEqual(JSON.parse(mockCalls.find(call => call.url === '/api/payments/mock').body), { enrollmentId: 'fixture-enrollment', couponId: null });
    }
    assert.deepEqual(errors, []);
    console.log('Sandbox checkout at 390/1440px: setup gating, SDK adapter and keyless admin simulation through confirmation passed. External calls were mocked.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
