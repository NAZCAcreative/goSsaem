"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
type Metrics = { completed: number; students: number; returning: number };
export function TeacherMetrics({ refreshKey = 0 }: { refreshKey?: number }) {
  const id = useAuthStore((s) => s.user?.id);
  const [data, setData] = useState<Metrics | null>(null);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!id) return;
    let active = true;
    setData(null);
    setError(false);
    void createClient()
      .rpc("my_teacher_metrics")
      .then(({ data, error }) => {
        if (active) {
          if (error) setError(true);
          else setData(data as Metrics);
        }
      });
    return () => {
      active = false;
    };
  }, [id, refreshKey, revision]);
  return (
    <section aria-label="수업 운영 지표" className="mt-5 border-t pt-5">
      <h3 className="text-sm font-bold">수업 운영 지표</h3>
      {error ? (
        <div role="alert">
          <p>운영 지표를 불러오지 못했습니다.</p>
          <button
            onClick={() => setRevision((x) => x + 1)}
            className="min-h-11 text-primary"
          >
            다시 시도
          </button>
        </div>
      ) : data ? (
        <dl className="mt-3 grid grid-cols-3 gap-3">
          {[
            ["완료 수강 건수", data.completed],
            ["첫 수강 학생", data.students - data.returning],
            ["재수강 학생", data.returning],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-slate-500">{label}</dt>
              <dd className="mt-1 text-lg font-bold">{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p role="status" className="mt-2 text-sm text-slate-500">
          운영 지표 확인 중…
        </p>
      )}
      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        전체 기간의 완료 예약 기준입니다. 첫 수강 학생은 완료 1회, 재수강 학생은
        완료 2회 이상인 학생 수이며 무료 체험도 포함합니다.
      </p>
    </section>
  );
}
