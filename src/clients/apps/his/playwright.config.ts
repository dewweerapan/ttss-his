import { defineConfig, devices } from '@playwright/test';

/**
 * TTSS HIS — Playwright E2E Configuration
 *
 * Prerequisites:
 *   1. PostgreSQL running + seeded (docker compose up postgres → migrations)
 *   2. API running on port 5150 (dotnet run TtssHis.Facing)
 *   3. Frontend running on port 3000 (npm run dev)
 *
 * Run:
 *   npm run test:e2e           — headless
 *   npm run test:e2e:headed    — with browser visible
 *   npm run test:e2e:ui        — interactive Playwright UI
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },

  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Optionally start the dev server before tests */
  // webServer: {
  //   command: 'NEXT_PUBLIC_API_BASE_URL=http://localhost:5150 npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 60_000,
  // },
});
