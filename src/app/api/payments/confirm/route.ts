import { z } from "zod";
import { apiError, privateJson, readJson, HttpError } from "@/lib/server/http";
import {
  requirePayments,
  requireUser,
  paymentAdmin,
  providerRequest,
  reconcilePayment,
} from "@/lib/server/payments";
export async function POST(request: Request) {
  try {
    requirePayments();
    const input = await readJson(
      request,
      z.object({
        orderId: z.string().uuid(),
        paymentKey: z.string().min(1).max(200),
        amount: z.number().int().positive(),
      }),
    );
    const { client } = await requireUser('confirm');
    const own = await client.rpc("my_checkout_order", {
      p_order: input.orderId,
    });
    if (own.error || !own.data)
      throw new HttpError(404, "주문을 찾을 수 없습니다.");
    if ((own.data as { amount: number }).amount !== input.amount)
      throw new HttpError(409, "결제 금액이 주문과 일치하지 않습니다.");
    const started = await paymentAdmin().rpc("begin_payment_confirmation", {
      p_order: input.orderId,
      p_key: input.paymentKey,
    });
    if (started.error)
      throw new HttpError(
        409,
        "예약을 확정할 수 없습니다. 결제 내역을 확인해주세요.",
      );
    let payment;
    try {
      payment = await providerRequest(encodeURIComponent(input.paymentKey));
    } catch {
      payment = await providerRequest(
        "confirm",
        {
          paymentKey: input.paymentKey,
          orderId: input.orderId,
          amount: started.data.amount,
        },
        `confirm-${input.orderId}`,
      );
    }
    const result = await reconcilePayment(started.data, payment);
    if (result.status === "refund_pending") {
      const cancelled = await providerRequest(
        `${encodeURIComponent(payment.paymentKey)}/cancel`,
        { cancelReason: "예약 만료 후 승인된 결제 자동 취소" },
        `refund-${input.orderId}`,
      );
      return privateJson(await reconcilePayment(started.data, cancelled));
    }
    return privateJson(result);
  } catch (error) {
    return apiError(error);
  }
}
