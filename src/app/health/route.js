import { NextResponse } from 'next/server';

import prisma from '@/lib/db';

/**
 * GET /health
 *
 * Mounted at the literal path /health rather than under /api, because that is
 * the path Docker's HEALTHCHECK and most orchestrators probe by convention.
 *
 * The check runs a real query instead of returning a hard-coded 200. A
 * healthcheck that cannot fail tells you nothing: the interesting failure is
 * "the web server is up but the database is not", which is exactly what a
 * container reports as healthy if the endpoint only ever says "ok".
 *
 * 200 when the database answers, 503 when it does not.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: 'ok',
        database: 'connected',
        uptimeSeconds: Math.round(process.uptime()),
        responseMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[health] database check failed:', error);

    return NextResponse.json(
      {
        status: 'error',
        database: 'unreachable',
        responseMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
