/**
 * lib/inventoryReorder.ts
 * Automatic inventory reorder system.
 *
 * ReorderRule table schema:
 *   id, companyId, itemId, itemName, reorderPoint, reorderQty,
 *   preferredSupplierId?, preferredSupplierName?, autoCreatePo, active, lastTriggered?
 */

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReorderRule {
  id: string;
  companyId: string;
  itemId: string;
  itemName: string;
  reorderPoint: number;
  reorderQty: number;
  preferredSupplierId?: string;
  preferredSupplierName?: string;
  autoCreatePo: boolean;
  active: boolean;
  lastTriggered?: string;
}

export interface ReorderTrigger {
  itemId: string;
  itemName: string;
  currentStock: number;
  reorderPoint: number;
  reorderQty: number;
  supplierId?: string;
  supplierName?: string;
  poCreated: boolean;
  poId?: string;
  notified: boolean;
}

// ---------------------------------------------------------------------------
// Table bootstrap
// ---------------------------------------------------------------------------

export async function ensureReorderTable(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ReorderRule" (
      "id"                     TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "companyId"              TEXT NOT NULL,
      "itemId"                 TEXT NOT NULL,
      "itemName"               TEXT NOT NULL DEFAULT '',
      "reorderPoint"           DOUBLE PRECISION NOT NULL DEFAULT 0,
      "reorderQty"             DOUBLE PRECISION NOT NULL DEFAULT 0,
      "preferredSupplierId"    TEXT,
      "preferredSupplierName"  TEXT,
      "autoCreatePo"           BOOLEAN NOT NULL DEFAULT false,
      "active"                 BOOLEAN NOT NULL DEFAULT true,
      "lastTriggered"          TIMESTAMP(3),
      "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ReorderRule_companyId_active"
      ON "ReorderRule" ("companyId", "active")
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "ReorderRule_companyId_itemId"
      ON "ReorderRule" ("companyId", "itemId")
  `);
}

// ---------------------------------------------------------------------------
// CRUD helpers
// ---------------------------------------------------------------------------

export async function getReorderRules(companyId: string): Promise<ReorderRule[]> {
  await ensureReorderTable();

  return prisma.$queryRaw<ReorderRule[]>`
    SELECT
      "id", "companyId", "itemId", "itemName",
      "reorderPoint", "reorderQty",
      "preferredSupplierId", "preferredSupplierName",
      "autoCreatePo", "active",
      "lastTriggered"::text AS "lastTriggered"
    FROM "ReorderRule"
    WHERE "companyId" = ${companyId}
    ORDER BY "itemName" ASC
  `;
}

export async function saveReorderRule(
  companyId: string,
  rule: Omit<ReorderRule, "id">,
): Promise<ReorderRule> {
  await ensureReorderTable();

  // Upsert on (companyId, itemId)
  const rows = await prisma.$queryRaw<ReorderRule[]>`
    INSERT INTO "ReorderRule"
      ("companyId", "itemId", "itemName", "reorderPoint", "reorderQty",
       "preferredSupplierId", "preferredSupplierName", "autoCreatePo", "active")
    VALUES
      (${companyId}, ${rule.itemId}, ${rule.itemName},
       ${rule.reorderPoint}, ${rule.reorderQty},
       ${rule.preferredSupplierId ?? null}, ${rule.preferredSupplierName ?? null},
       ${rule.autoCreatePo}, ${rule.active})
    ON CONFLICT ("companyId", "itemId") DO UPDATE SET
      "itemName"              = EXCLUDED."itemName",
      "reorderPoint"          = EXCLUDED."reorderPoint",
      "reorderQty"            = EXCLUDED."reorderQty",
      "preferredSupplierId"   = EXCLUDED."preferredSupplierId",
      "preferredSupplierName" = EXCLUDED."preferredSupplierName",
      "autoCreatePo"          = EXCLUDED."autoCreatePo",
      "active"                = EXCLUDED."active"
    RETURNING
      "id", "companyId", "itemId", "itemName",
      "reorderPoint", "reorderQty",
      "preferredSupplierId", "preferredSupplierName",
      "autoCreatePo", "active",
      "lastTriggered"::text AS "lastTriggered"
  `;

  return rows[0];
}

export async function deleteReorderRule(ruleId: string): Promise<void> {
  await ensureReorderTable();
  await prisma.$executeRawUnsafe(
    `DELETE FROM "ReorderRule" WHERE "id" = $1`,
    ruleId,
  );
}

// ---------------------------------------------------------------------------
// Stock query
// ---------------------------------------------------------------------------

export async function getCurrentStock(
  companyId: string,
  itemId: string,
): Promise<number> {
  // Try StockLedger first
  try {
    const rows = await prisma.$queryRaw<Array<{ stock: number }>>`
      SELECT COALESCE(
        SUM(CASE WHEN "type" = 'IN' THEN "qty" ELSE -"qty" END),
        0
      ) AS stock
      FROM "StockLedger"
      WHERE "companyId" = ${companyId}
        AND "itemId"    = ${itemId}
    `;
    return Number(rows[0]?.stock ?? 0);
  } catch {
    // StockLedger doesn't exist — fall back to Item/ItemNew currentStock / inventoryTxns
  }

  // Try inventoryTxns aggregate (InventoryTxn table used by inventory route)
  try {
    const rows = await prisma.$queryRaw<Array<{ stock: number }>>`
      SELECT COALESCE(SUM("qty"), 0) AS stock
      FROM "InventoryTxn"
      WHERE "companyId" = ${companyId}
        AND "itemId"    = ${itemId}
    `;
    return Number(rows[0]?.stock ?? 0);
  } catch {
    // Fall through
  }

  // Last resort: ItemNew.currentStock or minStock
  try {
    const rows = await prisma.$queryRaw<Array<{ currentStock: number | null }>>`
      SELECT "currentStock"
      FROM "ItemNew"
      WHERE "companyId" = ${companyId}
        AND "id"        = ${itemId}
      LIMIT 1
    `;
    return Number(rows[0]?.currentStock ?? 0);
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Create reorder PO
// ---------------------------------------------------------------------------

export async function createReorderPo(
  companyId: string,
  trigger: ReorderTrigger,
): Promise<string | null> {
  try {
    // Log to ActivityLog as a draft PO event (universal fallback)
    const logRows = await prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO "ActivityLog"
        ("companyId", "action", "details")
      VALUES
        (${companyId},
         'REORDER_PO_DRAFT',
         ${JSON.stringify({
           itemId:       trigger.itemId,
           itemName:     trigger.itemName,
           reorderQty:   trigger.reorderQty,
           supplierId:   trigger.supplierId ?? null,
           supplierName: trigger.supplierName ?? null,
           currentStock: trigger.currentStock,
           reorderPoint: trigger.reorderPoint,
           createdAt:    new Date().toISOString(),
         })})
      RETURNING "id"
    `;

    const logId = logRows[0]?.id ?? null;

    // Also attempt to insert into PurchaseOrder table if it exists
    try {
      const poNumber = `REORDER-${Date.now()}`;
      const poRows = await prisma.$queryRaw<Array<{ id: string }>>`
        INSERT INTO "PurchaseOrder"
          ("companyId", "poNumber", "supplierId", "supplierName", "status", "totalAmount", "notes")
        VALUES
          (${companyId}, ${poNumber},
           ${trigger.supplierId ?? null}, ${trigger.supplierName ?? "Auto-reorder"},
           'draft', 0,
           ${`Auto-reorder for ${trigger.itemName} — qty: ${trigger.reorderQty}`})
        RETURNING "id"
      `;
      return poRows[0]?.id ?? logId;
    } catch {
      // PurchaseOrder table may not exist — return the ActivityLog id
      return logId;
    }
  } catch (err) {
    console.error("[inventoryReorder] createReorderPo error:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Core check-and-trigger logic
// ---------------------------------------------------------------------------

export async function checkAndTriggerReorders(
  companyId: string,
): Promise<{
  checked: number;
  triggered: ReorderTrigger[];
  posCreated: number;
  notifications: number;
}> {
  await ensureReorderTable();

  const rules = await getReorderRules(companyId);
  const activeRules = rules.filter((r) => r.active);

  const triggered: ReorderTrigger[] = [];
  let posCreated   = 0;
  let notifications = 0;

  for (const rule of activeRules) {
    try {
      const currentStock = await getCurrentStock(companyId, rule.itemId);

      if (currentStock > rule.reorderPoint) continue;

      const trigger: ReorderTrigger = {
        itemId:       rule.itemId,
        itemName:     rule.itemName,
        currentStock,
        reorderPoint: rule.reorderPoint,
        reorderQty:   rule.reorderQty,
        supplierId:   rule.preferredSupplierId,
        supplierName: rule.preferredSupplierName,
        poCreated:    false,
        notified:     false,
      };

      // Auto-create PO if configured
      if (rule.autoCreatePo) {
        const poId = await createReorderPo(companyId, trigger);
        if (poId) {
          trigger.poCreated = true;
          trigger.poId      = poId;
          posCreated++;
        }
      }

      // Send notifications
      const notified = await notifyReorder(companyId, trigger).catch((err) => {
        console.error("[inventoryReorder] notify error:", err);
        return false;
      });
      if (notified) {
        trigger.notified = true;
        notifications++;
      }

      // Update lastTriggered
      await prisma.$executeRawUnsafe(
        `UPDATE "ReorderRule" SET "lastTriggered" = $1 WHERE "id" = $2`,
        new Date(),
        rule.id,
      );

      triggered.push(trigger);
    } catch (err) {
      console.error("[inventoryReorder] Error checking rule", rule.id, err);
    }
  }

  return {
    checked:       activeRules.length,
    triggered,
    posCreated,
    notifications,
  };
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

async function notifyReorder(
  companyId: string,
  trigger: ReorderTrigger,
): Promise<boolean> {
  try {
    // Fetch procurement contact from company settings (best effort)
    const contactRows = await prisma.$queryRaw<Array<{ email: string | null; phone: string | null }>>`
      SELECT "email", "phone"
      FROM "Company"
      WHERE "id" = ${companyId}
      LIMIT 1
    `.catch(() => [] as Array<{ email: string | null; phone: string | null }>);

    const contact = contactRows[0];

    const subject = `[Reorder Alert] ${trigger.itemName} — stock below reorder point`;
    const body    = buildReorderEmail(trigger);
    const smsText = `[FinovaOS Reorder] ${trigger.itemName} stock is ${trigger.currentStock} (reorder point: ${trigger.reorderPoint}). Reorder qty: ${trigger.reorderQty}.${trigger.poCreated ? ` Draft PO created (${trigger.poId}).` : ""}`;

    await Promise.allSettled([
      contact?.email
        ? sendEmail({ to: contact.email, subject, html: body })
        : Promise.resolve(),
      contact?.phone
        ? sendSms({ to: contact.phone, message: smsText })
        : Promise.resolve(),
    ]);

    return true;
  } catch (err) {
    console.error("[inventoryReorder] notifyReorder error:", err);
    return false;
  }
}

function buildReorderEmail(trigger: ReorderTrigger): string {
  const stockColor   = trigger.currentStock === 0 ? "#ef4444" : "#f59e0b";
  const poSection    = trigger.poCreated
    ? `<tr>
        <td style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;">Draft PO</td>
        <td style="font-size:14px;font-weight:600;color:#22c55e;text-align:right;">${trigger.poId}</td>
      </tr>`
    : "";
  const supplierRow  = trigger.supplierName
    ? `<tr><td colspan="2" style="height:8px;"></td></tr>
       <tr>
         <td style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;">Preferred Supplier</td>
         <td style="font-size:14px;font-weight:600;color:#1e293b;text-align:right;">${trigger.supplierName}</td>
       </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
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
            <span style="background:${stockColor};color:#ffffff;padding:5px 14px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Reorder Alert</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:36px;">
      <p style="font-size:15px;margin:0 0 16px;">Stock level alert for <strong>${trigger.itemName}</strong></p>
      <p style="font-size:14px;color:#475569;margin:0 0 24px;">This item has dropped to or below its reorder point. Please review and place a purchase order.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8fafc;border-radius:10px;padding:20px;margin:0 0 24px;">
        <tr>
          <td style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;">Item</td>
          <td style="font-size:14px;font-weight:600;color:#1e293b;text-align:right;">${trigger.itemName}</td>
        </tr>
        <tr><td colspan="2" style="height:8px;"></td></tr>
        <tr>
          <td style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;">Current Stock</td>
          <td style="font-size:16px;font-weight:800;color:${stockColor};text-align:right;">${trigger.currentStock}</td>
        </tr>
        <tr><td colspan="2" style="height:8px;"></td></tr>
        <tr>
          <td style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;">Reorder Point</td>
          <td style="font-size:14px;font-weight:600;color:#1e293b;text-align:right;">${trigger.reorderPoint}</td>
        </tr>
        <tr><td colspan="2" style="height:8px;"></td></tr>
        <tr>
          <td style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;">Reorder Qty</td>
          <td style="font-size:14px;font-weight:600;color:#6366f1;text-align:right;">${trigger.reorderQty}</td>
        </tr>
        ${supplierRow}
        ${poSection ? `<tr><td colspan="2" style="height:8px;"></td></tr>${poSection}` : ""}
      </table>
      <p style="font-size:13px;color:#64748b;margin:0;">Generated automatically by FinovaOS Inventory Reorder system.</p>
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
