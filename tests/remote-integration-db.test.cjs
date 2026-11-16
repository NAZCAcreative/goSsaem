const test = require('node:test');
const fs = require('node:fs');
const { createTestDb } = require('./helpers/local-db.cjs');

for (const name of [
  'lesson-catalog-db.sql', 'matching-profiles-db.sql', 'teacher-languages-db.sql',
  'teacher-workspace-db.sql', 'teacher-tools-rls.sql', 'teacher-portfolio-rls.sql',
  'teacher-application-entry.sql', 'teacher-entry-recovery-db.sql',
]) {
  test(`remote workflow remains compatible: ${name}`, async () => {
    const db = await createTestDb();
    try { await db.exec(fs.readFileSync(`tests/${name}`, 'utf8')); }
    finally { await db.close(); }
  });
}
