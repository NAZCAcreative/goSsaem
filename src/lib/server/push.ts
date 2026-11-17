import { timingSafeEqual } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.generated";
import { HttpError } from "./http";

type Client = SupabaseClient<Database>;
type PushJob = {
  id: string;
  notificationId: string;
  deviceId: string;
  userId: string;
  attempts: number;
  token: string;
  projectId: string;
  kind: string;
  linkUrl: string | null;
};
const labels: Record<string, string> = {
  chat_message: "새 채팅 메시지",
  booking_status: "수업 신청·예약 알림",
  lesson_reminder: "수업 시작 알림",
  payment: "결제 알림",
  settlement: "정산 알림",
};
export function requirePushCron(request: Request) {
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
  const actual = request.headers.get("authorization") || "";
  if (
    !process.env.CRON_SECRET ||
    Buffer.byteLength(expected) !== Buffer.byteLength(actual) ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(actual))
  )
    throw new HttpError(401, "인증이 필요합니다.");
}
export function pushAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new HttpError(503, "푸시 서버 연결 설정이 필요합니다.");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export function pushPayload(job: PushJob) {
  return {
    to: job.token,
    title: labels[job.kind] || "고쌤 알림",
    body: "고쌤 앱에서 내용을 확인해주세요.",
    sound: "default",
    channelId:
      job.kind === "chat_message"
        ? "chat"
        : job.kind === "booking_status"
          ? "bookings"
          : job.kind === "lesson_reminder"
            ? "reminders"
            : "general",
    ttl: job.kind === "lesson_reminder" ? 900 : 3600,
    data: {
      notificationId: job.notificationId,
      userId: job.userId,
      kind: job.kind,
      linkUrl: job.linkUrl,
    },
  };
}
export async function deliverMobilePush(
  client: Client,
  notificationId?: string,
) {
  const summary = {
    accepted: 0,
    providerAccepted: 0,
    failed: 0,
    uncertain: 0,
    skipped: 0,
  };
  if (process.env.PUSH_ENABLED !== "true") return summary;
  if (!process.env.EXPO_PUSH_ACCESS_TOKEN)
    throw new HttpError(503, "Expo 푸시 서버 토큰이 필요합니다.");
  if (!process.env.EXPO_PUSH_PROJECT_ID)
    throw new HttpError(503, "Expo 프로젝트 ID가 필요합니다.");
  if (!notificationId) {
    const reminders = await client.rpc("enqueue_teacher_mobile_reminders");
    if (reminders.error)
      throw new HttpError(503, "선생님 수업 알림을 준비하지 못했습니다.");
  }
  const headers = {
    Authorization: `Bearer ${process.env.EXPO_PUSH_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  };
  const { data, error } = await client.rpc("claim_mobile_push", {
    p_limit: 10,
    p_notification: notificationId || null,
  });
  if (error) throw new HttpError(503, "푸시 발송 목록을 확인하지 못했습니다.");
  await Promise.all(
    (data as unknown as PushJob[]).map(async (job) => {
      const save = async (
        status: Database["public"]["Tables"]["mobile_push_deliveries"]["Update"],
      ) => {
        const result = await client
          .from("mobile_push_deliveries")
          .update({ ...status, lease_until: null })
          .eq("id", job.id)
          .eq("status", "sending")
          .eq("attempts", job.attempts);
        if (result.error) throw new Error("Push result write failed");
      };
      try {
        const device = await client
          .from("mobile_push_devices")
          .select("id")
          .eq("id", job.deviceId)
          .eq("user_id", job.userId)
          .eq("active", true)
          .eq("expo_token", job.token)
          .maybeSingle();
        if (device.error) throw new Error("Device verification failed");
        if (
          !device.data ||
          (process.env.EXPO_PUSH_PROJECT_ID &&
            job.projectId !== process.env.EXPO_PUSH_PROJECT_ID)
        ) {
          await save({
            status: "skipped",
            error_code: "DeviceOrProjectChanged",
          });
          summary.skipped++;
          return;
        }
        const response = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers,
          body: JSON.stringify(pushPayload(job)),
          signal: AbortSignal.timeout(10000),
        });
        if (response.status === 429) {
          await save({
            status: "failed",
            error_code: "RateLimited",
            next_attempt_at: new Date(
              Date.now() + 30 * 2 ** job.attempts * 1000,
            ).toISOString(),
          });
          summary.failed++;
          return;
        }
        if (!response.ok) {
          await save({
            status: response.status >= 500 ? "uncertain" : "failed",
            attempts: response.status >= 500 ? job.attempts : 5,
            error_code: `HTTP${response.status}`,
          });
          summary[response.status >= 500 ? "uncertain" : "failed"]++;
          return;
        }
        const body = await response.json();
        const ticket = Array.isArray(body.data) ? body.data[0] : body.data;
        if (ticket?.status === "ok" && typeof ticket.id === "string") {
          await save({
            status: "accepted",
            ticket_id: ticket.id,
            receipt_after: new Date(Date.now() + 15 * 60000).toISOString(),
            error_code: null,
          });
          summary.accepted++;
        } else if (ticket?.status === "error") {
          const code = ticket.details?.error;
          const safeCode = [
            "DeviceNotRegistered",
            "MessageRateExceeded",
            "MessageTooBig",
            "InvalidCredentials",
            "MismatchSenderId",
          ].includes(code)
            ? code
            : "ProviderRejected";
          await save({
            status: "failed",
            attempts: code === "MessageRateExceeded" ? job.attempts : 5,
            error_code: safeCode,
            next_attempt_at: new Date(
              Date.now() + 60 * 2 ** job.attempts * 1000,
            ).toISOString(),
          });
          summary.failed++;
          if (code === "DeviceNotRegistered")
            await client
              .from("mobile_push_devices")
              .update({ active: false })
              .eq("id", job.deviceId)
              .eq("expo_token", job.token)
              .eq("user_id", job.userId);
        } else {
          await save({ status: "uncertain", error_code: "InvalidTicket" });
          summary.uncertain++;
        }
      } catch {
        summary.uncertain++;
        // A timeout can occur after Expo accepts a send. Do not repeat it blindly.
        try {
          await save({ status: "uncertain", error_code: "UncertainSend" });
        } catch {
          /* Lease expiry preserves the same uncertain outcome. */
        }
      }
    }),
  );
  const receipts = await client
    .from("mobile_push_deliveries")
    .select("id,ticket_id,device_id,user_id,created_at")
    .eq("status", "accepted")
    .lte("receipt_after", new Date().toISOString())
    .order("receipt_after")
    .limit(100);
  if (receipts.error)
    throw new HttpError(503, "푸시 수신 확인 목록을 읽지 못했습니다.");
  if (receipts.data.length) {
    const response = await fetch(
      "https://exp.host/--/api/v2/push/getReceipts",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          ids: receipts.data.map((row) => row.ticket_id),
        }),
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok)
      throw new HttpError(503, "푸시 공급자 확인에 실패했습니다.");
    const body = await response.json();
    for (const row of receipts.data) {
      const receipt = row.ticket_id ? body.data?.[row.ticket_id] : null;
      const patch: Database["public"]["Tables"]["mobile_push_deliveries"]["Update"] =
        { receipt_after: new Date(Date.now() + 15 * 60000).toISOString() };
      if (receipt?.status === "ok") {
        patch.status = "provider_accepted";
        summary.providerAccepted++;
      } else if (receipt?.status === "error") {
        patch.status = "failed";
        patch.attempts = 5;
        patch.error_code = [
          "DeviceNotRegistered",
          "InvalidCredentials",
          "MismatchSenderId",
          "MessageTooBig",
          "MessageRateExceeded",
        ].includes(receipt.details?.error)
          ? receipt.details.error
          : "ReceiptRejected";
        summary.failed++;
      } else if (Date.now() - Date.parse(row.created_at) > 23 * 3600000) {
        patch.status = "uncertain";
        patch.error_code = "ReceiptExpired";
        summary.uncertain++;
      }
      const updated = await client
        .from("mobile_push_deliveries")
        .update(patch)
        .eq("id", row.id)
        .eq("status", "accepted")
        .eq("ticket_id", row.ticket_id!);
      if (updated.error)
        throw new HttpError(
          503,
          "푸시 공급자 확인 결과를 저장하지 못했습니다.",
        );
      if (receipt?.details?.error === "DeviceNotRegistered") {
        // Do not disable a newer token registered on the same installation.
        await client
          .from("mobile_push_devices")
          .update({ active: false })
          .eq("id", row.device_id)
          .eq("user_id", row.user_id)
          .lte("updated_at", row.created_at);
      }
    }
  }
  return summary;
}
