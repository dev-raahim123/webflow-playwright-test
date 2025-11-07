// tests/flow-step2.spec.js
const { test, expect } = require('@playwright/test');
const fs = require('fs');

test.setTimeout(60_000); // raise overall test timeout to 60s

test('Step 2 — find and click Add to cart (handles iframe-heavy pages)', async ({ page }) => {
  const HOME = 'https://ruqayas-bookshelf.webflow.io/';
  const BUTTON_SELECTOR = 'button.shopify-buy__btn';
  const BUTTON_TEXT_RE = /add to cart/i;

  await page.goto(HOME, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollBy(0, 800));
  await page.waitForTimeout(1000);

  // 1) Try direct DOM button first
  try {
    const direct = page.locator(BUTTON_SELECTOR, { hasText: BUTTON_TEXT_RE }).first();
    if (await direct.count() > 0 && await direct.isVisible().catch(() => false)) {
      console.log('Found direct button in main document — clicking it');
      await direct.click({ force: true });
      await page.waitForTimeout(800);
      return;
    }
  } catch (e) {
    // continue to iframe handling
  }

  // 2) Wait for at least one product iframe to appear (some pages load many)
  try {
    await page.waitForSelector('iframe[name^="frame-product-"]', { timeout: 15_000 });
  } catch (e) {
    console.warn('No product iframes matched quickly; will still inspect frames that exist.');
  }

  const frames = page.frames();
  console.log(`Found ${frames.length} frames on the page — will check each for button.`);

  // iterate frames (skip the main frame)
  for (const frame of frames) {
    // skip main frame
    if (frame === page.mainFrame()) continue;

    // optional: filter frames by name or url patterns to speed up
    const name = frame.name() || '';
    const url = frame.url() || '';
    // Only try frames that look like product/shopify frames (adjust heuristics if needed)
    const looksLikeProductFrame = name.startsWith('frame-product') || url.includes('shopify') || url.includes('buybutton');
    if (!looksLikeProductFrame) {
      // still try a few frames if none matched; keep as heuristic
      // console.log(`Skipping frame ${name} (${url})`);
    }

    try {
      // Wait a short time for the button inside this frame
      await frame.waitForSelector(BUTTON_SELECTOR, { timeout: 4500 }).catch(() => null);

      const btns = await frame.locator(BUTTON_SELECTOR).filter({ hasText: BUTTON_TEXT_RE }).elementHandles();
      if (btns && btns.length > 0) {
        // find first visible button handle
        let clicked = false;
        for (let i = 0; i < btns.length; i++) {
          const handle = btns[i];
          // verify visibility
          const visible = await handle.isVisible().catch(() => false);
          if (!visible) continue;
          // attempt a click via Playwright's frame locator API
          try {
            // get a locator handle for this element to click
            const locator = frame.locator(BUTTON_SELECTOR, { hasText: BUTTON_TEXT_RE }).nth(i);
            await locator.click({ force: true });
            console.log(`Clicked button in frame name="${name}" url="${url}" using locator.click()`);
            clicked = true;
            break;
          } catch (err) {
            // fallback: evaluate a direct click on the element
            try {
              await frame.evaluate((el) => el.click(), handle).catch(() => null);
              console.log(`Clicked button in frame name="${name}" url="${url}" using frame.evaluate(click)`);
              clicked = true;
              break;
            } catch (err2) {
              // continue to next handle
            }
          }
        }
        if (clicked) {
          await page.waitForTimeout(800);
          return;
        }
      }
    } catch (e) {
      // ignore and try next frame
      // console.log(`Frame ${name} check failed: ${e.message}`);
    }
  }

  // If we reach here, no button was successfully clicked — capture artifacts for debugging
  console.error('Failed to find/click Add to cart button after inspecting frames.');

  // Save screenshot
  try {
    const shotPath = 'step2-failure.png';
    await page.screenshot({ path: shotPath, fullPage: true }).catch(() => null);
    console.error('Saved screenshot to', shotPath);
  } catch (e) { /* ignore */ }

  // Save HTML content for debugging
  try {
    const html = await page.content();
    fs.writeFileSync('step2-failure.html', html, 'utf8');
    console.error('Saved page HTML to step2-failure.html');
  } catch (e) { /* ignore */ }

  // Also list top clickable elements text/classes to help diagnose quickly
  const clickableSnapshot = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('button, a')).slice(0, 40);
    return elements.map((el, idx) => ({
      index: idx,
      tag: el.tagName,
      text: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 120),
      cls: el.className || '',
      id: el.id || '',
    }));
  });
  console.error('Clickable elements snapshot (first 40):', JSON.stringify(clickableSnapshot, null, 2));

  throw new Error('Add to cart button not found/clicked — see saved artifacts (step2-failure.png, step2-failure.html) and console logs for debugging.');
});
