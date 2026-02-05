import { prisma } from "./prisma";

export async function logAction(
  action: string,
  details?: string,
  userId?: string,
  companyId?: string
) {
  if (!companyId) {
    return;
  }
  await prisma.activityLog.create({
    data: { action, details, userId, companyId },
  });
}
