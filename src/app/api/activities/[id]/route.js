import prisma from '@/lib/db';
import { getActivity } from '@/lib/repository';
import { idParam, activityUpdateSchema } from '@/lib/validation';
import { ok, notFound, handleError, readJson } from '@/lib/apiResponse';

/** GET /api/activities/:id — one configuration and its recent generations. */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const activityId = idParam.parse(id);

    const activity = await getActivity(activityId);
    if (!activity) return notFound('Activity');

    return ok({ activity });
  } catch (error) {
    return handleError(error, 'GET /api/activities/:id');
  }
}

/** PATCH /api/activities/:id — change any subset of the settings. */
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const activityId = idParam.parse(id);
    const body = await readJson(request);
    const input = activityUpdateSchema.parse(body);

    const activity = await prisma.activity.update({
      where: { id: activityId },
      data: input,
      include: { wordList: { select: { id: true, name: true } } },
    });

    return ok({ activity });
  } catch (error) {
    return handleError(error, 'PATCH /api/activities/:id');
  }
}

/**
 * DELETE /api/activities/:id
 *
 * Deletes the configuration and its generation history. The word list and its
 * words are untouched — an activity is a view over content, not the content.
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const activityId = idParam.parse(id);

    const existing = await prisma.activity.findUnique({ where: { id: activityId } });
    if (!existing) return notFound('Activity');

    await prisma.activity.delete({ where: { id: activityId } });

    return ok({ deleted: { id: activityId, name: existing.name } });
  } catch (error) {
    return handleError(error, 'DELETE /api/activities/:id');
  }
}
