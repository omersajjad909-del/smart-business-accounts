/**
 * GET /api/admin/fraud
 *
 * Computes fraud/risk signals for every company and returns a ranked list.
 *
 * Risk signals detected automatically:
 *  1. GEO_HOP       — logins from 3+ different countries in the last 7 days
 *  2. HIGH_VOLUME   — more than 100 invoices/vouchers created in any single day (last 30d)
 *  3. NEW_HEAVY     — account < 30 days old with > 50 invoices or > $50,000 total
 *  4. ODD_HOURS     — >40% of logins between midnight and 5am (UTC)
 *  5. RAPID_LOGINS  — more than 20 login sessions in any single hour
 *  6. MANUAL_FLAG   — admin manually flagged this company
 *
 * Risk level = count of signals:
 *   0 signals  → NONE
 *   1 signal   → LOW
 *   2 signals  → MEDIUM
 *   3+ signals → HIGH
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const admin = requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const now = new Date();
  const d7  = new Date(now.getTime() - 7  * 86400000);
  const d30 = new Date(now.getTime() - 30 * 86400000);
  const d1  = new Date(now.getTime() - 1  * 86400000);

  try {
    /* ── 1. All companies ─────────────────────────────────── */
    const companies = await prisma.company.findMany({
      select: {
        id: true, name: true, country: true, plan: true,
        subscriptionStatus: true, businessType: true,
        createdAt: true, isActive: true,
        fraudRisk: true, flaggedAt: true, flagNote: true,
      },
    });

    /* ── 2. Login data (last 30 days) ─────────────────────── */
    const logins = await prisma.loginLog.findMany({
      where: { loginAt: { gte: d30 } },
      select: { companyId: true, country: true, loginAt: true },
    });

    // Group by company
    const loginsByCompany = new Map<string, typeof logins>();
    for (const l of logins) {
      if (!loginsByCompany.has(l.companyId)) loginsByCompany.set(l.companyId, []);
      loginsByCompany.get(l.companyId)!.push(l);
    }

    /* ── 3. Invoice/voucher counts (last 30 days) ─────────── */
    const [invoices, vouchers] = await Promise.all([
      prisma.salesInvoice.findMany({
        where: { createdAt: { gte: d30 } },
        select: { companyId: true, createdAt: true, totalAmount: true },
      }),
      prisma.voucher.findMany({
        where: { createdAt: { gte: d30 } },
        select: { companyId: true, createdAt: true },
      }),
    ]);

    // Group invoices by company
    const invoicesByCompany = new Map<string, typeof invoices>();
    for (const inv of invoices) {
      if (!invoicesByCompany.has(inv.companyId)) invoicesByCompany.set(inv.companyId, []);
      invoicesByCompany.get(inv.companyId)!.push(inv);
    }

    // Group vouchers by company
    const vouchersByCompany = new Map<string, typeof vouchers>();
    for (const v of vouchers) {
      if (!vouchersByCompany.has(v.companyId)) vouchersByCompany.set(v.companyId, []);
      vouchersByCompany.get(v.companyId)!.push(v);
    }

    /* ── 4. Manual flags from ActivityLog ────────────────── */
    const flagLogs = await prisma.activityLog.findMany({
      where: { action: { in: ["FRAUD_FLAGGED", "FRAUD_CLEARED"] } },
      orderBy: { createdAt: "desc" },
      select: { companyId: true, action: true, details: true, createdAt: true },
    });
    // Latest flag state per company
    const flagStateByCompany = new Map<string, string>();
    const flagDetailsByCompany = new Map<string, any>();
    for (const fl of flagLogs) {
      if (!fl.companyId) continue;
      if (!flagStateByCompany.has(fl.companyId)) {
        flagStateByCompany.set(fl.companyId, fl.action);
        try { flagDetailsByCompany.set(fl.companyId, JSON.parse(fl.details || "{}")); } catch {}
      }
    }

    /* ── 5. Compute signals per company ──────────────────── */
    const results = companies.map(c => {
      const signals: { code: string; label: string; severity: "high" | "medium" | "low"; detail: string }[] = [];

      const compLogins = loginsByCompany.get(c.id) || [];
      const compInvoices = invoicesByCompany.get(c.id) || [];
      const compVouchers = vouchersByCompany.get(c.id) || [];

      // Signal 1: GEO_HOP — 3+ countries in 7 days
      const recentLogins = compLogins.filter(l => l.loginAt >= d7);
      const countries = new Set(recentLogins.map(l => l.country).filter(Boolean));
      if (countries.size >= 3) {
        signals.push({
          code: "GEO_HOP",
          label: "Geo-Hopping Logins",
          severity: "high",
          detail: `Logins from ${countries.size} different countries in 7 days: ${[...countries].join(", ")}`,
        });
      }

      // Signal 2: HIGH_VOLUME — >100 transactions in any single day
      const txByDay = new Map<string, number>();
      for (const inv of compInvoices) {
        const day = inv.createdAt.toISOString().slice(0, 10);
        txByDay.set(day, (txByDay.get(day) || 0) + 1);
      }
      for (const v of compVouchers) {
        const day = v.createdAt.toISOString().slice(0, 10);
        txByDay.set(day, (txByDay.get(day) || 0) + 1);
      }
      const maxPerDay = Math.max(0, ...[...txByDay.values()]);
      if (maxPerDay > 100) {
        signals.push({
          code: "HIGH_VOLUME",
          label: "Unusually High Transaction Volume",
          severity: "medium",
          detail: `Peak: ${maxPerDay} invoices/vouchers in a single day`,
        });
      }

      // Signal 3: NEW_HEAVY — account < 30d with >50 invoices or >$50k
      const ageMs = now.getTime() - c.createdAt.getTime();
      const ageDays = ageMs / 86400000;
      const totalInvoiceAmount = compInvoices.reduce((s, i) => s + (i.totalAmount || 0), 0);
      if (ageDays < 30 && (compInvoices.length > 50 || totalInvoiceAmount > 50000)) {
        signals.push({
          code: "NEW_HEAVY",
          label: "New Account — Heavy Activity",
          severity: "high",
          detail: `Account age: ${Math.ceil(ageDays)}d | Invoices: ${compInvoices.length} | Total: $${totalInvoiceAmount.toFixed(0)}`,
        });
      }

      // Signal 4: ODD_HOURS — >40% logins between 00:00–05:00 UTC
      if (compLogins.length >= 10) {
        const oddHour = compLogins.filter(l => {
          const h = new Date(l.loginAt).getUTCHours();
          return h >= 0 && h < 5;
        }).length;
        const pct = oddHour / compLogins.length;
        if (pct > 0.4) {
          signals.push({
            code: "ODD_HOURS",
            label: "Unusual Login Hours",
            severity: "low",
            detail: `${Math.round(pct * 100)}% of logins between midnight–5am UTC (${oddHour}/${compLogins.length})`,
          });
        }
      }

      // Signal 5: RAPID_LOGINS — >20 sessions in any single hour
      const loginsByHour = new Map<string, number>();
      for (const l of compLogins) {
        const hr = l.loginAt.toISOString().slice(0, 13); // YYYY-MM-DDTHH
        loginsByHour.set(hr, (loginsByHour.get(hr) || 0) + 1);
      }
      const maxPerHour = Math.max(0, ...[...loginsByHour.values()]);
      if (maxPerHour > 20) {
        signals.push({
          code: "RAPID_LOGINS",
          label: "Rapid Login Attempts",
          severity: "high",
          detail: `${maxPerHour} login sessions in a single hour — possible credential stuffing or bot activity`,
        });
      }

      // Signal 6: MANUAL_FLAG
      const flagState = flagStateByCompany.get(c.id);
      const flagDetails = flagDetailsByCompany.get(c.id);
      if (flagState === "FRAUD_FLAGGED") {
        signals.push({
          code: "MANUAL_FLAG",
          label: "Manually Flagged by Admin",
          severity: "high",
          detail: flagDetails?.note || "No reason provided",
        });
      }

      // Compute risk level
      const highCount = signals.filter(s => s.severity === "high").length;
      const totalCount = signals.length;
      let riskLevel: string;
      if (highCount >= 2 || totalCount >= 3) riskLevel = "HIGH";
      else if (highCount === 1 || totalCount === 2) riskLevel = "MEDIUM";
      else if (totalCount === 1) riskLevel = "LOW";
      else riskLevel = "NONE";

      return {
        id: c.id,
        name: c.name,
        country: c.country,
        plan: c.plan,
        subscriptionStatus: c.subscriptionStatus,
        businessType: c.businessType,
        createdAt: c.createdAt,
        isActive: c.isActive,
        fraudRisk: riskLevel,
        flaggedAt: c.flaggedAt,
        flagNote: c.flagNote,
        signals,
        stats: {
          loginCount: compLogins.length,
          countriesLast7d: countries.size,
          invoicesLast30d: compInvoices.length,
          totalInvoiceAmount: totalInvoiceAmount,
          maxTxPerDay: maxPerDay,
          accountAgeDays: Math.ceil(ageDays),
        },
      };
    });

    // Sort: HIGH first, then MEDIUM, then LOW, NONE last; within same level sort by signal count desc
    const ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2, NONE: 3 };
    results.sort((a, b) => {
      const levelDiff = (ORDER[a.fraudRisk as keyof typeof ORDER] ?? 3) - (ORDER[b.fraudRisk as keyof typeof ORDER] ?? 3);
      if (levelDiff !== 0) return levelDiff;
      return b.signals.length - a.signals.length;
    });

    const summary = {
      total: results.length,
      high: results.filter(r => r.fraudRisk === "HIGH").length,
      medium: results.filter(r => r.fraudRisk === "MEDIUM").length,
      low: results.filter(r => r.fraudRisk === "LOW").length,
      flagged: results.filter(r => r.signals.some(s => s.code === "MANUAL_FLAG")).length,
    };

    return NextResponse.json({ summary, companies: results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
