import { prisma } from "@/lib/prisma";

/**
 * FinovaOS's own sales ledger — see the `PlatformInvoice` model docs.
 *
 * Everything that collects money for a subscription funnels through
 * `recordPlatformInvoice` so there is exactly one place that allocates an
 * invoice number, and so the number is allocated once and never recomputed.
 */

/**
 * The per-year sequence starts here rather than at 1. A number that reads
 * "INV-2026-000002" tells every customer they are the second sale ever made;
 * starting mid-range keeps invoice volume private, which is why almost every
 * business does it. Six digits throughout also keeps the number's textual sort
 * identical to its numeric one, which `nextInvoiceNumber` relies on.
 */
const SEQ_START = 100001;
const SEQ_WIDTH = 6;
const NUMBER_PREFIX = "INV";

export type PlatformInvoiceInput = {
  companyId: string;
  companyName?: string | null;

  provider: "LEMONSQUEEZY" | "SAFEPAY" | "STRIPE" | "MANUAL";
  /** Idempotency key — the provider's own id for this charge. */
  providerEventId?: string | null;
  providerOrderId?: string | null;
  providerSubscriptionId?: string | null;

  plan: string;
  billingCycle?: string | null;

  currency: string;
  /** Line total before discount and tax. Defaults to `total` when unknown. */
  subtotal?: number | null;
  discount?: number | null;
  taxRate?: number | null;
  taxAmount?: number | null;
  taxName?: string | null;
  /** What the card was actually charged. */
  total: number;

  customerName?: string | null;
  customerEmail?: string | null;
  customerCountry?: string | null;
  customerTaxId?: string | null;

  cardBrand?: string | null;
  cardLast4?: string | null;

  status?: string | null;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  issuedAt?: Date | null;
};

function formatInvoiceNumber(year: number, seq: number) {
  return `${NUMBER_PREFIX}-${year}-${String(seq).padStart(SEQ_WIDTH, "0")}`;
}

/**
 * Highest sequence issued so far this year, +1 — or SEQ_START for the year's
 * first invoice.
 *
 * Every sequence is the same width, so a lexicographic `desc` sort is also a
 * numeric one — no need to read every row to find the maximum.
 */
async function nextInvoiceNumber(year: number): Promise<string> {
  const last = await (prisma as any).platformInvoice.findFirst({
    where: { number: { startsWith: `${NUMBER_PREFIX}-${year}-` } },
    orderBy: { number: "desc" },
    select: { number: true },
  });

  const lastSeq = last?.number ? Number(String(last.number).split("-")[2]) : NaN;
  if (!Number.isFinite(lastSeq)) return formatInvoiceNumber(year, SEQ_START);
  // Guards a year whose only rows predate SEQ_START, so the sequence steps up
  // to the new range instead of colliding backwards into it.
  return formatInvoiceNumber(year, Math.max(lastSeq + 1, SEQ_START));
}

/**
 * Writes one invoice, allocating its number.
 *
 * Returns the existing row when `providerEventId` has already been recorded, so
 * a webhook retry is a no-op rather than a second invoice for one charge.
 * Returns null if the ledger table has not been migrated yet — callers treat
 * invoicing as best-effort so a missing table can never fail a payment webhook.
 */
