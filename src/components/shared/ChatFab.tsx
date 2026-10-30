'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChatLayer } from './ChatLayer';
import { countUnreadChatMessages } from '@/lib/queries/chat';
import { useAuthStore } from '@/stores/auth-store';

const HIDDEN_PREFIXES = ['/student/chat', '/teacher/chat', '/onboarding', '/signup', '/login', '/register'];

export function ChatFab() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);

  const isTeacher = user?.role === 'teacher';
  const hidden = ['/', '/student', '/teacher'].includes(pathname) || pathname.startsWith('/admin') || HIDDEN_PREFIXES.some((path) => pathname.startsWith(path));

  useEffect(() => {
    if (!user || open) return;
    let cancelled = false;

    countUnreadChatMessages()
      .then((count) => {
        if (!cancelled) setUnreadTotal(count);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [user, isTeacher, open, pathname]);

  if (!user || hidden) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="채팅 미리보기 열기"
        className="fixed bottom-24 right-4 z-[80] hidden md:flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary text-white shadow-sm shadow-primary/30 transition-transform active:scale-[0.98]"
      >
        <span className="material-symbols-outlined text-[26px]">chat_bubble</span>
        {unreadTotal > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1.5 text-xs font-bold text-white ring-2 ring-white">
            {unreadTotal > 9 ? '9+' : unreadTotal}
          </span>
        )}
      </button>
      <ChatLayer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
