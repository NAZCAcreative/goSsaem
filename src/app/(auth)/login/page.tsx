'use client';

import { PageLoading } from '@/components/shared/PageLoading';
import Image from 'next/image';
import Link from 'next/link';
import { loginAuthNext } from '@/lib/auth-redirect';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { GoogleAuthButton } from '@/components/shared/GoogleAuthButton';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isTeacherEntry = searchParams.get('next')?.startsWith('/teacher/') ?? false;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const callbackError = searchParams.get('error') === 'auth_cancelled'
    ? 'Google 로그인이 취소되었습니다. 다시 시도해주세요.'
    : searchParams.has('error') ? '로그인을 완료하지 못했습니다. 다시 시도해주세요.' : null;
  const visibleError = errorMessage || callbackError;

  useEffect(() => {
    if (visibleError) errorRef.current?.focus();
  }, [visibleError]);

  const handleSubmit = async () => {
    if (isLoading) return;
    setErrorMessage(null);
    if (!email.trim() || !password) {
      setErrorMessage('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    try {
      await login(email, password);
      const next = searchParams.get('next');
      router.replace(loginAuthNext(next, useAuthStore.getState().user?.role ?? 'student'));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    }
  };

  return (
    <div className="bg-background text-on-background flex min-h-[calc(100dvh-64px)] flex-col items-center justify-center py-8 pb-28 px-container-margin font-body-md">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-stack-sm text-center">
          <Link href="/student" className="mb-2 transition-opacity hover:opacity-85" aria-label="GoSsaem 홈으로 이동">
            <Image src="/img/gossaem_logo01.png" alt="GoSsaem" width={2172} height={724} className="h-10 w-auto object-contain sm:h-12" priority />
          </Link>
          <p className="text-body-md text-on-surface-variant">{isTeacherEntry ? '선생님 로그인' : searchParams.get('next')?.startsWith('/student/') ? '학생 로그인' : '다시 만나서 반가워요!'}</p>
        </div>

        <form
          className="flex flex-col gap-stack-md rounded-xl border border-surface-variant/30 bg-surface-container-lowest p-5 sm:p-8 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
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

          {visibleError && <p ref={errorRef} tabIndex={-1} role="alert" className="scroll-mt-24 rounded-lg border border-error/30 bg-error-container/20 px-4 py-3 text-body-md text-error">{visibleError}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="primary-gradient-btn mt-2 w-full rounded-lg py-4 text-center font-label-lg text-label-lg font-bold text-white shadow-md transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>

          <GoogleAuthButton next={searchParams.get('next')} onError={setErrorMessage} />

          <p className="mt-2 text-center text-body-md text-on-surface-variant">
            계정이 없으신가요?{' '}
            <Link href={isTeacherEntry ? '/signup/teacher' : '/signup/student'} className="inline-flex min-h-11 items-center font-bold text-primary hover:underline">
              회원가입
            </Link>
          </p>
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
