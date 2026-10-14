const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: './videos/' }
  });
  const page = await context.newPage();

  await page.goto('http://localhost:5173');

  // Wait for the UI
  await page.waitForSelector('text=Opacity');

  // Set brush opacity to 100
  const opacityInput = page.locator('input[title="Brush opacity (%)"]');
  await opacityInput.fill('100');

  // Set brush size to 10
  const sizeInput = page.locator('input[title="Brush size"]');
  await sizeInput.fill('10');

  // Draw a solid stroke
  const canvas = page.locator('div[aria-label="Pixel canvas"]');
  const box = await canvas.boundingBox();

  await page.mouse.move(box.x + box.width / 2 - 50, box.y + box.height / 2 - 50);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2 + 50, { steps: 10 });
  await page.mouse.up();

  // Switch to eraser (E)
  await page.keyboard.press('e');

  // Set eraser opacity to 50
  await opacityInput.fill('50');

  // Erase part of the stroke
  await page.mouse.move(box.x + box.width / 2 - 50, box.y + box.height / 2 + 50);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2 - 50, { steps: 10 });
  await page.mouse.up();

  // Take screenshot
  await page.screenshot({ path: 'opacity-eraser-test.png' });

  await context.close();
  await browser.close();

  console.log('Test completed successfully, screenshot and video saved.');
})();
