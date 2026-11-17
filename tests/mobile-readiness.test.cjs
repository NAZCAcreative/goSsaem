const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validOrigin,
  localChecks,
  remoteChecks,
} = require("../scripts/mobile-readiness.cjs");
test("mobile readiness rejects local, insecure, credential-bearing and placeholder web origins", () => {
  for (const value of [
    "http://localhost:3005",
    "https://localhost",
    "https://127.0.0.1",
    "https://[::1]",
    "https://user:password@gossaem.test",
    "https://your-domain.example",
    "https://gossaem.test/path",
    "invalid",
  ])
    assert.equal(validOrigin(value), false, value);
  assert.equal(validOrigin("https://gossaem.test"), true);
});
test("remote readiness probes only zero-row database reads and an unauthenticated GET route", async () => {
  const secret = "private-value-never-in-report",
    requests = [];
  const result = await remoteChecks(
    { EXPO_PUBLIC_WEB_ORIGIN: "https://gossaem.test" },
    {
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: secret,
    },
    async (url, options) => {
      requests.push({ url: new URL(url), options });
      assert.equal(options.method || "GET", "GET");
      return {
        ok: true,
        status: String(url).includes("/rest/v1/") ? 200 : 405,
      };
    },
  );
  assert.equal(requests.length, 3);
  for (const request of requests.slice(0, 2)) {
    assert.equal(request.url.searchParams.get("limit"), "0");
    assert.equal(request.options.headers.Authorization, `Bearer ${secret}`);
    assert.equal(request.options.redirect, "error");
  }
  assert.equal(requests[2].options.headers, undefined);
  assert.ok(result.every((check) => check.ready));
  assert.ok(!JSON.stringify(result).includes(secret));
});
test("missing migrations, redirects and failed connections remain incomplete checks", async () => {
  let index = 0;
  const result = await remoteChecks(
    { EXPO_PUBLIC_WEB_ORIGIN: "https://gossaem.test" },
    {
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "secret",
    },
    async () => {
      index++;
      if (index === 1) throw Error("connection");
      return { ok: false, status: index === 2 ? 404 : 307 };
    },
  );
  assert.equal(result.length, 3);
  assert.ok(result.every((check) => !check.ready));
  const local = localChecks(
    {
      EXPO_PUBLIC_WEB_ORIGIN: "https://gossaem.test",
      EXPO_PUBLIC_EAS_PROJECT_ID: "",
    },
    { PUSH_ENABLED: "false" },
  );
  assert.equal(
    local.find((check) => check.name === "mobile-web-origin").ready,
    true,
  );
  assert.equal(
    local.find((check) => check.name === "expo-project").ready,
    false,
  );
  assert.equal(
    local.find((check) => check.name === "local-server-push-enabled").ready,
    false,
  );
});
