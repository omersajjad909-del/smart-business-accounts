import type { FinancialContext } from "@/lib/finovaAI";

type Severity = "critical" | "warning" | "info" | "positive";

export interface InsightCard {
  id: string;
  label: string;
  value: string;
  note: string;
  severity: Severity;
  icon: string;
}

export interface ForecastBundle {
  projections: {
    revenue30d: number;
    expense30d: number;
    cashflow30d: number;
    closingCash30d: number;
    revenue60d: number;
    expense60d: number;
    cashflow60d: number;
    closingCash60d: number;
    revenue90d: number;
    expense90d: number;
    cashflow90d: number;
    closingCash90d: number;
    cashRisk: "low" | "medium" | "high";
    receivablesDue: number;
    payablesDue: number;
    daysUntilCashLow: number | null;
    recommendedBuffer: number;
  };
  chartData: { period: string; revenue: number; expenses: number; closingCash: number }[];
  summary: string[];
}

export interface RevenueAnalyzer {
  summary: string[];
  topCustomer?: { name: string; amount: number };
  topProduct?: { name: string; revenue: number; qty: number };
  bestMonth?: { month: string; revenue: number };
  worstMonth?: { month: string; revenue: number };
}

export interface ProfitabilityAnalyzer {
  marginPct: number;
  summary: string[];
  topCustomerMargins: { name: string; revenue: number; estimatedProfit: number }[];
  topProductMargins: { name: string; revenue: number; estimatedProfit: number }[];
  bestMonth?: { month: string; profit: number };
  worstMonth?: { month: string; profit: number };
}

export interface InventoryIntelligence {
  stockValue: number;
  turnoverRate: number;
  lowStockCount: number;
  reorderItems: string[];
  fastMovingItems: string[];
  slowMovingItems: string[];
  deadStockItems: string[];
  summary: string[];
}

export interface RiskAnalyzer {
  healthScore: number;
  scoreLabel: "Low" | "Medium" | "High";
  items: { title: string; severity: "critical" | "warning" | "info"; note: string }[];
}

export interface LatePaymentPrediction {
  customers: { name: string; risk: "high" | "medium" | "low"; overdueCount: number; totalRevenue: number; avgDaysToPay: number }[];
  summary: string[];
}

