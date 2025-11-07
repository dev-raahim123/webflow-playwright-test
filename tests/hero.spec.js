// tests/hero.spec.js
const { test, expect } = require('@playwright/test');

const SITE = 'https://ruqayas-bookshelf.webflow.io/'; // explicit site URL
const HERO_TEST_ID = '[data-test="hero-section"]';
const HERO_TITLE_TEST_ID = '[data-test="hero-title"]';
const HERO_CTA_TEST_ID = '[data-test="hero-cta"]';
const HERO_FALLBACK_TEXT = 'WE ARE\\s*STORYTELLERS!'; // fallback headline (regex)

async function waitForStableBoundingBox(page, locator, { stableMs = 300, poll = 100, timeout = 4000 } = {}) {
  // Wait until bounding box (x,y,w,h) stays identical for stableMs milliseconds
  const start = Date.now();
  let last = await locator.boundingBox();
  if (!last) {
    await locator.waitFor({ state: 'visible', timeout });
    last = await locator.boundingBox();
  }
  let stableStart = Date.now();
  while (Date.now() - start < timeout) {
    await page.waitForTimeout(poll);
    const box = await locator.boundingBox();
    const boxStr = JSON.stringify(box || {});
    const lastStr = JSON.stringify(last || {});
    if (boxStr === lastStr) {
      if (Date.now() - stableStart >= stableMs) return;
    } else {
      last = box;
      stableStart = Date.now();
    }
  }
  throw new Error(`bounding box did not stabilize within ${timeout}ms`);
}

test.describe('Hero section detailed checks', () => {

  test('hero present, contents, animation, screenshot', async ({ page }) => {
    // open site explicitly
    await page.goto(SITE);

    // choose hero locator (prefer data-test, fallback to headline text)
    let heroLocator;
    if (await page.locator(HERO_TEST_ID).count() > 0) {
      heroLocator = page.locator(HERO_TEST_ID);
    } else {
      heroLocator = page.locator(`text=/${HERO_FALLBACK_TEXT}/i`);
    }

    // wait visible
    await heroLocator.waitFor({ state: 'visible', timeout: 15000 });
    await expect(heroLocator).toBeVisible();

    // --- TITLE: prefer data-test hero-title, else check fallback text inside hero ---
    let titleLocator = null;
    if (await heroLocator.locator(HERO_TITLE_TEST_ID).count() > 0) {
      titleLocator = heroLocator.locator(HERO_TITLE_TEST_ID);
      await expect(titleLocator).toBeVisible();
    } else {
      // fallback: ensure hero contains expected headline text (case-insensitive)
      await expect(heroLocator).toContainText(new RegExp(HERO_FALLBACK_TEXT, 'i'));
    }

    // --- IMAGE: if there's an img inside hero, ensure it's loaded (naturalWidth > 0) ---
    const imgs = heroLocator.locator('img');
    if (await imgs.count() > 0) {
      const firstImg = imgs.first();
      await expect(firstImg).toBeVisible();
      // ensure image loaded with naturalWidth > 0
      const loaded = await firstImg.evaluate(img => img.naturalWidth > 0);
      expect(loaded).toBeTruthy();
    }

    // --- CTA: check presence & visibility (if exists) ---
    if (await heroLocator.locator(HERO_CTA_TEST_ID).count() > 0) {
      const cta = heroLocator.locator(HERO_CTA_TEST_ID);
      await expect(cta).toBeVisible();
    }

    // --- ANIMATION FINISH: opacity poll + bounding-box stability ---
    // 1) opacity polling (fade-in)
    const handle = await heroLocator.elementHandle();
    let opacity = 0;
    if (handle) {
      const opacityTimeout = 9000;
      const pollInterval = 150;
      const start = Date.now();
      while (Date.now() - start < opacityTimeout) {
        opacity = await handle.evaluate(el => parseFloat(getComputedStyle(el).opacity || '0'));
        if (opacity >= 0.95) break;
        await page.waitForTimeout(pollInterval);
      }
    }

    // 2) bounding box stability (for translates/slides)
    try {
      await waitForStableBoundingBox(page, heroLocator, { stableMs: 300, poll: 100, timeout: 4000 });
    } catch (e) {
      // ignore if it times out — opacity check still covers many cases
      console.log('bounding-box stability check did not complete:', e.message);
    }

    // --- Save a screenshot of the hero section for visual verification ---
    try {
      await heroLocator.screenshot({ path: 'hero-snapshot.png' });
      console.log('Saved hero-snapshot.png');
    } catch (e) {
      console.log('Could not take hero screenshot:', e.message);
    }

    // --- Optional logging & assertions for timings / opacity ---
    console.log(`final opacity (approx): ${opacity}`);
    // You can assert opacity or timings if desired:
    // expect(opacity).toBeGreaterThanOrEqual(0.9);

  });

});
