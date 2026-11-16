"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatLessonTime } from "@/lib/time";
type Health = {
  jobs: {
    id: string;
    status: string;
    failures: number;
    started_at: string;
    finished_at: string | null;
  }[];
  googleReady: boolean;
  schemaVersion: number;
  stalePayments: number;
};
export function RuntimeHealth() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const load = () =>
      createClient()
        .rpc("admin_runtime_health")
        .then(({ data, error }) => {
          if (!active) return;
          if (error) setError("운영 작업 상태를 확인하지 못했습니다.");
          else {
            setHealth(data as unknown as Health);
            setError("");
          }
        });
    void load();
    const timer = setInterval(() => void load(), 60000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  return (
    <section className="space-y-3 rounded-xl border border-outline-variant/30 p-5">
      <h2 className="text-xl font-bold">운영 작업 상태</h2>
      {error && (
        <p role="alert" className="text-error">
          {error}
        </p>
      )}
      {health && (
        <>
          <p>
            10분 이상 확인 대기 중인 결제 {health.stalePayments}건 · Google 가입
            DB 준비 {health.googleReady ? "완료" : "미완료"}
          </p>
          {health.jobs.length === 0 ? (
            <p className="text-error">
              아직 유지보수 작업 실행 이력이 없습니다. 정기 실행 연결을
              확인해주세요.
            </p>
          ) : (
            <>
              <p
                className={
                  Date.now() - Date.parse(health.jobs[0].started_at) >
                  10 * 60 * 1000
                    ? "text-error"
                    : "text-on-surface-variant"
                }
              >
                최근 실행: {formatLessonTime(health.jobs[0].started_at)} ·{" "}
                {
                  (
                    {
                      running: "실행 중",
                      completed: "완료",
                      failed: "실패",
                    } as Record<string, string>
                  )[health.jobs[0].status]
                }{" "}
                · 실패 {health.jobs[0].failures}건
              </p>
              <p className="text-sm text-on-surface-variant">
                실패·장시간 미실행은 예약·결제 복구·메일 발송을 확인해야 한다는
                뜻입니다.
              </p>
            </>
          )}
        </>
      )}
    </section>
  );
}
