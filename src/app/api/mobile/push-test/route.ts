import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/types/database.generated";
import { apiError, privateJson, readJson, HttpError } from "@/lib/server/http";
import { deliverMobilePush, pushAdmin } from "@/lib/server/push";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    if (process.env.PUSH_ENABLED !== "true")
      throw new HttpError(
        503,
        "서버 푸시 발송 설정이 아직 완료되지 않았습니다.",
      );
    const token = /^Bearer (\S+)$/.exec(
      request.headers.get("authorization") || "",
    )?.[1];
    if (!token) throw new HttpError(401, "로그인이 필요합니다.");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
      key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new HttpError(503, "서버 연결 설정이 필요합니다.");
    const client = createClient<Database>(url, key, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: user, error: authError } = await client.auth.getUser(token);
    if (authError || !user.user)
      throw new HttpError(401, "다시 로그인해주세요.");
    const input = await readJson(
      request,
      z
        .object({
          deviceId: z.string().uuid(),
          kind: z.enum(["chat_message", "booking_status"]),
        })
        .strict(),
      false,
    );
    const { data, error } = await client.rpc("request_mobile_push_test", {
      p_device: input.deviceId,
      p_kind: input.kind,
    });
    if (error || !data)
      throw new HttpError(
        error?.code === "42501" ? 403 : 429,
        "본인 기기 등록과 알림 수신 설정을 확인해주세요. 테스트는 시간당 10회까지 가능합니다.",
      );
    const result = await deliverMobilePush(pushAdmin(), data);
    return privateJson({ notificationId: data, ...result });
  } catch (error) {
    return apiError(error);
  }
}
