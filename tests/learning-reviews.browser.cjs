// Real React interactions with isolated data; no remote account or external writes.
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const sources = {
  student: "src/app/(main)/student/reviews/page.tsx",
  teacher: "src/app/(main)/teacher/profile/reviews/page.tsx",
  public: "src/components/features/PublicTeacherReviews.tsx",
  feedback: "src/components/features/LessonFeedback.tsx",
  next: "src/components/features/NextLesson.tsx",
  preparation: "src/components/features/teacher/TeacherPreparation.tsx",
  chart: "src/components/features/teacher/TeacherEarningsChart.tsx",
  "@/components/shared/ListPager": "src/components/shared/ListPager.tsx",
  "@/lib/time": "src/lib/time.ts",
  "@/lib/use-time-zone": "src/lib/use-time-zone.ts",
  "@/lib/use-unsaved-warning": "src/lib/use-unsaved-warning.ts",
};
const code = Object.entries(sources)
  .map(
    ([id, file]) =>
      `modules[${JSON.stringify(id)}]=function(exports,require){${ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText}};`,
  )
  .join("\n");
async function mount(page, mode, css) {
  await page.setContent(
    `<html><head><meta charset="utf-8"><style>${css}</style></head><body><div id="root"></div></body></html>`,
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
      const R = window.React,
        modules = {},
        cache = {};
      const fixtureUser = { id: "student-1", role: "student" };
      if (!crypto.randomUUID)
        Object.defineProperty(crypto, "randomUUID", {
          value: () => "30000000-0000-4000-8000-000000000011",
        });
      const row = {
        id: "review-1",
        studentName: "학생",
        studentAvatarUrl: null,
        teacherName: "쌤",
        teacherAvatarUrl: null,
        meta: "2026.11.17",
        stars: 3,
        rating: 3,
        text: "수업이 도움이 됐어요",
        teacherReply: "감사합니다",
        tags: ["clear"],
        createdAt: "2026-11-17T00:00:00Z",
      };
      const target = {
        sessionId: "session-1",
        teacherId: "teacher-1",
        teacherName: "쌤",
        scheduledAt: "2026-11-20T01:00:00Z",
        sessionTitle: "여행 회화",
      };
      window.calls = [];
      window.written = [];
      window.pending = [target];
      const api = {
        reviewTags: {
          clear: "설명이 이해하기 쉬워요",
          speaking: "말할 기회가 많아요",
        },
        listMyWrittenReviews: async () => window.written,
        listPendingReviewTargets: async () => window.pending,
        getPendingReviewTarget: async () => window.pending[0] ?? null,
        createReview: async (input) => {
          window.calls.push(input);
          await new Promise((r) => setTimeout(r, 150));
          window.written = [
            { ...row, text: input.text, stars: input.rating, tags: input.tags },
          ];
          window.pending = [];
        },
        updateReviewText: async () => {},
        listTeacherReviews: async () => [{ ...row, teacherReply: null }],
        getReviewSummary: async () => ({
          total: 45,
          average: 4.2,
          unanswered: 21,
        }),
        updateTeacherReply: async (id, value) => {
          window.calls.push({ id, value });
          await new Promise((r) => setTimeout(r, 150));
        },
        getPublicReviews: async () => ({
          total: 1,
          average: 3,
          rows: [
            {
              ...row,
              name: "김***",
              reply: "감사합니다",
              verified: true,
              lessonType: "group",
            },
          ],
        }),
        reportReview: async (...args) => {
          window.calls.push(args);
        },
      };
      const client = {
        from: () => {
          const q = {
            select: () => q,
            eq: () => q,
            maybeSingle: async () => ({
              data: {
                strengths: "발음이 좋아졌어요",
                practice: "주문 표현 복습",
                next_steps: "여행 준비",
                published: true,
                practice_done: false,
              },
              error: null,
            }),
          };
          return q;
        },
        rpc: async (name, args) => {
          window.calls.push({ name, args });
          if (name === "my_next_lesson")
            return {
              data: {
                ...target,
                enrollmentId: "booking-1",
                title: "여행 회화",
                scheduledAt: target.scheduledAt,
                durationMinutes: 50,
              },
              error: null,
            };
          if (name === "my_teacher_preparation")
            return {
              data: [
                {
                  id: "session-1",
                  title: "여행 회화",
                  scheduledAt: target.scheduledAt,
                  kind: "meeting",
                },
              ],
              error: null,
            };
          return { data: null, error: null };
        },
      };
      const jsx = (type, props, key) =>
        R.createElement(type, { ...props, key });
      const req = (id) => {
        if (id === "./time") return req("@/lib/time");
        if (id === "react") return R;
        if (id === "react/jsx-runtime")
          return { jsx, jsxs: jsx, Fragment: R.Fragment };
        if (id === "next/link")
          return {
            default: (props) => R.createElement("a", props, props.children),
          };
        if (id === "next/navigation")
          return {
            useSearchParams: () => new URLSearchParams("session=session-1"),
          };
        if (id === "@/stores/auth-store")
          return {
            useAuthStore: (select) =>
              select({ user: fixtureUser, isHydrated: true }),
          };
        if (id === "@/lib/queries/reviews") return api;
        if (id === "@/lib/queries/teacherEarnings")
          return {
            getTeacherEarnings: async () =>
              Array.from({ length: 6 }, (_, i) => ({
                month: `2026-${String(6 + i).padStart(2, "0")}`,
                amount: i * 100000,
              })),
            earningsChange: (a, b) => (b ? ((a - b) / b) * 100 : null),
          };
        if (id === "@/lib/supabase/client")
          return { createClient: () => client };
        if (id === "@/components/shared/PageLoading")
          return { PageLoading: () => R.createElement("p", null, "Loading") };
        if (id === "@/components/shared/PageContent")
          return { PageContent: (props) => props.children };
        if (id === "@/components/shared/AlertDialog")
          return {
            showError: (message) => {
              throw Error(message);
            },
          };
        if (id === "@/components/shared/Toast") return { showToast: () => {} };
        if (cache[id]) return cache[id];
        const out = {};
        cache[id] = out;
        if (!modules[id]) throw Error("Missing module " + id);
        modules[id](out, req);
        return out;
      };
      eval(code);
      const module = req(mode);
      const Component =
        module.default ??
        module.PublicTeacherReviews ??
        module.LessonFeedback ??
        module.NextLesson ??
        module.TeacherPreparation ??
        module.TeacherEarningsChart;
      window.fixtureRoot = window.ReactDOM.createRoot(
        document.getElementById("root"),
      );
      window.fixtureRoot.render(
        R.createElement(Component, {
          teacherId: "teacher-1",
          enrollmentId: "booking-1",
        }),
      );
    },
    { code, mode },
  );
}
(async () => {
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const cssDir = ".next/static/css";
  const css = fs.existsSync(cssDir)
    ? fs
        .readdirSync(cssDir)
        .filter((f) => f.endsWith(".css"))
        .map((f) => fs.readFileSync(path.join(cssDir, f), "utf8"))
        .join("\n")
    : "";
  try {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const mode of [
        "student",
        "teacher",
        "public",
        "feedback",
        "next",
        "preparation",
        "chart",
      ]) {
        await mount(page, mode, css);
        if (mode === "student") {
          await page
            .getByRole("button", { name: "후기 등록", exact: true })
            .waitFor();
          assert.equal(
            await page
              .getByRole("button", { name: "후기 등록", exact: true })
              .isDisabled(),
            true,
          );
          await page.getByRole("button", { name: "2점", exact: true }).click();
          await page
            .getByRole("textbox", { name: "후기 내용" })
            .fill("좋았던 점과 개선할 점을 남깁니다.");
          await page
            .getByRole("button", { name: "후기 등록", exact: true })
            .click();
          await page.getByRole("heading", { name: "쌤의 답변" }).waitFor();
          const calls = await page.evaluate(() => window.calls);
          assert.equal(calls.length, 1);
          assert.equal(calls[0].rating, 2);
        }
        if (mode === "teacher") {
          await page.getByText("45개 · 4.2점").waitFor();
          await page
            .getByRole("textbox", { name: "쌤 답변" })
            .fill("다음 수업도 즐겁게 준비하겠습니다.");
          await page.getByRole("button", { name: "등록하기" }).click();
          await page
            .getByText("다음 수업도 즐겁게 준비하겠습니다.", { exact: true })
            .waitFor();
          assert.equal(await page.evaluate(() => window.calls.length), 1);
        }
        if (mode === "public") {
          await page.getByText("김***", { exact: false }).waitFor();
          await page
            .getByRole("button", { name: "후기 신고", exact: true })
            .click();
          await page
            .getByRole("textbox", { name: "신고 사유" })
            .fill("개인정보가 포함되어 확인을 요청합니다.");
          await page
            .getByRole("button", { name: "신고 접수", exact: true })
            .click();
          await page.getByRole("status").waitFor();
          assert.equal(await page.evaluate(() => window.calls.length), 1);
        }
        if (mode === "feedback") {
          await page.getByRole("button", { name: "복습 완료 표시" }).click();
          await page
            .getByRole("button", { name: "복습 완료 ✓ · 취소하기" })
            .waitFor();
          assert.equal(
            await page.evaluate(() => window.calls[0].name),
            "set_practice_done",
          );
        }
        if (mode === "next")
          await page.getByRole("link", { name: "수업 대기실·자료" }).waitFor();
        if (mode === "preparation")
          await page.getByRole("link", { name: /수업 링크 등록/ }).waitFor();
        if (mode === "chart")
          await page.getByRole("list", { name: "월별 정산 적립액" }).waitFor();
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          `${mode} overflows at ${width}`,
        );
        await page.evaluate(() => window.fixtureRoot.unmount());
      }
    }
    assert.deepEqual(errors, []);
    console.log(
      "Review rating/submission, teacher totals/replies, public reporting, practice completion, next lesson, preparation and earnings passed at 390px and 1440px. External writes mocked.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
