import { NextRequest, NextResponse } from "next/server";
import { buildFinancialContext, FINOVA_SYSTEM_PROMPT, openAITextResponse } from "@/lib/finovaAI";

export const runtime = "nodejs";
export const maxDuration = 60;

export interface Recommendation {
  priority: "urgent" | "high" | "medium" | "low";
  category: "revenue" | "expense" | "cashflow" | "inventory" | "customer" | "operations";
  title: string;
  description: string;
  impact: string;
  action: string;
  link?: string;
  icon: string;
}

const LINK_MAP: Record<string, string> = {
  revenue: "/dashboard/sales-invoice",
  expense: "/dashboard/expense-vouchers",
  cashflow: "/dashboard/crv",
  inventory: "/dashboard/purchase-order",
  customer: "/dashboard/crm",
  operations: "/dashboard/reports/trial-balance",
};

const ICON_MAP: Record<string, string> = {
  revenue: "📈",
  expense: "💸",
  cashflow: "💵",
  inventory: "📦",
  customer: "👥",
  operations: "⚙️",
};

export async function GET(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const ctx = await buildFinancialContext(companyId);
    const c = ctx.company.currency;
    const fmt = (n: number) => `${c} ${n.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;

    const dataPrompt = `
COMPANY: ${ctx.company.name} | Type: ${ctx.company.businessType} | Plan: ${ctx.company.plan}

FINANCIALS:
- Revenue this month: ${fmt(ctx.revenue.thisMonth)} (${ctx.revenue.change > 0 ? "+" : ""}${ctx.revenue.change}% vs last month)
- Expenses this month: ${fmt(ctx.expenses.thisMonth)} (${ctx.expenses.change > 0 ? "+" : ""}${ctx.expenses.change}% vs last month)
- Net profit: ${fmt(ctx.profit.thisMonth)} (${ctx.profit.change > 0 ? "+" : ""}${ctx.profit.change}% vs last month)
- Overdue receivables: ${fmt(ctx.receivables.overdue)} (${ctx.receivables.overdueCount} invoices)
- Outstanding payables: ${fmt(ctx.payables.total)}
- Low stock items: ${ctx.inventory.lowStockItems} (${ctx.inventory.lowStockNames.join(", ") || "none"})
- Top expense categories: ${ctx.topExpenses.map(e => `${e.category}: ${fmt(e.amount)}`).join(", ") || "none"}
- Top customers: ${ctx.topCustomers.map(customer => `${customer.name}: ${fmt(customer.amount)}`).join(", ") || "none"}
- Slow moving items: ${ctx.slowMovingItems.map(item => item.name).join(", ") || "none"}
- Dead stock items: ${ctx.deadStockItems.map(item => item.name).join(", ") || "none"}

Generate exactly 6 actionable business recommendations as a JSON array. Each must be highly specific to this company's actual data above.

Return ONLY valid JSON. Format:
[
  {
    "priority": "urgent|high|medium|low",
    "category": "revenue|expense|cashflow|inventory|customer|operations",
    "title": "short action title",
    "description": "2 sentences max with actual numbers",
    "impact": "expected business outcome",
    "action": "single clear next step"
  }
]
`;

    const text = await openAITextResponse(
      FINOVA_SYSTEM_PROMPT,
      [{ role: "user", content: dataPrompt }],
      1200,
    );

    let recs: Recommendation[] = [];
    try {
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      recs = (Array.isArray(parsed) ? parsed : []).slice(0, 6).map((item: Partial<Recommendation>) => ({
        priority: item.priority || "medium",
        category: item.category || "operations",
        title: item.title || "Action Required",
        description: item.description || "",
        impact: item.impact || "",
        action: item.action || "",
        icon: ICON_MAP[item.category || "operations"] || "💡",
        link: LINK_MAP[item.category || "operations"],
      }));
    } catch {
      if (ctx.receivables.overdue > 0) {
        recs.push({
          priority: "urgent",
          category: "cashflow",
          title: "Collect overdue payments",
          description: `${fmt(ctx.receivables.overdue)} is overdue across ${ctx.receivables.overdueCount} invoice(s).`,
          impact: "Improves cash position quickly.",
          action: "Send reminders and call overdue customers today.",
          icon: "💵",
          link: "/dashboard/crv",
        });
      }
      if (ctx.expenses.change > 15) {
        recs.push({
          priority: "high",
          category: "expense",
          title: "Reduce expense spike",
          description: `Expenses rose ${ctx.expenses.change}% this month. Top expense is ${ctx.topExpenses[0]?.category || "uncategorized"}.`,
          impact: "Protects operating margin next month.",
          action: "Review expense vouchers and pause unnecessary spend.",
          icon: "💸",
          link: "/dashboard/expense-vouchers",
        });
      }
      if (ctx.inventory.lowStockItems > 0) {
        recs.push({
          priority: "medium",
          category: "inventory",
          title: "Reorder low stock items",
          description: `${ctx.inventory.lowStockItems} item(s) are below minimum stock.`,
          impact: "Prevents stockouts and missed sales.",
          action: "Create purchase orders for the low-stock list.",
          icon: "📦",
          link: "/dashboard/purchase-order",
        });
      }
      if (ctx.slowMovingItems.length > 0 || ctx.deadStockItems.length > 0) {
        recs.push({
          priority: "medium",
          category: "inventory",
          title: "Stop slow product buildup",
          description: `${ctx.slowMovingItems[0]?.name || ctx.deadStockItems[0]?.name || "Some items"} is tying up cash in stock.`,
          impact: "Frees working capital and lowers dead-stock risk.",
          action: "Discount, bundle, or stop replenishing slow-moving products.",
          icon: "📦",
          link: "/dashboard/reports/stock-ledger",
        });
      }
      if (ctx.revenue.thisMonth > 0 && ctx.profit.thisMonth > 0 && ctx.profit.thisMonth / ctx.revenue.thisMonth < 0.08) {
        recs.push({
          priority: "high",
          category: "revenue",
          title: "Increase price selectively",
          description: "Revenue is moving but net margin is still thin this month.",
          impact: "Improves profit without waiting for more volume.",
          action: "Review pricing on your strongest-selling items.",
          icon: "📈",
          link: "/dashboard/items-new",
        });
      }
      if (ctx.profit.thisMonth < 0) {
        recs.push({
          priority: "urgent",
          category: "operations",
          title: "Fix negative profit",
          description: "Current month is running at a loss because expenses exceed revenue.",
          impact: "Stabilizes the business before losses deepen.",
          action: "Cut non-essential spending and review weak product lines.",
          icon: "⚙️",
          link: "/dashboard/reports/trial-balance",
        });
      }
    }

    return NextResponse.json({ recommendations: recs.slice(0, 6), generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error("AI recommendations error:", err);
    return NextResponse.json({ error: "Failed to generate recommendations" }, { status: 500 });
  }
}
