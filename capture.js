const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 2000 });
  await page.goto('http://localhost:3000/overview');
  await page.waitForTimeout(5000);
  await page.screenshot({ path: '/home/jules/verification/overview_final.png', fullPage: true });
  await browser.close();
  console.log('Screenshot captured to /home/jules/verification/overview_final.png');
})();
