'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import { showToast } from '@/components/shared/Toast';
import { useLessonDraftStore } from '@/stores/lesson-draft-store';
import { LESSON_CATEGORIES as CATEGORIES, LESSON_LEVELS as LEVELS } from '@/lib/lessonOptions';

export default function LessonCreationDetailsPage() {
  const router = useRouter();
  const draft = useLessonDraftStore();

  useEffect(() => {
    if (!draft.type) router.replace('/teacher/lessons/new');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.type]);

  if (!draft.type) return null;

  const handleNext = () => {
    if (!draft.title.trim()) {
      showToast('수업 제목을 입력해주세요');
      return;
    }
    if (!draft.date || !draft.startTime || !draft.endTime) {
      showToast('수업 날짜와 시간을 입력해주세요');
      return;
    }
    if (!draft.freeTrial && (!draft.price || Number(draft.price) <= 0)) {
      showToast('수강료를 입력해주세요');
      return;
    }
    router.push('/teacher/lessons/new/confirm');
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl bg-background px-container-margin pb-48 pt-stack-md font-body-md text-on-background">
      <section className="sticky top-[56px] z-40 -mx-container-margin bg-surface px-container-margin shadow-sm">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/teacher/lessons/new" className="text-primary transition-opacity hover:opacity-80 active:scale-[0.98]" aria-label="이전 단계">
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile font-bold text-primary">수업 개설</h1>
          </div>
          <Link href="/teacher/home" className="text-primary transition-opacity hover:opacity-80 active:scale-[0.98]" aria-label="등록 취소">
            <span className="material-symbols-outlined">close</span>
          </Link>
        </div>
      </section>

      <section className="mb-section-gap mt-stack-md">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-label-sm text-label-sm text-on-surface-variant">Step 2 of 3</span>
          <span className="font-label-sm text-label-sm font-semibold text-primary">상세 정보</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
          <div className="h-full w-2/3 rounded-full primary-gradient" />
        </div>
      </section>

      <h2 className="mb-stack-lg font-headline-md text-headline-md text-on-surface">어떤 수업을 진행하시나요?</h2>

      <form className="space-y-stack-lg" onSubmit={(event) => event.preventDefault()}>
        <section className="flex items-center justify-between rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-stack-md shadow-sm">
          <div className="flex flex-col pr-4">
            <span className="font-label-lg text-label-lg text-on-surface">무료 체험 레슨</span>
            <span className="text-xs text-on-surface-variant">첫 수업을 무료로 제공하여 더 많은 학생을 모집해보세요.</span>
          </div>
          <button
            type="button"
            onClick={() => draft.setFreeTrial(!draft.freeTrial)}
            className={`relative h-6 w-11 rounded-lg transition-colors ${draft.freeTrial ? 'bg-primary' : 'bg-surface-container-high'}`}
            aria-pressed={draft.freeTrial}
            aria-label="무료 체험 레슨 설정"
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${draft.freeTrial ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
          </button>
        </section>

        <FieldCard label="수업 제목" htmlFor="lesson-title">
          <input
            id="lesson-title"
            className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-on-surface transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="예: 기초부터 탄탄하게! 실전 한국어 회화"
            type="text"
            value={draft.title}
            onChange={(event) => draft.setField('title', event.target.value)}
          />
        </FieldCard>

        <FieldCard label="수업 대상">
          <ChipGroup items={LEVELS} selected={draft.level} onSelect={(value) => draft.setField('level', value)} />
        </FieldCard>

        <FieldCard label="카테고리">
          <ChipGroup items={CATEGORIES} selected={draft.category} onSelect={(value) => draft.setField('category', value)} />
          <p className="mt-2 text-xs text-on-surface-variant">* 무료 체험 레슨으로 설정할 경우 0원으로 입력됩니다.</p>
        </FieldCard>

        <FieldCard label="수업 날짜 및 시간 설정">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block font-label-sm text-label-sm text-on-surface-variant" htmlFor="lesson-date">
                수업 날짜
              </label>
              <input
                id="lesson-date"
                type="date"
                className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-on-surface transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                value={draft.date}
                onChange={(event) => draft.setField('date', event.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block font-label-sm text-label-sm text-on-surface-variant" htmlFor="start-time">
                  시작 시간
                </label>
                <input
                  id="start-time"
                  type="time"
                  className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-on-surface transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                  value={draft.startTime}
                  onChange={(event) => draft.setField('startTime', event.target.value)}
                />
              </div>
              <div>
                <label className="mb-2 block font-label-sm text-label-sm text-on-surface-variant" htmlFor="end-time">
                  종료 시간
                </label>
                <input
                  id="end-time"
                  type="time"
                  className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-on-surface transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                  value={draft.endTime}
                  onChange={(event) => draft.setField('endTime', event.target.value)}
                />
              </div>
            </div>
          </div>
        </FieldCard>

        <FieldCard label="회당 수강료 (원)" htmlFor="lesson-price">
          <div className="relative">
            <input
              id="lesson-price"
              className="w-full rounded-md border border-outline-variant bg-surface-container-lowest py-3 pl-4 pr-12 font-body-md text-on-surface transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary disabled:text-on-surface-variant"
              placeholder="0"
              type="number"
              disabled={draft.freeTrial}
              value={draft.freeTrial ? '' : draft.price}
              onChange={(event) => draft.setField('price', event.target.value)}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-body-md text-on-surface-variant">원</span>
          </div>
        </FieldCard>

        <FieldCard label="수업 상세 설명" htmlFor="lesson-description">
          <textarea
            id="lesson-description"
            className="w-full resize-none rounded-md border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-on-surface transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="수강 대상, 커리큘럼, 수업 방식 등을 자세히 적어주세요."
            rows={5}
            value={draft.description}
            onChange={(event) => draft.setField('description', event.target.value)}
          />
        </FieldCard>
      </form>

      <div className="fixed bottom-20 left-0 z-[80] w-full border-t border-surface-variant bg-surface px-container-margin py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] md:left-1/2 md:max-w-3xl md:-translate-x-1/2 md:border-none md:bg-transparent md:shadow-none">
        <button
          type="button"
          onClick={handleNext}
          className="block w-full rounded-xl primary-gradient-btn py-4 text-center font-label-lg text-label-lg text-white shadow-sm transition-opacity hover:opacity-90 active:scale-[0.98]"
        >
          다음 단계로
        </button>
      </div>
    </main>
  );
}

function FieldCard({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-stack-md shadow-sm">
      <label className="mb-stack-sm block font-label-lg text-label-lg text-on-surface" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </section>
  );
}

function ChipGroup({ items, selected, onSelect }: { items: string[]; selected: string; onSelect: (value: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const active = selected === item;
        return (
          <button
            key={item}
            type="button"
            onClick={() => onSelect(item)}
            className={`rounded-lg px-4 py-2 font-label-sm text-label-sm transition-colors ${
              active ? 'border-2 border-primary bg-primary-fixed font-semibold text-primary' : 'border border-outline-variant text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}
