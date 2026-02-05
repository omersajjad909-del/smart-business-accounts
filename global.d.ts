import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Any = any;
}

export {};
