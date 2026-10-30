'use client';

import { PageContent } from '@/components/shared/PageContent';
import Link from 'next/link';
import { AdminEntry } from '@/components/shared/AdminEntry';
import { TeacherReviewStatus } from '@/components/shared/TeacherReviewStatus';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { showToast } from '@/components/shared/Toast';
import { useAuth } from '@/hooks/useAuth';
import { getTeacherOverview, type TeacherOverview } from '@/lib/queries/teacherOverview';
import { useAuthStore } from '@/stores/auth-store';

const MENU = [
  { icon: 'person', label: '내 정보 관리', href: '/teacher/profile/edit' },
  { icon: 'account_balance', label: '정산 계좌 설정', href: '/teacher/profile/account' },
  { icon: 'rate_review', label: '리뷰 답변 관리', href: '/teacher/profile/reviews' },
  { icon: 'folder_open', label: '수업 자료 보관함', href: '/teacher/profile/materials' },
  { icon: 'support_agent', label: '고객센터', href: '/support' },
];

function formatWon(amount: number) {
  if (amount >= 1_000_000) return `₩${(amount / 1_000_000).toFixed(1)}M`;
  return `₩${amount.toLocaleString()}`;
}

export default function TeacherProfilePage() {
  const router = useRouter();
  const { logout } = useAuth();
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const [overview, setOverview] = useState<TeacherOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    getTeacherOverview(user.id)
      .then((data) => {
        if (!cancelled) setOverview(data);
      })
      .catch(() => {
        if (!cancelled) showToast('프로필 정보를 불러오지 못했습니다');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, isHydrated]);

  const handleLogout = async () => {
    const confirmed = window.confirm('로그아웃 하시겠습니까?');
    if (!confirmed) return;
    try {
      await logout();
      showToast('로그아웃 되었습니다');
      router.push('/onboarding');
    } catch { showToast('로그아웃하지 못했습니다. 다시 시도해주세요.'); }
  };

  const STATS = [
    { label: '총 수익', value: overview ? formatWon(overview.totalRevenue) : '-', className: 'text-primary' },
    { label: '게시된 수업', value: overview ? `${overview.publishedLessonCount}개` : '-', className: 'text-secondary' },
    { label: '평점', value: overview ? overview.ratingAvg.toFixed(1) : '-', className: 'text-on-surface', star: true },
  ];

  return (
    <PageContent loading={loading}>
    <main className="mx-auto min-h-screen w-full max-w-7xl space-y-section-gap bg-background px-container-margin pb-28 pt-stack-lg font-body-md text-on-background">
        <AdminEntry />
      {user && <TeacherReviewStatus key={user.id} profileId={user.id} />}
      <section className="flex items-center gap-4">
        <div className="relative shrink-0">
          {overview?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={overview.name} className="h-20 w-20 rounded-full border-4 border-surface object-cover shadow-md" src={overview.avatarUrl} />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-surface bg-primary/10 font-headline-lg text-headline-lg text-primary shadow-md">
              {(overview?.name ?? '선')[0]}
            </div>
          )}
          {overview?.isVerified && (
            <div className="absolute bottom-0 right-0 rounded-full bg-primary p-1 text-on-primary shadow-sm">
              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                verified
              </span>
            </div>
          )}
        </div>
        <div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface">{loading ? '불러오는 중...' : `${overview?.name ?? '선생님'} 쌤`}</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">{overview?.headline ?? '한국어 선생님'}</p>
        </div>
      </section>



      <section className="grid grid-cols-3 gap-2 sm:gap-gutter-md">
        {STATS.map((stat) => (
          <article key={stat.label} className="flex flex-col items-start space-y-1 rounded-xl bg-surface-container-lowest p-4 text-left shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            <span className="font-body-md text-[12px] text-on-surface-variant">{stat.label}</span>
            <div className="flex items-center gap-1">
              <span className={`font-headline-md text-headline-md font-bold ${stat.className}`}>{stat.value}</span>
              {stat.star && (
                <span className="material-symbols-outlined text-[16px] text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  star
                </span>
              )}
            </div>
          </article>
        ))}
      </section>

      <section>
        <Link href="/teacher/profile/withdraw" className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-5 py-4 font-label-lg text-label-lg font-bold text-on-primary shadow-sm shadow-primary/20 transition-all hover:opacity-90 active:scale-[0.98]">
          <span className="material-symbols-outlined">account_balance_wallet</span>
          출금신청
        </Link>
      </section>

      <section className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
        <ul className="flex flex-col divide-y divide-surface-container">
          {MENU.map((item) => (
            <li key={item.label}>
              <Link href={item.href} className="flex w-full items-center justify-between p-4 transition-colors hover:bg-surface-container-low active:bg-surface-container">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant">{item.icon}</span>
                  <span className="font-body-lg text-body-lg text-on-surface">{item.label}</span>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex justify-start pb-stack-lg pt-stack-sm">
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="flex items-center gap-2 px-1 font-body-md text-body-md text-error transition-opacity hover:opacity-80"
        >
          <span className="material-symbols-outlined">logout</span>
          로그아웃
        </button>
      </section>
    </main>
    </PageContent>
  );
}
