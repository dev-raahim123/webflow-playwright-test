// tests/full-workflow-single.spec.js
const { test, expect } = require('@playwright/test');
const fs = require('fs');

test.setTimeout(240_000);

const BASE = 'https://ruqayas-bookshelf.webflow.io';
const HOME = BASE + '/';
const STORE_PATH = '/store';

const NAV_STORE_LINK = 'a.nav-link:has-text("Store"), a:has-text("Store")';
const NAV_SEARCH_INPUT = '[data-testid="nav-search-input"], #nav-search, input[type="search"]';
const SUGGESTION_LIST = '[data-testid="search-suggestion-list"]';
const SUGGESTION_ITEM = '[data-testid="search-suggestion-item"], [data-testid="search-suggestion-link"], .search-suggestion a, .search-suggestion-item';

const GRID_SELECTOR = '[data-testid="collection-list-grid"], [data-testid="store-products-grid"], .w-dyn-list, .collection-list, .collection-grid';
const CATEGORY_FILTER_LIST = '[data-testid="category-filter-list"]';
const PRODUCT_CARD_SEL = '.w-dyn-item a[href*="/product"], a[href*="/product"], a[href*="/products/"], .product-card a';

const WRAPPER_TESTID = '[data-testid="add-to-cart-btn-wrapper"]';
const INNER_BTN_SELECTOR = 'button.shopify-buy__btn, button:has-text("Add to cart"), button:has-text("Add to Cart")';

function randomLetter() {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  return letters.charAt(Math.floor(Math.random() * letters.length));
}

async function saveArtifacts(page, prefix = 'fullwf-fail', note = '') {
  const shot = `${prefix}.png`;
  await page.screenshot({ path: shot, fullPage: true }).catch(() => null);
  fs.writeFileSync(`${prefix}.html`, await page.content(), 'utf8');
  console.log('Saved artifacts:', shot, note || '');
}

/** Robust click helper: bottom-middle of button inside iframe, fallback to iframe/wrapper */
async function clickAddToCartInsideWrapperOrIframe(page, wrapperSelector, opts = {}) {
  const { bboxWaitMs = 5000, pollInterval = 250 } = opts;
  const wrapper = page.locator(wrapperSelector).first();
  let iframeLocator = null;

  // Prefer iframe inside wrapper
  if ((await wrapper.count()) > 0) {
    await wrapper.scrollIntoViewIfNeeded().catch(() => null);
    await page.waitForTimeout(300);
    const iframeInWrapper = wrapper.locator('iframe').first();
    if ((await iframeInWrapper.count()) > 0) iframeLocator = iframeInWrapper;
  }

  // Fallback: find typical iframe candidates
  if (!iframeLocator) {
    const candidates = ['iframe[name^="frame-product-"]', 'iframe[src*="shopify"]', 'iframe'];
    for (const sel of candidates) {
      const loc = page.locator(sel).first();
      if ((await loc.count()) > 0) {
        iframeLocator = loc;
        break;
      }
    }
  }

  if (!iframeLocator) throw new Error('No iframe element found on page for Add-to-Cart.');

  const iframeHandle = await iframeLocator.elementHandle();
  if (!iframeHandle) throw new Error('Unable to obtain iframe element handle.');

  // Poll for bounding box to avoid zero-size/lazy load issues
  let iframeBox = await iframeHandle.boundingBox().catch(() => null);
  if (!iframeBox) {
    const start = Date.now();
    while (Date.now() - start < bboxWaitMs) {
      await page.waitForTimeout(pollInterval);
      iframeBox = await iframeHandle.boundingBox().catch(() => null);
      if (iframeBox && iframeBox.width > 1 && iframeBox.height > 1) break;
    }
  }

  if (!iframeBox) {
    // try wrapper fallback
    const wrapperHandle = await wrapper.elementHandle().catch(() => null);
    if (wrapperHandle) {
      const wrapperBox = await wrapperHandle.boundingBox().catch(() => null);
      if (wrapperBox && wrapperBox.width > 1 && wrapperBox.height > 1) {
        const inset = Math.max(4, Math.min(8, Math.floor(wrapperBox.height * 0.08)));
        const clickX = wrapperBox.x + wrapperBox.width / 2;
        const clickY = wrapperBox.y + wrapperBox.height - inset;
        await page.mouse.move(clickX, clickY).catch(() => null);
        await page.waitForTimeout(120);
        await page.mouse.click(clickX, clickY, { delay: 50 }).catch(() => null);
        return { method: 'wrapper-fallback', x: clickX, y: clickY };
      }
    }
    // last-resort try iframe handle click
    try {
      await iframeHandle.click({ timeout: 2000 }).catch(() => null);
      return { method: 'iframe-handle-click' };
    } catch (e) {
      throw new Error('Iframe not visible / no bounds and wrapper fallback unavailable.');
    }
  }

  // Access frame and inner button rect if possible
  const frame = await iframeHandle.contentFrame().catch(() => null);
  let btnRect = null;
  if (frame) {
    const btnHandle = await frame.waitForSelector(INNER_BTN_SELECTOR, { state: 'visible', timeout: 3000 }).catch(() => null);
    if (btnHandle) {
      btnRect = await frame.evaluate(el => {
        const r = el.getBoundingClientRect();
        return { left: r.left, top: r.top, width: r.width, height: r.height };
      }, btnHandle).catch(() => null);
    }
  }

  let clickX, clickY;
  if (btnRect && btnRect.width > 0 && btnRect.height > 0) {
    const inset = Math.max(4, Math.min(8, Math.floor(btnRect.height * 0.08)));
    clickX = iframeBox.x + btnRect.left + btnRect.width / 2;
    clickY = iframeBox.y + btnRect.top + btnRect.height - inset;
  } else {
    const inset = Math.max(4, Math.min(8, Math.floor(iframeBox.height * 0.08)));
    clickX = iframeBox.x + iframeBox.width / 2;
    clickY = iframeBox.y + iframeBox.height - inset;
  }

  await page.mouse.move(clickX, clickY).catch(() => null);
  await page.waitForTimeout(120);
  await page.mouse.click(clickX, clickY, { delay: 50 }).catch((e) => {
    throw new Error('Mouse click failed at computed coords: ' + (e.message || e));
  });

  return { method: btnRect ? 'inner-button' : 'iframe-fallback', x: clickX, y: clickY };
}

