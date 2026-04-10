import { test, expect } from '@playwright/test';

test('verify all production modules on system overview', async ({ page }) => {
  await page.goto('/overview');

  // Wait for components to load
  await page.waitForSelector('text=System Overview');

  // 1. Sovereign Orchestration
  await expect(page.locator('text=AI-Driven Asset Allocation')).toBeVisible();
  await expect(page.locator('text=Nexus L1 Sync')).toBeVisible();
  await expect(page.locator('text=Universal Bitcoin Identity')).toBeVisible();

  // 2. Market Readiness & Ops
  await expect(page.locator('text=ALEX Integration (Method B)')).toBeVisible();
  await expect(page.locator('text=Structured Ops Loans')).toBeVisible();
  await expect(page.locator('text=Offline POS Edge')).toBeVisible();

  // Take production-ready screenshot
  await page.screenshot({ path: 'services/conxian-ui/docs/screenshots/production_ready_dashboard.png', fullPage: true });
});
