import { prisma } from "@/lib/prisma";
import crypto from "crypto";

async function ensureWebhookTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "OutboundWebhook" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "companyId" TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL,
      events TEXT NOT NULL DEFAULT '[]',
      secret TEXT NOT NULL DEFAULT '',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      "lastFired" TIMESTAMPTZ,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `).catch(() => {});
}

export async function fireWebhookEvent(companyId: string, event: string, data: any) {
  try {
    await ensureWebhookTable();
    const hooks = await prisma.$queryRaw<{ id: string; url: string; secret: string; events: string }[]>`
      SELECT id, url, secret, events FROM "OutboundWebhook"
      WHERE "companyId" = ${companyId} AND "active" = TRUE
    `.catch(() => [] as { id: string; url: string; secret: string; events: string }[]);

    for (const hook of hooks) {
      const evts: string[] = JSON.parse(hook.events || "[]");
      if (evts.length > 0 && !evts.includes(event) && !evts.includes("*")) continue;

      const body = JSON.stringify({ event, data, _company: companyId, _timestamp: Date.now() });
      const sig = crypto.createHmac("sha256", hook.secret || "").update(body).digest("hex");

      fetch(hook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-FinovaOS-Signature": `sha256=${sig}`,
          "X-FinovaOS-Event": event,
        },
        body,
        signal: AbortSignal.timeout(10000),
      }).then(() => {
        prisma.$executeRaw`
          UPDATE "OutboundWebhook" SET "lastFired" = CURRENT_TIMESTAMP WHERE "id" = ${hook.id}
        `.catch(() => {});
      }).catch(console.error);
    }
  } catch (e) {
    console.error("fireWebhookEvent error:", e);
  }
}
