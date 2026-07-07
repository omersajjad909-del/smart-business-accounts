/**
 * lib/dunning.ts
 * Payment dunning — automatic retry logic for failed invoices.
 *
 * DunningSchedule table schema:
 *   id, companyId, customerId, customerName, customerEmail, customerPhone,
 *   invoiceId, amount, currency, status (active|paused|resolved|cancelled),
 *   attempt, nextRetryAt, lastAttemptAt, escalatedAt, createdAt
 */

import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/sms";
import { sendEmail } from "@/lib/email";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DunningEntry {
  id: string;
  companyId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  invoiceId: string;
  amount: number;
  currency: string;
  status: "active" | "paused" | "resolved" | "cancelled";
  attempt: number;
  nextRetryAt: string;
  lastAttemptAt?: string;
  escalatedAt?: string;
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// Table bootstrap
// ---------------------------------------------------------------------------

export async function ensureDunningTable(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "DunningSchedule" (
      "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "companyId"     TEXT NOT NULL,
      "customerId"    TEXT NOT NULL,
      "customerName"  TEXT NOT NULL DEFAULT '',
      "customerEmail" TEXT NOT NULL DEFAULT '',
      "customerPhone" TEXT NOT NULL DEFAULT '',
      "invoiceId"     TEXT NOT NULL,
      "amount"        DOUBLE PRECISION NOT NULL DEFAULT 0,
      "currency"      TEXT NOT NULL DEFAULT 'USD',
      "status"        TEXT NOT NULL DEFAULT 'active',
      "attempt"       INTEGER NOT NULL DEFAULT 0,
      "nextRetryAt"   TIMESTAMP(3) NOT NULL,
      "lastAttemptAt" TIMESTAMP(3),
      "escalatedAt"   TIMESTAMP(3),
      "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Index for efficient cron queries
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "DunningSchedule_company_status"
      ON "DunningSchedule" ("companyId", "status")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "DunningSchedule_nextRetryAt"
      ON "DunningSchedule" ("nextRetryAt", "status")
  `);
}

// ---------------------------------------------------------------------------
// Retry schedule
// ---------------------------------------------------------------------------

/**
 * Returns the next retry Date based on attempt number.
 * Attempt 1 → +1 day
 * Attempt 2 → +3 days
 * Attempt 3 → +5 days
 * Attempt 4 → +10 days  (escalate)
 * Attempt 5+ → pause (returns null-equivalent far-future date; caller checks attempt)
 */
export function getNextRetryDate(attempt: number): Date {
  const now = new Date();
  const dayMs = 86_400_000;
  switch (attempt) {
    case 1:  return new Date(now.getTime() + 1  * dayMs);
    case 2:  return new Date(now.getTime() + 3  * dayMs);
    case 3:  return new Date(now.getTime() + 5  * dayMs);
    case 4:  return new Date(now.getTime() + 10 * dayMs);
    default: return new Date(now.getTime() + 30 * dayMs); // far future — entry will be paused
  }
}

// ---------------------------------------------------------------------------
// Start dunning
// ---------------------------------------------------------------------------

export async function startDunning(
  companyId: string,
  data: Omit<DunningEntry, "id" | "status" | "attempt" | "nextRetryAt" | "createdAt">,
): Promise<DunningEntry> {
  await ensureDunningTable();

  const nextRetryAt = getNextRetryDate(1);

  const rows = await prisma.$queryRaw<DunningEntry[]>`
    INSERT INTO "DunningSchedule"
      ("companyId", "customerId", "customerName", "customerEmail", "customerPhone",
       "invoiceId", "amount", "currency", "status", "attempt", "nextRetryAt")
    VALUES
      (${companyId}, ${data.customerId}, ${data.customerName}, ${data.customerEmail},
       ${data.customerPhone}, ${data.invoiceId}, ${data.amount}, ${data.currency},
       'active', 1, ${nextRetryAt})
    RETURNING
      "id", "companyId", "customerId", "customerName", "customerEmail", "customerPhone",
      "invoiceId", "amount", "currency", "status", "attempt",
      "nextRetryAt"::text AS "nextRetryAt",
      "lastAttemptAt"::text AS "lastAttemptAt",
      "escalatedAt"::text   AS "escalatedAt",
      "createdAt"::text     AS "createdAt"
  `;

  return rows[0];
}

// ---------------------------------------------------------------------------
// Process dunning queue (called by cron)
// ---------------------------------------------------------------------------

export async function processDunningQueue(
  companyId?: string,
): Promise<{ processed: number; resolved: number; escalated: number; paused: number }> {
  await ensureDunningTable();

  const now = new Date();

  // Fetch all active entries whose nextRetryAt has passed
  const entries: DunningEntry[] = companyId
    ? await prisma.$queryRaw`
        SELECT
          "id", "companyId", "customerId", "customerName", "customerEmail", "customerPhone",
          "invoiceId", "amount", "currency", "status", "attempt",
          "nextRetryAt"::text AS "nextRetryAt",
          "lastAttemptAt"::text AS "lastAttemptAt",
          "escalatedAt"::text   AS "escalatedAt",
          "createdAt"::text     AS "createdAt"
        FROM "DunningSchedule"
        WHERE "status" = 'active'
          AND "nextRetryAt" <= ${now}
          AND "companyId"   =  ${companyId}
      `
    : await prisma.$queryRaw`
        SELECT
          "id", "companyId", "customerId", "customerName", "customerEmail", "customerPhone",
          "invoiceId", "amount", "currency", "status", "attempt",
          "nextRetryAt"::text AS "nextRetryAt",
          "lastAttemptAt"::text AS "lastAttemptAt",
          "escalatedAt"::text   AS "escalatedAt",
          "createdAt"::text     AS "createdAt"
        FROM "DunningSchedule"
        WHERE "status" = 'active'
          AND "nextRetryAt" <= ${now}
      `;

  let processed = 0;
  let resolved  = 0;
  let escalated = 0;
  let paused    = 0;

  for (const entry of entries) {
    try {
      processed++;
      const nextAttempt = entry.attempt + 1;

      if (entry.attempt >= 5) {
        // Pause — too many retries
        await prisma.$executeRawUnsafe(
          `UPDATE "DunningSchedule" SET "status" = 'paused', "lastAttemptAt" = $1 WHERE "id" = $2`,
          now,
          entry.id,
        );
        paused++;
        await notifyDunningPaused(entry).catch(console.error);
        continue;
      }

      if (entry.attempt === 4) {
        // Escalate on attempt 4
        const nextRetryAt = getNextRetryDate(nextAttempt);
        await prisma.$executeRawUnsafe(
          `UPDATE "DunningSchedule"
           SET "attempt" = $1, "lastAttemptAt" = $2, "nextRetryAt" = $3, "escalatedAt" = $4
           WHERE "id" = $5`,
          nextAttempt,
          now,
          nextRetryAt,
          now,
          entry.id,
        );
        escalated++;
        await notifyDunningEscalated(entry).catch(console.error);
        continue;
      }

      // Standard retry attempt
      const nextRetryAt = getNextRetryDate(nextAttempt);
      await prisma.$executeRawUnsafe(
        `UPDATE "DunningSchedule"
         SET "attempt" = $1, "lastAttemptAt" = $2, "nextRetryAt" = $3
         WHERE "id" = $4`,
        nextAttempt,
        now,
        nextRetryAt,
        entry.id,
      );

      await notifyDunningRetry(entry, nextAttempt, nextRetryAt).catch(console.error);
    } catch (err) {
      console.error("[dunning] Error processing entry", entry.id, err);
    }
  }

  return { processed, resolved, escalated, paused };
}

// ---------------------------------------------------------------------------
// Resolve / cancel
// ---------------------------------------------------------------------------

export async function resolveDunning(entryId: string): Promise<void> {
  await ensureDunningTable();
  await prisma.$executeRawUnsafe(
    `UPDATE "DunningSchedule" SET "status" = 'resolved', "lastAttemptAt" = $1 WHERE "id" = $2`,
    new Date(),
    entryId,
  );
}

export async function cancelDunning(entryId: string): Promise<void> {
  await ensureDunningTable();
  await prisma.$executeRawUnsafe(
    `UPDATE "DunningSchedule" SET "status" = 'cancelled' WHERE "id" = $1`,
    entryId,
  );
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

export async function getDunningEntries(
  companyId: string,
  status?: string,
): Promise<DunningEntry[]> {
  await ensureDunningTable();

  if (status) {
    return prisma.$queryRaw<DunningEntry[]>`
      SELECT
        "id", "companyId", "customerId", "customerName", "customerEmail", "customerPhone",
        "invoiceId", "amount", "currency", "status", "attempt",
        "nextRetryAt"::text AS "nextRetryAt",
        "lastAttemptAt"::text AS "lastAttemptAt",
        "escalatedAt"::text   AS "escalatedAt",
        "createdAt"::text     AS "createdAt"
      FROM "DunningSchedule"
      WHERE "companyId" = ${companyId}
        AND "status"    = ${status}
      ORDER BY "createdAt" DESC
    `;
  }

  return prisma.$queryRaw<DunningEntry[]>`
    SELECT
      "id", "companyId", "customerId", "customerName", "customerEmail", "customerPhone",
      "invoiceId", "amount", "currency", "status", "attempt",
      "nextRetryAt"::text AS "nextRetryAt",
      "lastAttemptAt"::text AS "lastAttemptAt",
      "escalatedAt"::text   AS "escalatedAt",
      "createdAt"::text     AS "createdAt"
    FROM "DunningSchedule"
    WHERE "companyId" = ${companyId}
    ORDER BY "createdAt" DESC
  `;
}

export async function getDunningStats(companyId: string): Promise<{
  total: number;
  active: number;
  resolved: number;
  escalated: number;
  paused: number;
  recoveredAmount: number;
}> {
  await ensureDunningTable();

  const rows = await prisma.$queryRaw<
    Array<{ status: string; cnt: bigint; total_amount: number }>
  >`
    SELECT "status", COUNT(*) AS cnt, COALESCE(SUM("amount"), 0) AS total_amount
    FROM "DunningSchedule"
    WHERE "companyId" = ${companyId}
    GROUP BY "status"
  `;

  const map: Record<string, { count: number; amount: number }> = {};
  for (const r of rows) {
    map[r.status] = { count: Number(r.cnt), amount: Number(r.total_amount) };
  }

  return {
    total:           Object.values(map).reduce((s, v) => s + v.count, 0),
    active:          map.active?.count    ?? 0,
    resolved:        map.resolved?.count  ?? 0,
    escalated:       (await _countEscalated(companyId)),
    paused:          map.paused?.count    ?? 0,
    recoveredAmount: map.resolved?.amount ?? 0,
  };
}

async function _countEscalated(companyId: string): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ cnt: bigint }>>`
    SELECT COUNT(*) AS cnt FROM "DunningSchedule"
    WHERE "companyId" = ${companyId} AND "escalatedAt" IS NOT NULL AND "status" = 'active'
  `;
  return Number(rows[0]?.cnt ?? 0);
}

// ---------------------------------------------------------------------------
// Notification helpers
// ---------------------------------------------------------------------------

async function notifyDunningRetry(
  entry: DunningEntry,
  attempt: number,
  nextRetryAt: Date,
): Promise<void> {
  const retryDateStr = nextRetryAt.toLocaleDateString("en-GB"); // DD/MM/YYYY
  const amountStr    = `${entry.currency} ${entry.amount.toFixed(2)}`;

  const smsMessage = `[Payment Reminder] Hi ${entry.customerName}, payment of ${amountStr} for invoice #${entry.invoiceId} is overdue. Retry attempt ${attempt} scheduled for ${retryDateStr}. Please update your payment details to avoid service disruption.`;

  const emailHtml = buildDunningEmail({
    title:       "Payment Retry Notice",
    customerName: entry.customerName,
    invoiceId:   entry.invoiceId,
    amount:      amountStr,
    attempt,
    retryDate:   retryDateStr,
    message:     `We were unable to collect payment of <strong>${amountStr}</strong> for invoice <strong>#${entry.invoiceId}</strong>. We will automatically retry on <strong>${retryDateStr}</strong>.`,
    color:       "#f59e0b",
  });

  await Promise.allSettled([
    entry.customerPhone
      ? sendSms({ to: entry.customerPhone, message: smsMessage })
      : Promise.resolve(),
    entry.customerEmail
      ? sendEmail({ to: entry.customerEmail, subject: `Payment retry scheduled — Invoice #${entry.invoiceId}`, html: emailHtml })
      : Promise.resolve(),
  ]);
}

async function notifyDunningEscalated(entry: DunningEntry): Promise<void> {
  const amountStr = `${entry.currency} ${entry.amount.toFixed(2)}`;

  const smsMessage = `[Urgent] Hi ${entry.customerName}, payment of ${amountStr} for invoice #${entry.invoiceId} has been escalated after multiple failed attempts. Please contact us immediately to resolve this.`;

  const emailHtml = buildDunningEmail({
    title:       "Payment Escalated",
    customerName: entry.customerName,
    invoiceId:   entry.invoiceId,
    amount:      amountStr,
    attempt:     entry.attempt,
    retryDate:   "—",
    message:     `Your payment of <strong>${amountStr}</strong> for invoice <strong>#${entry.invoiceId}</strong> has been escalated after multiple failed attempts. Our team will be in touch to resolve this issue.`,
    color:       "#ef4444",
  });

  await Promise.allSettled([
    entry.customerPhone
      ? sendSms({ to: entry.customerPhone, message: smsMessage })
      : Promise.resolve(),
    entry.customerEmail
      ? sendEmail({ to: entry.customerEmail, subject: `URGENT: Payment escalated — Invoice #${entry.invoiceId}`, html: emailHtml })
      : Promise.resolve(),
  ]);
}

async function notifyDunningPaused(entry: DunningEntry): Promise<void> {
  const amountStr = `${entry.currency} ${entry.amount.toFixed(2)}`;
  console.warn(
    `[dunning] Entry ${entry.id} paused after ${entry.attempt} attempts. Customer: ${entry.customerEmail}, Amount: ${amountStr}`,
  );
}

function buildDunningEmail(opts: {
  title: string;
  customerName: string;
  invoiceId: string;
  amount: string;
  attempt: number;
  retryDate: string;
  message: string;
  color: string;
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
            <span style="background:${opts.color};color:#ffffff;padding:5px 14px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">${opts.title}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:36px;">
      <p style="font-size:15px;margin:0 0 16px;">Hi <strong>${opts.customerName}</strong>,</p>
      <p style="font-size:14px;color:#475569;margin:0 0 24px;">${opts.message}</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8fafc;border-radius:10px;padding:20px;margin:0 0 24px;">
        <tr>
          <td style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;">Invoice</td>
          <td style="font-size:14px;font-weight:600;color:#1e293b;text-align:right;">#${opts.invoiceId}</td>
        </tr>
        <tr><td colspan="2" style="height:8px;"></td></tr>
        <tr>
          <td style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;">Amount Due</td>
          <td style="font-size:16px;font-weight:800;color:${opts.color};text-align:right;">${opts.amount}</td>
        </tr>
        <tr><td colspan="2" style="height:8px;"></td></tr>
        <tr>
          <td style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;">Attempt</td>
          <td style="font-size:14px;font-weight:600;color:#1e293b;text-align:right;">${opts.attempt}</td>
        </tr>
        <tr><td colspan="2" style="height:8px;"></td></tr>
        <tr>
          <td style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;">Next Retry</td>
          <td style="font-size:14px;font-weight:600;color:#1e293b;text-align:right;">${opts.retryDate}</td>
        </tr>
      </table>
      <p style="font-size:13px;color:#64748b;margin:0;">If you have already paid, please disregard this message. For assistance contact your account manager.</p>
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
