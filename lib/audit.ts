import { PrismaClient } from "@prisma/client";

type AuditInput = {
  companyId: string;
  userId?: string | null;
  action: string;
  details?: string | null;
};

export async function logActivity(
  prisma: PrismaClient,
  input: AuditInput
) {
  try {
    if (!input.companyId) return;
    await prisma.activityLog.create({
      data: {
        companyId: input.companyId,
        userId: input.userId || null,
        action: input.action,
        details: input.details || null,
      },
    });
  } catch (e) {
    console.error("AUDIT LOG ERROR:", e);
  }
}
