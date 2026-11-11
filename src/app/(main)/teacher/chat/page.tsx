'use client';

import { showError } from '@/components/shared/AlertDialog';

import { PageContent } from '@/components/shared/PageContent';
import Link from 'next/link';
import { ListPager } from '@/components/shared/ListPager';
import { useEffect, useRef, useState } from 'react';
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

export default function TeacherChatPage() {
  const [page, setPage] = useState(1);
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const [query, setQuery] = useState('');
  const [rooms, setRooms] = useState<ChatRoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setRooms([]);

    listChatRooms(user.id, 'teacher', page, query)
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
  }, [user, isHydrated, page, query]);

  const filteredRooms = rooms;

  return (
    <PageContent loading={loading}>
    <main className="mx-auto min-h-screen max-w-4xl space-y-stack-md bg-background px-container-margin pb-28 pt-stack-lg font-body-md text-on-background md:px-10">
      <section>
        <div className="mb-stack-md flex items-center justify-between">
          <h1 className="font-headline-md text-headline-md font-semibold text-primary">메시지</h1>
          <button
            type="button"
            onClick={() => inputRef.current?.focus()}
            className="flex items-center justify-center rounded-lg p-2 text-primary transition-colors hover:bg-surface-container-high active:scale-[0.98]"
            aria-label="검색"
          >
            <span className="material-symbols-outlined">search</span>
          </button>
        </div>

        <label className="mb-stack-lg flex items-center rounded-xl border border-surface-variant bg-surface-container-lowest p-2 shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary/20">
          <span className="material-symbols-outlined ml-2 mr-2 text-outline">search</span>
          <input
            ref={inputRef}
            className="w-full border-none bg-transparent text-left text-body-md text-on-surface placeholder:text-outline-variant focus:ring-0"
            placeholder="메시지 검색..."
            type="text"
            value={query}
            maxLength={100} onChange={(event) => { setPage(1); setQuery(event.target.value); }}
          />
        </label>
      </section>

      <ul className="space-y-stack-sm">
        {!user && <li className="py-10 text-center font-body-md text-on-surface-variant">로그인 후 채팅을 이용할 수 있습니다.</li>}
        {user && loading && <li className="py-10 text-center font-body-md text-on-surface-variant">불러오는 중...</li>}
        {user && !loading && filteredRooms.length === 0 && (
          <li className="py-10 text-center font-body-md text-on-surface-variant">
            {query.trim() ? '검색 조건에 맞는 채팅 내역이 없습니다.' : '채팅 내역이 없습니다.'}
          </li>
        )}
        {filteredRooms.map((room) => (
          <li key={room.id}>
            <Link
              href={`/teacher/chat/${room.id}`}
              className="group flex w-full cursor-pointer items-start gap-4 rounded-xl bg-surface-container-lowest p-4 text-left shadow-sm transition-colors hover:bg-surface-container-low active:scale-[0.99]"
            >
              <div className="relative shrink-0">
                {room.otherUserAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={`${room.otherUserName} 아바타`} className="h-12 w-12 rounded-full border-2 border-surface-bright object-cover shadow-sm transition-colors group-hover:border-primary" src={room.otherUserAvatar} />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 font-label-lg text-label-lg text-primary">
                    {room.otherUserName.slice(0, 1)}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-grow">
                <div className="mb-1 flex items-baseline justify-between">
                  <h2 className="truncate font-headline-md text-body-lg font-bold text-on-surface">{room.otherUserName} 학생</h2>
                  <span className={`ml-2 whitespace-nowrap text-label-sm ${room.unreadCount ? 'font-semibold text-primary' : 'text-outline-variant'}`}>
                    {formatTime(room.lastMessageAt)}
                  </span>
                </div>
                <p className={`truncate text-body-md ${room.unreadCount ? 'font-medium text-on-surface' : 'text-on-surface-variant'}`}>
                  {room.lastMessagePreview ?? '대화를 시작해보세요'}
                </p>
              </div>

              <div className="flex shrink-0 self-stretch">
                {room.unreadCount > 0 && (
                  <span className="mt-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-secondary-container px-1.5 text-label-sm font-bold text-on-secondary-container shadow-sm">
                    {room.unreadCount}
                  </span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    {user && <ListPager page={page} count={rooms.length} loading={loading} onPage={setPage} />}
      </main>
    </PageContent>
  );
}
