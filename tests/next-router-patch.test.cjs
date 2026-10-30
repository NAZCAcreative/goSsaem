const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { patchRouter } = require('../scripts/patch-next-router.cjs');

for (const esm of [false, true]) {
  test(`router compatibility patch isolates suspension and is idempotent (${esm ? 'ESM' : 'CJS'})`, () => {
    const unwrap = esm ? 'useUnwrapState(reducerState)' : '(0, _usereducerwithdevtools.useUnwrapState)(reducerState)';
    const original = `function Router(param) {
      const reducerState = {};
    const { canonicalUrl } = ${unwrap};
      const memo = useMemo(() => canonicalUrl, [canonicalUrl]);
      return ${unwrap};
    }
    ${esm ? 'export default ' : ''}function AppRouter(props) { return props; }`;
    const patched = patchRouter(original, esm);
    const boundary = patched.slice(patched.indexOf('function RouterStateBoundary'), patched.indexOf('function RouterContent'));
    const content = patched.slice(patched.indexOf('function RouterContent'));
    assert.match(boundary, /useUnwrapState/);
    assert.doesNotMatch(boundary, /useMemo/);
    assert.match(content, /useMemo/);
    assert.doesNotMatch(content, /useUnwrapState|\breducerState\b/);
    assert.equal(patchRouter(patched, esm), patched);
    new vm.Script(patched.replace('export default ', ''));
  });
}

test('unknown router source fails instead of silently skipping the fix', () => {
  assert.throws(() => patchRouter('function Router() {}', false), /source changed/);
});

test('both installed Next runtime modules contain the compatibility boundary', () => {
  const nextRoot = path.dirname(require.resolve('next/package.json'));
  for (const file of ['dist/client/components/app-router.js', 'dist/esm/client/components/app-router.js']) {
    const source = fs.readFileSync(path.join(nextRoot, file), 'utf8');
    assert.match(source, /function RouterStateBoundary\(props\)/);
    const content = source.slice(source.indexOf('function RouterContent'));
    assert.doesNotMatch(content, /useUnwrapState/);
  }
});
