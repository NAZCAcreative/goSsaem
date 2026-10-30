'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useLessonDraftStore, type LessonDraftType } from '@/stores/lesson-draft-store';

const LESSON_TYPES = [
  {
    value: '1on1',
    icon: 'person',
    title: '1:1 프리미엄 레슨',
    description: '학생 개인의 목표와 학습 속도에 완벽하게 맞춘 맞춤형 개인 지도 수업입니다.',
    iconClassName: 'bg-primary-fixed text-primary',
  },
  {
    value: 'group',
    icon: 'groups',
    title: '소규모 그룹 클래스',
    description: '최대 4명의 학생과 함께 소통하며 배우는 활기찬 인터랙티브 수업입니다.',
    iconClassName: 'bg-tertiary-fixed text-tertiary',
  },
  {
    value: 'live',
    icon: 'stream',
    title: '오픈 라이브 코스',
    description: '인원 제한 없이 정해진 커리큘럼에 따라 진행되는 대규모 라이브 강의입니다.',
    iconClassName: 'bg-secondary-fixed text-secondary',
  },
];

export default function LessonCreationPage() {
  const router = useRouter();
  const setType = useLessonDraftStore((s) => s.setType);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <main className="relative mx-auto min-h-screen w-full max-w-2xl overflow-hidden bg-surface px-container-margin pb-28 pt-stack-md font-body-md text-on-surface">
      <div className="pointer-events-none absolute left-0 top-0 -z-10 h-96 w-full bg-gradient-to-b from-primary-fixed/40 to-transparent" />

      <div className="flex w-full items-center justify-between py-4">
        <Link
          href="/teacher/home"
          aria-label="뒤로가기"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-low active:scale-[0.98]"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <h1 className="flex-1 text-center font-label-lg text-label-lg font-semibold text-on-surface">수업 개설 - 유형 선택</h1>
        <Link
          href="/teacher/home"
          aria-label="등록 취소"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-low active:scale-[0.98]"
        >
          <span className="material-symbols-outlined">close</span>
        </Link>
      </div>

      <section className="mt-2">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-label-sm text-label-sm font-semibold tracking-wide text-primary">STEP 1 OF 3</span>
          <span className="font-label-sm text-label-sm text-on-surface-variant">기본 정보</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
          <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500" />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 font-headline-lg-mobile text-headline-lg-mobile text-on-surface md:font-headline-lg md:text-headline-lg">
          어떤 형태의 수업을
          <br />
          개설하시겠어요?
        </h2>
        <p className="mb-section-gap font-body-md text-body-md text-on-surface-variant">선생님의 강의 스타일에 가장 잘 맞는 수업 유형을 선택해주세요.</p>

        <div className="grid gap-stack-md">
          {LESSON_TYPES.map((type) => {
            const active = selected === type.value;

            return (
              <button
                key={type.value}
                type="button"
                onClick={() => setSelected(type.value)}
                className={`group relative flex flex-col items-start gap-stack-md overflow-hidden rounded-xl border bg-surface-container-lowest p-stack-lg text-left shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all duration-200 sm:flex-row sm:items-center ${
                  active ? 'border-primary shadow-[0_8px_30px_rgba(94,57,224,0.12)] ring-1 ring-primary' : 'border-outline-variant/30 hover:border-primary/50'
                }`}
              >
                <div className={`absolute inset-0 bg-primary/5 transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`} />
                <div
                  className={`relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition-all duration-300 group-hover:scale-105 ${
                    active ? 'bg-gradient-to-br from-primary to-secondary text-on-primary' : type.iconClassName
                  }`}
                >
                  <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {type.icon}
                  </span>
                </div>
                <div className="relative z-10 flex-1 pr-8 sm:pr-0">
                  <h3 className={`mb-1 font-headline-md text-headline-md transition-colors ${active ? 'text-primary' : 'text-on-surface group-hover:text-primary'}`}>{type.title}</h3>
                  <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant">{type.description}</p>
                </div>
                <div
                  className={`absolute right-6 top-6 z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors sm:relative sm:right-0 sm:top-0 ${
                    active ? 'border-primary bg-primary' : 'border-outline-variant'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[16px] text-on-primary transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`} style={{ fontVariationSettings: "'wght' 700" }}>
                    check
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-stack-lg">
        <button
          type="button"
          disabled={!selected}
          onClick={() => {
            if (!selected) return;
            setType(selected as LessonDraftType);
            router.push('/teacher/lessons/new/details');
          }}
          className={`h-14 w-full rounded-lg font-label-lg transition-all ${
            selected ? 'bg-gradient-to-r from-primary to-secondary text-on-primary shadow-md hover:opacity-90 active:scale-[0.98]' : 'cursor-not-allowed bg-surface-container-high text-on-surface-variant'
          }`}
        >
          다음
        </button>
      </div>
    </main>
  );
}
