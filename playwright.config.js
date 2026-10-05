import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration.
 *
 * The tests drive the real application against the real database — there are
 * no mocks. That is the point of an end-to-end test: a mocked API would pass
 * happily while the actual Prisma query was wrong, which is the exact class of
 * bug these are here to catch.
 *
 * Because they write to the database, every test creates its own records with
 * a unique name and removes them afterwards, so a run leaves the database as
 * it found it and two runs never collide.
 */
export default defineConfig({
  testDir: './tests/e2e',
  // Long enough for a cold Next.js dev compile on first navigation, which can
  // take several seconds and would otherwise look like a flaky failure.
  timeout: 45_000,
  expect: { timeout: 10_000 },

  // Serial by default: the suite shares one SQLite database, and parallel
  // writers would make failures depend on timing rather than on correctness.
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,

  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  // Starts the app if it is not already running, so `npx playwright test` is a
  // single command. An already-running dev server is reused rather than fought
  // over.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/health',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
