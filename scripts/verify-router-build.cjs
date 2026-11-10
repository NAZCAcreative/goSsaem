const fs = require('node:fs');
const path = require('node:path');

function verifyRouterBuild(distDir = process.env.NEXT_DIST_DIR || '.next') {
  const root = path.join(distDir, 'static', 'chunks');
  let routers = 0;
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) { visit(file); continue; }
      if (!entry.name.endsWith('.js')) continue;
      const source = fs.readFileSync(file, 'utf8');
      const calls = source.match(/\.\s*useUnwrapState\s*\)\s*\(/g) || [];
      if (!calls.length) continue;
      // Patched routers unwrap once in their dedicated boundary. The original
      // router unwraps four times, interleaved with its other React hooks.
      if (calls.length !== 1) throw new Error(`Unpatched Next router in ${file}. Refusing this build (${calls.length} unwrap calls).`);
      routers++;
    }
  }
  visit(root);
  if (!routers) throw new Error('No patched Next router found in browser chunks; review the build verifier.');
  console.log(`Verified ${routers} compiled Next router chunk(s): React #310 boundary present.`);
}

if (require.main === module) verifyRouterBuild();
module.exports = { verifyRouterBuild };
