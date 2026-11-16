const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const nativeDialogs = [];
    page.on('dialog', async dialog => { nativeDialogs.push(dialog.type()); await dialog.dismiss(); });
    await page.goto('http://localhost:3015/login', { waitUntil: 'networkidle' });
    const submit = page.getByRole('button', { name: '학생으로 로그인', exact: true });
    await submit.click();
    const alert = page.getByRole('alertdialog');
    await alert.waitFor({ state: 'visible' });
    assert.match(await alert.textContent(), /이메일과 비밀번호를 입력해주세요/);
    await page.waitForTimeout(2400);
    assert.equal(await alert.isVisible(), true, 'Errors must not disappear like toasts');
    assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
    await page.keyboard.press('Tab');
    assert.equal(await alert.evaluate(el => el.contains(document.activeElement)), true, 'Focus stays in the modal');
    await alert.getByRole('button', { name: '확인', exact: true }).click();
    await alert.waitFor({ state: 'detached' });
    assert.equal(await submit.evaluate(el => el === document.activeElement), true, 'Focus returns to the trigger');
    await submit.click();
    await alert.waitFor({ state: 'visible' });
    await page.keyboard.press('Escape');
    await alert.waitFor({ state: 'detached' });
    await page.locator('#login-email').fill('invalid-email');
    await submit.click();
    await alert.waitFor({ state: 'visible' });
    assert.match(await alert.textContent(), /주의 안내/);
    await alert.getByRole('button', { name: '확인', exact: true }).click();
    await page.goto('http://localhost:3015/login?error=teacher_account_required', { waitUntil: 'networkidle' });
    await alert.waitFor({ state: 'visible' });
    assert.match(await alert.textContent(), /학생 계정으로 가입된 이메일/);
    const bounds = await alert.boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390, 'Dialog fits mobile width');
    assert.deepEqual(nativeDialogs, []);
    console.log('PASS: error persistence, retry, focus trap/restore, Escape, native validation, callback errors, mobile layout');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
