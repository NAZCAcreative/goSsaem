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
    await page.waitForURL('**/student/home');
    await page.getByRole('heading', { name: /나에게 맞는 한국어 선생님/ }).waitFor();
    await page.getByRole('search').waitFor();
    for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      assert.equal(overflow, false, `Guest home fits ${width}px`);
      await page.getByRole('link', { name: '선생님이신가요?' }).waitFor();
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      await page.getByRole('link', { name: '선생님이신가요?' }).click();
      await page.getByRole('heading', { name: '선생님 로그인', exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: '선생님', exact: true }).getAttribute('aria-pressed'), 'true');
      await page.getByLabel('이메일 주소').fill('fixture@example.test');
      await page.getByRole('button', { name: '학생', exact: true }).click();
      await page.getByRole('heading', { name: '학생 로그인', exact: true }).waitFor();
      assert.equal(await page.getByLabel('이메일 주소').inputValue(), 'fixture@example.test');
      await page.getByRole('button', { name: '선생님', exact: true }).click();
      await page.getByRole('heading', { name: '선생님 로그인', exact: true }).waitFor();
      await page.goto(base + '/teacher');
      await page.waitForURL('**/teacher');
      await page.locator('a[href="/signup/teacher"]').first().click();
      await page.getByRole('heading', { name: '선생님 회원가입', exact: true }).waitFor();
      await page.goBack();
      await page.waitForURL('**/teacher');
      await page.goto(base + '/student/home');
    }
    await page.locator('a[href="/signup/student"]').first().click();
    await page.getByRole('heading', { name: '학생 회원가입', exact: true }).waitFor();
    await page.getByRole('link', { name: '로그인', exact: true }).last().click();
    await page.waitForURL('**/login?next=*');
    await page.goto(base + '/register');
    await page.waitForURL('**/signup/student');
    for (const path of ['/onboarding', '/student']) {
      await page.goto(base + path);
      await page.waitForURL('**/student/home');
    }
    await page.getByRole('searchbox').fill('한국어');
    await page.getByRole('search').getByRole('button', { name: '검색', exact: true }).click();
    await page.waitForURL('**/student/search?q=*');
    await page.goto(base + '/student/bookings');
    await page.waitForURL('**/login?next=*');
    await page.goto(base + '/teacher/home');
    await page.waitForURL('**/login?next=*');
    assert.deepEqual(errors, [], 'No uncaught client errors during navigation and history restores');
    console.log('Student/teacher navigation, signup/login, legacy redirects and history restores passed without client exceptions.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
