const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function compile(file, imports = {}) {
  const context = { exports: {}, URL, require: name => imports[name] ?? require(name) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, context);
  return context.exports;
}
const calls = [];
const query = new Proxy({}, { get: (_, key) => (...args) => { calls.push([key, ...args]); if (key === 'then') return Promise.resolve({ data: [], error: null }).then(...args); if (key === 'single') return Promise.resolve({ data: { id: 'saved' }, error: null }); return query; } });
const portfolio = compile('src/lib/queries/teacherPortfolio.ts', { '@/lib/supabase/client': { createClient: () => ({ from: () => query }) } });
const input = { kind: 'career', title: 'Teaching', organization: '', period: '', description: '', url: '', is_public: false };
test('portfolio rejects blank titles, oversized content and unsafe links', () => {
  for (const patch of [{ title: ' ' }, { description: 'x'.repeat(2001) }, { url: 'javascript:alert(1)' }, { url: 'data:text/html,test' }, { url: 'https://user:pass@example.com' }, { kind: 'verified' }]) {
    assert.equal(portfolio.portfolioSchema.safeParse({ ...input, ...patch }).success, false);
  }
  assert.equal(portfolio.portfolioSchema.safeParse({ ...input, url: 'https://example.com/work' }).success, true);
});
test('public preview explicitly excludes private entries even for the owner', async () => {
  calls.length = 0; await portfolio.listPortfolio('owner', true);
  assert.ok(calls.some(call => call[0] === 'eq' && call[1] === 'is_public' && call[2] === true));
  calls.length = 0; await portfolio.listPortfolio('owner');
  assert.ok(!calls.some(call => call[1] === 'is_public'));
});
test('edits and deletion are scoped to both owner and record', async () => {
  calls.length = 0; await portfolio.savePortfolio('owner', { ...input, title: ' Updated ' }, 'entry');
  assert.ok(calls.some(call => call[0] === 'update' && call[1].title === 'Updated'));
  assert.ok(calls.some(call => call[0] === 'eq' && call[1] === 'teacher_id' && call[2] === 'owner'));
  assert.ok(calls.some(call => call[0] === 'eq' && call[1] === 'id' && call[2] === 'entry'));
  calls.length = 0; await portfolio.deletePortfolio('owner', 'entry');
  assert.ok(calls.some(call => call[0] === 'eq' && call[1] === 'teacher_id' && call[2] === 'owner'));
});
test('teacher navigation has exactly one active item for portfolio, materials, lesson creation and settlement', () => {
  let persistence;
  const nav = compile('src/stores/navigation-store.ts', { 'zustand/middleware': { persist: (config, options) => { persistence = options; return config; } } });
  for (const [path, id] of [['/teacher/profile/portfolio', 't-profile'], ['/teacher/materials', 't-materials'], ['/teacher/lessons/new/details', 't-lessons'], ['/teacher/settlement/account', 't-lessons'], ['/teacher/home', 't-home']]) {
    const active = nav.DEFAULT_TEACHER_ITEMS.filter(item => nav.isNavItemActive(item, path));
    assert.equal(active.length, 1); assert.equal(active[0].id, id);
  }
  const old = { studentItems: [{ id: 'custom-student' }], teacherItems: [{ id: 't-new-lesson' }, { id: 'custom-teacher' }] };
  const migrated = persistence.migrate(old, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(migrated.studentItems)), old.studentItems);
  assert.ok(!migrated.teacherItems.some(item => item.id === 't-new-lesson'));
  assert.ok(migrated.teacherItems.some(item => item.id === 'custom-teacher'));
  const next = persistence.migrate({ studentItems: [{id:'s-search',label:'선생님 찾기'}, {id:'s-bookings',label:'수업 예약'}, {id:'custom-student'}],teacherItems:nav.DEFAULT_TEACHER_ITEMS },2);
  assert.equal(next.studentItems[0].label,'수업 찾기');
  assert.equal(next.studentItems[1].label,'내 수업');
  assert.equal(next.teacherItems,nav.DEFAULT_TEACHER_ITEMS);
  const detail = nav.DEFAULT_STUDENT_ITEMS.filter(item=>nav.isNavItemActive(item,'/lessons/lesson-id'));
  assert.equal(detail.length,1);assert.equal(detail[0].id,'s-search');
});
