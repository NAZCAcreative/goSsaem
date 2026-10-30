'use client';

import { PageLoading } from '@/components/shared/PageLoading';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
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

const EMOJIS = ['😊', '👍', '🙏', '📚', '❤️', '🎉'];

function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
}

export default function ChatDetailPage({ params }: { params: { id: string } }) {
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
  const [emojiOpen, setEmojiOpen] = useState(false);
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

  const handleSend = async () => {
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
        <Link href="/student/chat" className="rounded-lg bg-primary px-6 py-3 font-label-lg text-on-primary">
          채팅 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <div className="glass-card sticky top-0 z-50 flex w-full items-center justify-between px-container-margin py-4 shadow-sm">
        <div className="flex items-center gap-stack-sm">
          <Link href="/student/chat" className="min-h-11 min-w-11 rounded-lg p-2 transition-colors duration-150 hover:bg-surface-container active:scale-[0.98]" aria-label="뒤로">
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary-container bg-primary/10 font-label-lg text-label-lg text-primary">
              {room.otherUserName.slice(0, 1)}
            </div>
            <div>
              <h1 className="font-headline-lg-mobile text-headline-lg-mobile font-bold text-primary">{room.otherUserName}쌤</h1>
              <p className="font-label-sm text-label-sm text-on-surface-variant">{inCall ? '통화 중' : '온라인'}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setInCall(true);
              showToast('영상 통화를 연결하고 있어요');
            }}
            disabled={inCall}
            className="min-h-11 min-w-11 rounded-lg p-2 text-on-surface-variant transition-transform hover:bg-surface-container active:scale-[0.98] disabled:opacity-40"
            aria-label="영상 통화"
          >
            <span className="material-symbols-outlined">videocam</span>
          </button>
          {inCall && (
            <button
              type="button"
              onClick={() => {
                setInCall(false);
                showToast('통화를 종료했습니다');
              }}
              className="min-h-11 min-w-11 rounded-lg p-2 text-error transition-transform hover:bg-surface-container active:scale-[0.98]"
              aria-label="통화 종료"
            >
              <span className="material-symbols-outlined">call_end</span>
            </button>
          )}
        </div>
      </div>

      {inCall && (
        <div className="flex items-center justify-center gap-2 bg-primary-fixed px-container-margin py-2 text-primary">
          <span className="material-symbols-outlined animate-pulse text-[18px]">videocam</span>
          <span className="font-label-lg text-label-lg">{room.otherUserName}쌤과 영상 통화 중...</span>
        </div>
      )}

      <main className="flex flex-1 flex-col gap-stack-md overflow-y-auto px-container-margin pb-48 pt-stack-lg">
        {messages.length === 0 && (
          <p className="py-10 text-center font-body-md text-on-surface-variant">아직 메시지가 없습니다. 첫 메시지를 보내보세요!</p>
        )}
        {hasOlder && <button type="button" className="mb-4 min-h-11 w-full rounded-xl border bg-white px-4 text-sm disabled:opacity-40" disabled={loadingOlder} onClick={() => void loadOlder()}>{loadingOlder ? '불러오는 중...' : '이전 대화 더 보기'}</button>}
          {messages.map((message) => {
          const isMine = message.senderId === user?.id;
          return (
            <div key={message.id} className={`flex max-w-[85%] items-end gap-stack-sm ${isMine ? 'ml-auto flex-row-reverse' : ''}`}>
              <div
                className={`rounded-t-xl p-4 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] ${
                  isMine ? 'rounded-bl-xl bg-gradient-to-br from-primary-container to-secondary-container text-white' : 'rounded-br-xl bg-white text-on-surface'
                }`}
              >
                {message.type === 'file' ? (
                  <div className="w-56">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-container text-white">
                        <span className="material-symbols-outlined">description</span>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate font-label-lg text-label-lg">{message.fileName}</p>
                        <p className="font-label-sm text-label-sm opacity-80">{message.fileSize}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="font-body-md text-body-md">{message.text}</p>
                )}
                <div className={`mt-1 ${isMine ? 'text-left' : 'text-right'}`}>
                  <span className={`font-label-sm text-xs ${isMine ? 'text-white opacity-80' : 'text-on-surface-variant'}`}>
                    {formatMessageTime(message.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </main>

      <footer className="fixed bottom-20 left-0 z-[80] flex w-full flex-col gap-3 border-t border-surface-variant bg-white px-container-margin py-stack-md shadow-[0_-4px_20px_rgba(0,0,0,0.04)] md:left-1/2 md:max-w-4xl md:-translate-x-1/2">
        {emojiOpen && (
          <div className="flex items-center gap-2 rounded-xl bg-surface-container-low p-2">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setDraft((prev) => `${prev}${emoji}`)}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-xl transition-transform hover:bg-surface-container active:scale-[0.98]"
                aria-label={`이모지 ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-stack-sm">
          <button
            type="button"
            onClick={() => showToast('파일 첨부는 준비 중입니다')}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-highest text-on-surface-variant transition-colors hover:bg-surface-container active:scale-[0.98]"
            aria-label="첨부"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
          <div className="flex flex-1 items-center rounded-full bg-surface-container-low px-4 py-2 transition-all focus-within:ring-2 focus-within:ring-primary-container">
            <input
              className="flex-1 border-none bg-transparent font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:ring-0"
              placeholder="메시지를 입력하세요..."
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void handleSend();
              }}
            />
            <button
              type="button"
              onClick={() => setEmojiOpen((prev) => !prev)}
              aria-pressed={emojiOpen}
              className="text-on-surface-variant transition-colors hover:text-primary"
              aria-label="이모지"
            >
              <span className="material-symbols-outlined">sentiment_satisfied</span>
            </button>
          </div>
          <button
            className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary-container to-secondary-container text-white shadow-sm transition-all active:scale-[0.98]"
            onClick={() => void handleSend()}
            aria-label="전송"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              send
            </span>
          </button>
        </div>
        <div className="h-2" />
      </footer>
    </div>
  );
}
