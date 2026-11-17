const fs = require("node:fs");
const path = require("node:path");
const { parseEnv } = require("node:util");
const root = path.resolve(__dirname, "..");
const local = path.join(root, ".env");
const env = {
  ...(fs.existsSync(local) ? parseEnv(fs.readFileSync(local, "utf8")) : {}),
  ...process.env,
};
const failures = [];
const validUrl = (name) => {
  try {
    const url = new URL(env[name]);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      /example|your-|xxxxx/.test(url.hostname)
    )
      throw Error();
  } catch {
    failures.push(name);
  }
};
validUrl("EXPO_PUBLIC_SUPABASE_URL");
validUrl("EXPO_PUBLIC_WEB_ORIGIN");
const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";
let publicKey = key.startsWith("sb_publishable_");
try {
  publicKey ||=
    JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role ===
    "anon";
} catch {}
if (!publicKey)
  failures.push(
    "EXPO_PUBLIC_SUPABASE_ANON_KEY (공개 anon/publishable 키만 허용)",
  );
if (
  !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    env.EXPO_PUBLIC_EAS_PROJECT_ID || "",
  )
)
  failures.push("EXPO_PUBLIC_EAS_PROJECT_ID");
const google = path.resolve(
  root,
  env.GOOGLE_SERVICES_JSON || "google-services.json",
);
try {
  const value = JSON.parse(fs.readFileSync(google, "utf8"));
  if (
    !value.project_info?.project_number ||
    !value.client?.some(
      (client) =>
        client.client_info?.android_client_info?.package_name ===
        "com.gossaem.teacher",
    )
  )
    throw Error();
} catch {
  failures.push(
    "google-services.json (Firebase Android 앱 com.gossaem.teacher)",
  );
}
if (failures.length) {
  console.error(
    "APK·원격 푸시 테스트에 필요한 설정:\n" +
      failures.map((name) => `- ${name}`).join("\n"),
  );
  process.exitCode = 1;
} else
  console.log(
    "공개 앱 설정·Expo 프로젝트 ID·Firebase 앱 구성이 확인되었습니다. EAS의 FCM v1 서비스 계정과 서명 키 연결은 별도로 확인하세요.",
  );
