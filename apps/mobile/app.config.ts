import type { ExpoConfig } from "expo/config";
import { existsSync } from "node:fs";
import { version } from "./package.json";

const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
const googleServicesFile =
  process.env.GOOGLE_SERVICES_JSON || "./google-services.json";
const config: ExpoConfig = {
  name: "고쌤 (쌤용)",
  slug: "gossaem-teacher",
  version,
  scheme: "gossaem",
  orientation: "portrait",
  userInterfaceStyle: "light",
  android: {
    package: "com.gossaem.teacher",
    ...(existsSync(googleServicesFile) ? { googleServicesFile } : {}),
    permissions: ["POST_NOTIFICATIONS"],
  },
  ios: { bundleIdentifier: "com.gossaem.teacher", supportsTablet: true },
  plugins: [
    "expo-secure-store",
    ["expo-notifications", { color: "#7c3aed", defaultChannel: "general" }],
  ],
  extra: {
    ...(projectId ? { eas: { projectId } } : {}),
    releaseChannel: process.env.EXPO_PUBLIC_APP_ENV || "preview",
  },
};
export default config;
