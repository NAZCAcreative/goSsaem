"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import {
  earningsChange,
  getTeacherEarnings,
  type EarningsMonth,
} from "@/lib/queries/teacherEarnings";

const money = (amount: number) => `${amount.toLocaleString("ko-KR")}원`;

export function TeacherEarningsChart({
  refreshKey = 0,
}: {
  refreshKey?: number;
}) {
  const teacherId = useAuthStore((state) => state.user?.id);
  const [months, setMonths] = useState<EarningsMonth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setMonths([]);
    setLoading(true);
    setError(false);
    if (!teacherId) {
      setLoading(false);
      return;
    }
    getTeacherEarnings(teacherId)
      .then((result) => {
        if (!cancelled) setMonths(result);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teacherId, refreshKey, retry]);
  const current = months[5]?.amount ?? 0;
  const previous = months[4]?.amount ?? 0;
  const change = earningsChange(current, previous);
  const max = Math.max(1, ...months.map((month) => month.amount));
  return (
    <section
      aria-label="최근 6개월 수익 추이"
      className="mt-5 border-t border-slate-100 pt-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-800">
            최근 6개월 수익 추이
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            수수료 차감 후 정산 적립액 · 원
          </p>
        </div>
        {!loading && !error && months.length > 0 && (
          <p className="text-right text-xs text-slate-600">
            이번 달 전월 대비{" "}
            <strong className="text-violet-700">
              {change === null
                ? current > 0
                  ? "신규 수익"
                  : "비교 기준 없음"
                : `${change > 0 ? "+" : ""}${change.toFixed(1)}%`}
            </strong>
            <span className="mt-1 block text-slate-400">
              이번 달은 현재까지의 금액입니다
            </span>
          </p>
        )}
      </div>
      {loading ? (
        <p role="status" className="py-8 text-sm text-slate-500">
          수익 추이를 불러오는 중…
        </p>
      ) : error ? (
        <div role="alert" className="mt-3 text-sm text-red-700">
          <p>수익 추이를 불러오지 못했습니다.</p>
          <button
            onClick={() => setRetry((value) => value + 1)}
            className="min-h-11 font-semibold underline"
          >
            그래프 다시 불러오기
          </button>
        </div>
      ) : (
        <>
          <ol
            aria-label="월별 정산 적립액"
            className="mt-5 grid grid-cols-6 gap-1 sm:gap-4"
          >
            {months.map((month, index) => (
              <li key={month.month} className="min-w-0 text-center">
                <p className="break-words text-[10px] font-semibold tabular-nums text-slate-600 sm:text-xs">
                  {money(month.amount)}
                </p>
                <div
                  aria-hidden="true"
                  className="mt-2 flex h-32 items-end justify-center rounded-lg bg-slate-50"
                >
                  <div
                    className={`w-2/3 max-w-16 rounded-t-md ${index === 5 ? "bg-violet-600" : "bg-violet-300"}`}
                    style={{ height: `${(month.amount / max) * 100}%` }}
                  />
                </div>
                <p className="mt-2 text-[10px] text-slate-500 sm:text-xs">
                  {month.month.replace("-", ".")}
                </p>
              </li>
            ))}
          </ol>
          {months.every((month) => month.amount === 0) && (
            <p className="mt-4 text-center text-sm text-slate-500">
              최근 6개월간 정산 적립된 수익이 없습니다.
            </p>
          )}
          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            정산 기간의 시작 월 기준으로 집계합니다. 증감률은 전월 정산액과
            비교하며, 전월 금액이 0원이면 계산하지 않습니다.
          </p>
        </>
      )}
    </section>
  );
}
