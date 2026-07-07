import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";
import { sendWhatsApp } from "@/lib/whatsapp";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LifecycleStep {
  order: number;
  delayDays: number;
  channel: "email" | "sms" | "whatsapp";
  subject?: string;
  template: string;
}

export interface LifecycleSequence {
  id: string;
  name: string;
  stage: string;
  steps: LifecycleStep[];
  active: boolean;
  triggerCondition: string; // "new_customer" | "inactive_60d" | "at_risk" | "vip_upgrade"
}

export interface CustomerJourney {
  id: string;
  companyId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  stage: string;
  sequenceId: string;
  currentStep: number;
  nextActionAt: string;
  status: "active" | "completed" | "paused" | "cancelled";
  enrolledAt: string;
}

interface SequenceRow {
  id: string;
  companyId: string;
  data: string;
  createdAt: Date;
}

interface JourneyRow {
  id: string;
  companyId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  sequenceId: string;
  currentStep: number;
  nextActionAt: Date | null;
  status: string;
  enrolledAt: Date;
}

// ─── Table creation ───────────────────────────────────────────────────────────

export async function ensureLifecycleTables(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "LifecycleSequence" (
      "id"        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "companyId" TEXT NOT NULL,
      "data"      TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).catch(() => {});

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CustomerJourney" (
      "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "companyId"     TEXT NOT NULL,
      "customerId"    TEXT NOT NULL,
      "customerName"  TEXT NOT NULL DEFAULT '',
      "customerEmail" TEXT NOT NULL DEFAULT '',
      "customerPhone" TEXT,
      "sequenceId"    TEXT NOT NULL,
      "currentStep"   INTEGER NOT NULL DEFAULT 0,
      "nextActionAt"  TIMESTAMP(3),
      "status"        TEXT NOT NULL DEFAULT 'active',
      "enrolledAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "completedAt"   TIMESTAMP(3),
      UNIQUE ("companyId", "customerId", "sequenceId")
    )
  `).catch(() => {});
}

// ─── Default sequences ────────────────────────────────────────────────────────

export function getDefaultSequences(): Omit<LifecycleSequence, "id">[] {
  return [
    {
      name: "Welcome Sequence",
      stage: "welcome",
      triggerCondition: "new_customer",
      active: true,
      steps: [
        {
          order: 1,
          delayDays: 0,
          channel: "email",
          subject: "Welcome to {{company}}, {{name}}!",
          template:
            "Hi {{name}},\n\nWelcome aboard! We're thrilled to have you as a customer.\n\nHere's what you can expect from us:\n- Fast and reliable service\n- Transparent invoicing\n- Dedicated support\n\nFeel free to reach out anytime.\n\nWarm regards,\nThe Team",
        },
        {
          order: 2,
          delayDays: 2,
          channel: "sms",
          template:
            "Hi {{name}}, thanks for choosing us! Need help getting started? Reply YES and we'll send you a quick guide.",
        },
        {
          order: 3,
          delayDays: 5,
          channel: "email",
          subject: "5 things you can do with your account, {{name}}",
          template:
            "Hi {{name}},\n\nHere are 5 quick tips to get the most out of your account:\n\n1. Check your invoices anytime\n2. Set payment reminders\n3. Track your purchase history\n4. Update your billing details\n5. Contact support via chat\n\nHappy to help!\nThe Team",
        },
      ],
    },
    {
      name: "Onboarding Sequence",
      stage: "onboarding",
      triggerCondition: "new_customer",
      active: true,
      steps: [
        {
          order: 1,
          delayDays: 7,
          channel: "email",
          subject: "How's everything going, {{name}}?",
          template:
            "Hi {{name}},\n\nIt's been a week since you joined us. We hope everything is going smoothly!\n\nHere are a few resources to help you:\n- Getting started guide\n- FAQ\n- Contact support\n\nWe're here if you need anything.\n\nBest,\nThe Team",
        },
        {
          order: 2,
          delayDays: 14,
          channel: "email",
          subject: "Unlock the full power of your account, {{name}}",
          template:
            "Hi {{name}},\n\nTwo weeks in — great to have you! Did you know you can do even more with your account?\n\nAdvanced features available to you:\n- Bulk invoice management\n- Automated payment reminders\n- Detailed spending reports\n\nLog in and explore today.\n\nCheers,\nThe Team",
        },
      ],
    },
    {
      name: "Win-back Sequence",
      stage: "winback",
      triggerCondition: "inactive_60d",
      active: true,
      steps: [
        {
          order: 1,
          delayDays: 0,
          channel: "email",
          subject: "We miss you, {{name}}!",
          template:
            "Hi {{name}},\n\nIt's been a while since we last heard from you. We miss having you around!\n\nWe've made several improvements since your last visit. Come back and see what's new.\n\nWe'd love to serve you again.\n\nWarm regards,\nThe Team",
        },
        {
          order: 2,
          delayDays: 3,
          channel: "sms",
          template:
            "Hi {{name}}, we haven't seen you in a while. Come back and check out what's new — we think you'll like it!",
        },
        {
          order: 3,
          delayDays: 7,
          channel: "email",
          subject: "Last chance to reconnect, {{name}}",
          template:
            "Hi {{name}},\n\nWe wanted to reach out one more time. We value your business and would love to have you back.\n\nIf there's anything we can do better, please let us know — your feedback helps us improve.\n\nHope to hear from you soon.\n\nBest,\nThe Team",
        },
      ],
    },
    {
      name: "Churn Prevention Sequence",
      stage: "churn_prevention",
      triggerCondition: "at_risk",
      active: true,
      steps: [
        {
          order: 1,
          delayDays: 0,
          channel: "email",
          subject: "We noticed you haven't been active lately, {{name}}",
          template:
            "Hi {{name}},\n\nWe noticed you haven't placed an order recently. We want to make sure everything is alright.\n\nIf you had any issues with our service, we'd love the opportunity to make it right.\n\nPlease reply to this email or call us — we're here to help.\n\nCaring regards,\nThe Team",
        },
        {
          order: 2,
          delayDays: 5,
          channel: "whatsapp",
          template:
            "Hi {{name}}, this is a personal note from our team. We value your business and want to ensure you're happy. Can we help with anything?",
        },
      ],
    },
  ];
}

// ─── Sequence CRUD ────────────────────────────────────────────────────────────

export async function getSequences(companyId: string): Promise<LifecycleSequence[]> {
  await ensureLifecycleTables();

  try {
    const rows = await prisma.$queryRaw<SequenceRow[]>`
      SELECT id, "companyId", data, "createdAt"
      FROM "LifecycleSequence"
      WHERE "companyId" = ${companyId}
      ORDER BY "createdAt" ASC
    `;

    if (rows.length === 0) {
      // Seed defaults on first call
      const defaults = getDefaultSequences();
      const seeded: LifecycleSequence[] = [];
      for (const seq of defaults) {
        const saved = await saveSequence(companyId, seq);
        seeded.push(saved);
      }
      return seeded;
    }

    return rows.map((r) => ({ id: r.id, ...JSON.parse(r.data) } as LifecycleSequence));
  } catch (e) {
    console.error("[getSequences] error:", e);
    return [];
  }
}

export async function saveSequence(
  companyId: string,
  sequence: Omit<LifecycleSequence, "id">
): Promise<LifecycleSequence> {
  await ensureLifecycleTables();

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    INSERT INTO "LifecycleSequence" ("companyId", "data")
    VALUES (${companyId}, ${JSON.stringify(sequence)})
    RETURNING id
  `;

  const id = rows[0]?.id ?? "";
  return { id, ...sequence };
}

