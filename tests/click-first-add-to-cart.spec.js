// tests/click-first-add-to-cart-button.spec.js
const { test, expect } = require('@playwright/test');
const fs = require('fs');

test.setTimeout(60_000);

const STORE_URL = 'https://ruqayas-bookshelf.webflow.io/store';
const WRAPPER_TESTID = '[data-testid="add-to-cart-btn-wrapper"]'; // wrapper you added
const INNER_BTN_SELECTOR = 'button.shopify-buy__btn, button:has-text("Add to cart"), button:has-text("Add to Cart")';
const PRODUCT_NAME = "Ayeyo's Blues"; // first-index product name you asked for
const SCREENSHOT = 'step-click-add-to-cart.png';
const HTML_DUMP = 'step-click-add-to-cart.html';

async function saveArtifacts(page, note = '') {
  await page.screenshot({ path: SCREENSHOT, fullPage: true }).catch(() => null);
  fs.writeFileSync(HTML_DUMP, await page.content(), 'utf8');
  console.log('Saved artifacts:', SCREENSHOT, HTML_DUMP, note || '');
}

test('Click bottom-middle of first product Add-to-cart button (Ayeyo\'s Blues)', async ({ page }) => {
  await page.goto(STORE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1200);

  // 1) Prefer wrapper near the product title "Ayeyo's Blues"
  let wrapperHandle = null;

  try {
    const titleLocator = page.locator(`text="${PRODUCT_NAME}"`).first();
    if (await titleLocator.count() > 0) {
      const titleHandle = await titleLocator.elementHandle();
      if (titleHandle) {
        // Search up the tree for a descendant wrapper within ancestors
        wrapperHandle = await titleHandle.evaluateHandle((el, wrapperSel) => {
          let node = el;
          while (node) {
            if (node.querySelector) {
              const found = node.querySelector(wrapperSel);
              if (found) return found;
            }
            node = node.parentElement;
          }
          return null;
        }, WRAPPER_TESTID);
      }
    }
  } catch (e) {
    console.warn('Title-based lookup failed (ignored):', e.message || e);
  }

  // 2) Fallback: first wrapper on the page
  if (!wrapperHandle || (await wrapperHandle.jsonValue()) === null) {
    const fallback = page.locator(WRAPPER_TESTID).first();
    if (await fallback.count() === 0) {
      await saveArtifacts(page, 'no wrapper elements found');
      throw new Error(`No elements found for selector ${WRAPPER_TESTID}. See artifacts.`);
    }
    wrapperHandle = await fallback.elementHandle();
  }

  if (!wrapperHandle) {
    await saveArtifacts(page, 'wrapperHandle null after fallback');
    throw new Error('Could not obtain add-to-cart wrapper handle. See artifacts.');
  }

  // Make sure wrapper is visible / scrolled into view
  try { await wrapperHandle.scrollIntoViewIfNeeded(); } catch (e) { /* ignore */ }
  await page.waitForTimeout(300);

  // 3) Get iframe element inside wrapper and its page bounding box
  const iframeHandle = await wrapperHandle.$('iframe');
  if (!iframeHandle) {
    await saveArtifacts(page, 'no iframe inside wrapper');
    throw new Error('No iframe found inside wrapper. See artifacts.');
  }

  const iframeBox = await iframeHandle.boundingBox();
  if (!iframeBox) {
    // try to scroll iframe into view and refetch bounding box
    try { await iframeHandle.scrollIntoViewIfNeeded(); } catch (e) {}
    await page.waitForTimeout(300);
    const box2 = await iframeHandle.boundingBox();
    if (!box2) {
      await saveArtifacts(page, 'iframe has no bounding box');
      throw new Error('Iframe bounding box not available (not visible or zero-sized). See artifacts.');
    }
    Object.assign(iframeBox, box2);
  }

  // 4) Access iframe content and find inner button's bounding rect
  const frame = await iframeHandle.contentFrame();
  let btnRect = null;
  if (frame) {
    // wait for button to appear inside the iframe
    const btnHandle = await frame.waitForSelector(INNER_BTN_SELECTOR, { state: 'visible', timeout: 10_000 }).catch(() => null);
    if (!btnHandle) {
      // if button not found inside frame, fallback to clicking center of iframe
      console.warn('Button not found inside iframe within timeout — will fallback to clicking iframe center.');
    } else {
      // get bounding rect relative to the iframe viewport
      btnRect = await frame.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left, top: r.top, width: r.width, height: r.height };
      }, btnHandle);
    }
  } else {
    console.warn('contentFrame() returned null — cannot access iframe DOM. Will fallback to iframe center click.');
  }

  // 5) Compute click coordinates: bottom-middle of the button if we have rect, otherwise bottom-middle of iframe
  let clickX, clickY;
  if (btnRect && btnRect.width > 0 && btnRect.height > 0) {
    const inset = Math.max(4, Math.min(8, Math.floor(btnRect.height * 0.08)));
    clickX = iframeBox.x + btnRect.left + btnRect.width / 2;
    clickY = iframeBox.y + btnRect.top + btnRect.height - inset;
    console.log('Computed bottom-mid of inner button ->', { clickX: Math.round(clickX), clickY: Math.round(clickY) });
  } else {
    // fallback: bottom-middle of iframe element
    const inset = Math.max(4, Math.min(8, Math.floor(iframeBox.height * 0.08)));
    clickX = iframeBox.x + iframeBox.width / 2;
    clickY = iframeBox.y + iframeBox.height - inset;
    console.log('Fallback: computed bottom-mid of iframe ->', { clickX: Math.round(clickX), clickY: Math.round(clickY) });
  }

  // 6) Move mouse and click (real pointer)
  await page.mouse.move(clickX, clickY);
  await page.waitForTimeout(120); // small visual pause for headed runs
  await page.mouse.click(clickX, clickY, { button: 'left', delay: 50 });
  console.log(`Clicked at page coords (${Math.round(clickX)}, ${Math.round(clickY)})`);

  // 7) wait a little for any UI changes, then save artifacts
  await page.waitForTimeout(1200);
  await saveArtifacts(page, `clicked coords: ${Math.round(clickX)},${Math.round(clickY)}`);

  // done
});
