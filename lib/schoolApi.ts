import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveSession } from "@/lib/sessionGuard";

const READ_ROLES = ["ADMIN", "ACCOUNTANT", "VIEWER"];
const WRITE_ROLES = ["ADMIN", "ACCOUNTANT"];

export type SchoolCtx = { companyId: string };

/** Resolves the tenant from the verified active session and enforces role. */
export async function schoolGuard(req: NextRequest, write: boolean): Promise<SchoolCtx | NextResponse> {
  const session = await requireActiveSession(req);
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!(write ? WRITE_ROLES : READ_ROLES).includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = session.companyId || await prisma.user.findUnique({
    where: { id: session.userId },
    select: { defaultCompanyId: true },
  }).then((user) => user?.defaultCompanyId || null);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const membership = await prisma.userCompany.findUnique({
    where: { userId_companyId: { userId: session.userId, companyId } },
    select: { id: true },
  });
  const user = membership ? null : await prisma.user.findUnique({
    where: { id: session.userId },
    select: { defaultCompanyId: true },
  });
  if (!membership && user?.defaultCompanyId !== companyId && !session.impersonatedBy) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return { companyId };
}

export const isResponse = (v: SchoolCtx | NextResponse): v is NextResponse => v instanceof NextResponse;

export function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function str(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

export function num(v: unknown, fallback = 0) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Parses "YYYY-MM-DD" as a UTC date; null when invalid. */
export function parseDay(v: unknown): Date | null {
  const s = str(v);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function invoiceTotals(inv: { amount: number; discount: number; lateFee: number; payments: { amount: number }[] }) {
  const payable = Math.max(0, inv.amount - inv.discount + inv.lateFee);
  const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
  return { payable, paid, balance: Math.max(0, payable - paid) };
}

export function invoiceStatus(balance: number, paid: number, dueDate: Date, now = new Date()) {
  if (balance <= 0.005) return "PAID";
  if (dueDate.getTime() < now.getTime() - 86_400_000) return paid > 0 ? "PARTIAL_OVERDUE" : "OVERDUE";
  return paid > 0 ? "PARTIAL" : "UNPAID";
}
