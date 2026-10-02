import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run against the production build (`astro build` + `astro preview`), the
 * same output that gets deployed. Set CHROMIUM_PATH to use a pre-installed browser.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4321',
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } }],
  webServer: { command: 'npm run preview -- --port 4321', url: 'http://localhost:4321', reuseExistingServer: true, timeout: 60_000 },
});
