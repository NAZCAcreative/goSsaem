const fs = require('node:fs');
const path = require('node:path');

// Next 14's router can suspend in useUnwrapState before its remaining hooks,
// causing React #310 on a later navigation. Keep suspension in a hook-only
// boundary and render the remaining router hooks in a separate component.
// Upstream discussion: https://github.com/vercel/next.js/issues/63121
const marker = '// GoSsaem: isolate router state suspension (React #310).';

function patchRouter(source, esm) {
  if (source.includes(marker)) return source;
  const unwrap = esm
    ? 'useUnwrapState(reducerState)'
    : '(0, _usereducerwithdevtools.useUnwrapState)(reducerState)';
  const split = `    const { canonicalUrl } = ${unwrap};`;
  const start = source.indexOf('function Router(param) {');
  const boundary = source.indexOf(split, start);
  const end = source.indexOf(esm ? 'export default function AppRouter(' : 'function AppRouter(', boundary);
  if (start < 0 || boundary < 0 || end < 0) throw new Error('Next router source changed; review the React #310 compatibility patch.');
  const jsx = esm ? '_jsx' : '(0, _jsxruntime.jsx)';
  const unwrapBoundary = esm
    ? 'useUnwrapState(props.reducerState)'
    : '(0, _usereducerwithdevtools.useUnwrapState)(props.reducerState)';
  const bridge = `    ${marker}
    return ${jsx}(RouterStateBoundary, { reducerState, dispatch, sync, buildId, assetPrefix, missingSlots });
}
function RouterStateBoundary(props) {
    const routerState = ${unwrapBoundary};
    return ${jsx}(RouterContent, { ...props, routerState });
}
function RouterContent(param) {
    const { routerState, dispatch, sync, buildId, assetPrefix, missingSlots } = param;
`;
  const content = source.slice(boundary, end).split(unwrap).join('routerState');
  if (/\breducerState\b/.test(content)) throw new Error('Unexpected reducer state use in RouterContent; review the compatibility patch.');
  return source.slice(0, boundary) + bridge + content + source.slice(end);
}

function applyPatch() {
  const nextRoot = path.dirname(require.resolve('next/package.json'));
  const version = JSON.parse(fs.readFileSync(path.join(nextRoot, 'package.json'), 'utf8')).version;
  if (version !== '14.2.35') throw new Error(`Review the React #310 compatibility patch before changing Next ${version}.`);
  const files = [
    ['dist/client/components/app-router.js', false],
    ['dist/esm/client/components/app-router.js', true],
  ];
  // Validate both targets before writing either one.
  const changes = files.map(([file, esm]) => {
    const target = path.join(nextRoot, file);
    const source = fs.readFileSync(target, 'utf8');
    return { target, source, patched: patchRouter(source, esm) };
  });
  for (const { target, source, patched } of changes) {
    if (source !== patched) fs.writeFileSync(target, patched);
  }
  console.log('Next router React #310 compatibility patch verified (CJS and ESM).');
}

applyPatch();
module.exports = { patchRouter, applyPatch };
