const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function compile(file, imports, globals = {}) {
  if (file === 'src/stores/auth-store.ts') imports = { ...imports, '@/lib/error-message': compile('src/lib/error-message.ts', {}) };
  const context = { exports: {}, URL, setTimeout, clearTimeout, ...globals, require: name => imports[name] ?? require(name) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, context);
  return context.exports;
}
const redirects = compile('src/lib/auth-redirect.ts', {});

test('student landing never sends a teacher session to teacher workspace', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  let state = { user: null, isHydrated: true };
  const { StudentLanding } = compile('src/components/features/StudentLanding.tsx', {
    'next/link': { default: props => React.createElement('a', props) },
    'next/image': { default: () => null },
    './StudentLanding.module.css': { default: {} },
    './LessonDiscovery': { LessonCard: () => null },
    '@/lib/queries/lessonCatalog': {},
    '@/stores/auth-store': { useAuthStore: selector => selector(state) },
    '@/stores/navigation-store': { useNavigationStore: selector => selector({getItems:()=>[{id:'home',href:'/student',label:'홈',isActive:true},{id:'bad',href:'/teacher/home',label:'선생님 공간',isActive:true}]}) },
  });
  for (const role of [null,'student','teacher']) {
    state.user = role ? {role} : null;
    const markup = renderToStaticMarkup(React.createElement(StudentLanding));
    assert.doesNotMatch(markup,/href="\/teacher(?:\/|\?|")/);
    if(role==='student') assert.match(markup,/href="\/student\/home"/);
    else assert.match(markup,/href="\/login\?role=student/);
  }
});

