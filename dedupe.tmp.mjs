// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

// lib/fieldEncrypt.ts
import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "crypto";
var ALGORITHM = "aes-256-gcm";
var PREFIX = "enc:v1:";
var IV_BYTES = 12;
function getKey() {
  const hex = process.env.FIELD_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      `FIELD_ENCRYPTION_KEY env var is missing or invalid. Generate one: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    );
  }
  return Buffer.from(hex, "hex");
}
function encryptField(plaintext) {
  if (!plaintext) return plaintext;
  if (plaintext.startsWith(PREFIX)) return plaintext;
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}
function decryptField(value) {
  if (!value) return value;
  if (!value.startsWith(PREFIX)) return value;
  const parts = value.slice(PREFIX.length).split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted field format");
  const [ivHex, tagHex, ctHex] = parts;
  const key = getKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(tagHex, "hex");
  const ciphertext = Buffer.from(ctHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

// lib/prisma.ts
var globalForPrisma = global;
var prismaLogLevels = process.env.DEBUG_PRISMA === "true" ? ["query", "error", "warn"] : ["error", "warn"];
var ENCRYPTED_FIELDS = {
  User: ["phone"],
  Contact: ["email", "phone"],
  Company: ["phone", "taxId"]
};
var IMMUTABLE_LOG_ACTIONS = /* @__PURE__ */ new Set([
  "LOGIN",
  "LOGOUT",
  "LOGIN_FAILED",
  "2FA_ENABLED",
  "2FA_DISABLED",
  "2FA_VERIFIED",
  "PASSWORD_CHANGED",
  "PASSWORD_RESET",
  "PLAN_CHANGED",
  "SUBSCRIPTION_CANCELLED",
  "USER_CREATED",
  "USER_DELETED",
  "USER_ROLE_CHANGED",
  "COMPANY_CREATED",
  "COMPANY_DELETED",
  "PERMISSION_CHANGED",
  "EXPORT_DATA",
  "DATA_DELETED"
]);
function encryptData(model, data) {
  const fields = ENCRYPTED_FIELDS[model];
  if (!fields || !data || !process.env.FIELD_ENCRYPTION_KEY) return data;
  const result = { ...data };
  for (const field of fields) {
    if (typeof result[field] === "string" && result[field]) {
      result[field] = encryptField(result[field]);
    }
  }
  return result;
}
function decryptResult(model, result) {
  if (!result || !process.env.FIELD_ENCRYPTION_KEY) return result;
  const fields = ENCRYPTED_FIELDS[model];
  if (!fields) return result;
  if (Array.isArray(result)) return result.map((r) => decryptResult(model, r));
  const out = { ...result };
  for (const field of fields) {
    if (typeof out[field] === "string") {
      try {
        out[field] = decryptField(out[field]);
      } catch {
      }
    }
  }
  return out;
}
function buildClient() {
  const base = new PrismaClient({ log: prismaLogLevels });
  return base.$extends({
    query: {
      // ── Immutable audit log protection ──
      activityLog: {
        async $allOperations({ operation, args, query }) {
          if (operation === "update" || operation === "updateMany") {
            throw new Error("ActivityLog records are immutable and cannot be updated.");
          }
          if (operation === "delete" || operation === "deleteMany") {
            const action = args?.where?.action;
            if (action && IMMUTABLE_LOG_ACTIONS.has(action)) {
              throw new Error(`ActivityLog action "${action}" is a security record and cannot be deleted.`);
            }
          }
          return query(args);
        }
      },
      // ── Field encryption: User ──
      user: {
        async create({ args, query }) {
          if (args.data) args.data = encryptData("User", args.data);
          const result = await query(args);
          return decryptResult("User", result);
        },
        async update({ args, query }) {
          if (args.data) args.data = encryptData("User", args.data);
          const result = await query(args);
          return decryptResult("User", result);
        },
        async upsert({ args, query }) {
          if (args.create) args.create = encryptData("User", args.create);
          if (args.update) args.update = encryptData("User", args.update);
          const result = await query(args);
          return decryptResult("User", result);
        },
        async findUnique({ args, query }) {
          const result = await query(args);
          return decryptResult("User", result);
        },
        async findFirst({ args, query }) {
          const result = await query(args);
          return decryptResult("User", result);
        },
        async findMany({ args, query }) {
          const result = await query(args);
          return decryptResult("User", result);
        }
      },
      // ── Field encryption: Contact ──
      contact: {
        async create({ args, query }) {
          if (args.data) args.data = encryptData("Contact", args.data);
          const result = await query(args);
          return decryptResult("Contact", result);
        },
        async update({ args, query }) {
          if (args.data) args.data = encryptData("Contact", args.data);
          const result = await query(args);
          return decryptResult("Contact", result);
        },
        async upsert({ args, query }) {
          if (args.create) args.create = encryptData("Contact", args.create);
          if (args.update) args.update = encryptData("Contact", args.update);
          const result = await query(args);
          return decryptResult("Contact", result);
        },
        async findUnique({ args, query }) {
          const result = await query(args);
          return decryptResult("Contact", result);
        },
        async findFirst({ args, query }) {
          const result = await query(args);
          return decryptResult("Contact", result);
        },
        async findMany({ args, query }) {
          const result = await query(args);
          return decryptResult("Contact", result);
        }
      },
      // ── Field encryption: Company ──
      company: {
        async create({ args, query }) {
          if (args.data) args.data = encryptData("Company", args.data);
          const result = await query(args);
          return decryptResult("Company", result);
        },
        async update({ args, query }) {
          if (args.data) args.data = encryptData("Company", args.data);
          const result = await query(args);
          return decryptResult("Company", result);
        },
        async upsert({ args, query }) {
          if (args.create) args.create = encryptData("Company", args.create);
          if (args.update) args.update = encryptData("Company", args.update);
          const result = await query(args);
          return decryptResult("Company", result);
        },
        async findUnique({ args, query }) {
          const result = await query(args);
          return decryptResult("Company", result);
        },
        async findFirst({ args, query }) {
          const result = await query(args);
          return decryptResult("Company", result);
        },
        async findMany({ args, query }) {
          const result = await query(args);
          return decryptResult("Company", result);
        }
      }
    }
  });
}
var globalForExtended = global;
var prisma = globalForExtended.prisma ?? buildClient();
globalForExtended.prisma = prisma;

// lib/backup.ts
import { createHash } from "crypto";
import { gzipSync, gunzipSync } from "zlib";

// lib/backupTables.ts
var BACKUP_TABLES = [
  // ── Masters ───────────────────────────────────────────────────────────────
  // Account.parentId is a self-reference, so restore depth-orders these rows
  // before inserting (see orderBySelfParent in lib/backup.ts).
  { key: "accounts", model: "account", label: "Accounts", hasCompanyId: true, selfParent: "parentId", where: (c) => ({ companyId: c }) },
  { key: "items", model: "itemNew", label: "Items", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  // ── Banking masters ───────────────────────────────────────────────────────
  { key: "bankAccounts", model: "bankAccount", label: "Bank accounts", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  // ── Tax links (TaxConfiguration itself is never wiped) ────────────────────
  { key: "taxAccounts", model: "taxAccount", label: "Tax accounts", hasCompanyId: false, where: (c) => ({ account: { companyId: c } }) },
  // ── Ledger ────────────────────────────────────────────────────────────────
  { key: "vouchers", model: "voucher", label: "Vouchers", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "voucherEntries", model: "voucherEntry", label: "Voucher entries", hasCompanyId: true, where: (c) => ({ voucher: { companyId: c } }) },
  // ── Purchase cycle ────────────────────────────────────────────────────────
  { key: "purchaseOrders", model: "purchaseOrder", label: "Purchase orders", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "purchaseOrderItems", model: "purchaseOrderItem", label: "Purchase order items", hasCompanyId: false, where: (c) => ({ po: { companyId: c } }) },
  { key: "purchaseInvoices", model: "purchaseInvoice", label: "Purchase invoices", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "purchaseInvoiceItems", model: "purchaseInvoiceItem", label: "Purchase invoice items", hasCompanyId: false, where: (c) => ({ invoice: { companyId: c } }) },
  { key: "goodsReceiptNotes", model: "goodsReceiptNote", label: "Goods receipt notes", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "goodsReceiptNoteItems", model: "goodsReceiptNoteItem", label: "GRN items", hasCompanyId: false, where: (c) => ({ grn: { companyId: c } }) },
  // ── Sales cycle ───────────────────────────────────────────────────────────
  { key: "quotations", model: "quotation", label: "Quotations", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "quotationItems", model: "quotationItem", label: "Quotation items", hasCompanyId: false, where: (c) => ({ quotation: { companyId: c } }) },
  { key: "salesInvoices", model: "salesInvoice", label: "Sales invoices", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "salesInvoiceItems", model: "salesInvoiceItem", label: "Sales invoice items", hasCompanyId: false, where: (c) => ({ invoice: { companyId: c } }) },
  { key: "saleReturns", model: "saleReturn", label: "Sale returns", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "saleReturnItems", model: "saleReturnItem", label: "Sale return items", hasCompanyId: false, where: (c) => ({ saleReturn: { companyId: c } }) },
  { key: "deliveryChallans", model: "deliveryChallan", label: "Delivery challans", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "deliveryChallanItems", model: "deliveryChallanItem", label: "Delivery challan items", hasCompanyId: false, where: (c) => ({ challan: { companyId: c } }) },
  { key: "outwards", model: "outward", label: "Outward gate passes", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "outwardItems", model: "outwardItem", label: "Outward items", hasCompanyId: false, where: (c) => ({ outward: { companyId: c } }) },
  // ── Notes & advances ──────────────────────────────────────────────────────
  { key: "creditNotes", model: "creditNote", label: "Credit notes", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "debitNotes", model: "debitNote", label: "Debit notes", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "advancePayments", model: "advancePayment", label: "Advance payments", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "advanceAdjustments", model: "advanceAdjustment", label: "Advance adjustments", hasCompanyId: false, where: (c) => ({ advancePayment: { companyId: c } }) },
  // ── Expenses ──────────────────────────────────────────────────────────────
  { key: "expenseVouchers", model: "expenseVoucher", label: "Expense vouchers", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "expenseItems", model: "expenseItem", label: "Expense items", hasCompanyId: false, where: (c) => ({ expenseVoucher: { companyId: c } }) },
  { key: "expenseAttachments", model: "expenseAttachment", label: "Expense attachments", hasCompanyId: false, where: (c) => ({ expenseVoucher: { companyId: c } }) },
  { key: "expenseApprovals", model: "expenseApproval", label: "Expense approvals", hasCompanyId: false, where: (c) => ({ expenseVoucher: { companyId: c } }) },
  // ── Money in / out ────────────────────────────────────────────────────────
  { key: "paymentReceipts", model: "paymentReceipt", label: "Payment receipts", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "bankReconciliations", model: "bankReconciliation", label: "Bank reconciliations", hasCompanyId: false, where: (c) => ({ bankAccount: { companyId: c } }) },
  // Statements point at a reconciliation, so they must land after it.
  { key: "bankStatements", model: "bankStatement", label: "Bank statements", hasCompanyId: true, where: (c) => ({ bankAccount: { companyId: c } }) },
  // ── Loans ─────────────────────────────────────────────────────────────────
  { key: "loans", model: "loan", label: "Loans", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "loanPayments", model: "loanPayment", label: "Loan payments", hasCompanyId: false, where: (c) => ({ loan: { companyId: c } }) },
  // ── Stock & ledger movement ───────────────────────────────────────────────
  { key: "inventoryTxns", model: "inventoryTxn", label: "Inventory transactions", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "stockRates", model: "stockRate", label: "Stock rates", hasCompanyId: true, where: (c) => ({ item: { companyId: c } }) },
  { key: "ledgerEntries", model: "ledgerEntry", label: "Ledger entries", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  // ── Planning ──────────────────────────────────────────────────────────────
  { key: "budgets", model: "budget", label: "Budgets", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "recurringTransactions", model: "recurringTransaction", label: "Recurring transactions", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  // ── Fixed assets ──────────────────────────────────────────────────────────
  { key: "fixedAssets", model: "fixedAsset", label: "Fixed assets", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "depreciations", model: "depreciation", label: "Depreciation", hasCompanyId: false, where: (c) => ({ fixedAsset: { companyId: c } }) },
  // ── HR ────────────────────────────────────────────────────────────────────
  { key: "employees", model: "employee", label: "Employees", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "attendances", model: "attendance", label: "Attendance", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "leaves", model: "leave", label: "Leaves", hasCompanyId: false, where: (c) => ({ employee: { companyId: c } }) },
  { key: "payrolls", model: "payroll", label: "Payroll", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "advanceSalaries", model: "advanceSalary", label: "Salary advances", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "employeeDocuments", model: "employeeDocument", label: "Employee documents", hasCompanyId: false, where: (c) => ({ employee: { companyId: c } }) },
  // ── CRM ───────────────────────────────────────────────────────────────────
  { key: "contacts", model: "contact", label: "Contacts", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "interactions", model: "interaction", label: "Interactions", hasCompanyId: false, where: (c) => ({ contact: { companyId: c } }) },
  { key: "contactNotes", model: "contactNote", label: "Contact notes", hasCompanyId: false, where: (c) => ({ contact: { companyId: c } }) },
  { key: "contactDocuments", model: "contactDocument", label: "Contact documents", hasCompanyId: false, where: (c) => ({ contact: { companyId: c } }) },
  { key: "opportunities", model: "opportunity", label: "Opportunities", hasCompanyId: false, where: (c) => ({ contact: { companyId: c } }) },
  { key: "opportunityActivities", model: "opportunityActivity", label: "Opportunity activity", hasCompanyId: false, where: (c) => ({ opportunity: { contact: { companyId: c } } }) }
];
var BACKUP_FORMAT_VERSION = "3.0";

// lib/backup.ts
var GZIP_PREFIX = "gz:";
function packSnapshot(jsonStr) {
  return GZIP_PREFIX + gzipSync(Buffer.from(jsonStr, "utf8"), { level: 9 }).toString("base64");
}
function unpackSnapshot(stored) {
  if (!stored.startsWith(GZIP_PREFIX)) return stored;
  return gunzipSync(Buffer.from(stored.slice(GZIP_PREFIX.length), "base64")).toString("utf8");
}
function readSnapshot(stored) {
  return JSON.parse(unpackSnapshot(stored));
}
function snapshotHash(exportData) {
  const { exportedAt, ...content } = exportData;
  return createHash("sha256").update(JSON.stringify(content)).digest("hex");
}
function delegate(client, model) {
  const d = client?.[model];
  return d && typeof d.findMany === "function" ? d : null;
}
async function createCompanyBackup(companyId2, opts = {}) {
  const backupType = opts.backupType || "FULL";
  const createdBy = opts.createdBy ?? null;
  const now = /* @__PURE__ */ new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-");
  const fileName = `backup-${companyId2.slice(0, 8)}-${timestamp}.json`;
  const backup = await prisma.systemBackup.create({
    data: { companyId: companyId2, fileName, backupType, status: "PENDING", createdBy }
  });
  try {
    const exportData = {
      companyId: companyId2,
      exportedAt: now.toISOString(),
      version: BACKUP_FORMAT_VERSION
    };
    const counts = {};
    for (const table of BACKUP_TABLES) {
      const model = delegate(prisma, table.model);
      if (!model) {
        exportData[table.key] = [];
        counts[table.key] = 0;
        continue;
      }
      const rows = await model.findMany({ where: table.where(companyId2), orderBy: { id: "asc" } });
      exportData[table.key] = rows;
      counts[table.key] = rows.length;
    }
    const jsonStr = JSON.stringify(exportData);
    const packed = packSnapshot(jsonStr);
    const fileSize = Buffer.byteLength(packed, "utf8");
    const contentHash = snapshotHash(exportData);
    const twin = await prisma.systemBackup.findFirst({
      where: { companyId: companyId2, status: "COMPLETED", contentHash, NOT: { id: backup.id } },
      orderBy: { createdAt: "desc" },
      select: { id: true, fileName: true, fileSize: true }
    });
    if (twin) {
      await prisma.systemBackup.delete({ where: { id: backup.id } }).catch(() => {
      });
      await prisma.systemBackup.update({
        where: { id: twin.id },
        data: { verifiedAt: now }
      });
      return {
        companyId: companyId2,
        backupId: twin.id,
        fileName: twin.fileName,
        fileSize: twin.fileSize ?? fileSize,
        jsonStr,
        counts,
        deduped: true
      };
    }
    await prisma.systemBackup.update({
      where: { id: backup.id },
      data: {
        status: "COMPLETED",
        fileSize,
        contentHash,
        verifiedAt: now,
        metadata: packed
      }
    });
    if (opts.keepLast && opts.keepLast > 0) {
      await pruneCompanyBackups(companyId2, backupType, opts.keepLast);
    }
    return { companyId: companyId2, backupId: backup.id, fileName, fileSize, jsonStr, counts, deduped: false };
  } catch (err) {
    await prisma.systemBackup.update({
      where: { id: backup.id },
      data: { status: "FAILED", metadata: JSON.stringify({ error: String(err?.message || err) }) }
    }).catch(() => {
    });
    throw err;
  }
}
async function pruneCompanyBackups(companyId2, backupType, keepLast) {
  const all = await prisma.systemBackup.findMany({
    where: { companyId: companyId2, backupType },
    orderBy: { createdAt: "desc" },
    select: { id: true }
  });
  if (all.length > keepLast) {
    const toDelete = all.slice(keepLast).map((b) => b.id);
    await prisma.systemBackup.deleteMany({ where: { id: { in: toDelete } } });
  }
}

// dedupe.tmp.ts
var TAG = "ZZ_DEDUPE_SELFTEST";
var companyId = "";
async function snapshotRows() {
  return prisma.systemBackup.findMany({
    where: { companyId },
    orderBy: { createdAt: "asc" },
    select: { id: true, fileSize: true, contentHash: true, verifiedAt: true, createdAt: true }
  });
}
async function report(label) {
  const rows = await snapshotRows();
  const total = rows.reduce((a, r) => a + (r.fileSize || 0), 0);
  console.log(
    `  ${label.padEnd(30)} ${rows.length} snapshot(s), ${(total / 1024).toFixed(1)} KB stored  [hashes: ${new Set(rows.map((r) => r.contentHash)).size} distinct]`
  );
  return rows;
}
try {
  const company = await prisma.company.create({
    data: { name: `${TAG} (safe to delete)`, isInternalTest: true, isActive: false }
  });
  companyId = company.id;
  const parent = await prisma.account.create({
    data: { companyId, code: "1000", name: "Assets", type: "ASSET" }
  });
  await prisma.account.create({
    data: { companyId, code: "1001", name: "Cash", type: "ASSET", parentId: parent.id }
  });
  for (let i = 0; i < 40; i++) {
    await prisma.itemNew.create({
      data: { companyId, code: `IT-${i}`, name: `Widget ${i}`, unit: "PCS", rate: 100 + i }
    });
  }
  console.log(`
Throwaway company ${companyId}
`);
  for (let click = 1; click <= 3; click++) {
    const r = await createCompanyBackup(companyId, { backupType: "MANUAL", keepLast: 10 });
    console.log(`  click ${click}: ${r.deduped ? "deduped (reused existing)" : "new snapshot stored"}`);
  }
  const afterClicks = await report("after 3 identical clicks");
  if (afterClicks.length !== 1) {
    console.log(`  FAIL \u2014 expected 1 snapshot, got ${afterClicks.length}`);
    process.exitCode = 1;
  } else if (!afterClicks[0].verifiedAt) {
    console.log("  FAIL \u2014 verifiedAt was not stamped");
    process.exitCode = 1;
  } else {
    console.log("  PASS \u2014 three clicks left exactly one snapshot, verifiedAt refreshed\n");
  }
  await prisma.itemNew.create({
    data: { companyId, code: "IT-NEW", name: "Brand new widget", unit: "PCS", rate: 999 }
  });
  const changed = await createCompanyBackup(companyId, { backupType: "MANUAL", keepLast: 10 });
  const afterChange = await report("after real data change");
  console.log(
    afterChange.length === 2 && !changed.deduped ? "  PASS \u2014 a genuine change still produces a new snapshot\n" : "  FAIL \u2014 data changed but no new snapshot was created\n"
  );
  if (afterChange.length !== 2 || changed.deduped) process.exitCode = 1;
  const stored = await prisma.systemBackup.findFirst({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    select: { metadata: true, fileSize: true }
  });
  const parsed = readSnapshot(stored.metadata);
  const rawSize = Buffer.byteLength(JSON.stringify(parsed), "utf8");
  console.log(
    `  compression: ${(rawSize / 1024).toFixed(1)} KB raw -> ${((stored.fileSize || 0) / 1024).toFixed(1)} KB stored (${(rawSize / (stored.fileSize || 1)).toFixed(1)}x)`
  );
  const ok = parsed.items?.length === 41 && parsed.accounts?.length === 2;
  console.log(`  ${ok ? "PASS" : "FAIL"} \u2014 compressed snapshot decodes back to the right data (accounts=${parsed.accounts?.length}, items=${parsed.items?.length})`);
  if (!ok) process.exitCode = 1;
} finally {
  if (companyId) {
    for (const t of [...BACKUP_TABLES].reverse()) {
      const model = prisma[t.model];
      if (model) await model.deleteMany({ where: t.where(companyId) }).catch(() => {
      });
    }
    await prisma.systemBackup.deleteMany({ where: { companyId } }).catch(() => {
    });
    await prisma.company.delete({ where: { id: companyId } }).catch(() => {
    });
    console.log(`
  cleaned up throwaway company ${companyId}`);
  }
  await prisma.$disconnect();
}
