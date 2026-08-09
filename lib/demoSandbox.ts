import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signJwt } from "@/lib/auth";
import {
  DEMO_BUSINESS_TYPES,
  type DemoBusinessType,
  getDemoProfile,
  isDemoBusinessType,
  seedDemoCompany,
} from "@/lib/demoSeed";

/**
 * Demo sandboxes.
 *
 * One fixed set of credentials, but every visitor who signs in with them gets
 * their own disposable Company loaded with the golden dataset. Two people can
 * therefore run the same business demo at the same time without seeing each
 * other's invoices — the app already scopes every query by the companyId
 * carried in the JWT (see proxy.ts, which sets x-company-id from the token).
 *
 * A sandbox dies when the visitor ends it, when the timer runs out, or when
 * the cleanup cron finds it past demoExpiresAt.
 */

export const DEMO_EMAIL = "demo@finovaos.app";
export const DEMO_PASSWORD = "12345678";
const DEMO_USER_NAME = "Demo User";
const DEMO_ROLE = "ADMIN";

/** How long a demo session lasts. Matches the booking slot length. */
export const DEMO_SESSION_MINUTES = 30;

/**
 * Ceiling on live sandboxes. Not a capacity limit — each sandbox is only a few
 * hundred rows — but a stop against someone scripting the endpoint.
 */
export const DEMO_MAX_CONCURRENT = 25;

export { DEMO_BUSINESS_TYPES, isDemoBusinessType };
export type { DemoBusinessType };

/** Accepts either the fixed demo email or the legacy one still in the wild. */
export function isDemoCredential(email: string): boolean {
  const e = String(email || "").trim().toLowerCase();
  return e === DEMO_EMAIL || e === "finovaos.app@gmail.com";
}

export function isDemoPassword(password: string): boolean {
  return String(password || "") === DEMO_PASSWORD;
}

/**
 * The shared demo identity. One User row owns every live sandbox through
 * UserCompany; the JWT decides which one a given browser is looking at.
 */
export async function getOrCreateDemoUser() {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      name: DEMO_USER_NAME,
      email: DEMO_EMAIL,
      password: await bcrypt.hash(DEMO_PASSWORD, 12),
      role: DEMO_ROLE,
      active: true,
      // Deliberately no defaultCompanyId — a shared default would be a single
      // company every session could fall back into, which is exactly the
      // collision this design avoids.
    },
  });
}

export async function countActiveSandboxes(): Promise<number> {
  return prisma.company.count({
    where: { isDemo: true, demoExpiresAt: { gt: new Date() } },
  });
}

export interface DemoSandbox {
  companyId: string;
  userId: string;
  businessType: DemoBusinessType;
  companyName: string;
  token: string;
  expiresAt: Date;
  seed: Awaited<ReturnType<typeof seedDemoCompany>>;
}

/**
 * Build a fresh sandbox: company, membership, golden data, signed session.
 * `minutes` lets the booking flow cap the session at the end of its slot.
 */
export async function createDemoSandbox(
  businessType: DemoBusinessType,
  opts: { minutes?: number } = {},
): Promise<DemoSandbox> {
  const profile = getDemoProfile(businessType);
  const user = await getOrCreateDemoUser();
  const minutes = Math.max(5, Math.min(opts.minutes ?? DEMO_SESSION_MINUTES, 240));
  const expiresAt = new Date(Date.now() + minutes * 60_000);

  const company = await prisma.company.create({
    data: {
      name: profile.companyName,
      country: "PK",
      baseCurrency: "PKR",
      businessType,
      businessSetupDone: true,
      // Everything unlocked so the visitor can walk the whole product.
      plan: "ENTERPRISE",
      subscriptionStatus: "ACTIVE",
      isDemo: true,
      demoExpiresAt: expiresAt,
    },
  });

  try {
    await prisma.userCompany.upsert({
      where: { userId_companyId: { userId: user.id, companyId: company.id } },
      update: {},
      create: { userId: user.id, companyId: company.id, isDefault: false },
    });

    const seed = await seedDemoCompany(company.id, businessType);

    // `demo: true` is what proxy.ts reads to lock down billing, user
    // management and outbound messaging for this session.
    const token = signJwt({
      userId: user.id,
      role: user.role,
      companyId: company.id,
      demo: true,
    });

    try {
      await prisma.session.create({
        data: { userId: user.id, token, expiresAt, companyId: company.id },
      });
    } catch {
      // Session row is for admin visibility only — cookie auth works without it.
    }

    return {
      companyId: company.id,
      userId: user.id,
      businessType,
      companyName: profile.companyName,
      token,
      expiresAt,
      seed,
    };
  } catch (e) {
    // A half-seeded company would show a broken product to the next visitor
    // who happened to land on it, so tear it down before rethrowing.
    await destroyDemoSandbox(company.id).catch(() => {});
    throw e;
  }
}

