import { timingSafeEqual } from "node:crypto";
import { privateJson, apiError, HttpError } from "@/lib/server/http";
import {
  paymentAdmin,
  providerRequest,
  reconcilePayment,
} from "@/lib/server/payments";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: Request) {
  let runId: string | null = null;
  try {
    const secret = process.env.CRON_SECRET;
    const token = request.headers.get("authorization") || "";
    if (
      !secret ||
      Buffer.byteLength(token) !== Buffer.byteLength(`Bearer ${secret}`) ||
      !timingSafeEqual(Buffer.from(token), Buffer.from(`Bearer ${secret}`))
    )
      throw new HttpError(401, "인증이 필요합니다.");
    const client = paymentAdmin();
    const started = await client
      .from("maintenance_runs")
      .insert({ status: "running" })
      .select("id")
      .single();
    if (started.error)
      throw new HttpError(503, "운영 작업 실행 이력을 저장하지 못했습니다.");
    runId = started.data.id;
    const maintained = await client.rpc("maintain_reservations");
    if (maintained.error) throw new HttpError(503, "예약 정리에 실패했습니다.");
    let reconciled = 0,
      failed = 0,
      sent = 0;
    if (process.env.TOSS_SECRET_KEY) {
      const { data: orders, error } = await client
        .from("checkout_orders")
        .select("id,amount,currency,payment_key,status,refund_reason")
        .in("status", ["confirming", "refund_pending", "needs_review"])
        .order("updated_at")
        .limit(5);
      if (error)
        throw new HttpError(503, "결제 복구 목록을 확인하지 못했습니다.");
      // Bounded concurrency prevents a stuck provider call from stalling the job.
      await Promise.all(
        (orders || []).map(async (order) => {
          try {
            if (!order.payment_key) return;
            let payment = await providerRequest(
              encodeURIComponent(order.payment_key),
            );
            let result = await reconcilePayment(order, payment);
            if (result.status === "refund_pending") {
              payment = await providerRequest(
                `${encodeURIComponent(order.payment_key)}/cancel`,
                {
                  cancelReason:
                    order.refund_reason || "예약 확정 실패 결제 취소",
                },
                `refund-${order.id}`,
              );
              result = await reconcilePayment(order, payment);
            }
            if (["paid", "refunded"].includes(result.status)) reconciled++;
            else failed++;
          } catch {
            failed++;
          }
        }),
      );
    }
    if (
      process.env.RESEND_API_KEY &&
      process.env.EMAIL_FROM &&
      process.env.APP_ORIGIN
    ) {
      const { data, error } = await client.rpc("claim_notification_emails", {
        p_limit: 10,
      });
      if (error)
        throw new HttpError(503, "알림 발송 목록을 확인하지 못했습니다.");
      const rows = data as {
        id: string;
        recipient: string;
        subject: string;
        body: string;
        link_url: string | null;
        attempts: number;
      }[];
      await Promise.all(
        rows.map(async (row) => {
          try {
            const link =
              row.link_url?.startsWith("/") && !row.link_url.startsWith("//")
                ? new URL(row.link_url, process.env.APP_ORIGIN).toString()
                : "";
            const response = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                "Content-Type": "application/json",
                "Idempotency-Key": `notification-${row.id}`,
              },
              body: JSON.stringify({
                from: process.env.EMAIL_FROM,
                to: [row.recipient],
                subject: row.subject,
                text: `${row.body}\n\n${link}`,
              }),
              signal: AbortSignal.timeout(10000),
            });
            if (!response.ok) throw new Error("Delivery failed");
            const saved = await client
              .from("delivery_outbox")
              .update({
                status: "sent",
                sent_at: new Date().toISOString(),
                lease_until: null,
              })
              .eq("id", row.id)
              .eq("attempts", row.attempts);
            if (saved.error) throw new Error("Delivery result failed");
            sent++;
          } catch {
            failed++;
            await client
              .from("delivery_outbox")
              .update({
                status: "failed",
                lease_until: null,
                next_attempt_at: new Date(
                  Date.now() + Math.min(3600, 30 * 2 ** row.attempts) * 1000,
                ).toISOString(),
              })
              .eq("id", row.id)
              .eq("attempts", row.attempts);
          }
        }),
      );
    }
    console.info(
      JSON.stringify({
        event: "maintenance_complete",
        reconciled,
        sent,
        failed,
        at: new Date().toISOString(),
      }),
    );
    const finished = await client
      .from("maintenance_runs")
      .update({
        status: failed ? "failed" : "completed",
        failures: failed,
        finished_at: new Date().toISOString(),
      })
      .eq("id", runId);
    if (finished.error)
      throw new HttpError(503, "운영 작업 완료 이력을 저장하지 못했습니다.");
    return privateJson({ reconciled, sent, failed }, failed ? 207 : 200);
  } catch (error) {
    if (runId) {
      try {
        await paymentAdmin()
          .from("maintenance_runs")
          .update({
            status: "failed",
            failures: 1,
            finished_at: new Date().toISOString(),
          })
          .eq("id", runId);
      } catch {}
    }
    return apiError(error);
  }
}
