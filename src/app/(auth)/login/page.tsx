'use client';

import { PageLoading } from '@/components/shared/PageLoading';
import Image from 'next/image';
import Link from 'next/link';
import { loginAuthNext } from '@/lib/auth-redirect';
import { Suspense, useEffect, useState } from 'react';
import { showError, useAlertState } from '@/components/shared/AlertDialog';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { GoogleAuthButton } from '@/components/shared/GoogleAuthButton';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const authError = useAuthStore((s) => s.authError);
  const isTeacherEntry = searchParams.get('role') === 'teacher' || (searchParams.get('role') !== 'student' && (searchParams.get('next')?.startsWith('/teacher/') ?? false));
  const entryRole = isTeacherEntry ? 'teacher' : 'student';
  const teacherAccountMismatch = isTeacherEntry && user?.role !== 'teacher' && (user?.role === 'student' || searchParams.get('error') === 'teacher_account_required');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [, setErrorMessage] = useAlertState<string | null>(null);
  const callbackError = searchParams.get('error') === 'auth_cancelled'
    ? 'Google 로그인이 취소되었습니다. 다시 시도해주세요.'
    : searchParams.get('error') === 'teacher_account_required'
      ? '학생 계정으로 가입된 이메일입니다. 선생님 계정으로 로그인해주세요. 선생님 계정이 없다면 다른 이메일로 선생님 회원가입을 진행해주세요.'
    : searchParams.get('error') === 'student_account_required'
      ? '선생님 계정으로 가입된 이메일입니다. 위에서 선생님을 선택한 후 로그인해주세요.'
    : searchParams.has('error') ? '로그인을 완료하지 못했습니다. 다시 시도해주세요.' : null;

  useEffect(() => {
    if (callbackError && searchParams.get('error') !== 'teacher_account_required') showError(callbackError);
  }, [callbackError, searchParams]);

  const resolvedTeacherMismatch = isTeacherEntry && user?.role === 'teacher' && searchParams.get('error') === 'teacher_account_required';
  const resumeSession = isHydrated && user?.role === entryRole && (!callbackError || resolvedTeacherMismatch);
  useEffect(() => {
    if (resumeSession && user) window.location.replace(loginAuthNext(searchParams.get('next'), user.role, entryRole));
  }, [resumeSession, user, router, searchParams, entryRole]);

  const handleSubmit = async () => {
    if (isLoading) return;
    setErrorMessage(null);
    if (!email.trim() || !password) {
      setErrorMessage('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    try {
      const profile = await login(email, password);
      const next = searchParams.get('next');
      window.location.replace(loginAuthNext(next, profile.role, entryRole));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    }
  };

  return (
    <div className="bg-background text-on-background flex min-h-[calc(100dvh-64px)] flex-col items-center justify-center py-8 pb-28 px-container-margin font-body-md">
      <div className="w-full max-w-md">
        {!isHydrated && <p role="status" className="mb-4 text-sm text-on-surface-variant">로그인 상태를 확인하고 있습니다. 잠시만 기다려주세요.</p>}
        {authError && <div role="alert" className="mb-4 rounded-xl border border-error/20 p-4 text-sm"><p>{authError}</p><a href={`/login?role=${entryRole}&next=${encodeURIComponent(searchParams.get('next') || `/${entryRole}/home`)}`} className="mt-2 inline-flex min-h-11 items-center font-semibold text-primary">연결 다시 확인</a></div>}
        {resumeSession && <div role="status" className="mb-4 rounded-xl bg-primary/5 p-4 text-sm"><p>로그인이 확인되어 이동하고 있습니다.</p><a href={loginAuthNext(searchParams.get('next'), user!.role, entryRole)} className="mt-2 inline-flex min-h-11 items-center font-semibold text-primary">바로 이동하기 →</a></div>}
        <div className="mb-6 flex flex-col items-center gap-stack-sm text-center">
          <Link href={isTeacherEntry ? '/teacher' : '/student'} className="mb-2 transition-opacity hover:opacity-85" aria-label="GoSsaem 홈으로 이동">
            <Image src="/img/gossaem_logo02.png" alt="GoSsaem" width={2172} height={724} className="h-10 w-auto object-contain sm:h-12" priority />
          </Link>
          <h1 className="text-xl font-bold text-on-surface">{isTeacherEntry ? '선생님 로그인' : '학생 로그인'}</h1>
        </div>

        {teacherAccountMismatch && (
          <section role="status" className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-relaxed">
            <h2 className="font-bold text-on-surface">선생님 계정으로 로그인해주세요</h2>
            <p className="mt-2 text-on-surface-variant">현재 학생 계정으로 로그인되어 있습니다. 선생님 대시보드는 선생님 계정으로 이용할 수 있습니다. 아래에서 선생님 계정으로 로그인하면 대시보드로 이동합니다.</p>
            <Link href="/signup/teacher" className="mt-2 inline-flex min-h-11 items-center font-semibold text-primary">선생님 계정 만들기 →</Link>
          </section>
        )}

        {/* Teacher / Student role guidance banner */}
        <div className="mb-4">
          {!isTeacherEntry ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-secondary/20 bg-secondary/5 px-4 py-3 sm:px-5 shadow-sm">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-2xl flex-shrink-0" role="img" aria-label="선생님">👩‍🏫</span>
                <div className="text-left min-w-0">
                  <p className="text-sm font-bold text-secondary truncate">선생님이신가요?</p>
                  <p className="text-xs text-on-surface-variant truncate">선생님 페이지 및 전용 로그인 안내</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    router.replace('/login?role=teacher&next=%2Fteacher%2Fhome', { scroll: false });
                  }}
                  className="inline-flex items-center rounded-xl border border-secondary px-2.5 py-1.5 text-xs font-bold text-secondary transition-all hover:bg-secondary/10"
                >
                  선생님 로그인
                </button>
                <Link
                  href="/teacher"
                  className="inline-flex items-center gap-1 rounded-xl bg-secondary px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-secondary/90 hover:shadow-sm"
                >
                  <span>선생님 페이지</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 sm:px-5 shadow-sm">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-2xl flex-shrink-0" role="img" aria-label="학생">🎒</span>
                <div className="text-left min-w-0">
                  <p className="text-sm font-bold text-primary truncate">학생이신가요?</p>
                  <p className="text-xs text-on-surface-variant truncate">학생 페이지 및 전용 로그인 안내</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    router.replace('/login?role=student&next=%2Fstudent%2Fhome', { scroll: false });
                  }}
                  className="inline-flex items-center rounded-xl border border-primary px-2.5 py-1.5 text-xs font-bold text-primary transition-all hover:bg-primary/10"
                >
                  학생 로그인
                </button>
                <Link
                  href="/student"
                  className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-primary/90 hover:shadow-sm"
                >
                  <span>학생 페이지</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        <form
          className="flex flex-col gap-stack-md rounded-xl border border-surface-variant/30 bg-surface-container-lowest p-5 sm:p-8 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <div role="group" aria-label="로그인 유형" className="grid grid-cols-2 gap-1 rounded-xl bg-surface-container-low p-1">
            {(['student', 'teacher'] as const).map((role) => (
              <button key={role} type="button" aria-pressed={entryRole === role} disabled={isLoading}
                onClick={() => {
                  setErrorMessage(null);
                  router.replace(`/login?role=${role}&next=${encodeURIComponent(role === 'teacher' ? '/teacher/home' : '/student/home')}`, { scroll: false });
                }}
                className={`min-h-12 rounded-lg px-4 py-3 text-base font-bold transition-colors disabled:opacity-60 ${entryRole === role ? 'bg-white text-primary shadow-sm ring-1 ring-primary/20' : 'text-on-surface-variant hover:bg-white/60'}`}>
                {role === 'student' ? '학생' : '선생님'}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-stack-sm">
            <label htmlFor="login-email" className="font-label-lg text-label-lg text-on-surface-variant">
              이메일 주소
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border-transparent bg-surface-container-low px-4 py-3.5 text-body-md focus:border-primary focus:ring-0"
            />
          </div>

          <div className="flex flex-col gap-stack-sm">
            <label htmlFor="login-password" className="font-label-lg text-label-lg text-on-surface-variant">
              비밀번호
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border-transparent bg-surface-container-low px-4 py-3.5 text-body-md focus:border-primary focus:ring-0"
            />
          </div>


          <button
            type="submit"
            disabled={isLoading}
            className="primary-gradient-btn mt-2 w-full rounded-lg py-4 text-center font-label-lg text-label-lg font-bold text-white shadow-md transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {isLoading ? '로그인 중...' : isTeacherEntry ? '선생님으로 로그인' : '학생으로 로그인'}
          </button>

          <GoogleAuthButton next={searchParams.get('next')} entryRole={entryRole} onError={setErrorMessage} />

          <p className="mt-2 text-center text-body-md text-on-surface-variant">
            계정이 없으신가요?{' '}
            <Link href={isTeacherEntry ? '/signup/teacher' : '/signup/student'} className="inline-flex min-h-11 items-center font-bold text-primary hover:underline">
              회원가입
            </Link>
          </p>

          <div className="mt-3 border-t border-outline-variant/60 pt-3 text-center">
            {!isTeacherEntry ? (
              <p className="text-xs text-on-surface-variant">
                선생님이신가요?{' '}
                <Link href="/teacher" className="font-bold text-secondary hover:underline inline-flex items-center gap-0.5 ml-1">
                  선생님 안내 및 등록 페이지로 이동 →
                </Link>
              </p>
            ) : (
              <p className="text-xs text-on-surface-variant">
                한국어를 배우는 학생이신가요?{' '}
                <Link href="/student" className="font-bold text-primary hover:underline inline-flex items-center gap-0.5 ml-1">
                  학생 메인 페이지로 이동 →
                </Link>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <LoginContent />
    </Suspense>
  );
}
