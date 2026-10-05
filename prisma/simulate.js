/**
 * Simulated usage history.
 *
 * The dashboard reports on how the builder has been used over time, and a
 * freshly installed copy has no history — so every panel would read "no data
 * yet" and nothing about the reporting could be seen or assessed. This module
 * writes a plausible few weeks of activity so the dashboard is meaningful from
 * the first run.
 *
 * Two rules keep this honest:
 *
 * 1. Simulated records are written through the same tables the live
 *    application writes to, with the same shapes. Nothing here is a special
 *    case the dashboard knows about — if the aggregation is wrong, these rows
 *    will show it wrong too.
 *
 * 2. It is clearly separated and separately runnable (`npm run db:simulate`),
 *    and `npm run db:simulate -- --clear` removes it again. Nothing in the
 *    application depends on it.
 *
 * The generator is seeded, so the same history is produced every time. A demo
 * that reshuffles itself between runs is not one you can rehearse against.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DAYS = 21;
const EMPTY_LIST_NAME = 'Term 4 diphthongs';

/** Deterministic PRNG (mulberry32), so a given seed always gives this history. */
function createRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = createRandom(20260913);

const pick = (items) => items[Math.floor(random() * items.length)];
const between = (min, max) => Math.floor(min + random() * (max - min + 1));

function daysAgo(days, hour = 10, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, Math.floor(random() * 60), 0);
  return d;
}

/**
 * Pages a teacher actually moves between, with the kind of dwell time each
 * one attracts: a dashboard is read, a builder is worked in, a finished
 * activity page is passed through.
 */
const PAGES = [
  { path: '/dashboard', weight: 5, minMs: 20000, maxMs: 240000 },
  { path: '/manage', weight: 4, minMs: 45000, maxMs: 420000 },
  { path: '/activities', weight: 4, minMs: 20000, maxMs: 180000 },
  { path: '/wordle', weight: 2, minMs: 15000, maxMs: 150000 },
  { path: '/word-search', weight: 2, minMs: 15000, maxMs: 150000 },
  { path: '/', weight: 2, minMs: 5000, maxMs: 45000 },
  { path: '/about', weight: 1, minMs: 10000, maxMs: 90000 },
];

const WEIGHTED_PAGES = PAGES.flatMap((page) => Array(page.weight).fill(page));

const FAILURE_MODES = [
  {
    code: 'GRID_TOO_SMALL',
    message:
      'The longest word needs 6 cells, but the grid is 5×5. Increase the grid size on this activity.',
    type: 'WORD_SEARCH',
  },
  {
    code: 'WORDS_UNPLACED',
    message:
      'Could not fit shrimp, splash into a 8×8 grid. Enlarge the grid, allow diagonals, or lower the word limit.',
    type: 'WORD_SEARCH',
  },
  {
    code: 'EMPTY_WORD_LIST',
    message: 'That activity’s word list is empty, so there is nothing to generate',
    type: 'WORDLE',
  },
];

const REJECTIONS = [
  {
    level: 'warning',
    code: 'DUPLICATE',
    message: 'That word is already in this list',
    source: 'POST /api/words',
  },
  {
    level: 'warning',
    code: 'VALIDATION_FAILED',
    message: 'Some fields need attention',
    source: 'POST /api/activities',
    context: JSON.stringify({ fields: { gridRows: 'A word search needs a grid size' } }),
  },
  {
    level: 'warning',
    code: 'VALIDATION_FAILED',
    message: 'Some fields need attention',
    source: 'POST /api/words',
    context: JSON.stringify({ fields: { phonemes: 'A word needs at least 2 phonemes' } }),
  },
  {
    level: 'warning',
    code: 'DUPLICATE',
    message: 'That name is already taken — choose a different one',
    source: 'POST /api/word-lists',
  },
];

async function clearSimulation() {
  const [views, generations, events] = await Promise.all([
    prisma.pageView.deleteMany(),
    prisma.generation.deleteMany(),
    prisma.systemEvent.deleteMany(),
  ]);
  console.log(
    `Cleared ${views.count} page views, ${generations.count} generations, ${events.count} events.`,
  );
}

