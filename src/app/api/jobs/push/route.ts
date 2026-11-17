import { apiError, privateJson } from "@/lib/server/http";
import {
  deliverMobilePush,
  pushAdmin,
  requirePushCron,
} from "@/lib/server/push";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: Request) {
  try {
    requirePushCron(request);
    return privateJson(await deliverMobilePush(pushAdmin()));
  } catch (error) {
    return apiError(error);
  }
}
