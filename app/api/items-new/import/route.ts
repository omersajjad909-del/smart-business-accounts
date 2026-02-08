import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";
import { logActivity } from "@/lib/audit";

const prisma =
  (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

type Row = Record<string, string>;

function parseCsv(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: Row[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const row: Row = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

export async function POST(req: NextRequest) {
  const role = req.headers.get("x-user-role")?.toUpperCase();
  const userId = req.headers.get("x-user-id");
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Only ADMIN can import items" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  try {
    const body = (await req.json()) as { csv?: string };
    if (!body?.csv) {
      return NextResponse.json({ error: "CSV payload required" }, { status: 400 });
    }

    const rows = parseCsv(body.csv);
    if (rows.length === 0) {
      return NextResponse.json({ error: "No rows found" }, { status: 400 });
    }

    let created = 0;
    let skipped = 0;

    for (const r of rows) {
      const name = r.name?.trim();
      const unit = r.unit?.trim();
      if (!name || !unit) {
        skipped += 1;
        continue;
      }

      const code = r.code?.trim();
      if (code) {
        const exists = await prisma.itemNew.findFirst({
          where: { code, companyId },
        });
        if (exists) {
          skipped += 1;
          continue;
        }
      }

      await prisma.itemNew.create({
        data: {
          companyId,
          code: code || `I-${Date.now()}`,
          name,
          unit,
          rate: r.rate ? Number(r.rate) : 0,
          minStock: r.minStock ? Number(r.minStock) : 0,
          barcode: r.barcode ? String(r.barcode).trim() : null,
          description: r.description || "",
        },
      });
      created += 1;
    }

    await logActivity(prisma, {
      companyId,
      userId,
      action: "ITEMS_IMPORTED",
      details: `Created ${created}, skipped ${skipped}`,
    });

    return NextResponse.json({ created, skipped });
  } catch (e: any) {
    console.error("ITEMS IMPORT ERROR:", e);
    return NextResponse.json({ error: "Failed to import items" }, { status: 500 });
  }
}
