import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

// HS Codes stored as BusinessRecord with category "hs_code"
export async function GET(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  const records = await prisma.businessRecord.findMany({
    where: {
      companyId,
      category: "hs_code",
      status: { not: "deleted" },
      ...(q ? {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { subCategory: { contains: q, mode: "insensitive" } },
        ],
      } : {}),
    },
    orderBy: { title: "asc" },
  });

  return NextResponse.json(records.map(r => {
    const d = r.data as Record<string, unknown>;
    return {
      id: r.id,
      code: r.title,
      description: (d?.description as string) || "",
      dutyRate: (d?.dutyRate as number) ?? 0,
      unit: (d?.unit as string) || "",
      category: (d?.category as string) || "",
    };
  }));
}

export async function POST(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });
  const body = await req.json();
  if (!body.code || !body.description) return NextResponse.json({ error: "Code and description required" }, { status: 400 });

  const record = await prisma.businessRecord.create({
    data: {
      companyId,
      category: "hs_code",
      title: body.code,
      subCategory: body.category || "",
      status: "active",
      data: { description: body.description, dutyRate: Number(body.dutyRate) || 0, unit: body.unit || "", category: body.category || "" },
    },
  });
  const d = record.data as Record<string, unknown>;
  return NextResponse.json({ id: record.id, code: record.title, description: d?.description, dutyRate: d?.dutyRate, unit: d?.unit, category: d?.category });
}

export async function PUT(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await prisma.businessRecord.updateMany({
    where: { id: body.id, companyId, category: "hs_code" },
    data: {
      title: body.code,
      subCategory: body.category || "",
      data: { description: body.description, dutyRate: Number(body.dutyRate) || 0, unit: body.unit || "", category: body.category || "" },
    },
  });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await prisma.businessRecord.updateMany({
    where: { id, companyId, category: "hs_code" },
    data: { status: "deleted" },
  });
  return NextResponse.json({ success: true });
}
