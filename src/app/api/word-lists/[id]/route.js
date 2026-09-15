import prisma from '@/lib/db';
import { getWordList } from '@/lib/repository';
import { idParam, wordListUpdateSchema } from '@/lib/validation';
import { ok, fail, notFound, handleError, readJson } from '@/lib/apiResponse';

/** GET /api/word-lists/:id — one list, with all its words and phonemes. */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const wordListId = idParam.parse(id);

    const wordList = await getWordList(wordListId);
    if (!wordList) return notFound('Word list');

    return ok({ wordList });
  } catch (error) {
    return handleError(error, 'GET /api/word-lists/:id');
  }
}

/** PATCH /api/word-lists/:id — rename or re-describe a list. */
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const wordListId = idParam.parse(id);
    const body = await readJson(request);
    const input = wordListUpdateSchema.parse(body);

    const wordList = await prisma.wordList.update({
      where: { id: wordListId },
      data: input,
    });

    return ok({ wordList });
  } catch (error) {
    return handleError(error, 'PATCH /api/word-lists/:id');
  }
}

/**
 * DELETE /api/word-lists/:id
 *
 * Deleting a list cascades to its words and to any activities built on it.
 * That is a lot to lose to a mis-click, so the destructive case is opt-in:
 * without ?force=true a non-empty list returns 409 and reports what would be
 * destroyed, letting the UI ask the teacher to confirm.
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const wordListId = idParam.parse(id);
    const force = new URL(request.url).searchParams.get('force') === 'true';

    const existing = await prisma.wordList.findUnique({
      where: { id: wordListId },
      include: { _count: { select: { words: true, activities: true } } },
    });
    if (!existing) return notFound('Word list');

    const { words, activities } = existing._count;

    if (!force && (words > 0 || activities > 0)) {
      return fail(
        `"${existing.name}" still holds ${words} word(s) and ${activities} activity/activities. Re-send with ?force=true to delete them too.`,
        { status: 409, code: 'NOT_EMPTY' },
      );
    }

    await prisma.wordList.delete({ where: { id: wordListId } });

    return ok({
      deleted: { id: wordListId, name: existing.name },
      cascaded: { words, activities },
    });
  } catch (error) {
    return handleError(error, 'DELETE /api/word-lists/:id');
  }
}
