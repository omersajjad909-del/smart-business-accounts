/**
 * Backfills the PlatformInvoice ledger from historical payment logs.
 *
 * Before the ledger existed, receipts were reconstructed on the fly from
 * ActivityLog rows and numbered by position in a per-company list — so every
 * company's first payment was "INV-2026-001" and numbers shifted as new
 * payments arrived. This walks the historical logs once, in chronological
 * order, and mints one permanent, globally unique number per real charge.
 *
 * Safe to re-run: every row is keyed on a deterministic providerEventId, so a
 * second run inserts nothing.
 *
 *   node scripts/backfill-platform-invoices.js          # dry run
 *   node scripts/backfill-platform-invoices.js --commit # write
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const COMMIT = process.argv.includes("--commit");

// Mirrors lib/billingInvoice.ts — one card charge fires both order_created and
// subscription_payment_success with different ids, so they collapse on money +
// time instead. Two events with the SAME name are a genuine double charge.
const DEDUPE_WINDOW_MS = 60 * 60 * 1000;

// Must match SEQ_START in lib/platformInvoice.ts, or a backfill and a live
// payment would mint numbers from two different ranges.
const SEQ_START = 100001;

function parseDetails(details) {
  try {
    return details ? JSON.parse(details) : null;
  } catch {
    return null;
  }
}

function isSameCardCharge(a, b) {
  if (a.amount !== b.amount) return false;
  if (a.currency !== b.currency) return false;
  if (!a.eventName || !b.eventName || a.eventName === b.eventName) return false;
  return Math.abs(a.at.getTime() - b.at.getTime()) <= DEDUPE_WINDOW_MS;
}

async function main() {
  console.log(COMMIT ? "▶ Backfilling (COMMIT)\n" : "▶ Dry run — pass --commit to write\n");

  const logs = await prisma.activityLog.findMany({
    where: { action: { in: ["PAYMENT_EVENT", "SAFEPAY_PAYMENT_SUCCESS"] } },
    // Chronological: invoice numbers must ascend with time, not with whatever
    // order the rows happen to come back in.
    orderBy: { createdAt: "asc" },
    select: { id: true, companyId: true, action: true, createdAt: true, details: true },
  });

  const charges = [];
  const perCompany = new Map();

  for (const log of logs) {
    if (!log.companyId) continue;
    const det = parseDetails(log.details);
    if (!det) continue;

    let amount;
    let currency;
    let provider;
    let eventName;

    if (log.action === "SAFEPAY_PAYMENT_SUCCESS") {
      amount = Number(det.amountPkr) || 0;
      currency = "PKR";
      provider = "SAFEPAY";
      eventName = String(det.event || "safepay");
    } else {
      // PAYMENT_EVENT amounts are Lemon Squeezy minor units.
      amount = (Number(det.amount ?? det.amount_paid ?? 0) || 0) / 100;
      currency = String(det.currency || "USD").toUpperCase();
      provider = "LEMONSQUEEZY";
      eventName = String(det.eventName || "");
    }

    if (!(amount > 0)) continue;

    const candidate = {
      logId: log.id,
      companyId: log.companyId,
      at: log.createdAt,
      amount,
      currency,
      provider,
      eventName,
      orderId: String(det.orderId || det.tracker || "") || null,
      subscriptionId: det.subscriptionId ? String(det.subscriptionId) : null,
    };

    const seen = perCompany.get(log.companyId) || [];
    if (seen.some((kept) => isSameCardCharge(kept, candidate))) continue;
    seen.push(candidate);
    perCompany.set(log.companyId, seen);
    charges.push(candidate);
  }

  console.log(`Found ${charges.length} distinct charges across ${perCompany.size} companies.\n`);

  const companyNames = new Map(
    (await prisma.company.findMany({ select: { id: true, name: true, country: true } }))
      .map((c) => [c.id, c]),
  );

  // Historical PAYMENT_EVENT rows recorded no buyer email, so fall back to the
  // company's owner — without it the admin ledger has nothing to show but a
  // raw company UUID.
  const ownerEmails = new Map();
  for (const uc of await prisma.userCompany.findMany({
    where: { user: { role: { in: ["ADMIN", "OWNER"] } } },
    select: { companyId: true, user: { select: { name: true, email: true } } },
  })) {
    if (!ownerEmails.has(uc.companyId)) ownerEmails.set(uc.companyId, uc.user);
  }
  const plans = new Map(
    (await prisma.subscription.findMany({ select: { companyId: true, plan: true, billingCycle: true } }))
      .map((s) => [s.companyId, s]),
  );

  // Continue the live sequence rather than restarting it, so a backfill run
  // after real invoices exist cannot collide with them.
  const seqByYear = new Map();
  for (const year of new Set(charges.map((c) => c.at.getFullYear()))) {
    const last = await prisma.platformInvoice.findFirst({
      where: { number: { startsWith: `INV-${year}-` } },
      orderBy: { number: "desc" },
      select: { number: true },
    });
    const lastSeq = last ? Number(String(last.number).split("-")[2]) || 0 : 0;
    // Never step below the live starting point — see SEQ_START in
    // lib/platformInvoice.ts for why the sequence does not begin at 1.
    seqByYear.set(year, Math.max(lastSeq, SEQ_START - 1));
  }

  let written = 0;
  let skipped = 0;
  let enriched = 0;

  for (const charge of charges) {
    const providerEventId =
      charge.provider === "SAFEPAY"
        ? `safepay:${charge.orderId || charge.logId}`
        : `lemon:${charge.orderId || charge.logId}`;

    const owner = ownerEmails.get(charge.companyId);
    const company = companyNames.get(charge.companyId);

    const existing = await prisma.platformInvoice.findUnique({ where: { providerEventId } });
    if (existing) {
      // Fill in snapshot fields an earlier run could not resolve. Money, number
      // and status are never touched — those are the immutable part of the
      // record; this only completes who was billed.
      const patch = {};
      if (!existing.companyName && company?.name) patch.companyName = company.name;
      if (!existing.customerEmail && owner?.email) patch.customerEmail = owner.email;
      if (!existing.customerName && owner?.name) patch.customerName = owner.name;
      if (!existing.customerCountry && company?.country) patch.customerCountry = company.country;

      if (Object.keys(patch).length > 0) {
        console.log(`  ${existing.number}  enrich → ${Object.keys(patch).join(", ")}`);
        if (COMMIT) await prisma.platformInvoice.update({ where: { id: existing.id }, data: patch });
        enriched++;
      }
      skipped++;
      continue;
    }

    const year = charge.at.getFullYear();
    const seq = (seqByYear.get(year) || 0) + 1;
    seqByYear.set(year, seq);
    const number = `INV-${year}-${String(seq).padStart(6, "0")}`;

    const sub = plans.get(charge.companyId);

    const row = {
      number,
      companyId: charge.companyId,
      companyName: company?.name || null,
      customerName: owner?.name || null,
      customerEmail: owner?.email || null,
      provider: charge.provider,
      providerEventId,
      providerOrderId: charge.orderId,
      providerSubscriptionId: charge.subscriptionId,
      plan: String(sub?.plan || "STARTER").toUpperCase(),
      billingCycle: String(sub?.billingCycle || "MONTHLY").toUpperCase(),
      currency: charge.currency,
      // Historical logs recorded only the charged total — no provider
      // subtotal/tax breakdown was captured at the time, so subtotal mirrors
      // the total and tax stays 0 rather than being invented.
      subtotal: charge.amount,
      discount: 0,
      taxRate: 0,
      taxAmount: 0,
      total: charge.amount,
      customerCountry: company?.country || null,
      status: "PAID",
      issuedAt: charge.at,
    };

    console.log(
      `  ${number}  ${charge.at.toISOString().slice(0, 10)}  ` +
      `${charge.currency} ${charge.amount.toFixed(2).padStart(10)}  ${company?.name || charge.companyId}`,
    );

    if (COMMIT) {
      await prisma.platformInvoice.create({ data: row });
    }
    written++;
  }

  console.log(
    `\n${COMMIT ? "Wrote" : "Would write"} ${written} invoice(s); ` +
    `${skipped} already present${enriched > 0 ? ` (${enriched} enriched)` : ""}.`,
  );
  if (!COMMIT && written > 0) console.log("Re-run with --commit to apply.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
