import { PrismaClient } from "@prisma/client";

export async function ensureOpenPeriod(
  prisma: PrismaClient,
  companyId: string,
  date: Date
) {
  const closed = await prisma.financialYear.findFirst({
    where: {
      companyId,
      isClosed: true,
      startDate: { lte: date },
      endDate: { gte: date },
    },
    select: { id: true },
  });

  if (closed) {
    throw new Error("Financial period is closed for the selected date.");
  }
}
