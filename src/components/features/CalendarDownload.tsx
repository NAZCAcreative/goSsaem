"use client";
import { lessonCalendar } from "@/lib/calendar";
export function CalendarDownload({
  id,
  title,
  start,
  minutes,
}: {
  id: string;
  title: string;
  start: string;
  minutes: number;
}) {
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([lessonCalendar({ id, title, start, minutes })], {
        type: "text/calendar;charset=utf-8",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `lesson-${id}.ics`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div>
      <button
        type="button"
        onClick={download}
        className="min-h-11 text-sm text-primary"
      >
        캘린더에 일정 저장
      </button>
      <p className="text-xs text-slate-500">
        자동 동기화되지 않습니다. 예약 변경·취소 시 캘린더 일정도 수정해주세요.
      </p>
    </div>
  );
}
