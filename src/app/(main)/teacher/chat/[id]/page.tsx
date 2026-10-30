'use client';

import { PageLoading } from '@/components/shared/PageLoading';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { showToast } from '@/components/shared/Toast';
import {
  getChatRoomInfo,
  listMessages,
  markRoomRead,
  sendMessage as sendMessageMutation,
  subscribeToMessages,
  type ChatMessageRow,
  type ChatRoomInfo,
} from '@/lib/queries/chat';
import { useAuthStore } from '@/stores/auth-store';

function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
}

export default function TeacherChatDetailPage({ params }: { params: { id: string } }) {
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const [room, setRoom] = useState<ChatRoomInfo | null>(null);
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const prepending = useRef(false);
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [inCall, setInCall] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setMessages([]); setRoom(null); setLoading(true);

    async function load() {
      try {
        const [roomInfo, history] = await Promise.all([getChatRoomInfo(params.id, user!.id), listMessages(params.id)]);
        if (cancelled) return;
        setRoom(roomInfo);
        setMessages((previous) => Array.from(new Map([...history, ...previous].map(message => [message.id, message])).values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)));
        setHasOlder(history.length === 50);
        void markRoomRead(params.id, user!.id);
      } catch {
        if (!cancelled) showToast('채팅방을 불러오지 못했습니다');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    const unsubscribe = subscribeToMessages(params.id, (message) => {
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      if (message.senderId !== user!.id) void markRoomRead(params.id, user!.id);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [params.id, user, isHydrated]);

  useEffect(() => {
    if (prepending.current) { prepending.current = false; return; }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const loadOlder = async () => {
    if (!messages[0] || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const history = await listMessages(params.id, messages[0]);
      prepending.current = true;
      setMessages(previous => Array.from(new Map([...history, ...previous].map(message => [message.id, message])).values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)));
      setHasOlder(history.length === 50);
    } catch { showToast('이전 대화를 불러오지 못했습니다'); }
    finally { setLoadingOlder(false); }
  };

  const sendMessage = async () => {
    if (!draft.trim() || !user) return;
    const text = draft.trim();
    setDraft('');
    try {
      const sent = await sendMessageMutation(params.id, user.id, text);
      // Realtime 구독이 웹소켓 연결을 맺기 전에 보낸 메시지는 이벤트를 못 받을 수 있어(레이스 컨디션),
      // 응답으로 받은 실제 row를 바로 반영한다. 나중에 realtime 이벤트가 와도 id로 중복을 걸러낸다.
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
    } catch {
      showToast('메시지 전송에 실패했습니다');
    }
  };

  if (loading) return <PageLoading />;

  if (!room) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-container-margin text-center">
        <p className="font-headline-md text-headline-md text-on-surface">채팅방을 찾을 수 없습니다</p>
        <Link href="/teacher/chat" className="rounded-lg bg-primary px-6 py-3 font-label-lg text-on-primary">
          채팅 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <main className="flex h-[calc(100vh-144px)] flex-col overflow-hidden bg-background font-body-md text-on-background">
      <section className="z-40 flex h-16 w-full items-center justify-between bg-surface px-container-margin shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/teacher/chat" className="-ml-2 flex items-center justify-center min-h-11 min-w-11 rounded-lg p-2 text-on-surface-variant transition-opacity hover:opacity-80 active:scale-[0.98]" aria-label="채팅 목록으로 돌아가기">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-label-lg text-label-lg text-primary">
              {room.otherUserName.slice(0, 1)}
            </div>
            <div>
              <h1 className="font-headline-md text-headline-md font-bold leading-tight text-on-surface">{room.otherUserName} 학생</h1>
              <span className="block font-label-sm text-label-sm font-medium text-outline">{inCall ? '통화 중' : '온라인'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setInCall((prev) => !prev);
              showToast(inCall ? '통화를 종료했습니다' : '영상 통화를 연결하고 있어요');
            }}
            className={`flex items-center justify-center min-h-11 min-w-11 rounded-lg p-2 transition-opacity hover:opacity-80 active:scale-[0.98] ${
              inCall ? 'text-error' : 'text-on-surface-variant'
            }`}
            aria-label="영상 통화"
          >
            <span className="material-symbols-outlined">{inCall ? 'call_end' : 'videocam'}</span>
          </button>
          <button
            type="button"
            onClick={() => showToast('메뉴 기능은 준비 중입니다')}
            className="flex items-center justify-center min-h-11 min-w-11 rounded-lg p-2 text-on-surface-variant transition-opacity hover:opacity-80 active:scale-[0.98]"
            aria-label="더보기"
          >
            <span className="material-symbols-outlined">more_vert</span>
          </button>
        </div>
      </section>

      <section className="no-scrollbar mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed px-container-margin pb-48 pt-4">
        {messages.length === 0 && (
          <p className="py-10 text-center font-body-md text-on-surface-variant">아직 메시지가 없습니다. 첫 메시지를 보내보세요!</p>
        )}
        {hasOlder && <button type="button" className="mb-4 min-h-11 w-full rounded-xl border bg-white px-4 text-sm disabled:opacity-40" disabled={loadingOlder} onClick={() => void loadOlder()}>{loadingOlder ? '불러오는 중...' : '이전 대화 더 보기'}</button>}
          {messages.map((message) => {
          const isMine = message.senderId === user?.id;
          return isMine ? (
            <TeacherBubble key={message.id} time={formatMessageTime(message.createdAt)}>
              {message.text}
            </TeacherBubble>
          ) : (
            <StudentBubble key={message.id} initial={room.otherUserName.slice(0, 1)} time={formatMessageTime(message.createdAt)}>
              {message.text}
            </StudentBubble>
          );
        })}
        <div ref={bottomRef} />
      </section>

      <section className="fixed bottom-20 left-0 z-[80] w-full border-t border-surface-variant bg-surface-container-lowest px-container-margin py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] md:left-1/2 md:max-w-4xl md:-translate-x-1/2">
        <div className="flex items-end gap-2 rounded-xl border border-surface-variant bg-surface-container p-1 transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary md:p-2">
          <button
            type="button"
            onClick={() => showToast('파일 첨부는 준비 중입니다')}
            className="mb-0.5 shrink-0 min-h-11 min-w-11 rounded-lg p-2 text-on-surface-variant transition-colors hover:text-primary"
            aria-label="첨부"
          >
            <span className="material-symbols-outlined">add_circle</span>
          </button>
          <textarea
            className="max-h-24 min-w-0 flex-1 w-full resize-none self-center border-none bg-transparent px-2 py-2.5 font-body-md text-body-md text-on-surface placeholder:text-outline focus:ring-0"
            placeholder="메시지를 입력하세요..."
            rows={1}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
          />
          <button
            type="button"
            onClick={() => void sendMessage()}
            className="mb-0.5 shrink-0 rounded-xl bg-primary p-2.5 text-on-primary shadow-sm transition-colors hover:bg-primary-container active:scale-[0.98]"
            aria-label="전송"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              send
            </span>
          </button>
        </div>
      </section>
    </main>
  );
}

function TeacherBubble({ children, time }: { children: React.ReactNode; time: string }) {
  return (
    <div className="flex items-end justify-end gap-2">
      <div className="flex max-w-[80%] flex-col items-end gap-1">
        <div className="rounded-xl rounded-br-sm bg-primary px-4 py-3 text-on-primary shadow-md">
          <p className="whitespace-pre-line font-body-md text-body-md">{children}</p>
        </div>
        <span className="mr-1 text-right font-label-sm text-label-sm text-outline">{time}</span>
      </div>
    </div>
  );
}

function StudentBubble({ children, time, initial }: { children: React.ReactNode; time: string; initial: string }) {
  return (
    <div className="flex items-end justify-start gap-2">
      <div className="mb-5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-variant font-label-sm text-label-sm text-on-surface-variant">
        {initial}
      </div>
      <div className="flex max-w-[75%] flex-col items-start gap-1">
        <div className="rounded-xl rounded-bl-sm border border-surface-variant bg-surface-container-low px-4 py-3 text-on-surface shadow-sm">
          <p className="whitespace-pre-line font-body-md text-body-md">{children}</p>
        </div>
        <span className="ml-1 font-label-sm text-label-sm text-outline">{time}</span>
      </div>
    </div>
  );
}