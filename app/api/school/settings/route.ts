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
  return NextResponse.json({ name: company?.name ?? "", logoUrl: company?.logoUrl ?? null, ...Object.fromEntries(FIELDS.map((f) => [f, row?.[f] ?? ""])), setupDismissedAt: row?.setupDismissedAt ?? null, feeAccounting: row?.feeAccounting ?? "CASH", feeDueDay: row?.feeDueDay ?? 10, lateFeeType: row?.lateFeeType ?? "NONE", lateFeeAmount: row?.lateFeeAmount ?? 0, lateFeeGraceDays: row?.lateFeeGraceDays ?? 0, lateFeeCap: row?.lateFeeCap ?? 0 });
}

/** PUT { address?, city?, phone?, email?, website?, principalName?, registrationNo?, dismissSetup? } */
export async function PUT(req: NextRequest) {
  const ctx = await schoolGuard(req, true, "SCHOOL_SETUP_MANAGE");
  if (isResponse(ctx)) return ctx;
  const b = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  for (const f of FIELDS) if (b[f] !== undefined) data[f] = str(b[f]).slice(0, 300) || null;
  if (data.email && !/^\S+@\S+\.\S+$/.test(String(data.email))) return bad("Enter a valid email address");
  // Fee due date and late-fine rule
  if (b.feeDueDay !== undefined) { const d = Math.floor(Number(b.feeDueDay)); if (!(d >= 1 && d <= 28)) return bad("Due day must be between 1 and 28"); data.feeDueDay = d; }
  if (b.lateFeeType !== undefined) { const t = str(b.lateFeeType).toUpperCase(); if (!["NONE", "FLAT", "PER_DAY"].includes(t)) return bad("Invalid late fee type"); data.lateFeeType = t; }
  for (const k of ["lateFeeAmount", "lateFeeCap"] as const) if (b[k] !== undefined) { const v = Number(b[k]); if (!Number.isFinite(v) || v < 0) return bad("Late fee amounts cannot be negative"); data[k] = v; }
  if (b.lateFeeGraceDays !== undefined) { const g = Math.floor(Number(b.lateFeeGraceDays)); if (!(g >= 0 && g <= 60)) return bad("Grace days must be between 0 and 60"); data.lateFeeGraceDays = g; }
  if (data.lateFeeType && data.lateFeeType !== "NONE" && Number(data.lateFeeAmount ?? 1) <= 0) return bad("Enter the late fee amount");
  if (b.dismissSetup === true) data.setupDismissedAt = new Date();
  if (b.dismissSetup === false) data.setupDismissedAt = null;
  await prisma.schoolSettings.upsert({ where: { companyId: ctx.companyId }, create: { companyId: ctx.companyId, ...data }, update: data });
  return NextResponse.json({ ok: true });
}