export async function updateSequence(
  companyId: string,
  id: string,
  sequence: Partial<Omit<LifecycleSequence, "id">>
): Promise<LifecycleSequence | null> {
  await ensureLifecycleTables();

  const existing = await prisma.$queryRaw<{ data: string }[]>`
    SELECT data FROM "LifecycleSequence"
    WHERE id = ${id} AND "companyId" = ${companyId}
    LIMIT 1
  `.catch(() => [] as { data: string }[]);

  if (!existing[0]) return null;

  const merged = { ...JSON.parse(existing[0].data), ...sequence };

  await prisma.$executeRaw`
    UPDATE "LifecycleSequence"
    SET "data" = ${JSON.stringify(merged)}, "updatedAt" = CURRENT_TIMESTAMP
    WHERE id = ${id} AND "companyId" = ${companyId}
  `;

  return { id, ...merged };
}

export async function deleteSequence(companyId: string, id: string): Promise<boolean> {
  await ensureLifecycleTables();

  await prisma.$executeRaw`
    DELETE FROM "LifecycleSequence"
    WHERE id = ${id} AND "companyId" = ${companyId}
  `;

  return true;
}

// ─── Enrollment ───────────────────────────────────────────────────────────────

export async function enrollCustomer(
  companyId: string,
  data: {
    customerId: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    sequenceId: string;
  }
): Promise<CustomerJourney> {
  await ensureLifecycleTables();

  // Fetch sequence to find first step delay
  const seqRows = await prisma.$queryRaw<{ data: string }[]>`
    SELECT data FROM "LifecycleSequence"
    WHERE id = ${data.sequenceId} AND "companyId" = ${companyId}
    LIMIT 1
  `.catch(() => [] as { data: string }[]);

  if (!seqRows[0]) throw new Error("Sequence not found");

  const sequence: Omit<LifecycleSequence, "id"> = JSON.parse(seqRows[0].data);
  const firstStep = sequence.steps?.[0];
  const delayDays = firstStep?.delayDays ?? 0;
  const nextActionAt = new Date(Date.now() + delayDays * 86400000);

  const rows = await prisma.$queryRaw<{ id: string; "enrolledAt": Date }[]>`
    INSERT INTO "CustomerJourney" (
      "companyId", "customerId", "customerName", "customerEmail",
      "customerPhone", "sequenceId", "currentStep", "nextActionAt", "status"
    )
    VALUES (
      ${companyId}, ${data.customerId}, ${data.customerName}, ${data.customerEmail},
      ${data.customerPhone ?? null}, ${data.sequenceId}, ${0}, ${nextActionAt}, 'active'
    )
    ON CONFLICT ("companyId", "customerId", "sequenceId") DO UPDATE
      SET "status" = 'active',
          "currentStep" = 0,
          "nextActionAt" = EXCLUDED."nextActionAt",
          "enrolledAt" = CURRENT_TIMESTAMP
    RETURNING id, "enrolledAt"
  `;

  const row = rows[0];

  return {
    id: row.id,
    companyId,
    customerId: data.customerId,
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    stage: sequence.stage,
    sequenceId: data.sequenceId,
    currentStep: 0,
    nextActionAt: nextActionAt.toISOString(),
    status: "active",
    enrolledAt: new Date(row.enrolledAt).toISOString(),
  };
}

