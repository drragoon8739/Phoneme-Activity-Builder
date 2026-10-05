import { test, expect } from '@playwright/test';

/**
 * The reporting and observability surface.
 *
 * These assert that the dashboard agrees with the API it reports on. A
 * dashboard can only be trusted if its figures can be checked against the data
 * independently, so each test reads both and compares.
 */

test.describe('Dashboard and observability', () => {
  test('health check reports the database, not just the web server', async ({ request }) => {
    const response = await request.get('/health');

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('ok');
    // The distinction that matters: a healthcheck that cannot fail is not a
    // healthcheck. This field only reads "connected" after a real query.
    expect(body.database).toBe('connected');
    expect(typeof body.uptimeSeconds).toBe('number');
  });

  test('renders every reporting panel', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { name: 'System and usage overview' })).toBeVisible();

    for (const heading of [
      'Alerts',
      'Generation activity',
      'Why generations failed',
      'Generated outputs',
      'Stored word lists',
      'Time on page',
      'Server event log',
    ]) {
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    }

    // The live health indicator must settle on a real reading rather than
    // staying on its placeholder.
    await expect(page.getByText('Healthy')).toBeVisible({ timeout: 20_000 });
  });

  test('the headline figures match the API they come from', async ({ page, request }) => {
    const metrics = await (await request.get('/api/metrics')).json();
    const { generations, totals } = metrics.data;

    await page.goto('/dashboard');

    await expect(page.getByTestId('stat-activities-saved')).toContainText(
      String(totals.activities),
    );
    await expect(page.getByTestId('stat-generated-successfully')).toContainText(
      String(generations.successful),
    );
    await expect(page.getByTestId('stat-failed-to-generate')).toContainText(
      String(generations.failed),
    );
  });

  test('the trend chart offers a table for the same numbers', async ({ page }) => {
    // Accessibility requirement, not a nicety: the chart encodes outcome in
    // colour, so the same data has to be reachable without seeing colour.
    await page.goto('/dashboard');

    await page.getByRole('button', { name: 'Show as table' }).click();

    const table = page.getByRole('table', { name: /Generation attempts over the last/i });
    await expect(table).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'Successful' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'Failed' })).toBeVisible();

    await page.getByRole('button', { name: 'Show chart' }).click();
    await expect(table).toHaveCount(0);
  });

  test('changing the reporting window is reflected in the URL', async ({ page }) => {
    await page.goto('/dashboard');

    await page.getByRole('button', { name: '7 days' }).click();
    await expect(page).toHaveURL(/days=7/);
    await expect(page.getByText('Attempts per day, last 7 days')).toBeVisible();

    // A linkable view: reloading that URL must give the same window back.
    await page.reload();
    await expect(page.getByRole('button', { name: '7 days' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('time on page is measured and stored', async ({ page, request }) => {
    const before = await (await request.get('/api/metrics')).json();
    const viewsBefore = before.data.engagement.totalViews;

    await page.goto('/dashboard');
    // Longer than the tracker's one-second floor, which exists to discard
    // React StrictMode's phantom remounts in development.
    await page.waitForTimeout(1600);
    await page.goto('/manage');
    // The beacon is sent during unload; give it a moment to land.
    await page.waitForTimeout(600);

    const after = await (await request.get('/api/metrics')).json();
    expect(after.data.engagement.totalViews).toBeGreaterThan(viewsBefore);
  });

  test('rejected input is logged where an operator can see it', async ({ request }) => {
    const before = await (await request.get('/api/metrics')).json();
    const eventsBefore = before.data.events.length;

    // Deliberately invalid: a word needs at least two phonemes.
    const response = await request.post('/api/words', {
      data: { english: 'x', phonemes: ['t'], wordListId: 1 },
    });
    expect(response.status()).toBe(422);

    const after = await (await request.get('/api/metrics')).json();
    expect(after.data.events.length).toBeGreaterThanOrEqual(eventsBefore);
    expect(after.data.events[0].code).toBe('VALIDATION_FAILED');
  });
});
