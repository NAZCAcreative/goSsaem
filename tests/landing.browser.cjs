const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3005';

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const errors = [];
  try {
    fs.mkdirSync('.tmp/landing', { recursive: true });
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(error.message));
    for (const width of [1672, 1280, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(base + '/student', { waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: /한국어로 말하고/ }).waitFor();
      await page.getByRole('link', { name: '로그인', exact: true }).waitFor();
      const desktop = page.getByRole('navigation', { name: '학생 상단 메뉴' });
      const mobile = page.getByRole('navigation', { name: '모바일 하단 메뉴' });
      assert.equal(await desktop.isVisible(), width >= 1024);
      assert.equal(await mobile.isVisible(), width < 1024);
      const activeNav = width >= 1024 ? desktop : mobile;
      assert.equal(await activeNav.getByRole('link').count(), 5);
      assert.equal(await activeNav.getByRole('link', { name: '내 수업' }).getAttribute('href'), '/student/bookings');
      assert.equal(await page.getByText('선생님이신가요?', { exact: false }).count(), 0);
      const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
      assert.ok(dimensions.content <= dimensions.viewport, 'No horizontal overflow at ' + width);
      await page.screenshot({ path: '.tmp/landing/' + width + '.png', fullPage: true });
      console.log('Student landing ' + width + 'px: Korean copy, responsive navigation and layout passed');
    }
    await page.getByRole('button', { name: '퀴즈 풀어보기' }).click();
    await page.getByRole('dialog', { name: '하루 1분 한국어 퀴즈' }).waitFor();
    await page.getByRole('button', { name: /물건의 이름을 물을 때/ }).click();
    await page.getByText('정답이에요!', { exact: false }).waitFor();
    await page.getByRole('button', { name: '퀴즈 닫기' }).click();
    assert.deepEqual(errors, [], 'No uncaught client errors');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
