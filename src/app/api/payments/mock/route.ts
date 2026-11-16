import { z } from "zod";
import { apiError, privateJson, readJson, HttpError } from "@/lib/server/http";
import { requireUser, mockCheckoutAllowed } from "@/lib/server/payments";

export async function POST(request: Request) {
  try {
    if (!mockCheckoutAllowed()) throw new HttpError(403, "모의 결제는 현재 사용할 수 없습니다.");
    const input = await readJson(request, z.object({ enrollmentId: z.string().uuid(), couponId: z.string().uuid().nullable().optional() }));
    const { client } = await requireUser("prepare");
    const admin = await client.rpc("admin_is_authorized");
    if (admin.error || admin.data !== true) throw new HttpError(403, "관리자 계정에서만 모의 결제를 사용할 수 있습니다.");
    const result = await client.rpc("admin_mock_checkout", { p_enrollment: input.enrollmentId, p_coupon: input.couponId || null });
    if (result.error) throw new HttpError(409, result.error.code === "PGRST202" || result.error.code === "42883" ? "모의 결제 DB 업데이트가 필요합니다. 0050 마이그레이션과 선행 SQL을 적용해주세요." : "예약이 만료됐거나 결제가 이미 시작되었습니다. 새 예약으로 모의 결제를 진행해주세요.");
    return privateJson(result.data);
  } catch (error) { return apiError(error); }
}
