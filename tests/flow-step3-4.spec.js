// tests/flow-step3.spec.js
// @ts-check
import { test, expect } from '@playwright/test';
import fs from 'fs';

test.setTimeout(90_000);

test('Step 3 & 4 — click Store and wait until products load (robust)', async ({ page }) => {
  const HOME = 'https://ruqayas-bookshelf.webflow.io/';
  // candidate selectors for store grid / product items
  const GRID_CANDIDATES = [
    '[data-testid="collection-list-grid"]',
    '[data-testid="store-products-grid"]',
    '.collection-list',
    '.collection-grid',
    '.w-dyn-list',
  ];
  // candidate product item selectors (used to verify items loaded)
  const ITEM_CANDIDATES = [
    '.w-dyn-item',
    '[data-testid="product-item"]',
    '[data-testid="product-card"]',
    '.product-card',
    'a[href*="/product/"]',
    'a[href*="/products/"]'
  ];

  // 1) Go to homepage
  await page.goto(HOME, { waitUntil: 'domcontentloaded', timeout: 45000 });

  // 2) Find and click Store link from navbar
  const storeLink = page.locator('a.nav-link:has-text("Store")').first();
  await expect(storeLink).toBeVisible({ timeout: 10000 });
  // click and wait for networkidle (give page scripts a chance to run)
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 45000 }).catch(() => null),
    storeLink.click({ timeout: 10000 })
  ]);

  // ensure URL includes /store
  await page.waitForURL('**/store', { timeout: 30000 });

  // 3) Try a few strategies to detect that products loaded
  const totalTimeout = 45_000; // how long we'll try to detect the grid
  const pollInterval = 500;
  const start = Date.now();
  let found = null;

  // helper: check candidate selectors for visible grid or visible item(s)
  async function probeOnce() {
    // 1) look for any grid candidate that's visible and contains at least one visible child
    for (const sel of GRID_CANDIDATES) {
      const grid = page.locator(sel).first();
      if (await grid.count() > 0) {
        if (await grid.isVisible().catch(() => false)) {
          // check if it contains any likely product items
          for (const itemSel of ITEM_CANDIDATES) {
            const item = grid.locator(itemSel).first();
            if (await item.count() > 0 && await item.isVisible().catch(() => false)) {
              return { type: 'grid-with-items', selector: sel, itemSelector: itemSel, locator: grid };
            }
          }
          // if grid visible but no known item inside, still return grid as a candidate
          return { type: 'grid-visible-no-items', selector: sel, locator: grid };
        }
      }
    }

    // 2) fallback: search globally for visible product items
    for (const itemSel of ITEM_CANDIDATES) {
      const item = page.locator(itemSel).first();
      if (await item.count() > 0 && await item.isVisible().catch(() => false)) {
        return { type: 'item-only', selector: itemSel, locator: item };
      }
    }

    return null;
  }

  // initial small wait to let client code start
  await page.waitForTimeout(800);

  // sometimes Webflow requires scroll/click to attach lazy widgets — attempt small nudges during probes
  while (Date.now() - start < totalTimeout) {
    try {
      found = await probeOnce();
      if (found) break;
      // nudge: scroll a bit & click center (non-destructive) to trigger lazy loads
      await page.evaluate(() => window.scrollTo({ top: Math.min(document.body.scrollHeight, 200), behavior: 'auto' })).catch(() => null);
      await page.waitForTimeout(250);
      const vp = await page.viewportSize();
      if (vp) {
        const cx = Math.round(vp.width / 2);
        const cy = Math.round(vp.height / 2);
        await page.mouse.move(cx, cy).catch(() => null);
        await page.mouse.click(cx, cy, { delay: 10 }).catch(() => null);
      }
    } catch (e) {
      // ignore transient probing issues
    }
    await page.waitForTimeout(pollInterval);
  }

  if (!found) {
    // final attempt: wait for networkidle longer, then one last probe
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => null);
    found = await probeOnce();
  }

  if (!found) {
    // save artifacts to debug
    const shot = 'step3-4-no-grid.png';
    await page.screenshot({ path: shot, fullPage: true }).catch(() => null);
    fs.writeFileSync('step3-4-no-grid.html', await page.content(), 'utf8');
    throw new Error(`Store product grid did not become visible within ${totalTimeout}ms. See ${shot}`);
  }

  // If we found something usable, assert visibility then return
  const locator = found.locator;
  await expect(locator).toBeVisible({ timeout: 3000 });
  // Optionally print what was found
  console.log('Found store content:', found.type, found.selector, found.itemSelector || '');
});
