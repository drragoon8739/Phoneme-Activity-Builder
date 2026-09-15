import { listPhonemes } from '@/lib/repository';
import { ok, handleError } from '@/lib/apiResponse';

/**
 * GET /api/phonemes
 *
 * The seeded inventory. Read-only: the phoneme set of a language is reference
 * data, not teacher content, so there is deliberately no POST or DELETE here.
 * Allowing a teacher to delete /tʃ/ would silently invalidate every word using
 * it, which is why the schema also guards it with onDelete: Restrict.
 */
export async function GET() {
  try {
    const phonemes = await listPhonemes();
    return ok({ phonemes, count: phonemes.length });
  } catch (error) {
    return handleError(error, 'GET /api/phonemes');
  }
}
