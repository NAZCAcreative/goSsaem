import { privateJson } from "@/lib/server/http";
import { paymentsEnabled } from "@/lib/server/payments";
export const dynamic = "force-dynamic";
export async function GET() {
  return privateJson({
    enabled: paymentsEnabled(),
    clientKey: paymentsEnabled()
      ? process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY
      : null,
  });
}
