import { prisma } from "@/lib/prisma";
import {
  buildFinancialContext,
  detectAnomalies,
  type AnomalyAlert,
  type FinancialContext,
} from "@/lib/finovaAI";

export type OperatorPriority = "urgent" | "high" | "medium" | "low";
export type OperatorActionState = "ready" | "queued" | "watch";

export interface OperatorDecision {
  id: string;
  title: string;
  reason: string;
  action: string;
  impact: string;
  priority: OperatorPriority;
  category: string;
  href?: string;
  source: string;
}

export interface OperatorAction {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  priority: OperatorPriority;
  category: string;
  href?: string;
  state: OperatorActionState;
  automationLevel: "manual" | "assisted" | "auto-ready";
}

export interface OperatorPlaybookStep {
  label: string;
  description: string;
  href?: string;
}

export interface OperatorPayload {
  generatedAt: string;
  company: {
    name: string;
    businessType: string;
    businessLabel: string;
    plan: string;
    currency: string;
  };
  overview: {
    healthScore: number;
    revenueChange: number;
    expenseChange: number;
    profitChange: number;
    cashPosition: number;
    overdueReceivables: number;
    overduePayables: number;
    lowStockItems: number;
    openPurchaseOrders: number;
    goodsReceivedPendingInvoice: number;
    openBusinessRecords: number;
  };
  todaysDecisions: OperatorDecision[];
  detectedProblems: AnomalyAlert[];
  recommendedActions: OperatorAction[];
  autoRunSuggestions: OperatorAction[];
  playbook: {
    title: string;
    summary: string;
    steps: OperatorPlaybookStep[];
  }[];
}

type OperationalContext = {
  openPurchaseOrders: number;
  goodsReceivedPendingInvoice: number;
  openBusinessRecords: number;
};

const BUSINESS_LABELS: Record<string, string> = {
  trading: "Trading",
  wholesale: "Wholesale",
  import_export: "Import / Export",
  trade: "Import / Export",
  retail: "Retail",
  distribution: "Distribution",
  ecommerce: "Ecommerce",
  construction: "Construction",
  manufacturing: "Manufacturing",
  restaurant: "Restaurant",
  hotel: "Hotel",
  hospital: "Hospital",
  clinic: "Clinic",
  pharmacy: "Pharmacy",
  school: "School",
  transport: "Transport",
  subscriptions: "Subscriptions",
  solar: "Solar",
  maintenance: "Maintenance",
  workshop: "Workshop",
  repair: "Repair",
  media: "Media",
  franchise: "Franchise",
  firm: "Firm",
  law_firm: "Law Firm",
  ngo: "NGO",
  agriculture: "Agriculture",
  automotive: "Automotive",
  gym: "Gym",
  salon: "Salon",
  services: "Services",
  rentals: "Rentals",
  rental: "Rental",
  real_estate: "Real Estate",
  it: "IT Company",
  isp: "ISP",
  utilities: "Utilities",
  events: "Events",
  food_processing: "Food Processing",
};

const PLAYBOOKS: Record<string, { title: string; summary: string; steps: OperatorPlaybookStep[] }[]> = {
  retail: [
    {
      title: "Daily Store Control",
      summary: "Protect sales velocity, branch cash, and stock availability every day.",
      steps: [
        { label: "Clear low-stock risks", description: "Convert low-stock alerts into supplier reorders before branches miss walk-in demand.", href: "/dashboard/purchase-order" },
        { label: "Watch branch leakage", description: "Review branch reports, stock transfers, and margin drops across locations.", href: "/dashboard/retail/branch-reports" },
        { label: "Recover overdue cash", description: "Chase overdue retail receivables and large account customers first.", href: "/dashboard/crv" },
      ],
    },
  ],
  trading: [
    {
      title: "Trade Cycle Control",
      summary: "Keep PO, GRN, invoice, dispatch, and receivable cycle moving without blockages.",
      steps: [
        { label: "Resolve PO to GRN gaps", description: "Push pending orders that are still waiting for receipt or supplier confirmation.", href: "/dashboard/purchase-order" },
        { label: "Convert GRNs into invoices", description: "Post supplier bills quickly so landed cost and payable position stay accurate.", href: "/dashboard/purchase-invoice" },
        { label: "Protect cash conversion", description: "Prioritize overdue customer recovery and slow-moving stock exits.", href: "/dashboard/trading/outstandings" },
      ],
    },
  ],
  wholesale: [
    {
      title: "Wholesale Command Rhythm",
      summary: "Balance stock depth, customer credit, and supplier flow across warehouses.",
      steps: [
        { label: "Rebalance inventory", description: "Move excess or low-cover SKUs between stores and wholesale locations.", href: "/dashboard/stock-report" },
        { label: "Review credit exposure", description: "Call customers crossing safe outstanding limits before dispatching more stock.", href: "/dashboard/credit-limits" },
        { label: "Accelerate replenishment", description: "Push draft purchase orders for fast-moving wholesale lines.", href: "/dashboard/purchase-order" },
      ],
    },
  ],
  trade: [
    {
      title: "Import / Export Desk",
      summary: "Track shipment, clearance, costing, and billing before margins leak away.",
      steps: [
        { label: "Watch shipment pipeline", description: "Review active shipment and customs items with pending status.", href: "/dashboard/trade/shipments" },
        { label: "Protect landed margin", description: "Update costing and rebate positions before customer pricing slips.", href: "/dashboard/trade/costing" },
        { label: "Close paperwork faster", description: "Convert received and cleared items into invoices without delay.", href: "/dashboard/purchase-invoice" },
      ],
    },
  ],
  services: [
    {
      title: "Service Delivery Control",
      summary: "Keep projects billed, hours converted, and client work profitable.",
      steps: [
        { label: "Invoice completed work", description: "Convert delivered milestones and approved hours into customer billing.", href: "/dashboard/services/time-billing" },
        { label: "Review slow projects", description: "Spot active jobs that are open but not progressing.", href: "/dashboard/services/projects" },
        { label: "Protect margins", description: "Check rising expenses against project revenue before month-end.", href: "/dashboard/reports/profitability" },
      ],
    },
  ],
};

