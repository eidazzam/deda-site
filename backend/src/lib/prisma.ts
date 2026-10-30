import { PrismaClient } from '@prisma/client';

// Single shared client. tsx watch re-imports the module on every change so
// during development we cache the instance on globalThis to avoid leaking
// connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
