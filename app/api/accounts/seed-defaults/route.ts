import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

const DEFAULT_TRADING_ACCOUNTS = [
  // ── Contra (Returns) ──────────────────────────────────
  { code: "SALES-RET",    name: "Sales Return",           type: "CONTRA" },
  { code: "PURCH-RET",    name: "Purchase Return",        type: "CONTRA" },

  // ── Income ────────────────────────────────────────────
  { code: "DISC-IN",      name: "Discount Received",      type: "INCOME" },
  { code: "OTHER-INC",    name: "Other Income",           type: "INCOME" },

  // ── Expenses ──────────────────────────────────────────
  { code: "DISC-OUT",     name: "Discount Allowed",       type: "EXPENSE" },
  { code: "FREIGHT-IN",   name: "Carriage / Freight In",  type: "EXPENSE" },
  { code: "FREIGHT-OUT",  name: "Carriage / Freight Out", type: "EXPENSE" },
  { code: "SALARY",       name: "Salaries & Wages",       type: "EXPENSE" },
  { code: "RENT",         name: "Rent Expense",           type: "EXPENSE" },
  { code: "ELEC",         name: "Electricity & Utilities",type: "EXPENSE" },
  { code: "TEL",          name: "Telephone / Internet",   type: "EXPENSE" },
  { code: "TRANSPORT",    name: "Transport Expense",      type: "EXPENSE" },
  { code: "OFFICE-EXP",   name: "Office Expenses",        type: "EXPENSE" },
  { code: "BANK-CHG",     name: "Bank Charges",           type: "EXPENSE" },
  { code: "REPAIR",       name: "Repair & Maintenance",   type: "EXPENSE" },
  { code: "MISC-EXP",     name: "Miscellaneous Expense",  type: "EXPENSE" },

  // ── Liabilities ───────────────────────────────────────
  { code: "ST-PAY",       name: "Sales Tax Payable (GST)",type: "LIABILITIES" },
  { code: "INCOME-TAX",   name: "Income Tax Payable",     type: "LIABILITIES" },

  // ── Equity ────────────────────────────────────────────
  { code: "DRAW",         name: "Owner Drawings",         type: "EQUITY" },
  { code: "RET-EARN",     name: "Retained Earnings",      type: "EQUITY" },
];

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    // Get existing account codes to skip duplicates
    const existing = await prisma.account.findMany({
      where: { companyId },
      select: { code: true },
    });
    const existingCodes = new Set(existing.map((a) => a.code));

    const toCreate = DEFAULT_TRADING_ACCOUNTS.filter(
      (a) => !existingCodes.has(a.code)
    );

    if (toCreate.length === 0) {
      return NextResponse.json({ message: "All default accounts already exist", added: 0 });
    }

    await prisma.account.createMany({
      data: toCreate.map((a) => ({
        companyId,
        code: a.code,
        name: a.name,
        type: a.type,
        partyType: a.type,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({ message: "Default accounts added", added: toCreate.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
