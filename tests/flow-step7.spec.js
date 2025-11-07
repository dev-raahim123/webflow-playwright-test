const { test, expect } = require('@playwright/test');
const fs = require('fs');

test.setTimeout(60000);

const STORE_URL = 'https://ruqayas-bookshelf.webflow.io/store';

test('Step 7: Locate Add to Cart button inside Shopify iframe', async ({ page }) => {
  console.log('🛒 Step 7: Checking Add to Cart button visibility...');

  // 1️⃣ Go directly to the store page
  await page.goto(STORE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000); // allow page to fully load

  // 2️⃣ Wait for the Shopify iframe element to appear in the DOM
  const iframeElement = page.locator('iframe[name^="frame-product"]');
  await expect(iframeElement.first()).toBeVisible({ timeout: 20000 });
  console.log('✅ Shopify iframe found and visible.');

  // 3️⃣ Access the iframe and check the Add to Cart button
  const iframe = page.frameLocator('iframe[name^="frame-product"]');
  const addToCartButton = iframe.locator('button.shopify-buy__btn').first();
  await expect(addToCartButton).toBeVisible({ timeout: 20000 });
  console.log('✅ Add to Cart button is visible inside the Shopify iframe.');

  // 4️⃣ Take a screenshot for confirmation
  await page.screenshot({ path: 'step7-add-to-cart-visible.png', fullPage: true });
  console.log('📸 Screenshot saved: step7-add-to-cart-visible.png');
});
