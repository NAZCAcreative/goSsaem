const fs = require("node:fs");
const path = require("node:path");
const { parseEnv } = require("node:util");
const root = path.resolve(__dirname, ".."),
  target = path.join(root, "apps/mobile/.env");
if (fs.existsSync(target)) {
  console.log("apps/mobile/.env가 이미 있어 보존했습니다.");
  process.exit(0);
}
const source = path.join(root, ".env.local");
const web = fs.existsSync(source)
  ? parseEnv(fs.readFileSync(source, "utf8"))
  : {};
const fields = {
  EXPO_PUBLIC_SUPABASE_URL: web.NEXT_PUBLIC_SUPABASE_URL || "",
  EXPO_PUBLIC_SUPABASE_ANON_KEY: web.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  EXPO_PUBLIC_EAS_PROJECT_ID: "",
  EXPO_PUBLIC_WEB_ORIGIN: web.APP_ORIGIN || "",
  EXPO_PUBLIC_APP_ENV: "preview",
  GOOGLE_SERVICES_JSON: "./google-services.json",
};
fs.writeFileSync(
  target,
  Object.entries(fields)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join("\n") + "\n",
);
console.log(
  "apps/mobile/.env를 생성했습니다. 웹의 공개 연결값만 복사했고 서버 비밀 키는 복사하지 않았습니다. Expo 프로젝트 ID와 Firebase 설정을 완료해주세요.",
);
