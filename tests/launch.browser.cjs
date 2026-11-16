// Real React screens with local fixtures; never signs in or moves real money.
const fs = require("node:fs");
const ts = require("typescript");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const base = process.env.TEST_BASE_URL || "http://localhost:3100";
const sources = {
  account: "src/app/(main)/account/page.tsx",
  security: "src/app/(main)/account/security/page.tsx",
  paymentDetail: "src/app/(main)/student/payment-history/[id]/page.tsx",
  booking: "src/app/(main)/student/bookings/[id]/page.tsx",
  session: "src/app/(main)/sessions/[id]/page.tsx",
  availability: "src/app/(main)/teacher/availability/page.tsx",
  operations: "src/app/(main)/admin/operations/page.tsx",
  report: "src/app/(main)/student/report/page.tsx",
  "@/components/shared/ServicePage": "src/components/shared/ServicePage.tsx",
  "@/components/features/SessionMaterials":
    "src/components/features/SessionMaterials.tsx",
  "@/components/features/admin/RestrictionForm":
    "src/components/features/admin/RestrictionForm.tsx",
  "@/components/features/admin/RuntimeHealth":
    "src/components/features/admin/RuntimeHealth.tsx",
  "@/lib/time": "src/lib/time.ts",
};
const code = Object.entries(sources)
  .map(
    ([id, file]) =>
      `modules[${JSON.stringify(id)}]=function(exports,require){${ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText}};`,
  )
  .join("\n");
