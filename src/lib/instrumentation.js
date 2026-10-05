import prisma from './db';

/**
 * Server-side instrumentation.
 *
 * Two rules govern everything here:
 *
 * 1. Recording must never break the thing it is recording. Every function
 *    swallows its own errors and logs to the console instead of throwing. A
 *    teacher losing a generated worksheet because the metrics write failed
 *    would be a worse outcome than a missing row on a dashboard.
 *
 * 2. Nothing identifies a person. Page views carry a random session id
 *    generated in the browser, not a name, an account or an IP address.
 */

/** Failure reasons the generator can return, with teacher-facing wording. */
export const GENERATION_ERRORS = {
  EMPTY_WORD_LIST: 'The word list was empty',
  MISSING_TARGET: 'The fixed target word no longer exists',
  GRID_TOO_SMALL: 'The grid was too small for the longest word',
  WORDS_UNPLACED: 'Some words would not fit in the grid',
  UNEXPECTED: 'An unexpected error stopped generation',
};

/**
 * Record one generation attempt.
 *
 * `activityName` and `activityType` are copied in rather than read through the
 * relation, so the record still reads correctly after the activity is deleted
 * (the foreign key is SetNull — see the schema).
 */
export async function recordGenerationAttempt({
  activityId,
  activityName,
  activityType,
  status,
  filename = null,
  wordCount = 0,
  selectedWord = null,
  errorCode = null,
  errorMessage = null,
  durationMs = null,
}) {
  try {
    return await prisma.generation.create({
      data: {
        activityId: activityId ?? null,
        activityName,
        activityType,
        status,
        filename,
        wordCount,
        selectedWord,
        errorCode,
        errorMessage,
        durationMs,
      },
    });
  } catch (error) {
    console.error('[instrumentation] could not record generation:', error);
    return null;
  }
}

/**
 * Record something worth surfacing on the dashboard — chiefly rejected input,
 * which otherwise leaves no trace once the response has been sent.
 */
export async function recordEvent({ level, code, message, source, context }) {
  try {
    return await prisma.systemEvent.create({
      data: {
        level,
        code,
        message,
        source: source ?? null,
        // SQLite has no JSON type. The value is only ever displayed, so it is
        // stringified on the way in and parsed on the way out.
        context: context ? JSON.stringify(context).slice(0, 2000) : null,
      },
    });
  } catch (error) {
    console.error('[instrumentation] could not record event:', error);
    return null;
  }
}

/** Convenience wrappers, so call sites read as sentences. */
export const logWarning = (code, message, source, context) =>
  recordEvent({ level: 'warning', code, message, source, context });

export const logError = (code, message, source, context) =>
  recordEvent({ level: 'error', code, message, source, context });

export const logInfo = (code, message, source, context) =>
  recordEvent({ level: 'info', code, message, source, context });

/**
 * Record how long a viewer spent on a page.
 *
 * Bounds are applied here rather than trusted from the browser: the payload
 * arrives from a client that anyone can edit, and a single absurd value would
 * distort the average for every other visit. Anything over 30 minutes is
 * treated as a tab left open rather than time spent reading, and discarded.
 */
const MAX_REASONABLE_VIEW_MS = 30 * 60 * 1000;

export async function recordPageView({ path, sessionId, durationMs, startedAt }) {
  try {
    const duration = Number(durationMs);
    if (!Number.isFinite(duration) || duration < 0) return null;
    if (duration > MAX_REASONABLE_VIEW_MS) return null;

    return await prisma.pageView.create({
      data: {
        path: String(path).slice(0, 200),
        sessionId: String(sessionId).slice(0, 64),
        durationMs: Math.round(duration),
        startedAt: startedAt ? new Date(startedAt) : new Date(),
      },
    });
  } catch (error) {
    console.error('[instrumentation] could not record page view:', error);
    return null;
  }
}
