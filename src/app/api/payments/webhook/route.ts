import { z } from "zod";
import { timingSafeEqual } from "node:crypto";
import { apiError, privateJson, readJson, HttpError } from "@/lib/server/http";
import {
  paymentAdmin,
  providerRequest,
  reconcilePayment,
  assertOrderPaymentMode,
} from "@/lib/server/payments";
// The event body is only a notification. Its claimed status/amount is never
// trusted: every event is verified by an authenticated provider GET.
export async function POST(request: Request) {
  try {
    const expected = process.env.PAYMENT_WEBHOOK_SECRET;
    const token = new URL(request.url).searchParams.get("token") || "";
    if (
      !expected ||
      Buffer.byteLength(token) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(token), Buffer.from(expected))
    )
      throw new HttpError(401, "인증이 필요합니다.");
    const input = await readJson(
      request,
      z.object({
        eventType: z.string(),
        data: z.object({
          paymentKey: z.string().min(1).max(200),
          orderId: z.string().uuid(),
        }),
      }),
      false,
    );
    const { data: order, error } = await paymentAdmin()
      .from("checkout_orders")
      .select("id,amount,currency,payment_key,status,payment_environment")
      .eq("id", input.data.orderId)
      .maybeSingle();
    if (error) throw new HttpError(503, "웹훅 처리를 재시도해주세요.");
    if (!order) return privateJson({ received: true });
    assertOrderPaymentMode(order);
    const payment = await providerRequest(
      encodeURIComponent(input.data.paymentKey),
    );
    const result = await reconcilePayment(order, payment);
    if (result.status === "refund_pending") {
      const cancelled = await providerRequest(
        `${encodeURIComponent(payment.paymentKey)}/cancel`,
        { cancelReason: "예약 만료 후 승인된 결제 자동 취소" },
        `refund-${order.id}`,
      );
      await reconcilePayment(order, cancelled);
    }
    return privateJson({ received: true });
  } catch (error) {
    return apiError(error);
  }
}
