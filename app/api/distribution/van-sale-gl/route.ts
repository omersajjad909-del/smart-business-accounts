import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

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

    const count = await prisma.voucher.count({ where: { type: "SI", companyId } });
    await prisma.voucher.create({
      data: {
        companyId,
        voucherNo: `VAN-${count + 1}`,
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
