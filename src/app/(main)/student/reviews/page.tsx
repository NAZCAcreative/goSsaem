"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useAuthStore } from "@/stores/auth-store";
import {
  createReview,
  listMyWrittenReviews,
  listPendingReviewTargets,
  getPendingReviewTarget,
  updateReviewText,
  reviewTags,
  type WrittenReviewRow,
  type PendingReviewTarget,
} from "@/lib/queries/reviews";
import { formatLessonTime } from "@/lib/time";
import { ListPager } from "@/components/shared/ListPager";
import { PageLoading } from "@/components/shared/PageLoading";
import { useUnsavedWarning } from "@/lib/use-unsaved-warning";

export default function ReviewsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Reviews />
    </Suspense>
  );
}
function Reviews() {
  const params = useSearchParams();
  const target = params.get("session");
  const user = useAuthStore((s) => s.user);
  const ready = useAuthStore((s) => s.isHydrated);
  const [tab, setTab] = useState<"written" | "pending">(
    target ? "pending" : "written",
  );
  const [page, setPage] = useState(1);
  const [written, setWritten] = useState<WrittenReviewRow[]>([]);
  const [pending, setPending] = useState<PendingReviewTarget[]>([]);
  const [targetReview, setTargetReview] = useState<PendingReviewTarget | null>(
    null,
  );
  const [writing, setWriting] = useState<string | null>(target);
  const [draft, setDraft] = useState("");
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  useUnsavedWarning(
    Boolean(
      (writing && draft.trim()) ||
        (editing &&
          editDraft !== written.find((row) => row.id === editing)?.text),
    ),
  );
  useEffect(() => {
    if (!ready) return;
    setWritten([]);
    setPending([]);
    setError("");
    if (!user) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    Promise.all([
      listMyWrittenReviews(user.id, page),
      listPendingReviewTargets(user.id, page),
      target ? getPendingReviewTarget(target) : Promise.resolve(null),
    ])
      .then(([a, b, c]) => {
        if (active) {
          setWritten(a);
          setPending(b);
          setTargetReview(c);
        }
      })
      .catch(() => {
        if (active) setError("후기를 불러오지 못했습니다. 다시 시도해주세요.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ready, user, page, revision, target]);
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "저장하지 못했습니다. 입력 내용은 유지됩니다.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const submit = (item: PendingReviewTarget) =>
    void run(async () => {
      if (!user) return;
      await createReview({
        studentId: user.id,
        teacherId: item.teacherId,
        sessionId: item.sessionId,
        rating,
        text: draft,
        tags,
      });
      setWriting(null);
      setDraft("");
      setRating(0);
      setTags([]);
      setTab("written");
      setPage(1);
      setRevision((x) => x + 1);
      setNotice("후기가 등록되었습니다.");
    });
  const visiblePending =
    targetReview &&
    page === 1 &&
    !pending.some((item) => item.sessionId === targetReview.sessionId)
      ? [targetReview, ...pending]
      : pending;
  return (
    <main className="mx-auto max-w-3xl space-y-5 px-container-margin py-8 pb-28">
      <Link
        href="/student/profile"
        className="inline-flex min-h-11 items-center text-primary"
      >
        ← 내 정보
      </Link>
      <h1 className="text-2xl font-bold">후기 관리</h1>
      <nav aria-label="후기 상태" className="flex gap-2">
        {(["written", "pending"] as const).map((value) => (
          <button
            key={value}
            disabled={busy}
            aria-pressed={tab === value}
            onClick={() => {
              setTab(value);
              setPage(1);
            }}
            className={`min-h-11 rounded-xl px-5 ${tab === value ? "bg-primary text-white" : "bg-slate-100"}`}
          >
            {value === "written" ? "작성한 후기" : "작성 대기"}
          </button>
        ))}
      </nav>
      {notice && (
        <p role="status" className="text-primary">
          {notice}
        </p>
      )}
      {error && (
        <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
          <p>{error}</p>
          <button
            disabled={busy}
            className="min-h-11 underline"
            onClick={() => setRevision((x) => x + 1)}
          >
            다시 불러오기
          </button>
        </div>
      )}
      {loading ? (
        <p role="status">후기를 불러오는 중…</p>
      ) : (
        !error && (
          <>
            {tab === "written" &&
              (written.length ? (
                written.map((review) => (
                  <article
                    key={review.id}
                    className="space-y-3 rounded-xl border bg-white p-5"
                  >
                    <h2 className="font-bold">{review.teacherName} 선생님</h2>
                    <p className="text-xs text-slate-500">{review.meta}</p>
                    <p
                      aria-label={`${review.stars}점`}
                      className="text-amber-600"
                    >
                      {"★".repeat(review.stars)}
                      {"☆".repeat(5 - review.stars)}
                    </p>
                    <p className="text-xs text-primary">
                      {review.tags
                        .map((tag) => reviewTags[tag])
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {editing === review.id ? (
                      <div className="space-y-2">
                        <textarea
                          aria-label="후기 수정"
                          disabled={busy}
                          maxLength={2000}
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          className="min-h-28 w-full rounded-lg border p-3"
                        />
                        <p className="text-xs">
                          {editDraft.length}/2,000자 · 별점은 유지됩니다.
                        </p>
                        <button
                          disabled={busy || !editDraft.trim()}
                          className="min-h-11 px-4 text-primary"
                          onClick={() =>
                            void run(async () => {
                              await updateReviewText(review.id, editDraft);
                              setWritten((rows) =>
                                rows.map((row) =>
                                  row.id === review.id
                                    ? { ...row, text: editDraft.trim() }
                                    : row,
                                ),
                              );
                              setEditing(null);
                              setNotice("후기가 수정되었습니다.");
                            })
                          }
                        >
                          {busy ? "저장 중…" : "저장"}
                        </button>
                        <button
                          disabled={busy}
                          className="min-h-11 px-4"
                          onClick={() => setEditing(null)}
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="whitespace-pre-wrap break-words">
                          {review.text}
                        </p>
                        <button
                          disabled={busy}
                          className="min-h-11 text-primary"
                          onClick={() => {
                            setEditing(review.id);
                            setEditDraft(review.text);
                          }}
                        >
                          내용 수정
                        </button>
                      </>
                    )}
                    {review.teacherReply && (
                      <div className="rounded-lg bg-violet-50 p-4">
                        <h3 className="text-sm font-bold">선생님의 답변</h3>
                        <p className="mt-2 whitespace-pre-wrap break-words">
                          {review.teacherReply}
                        </p>
                      </div>
                    )}
                  </article>
                ))
              ) : (
                <p>아직 작성한 후기가 없습니다.</p>
              ))}
            {tab === "pending" &&
              (visiblePending.length ? (
                [...visiblePending]
                  .sort(
                    (a, b) =>
                      Number(b.sessionId === target) -
                      Number(a.sessionId === target),
                  )
                  .map((item) => (
                    <article
                      key={item.sessionId}
                      className="space-y-3 rounded-xl border bg-white p-5"
                    >
                      <h2 className="font-bold">{item.sessionTitle}</h2>
                      <p className="text-sm">
                        {item.teacherName} 선생님 ·{" "}
                        {formatLessonTime(item.scheduledAt)}
                      </p>
                      {writing === item.sessionId ? (
                        <fieldset disabled={busy} className="space-y-3">
                          <legend className="mb-2 font-semibold">
                            수업은 어떠셨나요?
                          </legend>
                          <div
                            role="group"
                            aria-label="별점 선택"
                            className="flex gap-2"
                          >
                            {[1, 2, 3, 4, 5].map((value) => (
                              <button
                                type="button"
                                key={value}
                                aria-label={`${value}점`}
                                aria-pressed={rating === value}
                                onClick={() => setRating(value)}
                                className={`min-h-11 min-w-11 rounded-lg text-3xl ${value <= rating ? "text-amber-500" : "text-slate-300"}`}
                              >
                                ★
                              </button>
                            ))}
                          </div>
                          <p className="text-sm">
                            {rating
                              ? `${rating}점을 선택했습니다.`
                              : "별점을 선택해주세요."}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(reviewTags).map(([key, label]) => (
                              <button
                                key={key}
                                type="button"
                                aria-pressed={tags.includes(key)}
                                onClick={() =>
                                  setTags((values) =>
                                    values.includes(key)
                                      ? values.filter((v) => v !== key)
                                      : values.length < 3
                                        ? [...values, key]
                                        : values,
                                  )
                                }
                                className={`min-h-11 rounded-full border px-3 text-xs ${tags.includes(key) ? "bg-violet-100 text-violet-800" : ""}`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-slate-500">
                            태그는 최대 3개를 선택할 수 있습니다.
                          </p>
                          <textarea
                            aria-label="후기 내용"
                            rows={4}
                            maxLength={2000}
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder="좋았던 점과 아쉬웠던 점을 자유롭게 남겨주세요."
                            className="w-full rounded-lg border p-3"
                          />
                          <p className="text-xs text-slate-500">
                            {draft.length}/2,000자 · 공개 후기에는 이름 첫
                            글자와 ***가 표시됩니다. 개인정보를 적지 마세요.
                          </p>
                          <button
                            type="button"
                            disabled={!rating || !draft.trim()}
                            onClick={() => submit(item)}
                            className="min-h-11 rounded-lg bg-primary px-5 text-white disabled:opacity-40"
                          >
                            {busy ? "등록 중…" : "후기 등록"}
                          </button>
                          <button
                            type="button"
                            className="min-h-11 px-4"
                            onClick={() => setWriting(null)}
                          >
                            취소
                          </button>
                        </fieldset>
                      ) : (
                        <button
                          disabled={busy}
                          className="min-h-11 text-primary"
                          onClick={() => {
                            setWriting(item.sessionId);
                            setDraft("");
                            setRating(0);
                            setTags([]);
                          }}
                        >
                          후기 작성
                        </button>
                      )}
                    </article>
                  ))
              ) : (
                <p>
                  작성 대기 중인 후기가 없습니다. 출석 확정 후 작성할 수
                  있습니다.
                </p>
              ))}
            {target && tab === "pending" && !targetReview && (
              <p className="text-sm text-slate-500">
                해당 수업은 이미 후기를 작성했거나 출석 확정 전일 수 있습니다.
              </p>
            )}
            <ListPager
              page={page}
              count={tab === "written" ? written.length : pending.length}
              loading={busy}
              onPage={setPage}
            />
          </>
        )
      )}
    </main>
  );
}
