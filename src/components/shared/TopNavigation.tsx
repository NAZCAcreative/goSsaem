'use client';

import Image from 'next/image';
import { SettingsDialog } from './SettingsDialog';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { NotificationLayer } from './NotificationLayer';
import { countUnreadNotifications, subscribeToNotifications } from '@/lib/queries/notifications';
import { useAuthStore } from '@/stores/auth-store';
import { useNavigationStore } from '@/stores/navigation-store';

export function TopNavigation() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const getItems = useNavigationStore((s) => s.getItems);

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // 선생님 모드 판단
  const isTeacher = user ? user.role === 'teacher' : pathname === '/teacher' || pathname.startsWith('/teacher/') || pathname === '/signup/teacher';
  const currentRole = isTeacher ? 'teacher' : 'student';

  // 사용자가 명시한 홈 이동 경로: 선생님 -> /teacher, 학생 -> /student
  const homeHref = isTeacher ? '/teacher' : '/student';
  const profileHref = isTeacher ? '/teacher/profile' : '/student/profile';
  const profileLabel = isTeacher ? '선생님 내 정보' : '학생 내 정보';

  // 관리자 페이지에서 설정된 활성화 메뉴 항목들
  const navItems = getItems(currentRole).filter((item) => item.isActive);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    let cancelled = false;

    countUnreadNotifications(user.id)
      .then((count) => {
        if (!cancelled) setUnreadCount(count);
      })
      .catch(() => {});

    const unsubscribe = subscribeToNotifications(user.id, () => {
      setUnreadCount((prev) => prev + 1);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [user]);

  // 랜딩 페이지 및 인증(로그인/회원가입) 화면에서는 독립 레이아웃을 사용하므로 숨김
  if (
    pathname === '/' ||
    pathname === '/student' ||
    pathname === '/teacher' ||
    pathname === '/login' ||
    pathname.startsWith('/signup')
  ) {
    return null;
  }

  // 비로그인 상태 헤더 (웹 데스크톱 메뉴 + 모바일 대응)
  if (!user) {
    return (
      <header className="global-top-nav sticky top-0 z-[70] flex h-16 w-full items-center justify-between border-b border-surface-container-high bg-white/95 px-container-margin backdrop-blur-md">
        {/* Left: Brand Logo */}
        <Link href={homeHref} aria-label="홈으로 이동" className="flex min-h-11 shrink-0 items-center">
          <Image src="/img/gossaem_logo02.png" alt="GoSsaem" width={2172} height={724} className="h-auto w-24 object-contain sm:w-32" priority />
        </Link>

        {/* Center: Desktop Navigation Bar (웹 전용) */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-3" aria-label="데스크톱 상단 메뉴">
          {navItems.map((item) => {
            const active = item.match.some((path) =>
              path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`)
            );
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? 'bg-primary/10 text-primary font-bold shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                }`}
              >
                <span
                  className="material-symbols-outlined text-[19px] leading-none"
                  style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right: Role Switcher & Auth Actions */}
        <div className="flex items-center gap-2">
          {isTeacher ? (
            <Link
              href="/student"
              className="hidden lg:inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-xs font-bold text-primary hover:bg-primary/15 transition-all"
            >
              <span>🎒 학생 페이지로</span>
              <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <Link
              href="/teacher"
              className="hidden lg:inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-secondary/10 text-xs font-bold text-secondary hover:bg-secondary/15 transition-all"
            >
              <span>👩‍🏫 선생님이신가요?</span>
              <span aria-hidden="true">→</span>
            </Link>
          )}
          <Link href={isTeacher ? '/login?next=%2Fteacher%2Fhome' : '/login'} className="inline-flex min-h-11 items-center whitespace-nowrap rounded-lg px-3 text-sm font-semibold text-on-surface hover:bg-surface-container-low">로그인</Link>
          <Link href={isTeacher ? '/signup/teacher' : '/signup/student'} className="primary-gradient-btn inline-flex min-h-11 items-center whitespace-nowrap rounded-lg px-3.5 text-sm font-bold text-white shadow-xs">회원가입</Link>
        </div>
      </header>
    );
  }

  // 로그인 상태 헤더 (웹 데스크톱 메뉴 + 사용자 정보)
  return (
    <>
      <header className="global-top-nav sticky top-0 z-[70] flex h-16 w-full items-center justify-between border-b border-surface-container-high bg-white/95 px-container-margin backdrop-blur-md">
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-4">
          <Link
            href={homeHref}
            className="flex h-11 items-center shrink-0"
            aria-label="홈으로 이동"
          >
            <Image src="/img/gossaem_logo02.png" alt="GoSsaem" width={2172} height={724} className="h-auto w-24 object-contain sm:w-32" priority />
          </Link>
        </div>

        {/* Center: Desktop Navigation Bar (웹 전용) */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-3" aria-label="데스크톱 상단 메뉴">
          {navItems.map((item) => {
            const active = item.match.some((path) =>
              path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`)
            );
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? 'bg-primary/10 text-primary font-bold shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                }`}
              >
                <span
                  className="material-symbols-outlined text-[19px] leading-none"
                  style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right: Role Switcher & User Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {isTeacher ? (
            <Link
              href="/student"
              className="hidden xl:inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-xs font-bold text-primary hover:bg-primary/15 transition-all mr-1"
            >
              <span>🎒 학생 모드 둘러보기</span>
              <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <Link
              href="/teacher"
              className="hidden xl:inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-secondary/10 text-xs font-bold text-secondary hover:bg-secondary/15 transition-all mr-1"
            >
              <span>👩‍🏫 선생님이신가요?</span>
              <span aria-hidden="true">→</span>
            </Link>
          )}

          <SettingsDialog />
          <button
            type="button"
            className="relative flex h-11 w-11 items-center justify-center rounded-lg hover:bg-surface-container-low"
            aria-label="알림"
            aria-expanded={notificationsOpen}
            onClick={() => {
              setNotificationsOpen(true);
              setUnreadCount(0);
            }}
          >
            <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-error ring-2 ring-white" aria-hidden="true" />
            )}
          </button>
          <Link className="flex h-11 w-11 items-center justify-center rounded-lg transition-transform active:scale-[0.98]" href={profileHref} aria-label={profileLabel}>
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={profileLabel}
                className="h-9 w-9 rounded-full border-2 border-primary-fixed object-cover shadow-sm"
                src={user.avatarUrl}
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-primary-fixed bg-primary/10 font-label-lg text-label-lg text-primary shadow-sm">
                {user?.name?.slice(0, 1) ?? '?'}
              </div>
            )}
          </Link>
        </div>
      </header>
      <NotificationLayer open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    </>
  );
}