test('teacher landing keeps its header and hides login for authenticated and pending sessions', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  let state = { user: null, isHydrated: false };
  const { TeacherLanding } = compile('src/components/features/TeacherLanding.tsx', {
    'next/link': { default: props => React.createElement('a', props) },
    'next/image': { default: () => null },
    './TeacherLanding.module.css': { default: {} },
    '@/stores/auth-store': { useAuthStore: selector => selector(state) },
    '@/lib/supabase/client': { createClient: () => { throw Error('Unexpected server request'); } },
  });
  const render = () => renderToStaticMarkup(React.createElement(TeacherLanding));
  let markup = render();
  assert.match(markup, /data-landing-header/);
  assert.doesNotMatch(markup, /href="\/login/);
  state.isHydrated = true;
  assert.match(render(), /href="\/login/);
  for (const role of ['teacher', 'student']) {
    state.user = { role };
    markup = render();
    assert.match(markup, /data-landing-header/);
    assert.match(markup, /왜 Go Ssaem인가요/);
    assert.match(markup, /href="\/teacher\/home"/);
    assert.doesNotMatch(markup, /href="\/student\/home"/);
    if (role === 'student') assert.match(markup, /현재 학생 계정으로 로그인/);
    assert.doesNotMatch(markup, /href="\/login|href="\/signup/);
  }
});

test('login resumes a matching session only after hydration and preserves role errors', () => {
  const React = require('react');
  let state = { user: { role: 'teacher' }, isHydrated: false };
  let params = new URLSearchParams('next=/teacher/home');
  let destinations = [];
  const { default: LoginPage } = compile('src/app/(auth)/login/page.tsx', {
    react: { ...React, useState: value => [value, () => {}], useEffect: effect => effect() },
    'next/image': { default: () => null },
    'next/link': { default: () => null },
    'next/navigation': { useRouter: () => ({ replace: url => destinations.push(url) }), useSearchParams: () => params },
    '@/lib/auth-redirect': redirects,
    '@/stores/auth-store': { useAuthStore: selector => selector(state) },
    '@/components/shared/PageLoading': { PageLoading: () => null },
    '@/components/shared/GoogleAuthButton': { GoogleAuthButton: () => null },
    '@/components/shared/AlertDialog': { showError() {}, useAlertState: value => [value, () => {}] },
  }, { window: { location: { replace: url => destinations.push(url) } } });
  const render = () => LoginPage().props.children.type();
  assert.match(require('react-dom/server').renderToStaticMarkup(render()), /이메일 주소/);
  assert.deepEqual(destinations, []);
  state.isHydrated = true;
  render();
  assert.deepEqual(destinations, ['/teacher/home']);
  destinations = [];
  params = new URLSearchParams('role=student&error=student_account_required');
  render();
  assert.deepEqual(destinations, []);
  state.user = null;
  params = new URLSearchParams('next=/teacher/home');
  render();
  assert.deepEqual(destinations, []);
  state.user = { role: 'student' };
  params = new URLSearchParams('role=teacher&next=/teacher/home&error=teacher_account_required');
  const { renderToStaticMarkup } = require('react-dom/server');
  const mismatchMarkup = renderToStaticMarkup(render());
  assert.match(mismatchMarkup, /현재 학생 계정으로 로그인되어 있습니다/);
  assert.deepEqual(destinations, []);
  state.user = { role: 'teacher' };
  render();
  assert.deepEqual(destinations, ['/teacher/home']);
});

test('teacher middleware preserves entry intent for guests, students and teachers', async () => {
  let role = null;
  let profileMissing = false;
  let applicationStatus = 'approved';
  let applicationError = false;
  let authRequests = 0;
  const cookieJar = () => ({ getAll: () => [{ name: 'session', value: 'refreshed' }], set() {} });
  const { middleware } = compile('src/middleware.ts', {
    '@/lib/auth-redirect': redirects,
    'next/server': { NextResponse: {
      next: () => ({ cookies: cookieJar() }),
      redirect: url => ({ destination: new URL(url), cookies: cookieJar(), headers: new Map() }),
    } },
    '@supabase/ssr': { createServerClient: () => ({
      rpc: async () => ({ data: applicationStatus ? { status: applicationStatus } : null, error: applicationError }),
      auth: { getUser: async () => { authRequests++; return { data: { user: role ? { id: 'fixture' } : null } }; } },
      from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: profileMissing ? null : { role } }) }) }) }),
    }) },
  }, { process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://example.test', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fixture' } } });
  const visit = path => middleware({ url: `https://example.test${path}`, nextUrl: new URL(path, 'https://example.test'), cookies: cookieJar() });
  await visit('/login?role=teacher&error=teacher_account_required');
  await visit('/signup/teacher');
  assert.equal(authRequests, 0);
  for (const currentRole of [null, 'student', 'teacher']) {
    role = currentRole;
    for (const path of ['/teacher/home', '/teacher/profile?tab=career']) {
      const result = await visit(path);
      if (role === 'teacher') { assert.equal(result.destination, undefined); continue; }
      assert.equal(result.destination.pathname, '/login');
      assert.equal(result.destination.searchParams.get('role'), 'teacher');
      assert.equal(result.destination.searchParams.get('next'), path);
      assert.equal(result.destination.searchParams.get('error'), role ? 'teacher_account_required' : null);
    }
    assert.equal((await visit('/teacher')).destination, undefined);
  }
  role = 'student';
  assert.equal((await visit('/student/home')).destination, undefined);
  role = 'teacher';
  for (applicationStatus of ['not_applied', 'review_pending', 'needs_changes', 'review_rejected', null]) {
    assert.equal((await visit('/teacher/home')).destination.pathname, '/teacher/apply');
    assert.equal((await visit('/teacher/lessons')).destination.pathname, '/teacher/apply');
    assert.equal((await visit('/teacher/apply')).destination, undefined);
    assert.equal((await visit('/teacher/profile/edit?from=application')).destination, undefined);
  }
  applicationStatus = 'approved'; applicationError = true;
  assert.equal((await visit('/teacher/home')).destination.pathname, '/teacher/apply');
  assert.equal((await visit('/teacher/apply')).destination, undefined);
  applicationError = false;
  const approvedEntry = await visit('/teacher/apply');
  assert.equal(approvedEntry.destination.pathname, '/teacher/home');
  assert.equal(approvedEntry.headers.get('Cache-Control'), 'private, no-store');
  profileMissing = true;
  const missing = (await visit('/teacher/home')).destination;
  assert.equal(missing.searchParams.get('error'), 'profile_unavailable');
  assert.equal(missing.searchParams.get('role'), 'teacher');
  assert.equal(missing.searchParams.get('next'), '/teacher/home');
});

