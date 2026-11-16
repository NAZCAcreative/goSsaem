"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ServicePage, actionClass } from "@/components/shared/ServicePage";
import { createClient } from "@/lib/supabase/client";
import { formatLessonTime } from "@/lib/time";
import { useAuthStore } from "@/stores/auth-store";
type Report = {
  completed: number;
  minutes: number;
  upcoming: number;
  lessons: {
    id: string;
    title: string;
    scheduledAt: string;
    duration: number;
    teacherName: string;
    attendance: string | null;
  }[];
};
export default function Page() {
  const user = useAuthStore((state) => state.user);
  const [data, setData] = useState<Report | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    setError("");
    void createClient()
      .rpc("my_learning_report", { p_page: page })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setError("학습 기록을 불러오지 못했습니다.");
          return;
        }
        setData(data as unknown as Report);
      })
      .then(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, page]);
  return (
    <ServicePage
      title="내 학습 기록"
      description="수업 종료 후 선생님이 출석을 확정한 수업을 기준으로 집계합니다."
    >
      {loading && <p role="status">학습 기록을 불러오는 중...</p>}
      {error && (
        <p role="alert" className="text-error">
          {error}
        </p>
      )}
      {data && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              ["완료 수업", `${data.completed}회`],
              ["수업 시간", `${data.minutes}분`],
              ["예정 수업", `${data.upcoming}회`],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-outline-variant/30 bg-surface p-4"
              >
                <p className="text-sm text-on-surface-variant">{label}</p>
                <p className="mt-2 text-xl font-bold">{value}</p>
              </div>
            ))}
          </div>
          <section className="space-y-4">
            <h2 className="text-xl font-bold">완료한 수업</h2>
            {!data.lessons.length && (
              <p>완료 기록이 없습니다. 수업 후 다시 확인해주세요.</p>
            )}
            {data.lessons.map((lesson) => (
              <article
                key={lesson.id}
                className="rounded-xl border border-outline-variant/30 p-5"
              >
                <h3 className="font-bold">{lesson.title}</h3>
                <p className="mt-2">
                  {lesson.teacherName} · {lesson.duration}분
                </p>
                <p className="mt-2 text-sm text-on-surface-variant">
                  {formatLessonTime(lesson.scheduledAt)}
                </p>
                <Link
                  className="inline-flex min-h-11 items-center text-primary"
                  href={`/student/bookings/${lesson.id}`}
                >
                  수업 상세·자료
                </Link>
              </article>
            ))}
          </section>
          <div className="flex gap-4">
            <button
              className={actionClass}
              disabled={loading || page === 1}
              onClick={() => setPage((value) => value - 1)}
            >
              이전
            </button>
            <button
              className={actionClass}
              disabled={loading || data.lessons.length < 20}
              onClick={() => setPage((value) => value + 1)}
            >
              다음
            </button>
          </div>
        </>
      )}
    </ServicePage>
  );
}
