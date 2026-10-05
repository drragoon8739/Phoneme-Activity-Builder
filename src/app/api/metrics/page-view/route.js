import { pageViewSchema } from '@/lib/validation';
import { recordPageView } from '@/lib/instrumentation';

/**
 * POST /api/metrics/page-view
 *
 * Receives one "a viewer spent N milliseconds on this page" beacon.
 *
 * Two deliberate differences from the other write endpoints:
 *
 * 1. It always answers 204 No Content, even for a payload it rejects. The
 *    caller is `navigator.sendBeacon` during page unload, which cannot read a
 *    response or retry — so an error status would be shouting into a void,
 *    while still costing the browser a round trip it is trying to close out.
 *    Bad payloads are dropped quietly and the page is already gone.
 *
 * 2. It accepts any content type. sendBeacon sends a Blob, and the type on
 *    that Blob is not something this endpoint should depend on.
 */
export async function POST(request) {
  try {
    const text = await request.text();
    if (!text) return noContent();

    const parsed = pageViewSchema.safeParse(JSON.parse(text));
    if (!parsed.success) return noContent();

    await recordPageView(parsed.data);
  } catch {
    // Instrumentation must never surface as an error to the page being
    // instrumented. recordPageView already swallows database failures; this
    // catches a malformed body before it gets that far.
  }

  return noContent();
}

function noContent() {
  return new Response(null, { status: 204 });
}
