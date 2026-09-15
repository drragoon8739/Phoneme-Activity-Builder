import {
  getActivity,
  wordsForActivity,
  recordGeneration,
  toWordEntry,
} from '@/lib/repository';
import { idParam } from '@/lib/validation';
import { fail, notFound, handleError } from '@/lib/apiResponse';
import { buildWordleHtml } from '@/lib/export/wordleTemplate';
import { buildWordSearchHtml } from '@/lib/export/wordSearchTemplate';
import { generateWordSearch, minimumGridSize } from '@/lib/wordSearch';
import { DIFFICULTY_PRESETS } from '@/lib/wordle';
import { toFilename } from '@/lib/download';

/**
 * POST /api/activities/:id/generate
 *
 * Builds the activity from stored data and streams back a single .html file.
 *
 * Generation runs on the server, not in the browser, because the word list
 * lives in the database. That also means one saved configuration set to RANDOM
 * selection produces a different file each time it is called — which is the
 * whole reason Assessment 2's word list beats Assessment 1's single fixed word.
 *
 * Each call is logged to the Generation table, so a teacher can see which word
 * a particular handout used after the fact.
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const activityId = idParam.parse(id);

    const activity = await getActivity(activityId);
    if (!activity) return notFound('Activity');

    const words = await wordsForActivity(activity);
    if (words.length === 0) {
      return fail('That activity\u2019s word list is empty, so there is nothing to generate', {
        status: 422,
        code: 'EMPTY_WORD_LIST',
      });
    }

    // A seed can be passed in to reproduce a previous layout exactly; without
    // one, each call produces a fresh puzzle.
    const body = await request.json().catch(() => ({}));
    const seed = Number.isInteger(body?.seed) ? body.seed : Date.now() % 100000;

    if (activity.type === 'WORDLE') {
      return generateWordle(activity, words, seed);
    }
    return generateWordSearchFile(activity, words, seed);
  } catch (error) {
    return handleError(error, 'POST /api/activities/:id/generate');
  }
}

/** Deterministic pick from a seed, so a given seed always yields the same word. */
function pickWord(words, seed) {
  return words[seed % words.length];
}

async function generateWordle(activity, words, seed) {
  let target;

  if (activity.wordSelection === 'FIXED') {
    if (!activity.targetWord) {
      return fail(
        'This Wordle is set to a fixed word, but its target word is missing. It may have been deleted — choose a new one or switch to random selection.',
        { status: 422, code: 'MISSING_TARGET' },
      );
    }
    target = toWordEntry(activity.targetWord);
  } else {
    target = pickWord(words, seed);
  }

  const preset = DIFFICULTY_PRESETS[activity.difficulty] ?? DIFFICULTY_PRESETS.standard;

  const html = buildWordleHtml({
    answer: target.phonemes,
    english: target.english,
    attempts: activity.attempts ?? preset.attempts,
    showHints: activity.showHints,
    title: activity.title,
    instructions:
      activity.instructions ??
      `Build the hidden ${target.phonemes.length}-phoneme word using the keyboard below.`,
    theme: activity.theme,
  });

  const filename = toFilename('phoneme wordle', activity.name, target.english);

  await recordGeneration({
    activityId: activity.id,
    filename,
    wordCount: 1,
    selectedWord: target.english,
  });

  return htmlDownload(html, filename, { selectedWord: target.english });
}

async function generateWordSearchFile(activity, words, seed) {
  const rows = activity.gridRows ?? 10;
  const cols = activity.gridCols ?? 10;

  // Take a rotating slice rather than always the first N, so repeated
  // generation from one saved activity covers the whole list over time.
  const limit = activity.maxWords ?? Math.min(words.length, 5);
  const start = seed % words.length;
  const chosen = Array.from(
    { length: Math.min(limit, words.length) },
    (_, index) => words[(start + index) % words.length],
  );

  const minimum = minimumGridSize(chosen);
  if (rows < minimum || cols < minimum) {
    return fail(
      `The longest word needs ${minimum} cells, but the grid is ${rows}\u00d7${cols}. Increase the grid size on this activity.`,
      { status: 422, code: 'GRID_TOO_SMALL' },
    );
  }

  const puzzle = generateWordSearch(chosen, {
    rows,
    cols,
    seed,
    allowDiagonals: activity.allowDiagonals,
    allowReverse: activity.allowReverse,
  });

  if (puzzle.unplaced.length) {
    return fail(
      `Could not fit ${puzzle.unplaced
        .map((entry) => entry.word)
        .join(', ')} into a ${rows}\u00d7${cols} grid. Enlarge the grid, allow diagonals, or lower the word limit.`,
      { status: 422, code: 'WORDS_UNPLACED' },
    );
  }

  const html = buildWordSearchHtml({
    grid: puzzle.grid,
    rows: puzzle.rows,
    cols: puzzle.cols,
    placements: puzzle.placements,
    title: activity.title,
    instructions:
      activity.instructions ?? 'Drag across the grid to trace each word in phonemes.',
    listMode: activity.listMode,
    theme: activity.theme,
  });

  const filename = toFilename('phoneme word search', activity.name);

  await recordGeneration({
    activityId: activity.id,
    filename,
    wordCount: puzzle.placements.length,
  });

  return htmlDownload(html, filename, {
    words: puzzle.placements.map((placement) => placement.word).join(','),
  });
}

/**
 * Returns the file as a download rather than JSON.
 *
 * The extra X- headers let the browser-side caller report which word or words
 * the file used without re-parsing the HTML it just received.
 */
function htmlDownload(html, filename, extraHeaders = {}) {
  const headers = {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-store',
    'X-Generated-Filename': filename,
  };

  if (extraHeaders.selectedWord) headers['X-Selected-Word'] = extraHeaders.selectedWord;
  if (extraHeaders.words) headers['X-Included-Words'] = extraHeaders.words;

  return new Response(html, { status: 200, headers });
}