function formatMoney(value: number, currency: string) {
  return `${currency} ${Number(value || 0).toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

function labelForBusinessType(businessType?: string) {
  if (!businessType) return "Business";
  return BUSINESS_LABELS[businessType] || businessType.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function scoreHealth(ctx: FinancialContext) {
  let score = 68;
  if (ctx.revenue.change > 0) score += Math.min(ctx.revenue.change, 12);
  if (ctx.revenue.change < 0) score += Math.max(ctx.revenue.change, -12);
  if (ctx.profit.thisMonth > 0) score += 8;
  if (ctx.profit.thisMonth < 0) score -= 18;
  if (ctx.receivables.overdue > 0) score -= Math.min(Math.round(ctx.receivables.overdue / Math.max(ctx.revenue.thisMonth || 1, 1)), 14);
  if (ctx.inventory.lowStockItems > 0) score -= Math.min(ctx.inventory.lowStockItems, 8);
  return Math.max(0, Math.min(100, score));
}

async function getOperationalContext(companyId: string): Promise<OperationalContext> {
  const [openPurchaseOrders, purchaseOrders, grns, openBusinessRecords] = await prisma.$transaction([
    prisma.purchaseOrder.count({
      where: {
        companyId,
        status: { not: "CANCELLED" },
      },
    }),
    prisma.purchaseOrder.findMany({
      where: {
        companyId,
        status: { not: "CANCELLED" },
      },
      select: {
        id: true,
        items: {
          select: {
            itemId: true,
            invoicedQty: true,
          },
        },
      },
    }),
    prisma.goodsReceiptNote.findMany({
      where: {
        companyId,
        status: { not: "CANCELLED" },
      },
      select: {
        poId: true,
        items: {
          select: {
            itemId: true,
            receivedQty: true,
          },
        },
      },
    }),
    prisma.businessRecord.count({
      where: {
        companyId,
        status: {
          notIn: ["closed", "completed", "converted", "paid", "resolved"],
        },
      },
    }),
  ]);

  const poMap = new Map(
    purchaseOrders.map((po) => [
      po.id,
      new Map(po.items.map((item) => [item.itemId, Number(item.invoicedQty || 0)])),
    ]),
  );

  let goodsReceivedPendingInvoice = 0;
  for (const grn of grns) {
    const itemMap = poMap.get(grn.poId || "");
    if (!itemMap) continue;
    const hasGap = grn.items.some((item) => Number(item.receivedQty || 0) > Number(itemMap.get(item.itemId) || 0));
    if (hasGap) goodsReceivedPendingInvoice += 1;
  }

  return {
    openPurchaseOrders,
    goodsReceivedPendingInvoice,
    openBusinessRecords,
  };
}

function buildPlaybook(businessType: string) {
  return PLAYBOOKS[businessType] || PLAYBOOKS.trade || [
    {
      title: "Daily Operator Rhythm",
      summary: "Turn signals into action every day: collect cash, post documents, and remove bottlenecks.",
      steps: [
        { label: "Fix the biggest cash leak", description: "Start from overdue customers and high-value supplier exposure.", href: "/dashboard/crv" },
        { label: "Close operational gaps", description: "Convert open receipts, invoices, and pending records into completed workflow.", href: "/dashboard" },
        { label: "Review today’s priorities", description: "Use FinovaOS Business Operator to focus only on the highest-impact work.", href: "/dashboard/operator" },
      ],
    },
  ];
}

function pushDecision(list: OperatorDecision[], entry: OperatorDecision) {
  if (!list.find((item) => item.id === entry.id)) list.push(entry);
}

function buildDecisions(ctx: FinancialContext, operational: OperationalContext): OperatorDecision[] {
  const businessType = ctx.company.businessType || "business";
  const currency = ctx.company.currency;
  const decisions: OperatorDecision[] = [];

  if (ctx.receivables.overdue > 0) {
    pushDecision(decisions, {
      id: "collect-overdue-cash",
      title: "Recover overdue receivables today",
      reason: `${formatMoney(ctx.receivables.overdue, currency)} is overdue across ${ctx.receivables.overdueCount} invoice(s), which is slowing working capital.`,
      action: "Send reminders and escalate the top overdue customers first.",
      impact: "Faster cash recovery and healthier daily cash position.",
      priority: ctx.receivables.overdueCount > 3 ? "urgent" : "high",
      category: "cashflow",
      href: "/dashboard/crv",
      source: "Operator cash cycle monitor",
    });
  }

  if (operational.goodsReceivedPendingInvoice > 0) {
    pushDecision(decisions, {
      id: "convert-grns-to-purchase-invoices",
      title: "Post supplier invoices for received goods",
      reason: `${operational.goodsReceivedPendingInvoice} GRN-linked receipt(s) still have invoiceable quantity pending.`,
      action: "Open purchase invoice and convert received lines into supplier bills.",
      impact: "Keeps stock costing and supplier payables accurate.",
      priority: "urgent",
      category: "operations",
      href: "/dashboard/purchase-invoice",
      source: "PO -> GRN -> PI operator flow",
    });
  }

  if (ctx.inventory.lowStockItems > 0) {
    pushDecision(decisions, {
      id: "replenish-low-stock",
      title: "Replenish critical inventory",
      reason: `${ctx.inventory.lowStockItems} item(s) are below minimum stock, including ${ctx.inventory.lowStockNames.slice(0, 3).join(", ") || "your fastest movers"}.`,
      action: "Draft purchase orders for critical stock before it causes service or sales loss.",
      impact: "Prevents stockouts and protects revenue continuity.",
      priority: ctx.inventory.lowStockItems > 5 ? "high" : "medium",
      category: "inventory",
      href: "/dashboard/purchase-order",
      source: "Inventory watch",
    });
  }

  if (ctx.profit.thisMonth < 0 || ctx.revenue.change < -12) {
    pushDecision(decisions, {
      id: "stabilize-margin",
      title: "Stabilize revenue and margin",
      reason:
        ctx.profit.thisMonth < 0
          ? `This month is currently at ${formatMoney(ctx.profit.thisMonth, currency)} net result, so expenses are outrunning revenue.`
          : `Revenue is down ${Math.abs(ctx.revenue.change)}% versus last month, which needs immediate attention.`,
      action: "Review top expenses, weak-selling lines, and follow up on stalled customer demand.",
      impact: "Protects month-end profitability before the gap widens.",
      priority: "urgent",
      category: "profitability",
      href: "/dashboard/reports/profitability",
      source: "Financial health monitor",
    });
  }

  if (ctx.deadStockItems.length > 0 && ["retail", "trading", "wholesale", "ecommerce"].includes(businessType)) {
    pushDecision(decisions, {
      id: "release-dead-stock",
      title: "Release cash trapped in dead stock",
      reason: `${ctx.deadStockItems[0]?.name || "Dead stock"} and similar items are holding non-moving inventory value.`,
      action: "Bundle, discount, transfer, or stop replenishing dead and slow-moving stock.",
      impact: "Improves working capital without waiting for new sales.",
      priority: "medium",
      category: "inventory",
      href: "/dashboard/reports/stock-ledger",
      source: "Stock efficiency watch",
    });
  }

  if (operational.openBusinessRecords > 0) {
    pushDecision(decisions, {
      id: "close-open-operational-records",
      title: "Close pending operational records",
      reason: `${operational.openBusinessRecords} business workflow record(s) are still active or pending across your live module stack.`,
      action: "Review the open queue and complete the highest-value records first.",
      impact: "Reduces leakage, delays, and operational backlog.",
      priority: "medium",
      category: "operations",
      href: "/dashboard",
      source: "Business record monitor",
    });
  }

  return decisions.slice(0, 6);
}

function buildRecommendedActions(ctx: FinancialContext, operational: OperationalContext): OperatorAction[] {
  return [
    {
      id: "queue-reminders",
      title: "Queue overdue customer reminders",
      description: `Prepare a collection run for ${ctx.receivables.overdueCount} overdue invoice(s).`,
      actionLabel: "Queue reminders",
      priority: ctx.receivables.overdue > 0 ? "urgent" : "medium",
      category: "cashflow",
      href: "/dashboard/crv",
      state: ctx.receivables.overdue > 0 ? "ready" : "watch",
      automationLevel: "auto-ready",
    },
    {
      id: "review-reorder-list",
      title: "Generate low-stock reorder list",
      description: `Convert ${ctx.inventory.lowStockItems} low-stock items into an assisted replenishment run.`,
      actionLabel: "Open reorder list",
      priority: ctx.inventory.lowStockItems > 0 ? "high" : "low",
      category: "inventory",
      href: "/dashboard/purchase-order",
      state: ctx.inventory.lowStockItems > 0 ? "ready" : "watch",
      automationLevel: "assisted",
    },
    {
      id: "clear-grn-invoice-gap",
      title: "Finish PO -> GRN -> PI chain",
      description: `${operational.goodsReceivedPendingInvoice} received shipment(s) are waiting for purchase invoice completion.`,
      actionLabel: "Open purchase invoice queue",
      priority: operational.goodsReceivedPendingInvoice > 0 ? "urgent" : "low",
      category: "operations",
      href: "/dashboard/purchase-invoice",
      state: operational.goodsReceivedPendingInvoice > 0 ? "ready" : "watch",
      automationLevel: "assisted",
    },
    {
      id: "review-margin-pressure",
      title: "Review margin pressure",
      description: "Use profitability and expense signals to stop avoidable margin leakage this week.",
      actionLabel: "Review profitability",
      priority: ctx.profit.thisMonth < 0 ? "urgent" : "medium",
      category: "profitability",
      href: "/dashboard/reports/profitability",
      state: "ready",
      automationLevel: "manual",
    },
  ];
}

function buildAutoRunSuggestions(ctx: FinancialContext, operational: OperationalContext): OperatorAction[] {
  return [
    {
      id: "auto-followup-top-overdues",
      title: "Auto-build top overdue follow-up queue",
      description: "Create a prioritized follow-up list ordered by overdue amount and payment risk.",
      actionLabel: "Create queue",
      priority: ctx.receivables.overdue > 0 ? "high" : "low",
      category: "cashflow",
      href: "/dashboard/payment-followup",
      state: ctx.receivables.overdue > 0 ? "ready" : "watch",
      automationLevel: "auto-ready",
    },
    {
      id: "auto-stock-watch",
      title: "Auto-watch critical stock cover",
      description: "Keep today’s low-stock names pinned until replenishment is completed.",
      actionLabel: "Start watch",
      priority: ctx.inventory.lowStockItems > 0 ? "high" : "low",
      category: "inventory",
      href: "/dashboard/stock-report",
      state: ctx.inventory.lowStockItems > 0 ? "ready" : "watch",
      automationLevel: "auto-ready",
    },
    {
      id: "auto-ops-gap-watch",
      title: "Auto-watch operational backlog",
      description: "Track business records still pending across active modules and surface them every morning.",
      actionLabel: "Enable watch",
      priority: operational.openBusinessRecords > 0 ? "medium" : "low",
      category: "operations",
      href: "/dashboard/operator",
      state: operational.openBusinessRecords > 0 ? "ready" : "watch",
      automationLevel: "auto-ready",
    },
  ];
}

export async function buildBusinessOperator(companyId: string): Promise<OperatorPayload> {
  const [ctx, operational] = await Promise.all([
    buildFinancialContext(companyId),
    getOperationalContext(companyId),
  ]);
  const anomalies = await detectAnomalies(ctx);

  return {
    generatedAt: new Date().toISOString(),
    company: {
      name: ctx.company.name,
      businessType: ctx.company.businessType,
      businessLabel: labelForBusinessType(ctx.company.businessType),
      plan: ctx.company.plan,
      currency: ctx.company.currency,
    },
    overview: {
      healthScore: scoreHealth(ctx),
      revenueChange: ctx.revenue.change,
      expenseChange: ctx.expenses.change,
      profitChange: ctx.profit.change,
      cashPosition: ctx.cashPosition,
      overdueReceivables: ctx.receivables.overdue,
      overduePayables: ctx.payables.overdue,
      lowStockItems: ctx.inventory.lowStockItems,
      openPurchaseOrders: operational.openPurchaseOrders,
      goodsReceivedPendingInvoice: operational.goodsReceivedPendingInvoice,
      openBusinessRecords: operational.openBusinessRecords,
    },
    todaysDecisions: buildDecisions(ctx, operational),
    detectedProblems: anomalies,
    recommendedActions: buildRecommendedActions(ctx, operational),
    autoRunSuggestions: buildAutoRunSuggestions(ctx, operational),
    playbook: buildPlaybook(ctx.company.businessType),
  };
}
