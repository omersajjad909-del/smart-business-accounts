import { prisma } from "@/lib/prisma";

/*
 * A business moving off a paper khata does not know every opening figure on
 * day one. It knows what it owes Sajjad Enterprises; it may not know what is
 * in the cash box. Refusing to save until debits equal credits left those
 * users stuck on the first screen, and the other places an opening balance
 * can be typed (account form, bank account, accounts CSV) never checked at all,
 * so the trial balance was silently off for anyone who used them.
 *
 * Every accounting package solves this the same way: the difference between
 * all opening debits and all opening credits is parked in one equity account,
 * "Opening Balance Equity". The trial balance always balances, and the
 * accountant reclassifies the figure into Capital, Cash or Stock once the real
 * numbers are known — at which point it falls back to zero on its own.
 *
 * Recomputed from the whole company each time rather than adjusted by the
 * change, so entering balances over several sittings, or editing one, never
 * leaves a stale plug behind.
 */

export const OBE_NAME = "Opening Balance Equity";
const OBE_CODES = ["3999", "OBE-3999", "OBE"];

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function syncOpeningBalanceEquity(companyId: string, openDate?: Date) {
  let obe = await prisma.account.findFirst({
    where: { companyId, deletedAt: null, name: { equals: OBE_NAME, mode: "insensitive" } },
    select: { id: true, openDebit: true, openCredit: true },
  });

  const sums = await prisma.account.aggregate({
    where: { companyId, deletedAt: null, ...(obe ? { id: { not: obe.id } } : {}) },
    _sum: { openDebit: true, openCredit: true },
  });
  const diff = round2((sums._sum.openDebit ?? 0) - (sums._sum.openCredit ?? 0));

  // Debits exceed credits → the plug is a credit (owner's capital), and the
  // other way round a debit.
  const openDebit = diff < 0 ? -diff : 0;
  const openCredit = diff > 0 ? diff : 0;

  if (!obe) {
    if (diff === 0) return { difference: 0 };
    const taken = await prisma.account.findMany({
      where: { companyId, code: { in: OBE_CODES } },
      select: { code: true },
    });
    const code = OBE_CODES.find((c) => !taken.some((t) => t.code === c)) ?? `OBE-${Date.now()}`;
    obe = await prisma.account.create({
      data: {
        companyId, code, name: OBE_NAME, type: "EQUITY", partyType: "EQUITY",
        openDebit, openCredit, openDate: openDate ?? new Date(),
      },
      select: { id: true, openDebit: true, openCredit: true },
    });
    return { difference: diff };
  }

  if (round2(obe.openDebit) !== openDebit || round2(obe.openCredit) !== openCredit) {
    await prisma.account.update({
      where: { id: obe.id },
      data: { openDebit, openCredit, ...(openDate ? { openDate } : {}) },
    });
  }
  return { difference: diff };
}
