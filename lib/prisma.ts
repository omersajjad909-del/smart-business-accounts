import { Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prismaLogLevels: Prisma.LogLevel[] =
  process.env.DEBUG_PRISMA === "true"
    ? ["query", "error", "warn"]
    : ["error", "warn"];

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: prismaLogLevels,
  });

// Always cache the singleton (prevents new client per serverless invocation in production)
globalForPrisma.prisma = prisma;
