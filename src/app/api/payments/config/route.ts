import { privateJson } from "@/lib/server/http";
import { paymentsEnabled, paymentMode } from "@/lib/server/payments";
export const dynamic = "force-dynamic";
export async function GET() {
  const enabled = paymentsEnabled();
  return privateJson({
    enabled,
    mode: paymentMode(),
    clientKey: enabled
      ? process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY
      : null,
  });
}
