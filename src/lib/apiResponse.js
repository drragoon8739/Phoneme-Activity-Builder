import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

import { fieldErrors } from './validation';
import { recordEvent } from './instrumentation';

/**
 * One response shape for every endpoint.
 *
 * Success: { ok: true, data: ... }
 * Failure: { ok: false, error: { message, code, fields? } }
 *
 * A consistent envelope means the frontend has exactly one way to tell success
 * from failure, instead of guessing from the shape of the body or relying on
 * the status code alone.
 */

/**
 * Prisma reports a unique-constraint breach with the database column names
 * that clashed — "wordListId, english". Those are meaningless to a teacher, so
 * the known combinations are given plain wording here. Anything unmapped falls
 * back to a generic sentence rather than leaking the column names.
 */
const DUPLICATE_MESSAGES = {
  'wordListId,english': 'That word is already in this list',
  english: 'That word is already in this list',
  name: 'That name is already taken — choose a different one',
  ipa: 'That phoneme is already in the inventory',
  'wordId,position': 'That position in the word is already filled',
};

function duplicateMessage(target) {
  const key = Array.isArray(target) ? target.join(',') : String(target ?? '');
  return DUPLICATE_MESSAGES[key] ?? 'That value is already in use';
}

export function ok(data, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function created(data) {
  return ok(data, 201);
}

export function fail(message, { status = 400, code = 'BAD_REQUEST', fields } = {}) {
  return NextResponse.json(
    { ok: false, error: { message, code, ...(fields ? { fields } : {}) } },
    { status },
  );
}

export function notFound(what = 'Resource') {
  return fail(`${what} not found`, { status: 404, code: 'NOT_FOUND' });
}

/**
 * Turns whatever went wrong into a response that is useful to the caller and
 * safe to show a teacher.
 *
 * Prisma's error codes are translated deliberately: P2002 (unique violation)
 * as a raw 500 would tell a teacher "something went wrong" when the real
 * problem is that they used a name twice, which they can fix themselves.
 */
export async function handleError(error, context = 'request') {
  const classified = classify(error, context);

  // Rejections are recorded so the dashboard can report them. A 404 is left
  // out on purpose: a request for something that does not exist is ordinary
  // traffic, not a signal, and logging it would bury the entries that matter.
  if (classified.status !== 404) {
    await recordEvent({
      level: classified.status >= 500 ? 'error' : 'warning',
      code: classified.code,
      message: classified.message,
      source: context,
      context: classified.fields ? { fields: classified.fields } : undefined,
    });
  }

  return fail(classified.message, {
    status: classified.status,
    code: classified.code,
    fields: classified.fields,
  });
}

/** Maps a thrown value onto the status, code and message the caller will see. */
function classify(error, context) {
  if (error instanceof ZodError) {
    return {
      status: 422,
      code: 'VALIDATION_FAILED',
      message: 'Some fields need attention',
      fields: fieldErrors(error),
    };
  }

  if (error instanceof SyntaxError) {
    return {
      status: 400,
      code: 'MALFORMED_JSON',
      message: 'Request body was not valid JSON',
    };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return {
          status: 409,
          code: 'DUPLICATE',
          message: duplicateMessage(error.meta?.target),
        };
      case 'P2003':
        return {
          status: 400,
          code: 'FOREIGN_KEY',
          message: 'That record refers to something that does not exist',
        };
      case 'P2025':
        return { status: 404, code: 'NOT_FOUND', message: 'Record not found' };
      case 'P2014':
        return {
          status: 409,
          code: 'RELATION_VIOLATION',
          message: 'That change would break a required relationship',
        };
      default:
        break;
    }
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      status: 503,
      code: 'DATABASE_UNAVAILABLE',
      message: 'Could not reach the database. Has the migration been run?',
    };
  }

  // Anything unrecognised is a genuine bug: log it for the developer, and give
  // the caller a generic message rather than leaking a stack trace.
  console.error(`[api] unhandled error during ${context}:`, error);
  return {
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'Something went wrong on the server',
  };
}

/** Parse a JSON body, converting an empty or malformed body into a clean 400. */
export async function readJson(request) {
  const text = await request.text();
  if (!text.trim()) {
    const error = new SyntaxError('Empty body');
    throw error;
  }
  return JSON.parse(text);
}
