const fs = require("node:fs");
// Report presence only. Never print values, keys, tokens or connection strings.
for (const file of [".env.local", ".env"])
  if (fs.existsSync(file))
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match && !process.env[match[1]])
        process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "").trim();
    }
const required = [
  "APP_ORIGIN",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_OPERATOR_NAME",
  "NEXT_PUBLIC_BUSINESS_REGISTRATION",
  "NEXT_PUBLIC_BUSINESS_ADDRESS",
  "NEXT_PUBLIC_SUPPORT_EMAIL",
  "NEXT_PUBLIC_TOSS_CLIENT_KEY",
  "TOSS_SECRET_KEY",
  "PAYMENT_WEBHOOK_SECRET",
  "CRON_SECRET",
  "RESEND_API_KEY",
  "EMAIL_FROM",
];
let missing = 0;
for (const key of required) {
  const value = process.env[key];
  const ready = !!value && !/your-|xxxx|placeholder/.test(value);
  console.log(`${ready ? "OK" : "MISSING"} ${key}`);
  if (!ready) missing++;
}
for (const key of ["PAYMENTS_ENABLED", "NEXT_PUBLIC_POLICIES_PUBLISHED"]) {
  const ready = process.env[key] === "true";
  console.log(`${ready ? "OK" : "PENDING"} ${key}`);
  if (!ready) missing++;
}
const origin = process.env.APP_ORIGIN;
if (origin) {
  try {
    if (new URL(origin).protocol !== "https:") throw new Error();
  } catch {
    console.log("INVALID APP_ORIGIN (production requires HTTPS)");
    missing++;
  }
}
console.log(
  `${missing} unresolved configuration checks. This does not verify contracts, deployed migrations, DNS, external approvals, backups or real-money behavior.`,
);
process.exitCode = missing ? 1 : 0;
