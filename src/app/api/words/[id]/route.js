import {
  getWord,
  updateWord,
  deleteWord,
  resolvePhonemes,
  toWordEntry,
} from '@/lib/repository';
import { idParam, wordUpdateSchema } from '@/lib/validation';
import { ok, fail, notFound, handleError, readJson } from '@/lib/apiResponse';

/** GET /api/words/:id */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const wordId = idParam.parse(id);

    const word = await getWord(wordId);
    if (!word) return notFound('Word');

    return ok({ word });
  } catch (error) {
    return handleError(error, 'GET /api/words/:id');
  }
}

/**
 * PATCH /api/words/:id
 *
 * Any subset of { english, phonemes, hint, notes }. Omitting `phonemes` leaves
 * the sequence untouched, so renaming a word does not require re-sending its
 * transcription.
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const wordId = idParam.parse(id);
    const body = await readJson(request);
    const input = wordUpdateSchema.parse(body);

    const existing = await getWord(wordId);
    if (!existing) return notFound('Word');

    let resolvedPhonemes;
    if (input.phonemes) {
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
      resolvedPhonemes = resolved;
    }

    const row = await updateWord(wordId, { ...input, phonemes: resolvedPhonemes });
    return ok({ word: toWordEntry(row) });
  } catch (error) {
    return handleError(error, 'PATCH /api/words/:id');
  }
}

/**
 * DELETE /api/words/:id
 *
 * The word's phoneme rows go with it (cascade). Any activity using it as a
 * fixed Wordle target has that reference set to null rather than being deleted,
 * so a teacher loses one word, not a whole configuration.
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const wordId = idParam.parse(id);

    const existing = await getWord(wordId);
    if (!existing) return notFound('Word');

    await deleteWord(wordId);

    return ok({ deleted: { id: wordId, english: existing.english } });
  } catch (error) {
    return handleError(error, 'DELETE /api/words/:id');
  }
}
