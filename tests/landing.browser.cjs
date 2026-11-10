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
    await page.route('https://preview.supabase.co/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    page.on('pageerror', error => errors.push(error.message));
    for (const width of [1672, 1280, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: width > 600 ? 941 : 844 });
      await page.goto(base + '/student', { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: /Speak Korean/ }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
      assert.ok(dimensions.content <= dimensions.viewport, `No horizontal overflow at ${width}: ${JSON.stringify(dimensions)}`);
      await page.screenshot({ path: `.tmp/landing/${width}.png`, fullPage: true });
      console.log(`Layout ${width}px: no horizontal overflow`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Close menu', exact: true }).getAttribute('aria-expanded'), 'true');
    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Teachers', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Open menu', exact: true }).getAttribute('aria-expanded'), 'false');
    await page.getByRole('button', { name: 'Start the Challenge' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    await dialog.getByRole('button', { name: /Where are you/ }).click();
    await dialog.getByText(/Almost!/).waitFor();
    await dialog.getByRole('button', { name: /What is this/ }).click();
    await dialog.getByText(/That’s right!/).waitFor();
    await page.screenshot({ path: '.tmp/landing/quiz-mobile.png', fullPage: true });
    await page.keyboard.press('Escape');
    assert.equal(await dialog.isVisible(), false);
    assert.equal(await page.getByRole('button', { name: 'Start the Challenge' }).evaluate(el => el === document.activeElement), true);
    await page.getByRole('button', { name: 'Play Korean introduction video' }).click();
    assert.match(await page.locator('iframe').getAttribute('src'), /youtube-nocookie\.com\/embed\/9wG_Y4pL5Zc/);
    assert.equal(await page.getByRole('link', { name: 'Watch on YouTube' }).getAttribute('href'), 'https://youtu.be/9wG_Y4pL5Zc');
    assert.deepEqual(errors, [], 'No uncaught client errors');
    console.log('Mobile menu, quiz answers, Escape/focus restoration, and video embed passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
