'use client';

import { showError } from '@/components/shared/AlertDialog';

import { PageContent } from '@/components/shared/PageContent';
import Link from 'next/link';
import { ListPager } from '@/components/shared/ListPager';
import { useEffect, useRef, useState } from 'react';
import { showToast } from '@/components/shared/Toast';
import { getReviewSummary, listTeacherReviews, updateTeacherReply, type TeacherReviewRow, type ReviewSummary } from '@/lib/queries/reviews';
import { useAuthStore } from '@/stores/auth-store';

const FILTERS = ['미답변순', '최신순', '높은 평점순'];

export default function TeacherReviewRepliesPage() {
  const [page, setPage] = useState(1);
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const [reviews, setReviews] = useState<TeacherReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true); setReviews([]); setError(''); setSummary(null);

    Promise.all([listTeacherReviews(user.id, page, activeFilter), getReviewSummary()])
      .then(([data, stats]) => {
        if (!cancelled) { setReviews(data); setSummary(stats); }
      })
      .catch(() => {
        if (!cancelled) setError('후기 목록을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, isHydrated, page, activeFilter, revision]);

  const sortedReviews = [...reviews].sort((a, b) => {
    if (activeFilter === '미답변순') return Number(a.teacherReply !== null) - Number(b.teacherReply !== null);
    if (activeFilter === '높은 평점순') return b.rating - a.rating;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const submitAnswer = async (reviewId: string, answer: string) => {
    if (!answer.trim() || lock.current) return;
    lock.current = true; setBusy(true);
    try {
      await updateTeacherReply(reviewId, answer.trim());
      if (!reviews.find(review => review.id === reviewId)?.teacherReply) setSummary(value => value ? { ...value, unanswered: Math.max(0, value.unanswered - 1) } : value);
      setReviews((prev) => prev.map((review) => (review.id === reviewId ? { ...review, teacherReply: answer.trim() } : review)));
      setEditingId(null);
      showToast('답변이 등록되었습니다');
    } catch {
      showError('답변 등록에 실패했습니다');
    } finally { lock.current = false; setBusy(false); }
  };

  return (
    <PageContent loading={loading}>
    <main className="mx-auto min-h-screen w-full max-w-5xl bg-background px-container-margin pb-32 pt-stack-lg font-body-md text-on-background">
      <section className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <Link href="/teacher/profile" className="flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container" aria-label="뒤로가기">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">리뷰 답변 관리</h1>
        </div>
        <p className="text-body-md text-on-surface-variant">학생들이 남긴 소중한 피드백에 답변을 달고 소통하세요.</p>
      </section>

      <section className="mb-8 grid gap-4 sm:grid-cols-2">
        <Stat label="총 후기 · 평균 평점" value={summary ? `${summary.total}개 · ${summary.average.toFixed(1)}점` : '—'} className="text-primary" />
        <Stat label="전체 미답변" value={summary ? String(summary.unanswered) : '—'} className="text-secondary" highlight />
      </section>

      <section className="custom-scrollbar mb-6 flex items-center gap-3 overflow-x-auto pb-2">
        {FILTERS.map((filter) => {
          const active = activeFilter === filter;
          return (
            <button
              key={filter}
              type="button"
              disabled={busy}
              onClick={() => { setPage(1); setActiveFilter(filter); }}
              aria-pressed={active}
              className={`whitespace-nowrap rounded-lg px-5 py-2 text-label-lg transition-all active:scale-[0.98] ${
                active ? 'bg-primary text-on-primary shadow-md shadow-primary/20 hover:brightness-110' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
              }`}
            >
              {filter}
            </button>
          );
        })}
      </section>

      {loading && <p className="py-16 text-center font-body-md text-on-surface-variant">불러오는 중...</p>}
      {error && <div role="alert"><p>{error}</p><button className="min-h-11 text-primary" onClick={() => setRevision(x => x+1)}>다시 시도</button></div>}
      {!loading && !error && reviews.length === 0 && <p className="py-16 text-center font-body-md text-on-surface-variant">아직 받은 후기가 없습니다.</p>}

      <section className="space-y-6">
        {sortedReviews.map((review) => {
          const editing = editingId === review.id;

          return (
            <article key={review.id} className="overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
              <div className="p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {review.studentAvatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt={review.studentName} className="h-10 w-10 rounded-full object-cover" src={review.studentAvatarUrl} />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-highest font-bold text-primary">{review.studentName.slice(0, 1)}</div>
                    )}
                    <div>
                      <h2 className="font-bold text-on-surface">{review.studentName}</h2>
                      <div className="flex items-center gap-1">
                        <Stars count={review.rating} />
                        <span className="ml-1 text-label-sm text-on-surface-variant">{new Date(review.createdAt).toLocaleDateString('ko-KR')}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold tracking-tight ${!review.teacherReply ? 'bg-secondary-container/10 text-secondary' : 'bg-primary-container/10 text-primary'}`}>
                    {!review.teacherReply ? '답변 대기' : '답변 완료'}
                  </span>
                </div>
                <p className={`mb-6 text-body-md leading-relaxed text-on-surface-variant ${review.teacherReply ? 'italic' : ''}`}>
                  {review.teacherReply ? `"${review.text}"` : review.text}
                </p>
                {review.teacherReply && !editing ? (
                  <div className="relative rounded-lg bg-surface-container p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-primary">subdirectory_arrow_right</span>
                      <span className="font-label-sm text-label-sm font-bold text-primary">선생님의 답변</span>
                    </div>
                    <p className="text-body-md text-on-surface">{review.teacherReply}</p>
                    <button
                      type="button"
                      onClick={() => setEditingId(review.id)}
                      className="absolute right-4 top-4 text-on-surface-variant transition-colors hover:text-primary"
                      aria-label="답변 수정"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                  </div>
                ) : (
                  <ReplyBox
                    key={`${review.id}-${editing}`}
                    busy={busy}
                    initialValue={editing ? review.teacherReply ?? '' : ''}
                    onCancel={() => setEditingId(null)}
                    onSubmit={(value) => void submitAnswer(review.id, value)}
                  />
                )}
              </div>
            </article>
          );
        })}
      </section>
    {user && <ListPager page={page} count={reviews.length} loading={loading || busy} onPage={setPage} />}
      </main>
    </PageContent>
  );
}

function Stat({ label, value, className, highlight = false }: { label: string; value: string; className: string; highlight?: boolean }) {
  return (
    <article className={`rounded-xl border p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] ${highlight ? 'border-primary-container/20 bg-primary-container/10' : 'border-outline-variant/30 bg-surface-container-lowest'}`}>
      <span className="mb-1 block text-label-sm text-on-surface-variant">{label}</span>
      <span className={`text-2xl font-bold ${className}`}>{value}</span>
    </article>
  );
}

function Stars({ count }: { count: number }) {
  return (
    <div className="flex text-amber-400">
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={index} className="material-symbols-outlined text-[18px]" style={index < count ? { fontVariationSettings: "'FILL' 1" } : undefined}>
          star
        </span>
      ))}
    </div>
  );
}

function ReplyBox({ initialValue, onCancel, onSubmit, busy }: { initialValue: string; onCancel: () => void; onSubmit: (value: string) => void; busy: boolean }) {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="space-y-3">
      <textarea
        aria-label="선생님 답변"
        disabled={busy}
        maxLength={2000}
        className="h-28 w-full resize-none rounded-lg border-none bg-surface-container-low p-4 text-body-md focus:ring-2 focus:ring-primary"
        placeholder="학생에게 따뜻한 답변을 남겨주세요..."
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <p className="text-xs text-slate-500">{value.length}/2,000자 · 학생과 공개 페이지에 표시됩니다.</p>
      <div className="flex justify-end gap-2">
        <button type="button" disabled={busy} onClick={onCancel} className="min-h-11 px-4 py-2 text-label-lg text-on-surface-variant">
          취소
        </button>
        <button
          type="button"
          disabled={busy || !value.trim()}
          onClick={() => onSubmit(value)}
          className="rounded-lg bg-primary px-6 py-2 text-label-lg font-bold text-on-primary shadow-md shadow-primary/20"
        >
          {busy ? '등록 중…' : '등록하기'}
        </button>
      </div>
    </div>
  );
}
