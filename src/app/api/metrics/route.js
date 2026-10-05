import { getDashboardMetrics, DEFAULT_WINDOW_DAYS } from '@/lib/metrics';
import { ok, handleError } from '@/lib/apiResponse';

/**
 * GET /api/metrics
 *
 * The whole dashboard payload as JSON. The dashboard page renders on the
 * server and does not need this, but exposing the same figures over the API
 * means they can be checked independently of the page that displays them —
 * which is what makes a dashboard number verifiable rather than merely
 * plausible, and is also what the load tests hit.
 *
 * ?days=N narrows the reporting window (1–90, default 14).
 */
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const raw = new URL(request.url).searchParams.get('days');
    const parsed = Number(raw);
    const days =
      Number.isInteger(parsed) && parsed >= 1 && parsed <= 90
        ? parsed
        : DEFAULT_WINDOW_DAYS;

    const metrics = await getDashboardMetrics({ days });
    return ok(metrics);
  } catch (error) {
    return handleError(error, 'GET /api/metrics');
  }
}
