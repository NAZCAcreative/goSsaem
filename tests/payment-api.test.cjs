const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
function compile(file, imports = {}, globals = {}) {
  const context = {
    exports: {},
    require: (name) => imports[name] || require(name),
    console,
    process: { env: {} },
    Buffer,
    URL,
    AbortSignal,
    Request,
    Response,
    TextDecoder,
    Uint8Array,
    ...globals,
  };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    context,
  );
  return context.exports;
}
const http = compile("src/lib/server/http.ts");

test("financial API refuses cross-origin, oversized and malformed JSON bodies", async () => {
  const schema = require("zod").z.object({ id: require("zod").z.string() });
  const make = (body, origin = "https://service.test") =>
    new Request("https://service.test/api/payments/prepare", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body,
    });
  await assert.rejects(
    http.readJson(make('{"id":"one"}', "https://attacker.test"), schema),
    /허용되지/,
  );
  await assert.rejects(
    http.readJson(make("x".repeat(17000)), schema),
    /너무 큽니다/,
  );
  await assert.rejects(http.readJson(make("bad json"), schema), /JSON 형식/);
  assert.equal((await http.readJson(make('{"id":"one"}'), schema)).id, "one");
});

test("server verifies provider order, amount, currency and bound payment key", () => {
  const payments = compile("src/lib/server/payments.ts", {
    "@/lib/supabase/server": {},
    "./http": http,
  });
  const order = {
    id: "order",
    amount: 10000,
    currency: "KRW",
    payment_key: "key",
  };
  const value = {
    orderId: "order",
    totalAmount: 10000,
    currency: "KRW",
    paymentKey: "key",
  };
  payments.verifyProviderPayment(value, order);
  for (const delta of [
    { orderId: "other" },
    { totalAmount: 1 },
    { currency: "USD" },
    { paymentKey: "another" },
  ])
    assert.throws(
      () => payments.verifyProviderPayment({ ...value, ...delta }, order),
      /일치하지/,
    );
  assert.equal(payments.paymentsEnabled(), false);
});

test("provider requests use server credentials, stable idempotency and a timeout", async () => {
  let request;
  const value = {
    orderId: "10000000-0000-4000-8000-000000000001",
    paymentKey: "key",
    totalAmount: 10000,
    balanceAmount: 10000,
    currency: "KRW",
    status: "DONE",
  };
  const payments = compile(
    "src/lib/server/payments.ts",
    { "@/lib/supabase/server": {}, "./http": http },
    {
      process: { env: { TOSS_SECRET_KEY: "test_sk_fixture" } },
      fetch: async (url, options) => {
        request = { url, options };
        return new Response(JSON.stringify(value), { status: 200 });
      },
    },
  );
  await payments.providerRequest(
    "confirm",
    { amount: 10000 },
    "confirm-fixture",
  );
  assert.equal(request.url, "https://api.tosspayments.com/v1/payments/confirm");
  assert.equal(request.options.headers["Idempotency-Key"], "confirm-fixture");
  assert.equal(
    request.options.headers.Authorization,
    `Basic ${Buffer.from("test_sk_fixture:").toString("base64")}`,
  );
  assert.equal(request.options.cache, "no-store");
  assert.ok(request.options.signal);
});

test("time filters preserve minutes and lesson timestamps have explicit timezone", () => {
  const time = compile("src/lib/time.ts");
  assert.deepEqual(Array.from(time.periodsForTimeRange("11:30", "12:30")), [
    "morning",
    "afternoon",
  ]);
  assert.deepEqual(Array.from(time.periodsForTimeRange("17:30", "18:30")), [
    "afternoon",
    "evening",
  ]);
  assert.deepEqual(Array.from(time.periodsForTimeRange("12:00", "18:00")), [
    "afternoon",
  ]);
  assert.equal(time.validTimeZone("invalid/timezone"), false);
  assert.equal(time.validTimeZone("America/New_York"), true);
  assert.match(
    time.formatLessonTime("2026-11-16T01:00:00Z", "Asia/Seoul", "en-US"),
    /10:00/,
  );
});
