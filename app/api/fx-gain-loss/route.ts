import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

// FX Gain/Loss stored as BusinessRecord with category "fx_gain_loss"

export async function GET(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const records = await prisma.businessRecord.findMany({
    where: { companyId, category: "fx_gain_loss", status: { not: "deleted" } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(records.map(r => {
    const d = r.data as Record<string, unknown>;
    return {
      id: r.id,
      currencyCode: (d?.currencyCode as string) || "",
      type: (d?.type as string) || "unrealized",
      fcyAmount: (d?.fcyAmount as number) ?? 0,
      originalRate: (d?.originalRate as number) ?? 0,
      currentRate: (d?.currentRate as number) ?? 0,
      gainLoss: (d?.gainLoss as number) ?? 0,
      description: (d?.description as string) || "",
      date: (d?.date as string) || r.createdAt.toISOString().slice(0, 10),
    };
  }));
}

export async function POST(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const body = await req.json();
  const { currencyCode, type, fcyAmount, originalRate, currentRate, gainLoss, description, date } = body;

  if (!currencyCode || fcyAmount == null || originalRate == null || currentRate == null) {
    return NextResponse.json({ error: "currencyCode, fcyAmount, originalRate, currentRate required" }, { status: 400 });
  }

  const gl = Number(gainLoss);
  const record = await prisma.businessRecord.create({
    data: {
      companyId,
      category: "fx_gain_loss",
      title: `${currencyCode} FX ${gl >= 0 ? "Gain" : "Loss"}`,
      subCategory: type || "unrealized",
      status: "active",
      data: {
        currencyCode,
        type: type || "unrealized",
        fcyAmount: Number(fcyAmount),
        originalRate: Number(originalRate),
        currentRate: Number(currentRate),
        gainLoss: gl,
        description: description || "",
        date: date || new Date().toISOString().slice(0, 10),
      },
    },
  });

  return NextResponse.json({ id: record.id });
}

export async function DELETE(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await prisma.businessRecord.updateMany({
    where: { id, companyId, category: "fx_gain_loss" },
    data: { status: "deleted" },
  });

  return NextResponse.json({ success: true });
}
