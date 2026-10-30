'use client';

import Link from 'next/link';
import { GoogleAuthButton } from '@/components/shared/GoogleAuthButton';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { showToast } from '@/components/shared/Toast';
import { useAuthStore } from '@/stores/auth-store';

export function SignupForm({ role }: { role: 'student' | 'teacher' }) {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [verificationSent, setVerificationSent] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (isLoading) return;
    setErrorMessage(null);

    if (!name.trim() || !email.trim() || password.length < 8) {
      setErrorMessage('이름, 이메일을 입력하고 비밀번호는 8자 이상으로 설정해주세요.');
      return;
    }

    try {
      const result = await register({ role, name, email, password, nativeLanguage: 'en', koreanLevel: 'beginner' });
      if (result === 'verify_email') setVerificationSent(true);
      else router.push(role === 'teacher' ? '/teacher/home' : '/student/home');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '회원가입에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const loginHref = `/login?next=${encodeURIComponent(role === 'teacher' ? '/teacher/home' : '/student/home')}`;
  if (verificationSent) return <main className="mx-auto max-w-lg space-y-5 px-5 py-20"><h1 className="text-2xl font-bold">이메일을 확인해주세요</h1><p>{email} 주소로 보낸 인증 링크를 확인한 후 로그인해주세요.</p><Link className="inline-flex min-h-11 items-center rounded-xl bg-primary px-5 text-white" href={loginHref}>로그인으로 이동</Link></main>;
  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-body-md overflow-x-hidden">

      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[60%] h-[60%] rounded-full bg-secondary/5 blur-[120px]" />
      </div>

      {/* Main */}
      <main className="relative z-10 flex-grow flex flex-col items-center justify-center py-8 pb-28 px-container-margin pt-section-gap pb-20">
        <div className="w-full max-w-md flex flex-col gap-stack-lg">

          {/* Brand header */}
          <div className="flex flex-col items-center text-center gap-stack-sm mb-4">
            <div className="bg-gradient-primary w-16 h-16 rounded-xl flex items-center justify-center shadow-lg rotate-6 mb-4">
              <span className="material-symbols-outlined text-white text-[36px]">language</span>
            </div>
            <h1 className="text-headline-lg-mobile font-headline-lg-mobile md:text-headline-lg md:font-headline-lg text-on-surface">
              {role === 'teacher' ? '선생님 회원가입' : '학생 회원가입'}
            </h1>
            <p className="text-body-md font-body-md text-on-surface-variant px-8">
              {role === 'teacher' ? '한국어를 가르치는 선생님으로 시작해보세요.' : '나에게 맞는 선생님과 한국어를 배워보세요.'}
            </p>
          </div>

          {/* Card */}
          <div className="bg-surface-container-lowest rounded-xl p-5 sm:p-8 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] border border-surface-variant/30 w-full fade-in">
            <form
              className="flex flex-col gap-stack-md"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSubmit();
              }}
            >

              <p className="text-sm text-on-surface-variant">가입한 계정의 역할은 변경할 수 없습니다. 다른 역할로도 이용하려면 별도의 이메일로 가입해주세요.</p>
              {role === 'student' && <GoogleAuthButton onError={setErrorMessage} />}
              {role === 'teacher' && <p className="text-sm text-on-surface-variant">선생님 계정은 아래 이메일로 가입해주세요.</p>}

              {/* Apple */}
              <button
                type="button"
                onClick={() => showToast('Apple 로그인은 준비 중입니다')}
                className="flex items-center justify-center gap-2 w-full py-4 px-4 bg-surface-container-lowest border border-outline-variant rounded-lg text-label-lg font-label-lg text-on-surface hover:bg-surface-container-low transition-all active:scale-[0.98]"
              >
                <svg className="w-5 h-5 fill-current flex-shrink-0" viewBox="0 0 384 512">
                  <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 33-17.9 64.4-17.9 31.4 0 39.2 17.9 65.4 17.4 48.3-.7 90.4-82.4 102.2-116.3-1.6-.8-36-13.3-36.3-54.4zM249.6 112c21.8-26.4 36-62.8 30.3-99.2-31.9 1.3-70.5 21.3-93.3 48-19.1 21.6-35.8 58.7-30.2 94 35.4 2.8 71.4-16.4 93.2-42.8z" />
                </svg>
                <span className="whitespace-nowrap">Apple로 계속하기</span>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-stack-md my-2">
                <div className="h-px flex-grow bg-outline-variant" />
                <span className="text-label-sm font-label-sm text-outline whitespace-nowrap">또는 이메일로 가입</span>
                <div className="h-px flex-grow bg-outline-variant" />
              </div>

              {/* Name */}
              <div className="flex flex-col gap-stack-sm">
                <label htmlFor="signup-name" className="text-label-lg font-label-lg text-on-surface-variant ml-1">
                  이름
                </label>
                <input
                  id="signup-name"
                  type="text"
                  autoComplete="name"
                  placeholder="홍길동"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full bg-surface-container-low border-transparent focus:border-primary focus:ring-0 rounded-xl py-3.5 px-4 text-body-md transition-all"
                />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-stack-sm">
                <label htmlFor="signup-email" className="text-label-lg font-label-lg text-on-surface-variant ml-1">
                  이메일 주소
                </label>
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  placeholder="example@gossaem.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full bg-surface-container-low border-transparent focus:border-primary focus:ring-0 rounded-xl py-3.5 px-4 text-body-md transition-all"
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-stack-sm">
                <label htmlFor="signup-password" className="text-label-lg font-label-lg text-on-surface-variant ml-1">
                  비밀번호
                </label>
                <input
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="8자 이상 입력해주세요"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full bg-surface-container-low border-transparent focus:border-primary focus:ring-0 rounded-xl py-3.5 px-4 text-body-md transition-all"
                />
              </div>

              {errorMessage && (
                <p className="rounded-lg bg-error-container/20 px-4 py-3 text-body-md text-error">{errorMessage}</p>
              )}

              {/* CTA */}
              <button
                type="submit"
                disabled={isLoading}
                className="bg-gradient-primary w-full py-4 rounded-lg text-label-lg font-label-lg text-white text-center shadow-sm shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all mt-2 disabled:opacity-60"
              >
                {isLoading ? '가입 중...' : role === 'teacher' ? '선생님으로 가입하기' : '학생으로 가입하기'}
              </button>

              {/* Login link */}
              <div className="text-center mt-4">
                <p className="text-body-md font-body-md text-on-surface-variant">
                  이미 계정이 있으신가요?{' '}
                  <Link href={loginHref} className="inline-flex min-h-11 items-center text-primary font-bold hover:underline ml-1">
                    로그인
                  </Link>
                </p>
              </div>

            </form>
          </div>

          {/* Policy */}
          <div className="text-center px-8">
            <p className="text-label-sm font-label-sm text-outline leading-5">
              가입 시 GoSsaem의{' '}
              <button type="button" onClick={() => showToast('이용약관 페이지를 준비 중입니다')} className="inline-flex min-h-11 items-center underline">이용약관</button>
              {' '}및{' '}
              <button type="button" onClick={() => showToast('개인정보처리방침 페이지를 준비 중입니다')} className="inline-flex min-h-11 items-center underline">개인정보처리방침</button>에
              동의하는 것으로 간주됩니다.
            </p>
          </div>

        </div>
      </main>



    </div>
  );
}
