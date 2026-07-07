/**
 * lib/subscriptionLifecycle.ts
 *
 * Full subscription lifecycle management for B2B companies that sell
 * subscriptions to their own customers (not FinovaOS platform billing).
 *
 * Tables:
 *   SubscriptionPlan        — plan catalogue per company
 *   CustomerSubscription    — individual customer subscriptions
 */

import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/sms";
import { sendEmail } from "@/lib/email";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubscriptionPlan {
  id: string;
  companyId: string;
  name: string;
  amount: number;
  currency: string;
  interval: "monthly" | "quarterly" | "yearly";
  trialDays: number;
  features: string[];
  active: boolean;
  createdAt?: string;
}

export interface CustomerSubscription {
  id: string;
  companyId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  interval: string;
  status: "active" | "trial" | "past_due" | "cancelled" | "paused";
  startDate: string;
  currentPeriodEnd: string;
  trialEndDate?: string;
  cancelledAt?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// Table bootstrap
// ---------------------------------------------------------------------------

export async function ensureSubscriptionTables(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SubscriptionPlan" (
      "id"         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "companyId"  TEXT NOT NULL,
      "name"       TEXT NOT NULL,
      "amount"     DOUBLE PRECISION NOT NULL DEFAULT 0,
      "currency"   TEXT NOT NULL DEFAULT 'USD',
      "interval"   TEXT NOT NULL DEFAULT 'monthly',
      "trialDays"  INTEGER NOT NULL DEFAULT 0,
      "features"   JSONB NOT NULL DEFAULT '[]',
      "active"     BOOLEAN NOT NULL DEFAULT true,
      "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "SubscriptionPlan_companyId"
      ON "SubscriptionPlan" ("companyId", "active")
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CustomerSubscription" (
      "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "companyId"        TEXT NOT NULL,
      "customerId"       TEXT NOT NULL,
      "customerName"     TEXT NOT NULL DEFAULT '',
      "customerEmail"    TEXT NOT NULL DEFAULT '',
      "customerPhone"    TEXT NOT NULL DEFAULT '',
      "planId"           TEXT NOT NULL,
      "planName"         TEXT NOT NULL DEFAULT '',
      "amount"           DOUBLE PRECISION NOT NULL DEFAULT 0,
      "currency"         TEXT NOT NULL DEFAULT 'USD',
      "interval"         TEXT NOT NULL DEFAULT 'monthly',
      "status"           TEXT NOT NULL DEFAULT 'active',
      "startDate"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
      "trialEndDate"     TIMESTAMP(3),
      "cancelledAt"      TIMESTAMP(3),
      "metadata"         JSONB NOT NULL DEFAULT '{}',
      "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "CustomerSubscription_company_status"
      ON "CustomerSubscription" ("companyId", "status")
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "CustomerSubscription_renewal"
      ON "CustomerSubscription" ("currentPeriodEnd", "status")
  `);
}

// ---------------------------------------------------------------------------
// Plan helpers
// ---------------------------------------------------------------------------

export async function createPlan(
  companyId: string,
  plan: Omit<SubscriptionPlan, "id" | "companyId" | "createdAt">,
): Promise<SubscriptionPlan> {
  await ensureSubscriptionTables();

  const featuresJson = JSON.stringify(plan.features ?? []);

  const rows = await prisma.$queryRaw<SubscriptionPlan[]>`
    INSERT INTO "SubscriptionPlan"
      ("companyId", "name", "amount", "currency", "interval", "trialDays", "features", "active")
    VALUES
      (${companyId}, ${plan.name}, ${plan.amount}, ${plan.currency},
       ${plan.interval}, ${plan.trialDays ?? 0}, ${featuresJson}::jsonb, ${plan.active ?? true})
    RETURNING
      "id", "companyId", "name", "amount", "currency", "interval",
      "trialDays", "features", "active",
      "createdAt"::text AS "createdAt"
  `;

  return normalizePlan(rows[0]);
}

export async function updatePlan(
  planId: string,
  companyId: string,
  updates: Partial<Omit<SubscriptionPlan, "id" | "companyId" | "createdAt">>,
): Promise<SubscriptionPlan> {
  await ensureSubscriptionTables();

  const sets: string[] = [`"updatedAt" = NOW()`];
  const params: unknown[] = [];

  if (updates.name       !== undefined) { params.push(updates.name);       sets.push(`"name" = $${params.length}`); }
  if (updates.amount     !== undefined) { params.push(updates.amount);     sets.push(`"amount" = $${params.length}`); }
  if (updates.currency   !== undefined) { params.push(updates.currency);   sets.push(`"currency" = $${params.length}`); }
  if (updates.interval   !== undefined) { params.push(updates.interval);   sets.push(`"interval" = $${params.length}`); }
  if (updates.trialDays  !== undefined) { params.push(updates.trialDays);  sets.push(`"trialDays" = $${params.length}`); }
  if (updates.active     !== undefined) { params.push(updates.active);     sets.push(`"active" = $${params.length}`); }
  if (updates.features   !== undefined) {
    params.push(JSON.stringify(updates.features));
    sets.push(`"features" = $${params.length}::jsonb`);
  }

  params.push(planId, companyId);
  const idIdx  = params.length - 1;
  const cidIdx = params.length;

  const rows = await prisma.$queryRawUnsafe<SubscriptionPlan[]>(
    `UPDATE "SubscriptionPlan" SET ${sets.join(", ")}
     WHERE "id" = $${idIdx} AND "companyId" = $${cidIdx}
     RETURNING "id", "companyId", "name", "amount", "currency", "interval",
               "trialDays", "features", "active", "createdAt"::text AS "createdAt"`,
    ...params,
  );

  if (!rows[0]) throw new Error("Plan not found");
  return normalizePlan(rows[0]);
}

export async function getPlans(companyId: string): Promise<SubscriptionPlan[]> {
  await ensureSubscriptionTables();

  const rows = await prisma.$queryRaw<SubscriptionPlan[]>`
    SELECT "id", "companyId", "name", "amount", "currency", "interval",
           "trialDays", "features", "active",
           "createdAt"::text AS "createdAt"
    FROM "SubscriptionPlan"
    WHERE "companyId" = ${companyId}
    ORDER BY "createdAt" DESC
  `;

  return rows.map(normalizePlan);
}

function normalizePlan(row: SubscriptionPlan): SubscriptionPlan {
  return {
    ...row,
    features: Array.isArray(row.features)
      ? row.features
      : (typeof row.features === "string"
          ? (() => { try { return JSON.parse(row.features as unknown as string); } catch { return []; } })()
          : []),
  };
}

// ---------------------------------------------------------------------------
// Interval helpers
// ---------------------------------------------------------------------------

function addInterval(date: Date, interval: string): Date {
  const d = new Date(date);
  switch (String(interval).toLowerCase()) {
    case "yearly":    d.setFullYear(d.getFullYear() + 1); break;
    case "quarterly": d.setMonth(d.getMonth() + 3);       break;
    case "monthly":
    default:          d.setMonth(d.getMonth() + 1);       break;
  }
  return d;
}

// ---------------------------------------------------------------------------
// Subscription CRUD
// ---------------------------------------------------------------------------

export async function createSubscription(
  companyId: string,
  data: {
    customerId: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    planId: string;
    startDate?: Date;
  },
): Promise<CustomerSubscription> {
  await ensureSubscriptionTables();

  // Resolve plan
  const plans = await prisma.$queryRaw<SubscriptionPlan[]>`
    SELECT "id", "name", "amount", "currency", "interval", "trialDays"
    FROM "SubscriptionPlan"
    WHERE "id" = ${data.planId} AND "companyId" = ${companyId} AND "active" = true
  `;
  if (!plans[0]) throw new Error("Plan not found or inactive");
  const plan = plans[0];

  const start = data.startDate ?? new Date();
  const trialDays = Number(plan.trialDays ?? 0);
  const hasTrial  = trialDays > 0;
  const trialEnd  = hasTrial ? new Date(start.getTime() + trialDays * 86_400_000) : null;
  const periodEnd = addInterval(hasTrial && trialEnd ? trialEnd : start, plan.interval);
  const status: CustomerSubscription["status"] = hasTrial ? "trial" : "active";

  const rows = await prisma.$queryRaw<CustomerSubscription[]>`
    INSERT INTO "CustomerSubscription"
      ("companyId", "customerId", "customerName", "customerEmail", "customerPhone",
       "planId", "planName", "amount", "currency", "interval",
       "status", "startDate", "currentPeriodEnd", "trialEndDate")
    VALUES
      (${companyId}, ${data.customerId}, ${data.customerName}, ${data.customerEmail},
       ${data.customerPhone ?? ""},
       ${plan.id}, ${plan.name}, ${Number(plan.amount)}, ${String(plan.currency)}, ${String(plan.interval)},
       ${status}, ${start}, ${periodEnd}, ${trialEnd})
    RETURNING
      "id", "companyId", "customerId", "customerName", "customerEmail", "customerPhone",
      "planId", "planName", "amount", "currency", "interval", "status",
      "startDate"::text        AS "startDate",
      "currentPeriodEnd"::text AS "currentPeriodEnd",
      "trialEndDate"::text     AS "trialEndDate",
      "cancelledAt"::text      AS "cancelledAt",
      "metadata",
      "createdAt"::text        AS "createdAt"
  `;

  return normalizeSubscription(rows[0]);
}

export async function cancelSubscription(
  subscriptionId: string,
  reason?: string,
): Promise<void> {
  await ensureSubscriptionTables();
  const now = new Date();
  const meta = reason ? JSON.stringify({ cancellationReason: reason }) : null;

  if (meta) {
    await prisma.$executeRawUnsafe(
      `UPDATE "CustomerSubscription"
       SET "status" = 'cancelled', "cancelledAt" = $1,
           "metadata" = "metadata" || $2::jsonb, "updatedAt" = $1
       WHERE "id" = $3`,
      now, meta, subscriptionId,
    );
  } else {
    await prisma.$executeRawUnsafe(
      `UPDATE "CustomerSubscription"
       SET "status" = 'cancelled', "cancelledAt" = $1, "updatedAt" = $1
       WHERE "id" = $2`,
      now, subscriptionId,
    );
  }
}

export async function updateSubscription(
  subscriptionId: string,
  companyId: string,
  updates: { status?: string; planId?: string },
): Promise<CustomerSubscription> {
  await ensureSubscriptionTables();

  const sets: string[] = [`"updatedAt" = NOW()`];
  const params: unknown[] = [];

  if (updates.status !== undefined) {
    params.push(updates.status);
    sets.push(`"status" = $${params.length}`);
  }

  if (updates.planId !== undefined) {
    // Fetch new plan
    const plans = await prisma.$queryRaw<SubscriptionPlan[]>`
      SELECT "id", "name", "amount", "currency", "interval"
      FROM "SubscriptionPlan"
      WHERE "id" = ${updates.planId} AND "companyId" = ${companyId} AND "active" = true
    `;
    if (!plans[0]) throw new Error("New plan not found or inactive");
    const p = plans[0];

    params.push(p.id, p.name, Number(p.amount), String(p.currency), String(p.interval));
    const base = params.length - 4;
    sets.push(
      `"planId" = $${base}`,
      `"planName" = $${base + 1}`,
      `"amount" = $${base + 2}`,
      `"currency" = $${base + 3}`,
      `"interval" = $${base + 4}`,
    );
  }

  params.push(subscriptionId, companyId);
  const idIdx  = params.length - 1;
  const cidIdx = params.length;

  const rows = await prisma.$queryRawUnsafe<CustomerSubscription[]>(
    `UPDATE "CustomerSubscription" SET ${sets.join(", ")}
     WHERE "id" = $${idIdx} AND "companyId" = $${cidIdx}
     RETURNING
       "id", "companyId", "customerId", "customerName", "customerEmail", "customerPhone",
       "planId", "planName", "amount", "currency", "interval", "status",
       "startDate"::text        AS "startDate",
       "currentPeriodEnd"::text AS "currentPeriodEnd",
       "trialEndDate"::text     AS "trialEndDate",
       "cancelledAt"::text      AS "cancelledAt",
       "metadata",
       "createdAt"::text        AS "createdAt"`,
    ...params,
  );

  if (!rows[0]) throw new Error("Subscription not found");
  return normalizeSubscription(rows[0]);
}

export async function getSubscriptions(
  companyId: string,
  status?: string,
): Promise<CustomerSubscription[]> {
  await ensureSubscriptionTables();

  const rows: CustomerSubscription[] = status
    ? await prisma.$queryRaw`
        SELECT
          "id", "companyId", "customerId", "customerName", "customerEmail", "customerPhone",
          "planId", "planName", "amount", "currency", "interval", "status",
          "startDate"::text        AS "startDate",
          "currentPeriodEnd"::text AS "currentPeriodEnd",
          "trialEndDate"::text     AS "trialEndDate",
          "cancelledAt"::text      AS "cancelledAt",
          "metadata",
          "createdAt"::text        AS "createdAt"
        FROM "CustomerSubscription"
        WHERE "companyId" = ${companyId} AND "status" = ${status}
        ORDER BY "createdAt" DESC
      `
    : await prisma.$queryRaw`
        SELECT
          "id", "companyId", "customerId", "customerName", "customerEmail", "customerPhone",
          "planId", "planName", "amount", "currency", "interval", "status",
          "startDate"::text        AS "startDate",
          "currentPeriodEnd"::text AS "currentPeriodEnd",
          "trialEndDate"::text     AS "trialEndDate",
          "cancelledAt"::text      AS "cancelledAt",
          "metadata",
          "createdAt"::text        AS "createdAt"
        FROM "CustomerSubscription"
        WHERE "companyId" = ${companyId}
        ORDER BY "createdAt" DESC
      `;

  return rows.map(normalizeSubscription);
}

// ---------------------------------------------------------------------------
// Renewals processor (called by cron)
// ---------------------------------------------------------------------------

export async function processRenewals(companyId?: string): Promise<{
  renewed: number;
  failed: number;
  cancelled: number;
}> {
  await ensureSubscriptionTables();

  const now = new Date();

  const due: CustomerSubscription[] = companyId
    ? await prisma.$queryRaw`
        SELECT
          "id", "companyId", "customerId", "customerName", "customerEmail", "customerPhone",
          "planId", "planName", "amount", "currency", "interval", "status",
          "startDate"::text        AS "startDate",
          "currentPeriodEnd"::text AS "currentPeriodEnd",
          "trialEndDate"::text     AS "trialEndDate",
          "cancelledAt"::text      AS "cancelledAt",
          "metadata"
        FROM "CustomerSubscription"
        WHERE "status" IN ('active', 'trial')
          AND "currentPeriodEnd" <= ${now}
          AND "companyId" = ${companyId}
      `
    : await prisma.$queryRaw`
        SELECT
          "id", "companyId", "customerId", "customerName", "customerEmail", "customerPhone",
          "planId", "planName", "amount", "currency", "interval", "status",
          "startDate"::text        AS "startDate",
          "currentPeriodEnd"::text AS "currentPeriodEnd",
          "trialEndDate"::text     AS "trialEndDate",
          "cancelledAt"::text      AS "cancelledAt",
          "metadata"
        FROM "CustomerSubscription"
        WHERE "status" IN ('active', 'trial')
          AND "currentPeriodEnd" <= ${now}
      `;

  let renewed   = 0;
  let failed    = 0;
  let cancelled = 0;

  for (const sub of due) {
    try {
      // Trials moving to active
      const newStatus: CustomerSubscription["status"] = "active";
      const newPeriodEnd = addInterval(now, sub.interval);

      await prisma.$executeRawUnsafe(
        `UPDATE "CustomerSubscription"
         SET "status" = $1, "currentPeriodEnd" = $2, "updatedAt" = $3
         WHERE "id" = $4`,
        newStatus, newPeriodEnd, now, sub.id,
      );

      // Attempt to create a SalesInvoice (best-effort — table may not exist)
      await createRenewalInvoice(sub).catch(() => {});

      renewed++;
      await sendRenewalNotification(sub, newPeriodEnd).catch(console.error);
    } catch (err) {
      console.error("[subscriptionLifecycle] Renewal failed for", sub.id, err);
      failed++;
    }
  }

  return { renewed, failed, cancelled };
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export async function getSubscriptionStats(companyId: string): Promise<{
  total: number;
  active: number;
  trial: number;
  pastDue: number;
  mrr: number;
  arr: number;
}> {
  await ensureSubscriptionTables();

  const rows = await prisma.$queryRaw<
    Array<{ status: string; cnt: bigint; total_amount: number; interval: string }>
  >`
    SELECT "status", "interval", COUNT(*) AS cnt,
           COALESCE(SUM("amount"), 0) AS total_amount
    FROM "CustomerSubscription"
    WHERE "companyId" = ${companyId}
      AND "status" IN ('active', 'trial', 'past_due')
    GROUP BY "status", "interval"
  `;

  let total    = 0;
  let active   = 0;
  let trial    = 0;
  let pastDue  = 0;
  let mrrRaw   = 0;

  for (const r of rows) {
    const count  = Number(r.cnt);
    const amount = Number(r.total_amount);
    total += count;

    if (r.status === "active")   active  += count;
    if (r.status === "trial")    trial   += count;
    if (r.status === "past_due") pastDue += count;

    if (r.status === "active") {
      switch (String(r.interval).toLowerCase()) {
        case "monthly":   mrrRaw += amount;          break;
        case "quarterly": mrrRaw += amount / 3;      break;
        case "yearly":    mrrRaw += amount / 12;     break;
        default:          mrrRaw += amount;
      }
    }
  }

  return {
    total,
    active,
    trial,
    pastDue,
    mrr: Math.round(mrrRaw * 100) / 100,
    arr: Math.round(mrrRaw * 12 * 100) / 100,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function normalizeSubscription(row: CustomerSubscription): CustomerSubscription {
  return {
    ...row,
    metadata: row.metadata && typeof row.metadata === "string"
      ? (() => { try { return JSON.parse(row.metadata as unknown as string); } catch { return {}; } })()
      : (row.metadata ?? {}),
  };
}

async function createRenewalInvoice(sub: CustomerSubscription): Promise<void> {
  // Best-effort: insert into SalesInvoice if the table exists
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'SalesInvoice'
      ) THEN
        INSERT INTO "SalesInvoice"
          ("companyId", "customerId", "customerName", "total", "currency", "status", "dueDate", "notes")
        VALUES
          ('${sub.companyId}', '${sub.customerId}', '${sub.customerName.replace(/'/g, "''")}',
           ${sub.amount}, '${sub.currency}', 'unpaid', NOW() + INTERVAL '7 days',
           'Auto-generated renewal invoice for subscription ${sub.id}');
      END IF;
    END$$;
  `).catch(() => {});
}

