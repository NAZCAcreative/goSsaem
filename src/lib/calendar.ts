const escape = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
const stamp = (value: Date) =>
  value
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
export function lessonCalendar(
  input: { id: string; title: string; start: string; minutes: number },
  now = new Date(),
) {
  const start = new Date(input.start);
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(input.minutes) ||
    input.minutes <= 0
  )
    throw new Error("일정을 확인해주세요.");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//goSsaem//Lessons//KO",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${escape(input.id)}@gossaem`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(new Date(start.getTime() + input.minutes * 60000))}`,
    `SUMMARY:${escape(input.title)}`,
    `DESCRIPTION:${escape("예약 변경·취소 시 기존 캘린더 일정을 삭제하고 다시 저장해주세요.")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  // RFC 5545 folds at 75 octets, including the continuation space.
  return (
    lines
      .map((line) => {
        const parts: string[] = [];
        let part = "";
        let size = 0;
        for (const char of line) {
          const bytes = new TextEncoder().encode(char).length;
          if (size + bytes > 75) {
            parts.push(part);
            part = " ";
            size = 1;
          }
          part += char;
          size += bytes;
        }
        parts.push(part);
        return parts.join("\r\n");
      })
      .join("\r\n") + "\r\n"
  );
}
