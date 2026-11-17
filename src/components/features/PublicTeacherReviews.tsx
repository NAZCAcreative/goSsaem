"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  getPublicReviews,
  reportReview,
  reviewTags,
  type PublicReview,
} from "@/lib/queries/reviews";
import { useAuthStore } from "@/stores/auth-store";

export function PublicTeacherReviews({ teacherId }: { teacherId: string }) {
  const user = useAuthStore((s) => s.user);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("recent");
  const [data, setData] = useState<{
    total: number;
    average: number;
    rows: PublicReview[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [reporting, setReporting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const request = useRef("");
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setData(null);
    getPublicReviews(teacherId, page, sort)
      .then((result) => {
        if (active) setData(result);
      })
      .catch(() => {
        if (active) setError("후기를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [teacherId, page, sort, revision]);
  const report = async (id: string) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setNotice("");
    try {
      await reportReview(id, reason, request.current);
      setReporting(null);
      setNotice(
        "신고가 접수되었습니다. 고객지원에서 처리 상태를 확인할 수 있습니다.",
      );
    } catch (cause) {
      setNotice(
        cause instanceof Error ? cause.message : "신고를 접수하지 못했습니다.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <section
      aria-label="학생 후기"
      className="space-y-4 rounded-xl border bg-white p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">
          학생 후기
          {data ? ` ${data.total}개 · ${data.average.toFixed(1)}점` : ""}
        </h2>
        <select
          aria-label="후기 정렬"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
          className="min-h-11 rounded-lg border px-3"
        >
          <option value="recent">최신순</option>
          <option value="high">높은 평점순</option>
        </select>
      </div>
      {loading && <p role="status">후기를 불러오는 중…</p>}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button
            onClick={() => setRevision((x) => x + 1)}
            className="min-h-11 text-primary"
          >
            다시 시도
          </button>
        </div>
      )}
      {notice && (
        <p role="status">
          {notice}{" "}
          <Link href="/support" className="underline">
            고객지원
          </Link>
        </p>
      )}
      {!loading && data?.total === 0 && (
        <p className="text-sm text-slate-500">아직 등록된 후기가 없습니다.</p>
      )}
      {data?.rows.map((review) => (
        <article key={review.id} className="space-y-3 border-t pt-4">
          <p className="text-sm font-bold">
            {review.name} · {review.rating}점{" "}
            <span className="font-normal text-slate-500">
              {new Date(review.createdAt).toLocaleDateString("ko-KR", {
                timeZone: "Asia/Seoul",
              })}
              {review.edited ? " · 수정됨" : ""}
            </span>
          </p>
          <p className="text-xs text-primary">
            {review.verified ? "수강 완료 확인 · " : ""}
            {review.lessonType === "free_trial"
              ? "무료 체험"
              : review.lessonType === "group"
                ? "그룹 수업"
                : review.lessonType === "1on1"
                  ? "1:1 수업"
                  : ""}
          </p>
          <p className="whitespace-pre-wrap break-words text-sm">
            {review.text}
          </p>
          <p className="text-xs text-primary">
            {review.tags
              .map((tag) => reviewTags[tag])
              .filter(Boolean)
              .join(" · ")}
          </p>
          {review.reply && (
            <div className="rounded-lg bg-violet-50 p-4">
              <h3 className="text-sm font-bold">선생님의 답변</h3>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                {review.reply}
              </p>
            </div>
          )}
          {user &&
            (reporting === review.id ? (
              <div className="space-y-2">
                <label className="block text-sm">
                  신고 사유
                  <textarea
                    disabled={busy}
                    maxLength={1000}
                    minLength={10}
                    value={reason}
                    onChange={(e) => {
                      setReason(e.target.value);
                      request.current = crypto.randomUUID();
                    }}
                    className="mt-2 w-full rounded border p-3"
                    placeholder="개인정보 노출, 욕설 등 신고 사유를 10자 이상 입력해주세요."
                  />
                </label>
                <button
                  disabled={busy || reason.trim().length < 10}
                  onClick={() => void report(review.id)}
                  className="min-h-11 px-4 text-primary"
                >
                  신고 접수
                </button>
                <button
                  disabled={busy}
                  onClick={() => setReporting(null)}
                  className="min-h-11 px-4"
                >
                  취소
                </button>
              </div>
            ) : (
              <button
                disabled={busy}
                className="min-h-11 text-xs text-slate-500"
                onClick={() => {
                  setReporting(review.id);
                  setReason("");
                  request.current = crypto.randomUUID();
                }}
              >
                후기 신고
              </button>
            ))}
        </article>
      ))}
      {data && data.total > 20 && (
        <div className="flex items-center gap-4">
          <button
            disabled={page === 1 || loading || busy}
            onClick={() => setPage((x) => x - 1)}
            className="min-h-11 px-3"
          >
            이전
          </button>
          <span>
            {page} / {Math.ceil(data.total / 20)}
          </span>
          <button
            disabled={page * 20 >= data.total || loading || busy}
            onClick={() => setPage((x) => x + 1)}
            className="min-h-11 px-3"
          >
            다음
          </button>
        </div>
      )}
    </section>
  );
}
