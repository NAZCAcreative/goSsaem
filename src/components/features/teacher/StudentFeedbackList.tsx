"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { LessonFeedback } from "@/components/features/LessonFeedback";
import { formatLessonTime } from "@/lib/time";
export function StudentFeedbackList({ studentId }: { studentId: string }) {
  const teacherId = useAuthStore((s) => s.user?.id);
  const [rows, setRows] = useState<{ id: string; title: string; at: string }[]>(
    [],
  );
  const [page, setPage] = useState(1);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!teacherId) return;
    let active = true;
    setLoading(true);
    setError(false);
    setRows([]);
    void createClient()
      .from("enrollments")
      .select("id,lesson_sessions!inner(title,scheduled_at,teacher_id)")
      .eq("student_id", studentId)
      .eq("status", "completed")
      .eq("lesson_sessions.teacher_id", teacherId)
      .order("created_at", { ascending: false })
      .order("id")
      .range((page - 1) * 5, page * 5 - 1)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setError(true);
        else
          setRows(
            (data ?? []).map((row) => {
              const session = Array.isArray(row.lesson_sessions)
                ? row.lesson_sessions[0]
                : row.lesson_sessions;
              return {
                id: row.id,
                title: session.title,
                at: session.scheduled_at,
              };
            }),
          );
      })
      .then(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [teacherId, studentId, page, revision]);
  return (
    <section className="mt-6 space-y-4">
      <h2 className="text-xl font-bold">수업별 공개 피드백</h2>
      {loading ? (
        <p role="status">완료 수업을 불러오는 중…</p>
      ) : error ? (
        <div role="alert">
          <p>수업 목록을 불러오지 못했습니다.</p>
          <button
            onClick={() => setRevision((x) => x + 1)}
            className="min-h-11 text-primary"
          >
            다시 시도
          </button>
        </div>
      ) : (
        <>
          {!rows.length && <p>출석 확정으로 완료된 수업이 없습니다.</p>}
          {rows.map((row) => (
            <details key={row.id} className="rounded-xl border bg-white p-4">
              <summary className="cursor-pointer py-2 text-sm font-semibold">
                {row.title} · {formatLessonTime(row.at)}
              </summary>
              <LessonFeedback enrollmentId={row.id} teacher />
            </details>
          ))}
          <div className="flex gap-3">
            <button
              disabled={page === 1}
              onClick={() => setPage((x) => x - 1)}
              className="min-h-11 px-3"
            >
              이전
            </button>
            <span className="self-center">{page}페이지</span>
            <button
              disabled={rows.length < 5}
              onClick={() => setPage((x) => x + 1)}
              className="min-h-11 px-3"
            >
              다음
            </button>
          </div>
        </>
      )}
    </section>
  );
}
