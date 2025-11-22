import { PrismaClient } from '@prisma/client';
import logger from './logger';

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'stdout', level: 'info' },
      { emit: 'stdout', level: 'warn' },
      { emit: 'stdout', level: 'error' },
    ],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Connection pooling is handled by the underlying engine, 
    // but we can configure the connection limit via the URL parameters 
    // or here if using a specific driver adapter.
    // For standard usage, connection_limit in the URL is key.
  });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Log queries in development
if (process.env.NODE_ENV === 'development') {
  // @ts-ignore
  prisma.$on('query', (e) => {
    // @ts-ignore
    logger.debug(`Query: ${e.query} Duration: ${e.duration}ms`);
  });
}

export default prisma;