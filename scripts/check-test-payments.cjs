const fs = require('node:fs');
// Report status only; never print credentials or connection strings.
for (const file of ['.env.local', '.env']) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
}
let pending = 0;
function check(name, valid) { console.log(`${valid ? 'OK' : 'PENDING'} ${name}`); if (!valid) pending++; }
check('PAYMENTS_MODE=test', process.env.PAYMENTS_MODE === 'test');
for (const [name, prefix] of [['NEXT_PUBLIC_TOSS_CLIENT_KEY', 'test_ck_'], ['TOSS_SECRET_KEY', 'test_sk_']]) {
  const value = process.env[name] || '';
  check(name, value.startsWith(prefix) && value.length > prefix.length && !/REPLACE|placeholder|your-/i.test(value));
}
for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) check(name, Boolean(process.env[name]));
let validOrigin = false;
try { const origin = new URL(process.env.APP_ORIGIN); validOrigin = origin.protocol === 'https:' || (origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname)); } catch {}
check('APP_ORIGIN', validOrigin);
console.log(`${pending} pending test configuration checks. Key validity and deployed database migrations require a sandbox checkout.`);
process.exitCode = pending ? 1 : 0;
