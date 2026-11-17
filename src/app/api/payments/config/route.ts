import { privateJson } from "@/lib/server/http";
import { paymentsEnabled, paymentMode, mockCheckoutAllowed } from "@/lib/server/payments";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export async function GET() {
  const enabled = paymentsEnabled();
  let mockAvailable = false;
  if (mockCheckoutAllowed()) {
    try {
      const client = await createClient();
      const { data: { user } } = await client.auth.getUser();
      if (user) { const result = await client.rpc("admin_is_authorized"); mockAvailable = !result.error && result.data === true; }
    } catch { /* Authentication failures never enable the admin simulator. */ }
  }
  return privateJson({
    enabled,
    mode: paymentMode(),
    mockAvailable,
    clientKey: enabled
      ? process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY
      : null,
  });
}
