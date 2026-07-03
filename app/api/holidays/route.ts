import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { requireRole } from "@/lib/requireRole";

// GET /api/holidays?year=2026 → list holidays for the company (optionally filter by year)
export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");

    const where: any = { companyId };
    if (year && /^\d{4}$/.test(year)) {
      const y = Number(year);
      where.date = { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) };
    }

    const holidays = await (prisma as any).holiday.findMany({
      where,
      orderBy: { date: "asc" },
    });
    return NextResponse.json(holidays);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}

// POST /api/holidays  { date: "YYYY-MM-DD", name: string, isRecurring?: boolean }
export async function POST(req: NextRequest) {
  const guard = requireRole(req, ["ADMIN"]);
  if (guard) return guard;

  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const body = await req.json();
    const date = String(body?.date || "").trim();
    const name = String(body?.name || "").trim();
    const isRecurring = Boolean(body?.isRecurring);
    if (!date || !name) {
      return NextResponse.json({ error: "date and name are required" }, { status: 400 });
    }

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    try {
      const holiday = await (prisma as any).holiday.create({
        data: { companyId, date: dateObj, name, isRecurring },
      });
      return NextResponse.json(holiday, { status: 201 });
    } catch (e: any) {
      if (e?.code === "P2002") {
        return NextResponse.json({ error: "A holiday already exists on this date" }, { status: 409 });
      }
      throw e;
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}

// DELETE /api/holidays?id=xxx
export async function DELETE(req: NextRequest) {
  const guard = requireRole(req, ["ADMIN"]);
  if (guard) return guard;

  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    await (prisma as any).holiday.deleteMany({ where: { id, companyId } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
