const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TEST_BASE_URL || 'http://localhost:3005';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/');
    await page.waitForURL('**/student');
    await page.getByRole('heading', { name: /한국어로 말하고/ }).waitFor();
    for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      await page.goto(base + '/login?role=teacher&next=%2Fteacher%2Fhome');
      await page.getByRole('heading', { name: '선생님 로그인', exact: true }).waitFor();
      await page.getByRole('button', { name: '학생', exact: true }).click();
      await page.getByRole('heading', { name: '학생 로그인', exact: true }).waitFor();
      await page.getByRole('button', { name: '선생님', exact: true }).click();
      await page.getByRole('heading', { name: '선생님 로그인', exact: true }).waitFor();
      await page.goto(base + '/teacher');
      await page.locator('a[href="/signup/teacher"]').first().click();
      await page.getByRole('heading', { name: '선생님 회원가입', exact: true }).waitFor();
      await page.goBack(); await page.waitForURL('**/teacher');
    }
    await page.goto(base + '/register'); await page.waitForURL('**/signup');
    await page.locator('a[href="/signup/student"]').first().click();
    await page.getByRole('heading', { name: '학생 회원가입', exact: true }).waitFor();
    await page.goto(base + '/onboarding'); await page.waitForURL('**/student/home');
    await page.goto(base + '/student/search');
    await page.getByRole('searchbox').fill('한국어');
    await page.getByRole('button', { name: '수업 검색', exact: true }).click();
    await page.waitForURL('**/student/search?q=*');
    await page.getByRole('link', { name: '선생님으로 찾기', exact: true }).click();
    await page.waitForURL('**/student/teachers');
    for (const path of ['/student/bookings', '/teacher/home']) {
      await page.goto(base + path); await page.waitForURL('**/login?**');
    }
    assert.deepEqual(errors, []);
    console.log('Student/teacher navigation, responsive landing, role entry, signup/login, discovery links and legacy redirects passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
