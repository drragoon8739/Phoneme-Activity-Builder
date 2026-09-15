import prisma from '@/lib/db';
import { listWords, createWord, resolvePhonemes, toWordEntry } from '@/lib/repository';
import { wordCreateSchema, idParam } from '@/lib/validation';
import { ok, created, fail, handleError, readJson } from '@/lib/apiResponse';

/**
 * GET /api/words
 *
 * Optional filters:
 *   ?wordListId=1   words in one list
 *   ?length=3       words of exactly N phonemes (drives the builder's selector)
 *   ?contains=ʃ     words using a given phoneme — a join, not a text search
 */
export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams;

    const wordListId = params.get('wordListId')
      ? idParam.parse(params.get('wordListId'))
      : undefined;
    const length = params.get('length')
      ? idParam.parse(params.get('length'))
      : undefined;
    const contains = params.get('contains') ?? undefined;

    const words = await listWords({ wordListId, length, contains });
    return ok({ words, count: words.length });
  } catch (error) {
    return handleError(error, 'GET /api/words');
  }
}

/**
 * POST /api/words
 *
 * Body: { english, phonemes: ["tʃ","ɪ","n"], wordListId, hint?, notes? }
 *
 * The phoneme array is resolved against the seeded inventory before anything
 * is written. Unknown symbols are reported together, with the exact symbols
 * named — "unknown phoneme" alone is useless when a teacher has pasted a
 * transcription and one character is a look-alike from another font.
 */
export async function POST(request) {
  try {
    const body = await readJson(request);
    const input = wordCreateSchema.parse(body);

    const list = await prisma.wordList.findUnique({ where: { id: input.wordListId } });
    if (!list) {
      return fail('That word list does not exist', {
        status: 404,
        code: 'NOT_FOUND',
        fields: { wordListId: 'Choose an existing word list' },
      });
    }

    const { resolved, unknown } = await resolvePhonemes(input.phonemes);
    if (unknown.length) {
      return fail(
        `Not in the phoneme inventory: ${unknown.map((s) => `/${s}/`).join(', ')}`,
        {
          status: 422,
          code: 'UNKNOWN_PHONEME',
          fields: { phonemes: `Unrecognised: ${unknown.join(', ')}` },
        },
      );
    }

    const row = await createWord({ ...input, phonemes: resolved });
    return created({ word: toWordEntry(row) });
  } catch (error) {
    return handleError(error, 'POST /api/words');
  }
}