test('approval entry reloads the document instead of reusing a cached router redirect', () => {
  let destination;
  const navigation = compile('src/lib/auth-redirect.ts', {}, { window: { location: { replace: value => { destination = value; } } } });
  navigation.enterTeacherDashboard();
  assert.equal(destination, '/teacher/home');
});

test('an unresponsive session lookup stops blocking the UI after eight seconds', () => {
  const React = require('react');
  const timers = new Map();
  let nextTimer = 0;
  const state = { user: null, isHydrated: false, authError: null, syncUser: async () => null,
    failHydration: message => { state.authError = message; state.isHydrated = true; } };
  const store = selector => selector(state);
  store.getState = () => state;
  store.setState = patch => Object.assign(state, patch);
  const { Providers } = compile('src/app/providers.tsx', {
    react: { ...React, useMemo: factory => factory(), useEffect: effect => effect() },
    '@tanstack/react-query': { QueryClient: class {}, QueryClientProvider: () => null },
    '@/stores/auth-store': { useAuthStore: store },
    '@/lib/supabase/client': { createClient: () => ({ auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      getUser: () => new Promise(() => {}),
    } }) },
  }, { setTimeout: (callback, delay) => { timers.set(++nextTimer, { callback, delay }); return nextTimer; }, clearTimeout: timer => timers.delete(timer) });
  const tree = Providers({ children: null });
  tree.props.children[0].type();
  assert.equal(state.isHydrated, false);
  const watchdog = [...timers.values()].find(timer => timer.delay === 8000);
  assert.ok(watchdog);
  watchdog.callback();
  assert.equal(state.isHydrated, true);
  assert.match(state.authError, /지연/);
  assert.equal(state.user, null);
});

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
  await store.getState().loginWithGoogle('/student/bookings?tab=upcoming', 'student');
  assert.equal(options.provider, 'google');
  const callback = new URL(options.options.redirectTo);
  assert.equal(callback.origin + callback.pathname, 'https://vora.example/auth/callback');
  assert.equal(callback.searchParams.get('next'), '/student/bookings?tab=upcoming');
  assert.equal(callback.searchParams.get('role'), 'student');
  assert.equal(assigned, 'https://provider.example/authorize');
  assert.equal(store.getState().isLoading, true);
});

test('callback exchanges code and preserves destination on success or cancellation', async () => {
  let exchanged;
  let role = 'student';
  const { GET } = compile('src/app/auth/callback/route.ts', {
    '@/lib/auth-redirect': redirects,
    'next/server': { NextResponse: { redirect: url => String(url) } },
    '@/lib/supabase/server': { createClient: async () => ({ auth: {
      exchangeCodeForSession: async code => { exchanged = code; return { data: { user: { id: 'user-1' } }, error: code === 'bad' }; },
    }, from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { role } }) }) }) }) }) },
  });
  assert.equal(await GET({ url: 'https://vora.example/auth/callback?code=good&next=/student/bookings' }), 'https://vora.example/student/bookings');
  assert.equal(exchanged, 'good');
  const mismatch = new URL(await GET({ url: 'https://vora.example/auth/callback?code=good&next=/teacher/home' }));
  assert.equal(mismatch.pathname, '/login');
  assert.equal(mismatch.searchParams.get('error'), 'teacher_account_required');
  assert.equal(mismatch.searchParams.get('next'), '/teacher/home');
  role = 'teacher';
  const studentEntry = new URL(await GET({ url: 'https://vora.example/auth/callback?code=good&role=student' }));
  assert.equal(studentEntry.searchParams.get('error'), 'student_account_required');
  assert.equal(studentEntry.searchParams.get('role'), 'student');
  assert.equal(await GET({ url: 'https://vora.example/auth/callback?code=good&next=/support' }), 'https://vora.example/teacher/home');
  for (const query of ['error=access_denied', 'code=bad', '']) {
    const result = new URL(await GET({ url: `https://vora.example/auth/callback?${query}&next=/student/bookings` }));
    assert.equal(result.pathname, '/login');
    assert.equal(result.searchParams.get('next'), '/student/bookings');
    assert.equal(result.searchParams.get('error'), query.startsWith('error') ? 'auth_cancelled' : 'auth_callback_failed');
  }
});

