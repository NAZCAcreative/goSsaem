const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function compile(file, imports, globals = {}) {
  const context = { exports: {}, URL, ...globals, require: name => imports[name] ?? require(name) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, context);
  return context.exports;
}
const redirects = compile('src/lib/auth-redirect.ts', {});

test('Google OAuth uses PKCE callback and blocks external destinations; failures allow retry', async () => {
  let options;
  let assigned;
  let fail = true;
  const { useAuthStore: store } = compile('src/stores/auth-store.ts', {
    '@/lib/auth-redirect': redirects,
    'zustand/middleware': { persist: config => config },
    '@/lib/supabase/client': { createClient: () => ({ auth: {
      signInWithOAuth: async input => {
        options = input;
        return fail ? { error: new Error('Unavailable'), data: {} } : { error: null, data: { url: 'https://provider.example/authorize' } };
      },
    } }) },
  }, { window: { location: { origin: 'https://vora.example', assign: url => { assigned = url; } } } });
  await assert.rejects(store.getState().loginWithGoogle('//evil.example'));
  assert.equal(store.getState().isLoading, false);
  assert.equal(new URL(options.options.redirectTo).searchParams.get('next'), '/student/home');
  fail = false;
  await store.getState().loginWithGoogle('/student/bookings?tab=upcoming');
  assert.equal(options.provider, 'google');
  const callback = new URL(options.options.redirectTo);
  assert.equal(callback.origin + callback.pathname, 'https://vora.example/auth/callback');
  assert.equal(callback.searchParams.get('next'), '/student/bookings?tab=upcoming');
  assert.equal(assigned, 'https://provider.example/authorize');
  assert.equal(store.getState().isLoading, true);
});

test('callback exchanges code and preserves destination on success or cancellation', async () => {
  let exchanged;
  const { GET } = compile('src/app/auth/callback/route.ts', {
    '@/lib/auth-redirect': redirects,
    'next/server': { NextResponse: { redirect: url => String(url) } },
    '@/lib/supabase/server': { createClient: async () => ({ auth: {
      exchangeCodeForSession: async code => { exchanged = code; return { data: { user: { id: 'user-1' } }, error: code === 'bad' }; },
    }, from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'student' } }) }) }) }) }) },
  });
  assert.equal(await GET({ url: 'https://vora.example/auth/callback?code=good&next=/student/bookings' }), 'https://vora.example/student/bookings');
  assert.equal(exchanged, 'good');
  for (const query of ['error=access_denied', 'code=bad', '']) {
    const result = new URL(await GET({ url: `https://vora.example/auth/callback?${query}&next=/student/bookings` }));
    assert.equal(result.pathname, '/login');
    assert.equal(result.searchParams.get('next'), '/student/bookings');
    assert.equal(result.searchParams.get('error'), query.startsWith('error') ? 'auth_cancelled' : 'auth_callback_failed');
  }
});

test('account role determines home and prevents crossing student/teacher routes', () => {
  assert.equal(redirects.roleAuthNext(null, 'teacher'), '/teacher/home');
  assert.equal(redirects.roleAuthNext(null, 'student'), '/student/home');
  assert.equal(redirects.roleAuthNext('/teacher/profile', 'student'), '/student/home');
  assert.equal(redirects.roleAuthNext('/student/bookings?tab=upcoming', 'teacher'), '/teacher/home');
  assert.equal(redirects.roleAuthNext('/teacher/lessons?tab=all', 'teacher'), '/teacher/lessons?tab=all');
  assert.equal(redirects.roleAuthNext('/teachers/public-id', 'student'), '/teachers/public-id');
  assert.equal(redirects.roleAuthNext('/login', 'teacher'), '/teacher/home');
  assert.equal(redirects.roleAuthNext('//evil.example', 'teacher'), '/teacher/home');
  assert.equal(redirects.roleAuthNext('/signup/teacher', 'teacher'), '/teacher/home');
  assert.equal(redirects.roleAuthNext('/teacher/register/complete?title=test&price=100', 'teacher'), '/teacher/lessons/new/complete?title=test&price=100');
});

test('shared navigation follows account role and admin hides participant navigation', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  let pathname = '/support';
  let role = 'teacher';
  const { BottomNavigation } = compile('src/components/shared/BottomNavigation.tsx', {
    'next/link': { default: props => React.createElement('a', props) },
    'next/navigation': { usePathname: () => pathname },
    '@/stores/auth-store': { useAuthStore: selector => selector({ user: { role } }) },
  });
  assert.match(renderToStaticMarkup(React.createElement(BottomNavigation)), /href="\/teacher\/profile"/);
  role = 'student';
  assert.match(renderToStaticMarkup(React.createElement(BottomNavigation)), /href="\/student\/profile"/);
  for (pathname of ['/student', '/teacher', '/admin', '/admin/members', '/signup/student', '/signup/teacher', '/login']) {
    assert.equal(renderToStaticMarkup(React.createElement(BottomNavigation)), '');
  }
  pathname = '/teacher/lessons/new';
  role = 'teacher';
  const markup = renderToStaticMarkup(React.createElement(BottomNavigation));
  assert.equal((markup.match(/aria-current="page"/g) || []).length, 1);
  assert.match(markup, /href="\/teacher\/lessons\/new" aria-current="page"/);
});

test('dedicated signup pages fix account role and distinguish teacher email signup', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { SignupForm } = compile('src/components/features/auth/SignupForm.tsx', {
    'next/link': { default: props => React.createElement('a', props) },
    'next/navigation': { useRouter: () => ({ push() {} }) },
    '@/components/shared/GoogleAuthButton': { GoogleAuthButton: () => React.createElement('button', { 'data-google-auth': true }, 'Google') },
    '@/components/shared/Toast': { showToast() {} },
    '@/stores/auth-store': { useAuthStore: selector => selector({ register() {}, isLoading: false }) },
  });
  const student = renderToStaticMarkup(React.createElement(SignupForm, { role: 'student' }));
  const teacher = renderToStaticMarkup(React.createElement(SignupForm, { role: 'teacher' }));
  assert.match(student, /data-google-auth/);
  assert.doesNotMatch(teacher, /data-google-auth/);
  assert.doesNotMatch(student + teacher, /type="radio"/);
  assert.match(student, /학생 회원가입/);
  assert.match(teacher, /선생님 회원가입/);
});

test('registration saves the selected role and rejects duplicate email identities', async () => {
  let submitted;
  let duplicate = false;
  const { useAuthStore: store } = compile('src/stores/auth-store.ts', {
    '@/lib/auth-redirect': redirects,
    'zustand/middleware': { persist: config => config },
    '@/lib/supabase/client': { createClient: () => ({ auth: {
      signUp: async input => {
        submitted = input;
        return { data: { user: { id: 'new-user', identities: duplicate ? [] : [{}] }, session: null }, error: null };
      },
    } }) },
  });
  for (const role of ['teacher', 'student']) {
    assert.equal(await store.getState().register({ role, email: ' user@example.com ', password: 'password123', name: 'User', nativeLanguage: 'en', koreanLevel: 'beginner' }), 'verify_email');
    assert.equal(submitted.options.data.role, role);
    assert.equal(submitted.email, 'user@example.com');
  }
  duplicate = true;
  await assert.rejects(store.getState().register({ role: 'teacher', email: 'user@example.com', password: 'password123' }));
  assert.equal(store.getState().isLoading, false);
});
