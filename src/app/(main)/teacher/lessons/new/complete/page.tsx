'use client';

import { PageLoading } from '@/components/shared/PageLoading';
import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const CONFETTI = [
  { left: '8%', color: '#ff5147', delay: '0.1s', size: '7px' },
  { left: '18%', color: '#f59e0b', delay: '1.4s', size: '5px' },
  { left: '27%', color: '#121d64', delay: '0.8s', size: '8px' },
  { left: '39%', color: '#ff803c', delay: '2.1s', size: '6px' },
  { left: '52%', color: '#ff5147', delay: '1.1s', size: '5px' },
  { left: '67%', color: '#f59e0b', delay: '0.4s', size: '7px' },
  { left: '78%', color: '#4050b5', delay: '1.8s', size: '6px' },
  { left: '91%', color: '#ff803c', delay: '0.6s', size: '8px' },
];

function CompleteContent() {
  const searchParams = useSearchParams();
  const title = searchParams.get('title') ?? '새 수업';
  const price = Number(searchParams.get('price') ?? '0');

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center overflow-hidden bg-background px-6 pb-32 lg:pb-12 pt-stack-lg font-body-md text-on-background">
      <div className="mb-stack-lg flex h-16 w-full items-center justify-between bg-surface px-5">
        <Link href="/teacher/home" className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low active:scale-[0.98]" aria-label="닫기">
          <span className="material-symbols-outlined">close</span>
        </Link>
        <h1 className="font-headline-md text-headline-md font-bold text-primary">수업 개설 완료</h1>
        <div className="w-10" />
      </div>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {CONFETTI.map((piece, index) => (
          <span
            key={index}
            className="absolute top-0 rounded-sm opacity-0 animate-[confetti-fall_3s_linear_infinite]"
            style={{
              left: piece.left,
              width: piece.size,
              height: piece.size,
              backgroundColor: piece.color,
              animationDelay: piece.delay,
            }}
          />
        ))}
      </div>

      <section className="relative mb-8 mt-8">
        <div className="flex h-40 w-40 animate-[success-bounce_2s_ease-in-out_infinite] items-center justify-center rounded-full primary-gradient shadow-xl">
          <span className="material-symbols-outlined text-7xl text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
            verified
          </span>
        </div>
        <div className="absolute -right-4 -top-4 rounded-full bg-secondary-container p-3 shadow-lg">
          <span className="material-symbols-outlined text-2xl text-on-secondary-container">celebration</span>
        </div>
      </section>

      <section className="mb-10 space-y-3 text-center">
        <h2 className="font-headline-lg text-[24px] font-bold leading-tight text-on-surface">수업 개설이 완료되었습니다!</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          이제 학생들이 선생님의 수업을
          <br />
          예약할 수 있습니다.
        </p>
      </section>

      <section className="relative mb-10 w-full overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
        <div className="absolute left-0 top-0 h-full w-1.5 primary-gradient" />
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-fixed">
              <span className="material-symbols-outlined text-primary">menu_book</span>
            </div>
            <div className="flex-1">
              <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-secondary">New Lesson</span>
              <h3 className="font-headline-md font-semibold leading-snug text-on-surface">{title}</h3>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-surface-container pt-4">
            <span className="font-body-md text-label-lg text-on-surface-variant">수강료</span>
            <span className="font-headline-md text-headline-md font-bold text-primary">{price === 0 ? '무료' : `${price.toLocaleString()} KRW`}</span>
          </div>
        </div>
      </section>

      <section className="w-full space-y-4">
        <Link href="/teacher/lessons" className="flex w-full items-center justify-center gap-2 rounded-xl primary-gradient-btn px-6 py-4 font-headline-md font-bold text-white shadow-sm transition-all active:scale-[0.98]">
          <span>수업 관리하러 가기</span>
          <span className="material-symbols-outlined text-lg">arrow_forward</span>
        </Link>
        <Link href="/teacher/home" className="block w-full rounded-xl border-2 border-primary/20 bg-surface-container-lowest px-6 py-4 text-center font-headline-md font-bold text-primary transition-all hover:bg-surface-container-low active:scale-[0.98]">
          홈으로 이동
        </Link>
      </section>
    </main>
  );
}

export default function TeacherRegisterCompletePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <CompleteContent />
    </Suspense>
  );
}
