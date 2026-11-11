const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function compile(file, imports) {
  const context = { exports: {}, URL, Date, require: name => imports[name] ?? require(name) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, context);
  return context.exports;
}
test('Korean day range includes midnight correctly regardless of execution timezone', () => {
  const { koreaDayRange } = compile('src/lib/queries/teacherWorkspace.ts', { '@/lib/supabase/client': {} });
  const before = koreaDayRange(new Date('2026-11-11T14:59:59Z'));
  const after = koreaDayRange(new Date('2026-11-11T15:00:00Z'));
  assert.equal(before.start, '2026-11-10T15:00:00.000Z');
  assert.equal(before.end, '2026-11-11T15:00:00.000Z');
  assert.equal(after.start, before.end);
});
test('review errors remain errors and cannot fall back to demo approval', async () => {
  let error = { message: 'offline' };
  const api = compile('src/lib/queries/teacherApplications.ts', { '@/lib/supabase/client': { createClient: () => ({ rpc: async () => ({ data: null, error }) }) } });
  await assert.rejects(api.getMyTeacherApplication());
  error = null;
  assert.equal(await api.getMyTeacherApplication(), null);
  assert.equal(api.getDemoTeacherStatus, undefined);
  assert.equal(api.setDemoTeacherStatus, undefined);
});
test('dashboard links resolve to existing routes and no fabricated controls remain', () => {
  const source = fs.readFileSync('src/components/features/teacher/TeacherWorkspaceDashboard.tsx', 'utf8');
  for (const [, href] of source.matchAll(/href="(\/teacher[^"#?]*)/g)) assert.ok(fs.existsSync(`src/app/(main)${href}/page.tsx`), href);
  assert.doesNotMatch(source, /getDemoTeacherStatus|setDemoTeacherStatus|window\.print|href="#|\/demo|85%|D-7/);
});
