import prisma from './db';
import { GENERATION_ERRORS } from './instrumentation';

/**
 * Everything the dashboard reports, computed from stored records.
 *
 * Statistics are derived on read rather than kept as running totals. A stored
 * counter is one failed increment away from disagreeing with the data it
 * claims to describe, and a dashboard that is confidently wrong is worse than
 * one that is slow. At this data volume the cost of recomputing is negligible.
 *
 * Three behaviours this module has to get right, because each one is a number
 * a reader would otherwise trust:
 *
 *   - An average over no rows is null, not zero. "No data yet" and "zero
 *     seconds" are different claims.
 *   - A success rate is a share of ATTEMPTS, not of successes.
 *   - "Most used" can tie. The dashboard says so rather than picking a winner
 *     by whichever row the database happened to return first.
 */

/** Default reporting window, in days. */
export const DEFAULT_WINDOW_DAYS = 14;

const ACTIVITY_TYPE_LABELS = {
  WORDLE: 'Wordle',
  WORD_SEARCH: 'Word Search',
};

export function activityTypeLabel(type) {
  return ACTIVITY_TYPE_LABELS[type] ?? type;
}

/** Local-date key, e.g. "2026-10-05". Used to bucket the trend series. */
function dateKey(date) {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/** Every day in the window, oldest first, so the chart has no gaps. */
function dayRange(days) {
  const out = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push(dateKey(d));
  }
  return out;
}

function windowStart(days) {
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Plain code-unit comparison, deliberately not localeCompare: that orders
 * punctuation by locale, so "WORDLE" and "WORD_SEARCH" could sort either way
 * depending on the server's locale. Ordering that decides what a dashboard
 * displays should not change with the machine it runs on.
 */
function byText(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/**
 * Picks the most frequent entry, and reports honestly when there isn't one.
 * Returns null for no data, and flags a tie rather than hiding it.
 */
function mostFrequent(counts) {
  const entries = Object.entries(counts).filter(([, n]) => n > 0);
  if (entries.length === 0) return null;

  entries.sort((a, b) => b[1] - a[1] || byText(a[0], b[0]));
  const [type, count] = entries[0];
  const tied = entries.length > 1 && entries[1][1] === count;

  return { type, count, tied };
}

// --- the individual reports -------------------------------------------------

async function collectionTotals() {
  const [wordLists, words, phonemes, activities, byType] = await Promise.all([
    prisma.wordList.count(),
    prisma.word.count(),
    prisma.phoneme.count(),
    prisma.activity.count(),
    prisma.activity.groupBy({ by: ['type'], _count: { _all: true } }),
  ]);

  const activitiesByType = { WORDLE: 0, WORD_SEARCH: 0 };
  for (const row of byType) {
    activitiesByType[row.type] = row._count._all;
  }

  return { wordLists, words, phonemes, activities, activitiesByType };
}

async function generationReport(days) {
  const since = windowStart(days);
  // Every figure below is scoped to the reporting window, including the
  // headline counts. Mixing an all-time total with a windowed chart on one
  // screen invites the reader to compare two numbers that are not measuring
  // the same period — and nothing on the page would tell them so.
  const inWindow = { createdAt: { gte: since } };

  const [successful, failed, byType, failureRows, durationAgg, recent] =
    await Promise.all([
      prisma.generation.count({ where: { ...inWindow, status: 'SUCCESS' } }),
      prisma.generation.count({ where: { ...inWindow, status: 'FAILED' } }),
      prisma.generation.groupBy({
        by: ['activityType'],
        where: inWindow,
        _count: { _all: true },
      }),
      prisma.generation.groupBy({
        by: ['errorCode'],
        where: { ...inWindow, status: 'FAILED' },
        _count: { _all: true },
      }),
      prisma.generation.aggregate({
        where: { ...inWindow, status: 'SUCCESS', durationMs: { not: null } },
        _avg: { durationMs: true },
      }),
      prisma.generation.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          activityId: true,
          activityName: true,
          activityType: true,
          status: true,
          filename: true,
          wordCount: true,
          selectedWord: true,
          errorCode: true,
          errorMessage: true,
          durationMs: true,
          createdAt: true,
        },
      }),
    ]);

  const generationsByType = { WORDLE: 0, WORD_SEARCH: 0 };
  for (const row of byType) {
    generationsByType[row.activityType] = row._count._all;
  }

  const attempts = successful + failed;

  const failuresByReason = failureRows
    .map((row) => ({
      code: row.errorCode ?? 'UNEXPECTED',
      label: GENERATION_ERRORS[row.errorCode] ?? 'Unknown reason',
      count: row._count._all,
    }))
    .sort((a, b) => b.count - a.count);

  // Counted by use, not by how many of each type exist: a single Word Search
  // generated forty times is the most-used type even if there are ten Wordles.
  const mostUsedType = mostFrequent(generationsByType);

  // Trend is bucketed in JavaScript rather than grouped in SQL, because SQLite
  // would need a raw date() expression and this window is at most a few
  // hundred rows. Fetching two columns and counting them is simpler to read
  // and behaves the same on any database.
  const windowRows = await prisma.generation.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true, status: true },
  });

  const buckets = new Map(dayRange(days).map((day) => [day, { successful: 0, failed: 0 }]));
  for (const row of windowRows) {
    const bucket = buckets.get(dateKey(row.createdAt));
    if (!bucket) continue; // outside the window after rounding; ignore
    if (row.status === 'SUCCESS') bucket.successful += 1;
    else bucket.failed += 1;
  }

  const trend = [...buckets.entries()].map(([date, counts]) => ({ date, ...counts }));

  return {
    attempts,
    successful,
    failed,
    // Null rather than 0 or 100 when nothing has been attempted: there is no
    // rate to report, and either number would be a claim the data cannot make.
    successRate: attempts === 0 ? null : Math.round((successful / attempts) * 1000) / 10,
    generationsByType,
    mostUsedType,
    avgDurationMs: durationAgg._avg.durationMs,
    failuresByReason,
    recent,
    trend,
  };
}

