import { defineConfig, devices } from '@playwright/test';

/**
 * E2E under a GitHub Pages project base path (/chronosilicon/), served by
 * `vite preview` from the production build — no dev server, no backend.
 */
const BASE_PATH = process.env.BASE_PATH ?? '/chronosilicon/';
const PORT = 4173;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}${BASE_PATH}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'desktop-firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `BASE_PATH=${BASE_PATH} npm run -w @chronosilicon/web build && npm run -w @chronosilicon/web preview -- --base ${BASE_PATH}`,
    url: `http://127.0.0.1:${PORT}${BASE_PATH}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
