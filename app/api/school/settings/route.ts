import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bad, isResponse, schoolGuard, str } from "@/lib/schoolApi";

const FIELDS = ["address", "city", "phone", "email", "website", "principalName", "registrationNo"] as const;

export async function GET(req: NextRequest) {
  const ctx = await schoolGuard(req, false, "SCHOOL_VIEW");
  if (isResponse(ctx)) return ctx;
  const [row, company] = await Promise.all([
    prisma.schoolSettings.findUnique({ where: { companyId: ctx.companyId } }),
    prisma.company.findUnique({ where: { id: ctx.companyId }, select: { name: true, logoUrl: true } }),
  ]);
  return NextResponse.json({ name: company?.name ?? "", logoUrl: company?.logoUrl ?? null, ...Object.fromEntries(FIELDS.map((f) => [f, row?.[f] ?? ""])), setupDismissedAt: row?.setupDismissedAt ?? null, feeAccounting: row?.feeAccounting ?? "CASH" });
}

/** PUT { address?, city?, phone?, email?, website?, principalName?, registrationNo?, dismissSetup? } */
export async function PUT(req: NextRequest) {
  const ctx = await schoolGuard(req, true, "SCHOOL_SETUP_MANAGE");
  if (isResponse(ctx)) return ctx;
  const b = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  for (const f of FIELDS) if (b[f] !== undefined) data[f] = str(b[f]).slice(0, 300) || null;
  if (data.email && !/^\S+@\S+\.\S+$/.test(String(data.email))) return bad("Enter a valid email address");
  if (b.dismissSetup === true) data.setupDismissedAt = new Date();
  if (b.dismissSetup === false) data.setupDismissedAt = null;
  await prisma.schoolSettings.upsert({ where: { companyId: ctx.companyId }, create: { companyId: ctx.companyId, ...data }, update: data });
  return NextResponse.json({ ok: true });
}
