'use client';

import { PageContent } from '@/components/shared/PageContent';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { showToast } from '@/components/shared/Toast';
import { listMyCoupons, registerCouponByCode, type MyCouponRow } from '@/lib/queries/coupons';
import { useAuthStore } from '@/stores/auth-store';

export default function CouponsPage() {
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const [code, setCode] = useState('');
  const [coupons, setCoupons] = useState<MyCouponRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  const reload = async () => {
    if (!user) return;
    setCoupons(await listMyCoupons(user.id));
  };

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      setLoading(false);
      return;
    }
    void reload()
      .catch(() => showToast('쿠폰 목록을 불러오지 못했습니다'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isHydrated]);

  const handleRegister = async () => {
    if (!user) return;
    if (!code.trim()) {
      showToast('쿠폰 코드를 입력해주세요');
      return;
    }
    setRegistering(true);
    try {
      await registerCouponByCode(user.id, code);
      showToast('쿠폰이 등록되었습니다');
      setCode('');
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '쿠폰 등록에 실패했습니다');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <PageContent loading={loading}>
    <div className="min-h-screen bg-surface pb-24 text-on-surface antialiased">
      <div className="flex h-16 w-full items-center gap-3 px-container-margin">
        <Link href="/student/profile" className="rounded-lg p-2 text-primary transition-transform hover:opacity-80 active:scale-[0.98]" aria-label="뒤로가기">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile font-bold text-primary">쿠폰함</h1>
      </div>

      <main className="flex flex-col gap-section-gap px-container-margin pt-stack-lg">
        <section className="flex flex-col gap-stack-sm">
          <label className="font-label-lg text-label-lg text-on-surface" htmlFor="coupon-code">
            쿠폰 등록
          </label>
          <div className="flex gap-2">
            <input
              id="coupon-code"
              className="flex-1 rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 font-body-md text-body-md transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="쿠폰 코드를 입력하세요"
              type="text"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
            <button
              type="button"
              onClick={() => void handleRegister()}
              disabled={registering}
              className="rounded-lg primary-gradient-btn px-6 py-3 font-label-lg text-label-lg text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {registering ? '등록 중...' : '등록'}
            </button>
          </div>
        </section>

        <section className="flex flex-col gap-stack-md">
          <h2 className="font-headline-md text-headline-md text-on-surface">사용 가능한 쿠폰</h2>
          {loading && <p className="py-8 text-center font-body-md text-on-surface-variant">불러오는 중...</p>}
          {!loading && coupons.length === 0 && <p className="py-8 text-center font-body-md text-on-surface-variant">보유한 쿠폰이 없습니다.</p>}
          {coupons.map((coupon) => (
            <article key={coupon.userCouponId} className="coupon-notch relative overflow-hidden rounded-xl bg-surface-container-lowest shadow-md">
              <div className="flex items-center gap-4 bg-gradient-to-r from-primary-fixed to-surface-container-lowest p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary shadow-sm">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                    local_offer
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="font-headline-md text-headline-md font-bold text-primary">
                    {coupon.discountType === 'fixed' ? `₩${coupon.discountValue.toLocaleString()} OFF` : `${coupon.discountValue}% 할인`}
                  </h3>
                  <p className="mt-1 font-label-lg text-label-lg text-on-surface">{coupon.title}</p>
                </div>
              </div>
              <div className="coupon-divider" />
              <div className="flex items-end justify-between bg-surface-container-lowest p-4">
                <div>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    {coupon.expiresAt ? `유효기간: ${new Date(coupon.expiresAt).toLocaleDateString('ko-KR')} 까지` : '유효기간 없음'}
                  </p>
                  {coupon.minOrderAmount > 0 && (
                    <p className="mt-1 font-label-sm text-label-sm text-outline">* {coupon.minOrderAmount.toLocaleString()}원 이상 결제 시 사용 가능</p>
                  )}
                </div>
                <span className="font-label-sm text-label-sm text-outline">결제 시 선택 적용</span>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
    </PageContent>
  );
}
