import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

const CAT = "price_list";

function toList(r: { id: string; title: string; status: string; data: unknown }) {
  const d = (r.data || {}) as Record<string, unknown>;
  return {
    id:       r.id,
    name:     r.title,
    type:     (d.type as string)     || "Retail",
    discount: Number(d.discount)     || 0,
    status:   r.status               || "DRAFT",
    items:    (d.items as unknown[]) || [],
    notes:    (d.notes as string)    || "",
  };
}

export async function GET(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const records = await prisma.businessRecord.findMany({
    where: { companyId, category: CAT },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(records.map(toList));
}

export async function POST(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

  const record = await prisma.businessRecord.create({
    data: {
      companyId,
      category: CAT,
      title:    body.name.trim(),
      status:   body.status || "DRAFT",
      data: {
        type:     body.type     || "Retail",
        discount: Number(body.discount) || 0,
        items:    body.items    || [],
        notes:    body.notes    || "",
      },
    },
  });

  return NextResponse.json(toList(record), { status: 201 });
}

export async function PUT(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const record = await prisma.businessRecord.updateMany({
    where: { id: body.id, companyId, category: CAT },
    data: {
      title:  body.name?.trim() || undefined,
      status: body.status       || undefined,
      data: {
        type:     body.type     || "Retail",
        discount: Number(body.discount) || 0,
        items:    body.items    || [],
        notes:    body.notes    || "",
      },
    },
  });

  if (!record.count) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.businessRecord.findFirst({
    where: { id: body.id, companyId },
  });

  return NextResponse.json(updated ? toList(updated) : { success: true });
}

export async function DELETE(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.businessRecord.deleteMany({ where: { id, companyId, category: CAT } });

  return NextResponse.json({ success: true });
}
