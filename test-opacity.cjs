const { chromium } = require('playwright');
const path = require('path');

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

  // Find the Opacity input and change its value to 50
  const opacityInput = page.locator('input[title="Brush opacity (%)"]');
  await opacityInput.fill('50');

  // Verify it changed
  const value = await opacityInput.inputValue();
  if (value !== '50') {
    throw new Error('Opacity input value not updated: ' + value);
  }

  // Set brush size to 10 for visibility
  const sizeInput = page.locator('input[title="Brush size"]');
  await sizeInput.fill('10');

  // Draw on the canvas
  const canvas = page.locator('div[aria-label="Pixel canvas"]');
  const box = await canvas.boundingBox();

  // Draw a semi-transparent stroke
  await page.mouse.move(box.x + box.width / 2 - 50, box.y + box.height / 2 - 50);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2 + 50, { steps: 10 });
  await page.mouse.up();

  // Take screenshot
  await page.screenshot({ path: 'opacity-test.png' });

  await context.close();
  await browser.close();

  console.log('Test completed successfully, screenshot and video saved.');
})();
