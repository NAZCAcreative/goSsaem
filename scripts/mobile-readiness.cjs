const fs = require("node:fs");
const path = require("node:path");
const { parseEnv } = require("node:util");
const root = path.resolve(__dirname, "..");
function readEnv(file) {
  return fs.existsSync(file) ? parseEnv(fs.readFileSync(file, "utf8")) : {};
}
function validOrigin(value) {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      u.pathname === "/" &&
      !u.search &&
      !u.hash &&
      !["localhost", "127.0.0.1", "[::1]", "0.0.0.0"].includes(u.hostname) &&
      !/example|your-|xxxxx/.test(u.hostname)
    );
  } catch {
    return false;
  }
}
function localChecks(app, server) {
  const present = (value) =>
    Boolean(value && !/your-|placeholder|xxxxx/.test(value));
  return [
    {
      name: "mobile-web-origin",
      ready: validOrigin(app.EXPO_PUBLIC_WEB_ORIGIN),
    },
    {
      name: "expo-project",
      ready:
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          app.EXPO_PUBLIC_EAS_PROJECT_ID || "",
        ),
    },
    {
      name: "firebase-android-config",
      ready: fs.existsSync(
        path.resolve(
          root,
          "apps/mobile",
          app.GOOGLE_SERVICES_JSON || "google-services.json",
        ),
      ),
    },
    {
      name: "expo-build-account",
      ready:
        present(server.EXPO_TOKEN) ||
        fs.existsSync(
          path.join(process.env.USERPROFILE || "", ".expo/state.json"),
        ),
    },
    { name: "local-server-push-enabled", ready: server.PUSH_ENABLED === "true" },
    {
      name: "local-server-expo-push-token",
      ready: present(server.EXPO_PUSH_ACCESS_TOKEN),
    },
    {
      name: "local-server-expo-project-match",
      ready:
        present(app.EXPO_PUBLIC_EAS_PROJECT_ID) &&
        server.EXPO_PUSH_PROJECT_ID === app.EXPO_PUBLIC_EAS_PROJECT_ID,
    },
    { name: "local-server-cron-secret", ready: present(server.CRON_SECRET) },
  ];
}
async function remoteChecks(app, server, request = fetch) {
  const checks = [];
  const url = server.NEXT_PUBLIC_SUPABASE_URL,
    key = server.SUPABASE_SERVICE_ROLE_KEY;
  if (validOrigin(url) && key) {
    for (const table of ["lesson_feedback", "mobile_push_devices"]) {
      try {
        const result = await request(
          new URL(`/rest/v1/${table}?select=*&limit=0`, url),
          {
            headers: { apikey: key, Authorization: `Bearer ${key}` },
            redirect: "error",
            signal: AbortSignal.timeout(10000),
          },
        );
        checks.push({
          name: `deployed-table-${table}`,
          ready: result.ok,
          httpStatus: result.status,
        });
      } catch {
        checks.push({
          name: `deployed-table-${table}`,
          ready: false,
          reason: "ConnectionFailed",
        });
      }
    }
  } else
    checks.push({
      name: "deployed-db-inspection",
      ready: false,
      reason: "ServerConnectionMissing",
    });
  if (validOrigin(app.EXPO_PUBLIC_WEB_ORIGIN)) {
    try {
      const result = await request(
        new URL("/api/mobile/push-test", app.EXPO_PUBLIC_WEB_ORIGIN),
        {
          method: "GET",
          redirect: "manual",
          signal: AbortSignal.timeout(10000),
        },
      );
      checks.push({
        name: "deployed-mobile-route",
        ready: result.status === 405,
        httpStatus: result.status,
      });
    } catch {
      checks.push({
        name: "deployed-mobile-route",
        ready: false,
        reason: "ConnectionFailed",
      });
    }
  }
  return checks;
}
module.exports = { validOrigin, localChecks, remoteChecks };
if (require.main === module)
  (async () => {
    const app = {
      ...readEnv(path.join(root, "apps/mobile/.env")),
      ...process.env,
    };
    const server = {
      ...readEnv(path.join(root, ".env.local")),
      ...process.env,
    };
    const checks = localChecks(app, server);
    if (process.argv.includes("--remote"))
      checks.push(...(await remoteChecks(app, server)));
    const report = {
      checkedAt: new Date().toISOString(),
      readOnly: true,
      checks,
    };
    fs.mkdirSync(path.join(root, ".tmp"), { recursive: true });
    fs.writeFileSync(
      path.join(root, ".tmp/mobile-readiness.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    for (const check of checks)
      console.log(
        `${check.ready ? "OK" : "MISSING"} ${check.name}${check.httpStatus ? ` (HTTP ${check.httpStatus})` : ""}`,
      );
    console.log(
      "Report: .tmp/mobile-readiness.json (no tokens or connection values). Remote checks do not apply migrations or send notifications.",
    );
    process.exitCode = checks.every((check) => check.ready) ? 0 : 1;
  })().catch(() => {
    console.error("Readiness inspection failed; credentials were not printed.");
    process.exitCode = 1;
  });
