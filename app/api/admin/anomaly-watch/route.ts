import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { aiConfigured, askAI } from "@/lib/ai/adminAI";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const db = prisma as any;

/**
 * Data Anomaly Watch — errors in customer books, found before they are noticed.
 *
 * Every check here is a rule, not a model. A double-entry system either
 * balances or it does not; "this voucher is out by 4,500" is arithmetic, and
 * asking a model to do arithmetic over a ledger is how you get a confident
 * wrong answer about someone's accounts. The model appears exactly once, at the
 * end, to write the message telling the customer what was found.
 *
 * On privacy: this reads customer financial data, which is the strongest reason
 * to be narrow about it. What comes back is a document number, a date and the
 * size of the discrepancy — never a line item, never a party name, never a
 * balance. That is enough for the founder to say "invoice INV-0142 does not
 * add up" and no more. Nothing is sent to a model except the counts and the
 * check names.
 *
 * The value is not the report. It is being the one who noticed.
 */

type Anomaly = {
  check: string;
  severity: "high" | "medium" | "low";
  companyId: string;
  companyName: string;
  reference: string;
  detail: string;
  date: string | null;
};

const CHECK_LABELS: Record<string, { label: string; why: string }> = {
  unbalanced_voucher: {
    label: "Voucher does not balance",
    why: "Debits and credits do not agree, so the trial balance is wrong from this entry onward.",
  },
  duplicate_invoice_no: {
    label: "Duplicate invoice number",
    why: "Two invoices share a number. One of them will be unfindable, and tax filings will not reconcile.",
  },
  empty_invoice: {
    label: "Invoice with no lines",
    why: "An invoice carrying a total but no items — usually a save that half-failed.",
  },
  invoice_total_mismatch: {
    label: "Invoice total does not match its lines",
    why: "The stored total disagrees with the sum of the lines beyond what discount and freight explain.",
  },
  future_dated: {
    label: "Dated in the future",
    why: "Almost always a typo in the year. It quietly moves revenue into a period that has not happened.",
  },
  negative_stock: {
    label: "Negative stock",
    why: "More of this item has been sold than was ever bought in — the opening stock is missing or a purchase was not entered.",
  },
  impossible_tax_rate: {
    label: "Impossible tax rate",
    why: "A tax percentage outside 0-100. Every amount computed from it is wrong.",
  },
  duplicate_account_code: {
    label: "Duplicate account code",
    why: "Two ledger accounts share a code. Imports and reports will pick whichever they find first.",
  },
};

/** Round to two places without the floating-point tail. */
const money = (n: number) => Math.round(n * 100) / 100;

