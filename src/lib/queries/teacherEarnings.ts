import { createClient } from "@/lib/supabase/client";

export type EarningsMonth = { month: string; amount: number };

export function earningsMonths(now = new Date()): EarningsMonth[] {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")!.value);
  const month = Number(parts.find((part) => part.type === "month")!.value);
  return Array.from({ length: 6 }, (_, index) => ({
    month: new Date(Date.UTC(year, month - 6 + index, 1))
      .toISOString()
      .slice(0, 7),
    amount: 0,
  }));
}

export function earningsChange(
  current: number,
  previous: number,
): number | null {
  return previous > 0 ? ((current - previous) / previous) * 100 : null;
}

export async function getTeacherEarnings(
  teacherId: string,
): Promise<EarningsMonth[]> {
  const months = earningsMonths();
  const last = months[5].month;
  const end = new Date(
    Date.UTC(Number(last.slice(0, 4)), Number(last.slice(5)), 1),
  )
    .toISOString()
    .slice(0, 10);
  const client = createClient();
  // Paginate so the API row limit cannot silently truncate monthly totals.
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client
      .from("settlements")
      .select("id, period_start, net_amount")
      .eq("teacher_id", teacherId)
      .eq("currency", "KRW")
      .eq("verified_settlement", true)
      .eq("status", "paid")
      .gte("period_start", `${months[0].month}-01`)
      .lt("period_start", end)
      .order("period_start")
      .order("id")
      .range(offset, offset + 499);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      const month = months.find(
        (item) => item.month === row.period_start.slice(0, 7),
      );
      if (month) month.amount += Number(row.net_amount);
    }
    if (!data || data.length < 500) break;
  }
  return months;
}
