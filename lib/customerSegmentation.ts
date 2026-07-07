import { prisma } from "@/lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CustomerSegment {
  customerId: string;
  customerName: string;
  email?: string;
  phone?: string;
  segments: string[]; // can have multiple
  tags: string[];
  metrics: {
    totalRevenue: number;
    invoiceCount: number;
    lastPurchaseDate?: string;
    daysSinceLastPurchase?: number;
    avgOrderValue: number;
    overdueAmount: number;
    paymentScore: number; // 0-100
  };
  updatedAt: string;
}

interface CustomerRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  invoice_count: bigint | number;
  total_revenue: bigint | number | string;
  overdue_amount: bigint | number | string;
  last_purchase_date: Date | null;
}

interface SegmentRules {
  vipThreshold: number;
  dormantDays: number;
  atRiskDays: number;
  newCustomerDays: number;
}

// ─── Table creation ───────────────────────────────────────────────────────────

export async function ensureSegmentTable(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CustomerSegment" (
      "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "companyId"    TEXT NOT NULL,
      "customerId"   TEXT NOT NULL,
      "customerName" TEXT NOT NULL DEFAULT '',
      "email"        TEXT,
      "phone"        TEXT,
      "segments"     TEXT NOT NULL DEFAULT '[]',
      "tags"         TEXT NOT NULL DEFAULT '[]',
      "metrics"      TEXT NOT NULL DEFAULT '{}',
      "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE ("companyId", "customerId")
    )
  `).catch(() => {});
}

// ─── Rules storage ────────────────────────────────────────────────────────────

export async function saveSegmentRules(
  companyId: string,
  rules: {
    vipThreshold?: number;
    dormantDays?: number;
    atRiskDays?: number;
    newCustomerDays?: number;
  }
): Promise<void> {
  await prisma.activityLog.create({
    data: {
      action: "SEGMENT_CONFIG",
      companyId,
      details: JSON.stringify(rules),
    },
  });
}

export async function getSegmentRules(companyId: string): Promise<Record<string, number>> {
  const defaults: SegmentRules = {
    vipThreshold: 100000,
    dormantDays: 90,
    atRiskDays: 60,
    newCustomerDays: 30,
  };

  try {
    const log = await prisma.activityLog.findFirst({
      where: { action: "SEGMENT_CONFIG", companyId },
      orderBy: { createdAt: "desc" },
      select: { details: true },
    });

    if (!log?.details) return defaults;
    const saved = JSON.parse(log.details);
    return { ...defaults, ...saved };
  } catch {
    return defaults;
  }
}

// ─── Segmentation logic ───────────────────────────────────────────────────────

function toNumber(val: bigint | number | string | null | undefined): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "bigint") return Number(val);
  return Number(val) || 0;
}

function calcPaymentScore(overdueAmount: number, totalRevenue: number): number {
  if (overdueAmount === 0) return 100;
  if (totalRevenue === 0) return 50;
  const ratio = overdueAmount / totalRevenue;
  return Math.max(0, Math.round(100 - ratio * 100));
}

function assignSegments(
  row: CustomerRow,
  rules: SegmentRules,
  allRevenues: number[]
): { segments: string[]; tags: string[] } {
  const totalRevenue = toNumber(row.total_revenue);
  const invoiceCount = toNumber(row.invoice_count);
  const overdueAmount = toNumber(row.overdue_amount);
  const now = Date.now();

  let daysSinceLast: number | undefined;
  if (row.last_purchase_date) {
    daysSinceLast = Math.floor((now - new Date(row.last_purchase_date).getTime()) / 86400000);
  }

  const segments: string[] = [];
  const tags: string[] = [];

  // VIP: total purchases above threshold
  if (totalRevenue >= rules.vipThreshold) {
    segments.push("vip");
    tags.push("vip");
  }

  // New: created in last N days (we use last_purchase_date as proxy here — we tag "new" if invoice activity is recent)
  // We check via the account creation date embedded in customerId is not available,
  // so we detect "new" as those with invoices where all are within newCustomerDays
  // and invoice_count <= 2 (heuristic). Handled separately in processSegmentation.

  // At-risk: no purchase in 60+ days, previously active
  if (daysSinceLast !== undefined && daysSinceLast >= rules.atRiskDays && invoiceCount > 0) {
    segments.push("at_risk");
    tags.push("at_risk");
  }

  // Dormant: no activity in 90+ days
  if (daysSinceLast !== undefined && daysSinceLast >= rules.dormantDays) {
    segments.push("dormant");
    tags.push("dormant");
  } else if (daysSinceLast === undefined && invoiceCount === 0) {
    segments.push("dormant");
    tags.push("dormant");
  }

  // Loyal: 5+ purchases
  if (invoiceCount >= 5) {
    segments.push("loyal");
    tags.push("loyal");
  }

  // High-value: top 20% by revenue
  if (allRevenues.length > 0) {
    const sortedRevenues = [...allRevenues].sort((a, b) => b - a);
    const topIdx = Math.ceil(sortedRevenues.length * 0.2);
    const threshold = sortedRevenues[topIdx - 1] ?? 0;
    if (totalRevenue >= threshold && totalRevenue > 0) {
      segments.push("high_value");
      tags.push("high_value");
    }
  }

  // Upsell-ready: growing purchase trend (invoice_count >= 3 and not yet vip)
  if (invoiceCount >= 3 && !segments.includes("vip") && daysSinceLast !== undefined && daysSinceLast < 30) {
    segments.push("upsell_ready");
    tags.push("upsell_ready");
  }

  // Payment risk: has overdue invoices
  if (overdueAmount > 0) {
    segments.push("payment_risk");
    tags.push("payment_risk");
  }

  // Remove duplicates
  return {
    segments: [...new Set(segments)],
    tags: [...new Set(tags)],
  };
}

// ─── Main segmentation processor ─────────────────────────────────────────────

export async function processSegmentation(companyId: string): Promise<{
  processed: number;
  segments: Record<string, number>;
  changes: number;
}> {
  await ensureSegmentTable();
  const rules = (await getSegmentRules(companyId)) as SegmentRules;
  const now = new Date();

  // Query all customers with purchase history
  const customers = await prisma.$queryRaw<CustomerRow[]>`
    SELECT
      a.id, a.name, a.email, a.phone,
      COUNT(si.id) as invoice_count,
      COALESCE(SUM(CASE WHEN si.status = 'PAID' THEN si.total ELSE 0 END), 0) as total_revenue,
      COALESCE(SUM(CASE WHEN si.status != 'PAID' AND si."dueDate" < NOW() THEN si.total ELSE 0 END), 0) as overdue_amount,
      MAX(si."invoiceDate") as last_purchase_date
    FROM "Account" a
    LEFT JOIN "SalesInvoice" si ON si."customerName" = a.name AND si."companyId" = a."companyId"
    WHERE a."companyId" = ${companyId} AND a.type = 'Customer'
    GROUP BY a.id, a.name, a.email, a.phone
  `.catch(() => [] as CustomerRow[]);

  if (!customers.length) return { processed: 0, segments: {}, changes: 0 };

  // Also fetch recently created accounts (for "new" segment)
  interface NewAccountRow { id: string; "createdAt": Date }
  const newCutoff = new Date(Date.now() - rules.newCustomerDays * 86400000);
  const recentAccounts = await prisma.$queryRaw<NewAccountRow[]>`
    SELECT id, "createdAt" FROM "Account"
    WHERE "companyId" = ${companyId}
      AND type = 'Customer'
      AND "createdAt" >= ${newCutoff}
  `.catch(() => [] as NewAccountRow[]);

  const newAccountIds = new Set(recentAccounts.map((r) => r.id));

  // Build revenue list for high_value calculation
  const allRevenues = customers.map((r) => toNumber(r.total_revenue));

  const segmentCounts: Record<string, number> = {};
  let changes = 0;

  for (const row of customers) {
    const { segments, tags } = assignSegments(row, rules, allRevenues);

    // Add "new" segment if account was created recently
    if (newAccountIds.has(row.id) && !segments.includes("new")) {
      segments.push("new");
      tags.push("new");
    }

    const totalRevenue = toNumber(row.total_revenue);
    const invoiceCount = toNumber(row.invoice_count);
    const overdueAmount = toNumber(row.overdue_amount);

    let daysSinceLast: number | undefined;
    if (row.last_purchase_date) {
      daysSinceLast = Math.floor(
        (Date.now() - new Date(row.last_purchase_date).getTime()) / 86400000
      );
    }

    const avgOrderValue = invoiceCount > 0 ? totalRevenue / invoiceCount : 0;
    const paymentScore = calcPaymentScore(overdueAmount, totalRevenue);

    const metrics = {
      totalRevenue,
      invoiceCount,
      lastPurchaseDate: row.last_purchase_date
        ? new Date(row.last_purchase_date).toISOString()
        : undefined,
      daysSinceLastPurchase: daysSinceLast,
      avgOrderValue,
      overdueAmount,
      paymentScore,
    };

    // Upsert into CustomerSegment table
    const existing = await prisma.$queryRaw<{ segments: string }[]>`
      SELECT segments FROM "CustomerSegment"
      WHERE "companyId" = ${companyId} AND "customerId" = ${row.id}
      LIMIT 1
    `.catch(() => [] as { segments: string }[]);

    const existingSegments: string[] = existing[0]
      ? JSON.parse(existing[0].segments)
      : [];

    const hasChanged =
      JSON.stringify([...existingSegments].sort()) !==
      JSON.stringify([...segments].sort());

    if (hasChanged) changes++;

    await prisma.$executeRawUnsafe(`
      INSERT INTO "CustomerSegment" ("companyId", "customerId", "customerName", "email", "phone", "segments", "tags", "metrics", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT ("companyId", "customerId") DO UPDATE
        SET "customerName" = EXCLUDED."customerName",
            "email"        = EXCLUDED."email",
            "phone"        = EXCLUDED."phone",
            "segments"     = EXCLUDED."segments",
            "tags"         = EXCLUDED."tags",
            "metrics"      = EXCLUDED."metrics",
            "updatedAt"    = EXCLUDED."updatedAt"
    `,
      companyId,
      row.id,
      row.name,
      row.email ?? null,
      row.phone ?? null,
      JSON.stringify(segments),
      JSON.stringify(tags),
      JSON.stringify(metrics),
      now
    );

    for (const seg of segments) {
      segmentCounts[seg] = (segmentCounts[seg] ?? 0) + 1;
    }
  }

  return {
    processed: customers.length,
    segments: segmentCounts,
    changes,
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

interface SegmentRow {
  customerId: string;
  customerName: string;
  email: string | null;
  phone: string | null;
  segments: string;
  tags: string;
  metrics: string;
  updatedAt: Date;
}

function rowToSegment(r: SegmentRow): CustomerSegment {
  return {
    customerId: r.customerId,
    customerName: r.customerName,
    email: r.email ?? undefined,
    phone: r.phone ?? undefined,
    segments: JSON.parse(r.segments),
    tags: JSON.parse(r.tags),
    metrics: JSON.parse(r.metrics),
    updatedAt: new Date(r.updatedAt).toISOString(),
  };
}

export async function getSegments(
  companyId: string,
  segment?: string
): Promise<CustomerSegment[]> {
  await ensureSegmentTable();

  try {
    if (segment) {
      const rows = await prisma.$queryRaw<SegmentRow[]>`
        SELECT "customerId", "customerName", "email", "phone", "segments", "tags", "metrics", "updatedAt"
        FROM "CustomerSegment"
        WHERE "companyId" = ${companyId}
          AND "segments"::jsonb ? ${segment}
        ORDER BY "updatedAt" DESC
      `;
      return rows.map(rowToSegment);
    }

    const rows = await prisma.$queryRaw<SegmentRow[]>`
      SELECT "customerId", "customerName", "email", "phone", "segments", "tags", "metrics", "updatedAt"
      FROM "CustomerSegment"
      WHERE "companyId" = ${companyId}
      ORDER BY "updatedAt" DESC
    `;
    return rows.map(rowToSegment);
  } catch (e) {
    console.error("[getSegments] error:", e);
    return [];
  }
}

export async function getSegmentStats(companyId: string): Promise<{
  total: number;
  bySegment: Record<string, number>;
  vipRevenue: number;
  atRiskRevenue: number;
}> {
  await ensureSegmentTable();

  try {
    const rows = await prisma.$queryRaw<{ segments: string; metrics: string }[]>`
      SELECT "segments", "metrics"
      FROM "CustomerSegment"
      WHERE "companyId" = ${companyId}
    `;

    const bySegment: Record<string, number> = {};
    let vipRevenue = 0;
    let atRiskRevenue = 0;

    for (const row of rows) {
      const segs: string[] = JSON.parse(row.segments);
      const metrics = JSON.parse(row.metrics) as { totalRevenue?: number };

      for (const seg of segs) {
        bySegment[seg] = (bySegment[seg] ?? 0) + 1;
      }

      if (segs.includes("vip")) vipRevenue += metrics.totalRevenue ?? 0;
      if (segs.includes("at_risk")) atRiskRevenue += metrics.totalRevenue ?? 0;
    }

    return { total: rows.length, bySegment, vipRevenue, atRiskRevenue };
  } catch (e) {
    console.error("[getSegmentStats] error:", e);
    return { total: 0, bySegment: {}, vipRevenue: 0, atRiskRevenue: 0 };
  }
}
