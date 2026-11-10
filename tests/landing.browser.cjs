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
      await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
      await page.waitForURL('**/student/home');
      await page.getByRole('heading', { name: /나에게 맞는 한국어 선생님/ }).waitFor();
      await page.getByRole('search').waitFor();
      const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
      assert.ok(dimensions.content <= dimensions.viewport, 'No horizontal overflow at ' + width);
      await page.screenshot({ path: '.tmp/landing/' + width + '.png', fullPage: true });
      console.log('Guest home ' + width + 'px: direct entry, search and layout passed');
    }
    await page.getByRole('link', { name: '선생님이신가요?' }).click();
    await page.getByRole('heading', { name: '선생님 로그인', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: '선생님', exact: true }).getAttribute('aria-pressed'), 'true');
    await page.screenshot({ path: '.tmp/landing/login-selector.png', fullPage: true });
    assert.deepEqual(errors, [], 'No uncaught client errors');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
