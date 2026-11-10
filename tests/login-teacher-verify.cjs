const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testLoginPage() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const outDir = path.join(__dirname, '..', '.tmp', 'login');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  
  console.log('Navigating to /login...');
  await page.goto('http://localhost:3005/login', { waitUntil: 'networkidle' });
  const teacherPrompt = await page.locator('text=선생님이신가요?').first().isVisible();
  console.log(`[Student Login] "선생님이신가요?" visible: ${teacherPrompt}`);
  await page.screenshot({ path: path.join(outDir, 'login-student.png'), fullPage: true });

  console.log('Testing teacher mode...');
  await page.goto('http://localhost:3005/login?role=teacher', { waitUntil: 'networkidle' });
  const studentPrompt = await page.locator('text=학생이신가요?').first().isVisible();
  console.log(`[Teacher Login] "학생이신가요?" visible: ${studentPrompt}`);
  await page.screenshot({ path: path.join(outDir, 'login-teacher.png'), fullPage: true });

  await page.close();
  await browser.close();
  console.log('Login verification complete!');
}

testLoginPage().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