async function main() {
  const clear = process.argv.includes('--clear');
  if (clear) {
    await clearSimulation();
    return;
  }

  const existing = await prisma.generation.count();
  if (existing > 0) {
    console.log(
      `${existing} generation records already exist — leaving the history alone.\n` +
        'Run `npm run db:simulate -- --clear` first if you want to regenerate it.',
    );
    return;
  }

  const activities = await prisma.activity.findMany({
    select: { id: true, name: true, type: true },
  });

  if (activities.length === 0) {
    console.warn('No activities found. Run `npm run db:seed` first.');
    return;
  }

  // An unfilled word list: a real state a teacher gets into, and what the
  // dashboard's empty-list warning is there to catch.
  await prisma.wordList.upsert({
    where: { name: EMPTY_LIST_NAME },
    update: {},
    create: {
      name: EMPTY_LIST_NAME,
      description: 'Started but not yet filled — used to demonstrate the empty-list alert.',
    },
  });

  // --- page views ---------------------------------------------------------
  const pageViews = [];
  for (let day = DAYS - 1; day >= 0; day -= 1) {
    const date = daysAgo(day);
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    const sessions = weekend ? between(0, 2) : between(2, 6);

    for (let s = 0; s < sessions; s += 1) {
      const sessionId = `sim-${day}-${s}`;
      const hour = between(8, 17);
      const pagesInSession = between(2, 6);

      for (let v = 0; v < pagesInSession; v += 1) {
        const page = pick(WEIGHTED_PAGES);
        const startedAt = daysAgo(day, hour, between(0, 55));
        pageViews.push({
          path: page.path,
          sessionId,
          durationMs: between(page.minMs, page.maxMs),
          startedAt,
          createdAt: startedAt,
        });
      }
    }
  }
  await prisma.pageView.createMany({ data: pageViews });

  // --- generation attempts -------------------------------------------------
  const generations = [];
  for (let day = DAYS - 1; day >= 0; day -= 1) {
    const date = daysAgo(day);
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    const attempts = weekend ? between(0, 1) : between(1, 5);

    for (let a = 0; a < attempts; a += 1) {
      const activity = pick(activities);
      const createdAt = daysAgo(day, between(8, 17), between(0, 59));

      // Roughly one attempt in six fails. Failures are the exception, but
      // frequent enough that the failure panel has more than one row to show.
      const failed = random() < 0.16;

      if (failed) {
        // Picked from every mode that fits this activity type, not the first
        // one that does: `find` would make the second word-search failure mode
        // unreachable, and the breakdown would only ever show one reason.
        const candidates = FAILURE_MODES.filter((m) => m.type === activity.type);
        const mode = candidates.length ? pick(candidates) : FAILURE_MODES[0];
        generations.push({
          activityId: activity.id,
          activityName: activity.name,
          activityType: activity.type,
          status: 'FAILED',
          wordCount: 0,
          errorCode: mode.code,
          errorMessage: mode.message,
          durationMs: between(4, 25),
          createdAt,
        });
      } else {
        const isWordle = activity.type === 'WORDLE';
        generations.push({
          activityId: activity.id,
          activityName: activity.name,
          activityType: activity.type,
          status: 'SUCCESS',
          filename: isWordle
            ? `phoneme-wordle-${activity.name.toLowerCase().replace(/\W+/g, '-')}.html`
            : `phoneme-word-search-${activity.name.toLowerCase().replace(/\W+/g, '-')}.html`,
          wordCount: isWordle ? 1 : between(4, 6),
          selectedWord: isWordle
            ? pick(['scream', 'bait', 'chin', 'splash', 'frog', 'bird', 'cloud'])
            : null,
          durationMs: isWordle ? between(25, 90) : between(70, 260),
          createdAt,
        });
      }
    }
  }
  // One failure within the last few hours, guaranteed rather than left to the
  // dice. The dashboard's error-level alert only fires on a failure in the
  // last 24 hours, and a demo that depends on a random draw to show its alert
  // handling is a demo that sometimes shows nothing.
  const wordSearch = activities.find((a) => a.type === 'WORD_SEARCH') ?? activities[0];
  const recentMode =
    FAILURE_MODES.find((m) => m.type === wordSearch.type) ?? FAILURE_MODES[0];
  generations.push({
    activityId: wordSearch.id,
    activityName: wordSearch.name,
    activityType: wordSearch.type,
    status: 'FAILED',
    wordCount: 0,
    errorCode: recentMode.code,
    errorMessage: recentMode.message,
    durationMs: between(4, 25),
    createdAt: new Date(Date.now() - between(1, 5) * 60 * 60 * 1000),
  });

  await prisma.generation.createMany({ data: generations });

  // --- rejected input ------------------------------------------------------
  const events = [];
  for (let day = Math.min(DAYS, 10) - 1; day >= 0; day -= 1) {
    if (random() < 0.45) continue;
    const rejection = pick(REJECTIONS);
    events.push({ ...rejection, createdAt: daysAgo(day, between(9, 16), between(0, 59)) });
  }
  // Guarantee something in the last 24 hours, so the dashboard's recent-input
  // warning has a worked example rather than depending on the dice.
  events.push({ ...REJECTIONS[0], createdAt: daysAgo(0, new Date().getHours(), 0) });
  await prisma.systemEvent.createMany({ data: events });

  const succeeded = generations.filter((g) => g.status === 'SUCCESS').length;
  console.log('Simulated history written:', {
    days: DAYS,
    pageViews: pageViews.length,
    generations: generations.length,
    successful: succeeded,
    failed: generations.length - succeeded,
    events: events.length,
  });
}

main()
  .catch((error) => {
    console.error('Simulation failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
