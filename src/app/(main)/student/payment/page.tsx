'use client';

import { PageLoading } from '@/components/shared/PageLoading';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { confirmPayment, getEnrollmentDetail, type EnrollmentDetail } from '@/lib/queries/bookings';
import { computeDiscount, listMyCoupons, type MyCouponRow } from '@/lib/queries/coupons';
import { addWishlist, listWishlistedTeacherIds, removeWishlist } from '@/lib/queries/teachers';
import { useAuthStore } from '@/stores/auth-store';
import { showToast } from '@/components/shared/Toast';

const PAYMENT_METHODS: { id: 'card' | 'paypal' | 'kakaopay'; icon: string; label: string }[] = [
  { id: 'card', icon: 'credit_card', label: '신용/체크 카드' },
  { id: 'paypal', icon: 'payments', label: 'PayPal' },
  { id: 'kakaopay', icon: 'account_balance_wallet', label: '카카오페이' },
];

function formatScheduledAt(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', hour: 'numeric', minute: '2-digit' });
}

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const enrollmentId = searchParams.get('enrollment');

  const [enrollment, setEnrollment] = useState<EnrollmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState<'card' | 'paypal' | 'kakaopay'>('card');
  const [favorite, setFavorite] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [coupons, setCoupons] = useState<MyCouponRow[]>([]);
  const [selectedCouponId, setSelectedCouponId] = useState('');

  useEffect(() => {
    if (!isHydrated) return;
    if (!enrollmentId || !user) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    Promise.all([getEnrollmentDetail(enrollmentId), listWishlistedTeacherIds(user.id), listMyCoupons(user.id)])
      .then(([detail, wishlisted, myCoupons]) => {
        if (cancelled) return;
        setEnrollment(detail);
        if (detail) setFavorite(wishlisted.has(detail.teacherId));
        setCoupons(myCoupons);
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
  }, [enrollmentId, user, isHydrated]);

  const selectedCoupon = coupons.find((coupon) => coupon.userCouponId === selectedCouponId) ?? null;
  const discount = enrollment && selectedCoupon ? computeDiscount(selectedCoupon, enrollment.price) : 0;
  const totalDue = enrollment ? Math.max(enrollment.price - discount, 0) : 0;

  const toggleFavorite = async () => {
    if (!user || !enrollment) return;
    const next = !favorite;
    setFavorite(next);
    try {
      if (next) await addWishlist(user.id, enrollment.teacherId);
      else await removeWishlist(user.id, enrollment.teacherId);
    } catch {
      showToast('찜하기 처리에 실패했습니다');
      setFavorite(!next);
    }
  };

  const handlePay = async () => {
    if (!user || !enrollment || submitting || totalDue > 0) return;
    setSubmitting(true);
    try {
      await confirmPayment({
        enrollmentId: enrollment.id,
        studentId: user.id,
        amount: totalDue,
        method,
        userCouponId: selectedCoupon?.userCouponId,
      });
      router.push(`/student/confirmation?enrollment=${enrollment.id}`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '예약 확정에 실패했습니다. 다시 시도해주세요');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoading />;

  if (!enrollment) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-container-margin text-center">
        <p className="font-headline-md text-headline-md text-on-surface">결제할 예약 정보를 찾을 수 없습니다</p>
        <Link href="/student/search" className="rounded-lg bg-primary px-6 py-3 font-label-lg text-on-primary">
          선생님 검색으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface">
      <div className="flex min-h-14 w-full items-center justify-between bg-surface px-container-margin">
        <Link
          href={`/student/booking/confirm?teacher=${enrollment.teacherId}`}
          className="flex h-10 w-10 items-center justify-center transition-all duration-100 active:scale-[0.98]"
          aria-label="뒤로"
        >
          <span className="material-symbols-outlined text-primary">arrow_back_ios</span>
        </Link>
        <button
          type="button"
          onClick={() => void toggleFavorite()}
          aria-pressed={favorite}
          className="flex h-10 w-10 items-center justify-center transition-all duration-100 active:scale-[0.98]"
          aria-label="찜하기"
        >
          <span className="material-symbols-outlined text-primary" style={favorite ? { fontVariationSettings: "'FILL' 1" } : undefined}>
            favorite
          </span>
        </button>
      </div>

      <main className="mx-auto max-w-lg px-container-margin pb-48 pt-stack-lg">
        <p role="status" className="mb-5 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">{totalDue > 0 ? '유료 결제는 준비 중입니다. 현재 금액이 청구되거나 예약이 확정되지 않습니다.' : '무료 예약은 금액과 쿠폰을 확인한 뒤 확정됩니다.'} 예약 대기 좌석은 15분간 유지됩니다.</p>
        <section className="soft-card-shadow mb-stack-lg flex items-center gap-4 rounded-xl bg-surface-container-lowest p-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-primary/10 font-headline-lg text-headline-lg text-primary">
            {enrollment.teacherName.slice(0, 1)}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <h2 className="font-headline-md text-headline-md">{enrollment.teacherName}쌤</h2>
            </div>
            {enrollment.teacherHeadline && <p className="mt-1 font-body-md text-on-surface-variant">{enrollment.teacherHeadline}</p>}
            <div className="mt-2 flex items-center gap-2 font-label-sm text-label-sm text-primary">
              <span className="material-symbols-outlined text-sm">calendar_today</span>
              <span>{formatScheduledAt(enrollment.scheduledAt)}</span>
            </div>
          </div>
        </section>

        <section className="mb-stack-lg">
          <h3 className="mb-stack-md font-headline-md text-headline-md">결제 수단</h3>
          <div className="space-y-3">
            {PAYMENT_METHODS.map((item) => {
              const active = method === item.id;
              return (
                <label
                  key={item.id}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border-2 bg-surface-container-lowest p-4 transition-transform active:scale-[0.98] ${
                    active ? 'border-primary' : 'border-transparent hover:border-outline-variant'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined ${active ? 'text-primary' : 'text-outline'}`}>{item.icon}</span>
                    <span className="font-label-lg text-label-lg">{item.label}</span>
                  </div>
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 p-1 ${active ? 'border-primary' : 'border-outline-variant'}`}>
                    {active && <div className="h-full w-full rounded-full bg-primary" />}
                  </div>
                  <input checked={active} className="hidden" name="payment_method" type="radio" onChange={() => setMethod(item.id)} />
                </label>
              );
            })}
          </div>
        </section>

        <section className="mb-stack-lg">
          <h3 className="mb-stack-md font-headline-md text-headline-md">쿠폰 사용</h3>
          {coupons.length === 0 ? (
            <button
              type="button"
              onClick={() => showToast('사용 가능한 쿠폰이 없습니다')}
              className="flex w-full items-center justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-4 text-outline transition-colors active:bg-surface-container-low"
            >
              <span className="font-body-md text-body-md">쿠폰 선택</span>
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          ) : (
            <select
              value={selectedCouponId}
              onChange={(event) => setSelectedCouponId(event.target.value)}
              className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest p-4 font-body-md text-on-surface transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">쿠폰 미사용</option>
              {coupons.map((coupon) => (
                <option key={coupon.userCouponId} value={coupon.userCouponId}>
                  {coupon.title} ({coupon.discountType === 'fixed' ? `₩${coupon.discountValue.toLocaleString()}` : `${coupon.discountValue}%`} 할인)
                </option>
              ))}
            </select>
          )}
        </section>

        <section className="mb-stack-lg rounded-xl bg-surface-container-low p-5">
          <h3 className="mb-4 font-headline-md text-headline-md">결제 금액</h3>
          <div className="space-y-3">
            <div className="flex justify-between font-body-md text-body-md text-on-surface-variant">
              <span>수업 금액</span>
              <span>{enrollment.price === 0 ? '무료' : `₩${enrollment.price.toLocaleString()}`}</span>
            </div>
            <div className="flex justify-between font-body-md text-body-md text-on-surface-variant">
              <span>할인 금액</span>
              <span className="text-secondary">- ₩{discount.toLocaleString()}</span>
            </div>
            <div className="my-2 h-px bg-outline-variant" />
            <div className="mt-2 flex items-center justify-between">
              <span className="font-headline-md text-headline-md">총 결제 금액</span>
              <span className="font-display-lg text-display-lg text-primary">{totalDue === 0 ? '무료' : `₩${totalDue.toLocaleString()}`}</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="fixed bottom-20 left-0 z-50 w-full border-t border-outline-variant bg-surface px-container-margin py-3">
        <div className="mx-auto max-w-lg">
          <button
            type="button"
            onClick={() => void handlePay()}
            disabled={submitting || totalDue > 0}
            className="block w-full rounded-lg bg-gradient-to-r from-primary to-secondary-container py-3 text-center font-label-lg text-label-lg text-on-primary shadow-sm transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? '예약 확정 중...' : totalDue > 0 ? '유료 결제 준비 중' : '무료 예약 확정하기'}
          </button>
        </div>
      </footer>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <PaymentContent />
    </Suspense>
  );
}
