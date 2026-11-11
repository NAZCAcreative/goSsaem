'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useNavigationStore, isNavItemActive } from '@/stores/navigation-store';

export function BottomNavigation() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const getItems = useNavigationStore((state) => state.getItems);

  const isTeacher = user ? user.role === 'teacher' : pathname === '/teacher' || pathname.startsWith('/teacher/');
  const currentRole = isTeacher ? 'teacher' : 'student';
  const rawItems = getItems(currentRole);
  const items = rawItems.filter((item) => item.isActive);

  // 랜딩, 로그인, 가입, 관리자 화면에서는 숨김
  if (
    ['/', '/login', '/register', '/teacher/apply'].includes(pathname) ||
    (pathname === '/teacher' && user?.role !== 'teacher') ||
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname.startsWith('/signup')
  ) {
    return null;
  }

  return (
    <nav
      aria-label="모바일 하단 메뉴"
      className="global-bottom-nav fixed bottom-0 left-0 z-[70] flex h-[var(--bottom-nav-height)] w-full items-center justify-around border-t border-outline-variant/40 bg-surface-container-lowest px-2 pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {items.map((item) => {
        const active = isNavItemActive(item, pathname);

        return (
          <Link
            key={item.id || item.label}
            href={user && item.href === `/${currentRole}` ? `/${currentRole}/home` : item.href}
            aria-current={active ? 'page' : undefined}
            className={`flex h-14 flex-1 max-w-20 flex-col items-center justify-center rounded-xl px-2 py-1.5 transition-all active:scale-[0.98] ${
              active
                ? 'bg-primary-container font-bold text-on-primary-container'
                : 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary'
            }`}
          >
            <span
              className="material-symbols-outlined text-[24px] leading-none"
              style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {item.icon}
            </span>
            <span className="mt-1 whitespace-nowrap text-[11px] font-semibold leading-none">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
