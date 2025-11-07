// tests/store-filters.spec.js
const { test, expect } = require('@playwright/test');

const STORE_URL = 'https://ruqayas-bookshelf.webflow.io/store';

// Test IDs as you defined in Webflow
const CATEGORY_FILTERS = '[data-testid="category-filter-list"]';
const AUTHOR_FILTERS = '[data-testid="author-filter-list"]';
const OTHER_FILTERS = '[data-testid="other-filter-list"]';

test.describe('Store Page Filters Testing', () => {
  // Open store page before all tests
  test.beforeEach(async ({ page }) => {
    await page.goto(STORE_URL);
    await page.waitForLoadState('domcontentloaded');
    // Wait a bit extra for animations and filters to render
    await page.waitForTimeout(2000);
  });

  // 1️⃣ Check that all filter sections exist and are visible
  test('should display all filter sections (category, author, other)', async ({ page }) => {
    await expect(page.locator(CATEGORY_FILTERS)).toBeVisible();
    await expect(page.locator(AUTHOR_FILTERS)).toBeVisible();
    await expect(page.locator(OTHER_FILTERS)).toBeVisible();
  });

  // 2️⃣ Category filters exist
  test('should have at least one category filter', async ({ page }) => {
    const count = await page.locator(`${CATEGORY_FILTERS} *`).count();
    expect(count).toBeGreaterThan(0);
  });

  // 3️⃣ Author filters exist
  test('should have at least one author filter', async ({ page }) => {
    const count = await page.locator(`${AUTHOR_FILTERS} *`).count();
    expect(count).toBeGreaterThan(0);
  });

  // 4️⃣ Other filters exist
  test('should have at least one other filter', async ({ page }) => {
    const count = await page.locator(`${OTHER_FILTERS} *`).count();
    expect(count).toBeGreaterThan(0);
  });

  // 5️⃣ Clicking a category filter updates book list (checks DOM changes)
  test('should filter books when a category filter is clicked', async ({ page }) => {
    const firstFilter = page.locator(`${CATEGORY_FILTERS} a, ${CATEGORY_FILTERS} [role="button"], ${CATEGORY_FILTERS} div`).first();
    await firstFilter.scrollIntoViewIfNeeded();
    await expect(firstFilter).toBeVisible();

    // Get book section before click
    const beforeBooks = await page.locator('.w-dyn-item').count();

    // Click and wait a moment for filtering animation
    await firstFilter.click({ force: true });
    await page.waitForTimeout(2000);

    const afterBooks = await page.locator('.w-dyn-item').count();

    expect(afterBooks).not.toBe(0); // there should still be books visible
    expect(afterBooks).not.toBe(beforeBooks); // book list should change
  });

  // 6️⃣ Clicking an author filter updates book list
  test('should filter books when an author filter is clicked', async ({ page }) => {
    const firstFilter = page.locator(`${AUTHOR_FILTERS} a, ${AUTHOR_FILTERS} [role="button"], ${AUTHOR_FILTERS} div`).first();
    await firstFilter.scrollIntoViewIfNeeded();
    await expect(firstFilter).toBeVisible();

    const beforeBooks = await page.locator('.w-dyn-item').count();

    await firstFilter.click({ force: true });
    await page.waitForTimeout(2000);

    const afterBooks = await page.locator('.w-dyn-item').count();
    expect(afterBooks).not.toBe(0);
    expect(afterBooks).not.toBe(beforeBooks);
  });

  // 7️⃣ Clicking an “other filter” updates book list
  test('should filter books when an other filter is clicked', async ({ page }) => {
    const firstFilter = page.locator(`${OTHER_FILTERS} a, ${OTHER_FILTERS} [role="button"], ${OTHER_FILTERS} div`).first();
    await firstFilter.scrollIntoViewIfNeeded();
    await expect(firstFilter).toBeVisible();

    const beforeBooks = await page.locator('.w-dyn-item').count();

    await firstFilter.click({ force: true });
    await page.waitForTimeout(2000);

    const afterBooks = await page.locator('.w-dyn-item').count();
    expect(afterBooks).not.toBe(0);
    expect(afterBooks).not.toBe(beforeBooks);
  });

  // 8️⃣ Page remains stable after filters are clicked
  test('page should remain stable after filters are clicked', async ({ page }) => {
    const initialScrollY = await page.evaluate(() => window.scrollY);
    const firstCategory = page.locator(`${CATEGORY_FILTERS} a, ${CATEGORY_FILTERS} [role="button"], ${CATEGORY_FILTERS} div`).first();
    await firstCategory.click({ force: true });
    await page.waitForTimeout(1500);

    const newScrollY = await page.evaluate(() => window.scrollY);
    expect(Math.abs(newScrollY - initialScrollY)).toBeLessThan(50);
  });
});