function avg(values: number[]) {
  const nums = values.filter((n) => Number.isFinite(n));
  if (!nums.length) return 0;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

function ratio(a: number, b: number) {
  if (!b) return 0;
  return a / b;
}

function positiveOrInfo(value: number): Severity {
  if (value > 0) return "positive";
  if (value < 0) return "critical";
  return "info";
}

export function buildInsightCards(ctx: FinancialContext): InsightCard[] {
  const topCustomer = ctx.topCustomers[0];
  const topProduct = ctx.topProducts[0];
  const cashForecast = buildForecastBundle(ctx);

  return [
    {
      id: "revenue",
      label: "Revenue",
      value: `${ctx.revenue.change >= 0 ? "+" : ""}${ctx.revenue.change}%`,
      note: `This month ${ctx.revenue.change >= 0 ? "grew" : "fell"} vs last month`,
      severity: positiveOrInfo(ctx.revenue.change),
      icon: "📈",
    },
    {
      id: "expenses",
      label: "Expenses",
      value: `${ctx.expenses.change >= 0 ? "+" : ""}${ctx.expenses.change}%`,
      note: "Month-on-month operating pressure",
      severity: ctx.expenses.change > 15 ? "warning" : ctx.expenses.change > 0 ? "info" : "positive",
      icon: "💸",
    },
    {
      id: "profit",
      label: "Profit",
      value: `${ctx.profit.change >= 0 ? "+" : ""}${ctx.profit.change}%`,
      note: ctx.profit.thisMonth >= 0 ? "Net result remains positive" : "Net result is under pressure",
      severity: ctx.profit.thisMonth >= 0 ? "positive" : "critical",
      icon: "💼",
    },
    {
      id: "top-customer",
      label: "Top Customer",
      value: topCustomer?.name || "No data yet",
      note: topCustomer ? `Generated ${Math.round(topCustomer.amount).toLocaleString()} this year` : "Add more invoices to surface leaders",
      severity: "info",
      icon: "👤",
    },
    {
      id: "top-product",
      label: "Top Product",
      value: topProduct?.name || "No data yet",
      note: topProduct ? `Revenue ${Math.round(topProduct.revenue).toLocaleString()} across ${Math.round(topProduct.qty)} units` : "No sales mix available yet",
      severity: "info",
      icon: "📦",
    },
    {
      id: "cash-warning",
      label: "Cash Outlook",
      value:
        cashForecast.projections.daysUntilCashLow === null
          ? "Stable"
          : `${cashForecast.projections.daysUntilCashLow} days`,
      note:
        cashForecast.projections.daysUntilCashLow === null
          ? "Current trend does not signal immediate cash stress"
          : "AI estimates cash pressure if current trend continues",
      severity:
        cashForecast.projections.cashRisk === "high"
          ? "critical"
          : cashForecast.projections.cashRisk === "medium"
            ? "warning"
            : "positive",
      icon: "⚠️",
    },
  ];
}

export function buildForecastBundle(ctx: FinancialContext): ForecastBundle {
  const monthlyRevenueAvg = avg(
    ctx.monthlyRevenue.map((month) => month.revenue).filter((n) => n > 0),
  ) || ctx.revenue.thisMonth || ctx.revenue.lastMonth;
  const monthlyExpenseAvg = avg(
    ctx.monthlyRevenue.map((month) => month.expenses).filter((n) => n > 0),
  ) || ctx.expenses.thisMonth || ctx.expenses.lastMonth;

  const currentCash = ctx.cashPosition;
  const receivableCollections = [0.45, 0.72, 0.9];
  const payableSettlements = [0.3, 0.58, 0.85];
  const periods = [30, 60, 90] as const;

  const computed = periods.map((days, index) => {
    const revenue = Math.round(monthlyRevenueAvg * (days / 30));
    const expenses = Math.round(monthlyExpenseAvg * (days / 30));
    const inflow = Math.round(ctx.receivables.total * receivableCollections[index]);
    const outflow = Math.round(ctx.payables.total * payableSettlements[index]);
    const closingCash = Math.round(currentCash + revenue + inflow - expenses - outflow);
    return { days, revenue, expenses, closingCash, cashflow: revenue - expenses };
  });

  const burnPerDay = (monthlyExpenseAvg - monthlyRevenueAvg) / 30;
  const daysUntilCashLow =
    burnPerDay > 0 && currentCash > 0 ? Math.max(1, Math.round(currentCash / burnPerDay)) : null;
  const recommendedBuffer = Math.max(0, Math.round(monthlyExpenseAvg * 0.25));
  const closingCash90d = computed[2]?.closingCash ?? currentCash;
  const cashRisk: "low" | "medium" | "high" =
    closingCash90d < 0 || (daysUntilCashLow !== null && daysUntilCashLow <= 30)
      ? "high"
      : closingCash90d < recommendedBuffer || (daysUntilCashLow !== null && daysUntilCashLow <= 60)
        ? "medium"
        : "low";

  return {
    projections: {
      revenue30d: computed[0]?.revenue ?? 0,
      expense30d: computed[0]?.expenses ?? 0,
      cashflow30d: computed[0]?.cashflow ?? 0,
      closingCash30d: computed[0]?.closingCash ?? currentCash,
      revenue60d: computed[1]?.revenue ?? 0,
      expense60d: computed[1]?.expenses ?? 0,
      cashflow60d: computed[1]?.cashflow ?? 0,
      closingCash60d: computed[1]?.closingCash ?? currentCash,
      revenue90d: computed[2]?.revenue ?? 0,
      expense90d: computed[2]?.expenses ?? 0,
      cashflow90d: computed[2]?.cashflow ?? 0,
      closingCash90d: computed[2]?.closingCash ?? currentCash,
      cashRisk,
      receivablesDue: ctx.receivables.total,
      payablesDue: ctx.payables.total,
      daysUntilCashLow,
      recommendedBuffer,
    },
    chartData: computed.map((point) => ({
      period: `Next ${point.days}d`,
      revenue: point.revenue,
      expenses: point.expenses,
      closingCash: point.closingCash,
    })),
    summary: [
      `Projected closing cash after 30 days is ${computed[0]?.closingCash?.toLocaleString() ?? 0}.`,
      `Cash risk is currently rated ${cashRisk}.`,
      daysUntilCashLow === null
        ? "Current trend does not indicate a near-term cash low point."
        : `At the current burn rate, cash could tighten in about ${daysUntilCashLow} days.`,
    ],
  };
}

export function buildRevenueAnalyzer(ctx: FinancialContext): RevenueAnalyzer {
  const sortedByRevenue = [...ctx.monthlyRevenue].sort((a, b) => b.revenue - a.revenue);
  const bestMonth = sortedByRevenue[0];
  const worstMonth = [...ctx.monthlyRevenue].sort((a, b) => a.revenue - b.revenue)[0];
  const topCustomer = ctx.topCustomers[0];
  const topProduct = ctx.topProducts[0];

  return {
    summary: [
      topCustomer
        ? `${topCustomer.name} is the strongest customer by revenue so far.`
        : "No top customer pattern is visible yet.",
      topProduct
        ? `${topProduct.name} is currently the highest revenue product.`
        : "No top product pattern is visible yet.",
      bestMonth
        ? `${bestMonth.month} is your best recent month for sales.`
        : "Sales month comparison will appear once more history is available.",
    ],
    topCustomer,
    topProduct,
    bestMonth,
    worstMonth,
  };
}

export function buildProfitabilityAnalyzer(ctx: FinancialContext): ProfitabilityAnalyzer {
  const marginPct = ctx.revenue.thisMonth > 0 ? Math.round((ctx.profit.thisMonth / ctx.revenue.thisMonth) * 100) : 0;
  const estimatedMargin = Math.max(-0.5, Math.min(0.8, ratio(ctx.profit.thisMonth, Math.max(ctx.revenue.thisMonth, 1))));
  const bestMonth = [...ctx.monthlyRevenue].sort((a, b) => b.profit - a.profit)[0];
  const worstMonth = [...ctx.monthlyRevenue].sort((a, b) => a.profit - b.profit)[0];

  return {
    marginPct,
    summary: [
      `Current net profit margin is ${marginPct}%.`,
      bestMonth ? `${bestMonth.month} delivered the strongest monthly profit.` : "Best month will appear with more history.",
      worstMonth ? `${worstMonth.month} shows the weakest profitability point in recent history.` : "Worst month will appear with more history.",
    ],
    topCustomerMargins: ctx.topCustomers.slice(0, 5).map((customer) => ({
      name: customer.name,
      revenue: customer.amount,
      estimatedProfit: Math.round(customer.amount * estimatedMargin),
    })),
    topProductMargins: ctx.topProducts.slice(0, 5).map((product) => ({
      name: product.name,
      revenue: product.revenue,
      estimatedProfit: Math.round(product.revenue * estimatedMargin),
    })),
    bestMonth,
    worstMonth,
  };
}

export function buildInventoryIntelligence(ctx: FinancialContext): InventoryIntelligence {
  const stockValue = ctx.deadStockItems.reduce((sum, item) => sum + item.value, 0);
  const totalSalesQty = ctx.topProducts.reduce((sum, item) => sum + item.qty, 0);
  const turnoverRate = ctx.inventory.totalItems > 0 ? Number((totalSalesQty / Math.max(ctx.inventory.totalItems, 1)).toFixed(2)) : 0;

  return {
    stockValue,
    turnoverRate,
    lowStockCount: ctx.inventory.lowStockItems,
    reorderItems: ctx.inventory.lowStockNames.slice(0, 6),
    fastMovingItems: ctx.topProducts.slice(0, 5).map((item) => item.name),
    slowMovingItems: ctx.slowMovingItems.slice(0, 5).map((item) => item.name),
    deadStockItems: ctx.deadStockItems.slice(0, 5).map((item) => item.name),
    summary: [
      `${ctx.inventory.lowStockItems} items are currently at or below minimum level.`,
      ctx.topProducts[0] ? `${ctx.topProducts[0].name} is your fastest-moving item by sales.` : "Fast-moving item data will appear after more sales activity.",
      ctx.deadStockItems.length > 0
        ? `${ctx.deadStockItems.length} item(s) are classified as dead stock.`
        : "No dead stock has been flagged right now.",
    ],
  };
}

export function buildRiskAnalyzer(ctx: FinancialContext): RiskAnalyzer {
  let score = 78;
  const items: RiskAnalyzer["items"] = [];

  if (ctx.profit.thisMonth < 0) {
    score -= 18;
    items.push({ title: "Loss risk", severity: "critical", note: "Current month is running at a loss." });
  }
  if (ctx.receivables.overdue > ctx.revenue.thisMonth * 0.3 && ctx.revenue.thisMonth > 0) {
    score -= 12;
    items.push({ title: "Cashflow risk", severity: "critical", note: "Overdue receivables are too large compared to monthly revenue." });
  }
  if (ctx.expenses.change > ctx.revenue.change + 10) {
    score -= 10;
    items.push({ title: "Expense pressure", severity: "warning", note: "Expenses are rising faster than revenue." });
  }
  if (ctx.deadStockItems.length > 0) {
    score -= 8;
    items.push({ title: "Inventory overstock", severity: "warning", note: "Dead stock is tying up working capital." });
  }
  if (ctx.topCustomers.length > 0) {
    const concentration = ratio(ctx.topCustomers[0].amount, Math.max(ctx.revenue.thisYear, 1));
    if (concentration > 0.35) {
      score -= 7;
      items.push({ title: "Customer concentration", severity: "warning", note: `${ctx.topCustomers[0].name} represents a large share of revenue.` });
    }
  }

  score = Math.max(20, Math.min(100, Math.round(score)));
  const scoreLabel = score >= 75 ? "Low" : score >= 55 ? "Medium" : "High";

  if (!items.length) {
    items.push({ title: "Stable position", severity: "info", note: "No major financial risk pattern is currently dominant." });
  }

  return { healthScore: score, scoreLabel, items };
}

export function buildLatePaymentPrediction(ctx: FinancialContext): LatePaymentPrediction {
  const customers = [...ctx.customerPaymentHistory]
    .sort((a, b) => (b.overdueCount * 100 + b.avgDaysToPay) - (a.overdueCount * 100 + a.avgDaysToPay))
    .slice(0, 5)
    .map((customer): { name: string; risk: "high" | "medium" | "low"; overdueCount: number; totalRevenue: number; avgDaysToPay: number } => ({
      ...customer,
      risk:
        customer.overdueCount > 2 || customer.avgDaysToPay > 45
          ? "high"
          : customer.overdueCount > 0 || customer.avgDaysToPay > 30
            ? "medium"
            : "low",
    }));

  return {
    customers,
    summary: [
      customers[0]
        ? `${customers[0].name} currently looks most likely to delay payment.`
        : "No customer payment delay pattern is available yet.",
      ctx.receivables.overdue > 0
        ? `${ctx.receivables.overdueCount} invoice(s) are already overdue and should be followed up.`
        : "No overdue customer invoices right now.",
    ],
  };
}
