import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { safeEncryptField } from "@/lib/fieldEncrypt";
// The hand-rolled parser this file used to carry split on every comma, so
// "M/s Ali Traders, Karachi" became two columns and shifted every value after
// it one place left — the balance saved was not the balance in the file.
// See lib/csvParse.ts.
import { parseCsv, parseAmount, parseImportDate } from "@/lib/csvParse";

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

    const { rows } = parseCsv(body.csv);
    if (rows.length === 0) {
      return NextResponse.json({ error: "No rows found" }, { status: 400 });
    }

    let created = 0;
    let skipped = 0;

    for (const r of rows) {
      const code = r.code?.trim();
      const name = r.name?.trim();
      const type = r.type?.trim();
      if (!code || !name || !type) {
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
          type,
          city: r.city || null,
          phone: r.phone ? safeEncryptField(r.phone) : null,
          openDebit: parseAmount(r.openDebit),
          openCredit: parseAmount(r.openCredit),
          openDate: parseImportDate(r.openDate) ?? undefined,
          creditDays: Math.round(parseAmount(r.creditDays)),
          creditLimit: parseAmount(r.creditLimit),
        },
      });
      created += 1;
    }

    return NextResponse.json({ created, skipped });
  } catch (e: any) {
    console.error("ACCOUNTS IMPORT ERROR:", e);
    return NextResponse.json({ error: "Failed to import accounts" }, { status: 500 });
  }
}
