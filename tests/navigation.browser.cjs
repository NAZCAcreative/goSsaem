const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/');
    await page.waitForURL('**/student');
    for (let attempt = 0; attempt < 3; attempt++) {
      await page.locator('a[href="/teacher"]').first().click();
      await page.waitForURL('**/teacher');
      await page.locator('a[href="/signup/teacher"]').first().click();
      await page.getByRole('heading', { name: '선생님 회원가입', exact: true }).waitFor();
      await page.goBack();
      await page.waitForURL('**/teacher');
      await page.goBack();
      await page.waitForURL('**/student');
    }
    await page.locator('a[href="/signup/student"]').first().click();
    await page.getByRole('heading', { name: '학생 회원가입', exact: true }).waitFor();
    await page.getByRole('link', { name: '로그인', exact: true }).click();
    await page.waitForURL('**/login?next=*');
    await page.goto(base + '/register');
    await page.waitForURL('**/signup');
    await page.goto(base + '/teacher/home');
    await page.waitForURL('**/login?next=*');
    assert.deepEqual(errors, [], 'No uncaught client errors during navigation and history restores');
    console.log('Student/teacher navigation, signup/login, legacy redirects and history restores passed without client exceptions.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
