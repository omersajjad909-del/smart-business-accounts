import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { nextDocNo } from "@/lib/docNumber";

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const { amount, date, salesman } = await req.json();
    if (!amount || amount <= 0) return NextResponse.json({ skipped: true, reason: "No amount" });

    const [arAcc, salesAcc] = await Promise.all([
      prisma.account.findFirst({ where: { companyId, name: { contains: "Receivable", mode: "insensitive" } } }),
      prisma.account.findFirst({ where: { companyId, name: { contains: "Sales", mode: "insensitive" } } }),
    ]);

    if (!arAcc || !salesAcc) return NextResponse.json({ skipped: true, reason: "Accounts not configured" });

    // One past the highest issued, not a row count — see lib/docNumber.ts.
    const issued = await prisma.voucher.findMany({
      where: { type: "SI", companyId },
      select: { voucherNo: true },
    });
    await prisma.voucher.create({
      data: {
        companyId,
        voucherNo: nextDocNo(issued, "voucherNo", "VAN-"),
        type: "SI",
        date: date ? new Date(date) : new Date(),
        narration: `Van sale${salesman ? ` — ${salesman}` : ""}`,
        entries: {
          create: [
            { companyId, accountId: arAcc.id, amount: Number(amount) },
            { companyId, accountId: salesAcc.id, amount: -Number(amount) },
          ],
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("Van sale GL error (non-fatal):", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
