import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 2000 });
  await page.goto('http://localhost:3000/overview');
  await page.waitForTimeout(5000); // Wait for animations/fetches
  await page.screenshot({ path: '/home/jules/verification/overview_full.png', fullPage: true });
  await browser.close();
})();