// ─── Template rendering ───────────────────────────────────────────────────────

function renderTemplate(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return out;
}

// ─── Process lifecycle queue (cron) ──────────────────────────────────────────

export async function processLifecycleQueue(companyId?: string): Promise<{
  processed: number;
  sent: number;
  completed: number;
}> {
  await ensureLifecycleTables();

  const now = new Date();
  let processed = 0;
  let sent = 0;
  let completed = 0;

  type DueRow = JourneyRow & { companyId: string };
  let dueRows: DueRow[];

  if (companyId) {
    dueRows = await prisma.$queryRaw<DueRow[]>`
      SELECT id, "companyId", "customerId", "customerName", "customerEmail",
             "sequenceId", "currentStep", "nextActionAt", "status", "enrolledAt"
      FROM "CustomerJourney"
      WHERE status = 'active'
        AND "nextActionAt" <= ${now}
        AND "companyId" = ${companyId}
      LIMIT 100
    `.catch(() => [] as DueRow[]);
  } else {
    dueRows = await prisma.$queryRaw<DueRow[]>`
      SELECT id, "companyId", "customerId", "customerName", "customerEmail",
             "sequenceId", "currentStep", "nextActionAt", "status", "enrolledAt"
      FROM "CustomerJourney"
      WHERE status = 'active'
        AND "nextActionAt" <= ${now}
      LIMIT 100
    `.catch(() => [] as DueRow[]);
  }

  for (const journey of dueRows) {
    processed++;

    // Load sequence
    const seqRows = await prisma.$queryRaw<{ data: string }[]>`
      SELECT data FROM "LifecycleSequence"
      WHERE id = ${journey.sequenceId} AND "companyId" = ${journey.companyId}
      LIMIT 1
    `.catch(() => [] as { data: string }[]);

    if (!seqRows[0]) {
      // Orphan journey — mark complete
      await prisma.$executeRaw`
        UPDATE "CustomerJourney" SET "status" = 'completed', "completedAt" = ${now}
        WHERE id = ${journey.id}
      `.catch(() => {});
      completed++;
      continue;
    }

    const sequence: Omit<LifecycleSequence, "id"> = JSON.parse(seqRows[0].data);
    const step = sequence.steps?.find((s) => s.order === journey.currentStep + 1);

    if (!step) {
      // No more steps — complete
      await prisma.$executeRaw`
        UPDATE "CustomerJourney" SET "status" = 'completed', "completedAt" = ${now}
        WHERE id = ${journey.id}
      `.catch(() => {});
      completed++;
      continue;
    }

    const vars: Record<string, string> = {
      name: journey.customerName,
      email: journey.customerEmail,
      company: "FinovaOS",
    };

    // Send message
    let success = false;
    try {
      if (step.channel === "email") {
        const subject = renderTemplate(step.subject ?? "A message for you", vars);
        const body = renderTemplate(step.template, vars);
        const result = await sendEmail({
          to: journey.customerEmail,
          subject,
          html: `<p>${body.replace(/\n/g, "<br/>")}</p>`,
          companyId: journey.companyId,
        });
        success = result.success;
      } else if (step.channel === "sms") {
        // Fetch phone from CustomerJourney
        const phoneRows = await prisma.$queryRaw<{ customerPhone: string | null }[]>`
          SELECT "customerPhone" FROM "CustomerJourney" WHERE id = ${journey.id} LIMIT 1
        `.catch(() => [] as { customerPhone: string | null }[]);
        const phone = phoneRows[0]?.customerPhone;
        if (phone) {
          const result = await sendSms({ to: phone, message: renderTemplate(step.template, vars) });
          success = result.success;
        }
      } else if (step.channel === "whatsapp") {
        const phoneRows = await prisma.$queryRaw<{ customerPhone: string | null }[]>`
          SELECT "customerPhone" FROM "CustomerJourney" WHERE id = ${journey.id} LIMIT 1
        `.catch(() => [] as { customerPhone: string | null }[]);
        const phone = phoneRows[0]?.customerPhone;
        if (phone) {
          const result = await sendWhatsApp(journey.companyId, {
            to: phone,
            type: "text",
            text: renderTemplate(step.template, vars),
          });
          success = result.success;
        }
      }
    } catch (e) {
      console.error(`[lifecycle] send error journey=${journey.id}:`, e);
    }

    if (success) sent++;

    // Advance to next step
    const nextStep = sequence.steps?.find((s) => s.order === step.order + 1);

    if (nextStep) {
      const nextAt = new Date(Date.now() + nextStep.delayDays * 86400000);
      await prisma.$executeRaw`
        UPDATE "CustomerJourney"
        SET "currentStep" = ${step.order}, "nextActionAt" = ${nextAt}
        WHERE id = ${journey.id}
      `.catch(() => {});
    } else {
      await prisma.$executeRaw`
        UPDATE "CustomerJourney"
        SET "currentStep" = ${step.order}, "status" = 'completed', "completedAt" = ${now}
        WHERE id = ${journey.id}
      `.catch(() => {});
      completed++;
    }
  }

  return { processed, sent, completed };
}

