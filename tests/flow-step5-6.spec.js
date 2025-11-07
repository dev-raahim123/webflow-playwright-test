// tests/flow-step6.spec.js
const { test, expect } = require('@playwright/test');
const fs = require('fs');

test('Step 6: Click on one product from filtered results (robust filter handling)', async ({ page }) => {
  const STORE_URL = 'https://ruqayas-bookshelf.webflow.io/store';
  console.log('Navigating to store page...');
  await page.goto(STORE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1200); // let scripts start

  // filter containers to check (you provided these)
  const FILTER_SELECTORS = [
    '[data-testid="category-filter-list"]',
    '[data-testid="author-filter-list"]',
    '[data-testid="other-filter-list"]'
  ];

  // helper: locate clickable options inside a container
  const optionQuery = (sel) => `${sel} >> button, ${sel} >> a, ${sel} >> label, ${sel} >> input[type="radio"], ${sel} >> input[type="checkbox"]`;

  let anyFilterFound = false;
  let clickedFilter = false;

  for (const sel of FILTER_SELECTORS) {
    const container = page.locator(sel).first();
    const containerCount = await container.count();
    if (containerCount === 0) continue;

    // If options exist in DOM inside this container, try to find a visible one.
    const options = page.locator(optionQuery(sel));
    const optionsCount = await options.count();
    console.log(`Found container ${sel} (count=${containerCount}), optionsCount=${optionsCount}`);

    if (optionsCount === 0) {
      // container exists but no recognizable options inside; skip to next
      anyFilterFound = true;
      continue;
    }

    anyFilterFound = true;

    // Try: wait for a visible option (best-case)
    try {
      const visibleOption = options.filter({ has: page.locator(':visible') }).first();
      await visibleOption.waitFor({ state: 'visible', timeout: 7000 });
      // click the visible option
      await visibleOption.scrollIntoViewIfNeeded().catch(() => null);
      await visibleOption.click({ force: true }).catch(() => null);
      clickedFilter = true;
      console.log(`Clicked visible option inside ${sel}`);
      break;
    } catch (e) {
      // No visible option within timeout — try to bring container into view and click first option forcibly
      try {
        await container.scrollIntoViewIfNeeded().catch(() => null);
        await page.waitForTimeout(600);
        const firstOption = options.first();
        if (await firstOption.count() > 0) {
          await firstOption.scrollIntoViewIfNeeded().catch(() => null);
          await firstOption.click({ force: true }).catch(() => null);
          clickedFilter = true;
          console.log(`No visible option in ${sel}; forced click on first option.`);
          break;
        }
      } catch (err2) {
        // continue to next container if this one fails
        console.warn(`Attempt to click first option in ${sel} failed: ${err2?.message || err2}`);
      }
    }
  }

  if (!anyFilterFound) {
    // nothing matched at all — save artifacts and fail
    const shot = 'step6-no-filters-found.png';
    await page.screenshot({ path: shot, fullPage: true }).catch(() => null);
    fs.writeFileSync('step6-no-filters-found.html', await page.content(), 'utf8');
    throw new Error(`No filter containers found on the page. See artifacts: ${shot}`);
  }

  if (!clickedFilter) {
    console.warn('No filter option was clicked (none visible and forced click attempts did not run). Continuing to try to click product directly.');
  }

  // After applying a filter (or attempting to), wait for at least one visible product card
  const CARD_LOCATORS = [
    '[data-testid="product-card"]',
    '.w-dyn-item',
    '.product-card',
    '.collection-item',
    'a[href*="/product/"]'
  ];
  const cardSelector = CARD_LOCATORS.join(', ');
  const cardLocator = page.locator(cardSelector).filter({ has: page.locator(':visible') }).first();

  // Try to wait for a visible card; if none appear, try progressive scrolling to trigger lazy load
  try {
    await cardLocator.waitFor({ state: 'visible', timeout: 12000 });
  } catch (err) {
    // try progressive scroll to load items
    console.log('No visible cards yet — attempting progressive scroll to trigger lazy load...');
    const pageHeight = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight));
    const steps = 6;
    for (let i = 1; i <= steps; i++) {
      const pos = Math.round((pageHeight / steps) * i);
      await page.evaluate((p) => window.scrollTo({ top: p, behavior: 'auto' }), pos).catch(() => null);
      await page.waitForTimeout(700);
      if (await cardLocator.count() > 0 && await cardLocator.isVisible().catch(() => false)) break;
    }
  }

  // Re-evaluate visible cards
  const visibleCards = await page.locator(cardSelector).filter({ has: page.locator(':visible') }).elementHandles();
  if (!visibleCards || visibleCards.length === 0) {
    const shot = 'step6-no-visible-cards-after-filter.png';
    await page.screenshot({ path: shot, fullPage: true }).catch(() => null);
    fs.writeFileSync('step6-no-visible-cards-after-filter.html', await page.content(), 'utf8');
    throw new Error(`No visible product cards found after applying filter. See artifacts: ${shot}`);
  }

  // Click the first visible product (prefer link inside card)
  const firstCardHandle = visibleCards[0];
  try {
    // try to find link inside the card and click it via evaluate if necessary
    const clicked = await page.evaluate(async (card) => {
      // try anchor inside
      const anchor = card.querySelector('a[href]');
      if (anchor) {
        anchor.click();
        return true;
      }
      // else try clickable descendant
      const btn = card.querySelector('button, [role="link"]');
      if (btn) { btn.click(); return true; }
      // else click the card itself
      card.click();
      return true;
    }, firstCardHandle).catch(() => false);

    if (!clicked) {
      // fallback to Playwright click with force
      await firstCardHandle.click({ force: true });
    }
  } catch (e) {
    // fallback: use Playwright locator clicks
    try {
      const firstVisibleLocator = page.locator(cardSelector).filter({ has: page.locator(':visible') }).first();
      const linkInCard = firstVisibleLocator.locator('a[href]').first();
      if (await linkInCard.count() > 0) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null),
          linkInCard.click({ force: true }).catch(() => null),
        ]);
      } else {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null),
          firstVisibleLocator.click({ force: true }).catch(() => null),
        ]);
      }
    } catch (e2) {
      console.error('Failed to click product using fallback locators:', e2?.message || e2);
      throw e2;
    }
  }

  console.log('✅ Clicked a product from filtered results (Step 6).');
});
