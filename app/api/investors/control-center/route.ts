import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

// Server-side mirror of app/dashboard/investors/_shared.ts's mappers and
// capitalTotals/daysBetween helpers. That file is "use client" and can't be
// imported into a route handler, so the field-reading logic is duplicated
// here — keep both in sync if the investor record shape changes.

function normalizeRole(value: string | null | undefined) {
  return String(value || "").trim().toUpperCase();
}

const str = (v: unknown, fallback = "") => (v === null || v === undefined ? fallback : String(v));
const num = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const day = (v: unknown) => str(v).slice(0, 10);
const round2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function monthKey(dateISO: string) {
  return dateISO.slice(0, 7);
}
function daysBetween(fromISO: string, toISO: string): number {
  if (!fromISO || !toISO) return 0;
  const a = new Date(fromISO + "T00:00:00Z").getTime();
  const b = new Date(toISO + "T00:00:00Z").getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86400000));
}

type RecordRow = { id: string; title: string; status: string | null; amount: unknown; date: Date | string | null; refId: string | null; data: unknown };

function mapParty(r: RecordRow) {
  const data = (r.data || {}) as Record<string, unknown>;
  return {
    id: r.id,
    name: r.title,
    cycleDays: num(data.cycleDays, 10),
    status: r.status || "active",
  };
}
function mapCapital(r: RecordRow) {
  const data = (r.data || {}) as Record<string, unknown>;
  return {
    partyId: str(r.refId),
    date: day(r.date),
    kind: str(data.kind, "invest") === "withdraw" ? "withdraw" : "invest",
    amount: num(r.amount),
  };
}
function mapProduction(r: RecordRow) {
  const data = (r.data || {}) as Record<string, unknown>;
  return {
    partyId: str(r.refId),
    date: day(r.date),
    amount: num(r.amount),
    settlementId: str(data.settlementId),
  };
}
function mapSettlement(r: RecordRow) {
  const data = (r.data || {}) as Record<string, unknown>;
  return {
    partyId: str(r.refId),
    cycleNo: num(data.cycleNo),
    toDate: day(data.toDate),
    closingBalance: num(data.closingBalance),
  };
}

export async function GET(req: NextRequest) {
  const role = normalizeRole(req.headers.get("x-user-role"));
  if (!["ADMIN", "ACCOUNTANT", "VIEWER"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const [partyRecords, capitalRecords, productionRecords, settlementRecords] = await Promise.all([
    prisma.businessRecord.findMany({ where: { companyId, category: "investor_party" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "investor_capital" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "investor_production" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "investor_settlement" }, orderBy: { createdAt: "desc" } }),
  ]);

  const parties = partyRecords.map(mapParty).filter((p) => p.status === "active");
  const capital = capitalRecords.map(mapCapital);
  const production = productionRecords.map(mapProduction);
  const settlements = settlementRecords.map(mapSettlement);

  const thisMonth = monthKey(todayISO());
  const today = todayISO();

  let netCapital = 0;
  let capitalInvested = 0;
  let capitalWithdrawn = 0;
  let monthEarned = 0;
  let outstandingBalance = 0;
  let overdueSettlements = 0;

  for (const p of parties) {
    const partyCapital = capital.filter((c) => c.partyId === p.id);
    let invested = 0;
    let withdrawn = 0;
    for (const c of partyCapital) {
      if (c.kind === "withdraw") withdrawn += c.amount;
      else invested += c.amount;
    }
    netCapital += invested - withdrawn;
    capitalInvested += invested;
    capitalWithdrawn += withdrawn;

    const lines = production.filter((l) => l.partyId === p.id);
    monthEarned += lines.filter((l) => monthKey(l.date) === thisMonth).reduce((s, l) => s + l.amount, 0);
    const open = lines.filter((l) => !l.settlementId);

    const cycles = settlements.filter((s) => s.partyId === p.id).sort((a, b) => b.cycleNo - a.cycleNo);
    const last = cycles[0];
    outstandingBalance += last ? last.closingBalance : round2(lines.reduce((s, l) => s + l.amount, 0));

    const overdue = last ? daysBetween(last.toDate, today) > p.cycleDays : open.length > 0;
    if (overdue) overdueSettlements += 1;
  }

  const openProductionLines = production.filter((l) => !l.settlementId).length;

  // Last 6 months of capital-in vs earned-share, for the dashboard trend
  // chart — this business has no sales invoices, so the generic
  // revenue/expenses chart has nothing to show; this is what replaces it.
  const monthlyTrend: { month: string; invested: number; earned: number }[] = [];
  const cursor = new Date();
  cursor.setUTCDate(1);
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() - i, 1));
    const m = d.toISOString().slice(0, 7);
    const invested = capital.filter((c) => c.kind === "invest" && monthKey(c.date) === m).reduce((s, c) => s + c.amount, 0);
    const earned = production.filter((l) => monthKey(l.date) === m).reduce((s, l) => s + l.amount, 0);
    monthlyTrend.push({ month: m, invested: round2(invested), earned: round2(earned) });
  }

  return NextResponse.json({
    summary: {
      activeParties: parties.length,
      capitalPlaced: round2(netCapital),
      capitalInvested: round2(capitalInvested),
      capitalWithdrawn: round2(capitalWithdrawn),
      monthEarned: round2(monthEarned),
      outstandingBalance: round2(outstandingBalance),
      overdueSettlements,
      openProductionLines,
    },
    monthlyTrend,
  });
}
