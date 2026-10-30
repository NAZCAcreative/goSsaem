'use client';

import Link from 'next/link';
import { LearningPlayground } from '@/components/shared/LearningPlayground';
import { LearningImage } from '@/components/shared/LearningImage';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const STEPS = [
  {
    step: '1',
    icon: 'search',
    bg: 'bg-primary-fixed',
    iconColor: 'text-primary',
    title: '선생님 찾기',
    description: '전문분야와 리뷰를 보고 나에게 맞는 한국어 선생님을 찾아보세요.',
  },
  {
    step: '2',
    icon: 'event_available',
    bg: 'bg-secondary-fixed',
    iconColor: 'text-secondary',
    title: '무료체험 예약',
    description: '부담 없이 무료 체험 레슨으로 선생님을 먼저 만나보세요.',
  },
  {
    step: '3',
    icon: 'school',
    bg: 'bg-tertiary-fixed',
    iconColor: 'text-tertiary',
    title: '학습 시작',
    description: '1:1 수업 또는 그룹 클래스로 꾸준히 한국어를 배워보세요.',
  },
];

export function StudentLanding() {
  const [userCount, setUserCount] = useState<number | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => setUserCount(count ?? null));
  }, []);

  return (
    <div className="bg-background pb-24 text-on-background font-body-md">
      <section className="landing-hero primary-gradient relative overflow-hidden">
        <div className="relative z-10 mx-auto grid max-w-7xl gap-section-gap px-container-margin py-8 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-24">
          <div className="landing-copy order-1 flex flex-col items-center gap-stack-lg text-center lg:order-1 lg:items-start lg:text-left">
            <p className="brand-eyebrow">조금 서툴러도, 함께라서 즐거워요</p>
            <h1 className="font-headline text-[28px] font-extrabold leading-[36px] sm:text-[32px] sm:leading-[40px] tracking-tight text-white lg:text-[52px] lg:leading-[60px]">
              한국어 한 마디,
              <br />
              친구가 되는 시작!
            </h1>
            <p className="max-w-md text-base leading-relaxed text-white/85 lg:text-lg">
              좋아하는 이야기로 웃고, 말하고, 조금씩 가까워져요. 나와 잘 맞는 선생님과 즐거운 한국어를 시작해 보세요.
            </p>

            <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row">
              <Link
                href="/signup/student"
                className="flex h-14 items-center justify-center gap-2 rounded-lg bg-white px-8 text-sm font-semibold text-primary shadow-sm transition-transform active:scale-[0.98]"
              >
                <span>즐겁게 시작하기</span>
                <span className="material-symbols-outlined text-sm leading-none">arrow_forward</span>
              </Link>
              <Link
                href="/teacher"
                className="flex h-14 items-center justify-center rounded-lg border-[1.5px] border-white/40 px-8 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                선생님이신가요?
              </Link>
            </div>

            <p className="text-sm text-white/80">
              이미 계정이 있으신가요?{' '}
              <Link href="/login?next=%2Fstudent%2Fhome" className="inline-flex min-h-11 items-center px-1 font-bold text-white hover:underline">
                로그인
              </Link>{' '}
              ·{' '}
              <Link href="/signup/student" className="inline-flex min-h-11 items-center px-1 font-bold text-white hover:underline">
                회원가입
              </Link>
            </p>

            <div className="mt-stack-md flex flex-col items-center gap-stack-sm lg:items-start">
              <div className="flex -space-x-1" aria-hidden="true">
                {['안', '녕', '!'].map((letter, i) => (
                  <span key={letter} className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ring-2 ring-white ${i === 0 ? 'bg-primary-fixed text-on-primary-fixed' : i === 1 ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-tertiary-fixed text-on-tertiary-fixed'}`}>{letter}</span>
                ))}
              </div>
              <p className="text-xs text-white/80">
                {userCount != null ? `${userCount.toLocaleString()}명이 GoSsaem과 함께하고 있어요` : '전 세계 학습자들과 함께하세요'}
              </p>
            </div>
          </div>

          <div className="order-2 flex justify-center lg:order-2">
            <LearningPlayground />
            <div className="classic-hero-art relative aspect-square w-full max-w-[280px] fade-in lg:max-w-[420px]">
              <div className="absolute inset-0 rounded-full bg-white/10 blur-2xl" />
              <LearningImage scene="desk" className="h-full w-full rounded-full border-4 border-white object-cover shadow-2xl" />
              <div className="absolute bottom-4 right-0 flex items-center gap-2 rounded-xl bg-white/95 px-4 py-3 shadow-lg backdrop-blur-md">
                <span className="material-symbols-outlined text-sm leading-none text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  stars
                </span>
                <span className="whitespace-nowrap text-xs font-medium text-on-surface">평점 높은 선생님들</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-container-margin py-14 lg:py-24">
        <h2 className="text-center font-headline text-2xl font-extrabold text-on-surface lg:text-left lg:text-4xl">이렇게 시작해요</h2>
        <div className="mt-section-gap grid gap-gutter-md sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.step} className="joy-step">
              <span className="inline-block rounded-full border border-outline-variant px-3 py-1 font-label-sm text-label-sm font-bold text-on-surface-variant">
                STEP {s.step}
              </span>
              <div className={`relative mt-4 h-36 overflow-hidden rounded-xl lg:h-44 ${s.bg}`}>
                <LearningImage scene={s.step === '1' ? 'cafe' : s.step === '2' ? 'desk' : 'seoul'} className="h-full w-full transition-transform duration-700 group-hover:scale-105" />
              </div>
              <h3 className="mt-4 font-headline-md text-headline-md font-bold text-on-surface">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">{s.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
