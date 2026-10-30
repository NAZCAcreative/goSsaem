'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { showToast } from '@/components/shared/Toast';
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
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!draft.type) router.replace('/teacher/lessons/new');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.type]);

  if (!draft.type) return null;
  const draftType = draft.type;

  const price = draft.freeTrial ? 0 : Number(draft.price) || 0;
  const capacity = capacityForType(draftType, draft.freeTrial);

  const handleSubmit = async () => {
    if (!user) {
      showToast('로그인이 필요합니다');
      return;
    }
    const scheduledAt = new Date(`${draft.date}T${draft.startTime}:00`);
    if (Number.isNaN(scheduledAt.getTime())) {
      showToast('수업 날짜/시간이 올바르지 않습니다');
      return;
    }

    setSubmitting(true);
    try {
      await createTeacherLessonWithSession({
        teacherId: user.id,
        type: dbTypeForType(draftType, draft.freeTrial),
        category: draft.category,
        title: draft.title,
        level: draft.level,
        price,
        capacity,
        description: draft.description || null,
        scheduledAt: scheduledAt.toISOString(),
        durationMinutes: durationMinutes(draft.startTime, draft.endTime),
      });
      const title = encodeURIComponent(draft.title);
      // reset()이 draft.type을 지우면 이 페이지의 가드 effect(!draft.type -> router.replace)가
      // 먼저 반응해서 등록 완료 화면 대신 1단계로 되돌아가는 레이스가 있었다.
      // 반드시 다음 화면으로의 이동을 먼저 시작한 뒤에 draft를 비운다.
      router.push(`/teacher/lessons/new/complete?title=${title}&price=${price}`);
      reset();
    } catch {
      showToast('수업 등록에 실패했습니다. 다시 시도해주세요');
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
          <div className="h-full w-full rounded-full bg-gradient-to-r from-primary to-secondary-container transition-all duration-500" />
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
                  <span className="rounded bg-primary-fixed-dim/20 px-2 py-1 font-label-sm text-label-sm text-primary">
                    {draft.freeTrial ? '무료 체험' : TYPE_LABELS[draft.type]}
                  </span>
                  <span className="rounded bg-secondary-fixed-dim/20 px-2 py-1 font-label-sm text-label-sm text-secondary">{draft.category}</span>
                  <span className="rounded bg-tertiary-fixed-dim/20 px-2 py-1 font-label-sm text-label-sm text-tertiary">{draft.level}</span>
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
                <p className="font-body-lg text-body-lg text-on-background">{draft.title}</p>
              </div>
            </div>

            <Divider />

            <div className="flex items-start gap-stack-md">
              <IconBadge icon="event" className="bg-secondary-fixed text-secondary" />
              <div className="flex-grow">
                <span className="mb-1 block font-label-sm text-label-sm text-on-surface-variant">수업 일정</span>
                <p className="font-body-lg text-body-lg text-on-background">
                  {draft.date} {draft.startTime} - {draft.endTime}
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
          className="block w-full rounded-lg bg-gradient-to-r from-primary to-secondary-container py-4 text-center font-label-lg text-label-lg text-on-primary shadow-sm transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
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
