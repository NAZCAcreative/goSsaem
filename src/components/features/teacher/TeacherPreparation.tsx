"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { formatLessonTime } from "@/lib/time";
type Item = {
  id: string;
  title: string;
  scheduledAt: string;
  kind: "meeting" | "attendance";
};
export function TeacherPreparation({
  refreshKey = 0,
}: {
  refreshKey?: number;
}) {
  const id = useAuthStore((s) => s.user?.id);
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!id) return;
    let active = true;
    setError(false);
    setLoading(true);
    setItems([]);
    void createClient()
      .rpc("my_teacher_preparation")
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setError(true);
        else setItems(data as Item[]);
      })
      .then(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, refreshKey, revision]);
  return (
    <section
      className="mb-6 rounded-2xl border bg-white p-5"
      aria-label="자동 수업 준비 목록"
    >
      <h2 className="font-bold">확인이 필요한 수업</h2>
      <p className="mt-1 text-xs text-slate-500">
        앞으로 7일의 링크 미등록 수업과 최근 30일의 출석 미확정 수업 · 최대 30건
      </p>
      {loading ? (
        <p role="status" className="mt-3">
          준비 상태 확인 중…
        </p>
      ) : error ? (
        <div role="alert">
          <p>준비 목록을 불러오지 못했습니다.</p>
          <button
            className="min-h-11 text-primary"
            onClick={() => setRevision((x) => x + 1)}
          >
            다시 시도
          </button>
        </div>
      ) : items.length ? (
        <ul className="mt-3 divide-y">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={
                  item.kind === "attendance"
                    ? `/teacher/lessons/attendance?session=${item.id}`
                    : `/sessions/${item.id}`
                }
                className="flex min-h-14 flex-wrap items-center justify-between gap-2 py-3"
              >
                <span className="text-sm">
                  {item.title}
                  <small className="mt-1 block text-slate-500">
                    {formatLessonTime(item.scheduledAt)}
                  </small>
                </span>
                <span className="text-sm font-semibold text-violet-700">
                  {item.kind === "meeting" ? "수업 링크 등록 →" : "출석 확정 →"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-slate-500">
          현재 확인이 필요한 수업이 없습니다.
        </p>
      )}
    </section>
  );
}