export async function recordPlatformInvoice(input: PlatformInvoiceInput) {
  const issuedAt = input.issuedAt || new Date();
  const year = issuedAt.getFullYear();
  const total = Number(input.total) || 0;
  const subtotal = typeof input.subtotal === "number" ? input.subtotal : total;

  try {
    if (input.providerEventId) {
      const existing = await (prisma as any).platformInvoice.findUnique({
        where: { providerEventId: input.providerEventId },
      });
      if (existing) return existing;
    }

    const data = {
      companyId: input.companyId,
      companyName: input.companyName || null,
      provider: input.provider,
      providerEventId: input.providerEventId || null,
      providerOrderId: input.providerOrderId || null,
      providerSubscriptionId: input.providerSubscriptionId || null,
      plan: String(input.plan || "STARTER").toUpperCase(),
      billingCycle: String(input.billingCycle || "MONTHLY").toUpperCase(),
      currency: String(input.currency || "USD").toUpperCase(),
      subtotal,
      discount: Number(input.discount) || 0,
      taxRate: Number(input.taxRate) || 0,
      taxAmount: Number(input.taxAmount) || 0,
      taxName: input.taxName || null,
      total,
      customerName: input.customerName || null,
      customerEmail: input.customerEmail || null,
      customerCountry: input.customerCountry || null,
      customerTaxId: input.customerTaxId || null,
      cardBrand: input.cardBrand || null,
      cardLast4: input.cardLast4 || null,
      status: String(input.status || "PAID").toUpperCase(),
      periodStart: input.periodStart || null,
      periodEnd: input.periodEnd || null,
      issuedAt,
    };

    // Two concurrent webhooks can read the same "last" number, so the unique
    // index on `number` is the real guard — retry on the collision rather than
    // locking the table for what is a rare race.
    for (let attempt = 0; attempt < 6; attempt++) {
      const number = await nextInvoiceNumber(year);
      try {
        return await (prisma as any).platformInvoice.create({ data: { ...data, number } });
      } catch (e: any) {
        if (e?.code !== "P2002") throw e;
        // Lost the race on `providerEventId` — the other writer already
        // recorded this exact charge, so hand back their row.
        const target = String(e?.meta?.target || "");
        if (target.includes("providerEventId") && input.providerEventId) {
          const existing = await (prisma as any).platformInvoice.findUnique({
            where: { providerEventId: input.providerEventId },
          });
          if (existing) return existing;
        }
        // Otherwise it was the number — take the next one.
      }
    }
    return null;
  } catch (err) {
    console.error("[platformInvoice] Failed to record invoice:", err);
    return null;
  }
}

/**
 * Marks a recorded charge as refunded. Refunds are never deletions: the invoice
 * stays in the ledger with its number intact and its refunded amount recorded,
 * because a tax return already filed against it has to keep reconciling.
 */
export async function markPlatformInvoiceRefunded(params: {
  providerEventId?: string | null;
  providerOrderId?: string | null;
  providerSubscriptionId?: string | null;
  companyId?: string | null;
  amount: number;
}) {
  try {
    const or: any[] = [];
    if (params.providerEventId) or.push({ providerEventId: params.providerEventId });
    if (params.providerOrderId) or.push({ providerOrderId: params.providerOrderId });
    if (params.providerSubscriptionId && params.companyId) {
      or.push({ providerSubscriptionId: params.providerSubscriptionId, companyId: params.companyId });
    }
    if (or.length === 0) return null;

    const invoice = await (prisma as any).platformInvoice.findFirst({
      where: { OR: or, status: { not: "REFUNDED" } },
      orderBy: { issuedAt: "desc" },
    });
    if (!invoice) return null;

    const refundedAmount = Math.min(
      Number(invoice.total) || 0,
      (Number(invoice.refundedAmount) || 0) + (Number(params.amount) || 0),
    );

    return await (prisma as any).platformInvoice.update({
      where: { id: invoice.id },
      data: {
        refundedAmount,
        refundedAt: new Date(),
        status: refundedAmount >= (Number(invoice.total) || 0) ? "REFUNDED" : "PARTIALLY_REFUNDED",
      },
    });
  } catch (err) {
    console.error("[platformInvoice] Failed to mark refund:", err);
    return null;
  }
}

/** Invoices for one company, newest first. Empty when the table is missing. */
export async function listCompanyPlatformInvoices(companyId: string) {
  try {
    return await (prisma as any).platformInvoice.findMany({
      where: { companyId },
      orderBy: { issuedAt: "desc" },
      take: 200,
    });
  } catch {
    return [];
  }
}
