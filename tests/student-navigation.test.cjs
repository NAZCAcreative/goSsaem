const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
function navigation() {
  let options;
  const context = {
    exports: {},
    require: (name) =>
      name === "zustand/middleware"
        ? {
            persist: (config, value) => {
              options = value;
              return config;
            },
          }
        : require(name),
  };
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync("src/stores/navigation-store.ts", "utf8"),
      {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.CommonJS,
        },
      },
    ).outputText,
    context,
  );
  return { ...context.exports, options };
}
test("teacher discovery, public teacher profiles and learning reports highlight one student menu", () => {
  const api = navigation();
  for (const [path, id] of [
    ["/student/teachers", "s-search"],
    ["/teachers/teacher-1", "s-search"],
    ["/student/search", "s-search"],
    ["/student/report", "s-profile"],
    ["/student/home", "s-home"],
  ]) {
    const active = api.DEFAULT_STUDENT_ITEMS.filter((item) =>
      api.isNavItemActive(item, path),
    );
    assert.equal(active.length, 1, path);
    assert.equal(active[0].id, id);
  }
});
test("saved menus upgrade discovery routes while preserving custom links, ordering and visibility", () => {
  const api = navigation();
  const custom = {
    id: "custom",
    href: "/guide",
    label: "안내",
    match: ["/guide"],
    isActive: true,
    order: 7,
    role: "student",
  };
  const items = api.DEFAULT_STUDENT_ITEMS.map((item) => ({
    ...item,
    match: item.id === "s-search" ? ["/student/search"] : item.match,
    isActive: item.id === "s-chat" ? false : true,
    order: item.order + 1,
  }));
  const migrated = api.options.migrate(
    {
      studentItems: [...items, custom],
      teacherItems: api.DEFAULT_TEACHER_ITEMS,
    },
    3,
  );
  assert.ok(
    migrated.studentItems
      .find((item) => item.id === "s-search")
      .match.includes("/student/teachers"),
  );
  assert.equal(
    migrated.studentItems.find((item) => item.id === "s-chat").isActive,
    false,
  );
  assert.equal(
    migrated.studentItems.find((item) => item.id === "s-search").order,
    3,
  );
  assert.equal(
    migrated.studentItems.find((item) => item.id === "custom"),
    custom,
  );
  assert.equal(migrated.teacherItems, api.DEFAULT_TEACHER_ITEMS);
});