async function engagementReport(days) {
  const since = windowStart(days);
  const inWindow = { createdAt: { gte: since } };

  const [overall, byPath, sessions] = await Promise.all([
    prisma.pageView.aggregate({
      where: inWindow,
      _avg: { durationMs: true },
      _count: { _all: true },
    }),
    prisma.pageView.groupBy({
      by: ['path'],
      where: inWindow,
      _avg: { durationMs: true },
      _count: { _all: true },
    }),
    prisma.pageView.findMany({
      where: inWindow,
      select: { sessionId: true },
      distinct: ['sessionId'],
    }),
  ]);

  return {
    totalViews: overall._count._all,
    // Null when nothing has been recorded. The dashboard renders that as
    // "no data yet" rather than "0 seconds".
    avgTimeOnPageMs: overall._avg.durationMs,
    uniqueSessions: sessions.length,
    byPath: byPath
      .map((row) => ({
        path: row.path,
        views: row._count._all,
        avgMs: row._avg.durationMs,
      }))
      .sort((a, b) => b.views - a.views || byText(a.path, b.path)),
  };
}

/**
 * Conditions worth a teacher's attention, derived from current state rather
 * than from a log of past events — so an alert clears itself as soon as the
 * underlying problem is fixed, instead of lingering until someone dismisses it.
 */
async function buildAlerts() {
  const alerts = [];

  const [emptyLists, orphanedTargets, recentFailures, activityCount, recentRejections] =
    await Promise.all([
      prisma.wordList.findMany({
        where: { words: { none: {} } },
        select: { id: true, name: true, _count: { select: { activities: true } } },
      }),
      prisma.activity.findMany({
        where: { type: 'WORDLE', wordSelection: 'FIXED', targetWordId: null },
        select: { id: true, name: true },
      }),
      prisma.generation.findMany({
        where: {
          status: 'FAILED',
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        select: { activityName: true, errorCode: true, errorMessage: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.activity.count(),
      prisma.systemEvent.count({
        where: {
          level: { in: ['warning', 'error'] },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

  for (const list of emptyLists) {
    alerts.push({
      level: 'warning',
      code: 'EMPTY_WORD_LIST',
      title: `"${list.name}" has no words`,
      detail:
        list._count.activities > 0
          ? `${list._count.activities} activity/activities point at this list, and generation will fail until it has words.`
          : 'Add words before building an activity on it.',
      href: '/manage',
      action: 'Open word lists',
    });
  }

  for (const activity of orphanedTargets) {
    alerts.push({
      level: 'error',
      code: 'MISSING_TARGET',
      title: `"${activity.name}" has no target word`,
      detail:
        'It is set to always use the same word, but that word has been deleted. Pick a new one or switch it to random selection.',
      href: '/activities',
      action: 'Open activities',
    });
  }

  if (recentFailures.length) {
    const reasons = [...new Set(recentFailures.map((f) => f.errorCode))];
    alerts.push({
      level: 'error',
      code: 'RECENT_FAILURES',
      title: `${recentFailures.length} generation${
        recentFailures.length === 1 ? '' : 's'
      } failed in the last 24 hours`,
      detail: reasons
        .map((code) => GENERATION_ERRORS[code] ?? code)
        .join('; '),
      href: '/dashboard#generations',
      action: 'See the attempts',
    });
  }

  if (recentRejections > 0) {
    alerts.push({
      level: 'warning',
      code: 'INPUT_REJECTED',
      title: `${recentRejections} request${
        recentRejections === 1 ? ' was' : 's were'
      } rejected in the last 24 hours`,
      detail:
        'Input that failed validation, such as a duplicate word or an incomplete form. The entries below say which.',
      href: '/dashboard#events',
      action: 'See the log',
    });
  }

  if (activityCount === 0) {
    alerts.push({
      level: 'info',
      code: 'NO_ACTIVITIES',
      title: 'No activities saved yet',
      detail: 'Save a Wordle or Word Search configuration to start generating files.',
      href: '/activities',
      action: 'Create one',
    });
  }

  const rank = { error: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => rank[a.level] - rank[b.level]);
}

async function recentEvents() {
  const rows = await prisma.systemEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return rows.map((row) => ({
    ...row,
    // Stored as text because SQLite has no JSON column; parsed here so the UI
    // receives an object. A malformed value is dropped rather than thrown.
    context: safeParse(row.context),
  }));
}

function safeParse(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/** Word lists with enough detail for the dashboard's reporting view. */
async function wordListReport() {
  const rows = await prisma.wordList.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      description: true,
      updatedAt: true,
      _count: { select: { words: true, activities: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    updatedAt: row.updatedAt,
    wordCount: row._count.words,
    activityCount: row._count.activities,
  }));
}

/**
 * The whole dashboard payload in one call.
 *
 * Gathered concurrently: the reports are independent, so running them in
 * sequence would make the page wait for the sum of their times rather than the
 * longest of them.
 */
export async function getDashboardMetrics({ days = DEFAULT_WINDOW_DAYS } = {}) {
  const startedAt = Date.now();

  const [totals, generations, engagement, alerts, events, wordLists] = await Promise.all([
    collectionTotals(),
    generationReport(days),
    engagementReport(days),
    buildAlerts(),
    recentEvents(),
    wordListReport(),
  ]);

  return {
    windowDays: days,
    generatedAt: new Date().toISOString(),
    computedInMs: Date.now() - startedAt,
    totals,
    generations,
    engagement,
    alerts,
    events,
    wordLists,
  };
}
