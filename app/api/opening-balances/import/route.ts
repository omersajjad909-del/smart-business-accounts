import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
// Shared reader. Balances arrive as "1,234.56" and "(500)" from every real
// accounting system; Number() reads the first as NaN and the second as NaN too,
// and parseFloat reads "1,234.56" as 1. See lib/csvParse.ts.
import { parseCsv } from "@/lib/csvParse";
import { readOpeningBalanceRow } from "@/lib/importEngine";

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

    const { rows } = parseCsv(csv);
    if (rows.length === 0) {
      return NextResponse.json({ error: "No rows found" }, { status: 400 });
    }

    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const r of rows) {
      // One reader shared with /api/import, so a file that previews cleanly in
      // the wizard behaves identically when it is committed here.
      const { value, error } = readOpeningBalanceRow(r);
      const { code, name, debit, credit } = value;
      if (error) {
        skipped += 1;
        continue;
      }
      try {
        // Code first, name second. A trial balance exported off a report screen
        // often carries the account name and no code at all, and refusing those
        // rows was why a perfectly good Oracle TB imported as zero updates.
        const byCode = code
          ? await prisma.account.findFirst({
              where: { code, companyId, deletedAt: null },
              select: { id: true },
            })
          : null;
        const acc = byCode ?? (name
          ? await prisma.account.findFirst({
              where: { companyId, deletedAt: null, name: { equals: name, mode: "insensitive" } },
              select: { id: true },
            })
          : null);
        if (!acc) {
          skipped += 1;
          errors.push(`Account not found: ${code || name}`);
          continue;
        }
        await prisma.account.update({
          where: { id: acc.id },
          data: { openDebit: debit, openCredit: credit, openDate },
        });
        updated += 1;
      } catch (e: any) {
        errors.push(`Failed for ${code || name}: ${e.message}`);
        skipped += 1;
      }
    }

    return NextResponse.json({ updated, skipped, errors });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Import failed" }, { status: 500 });
  }
}
