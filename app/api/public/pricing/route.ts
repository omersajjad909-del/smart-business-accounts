import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Canonical prices — monthly and yearly (annual plan total, with 20% discount baked in)
// yearly = per-month-yearly-price × 12
// e.g. Starter: $39/mo × 12 = $468/yr (vs $588 if paying monthly)
const DEFAULT_PRICING = {
  starter:    { monthly: 49, yearly: 468  },   // $39/mo × 12
  pro:        { monthly: 99, yearly: 948  },   // $79/mo × 12
  enterprise: { monthly: 249, yearly: 2388 },  // $199/mo × 12
};

const DEFAULT_PLAN_LIMITS = {
  starter: 3,
  pro: 10,
  enterprise: 25,
};
const DEFAULT_BRANCH_LIMITS = {
  starter: 1,
  pro: 3,
  enterprise: 10,
};
const DEFAULT_SEAT_PRICING = {
  monthly: 7,
  yearly: 72, // yearly annual total (6/mo equivalent)
};

const DEFAULT_PLAN_HIGHLIGHTS = {
  starter: [
    "Up to 3 users",
    "Sales & purchase invoices",
    "Ledger & trial balance",
    "Basic reports",
    "Chart of accounts",
    "Email support",
  ],
  pro: [
    "Up to 10 users",
    "Everything in Starter",
    "Inventory management",
    "Bank reconciliation",
    "HR & Payroll",
    "CRM + Advanced reports",
  ],
  enterprise: [
    "Unlimited users",
    "Everything in Professional",
    "API access",
    "Custom integrations",
    "Multi-currency",
    "Priority support 24/7",
  ],
};

const DEFAULT_CUSTOM_PLAN = {
  basePrice: 0,
  yearlyDiscount: 20,
  modules: [
    { id: "accounting",          name: "Accounting & Invoicing",  price: 15, desc: "Ledger, invoices, vouchers, P&L, balance sheet",        icon: "📒", enabled: true,  category: "core" },
    { id: "inventory",           name: "Inventory Management",    price: 12, desc: "Stock tracking, GRN, barcode, low-stock alerts",         icon: "📦", enabled: true,  category: "core" },
    { id: "crm",                 name: "CRM",                     price: 15, desc: "Contacts, sales pipeline, interaction logs",             icon: "👥", enabled: true,  category: "core" },
    { id: "hr_payroll",          name: "HR & Payroll",            price: 20, desc: "Employees, attendance, payroll, advance salary",         icon: "👨‍💼", enabled: true,  category: "core" },
    { id: "bank_reconciliation", name: "Bank Reconciliation",     price: 10, desc: "Statement import, discrepancy flagging, closing",        icon: "🏦", enabled: true,  category: "finance" },
    { id: "tax_filing",          name: "Tax & Compliance",        price: 10, desc: "Tax summary, GST/VAT reports, compliance docs",          icon: "🧾", enabled: true,  category: "finance" },
    { id: "reports",             name: "Advanced Reports",        price: 8,  desc: "Cash flow, profitability, annual statements",            icon: "📈", enabled: true,  category: "operations" },
    { id: "multi_branch",        name: "Multi-Branch",            price: 15, desc: "Branches, consolidated reports, branch access",          icon: "🏢", enabled: true,  category: "operations" },
    { id: "whatsapp",            name: "WhatsApp & SMS",          price: 8,  desc: "Payment reminders, invoices via WhatsApp and SMS",       icon: "💬", enabled: true,  category: "integrations" },
    { id: "api_access",          name: "API Access",              price: 20, desc: "REST API, webhooks, third-party integrations",           icon: "⚡", enabled: true,  category: "integrations" },
  ],
};

export async function GET() {
  try {
    const latest = await prisma.activityLog.findFirst({
      where: { action: "PLAN_CONFIG" },
      orderBy: { createdAt: "desc" },
    });

    if (!latest?.details) {
      return NextResponse.json({
        pricing: DEFAULT_PRICING,
        planLimits: DEFAULT_PLAN_LIMITS,
        branchLimits: DEFAULT_BRANCH_LIMITS,
        seatPricing: DEFAULT_SEAT_PRICING,
        customPlan: DEFAULT_CUSTOM_PLAN,
        planHighlights: DEFAULT_PLAN_HIGHLIGHTS,
        features: null,
        featureMatrix: null,
        updatedAt: null,
      });
    }

    const payload = JSON.parse(latest.details);
    const adminPricing = payload?.pricing;

    if (adminPricing) {
      // Admin stores per-month yearly price → convert to annual total for public API
      const pricing = {
        starter:    { monthly: adminPricing.starter?.monthly    ?? 49,  yearly: (adminPricing.starter?.yearly    ?? 39)  * 12 },
        pro:        { monthly: adminPricing.pro?.monthly        ?? 99,  yearly: (adminPricing.pro?.yearly        ?? 79)  * 12 },
        enterprise: { monthly: adminPricing.enterprise?.monthly ?? 249, yearly: (adminPricing.enterprise?.yearly ?? 199) * 12 },
      };
      return NextResponse.json({
        pricing,
        planLimits: payload?.planLimits ?? DEFAULT_PLAN_LIMITS,
        branchLimits: payload?.branchLimits ?? DEFAULT_BRANCH_LIMITS,
        seatPricing: payload?.seatPricing
          ? {
              monthly: Number(payload.seatPricing?.monthly ?? DEFAULT_SEAT_PRICING.monthly),
              yearly: Number(payload.seatPricing?.yearly ?? 6) * 12,
            }
          : DEFAULT_SEAT_PRICING,
        customPlan: payload?.customPlan ?? DEFAULT_CUSTOM_PLAN,
        planHighlights: payload?.planHighlights
          ? { ...DEFAULT_PLAN_HIGHLIGHTS, ...payload.planHighlights }
          : DEFAULT_PLAN_HIGHLIGHTS,
        features: payload?.features ?? null,
        featureMatrix: payload?.featureMatrix ?? null,
        updatedAt: latest.createdAt,
      });
    }

    return NextResponse.json({
      pricing: DEFAULT_PRICING,
      planLimits: DEFAULT_PLAN_LIMITS,
      branchLimits: DEFAULT_BRANCH_LIMITS,
      seatPricing: DEFAULT_SEAT_PRICING,
      customPlan: DEFAULT_CUSTOM_PLAN,
      planHighlights: DEFAULT_PLAN_HIGHLIGHTS,
      features: null,
      featureMatrix: null,
      updatedAt: latest.createdAt,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { pricing: DEFAULT_PRICING, planLimits: DEFAULT_PLAN_LIMITS, branchLimits: DEFAULT_BRANCH_LIMITS, seatPricing: DEFAULT_SEAT_PRICING, customPlan: DEFAULT_CUSTOM_PLAN, planHighlights: DEFAULT_PLAN_HIGHLIGHTS, error: e instanceof Error ? e.message : "unknown" },
      { status: 200 },
    );
  }
}
