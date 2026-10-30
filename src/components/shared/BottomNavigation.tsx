'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

type NavItem = {
  icon: string;
  label: string;
  href: string;
  match: string[];
};

const STUDENT_NAV_ITEMS: NavItem[] = [
  { icon: 'home', label: '홈', href: '/student/home', match: ['/student/home', '/'] },
  { icon: 'search', label: '검색', href: '/student/search', match: ['/student/search', '/teachers'] },
  { icon: 'calendar_today', label: '예약', href: '/student/bookings', match: ['/student/bookings', '/student/booking/confirm', '/student/payment', '/student/confirmation'] },
  { icon: 'chat_bubble', label: '채팅', href: '/student/chat', match: ['/student/chat'] },
  {
    icon: 'person',
    label: '마이',
    href: '/student/profile',
    match: ['/student/profile', '/student/coupons', '/student/wishlist', '/student/reviews', '/student/payment-history', '/notification-settings', '/notifications', '/support'],
  },
];

const TEACHER_NAV_ITEMS: NavItem[] = [
  { icon: 'home', label: '홈', href: '/teacher/home', match: ['/teacher/home'] },
  { icon: 'menu_book', label: '수업관리', href: '/teacher/lessons', match: ['/teacher/lessons'] },
  { icon: 'add_circle', label: '수업 개설', href: '/teacher/lessons/new', match: ['/teacher/lessons/new'] },
  { icon: 'chat_bubble', label: '채팅', href: '/teacher/chat', match: ['/teacher/chat'] },
  { icon: 'person', label: '마이', href: '/teacher/profile', match: ['/teacher/profile'] },
];

export function BottomNavigation() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const items = user?.role === 'teacher' ? TEACHER_NAV_ITEMS : STUDENT_NAV_ITEMS;
  if (['/', '/student', '/teacher', '/login', '/register'].includes(pathname) || pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/signup')) return null;

  return (
    <nav aria-label="주요 메뉴" className="global-bottom-nav fixed bottom-0 left-0 z-[70] flex h-[var(--bottom-nav-height)] w-full items-center justify-around border-t border-outline-variant/40 bg-surface-container-lowest px-2 pb-[env(safe-area-inset-bottom)]">
      {items.map((item) => {
        const active = item.href === '/teacher/lessons'
          ? pathname.startsWith('/teacher/lessons') && !pathname.startsWith('/teacher/lessons/new')
          : item.match.some((path) => (path === '/' ? pathname === '/' : (pathname === path || pathname.startsWith(`${path}/`))));

        return (
          <Link
            key={item.label}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`flex h-14 flex-1 max-w-20 flex-col items-center justify-center rounded-xl px-2 py-1.5 transition-all active:scale-[0.98] ${
              active ? 'bg-primary-container font-bold text-on-primary-container' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary'
            }`}
          >
            <span
              className="material-symbols-outlined text-[26px] leading-none"
              style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {item.icon}
            </span>
            <span className="mt-1 whitespace-nowrap text-[12px] font-semibold leading-none">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
