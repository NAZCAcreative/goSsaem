const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function compile(file, imports = {}) {
  if (file === 'src/stores/auth-store.ts') imports = { ...imports, '@/lib/error-message': compile('src/lib/error-message.ts') };
  const context = { exports: {}, require: name => name in imports ? imports[name] : require(name), console, setTimeout, clearTimeout };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, context);
  return context.exports;
}
function authFixture() {
  const pending = [];
  let signUpSession = null;
  let logoutError = null;
  let loginError = null;
  let loginInput;
  const client = {
    from: () => ({ select: () => ({ eq: (_, id) => ({ single: () => new Promise(resolve => pending.push({ id, resolve })) }) }) }),
    auth: {
      signInWithPassword: async input => {
        loginInput = input;
        return { data: { user: loginError ? null : { id: 'login' } }, error: loginError };
      },
      signUp: async () => ({ data: { user: { id: 'signup' }, session: signUpSession }, error: null }),
      signOut: async () => ({ error: logoutError }),
    },
  };
  const { useAuthStore: store } = compile('src/stores/auth-store.ts', {
    '@/lib/auth-redirect': compile('src/lib/auth-redirect.ts'),
    '@/lib/supabase/client': { createClient: () => client },
    'zustand/middleware': { persist: config => config },
  });
  const resolve = (entry, name = entry.id) => entry.resolve({ data: { id: entry.id, name, role: 'student', korean_level: 'beginner' }, error: null });
  return { store, pending, resolve, setLogoutError: value => { logoutError = value; }, setLoginError: value => { loginError = value; }, getLoginInput: () => loginInput };
}

test('auth timeout releases waiting UI and ignores a late profile result', async () => {
  const { store, pending, resolve } = authFixture();
  const request = store.getState().syncUser('old');
  store.getState().failHydration('Connection timed out');
  assert.equal(store.getState().isHydrated, true);
  assert.equal(store.getState().authError, 'Connection timed out');
  resolve(pending[0]);
  await request;
  assert.equal(store.getState().user, null);
  assert.equal(store.getState().isAuthenticated, false);
  const retry = store.getState().syncUser('new');
  resolve(pending[1]);
  await retry;
  assert.equal(store.getState().user.id, 'new');
  assert.equal(store.getState().authError, null);
});

test('auth requests have a finite wait and successful requests still resolve', async () => {
  const { withAuthTimeout } = compile('src/stores/auth-store.ts', {
    '@/lib/auth-redirect': compile('src/lib/auth-redirect.ts'),
    '@/lib/supabase/client': { createClient: () => ({}) },
    'zustand/middleware': { persist: config => config },
  });
  await assert.rejects(withAuthTimeout(new Promise(() => {}), 10), /응답이 지연/);
  assert.equal(await withAuthTimeout(Promise.resolve('ok'), 100), 'ok');
});

test('password rejection explains credentials or email verification and permits retry', async () => {
  const { store, pending, setLoginError, getLoginInput } = authFixture();
  for (const [code, expected] of [
    ['invalid_credentials', /이메일 또는 비밀번호/],
    ['email_not_confirmed', /이메일 인증/],
    ['over_request_rate_limit', /시도가 너무 많/],
    ['email_provider_disabled', /이메일 로그인을 사용할 수 없/],
  ]) {
    setLoginError({ code, status: 400, message: 'Raw server error' });
    await assert.rejects(store.getState().login(' fixture@example.test ', ' unchanged password '), expected);
    assert.equal(store.getState().isLoading, false);
    assert.equal(store.getState().isAuthenticated, false);
  }
  assert.equal(getLoginInput().email, 'fixture@example.test');
  assert.equal(getLoginInput().password, ' unchanged password ');
  assert.equal(pending.length, 0);
});

test('successful password authentication loads profile; profile failures are distinguished', async () => {
  const { store, pending, resolve } = authFixture();
  const failed = store.getState().login('fixture@example.test', 'fixture');
  await new Promise(setImmediate);
  pending[0].resolve({ data: null, error: { message: 'offline' } });
  await assert.rejects(failed, /계정 인증은 완료됐지만 회원 정보/);
  assert.equal(store.getState().isLoading, false);
  const retry = store.getState().login('fixture@example.test', 'fixture');
  await new Promise(setImmediate);
  resolve(pending[1]);
  await retry;
  assert.equal(store.getState().user.id, 'login');
  assert.equal(store.getState().isAuthenticated, true);
  assert.equal(store.getState().isLoading, false);
});

