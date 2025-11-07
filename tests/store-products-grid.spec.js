// tests/store-products-grid.spec.js
const { test, expect } = require('@playwright/test');

const STORE_URL = 'https://ruqayas-bookshelf.webflow.io/store';
const GRID = '[data-testid="store-products-grid"]';
const CARD = `${GRID} .w-dyn-item`;
const TITLE_SELECTOR_IN_CARD = 'h1, h2, h3, .product-title, .card-title, .title';

// Helper for safe count
async function safeCount(locator) {
  try { return await locator.count(); } catch { return 0; }
}

test.describe.only('Store products grid - 6 core checks', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(STORE_URL);
    await page.waitForSelector(GRID, { state: 'visible', timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
  });

  // 1. Grid visible
  test('1 - products grid is visible', async ({ page }) => {
    await expect(page.locator(GRID)).toBeVisible();
  });

  // 2. At least one product
  test('2 - grid contains at least one product card', async ({ page }) => {
    const n = await safeCount(page.locator(CARD));
    console.log('Product card count:', n);
    expect(n).toBeGreaterThan(0);
  });

  // 3. Product titles visible
  test('3 - product cards have visible, non-empty titles', async ({ page }) => {
    const cards = page.locator(CARD);
    const count = await safeCount(cards);
    expect(count).toBeGreaterThan(0);

    const sample = Math.min(count, 5);
    for (let i = 0; i < sample; i++) {
      const title = cards.nth(i).locator(TITLE_SELECTOR_IN_CARD).first();
      await expect(title).toBeVisible();
      const txt = (await title.innerText()).trim();
      expect(txt.length).toBeGreaterThan(0);
      console.log(`card[${i}] title: "${txt}"`);
    }
  });

  // 4. Product images load properly
  test('4 - product images are visible and loaded', async ({ page }) => {
    const imgs = page.locator(`${CARD} img`);
    const count = await safeCount(imgs);
    expect(count).toBeGreaterThan(0);

    const sample = Math.min(count, 8);
    for (let i = 0; i < sample; i++) {
      const img = imgs.nth(i);
      await expect(img).toBeVisible();
      const loaded = await img.evaluate(el => el.naturalWidth > 0);
      expect(loaded).toBeTruthy();
    }
  });

  // 5. Product links are valid
  test('5 - product cards have valid clickable links', async ({ page }) => {
    const cards = page.locator(CARD);
    const count = await safeCount(cards);
    expect(count).toBeGreaterThan(0);

    const sample = Math.min(count, 10);
    for (let i = 0; i < sample; i++) {
      const link = cards.nth(i).locator('a[href]');
      const href = await link.first().getAttribute('href');
      expect(href).toBeTruthy();
      expect(href).not.toBe('#');
    }
  });

  // 6. Product metadata (price/description)
  test('6 - product has price or short description', async ({ page }) => {
    const cards = page.locator(CARD);
    const count = await safeCount(cards);
    expect(count).toBeGreaterThan(0);

    let found = 0;
    const sample = Math.min(count, 8);
    for (let i = 0; i < sample; i++) {
      const card = cards.nth(i);
      const price = card.locator('.price, .product-price, .price-tag');
      const desc = card.locator('.short-desc, .excerpt, .product-desc');
      if ((await safeCount(price)) > 0 || (await safeCount(desc)) > 0) {
        found++;
      }
    }
    expect(found).toBeGreaterThanOrEqual(1);
  });

});
