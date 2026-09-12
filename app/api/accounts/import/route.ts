import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { safeEncryptField } from "@/lib/fieldEncrypt";
// The hand-rolled parser this file used to carry split on every comma, so
// "M/s Ali Traders, Karachi" became two columns and shifted every value after
// it one place left — the balance saved was not the balance in the file.
// See lib/csvParse.ts.
import { parseCsv, parseAmount, parseImportDate } from "@/lib/csvParse";
import { COUNTRIES, normalizeCountryCode } from "@/lib/countries";
import { normalizeSubdivision } from "@/lib/subdivisions";

const COUNTRY_CODES = new Set(COUNTRIES.map((c) => c.code));
const COUNTRY_NAME_BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c.name]));

/**
 * Country and province off one imported row, spelled the way the app spells them.
 *
 * A spreadsheet is where "punjab", "PUNJAB" and "Punjab" all arrive in the same
 * column, and the province is the field FBR matches against its own list — so a
 * casing difference nobody can see is a rejected filing. Both values are put
 * through the canonical lists, and anything the lists do not recognise is kept
 * exactly as typed rather than dropped: an unrecognised region is still the only
 * record of what the customer said, and the form shows it back for correction.
 */
function importedRegion(rawCountry?: string, rawProvince?: string) {
  const country = String(rawCountry || "").trim();
  const province = String(rawProvince || "").trim();
  const code = normalizeCountryCode(country);
  const canonicalCountry = COUNTRY_CODES.has(code)
    ? COUNTRY_NAME_BY_CODE.get(code)!
    : country || null;
  return {
    country: canonicalCountry,
    province: (province ? normalizeSubdivision(canonicalCountry, province) : null) || province || null,
  };
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
          ...importedRegion(r.country, r.province),
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
