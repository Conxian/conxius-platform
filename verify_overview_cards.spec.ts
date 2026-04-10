import { test, expect } from '@playwright/test';

test('verify overview page has new cards', async ({ page }) => {
  await page.goto('http://localhost:3000/overview');
  await page.waitForSelector('text=Core Contracts');

  // Scroll to bottom
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  // Verify cards are visible or at least in DOM
  const aiCard = page.locator('text=AI-Driven Asset Allocation');
  const nexusCard = page.locator('text=Nexus State Sync');
  const ubiCard = page.locator('text=Universal Bitcoin Identity');

  await expect(aiCard).toBeVisible();
  await expect(nexusCard).toBeVisible();
  await expect(ubiCard).toBeVisible();

  await page.screenshot({ path: '/home/jules/verification/overview_cards.png', fullPage: true });
});
