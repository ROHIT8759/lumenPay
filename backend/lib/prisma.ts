import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client Singleton
 * 
 * Ensures only one PrismaClient instance is created
 * to avoid connection exhaustion.
 */

declare global {
    var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma;
}

export default prisma;
