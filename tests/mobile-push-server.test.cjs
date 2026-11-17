const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const job = {
  id: "delivery-1",
  notificationId: "notification-1",
  deviceId: "device-1",
  userId: "teacher-1",
  attempts: 1,
  token: "ExpoPushToken[testToken]",
  projectId: "project-1",
  kind: "chat_message",
  linkUrl: "/teacher/chat/10000000-0000-4000-8000-000000000001",
};
function load(fetch, env = {}) {
  class HttpError extends Error {
    constructor(status, message) {
      super(message);
      this.status = status;
    }
  }
  const context = {
    exports: {},
    process: {
      env: {
        PUSH_ENABLED: "true",
        EXPO_PUSH_ACCESS_TOKEN: "private-test-token",
        EXPO_PUSH_PROJECT_ID: "project-1",
        CRON_SECRET: "test-cron",
        ...env,
      },
    },
    Buffer,
    Date,
    AbortSignal,
    fetch,
    require: (name) =>
      name === "@/lib/server/http" || name === "./http"
        ? { HttpError }
        : name === "@supabase/supabase-js"
          ? {}
          : require(name),
  };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync("src/lib/server/push.ts", "utf8"), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
      },
    }).outputText,
    context,
  );
  return context.exports;
}
function fixture(receipts = []) {
  const updates = [],
    calls = [];
  const client = {
    rpc: async (name, args) => {
      calls.push({ name, args });
      return { data: name === "claim_mobile_push" ? [job] : 0, error: null };
    },
    from(table) {
      let update = false;
      const q = {
        update(patch) {
          update = true;
          updates.push({ table, patch });
          return q;
        },
        select() {
          return q;
        },
        eq() {
          return q;
        },
        lte() {
          return q;
        },
        order() {
          return q;
        },
        limit() {
          return q;
        },
        maybeSingle: async () => ({ data: { id: job.deviceId }, error: null }),
        then(resolve, reject) {
          return Promise.resolve({
            data: update ? null : receipts,
            error: null,
          }).then(resolve, reject);
        },
      };
      return q;
    },
  };
  return { client, updates, calls };
}
test("push payloads omit private message content and route to the recipient account", () => {
  const api = load();
  const payload = api.pushPayload(job);
  assert.equal(payload.to, job.token);
  assert.equal(payload.channelId, "chat");
  assert.equal(payload.data.userId, job.userId);
  assert.equal(payload.data.notificationId, job.notificationId);
  assert.equal(payload.data.linkUrl, job.linkUrl);
  assert.equal(payload.title, "새 채팅 메시지");
  assert.equal(payload.body, "고쌤 앱에서 내용을 확인해주세요.");
});
test("cron authentication rejects missing and incorrect secrets before any send", () => {
  const api = load();
  assert.throws(
    () => api.requirePushCron({ headers: new Headers() }),
    (error) => error.status === 401,
  );
  assert.throws(
    () =>
      api.requirePushCron({
        headers: new Headers({ authorization: "Bearer wrong" }),
      }),
    (error) => error.status === 401,
  );
  api.requirePushCron({
    headers: new Headers({ authorization: "Bearer test-cron" }),
  });
});
test("accepted tickets stay separate from device delivery and diagnostic tests do not enqueue other reminders", async () => {
  const f = fixture(),
    requests = [];
  const api = load(async (url, options) => {
    requests.push({ url, body: JSON.parse(options.body) });
    return {
      ok: true,
      status: 200,
      json: async () => ({ data: { status: "ok", id: "ticket-1" } }),
    };
  });
  const result = await api.deliverMobilePush(f.client, "notification-1");
  assert.equal(result.accepted, 1);
  assert.equal(result.providerAccepted, 0);
  assert.equal(f.updates[0].patch.status, "accepted");
  assert.equal(f.updates[0].patch.ticket_id, "ticket-1");
  assert.ok(
    !f.calls.some((call) => call.name === "enqueue_teacher_mobile_reminders"),
  );
  assert.equal(requests.length, 1);
});
test("rate limits retry, unknown send outcomes are retained without blind retries, invalid tokens deactivate", async () => {
  const limited = fixture();
  await load(async () => ({ status: 429, ok: false })).deliverMobilePush(
    limited.client,
    "notification-1",
  );
  assert.equal(limited.updates[0].patch.status, "failed");
  assert.equal(limited.updates[0].patch.error_code, "RateLimited");
  const uncertain = fixture();
  await load(async () => {
    throw Error("timeout");
  }).deliverMobilePush(uncertain.client, "notification-1");
  assert.equal(uncertain.updates[0].patch.status, "uncertain");
  const invalid = fixture();
  await load(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      data: { status: "error", details: { error: "DeviceNotRegistered" } },
    }),
  })).deliverMobilePush(invalid.client, "notification-1");
  assert.ok(
    invalid.updates.some(
      (update) =>
        update.table === "mobile_push_devices" && update.patch.active === false,
    ),
  );
});
test("push receipts record provider acceptance and disabled delivery makes no external requests", async () => {
  const receipts = [
      {
        id: "old-delivery",
        ticket_id: "old-ticket",
        device_id: "old-device",
        user_id: "teacher-1",
        created_at: new Date().toISOString(),
      },
    ],
    f = fixture(receipts);
  let count = 0;
  const api = load(async (url) => ({
    ok: true,
    status: 200,
    json: async () => {
      count++;
      return url.endsWith("getReceipts")
        ? { data: { "old-ticket": { status: "ok" } } }
        : { data: { status: "ok", id: "new-ticket" } };
    },
  }));
  const result = await api.deliverMobilePush(f.client);
  assert.equal(result.providerAccepted, 1);
  assert.ok(
    f.calls.some((call) => call.name === "enqueue_teacher_mobile_reminders"),
  );
  assert.equal(count, 2);
  const off = fixture();
  await load(
    () => {
      throw Error("must not send");
    },
    { PUSH_ENABLED: "false" },
  ).deliverMobilePush(off.client);
  assert.equal(off.calls.length, 0);
});