test('teacher login returns its verified role while auth hydration is still pending', async () => {
  const { store, pending } = authFixture();
  const login = store.getState().login('teacher@example.test', 'fixture');
  await new Promise(setImmediate);
  const hydration = store.getState().syncUser('login');
  const profile = { id: 'login', role: 'teacher', name: 'Teacher', korean_level: 'beginner' };
  pending[0].resolve({ data: profile, error: null });
  const authenticated = await login;
  assert.equal(store.getState().user, null, 'the newer hydration request has not finished');
  assert.equal(authenticated.role, 'teacher');
  const { loginAuthNext } = compile('src/lib/auth-redirect.ts');
  assert.equal(loginAuthNext('/teacher/home', authenticated.role), '/teacher/home');
  pending[1].resolve({ data: profile, error: null });
  await hydration;
  assert.equal(store.getState().user.role, 'teacher');
});

test('older account requests cannot overwrite the current authenticated profile', async () => {
  const { store, pending, resolve } = authFixture();
  const old = store.getState().syncUser('old');
  const current = store.getState().syncUser('current');
  resolve(pending[1]); await current;
  resolve(pending[0]); await old;
  assert.equal(store.getState().user.id, 'current');
  const reload = store.getState().syncUser('current');
  resolve(pending[2], 'Updated name'); await reload;
  assert.equal(store.getState().user.name, 'Updated name');
});
test('changing account clears previous data before the profile request completes', async () => {
  const { store, pending, resolve } = authFixture();
  const load = store.getState().syncUser('old'); resolve(pending[0]); await load;
  const changing = store.getState().syncUser('new');
  assert.equal(store.getState().user, null);
  pending[1].resolve({ data: null, error: { message: 'offline' } });
  await assert.rejects(changing);
  assert.equal(store.getState().user, null);
  assert.equal(store.getState().isAuthenticated, false);
});
test('signup without a session is an email verification state, not authenticated', async () => {
  const { store, pending } = authFixture();
  const result = await store.getState().register({ email: 'fixture@example.test', password: 'example-test-password', name: 'Fixture', nativeLanguage: 'en', koreanLevel: 'beginner' });
  assert.equal(result, 'verify_email');
  assert.equal(store.getState().isAuthenticated, false);
  assert.equal(pending.length, 0);
});
test('failed logout reports failure and does not pretend the session was removed', async () => {
  const { store, pending, resolve, setLogoutError } = authFixture();
  const load = store.getState().syncUser('current'); resolve(pending[0]); await load;
  setLogoutError({ message: 'offline' });
  await assert.rejects(store.getState().logout());
  assert.equal(store.getState().user.id, 'current');
});
test('auth redirect only accepts an internal path', () => {
  const { safeAuthNext } = compile('src/lib/auth-redirect.ts');
  for (const value of [null, 'https://example.test', '//example.test', '/\\example.test', '/\nexample.test']) assert.equal(safeAuthNext(value), '/student/home');
  assert.equal(safeAuthNext('/support?tab=mine'), '/support?tab=mine');
});
test('aggregate page collector preserves rows beyond the server response limit', async () => {
  const { collectPages } = compile('src/lib/queries/paging.ts');
  const source = Array.from({ length: 1502 }, (_, id) => ({ id }));
  let calls = 0;
  const result = await collectPages(async (from, to) => { calls++; return { data: source.slice(from, to + 1), error: null }; });
  assert.equal(result.length, 1502);
  assert.equal(new Set(result.map(row => row.id)).size, 1502);
  assert.equal(calls, 4);
});
test('client discount preview rejects expired and malformed coupons', () => {
  const { computeDiscount } = compile('src/lib/queries/coupons.ts', { '@/lib/supabase/client': {} });
  const coupon = { minOrderAmount: 0, discountType: 'percent', discountValue: 100, expiresAt: '2000-01-01' };
  assert.equal(computeDiscount(coupon, 10000), 0);
  assert.equal(computeDiscount({ ...coupon, expiresAt: null, discountValue: 101 }, 10000), 0);
  assert.equal(computeDiscount({ ...coupon, expiresAt: null }, 10000), 10000);
});
