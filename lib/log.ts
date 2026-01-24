import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function logAction(
  action: string,
  details?: string,
  userId?: string
) {
  await prisma.activityLog.create({
    data: { action, details, userId },
  });
}