test('teacher login goes directly home regardless of the previous destination', () => {
  for (const next of [null, '/', '/teacher', '/student', '/support', '/teacher/profile', '/student/home', '//evil.example']) {
    assert.equal(redirects.loginAuthNext(next, 'teacher'), '/teacher/home');
  }
  assert.equal(redirects.loginAuthNext('/student/bookings?tab=upcoming', 'student'), '/student/bookings?tab=upcoming');
  assert.equal(redirects.loginAuthNext(null, 'student'), '/student/home');
  for (const next of ['/teacher', '/teacher/home', '/teacher/profile']) {
    const mismatch = new URL(redirects.loginAuthNext(next, 'student'), 'https://vora.example');
    assert.equal(mismatch.pathname, '/login');
    assert.equal(mismatch.searchParams.get('error'), 'teacher_account_required');
  }
});

test('account role determines home and prevents crossing student/teacher routes', () => {
  assert.equal(redirects.loginAuthNext(null, 'teacher', 'teacher'), '/teacher/home');
  assert.equal(redirects.loginAuthNext(null, 'student', 'student'), '/student/home');
  assert.match(redirects.loginAuthNext(null, 'student', 'teacher'), /error=teacher_account_required/);
  assert.match(redirects.loginAuthNext(null, 'teacher', 'student'), /error=student_account_required/);
  assert.equal(redirects.roleAuthNext(null, 'teacher'), '/teacher/home');
  assert.equal(redirects.roleAuthNext(null, 'student'), '/student/home');
  assert.equal(redirects.roleAuthNext('/teacher/profile', 'student'), '/login?role=teacher&next=%2Fteacher%2Fprofile&error=teacher_account_required');
  assert.equal(redirects.roleAuthNext('/student/bookings?tab=upcoming', 'teacher'), '/login?role=student&next=%2Fstudent%2Fbookings%3Ftab%3Dupcoming&error=student_account_required');
  for (const path of ['/student','/student/home','/student/search?q=여행']) assert.equal(redirects.roleAuthNext(path,'teacher'),path);
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
    '@/stores/navigation-store': compile('src/stores/navigation-store.ts', { 'zustand/middleware': { persist: config => config } }),
  });
  assert.match(renderToStaticMarkup(React.createElement(BottomNavigation)), /href="\/teacher\/profile"/);
  assert.match(renderToStaticMarkup(React.createElement(BottomNavigation)), /href="\/teacher\/home"/);
  for (pathname of ['/student','/student/home','/student/search','/lessons/example']) {
    const studentMarkup=renderToStaticMarkup(React.createElement(BottomNavigation));
    assert.match(studentMarkup,/href="\/student\/profile"/);
    assert.doesNotMatch(studentMarkup,/href="\/teacher\//);
  }
  role = 'student';
  assert.match(renderToStaticMarkup(React.createElement(BottomNavigation)), /href="\/student\/profile"/);
  for (pathname of ['/teacher', '/admin', '/admin/members', '/signup/student', '/signup/teacher', '/login']) {
    assert.equal(renderToStaticMarkup(React.createElement(BottomNavigation)), '');
  }
  pathname = '/teacher/lessons/new';
  role = 'teacher';
  const markup = renderToStaticMarkup(React.createElement(BottomNavigation));
  assert.equal((markup.match(/aria-current="page"/g) || []).length, 1);
  assert.match(markup, /href="\/teacher\/lessons" aria-current="page"/);
});

test('dedicated signup pages fix account role and distinguish teacher email signup', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { SignupForm } = compile('src/components/features/auth/SignupForm.tsx', {
    'next/link': { default: props => React.createElement('a', props) },
    'next/navigation': { useRouter: () => ({ push() {} }) },
    '@/components/shared/GoogleAuthButton': { GoogleAuthButton: () => React.createElement('button', { 'data-google-auth': true }, 'Google') },
    '@/components/shared/Toast': { showToast() {} },
    '@/components/shared/AlertDialog': { useAlertState: React.useState },
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
