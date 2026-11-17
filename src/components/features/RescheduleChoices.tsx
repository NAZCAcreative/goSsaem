"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatLessonTime } from "@/lib/time";
import { useTimeZone } from "@/lib/use-time-zone";
export function RescheduleChoices({
  lessonId,
  value,
  onChange,
}: {
  lessonId: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const zone = useTimeZone();
  const [day, setDay] = useState("");
  const [slots, setSlots] = useState<{ start: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!day) return;
    let active = true;
    setLoading(true);
    setError("");
    setSlots([]);
    void createClient()
      .rpc("lesson_booking_slots", { p_lesson: lessonId, p_day: day })
      .then(({ data, error }) => {
        if (active) {
          if (error)
            setError(
              "가능한 시간을 불러오지 못했습니다. 날짜를 다시 선택해주세요.",
            );
          else setSlots(data as { start: string }[]);
        }
      })
      .then(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [lessonId, day]);
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <label className="block text-sm">
        희망 날짜 · 한국 시간
        <input
          type="date"
          value={day}
          onChange={(e) => {
            setDay(e.target.value);
            onChange("");
          }}
          className="ml-3 min-h-11 rounded border px-3"
        />
      </label>
      {loading ? (
        <p role="status">시간 확인 중…</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : (
        day && (
          <label className="block text-sm">
            희망 시간
            <select
              aria-label="희망 시간"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="mt-2 min-h-11 w-full rounded border px-3"
            >
              <option value="">
                {slots.length
                  ? "시간을 선택해주세요"
                  : "선택 가능한 시간이 없습니다"}
              </option>
              {slots.map((slot) => (
                <option key={slot.start} value={slot.start}>
                  {formatLessonTime(slot.start, zone)}
                </option>
              ))}
            </select>
          </label>
        )
      )}
      <p className="text-xs text-slate-500">
        선택한 시간은 요청 사항이며 자리가 확보되지 않습니다. 처리 시 예약 가능
        여부를 다시 확인합니다.
      </p>
    </div>
  );
}