async function mount(page, mode) {
  await page.goto(base + "/guide");
  const css = await page
    .locator('link[rel="stylesheet"]')
    .evaluateAll((links) => links.map((link) => link.href));
  await page.setContent(
    `<html lang="ko" data-design="gossaem"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${css.map((href) => `<link rel="stylesheet" href="${href}">`).join("")}</head><body><div id="fixture"></div></body></html>`,
  );
  await page.addScriptTag({
    path: require
      .resolve("react")
      .replace(/index\.js$/, "umd/react.development.js"),
  });
  await page.addScriptTag({
    path: require
      .resolve("react-dom")
      .replace(/index\.js$/, "umd/react-dom.development.js"),
  });
  await page.evaluate(
    ({ code, mode }) => {
      const React = window.React;
      const user = {
        id: "20000000-0000-4000-8000-000000000001",
        role:
          mode === "session" || mode === "availability" ? "teacher" : "student",
      };
      const sessionId = "10000000-0000-4000-8000-000000000001";
      const booking = {
        id: sessionId,
        status: "confirmed",
        sessionId,
        scheduledAt: "2026-11-20T01:00:00Z",
        durationMinutes: 50,
        sessionTitle: "실전 한국어 회화",
        teacherId: sessionId,
        teacherName: "테스트 선생님",
        price: 10000,
        currency: "KRW",
      };
      const session = {
        id: sessionId,
        title: "실전 한국어 회화",
        scheduledAt: booking.scheduledAt,
        durationMinutes: 50,
        status: "scheduled",
        isTeacher: true,
        opensAt: booking.scheduledAt,
        closesAt: booking.scheduledAt,
        meetingUrl: "https://meet.google.com/abc-defg-hij",
        canJoin: true,
      };
      window.fixtureCalls = [];
      const rpc = async (name, args) => {
        window.fixtureCalls.push({ name, args });
        const responses = {
          my_payment_detail: { id: sessionId, amount: 10000, currency: 'KRW', status: 'succeeded', verified: true, createdAt: booking.scheduledAt, enrollmentId: sessionId, title: '한국어 수업', receiptUrl: null, orderStatus: 'paid' },
          admin_operations: {
            bookings: [
              {
                id: sessionId,
                name: "학생",
                reason: "예약 시간을 변경하고 싶습니다.",
                status: "requested",
              },
            ],
            closures: [],
            withdrawals: [],
          },
          admin_checkout_orders: {
            orders: [],
            mailPending: 0,
            mailFailed: 0,
            paymentReview: 0,
            demoTeachers: 0,
          },
          session_material_list: [],
          my_learning_report: {
            completed: 2,
            minutes: 100,
            upcoming: 1,
            lessons: [],
          },
        };
        return { data: responses[name] ?? null, error: null };
      };
      const client = {
        rpc,
        from: (table) => {
          const data =
            table === "teacher_availability"
              ? [{ weekday: 1, start_time: "09:00", end_time: "12:00" }]
              : [];
          const chain = {
            select() {
              return this;
            },
            eq() {
              return this;
            },
            order() {
              return this;
            },
            limit() {
              return this;
            },
            maybeSingle: async () => ({
              data: { time_zone: "Asia/Seoul" },
              error: null,
            }),
            then: (resolve) =>
              Promise.resolve({ data, error: null }).then(resolve),
          };
          return chain;
        },
        auth: { signOut: async () => ({ error: null }), mfa: {
          listFactors: async () => ({ data: { totp: [] }, error: null }),
          enroll: async () => ({ data: { id: 'factor', totp: { qr_code: 'data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="black"/></svg>' } }, error: null }),
          challengeAndVerify: async () => ({ error: null }),
        } },
      };
      const imports = {
        react: React,
        "react/jsx-runtime": {
          jsx: (type, props, key) =>
            React.createElement(type, { ...props, key }),
          jsxs: (type, props, key) =>
            React.createElement(type, { ...props, key }),
          Fragment: React.Fragment,
        },
        "next/link": {
          default: ({ href, children, ...props }) =>
            React.createElement("a", { href, ...props }, children),
        },
        "next/navigation": { useParams: () => ({ id: sessionId }) },
        "next/image": { default: ({unoptimized,...props}) => React.createElement('img',props) },
        "@/stores/auth-store": {
          useAuthStore: (selector) =>
            selector({ user, logout: async () => {} }),
        },
        "@/lib/supabase/client": { createClient: () => client },
        "@/lib/service-config": {
          serviceConfig: {
            policiesPublished: false,
            policyVersion: "2026-11-16",
          },
        },
        "@/lib/queries/materials": {
          listMaterials: async () => [],
          getMaterialDownloadUrl: async () => "",
        },
        "@/lib/queries/bookings": { getEnrollmentDetail: async () => booking },
        "@/lib/queries/launch": {
          sessionAccess: async () => session,
          setMeeting: async (id, url) =>
            window.fixtureCalls.push({ name: "setMeeting", args: { id, url } }),
          listBookingRequests: async () => [],
          requestBookingAction: async (id, kind, reason) =>
            window.fixtureCalls.push({
              name: "requestBookingAction",
              args: { id, kind, reason },
            }),
        },
      };
      const modules = {},
        cache = {};
      eval(code);
      function load(id) {
        if (imports[id]) return imports[id];
        if (cache[id]) return cache[id];
        if (!modules[id]) throw new Error("Unknown fixture import " + id);
        const exports = {};
        modules[id](exports, load);
        cache[id] = exports;
        return exports;
      }
      window.ReactDOM.createRoot(document.getElementById("fixture")).render(
        React.createElement(load(mode).default),
      );
    },
    { code, mode },
  );
  await page.locator("main h1").first().waitFor();
  await page.waitForTimeout(100);
}
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH,
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const path of [
      "/guide",
      "/faq",
      "/teach",
      "/policies/terms",
      "/policies/privacy",
      "/policies/refunds",
      "/forgot-password",
      "/verify-email",
    ]) {
      const response = await page.goto(base + path);
      assert.equal(response.status(), 200, path);
      await page.locator("main h1").first().waitFor();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `Mobile overflow: ${path}`,
      );
    }
    await page.goto(base + "/forgot-password");
    await page.route("**/auth/v1/recover*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "{}",
      }),
    );
    await page
      .getByLabel("이메일", { exact: true })
      .fill("fixture@example.test");
    await page.getByRole("button", { name: "메일 요청", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "메일함" }).waitFor();
    for (const mode of [
      "account",
      "security",
      "paymentDetail",
      "booking",
      "session",
      "availability",
      "operations",
      "report",
    ]) {
      await mount(page, mode);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `Mobile overflow: ${mode}`,
      );
      if (mode === 'security') {
        await page.getByRole('button',{name:'인증기 등록',exact:true}).click();
        const qr=page.getByAltText('인증기 등록 QR 코드');await qr.waitFor();
        assert.ok((await qr.getAttribute('src')).startsWith('data:image/svg+xml;utf-8,<svg'));
        await page.getByLabel('인증기 등록 확인').fill('123456');
        await page.getByRole('button',{name:'6자리 코드 확인'}).click();
        await page.getByRole('status').filter({hasText:'2단계 인증이 완료'}).waitFor();
      }
      if (mode === "booking") {
        await page
          .getByLabel("사유·희망 일정")
          .fill("시간이 겹쳐 예약을 변경하고 싶습니다.");
        await page
          .getByRole("button", { name: "요청 접수", exact: true })
          .click();
        await page.getByRole("status").filter({ hasText: "접수" }).waitFor();
        assert.equal(
          await page.evaluate(
            () =>
              window.fixtureCalls.filter(
                (call) => call.name === "requestBookingAction",
              ).length,
          ),
          1,
        );
      }
      if (mode === "availability") {
        await page
          .getByRole("button", { name: "가능 시간 추가", exact: true })
          .click();
        await page.locator("input[type=time]").nth(2).fill("13:00");
        await page.locator("input[type=time]").nth(3).fill("15:00");
        await page.getByRole("button", { name: "전체 일정 저장" }).click();
        await page.getByRole("status").filter({ hasText: "저장" }).waitFor();
        assert.ok(
          await page.evaluate(() =>
            window.fixtureCalls.some(
              (call) => call.name === "save_teacher_availability",
            ),
          ),
        );
      }
      if (mode === "session")
        assert.equal(
          await page
            .getByRole("link", { name: "수업방 입장" })
            .getAttribute("href"),
          "https://meet.google.com/abc-defg-hij",
        );
      await page.screenshot({
        path: `.tmp/launch-${mode}-390.png`,
        fullPage: true,
      });
      await page.setViewportSize({ width: 1440, height: 1000 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `Desktop overflow: ${mode}`,
      );
      await page.setViewportSize({ width: 390, height: 844 });
    }
    assert.deepEqual(errors, []);
    console.log(
      "Public pages, email recovery fixture, account, booking requests, session entry, availability, operations and report passed at 390px and 1440px. External writes were mocked.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
