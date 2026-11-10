'use client';

import Image from 'next/image';
import { SettingsDialog } from './SettingsDialog';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { NotificationLayer } from './NotificationLayer';
import { countUnreadNotifications, subscribeToNotifications } from '@/lib/queries/notifications';
import { useAuthStore } from '@/stores/auth-store';


export function TopNavigation() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const isTeacher = user ? user.role === 'teacher' : pathname === '/teacher' || pathname.startsWith('/teacher/') || pathname === '/signup/teacher';
  const homeHref = user ? (isTeacher ? '/teacher/home' : '/student/home') : (isTeacher ? '/teacher' : '/student');
  const profileHref = isTeacher ? '/teacher/profile' : '/student/profile';
  const profileLabel = isTeacher ? '선생님 내 정보' : '학생 내 정보';

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

  if (pathname === '/' || pathname === '/student' || pathname === '/teacher') return null;

  return (
    <>
      <header className="global-top-nav sticky top-0 z-[70] flex w-full items-center justify-end bg-white/80 h-16 border-b border-surface-container-high px-container-margin backdrop-blur-md">
        <Link
          href={homeHref}
          className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 h-11 items-center"
          aria-label="홈으로 이동"
        >
          <Image src="/img/gossaem_logo01.png" alt="GoSsaem" width={2172} height={724} className="h-auto w-28 object-contain sm:w-36" priority />
        </Link>
        <div className="flex items-center gap-1">
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