async function tryClickFirstAddOnHome(page) {
  const wrapperOnHome = page.locator(WRAPPER_TESTID).first();
  if ((await wrapperOnHome.count()) > 0) {
    await wrapperOnHome.scrollIntoViewIfNeeded().catch(() => null);
    await page.waitForTimeout(300);
    try {
      const res = await clickAddToCartInsideWrapperOrIframe(page, WRAPPER_TESTID);
      console.log('Homepage add-to-cart clicked (if present):', res);
    } catch (err) {
      console.warn('Homepage add-to-cart click failed (ignored):', err.message || err);
    }
  } else {
    console.log('No add-to-cart wrapper on homepage — skipping.');
  }
}

test('Full workflow: Steps 1–10 combined (single test)', async ({ page }) => {
  try {
    // ---------------- Step 1 & 2 ----------------
    console.log('Step 1&2: Open homepage, scroll and click first add-to-cart if present');
    await page.goto(HOME, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(800);
    await tryClickFirstAddOnHome(page);
    await page.waitForTimeout(900);

    // ---------------- Step 3 & 4 ----------------
    console.log('Step 3&4: Click Store link in navbar and wait for grid');
    // attempt click and wait for navigation; if no effect, navigate directly
    await Promise.all([
      page.waitForURL(`**${STORE_PATH}**`, { timeout: 20000 }).catch(() => null),
      page.locator(NAV_STORE_LINK).first().click().catch(() => null)
    ]);
    if (!page.url().includes(STORE_PATH)) {
      await page.goto(BASE + STORE_PATH, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
    }
    await page.waitForSelector(GRID_SELECTOR, { state: 'visible', timeout: 25000 }).catch(() => null);
    const grid = page.locator(GRID_SELECTOR).first();
    if ((await grid.count()) === 0) {
      await saveArtifacts(page, 'full-no-grid', 'Store grid not found');
      throw new Error('Store product grid not found after navigation.');
    }
    console.log('Store grid present.');

    // ---------------- Step 5 & 6 ----------------
    console.log('Step 5&6: Apply category filter (first available) and open a product');
    const catList = page.locator(CATEGORY_FILTER_LIST).first();
    if ((await catList.count()) > 0) {
      const option = catList.locator('a, button, label, [role="button"], [role="link"], [role="listitem"]').first();
      if ((await option.count()) > 0) {
        await option.scrollIntoViewIfNeeded().catch(() => null);
        await option.click().catch(() => null);
        await page.waitForTimeout(800);
        console.log('Clicked a category filter option.');
      } else {
        console.log('Category list present but no clickable option found.');
      }
    } else {
      console.log('No category filter list found — skipping filter.');
    }

    // find product card
    const productCard = page.locator(PRODUCT_CARD_SEL).first();
    if ((await productCard.count()) === 0) {
      await saveArtifacts(page, 'full-no-product-card', 'No product card found after filter');
      throw new Error('No product card available to open from filtered results.');
    }
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => null),
      productCard.click({ force: true }).catch(() => null)
    ]);
    await page.waitForTimeout(700);
    console.log('Opened product from filtered results.');

    // ---------------- Step 7 ----------------
    console.log('Step 7: On product page, click add-to-cart (iframe method)');
    try {
      await clickAddToCartInsideWrapperOrIframe(page, WRAPPER_TESTID);
      console.log('Clicked add-to-cart on product page.');
    } catch (err) {
      await saveArtifacts(page, 'full-step7-click-fail', err.message || err);
      throw err;
    }
    await page.waitForTimeout(900);

    // ---------------- Step 8–10 ----------------
    console.log('Step 8-10: Use navbar search (type single random letter), pick first suggestion, open and add-to-cart');
    // focus search input
    const searchInput = page.locator(NAV_SEARCH_INPUT).first();
    if ((await searchInput.count()) === 0) {
      await saveArtifacts(page, 'full-no-search', 'Navbar search input not found');
      throw new Error('Navbar search input not found.');
    }
    await searchInput.scrollIntoViewIfNeeded().catch(() => null);
    await searchInput.click({ timeout: 3000 }).catch(() => null);
    // type random letter to trigger suggestions
    const letter = randomLetter();
    await searchInput.fill('').catch(() => null);
    await page.keyboard.type(letter, { delay: 80 });
    console.log('Typed letter for suggestions:', letter);
    await page.waitForTimeout(600);

    // collect suggestion items
    const suggestionList = page.locator(SUGGESTION_LIST).first();
    let itemsLocator = null;
    if ((await suggestionList.count()) > 0) {
      const listItems = suggestionList.locator(SUGGESTION_ITEM);
      if ((await listItems.count()) > 0) itemsLocator = listItems;
    }
    if (!itemsLocator) {
      const globalItems = page.locator(SUGGESTION_ITEM);
      if ((await globalItems.count()) > 0) itemsLocator = globalItems;
    }
    if (!itemsLocator || (await itemsLocator.count()) === 0) {
      await page.waitForTimeout(700);
      if ((await suggestionList.count()) > 0) {
        const listItems = suggestionList.locator(SUGGESTION_ITEM);
        if ((await listItems.count()) > 0) itemsLocator = listItems;
      }
    }
    if (!itemsLocator || (await itemsLocator.count()) === 0) {
      await saveArtifacts(page, 'full-no-suggestions', 'No suggestions after typing letter');
      throw new Error('No search suggestions found after typing a random letter.');
    }

    // choose first visible suggestion
    let chosen = null;
    const total = await itemsLocator.count();
    for (let i = 0; i < total; i++) {
      const it = itemsLocator.nth(i);
      if (await it.isVisible().catch(() => false)) { chosen = it; break; }
    }
    if (!chosen) {
      await saveArtifacts(page, 'full-no-visible-suggestion', 'Suggestions not visible');
      throw new Error('No visible suggestion items found.');
    }

    const suggestionText = (await chosen.innerText().catch(() => '')).trim();
    const suggestionHref = (await chosen.getAttribute('href').catch(() => null)) || null;
    console.log('Clicking first visible suggestion:', { suggestionText, suggestionHref });

    await chosen.scrollIntoViewIfNeeded().catch(() => null);
    await chosen.click({ timeout: 5000 }).catch(() => null);

    // wait for product landing or wrapper
    await Promise.race([
      page.waitForURL('**/product/**', { timeout: 12000 }).catch(() => null),
      page.waitForSelector(WRAPPER_TESTID, { state: 'visible', timeout: 12000 }).catch(() => null)
    ]);
    await page.waitForTimeout(700);

    // click add-to-cart on suggested product page
    try {
      await clickAddToCartInsideWrapperOrIframe(page, WRAPPER_TESTID);
      console.log('Clicked add-to-cart on suggested product page.');
    } catch (err) {
      await saveArtifacts(page, 'full-step8-click-fail', err.message || err);
      throw err;
    }

    console.log('✅ Full workflow completed successfully.');
  } catch (err) {
    console.error('Full workflow failed:', err.message || err);
    throw err;
  }
});
