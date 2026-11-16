'use client';

import { showError } from '@/components/shared/AlertDialog';

import { PageContent } from '@/components/shared/PageContent';
import Link from 'next/link';
import { ListPager } from '@/components/shared/ListPager';
import { useEffect, useState } from 'react';
import { showToast } from '@/components/shared/Toast';
import { listChatRooms, type ChatRoomSummary } from '@/lib/queries/chat';
import { useAuthStore } from '@/stores/auth-store';

const FILTERS = ['전체', '읽지 않음'] as const;

function formatTime(iso: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export default function ChatListPage() {
  const [page, setPage] = useState(1);
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]>('전체');
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [rooms, setRooms] = useState<ChatRoomSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setRooms([]);

    listChatRooms(user.id, 'student', page, query, activeFilter === '읽지 않음')
      .then((data) => {
        if (!cancelled) setRooms(data);
      })
      .catch(() => {
        if (!cancelled) showError('채팅 목록을 불러오지 못했습니다');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, isHydrated, page, query, activeFilter]);

  const filteredChats = rooms;

  return (
    <PageContent loading={loading}>
    <div className="min-h-screen bg-background pb-24 font-body-md text-on-background">
      <div className="sticky top-0 z-50 flex items-center justify-between bg-surface/80 px-container-margin py-4 shadow-sm backdrop-blur-md">
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary">채팅</h1>
        <button
          type="button"
          onClick={() => setSearchOpen((prev) => !prev)}
          aria-pressed={searchOpen}
          className="flex h-10 w-10 items-center justify-center rounded-lg transition-transform hover:bg-surface-container active:scale-[0.98]"
          aria-label="검색"
        >
          <span className="material-symbols-outlined text-on-surface-variant">{searchOpen ? 'close' : 'search'}</span>
        </button>
      </div>

      <main className="pb-24 pt-4">
        {searchOpen && (
          <div className="mb-4 px-container-margin">
            <input
              autoFocus
              type="text"
              value={query}
              maxLength={100} onChange={(event) => { setPage(1); setQuery(event.target.value); }}
              placeholder="이름 또는 메시지 검색"
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        )}

        <div className="mb-6 px-container-margin">
          <div className="scrollbar-hide flex gap-2 overflow-x-auto py-2">
            {FILTERS.map((filter) => {
              const active = activeFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => { setPage(1); setActiveFilter(filter); }}
                  className={`whitespace-nowrap rounded-lg px-4 py-2 font-label-lg transition-transform active:scale-[0.98] ${
                    active
                      ? 'bg-primary text-on-primary shadow-sm shadow-primary/25'
                      : 'bg-surface-container text-on-surface-variant'
                  }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col space-y-2 px-container-margin">
          {!user && <p className="py-10 text-center font-body-md text-on-surface-variant">로그인 후 채팅을 이용할 수 있습니다.</p>}
          {user && loading && <p className="py-10 text-center font-body-md text-on-surface-variant">불러오는 중...</p>}
          {user && !loading && filteredChats.length === 0 && (
            <p className="py-10 text-center font-body-md text-on-surface-variant">
              {query.trim() || activeFilter !== '전체' ? '조건에 맞는 채팅 내역이 없습니다.' : '채팅 내역이 없습니다. 선생님 프로필에서 대화를 시작해보세요.'}
            </p>
          )}
          {filteredChats.map((room) => (
            <Link
              key={room.id}
              href={`/student/chat/${room.id}`}
              className="group relative flex cursor-pointer items-center gap-4 rounded-xl border border-transparent bg-surface-container-lowest p-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all hover:border-outline-variant active:scale-[0.98]"
            >
              <div className="relative flex-shrink-0">
                {room.otherUserAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="h-14 w-14 rounded-full border-2 border-surface-container object-cover" src={room.otherUserAvatar} alt={room.otherUserName} />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 font-headline-md text-headline-md text-primary">
                    {room.otherUserName.slice(0, 1)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-grow">
                <div className="mb-1 flex items-baseline justify-between">
                  <h3 className="truncate font-headline-md text-headline-md text-on-surface">{room.otherUserName}쌤</h3>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">{formatTime(room.lastMessageAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className={`truncate font-body-md text-body-md text-on-surface-variant ${room.unreadCount ? 'font-semibold' : ''}`}>
                    {room.lastMessagePreview ?? '대화를 시작해보세요'}
                  </p>
                  {room.unreadCount > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-xs font-bold text-white shadow-sm">
                      {room.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <button
          type="button"
          onClick={() => showToast('선생님 프로필에서 채팅을 시작해보세요')}
          className="fixed bottom-24 right-6 z-10 flex h-14 w-14 items-center justify-center rounded-full primary-gradient text-white shadow-lg shadow-primary/30 transition-transform active:scale-[0.98]"
          aria-label="새 채팅"
        >
          <span className="material-symbols-outlined text-3xl">chat_add_on</span>
        </button>
      {user && <ListPager page={page} count={rooms.length} loading={loading} onPage={setPage} />}
      </main>
    </div>
    </PageContent>
  );
}