async function sendRenewalNotification(
  sub: CustomerSubscription,
  newPeriodEnd: Date,
): Promise<void> {
  const periodEndStr = newPeriodEnd.toLocaleDateString("en-GB");
  const amountStr    = `${sub.currency} ${sub.amount.toFixed(2)}`;

  const smsMessage = `Hi ${sub.customerName}, your ${sub.planName} subscription has been renewed. Amount: ${amountStr}. Next renewal: ${periodEndStr}. Thank you!`;

  const emailHtml = buildRenewalEmail({
    customerName: sub.customerName,
    planName:     sub.planName,
    amount:       amountStr,
    interval:     sub.interval,
    nextRenewal:  periodEndStr,
  });

  await Promise.allSettled([
    sub.customerPhone
      ? sendSms({ to: sub.customerPhone, message: smsMessage })
      : Promise.resolve(),
    sub.customerEmail
      ? sendEmail({
          to:      sub.customerEmail,
          subject: `Subscription renewed — ${sub.planName}`,
          html:    emailHtml,
        })
      : Promise.resolve(),
  ]);
}

function buildRenewalEmail(opts: {
  customerName: string;
  planName: string;
  amount: string;
  interval: string;
  nextRenewal: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1e293b;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f1f5f9;padding:36px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 40px rgba(15,23,42,.10);">
  <tr>
    <td style="background:#0f172a;padding:26px 36px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td style="vertical-align:middle;">
            <div style="font-size:20px;font-weight:800;color:#ffffff;">FinovaOS</div>
          </td>
          <td align="right" style="vertical-align:middle;">
            <span style="background:#22c55e;color:#ffffff;padding:5px 14px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Renewed</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:36px;">
      <p style="font-size:15px;margin:0 0 16px;">Hi <strong>${opts.customerName}</strong>,</p>
      <p style="font-size:14px;color:#475569;margin:0 0 24px;">Your subscription has been successfully renewed. Here's a summary:</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8fafc;border-radius:10px;padding:20px;margin:0 0 24px;">
        <tr>
          <td style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;">Plan</td>
          <td style="font-size:14px;font-weight:600;color:#1e293b;text-align:right;">${opts.planName}</td>
        </tr>
        <tr><td colspan="2" style="height:8px;"></td></tr>
        <tr>
          <td style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;">Amount</td>
          <td style="font-size:16px;font-weight:800;color:#22c55e;text-align:right;">${opts.amount}</td>
        </tr>
        <tr><td colspan="2" style="height:8px;"></td></tr>
        <tr>
          <td style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;">Billing Cycle</td>
          <td style="font-size:14px;font-weight:600;color:#1e293b;text-align:right;text-transform:capitalize;">${opts.interval}</td>
        </tr>
        <tr><td colspan="2" style="height:8px;"></td></tr>
        <tr>
          <td style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;">Next Renewal</td>
          <td style="font-size:14px;font-weight:600;color:#1e293b;text-align:right;">${opts.nextRenewal}</td>
        </tr>
      </table>
      <p style="font-size:13px;color:#64748b;margin:0;">Thank you for your continued subscription. Contact us anytime if you have questions.</p>
    </td>
  </tr>
  <tr>
    <td style="background:#f8fafc;padding:16px 36px;border-top:1px solid #e2e8f0;text-align:center;">
      <div style="font-size:11px;color:#94a3b8;">Sent via <strong style="color:#6366f1;">FinovaOS</strong> &nbsp;·&nbsp; finovaos.app</div>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
