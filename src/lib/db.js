import { PrismaClient } from '@prisma/client';

/**
 * A single PrismaClient for the whole process.
 *
 * Next.js reloads modules on every edit in development. Constructing a new
 * PrismaClient per reload leaks a connection pool each time and eventually
 * exhausts the database's connection limit, so the instance is cached on
 * globalThis, which survives reloads. In production the module is evaluated
 * once, so the cache is skipped.
 */
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
