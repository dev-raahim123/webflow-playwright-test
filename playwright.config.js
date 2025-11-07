// playwright.config.js
const { devices } = require('@playwright/test');

module.exports = {
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 10_000,

    // ✅ Updated baseURL to point to your live Webflow site
    baseURL: process.env.BASE_URL || 'https://ruqayas-bookshelf.webflow.io',

    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium', ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { browserName: 'webkit', ...devices['Desktop Safari'] } },
    { name: 'firefox', use: { browserName: 'firefox' } }
  ]
};
