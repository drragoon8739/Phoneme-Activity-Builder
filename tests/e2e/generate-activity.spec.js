import { pathToFileURL } from 'node:url';

import { test, expect } from '@playwright/test';

/**
 * Saves a download to a path ending in .html and returns a file:// URL for it.
 *
 * Two things have to be right, and both are easy to get wrong:
 *
 * `download.path()` points at Playwright's temp storage, where the file has no
 * extension. Over file://, Chromium decides the MIME type from the extension
 * alone — so an extensionless file is served as plain text, the markup never
 * becomes a DOM, and the page's script never runs. Saving it with .html fixes
 * that.
 *
 * And the URL is built with pathToFileURL rather than `file://` + path, because
 * a Windows path starts with a drive letter and `file://C:\...` parses C: as
 * the hostname. Only on POSIX does concatenation happen to produce valid URL.
 */
async function openableUrl(download, testInfo, name) {
  const target = testInfo.outputPath(name);
  await download.saveAs(target);
  return pathToFileURL(target).href;
}

/**
 * User use case: generating an activity, and viewing the file that comes out.
 *
 * The assertions deliberately go past "a download happened". A file that
 * downloads but contains the wrong puzzle is a worse failure than no file at
 * all, because nothing visible goes wrong until a class sits down with it. So
 * the test opens the generated HTML and plays it.
 */

test.describe('Activity generation', () => {
  test('generates a Wordle and the file is playable offline', async ({ page }, testInfo) => {
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

    const fileUrl = await openableUrl(download, testInfo, 'wordle.html');

    // Open it from disk, not from the server. The whole promise of the export
    // is that it works on a classroom machine with no internet, so loading it
    // over http:// would test the wrong thing.
    const activityPage = await page.context().newPage();
    const consoleErrors = [];
    activityPage.on('pageerror', (error) => consoleErrors.push(error.message));

    await activityPage.goto(fileUrl);

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

  test('a word search file lets a student trace a word', async ({ page }, testInfo) => {
    await page.goto('/activities');

    const card = page.locator('li').filter({ hasText: 'Week 1 Word Search' }).first();
    const downloadPromise = page.waitForEvent('download');
    await card.getByRole('button', { name: 'Generate .html' }).click();
    const download = await downloadPromise;

    const puzzle = await page.context().newPage();
    await puzzle.goto(await openableUrl(download, testInfo, 'word-search.html'));

    const word = await puzzle.evaluate(() => window.__ACTIVITY__.words[0]);
    expect(word.coords.length).toBeGreaterThan(2);

    // Drag along the word's own coordinates. If the placement data and the
    // rendered grid disagree, this is where it shows.
    //
    // Each step hovers the cell rather than computing a point from
    // boundingBox() and calling mouse.move(). boundingBox() reports viewport
    // coordinates and mouse.move() consumes them, so a cell below the fold is
    // measured at a y the mouse cannot reach and the drag lands on nothing.
    // Where the generator places a word varies from run to run, so that kind
    // of failure appears and disappears with the seed. hover() scrolls the
    // cell into view and re-measures it, which removes the whole problem.
    const cellAt = (coord) =>
      puzzle.locator(`[data-r="${coord.r}"][data-c="${coord.c}"]`);

    const first = cellAt(word.coords[0]);
    await first.scrollIntoViewIfNeeded();
    await first.hover();
    await puzzle.mouse.down();

    for (const coord of word.coords.slice(1)) {
      // force: true skips the actionability checks — the pointer is already
      // held down mid-drag, which is exactly the state those checks reject.
      await cellAt(coord).hover({ force: true });
    }
    await puzzle.mouse.up();

    await expect(puzzle.locator('#status')).toContainText(new RegExp(`Found ${word.english}`, 'i'));
    await expect(puzzle.locator('#progress')).toContainText('1 of');

    await puzzle.close();
  });
});