// ─── Auto-trigger enrollments ─────────────────────────────────────────────────

export async function autoTriggerEnrollments(
  companyId: string
): Promise<{ enrolled: number; triggers: Record<string, number> }> {
  await ensureLifecycleTables();

  const sequences = await getSequences(companyId);
  const activeSequences = sequences.filter((s) => s.active);

  let enrolled = 0;
  const triggers: Record<string, number> = {};

  // ── New customers (created in last 24h) → welcome sequence ─────────────────
  interface AccountRow { id: string; name: string; email: string | null; phone: string | null }
  const newCustomers = await prisma.$queryRaw<AccountRow[]>`
    SELECT id, name, email, phone FROM "Account"
    WHERE "companyId" = ${companyId}
      AND type = 'Customer'
      AND "createdAt" >= NOW() - INTERVAL '1 day'
  `.catch(() => [] as AccountRow[]);

  const welcomeSeqs = activeSequences.filter(
    (s) => s.triggerCondition === "new_customer" && s.stage === "welcome"
  );

  for (const customer of newCustomers) {
    for (const seq of welcomeSeqs) {
      try {
        await enrollCustomer(companyId, {
          customerId: customer.id,
          customerName: customer.name,
          customerEmail: customer.email ?? "",
          customerPhone: customer.phone ?? undefined,
          sequenceId: seq.id,
        });
        enrolled++;
        triggers["new_customer"] = (triggers["new_customer"] ?? 0) + 1;
      } catch (e) {
        // Already enrolled — skip
      }
    }
  }

  // ── Inactive 60 days → winback sequence ────────────────────────────────────
  interface CustomerRow { id: string; name: string; email: string | null; phone: string | null; last_purchase_date: Date | null }
  const inactiveCustomers = await prisma.$queryRaw<CustomerRow[]>`
    SELECT
      a.id, a.name, a.email, a.phone,
      MAX(si."invoiceDate") as last_purchase_date
    FROM "Account" a
    LEFT JOIN "SalesInvoice" si ON si."customerName" = a.name AND si."companyId" = a."companyId"
    WHERE a."companyId" = ${companyId} AND a.type = 'Customer'
    GROUP BY a.id, a.name, a.email, a.phone
    HAVING MAX(si."invoiceDate") < NOW() - INTERVAL '60 days'
      OR MAX(si."invoiceDate") IS NULL
  `.catch(() => [] as CustomerRow[]);

  const winbackSeqs = activeSequences.filter(
    (s) => s.triggerCondition === "inactive_60d"
  );

  for (const customer of inactiveCustomers) {
    for (const seq of winbackSeqs) {
      // Check not already in an active journey for this sequence
      const existing = await prisma.$queryRaw<{ status: string }[]>`
        SELECT status FROM "CustomerJourney"
        WHERE "companyId" = ${companyId}
          AND "customerId" = ${customer.id}
          AND "sequenceId" = ${seq.id}
          AND status = 'active'
        LIMIT 1
      `.catch(() => [] as { status: string }[]);

      if (existing.length > 0) continue;

      try {
        await enrollCustomer(companyId, {
          customerId: customer.id,
          customerName: customer.name,
          customerEmail: customer.email ?? "",
          customerPhone: customer.phone ?? undefined,
          sequenceId: seq.id,
        });
        enrolled++;
        triggers["inactive_60d"] = (triggers["inactive_60d"] ?? 0) + 1;
      } catch (e) {
        // skip
      }
    }
  }

  // ── At-risk customers → churn_prevention sequence ──────────────────────────
  interface SegmentRow { customerId: string; customerName: string; email: string | null; phone: string | null; segments: string }
  const atRiskRows = await prisma.$queryRaw<SegmentRow[]>`
    SELECT "customerId", "customerName", "email", "phone", "segments"
    FROM "CustomerSegment"
    WHERE "companyId" = ${companyId}
      AND "segments"::jsonb ? 'at_risk'
  `.catch(() => [] as SegmentRow[]);

  const churnSeqs = activeSequences.filter(
    (s) => s.triggerCondition === "at_risk"
  );

  for (const customer of atRiskRows) {
    for (const seq of churnSeqs) {
      const existing = await prisma.$queryRaw<{ status: string }[]>`
        SELECT status FROM "CustomerJourney"
        WHERE "companyId" = ${companyId}
          AND "customerId" = ${customer.customerId}
          AND "sequenceId" = ${seq.id}
          AND status = 'active'
        LIMIT 1
      `.catch(() => [] as { status: string }[]);

      if (existing.length > 0) continue;

      try {
        await enrollCustomer(companyId, {
          customerId: customer.customerId,
          customerName: customer.customerName,
          customerEmail: customer.email ?? "",
          customerPhone: customer.phone ?? undefined,
          sequenceId: seq.id,
        });
        enrolled++;
        triggers["at_risk"] = (triggers["at_risk"] ?? 0) + 1;
      } catch (e) {
        // skip
      }
    }
  }

  return { enrolled, triggers };
}

