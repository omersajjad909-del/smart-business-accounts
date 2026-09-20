/**
 * /api/travel/voucher-terms — the agency's own terms, kept once.
 *
 * Retyping them on every voucher is how an agency ends up with vouchers that
 * disagree with each other by the end of a season. So they are written once
 * and copied onto each new voucher as it is created.
 *
 * Copied, not referenced. A voucher already in a pilgrim's hand must go on
 * saying what it said the day it was issued — changing the wording next season
 * cannot retrospectively change what somebody agreed to.
 */

import { NextRequest, NextResponse } from "next/server";

import { logAuditFromReq } from "@/lib/auditLogger";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

const WRITE_ROLES = new Set(["ADMIN", "ACCOUNTANT", "MANAGER"]);
const CATEGORY = "travel_voucher_terms";

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const row = await prisma.businessRecord.findFirst({
      where: { companyId, category: CATEGORY },
      orderBy: { updatedAt: "desc" },
    });
    const data = (row?.data ?? {}) as Record<string, unknown>;
    return NextResponse.json({ terms: String(data.terms || "") });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load the terms" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (!WRITE_ROLES.has(role)) {
      return NextResponse.json({ error: "Your role cannot change the voucher terms." }, { status: 403 });
    }

    const body = (await req.json().catch(() => null)) as { terms?: unknown } | null;
    // Long enough for real terms, capped so a paste accident cannot fill the row.
    const terms = String(body?.terms ?? "").slice(0, 8000);

    const existing = await prisma.businessRecord.findFirst({ where: { companyId, category: CATEGORY } });

    const row = existing
      ? await prisma.businessRecord.update({
          where: { id: existing.id },
          data: { data: { terms }, title: "Voucher terms & conditions" },
        })
      : await prisma.businessRecord.create({
          data: {
            companyId,
            category: CATEGORY,
            title: "Voucher terms & conditions",
            status: "active",
            data: { terms },
          },
        });

    await logAuditFromReq(req, {
      companyId,
      entity: "TravelVoucherTerms",
      entityId: row.id,
      action: existing ? "UPDATE" : "CREATE",
      afterValues: { length: terms.length },
      description: `Set the default voucher terms (${terms.length} characters)`,
    });

    return NextResponse.json({ success: true, terms });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save the terms" },
      { status: 500 },
    );
  }
}
