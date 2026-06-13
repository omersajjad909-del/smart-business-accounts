import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

// category → [debit account hint, credit account hint]
const ACCOUNT_HINTS: Record<string, [string, string]> = {
  customs_duty:    ["duty",      "payable"],
  landed_cost:     ["inventory", "payable"],
  freight_expense: ["freight",   "payable"],
  rebate_income:   ["cash",      "rebate"],
};

async function findAccount(companyId: string, hint: string) {
  return prisma.account.findFirst({
    where: { companyId, name: { contains: hint, mode: "insensitive" } },
    select: { id: true },
  });
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const { category, amount, date, narration } = await req.json();
    if (!category || !amount || amount <= 0) return NextResponse.json({ skipped: true, reason: "No category or amount" });

    const hints = ACCOUNT_HINTS[category];
    if (!hints) return NextResponse.json({ skipped: true, reason: "Unknown category" });

    const [debitAcc, creditAcc] = await Promise.all([
      findAccount(companyId, hints[0]),
      findAccount(companyId, hints[1]),
    ]);
    if (!debitAcc || !creditAcc) return NextResponse.json({ skipped: true, reason: "Accounts not configured" });

    const count = await prisma.voucher.count({ where: { type: "JV", companyId } });
    await prisma.voucher.create({
      data: {
        companyId,
        voucherNo: `JV-${count + 1}`,
        type: "JV",
        date: date ? new Date(date) : new Date(),
        narration: narration || category,
        entries: {
          create: [
            { companyId, accountId: debitAcc.id, amount: Number(amount) },
            { companyId, accountId: creditAcc.id, amount: -Number(amount) },
          ],
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("Trade GL post error (non-fatal):", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
