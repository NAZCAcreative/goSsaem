const test = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const fs = require("node:fs");
const vm = require("node:vm");
const context = { exports: {}, TextEncoder, Date };
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync("src/lib/calendar.ts", "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
  }).outputText,
  context,
);
test("calendar preserves UTC instants, escapes injected content and folds UTF-8 safely", () => {
  const value = context.exports.lessonCalendar(
    {
      id: "booking-1",
      title: "한국어".repeat(40) + "\nInjected,event;name",
      start: "2026-11-20T10:00:00+09:00",
      minutes: 50,
    },
    new Date("2026-11-17T00:00:00Z"),
  );
  assert.match(value, /DTSTART:20261120T010000Z/);
  assert.match(value, /DTEND:20261120T015000Z/);
  assert.ok(
    value.split("\r\n").every((line) => Buffer.byteLength(line, "utf8") <= 75),
  );
  assert.match(value.replace(/\r\n /g, ""), /\\nInjected\\,event\\;name/);
  assert.throws(() =>
    context.exports.lessonCalendar({
      id: "x",
      title: "x",
      start: "invalid",
      minutes: 50,
    }),
  );
});
