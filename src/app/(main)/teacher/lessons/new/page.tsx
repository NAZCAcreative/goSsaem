'use client';

import { showWarning } from '@/components/shared/AlertDialog';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useLessonDraftStore, type LessonDraftType } from '@/stores/lesson-draft-store';


type LessonTypeOption = {
  value: LessonDraftType;
  icon: string;
  title: string;
  description: string;
  badge?: string;
  badgeClassName?: string;
  iconClassName: string;
  disabled?: boolean;
};

const LESSON_TYPES: LessonTypeOption[] = [
  {
    value: 'group',
    icon: 'groups',
    title: '소규모 그룹 클래스 (2명)',
    description: '기본 2명의 학생과 함께 소통하며 배우는 그룹 수업입니다. (3~4명은 관리자 승인 필요)',
    badge: '기본 개설 · 2인 그룹',
    badgeClassName: 'bg-primary/10 text-primary border border-primary/20',
    iconClassName: 'bg-primary-fixed text-primary',
    disabled: false,
  },
  {
    value: '1on1',
    icon: 'person',
    title: '1:1 프리미엄 레슨',
    description: '학생 개인의 목표와 학습 속도에 완벽하게 맞춘 맞춤형 개인 지도 수업입니다.',
    badge: '🔒 현재 미지원 · 관리자 승인 필요',
    badgeClassName: 'bg-slate-200 text-on-surface border border-slate-300 font-semibold',
    iconClassName: 'bg-slate-200 text-on-surface-variant',
    disabled: true,
  },
];

export default function LessonCreationPage() {
  const router = useRouter();
  const setType = useLessonDraftStore((s) => s.setType);
  const setField = useLessonDraftStore((s) => s.setField);
  // 수업개설은 무조건 그룹 두명으로 시작
  const [selected, setSelected] = useState<LessonDraftType>('group');

  const handleSelect = (type: LessonTypeOption) => {
    if (type.disabled) {
      showWarning('1:1 프리미엄 레슨은 관리자 승인이 있어야 개설할 수 있습니다. 기본 소규모 그룹 클래스(2명)로 개설해주세요.');
      return;
    }
    setSelected(type.value);
  };

  const handleNext = () => {
    if (selected === '1on1') {
      showWarning('1:1 프리미엄 레슨은 관리자 승인이 있어야 개설할 수 있습니다.');
      return;
    }
    setType('group');
    setField('capacity', 2);
    router.push('/teacher/lessons/new/details');
  };

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
          <div className="h-full w-1/3 rounded-full primary-gradient transition-all duration-500" />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 font-headline-lg-mobile text-headline-lg-mobile text-on-surface md:font-headline-lg md:text-headline-lg">
          수업 유형 선택
        </h2>
        <p className="mb-section-gap font-body-md text-body-md text-on-surface-variant">
          수업 개설은 <span className="font-bold text-primary">기본 2명 소규모 그룹</span>으로 시작됩니다.
        </p>

        <div className="grid gap-stack-md">
          {LESSON_TYPES.map((type) => {
            const active = selected === type.value;
            const isDisabled = type.disabled;

            return (
              <button
                key={type.value}
                type="button"
                onClick={() => handleSelect(type)}
                className={`group relative flex flex-col items-start gap-stack-md overflow-hidden rounded-xl border p-stack-lg text-left shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all duration-200 sm:flex-row sm:items-center ${
                  isDisabled
                    ? 'cursor-not-allowed border-outline-variant/30 bg-slate-50/80 opacity-60'
                    : active
                    ? 'border-primary bg-surface-container-lowest shadow-[0_8px_30px_rgba(255,81,71,0.15)] ring-2 ring-primary/40'
                    : 'border-outline-variant/30 bg-surface-container-lowest hover:border-primary/50'
                }`}
              >
                {!isDisabled && (
                  <div className={`absolute inset-0 bg-primary/5 transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`} />
                )}
                <div
                  className={`relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                    active && !isDisabled ? 'primary-gradient text-white' : type.iconClassName
                  }`}
                >
                  <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {type.icon}
                  </span>
                </div>
                <div className="relative z-10 flex-1 pr-8 sm:pr-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h3 className={`font-headline-md text-headline-md font-bold transition-colors ${
                      isDisabled ? 'text-on-surface-variant' : active ? 'text-primary' : 'text-on-surface group-hover:text-primary'
                    }`}>
                      {type.title}
                    </h3>
                    {type.badge && (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${type.badgeClassName || 'bg-slate-100 text-on-surface-variant'}`}>
                        {type.badge}
                      </span>
                    )}
                  </div>
                  <p className={`font-body-md text-body-md leading-relaxed ${isDisabled ? 'text-outline' : 'text-on-surface-variant'}`}>
                    {type.description}
                  </p>
                </div>
                <div
                  className={`absolute right-6 top-6 z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors sm:relative sm:right-0 sm:top-0 ${
                    isDisabled
                      ? 'border-slate-300 bg-slate-200 text-outline'
                      : active
                      ? 'border-primary bg-primary text-white'
                      : 'border-outline-variant'
                  }`}
                >
                  {isDisabled ? (
                    <span className="material-symbols-outlined text-[13px]">lock</span>
                  ) : (
                    <span className={`material-symbols-outlined text-[16px] text-on-primary transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`} style={{ fontVariationSettings: "'wght' 700" }}>
                      check
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-stack-lg">
        <button
          type="button"
          onClick={handleNext}
          className="h-14 w-full rounded-xl primary-gradient-btn font-label-lg text-white shadow-md transition-all active:scale-[0.98]"
        >
          다음 단계로 (기본 2명 소규모 그룹)
        </button>
      </div>
    </main>
  );
}
