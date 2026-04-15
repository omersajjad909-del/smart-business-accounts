import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isAdmin(req: NextRequest) {
  return req.headers.get("x-user-role")?.toUpperCase() === "ADMIN";
}

async function ensureTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AutomationAddon" (
      "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "companyId"   TEXT NOT NULL UNIQUE,
      "enabled"     BOOLEAN NOT NULL DEFAULT true,
      "plan"        TEXT NOT NULL DEFAULT 'monthly',
      "price"       FLOAT NOT NULL DEFAULT 79,
      "activatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "expiresAt"   TIMESTAMPTZ,
      "notes"       TEXT
    )
  `);
}

/* ─── GET: list all companies + addon status ─── */
export async function GET(req: NextRequest) {
  try {
    if (!isAdmin(req))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await ensureTable();

    const url = new URL(req.url);
    const companyId = url.searchParams.get("companyId");

    // Single company check (used by dashboard)
    if (companyId) {
      const row = await prisma.$queryRaw<{ enabled: boolean }[]>`
        SELECT enabled FROM "AutomationAddon" WHERE "companyId" = ${companyId} LIMIT 1
      `;
      return NextResponse.json({ enabled: row[0]?.enabled === true });
    }

    // List all companies with their addon status
    const [companies, addons] = await Promise.all([
      prisma.$queryRaw<{ id: string; name: string; plan: string; createdAt: Date }[]>`
        SELECT id, name, plan, "createdAt" FROM "Company" ORDER BY "createdAt" DESC LIMIT 200
      `,
      prisma.$queryRaw<{ companyId: string; enabled: boolean; plan: string; price: number; activatedAt: Date; expiresAt: Date | null; notes: string | null }[]>`
        SELECT "companyId", enabled, plan, price, "activatedAt", "expiresAt", notes FROM "AutomationAddon"
      `,
    ]);

    const addonMap = new Map(addons.map(a => [a.companyId, a]));
    const result = companies.map(c => ({
      ...c,
      addon: addonMap.get(c.id) ?? null,
    }));

    const stats = {
      total: addons.length,
      active: addons.filter(a => a.enabled).length,
      mrr: addons.filter(a => a.enabled).reduce((s, a) => s + (a.price || 79), 0),
    };

    return NextResponse.json({ companies: result, stats });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/* ─── POST: enable / update addon for a company ─── */
export async function POST(req: NextRequest) {
  try {
    if (!isAdmin(req))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await ensureTable();

    const { companyId, enabled, plan, price, notes, expiresAt } = await req.json();
    if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

    await prisma.$executeRawUnsafe(`
      INSERT INTO "AutomationAddon" ("companyId", enabled, plan, price, notes, "expiresAt")
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT ("companyId") DO UPDATE SET
        enabled     = EXCLUDED.enabled,
        plan        = EXCLUDED.plan,
        price       = EXCLUDED.price,
        notes       = EXCLUDED.notes,
        "expiresAt" = EXCLUDED."expiresAt"
    `, companyId, enabled ?? true, plan ?? "monthly", price ?? 79, notes ?? null, expiresAt ?? null);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/* ─── DELETE: remove addon ─── */
export async function DELETE(req: NextRequest) {
  try {
    if (!isAdmin(req))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { companyId } = await req.json();
    if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

    await prisma.$executeRawUnsafe(`DELETE FROM "AutomationAddon" WHERE "companyId" = $1`, companyId);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