// ─── Journey queries ──────────────────────────────────────────────────────────

export async function getJourneys(
  companyId: string,
  status?: string
): Promise<CustomerJourney[]> {
  await ensureLifecycleTables();

  try {
    type JourneyWithCompany = JourneyRow & { companyId: string };
    let rows: JourneyWithCompany[];

    if (status) {
      rows = await prisma.$queryRaw<JourneyWithCompany[]>`
        SELECT j.id, j."companyId", j."customerId", j."customerName", j."customerEmail",
               j."sequenceId", j."currentStep", j."nextActionAt", j."status", j."enrolledAt"
        FROM "CustomerJourney" j
        WHERE j."companyId" = ${companyId}
          AND j.status = ${status}
        ORDER BY j."enrolledAt" DESC
        LIMIT 500
      `;
    } else {
      rows = await prisma.$queryRaw<JourneyWithCompany[]>`
        SELECT j.id, j."companyId", j."customerId", j."customerName", j."customerEmail",
               j."sequenceId", j."currentStep", j."nextActionAt", j."status", j."enrolledAt"
        FROM "CustomerJourney" j
        WHERE j."companyId" = ${companyId}
        ORDER BY j."enrolledAt" DESC
        LIMIT 500
      `;
    }

    // Load stage info from sequences
    const seqRows = await prisma.$queryRaw<{ id: string; data: string }[]>`
      SELECT id, data FROM "LifecycleSequence" WHERE "companyId" = ${companyId}
    `.catch(() => [] as { id: string; data: string }[]);

    const seqMap = new Map(
      seqRows.map((r) => [r.id, JSON.parse(r.data) as { stage: string }])
    );

    return rows.map((r) => ({
      id: r.id,
      companyId: r.companyId,
      customerId: r.customerId,
      customerName: r.customerName,
      customerEmail: r.customerEmail,
      stage: seqMap.get(r.sequenceId)?.stage ?? "unknown",
      sequenceId: r.sequenceId,
      currentStep: r.currentStep,
      nextActionAt: r.nextActionAt ? new Date(r.nextActionAt).toISOString() : "",
      status: r.status as CustomerJourney["status"],
      enrolledAt: new Date(r.enrolledAt).toISOString(),
    }));
  } catch (e) {
    console.error("[getJourneys] error:", e);
    return [];
  }
}
