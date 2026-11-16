import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { HttpError } from "./http";
import { z } from "zod";

export function paymentMode(): "test" | "live" {
  return process.env.PAYMENTS_MODE === "test" ? "test" : "live";
}
export function paymentsEnabled() {
  if (process.env.PAYMENTS_MODE && !["test", "live"].includes(process.env.PAYMENTS_MODE)) return false;
  const secret = process.env.TOSS_SECRET_KEY || "";
  const publicKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || "";
  if (/(REPLACE|placeholder|your-)/i.test(secret + publicKey)) return false;
  const keyMode = /^(test|live)_sk_/.exec(secret)?.[1];
  if (!keyMode || keyMode !== paymentMode() || !publicKey.startsWith(`${keyMode}_ck_`)) return false;
  try {
    const origin = new URL(process.env.APP_ORIGIN || "");
    if (
      origin.protocol !== "https:" &&
      !(
        keyMode === "test" &&
        origin.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(origin.hostname)
      )
    )
      return false;
  } catch {
    return false;
  }
  // Test credentials can open the sandbox before business onboarding is complete.
  // Live payments retain every production release gate below.
  if (keyMode === "test") return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL);
  return (
    process.env.PAYMENTS_ENABLED === "true" &&
    process.env.NEXT_PUBLIC_POLICIES_PUBLISHED === "true" &&
    Boolean(
      process.env.TOSS_SECRET_KEY &&
        process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY &&
        process.env.SUPABASE_SERVICE_ROLE_KEY &&
        process.env.APP_ORIGIN &&
        process.env.NEXT_PUBLIC_OPERATOR_NAME &&
        process.env.NEXT_PUBLIC_BUSINESS_REGISTRATION &&
        process.env.NEXT_PUBLIC_BUSINESS_ADDRESS &&
        process.env.NEXT_PUBLIC_SUPPORT_EMAIL &&
        process.env.CRON_SECRET &&
        process.env.PAYMENT_WEBHOOK_SECRET,
    )
  );
}
export function requirePayments() {
  if (!paymentsEnabled())
    throw new HttpError(503, paymentMode() === "test" ? "테스트 결제 설정이 필요합니다. Toss 테스트 키와 서비스 연결 설정을 확인해주세요." : "유료 결제는 아직 개시 전입니다.");
}
export function assertOrderPaymentMode(order: { payment_environment?: string }) {
  const keyMode = /^(test|live)_sk_/.exec(process.env.TOSS_SECRET_KEY || "")?.[1];
  if (!keyMode || keyMode !== (order.payment_environment || "live"))
    throw new HttpError(409, "주문의 결제 환경과 현재 설정이 다릅니다. 해당 환경의 키로 다시 확인해주세요.");
}
export function paymentAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new HttpError(503, "결제 처리 연결을 확인해주세요.");
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function requireUser(action?: "prepare" | "confirm" | "refund") {
  const client = await createClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new HttpError(401, "다시 로그인해주세요.");
  const active = await client.rpc("account_is_active", {
    p_user: data.user.id,
  });
  if (active.error || active.data !== true)
    throw new HttpError(
      403,
      "계정 이용 상태를 확인하거나 고객센터에 문의해주세요.",
    );
  if (action) {
    const budget = await client.rpc("consume_action_budget", {
      p_action: action,
    });
    if (budget.error)
      throw new HttpError(503, "요청 상태를 확인하지 못했습니다.");
    if (budget.data !== true)
      throw new HttpError(
        429,
        "요청이 너무 많습니다. 1분 후 다시 시도해주세요.",
      );
  }
  return { client, user: data.user };
}
const providerSchema = z.object({
  paymentKey: z.string().min(1).max(200),
  orderId: z.string().uuid(),
  currency: z.literal("KRW"),
  totalAmount: z.number().int().positive(),
  balanceAmount: z.number().int().nonnegative(),
  status: z.string(),
  receipt: z.object({ url: z.string().url() }).nullish(),
});
export type ProviderPayment = z.infer<typeof providerSchema>;
export async function providerRequest(
  path: string,
  body?: unknown,
  idempotencyKey?: string,
): Promise<ProviderPayment> {
  const key = process.env.TOSS_SECRET_KEY;
  if (!key) throw new HttpError(503, "결제사 연결이 필요합니다.");
  const response = await fetch(
    `https://api.tosspayments.com/v1/payments/${path}`,
    {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!response.ok)
    throw new HttpError(
      502,
      "결제사 처리 결과를 확인하지 못했습니다. 결제 내역을 확인한 뒤 다시 시도해주세요.",
    );
  return providerSchema.parse(await response.json());
}
export function verifyProviderPayment(
  payment: ProviderPayment,
  order: {
    id: string;
    amount: number;
    currency: string;
    payment_key?: string | null;
    payment_environment?: string;
  },
) {
  if (
    payment.orderId !== order.id ||
    payment.totalAmount !== order.amount ||
    payment.currency !== order.currency ||
    (order.payment_key && order.payment_key !== payment.paymentKey)
  )
    throw new HttpError(409, "결제 정보가 주문과 일치하지 않습니다.");
}
export async function reconcilePayment(
  order: {
    id: string;
    amount: number;
    currency: string;
    payment_key?: string | null;
    payment_environment?: string;
  },
  payment: ProviderPayment,
) {
  assertOrderPaymentMode(order);
  verifyProviderPayment(payment, order);
  const { data, error } = await paymentAdmin().rpc("record_provider_payment", {
    p_order: order.id,
    p_payment: payment,
  });
  if (error)
    throw new HttpError(
      503,
      "결제 결과 반영을 재시도해야 합니다. 추가 결제하지 말고 내역을 확인해주세요.",
    );
  return { ...(data as { status: string; enrollmentId?: string }), mode: order.payment_environment || "live" };
}
