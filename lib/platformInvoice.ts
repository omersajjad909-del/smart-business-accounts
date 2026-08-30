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
 *
 * `strict` reverses that for callers where the invoice IS the job: an admin
 * writing one by hand has to be told it failed, not handed a silent null and a
 * success toast. Webhooks pass nothing and keep the swallowing behaviour.
 */
export async function recordPlatformInvoice(
  input: PlatformInvoiceInput,
  opts: { strict?: boolean } = {},
) {
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
    if (opts.strict) {
      throw new Error("Could not allocate an invoice number after 6 attempts — try again");
    }
    return null;
  } catch (err) {
    console.error("[platformInvoice] Failed to record invoice:", err);
    if (opts.strict) throw err;
    return null;
  }
}

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/** A typo ceiling. No single subscription line is worth more than this. */
const MAX_MANUAL_AMOUNT = 100_000_000;

export type ManualInvoiceInput = {
  companyId: string;
  companyName?: string | null;
  plan?: string | null;
  billingCycle?: string | null;
  currency?: string | null;
  /** The agreed line total, before discount and tax. */
  amount: number;
  discount?: number | null;
  /**
   * An agreed discount expressed the way the deal was — "50% off every month"
   * — rather than as a figure someone worked out by hand. Wins over `discount`
   * when both arrive. Kept as a percentage so the invoice can print the rate
   * next to the money, and so a plan price change does not silently turn a half
   * -price deal into something else.
   */
  discountPercent?: number | null;
  /** Percentage, e.g. 17 for 17%. */
  taxRate?: number | null;
  taxName?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerCountry?: string | null;
  customerTaxId?: string | null;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  issuedAt?: Date | null;
  /** PAID for money already received, OPEN for an invoice still to be settled. */
  status?: string | null;
  /**
   * Idempotency key, scoped to manual invoices. The same reference twice hands
   * back the first invoice instead of minting a second number — a double-click
   * on "Record invoice", or the same offline deal applied twice, must not put
   * two numbers in a ledger that a tax return is filed against.
   */
  reference?: string | null;
};

export type ManualInvoiceResult =
  | { ok: true; invoice: any; duplicate: boolean }
  | { ok: false; error: string; migrationRequired?: boolean };

/**
 * An invoice for money that never passed through a payment gateway.
 *
 * Offline deals — a three-year licence paid by bank transfer — leave no webhook
 * behind, so nothing was ever written to the ledger for them. The customer's
 * billing page then falls through to its derived row, which invents an invoice
 * from the plan's USD list price: a receipt that disagrees with what was
 * actually paid, in a currency that was never charged. Writing a real row here
 * is what stops that, because `getCompanyBillingContext` prefers the ledger
 * over anything it can derive.
 *
 * Tax is computed rather than accepted, so the stored breakdown always adds up:
 * subtotal − discount + tax = total.
 */
export async function createManualPlatformInvoice(
  input: ManualInvoiceInput,
): Promise<ManualInvoiceResult> {
  const companyId = String(input.companyId || "").trim();
  if (!companyId) return { ok: false, error: "companyId is required" };

  const amount = round2(Number(input.amount));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "amount must be greater than 0" };
  }
  if (amount > MAX_MANUAL_AMOUNT) {
    return { ok: false, error: `amount cannot exceed ${MAX_MANUAL_AMOUNT.toLocaleString()}` };
  }

  const hasPercent = input.discountPercent !== null && input.discountPercent !== undefined;
  const discountPercent = Number(input.discountPercent) || 0;
  if (hasPercent && (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100)) {
    return { ok: false, error: "discountPercent must be between 0 and 100" };
  }

  const discount = hasPercent
    ? round2((amount * discountPercent) / 100)
    : round2(Number(input.discount) || 0);
  if (discount < 0) return { ok: false, error: "discount cannot be negative" };
  if (discount > amount) return { ok: false, error: "discount cannot exceed the amount" };

  const taxRate = Number(input.taxRate) || 0;
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
    return { ok: false, error: "taxRate must be between 0 and 100" };
  }

  const currency = String(input.currency || "USD").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    return { ok: false, error: "currency must be a 3-letter code, e.g. PKR or USD" };
  }

  const status = String(input.status || "PAID").trim().toUpperCase();
  if (status !== "PAID" && status !== "OPEN") {
    return { ok: false, error: "status must be PAID or OPEN" };
  }

  const periodStart = input.periodStart ?? null;
  const periodEnd = input.periodEnd ?? null;
  for (const [label, d] of [["periodStart", periodStart], ["periodEnd", periodEnd], ["issuedAt", input.issuedAt ?? null]] as const) {
    if (d && Number.isNaN(d.getTime())) return { ok: false, error: `${label} is not a real date` };
  }
  if (periodStart && periodEnd && periodEnd.getTime() < periodStart.getTime()) {
    return { ok: false, error: "periodEnd cannot be before periodStart" };
  }

  const taxable = round2(amount - discount);
  const taxAmount = round2((taxable * taxRate) / 100);
  const total = round2(taxable + taxAmount);

  const reference = String(input.reference || "").trim();
  const providerEventId = reference ? `manual:${reference}` : null;

  try {
    if (providerEventId) {
      const existing = await (prisma as any).platformInvoice.findUnique({ where: { providerEventId } });
      if (existing) return { ok: true, invoice: existing, duplicate: true };
    }

    const invoice = await recordPlatformInvoice(
      {
        companyId,
        companyName: input.companyName || null,
        provider: "MANUAL",
        providerEventId,
        plan: String(input.plan || "STARTER").toUpperCase(),
        billingCycle: String(input.billingCycle || "YEARLY").toUpperCase(),
        currency,
        subtotal: amount,
        discount,
        taxRate,
        taxAmount,
        taxName: input.taxName || (taxRate > 0 ? "Sales Tax" : null),
        total,
        customerName: input.customerName || null,
        customerEmail: input.customerEmail || null,
        customerCountry: input.customerCountry || null,
        customerTaxId: input.customerTaxId || null,
        status,
        periodStart,
        periodEnd,
        issuedAt: input.issuedAt || new Date(),
      },
      { strict: true },
    );

    if (!invoice) return { ok: false, error: "Invoice was not written" };
    return { ok: true, invoice, duplicate: false };
  } catch (e: any) {
    // The ledger ships as a manual migration, so "table missing" is a real
    // possibility on an environment that has not had it pasted in yet. Say so
    // by name instead of returning a generic failure the admin cannot act on.
    const message = String(e?.message || "");
    if (e?.code === "P2021" || message.includes("does not exist")) {
      return {
        ok: false,
        migrationRequired: true,
        error: "PlatformInvoice table not found — run prisma/migrations/manual_platform_invoices.sql",
      };
    }
    return { ok: false, error: message || "Failed to create invoice" };
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
