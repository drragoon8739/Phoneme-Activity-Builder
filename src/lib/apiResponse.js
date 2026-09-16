import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

import { fieldErrors } from './validation';

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
export function handleError(error, context = 'request') {
  if (error instanceof ZodError) {
    return fail('Some fields need attention', {
      status: 422,
      code: 'VALIDATION_FAILED',
      fields: fieldErrors(error),
    });
  }

  if (error instanceof SyntaxError) {
    return fail('Request body was not valid JSON', {
      status: 400,
      code: 'MALFORMED_JSON',
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return fail(duplicateMessage(error.meta?.target), {
          status: 409,
          code: 'DUPLICATE',
        });
      case 'P2003':
        return fail('That record refers to something that does not exist', {
          status: 400,
          code: 'FOREIGN_KEY',
        });
      case 'P2025':
        return fail('Record not found', { status: 404, code: 'NOT_FOUND' });
      case 'P2014':
        return fail('That change would break a required relationship', {
          status: 409,
          code: 'RELATION_VIOLATION',
        });
      default:
        break;
    }
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return fail('Could not reach the database. Has the migration been run?', {
      status: 503,
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  // Anything unrecognised is a genuine bug: log it for the developer, and give
  // the caller a generic message rather than leaking a stack trace.
  console.error(`[api] unhandled error during ${context}:`, error);
  return fail('Something went wrong on the server', {
    status: 500,
    code: 'INTERNAL_ERROR',
  });
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
