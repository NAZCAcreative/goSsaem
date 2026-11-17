const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function load(createClient = () => ({})) {
  const context = {
    exports: {},
    require: () => ({ createClient }),
    Intl,
    Date,
  };
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync("src/lib/queries/teacherEarnings.ts", "utf8"),
      {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.CommonJS,
        },
      },
    ).outputText,
    context,
  );
  return context.exports;
}

test("six earnings months roll over at Korean midnight and across years", () => {
  const api = load();
  const months = api.earningsMonths(new Date("2026-12-31T15:00:00Z"));
  assert.equal(months.length, 6);
  assert.equal(months[0].month, "2026-08");
  assert.equal(months[5].month, "2027-01");
  assert.ok(months.every((month) => month.amount === 0));
});

test("growth handles increases, decreases and an absent comparison baseline", () => {
  const { earningsChange } = load();
  assert.equal(earningsChange(150, 100), 50);
  assert.equal(earningsChange(0, 100), -100);
  assert.equal(earningsChange(100, 0), null);
  assert.equal(earningsChange(0, 0), null);
});

test("earnings query paginates and retains verified paid KRW filters", async () => {
  const filters = [];
  const ranges = [];
  const month = load().earningsMonths()[5].month;
  const query = {
    select() {
      return this;
    },
    eq(...args) {
      filters.push(args);
      return this;
    },
    gte() {
      return this;
    },
    lt() {
      return this;
    },
    order() {
      return this;
    },
    async range(start, end) {
      ranges.push([start, end]);
      return {
        data: Array.from({ length: start === 0 ? 500 : 1 }, () => ({
          period_start: `${month}-01`,
          net_amount: 10,
        })),
        error: null,
      };
    },
  };
  const months = await load(() => ({ from: () => query })).getTeacherEarnings(
    "teacher-1",
  );
  assert.equal(months[5].amount, 5010);
  assert.deepEqual(ranges, [
    [0, 499],
    [500, 999],
  ]);
  for (const pair of [
    ["teacher_id", "teacher-1"],
    ["currency", "KRW"],
    ["verified_settlement", true],
    ["status", "paid"],
  ]) {
    assert.ok(
      filters.some((filter) => filter[0] === pair[0] && filter[1] === pair[1]),
    );
  }
});

test("query errors are not reported as zero earnings", async () => {
  const query = {
    select() {
      return this;
    },
    eq() {
      return this;
    },
    gte() {
      return this;
    },
    lt() {
      return this;
    },
    order() {
      return this;
    },
    async range() {
      return { data: null, error: { message: "offline" } };
    },
  };
  await assert.rejects(
    load(() => ({ from: () => query })).getTeacherEarnings("teacher-1"),
    /offline/,
  );
});
