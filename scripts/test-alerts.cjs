const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const filename = path.resolve('src/stores/alert-store.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(path.dirname(filename));
loaded._compile(compiled, filename);
const { showError, showWarning, showConfirm, dismissAlert, useAlertStore } = loaded.exports;
const queue = () => useAlertStore.getState().queue;

test('alerts raised before the host mounts are retained, deduplicated and acknowledged in order', () => {
  useAlertStore.setState({ queue: [] });
  showError('예약 실패'); showError('예약 실패'); showWarning('시간을 선택해주세요');
  assert.deepEqual(queue().map(item => item.message), ['예약 실패', '시간을 선택해주세요']);
  dismissAlert(queue()[1].id, true);
  assert.equal(queue().length, 2, 'A stale or non-active dialog cannot dismiss another alert');
  dismissAlert(queue()[0].id, true);
  assert.equal(queue()[0].kind, 'warning');
  dismissAlert(queue()[0].id, true);
  showError('예약 실패');
  assert.equal(queue().length, 1, 'Retrying the same failed action must display it again');
});

test('destructive actions wait for explicit confirmation; cancel never accepts', async () => {
  useAlertStore.setState({ queue: [] });
  let executed = false;
  const first = showConfirm('삭제할까요?').then(accepted => { if (accepted) executed = true; return accepted; });
  await Promise.resolve();
  assert.equal(executed, false);
  dismissAlert(queue()[0].id, false);
  assert.equal(await first, false);
  assert.equal(executed, false);
  const second = showConfirm('삭제할까요?');
  dismissAlert(queue()[0].id, true);
  assert.equal(await second, true);
  assert.equal(queue().length, 0);
});
