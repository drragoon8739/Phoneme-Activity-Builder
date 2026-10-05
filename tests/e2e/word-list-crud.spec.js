import { test, expect } from '@playwright/test';

/**
 * Builder use case: full CRUD over a word list and the words inside it.
 *
 * Driven through the interface a teacher actually uses rather than through the
 * API, because the thing worth proving is that the whole path works — form,
 * request, validation, database, and the re-render that shows the result. An
 * API-only test would pass even if the page never displayed what it saved.
 *
 * Each run uses a unique list name so repeated runs cannot collide, and the
 * list is deleted at the end so the database is left as it was found.
 */

const unique = () => `PW test list ${Date.now()}`;

test.describe('Word list CRUD', () => {
  let listName;

  test.beforeEach(() => {
    listName = unique();
  });

  test.afterEach(async ({ request }) => {
    // Clean up through the API even if the test failed part-way, so a failure
    // does not leave debris that makes the next run fail for a different
    // reason. force=true because the list may have words by then.
    const response = await request.get('/api/word-lists');
    const body = await response.json();
    const created = body.data?.wordLists?.find((list) => list.name === listName);
    if (created) {
      await request.delete(`/api/word-lists/${created.id}?force=true`);
    }
  });

  test('creates, reads, updates and deletes a word', async ({ page, request }) => {
    await page.goto('/manage');

    // --- CREATE a list ----------------------------------------------------
    await page.getByLabel('New list name').fill(listName);
    await page.getByRole('button', { name: 'Create word list' }).click();

    await expect(
      page.getByRole('heading', { name: listName, level: 2 }),
    ).toBeVisible();

    // --- CREATE a word, built on the phoneme keyboard ----------------------
    // Pressing keys rather than typing is the point: each press contributes
    // one phoneme, so a two-character symbol like /tʃ/ arrives as a single
    // unit and cannot be mis-split on the way to the database.
    await page.getByLabel('English spelling').fill('chimp');
    for (const phoneme of ['tʃ', 'ɪ', 'm', 'p']) {
      await page.getByRole('button', { name: new RegExp(`^/${phoneme}/`) }).click();
    }
    await page.getByRole('button', { name: 'Add word' }).click();

    await expect(page.getByRole('cell', { name: /chimp/ })).toBeVisible();

    // --- READ it back through the API -------------------------------------
    // The UI showing it is not proof it was stored; this is.
    const listsResponse = await request.get('/api/word-lists');
    const lists = await listsResponse.json();
    const list = lists.data.wordLists.find((entry) => entry.name === listName);
    expect(list).toBeTruthy();
    expect(list.wordCount).toBe(1);

    const wordsResponse = await request.get(`/api/words?wordListId=${list.id}`);
    const words = await wordsResponse.json();
    expect(words.data.words).toHaveLength(1);

    const stored = words.data.words[0];
    expect(stored.english).toBe('chimp');
    // Four phonemes, not five characters: the affricate survived storage.
    expect(stored.phonemes).toEqual(['tʃ', 'ɪ', 'm', 'p']);

    // --- UPDATE -----------------------------------------------------------
    await page.getByRole('row', { name: /chimp/ }).getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Hint for students (optional)').fill('a small ape');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText('a small ape')).toBeVisible();

    const afterUpdate = await (
      await request.get(`/api/words?wordListId=${list.id}`)
    ).json();
    expect(afterUpdate.data.words[0].hint).toBe('a small ape');

    // --- DELETE -----------------------------------------------------------
    page.once('dialog', (dialog) => dialog.accept());
    await page
      .getByRole('row', { name: /chimp/ })
      .getByRole('button', { name: 'Delete' })
      .click();

    await expect(page.getByRole('cell', { name: /chimp/ })).toHaveCount(0);

    const afterDelete = await (
      await request.get(`/api/words?wordListId=${list.id}`)
    ).json();
    expect(afterDelete.data.words).toHaveLength(0);
  });

  test('refuses a duplicate word and says why', async ({ page, request }) => {
    // Validation is only worth having if it actually fires, so this asserts
    // the rejection rather than trusting that it would happen.
    await page.goto('/manage');
    await page.getByLabel('New list name').fill(listName);
    await page.getByRole('button', { name: 'Create word list' }).click();
    await expect(page.getByRole('heading', { name: listName, level: 2 })).toBeVisible();

    const addChin = async () => {
      await page.getByLabel('English spelling').fill('chin');
      for (const phoneme of ['tʃ', 'ɪ', 'n']) {
        await page.getByRole('button', { name: new RegExp(`^/${phoneme}/`) }).click();
      }
      await page.getByRole('button', { name: 'Add word' }).click();
    };

    await addChin();
    await expect(page.getByRole('cell', { name: /chin/ })).toBeVisible();

    await addChin();
    await expect(page.getByText('That word is already in this list')).toBeVisible();

    // The rejection must not have written a second row.
    const lists = await (await request.get('/api/word-lists')).json();
    const list = lists.data.wordLists.find((entry) => entry.name === listName);
    expect(list.wordCount).toBe(1);
  });
});
