'use client';

import { showError } from '@/components/shared/AlertDialog';

import { PageContent } from '@/components/shared/PageContent';
import Link from 'next/link';
import { ListPager } from '@/components/shared/ListPager';
import { useEffect, useState } from 'react';
import { listMyEnrollments, type MyEnrollment } from '@/lib/queries/bookings';
import { useAuthStore } from '@/stores/auth-store';

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  pending_payment: { label: '결제 대기', className: 'bg-secondary-fixed text-secondary' },
  confirmed: { label: '예약 확정', className: 'bg-primary-fixed text-primary' },
  completed: { label: '수업 완료', className: 'bg-surface-container-high text-on-surface-variant' },
  cancelled: { label: '취소됨', className: 'bg-error-container/20 text-error' },
  no_show: { label: '불참', className: 'bg-error-container/20 text-error' },
};

function formatScheduledAt(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', hour: 'numeric', minute: '2-digit' });
}

export default function MyBookingsListPage() {
  const [page, setPage] = useState(1);
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const [bookings, setBookings] = useState<MyEnrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setBookings([]);

    listMyEnrollments(user.id, page)
      .then((data) => {
        if (!cancelled) setBookings(data);
      })
      .catch(() => {
        if (!cancelled) showError('예약 내역을 불러오지 못했습니다');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, isHydrated, page]);

  return (
    <PageContent loading={loading}>
    <div className="min-h-screen bg-background pb-32 font-body-md text-on-background">
      <div className="mx-auto flex w-full max-w-4xl items-center gap-3 px-container-margin pt-stack-md">
        <Link href="/student/home" className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-surface-container" aria-label="뒤로가기">
          <span className="material-symbols-outlined text-on-surface">arrow_back</span>
        </Link>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile font-bold text-primary">내 예약</h1>
      </div>

      <main className="mx-auto w-full max-w-4xl px-container-margin pt-stack-lg">
        {!user && (
          <p className="py-16 text-center font-body-md text-on-surface-variant">로그인 후 예약 내역을 확인할 수 있습니다.</p>
        )}
        {user && loading && <p className="py-16 text-center font-body-md text-on-surface-variant">불러오는 중...</p>}
        {user && !loading && bookings.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="font-body-md text-on-surface-variant">아직 예약한 수업이 없습니다.</p>
            <Link href="/student/search" className="rounded-lg bg-primary px-6 py-3 font-label-lg text-on-primary">
              선생님 찾아보기
            </Link>
          </div>
        )}

        <div className="space-y-gutter-md">
          {bookings.map((booking) => {
            const status = STATUS_LABEL[booking.status] ?? { label: booking.status, className: 'bg-surface-container-high text-on-surface-variant' };
            return (
              <article
                key={booking.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-surface-container-high bg-surface-container-lowest p-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)]"
              >
                <div className="min-w-0">
                  <p className="truncate font-headline-md text-headline-md text-on-surface">{booking.teacherName}쌤</p>
                  <p className="mt-1 font-body-md text-body-md text-on-surface-variant">{booking.sessionTitle}</p>
                  <p className="mt-1 font-label-sm text-label-sm text-primary">{formatScheduledAt(booking.scheduledAt)}</p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 font-label-sm text-label-sm ${status.className}`}>{status.label}</span>
              </article>
            );
          })}
        </div>
      {user && <ListPager page={page} count={bookings.length} loading={loading} onPage={setPage} />}
      </main>
    </div>
    </PageContent>
  );
}
