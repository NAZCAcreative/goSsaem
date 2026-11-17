import { createClient } from "@/lib/supabase/client";

export type SessionAccess = {
  id: string;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  isTeacher: boolean;
  opensAt: string;
  closesAt: string;
  serverNow: string;
  meetingUrl: string | null;
  canJoin: boolean;
};
export type BookingRequest = {
  id: string;
  kind: string;
  reason: string;
  status: string;
  response: string | null;
  created_at: string;
};
export async function sessionAccess(id: string): Promise<SessionAccess> {
  const { data, error } = await createClient().rpc("session_access", {
    p_session: id,
  });
  if (error)
    throw new Error(
      "수업을 확인하지 못했습니다. 예약 상태와 접근 권한을 확인해주세요.",
    );
  return data as unknown as SessionAccess;
}
export async function setMeeting(id: string, url: string): Promise<void> {
  const parsed = new URL(url);
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    !/^(meet\.google\.com|([a-z0-9-]+\.)*zoom\.us|teams\.microsoft\.com)$/.test(
      parsed.hostname,
    )
  )
    throw new Error("Google Meet·Zoom·Teams의 HTTPS 수업 링크를 입력해주세요.");
  const { error } = await createClient().rpc("set_session_meeting", {
    p_session: id,
    p_url: parsed.toString(),
  });
  if (error) throw new Error("수업 링크를 저장하지 못했습니다.");
}
export async function requestBookingAction(
  enrollmentId: string,
  kind: string,
  reason: string,
): Promise<void> {
  const { error } = await createClient().rpc("request_booking_action", {
    p_enrollment: enrollmentId,
    p_kind: kind,
    p_reason: reason,
  });
  if (error)
    throw new Error(
      "요청을 접수하지 못했습니다. 예약 상태를 확인하거나 고객센터를 이용해주세요.",
    );
}
export async function listBookingRequests(
  enrollmentId: string,
): Promise<BookingRequest[]> {
  const { data, error } = await createClient()
    .from("booking_requests")
    .select("id,kind,reason,status,response,created_at")
    .eq("enrollment_id", enrollmentId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error("요청 내역을 불러오지 못했습니다.");
  return data ?? [];
}