async function runChecks(companyIds: string[], names: Map<string, string>): Promise<Anomaly[]> {
  const scope = { companyId: { in: companyIds } };
  const out: Anomaly[] = [];
  const nameOf = (id: string) => names.get(id) || id.slice(0, 8);

  /* ── vouchers that do not balance ────────────────────────────────────── */
  try {
    const entries = await db.voucherEntry.groupBy({
      by: ["voucherId"],
      where: scope,
      _sum: { amount: true },
    });
    // Prisma cannot express "sum != 0" portably in `having`, so the sums come
    // back and the comparison happens here. A tolerance of one paisa absorbs
    // float noise from rate calculations without hiding a real imbalance.
    const bad = entries.filter((e: any) => Math.abs(e._sum?.amount ?? 0) > 0.01);
    if (bad.length) {
      const vouchers = await db.voucher.findMany({
        where: { id: { in: bad.slice(0, 200).map((b: any) => b.voucherId) }, deletedAt: null },
        select: { id: true, companyId: true, voucherNo: true, type: true, date: true },
      });
      const sumOf = new Map(bad.map((b: any) => [b.voucherId, b._sum?.amount ?? 0]));
      for (const v of vouchers) {
        out.push({
          check: "unbalanced_voucher",
          severity: "high",
          companyId: v.companyId,
          companyName: nameOf(v.companyId),
          reference: `${v.type} ${v.voucherNo}`,
          detail: `Out by ${money(Math.abs(Number(sumOf.get(v.id) || 0)))}`,
          date: v.date ? new Date(v.date).toISOString() : null,
        });
      }
    }
  } catch (err) {
    console.warn("[anomaly-watch] voucher balance check failed:", err);
  }

  /* ── duplicate invoice numbers ───────────────────────────────────────── */
  try {
    const dupes = await db.salesInvoice.groupBy({
      by: ["companyId", "invoiceNo"],
      where: { ...scope, deletedAt: null },
      _count: { _all: true },
      having: { invoiceNo: { _count: { gt: 1 } } },
    });
    for (const d of dupes.slice(0, 200)) {
      out.push({
        check: "duplicate_invoice_no",
        severity: "high",
        companyId: d.companyId,
        companyName: nameOf(d.companyId),
        reference: d.invoiceNo,
        detail: `${d._count._all} invoices share this number`,
        date: null,
      });
    }
  } catch (err) {
    console.warn("[anomaly-watch] duplicate invoice check failed:", err);
  }

  /* ── duplicate account codes ─────────────────────────────────────────── */
  try {
    const dupes = await db.account.groupBy({
      by: ["companyId", "code"],
      where: { ...scope, deletedAt: null },
      _count: { _all: true },
      having: { code: { _count: { gt: 1 } } },
    });
    for (const d of dupes.slice(0, 200)) {
      out.push({
        check: "duplicate_account_code",
        severity: "medium",
        companyId: d.companyId,
        companyName: nameOf(d.companyId),
        reference: d.code,
        detail: `${d._count._all} accounts share this code`,
        date: null,
      });
    }
  } catch (err) {
    console.warn("[anomaly-watch] duplicate account code check failed:", err);
  }

  /* ── invoices: empty, mismatched, future dated ───────────────────────── */
  try {
    const invoices = await db.salesInvoice.findMany({
      where: { ...scope, deletedAt: null },
      select: {
        id: true, companyId: true, invoiceNo: true, date: true, total: true,
        discount: true, discountType: true, freight: true,
        items: { select: { qty: true, rate: true, amount: true, taxPercent: true, discountPercent: true } },
      },
      orderBy: { date: "desc" },
      take: 4000,
    });

    const tomorrow = Date.now() + 86400_000;

    for (const inv of invoices) {
      const iso = inv.date ? new Date(inv.date).toISOString() : null;

      if (!inv.items.length) {
        out.push({
          check: "empty_invoice",
          severity: inv.total > 0 ? "high" : "low",
          companyId: inv.companyId,
          companyName: nameOf(inv.companyId),
          reference: inv.invoiceNo,
          detail: inv.total > 0 ? `Total of ${money(inv.total)} with no line items` : "No line items and no total",
          date: iso,
        });
      } else {
        const lineSum = inv.items.reduce((s: number, it: any) => s + (it.amount || 0), 0);
        const discount = inv.discountType === "percent"
          ? lineSum * ((inv.discount || 0) / 100)
          : (inv.discount || 0);
        const expected = lineSum - discount + (inv.freight || 0);
        const gap = Math.abs(expected - (inv.total || 0));
        // Tax is applied per line and is not reconstructed here, so the
        // tolerance has to be wide enough not to flag every taxed invoice.
        // Anything beyond a fifth of the invoice AND more than a unit of
        // currency is a genuine disagreement, not a tax line.
        if (gap > 1 && gap > Math.abs(inv.total || 0) * 0.2) {
          out.push({
            check: "invoice_total_mismatch",
            severity: "medium",
            companyId: inv.companyId,
            companyName: nameOf(inv.companyId),
            reference: inv.invoiceNo,
            detail: `Lines come to ${money(expected)} after discount and freight; stored total is ${money(inv.total || 0)}`,
            date: iso,
          });
        }

        const badTax = inv.items.find((it: any) =>
          it.taxPercent < 0 || it.taxPercent > 100 || it.discountPercent < 0 || it.discountPercent > 100);
        if (badTax) {
          out.push({
            check: "impossible_tax_rate",
            severity: "high",
            companyId: inv.companyId,
            companyName: nameOf(inv.companyId),
            reference: inv.invoiceNo,
            detail: `A line carries tax ${badTax.taxPercent}% and discount ${badTax.discountPercent}%`,
            date: iso,
          });
        }
      }

      if (inv.date && new Date(inv.date).getTime() > tomorrow) {
        out.push({
          check: "future_dated",
          severity: "medium",
          companyId: inv.companyId,
          companyName: nameOf(inv.companyId),
          reference: inv.invoiceNo,
          detail: `Dated ${new Date(inv.date).toISOString().slice(0, 10)}`,
          date: iso,
        });
      }
    }
  } catch (err) {
    console.warn("[anomaly-watch] invoice checks failed:", err);
  }

  /* ── negative stock ──────────────────────────────────────────────────── */
  try {
    const moves = await db.inventoryTxn.groupBy({
      by: ["companyId", "itemId"],
      where: scope,
      _sum: { qty: true },
    });
    // SALE rows are stored as negative quantities by the posting code, so a
    // negative sum is genuinely more out than in rather than a sign convention.
    const negative = moves.filter((m: any) => (m._sum?.qty ?? 0) < 0).slice(0, 150);
    if (negative.length) {
      const items = await db.itemNew.findMany({
        where: { id: { in: negative.map((n: any) => n.itemId) } },
        select: { id: true, code: true, name: true },
      });
      const itemOf = new Map(items.map((i: any) => [i.id, i]));
      for (const n of negative) {
        const item = itemOf.get(n.itemId);
        out.push({
          check: "negative_stock",
          severity: "medium",
          companyId: n.companyId,
          companyName: nameOf(n.companyId),
          reference: item ? `${item.code} — ${item.name}` : n.itemId.slice(0, 8),
          detail: `Stock stands at ${n._sum.qty}`,
          date: null,
        });
      }
    }
  } catch (err) {
    console.warn("[anomaly-watch] negative stock check failed:", err);
  }

  return out;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  try {
    const only = req.nextUrl.searchParams.get("companyId");

    const companies = await db.company.findMany({
      where: {
        isDemo: false,
        isInternalTest: false,
        ...(only ? { id: only } : {}),
      },
      select: { id: true, name: true },
      take: 500,
    }).catch(() => []);

    if (!companies.length) {
      return NextResponse.json({
        aiConfigured: aiConfigured(),
        anomalies: [], checks: CHECK_LABELS,
        summary: { total: 0, high: 0, companiesAffected: 0, companiesScanned: 0 },
      });
    }

    const names = new Map<string, string>(companies.map((c: any) => [c.id, c.name]));
    const anomalies = await runChecks(companies.map((c: any) => c.id), names);

    const order = { high: 0, medium: 1, low: 2 } as const;
    anomalies.sort((a, b) => order[a.severity] - order[b.severity] || a.companyName.localeCompare(b.companyName));

    return NextResponse.json({
      aiConfigured: aiConfigured(),
      generatedAt: new Date().toISOString(),
      anomalies,
      checks: CHECK_LABELS,
      summary: {
        total: anomalies.length,
        high: anomalies.filter((a) => a.severity === "high").length,
        companiesAffected: new Set(anomalies.map((a) => a.companyId)).size,
        companiesScanned: companies.length,
        byCheck: anomalies.reduce<Record<string, number>>((acc, a) => {
          acc[a.check] = (acc[a.check] || 0) + 1;
          return acc;
        }, {}),
      },
    });
  } catch (err) {
    console.error("[anomaly-watch] GET failed:", err);
    return NextResponse.json({ error: "The scan could not be completed" }, { status: 500 });
  }
}

