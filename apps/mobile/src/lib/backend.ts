import { createClient, processLock } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { AppState } from "react-native";
import type { Database } from "../../../../src/types/database.generated";
import { secureSessionStorage } from "./storage";
const url = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";
export const configReady =
  url.startsWith("https://") &&
  Boolean(key) &&
  !/your-|placeholder/i.test(url + key);
export const webOrigin = process.env.EXPO_PUBLIC_WEB_ORIGIN || "";
const boundedFetch: typeof fetch = async (input, init) => {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (init?.signal?.aborted) cancel();
  init?.signal?.addEventListener("abort", cancel);
  const timer = setTimeout(cancel, 15000);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    init?.signal?.removeEventListener("abort", cancel);
  }
};
const client = configReady
  ? createClient<Database>(url, key, {
      global: { fetch: boundedFetch },
      auth: {
        storage: secureSessionStorage(SecureStore, Crypto.randomUUID),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        lock: processLock,
      },
    })
  : null;
export function backend() {
  if (!client) throw new Error("앱 연결 설정이 필요합니다.");
  return client;
}
if (client)
  AppState.addEventListener("change", (state) => {
    if (state === "active") client.auth.startAutoRefresh();
    else client.auth.stopAutoRefresh();
  });
export async function installationId() {
  let value = await SecureStore.getItemAsync("gossaem.installation");
  if (!value) {
    value = Crypto.randomUUID();
    await SecureStore.setItemAsync("gossaem.installation", value);
  }
  return value;
}
