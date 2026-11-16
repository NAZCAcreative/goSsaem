'use client';

import { showError } from '@/components/shared/AlertDialog';

import { PageContent } from '@/components/shared/PageContent';
import Link from 'next/link';
import { ListPager } from '@/components/shared/ListPager';
import { useEffect, useState } from 'react';
import { showToast } from '@/components/shared/Toast';
import {
  createReview,
  listMyWrittenReviews,
  listPendingReviewTargets,
  updateReviewText,
  type PendingReviewTarget,
  type WrittenReviewRow,
} from '@/lib/queries/reviews';
import { useAuthStore } from '@/stores/auth-store';

function Avatar({ name, url, className }: { name: string; url: string | null; className: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={name} className={`${className} object-cover`} src={url} />;
  }
  return (
    <div className={`${className} flex items-center justify-center bg-primary/10 font-bold text-primary`}>{name.slice(0, 1)}</div>
  );
}

export default function ReviewsPage() {
  const [page, setPage] = useState(1);
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const [tab, setTab] = useState<'written' | 'pending'>('written');
  const [written, setWritten] = useState<WrittenReviewRow[]>([]);
  const [pending, setPending] = useState<PendingReviewTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [writingSessionId, setWritingSessionId] = useState<string | null>(null);
  const [writeDraft, setWriteDraft] = useState('');

  const reload = async () => {
    if (!user) return;
    const [writtenRows, pendingRows] = await Promise.all([listMyWrittenReviews(user.id, page), listPendingReviewTargets(user.id, page)]);
    setWritten(writtenRows);
    setPending(pendingRows);
  };

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void reload()
      .catch(() => showError('리뷰 정보를 불러오지 못했습니다'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isHydrated, page]);

  const startEdit = (review: WrittenReviewRow) => {
    setEditingId(review.id);
    setEditDraft(review.text);
  };

  const saveEdit = async (reviewId: string) => {
    try {
      await updateReviewText(reviewId, editDraft);
      setWritten((prev) => prev.map((review) => (review.id === reviewId ? { ...review, text: editDraft } : review)));
      setEditingId(null);
      showToast('리뷰가 수정되었습니다');
    } catch {
      showError('리뷰 수정에 실패했습니다');
    }
  };

  const submitNewReview = async (item: PendingReviewTarget) => {
    if (!user || !writeDraft.trim()) return;
    try {
      await createReview({ studentId: user.id, teacherId: item.teacherId, sessionId: item.sessionId, rating: 5, text: writeDraft.trim() });
      setWritingSessionId(null);
      setWriteDraft('');
      showToast('리뷰가 등록되었습니다');
      setTab('written');
      await reload();
    } catch {
      showError('리뷰 등록에 실패했습니다');
    }
  };

  return (
    <PageContent loading={loading}>
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-surface pb-24 text-on-surface selection:bg-primary-container selection:text-on-primary-container">
      <div className="flex h-16 w-full items-center justify-between px-container-margin">
        <Link href="/student/profile" className="-ml-2 rounded-lg p-2 text-primary transition-colors hover:bg-surface-container-low" aria-label="뒤로가기">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <h1 className="font-headline-md text-headline-md font-extrabold text-primary">리뷰 관리</h1>
        <div className="w-10" />
      </div>

      <main className="relative z-10 flex-1">
        <div className="sticky top-0 z-30 bg-surface/90 px-container-margin pb-6 pt-2 shadow-[0_4px_20px_rgba(248,249,254,0.9)] backdrop-blur-md">
          <div className="relative flex gap-1 rounded-xl bg-surface-container-low p-1">
            <button
              className={`flex-1 rounded-lg py-2.5 text-center font-label-lg transition-all duration-200 ${
                tab === 'written' ? 'bg-surface-container-lowest text-primary shadow-[0px_2px_8px_rgba(0,0,0,0.04)]' : 'text-on-surface-variant hover:bg-surface-container-highest'
              }`}
              onClick={() => { setPage(1); setTab('written'); }}
            >
              작성한 리뷰
            </button>
            <button
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-center font-label-lg transition-all duration-200 ${
                tab === 'pending' ? 'bg-surface-container-lowest text-primary shadow-[0px_2px_8px_rgba(0,0,0,0.04)]' : 'text-on-surface-variant hover:bg-surface-container-highest'
              }`}
              onClick={() => { setPage(1); setTab('pending'); }}
            >
              작성 대기
              <span className="rounded-full bg-secondary-container px-1.5 py-0.5 text-xs font-bold leading-none text-on-tertiary">{pending.length}</span>
            </button>
          </div>
        </div>

        {loading && <p className="py-16 text-center font-body-md text-on-surface-variant">불러오는 중...</p>}

        {!loading && tab === 'written' && (
          <section className="review-tab-content flex flex-col gap-stack-md px-container-margin">
            {written.length === 0 && <p className="py-16 text-center font-body-md text-on-surface-variant">작성한 리뷰가 없습니다.</p>}
            {written.map((review) => (
              <article key={review.id} className="rounded-xl border border-surface-variant/40 bg-surface-container-lowest p-5 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0px_8px_30px_rgba(0,0,0,0.06)]">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar name={review.teacherName} url={review.teacherAvatarUrl} className="h-12 w-12 rounded-full border-2 border-surface-container-lowest shadow-sm" />
                    <div className="flex flex-col">
                      <h3 className="font-label-lg text-on-surface">{review.teacherName}</h3>
                      <p className="mt-0.5 font-label-sm text-outline">{review.meta}</p>
                    </div>
                  </div>
                </div>
                <div className="mb-3 flex gap-0.5 text-secondary-container">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <span key={index} className={`material-symbols-outlined text-[20px] ${index >= review.stars ? 'text-outline-variant' : ''}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                      star
                    </span>
                  ))}
                </div>
                {editingId === review.id ? (
                  <div className="space-y-3">
                    <textarea
                      className="w-full resize-none rounded-lg border border-outline-variant bg-surface-container-low p-3 font-body-md leading-relaxed text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                      rows={4}
                      value={editDraft}
                      onChange={(event) => setEditDraft(event.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setEditingId(null)} className="px-4 py-2 font-label-lg text-on-surface-variant">
                        취소
                      </button>
                      <button type="button" onClick={() => void saveEdit(review.id)} className="rounded-lg bg-primary px-5 py-2 font-label-lg text-on-primary shadow-md">
                        저장
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="rounded-lg bg-surface-container-low/50 p-3 font-body-md leading-relaxed text-on-surface-variant">{review.text}</p>
                    <div className="mt-4 flex justify-end border-t border-surface-variant/30 pt-4">
                      <button
                        type="button"
                        onClick={() => startEdit(review)}
                        className="rounded-lg border border-primary bg-surface-container-lowest px-5 py-2 font-label-lg text-primary transition-all hover:border-transparent hover:bg-primary-fixed"
                      >
                        Edit Review
                      </button>
                    </div>
                  </>
                )}
              </article>
            ))}
          </section>
        )}

        {!loading && tab === 'pending' && (
          <section className="review-tab-content flex flex-col gap-stack-md px-container-margin">
            {pending.length === 0 && <p className="py-16 text-center font-body-md text-on-surface-variant">작성 대기 중인 리뷰가 없습니다.</p>}
            {pending.map((item) => (
              <article key={item.sessionId} className="group relative overflow-hidden rounded-xl border border-transparent bg-surface-container-lowest p-5 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] transition-all duration-300 hover:border-primary-fixed-dim">
                <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-primary-fixed-dim/40 to-secondary-fixed-dim/20 opacity-50 blur-2xl transition-opacity group-hover:opacity-100" />
                <div className="relative z-10 mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar name={item.teacherName} url={item.teacherAvatarUrl} className="h-14 w-14 rounded-full border-[3px] border-surface-container-lowest shadow-md" />
                    <div className="flex flex-col">
                      <h3 className="font-headline-md text-lg leading-tight text-on-surface">{item.teacherName}</h3>
                      <p className="mt-0.5 flex items-center gap-1 font-label-sm text-outline">
                        <span className="material-symbols-outlined text-[14px]">event_available</span>
                        {new Date(item.scheduledAt).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="relative z-10 mb-5 flex items-start gap-3 rounded-xl border border-surface-variant/30 bg-surface-container-low p-3.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-fixed">
                    <span className="material-symbols-outlined text-[18px] text-primary">record_voice_over</span>
                  </div>
                  <div>
                    <h4 className="mb-0.5 font-label-lg text-on-surface">{item.sessionTitle}</h4>
                  </div>
                </div>

                {writingSessionId === item.sessionId ? (
                  <div className="relative z-10 space-y-3">
                    <textarea
                      autoFocus
                      className="w-full resize-none rounded-xl border border-outline-variant bg-surface-container-low p-3 font-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                      rows={3}
                      placeholder="수업은 어떠셨나요?"
                      value={writeDraft}
                      onChange={(event) => setWriteDraft(event.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setWritingSessionId(null)} className="px-4 py-2 font-label-lg text-on-surface-variant">
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={() => void submitNewReview(item)}
                        className="rounded-lg primary-gradient-btn px-5 py-2 font-label-lg text-white shadow-md"
                      >
                        등록
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setWritingSessionId(item.sessionId);
                      setWriteDraft('');
                    }}
                    className="relative z-10 w-full rounded-xl primary-gradient-btn py-3.5 font-label-lg text-white shadow-md transition-all active:scale-[0.98]"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[20px]">edit_document</span>
                      Write Review
                    </span>
                  </button>
                )}
              </article>
            ))}
          </section>
        )}
      {user && <ListPager page={page} count={tab === 'written' ? written.length : pending.length} loading={loading} onPage={setPage} />}
      </main>
    </div>
    </PageContent>
  );
}
