const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');

  // The foreground color is covering the background color because they're overlapping
  // Let's use force click.
  await page.click('div[title="Background Color"]', { force: true });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'bg_picker_open.png' });

  await page.mouse.click(10, 10); // click outside
  await page.waitForTimeout(500);

  await page.click('div[title="Foreground Color"]', { force: true });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'fg_picker_open.png' });

  await browser.close();
})();
