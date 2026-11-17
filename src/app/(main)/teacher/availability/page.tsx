"use client";
import { useEffect, useState } from "react";
import {
  ServicePage,
  actionClass,
  fieldClass,
} from "@/components/shared/ServicePage";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
type Slot = { weekday: number; start_time: string; end_time: string };
const days = ["일", "월", "화", "수", "목", "금", "토"];
export default function Page() {
  const user = useAuthStore((state) => state.user);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [off, setOff] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!user) return;
    let active = true;
    void Promise.all([
      createClient()
        .from("teacher_availability")
        .select("weekday,start_time,end_time")
        .eq("teacher_id", user.id)
        .order("weekday")
        .order("start_time"),
      createClient()
        .from("teacher_days_off")
        .select("day")
        .eq("teacher_id", user.id)
        .order("day"),
    ])
      .then(([a, b]) => {
        if (!active) return;
        if (a.error || b.error) throw new Error();
        setSlots(a.data || []);
        setOff((b.data || []).map((row) => row.day).join("\n"));
      })
      .catch(() => {
        if (active) setError("일정을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const dates = off.split(/[\s,]+/).filter(Boolean);
      if (dates.some((value) => !/^\d{4}-\d{2}-\d{2}$/.test(value)))
        throw new Error("휴무일은 YYYY-MM-DD 형식으로 입력해주세요.");
      const { error } = await createClient().rpc("save_teacher_availability", {
        p_slots: slots,
        p_days_off: dates,
      });
      if (error)
        throw new Error("시간 구간이 겹치거나 입력이 올바르지 않습니다.");
      setMessage("일정이 저장되었습니다. 기존 예약은 유지됩니다.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <ServicePage
      title="가능 시간·휴무 관리"
      description="한국 시간 기준의 공통 상담 시간과 휴무입니다. 수업별 예약 가능 시간은 수업 관리에서 설정합니다. 휴무는 모든 수업의 신규 예약에 적용되며 기존 확정 예약은 취소되지 않습니다."
    >
      <form className="space-y-6" onSubmit={save}>
        <fieldset disabled={busy || loading} className="space-y-4">
          <legend className="mb-3 text-lg font-bold">주간 반복 시간</legend>
          {slots.map((slot, index) => (
            <div
              key={index}
              className="grid grid-cols-2 items-end gap-3 rounded-xl border border-outline-variant/30 p-4 sm:grid-cols-4"
            >
              <label>
                요일
                <select
                  aria-label={`${index + 1}번 구간 요일`}
                  className={fieldClass}
                  value={slot.weekday}
                  onChange={(event) =>
                    setSlots((values) =>
                      values.map((value, i) =>
                        i === index
                          ? { ...value, weekday: Number(event.target.value) }
                          : value,
                      ),
                    )
                  }
                >
                  {days.map((day, i) => (
                    <option key={day} value={i}>
                      {day}요일
                    </option>
                  ))}
                </select>
              </label>
              <label>
                시작
                <input
                  required
                  type="time"
                  className={fieldClass}
                  value={slot.start_time.slice(0, 5)}
                  onChange={(event) =>
                    setSlots((values) =>
                      values.map((value, i) =>
                        i === index
                          ? { ...value, start_time: event.target.value }
                          : value,
                      ),
                    )
                  }
                />
              </label>
              <label>
                종료
                <input
                  required
                  type="time"
                  className={fieldClass}
                  value={slot.end_time.slice(0, 5)}
                  onChange={(event) =>
                    setSlots((values) =>
                      values.map((value, i) =>
                        i === index
                          ? { ...value, end_time: event.target.value }
                          : value,
                      ),
                    )
                  }
                />
              </label>
              <button
                type="button"
                className="min-h-12 text-error"
                onClick={() =>
                  setSlots((values) => values.filter((_, i) => i !== index))
                }
              >
                구간 삭제
              </button>
            </div>
          ))}
          <button
            type="button"
            disabled={slots.length >= 50}
            className="min-h-11 text-primary"
            onClick={() =>
              setSlots((values) => [
                ...values,
                { weekday: 1, start_time: "09:00", end_time: "12:00" },
              ])
            }
          >
            가능 시간 추가
          </button>
          <label className="block font-semibold">
            휴무일
            <textarea
              className={fieldClass}
              rows={5}
              value={off}
              onChange={(event) => setOff(event.target.value)}
              placeholder="YYYY-MM-DD, 한 줄에 하루"
            />
          </label>
          <button className={actionClass}>전체 일정 저장</button>
        </fieldset>
        {loading && <p role="status">일정을 불러오는 중...</p>}
        {error && (
          <p role="alert" className="text-error">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="text-primary">
            {message}
          </p>
        )}
      </form>
    </ServicePage>
  );
}
