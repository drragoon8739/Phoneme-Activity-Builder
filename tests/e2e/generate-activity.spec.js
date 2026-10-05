import { test, expect } from '@playwright/test';

/**
 * User use case: generating an activity, and viewing the file that comes out.
 *
 * The assertions deliberately go past "a download happened". A file that
 * downloads but contains the wrong puzzle is a worse failure than no file at
 * all, because nothing visible goes wrong until a class sits down with it. So
 * the test opens the generated HTML and plays it.
 */

test.describe('Activity generation', () => {
  test('generates a Wordle and the file is playable offline', async ({ page }) => {
    await page.goto('/activities');

    const card = page
      .locator('li')
      .filter({ hasText: 'Daily Wordle' })
      .first();
    await expect(card).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await card.getByRole('button', { name: 'Generate .html' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.html$/);

    const filePath = await download.path();
    expect(filePath).toBeTruthy();

    // Open it from disk, not from the server. The whole promise of the export
    // is that it works on a classroom machine with no internet, so loading it
    // over http:// would test the wrong thing.
    const activityPage = await page.context().newPage();
    const consoleErrors = [];
    activityPage.on('pageerror', (error) => consoleErrors.push(error.message));

    await activityPage.goto(`file://${filePath}`);

    await expect(activityPage.getByRole('heading', { level: 1 })).toBeVisible();

    // The answer is embedded in the file; play it rather than inspecting it.
    const answer = await activityPage.evaluate(() => window.__ACTIVITY__.answer);
    expect(Array.isArray(answer)).toBe(true);
    expect(answer.length).toBeGreaterThanOrEqual(3);

    for (const phoneme of answer) {
      await activityPage.click(`button[data-ipa="${phoneme}"]`);
    }
    await activityPage.click('#check');

    await expect(activityPage.locator('#status')).toContainText(/Solved/i);
    // The English spelling is revealed only on success — that is the teaching
    // rule the whole activity is built around.
    await expect(activityPage.locator('#reveal')).toBeVisible();

    expect(consoleErrors).toEqual([]);
    await activityPage.close();
  });

  test('generating is recorded, so the dashboard count moves', async ({ page, request }) => {
    // This is the test that proves the instrumentation is wired to reality
    // rather than merely present: generate one file, and the reported
    // successful-generation total must be exactly one higher.
    const before = await (await request.get('/api/metrics')).json();
    const countBefore = before.data.generations.successful;

    await page.goto('/activities');
    const card = page.locator('li').filter({ hasText: 'Week 1 Word Search' }).first();

    const downloadPromise = page.waitForEvent('download');
    await card.getByRole('button', { name: 'Generate .html' }).click();
    await downloadPromise;

    const after = await (await request.get('/api/metrics')).json();
    expect(after.data.generations.successful).toBe(countBefore + 1);

    // And the attempt itself must be listed, not just counted.
    const newest = after.data.generations.recent[0];
    expect(newest.status).toBe('SUCCESS');
    expect(newest.activityName).toContain('Week 1 Word Search');
  });

  test('a word search file lets a student trace a word', async ({ page }) => {
    await page.goto('/activities');

    const card = page.locator('li').filter({ hasText: 'Week 1 Word Search' }).first();
    const downloadPromise = page.waitForEvent('download');
    await card.getByRole('button', { name: 'Generate .html' }).click();
    const download = await downloadPromise;

    const puzzle = await page.context().newPage();
    await puzzle.goto(`file://${await download.path()}`);

    const word = await puzzle.evaluate(() => window.__ACTIVITY__.words[0]);
    expect(word.coords.length).toBeGreaterThan(2);

    // Drag along the word's own coordinates. If the placement data and the
    // rendered grid disagree, this is where it shows.
    const first = puzzle.locator(
      `[data-r="${word.coords[0].r}"][data-c="${word.coords[0].c}"]`,
    );
    const box = await first.boundingBox();
    await puzzle.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await puzzle.mouse.down();

    for (const coord of word.coords.slice(1)) {
      const cell = puzzle.locator(`[data-r="${coord.r}"][data-c="${coord.c}"]`);
      const cellBox = await cell.boundingBox();
      await puzzle.mouse.move(cellBox.x + cellBox.width / 2, cellBox.y + cellBox.height / 2);
    }
    await puzzle.mouse.up();

    await expect(puzzle.locator('#status')).toContainText(new RegExp(`Found ${word.english}`, 'i'));
    await expect(puzzle.locator('#progress')).toContainText('1 of');

    await puzzle.close();
  });
});
