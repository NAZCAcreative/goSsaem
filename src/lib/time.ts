export const DEFAULT_TIME_ZONE = "Asia/Seoul";

export function validTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function formatLessonTime(
  iso: string,
  timeZone = DEFAULT_TIME_ZONE,
  locale = "ko-KR",
): string {
  if (!validTimeZone(timeZone)) timeZone = DEFAULT_TIME_ZONE;
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "시간 확인 필요";
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    year: "numeric",
    month: "short",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function periodsForTimeRange(
  start: string,
  end: string,
): ("morning" | "afternoon" | "evening")[] {
  const minutes = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };
  const from = minutes(start),
    to = minutes(end);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return [];
  return (["morning", "afternoon", "evening"] as const).filter(
    (period, index) =>
      from < [720, 1080, 1440][index] && to > [360, 720, 1080][index],
  );
}
