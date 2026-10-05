const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    recordVideo: {
      dir: 'videos/',
      size: { width: 1280, height: 720 }
    }
  });
  const page = await context.newPage();

  for (let i = 0; i < 10; i++) {
    try {
      await page.goto('http://localhost:5173');
      break;
    } catch (e) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Give it a moment to load the workspace
  await page.waitForTimeout(1000);

  // Verify Blur and Sharpen tools are present and functional
  const blurButton = page.locator('button[title="Blur"]');
  await blurButton.waitFor({ state: 'visible' });
  await blurButton.click();

  const sharpenButton = page.locator('button[title="Sharpen"]');
  await sharpenButton.waitFor({ state: 'visible' });
  await sharpenButton.click();

  // We'll just click in the center of the viewport
  await page.mouse.move(600, 400);
  await page.mouse.down();
  await page.mouse.move(650, 450, { steps: 5 });
  await page.mouse.up();

  // Take a screenshot of the UI with Sharpen tool selected
  await page.screenshot({ path: 'screenshot.png' });

  await context.close();
  await browser.close();
})();
