"use client";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { createClient } from "@/lib/supabase/client";
export function LearningGoal() {
  const id = useAuthStore((s) => s.user?.id);
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const lock = useRef(false);
  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    setReady(false);
    setError("");
    void createClient()
      .from("learning_goals")
      .select("goal")
      .eq("student_id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (active) {
          if (error) setError("목표를 불러오지 못했습니다.");
          else {
            setGoal(data?.goal ?? "");
            setReady(true);
          }
        }
      })
      .then(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, revision]);
  const save = async () => {
    if (!id || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { error } = await createClient()
        .from("learning_goals")
        .upsert({
          student_id: id,
          goal: goal.trim(),
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
      setMessage("학습 목표를 저장했습니다.");
    } catch {
      setError("저장하지 못했습니다. 입력 내용은 유지됩니다.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <section className="space-y-3 rounded-xl border p-5">
      <label className="block font-bold">
        나의 학습 목표
        <textarea
          aria-label="나의 학습 목표"
          disabled={loading || busy || !ready}
          rows={2}
          maxLength={500}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="예: 여행에서 한국어로 주문하고 길을 물어보기"
          className="mt-3 w-full rounded-lg border p-3 text-sm font-normal"
        />
      </label>
      <button
        disabled={!ready || busy || !goal.trim()}
        onClick={() => void save()}
        className="min-h-11 px-3 text-primary"
      >
        {busy ? "저장 중…" : "목표 저장"}
      </button>
      <p className="text-xs text-slate-500">
        나에게만 보이는 목표입니다. {goal.length}/500자
      </p>
      {error && (
        <div role="alert">
          <p>{error}</p>
          {!ready && (
            <button
              className="min-h-11"
              onClick={() => setRevision((x) => x + 1)}
            >
              다시 불러오기
            </button>
          )}
        </div>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
