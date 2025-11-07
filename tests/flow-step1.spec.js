// tests/flow-step1.spec.js
const { test, expect } = require('@playwright/test');

const HOME = 'https://ruqayas-bookshelf.webflow.io/';

test('Flow Step 1 — go to home page and verify scrolling works', async ({ page }) => {
  // 1) open home page
  await page.goto(HOME, { waitUntil: 'domcontentloaded' });

  // 2) basic visibility check
  await expect(page.locator('body')).toBeVisible();
  // also ensure main content or header is present
  await expect(page.locator('header, main, #hero, .hero').first()).toBeVisible();

  // 3) measure initial scroll position
  const initialScroll = await page.evaluate(() => window.scrollY || 0);

  // 4) scroll to bottom and verify scroll position increased
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'auto' }));
  await page.waitForTimeout(600); // allow for any smooth scroll or lazy load
  const afterScroll = await page.evaluate(() => window.scrollY || 0);

  expect(afterScroll).toBeGreaterThan(initialScroll);

  // 5) scroll back to top and verify
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'auto' }));
  await page.waitForTimeout(300);
  const finalScroll = await page.evaluate(() => window.scrollY || 0);

  expect(finalScroll).toBeLessThanOrEqual(5); // allow tiny rounding
});
