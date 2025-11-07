// tests/flow-step8-search-and-add.spec.js
const { test, expect } = require('@playwright/test');
const fs = require('fs');

test.setTimeout(90_000);

const HOME = 'https://ruqayas-bookshelf.webflow.io/';
const NAV_SEARCH_INPUT = '[data-testid="nav-search-input"], #nav-search, input[type="search"]';
const SUGGESTION_LIST = '[data-testid="search-suggestion-list"]';
const SUGGESTION_ITEM = '[data-testid="search-suggestion-item"], [data-testid="search-suggestion-link"], .search-suggestion a, .search-suggestion-item';
const WRAPPER_TESTID = '[data-testid="add-to-cart-btn-wrapper"]';
const INNER_BTN_SELECTOR = 'button.shopify-buy__btn, button:has-text("Add to cart"), button:has-text("Add to Cart")';

// helper to save artifacts on failure
async function saveArtifacts(page, prefix = 'flow-step8-failure', note = '') {
  const shot = `${prefix}.png`;
  await page.screenshot({ path: shot, fullPage: true }).catch(() => null);
  fs.writeFileSync(`${prefix}.html`, await page.content(), 'utf8');
  console.log('Saved artifacts:', shot, note || '');
}

// robust click helper (same approach you've used before)
async function clickAddToCartInsideWrapperOrIframe(page, wrapperSelector, opts = {}) {
  const { bboxWaitMs = 5000, pollInterval = 250 } = opts;
  const wrapper = page.locator(wrapperSelector).first();
  let iframeLocator = null;

  if ((await wrapper.count()) > 0) {
    await wrapper.scrollIntoViewIfNeeded().catch(() => null);
    await page.waitForTimeout(300);
    const iframeInWrapper = wrapper.locator('iframe').first();
    if ((await iframeInWrapper.count()) > 0) iframeLocator = iframeInWrapper;
  }

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

  // Poll for a non-null bounding box
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
    // wrapper fallback
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
    // last resort: try clicking iframe element
    try {
      await iframeHandle.click({ timeout: 2000 }).catch(() => null);
      return { method: 'iframe-handle-click' };
    } catch (e) {
      throw new Error('Iframe not visible / no bounds and wrapper fallback unavailable.');
    }
  }

  // Try to access inner button rect
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

// utility: random single letter a-z
function randomLetter() {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  return letters.charAt(Math.floor(Math.random() * letters.length));
}

test('Step 8 dynamic (no hardcoded query): type random letter -> click first suggestion -> add to cart', async ({ page }) => {
  try {
    // 1) open home
    await page.goto(HOME, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(400);

    // 2) find search input and focus
    const searchInput = page.locator(NAV_SEARCH_INPUT).first();
    if ((await searchInput.count()) === 0) {
      await saveArtifacts(page, 'flow-step8-no-search-input', 'Search input not found');
      throw new Error('Navbar search input not found');
    }
    await searchInput.scrollIntoViewIfNeeded().catch(() => null);
    await searchInput.click({ timeout: 3000 }).catch(() => null);

    // 3) type a single random letter (this triggers suggestions)
    // const letter = randomLetter();
    const letter = "not too little"
    // clear any existing value then type one char using keyboard to mimic user
    await searchInput.fill('').catch(() => null);
    await page.keyboard.type(letter, { delay: 80 });
    console.log('Typed random letter to trigger suggestions:', letter);

    // 4) wait briefly for suggestions to render
    await page.waitForTimeout(600);

    // 5) prefer suggestion list items if list exists, else global suggestion items
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

    // if nothing yet, wait a little more and retry once
    if (!itemsLocator || (await itemsLocator.count()) === 0) {
      await page.waitForTimeout(700);
      if ((await suggestionList.count()) > 0) {
        const listItems = suggestionList.locator(SUGGESTION_ITEM);
        if ((await listItems.count()) > 0) itemsLocator = listItems;
      }
    }

    if (!itemsLocator || (await itemsLocator.count()) === 0) {
      await saveArtifacts(page, 'flow-step8-no-suggestions', 'No suggestions appeared after typing a random letter');
      throw new Error('No search suggestions found after typing a random letter.');
    }

    // 6) choose the first visible suggestion (top-most)
    let chosen = null;
    const total = await itemsLocator.count();
    for (let i = 0; i < total; i++) {
      const it = itemsLocator.nth(i);
      if (await it.isVisible().catch(() => false)) {
        chosen = it;
        break;
      }
    }

    if (!chosen) {
      await saveArtifacts(page, 'flow-step8-no-visible-suggestion', 'Suggestions exist but none visible');
      throw new Error('No visible suggestion items found (first-suggestion mode).');
    }

    const suggestionText = (await chosen.innerText().catch(() => '')).trim();
    const suggestionHref = (await chosen.getAttribute('href').catch(() => null)) || null;
    console.log('Clicking FIRST visible suggestion:', { suggestionText, suggestionHref });

    // 7) click the suggestion
    await chosen.scrollIntoViewIfNeeded().catch(() => null);
    await chosen.click({ timeout: 5000 }).catch(() => null);

    // 8) wait for product page or wrapper
    const navOrUI = await Promise.race([
      page.waitForURL('**/product/**', { timeout: 12000 }).catch(() => null),
      page.waitForSelector(WRAPPER_TESTID, { state: 'visible', timeout: 12000 }).catch(() => null)
    ]);
    const url = page.url();
    const isProductUrl = /\/product(s?)\//i.test(url) || /\/products\//i.test(url);
    const hasWrapper = (await page.locator(WRAPPER_TESTID).count()) > 0;

    if (!isProductUrl && !hasWrapper && !navOrUI) {
      await saveArtifacts(page, 'flow-step8-not-product', `Clicked first suggestion but product did not open (url: ${url})`);
      throw new Error('First suggestion did not open a product page (aborting).');
    }

    // 9) small stabilize then click add-to-cart
    await page.waitForTimeout(700);
    await clickAddToCartInsideWrapperOrIframe(page, WRAPPER_TESTID).catch(async (err) => {
      await saveArtifacts(page, 'flow-step8-click-failed', err.message || err);
      throw err;
    });

    console.log('✅ Completed: first suggestion clicked and Add-to-Cart executed.');
  } catch (err) {
    console.error('Test failed:', err.message || err);
    throw err;
  }
});
