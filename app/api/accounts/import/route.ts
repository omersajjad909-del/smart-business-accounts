import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";

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
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Only ADMIN can import accounts" }, { status: 403 });
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
      const code = r.code?.trim();
      const name = r.name?.trim();
      if (!code || !name) {
        skipped += 1;
        continue;
      }

      const exists = await prisma.account.findFirst({
        where: { code, companyId },
      });
      if (exists) {
        skipped += 1;
        continue;
      }

      await prisma.account.create({
        data: {
          companyId,
          code,
          name,
          partyType: r.partyType || null,
          type: r.type || null,
          city: r.city || null,
          phone: r.phone || null,
          openDebit: r.openDebit ? Number(r.openDebit) : 0,
          openCredit: r.openCredit ? Number(r.openCredit) : 0,
          openDate: r.openDate ? new Date(r.openDate) : undefined,
          creditDays: r.creditDays ? Number(r.creditDays) : 0,
          creditLimit: r.creditLimit ? Number(r.creditLimit) : 0,
        },
      });
      created += 1;
    }

    return NextResponse.json({ created, skipped });
  } catch (e: Any) {
    console.error("ACCOUNTS IMPORT ERROR:", e);
    return NextResponse.json({ error: "Failed to import accounts" }, { status: 500 });
  }
}
