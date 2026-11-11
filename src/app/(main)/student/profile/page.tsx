'use client';

import { showError, showConfirm } from '@/components/shared/AlertDialog';

import { PageContent } from '@/components/shared/PageContent';
import Link from 'next/link';
import { AdminEntry } from '@/components/shared/AdminEntry';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { showToast } from '@/components/shared/Toast';
import { useAuth } from '@/hooks/useAuth';
import { getStudentProfile, getStudentStats, type StudentProfile, type StudentStats } from '@/lib/queries/studentProfile';
import { useAuthStore } from '@/stores/auth-store';

const LEVEL_LABEL: Record<string, string> = {
  beginner: '입문',
  elementary: '초급',
  intermediate: '중급',
  advanced: '고급',
  topik1: 'TOPIK I',
  topik2: 'TOPIK II',
};

type MenuItem = {
  icon: string;
  label: string;
  href?: string;
  badge?: string;
  danger?: boolean;
  toastMessage?: string;
};

type MenuGroup = {
  title: string;
  items: MenuItem[];
};

export default function ProfileSetupPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    Promise.all([getStudentProfile(user.id), getStudentStats(user.id)])
      .then(([profileData, statsData]) => {
        if (cancelled) return;
        setProfile(profileData);
        setStats(statsData);
      })
      .catch(() => {
        if (!cancelled) showError('프로필 정보를 불러오지 못했습니다');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, isHydrated]);

  const handleLogout = async () => {
    const confirmed = await showConfirm('로그아웃 하시겠습니까?');
    if (!confirmed) return;
    try {
      await logout();
      showToast('로그아웃 되었습니다');
      router.push('/student/home');
    } catch { showError('로그아웃하지 못했습니다. 다시 시도해주세요.'); }
  };

  const STATS = [
    { icon: 'calendar_today', label: '내 예약', value: String(stats?.bookingsCount ?? 0), color: 'text-primary', href: '/student/bookings' },
    { icon: 'favorite', label: '찜한 선생님', value: String(stats?.wishlistCount ?? 0), color: 'text-secondary', filled: true, href: '/student/wishlist' },
    { icon: 'rate_review', label: '리뷰 관리', value: String(stats?.reviewsCount ?? 0), color: 'text-tertiary', href: '/student/reviews' },
  ];

  const MENU_GROUPS: MenuGroup[] = [
    {
      title: '활동 관리',
      items: [
        { icon: 'receipt_long', label: '결제 내역', href: '/student/payment-history' },
        { icon: 'confirmation_number', label: '쿠폰함', href: '/student/coupons', badge: stats ? `${stats.availableCouponsCount}장` : undefined },
        { icon: 'analytics', label: '학습 리포트', toastMessage: '학습 리포트는 준비 중입니다' },
      ],
    },
    {
      title: '서비스 안내',
      items: [
        { icon: 'campaign', label: '공지사항', toastMessage: '등록된 공지사항이 없습니다' },
        { icon: 'celebration', label: '이벤트', toastMessage: '진행 중인 이벤트가 없습니다' },
        { icon: 'help', label: '고객센터', href: '/support' },
      ],
    },
    {
      title: '설정',
      items: [
        { icon: 'settings', label: '알림 설정', href: '/notification-settings' },
        { icon: 'manage_accounts', label: '계정 관리', toastMessage: '계정 관리는 준비 중입니다' },
        { icon: 'logout', label: '로그아웃', danger: true },
      ],
    },
  ];

  const handleMenuClick = (item: MenuItem) => {
    if (item.label === '로그아웃') {
      void handleLogout();
      return;
    }
    if (item.toastMessage) {
      showToast(item.toastMessage);
    }
  };

  return (
    <PageContent loading={loading}>
    <div className="min-h-screen bg-background text-on-surface antialiased">
      <main className="mx-auto w-full max-w-7xl space-y-8 px-container-margin pb-32 pt-6">
        <AdminEntry />
        <section className="flex flex-col items-center space-y-4 text-center">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-primary/10 shadow-lg">
              {profile?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={profile.name} className="h-full w-full object-cover" src={profile.avatarUrl} />
              ) : (
                <span className="font-headline text-3xl font-bold text-primary">{(profile?.name ?? '학')[0]}</span>
              )}
            </div>
            <Link
              href="/student/profile/edit"
              className="absolute bottom-0 right-0 rounded-lg border-2 border-white bg-primary p-1.5 text-white shadow-md transition-transform hover:scale-110"
              aria-label="프로필 편집"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
            </Link>
          </div>
          <div>
            <h2 className="font-headline text-2xl font-bold text-on-surface">{loading ? '불러오는 중...' : profile?.name ?? '학습자'}</h2>
            <p className="font-medium text-on-surface-variant">{profile ? LEVEL_LABEL[profile.koreanLevel] ?? profile.koreanLevel : ''} 학습자</p>
          </div>
        </section>



        <section className="grid grid-cols-3 gap-3">
          {STATS.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="group flex flex-col items-center rounded-xl bg-surface-container-lowest p-4 text-center shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all active:scale-[0.98]"
            >
              <span
                className={`material-symbols-outlined mb-2 transition-transform group-hover:scale-110 ${stat.color}`}
                style={stat.filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {stat.icon}
              </span>
              <span className="mb-1 text-label-sm text-on-surface-variant">{stat.label}</span>
              <span className="text-lg font-bold text-on-surface">{stat.value}</span>
            </Link>
          ))}
        </section>

        <div className="space-y-6">
          {MENU_GROUPS.map((group) => (
            <section key={group.title}>
              <h4 className="mb-3 px-1 text-label-sm font-bold text-primary">{group.title}</h4>
              <div className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
                {group.items.map((item, index) => {
                  const rowClassName = `flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-surface-container-low active:scale-[0.98] ${
                    index > 0 ? 'border-t border-surface-container' : ''
                  }`;
                  const content = (
                    <>
                      <div className="flex items-center gap-3">
                        <span className={`material-symbols-outlined ${item.danger ? 'text-error' : 'text-on-surface-variant'}`}>{item.icon}</span>
                        <span className={`text-body-md font-medium ${item.danger ? 'text-error' : ''}`}>{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.badge && (
                          <span className="rounded-full bg-secondary-fixed px-2 py-0.5 text-xs font-bold text-on-secondary-fixed-variant">
                            {item.badge}
                          </span>
                        )}
                        <span className="material-symbols-outlined text-outline-variant">chevron_right</span>
                      </div>
                    </>
                  );

                  if (item.href) {
                    return (
                      <Link key={item.label} href={item.href} className={rowClassName}>
                        {content}
                      </Link>
                    );
                  }

                  return (
                    <button key={item.label} type="button" onClick={() => handleMenuClick(item)} className={rowClassName}>
                      {content}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
    </PageContent>
  );
}
