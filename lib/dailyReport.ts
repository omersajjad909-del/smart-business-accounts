import { prisma } from "@/lib/prisma";
import { ledgerPL, ledgerPositions } from "@/lib/ledgerKpis";
import { sendEmail, emailBase } from "@/lib/email";
import { sendWhatsApp } from "@/lib/whatsapp";
import { sendSms } from "@/lib/sms";
import {
  getDailyReportSettings,
  markDailyReportSent,
  type DailyReportSettings,
} from "@/lib/dailyReportSettings";

// ─── Time helpers ─────────────────────────────────────────────────────────────

/** Local calendar parts of `d` in `tz`. */
function localParts(d: Date, tz: string) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(d);
  const g = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return { y: g("year"), mo: g("month"), d: g("day"), h: g("hour"), mi: g("minute"), s: g("second") };
}

export function localDateString(d: Date, tz: string) {
  const { y, mo, d: day } = localParts(d, tz);
  return `${y}-${String(mo).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Real instant at which local midnight of `ymd` happens in `tz`. */
function startOfLocalDay(ymd: string, tz: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d);
  const lp = localParts(new Date(guess), tz);
  const asLocal = Date.UTC(lp.y, lp.mo - 1, lp.d, lp.h, lp.mi, lp.s);
  return new Date(guess - (asLocal - guess));
}

/** True once the company's local clock has passed its configured send time. */
export function isDue(settings: DailyReportSettings, now = new Date()) {
  const lp = localParts(now, settings.timezone);
  const [h, m] = settings.sendTime.split(":").map(Number);
  return lp.h * 60 + lp.mi >= h * 60 + m;
}

// ─── Report data ──────────────────────────────────────────────────────────────

export type DailyReport = {
  company: string;
  currency: string;
  date: string; // local YYYY-MM-DD
  sales: { total: number; count: number; yesterday: number; changePct: number | null };
  received: { total: number; count: number; byMode: Record<string, number> };
  purchases: { total: number; count: number };
  expenses: { total: number; count: number };
  profitToday: number;
  position: { cash: number; receivables: number; payables: number; overdue: number; overdueCount: number; stockValue: number };
  topCustomers: Array<{ name: string; total: number }>;
  topItems: Array<{ name: string; qty: number; amount: number }>;
  lowStock: { count: number; items: string[] };
};

const n = (v: unknown) => Number(v || 0);
const round2 = (v: number) => Math.round(v * 100) / 100;

export async function buildDailyReport(companyId: string, timezone: string, now = new Date()): Promise<DailyReport> {
  const date = localDateString(now, timezone);
  const start = startOfLocalDay(date, timezone);
  const end = new Date(start.getTime() + 86_400_000);
  const prevStart = new Date(start.getTime() - 86_400_000);

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true, baseCurrency: true },
  });

  const [
    [salesRow],
    [prevSalesRow],
    receipts,
    [purchRow],
    [expRow],
    pl,
    positions,
    [stockRow],
    topCustomers,
    topItems,
    lowStockRows,
  ] = await Promise.all([
    prisma.$queryRaw<[{ total: number; count: bigint }]>`
      SELECT COALESCE(SUM(COALESCE(ct."amountInBase", si."total")), 0)::float AS total, COUNT(si."id") AS count
      FROM "SalesInvoice" si
      LEFT JOIN "CurrencyTransaction" ct ON ct."transactionId" = si."id" AND ct."transactionType" = 'INVOICE'
      WHERE si."companyId" = ${companyId} AND si."deletedAt" IS NULL AND si."date" >= ${start} AND si."date" < ${end}
    `,
    prisma.$queryRaw<[{ total: number }]>`
      SELECT COALESCE(SUM(COALESCE(ct."amountInBase", si."total")), 0)::float AS total
      FROM "SalesInvoice" si
      LEFT JOIN "CurrencyTransaction" ct ON ct."transactionId" = si."id" AND ct."transactionType" = 'INVOICE'
      WHERE si."companyId" = ${companyId} AND si."deletedAt" IS NULL AND si."date" >= ${prevStart} AND si."date" < ${start}
    `,
    prisma.paymentReceipt.groupBy({
      by: ["paymentMode"],
      where: { companyId, deletedAt: null, approvalStatus: { not: "REJECTED" }, date: { gte: start, lt: end } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.$queryRaw<[{ total: number; count: bigint }]>`
      SELECT COALESCE(SUM("total"), 0)::float AS total, COUNT("id") AS count
      FROM "PurchaseInvoice"
      WHERE "companyId" = ${companyId} AND "deletedAt" IS NULL AND "date" >= ${start} AND "date" < ${end}
    `,
    prisma.$queryRaw<[{ total: number; count: bigint }]>`
      SELECT COALESCE(SUM("totalAmount"), 0)::float AS total, COUNT("id") AS count
      FROM "ExpenseVoucher"
      WHERE "companyId" = ${companyId} AND "deletedAt" IS NULL AND "date" >= ${start} AND "date" < ${end}
    `,
    ledgerPL(companyId, null, start, new Date(end.getTime() - 1)),
    ledgerPositions(companyId, null, now),
    prisma.$queryRaw<[{ total: number }]>`
      SELECT COALESCE(SUM(GREATEST(COALESCE(stock.qty, 0), 0) * i."purchaseRate"), 0)::float AS total
      FROM "ItemNew" i
      LEFT JOIN (
        SELECT "itemId", COALESCE(SUM("qty"), 0)::float AS qty FROM "InventoryTxn"
        WHERE "companyId" = ${companyId} GROUP BY "itemId"
      ) stock ON stock."itemId" = i."id"
      WHERE i."companyId" = ${companyId} AND i."deletedAt" IS NULL
    `,
    prisma.$queryRaw<Array<{ name: string; total: number }>>`
      SELECT a."name", COALESCE(SUM(COALESCE(ct."amountInBase", si."total")), 0)::float AS total
      FROM "SalesInvoice" si
      JOIN "Account" a ON a."id" = si."customerId"
      LEFT JOIN "CurrencyTransaction" ct ON ct."transactionId" = si."id" AND ct."transactionType" = 'INVOICE'
      WHERE si."companyId" = ${companyId} AND si."deletedAt" IS NULL AND si."date" >= ${start} AND si."date" < ${end}
      GROUP BY a."name" ORDER BY total DESC LIMIT 3
    `,
    prisma.$queryRaw<Array<{ name: string; qty: number; amount: number }>>`
      SELECT i."name", COALESCE(SUM(sii."qty"), 0)::float AS qty, COALESCE(SUM(sii."amount"), 0)::float AS amount
      FROM "SalesInvoiceItem" sii
      JOIN "SalesInvoice" si ON si."id" = sii."invoiceId"
      JOIN "ItemNew" i ON i."id" = sii."itemId"
      WHERE si."companyId" = ${companyId} AND si."deletedAt" IS NULL AND si."date" >= ${start} AND si."date" < ${end}
      GROUP BY i."name" ORDER BY amount DESC LIMIT 3
    `,
    prisma.$queryRaw<Array<{ name: string }>>`
      SELECT i."name"
      FROM "ItemNew" i
      LEFT JOIN (
        SELECT "itemId", COALESCE(SUM("qty"), 0)::float AS qty FROM "InventoryTxn"
        WHERE "companyId" = ${companyId} GROUP BY "itemId"
      ) stock ON stock."itemId" = i."id"
      WHERE i."companyId" = ${companyId} AND i."deletedAt" IS NULL
        AND i."minStock" > 0 AND COALESCE(stock.qty, 0) < i."minStock"
      ORDER BY i."name" ASC
    `,
  ]);

  const salesTotal = n(salesRow?.total);
  const prevTotal = n(prevSalesRow?.total);
  const byMode: Record<string, number> = {};
  let recTotal = 0;
  let recCount = 0;
  for (const r of receipts) {
    const amt = n(r._sum.amount);
    byMode[r.paymentMode] = round2(amt);
    recTotal += amt;
    recCount += r._count._all;
  }

  return {
    company: company?.name || "Your business",
    currency: company?.baseCurrency || "PKR",
    date,
    sales: {
      total: round2(salesTotal),
      count: Number(salesRow?.count || 0),
      yesterday: round2(prevTotal),
      changePct: prevTotal > 0 ? round2(((salesTotal - prevTotal) / prevTotal) * 100) : null,
    },
    received: { total: round2(recTotal), count: recCount, byMode },
    purchases: { total: round2(n(purchRow?.total)), count: Number(purchRow?.count || 0) },
    expenses: { total: round2(n(expRow?.total)), count: Number(expRow?.count || 0) },
    profitToday: pl.profit,
    position: {
      cash: positions.cashBalance,
      receivables: positions.receivables,
      payables: positions.payables,
      overdue: positions.overdueAmount,
      overdueCount: positions.overdueCount,
      stockValue: round2(n(stockRow?.total)),
    },
    topCustomers: topCustomers.map((r) => ({ name: r.name, total: round2(n(r.total)) })),
    topItems: topItems.map((r) => ({ name: r.name, qty: n(r.qty), amount: round2(n(r.amount)) })),
    lowStock: { count: lowStockRows.length, items: lowStockRows.slice(0, 5).map((r) => r.name) },
  };
}

// ─── Formatting ───────────────────────────────────────────────────────────────

const money = (v: number, cur: string) =>
  `${cur} ${Math.round(v).toLocaleString("en-US")}`;

export function formatReportText(r: DailyReport): string {
  const m = (v: number) => money(v, r.currency);
  const arrow = r.sales.changePct === null ? "" : ` (${r.sales.changePct >= 0 ? "▲" : "▼"} ${Math.abs(r.sales.changePct)}% vs yesterday)`;
  const lines = [
    `📊 *Daily Report — ${r.company}*`,
    `📅 ${r.date}`,
    ``,
    `💰 *Sales:* ${m(r.sales.total)} (${r.sales.count} invoices)${arrow}`,
    `📥 *Received:* ${m(r.received.total)} (${r.received.count} receipts)`,
    ...Object.entries(r.received.byMode).map(([k, v]) => `   • ${k}: ${m(v)}`),
    `🛒 *Purchases:* ${m(r.purchases.total)} (${r.purchases.count})`,
    `💸 *Expenses:* ${m(r.expenses.total)} (${r.expenses.count})`,
    `📈 *Profit today:* ${m(r.profitToday)}`,
    ``,
    `🏦 *Cash/Bank balance:* ${m(r.position.cash)}`,
    `⏳ *Receivable (to collect):* ${m(r.position.receivables)}`,
    `📤 *Payable (to pay):* ${m(r.position.payables)}`,
    `🚨 *Overdue:* ${m(r.position.overdue)} (${r.position.overdueCount})`,
    `📦 *Stock value:* ${m(r.position.stockValue)}`,
  ];
  if (r.topCustomers.length) {
    lines.push(``, `🏆 *Top customers*`, ...r.topCustomers.map((c, i) => `${i + 1}. ${c.name} — ${m(c.total)}`));
  }
  if (r.topItems.length) {
    lines.push(``, `🔥 *Top items*`, ...r.topItems.map((c, i) => `${i + 1}. ${c.name} — ${c.qty} (${m(c.amount)})`));
  }
  if (r.lowStock.count) {
    lines.push(``, `⚠️ *Low stock (${r.lowStock.count}):* ${r.lowStock.items.join(", ")}${r.lowStock.count > r.lowStock.items.length ? "…" : ""}`);
  }
  if (!r.sales.count && !r.received.count && !r.expenses.count && !r.purchases.count) {
    lines.push(``, `ℹ️ No transactions were recorded today.`);
  }
  lines.push(``, `— FinovaOS`);
  return lines.join("\n");
}

/** SMS: short plain text, no emoji/markdown. */
export function formatReportSms(r: DailyReport): string {
  const m = (v: number) => money(v, r.currency);
  return (
    `${r.company} ${r.date}: Sales ${m(r.sales.total)} (${r.sales.count}), Received ${m(r.received.total)}, ` +
    `Expenses ${m(r.expenses.total)}, Profit ${m(r.profitToday)}. Cash ${m(r.position.cash)}, ` +
    `Receivable ${m(r.position.receivables)}, Payable ${m(r.position.payables)}.`
  );
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

export function formatReportHtml(r: DailyReport): string {
  const m = (v: number) => esc(money(v, r.currency));
  const row = (label: string, value: string, sub = "") =>
    `<tr><td style="padding:9px 0;border-bottom:1px solid #eee;color:#555">${label}${sub ? `<div style="font-size:11px;color:#999">${sub}</div>` : ""}</td>` +
    `<td style="padding:9px 0;border-bottom:1px solid #eee;text-align:right;font-weight:700;color:#111">${value}</td></tr>`;
  const head = (t: string) =>
    `<h3 style="margin:22px 0 6px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#b45309">${t}</h3>`;
  const change = r.sales.changePct === null ? "" : `${r.sales.changePct >= 0 ? "▲" : "▼"} ${Math.abs(r.sales.changePct)}% vs yesterday`;

  const body = `
    <p style="margin:0 0 4px;color:#555">End-of-day summary for <b>${esc(r.date)}</b></p>
    ${head("Today")}
    <table style="width:100%;border-collapse:collapse">
      ${row("Sales", m(r.sales.total), `${r.sales.count} invoices · ${change}`)}
      ${row("Received", m(r.received.total), `${r.received.count} receipts` + Object.entries(r.received.byMode).map(([k, v]) => ` · ${esc(k)} ${m(v)}`).join(""))}
      ${row("Purchases", m(r.purchases.total), `${r.purchases.count} invoices`)}
      ${row("Expenses", m(r.expenses.total), `${r.expenses.count} vouchers`)}
      ${row("Profit today", m(r.profitToday))}
    </table>
    ${head("Business position")}
    <table style="width:100%;border-collapse:collapse">
      ${row("Cash &amp; bank balance", m(r.position.cash))}
      ${row("Receivable (to collect)", m(r.position.receivables))}
      ${row("Payable (to pay)", m(r.position.payables))}
      ${row("Overdue receivable", m(r.position.overdue), `${r.position.overdueCount} bills`)}
      ${row("Stock value", m(r.position.stockValue))}
    </table>
    ${r.topCustomers.length ? head("Top customers today") + `<table style="width:100%;border-collapse:collapse">${r.topCustomers.map((c) => row(esc(c.name), m(c.total))).join("")}</table>` : ""}
    ${r.topItems.length ? head("Top items today") + `<table style="width:100%;border-collapse:collapse">${r.topItems.map((c) => row(esc(c.name), m(c.amount), `${c.qty} sold`)).join("")}</table>` : ""}
    ${r.lowStock.count ? head(`Low stock (${r.lowStock.count})`) + `<p style="margin:0;color:#b91c1c">${r.lowStock.items.map(esc).join(", ")}${r.lowStock.count > r.lowStock.items.length ? " …" : ""}</p>` : ""}
  `;
  return emailBase({ companyName: esc(r.company), badgeText: "Daily Report", badgeColor: "#b45309", content: body });
}

// ─── Delivery ─────────────────────────────────────────────────────────────────

export type DeliveryResult = { channel: "whatsapp" | "sms" | "email"; to: string; ok: boolean; error?: string };

export async function deliverDailyReport(
  companyId: string,
  settings: DailyReportSettings,
  report: DailyReport,
): Promise<DeliveryResult[]> {
  const out: DeliveryResult[] = [];
  const text = formatReportText(report);

  if (settings.whatsapp) {
    for (const to of settings.phones) {
      const res = await sendWhatsApp(companyId, { to, type: "text", text });
      out.push({ channel: "whatsapp", to, ok: res.success, error: res.error });
    }
  }
  if (settings.sms) {
    const sms = formatReportSms(report);
    for (const to of settings.phones) {
      const res = await sendSms({ to, message: sms });
      out.push({ channel: "sms", to, ok: res.success, error: res.error });
    }
  }
  if (settings.email && settings.emails.length) {
    const res = await sendEmail({
      to: settings.emails,
      subject: `📊 Daily Report ${report.date} — ${report.company}`,
      html: formatReportHtml(report),
      text: text.replace(/\*/g, ""),
    });
    out.push({ channel: "email", to: settings.emails.join(", "), ok: res.success, error: res.error });
  }
  return out;
}

/**
 * Build + send one company's report. Idempotent per local day unless `force`
 * (the "send test now" button), so an hourly cron can never double-send.
 */
export async function runDailyReportForCompany(companyId: string, opts: { force?: boolean } = {}) {
  const settings = await getDailyReportSettings(companyId);
  if (!opts.force) {
    if (!settings.enabled) return { skipped: "disabled" as const };
    if (!isDue(settings)) return { skipped: "not-due" as const };
    if (settings.lastSentDate === localDateString(new Date(), settings.timezone)) {
      return { skipped: "already-sent" as const };
    }
  }
  if (!settings.phones.length && !settings.emails.length) return { skipped: "no-recipients" as const };

  const report = await buildDailyReport(companyId, settings.timezone);
  const results = await deliverDailyReport(companyId, settings, report);
  const okCount = results.filter((r) => r.ok).length;

  // A fully failed run is left unmarked so the next cron tick retries it;
  // a test send must not consume the real evening report.
  if (!opts.force && okCount > 0) {
    await markDailyReportSent(companyId, report.date, `sent ${okCount}/${results.length}`);
  } else if (!opts.force) {
    await prisma.activityLog.create({
      data: { action: "DAILY_REPORT_FAILED", companyId, details: JSON.stringify(results) },
    }).catch(() => {});
  }
  if (okCount > 0) {
    await prisma.activityLog.create({
      data: { action: opts.force ? "DAILY_REPORT_TEST" : "DAILY_REPORT_SENT", companyId, details: JSON.stringify(results) },
    }).catch(() => {});
  }
  return { report, results, okCount };
}
