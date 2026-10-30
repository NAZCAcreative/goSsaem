'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { listChatRooms, type ChatRoomSummary } from '@/lib/queries/chat';
import { useAuthStore } from '@/stores/auth-store';


function formatTime(iso: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export function ChatLayer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isTeacher = user?.role === 'teacher';
  const role = isTeacher ? 'teacher' : 'student';
  const [rooms, setRooms] = useState<ChatRoomSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    setLoading(true);

    listChatRooms(user.id, role)
      .then((data) => {
        if (!cancelled) setRooms(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, user, role]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, open]);

  return (
    <div className={`fixed inset-0 z-[90] ${open ? 'visible pointer-events-auto' : 'invisible pointer-events-none'}`} aria-hidden={!open}>
      <button
        type="button"
        aria-label="채팅 닫기"
        onClick={onClose}
        className={`absolute inset-0 bg-black/35 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      <aside
        className={`absolute right-0 top-0 flex h-dvh w-full max-w-[440px] flex-col bg-background shadow-[-14px_0_36px_rgba(25,28,31,0.18)] transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="채팅"
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-outline-variant/50 bg-white/90 px-container-margin backdrop-blur-md">
          <h2 className="font-headline-md text-headline-md text-on-surface">채팅</h2>
          <div className="flex items-center gap-2">
            {user && !loading && rooms.length > 0 && <Link
              href={role === 'teacher' ? '/teacher/chat' : '/student/chat'}
              onClick={onClose}
              className="rounded-lg border border-outline-variant px-4 py-1.5 font-label-sm text-label-sm text-on-surface-variant transition-colors hover:bg-surface-container-low"
            >
              전체보기
            </Link>}
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-low active:scale-[0.98]"
              aria-label="닫기"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-container-margin py-stack-lg pb-28">
          {!user && <p className="py-10 text-center font-body-md text-on-surface-variant">로그인 후 채팅을 확인할 수 있습니다.</p>}
          {user && loading && <p className="py-10 text-center font-body-md text-on-surface-variant">불러오는 중...</p>}
          {user && !loading && rooms.length === 0 && (
            <p className="py-10 text-center font-body-md text-on-surface-variant">채팅 내역이 없습니다.</p>
          )}
          <div className="space-y-1">
            {rooms.map((room) => (
              <Link
                key={room.id}
                href={role === 'teacher' ? `/teacher/chat/${room.id}` : `/student/chat/${room.id}`}
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-surface-container-low"
              >
                {room.otherUserAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={room.otherUserName} className="h-12 w-12 shrink-0 rounded-full object-cover" src={room.otherUserAvatar} />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 font-label-lg text-label-lg text-primary">
                    {room.otherUserName.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-label-lg text-label-lg text-on-surface">{room.otherUserName}</span>
                    <span className="shrink-0 font-label-sm text-label-sm text-outline">{formatTime(room.lastMessageAt)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-body-md text-body-md text-on-surface-variant">
                      {room.lastMessagePreview ?? '대화를 시작해보세요'}
                    </span>
                    {room.unreadCount > 0 && (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-on-primary">
                        {room.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
