import { z } from "zod";
import { apiError, privateJson, readJson, HttpError } from "@/lib/server/http";
import {
  requireUser,
  paymentAdmin,
  providerRequest,
  reconcilePayment,
  assertOrderPaymentMode,
} from "@/lib/server/payments";
export async function POST(request: Request) {
  try {
    const input = await readJson(
      request,
      z.object({
        orderId: z.string().uuid(),
        reason: z.string().trim().min(3).max(200),
      }),
    );
    const { client } = await requireUser('refund');
    const result = await client.rpc("admin_prepare_refund", {
      p_order: input.orderId,
      p_reason: input.reason,
    });
    if (result.error)
      throw new HttpError(403, "환불 권한·주문 상태·정산 여부를 확인해주세요.");
    const { data: order, error } = await paymentAdmin()
      .from("checkout_orders")
      .select("id,amount,currency,payment_key,payment_environment")
      .eq("id", input.orderId)
      .single();
    if (error || !order.payment_key)
      throw new HttpError(503, "결제 연결 정보를 확인해주세요.");
    assertOrderPaymentMode(order);
    const payment = await providerRequest(
      `${encodeURIComponent(order.payment_key)}/cancel`,
      { cancelReason: input.reason },
      `refund-${order.id}`,
    );
    return privateJson(await reconcilePayment(order, payment));
  } catch (error) {
    return apiError(error);
  }
}
