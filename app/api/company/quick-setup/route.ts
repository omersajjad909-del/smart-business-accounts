import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";
import { seedMinimalChart } from "@/lib/services/accountsSeed";

export const runtime = "nodejs";

const MAX_EACH = 50;

type ItemInput = { name?: string; unit?: string; rate?: number | string; purchaseRate?: number | string };

function cleanNames(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of list) {
    const name = String(v ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out.slice(0, MAX_EACH);
}

/** Next free "<prefix>-<n>" code among a company's accounts. */
async function codeAllocator(companyId: string, prefix: string) {
  const rows = await prisma.account.findMany({
    where: { companyId, code: { startsWith: `${prefix}-` } },
    select: { code: true },
  });
  let n = 0;
  for (const { code } of rows) {
    const v = parseInt(code.slice(prefix.length + 1), 10);
    if (Number.isFinite(v) && v > n) n = v;
  }
  return () => `${prefix}-${String(++n).padStart(3, "0")}`;
}

/**
 * POST /api/company/quick-setup
 *   { customers: string[], suppliers: string[], items: { name, unit, rate, purchaseRate }[] }
 *
 * Self-serve first setup for a trial customer: makes sure the chart of accounts
 * exists, then creates the customers, suppliers and products they typed. Names
 * that already exist are skipped, so pressing the button twice duplicates nothing.
 * It exists so a new customer is never waiting on a person to do this for them.
 */
export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const token = getTokenFromRequest(req as any);
    const role = String(req.headers.get("x-user-role") || (token ? (verifyJwt(token) as any)?.role : "") || "").toUpperCase();
    if (!["ADMIN", "ACCOUNTANT"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const customers = cleanNames(body.customers);
    const suppliers = cleanNames(body.suppliers);
    const rawItems: ItemInput[] = Array.isArray(body.items) ? body.items.slice(0, MAX_EACH) : [];

    await seedMinimalChart(prisma, companyId);

    const result = { customers: 0, suppliers: 0, items: 0, skipped: 0 };

    for (const [partyType, names, type, prefix] of [
      ["CUSTOMER", customers, "ASSET", "C"],
      ["SUPPLIER", suppliers, "LIABILITY", "S"],
    ] as const) {
      if (!names.length) continue;
      const existing = await prisma.account.findMany({
        where: { companyId, partyType, deletedAt: null },
        select: { name: true },
      });
      const have = new Set(existing.map((a) => a.name.trim().toLowerCase()));
      const nextCode = await codeAllocator(companyId, prefix);
      for (const name of names) {
        if (have.has(name.toLowerCase())) { result.skipped++; continue; }
        await prisma.account.create({
          data: { companyId, code: nextCode(), name, type, partyType, openDate: new Date() },
        });
        have.add(name.toLowerCase());
        if (partyType === "CUSTOMER") result.customers++; else result.suppliers++;
      }
    }

    if (rawItems.length) {
      const existing = await prisma.itemNew.findMany({
        where: { companyId, deletedAt: null },
        select: { name: true, code: true },
      });
      const have = new Set(existing.map((i) => i.name.trim().toUpperCase()));
      let n = 0;
      for (const { code } of await prisma.itemNew.findMany({
        where: { companyId, code: { startsWith: "I-", mode: "insensitive" } }, select: { code: true },
      })) {
        const v = parseInt(String(code).slice(2), 10);
        if (Number.isFinite(v) && v > n) n = v;
      }
      for (const it of rawItems) {
        const name = String(it.name ?? "").trim().replace(/\s+/g, " ").slice(0, 120).toUpperCase();
        if (!name) continue;
        if (have.has(name)) { result.skipped++; continue; }
        await prisma.itemNew.create({
          data: {
            companyId,
            code: `I-${++n}`,
            name,
            category: "TRADING",
            unit: String(it.unit ?? "").trim().slice(0, 20) || "pcs",
            rate: Math.max(0, Number(it.rate) || 0),
            purchaseRate: Math.max(0, Number(it.purchaseRate) || 0),
          },
        });
        have.add(name);
        result.items++;
      }
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    console.error("[company/quick-setup]", e);
    return NextResponse.json({ error: "Could not save your setup. Please try again." }, { status: 500 });
  }
}
