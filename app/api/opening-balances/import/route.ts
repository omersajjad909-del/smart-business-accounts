import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";

const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();
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
    return NextResponse.json({ error: "Only ADMIN can import opening balances" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  try {
    const body = (await req.json()) as { csv?: string; date?: string };
    const csv = body.csv || "";
    const openDate = body.date ? new Date(body.date) : new Date();
    if (!csv.trim()) {
      return NextResponse.json({ error: "CSV payload required" }, { status: 400 });
    }

    const rows = parseCsv(csv);
    if (rows.length === 0) {
      return NextResponse.json({ error: "No rows found" }, { status: 400 });
    }

    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const r of rows) {
      const code = (r.code || r.accountCode || "").trim();
      const debit = Number(r.debit || r.openDebit || 0);
      const credit = Number(r.credit || r.openCredit || 0);
      if (!code) {
        skipped += 1;
        continue;
      }
      try {
        const acc = await prisma.account.findFirst({
          where: { code, companyId },
          select: { id: true },
        });
        if (!acc) {
          skipped += 1;
          errors.push(`Account not found: ${code}`);
          continue;
        }
        await prisma.account.update({
          where: { id: acc.id },
          data: { openDebit: debit, openCredit: credit, openDate },
        });
        updated += 1;
      } catch (e: any) {
        errors.push(`Failed for ${code}: ${e.message}`);
        skipped += 1;
      }
    }

    return NextResponse.json({ updated, skipped, errors });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Import failed" }, { status: 500 });
  }
}