// Child rows first, company last. Raw SQL because several of these tables are
// only reachable through a parent relation in Prisma, and a per-table failure
// (table renamed, column absent) must not abort the rest of the wipe.
const CLEANUP_ORDER = [
  "LedgerEntry",
  "BankStatement",
  "BankReconciliation",
  "BankAccount",
  "SalesInvoiceItem",
  "SaleReturnItem",
  "SaleReturn",
  "SalesInvoice",
  "PurchaseInvoiceItem",
  "PurchaseInvoice",
  "GoodsReceiptNoteItem",
  "GoodsReceiptNote",
  "PurchaseOrderItem",
  "PurchaseOrder",
  "QuotationItem",
  "Quotation",
  "DeliveryChallanItem",
  "DeliveryChallan",
  "OutwardItem",
  "Outward",
  "InventoryTxn",
  "StockRate",
  "ExpenseItem",
  "ExpenseAttachment",
  "ExpenseApproval",
  "ExpenseVoucher",
  "PaymentReceipt",
  "VoucherEntry",
  "Voucher",
  "InvoiceTax",
  "TaxAccount",
  "TaxConfiguration",
  "Interaction",
  "OpportunityActivity",
  "Opportunity",
  "ContactNote",
  "ContactDocument",
  "Contact",
  "Attendance",
  "Leave",
  "Payroll",
  "AdvanceSalary",
  "EmployeeDocument",
  "Employee",
  "ItemNew",
  "Account",
  "Branch",
  "CostCenter",
  "Notification",
  "ActivityLog",
  "AuditLog",
  "Session",
  "UserCompany",
];

// Tables whose rows hang off a parent rather than carrying companyId. The
// value is the SQL that selects the owning parent ids for this company —
// nested where the chain is two levels deep (activity → opportunity → contact).
const OWNED_BY = (parent: string) => `SELECT id FROM "${parent}" WHERE "companyId" = $1`;

const CHILD_CLEANUP: Record<string, { fk: string; parentIds: string }> = {
  SalesInvoiceItem: { fk: "invoiceId", parentIds: OWNED_BY("SalesInvoice") },
  PurchaseInvoiceItem: { fk: "invoiceId", parentIds: OWNED_BY("PurchaseInvoice") },
  PurchaseOrderItem: { fk: "poId", parentIds: OWNED_BY("PurchaseOrder") },
  QuotationItem: { fk: "quotationId", parentIds: OWNED_BY("Quotation") },
  DeliveryChallanItem: { fk: "challanId", parentIds: OWNED_BY("DeliveryChallan") },
  GoodsReceiptNoteItem: { fk: "grnId", parentIds: OWNED_BY("GoodsReceiptNote") },
  SaleReturnItem: { fk: "returnId", parentIds: OWNED_BY("SaleReturn") },
  OutwardItem: { fk: "outwardId", parentIds: OWNED_BY("Outward") },
  ExpenseItem: { fk: "expenseVoucherId", parentIds: OWNED_BY("ExpenseVoucher") },
  ExpenseAttachment: { fk: "expenseVoucherId", parentIds: OWNED_BY("ExpenseVoucher") },
  ExpenseApproval: { fk: "expenseVoucherId", parentIds: OWNED_BY("ExpenseVoucher") },
  EmployeeDocument: { fk: "employeeId", parentIds: OWNED_BY("Employee") },
  Leave: { fk: "employeeId", parentIds: OWNED_BY("Employee") },
  ContactNote: { fk: "contactId", parentIds: OWNED_BY("Contact") },
  ContactDocument: { fk: "contactId", parentIds: OWNED_BY("Contact") },
  Interaction: { fk: "contactId", parentIds: OWNED_BY("Contact") },
  Opportunity: { fk: "contactId", parentIds: OWNED_BY("Contact") },
  OpportunityActivity: {
    fk: "opportunityId",
    parentIds: `SELECT id FROM "Opportunity" WHERE "contactId" IN (${OWNED_BY("Contact")})`,
  },
  TaxAccount: { fk: "taxConfigurationId", parentIds: OWNED_BY("TaxConfiguration") },
  BankReconciliation: { fk: "bankAccountId", parentIds: OWNED_BY("BankAccount") },
};

/**
 * Delete a sandbox and everything in it. Safe to call twice.
 * Refuses to touch anything not flagged isDemo.
 */
export async function destroyDemoSandbox(companyId: string): Promise<boolean> {
  if (!companyId) return false;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, isDemo: true },
  });
  if (!company) return false;
  if (!company.isDemo) {
    // Never let a stray id delete a paying customer.
    console.error(`[demo] refused to wipe non-demo company ${companyId}`);
    return false;
  }

  for (const table of CLEANUP_ORDER) {
    const child = CHILD_CLEANUP[table];
    try {
      if (child) {
        await prisma.$executeRawUnsafe(
          `DELETE FROM "${table}" WHERE "${child.fk}" IN (${child.parentIds})`,
          companyId,
        );
      } else {
        await prisma.$executeRawUnsafe(
          `DELETE FROM "${table}" WHERE "companyId" = $1`,
          companyId,
        );
      }
    } catch {
      // Table may not exist or may not carry companyId — keep going.
    }
  }

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "Company" WHERE id = $1 AND "isDemo" = true`, companyId);
  } catch {
    return false;
  }
  return true;
}

/**
 * Delete sandboxes whose deadline has passed. This is the one that matters in
 * practice — most visitors close the tab instead of pressing "End demo", so
 * nothing else would ever clean those up.
 */
export async function sweepExpiredSandboxes(limit = 50): Promise<{ swept: number; failed: number }> {
  const stale = await prisma.company.findMany({
    where: { isDemo: true, demoExpiresAt: { lt: new Date() } },
    select: { id: true },
    take: limit,
  });

  let swept = 0;
  let failed = 0;
  for (const c of stale) {
    const ok = await destroyDemoSandbox(c.id).catch(() => false);
    if (ok) swept++;
    else failed++;
  }
  return { swept, failed };
}
