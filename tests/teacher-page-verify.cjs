const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testTeacherPages() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const outDir = path.join(__dirname, '..', '.tmp', 'teacher');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const viewports = [
    { name: 'desktop-935', width: 935, height: 1024 },
    { name: 'desktop-1280', width: 1280, height: 900 },
    { name: 'mobile-390', width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    console.log(`Navigating to /teacher on ${vp.name}...`);
    await page.goto('http://localhost:3005/teacher', { waitUntil: 'networkidle' });

    // Scroll to bottom to ensure full rendering
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);

    // Verify key elements exist
    const headerVisible = await page.locator('header[data-landing-header]').isVisible();
    const heroHeadline = await page.locator('h1').textContent();
    console.log(`[${vp.name}] Header visible: ${headerVisible}, Headline: ${heroHeadline.replace(/\s+/g, ' ').trim()}`);

    // Verify 4 cards
    const valueCards = await page.$$('section#why-gossaem h2');
    console.log(`[${vp.name}] Value items count: ${valueCards.length}`);

    // Verify registration steps
    const stepLabels = await page.locator('#how-it-works h3').allTextContents();
    console.log(`[${vp.name}] Steps: ${stepLabels.join(' -> ')}`);

    const screenshotPath = path.join(outDir, `teacher-${vp.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Saved screenshot to ${screenshotPath}`);

    // Test settlement modal on desktop-935
    if (vp.name === 'desktop-935') {
      console.log('Testing settlement modal...');
      await page.click('text=정산 안내');
      await page.waitForTimeout(200);
      const modalVisible = await page.locator('#settlement-modal-title').isVisible();
      console.log(`Settlement modal visible: ${modalVisible}`);
      await page.screenshot({ path: path.join(outDir, 'teacher-modal-settlement.png') });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }

    await page.close();
  }

  // Also verify /signup/student and /signup
  const authPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  
  console.log('Testing /signup/student...');
  await authPage.goto('http://localhost:3005/signup/student', { waitUntil: 'networkidle' });
  const studentPrompt = await authPage.locator('text=선생님이신가요?').first().isVisible();
  console.log(`[Signup Student] "선생님이신가요?" visible: ${studentPrompt}`);
  await authPage.screenshot({ path: path.join(outDir, 'signup-student.png'), fullPage: true });

  console.log('Testing /signup...');
  await authPage.goto('http://localhost:3005/signup', { waitUntil: 'networkidle' });
  const mainSignupPrompt = await authPage.locator('text=선생님이신가요?').first().isVisible();
  console.log(`[Signup Selection] "선생님이신가요?" visible: ${mainSignupPrompt}`);
  await authPage.screenshot({ path: path.join(outDir, 'signup-selection.png'), fullPage: true });

  await authPage.close();
  await browser.close();
  console.log('All verifications completed successfully!');
}

testTeacherPages().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
