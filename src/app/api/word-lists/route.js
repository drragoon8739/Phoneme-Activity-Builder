import prisma from '@/lib/db';
import { listWordLists } from '@/lib/repository';
import { wordListCreateSchema } from '@/lib/validation';
import { ok, created, handleError, readJson } from '@/lib/apiResponse';

/** GET /api/word-lists — every list, with word and activity counts. */
export async function GET() {
  try {
    const wordLists = await listWordLists();
    return ok({ wordLists, count: wordLists.length });
  } catch (error) {
    return handleError(error, 'GET /api/word-lists');
  }
}

/** POST /api/word-lists — create a list. Duplicate names return 409. */
export async function POST(request) {
  try {
    const body = await readJson(request);
    const input = wordListCreateSchema.parse(body);

    const wordList = await prisma.wordList.create({ data: input });
    return created({ wordList });
  } catch (error) {
    return handleError(error, 'POST /api/word-lists');
  }
}
