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

test('admin simulation is disabled once live payments or live keys are configured', () => {
  const env = {};
  const payments = compile('src/lib/server/payments.ts', { '@/lib/supabase/server': {}, './http': http }, { process: { env } });
  assert.equal(payments.mockCheckoutAllowed(), true);
  for (const delta of [{ PAYMENTS_ENABLED: 'true' }, { TOSS_SECRET_KEY: 'live_sk_fixture' }, { NEXT_PUBLIC_TOSS_CLIENT_KEY: 'live_ck_fixture' }, { ALLOW_ADMIN_MOCK_CHECKOUT: 'false' }]) {
    Object.assign(env, delta); assert.equal(payments.mockCheckoutAllowed(), false); for (const key of Object.keys(delta)) delete env[key];
  }
});

test('simulated receipt keys never reach the payment provider', async () => {
  let called = false;
  const payments = compile('src/lib/server/payments.ts', { '@/lib/supabase/server': {}, './http': http }, { fetch: async () => { called = true; } });
  await assert.rejects(payments.providerRequest('mock_fixture/cancel'), /모의 결제/);
  await assert.rejects(payments.providerRequest('confirm', { paymentKey: 'mock_fixture' }), /모의 결제/);
  assert.equal(called, false);
});

test('test checkout requires explicit sandbox mode and matching test credentials, while live retains release gates', () => {
  const env = { PAYMENTS_MODE: 'test', TOSS_SECRET_KEY: 'test_sk_fixture', NEXT_PUBLIC_TOSS_CLIENT_KEY: 'test_ck_fixture', APP_ORIGIN: 'http://localhost:3005', NEXT_PUBLIC_SUPABASE_URL: 'https://db.example.test', SUPABASE_SERVICE_ROLE_KEY: 'fixture' };
  const payments = compile('src/lib/server/payments.ts', { '@/lib/supabase/server': {}, './http': http }, { process: { env } });
  assert.equal(payments.paymentsEnabled(), true);
  assert.equal(payments.paymentMode(), 'test');
  for (const delta of [
    { TOSS_SECRET_KEY: 'live_sk_fixture', NEXT_PUBLIC_TOSS_CLIENT_KEY: 'live_ck_fixture' },
    { NEXT_PUBLIC_TOSS_CLIENT_KEY: 'live_ck_fixture' },
    { NEXT_PUBLIC_TOSS_CLIENT_KEY: 'test_gck_fixture' },
    { TOSS_SECRET_KEY: 'test_sk_REPLACE_WITH_YOUR_SECRET_KEY' },
    { APP_ORIGIN: 'http://public.example.test' },
    { APP_ORIGIN: 'ftp://localhost' },
    { SUPABASE_SERVICE_ROLE_KEY: '' },
    { PAYMENTS_MODE: 'typo' },
  ]) {
    const before = { ...env }; Object.assign(env, delta);
    assert.equal(payments.paymentsEnabled(), false, JSON.stringify(Object.keys(delta)));
    Object.assign(env, before);
  }
  env.PAYMENTS_MODE = 'live'; env.TOSS_SECRET_KEY = 'live_sk_fixture'; env.NEXT_PUBLIC_TOSS_CLIENT_KEY = 'live_ck_fixture'; env.APP_ORIGIN = 'https://service.example.test';
  assert.equal(payments.paymentsEnabled(), false);
  Object.assign(env, { PAYMENTS_ENABLED: 'true', NEXT_PUBLIC_POLICIES_PUBLISHED: 'true', NEXT_PUBLIC_OPERATOR_NAME: 'Operator', NEXT_PUBLIC_BUSINESS_REGISTRATION: 'Registration', NEXT_PUBLIC_BUSINESS_ADDRESS: 'Address', NEXT_PUBLIC_SUPPORT_EMAIL: 'support@example.test', CRON_SECRET: 'fixture', PAYMENT_WEBHOOK_SECRET: 'fixture' });
  assert.equal(payments.paymentsEnabled(), true);
  env.NEXT_PUBLIC_POLICIES_PUBLISHED = 'false';
  assert.equal(payments.paymentsEnabled(), false);
});

test('test and live orders cannot be processed using the other environment credentials', () => {
  const env = { TOSS_SECRET_KEY: 'test_sk_fixture' };
  const payments = compile('src/lib/server/payments.ts', { '@/lib/supabase/server': {}, './http': http }, { process: { env } });
  payments.assertOrderPaymentMode({ payment_environment: 'test' });
  assert.throws(() => payments.assertOrderPaymentMode({ payment_environment: 'live' }), /환경/);
  assert.throws(() => payments.assertOrderPaymentMode({}), /환경/);
  env.TOSS_SECRET_KEY = 'live_sk_fixture';
  payments.assertOrderPaymentMode({ payment_environment: 'live' });
  assert.throws(() => payments.assertOrderPaymentMode({ payment_environment: 'test' }), /환경/);
});

test('checkout SDK receives the server-priced sandbox order and rejects an environment switch before opening', async () => {
  let sdkRequest, sdkKey, requests = [], customer;
  const config = { enabled: true, mode: 'test', clientKey: 'test_ck_fixture' };
  const order = { orderId: 'fixture-order', enrollmentId: 'enrollment', amount: 15000, currency: 'KRW', orderName: 'Lesson', mode: 'test' };
  const client = compile('src/lib/payment-client.ts', {}, {
    window: { location: { origin: 'http://localhost:3005' }, TossPayments: key => { sdkKey = key; return { payment: input => { customer = input.customerKey; return { requestPayment: async input => { sdkRequest = input; } }; } }; } },
    fetch: async (url, input) => { requests.push({ url, input }); return { ok: true, json: async () => url.endsWith('/config') ? config : order }; },
  });
  await client.startPaidCheckout('enrollment', 'student', 'coupon');
  assert.equal(sdkKey, 'test_ck_fixture');
  assert.equal(customer, 'student');
  assert.equal(sdkRequest.amount.value, 15000);
  assert.equal(sdkRequest.successUrl, 'http://localhost:3005/student/payment/result');
  assert.deepEqual(JSON.parse(requests[1].input.body), { enrollmentId: 'enrollment', couponId: 'coupon' });
  sdkRequest = null; order.mode = 'live';
  await assert.rejects(client.startPaidCheckout('enrollment', 'student'), /환경/);
  assert.equal(sdkRequest, null);
  config.enabled = false; requests = [];
  await assert.rejects(client.startPaidCheckout('enrollment', 'student'), /테스트/);
  assert.equal(requests.length, 1);
});

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
