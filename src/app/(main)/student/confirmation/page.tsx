'use client';

import { PageLoading } from '@/components/shared/PageLoading';
import { PageContent } from '@/components/shared/PageContent';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getEnrollmentDetail, type EnrollmentDetail } from '@/lib/queries/bookings';
import { showToast } from '@/components/shared/Toast';

function formatScheduledAt(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', hour: 'numeric', minute: '2-digit' });
}

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const enrollmentId = searchParams.get('enrollment');
  const [enrollment, setEnrollment] = useState<EnrollmentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enrollmentId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    getEnrollmentDetail(enrollmentId)
      .then((detail) => {
        if (!cancelled) setEnrollment(detail);
      })
      .catch(() => {
        if (!cancelled) showToast('예약 정보를 불러오지 못했습니다');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enrollmentId]);

  return (
    <PageContent loading={loading}>
    <div className="flex min-h-screen flex-col bg-surface font-body-md text-on-surface">
      <div className="flex h-16 w-full items-center justify-between bg-transparent px-container-margin">
        <Link href="/student/home" className="rounded-lg p-2 transition-all duration-100 hover:bg-surface-container-low active:scale-[0.98]" aria-label="닫기">
          <span className="material-symbols-outlined text-on-surface">close</span>
        </Link>
        <div className="w-10" />
      </div>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center px-container-margin pb-32">
        <div className="flex w-full flex-col items-center pt-8">
          <div className="relative mb-6 h-32 w-32">
            <div className="absolute inset-0 animate-pulse rounded-full bg-primary opacity-10" />
            <div className="absolute inset-2 rounded-full bg-primary-container opacity-20" />
            <div className="primary-gradient absolute inset-4 flex items-center justify-center rounded-full shadow-lg">
              <span className="material-symbols-outlined text-5xl text-white" style={{ fontVariationSettings: "'wght' 700" }}>
                check
              </span>
            </div>
            <span className="material-symbols-outlined absolute -right-2 -top-2 animate-bounce text-secondary-container" style={{ fontVariationSettings: "'FILL' 1" }}>
              auto_awesome
            </span>
            <span className="material-symbols-outlined absolute bottom-4 -left-4 animate-ping text-tertiary-container text-[16px]">star</span>
          </div>
          <h1 className="mb-stack-sm text-center font-headline-lg-mobile text-headline-lg-mobile">
            {enrollment?.price === 0 ? '예약이 확정되었어요.' : '결제가 완료되었어요.'}
          </h1>
          <p className="px-8 text-center text-on-surface-variant">선생님과의 즐거운 수업이 기다리고 있어요.</p>
        </div>

        {loading && <p className="mt-10 font-body-md text-on-surface-variant">불러오는 중...</p>}

        {!loading && enrollment && (
          <div className="mt-10 w-full rounded-xl border border-surface-container bg-surface-container-lowest p-stack-lg shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-stack-md border-b border-surface-variant pb-stack-md">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 font-headline-md text-headline-md text-primary">
                {enrollment.teacherName.slice(0, 1)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-headline-md text-headline-md">{enrollment.teacherName}쌤</h3>
                </div>
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  {enrollment.durationMinutes}분 | {enrollment.sessionTitle}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-stack-sm py-stack-md">
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant">수업 일시</span>
                <span className="font-label-lg text-label-lg">{formatScheduledAt(enrollment.scheduledAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant">결제 금액</span>
                <span className="font-label-lg text-label-lg text-primary">
                  {enrollment.price === 0 ? '무료' : `₩${enrollment.price.toLocaleString()}`}
                </span>
              </div>
            </div>
          </div>
        )}

        {!loading && !enrollment && (
          <p className="mt-10 font-body-md text-on-surface-variant">예약 정보를 찾을 수 없습니다.</p>
        )}

        <div className="mt-stack-md flex w-full items-center gap-stack-md rounded-xl bg-surface-container-low p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary-container">
            <span className="material-symbols-outlined">notifications_active</span>
          </div>
          <div className="flex-1">
            <p className="font-label-lg text-label-lg">수업 10분 전 알림</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant">잊지 않도록 푸시 알림을 보내드릴게요!</p>
          </div>
          <span className="material-symbols-outlined text-outline">chevron_right</span>
        </div>

        <div className="mt-auto flex w-full flex-col gap-stack-md pt-10">
          <button
            type="button"
            onClick={() => showToast('수업 10분 전에 수업 링크를 알림으로 보내드릴게요')}
            className="primary-gradient flex h-14 w-full items-center justify-center gap-2 rounded-xl font-headline-md text-headline-md text-white shadow-sm transition-all duration-100 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined">link</span>
            수업 링크 확인
          </button>
          <Link
            href="/student/bookings"
            className="flex h-14 w-full items-center justify-center rounded-xl border-2 border-primary bg-white font-headline-md text-headline-md text-primary transition-all duration-100 active:scale-[0.98]"
          >
            내 예약 보기
          </Link>
        </div>
      </main>
    </div>
    </PageContent>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ConfirmationContent />
    </Suspense>
  );
}
