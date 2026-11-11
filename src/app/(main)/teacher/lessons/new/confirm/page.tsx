'use client';

import { showWarning, showError } from '@/components/shared/AlertDialog';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { createTeacherLessonWithSession } from '@/lib/queries/teacherLessons';
import { useLessonDraftStore, type LessonDraftType } from '@/stores/lesson-draft-store';
import { useAuthStore } from '@/stores/auth-store';

const TYPE_LABELS: Record<LessonDraftType, string> = {
  '1on1': '1:1 화상 수업',
  group: '그룹 클래스',
  live: '오픈 라이브 코스',
};

function capacityForType(type: LessonDraftType, freeTrial: boolean): number {
  if (freeTrial || type === '1on1') return 1;
  if (type === 'live') return 20;
  return 6;
}

function dbTypeForType(type: LessonDraftType, freeTrial: boolean): 'group' | '1on1' | 'free_trial' {
  if (freeTrial) return 'free_trial';
  return type === '1on1' ? '1on1' : 'group';
}

function durationMinutes(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const minutes = endH * 60 + endM - (startH * 60 + startM);
  return minutes > 0 ? minutes : 50;
}

export default function LessonCreationConfirmPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const draft = useLessonDraftStore();
  const reset = useLessonDraftStore((s) => s.reset);
  const saved = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!draft.type && !saved.current) router.replace('/teacher/lessons/new');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.type]);

  if (!draft.type) return null;
  const draftType = draft.type;

  const price = draft.freeTrial ? 0 : Number(draft.price) || 0;
  const capacity = capacityForType(draftType, draft.freeTrial);
  const calculatedDuration = draft.schedulingMode === 'request' ? Number(draft.duration) || 50 : durationMinutes(draft.startTime, draft.endTime);

  const handleSubmit = async () => {
    if (submitting || saved.current) return;
    if (!user) {
      showWarning('로그인이 필요합니다');
      return;
    }
    const scheduledAt = new Date(`${draft.date}T${draft.startTime}:00+09:00`);
    if (draft.schedulingMode === 'fixed' && Number.isNaN(scheduledAt.getTime())) {
      showWarning('수업 날짜/시간이 올바르지 않습니다');
      return;
    }

    setSubmitting(true);
    try {
      const result = await createTeacherLessonWithSession({
        teacherId: user.id,
        type: dbTypeForType(draftType, draft.freeTrial),
        category: draft.category,
        language: draft.language || '한국어',
        title: draft.title,
        level: draft.level,
        price,
        capacity,
        description: draft.description || null,
        scheduledAt: draft.schedulingMode === 'fixed' ? scheduledAt.toISOString() : null,
        schedulingMode: draft.schedulingMode,
        availability: draft.weekdays.map((weekday) => ({ weekday, start: draft.startTime, end: draft.endTime })),
        durationMinutes: calculatedDuration,
      });
      saved.current = true;
      router.replace(`/teacher/lessons/${result.lessonId}`);
      reset();
    } catch (error) {
      showError(error instanceof Error ? error.message : '수업 등록에 실패했습니다. 다시 시도해주세요');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col bg-background px-container-margin pb-32 pt-stack-md font-body-md text-on-background">
      <div className="sticky top-[56px] z-40 -mx-container-margin bg-surface px-container-margin shadow-sm">
        <div className="flex h-16 items-center justify-between">
          <Link href="/teacher/lessons/new/details" className="text-on-surface-variant transition-opacity hover:opacity-80 active:scale-[0.98]" aria-label="이전 단계">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <h1 className="font-headline-md text-headline-md font-bold text-primary">수업 등록</h1>
          <div className="w-6" />
        </div>
      </div>

      <section className="mt-stack-md flex flex-col gap-stack-sm">
        <div className="flex items-center justify-between px-1">
          <span className="font-label-lg text-label-lg text-on-surface-variant">Step 3 of 3</span>
          <span className="font-label-lg text-label-lg text-primary">최종 확인</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
          <div className="h-full w-full rounded-full primary-gradient transition-all duration-500" />
        </div>
      </section>

      <section className="mt-section-gap flex flex-col gap-stack-lg">
        <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-background">
          입력하신 정보를
          <br />
          확인해 주세요
        </h2>

        <div className="grid grid-cols-1 gap-stack-md">
          <SummaryCard>
            <div className="flex items-start gap-stack-md">
              <IconBadge icon="category" className="bg-primary-fixed text-primary" />
              <div className="flex-grow">
                <span className="mb-1 block font-label-sm text-label-sm text-on-surface-variant">수업 유형 & 카테고리</span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-primary-fixed-dim/20 px-2 py-1 font-label-sm text-label-sm text-primary font-semibold">
                    {draft.freeTrial ? '무료 체험' : TYPE_LABELS[draft.type]}
                  </span>
                  <span className="rounded bg-secondary-fixed-dim/20 px-2 py-1 font-label-sm text-label-sm text-secondary font-semibold">
                    {draft.category}
                  </span>
                  <span className="rounded bg-tertiary-fixed-dim/20 px-2 py-1 font-label-sm text-label-sm text-tertiary font-semibold">
                    {draft.level}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 font-label-sm text-label-sm text-emerald-700 font-bold">
                    <span className="material-symbols-outlined text-[14px]">translate</span>
                    수업 언어: {draft.language || '한국어'}
                  </span>
                </div>
              </div>
              <Link href="/teacher/lessons/new" className="text-on-surface-variant transition-colors hover:text-primary" aria-label="수업 유형 수정">
                <span className="material-symbols-outlined text-sm">edit</span>
              </Link>
            </div>

            <Divider />

            <div className="flex items-start gap-stack-md">
              <IconBadge icon="title" className="bg-tertiary-fixed text-tertiary" />
              <div className="flex-grow">
                <span className="mb-1 block font-label-sm text-label-sm text-on-surface-variant">수업 제목</span>
                <p className="font-body-lg text-body-lg text-on-background font-semibold">{draft.title}</p>
              </div>
            </div>

            <Divider />

            <div className="flex items-start gap-stack-md">
              <IconBadge icon="event" className="bg-secondary-fixed text-secondary" />
              <div className="flex-grow">
                <span className="mb-1 block font-label-sm text-label-sm text-on-surface-variant">수업 일정 & 진행 시간</span>
                <p className="font-body-lg text-body-lg text-on-background">
                  {draft.schedulingMode === 'fixed'
                    ? `${draft.date} ${draft.startTime} ~ ${draft.endTime} (한국 시간, ${calculatedDuration}분 수업)`
                    : `학생 신청형 · 매주 ${draft.weekdays.map((day) => ['일', '월', '화', '수', '목', '금', '토'][day]).join(', ')} ${draft.startTime} ~ ${draft.endTime} · 회당 ${calculatedDuration}분 수업`}
                </p>
              </div>
            </div>
          </SummaryCard>

          <SummaryCard>
            <div className="flex items-start gap-stack-md">
              <IconBadge icon="payments" className="bg-secondary-fixed text-secondary" />
              <div className="flex-grow">
                <span className="mb-1 block font-label-sm text-label-sm text-on-surface-variant">수업 가격 (1회 기준)</span>
                <p className="font-headline-md text-headline-md text-on-background">
                  {price === 0 ? '무료' : price.toLocaleString()}
                  {price !== 0 && <span className="ml-1 font-body-md text-body-md text-on-surface-variant">KRW</span>}
                </p>
              </div>
              <Link href="/teacher/lessons/new/details" className="text-on-surface-variant transition-colors hover:text-primary" aria-label="상세 정보 수정">
                <span className="material-symbols-outlined text-sm">edit</span>
              </Link>
            </div>

            <Divider />

            <div className="flex items-start gap-stack-md">
              <IconBadge icon="description" className="bg-surface-variant text-on-surface-variant" />
              <div className="flex-grow">
                <span className="mb-1 block font-label-sm text-label-sm text-on-surface-variant">상세 설명</span>
                <p className="line-clamp-3 font-body-md text-sm text-on-surface">{draft.description || '설명이 입력되지 않았습니다.'}</p>
              </div>
            </div>
          </SummaryCard>
        </div>
      </section>

      <div className="flex-grow" />

      <section className="mt-stack-lg">
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting}
          className="block w-full rounded-lg primary-gradient-btn py-4 text-center font-label-lg text-label-lg text-white shadow-sm transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
        >
          {submitting ? '등록 처리 중...' : '등록 완료하기'}
        </button>
        <p className="mt-stack-sm text-center font-label-sm text-label-sm text-on-surface-variant">등록 후 수업 일정 관리가 가능합니다.</p>
      </section>
    </main>
  );
}

function SummaryCard({ children }: { children: React.ReactNode }) {
  return (
    <article className="flex flex-col gap-stack-md rounded-xl border border-surface-container-low bg-surface-container-lowest p-stack-md shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
      {children}
    </article>
  );
}

function IconBadge({ icon, className }: { icon: string; className: string }) {
  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${className}`}>
      <span className="material-symbols-outlined">{icon}</span>
    </div>
  );
}

function Divider() {
  return <div className="h-px w-full bg-surface-container" />;
}
