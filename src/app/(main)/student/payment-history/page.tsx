'use client';

import { PageContent } from '@/components/shared/PageContent';
import Link from 'next/link';
import { ListPager } from '@/components/shared/ListPager';
import { useEffect, useState } from 'react';
import { showToast } from '@/components/shared/Toast';
import { listPaymentHistory, type PaymentHistoryItem } from '@/lib/queries/bookings';
import { useAuthStore } from '@/stores/auth-store';

const FILTERS = ['전체', '결제 완료', '결제 취소'] as const;

const METHOD_LABEL: Record<PaymentHistoryItem['method'], string> = {
  card: '신용카드 결제',
  paypal: 'PayPal 결제',
  kakaopay: '카카오페이 결제',
};

const STATUS_LABEL: Record<PaymentHistoryItem['status'], string> = {
  succeeded: '결제 완료',
  pending: '결제 대기',
  refunded: '환불 완료',
  cancelled: '결제 취소',
};

function isCanceled(status: PaymentHistoryItem['status']) {
  return status === 'cancelled' || status === 'refunded';
}

function formatDate(iso: string) {
  const date = new Date(iso);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

function formatAmount(amount: number, currency: string) {
  if (currency !== 'KRW') return `${amount.toLocaleString()} ${currency}`;
  return `₩${amount.toLocaleString()}`;
}

export default function PaymentHistoryPage() {
  const [page, setPage] = useState(1);
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]>('전체');
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setPayments([]);

    listPaymentHistory(user.id, page, activeFilter)
      .then((data) => {
        if (!cancelled) setPayments(data);
      })
      .catch(() => {
        if (!cancelled) showToast('결제 내역을 불러오지 못했습니다');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, isHydrated, page, activeFilter]);

  const visiblePayments = payments;

  return (
    <PageContent loading={loading}>
    <div className="flex min-h-screen flex-col bg-background pb-24 text-on-background">
      <div className="w-full bg-surface shadow-sm">
        <div className="relative mx-auto flex h-16 w-full max-w-4xl items-center justify-between px-container-margin">
          <Link href="/student/profile" className="flex items-center justify-center rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container active:scale-[0.98]" aria-label="뒤로가기">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <h1 className="font-headline-md text-headline-md font-bold text-primary">결제 내역</h1>
          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((prev) => !prev)}
              aria-expanded={filterOpen}
              className="flex items-center justify-center rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container active:scale-[0.98]"
              aria-label="필터"
            >
              <span className="material-symbols-outlined">filter_list</span>
            </button>
            {filterOpen && (
              <div className="absolute right-0 top-12 z-50 w-40 overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-lg">
                {FILTERS.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => {
                      setActiveFilter(filter);
                      setPage(1);
                      setFilterOpen(false);
                    }}
                    className={`block w-full px-4 py-3 text-left font-label-lg text-label-lg transition-colors hover:bg-surface-container-low ${
                      activeFilter === filter ? 'text-primary font-semibold' : 'text-on-surface-variant'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-4xl flex-grow flex-col gap-stack-lg px-container-margin pt-stack-lg">
        <div className="flex items-center justify-between rounded-lg bg-surface-container-lowest p-4 shadow-sm">
          <span className="font-label-lg text-label-lg text-on-surface">전체 내역</span>
          <span className="font-label-sm text-label-sm text-outline">{activeFilter} 표시 중</span>
        </div>

        <div className="grid gap-stack-md lg:grid-cols-2">
          {!user && !loading && (
            <p className="col-span-full py-16 text-center font-body-md text-on-surface-variant">로그인 후 결제 내역을 확인할 수 있습니다.</p>
          )}
          {loading && <p className="col-span-full py-16 text-center font-body-md text-on-surface-variant">불러오는 중...</p>}
          {user && !loading && visiblePayments.length === 0 && (
            <p className="col-span-full py-16 text-center font-body-md text-on-surface-variant">해당 조건의 결제 내역이 없습니다.</p>
          )}
          {visiblePayments.map((payment) => {
            const canceled = isCanceled(payment.status);
            return (
              <article
                key={payment.id}
                className={`flex flex-col gap-stack-sm rounded-lg border border-surface-container-high bg-surface-container-lowest p-4 shadow-sm transition-shadow hover:shadow-md ${
                  canceled ? 'opacity-75' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">{formatDate(payment.createdAt)}</span>
                  <span className={`rounded-full px-2 py-1 font-label-sm text-label-sm ${canceled ? 'bg-error-container/20 text-error' : 'bg-primary-container/10 text-primary'}`}>
                    {payment.verified ? STATUS_LABEL[payment.status] : '미검증된 기존 기록'}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-surface-container ${canceled ? 'text-on-surface-variant' : 'text-primary'}`}>
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                      receipt_long
                    </span>
                  </div>
                  <div className="flex-grow">
                    <h3 className={`font-label-lg text-label-lg ${canceled ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}>{payment.title}</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant">{payment.verified && payment.amount === 0 ? '무료 예약 확정' : METHOD_LABEL[payment.method]}</p>
                  </div>
                </div>
                <div className="flex justify-end border-t border-surface-container-highest pt-2">
                  <span className={`font-headline-md text-headline-md ${canceled ? 'text-on-surface-variant line-through' : 'text-primary'}`}>
                    {formatAmount(payment.amount, payment.currency)}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      {user && <ListPager page={page} count={payments.length} loading={loading} onPage={setPage} />}
      </main>
    </div>
    </PageContent>
  );
}
