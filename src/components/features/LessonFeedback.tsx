"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUnsavedWarning } from "@/lib/use-unsaved-warning";
type Feedback = {
  strengths: string;
  practice: string;
  next_steps: string;
  published: boolean;
  practice_done: boolean;
};
const empty: Feedback = {
  strengths: "",
  practice: "",
  next_steps: "",
  published: false,
  practice_done: false,
};
export function LessonFeedback({
  enrollmentId,
  teacher = false,
}: {
  enrollmentId: string;
  teacher?: boolean;
}) {
  const [data, setData] = useState<Feedback>(empty);
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const lock = useRef(false);
  const [dirty, setDirty] = useState(false);
  useUnsavedWarning(dirty);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoaded(false);
    setError("");
    setData(empty);
    setExists(false);
    void createClient()
      .from("lesson_feedback")
      .select("strengths,practice,next_steps,published,practice_done")
      .eq("enrollment_id", enrollmentId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setError("피드백을 불러오지 못했습니다.");
        else {
          setLoaded(true);
          if (data) {
            setData(data);
            setExists(true);
          }
        }
      })
      .then(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [enrollmentId, revision]);
  const save = async (publish: boolean) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { error } = teacher
        ? await createClient().rpc("save_lesson_feedback", {
            p_enrollment: enrollmentId,
            p_strengths: data.strengths,
            p_practice: data.practice,
            p_next: data.next_steps,
            p_publish: publish,
          })
        : await createClient().rpc("set_practice_done", {
            p_enrollment: enrollmentId,
            p_done: !data.practice_done,
          });
      if (error) throw error;
      setData((value) =>
        teacher
          ? { ...value, published: publish }
          : { ...value, practice_done: !value.practice_done },
      );
      setDirty(false);
      setExists(true);
      setNotice(
        teacher
          ? publish
            ? "학생에게 공개했습니다."
            : "비공개 초안으로 저장했습니다."
          : "복습 상태를 저장했습니다.",
      );
    } catch {
      setError("저장하지 못했습니다. 입력 내용은 유지됩니다.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <section
      className="space-y-3 rounded-xl border bg-white p-5"
      aria-label="수업 피드백"
    >
      <h2 className="font-bold">수업 피드백</h2>
      {loading ? (
        <p role="status">피드백을 불러오는 중…</p>
      ) : teacher ? (
        <>
          <p className="text-xs text-slate-500">
            비공개 학생 노트와 별개입니다. 공개하면 학생의 예약 상세와 학습
            기록에 표시됩니다.
          </p>
          {(["strengths", "practice", "next_steps"] as const).map(
            (key, index) => (
              <label key={key} className="block text-sm">
                {["잘한 점", "복습할 표현·연습", "다음 수업 준비"][index]}
                <textarea
                  disabled={busy || !loaded}
                  aria-label={
                    ["잘한 점", "복습할 표현·연습", "다음 수업 준비"][index]
                  }
                  maxLength={2000}
                  rows={3}
                  value={data[key]}
                  onChange={(e) => {
                    setData((value) => ({ ...value, [key]: e.target.value }));
                    setDirty(true);
                  }}
                  className="mt-2 w-full rounded-lg border p-3"
                />
              </label>
            ),
          )}
          <p className="text-xs">
            현재 상태: {data.published ? "학생에게 공개됨" : "비공개 초안"}
          </p>
          <p className="whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-sm">
            공개 내용 미리보기
            {`\n잘한 점: ${data.strengths}\n복습: ${data.practice}\n다음 준비: ${data.next_steps}`}
          </p>
          <button
            disabled={
              busy || !loaded || !data.strengths.trim() || !data.practice.trim()
            }
            onClick={() => void save(false)}
            className="min-h-11 px-3 text-primary"
          >
            비공개 초안 저장
          </button>
          <button
            disabled={
              busy || !loaded || !data.strengths.trim() || !data.practice.trim()
            }
            onClick={() => void save(true)}
            className="min-h-11 rounded-lg bg-primary px-4 text-white"
          >
            {busy ? "저장 중…" : "학생에게 공개"}
          </button>
        </>
      ) : exists ? (
        <>
          <h3 className="text-sm font-bold">잘한 점</h3>
          <p className="whitespace-pre-wrap break-words">{data.strengths}</p>
          <h3 className="text-sm font-bold">복습할 표현·연습</h3>
          <p className="whitespace-pre-wrap break-words">{data.practice}</p>
          {data.next_steps && (
            <>
              <h3 className="text-sm font-bold">다음 수업 준비</h3>
              <p className="whitespace-pre-wrap break-words">
                {data.next_steps}
              </p>
            </>
          )}
          <button
            disabled={busy}
            onClick={() => void save(true)}
            aria-pressed={data.practice_done}
            className="min-h-11 rounded-lg border px-4 text-primary"
          >
            {data.practice_done ? "복습 완료 ✓ · 취소하기" : "복습 완료 표시"}
          </button>
        </>
      ) : (
        !error && (
          <p className="text-sm text-slate-500">
            아직 공개된 피드백이 없습니다.
          </p>
        )
      )}
      {error && (
        <div role="alert">
          <p>{error}</p>
          {!busy && !loaded && (
            <button
              className="min-h-11 text-primary"
              onClick={() => setRevision((x) => x + 1)}
            >
              다시 불러오기
            </button>
          )}
        </div>
      )}
      {notice && (
        <p role="status" className="text-sm text-primary">
          {notice}
        </p>
      )}
    </section>
  );
}
