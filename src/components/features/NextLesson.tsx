"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { formatLessonTime } from "@/lib/time";
import { useTimeZone } from "@/lib/use-time-zone";
type Next = {
  enrollmentId: string;
  sessionId: string;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  teacherName: string;
};
export function NextLesson() {
  const id = useAuthStore((s) => s.user?.id);
  const zone = useTimeZone();
  const [data, setData] = useState<Next | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setData(null);
    setError(false);
    void createClient()
      .rpc("my_next_lesson")
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setError(true);
        else setData(data as Next | null);
      })
      .then(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, revision]);
  if (!id) return null;
  return (
    <section
      aria-label="다음 수업"
      className="space-y-3 rounded-2xl border border-violet-200 bg-violet-50 p-6"
    >
      <h2 className="text-lg font-bold">나의 다음 수업</h2>
      {loading ? (
        <p role="status">다음 수업을 확인하고 있어요…</p>
      ) : error ? (
        <div role="alert">
          <p>다음 수업을 불러오지 못했습니다.</p>
          <button
            className="min-h-11 text-primary"
            onClick={() => setRevision((x) => x + 1)}
          >
            다시 시도
          </button>
        </div>
      ) : data ? (
        <>
          <h3 className="text-xl font-bold">{data.title}</h3>
          <p>
            {data.teacherName} 쌤 · {data.durationMinutes}분
          </p>
          <p className="font-semibold">
            {formatLessonTime(data.scheduledAt, zone)}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/sessions/${data.sessionId}`}
              className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-white"
            >
              수업 대기실·자료
            </Link>
            <Link
              href={`/student/bookings/${data.enrollmentId}`}
              className="inline-flex min-h-11 items-center px-3 text-primary"
            >
              예약 상세
            </Link>
          </div>
          <p className="text-xs text-slate-600">
            실제 입장 가능 시간과 수업 링크는 대기실에서 확인합니다.
          </p>
        </>
      ) : (
        <p>예정된 수업이 없습니다. 관심 있는 수업을 찾아보세요.</p>
      )}
    </section>
  );
}
