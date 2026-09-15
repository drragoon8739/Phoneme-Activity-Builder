import prisma from '@/lib/db';
import { listActivities } from '@/lib/repository';
import { activityCreateSchema } from '@/lib/validation';
import { ok, created, fail, handleError, readJson } from '@/lib/apiResponse';

/** GET /api/activities — every saved configuration, most recently edited first. */
export async function GET() {
  try {
    const activities = await listActivities();
    return ok({ activities, count: activities.length });
  } catch (error) {
    return handleError(error, 'GET /api/activities');
  }
}

/**
 * POST /api/activities — save a configuration.
 *
 * Several configurations may share one word list, which is the point: a
 * supported Wordle and a challenge Wordle over the same content are two rows
 * here, not two copies of the words.
 */
export async function POST(request) {
  try {
    const body = await readJson(request);
    const input = activityCreateSchema.parse(body);

    const list = await prisma.wordList.findUnique({
      where: { id: input.wordListId },
      include: { _count: { select: { words: true } } },
    });
    if (!list) {
      return fail('That word list does not exist', {
        status: 404,
        code: 'NOT_FOUND',
        fields: { wordListId: 'Choose an existing word list' },
      });
    }
    if (list._count.words === 0) {
      return fail('That word list has no words in it yet', {
        status: 422,
        code: 'EMPTY_WORD_LIST',
        fields: { wordListId: 'Add words to this list first' },
      });
    }

    // A fixed target must actually belong to the chosen list, or generation
    // would produce a Wordle whose answer is not in its own word list.
    if (input.targetWordId) {
      const target = await prisma.word.findUnique({ where: { id: input.targetWordId } });
      if (!target || target.wordListId !== input.wordListId) {
        return fail('The target word is not in the selected word list', {
          status: 422,
          code: 'TARGET_MISMATCH',
          fields: { targetWordId: 'Pick a word from the selected list' },
        });
      }
    }

    const activity = await prisma.activity.create({
      data: input,
      include: { wordList: { select: { id: true, name: true } } },
    });

    return created({ activity });
  } catch (error) {
    return handleError(error, 'POST /api/activities');
  }
}
