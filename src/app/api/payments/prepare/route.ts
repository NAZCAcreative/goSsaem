import { z } from "zod";
import { apiError, privateJson, readJson, HttpError } from "@/lib/server/http";
import { requirePayments, requireUser, paymentMode } from "@/lib/server/payments";
export async function POST(request: Request) {
  try {
    requirePayments();
    const input = await readJson(
      request,
      z.object({
        enrollmentId: z.string().uuid(),
        couponId: z.string().uuid().nullable().optional(),
      }),
    );
    const { client } = await requireUser('prepare');
    const { data, error } = await client.rpc(paymentMode() === "test" ? "prepare_test_checkout" : "prepare_checkout", {
      p_enrollment: input.enrollmentId,
      p_coupon: input.couponId || null,
    });
    if (error)
      throw new HttpError(
        409,
        paymentMode() === "test" ? "예약이 만료됐거나 다른 환경의 주문이 있습니다. 같은 쿠폰으로 재시도하거나 새 예약으로 테스트해주세요." : "예약 만료·쿠폰·정책 동의 여부를 확인해주세요. 기존 주문이 있으면 같은 쿠폰으로 다시 시도해주세요.",
      );
    return privateJson(data);
  } catch (error) {
    return apiError(error);
  }
}