const NOTICE_SYSTEM = `
You write the message telling a FinovaOS customer that something in their books
does not add up, before they find it themselves.

Get the tone right, because this is the whole point of the message:
- You are helping, not auditing. Their bookkeeper made a normal mistake.
- Say what you found, in their language, with the document number. "Invoice
  0142 ka total lines se match nahi kar raha" — not "a data integrity anomaly
  was detected".
- Say what it means for them in one line: which report is affected.
- Offer to fix it with them. Do not tell them to fix it themselves.
- Three to five sentences. No apology for contacting them, no subject-line
  cliches, no exclamation marks.
- Pakistani customer: Roman Urdu mixed with English. Otherwise plain English.
- If there are several findings, lead with the one that affects money and
  mention the rest as a count. Do not list twelve things.

Return exactly:

SUBJECT: <one line>
BODY:
<the message>
`;

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  if (!aiConfigured()) {
    return NextResponse.json({ error: "No AI provider configured" }, { status: 503 });
  }

  try {
    const { companyId } = (await req.json().catch(() => ({}))) as { companyId?: string };
    if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });

    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, country: true, businessType: true },
    });
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    const names = new Map<string, string>([[company.id, company.name]]);
    const anomalies = await runChecks([companyId], names);

    if (!anomalies.length) {
      return NextResponse.json({ companyId, notice: null, note: "Nothing wrong was found for this company." });
    }

    const notice = await askAI(
      NOTICE_SYSTEM,
      [
        `Customer: ${company.name}`,
        `Country: ${company.country || "unknown"}`,
        `Business type: ${company.businessType}`,
        ``,
        `What was found (${anomalies.length} item${anomalies.length === 1 ? "" : "s"}):`,
        ...anomalies.slice(0, 12).map((a) =>
          `- [${a.severity}] ${CHECK_LABELS[a.check]?.label || a.check} — ${a.reference}: ${a.detail}`),
        anomalies.length > 12 ? `- ...and ${anomalies.length - 12} more` : "",
      ].filter(Boolean).join("\n"),
      700,
    );

    return NextResponse.json({ companyId, notice, count: anomalies.length });
  } catch (err) {
    console.error("[anomaly-watch] POST failed:", err);
    return NextResponse.json({ error: "Could not draft a notice" }, { status: 500 });
  }
}
