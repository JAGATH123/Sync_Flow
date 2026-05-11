/**
 * Prisma client singleton for SyncFlow.
 *
 * Re-uses the same client across hot reloads in dev so we don't exhaust
 * the connection pool. Identical pattern to TimeWise's lib/database/prisma.ts.
 */
import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

export default prisma;
