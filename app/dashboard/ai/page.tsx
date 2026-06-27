"use client";

import toast from "react-hot-toast";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from "recharts";

// ─── Types ─────────────────────────────────────────────────────────────────
type Tab = "overview" | "chat" | "insights" | "alerts" | "forecast" | "recommendations" | "reminders" | "tax" | "report" | "market" | "advisor" | "reconciliation" | "scan" | "invoice-gen" | "inv-forecast" | "cashflow-opt" | "churn" | "supplier-intel" | "gl-suggest" | "expense-cat" | "budget" | "duplicate" | "customer-profit" | "ratios";

// ── Scan Receipt types
interface ScannedItem { description: string; qty: number | null; unitPrice: number | null; amount: number }
interface ScanResult {
  vendor: string | null; date: string | null; invoiceNo: string | null;
  subtotal: number | null; taxAmount: number | null; taxRate: number | null;
  total: number; currency: string; items: ScannedItem[];
  category: string; confidence: number; notes: string | null;
}

// ── Invoice Gen types
interface InvoiceGenItem { description: string; qty: number; unitPrice: number; taxRate: number; amount: number }
interface InvoiceDraft {
  customerName: string; customerId: string | null; invoiceNo: string;
  date: string; dueDate: string;
  items: InvoiceGenItem[];
  subtotal: number; taxTotal: number; total: number;
  notes: string | null; confidence: number;
}

// ── Inventory Forecast types
interface InvForecastItem { itemId: string; name: string; currentStock: number; minStock: number; avgMonthlySales: number; nextMonthForecast: number; suggestedReorder: number; daysOfStock: number; urgency: "critical" | "warning" | "ok"; trend: "growing" | "stable" | "declining"; totalRevenue: number; }
interface InvForecastResult { forecasts: InvForecastItem[]; summary: { criticalCount: number; warningCount: number; totalItems: number; estimatedReorderValue: number; currency: string; reorderValueFormatted: string }; narrative: string; }

// ── Cashflow Optimize types
interface CashflowEntry { label: string; amount: number; dueDate: string; daysUntilDue: number; type: "inflow" | "outflow"; action: string; priority: "urgent" | "high" | "medium"; earlyPayDiscount?: string | null; }
interface CashflowOptResult { inflows: CashflowEntry[]; outflows: CashflowEntry[]; projection: { net30: number; net60: number; inflow30: number; inflow60: number; outflow30: number; outflow60: number; currency: string }; tips: Array<{ title: string; impact: string; action: string; potentialSaving: string }>; narrative: string; }

// ── Churn Prediction types
interface ChurnCustomer { customerId: string; name: string; totalRevenue: number; invoiceCount: number; daysSinceLastOrder: number; avgOrderFrequencyDays: number; revenueTrend: "growing" | "stable" | "declining" | "gone_silent"; churnRisk: "critical" | "high" | "medium" | "low"; churnScore: number; reason: string; suggestedAction: string; }
interface ChurnResult { customers: ChurnCustomer[]; summary: { criticalCount: number; highCount: number; totalCustomers: number; atRiskRevenue: number; currency: string }; narrative: string; }

// ── Supplier Intel types
interface SupplierIntelItem { supplierId: string; name: string; totalSpend: number; invoiceCount: number; spendTrend: "increasing" | "stable" | "decreasing"; spendTrendPct: number; negotiationOpportunity: "high" | "medium" | "low"; negotiationReason: string; suggestedDiscount: string; topItems: Array<{ description: string; avgRate: number; totalQty: number; priceVariance: number }>; lastOrderDaysAgo: number; concentrationRisk: boolean; }
interface SupplierIntelResult { suppliers: SupplierIntelItem[]; summary: { highOpportunityCount: number; totalSuppliers: number; totalPotentialSaving: number; currency: string }; narrative: string; }

// ── GL Suggest types
interface GLSuggestResult { suggestions: Array<{ rank: number; category: string; confidence: number; matchedKeyword: string; matchedAccounts: Array<{ id: string; name: string; code: string | null; type: string | null }> }>; fallbackAccounts: Array<{ id: string; name: string; code: string | null; type: string | null }>; topSuggestion: { category: string; confidence: number } | null; }

interface AnomalyAlert {
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  action: string;
  link?: string;
}

interface FinCtx {
  company: { name: string; businessType: string; plan: string; currency: string };
  revenue: { thisMonth: number; lastMonth: number; thisYear: number; change: number };
  expenses: { thisMonth: number; lastMonth: number; change: number };
  profit: { thisMonth: number; lastMonth: number; change: number };
  receivables: { total: number; overdue: number; overdueCount: number };
  payables: { total: number; overdue: number };
  inventory: { totalItems: number; lowStockItems: number; lowStockNames: string[]; stockValue: number };
  topCustomers: { name: string; amount: number }[];
  topExpenses: { category: string; amount: number }[];
  recentInvoices: { ref: string; customer: string; amount: number; status: string; daysAgo: number }[];
  cashPosition: number;
  topProducts: { name: string; revenue: number; qty: number }[];
  slowMovingItems: { name: string; lastSaleDays: number; stock: number }[];
  deadStockItems: { name: string; stock: number; value: number }[];
  monthlyRevenue: { month: string; revenue: number; expenses: number; profit: number }[];
  customerPaymentHistory: { name: string; avgDaysToPay: number; overdueCount: number; totalRevenue: number }[];
}

interface ChatMsg { role: "user" | "assistant"; content: string; ts: number }

interface Recommendation {
  priority: "urgent" | "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  impact: string;
  action: string;
  icon: string;
  link?: string;
}

interface InsightCard {
  id: string;
  label: string;
  value: string;
  note: string;
  severity: "critical" | "warning" | "info" | "positive";
  icon: string;
}

interface PredictiveSignal {
  metric: string;
  label: string;
  forecast: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
  risk: "low" | "medium" | "high";
  explanation: string;
}

interface ForecastResponse {
  text: string;
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
    cashRisk: string;
    receivablesDue: number;
    payablesDue: number;
    daysUntilCashLow: number | null;
    recommendedBuffer: number;
  };
  chartData: { period: string; revenue: number; expenses: number; closingCash: number }[];
  predictiveSignals?: PredictiveSignal[];
}

interface ReportResponse {
  report: string;
  month: string;
  company: string;
  generatedAt: string;
  summary: {
    revenue: number;
    expenses: number;
    profit: number;
    revenueChange: number;
    expenseChange: number;
    profitChange: number;
  };
  highlights?: {
    topCustomer?: { name: string; amount: number };
    topExpense?: { category: string; amount: number };
    lowStockCount?: number;
    overdueReceivables?: number;
    cashRisk?: string;
  };
  riskSnapshot?: {
    score: number;
    label: string;
    items: { title: string; severity: "critical" | "warning" | "info"; note: string }[];
  };
}

function normalizeForecast(data: any): ForecastResponse | null {
  if (!data || typeof data !== "object") return null;
  return {
    text: typeof data.forecast === "string" ? data.forecast : "",
    projections: {
      revenue30d: Number(data.projections?.revenue30d || 0),
      expense30d: Number(data.projections?.expense30d || 0),
      cashflow30d: Number(data.projections?.cashflow30d || 0),
      closingCash30d: Number(data.projections?.closingCash30d || 0),
      revenue60d: Number(data.projections?.revenue60d || 0),
      expense60d: Number(data.projections?.expense60d || 0),
      cashflow60d: Number(data.projections?.cashflow60d || 0),
      closingCash60d: Number(data.projections?.closingCash60d || 0),
      revenue90d: Number(data.projections?.revenue90d || 0),
      expense90d: Number(data.projections?.expense90d || 0),
      cashflow90d: Number(data.projections?.cashflow90d || 0),
      closingCash90d: Number(data.projections?.closingCash90d || 0),
      cashRisk: data.projections?.cashRisk || "low",
      receivablesDue: Number(data.projections?.receivablesDue || 0),
      payablesDue: Number(data.projections?.payablesDue || 0),
      daysUntilCashLow: typeof data.projections?.daysUntilCashLow === "number" ? data.projections.daysUntilCashLow : null,
      recommendedBuffer: Number(data.projections?.recommendedBuffer || 0),
    },
    chartData: Array.isArray(data.chartData) ? data.chartData : [],
    predictiveSignals: Array.isArray(data.predictiveSignals) ? data.predictiveSignals : undefined,
  };
}

function normalizeReport(data: any): ReportResponse | null {
  if (!data || typeof data !== "object" || typeof data.report !== "string") return null;
  return {
    report: data.report,
    month: data.month || "",
    company: data.company || "",
    generatedAt: data.generatedAt || new Date().toISOString(),
    summary: {
      revenue: Number(data.summary?.revenue || 0),
      expenses: Number(data.summary?.expenses || 0),
      profit: Number(data.summary?.profit || 0),
      revenueChange: Number(data.summary?.revenueChange || 0),
      expenseChange: Number(data.summary?.expenseChange || 0),
      profitChange: Number(data.summary?.profitChange || 0),
    },
    highlights: {
      topCustomer: data.highlights?.topCustomer,
      topExpense: data.highlights?.topExpense,
      lowStockCount: Number(data.highlights?.lowStockCount || 0),
      overdueReceivables: Number(data.highlights?.overdueReceivables || 0),
      cashRisk: data.highlights?.cashRisk || "low",
    },
    riskSnapshot: data.riskSnapshot ? {
      score: Number(data.riskSnapshot.score || 0),
      label: data.riskSnapshot.label || "Medium",
      items: Array.isArray(data.riskSnapshot.items) ? data.riskSnapshot.items : [],
    } : undefined,
  };
}

interface RevenueAnalyzer {
  summary: string[];
  topCustomer?: { name: string; amount: number };
  topProduct?: { name: string; revenue: number; qty: number };
  bestMonth?: { month: string; revenue: number };
  worstMonth?: { month: string; revenue: number };
}

interface ProfitabilityAnalyzer {
  marginPct: number;
  summary: string[];
  topCustomerMargins: { name: string; revenue: number; estimatedProfit: number }[];
  topProductMargins: { name: string; revenue: number; estimatedProfit: number }[];
  bestMonth?: { month: string; profit: number };
  worstMonth?: { month: string; profit: number };
}

interface InventoryIntelligence {
  stockValue: number;
  turnoverRate: number;
  lowStockCount: number;
  reorderItems: string[];
  fastMovingItems: string[];
  slowMovingItems: string[];
  deadStockItems: string[];
  summary: string[];
}

interface RiskAnalyzer {
  healthScore: number;
  scoreLabel: "Low" | "Medium" | "High";
  items: { title: string; severity: "critical" | "warning" | "info"; note: string }[];
}

interface LatePaymentPrediction {
  customers: { name: string; risk: "high" | "medium" | "low"; overdueCount: number; totalRevenue: number; avgDaysToPay: number }[];
  summary: string[];
}

interface InvoiceReminderResponse {
  reminders: {
    invoiceId: string;
    customer: string;
    invoiceRef: string;
    amount: number;
    daysAgo: number;
    priority: "urgent" | "high" | "medium" | "low";
    reason: string;
    suggestedAction: string;
    channel: "email" | "phone" | "whatsapp";
  }[];
  summary: string[];
  totals: {
    overdueReceivables: number;
    overdueCount: number;
  };
}

interface TaxEstimateResponse {
  month: string;
  summary: string;
  metrics: {
    outputTax: number;
    inputTax: number;
    netTaxPayable: number;
    taxConfigsCount: number;
    taxedSalesInvoices: number;
    taxedPurchaseInvoices: number;
  };
  taxCoverage: {
    taxType: string;
    taxCode: string;
    taxRate: number;
  }[];
}

interface MarketIntelligenceResult {
  businessType: string;
  businessLabel: string;
  currentProducts: string[];
  suggestedNewProducts: { name: string; reason: string; potentialRevenue: "high" | "medium" | "low" }[];
  trendsThisIndustry: string[];
  seasonalOpportunities: { month: string; opportunities: string[] }[];
  revenueDiversification: string[];
  competitorEdge: string[];
  score: number;
  summary: string;
}

interface BusinessAdvisorResult {
  businessType: string;
  growthPlan: { title: string; priority: "urgent" | "high" | "medium" | "low"; steps: string[]; impact: string }[];
  marketGaps: string[];
  crossSellUpsell: { trigger: string; suggest: string; reason: string }[];
  riskWarnings: { title: string; severity: "critical" | "warning" | "info"; description: string; mitigation: string }[];
  quickWins: string[];
  score: { overall: number; label: string };
}

interface ReconciliationMatchCandidate {
  id: string;
  type: "invoice" | "expense" | "payment" | "journal";
  ref: string;
  party: string;
  amount: number;
  date: string;
  confidence: number;
}
interface ReconciliationItem {
  id: string;
  ledgerRef: string;
  date: string;
  description: string;
  amount: number;
  direction: "debit" | "credit";
  status: "pending" | "auto_matched" | "manually_matched" | "unmatched";
  selectedMatchId?: string;
  isDuplicate?: boolean;
  matches: ReconciliationMatchCandidate[];
}
interface ReconciliationResult {
  summary: { total: number; autoMatched: number; manuallyMatched: number; pending: number; unmatched: number };
  items: ReconciliationItem[];
}

function normalizeBusinessAdvisor(data: Partial<BusinessAdvisorResult> | null | undefined): BusinessAdvisorResult | null {
  if (!data || typeof data !== "object") return null;
  return {
    businessType: data.businessType || "business",
    growthPlan: Array.isArray(data.growthPlan) ? data.growthPlan : [],
    marketGaps: Array.isArray(data.marketGaps) ? data.marketGaps : [],
    crossSellUpsell: Array.isArray(data.crossSellUpsell) ? data.crossSellUpsell : [],
    riskWarnings: Array.isArray(data.riskWarnings) ? data.riskWarnings : [],
    quickWins: Array.isArray(data.quickWins) ? data.quickWins : [],
    score: {
      overall: typeof data.score?.overall === "number" ? data.score.overall : 0,
      label: data.score?.label || "Unavailable",
    },
  };
}

function normalizeMarketIntel(data: Partial<MarketIntelligenceResult> | null | undefined): MarketIntelligenceResult | null {
  if (!data || typeof data !== "object") return null;
  return {
    businessType: data.businessType || "business",
    businessLabel: data.businessLabel || "Business",
    currentProducts: Array.isArray(data.currentProducts) ? data.currentProducts : [],
    suggestedNewProducts: Array.isArray(data.suggestedNewProducts) ? data.suggestedNewProducts : [],
    trendsThisIndustry: Array.isArray(data.trendsThisIndustry) ? data.trendsThisIndustry : [],
    seasonalOpportunities: Array.isArray(data.seasonalOpportunities) ? data.seasonalOpportunities : [],
    revenueDiversification: Array.isArray(data.revenueDiversification) ? data.revenueDiversification : [],
    competitorEdge: Array.isArray(data.competitorEdge) ? data.competitorEdge : [],
    score: typeof data.score === "number" ? data.score : 0,
    summary: data.summary || "Market intelligence is currently unavailable.",
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmt(n: number | undefined | null, currency = "PKR") {
  const v = Number(n ?? 0);
  if (v >= 1_000_000) return `${currency} ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${currency} ${(v / 1_000).toFixed(0)}K`;
  return `${currency} ${v.toFixed(0)}`;
}
function pct(n: number) {
  return (n >= 0 ? "+" : "") + n + "%";
}
function healthScore(ctx: FinCtx): number {
  let score = 60;
  if (ctx.revenue.change > 0) score += Math.min(ctx.revenue.change, 15);
  if (ctx.revenue.change < 0) score += Math.max(ctx.revenue.change, -15);
  if (ctx.expenses.change < ctx.revenue.change) score += 10;
  if (ctx.expenses.change > 20) score -= 10;
  if (ctx.profit.thisMonth > 0) score += 10;
  if (ctx.profit.thisMonth < 0) score -= 20;
  if (ctx.receivables.overdue > ctx.revenue.thisMonth * 0.3) score -= 8;
  if (ctx.inventory.lowStockItems > 5) score -= 5;
  // Stock value as an asset — offsets poor monthly P&L
  const stockVal = ctx.inventory.stockValue || 0;
  const monthlyExp = ctx.expenses.thisMonth || 1;
  if (stockVal >= monthlyExp * 2) score += 15;       // stock covers 2+ months expenses
  else if (stockVal >= monthlyExp) score += 10;      // stock covers 1+ month expenses
  else if (stockVal >= monthlyExp * 0.5) score += 5; // stock covers 50%+ of expenses
  return Math.max(20, Math.min(100, Math.round(score)));
}
function riskLevel(score: number): { label: string; color: string } {
  if (score >= 75) return { label: "Low", color: "#10b981" };
  if (score >= 55) return { label: "Medium", color: "#f59e0b" };
  return { label: "High", color: "#ef4444" };
}
function categoryHealthScores(ctx: FinCtx) {
  const revenue = Math.max(20, Math.min(100, Math.round(
    65
    + (ctx.revenue.change > 15 ? 20 : ctx.revenue.change > 5 ? 12 : ctx.revenue.change > 0 ? 5 : ctx.revenue.change > -10 ? -5 : -15)
    + (ctx.revenue.thisYear > ctx.revenue.thisMonth * 6 ? 5 : 0)
  )));
  const marginPct = ctx.revenue.thisMonth > 0 ? (ctx.profit.thisMonth / ctx.revenue.thisMonth) * 100 : 0;
  const profitability = Math.max(20, Math.min(100, Math.round(
    60
    + (marginPct > 20 ? 25 : marginPct > 10 ? 15 : marginPct > 0 ? 5 : marginPct > -10 ? -15 : -25)
    + (ctx.profit.change > 0 ? 8 : ctx.profit.change < -15 ? -8 : 0)
  )));
  const burnCover = ctx.expenses.thisMonth > 0 ? ctx.cashPosition / ctx.expenses.thisMonth : 3;
  const cashflow = Math.max(20, Math.min(100, Math.round(
    68
    + (burnCover >= 3 ? 22 : burnCover >= 1.5 ? 12 : burnCover >= 0.5 ? 0 : -20)
    + (ctx.receivables.overdue > ctx.receivables.total * 0.4 ? -8 : 0)
  )));
  const concentration = ctx.topCustomers.length > 0 && ctx.revenue.thisYear > 0
    ? ctx.topCustomers[0].amount / ctx.revenue.thisYear : 0;
  const customers = Math.max(20, Math.min(100, Math.round(
    75
    + (concentration > 0.5 ? -20 : concentration > 0.3 ? -10 : concentration > 0 ? 5 : 0)
    + (ctx.topCustomers.length >= 5 ? 8 : ctx.topCustomers.length >= 3 ? 4 : 0)
  )));
  const inventory = Math.max(20, Math.min(100, Math.round(
    75
    + (ctx.inventory.lowStockItems > 10 ? -20 : ctx.inventory.lowStockItems > 5 ? -10 : ctx.inventory.lowStockItems > 0 ? -4 : 5)
    + (ctx.deadStockItems.length > 5 ? -15 : ctx.deadStockItems.length > 0 ? -8 : 5)
    + (ctx.inventory.stockValue > ctx.expenses.thisMonth * 2 ? 8 : 0)
  )));
  const overdueRatio = ctx.receivables.total > 0 ? ctx.receivables.overdue / ctx.receivables.total : 0;
  const collections = Math.max(20, Math.min(100, Math.round(
    80
    + (overdueRatio > 0.5 ? -25 : overdueRatio > 0.3 ? -15 : overdueRatio > 0.1 ? -8 : 5)
    + (ctx.receivables.overdueCount > 10 ? -10 : ctx.receivables.overdueCount > 5 ? -5 : 0)
  )));
  const expRatio = ctx.revenue.thisMonth > 0 ? ctx.expenses.thisMonth / ctx.revenue.thisMonth : 1;
  const efficiency = Math.max(20, Math.min(100, Math.round(
    70
    + (expRatio < 0.5 ? 20 : expRatio < 0.7 ? 10 : expRatio < 0.9 ? 0 : expRatio < 1 ? -10 : -20)
  )));
  return [
    { label: "Revenue", score: revenue, icon: "📈", color: revenue >= 75 ? "#10b981" : revenue >= 55 ? "#f59e0b" : "#ef4444" },
    { label: "Profitability", score: profitability, icon: "💼", color: profitability >= 75 ? "#10b981" : profitability >= 55 ? "#f59e0b" : "#ef4444" },
    { label: "Cash Flow", score: cashflow, icon: "💧", color: cashflow >= 75 ? "#10b981" : cashflow >= 55 ? "#f59e0b" : "#ef4444" },
    { label: "Customers", score: customers, icon: "👥", color: customers >= 75 ? "#10b981" : customers >= 55 ? "#f59e0b" : "#ef4444" },
    { label: "Inventory", score: inventory, icon: "📦", color: inventory >= 75 ? "#10b981" : inventory >= 55 ? "#f59e0b" : "#ef4444" },
    { label: "Collections", score: collections, icon: "🧾", color: collections >= 75 ? "#10b981" : collections >= 55 ? "#f59e0b" : "#ef4444" },
    { label: "Efficiency", score: efficiency, icon: "⚙️", color: efficiency >= 75 ? "#10b981" : efficiency >= 55 ? "#f59e0b" : "#ef4444" },
  ];
}

function severityTone(severity: InsightCard["severity"] | AnomalyAlert["severity"]) {
  if (severity === "critical") return { color: "#ef4444", bg: "rgba(239,68,68,.1)", border: "rgba(239,68,68,.25)" };
  if (severity === "warning") return { color: "#f59e0b", bg: "rgba(245,158,11,.1)", border: "rgba(245,158,11,.25)" };
  if (severity === "positive") return { color: "#10b981", bg: "rgba(16,185,129,.1)", border: "rgba(16,185,129,.25)" };
  return { color: "#6366f1", bg: "rgba(99,102,241,.1)", border: "rgba(99,102,241,.25)" };
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      style={{ animation: "spin 1s linear infinite" }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

function Panel({ children, style, id, className }: { children: React.ReactNode; style?: React.CSSProperties; id?: string; className?: string }) {
  return (
    <div id={id} className={className} style={{
      background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)",
      borderRadius: 16, padding: "20px 22px", ...style,
    }}>
      {children}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: AnomalyAlert["severity"] }) {
  const cfg = {
    critical: { bg: "rgba(239,68,68,.15)", border: "rgba(239,68,68,.3)", color: "#fca5a5", label: "Critical" },
    warning: { bg: "rgba(245,158,11,.12)", border: "rgba(245,158,11,.3)", color: "#fcd34d", label: "Warning" },
    info: { bg: "rgba(99,102,241,.12)", border: "rgba(99,102,241,.3)", color: "#a5b4fc", label: "Info" },
  }[severity];
  return (
    <span style={{
      background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color,
      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
      textTransform: "uppercase", letterSpacing: ".06em",
    }}>{cfg.label}</span>
  );
}

function AlertIcon({ severity }: { severity: AnomalyAlert["severity"] }) {
  if (severity === "critical") return <span style={{ fontSize: 18 }}>🚨</span>;
  if (severity === "warning") return <span style={{ fontSize: 18 }}>⚠️</span>;
  return <span style={{ fontSize: 18 }}>ℹ️</span>;
}

function HealthRing({ score }: { score: number }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 75 ? "#10b981" : score >= 55 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={110} height={110} viewBox="0 0 110 110">
      <circle cx={55} cy={55} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={9} />
      <circle cx={55} cy={55} r={r} fill="none" stroke={color} strokeWidth={9}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round" transform="rotate(-90 55 55)"
        style={{ transition: "stroke-dasharray 1s ease" }} />
      <text x={55} y={52} textAnchor="middle" fill="white" fontSize={22} fontWeight={800}>{score}</text>
      <text x={55} y={67} textAnchor="middle" fill="rgba(255,255,255,.4)" fontSize={11}>/100</text>
    </svg>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function AICommandCenter() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("overview");
  const [ctx, setCtx] = useState<FinCtx | null>(null);
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [insights, setInsights] = useState<string>("");
  const [insightCards, setInsightCards] = useState<InsightCard[]>([]);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [overviewLoaded, setOverviewLoaded] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [revenueAnalyzer, setRevenueAnalyzer] = useState<RevenueAnalyzer | null>(null);
  const [profitability, setProfitability] = useState<ProfitabilityAnalyzer | null>(null);
  const [inventoryIntel, setInventoryIntel] = useState<InventoryIntelligence | null>(null);
  const [riskAnalyzer, setRiskAnalyzer] = useState<RiskAnalyzer | null>(null);
  const [latePayments, setLatePayments] = useState<LatePaymentPrediction | null>(null);
  const [invoiceReminders, setInvoiceReminders] = useState<InvoiceReminderResponse | null>(null);
  const [taxEstimate, setTaxEstimate] = useState<TaxEstimateResponse | null>(null);
  const [loadingDeepAnalysis, setLoadingDeepAnalysis] = useState(false);
  const [loadingReminders, setLoadingReminders] = useState(false);
  const [loadingTaxEstimate, setLoadingTaxEstimate] = useState(false);
  const [sendingReminderRef, setSendingReminderRef] = useState<string | null>(null);
  const [marketIntel, setMarketIntel] = useState<MarketIntelligenceResult | null>(null);
  const [loadingMarket, setLoadingMarket] = useState(false);
  const [businessAdvisor, setBusinessAdvisor] = useState<BusinessAdvisorResult | null>(null);
  const [loadingAdvisor, setLoadingAdvisor] = useState(false);
  const [reconciliation, setReconciliation] = useState<ReconciliationResult | null>(null);
  const [loadingReconciliation, setLoadingReconciliation] = useState(false);
  const [reconciliationFilter, setReconciliationFilter] = useState<"all" | "pending" | "auto_matched" | "unmatched">("pending");
  const [reportPeriod, setReportPeriod] = useState<"weekly" | "monthly" | "quarterly">("monthly");

  // Scan Receipt state
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const scanFileRef = useRef<HTMLInputElement>(null);

  // Invoice Gen state
  const [invoiceGenPrompt, setInvoiceGenPrompt] = useState("");
  const [invoiceDraft, setInvoiceDraft] = useState<InvoiceDraft | null>(null);
  const [invoiceGenLoading, setInvoiceGenLoading] = useState(false);
  const [invoiceGenError, setInvoiceGenError] = useState<string | null>(null);

  // Inventory Forecast state
  const [invForecast, setInvForecast] = useState<InvForecastResult | null>(null);
  const [invForecastLoading, setInvForecastLoading] = useState(false);

  // Cashflow Optimizer state
  const [cashflowOpt, setCashflowOpt] = useState<CashflowOptResult | null>(null);
  const [cashflowOptLoading, setCashflowOptLoading] = useState(false);

  // Churn Prediction state
  const [churnResult, setChurnResult] = useState<ChurnResult | null>(null);
  const [churnLoading, setChurnLoading] = useState(false);

  // Supplier Intel state
  const [supplierIntel, setSupplierIntel] = useState<SupplierIntelResult | null>(null);
  const [supplierIntelLoading, setSupplierIntelLoading] = useState(false);

  // GL Suggest state
  const [glDesc, setGlDesc] = useState("");
  const [glVendor, setGlVendor] = useState("");
  const [glResult, setGlResult] = useState<GLSuggestResult | null>(null);
  const [glLoading, setGlLoading] = useState(false);

  // ── 5 New AI feature states ─────────────────────────────────────────────
  const [expenseCat, setExpenseCat] = useState("");
  const [expenseCatLoading, setExpenseCatLoading] = useState(false);
  const [budgetAnalysis, setBudgetAnalysis] = useState("");
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [duplicateResult, setDuplicateResult] = useState("");
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const [customerProfit, setCustomerProfit] = useState("");
  const [customerProfitLoading, setCustomerProfitLoading] = useState(false);
  const [ratiosResult, setRatiosResult] = useState("");
  const [ratiosLoading, setRatiosLoading] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const nextTab = searchParams.get("tab");
    const allowedTabs = new Set<Tab>([
      "overview", "chat", "insights", "alerts", "forecast",
      "recommendations", "reminders", "tax", "report", "market", "advisor", "reconciliation",
      "scan", "invoice-gen", "inv-forecast", "cashflow-opt", "churn", "supplier-intel", "gl-suggest",
      "expense-cat", "budget", "duplicate", "customer-profit", "ratios",
    ]);
    if (nextTab && allowedTabs.has(nextTab as Tab)) {
      setTab(nextTab as Tab);
    }
  }, [searchParams]);

  const getHeaders = useCallback((): Record<string, string> => {
    const user = getCurrentUser();
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (user?.companyId) h["x-company-id"] = user.companyId;
    if (user?.id) h["x-user-id"] = user.id;
    if (user?.role) h["x-user-role"] = user.role;
    return h;
  }, []);

  // Load alerts + overview on mount
  useEffect(() => {
    const user = getCurrentUser();
    if (!user?.companyId) return;

    // Welcome message in chat
    setMessages([{
      role: "assistant",
      content: "👋 Hi! I'm **FinovaOS AI** — your financial intelligence assistant.\n\nI can see your real business data and help you with:\n• Revenue & expense analysis\n• Cash flow forecasting\n• Invoice & customer insights\n• Inventory intelligence\n• Business recommendations\n\nWhat would you like to know?",
      ts: Date.now(),
    }]);

    // Load alerts immediately (fast)
    setLoadingAlerts(true);
    fetch("/api/ai/alerts", { headers: getHeaders() })
      .then(r => r.json())
      .then(d => { setAlerts(d.alerts || []); setLoadingAlerts(false); })
      .catch(() => setLoadingAlerts(false));

    // Load insights
    setLoadingInsights(true);
    fetch("/api/ai/insights", { headers: getHeaders() })
      .then(r => r.json())
      .then(d => {
        setInsights(d.insights || "");
        setCtx(d.context || null);
        setInsightCards(d.insightCards || []);
        setOverviewLoaded(true);
        setLoadingInsights(false);
      })
      .catch(() => { setLoadingInsights(false); setOverviewLoaded(true); });

    loadForecast();
    loadRecommendations();
    loadDeepAnalysis();
    loadInvoiceReminders();
    loadTaxEstimate();
  }, [getHeaders]);

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  function loadRecommendations() {
    if (recommendations.length > 0 || loadingRecs) return;
    setLoadingRecs(true);
    fetch("/api/ai/recommendations", { headers: getHeaders() })
      .then(async (r) => ({ ok: r.ok, data: await r.json() }))
      .then(({ ok, data }) => {
        setRecommendations(ok && Array.isArray(data.recommendations) ? data.recommendations : []);
        setLoadingRecs(false);
      })
      .catch(() => setLoadingRecs(false));
  }

  function loadDeepAnalysis() {
    if (loadingDeepAnalysis || (revenueAnalyzer && profitability && inventoryIntel && riskAnalyzer && latePayments)) return;
    setLoadingDeepAnalysis(true);
    Promise.all([
      fetch("/api/ai/revenue-analyzer", { headers: getHeaders() }).then(r => r.json()),
      fetch("/api/ai/profitability", { headers: getHeaders() }).then(r => r.json()),
      fetch("/api/ai/inventory-intelligence", { headers: getHeaders() }).then(r => r.json()),
      fetch("/api/ai/risk-detection", { headers: getHeaders() }).then(r => r.json()),
      fetch("/api/ai/late-payments", { headers: getHeaders() }).then(r => r.json()),
    ])
      .then(([revenueData, profitabilityData, inventoryData, riskData, latePaymentData]) => {
        setRevenueAnalyzer(revenueData);
        setProfitability(profitabilityData);
        setInventoryIntel(inventoryData);
        setRiskAnalyzer(riskData);
        setLatePayments(latePaymentData);
        setLoadingDeepAnalysis(false);
      })
      .catch(() => setLoadingDeepAnalysis(false));
  }

  function loadForecast() {
    if (forecast || loadingForecast) return;
    setLoadingForecast(true);
    fetch("/api/ai/forecast", { headers: getHeaders() })
      .then(async (r) => ({ ok: r.ok, data: await r.json() }))
      .then(({ ok, data }) => {
        setForecast(ok ? normalizeForecast(data) : null);
        setLoadingForecast(false);
      })
      .catch(() => setLoadingForecast(false));
  }

  function loadReport(period?: "weekly" | "monthly" | "quarterly") {
    if (report || loadingReport) return;
    const p = period || reportPeriod;
    setLoadingReport(true);
    fetch(`/api/ai/report?period=${p}`, { headers: getHeaders() })
      .then(async (r) => ({ ok: r.ok, data: await r.json() }))
      .then(({ ok, data }) => {
        setReport(ok ? normalizeReport(data) : null);
        setLoadingReport(false);
      })
      .catch(() => setLoadingReport(false));
  }

  function loadMarketIntel() {
    if (marketIntel || loadingMarket) return;
    setLoadingMarket(true);
    fetch("/api/ai/market-intelligence", { headers: getHeaders() })
      .then(r => r.json())
      .then(d => { setMarketIntel(normalizeMarketIntel(d)); setLoadingMarket(false); })
      .catch(() => setLoadingMarket(false));
  }

  function loadBusinessAdvisor() {
    if (businessAdvisor || loadingAdvisor) return;
    setLoadingAdvisor(true);
    fetch("/api/ai/business-advisor", { headers: getHeaders() })
      .then(r => r.json())
      .then(d => { setBusinessAdvisor(normalizeBusinessAdvisor(d)); setLoadingAdvisor(false); })
      .catch(() => setLoadingAdvisor(false));
  }

  function loadInvoiceReminders() {
    if (invoiceReminders || loadingReminders) return;
    setLoadingReminders(true);
    fetch("/api/ai/invoice-reminders", { headers: getHeaders() })
      .then(r => r.json())
      .then(d => { setInvoiceReminders(d); setLoadingReminders(false); })
      .catch(() => setLoadingReminders(false));
  }

  function loadTaxEstimate() {
    if (taxEstimate || loadingTaxEstimate) return;
    setLoadingTaxEstimate(true);
    fetch("/api/ai/tax-estimate", { headers: getHeaders() })
      .then(r => r.json())
      .then(d => { setTaxEstimate(d); setLoadingTaxEstimate(false); })
      .catch(() => setLoadingTaxEstimate(false));
  }

  async function sendInvoiceReminder(reminder: InvoiceReminderResponse["reminders"][number]) {
    setSendingReminderRef(reminder.invoiceRef);
    try {
      const res = await fetch("/api/ai/invoice-reminders/send", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(reminder),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to send reminder");
      toast.success(data?.message || "Reminder sent.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send reminder.");
    } finally {
      setSendingReminderRef(null);
    }
  }

  function loadReconciliation() {
    if (reconciliation || loadingReconciliation) return;
    setLoadingReconciliation(true);
    fetch("/api/ai/reconciliation", { headers: getHeaders() })
      .then(async (r) => ({ ok: r.ok, data: await r.json() }))
      .then(({ ok, data }) => {
        if (ok && Array.isArray(data.suggestions)) {
          const TYPE_MAP: Record<string, ReconciliationMatchCandidate["type"]> = {
            payment_receipt: "payment", sales_invoice: "invoice",
            purchase_invoice: "expense", expense_voucher: "expense",
          };
          const items: ReconciliationItem[] = data.suggestions.map((s: any) => ({
            id: s.statementId,
            ledgerRef: s.statementNo,
            date: s.date?.slice(0, 10) ?? "",
            description: s.description ?? "",
            amount: Math.abs(Number(s.amount || 0)),
            direction: Number(s.amount || 0) >= 0 ? "credit" : "debit",
            status: s.risk === "low" ? "auto_matched"
              : s.candidates?.length === 0 ? "unmatched"
              : "pending",
            selectedMatchId: s.risk === "low" && s.candidates?.[0] ? s.candidates[0].id : undefined,
            isDuplicate: s.isDuplicate ?? false,
            matches: (s.candidates ?? []).map((c: any) => ({
              id: c.id,
              type: TYPE_MAP[c.type] ?? "journal",
              ref: c.label ?? c.reference ?? c.id,
              party: c.party ?? "",
              amount: Number(c.amount || 0),
              date: c.date?.slice(0, 10) ?? "",
              confidence: Number(c.confidence || 0),
            })),
          }));
          const autoMatched = items.filter(i => i.status === "auto_matched").length;
          const unmatched = items.filter(i => i.status === "unmatched").length;
          const pending = items.filter(i => i.status === "pending").length;
          setReconciliation({
            summary: { total: items.length, autoMatched, manuallyMatched: 0, pending, unmatched },
            items,
          });
        } else {
          // Demo data when API not ready
          setReconciliation({
            summary: { total: 24, autoMatched: 14, manuallyMatched: 3, pending: 5, unmatched: 2 },
            items: [
              { id: "1", ledgerRef: "BNK-001", date: "2026-06-08", description: "NEFT Credit 48392", amount: 125000, direction: "credit", status: "pending", matches: [
                { id: "m1", type: "invoice", ref: "INV-2024", party: "Sunrise Trading", amount: 125000, date: "2026-06-07", confidence: 96 },
                { id: "m2", type: "payment", ref: "PMT-081", party: "Sunrise Trading Co.", amount: 125000, date: "2026-06-08", confidence: 78 },
              ]},
              { id: "2", ledgerRef: "BNK-002", date: "2026-06-07", description: "CHQ Debit 00142", amount: 48500, direction: "debit", status: "pending", matches: [
                { id: "m3", type: "expense", ref: "EXP-331", party: "Office Supplies Ltd", amount: 48500, date: "2026-06-06", confidence: 91 },
              ]},
              { id: "3", ledgerRef: "BNK-003", date: "2026-06-06", description: "RTGS Credit 77221", amount: 380000, direction: "credit", status: "auto_matched", selectedMatchId: "m4", matches: [
                { id: "m4", type: "invoice", ref: "INV-2019", party: "Al-Hafeez Distributors", amount: 380000, date: "2026-06-05", confidence: 99 },
              ]},
              { id: "4", ledgerRef: "BNK-004", date: "2026-06-05", description: "Online Transfer Debit", amount: 15200, direction: "debit", status: "unmatched", matches: [] },
              { id: "5", ledgerRef: "BNK-005", date: "2026-06-04", description: "IBFT Credit 29911", amount: 67000, direction: "credit", status: "auto_matched", selectedMatchId: "m5", matches: [
                { id: "m5", type: "invoice", ref: "INV-2011", party: "City Retail Group", amount: 67000, date: "2026-06-03", confidence: 97 },
              ]},
              { id: "6", ledgerRef: "BNK-006", date: "2026-06-03", description: "Utility Bill Payment", amount: 22400, direction: "debit", status: "manually_matched", selectedMatchId: "m6", matches: [
                { id: "m6", type: "expense", ref: "EXP-318", party: "KESC / K-Electric", amount: 22400, date: "2026-06-02", confidence: 88 },
                { id: "m7", type: "journal", ref: "JV-041", party: "Utilities", amount: 22400, date: "2026-06-03", confidence: 61 },
              ]},
              { id: "7", ledgerRef: "BNK-007", date: "2026-06-02", description: "Salary Transfer Batch", amount: 445000, direction: "debit", status: "pending", matches: [
                { id: "m8", type: "expense", ref: "PAY-Jun-01", party: "Payroll June 2026", amount: 445000, date: "2026-06-01", confidence: 94 },
              ]},
            ],
          });
        }
        setLoadingReconciliation(false);
      })
      .catch(() => setLoadingReconciliation(false));
  }

  function handleTab(t: Tab) {
    setTab(t);
    if (t === "forecast") loadForecast();
    if (t === "report") loadReport();
    if (t === "recommendations") loadRecommendations();
    if (t === "insights" || t === "overview") loadDeepAnalysis();
    if (t === "reminders") loadInvoiceReminders();
    if (t === "tax") loadTaxEstimate();
    if (t === "market") loadMarketIntel();
    if (t === "advisor") loadBusinessAdvisor();
    if (t === "reconciliation") loadReconciliation();
    if (t === "report") { /* period-aware, loadReport handles it */ }
    if (t === "scan") { setScanResult(null); setScanError(null); setScanFile(null); setScanPreview(null); }
    if (t === "invoice-gen") { setInvoiceDraft(null); setInvoiceGenError(null); setInvoiceGenPrompt(""); }
    if (t === "inv-forecast" && !invForecast) loadInvForecast();
    if (t === "cashflow-opt" && !cashflowOpt) loadCashflowOpt();
    if (t === "churn" && !churnResult) loadChurn();
    if (t === "supplier-intel" && !supplierIntel) loadSupplierIntel();
    if (t === "gl-suggest") { setGlResult(null); setGlDesc(""); setGlVendor(""); }
  }

  async function loadInvForecast() {
    if (invForecastLoading) return;
    setInvForecastLoading(true);
    try {
      const res = await fetch("/api/ai/inventory-forecast", { headers: getHeaders() });
      const data = await res.json() as InvForecastResult;
      setInvForecast(data);
    } catch { /* silent */ } finally { setInvForecastLoading(false); }
  }

  async function loadCashflowOpt() {
    if (cashflowOptLoading) return;
    setCashflowOptLoading(true);
    try {
      const res = await fetch("/api/ai/cashflow-optimize", { headers: getHeaders() });
      const data = await res.json() as CashflowOptResult;
      setCashflowOpt(data);
    } catch { /* silent */ } finally { setCashflowOptLoading(false); }
  }

  async function loadChurn() {
    if (churnLoading) return;
    setChurnLoading(true);
    try {
      const res = await fetch("/api/ai/churn-prediction", { headers: getHeaders() });
      const data = await res.json() as ChurnResult;
      setChurnResult(data);
    } catch { /* silent */ } finally { setChurnLoading(false); }
  }

  async function loadSupplierIntel() {
    if (supplierIntelLoading) return;
    setSupplierIntelLoading(true);
    try {
      const res = await fetch("/api/ai/supplier-intel", { headers: getHeaders() });
      const data = await res.json() as SupplierIntelResult;
      setSupplierIntel(data);
    } catch { /* silent */ } finally { setSupplierIntelLoading(false); }
  }

  async function handleGLSuggest() {
    if (!glDesc.trim()) return;
    setGlLoading(true);
    setGlResult(null);
    try {
      const res = await fetch("/api/ai/gl-suggest", { method: "POST", headers: getHeaders(), body: JSON.stringify({ description: glDesc, vendor: glVendor }) });
      const data = await res.json() as GLSuggestResult;
      setGlResult(data);
    } catch { /* silent */ } finally { setGlLoading(false); }
  }

  // ── Generic streaming AI helper for the 5 new features ─────────────────
  async function runAIAnalysis(prompt: string, setResult: (s: string) => void, setLoading: (b: boolean) => void) {
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { ...getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, history: [] }),
      });
      if (!res.ok || !res.body) throw new Error("api");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += dec.decode(value, { stream: true });
        setResult(text);
      }
    } catch { setResult("⚠️ Analysis failed. Please try again."); }
    finally { setLoading(false); }
  }

  function handleExpenseCat() {
    const data = ctx ? `Revenue: ${ctx.revenue.thisMonth}, Expenses: ${ctx.expenses.thisMonth}, Top expenses: ${ctx.topExpenses.map(e => `${e.category} (${e.amount})`).join(", ")}, Currency: ${ctx.company.currency}` : "No data loaded";
    runAIAnalysis(
      `You are a financial analyst. Using this business data: ${data}. Perform a detailed EXPENSE CATEGORIZATION analysis:\n1. Group all expenses into categories: Operations, HR/Salaries, Marketing, IT/Technology, Finance Charges, Logistics, Miscellaneous\n2. Show estimated percentage breakdown for each category\n3. Calculate monthly vs annual impact\n4. Identify top 3 categories to optimize\n5. Give concrete cost-cutting recommendations with expected savings\n6. Flag any unusually high spending areas\nUse clear headings and bullet points. Be specific with numbers.`,
      setExpenseCat, setExpenseCatLoading
    );
  }

  function handleBudgetAnalysis() {
    const data = ctx ? `Revenue this month: ${ctx.revenue.thisMonth}, Last month: ${ctx.revenue.lastMonth}, This year: ${ctx.revenue.thisYear}, Expenses: ${ctx.expenses.thisMonth}, Last month expenses: ${ctx.expenses.lastMonth}, Profit: ${ctx.profit.thisMonth}, Currency: ${ctx.company.currency}` : "No data";
    runAIAnalysis(
      `You are a CFO-level financial advisor. Using this data: ${data}. Create a BUDGETING & VARIANCE ANALYSIS:\n1. Suggest realistic monthly budget targets for Revenue, COGS, Operating Expenses, Net Profit\n2. Show variance between actual vs suggested budget (% over/under)\n3. Identify months where performance was above/below budget\n4. Create a quarterly budget roadmap\n5. Give 5 specific actions to stay within budget\n6. Forecast next month budget based on trend\nUse tables where helpful. Be precise with numbers and percentages.`,
      setBudgetAnalysis, setBudgetLoading
    );
  }

  function handleDuplicateDetection() {
    const data = ctx ? `Recent invoices: ${ctx.recentInvoices.map(i => `${i.ref} - ${i.customer} - ${i.amount}`).join("; ")}, Top customers: ${ctx.topCustomers.map(c => `${c.name}: ${c.amount}`).join(", ")}, Currency: ${ctx.company.currency}` : "No data";
    runAIAnalysis(
      `You are a fraud detection and audit expert. Using this business data: ${data}. Perform DUPLICATE & ANOMALY DETECTION analysis:\n1. Identify any potentially duplicate invoice patterns or suspicious repetitions\n2. Flag transactions that appear anomalous (unusual amounts, timing, or frequency)\n3. Check for round-number transactions that may indicate estimation rather than actual billing\n4. Identify customers with irregular payment patterns\n5. List specific invoice references that need manual review\n6. Recommend internal controls to prevent duplicate payments\n7. Give a risk score (Low/Medium/High) for current transaction integrity\nBe specific about what to investigate and why.`,
      setDuplicateResult, setDuplicateLoading
    );
  }

  function handleCustomerProfit() {
    const data = ctx ? `Top customers: ${ctx.topCustomers.map(c => `${c.name}: ${c.amount}`).join(", ")}, Payment history: ${ctx.customerPaymentHistory.map(c => `${c.name} avg ${c.avgDaysToPay} days to pay, ${c.overdueCount} overdue`).join("; ")}, Total revenue: ${ctx.revenue.thisYear}, Currency: ${ctx.company.currency}` : "No data";
    runAIAnalysis(
      `You are a customer analytics expert. Using this data: ${data}. Perform a CUSTOMER PROFITABILITY ANALYSIS:\n1. Rank customers by revenue contribution with percentage of total\n2. Estimate profitability per customer (factoring in payment delays as cost)\n3. Identify "platinum", "gold", "silver", "at-risk" customer segments\n4. Calculate customer lifetime value (CLV) estimates\n5. Flag customers costing more to serve (slow payers, frequent returns)\n6. Recommend which customers to prioritize, nurture, or review pricing for\n7. Suggest upsell/cross-sell opportunities for top customers\nProvide actionable insights with specific customer names and numbers.`,
      setCustomerProfit, setCustomerProfitLoading
    );
  }

  function handleRatioAnalysis() {
    const data = ctx ? `Revenue: ${ctx.revenue.thisMonth}, Expenses: ${ctx.expenses.thisMonth}, Profit: ${ctx.profit.thisMonth}, Receivables: ${ctx.receivables.total}, Payables: ${ctx.payables.total}, Cash: ${ctx.cashPosition}, Stock value: ${ctx.inventory.stockValue}, Currency: ${ctx.company.currency}` : "No data";
    runAIAnalysis(
      `You are a financial analyst specializing in ratio analysis. Using this data: ${data}. Calculate and interpret KEY FINANCIAL RATIOS:\n\n1. PROFITABILITY RATIOS:\n   - Gross Profit Margin, Net Profit Margin, Operating Margin\n\n2. LIQUIDITY RATIOS:\n   - Current Ratio, Quick Ratio, Cash Ratio\n\n3. EFFICIENCY RATIOS:\n   - Receivables Turnover, Days Sales Outstanding (DSO)\n   - Payables Turnover, Days Payable Outstanding (DPO)\n\n4. LEVERAGE/RISK RATIOS:\n   - Debt-to-Equity, Interest Coverage\n\n5. WORKING CAPITAL RATIOS:\n   - Working Capital, Working Capital Ratio\n\nFor each ratio: show the formula, calculated value, industry benchmark, and interpretation (Good/Warning/Critical). Give a final FINANCIAL HEALTH VERDICT with top 3 areas for improvement.`,
      setRatiosResult, setRatiosLoading
    );
  }

  async function handleScanReceipt() {
    if (!scanFile) return;
    setScanLoading(true);
    setScanError(null);
    setScanResult(null);
    try {
      const user = getCurrentUser();
      const authHeaders: Record<string, string> = {};
      if (user?.companyId) authHeaders["x-company-id"] = user.companyId;
      if (user?.id)        authHeaders["x-user-id"]    = user.id;
      if (user?.role)      authHeaders["x-user-role"]  = user.role;
      const fd = new FormData();
      fd.append("image", scanFile);
      const res = await fetch("/api/ai/scan-receipt", { method: "POST", headers: authHeaders, body: fd });
      const data = await res.json() as { extracted?: ScanResult; error?: string };
      if (!res.ok || data.error) throw new Error(data.error || "Scan failed");
      setScanResult(data.extracted || null);
    } catch (e: unknown) {
      setScanError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setScanLoading(false);
    }
  }

  async function handleInvoiceGen() {
    if (!invoiceGenPrompt.trim()) return;
    setInvoiceGenLoading(true);
    setInvoiceGenError(null);
    setInvoiceDraft(null);
    try {
      const res = await fetch("/api/ai/invoice-gen", {
        method: "POST",
        headers: { ...getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: invoiceGenPrompt }),
      });
      const data = await res.json() as { draft?: InvoiceDraft; error?: string };
      if (!res.ok || data.error) throw new Error(data.error || "Generation failed");
      setInvoiceDraft(data.draft || null);
    } catch (e: unknown) {
      setInvoiceGenError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setInvoiceGenLoading(false);
    }
  }

  // ── Chat send with streaming ───────────────────────────────────────────────
  async function sendChat(text?: string) {
    const msg = (text ?? chatInput).trim();
    if (!msg || chatLoading) return;
    setChatInput("");

    const newMsg: ChatMsg = { role: "user", content: msg, ts: Date.now() };
    const updatedHistory = [...messages, newMsg];
    setMessages(updatedHistory);
    setChatLoading(true);
    setStreaming(true);

    // Add empty assistant message to stream into
    const botMsg: ChatMsg = { role: "assistant", content: "", ts: Date.now() };
    setMessages([...updatedHistory, botMsg]);

    try {
      const history = messages
        .slice(-10)
        .filter(m => m.role === "assistant" || m.role === "user")
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ message: msg, history }),
      });

      if (!res.ok) throw new Error("API error");
      if (!res.body) throw new Error("No stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { ...copy[copy.length - 1], content: accumulated };
          return copy;
        });
      }
    } catch {
      setMessages(prev => {
        const copy = [...prev];
        copy[copy.length - 1] = { ...copy[copy.length - 1], content: "⚠️ Connection error. Please try again." };
        return copy;
      });
    } finally {
      setChatLoading(false);
      setStreaming(false);
      setTimeout(() => chatInputRef.current?.focus(), 50);
    }
  }

  // ── Markdown renderer ──────────────────────────────────────────────────────
  function renderMarkdown(text: string) {
    // Normalize: split ### into own lines so they always render as headings
    const normalized = text
      .replace(/\r\n/g, "\n")
      .replace(/#{1,4}\s*/g, (m) => "\n" + m)   // ensure headings start on new line
      .replace(/\n{3,}/g, "\n\n");               // collapse 3+ blank lines to 2

    const lines = normalized.split("\n");

    return lines.map((rawLine, i) => {
      const line = rawLine.trimStart();
      if (!line) return <div key={i} style={{ height: 6 }} />;

      // Headings — match with or without space (###Title or ### Title)
      const h4m = line.match(/^#{4}\s*(.*)/);  if (h4m) return <div key={i} style={{ fontSize: 13, fontWeight: 700, color: "#e0e7ff", margin: "10px 0 2px", letterSpacing: ".01em" }}>{h4m[1]}</div>;
      const h3m = line.match(/^#{3}\s*(.*)/);  if (h3m) return <div key={i} style={{ fontSize: 13.5, fontWeight: 700, color: "#c7d2fe", margin: "12px 0 4px", borderLeft: "3px solid #6366f1", paddingLeft: 8 }}>{h3m[1]}</div>;
      const h2m = line.match(/^#{2}\s*(.*)/);  if (h2m) return <div key={i} style={{ fontSize: 15, fontWeight: 700, color: "#a5b4fc", margin: "14px 0 6px" }}>{h2m[1]}</div>;
      const h1m = line.match(/^#{1}\s+(.*)/);  if (h1m) return <div key={i} style={{ fontSize: 17, fontWeight: 800, color: "white", margin: "16px 0 8px", borderBottom: "1px solid rgba(255,255,255,.12)", paddingBottom: 6 }}>{h1m[1]}</div>;

      // Numbered list  1. text
      const numm = line.match(/^(\d+)\.\s+(.*)/);
      if (numm) {
        const inner = numm[2].replace(/\*\*(.*?)\*\*/g, "<strong style=\"color:white\">$1</strong>");
        return (
          <div key={i} style={{ display: "flex", gap: 10, padding: "3px 0", alignItems: "flex-start" }}>
            <span style={{ minWidth: 22, height: 22, borderRadius: "50%", background: "rgba(99,102,241,.35)", color: "#c7d2fe", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{numm[1]}</span>
            <span dir="auto" style={{ color: "rgba(255,255,255,.9)", fontSize: 13.5, lineHeight: 1.75 }} dangerouslySetInnerHTML={{ __html: inner }} />
          </div>
        );
      }

      // Bullet  • - *
      if (line.startsWith("• ") || line.startsWith("- ") || line.startsWith("* ")) {
        const inner = line.slice(2).replace(/\*\*(.*?)\*\*/g, "<strong style=\"color:white\">$1</strong>");
        return (
          <div key={i} style={{ display: "flex", gap: 8, padding: "2px 0", alignItems: "flex-start", paddingLeft: 4 }}>
            <span style={{ color: "#818cf8", fontSize: 14, flexShrink: 0, marginTop: 1 }}>•</span>
            <span dir="auto" style={{ color: "rgba(255,255,255,.88)", fontSize: 13.5, lineHeight: 1.75 }} dangerouslySetInnerHTML={{ __html: inner }} />
          </div>
        );
      }

      // Whole-line bold **text**
      if (line.startsWith("**") && line.endsWith("**") && line.length > 4)
        return <div key={i} style={{ fontWeight: 700, color: "white", fontSize: 14, margin: "6px 0 2px" }}>{line.slice(2, -2)}</div>;

      // Normal paragraph — inline bold + RTL support
      const html = line.replace(/\*\*(.*?)\*\*/g, "<strong style=\"color:white;font-weight:700\">$1</strong>");
      return <div key={i} dir="auto" style={{ color: "rgba(255,255,255,.85)", fontSize: 13.5, lineHeight: 1.8, margin: "1px 0" }} dangerouslySetInnerHTML={{ __html: html }} />;
    });
  }

  // ── Loading screen ─────────────────────────────────────────────────────────
  const score = ctx ? healthScore(ctx) : 0;
  const risk = riskLevel(score);
  const currency = ctx?.company.currency || "PKR";
  const companyInitial = ctx?.company.name?.trim()?.charAt(0)?.toUpperCase() || "U";
  const aiProviderLabel = "FinovaOS AI v1.0";

  const QUICK_QUESTIONS = [
    "What is my profit this month?",
    "Which customers owe me money?",
    "Why are expenses high this month?",
    "Show me my top 5 expenses",
    "How can I improve my cash flow?",
    "Which products are selling the most?",
    "Predict my revenue next month",
    "Give me a cost reduction plan",
    "Which invoices need reminders now?",
    "Estimate my tax position this month",
  ];

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "overview",         label: "Overview",                                              icon: "⚡" },
    { id: "chat",             label: "Ask AI",                                                icon: "💬" },
    { id: "insights",         label: "Insights",                                              icon: "🧠" },
    { id: "alerts",           label: `Alerts${alerts.length > 0 ? ` (${alerts.length})` : ""}`, icon: "🔔" },
    { id: "forecast",         label: "Forecast",                                              icon: "📈" },
    { id: "recommendations",  label: "Recommendations",                                       icon: "🎯" },
    { id: "reminders",        label: "Invoice Reminders",                                     icon: "🔔" },
    { id: "tax",              label: "Tax Estimate",                                          icon: "🧾" },
    { id: "report",           label: "Monthly Report",                                        icon: "📄" },
    { id: "market",           label: "Market Intel",                                          icon: "🌐" },
    { id: "advisor",          label: "Advisor",                                               icon: "🧭" },
    { id: "reconciliation",   label: "Reconciliation",                                        icon: "🔗" },
    { id: "scan",             label: "Scan Receipt",                                          icon: "📷" },
    { id: "invoice-gen",      label: "Quick Invoice",                                         icon: "✍️" },
    { id: "inv-forecast",     label: "Stock Forecast",                                        icon: "📦" },
    { id: "cashflow-opt",     label: "Cash Optimizer",                                        icon: "💵" },
    { id: "churn",            label: "Churn Prediction",                                      icon: "👥" },
    { id: "supplier-intel",   label: "Supplier Intel",                                        icon: "🤝" },
    { id: "gl-suggest",       label: "GL Auto-Code",                                          icon: "🏷️" },
    { id: "expense-cat",      label: "Expense Categories",                                    icon: "📂" },
    { id: "budget",           label: "Budget & Variance",                                     icon: "📊" },
    { id: "duplicate",        label: "Duplicate Detection",                                   icon: "🔍" },
    { id: "customer-profit",  label: "Customer Profitability",                                icon: "👤" },
    { id: "ratios",           label: "Financial Ratios",                                      icon: "⚖️" },
  ];

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "white", display: "flex", height: "calc(100vh - 56px)", overflow: "hidden" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes aiPing { 0%{transform:scale(1);opacity:.9} 70%{transform:scale(1.6);opacity:0} 100%{transform:scale(1.6);opacity:0} }
        .ai-nav-item { display:flex; align-items:center; gap:10px; width:100%; padding:9px 12px; border-radius:11px; font-family:inherit; background:none; border:1px solid transparent; cursor:pointer; color:rgba(255,255,255,.42); font-size:12.5px; font-weight:500; transition:all .18s; text-align:left; margin-bottom:1px; white-space:nowrap; }
        .ai-nav-item.active { background:rgba(99,102,241,.16); color:#c7d2fe; border-color:rgba(99,102,241,.28); font-weight:700; }
        .ai-nav-item:hover:not(.active) { background:rgba(255,255,255,.06); color:rgba(255,255,255,.8); }
        .kpi-card { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:16px; padding:20px 22px; transition:all .2s; }
        .kpi-card:hover { border-color:rgba(99,102,241,.3); background:rgba(99,102,241,.06); }
        .q-pill { background:rgba(99,102,241,.1); border:1px solid rgba(99,102,241,.22); color:#c7d2fe; border-radius:999px; padding:8px 14px; font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; transition:all .2s; text-align:left; }
        .q-pill:hover { background:rgba(99,102,241,.18); color:#ffffff; border-color:rgba(99,102,241,.36); transform:translateY(-1px); }
        .cursor-blink { display:inline-block; width:3px; height:15px; background:linear-gradient(to bottom,#818cf8,#6366f1); animation:pulse .7s ease infinite; margin-left:3px; vertical-align:middle; border-radius:2px; box-shadow:0 0 8px rgba(99,102,241,.7); }
        .insight-block h1,h2,h3 { color:inherit }
        .ctx-quick-btn { display:block; width:100%; padding:8px 12px; border-radius:9px; background:none; border:1px solid rgba(255,255,255,.07); color:rgba(255,255,255,.55); font-size:11.5px; font-weight:500; cursor:pointer; font-family:inherit; text-align:left; margin-bottom:5px; transition:all .15s; }
        .ctx-quick-btn:hover { background:rgba(99,102,241,.12); border-color:rgba(99,102,241,.3); color:white; }
      `}</style>

      {/* ══ LEFT SIDEBAR ═══════════════════════════════════════════════════ */}
      <div style={{ width: 216, background: "rgba(255,255,255,.022)", borderRight: "1px solid rgba(255,255,255,.07)", display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden" }}>

        {/* Brand header */}
        <div style={{ padding: "18px 14px 14px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(99,102,241,.45)", fontSize: 18, flexShrink: 0 }}>🧠</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-.2px", lineHeight: 1.2 }}>FinovaOS AI</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", marginTop: 1 }}>{ctx?.company.name || "Loading..."}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, fontWeight: 700, color: "#6ee7b7", background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.18)", borderRadius: 999, padding: "4px 10px", width: "fit-content" }}>
            <span style={{ position: "relative", width: 7, height: 7, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ position: "absolute", width: "100%", height: "100%", borderRadius: "50%", background: "#10b981", animation: "aiPing 1.6s ease infinite" }} />
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
            </span>
            Live · Connected
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
          {TABS.map(t => (
            <button key={t.id} className={`ai-nav-item ${tab === t.id ? "active" : ""}`} onClick={() => handleTab(t.id)}>
              <span style={{ fontSize: 15, flexShrink: 0, width: 20, textAlign: "center" }}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        {/* Bottom: mini health score */}
        {ctx && (
          <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,.06)", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: `conic-gradient(${risk.color} ${score}%, rgba(255,255,255,.08) 0%)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#0b0d1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: risk.color }}>{score}</div>
            </div>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: risk.color }}>{risk.label} Risk</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)" }}>{score}/100 health</div>
            </div>
          </div>
        )}
      </div>

      {/* ══ RIGHT: MAIN CONTENT ═════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Top strip (non-chat tabs) */}
        {tab !== "chat" && (
          <div style={{ padding: "16px 24px 12px", borderBottom: "1px solid rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>{TABS.find(t => t.id === tab)?.icon}</span>
              <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>{TABS.find(t => t.id === tab)?.label}</h1>
            </div>
            <button onClick={() => handleTab("report")} style={{ padding: "7px 16px", borderRadius: 9, background: "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, boxShadow: "0 4px 12px rgba(99,102,241,.3)" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
              Monthly Report
            </button>
          </div>
        )}

        {/* ── Scrollable content area ── */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
          <div style={{ flex: 1, overflowY: tab === "chat" ? "hidden" : "auto", padding: tab === "chat" ? 0 : "24px 24px 60px" }}>

        {/* ══ OVERVIEW ════════════════════════════════════════════════════ */}
        {tab === "overview" && (
          <div style={{ animation: "fadeUp .4s ease both" }}>
            {!overviewLoaded ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 320, gap: 16, color: "rgba(255,255,255,.4)" }}>
                <Spinner size={32} />
                <div style={{ fontSize: 14 }}>AI is analyzing your financial data…</div>
              </div>
            ) : (
              <>
                {/* KPI Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
                  {/* Health Score */}
                  <div className="kpi-card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <HealthRing score={score} />
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>Financial Health</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: score >= 75 ? "#10b981" : score >= 55 ? "#f59e0b" : "#ef4444" }}>{score}/100</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>Risk: <span style={{ color: risk.color, fontWeight: 700 }}>{risk.label}</span></div>
                    </div>
                  </div>

                  {/* Revenue */}
                  <div className="kpi-card">
                    <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Revenue This Month</div>
                    <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>{fmt(ctx?.revenue.thisMonth || 0, currency)}</div>
                    <div style={{ fontSize: 12, color: (ctx?.revenue.change || 0) >= 0 ? "#10b981" : "#ef4444", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                      {(ctx?.revenue.change || 0) >= 0 ? "▲" : "▼"} {pct(ctx?.revenue.change || 0)} vs last month
                    </div>
                  </div>

                  {/* Expenses */}
                  <div className="kpi-card">
                    <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Expenses This Month</div>
                    <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>{fmt(ctx?.expenses.thisMonth || 0, currency)}</div>
                    <div style={{ fontSize: 12, color: (ctx?.expenses.change || 0) <= 0 ? "#10b981" : "#f59e0b", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                      {(ctx?.expenses.change || 0) >= 0 ? "▲" : "▼"} {pct(ctx?.expenses.change || 0)} vs last month
                    </div>
                  </div>

                  {/* Profit */}
                  <div className="kpi-card">
                    <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Net Profit</div>
                    <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 4, color: (ctx?.profit.thisMonth || 0) >= 0 ? "white" : "#ef4444" }}>{fmt(ctx?.profit.thisMonth || 0, currency)}</div>
                    <div style={{ fontSize: 12, color: (ctx?.profit.change || 0) >= 0 ? "#10b981" : "#ef4444", fontWeight: 600 }}>
                      {(ctx?.profit.change || 0) >= 0 ? "▲" : "▼"} {pct(ctx?.profit.change || 0)} vs last month
                    </div>
                  </div>

                  {/* Receivables */}
                  <div className="kpi-card">
                    <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Outstanding Receivables</div>
                    <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>{fmt(ctx?.receivables.total || 0, currency)}</div>
                    {(ctx?.receivables.overdue || 0) > 0 && (
                      <div style={{ fontSize: 12, color: "#ef4444", fontWeight: 600 }}>
                        ⚠ {fmt(ctx?.receivables.overdue || 0, currency)} overdue
                      </div>
                    )}
                  </div>

                  {/* Stock Value */}
                  <div className="kpi-card">
                    <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Stock Value (Inventory)</div>
                    <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 4, color: (ctx?.inventory.stockValue || 0) > 0 ? "#34d399" : "rgba(255,255,255,.6)" }}>
                      {fmt(ctx?.inventory.stockValue || 0, currency)}
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>
                      {ctx?.inventory.totalItems || 0} items · {ctx?.inventory.lowStockItems || 0} low stock
                    </div>
                  </div>
                </div>

                {/* Category Health Scores */}
                {ctx && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 12 }}>Business Health by Category</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 10 }}>
                      {categoryHealthScores(ctx).map(cat => (
                        <div key={cat.label} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
                          <div style={{ fontSize: 16, marginBottom: 6 }}>{cat.icon}</div>
                          <div style={{
                            width: 40, height: 40, borderRadius: "50%",
                            background: `conic-gradient(${cat.color} ${cat.score}%, rgba(255,255,255,.06) 0%)`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            margin: "0 auto 8px",
                          }}>
                            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#0b0d1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900, color: cat.color }}>{cat.score}</div>
                          </div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.45)", lineHeight: 1.3 }}>{cat.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI insights + forecast */}
                <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 16, marginBottom: 20 }}>
                  <Panel>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.6)" }}>🧠 AI Insights Box</div>
                      <button
                        onClick={() => handleTab("insights")}
                        style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(99,102,241,.25)", background: "rgba(99,102,241,.12)", color: "#a5b4fc", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                      >
                        Open Insights
                      </button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 14 }}>
                      {insightCards.slice(0, 6).map((card) => {
                        const tone = severityTone(card.severity);
                        return (
                          <div
                            key={card.id}
                            style={{ padding: "14px 14px 12px", borderRadius: 14, background: tone.bg, border: `1px solid ${tone.border}` }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                              <span style={{ fontSize: 16 }}>{card.icon}</span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: tone.color, textTransform: "uppercase", letterSpacing: ".06em" }}>{card.label}</span>
                            </div>
                            <div style={{ fontSize: 18, fontWeight: 900, color: "white", marginBottom: 5 }}>{card.value}</div>
                            <div style={{ fontSize: 12, color: "rgba(255,255,255,.65)", lineHeight: 1.55 }}>{card.note}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: "grid", gap: 7 }}>
                      {(insights || "").split("\n").filter(Boolean).slice(0, 4).map((line, index) => (
                        <div key={index} style={{ display: "flex", gap: 8, alignItems: "flex-start", color: "rgba(255,255,255,.72)", fontSize: 12.5, lineHeight: 1.6 }}>
                          <span style={{ color: "#6366f1" }}>•</span>
                          <span>{line.replace(/^[-•]\s*/, "")}</span>
                        </div>
                      ))}
                    </div>
                  </Panel>

                  <Panel>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.6)" }}>📈 Cashflow Forecast</div>
                      <button
                        onClick={() => handleTab("forecast")}
                        style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(99,102,241,.25)", background: "rgba(99,102,241,.12)", color: "#a5b4fc", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                      >
                        Open Forecast
                      </button>
                    </div>
                    {forecast ? (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginBottom: 16 }}>
                          {[
                            { label: "30 Days", value: forecast.projections.closingCash30d },
                            { label: "60 Days", value: forecast.projections.closingCash60d },
                            { label: "90 Days", value: forecast.projections.closingCash90d },
                          ].map((point) => (
                            <div key={point.label} style={{ padding: "14px 12px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)" }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{point.label}</div>
                              <div style={{ fontSize: 16, fontWeight: 900, color: point.value >= 0 ? "#10b981" : "#ef4444" }}>{fmt(point.value, currency)}</div>
                            </div>
                          ))}
                        </div>
                        <ResponsiveContainer width="100%" height={180}>
                          <BarChart data={forecast.chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" />
                            <XAxis dataKey="period" tick={{ fill: "rgba(255,255,255,.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: "rgba(255,255,255,.4)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}K` : String(v)} />
                            <Tooltip contentStyle={{ background: "#1a1d3a", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, color: "white", fontSize: 12 }} formatter={(v: unknown) => [fmt(Number(v), currency)]} />
                            <Legend wrapperStyle={{ color: "rgba(255,255,255,.5)", fontSize: 12 }} />
                            <Bar dataKey="closingCash" name="Closing Cash" fill="#6366f1" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </>
                    ) : (
                      <div style={{ minHeight: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.35)" }}>
                        <Spinner size={24} />
                      </div>
                    )}
                  </Panel>
                </div>

                {/* Alerts strip */}
                {alerts.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Active Alerts</div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {alerts.slice(0, 3).map((a, i) => (
                        <div key={i} onClick={() => handleTab("alerts")} style={{
                          display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
                          borderRadius: 10, cursor: "pointer",
                          background: a.severity === "critical" ? "rgba(239,68,68,.1)" : a.severity === "warning" ? "rgba(245,158,11,.1)" : "rgba(99,102,241,.1)",
                          border: `1px solid ${a.severity === "critical" ? "rgba(239,68,68,.3)" : a.severity === "warning" ? "rgba(245,158,11,.3)" : "rgba(99,102,241,.3)"}`,
                        }}>
                          <AlertIcon severity={a.severity} />
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{a.title}</span>
                        </div>
                      ))}
                      {alerts.length > 3 && (
                        <div onClick={() => handleTab("alerts")} style={{ display: "flex", alignItems: "center", padding: "8px 14px", borderRadius: 10, cursor: "pointer", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", fontSize: 12, color: "rgba(255,255,255,.5)" }}>
                          +{alerts.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2-col: Top Customers + Top Expenses */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                  <Panel>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: "rgba(255,255,255,.6)" }}>🏆 Top Customers (This Year)</div>
                    {(ctx?.topCustomers || []).length === 0 ? (
                      <div style={{ color: "rgba(255,255,255,.25)", fontSize: 13 }}>No customer data yet</div>
                    ) : ctx?.topCustomers.map((c, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 26, height: 26, borderRadius: "50%", background: `hsl(${i * 60 + 220},70%,55%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>{i + 1}</div>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#a5b4fc" }}>{fmt(c.amount, currency)}</span>
                      </div>
                    ))}
                  </Panel>

                  <Panel>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: "rgba(255,255,255,.6)" }}>💸 Top Expenses (This Month)</div>
                    {(ctx?.topExpenses || []).length === 0 ? (
                      <div style={{ color: "rgba(255,255,255,.25)", fontSize: 13 }}>No expense data this month</div>
                    ) : ctx?.topExpenses.map((e, i) => (
                      <div key={i} style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{e.category}</span>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>{fmt(e.amount, currency)}</span>
                        </div>
                        <div style={{ height: 4, background: "rgba(255,255,255,.08)", borderRadius: 4 }}>
                          <div style={{ height: "100%", borderRadius: 4, background: `hsl(${i * 30 + 240},70%,60%)`, width: `${Math.round((e.amount / (ctx?.topExpenses[0]?.amount || 1)) * 100)}%`, transition: "width 1s ease" }} />
                        </div>
                      </div>
                    ))}
                  </Panel>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                  <Panel>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.6)" }}>🎯 AI Recommendations</div>
                      <button
                        onClick={() => handleTab("recommendations")}
                        style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(99,102,241,.25)", background: "rgba(99,102,241,.12)", color: "#a5b4fc", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                      >
                        View All
                      </button>
                    </div>
                    <div style={{ display: "grid", gap: 10 }}>
                      {recommendations.slice(0, 3).map((rec, index) => (
                        <div key={index} style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <span>{rec.icon}</span>
                            <span style={{ fontSize: 13, fontWeight: 800 }}>{rec.title}</span>
                          </div>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,.62)", lineHeight: 1.55 }}>{rec.action}</div>
                        </div>
                      ))}
                      {!recommendations.length && (
                        <div style={{ color: "rgba(255,255,255,.35)", fontSize: 13 }}>Generating recommendations from your live business data...</div>
                      )}
                    </div>
                  </Panel>

                  <Panel>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.6)", marginBottom: 14 }}>📄 Monthly AI Report</div>
                    <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
                      {[
                        "Revenue summary and month-on-month movement",
                        "Expense summary with top categories",
                        "Profit and cashflow position",
                        "Top customers, risks, and recommendations",
                      ].map((item) => (
                        <div key={item} style={{ display: "flex", gap: 8, alignItems: "flex-start", color: "rgba(255,255,255,.72)", fontSize: 12.5 }}>
                          <span style={{ color: "#10b981" }}>✓</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => handleTab("report")}
                      style={{
                        padding: "11px 18px",
                        borderRadius: 10,
                        background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                        border: "none",
                        color: "white",
                        fontSize: 12.5,
                        fontWeight: 800,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      Generate CEO Report
                    </button>
                  </Panel>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                  <Panel>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.6)" }}>🔔 Invoice Reminders</div>
                      <button
                        onClick={() => handleTab("reminders")}
                        style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(99,102,241,.25)", background: "rgba(99,102,241,.12)", color: "#a5b4fc", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                      >
                        Open Reminders
                      </button>
                    </div>
                    {invoiceReminders ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        {invoiceReminders.summary.slice(0, 3).map((line) => (
                          <div key={line} style={{ fontSize: 12.5, color: "rgba(255,255,255,.72)", lineHeight: 1.6 }}>{line}</div>
                        ))}
                        {invoiceReminders.reminders[0] && (
                          <div style={{ fontSize: 12, color: "#fca5a5" }}>
                            Next follow-up: {invoiceReminders.reminders[0].customer} · {invoiceReminders.reminders[0].invoiceRef}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ color: "rgba(255,255,255,.35)", fontSize: 13 }}>Loading reminder suggestions...</div>
                    )}
                  </Panel>

                  <Panel>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.6)" }}>🧾 Tax Estimate</div>
                      <button
                        onClick={() => handleTab("tax")}
                        style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(99,102,241,.25)", background: "rgba(99,102,241,.12)", color: "#a5b4fc", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                      >
                        Open Tax
                      </button>
                    </div>
                    {taxEstimate ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: taxEstimate.metrics.netTaxPayable >= 0 ? "#f59e0b" : "#10b981" }}>
                          {fmt(taxEstimate.metrics.netTaxPayable, currency)}
                        </div>
                        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.72)", lineHeight: 1.6 }}>
                          {taxEstimate.month} estimated tax position based on taxed invoices and current tax configurations.
                        </div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)" }}>
                          Output: {fmt(taxEstimate.metrics.outputTax, currency)} · Input: {fmt(taxEstimate.metrics.inputTax, currency)}
                        </div>
                      </div>
                    ) : (
                      <div style={{ color: "rgba(255,255,255,.35)", fontSize: 13 }}>Loading tax estimate...</div>
                    )}
                  </Panel>
                </div>

                {/* Quick questions */}
                <Panel>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "rgba(255,255,255,.6)" }}>💬 Ask AI a Question</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {QUICK_QUESTIONS.map(q => (
                      <button key={q} className="q-pill" onClick={() => { handleTab("chat"); setTimeout(() => sendChat(q), 100); }}>{q}</button>
                    ))}
                  </div>
                </Panel>
              </>
            )}
          </div>
        )}

        {/* ══ CHAT ════════════════════════════════════════════════════════ */}
        {tab === "chat" && (
          <div style={{ display: "flex", height: "100%", animation: "fadeUp .35s ease both" }}>

            {/* ── Left: Conversation ── */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, borderRight: "1px solid rgba(255,255,255,.06)" }}>

            {/* ── Messages area ── */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

              {/* ── EMPTY / WELCOME STATE ── */}
              {messages.filter(m => m.role === "user").length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, padding: "32px 20px 16px", textAlign: "center" }}>
                  {/* AI Avatar */}
                  <div style={{ position: "relative", marginBottom: 20 }}>
                    <div style={{ width: 76, height: 76, borderRadius: 26, background: "linear-gradient(135deg,#6366f1,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 20px 60px rgba(79,70,229,.5), 0 0 0 1px rgba(99,102,241,.3)", fontSize: 36 }}>
                      🧠
                    </div>
                    <div style={{ position: "absolute", bottom: -3, right: -3, width: 22, height: 22, borderRadius: "50%", background: "#10b981", border: "2.5px solid rgba(15,15,40,1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: "white" }} />
                    </div>
                  </div>

                  <div style={{ fontSize: 28, fontWeight: 900, color: "white", marginBottom: 8, letterSpacing: "-.5px" }}>FinovaOS AI</div>
                  <div style={{ fontSize: 14, color: "rgba(255,255,255,.42)", marginBottom: 32, maxWidth: 400, lineHeight: 1.7 }}>
                    Your financial intelligence assistant — connected to your live business data.<br />
                    <span style={{ color: "rgba(255,255,255,.28)" }}>Urdu ya English dono chalti hain.</span>
                  </div>

                  {/* Suggestion cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%", maxWidth: 600 }}>
                    {[
                      { icon: "📊", title: "Profit This Month", q: "What is my profit this month?" },
                      { icon: "👥", title: "Customer Dues", q: "Which customers owe me money?" },
                      { icon: "💸", title: "Expense Breakdown", q: "Why are my expenses high this month?" },
                      { icon: "📦", title: "Stock Alerts", q: "Which items are running low on stock?" },
                      { icon: "💰", title: "Cash Flow", q: "How can I improve my cash flow?" },
                      { icon: "🏆", title: "Top Products", q: "Which products are selling the most?" },
                      { icon: "🔔", title: "Overdue Invoices", q: "Which invoices need reminders now?" },
                      { icon: "📈", title: "Revenue Forecast", q: "Predict my revenue next month" },
                    ].map(s => (
                      <button
                        key={s.q}
                        onClick={() => sendChat(s.q)}
                        style={{
                          display: "flex", alignItems: "center", gap: 13, padding: "14px 16px",
                          borderRadius: 16, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)",
                          color: "white", cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                          transition: "all .18s",
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,.14)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(99,102,241,.35)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,.04)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,.08)"; }}
                      >
                        <span style={{ fontSize: 24, flexShrink: 0 }}>{s.icon}</span>
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: "rgba(255,255,255,.9)", marginBottom: 2 }}>{s.title}</div>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,.38)", lineHeight: 1.4 }}>{s.q}</div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 999, background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.2)", color: "#6ee7b7", fontSize: 11, fontWeight: 700 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                    {aiProviderLabel} · Connected to live data
                  </div>
                </div>
              ) : (
                /* ── MESSAGES ── */
                <div style={{ display: "flex", flexDirection: "column", padding: "20px 0 8px" }}>
                  {messages.filter(m => m.content).map((m, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        flexDirection: m.role === "user" ? "row-reverse" : "row",
                        gap: 12, padding: "8px 20px", alignItems: "flex-start",
                      }}
                    >
                      {/* Avatar */}
                      <div style={{
                        width: 34, height: 34, borderRadius: "50%", flexShrink: 0, marginTop: 3,
                        background: m.role === "assistant" ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "linear-gradient(135deg,#34d399,#059669)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: m.role === "assistant" ? "0 4px 16px rgba(79,70,229,.4)" : "0 4px 16px rgba(5,150,105,.35)",
                        fontSize: m.role === "assistant" ? 16 : 13,
                        fontWeight: 800, color: "white",
                      }}>
                        {m.role === "assistant" ? "🧠" : companyInitial}
                      </div>

                      {/* Bubble */}
                      <div style={{
                        maxWidth: "76%",
                        padding: m.role === "assistant" ? "14px 18px 12px" : "11px 16px",
                        borderRadius: m.role === "user" ? "20px 4px 20px 20px" : "4px 20px 20px 20px",
                        background: m.role === "user" ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "rgba(255,255,255,.065)",
                        border: m.role === "assistant" ? "1px solid rgba(255,255,255,.1)" : "none",
                        boxShadow: m.role === "user" ? "0 8px 28px rgba(79,70,229,.35)" : "0 2px 12px rgba(0,0,0,.15)",
                        fontSize: 14, lineHeight: 1.8, color: "white",
                      }}>
                        {m.role === "assistant"
                          ? <div>{renderMarkdown(m.content)}{streaming && i === messages.filter(x => x.content).length - 1 && m.content && <span className="cursor-blink" />}</div>
                          : <span>{m.content}</span>
                        }
                      </div>
                    </div>
                  ))}

                  {/* Typing indicator */}
                  {chatLoading && messages[messages.length - 1]?.content === "" && (
                    <div style={{ display: "flex", gap: 12, padding: "8px 20px", alignItems: "flex-start" }}>
                      <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 16, boxShadow: "0 4px 16px rgba(79,70,229,.4)" }}>🧠</div>
                      <div style={{ padding: "14px 18px", borderRadius: "4px 20px 20px 20px", background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.09)", display: "flex", gap: 5, alignItems: "center" }}>
                        {[0,1,2].map(j => <div key={j} style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(99,102,241,.8)", animation: `pulse 1.1s ease ${j * .18}s infinite` }} />)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* ── Input composer ── */}
            <div className="chat-composer" style={{ padding: "10px 16px 16px", borderTop: "1px solid rgba(255,255,255,.06)" }}>
              {/* Quick pills (shown after first message) */}
              {messages.filter(m => m.role === "user").length > 0 && (
                <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                  {["Show my profit", "Low stock items", "Overdue invoices", "Top customers", "Cash flow tips"].map(q => (
                    <button key={q} onClick={() => sendChat(q)} style={{
                      padding: "5px 12px", borderRadius: 999, fontSize: 11.5, fontWeight: 600,
                      background: "rgba(99,102,241,.12)", border: "1px solid rgba(99,102,241,.25)",
                      color: "rgba(255,255,255,.75)", cursor: "pointer", fontFamily: "inherit", transition: "all .15s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,.25)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,.12)"; }}
                    >{q}</button>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 10, alignItems: "center", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 16, padding: "12px 12px 12px 20px" }}>
                <input
                  ref={chatInputRef}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                  placeholder="Ask anything about your business..."
                  style={{ flex: 1, background: "none", border: "none", color: "white", fontSize: 14, fontFamily: "inherit", outline: "none", padding: "2px 0" }}
                />
                <button
                  onClick={() => sendChat()}
                  disabled={!chatInput.trim() || chatLoading}
                  style={{
                    width: 42, height: 42, borderRadius: 13, border: "none", flexShrink: 0,
                    cursor: chatInput.trim() && !chatLoading ? "pointer" : "not-allowed",
                    background: chatInput.trim() && !chatLoading ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "rgba(255,255,255,.07)",
                    display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s",
                    boxShadow: chatInput.trim() && !chatLoading ? "0 8px 24px rgba(79,70,229,.4)" : "none",
                  }}
                >
                  {chatLoading
                    ? <Spinner size={16} />
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                  }
                </button>
              </div>
              <div style={{ textAlign: "center", fontSize: 10.5, color: "rgba(255,255,255,.2)", marginTop: 8 }}>
                Powered by <b style={{ color: "rgba(255,255,255,.35)" }}>FinovaOS AI</b> · Responses based on your real business data
              </div>
            </div>
            </div>{/* end left conversation */}

            {/* ── Right: Context Panel ── */}
            <div style={{ width: 272, background: "rgba(255,255,255,.018)", overflowY: "auto", padding: "18px 14px", flexShrink: 0, display: "flex", flexDirection: "column", gap: 18 }}>

              {/* Health Ring */}
              <div style={{ textAlign: "center", padding: "16px 0 4px" }}>
                <HealthRing score={score} />
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginTop: 4 }}>Financial Health</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: risk.color, marginTop: 2 }}>{risk.label} Risk</div>
              </div>

              {/* KPI mini cards */}
              {ctx && (
                <div style={{ display: "grid", gap: 7 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 2 }}>Live Snapshot</div>
                  {[
                    { label: "Revenue", value: fmt(ctx.revenue.thisMonth, currency), color: "#10b981" },
                    { label: "Profit",  value: fmt(ctx.profit.thisMonth, currency),  color: ctx.profit.thisMonth >= 0 ? "#10b981" : "#ef4444" },
                    { label: "Overdue", value: fmt(ctx.receivables.overdue, currency), color: "#f59e0b" },
                    { label: "Stock",   value: fmt(ctx.inventory.stockValue, currency), color: "#34d399" },
                  ].map(kpi => (
                    <div key={kpi.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 11px", borderRadius: 10, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)" }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>{kpi.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: kpi.color }}>{kpi.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Active alerts */}
              {alerts.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Active Alerts</div>
                  {alerts.slice(0, 3).map((a, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "7px 10px", borderRadius: 9, marginBottom: 5, background: a.severity === "critical" ? "rgba(239,68,68,.08)" : a.severity === "warning" ? "rgba(245,158,11,.08)" : "rgba(99,102,241,.08)", border: `1px solid ${a.severity === "critical" ? "rgba(239,68,68,.22)" : a.severity === "warning" ? "rgba(245,158,11,.22)" : "rgba(99,102,241,.22)"}` }}>
                      <span style={{ fontSize: 13, flexShrink: 0 }}>{a.severity === "critical" ? "🚨" : a.severity === "warning" ? "⚠️" : "ℹ️"}</span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,.72)", lineHeight: 1.45 }}>{a.title}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick questions */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Quick Questions</div>
                {[
                  "Show my profit this month",
                  "Which items are low on stock?",
                  "Which invoices are overdue?",
                  "Who are my top customers?",
                  "Predict my revenue next month",
                  "Give me a cost reduction plan",
                ].map(q => (
                  <button key={q} className="ctx-quick-btn" onClick={() => sendChat(q)}>{q}</button>
                ))}
              </div>

            </div>{/* end right context panel */}

          </div>
        )}{/* end chat tab */}

        {/* ══ INSIGHTS ════════════════════════════════════════════════════ */}
        {tab === "insights" && (
          <div style={{ animation: "fadeUp .4s ease both" }}>
            {loadingInsights ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 16, color: "rgba(255,255,255,.4)" }}>
                <Spinner size={32} />
                <div>AI is analyzing your financial patterns…</div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 16 }}>
                <Panel className="insight-block">
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🧠</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>AI Financial Insights</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>Generated now based on your live data</div>
                    </div>
                    <button onClick={() => { setInsights(""); setLoadingInsights(true); fetch("/api/ai/insights", { headers: getHeaders() }).then(r => r.json()).then(d => { setInsights(d.insights || ""); setInsightCards(d.insightCards || []); setLoadingInsights(false); }); loadDeepAnalysis(); }}
                      style={{ marginLeft: "auto", padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "rgba(255,255,255,.6)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                      ↻ Refresh
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 18 }}>
                    {insightCards.map((card) => {
                      const tone = severityTone(card.severity);
                      return (
                        <div key={card.id} style={{ padding: "14px", borderRadius: 14, background: tone.bg, border: `1px solid ${tone.border}` }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                            <span>{card.icon}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: tone.color, textTransform: "uppercase", letterSpacing: ".06em" }}>{card.label}</span>
                          </div>
                          <div style={{ fontSize: 18, fontWeight: 900, color: "white", marginBottom: 4 }}>{card.value}</div>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,.65)", lineHeight: 1.55 }}>{card.note}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ lineHeight: 1.8 }}>{renderMarkdown(insights || "No insights available. Add some invoices and expenses to get started.")}</div>
                </Panel>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <Panel>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "rgba(255,255,255,.6)" }}>📈 Revenue Analyzer</div>
                    {revenueAnalyzer ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        {revenueAnalyzer.summary.map((line) => <div key={line} style={{ fontSize: 12.5, color: "rgba(255,255,255,.72)" }}>{line}</div>)}
                        {revenueAnalyzer.topCustomer && <div style={{ fontSize: 12, color: "#a5b4fc" }}>Top customer: {revenueAnalyzer.topCustomer.name}</div>}
                        {revenueAnalyzer.topProduct && <div style={{ fontSize: 12, color: "#6ee7b7" }}>Top product: {revenueAnalyzer.topProduct.name}</div>}
                        {revenueAnalyzer.bestMonth && <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)" }}>Best month: {revenueAnalyzer.bestMonth.month}</div>}
                      </div>
                    ) : <div style={{ color: "rgba(255,255,255,.35)", fontSize: 13 }}>Loading revenue insights...</div>}
                  </Panel>

                  <Panel>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "rgba(255,255,255,.6)" }}>💼 Profitability Analyzer</div>
                    {profitability ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        <div style={{ fontSize: 24, fontWeight: 900, color: profitability.marginPct >= 0 ? "#10b981" : "#ef4444" }}>{profitability.marginPct}% margin</div>
                        {profitability.summary.map((line) => <div key={line} style={{ fontSize: 12.5, color: "rgba(255,255,255,.72)" }}>{line}</div>)}
                      </div>
                    ) : <div style={{ color: "rgba(255,255,255,.35)", fontSize: 13 }}>Loading profitability...</div>}
                  </Panel>

                  <Panel>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "rgba(255,255,255,.6)" }}>📦 Inventory Intelligence</div>
                    {inventoryIntel ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        {inventoryIntel.summary.map((line) => <div key={line} style={{ fontSize: 12.5, color: "rgba(255,255,255,.72)" }}>{line}</div>)}
                        <div style={{ fontSize: 12, color: "#fcd34d" }}>Reorder now: {inventoryIntel.reorderItems.join(", ") || "No urgent items"}</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)" }}>Dead stock: {inventoryIntel.deadStockItems.join(", ") || "None"}</div>
                      </div>
                    ) : <div style={{ color: "rgba(255,255,255,.35)", fontSize: 13 }}>Loading inventory intelligence...</div>}
                  </Panel>

                  <Panel>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "rgba(255,255,255,.6)" }}>🚨 Risk & Late Payment Detection</div>
                    {riskAnalyzer && latePayments ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.72)" }}>Business risk score: <span style={{ color: riskAnalyzer.scoreLabel === "Low" ? "#10b981" : riskAnalyzer.scoreLabel === "Medium" ? "#f59e0b" : "#ef4444", fontWeight: 800 }}>{riskAnalyzer.healthScore}/100</span></div>
                        {riskAnalyzer.items.slice(0, 2).map((item) => <div key={item.title} style={{ fontSize: 12, color: "rgba(255,255,255,.6)" }}>{item.title}: {item.note}</div>)}
                        {latePayments.customers[0] && <div style={{ fontSize: 12, color: "#fca5a5" }}>Late payment risk: {latePayments.customers[0].name}</div>}
                      </div>
                    ) : <div style={{ color: "rgba(255,255,255,.35)", fontSize: 13 }}>Loading risk signals...</div>}
                  </Panel>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ ALERTS ══════════════════════════════════════════════════════ */}
        {tab === "alerts" && (
          <div style={{ animation: "fadeUp .4s ease both" }}>
            {loadingAlerts ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, gap: 12, color: "rgba(255,255,255,.4)" }}>
                <Spinner size={24} /><span>Scanning for anomalies…</span>
              </div>
            ) : alerts.length === 0 ? (
              <Panel style={{ textAlign: "center", padding: "60px 24px" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>All Clear!</div>
                <div style={{ color: "rgba(255,255,255,.4)", fontSize: 14 }}>No anomalies or risks detected in your financial data.</div>
              </Panel>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Sort: critical first */}
                {[...alerts].sort((a, b) => a.severity === "critical" ? -1 : b.severity === "critical" ? 1 : 0).map((alert, i) => (
                  <div key={i} style={{
                    background: alert.severity === "critical" ? "rgba(239,68,68,.08)" : alert.severity === "warning" ? "rgba(245,158,11,.06)" : "rgba(99,102,241,.06)",
                    border: `1px solid ${alert.severity === "critical" ? "rgba(239,68,68,.25)" : alert.severity === "warning" ? "rgba(245,158,11,.25)" : "rgba(99,102,241,.25)"}`,
                    borderRadius: 14, padding: "18px 20px",
                  }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                      <div style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}><AlertIcon severity={alert.severity} /></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                          <span style={{ fontWeight: 800, fontSize: 14 }}>{alert.title}</span>
                          <SeverityBadge severity={alert.severity} />
                        </div>
                        <div style={{ fontSize: 13, color: "rgba(255,255,255,.65)", lineHeight: 1.6, marginBottom: 10 }}>{alert.description}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                          <span style={{ fontSize: 12, color: "#a5b4fc", fontWeight: 600 }}>Action: {alert.action}</span>
                        </div>
                        {alert.link && (
                          <a href={alert.link} style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 10, fontSize: 12, color: "#818cf8", fontWeight: 600, textDecoration: "none", background: "rgba(99,102,241,.15)", padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(99,102,241,.25)" }}>
                            Go to page →
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ FORECAST ════════════════════════════════════════════════════ */}
        {tab === "forecast" && (
          <div style={{ animation: "fadeUp .4s ease both" }}>
            {loadingForecast ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 16, color: "rgba(255,255,255,.4)" }}>
                <Spinner size={32} />
                <div>AI is building your cash flow forecast…</div>
              </div>
            ) : forecast ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                  {[
                    { label: "Closing Cash (30d)", value: Number(forecast.projections.closingCash30d || 0), color: Number(forecast.projections.closingCash30d || 0) >= 0 ? "#10b981" : "#ef4444" },
                    { label: "Closing Cash (60d)", value: Number(forecast.projections.closingCash60d || 0), color: Number(forecast.projections.closingCash60d || 0) >= 0 ? "#10b981" : "#ef4444" },
                    { label: "Closing Cash (90d)", value: Number(forecast.projections.closingCash90d || 0), color: Number(forecast.projections.closingCash90d || 0) >= 0 ? "#10b981" : "#ef4444" },
                    { label: "Cash Buffer Needed", value: Number(forecast.projections.recommendedBuffer || 0), color: "#fbbf24" },
                    { label: "Receivables Due", value: Number(forecast.projections.receivablesDue || 0), color: "#6366f1" },
                    { label: "Payables Due", value: Number(forecast.projections.payablesDue || 0), color: "#ec4899" },
                  ].map((p, i) => (
                    <div key={i} className="kpi-card">
                      <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>{p.label}</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: p.color }}>{fmt(p.value, currency)}</div>
                    </div>
                  ))}
                </div>

                {/* Cash risk badge */}
                {forecast.projections.cashRisk && (
                  <div style={{
                    padding: "12px 16px", borderRadius: 12, display: "flex", alignItems: "center", gap: 10,
                    background: forecast.projections.cashRisk === "high" ? "rgba(239,68,68,.1)" : forecast.projections.cashRisk === "medium" ? "rgba(245,158,11,.1)" : "rgba(16,185,129,.1)",
                    border: `1px solid ${forecast.projections.cashRisk === "high" ? "rgba(239,68,68,.3)" : forecast.projections.cashRisk === "medium" ? "rgba(245,158,11,.3)" : "rgba(16,185,129,.3)"}`,
                  }}>
                    <span style={{ fontSize: 20 }}>{forecast.projections.cashRisk === "high" ? "🚨" : forecast.projections.cashRisk === "medium" ? "⚠️" : "✅"}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
                        Cash Risk: <span style={{ color: forecast.projections.cashRisk === "high" ? "#fca5a5" : forecast.projections.cashRisk === "medium" ? "#fcd34d" : "#6ee7b7", textTransform: "capitalize" }}>{String(forecast.projections.cashRisk).toUpperCase()}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)" }}>
                        {forecast.projections.daysUntilCashLow ? `Cash may tighten in around ${forecast.projections.daysUntilCashLow} days if current trend continues.` : "Current forecast does not signal an immediate cash crunch."}
                      </div>
                    </div>
                  </div>
                )}

                {forecast.chartData.length > 0 && (
                  <Panel>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: "rgba(255,255,255,.6)" }}>📊 Cashflow Forecast Chart (30 / 60 / 90 Days)</div>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={forecast.chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <defs>
                          <linearGradient id="gClosingCash" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.9} />
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.55} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" />
                        <XAxis dataKey="period" tick={{ fill: "rgba(255,255,255,.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "rgba(255,255,255,.4)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} />
                        <Tooltip contentStyle={{ background: "#1a1d3a", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, color: "white", fontSize: 12 }} formatter={(v: unknown) => [fmt(Number(v), currency)]} />
                        <Legend wrapperStyle={{ color: "rgba(255,255,255,.5)", fontSize: 12 }} />
                        <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="expenses" name="Expenses" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="closingCash" name="Closing Cash" fill="url(#gClosingCash)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Panel>
                )}

                {/* AI forecast text */}
                <Panel>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: "rgba(255,255,255,.6)" }}>🤖 AI Cash Flow Analysis</div>
                  <div style={{ lineHeight: 1.8 }}>{renderMarkdown(forecast.text)}</div>
                </Panel>

                {/* Predictive Signals — Confidence Intervals */}
                {forecast.predictiveSignals && forecast.predictiveSignals.length > 0 && (
                  <Panel>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: "rgba(255,255,255,.6)" }}>📊 Predictive Intelligence — Confidence Intervals</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
                      {forecast.predictiveSignals.map((sig, i) => {
                        const riskColor = sig.risk === "high" ? "#ef4444" : sig.risk === "medium" ? "#f59e0b" : "#10b981";
                        const confColor = sig.confidence >= 75 ? "#10b981" : sig.confidence >= 55 ? "#f59e0b" : "#f87171";
                        return (
                          <div key={i} style={{ background: "rgba(255,255,255,.03)", borderRadius: 12, padding: "14px 16px", border: "1px solid rgba(255,255,255,.06)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 700, color: "rgba(255,255,255,.8)" }}>{sig.label}</div>
                              <div style={{ display: "flex", gap: 6 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: `${confColor}18`, border: `1px solid ${confColor}30`, color: confColor }}>{sig.confidence}% conf</span>
                                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: `${riskColor}15`, border: `1px solid ${riskColor}30`, color: riskColor, textTransform: "capitalize" }}>{sig.risk}</span>
                              </div>
                            </div>
                            <div style={{ fontSize: 20, fontWeight: 900, color: "white", marginBottom: 6 }}>{fmt(sig.forecast, currency)}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                              <span style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>Range:</span>
                              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#6366f1" }}>{fmt(sig.lowerBound, currency)} – {fmt(sig.upperBound, currency)}</span>
                            </div>
                            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.38)", lineHeight: 1.6 }}>{sig.explanation}</div>
                          </div>
                        );
                      })}
                    </div>
                  </Panel>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* ══ RECOMMENDATIONS ════════════════════════════════════════════ */}
        {tab === "recommendations" && (
          <div style={{ animation: "fadeUp .4s ease both" }}>
            {loadingRecs ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 16, color: "rgba(255,255,255,.4)" }}>
                <Spinner size={32} />
                <div>AI is crafting recommendations based on your data…</div>
              </div>
            ) : recommendations.length === 0 ? (
              <Panel style={{ textAlign: "center", padding: "60px 24px" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>No Recommendations Yet</div>
                <div style={{ color: "rgba(255,255,255,.4)", fontSize: 14, marginBottom: 24 }}>Add some financial data and AI will generate personalized recommendations.</div>
                <button onClick={loadRecommendations} style={{ padding: "12px 28px", borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  Generate Recommendations
                </button>
              </Panel>
            ) : (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>🎯 AI Recommendations</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginTop: 2 }}>Personalized actions based on your financial data</div>
                  </div>
                  <button onClick={() => { setRecommendations([]); loadRecommendations(); }} style={{ padding: "7px 14px", borderRadius: 9, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "rgba(255,255,255,.6)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    ↻ Refresh
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
                  {recommendations.map((rec, i) => {
                    const priorityColor = { urgent: "#ef4444", high: "#f59e0b", medium: "#6366f1", low: "#10b981" }[rec.priority] || "#6366f1";
                    const priorityBg   = { urgent: "rgba(239,68,68,.08)", high: "rgba(245,158,11,.07)", medium: "rgba(99,102,241,.08)", low: "rgba(16,185,129,.07)" }[rec.priority] || "rgba(99,102,241,.08)";
                    const priorityBorder = { urgent: "rgba(239,68,68,.25)", high: "rgba(245,158,11,.25)", medium: "rgba(99,102,241,.25)", low: "rgba(16,185,129,.25)" }[rec.priority] || "rgba(99,102,241,.25)";
                    return (
                      <div key={i} style={{ background: priorityBg, border: `1px solid ${priorityBorder}`, borderRadius: 16, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                        {/* Header */}
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 38, height: 38, borderRadius: 11, background: `${priorityColor}20`, border: `1px solid ${priorityColor}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                              {rec.icon}
                            </div>
                            <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.3 }}>{rec.title}</div>
                          </div>
                          <span style={{ background: `${priorityColor}20`, border: `1px solid ${priorityColor}35`, color: priorityColor, fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 20, textTransform: "uppercase", letterSpacing: ".06em", flexShrink: 0 }}>
                            {rec.priority}
                          </span>
                        </div>

                        {/* Description */}
                        <div style={{ fontSize: 13, color: "rgba(255,255,255,.65)", lineHeight: 1.65 }}>{rec.description}</div>

                        {/* Impact */}
                        {rec.impact && (
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 7, padding: "9px 12px", background: "rgba(255,255,255,.04)", borderRadius: 9, border: "1px solid rgba(255,255,255,.06)" }}>
                            <span style={{ fontSize: 14, flexShrink: 0 }}>✨</span>
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 2 }}>Expected Impact</div>
                              <div style={{ fontSize: 12, color: "rgba(255,255,255,.7)" }}>{rec.impact}</div>
                            </div>
                          </div>
                        )}

                        {/* Action + Link */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 2 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#a5b4fc", fontWeight: 600 }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                            {rec.action}
                          </div>
                          {rec.link && (
                            <a href={rec.link} style={{ padding: "5px 12px", borderRadius: 8, background: `${priorityColor}15`, border: `1px solid ${priorityColor}30`, color: priorityColor, fontSize: 11, fontWeight: 700, textDecoration: "none", flexShrink: 0 }}>
                              Go →
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* AI chat prompt */}
                <div style={{ marginTop: 20, padding: "16px 20px", borderRadius: 14, background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.2)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>Want a deeper explanation?</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>Ask AI to explain any recommendation in detail or suggest more ideas.</div>
                  </div>
                  <button onClick={() => handleTab("chat")} style={{ padding: "9px 18px", borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0, boxShadow: "0 4px 14px rgba(99,102,241,.35)" }}>
                    💬 Ask AI
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ INVOICE REMINDERS ═══════════════════════════════════════════ */}
        {tab === "reminders" && (
          <div style={{ animation: "fadeUp .4s ease both" }}>
            {loadingReminders ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 260, gap: 16, color: "rgba(255,255,255,.4)" }}>
                <Spinner size={32} />
                <div>AI is prioritizing invoice follow-ups...</div>
              </div>
            ) : invoiceReminders ? (
              <div style={{ display: "grid", gap: 16 }}>
                <Panel>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>Invoice Reminder Center</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>AI prioritized follow-up queue from overdue invoices and customer payment behavior.</div>
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", fontSize: 12, color: "#fca5a5" }}>
                        Overdue: {fmt(invoiceReminders.totals.overdueReceivables, currency)}
                      </div>
                      <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.2)", fontSize: 12, color: "#c7d2fe" }}>
                        Invoices: {invoiceReminders.totals.overdueCount}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
                    {invoiceReminders.summary.map((line) => (
                      <div key={line} style={{ fontSize: 12.5, color: "rgba(255,255,255,.72)", lineHeight: 1.6 }}>{line}</div>
                    ))}
                  </div>
                </Panel>

                {invoiceReminders.reminders.length === 0 ? (
                  <Panel style={{ textAlign: "center", padding: "50px 24px" }}>
                    <div style={{ fontSize: 44, marginBottom: 14 }}>✅</div>
                    <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>No urgent reminders right now</div>
                    <div style={{ color: "rgba(255,255,255,.4)", fontSize: 14 }}>Current invoice aging does not require a follow-up push.</div>
                  </Panel>
                ) : (
                  <div style={{ display: "grid", gap: 14 }}>
                    {invoiceReminders.reminders.map((reminder) => {
                      const tone =
                        reminder.priority === "urgent" ? { bg: "rgba(239,68,68,.08)", border: "rgba(239,68,68,.25)", color: "#fca5a5" } :
                        reminder.priority === "high" ? { bg: "rgba(245,158,11,.08)", border: "rgba(245,158,11,.25)", color: "#fcd34d" } :
                        reminder.priority === "medium" ? { bg: "rgba(99,102,241,.08)", border: "rgba(99,102,241,.25)", color: "#c7d2fe" } :
                        { bg: "rgba(16,185,129,.08)", border: "rgba(16,185,129,.25)", color: "#86efac" };

                      return (
                        <Panel key={reminder.invoiceRef} style={{ background: tone.bg, border: `1px solid ${tone.border}` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                            <div style={{ flex: 1, minWidth: 260 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                                <div style={{ fontSize: 14, fontWeight: 800 }}>{reminder.customer}</div>
                                <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 999, background: `${tone.color}18`, border: `1px solid ${tone.border}`, color: tone.color, textTransform: "uppercase", letterSpacing: ".06em" }}>
                                  {reminder.priority}
                                </span>
                                <span style={{ fontSize: 11, color: "rgba(255,255,255,.45)" }}>{reminder.invoiceRef}</span>
                              </div>
                              <div style={{ display: "grid", gap: 7 }}>
                                <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.72)" }}>Amount: <span style={{ fontWeight: 700, color: "white" }}>{fmt(reminder.amount, currency)}</span> · Age: {reminder.daysAgo} day(s)</div>
                                <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.72)", lineHeight: 1.6 }}>{reminder.reason}</div>
                                <div style={{ fontSize: 12.5, color: "#a5b4fc", lineHeight: 1.6 }}>Next step: {reminder.suggestedAction}</div>
                              </div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 180 }}>
                              <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>Suggested channel: <span style={{ color: "white", fontWeight: 700 }}>{reminder.channel}</span></div>
                              <button
                                onClick={() => sendInvoiceReminder(reminder)}
                                disabled={sendingReminderRef === reminder.invoiceRef}
                                style={{
                                  padding: "11px 14px",
                                  borderRadius: 10,
                                  border: "none",
                                  background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                                  color: "white",
                                  fontSize: 12,
                                  fontWeight: 800,
                                  cursor: sendingReminderRef === reminder.invoiceRef ? "not-allowed" : "pointer",
                                  fontFamily: "inherit",
                                  opacity: sendingReminderRef === reminder.invoiceRef ? 0.6 : 1,
                                }}
                              >
                                {sendingReminderRef === reminder.invoiceRef ? "Sending..." : "Send Reminder"}
                              </button>
                            </div>
                          </div>
                        </Panel>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* ══ TAX ESTIMATE ════════════════════════════════════════════════ */}
        {tab === "tax" && (
          <div style={{ animation: "fadeUp .4s ease both" }}>
            {loadingTaxEstimate ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 260, gap: 16, color: "rgba(255,255,255,.4)" }}>
                <Spinner size={32} />
                <div>AI is estimating your tax position...</div>
              </div>
            ) : taxEstimate ? (
              <div style={{ display: "grid", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                  <Panel>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Output Tax</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "#f59e0b" }}>{fmt(taxEstimate.metrics.outputTax, currency)}</div>
                  </Panel>
                  <Panel>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Input Tax</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "#10b981" }}>{fmt(taxEstimate.metrics.inputTax, currency)}</div>
                  </Panel>
                  <Panel>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Net Tax Position</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: taxEstimate.metrics.netTaxPayable >= 0 ? "#f59e0b" : "#10b981" }}>{fmt(taxEstimate.metrics.netTaxPayable, currency)}</div>
                  </Panel>
                </div>

                <Panel>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>AI Tax Estimate</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginBottom: 14 }}>{taxEstimate.month} · estimate based on taxed sales, taxed purchases, and configured tax profiles.</div>
                  <div style={{ lineHeight: 1.8 }}>{renderMarkdown(taxEstimate.summary)}</div>
                </Panel>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <Panel>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "rgba(255,255,255,.6)" }}>Coverage</div>
                    <div style={{ display: "grid", gap: 8 }}>
                      <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.72)" }}>Tax configurations: {taxEstimate.metrics.taxConfigsCount}</div>
                      <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.72)" }}>Taxed sales invoices: {taxEstimate.metrics.taxedSalesInvoices}</div>
                      <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.72)" }}>Taxed purchase invoices: {taxEstimate.metrics.taxedPurchaseInvoices}</div>
                    </div>
                  </Panel>
                  <Panel>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "rgba(255,255,255,.6)" }}>Tax Profiles</div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {taxEstimate.taxCoverage.length ? taxEstimate.taxCoverage.map((tax) => (
                        <div key={`${tax.taxCode}-${tax.taxType}`} style={{ fontSize: 12.5, color: "rgba(255,255,255,.72)" }}>
                          {tax.taxType} · {tax.taxCode} · {tax.taxRate}%
                        </div>
                      )) : (
                        <div style={{ color: "rgba(255,255,255,.4)", fontSize: 13 }}>No tax configuration found.</div>
                      )}
                    </div>
                  </Panel>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* ══ REPORT ══════════════════════════════════════════════════════ */}
        {tab === "report" && (
          <div style={{ animation: "fadeUp .4s ease both" }}>
            {/* Period selector */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {(["weekly", "monthly", "quarterly"] as const).map(p => (
                <button key={p} onClick={() => { setReportPeriod(p); setReport(null); }} style={{
                  padding: "7px 18px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  border: reportPeriod === p ? "1px solid rgba(99,102,241,.5)" : "1px solid rgba(255,255,255,.1)",
                  background: reportPeriod === p ? "rgba(99,102,241,.18)" : "rgba(255,255,255,.04)",
                  color: reportPeriod === p ? "#c7d2fe" : "rgba(255,255,255,.5)",
                }}>
                  {{ weekly: "Weekly", monthly: "Monthly", quarterly: "Quarterly" }[p]}
                </button>
              ))}
            </div>

            {loadingReport ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 320, gap: 16, color: "rgba(255,255,255,.4)" }}>
                <Spinner size={32} />
                <div style={{ textAlign: "center" }}>
                  <div style={{ marginBottom: 4 }}>AI is generating your {reportPeriod.charAt(0).toUpperCase() + reportPeriod.slice(1)} Financial Report…</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.25)" }}>This may take 15–30 seconds</div>
                </div>
              </div>
            ) : report ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 24 }}>📄</div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 16 }}>{reportPeriod.charAt(0).toUpperCase() + reportPeriod.slice(1)} Financial Report</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>Generated by FinovaOS AI · {new Date(report.generatedAt || Date.now()).toLocaleDateString("en-US", { dateStyle: "long" })}</div>
                      </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setReport(null); loadReport(); }} style={{ padding: "8px 14px", borderRadius: 9, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "rgba(255,255,255,.6)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                      ↻ Regenerate
                    </button>
                    <button onClick={() => {
                      const printContent = document.getElementById("ai-report-content");
                      if (!printContent) return;
                      const w = window.open("", "_blank");
                      if (!w) return;
                      w.document.write(`<html><head><title>Monthly Report</title><style>body{font-family:sans-serif;padding:40px;line-height:1.7}h1,h2,h3{margin-top:24px}.finova-footer{margin-top:48px;border-top:1px solid #e5e7eb;padding-top:8px;text-align:center;font-size:10px;color:#aaa;letter-spacing:.04em}</style></head><body>${printContent.innerHTML}<div class="finova-footer">Powered by FinovaOS</div></body></html>`);
                      w.document.close();
                      w.print();
                    }} style={{ padding: "8px 16px", borderRadius: 9, background: "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 4px 14px rgba(99,102,241,.3)" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
                      Print / PDF
                    </button>
                  </div>
                </div>
                <div id="ai-report-content" style={{ display: "grid", gap: 16 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                    {[
                      { label: "Revenue", value: fmt(report.summary.revenue, currency), color: "#10b981" },
                      { label: "Expenses", value: fmt(report.summary.expenses, currency), color: "#f59e0b" },
                      { label: "Profit", value: fmt(report.summary.profit, currency), color: report.summary.profit >= 0 ? "#10b981" : "#ef4444" },
                      { label: "Cash Risk", value: report.highlights?.cashRisk || "n/a", color: report.highlights?.cashRisk === "high" ? "#ef4444" : report.highlights?.cashRisk === "medium" ? "#f59e0b" : "#a5b4fc" },
                    ].map((item) => (
                      <Panel key={item.label} style={{ padding: "16px 18px" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>{item.label}</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: item.color }}>{item.value}</div>
                      </Panel>
                    ))}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <Panel>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "rgba(255,255,255,.6)" }}>CEO Highlights</div>
                      <div style={{ display: "grid", gap: 8 }}>
                        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.72)" }}>Top customer: {report.highlights?.topCustomer?.name || "n/a"}</div>
                        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.72)" }}>Top expense: {report.highlights?.topExpense?.category || "n/a"}</div>
                        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.72)" }}>Low stock items: {report.highlights?.lowStockCount ?? 0}</div>
                        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.72)" }}>Overdue receivables: {fmt(report.highlights?.overdueReceivables || 0, currency)}</div>
                      </div>
                    </Panel>
                    <Panel>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "rgba(255,255,255,.6)" }}>Risk Snapshot</div>
                      {report.riskSnapshot ? (
                        <div style={{ display: "grid", gap: 8 }}>
                          <div style={{ fontSize: 22, fontWeight: 900, color: report.riskSnapshot.label === "Low" ? "#10b981" : report.riskSnapshot.label === "Medium" ? "#f59e0b" : "#ef4444" }}>
                            {report.riskSnapshot.score}/100
                          </div>
                          {report.riskSnapshot.items.slice(0, 3).map((item) => (
                            <div key={item.title} style={{ fontSize: 12.5, color: "rgba(255,255,255,.72)" }}>
                              {item.title}: {item.note}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ color: "rgba(255,255,255,.4)", fontSize: 13 }}>Risk snapshot unavailable.</div>
                      )}
                    </Panel>
                  </div>

                  <Panel>
                    {renderMarkdown(report.report)}
                  </Panel>
                </div>
              </div>
            ) : (
              <Panel style={{ textAlign: "center", padding: "60px 24px" }}>
                <div style={{ fontSize: 56, marginBottom: 20 }}>📊</div>
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 10 }}>Generate {reportPeriod.charAt(0).toUpperCase() + reportPeriod.slice(1)} AI Report</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,.4)", marginBottom: 28, maxWidth: 440, margin: "0 auto 28px" }}>
                  AI will analyze all your financial data and generate a comprehensive {reportPeriod} report including revenue, expenses, profit, cash flow, risks, and recommendations.
                </div>
                <button onClick={() => loadReport(reportPeriod)} style={{
                  padding: "14px 32px", borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                  border: "none", color: "white", fontSize: 15, fontWeight: 800, cursor: "pointer",
                  fontFamily: "inherit", boxShadow: "0 8px 24px rgba(99,102,241,.4)", display: "inline-flex", alignItems: "center", gap: 8,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
                  Generate Report
                </button>
              </Panel>
            )}
          </div>
        )}

        {/* ── Market Intelligence Tab ─────────────────────────────────────── */}
        {tab === "market" && (
          <div style={{ animation: "fadeUp .4s ease" }}>
            {loadingMarket ? (
              <Panel style={{ textAlign: "center", padding: "60px 24px" }}>
                <Spinner size={36} />
                <div style={{ color: "rgba(255,255,255,.4)", marginTop: 16 }}>Building market intelligence…</div>
              </Panel>
            ) : marketIntel ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Header */}
                <Panel style={{ display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
                  <HealthRing score={marketIntel.score} />
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Market Intelligence</div>
                    <div style={{ fontSize: 14, color: "rgba(255,255,255,.55)", marginBottom: 10 }}>{marketIntel.businessLabel} industry analysis</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,.75)", lineHeight: 1.7 }}>{marketIntel.summary}</div>
                  </div>
                </Panel>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 20 }}>
                  {/* Suggested New Products */}
                  <Panel>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: "#a5b4fc" }}>🆕 Suggested Products to Add</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {marketIntel.suggestedNewProducts.slice(0, 6).map((p, i) => (
                        <div key={i} style={{ borderLeft: `3px solid ${p.potentialRevenue === "high" ? "#10b981" : p.potentialRevenue === "medium" ? "#f59e0b" : "#6366f1"}`, paddingLeft: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>{p.name}</span>
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 20,
                              background: p.potentialRevenue === "high" ? "rgba(16,185,129,.15)" : p.potentialRevenue === "medium" ? "rgba(245,158,11,.15)" : "rgba(99,102,241,.15)",
                              color: p.potentialRevenue === "high" ? "#6ee7b7" : p.potentialRevenue === "medium" ? "#fcd34d" : "#a5b4fc",
                            }}>{p.potentialRevenue.toUpperCase()}</span>
                          </div>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)" }}>{p.reason}</div>
                        </div>
                      ))}
                    </div>
                  </Panel>

                  {/* Industry Trends */}
                  <Panel>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: "#a5b4fc" }}>📊 Industry Trends</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {marketIntel.trendsThisIndustry.map((trend, i) => (
                        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <span style={{ color: "#6366f1", fontSize: 16, flexShrink: 0 }}>→</span>
                          <span style={{ fontSize: 13, color: "rgba(255,255,255,.75)", lineHeight: 1.6 }}>{trend}</span>
                        </div>
                      ))}
                    </div>
                  </Panel>

                  {/* Seasonal Opportunities */}
                  <Panel>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: "#a5b4fc" }}>📅 Seasonal Opportunities (Next 3 Months)</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {marketIntel.seasonalOpportunities.map((s, i) => (
                        <div key={i}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#6366f1", marginBottom: 6 }}>{s.month}</div>
                          {s.opportunities.map((opp, j) => (
                            <div key={j} style={{ fontSize: 12, color: "rgba(255,255,255,.6)", paddingLeft: 12, lineHeight: 1.7 }}>• {opp}</div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </Panel>

                  {/* Revenue Diversification */}
                  <Panel>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: "#a5b4fc" }}>💡 Revenue Diversification</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {marketIntel.revenueDiversification.map((item, i) => (
                        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <span style={{ color: "#10b981", fontSize: 14, flexShrink: 0 }}>✓</span>
                          <span style={{ fontSize: 13, color: "rgba(255,255,255,.75)", lineHeight: 1.6 }}>{item}</span>
                        </div>
                      ))}
                    </div>
                  </Panel>

                  {/* Competitive Edge */}
                  <Panel>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: "#a5b4fc" }}>🏆 Competitive Edge Actions</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {marketIntel.competitorEdge.map((item, i) => (
                        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <span style={{ color: "#f59e0b", fontSize: 14, flexShrink: 0 }}>★</span>
                          <span style={{ fontSize: 13, color: "rgba(255,255,255,.75)", lineHeight: 1.6 }}>{item}</span>
                        </div>
                      ))}
                    </div>
                  </Panel>
                </div>
              </div>
            ) : (
              <Panel style={{ textAlign: "center", padding: "60px 24px" }}>
                <div style={{ fontSize: 56, marginBottom: 20 }}>🌐</div>
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 10 }}>Market Intelligence</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,.4)", marginBottom: 28, maxWidth: 440, margin: "0 auto 28px" }}>
                  Discover what products to add, industry trends, seasonal opportunities, and competitive strategies for your business type.
                </div>
                <button onClick={loadMarketIntel} style={{
                  padding: "14px 32px", borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                  border: "none", color: "white", fontSize: 15, fontWeight: 800, cursor: "pointer",
                  fontFamily: "inherit", boxShadow: "0 8px 24px rgba(99,102,241,.4)",
                }}>Analyze Market</button>
              </Panel>
            )}
          </div>
        )}

        {/* ── Business Advisor Tab ─────────────────────────────────────────── */}
        {tab === "advisor" && (
          <div style={{ animation: "fadeUp .4s ease" }}>
            {loadingAdvisor ? (
              <Panel style={{ textAlign: "center", padding: "60px 24px" }}>
                <Spinner size={36} />
                <div style={{ color: "rgba(255,255,255,.4)", marginTop: 16 }}>Building your business advisor…</div>
              </Panel>
            ) : businessAdvisor ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Header */}
                <Panel style={{ display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
                  <HealthRing score={businessAdvisor.score?.overall ?? 0} />
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Business Advisor</div>
                    <div style={{ fontSize: 14, color: "rgba(255,255,255,.55)", marginBottom: 6 }}>
                      Growth Score: <span style={{ color: "#a5b4fc", fontWeight: 700 }}>{businessAdvisor.score?.label || "Unavailable"}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,.75)", lineHeight: 1.7 }}>
                      Personalized growth plan based on your financial data and industry profile.
                    </div>
                  </div>
                  {(businessAdvisor.quickWins?.length || 0) > 0 && (
                    <div style={{ background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.2)", borderRadius: 12, padding: "14px 18px", minWidth: 200 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#6ee7b7", marginBottom: 8 }}>⚡ QUICK WINS</div>
                      {businessAdvisor.quickWins.slice(0, 3).map((win, i) => (
                        <div key={i} style={{ fontSize: 12, color: "rgba(255,255,255,.7)", lineHeight: 1.6, paddingLeft: 8 }}>• {win}</div>
                      ))}
                    </div>
                  )}
                </Panel>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 20 }}>
                  {/* Growth Plan */}
                  <Panel style={{ gridColumn: "1 / -1" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: "#a5b4fc" }}>🚀 Growth Plan</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {businessAdvisor.growthPlan.map((item, i) => {
                        const priorityColor = item.priority === "urgent" ? "#ef4444" : item.priority === "high" ? "#f59e0b" : item.priority === "medium" ? "#6366f1" : "#10b981";
                        return (
                          <div key={i} style={{ borderLeft: `3px solid ${priorityColor}`, paddingLeft: 16 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{item.title}</span>
                              <span style={{
                                fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, textTransform: "uppercase",
                                background: `${priorityColor}22`, color: priorityColor,
                              }}>{item.priority}</span>
                            </div>
                            <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 8 }}>Impact: {item.impact}</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              {item.steps.map((step, j) => (
                                <div key={j} style={{ fontSize: 12.5, color: "rgba(255,255,255,.7)", display: "flex", gap: 8 }}>
                                  <span style={{ color: "#6366f1", flexShrink: 0 }}>{j + 1}.</span>{step}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Panel>

                  {/* Cross-sell / Upsell */}
                  <Panel>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: "#a5b4fc" }}>🔗 Cross-sell & Upsell</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {businessAdvisor.crossSellUpsell.map((item, i) => (
                        <div key={i} style={{ background: "rgba(255,255,255,.03)", borderRadius: 10, padding: "10px 14px" }}>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginBottom: 4 }}>When customer buys: <span style={{ color: "#c7d2fe" }}>{item.trigger}</span></div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "white", marginBottom: 4 }}>→ Suggest: {item.suggest}</div>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)" }}>{item.reason}</div>
                        </div>
                      ))}
                    </div>
                  </Panel>

                  {/* Market Gaps */}
                  <Panel>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: "#a5b4fc" }}>🎯 Market Gaps to Capture</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {businessAdvisor.marketGaps.map((gap, i) => (
                        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <span style={{ color: "#10b981", fontSize: 14, flexShrink: 0 }}>◆</span>
                          <span style={{ fontSize: 13, color: "rgba(255,255,255,.75)", lineHeight: 1.6 }}>{gap}</span>
                        </div>
                      ))}
                    </div>
                  </Panel>

                  {/* Risk Warnings */}
                  <Panel>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: "#a5b4fc" }}>⚠️ Risk Warnings</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {businessAdvisor.riskWarnings.map((risk, i) => {
                        const tone = severityTone(risk.severity);
                        return (
                          <div key={i} style={{ background: tone.bg, border: `1px solid ${tone.border}`, borderRadius: 10, padding: "12px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: tone.color }}>{risk.title}</span>
                              <SeverityBadge severity={risk.severity} />
                            </div>
                            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.65)", marginBottom: 6 }}>{risk.description}</div>
                            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>Mitigation: {risk.mitigation}</div>
                          </div>
                        );
                      })}
                    </div>
                  </Panel>
                </div>
              </div>
            ) : (
              <Panel style={{ textAlign: "center", padding: "60px 24px" }}>
                <div style={{ fontSize: 56, marginBottom: 20 }}>🧭</div>
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 10 }}>AI Business Advisor</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,.4)", marginBottom: 28, maxWidth: 440, margin: "0 auto 28px" }}>
                  Get a personalized growth plan, cross-sell opportunities, market gap analysis, and risk warnings — all based on your real business data.
                </div>
                <button onClick={loadBusinessAdvisor} style={{
                  padding: "14px 32px", borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                  border: "none", color: "white", fontSize: 15, fontWeight: 800, cursor: "pointer",
                  fontFamily: "inherit", boxShadow: "0 8px 24px rgba(99,102,241,.4)",
                }}>Get Business Plan</button>
              </Panel>
            )}
          </div>
        )}

        {/* ══ RECONCILIATION ════════════════════════════════════════════════ */}
        {tab === "reconciliation" && (
          <div style={{ animation: "fadeUp .4s ease both" }}>
            {!reconciliation && !loadingReconciliation ? (
              <Panel style={{ textAlign: "center", padding: "60px 24px" }}>
                <div style={{ fontSize: 56, marginBottom: 20 }}>🔗</div>
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 10 }}>Smart Reconciliation AI</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,.4)", marginBottom: 28, maxWidth: 440, margin: "0 auto 28px", lineHeight: 1.7 }}>
                  AI scans your bank transactions and automatically matches them to invoices, payments, and expenses — with a confidence score for each match.
                </div>
                <button onClick={loadReconciliation} style={{
                  padding: "14px 32px", borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                  border: "none", color: "white", fontSize: 15, fontWeight: 800, cursor: "pointer",
                  fontFamily: "inherit", boxShadow: "0 8px 24px rgba(99,102,241,.4)",
                }}>Run Reconciliation AI</button>
              </Panel>
            ) : loadingReconciliation ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 320, gap: 16, color: "rgba(255,255,255,.4)" }}>
                <Spinner size={32} />
                <div style={{ fontSize: 14 }}>AI is matching transactions…</div>
              </div>
            ) : reconciliation && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {/* KPI strip */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 12 }}>
                  {[
                    { label: "Total Entries", value: reconciliation.summary.total, color: "#a5b4fc" },
                    { label: "Auto-Matched", value: reconciliation.summary.autoMatched, color: "#10b981" },
                    { label: "Manual Match", value: reconciliation.summary.manuallyMatched, color: "#60a5fa" },
                    { label: "Pending Review", value: reconciliation.summary.pending, color: "#f59e0b" },
                    { label: "Unmatched", value: reconciliation.summary.unmatched, color: "#ef4444" },
                  ].map(k => (
                    <div key={k.label} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: "16px 18px" }}>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,.38)", marginBottom: 8, fontWeight: 600 }}>{k.label}</div>
                      <div style={{ fontSize: 26, fontWeight: 800, color: k.color }}>{k.value}</div>
                    </div>
                  ))}
                </div>

                {/* Filter bar */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {(["all", "pending", "auto_matched", "unmatched"] as const).map(f => (
                    <button key={f} onClick={() => setReconciliationFilter(f)} style={{
                      padding: "7px 16px", borderRadius: 999, border: reconciliationFilter === f ? "1px solid rgba(99,102,241,.5)" : "1px solid rgba(255,255,255,.1)",
                      background: reconciliationFilter === f ? "rgba(99,102,241,.18)" : "rgba(255,255,255,.04)",
                      color: reconciliationFilter === f ? "#c7d2fe" : "rgba(255,255,255,.55)",
                      fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    }}>
                      {{ all: "All", pending: "Pending Review", auto_matched: "Auto-Matched", unmatched: "Unmatched" }[f]}
                    </button>
                  ))}
                </div>

                {/* Transaction rows */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {reconciliation.items
                    .filter(item => reconciliationFilter === "all" || item.status === reconciliationFilter)
                    .map(item => {
                      const statusCfg = {
                        pending: { label: "Pending", color: "#f59e0b", bg: "rgba(245,158,11,.12)", border: "rgba(245,158,11,.3)" },
                        auto_matched: { label: "Auto-Matched", color: "#10b981", bg: "rgba(16,185,129,.1)", border: "rgba(16,185,129,.25)" },
                        manually_matched: { label: "Manual Match", color: "#60a5fa", bg: "rgba(96,165,250,.1)", border: "rgba(96,165,250,.25)" },
                        unmatched: { label: "Unmatched", color: "#ef4444", bg: "rgba(239,68,68,.1)", border: "rgba(239,68,68,.25)" },
                      }[item.status];
                      return (
                        <div key={item.id} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, overflow: "hidden" }}>
                          {/* Transaction header */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", gap: 16, flexWrap: "wrap", borderBottom: item.matches.length > 0 ? "1px solid rgba(255,255,255,.05)" : "none" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                              <div style={{
                                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                                background: item.direction === "credit" ? "rgba(16,185,129,.14)" : "rgba(239,68,68,.12)",
                                border: `1px solid ${item.direction === "credit" ? "rgba(16,185,129,.3)" : "rgba(239,68,68,.25)"}`,
                                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
                              }}>
                                {item.direction === "credit" ? "↓" : "↑"}
                              </div>
                              <div>
                                <div style={{ fontSize: 13.5, fontWeight: 700, color: "white" }}>{item.description}</div>
                                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.4)", marginTop: 2 }}>{item.ledgerRef} · {item.date}</div>
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              {item.isDuplicate && (
                                <span style={{ padding: "4px 10px", borderRadius: 999, fontSize: 10, fontWeight: 800, background: "rgba(239,68,68,.14)", border: "1px solid rgba(239,68,68,.35)", color: "#fca5a5", whiteSpace: "nowrap" }}>
                                  ⚠ Duplicate
                                </span>
                              )}
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 16, fontWeight: 800, color: item.direction === "credit" ? "#10b981" : "#f87171" }}>
                                  {item.direction === "credit" ? "+" : "−"}{item.amount.toLocaleString()}
                                </div>
                              </div>
                              <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 10.5, fontWeight: 700, background: statusCfg.bg, border: `1px solid ${statusCfg.border}`, color: statusCfg.color, whiteSpace: "nowrap" }}>
                                {statusCfg.label}
                              </span>
                            </div>
                          </div>

                          {/* Match candidates */}
                          {item.matches.length > 0 && (
                            <div style={{ padding: "12px 18px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.3)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 4 }}>
                                {item.matches.length} Match Candidate{item.matches.length !== 1 ? "s" : ""}
                              </div>
                              {item.matches.map(match => {
                                const isSelected = item.selectedMatchId === match.id;
                                const confColor = match.confidence >= 90 ? "#10b981" : match.confidence >= 70 ? "#f59e0b" : "#f87171";
                                const typeIcon = { invoice: "🧾", expense: "💸", payment: "💳", journal: "📒" }[match.type];
                                return (
                                  <div key={match.id} style={{
                                    display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10,
                                    background: isSelected ? "rgba(99,102,241,.12)" : "rgba(255,255,255,.025)",
                                    border: `1px solid ${isSelected ? "rgba(99,102,241,.35)" : "rgba(255,255,255,.06)"}`,
                                    flexWrap: "wrap",
                                  }}>
                                    <span style={{ fontSize: 16 }}>{typeIcon}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: 12.5, fontWeight: 700, color: "rgba(255,255,255,.85)" }}>{match.ref} · {match.party}</div>
                                      <div style={{ fontSize: 11, color: "rgba(255,255,255,.38)", marginTop: 2 }}>{match.type.toUpperCase()} · {match.date}</div>
                                    </div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.7)", marginRight: 4 }}>{match.amount.toLocaleString()}</div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 8, background: `${confColor}18`, border: `1px solid ${confColor}35` }}>
                                      <span style={{ fontSize: 11, fontWeight: 800, color: confColor }}>{match.confidence}%</span>
                                      <span style={{ fontSize: 10, color: "rgba(255,255,255,.3)" }}>conf</span>
                                    </div>
                                    {item.status === "pending" && (
                                      <button onClick={() => {
                                        setReconciliation(prev => prev ? {
                                          ...prev,
                                          summary: { ...prev.summary, pending: prev.summary.pending - 1, manuallyMatched: prev.summary.manuallyMatched + 1 },
                                          items: prev.items.map(i => i.id === item.id ? { ...i, status: "manually_matched" as const, selectedMatchId: match.id } : i),
                                        } : prev);
                                      }} style={{
                                        padding: "6px 14px", borderRadius: 8, background: "rgba(99,102,241,.18)", border: "1px solid rgba(99,102,241,.4)",
                                        color: "#c7d2fe", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                                      }}>
                                        Match
                                      </button>
                                    )}
                                    {isSelected && (
                                      <span style={{ fontSize: 18, color: "#10b981" }}>✓</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {item.matches.length === 0 && item.status === "unmatched" && (
                            <div style={{ padding: "10px 18px 12px", fontSize: 12.5, color: "rgba(255,255,255,.3)", fontStyle: "italic" }}>
                              No matching records found. Manual journal entry may be required.
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}

          {/* ── SCAN RECEIPT TAB ─────────────────────────────────────────── */}
        {tab === "scan" && (
          <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 18, padding: "24px 26px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📷</div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800 }}>Receipt / Invoice Scanner</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 2 }}>Upload any receipt or invoice — AI extracts vendor, amount, tax, and category automatically</div>
                </div>
              </div>

              {/* Drop zone */}
              <div
                onClick={() => scanFileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  const f = e.dataTransfer.files[0];
                  if (f && f.type.startsWith("image/")) {
                    setScanFile(f);
                    setScanResult(null);
                    setScanError(null);
                    const reader = new FileReader();
                    reader.onload = ev => setScanPreview(ev.target?.result as string);
                    reader.readAsDataURL(f);
                  }
                }}
                style={{
                  border: `2px dashed ${scanFile ? "rgba(99,102,241,.5)" : "rgba(255,255,255,.12)"}`,
                  borderRadius: 14, padding: "32px 20px", textAlign: "center", cursor: "pointer",
                  background: scanFile ? "rgba(99,102,241,.06)" : "rgba(255,255,255,.02)",
                  transition: "all .2s", marginBottom: 16,
                }}
              >
                {scanPreview ? (
                  <img src={scanPreview} alt="preview" style={{ maxHeight: 220, maxWidth: "100%", borderRadius: 10, objectFit: "contain" }} />
                ) : (
                  <>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>📄</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,.7)" }}>Click or drag &amp; drop</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginTop: 4 }}>JPG, PNG, WEBP — receipts, invoices, bills</div>
                  </>
                )}
              </div>
              <input ref={scanFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                const f = e.target.files?.[0];
                if (f) {
                  setScanFile(f);
                  setScanResult(null);
                  setScanError(null);
                  const reader = new FileReader();
                  reader.onload = ev => setScanPreview(ev.target?.result as string);
                  reader.readAsDataURL(f);
                }
              }} />

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={handleScanReceipt}
                  disabled={!scanFile || scanLoading}
                  style={{
                    flex: 1, padding: "12px 0", borderRadius: 11, border: "none", cursor: scanFile && !scanLoading ? "pointer" : "not-allowed",
                    background: scanFile && !scanLoading ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "rgba(255,255,255,.07)",
                    color: scanFile && !scanLoading ? "white" : "rgba(255,255,255,.3)",
                    fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                    boxShadow: scanFile && !scanLoading ? "0 4px 16px rgba(99,102,241,.35)" : "none",
                    transition: "all .2s",
                  }}
                >
                  {scanLoading ? "🔍 Scanning..." : "🔍 Scan with AI"}
                </button>
                {scanFile && (
                  <button onClick={() => { setScanFile(null); setScanPreview(null); setScanResult(null); setScanError(null); if (scanFileRef.current) scanFileRef.current.value = ""; }}
                    style={{ padding: "12px 18px", borderRadius: 11, border: "1px solid rgba(255,255,255,.12)", background: "none", color: "rgba(255,255,255,.5)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                    Clear
                  </button>
                )}
              </div>

              {scanError && (
                <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 10, background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)", color: "#f87171", fontSize: 13 }}>
                  ⚠️ {scanError}
                </div>
              )}
            </div>

            {/* Results */}
            {scanResult && (
              <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(99,102,241,.25)", borderRadius: 18, padding: "22px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>Extracted Data</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 999, background: scanResult.confidence >= 80 ? "rgba(16,185,129,.1)" : "rgba(245,158,11,.1)", border: `1px solid ${scanResult.confidence >= 80 ? "rgba(16,185,129,.3)" : "rgba(245,158,11,.3)"}` }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: scanResult.confidence >= 80 ? "#10b981" : "#f59e0b" }}>{scanResult.confidence}% confidence</span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                  {[
                    { label: "Vendor", value: scanResult.vendor },
                    { label: "Date", value: scanResult.date },
                    { label: "Invoice No", value: scanResult.invoiceNo },
                    { label: "Category", value: scanResult.category },
                    { label: "Currency", value: scanResult.currency },
                    { label: "Tax Rate", value: scanResult.taxRate != null ? `${scanResult.taxRate}%` : null },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: value ? "rgba(255,255,255,.85)" : "rgba(255,255,255,.25)" }}>{value || "—"}</div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.18)", marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,.5)" }}>Subtotal</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{scanResult.currency} {scanResult.subtotal?.toLocaleString() ?? "—"}</span>
                  </div>
                  {scanResult.taxAmount != null && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,.5)" }}>Tax {scanResult.taxRate ? `(${scanResult.taxRate}%)` : ""}</span>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{scanResult.currency} {scanResult.taxAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid rgba(255,255,255,.08)" }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: "#c7d2fe" }}>Total</span>
                    <span style={{ fontSize: 17, fontWeight: 900, color: "#818cf8" }}>{scanResult.currency} {scanResult.total.toLocaleString()}</span>
                  </div>
                </div>

                {/* Line items */}
                {scanResult.items.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.3)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 8 }}>Line Items</div>
                    {scanResult.items.map((item, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,.05)", gap: 12 }}>
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,.75)", flex: 1 }}>{item.description}</span>
                        {item.qty && <span style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>×{item.qty}</span>}
                        <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.7)", whiteSpace: "nowrap" }}>{scanResult.currency} {item.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}

                {scanResult.notes && (
                  <div style={{ marginTop: 14, fontSize: 12.5, color: "rgba(255,255,255,.4)", fontStyle: "italic" }}>📝 {scanResult.notes}</div>
                )}

                <a
                  href={`/dashboard/expense-vouchers/new?vendor=${encodeURIComponent(scanResult.vendor || "")}&amount=${scanResult.total}&category=${encodeURIComponent(scanResult.category || "")}`}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    marginTop: 18, padding: "12px 0", borderRadius: 11,
                    background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                    color: "white", fontSize: 13, fontWeight: 700, textDecoration: "none",
                    boxShadow: "0 4px 16px rgba(99,102,241,.3)",
                  }}
                >
                  💸 Create Expense Voucher with this data
                </a>
              </div>
            )}
          </div>
        )}

        {/* ── QUICK INVOICE GEN TAB ─────────────────────────────────────── */}
        {tab === "invoice-gen" && (
          <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 18, padding: "24px 26px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>✍️</div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800 }}>Quick Invoice Generator</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 2 }}>Type naturally — AI generates a complete invoice draft instantly</div>
                </div>
              </div>

              {/* Example pills */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>
                {[
                  "Invoice to ABC Trading for Rs. 50,000 consulting fee + GST",
                  "Invoice XYZ for 10 units of product at 2000 each",
                  "Bill to Ali Khan Rs. 75,000 for web design, net 30",
                  "Invoice for freight charges 15,000 + 17% tax",
                ].map(ex => (
                  <button key={ex} onClick={() => setInvoiceGenPrompt(ex)} style={{
                    padding: "7px 13px", borderRadius: 999, fontSize: 11.5, fontWeight: 600,
                    background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.2)",
                    color: "rgba(255,255,255,.65)", cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                  }}>
                    {ex}
                  </button>
                ))}
              </div>

              <div style={{ position: "relative" }}>
                <textarea
                  value={invoiceGenPrompt}
                  onChange={e => setInvoiceGenPrompt(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleInvoiceGen(); }}
                  placeholder='e.g. "Invoice to Sunrise Trading for Rs. 1,20,000 + GST — consulting services"'
                  rows={3}
                  style={{
                    width: "100%", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.12)",
                    borderRadius: 12, padding: "14px 16px", color: "white", fontSize: 14,
                    fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box",
                  }}
                />
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.25)", marginTop: 5 }}>Ctrl+Enter to generate</div>
              </div>

              <button
                onClick={handleInvoiceGen}
                disabled={!invoiceGenPrompt.trim() || invoiceGenLoading}
                style={{
                  width: "100%", marginTop: 12, padding: "13px 0", borderRadius: 11, border: "none",
                  cursor: invoiceGenPrompt.trim() && !invoiceGenLoading ? "pointer" : "not-allowed",
                  background: invoiceGenPrompt.trim() && !invoiceGenLoading ? "linear-gradient(135deg,#10b981,#059669)" : "rgba(255,255,255,.07)",
                  color: invoiceGenPrompt.trim() && !invoiceGenLoading ? "white" : "rgba(255,255,255,.3)",
                  fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                  boxShadow: invoiceGenPrompt.trim() && !invoiceGenLoading ? "0 4px 16px rgba(16,185,129,.3)" : "none",
                  transition: "all .2s",
                }}
              >
                {invoiceGenLoading ? "✨ Generating..." : "✨ Generate Invoice Draft"}
              </button>

              {invoiceGenError && (
                <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 10, background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)", color: "#f87171", fontSize: 13 }}>
                  ⚠️ {invoiceGenError}
                </div>
              )}
            </div>

            {/* Draft preview */}
            {invoiceDraft && (
              <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(16,185,129,.25)", borderRadius: 18, padding: "22px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>Invoice Draft</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 999, background: invoiceDraft.confidence >= 80 ? "rgba(16,185,129,.1)" : "rgba(245,158,11,.1)", border: `1px solid ${invoiceDraft.confidence >= 80 ? "rgba(16,185,129,.3)" : "rgba(245,158,11,.3)"}` }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: invoiceDraft.confidence >= 80 ? "#10b981" : "#f59e0b" }}>{invoiceDraft.confidence}% confidence</span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                  {[
                    { label: "Customer", value: invoiceDraft.customerName },
                    { label: "Invoice No", value: invoiceDraft.invoiceNo },
                    { label: "Date", value: invoiceDraft.date },
                    { label: "Due Date", value: invoiceDraft.dueDate },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,.85)" }}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Line items */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.3)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 8 }}>Line Items</div>
                  <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,.07)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 90px 80px 90px", gap: 0, padding: "8px 14px", background: "rgba(255,255,255,.04)", fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase" }}>
                      <span>Description</span><span style={{ textAlign: "center" }}>Qty</span><span style={{ textAlign: "right" }}>Unit Price</span><span style={{ textAlign: "center" }}>Tax</span><span style={{ textAlign: "right" }}>Amount</span>
                    </div>
                    {invoiceDraft.items.map((item, i) => (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 60px 90px 80px 90px", gap: 0, padding: "11px 14px", borderTop: "1px solid rgba(255,255,255,.05)", fontSize: 13 }}>
                        <span style={{ color: "rgba(255,255,255,.8)" }}>{item.description}</span>
                        <span style={{ textAlign: "center", color: "rgba(255,255,255,.5)" }}>{item.qty}</span>
                        <span style={{ textAlign: "right", color: "rgba(255,255,255,.6)" }}>{item.unitPrice.toLocaleString()}</span>
                        <span style={{ textAlign: "center", color: "rgba(255,255,255,.4)" }}>{item.taxRate > 0 ? `${item.taxRate}%` : "—"}</span>
                        <span style={{ textAlign: "right", fontWeight: 700, color: "rgba(255,255,255,.85)" }}>{item.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(16,185,129,.05)", border: "1px solid rgba(16,185,129,.18)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,.5)" }}>Subtotal</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>PKR {invoiceDraft.subtotal.toLocaleString()}</span>
                  </div>
                  {invoiceDraft.taxTotal > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,.5)" }}>Tax / GST</span>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>PKR {invoiceDraft.taxTotal.toLocaleString()}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid rgba(255,255,255,.08)" }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: "#6ee7b7" }}>Total</span>
                    <span style={{ fontSize: 17, fontWeight: 900, color: "#10b981" }}>PKR {invoiceDraft.total.toLocaleString()}</span>
                  </div>
                </div>

                {invoiceDraft.notes && (
                  <div style={{ marginTop: 12, fontSize: 12.5, color: "rgba(255,255,255,.4)", fontStyle: "italic" }}>📝 {invoiceDraft.notes}</div>
                )}

                {!invoiceDraft.customerId && (
                  <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(245,158,11,.07)", border: "1px solid rgba(245,158,11,.22)", fontSize: 12.5, color: "#fbbf24" }}>
                    ⚠️ Customer "{invoiceDraft.customerName}" not found in your records — you'll need to select or create them when saving the invoice.
                  </div>
                )}

                <a
                  href={`/dashboard/sales-invoice/new?customer=${encodeURIComponent(invoiceDraft.customerName)}&customerId=${invoiceDraft.customerId || ""}&total=${invoiceDraft.total}&invoiceNo=${encodeURIComponent(invoiceDraft.invoiceNo)}`}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    marginTop: 18, padding: "12px 0", borderRadius: 11,
                    background: "linear-gradient(135deg,#10b981,#059669)",
                    color: "white", fontSize: 13, fontWeight: 700, textDecoration: "none",
                    boxShadow: "0 4px 16px rgba(16,185,129,.3)",
                  }}
                >
                  🧾 Open in Sales Invoice →
                </a>
              </div>
            )}
          </div>
        )}

        {/* ── INVENTORY FORECAST TAB ───────────────────────────────────── */}
        {tab === "inv-forecast" && (
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,#f59e0b,#d97706)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📦</div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800 }}>Inventory Demand Forecast</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>AI predicts next-month demand per product using 6-month sales history and trend analysis</div>
              </div>
              <button onClick={loadInvForecast} style={{ marginLeft: "auto", padding: "8px 16px", borderRadius: 9, background: "rgba(245,158,11,.12)", border: "1px solid rgba(245,158,11,.3)", color: "#fbbf24", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>↻ Refresh</button>
            </div>
            {invForecastLoading && <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,.4)", fontSize: 14 }}>⏳ Analyzing sales patterns...</div>}
            {invForecast && !invForecastLoading && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
                  {[
                    { label: "Critical", value: invForecast.summary.criticalCount, color: "#ef4444", bg: "rgba(239,68,68,.08)", desc: "< 15 days stock" },
                    { label: "Warning", value: invForecast.summary.warningCount, color: "#f59e0b", bg: "rgba(245,158,11,.08)", desc: "< 30 days stock" },
                    { label: "Total Tracked", value: invForecast.summary.totalItems, color: "#818cf8", bg: "rgba(99,102,241,.08)", desc: "products analyzed" },
                    { label: "Reorder Value", value: invForecast.summary.reorderValueFormatted, color: "#10b981", bg: "rgba(16,185,129,.08)", desc: "estimated cost" },
                  ].map(card => (
                    <div key={card.label} style={{ padding: "16px 18px", borderRadius: 14, background: card.bg, border: `1px solid ${card.color}22` }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{card.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: card.color }}>{card.value}</div>
                      <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.3)", marginTop: 3 }}>{card.desc}</div>
                    </div>
                  ))}
                </div>
                {invForecast.narrative && <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(245,158,11,.06)", border: "1px solid rgba(245,158,11,.18)", fontSize: 13, color: "rgba(255,255,255,.75)", marginBottom: 18, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{invForecast.narrative}</div>}
                <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 90px 90px 90px 90px", padding: "10px 16px", background: "rgba(255,255,255,.04)", fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", gap: 8 }}>
                    <span>Product</span><span style={{ textAlign: "center" }}>Stock</span><span style={{ textAlign: "center" }}>Avg/Mo</span><span style={{ textAlign: "center" }}>Forecast</span><span style={{ textAlign: "center" }}>Days Left</span><span style={{ textAlign: "center" }}>Reorder</span>
                  </div>
                  {invForecast.forecasts.map((item, i) => {
                    const urgencyColor = item.urgency === "critical" ? "#ef4444" : item.urgency === "warning" ? "#f59e0b" : "#10b981";
                    const trendIcon = item.trend === "growing" ? "↑" : item.trend === "declining" ? "↓" : "→";
                    return (
                      <div key={item.itemId} style={{ display: "grid", gridTemplateColumns: "1fr 80px 90px 90px 90px 90px", padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,.04)", gap: 8, alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.85)" }}>{item.name}</div>
                          <div style={{ fontSize: 10.5, color: item.trend === "growing" ? "#10b981" : item.trend === "declining" ? "#ef4444" : "rgba(255,255,255,.35)", marginTop: 2 }}>{trendIcon} {item.trend}</div>
                        </div>
                        <span style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.7)" }}>{item.currentStock}</span>
                        <span style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,.5)" }}>{item.avgMonthlySales}</span>
                        <span style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: "#818cf8" }}>{item.nextMonthForecast}</span>
                        <span style={{ textAlign: "center", fontSize: 13, fontWeight: 800, color: urgencyColor }}>{item.daysOfStock === 999 ? "∞" : `${item.daysOfStock}d`}</span>
                        <span style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: item.suggestedReorder > 0 ? "#f59e0b" : "rgba(255,255,255,.25)" }}>{item.suggestedReorder > 0 ? item.suggestedReorder : "—"}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            {!invForecast && !invForecastLoading && <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,.3)" }}>No inventory sales data yet.</div>}
          </div>
        )}

        {/* ── CASHFLOW OPTIMIZER TAB ──────────────────────────────────────── */}
        {tab === "cashflow-opt" && (
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>💵</div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800 }}>Cash Flow Optimizer</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>AI schedules optimal payment timing — collect faster, pay smarter, maximize liquidity</div>
              </div>
              <button onClick={loadCashflowOpt} style={{ marginLeft: "auto", padding: "8px 16px", borderRadius: 9, background: "rgba(16,185,129,.12)", border: "1px solid rgba(16,185,129,.3)", color: "#6ee7b7", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>↻ Refresh</button>
            </div>
            {cashflowOptLoading && <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,.4)", fontSize: 14 }}>⏳ Analyzing cash position...</div>}
            {cashflowOpt && !cashflowOptLoading && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                  {[
                    { label: "Net Cash (30 days)", value: cashflowOpt.projection.net30, currency: cashflowOpt.projection.currency },
                    { label: "Net Cash (60 days)", value: cashflowOpt.projection.net60, currency: cashflowOpt.projection.currency },
                  ].map(card => {
                    const positive = card.value >= 0;
                    return (
                      <div key={card.label} style={{ padding: "20px 22px", borderRadius: 14, background: positive ? "rgba(16,185,129,.07)" : "rgba(239,68,68,.07)", border: `1px solid ${positive ? "rgba(16,185,129,.25)" : "rgba(239,68,68,.25)"}` }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>{card.label}</div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: positive ? "#10b981" : "#ef4444" }}>{positive ? "+" : ""}{card.currency} {Math.abs(card.value).toLocaleString()}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 4 }}>{positive ? "Positive cash position" : "Cash gap — action needed"}</div>
                      </div>
                    );
                  })}
                </div>
                {cashflowOpt.narrative && <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(16,185,129,.05)", border: "1px solid rgba(16,185,129,.15)", fontSize: 13, color: "rgba(255,255,255,.75)", marginBottom: 18, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{cashflowOpt.narrative}</div>}
                {cashflowOpt.tips.length > 0 && (
                  <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "18px 20px", marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 14 }}>💡 Optimization Actions</div>
                    {cashflowOpt.tips.map((tip, i) => {
                      const impactColor = tip.impact === "critical" ? "#ef4444" : tip.impact === "high" ? "#f59e0b" : "#818cf8";
                      return (
                        <div key={i} style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", marginBottom: 8, display: "flex", gap: 14, alignItems: "flex-start" }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: impactColor, flexShrink: 0, marginTop: 4 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.85)", marginBottom: 3 }}>{tip.title}</div>
                            <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 4 }}>{tip.action}</div>
                            <div style={{ fontSize: 11.5, fontWeight: 700, color: "#10b981" }}>{tip.potentialSaving}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {[{ title: "💰 Expected Inflows", items: cashflowOpt.inflows, color: "#10b981" }, { title: "💸 Expected Outflows", items: cashflowOpt.outflows, color: "#f87171" }].map(section => (
                    <div key={section.title} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, overflow: "hidden" }}>
                      <div style={{ padding: "12px 16px", background: "rgba(255,255,255,.03)", fontSize: 12, fontWeight: 700, color: section.color, borderBottom: "1px solid rgba(255,255,255,.05)" }}>{section.title}</div>
                      {(section.items as CashflowEntry[]).slice(0, 6).map((item, i) => {
                        const prColor = item.priority === "urgent" ? "#ef4444" : item.priority === "high" ? "#f59e0b" : "#818cf8";
                        return (
                          <div key={i} style={{ padding: "10px 16px", borderTop: i > 0 ? "1px solid rgba(255,255,255,.04)" : "none" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                              <span style={{ fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,.8)", flex: 1, marginRight: 8 }}>{item.label}</span>
                              <span style={{ fontSize: 13, fontWeight: 800, color: section.color, whiteSpace: "nowrap" }}>{cashflowOpt.projection.currency} {item.amount.toLocaleString()}</span>
                            </div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>{item.dueDate} · <span style={{ color: prColor }}>{item.priority}</span></div>
                            {"earlyPayDiscount" in item && item.earlyPayDiscount && <div style={{ fontSize: 10.5, color: "#fbbf24", marginTop: 3 }}>💡 {item.earlyPayDiscount}</div>}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </>
            )}
            {!cashflowOpt && !cashflowOptLoading && <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,.3)" }}>No outstanding invoices to analyze.</div>}
          </div>
        )}

        {/* ── CHURN PREDICTION TAB ────────────────────────────────────────── */}
        {tab === "churn" && (
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,#8b5cf6,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>👥</div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800 }}>Customer Churn Prediction</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>AI identifies which customers are likely to leave based on purchase frequency and revenue trends</div>
              </div>
              <button onClick={loadChurn} style={{ marginLeft: "auto", padding: "8px 16px", borderRadius: 9, background: "rgba(139,92,246,.12)", border: "1px solid rgba(139,92,246,.3)", color: "#c4b5fd", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>↻ Refresh</button>
            </div>
            {churnLoading && <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,.4)", fontSize: 14 }}>⏳ Analyzing customer behavior...</div>}
            {churnResult && !churnLoading && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
                  {[
                    { label: "Critical Risk", value: churnResult.summary.criticalCount, color: "#ef4444", bg: "rgba(239,68,68,.08)" },
                    { label: "High Risk", value: churnResult.summary.highCount, color: "#f59e0b", bg: "rgba(245,158,11,.08)" },
                    { label: "Total Customers", value: churnResult.summary.totalCustomers, color: "#818cf8", bg: "rgba(99,102,241,.08)" },
                    { label: "Revenue at Risk", value: `${churnResult.summary.currency} ${Math.round(churnResult.summary.atRiskRevenue / 1000)}K`, color: "#ef4444", bg: "rgba(239,68,68,.08)" },
                  ].map(card => (
                    <div key={card.label} style={{ padding: "16px 18px", borderRadius: 14, background: card.bg, border: `1px solid ${card.color}22` }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{card.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: card.color }}>{card.value}</div>
                    </div>
                  ))}
                </div>
                {churnResult.narrative && <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(139,92,246,.06)", border: "1px solid rgba(139,92,246,.18)", fontSize: 13, color: "rgba(255,255,255,.75)", marginBottom: 18, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{churnResult.narrative}</div>}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {churnResult.customers.map(customer => {
                    const riskColor = customer.churnRisk === "critical" ? "#ef4444" : customer.churnRisk === "high" ? "#f59e0b" : customer.churnRisk === "medium" ? "#818cf8" : "#10b981";
                    const trendIcon = customer.revenueTrend === "growing" ? "↑" : customer.revenueTrend === "gone_silent" ? "⚠" : customer.revenueTrend === "declining" ? "↓" : "→";
                    return (
                      <div key={customer.customerId} style={{ padding: "16px 18px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: `1px solid ${customer.churnRisk === "critical" ? "rgba(239,68,68,.25)" : "rgba(255,255,255,.07)"}`, display: "flex", gap: 16, alignItems: "flex-start" }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${riskColor}15`, border: `2px solid ${riskColor}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 900, color: riskColor }}>{customer.churnScore}</div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: "rgba(255,255,255,.9)" }}>{customer.name}</span>
                            <span style={{ fontSize: 10.5, fontWeight: 800, color: riskColor, background: `${riskColor}15`, padding: "2px 8px", borderRadius: 999, border: `1px solid ${riskColor}30` }}>{customer.churnRisk.toUpperCase()}</span>
                            <span style={{ fontSize: 11, color: customer.revenueTrend === "growing" ? "#10b981" : customer.revenueTrend === "declining" || customer.revenueTrend === "gone_silent" ? "#ef4444" : "rgba(255,255,255,.35)" }}>{trendIcon} {customer.revenueTrend}</span>
                          </div>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 6 }}>{customer.reason}</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#c4b5fd" }}>→ {customer.suggestedAction}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: "rgba(255,255,255,.7)" }}>{churnResult.summary.currency} {Math.round(customer.totalRevenue / 1000)}K</div>
                          <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.3)", marginTop: 2 }}>{customer.invoiceCount} orders</div>
                          <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.3)" }}>Last: {customer.daysSinceLastOrder}d ago</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            {!churnResult && !churnLoading && <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,.3)" }}>No customer sales history yet.</div>}
          </div>
        )}

        {/* ── SUPPLIER INTEL TAB ──────────────────────────────────────────── */}
        {tab === "supplier-intel" && (
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,#0ea5e9,#0284c7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🤝</div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800 }}>Supplier Negotiation Intelligence</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>AI identifies which suppliers to negotiate with and estimates savings from volume/loyalty discounts</div>
              </div>
              <button onClick={loadSupplierIntel} style={{ marginLeft: "auto", padding: "8px 16px", borderRadius: 9, background: "rgba(14,165,233,.12)", border: "1px solid rgba(14,165,233,.3)", color: "#7dd3fc", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>↻ Refresh</button>
            </div>
            {supplierIntelLoading && <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,.4)", fontSize: 14 }}>⏳ Analyzing purchase history...</div>}
            {supplierIntel && !supplierIntelLoading && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
                  {[
                    { label: "High Opportunity", value: supplierIntel.summary.highOpportunityCount, color: "#10b981", desc: "suppliers to negotiate now" },
                    { label: "Total Suppliers", value: supplierIntel.summary.totalSuppliers, color: "#818cf8", desc: "with 2+ orders" },
                    { label: "Potential Savings", value: `${supplierIntel.summary.currency} ${Math.round(supplierIntel.summary.totalPotentialSaving / 1000)}K/yr`, color: "#f59e0b", desc: "if discounts secured" },
                  ].map(card => (
                    <div key={card.label} style={{ padding: "18px 20px", borderRadius: 14, background: `${card.color}0d`, border: `1px solid ${card.color}22` }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{card.label}</div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: card.color }}>{card.value}</div>
                      <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.3)", marginTop: 3 }}>{card.desc}</div>
                    </div>
                  ))}
                </div>
                {supplierIntel.narrative && <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(14,165,233,.05)", border: "1px solid rgba(14,165,233,.15)", fontSize: 13, color: "rgba(255,255,255,.75)", marginBottom: 18, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{supplierIntel.narrative}</div>}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {supplierIntel.suppliers.map(supplier => {
                    const opColor = supplier.negotiationOpportunity === "high" ? "#10b981" : supplier.negotiationOpportunity === "medium" ? "#f59e0b" : "#818cf8";
                    const trendIcon = supplier.spendTrend === "increasing" ? "↑" : supplier.spendTrend === "decreasing" ? "↓" : "→";
                    const trendColor = supplier.spendTrend === "increasing" ? "#ef4444" : supplier.spendTrend === "decreasing" ? "#10b981" : "rgba(255,255,255,.4)";
                    return (
                      <div key={supplier.supplierId} style={{ padding: "16px 18px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: `1px solid ${supplier.negotiationOpportunity === "high" ? "rgba(16,185,129,.25)" : "rgba(255,255,255,.07)"}` }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 14, fontWeight: 800, color: "rgba(255,255,255,.9)" }}>{supplier.name}</span>
                              <span style={{ fontSize: 10.5, fontWeight: 800, color: opColor, background: `${opColor}15`, padding: "2px 8px", borderRadius: 999 }}>{supplier.negotiationOpportunity.toUpperCase()} OPPORTUNITY</span>
                              {supplier.concentrationRisk && <span style={{ fontSize: 10.5, color: "#f59e0b", background: "rgba(245,158,11,.1)", padding: "2px 8px", borderRadius: 999 }}>⚠ Concentration Risk</span>}
                            </div>
                            <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 6 }}>{supplier.negotiationReason}</div>
                            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#7dd3fc" }}>💡 {supplier.suggestedDiscount}</div>
                            {supplier.topItems.length > 0 && (
                              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {supplier.topItems.slice(0, 3).map((item, i) => (
                                  <div key={i} style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", fontSize: 11, color: "rgba(255,255,255,.55)" }}>
                                    {item.description} · avg {supplierIntel.summary.currency} {item.avgRate.toLocaleString()}{item.priceVariance > 5 ? ` · ${item.priceVariance}% price variance` : ""}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 900, color: "rgba(255,255,255,.85)" }}>{supplierIntel.summary.currency} {Math.round(supplier.totalSpend / 1000)}K/yr</div>
                            <div style={{ fontSize: 11, color: trendColor, marginTop: 3 }}>{trendIcon} {Math.abs(supplier.spendTrendPct)}% spend {supplier.spendTrend}</div>
                            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.3)", marginTop: 2 }}>{supplier.invoiceCount} orders · last {supplier.lastOrderDaysAgo}d ago</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            {!supplierIntel && !supplierIntelLoading && <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,.3)" }}>No purchase history with multiple orders yet.</div>}
          </div>
        )}

        {/* ── GL AUTO-CODE TAB ────────────────────────────────────────────── */}
        {tab === "gl-suggest" && (
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🏷️</div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800 }}>GL Auto-Code</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>Type a description and AI instantly suggests the correct GL account — no manual lookup needed</div>
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 18, padding: "24px 26px", marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 2 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>Description / Narration</label>
                  <input value={glDesc} onChange={e => setGlDesc(e.target.value)} onKeyDown={e => e.key === "Enter" && handleGLSuggest()}
                    placeholder='e.g. "electricity bill", "office rent", "petrol for delivery van"'
                    style={{ width: "100%", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, padding: "12px 14px", color: "white", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>Vendor (optional)</label>
                  <input value={glVendor} onChange={e => setGlVendor(e.target.value)} onKeyDown={e => e.key === "Enter" && handleGLSuggest()}
                    placeholder='e.g. "K-Electric", "PTCL"'
                    style={{ width: "100%", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, padding: "12px 14px", color: "white", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>
                {["electricity bill", "office rent", "salary payment", "petrol for van", "lawyer fees", "Google Ads payment", "printer cartridge", "bank charges", "airline ticket"].map(ex => (
                  <button key={ex} onClick={() => { setGlDesc(ex); setTimeout(handleGLSuggest, 0); }} style={{ padding: "6px 12px", borderRadius: 999, fontSize: 11.5, background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.2)", color: "rgba(255,255,255,.6)", cursor: "pointer", fontFamily: "inherit" }}>{ex}</button>
                ))}
              </div>
              <button onClick={handleGLSuggest} disabled={!glDesc.trim() || glLoading}
                style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: "none", cursor: glDesc.trim() && !glLoading ? "pointer" : "not-allowed", background: glDesc.trim() && !glLoading ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "rgba(255,255,255,.07)", color: glDesc.trim() && !glLoading ? "white" : "rgba(255,255,255,.3)", fontSize: 14, fontWeight: 700, fontFamily: "inherit", transition: "all .2s" }}>
                {glLoading ? "🔍 Matching..." : "🏷️ Suggest GL Account"}
              </button>
            </div>
            {glResult && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {glResult.suggestions.length === 0 && glResult.fallbackAccounts.length === 0 && (
                  <div style={{ padding: 24, textAlign: "center", color: "rgba(255,255,255,.4)", fontSize: 13 }}>No matching GL accounts found. Try a different description.</div>
                )}
                {glResult.suggestions.map((s, i) => (
                  <div key={i} style={{ padding: "16px 18px", borderRadius: 12, background: i === 0 ? "rgba(99,102,241,.07)" : "rgba(255,255,255,.03)", border: `1px solid ${i === 0 ? "rgba(99,102,241,.3)" : "rgba(255,255,255,.07)"}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      {i === 0 && <span style={{ fontSize: 11, fontWeight: 800, color: "#818cf8", background: "rgba(99,102,241,.15)", padding: "3px 10px", borderRadius: 999 }}>BEST MATCH</span>}
                      <span style={{ fontSize: 15, fontWeight: 800, color: "rgba(255,255,255,.9)" }}>{s.category}</span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginLeft: "auto" }}>matched "{s.matchedKeyword}"</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: s.confidence >= 90 ? "#10b981" : "#f59e0b" }}>{s.confidence}%</span>
                    </div>
                    {s.matchedAccounts.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {s.matchedAccounts.map(acc => (
                          <div key={acc.id} style={{ padding: "8px 14px", borderRadius: 9, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", display: "flex", gap: 8, alignItems: "center" }}>
                            {acc.code && <span style={{ fontSize: 11, color: "rgba(255,255,255,.35)", fontFamily: "monospace" }}>{acc.code}</span>}
                            <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.8)" }}>{acc.name}</span>
                            {acc.type && <span style={{ fontSize: 10, color: "rgba(255,255,255,.3)", background: "rgba(255,255,255,.05)", padding: "1px 6px", borderRadius: 4 }}>{acc.type}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    {s.matchedAccounts.length === 0 && <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", fontStyle: "italic" }}>Category identified but no matching accounts in your chart of accounts yet.</div>}
                  </div>
                ))}
                {glResult.fallbackAccounts.length > 0 && glResult.suggestions.length === 0 && (
                  <div style={{ padding: "16px 18px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.4)", marginBottom: 10 }}>Possible Matches (by name search)</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {glResult.fallbackAccounts.map(acc => (
                        <div key={acc.id} style={{ padding: "8px 14px", borderRadius: 9, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)" }}>
                          {acc.code && <span style={{ fontSize: 11, color: "rgba(255,255,255,.35)", fontFamily: "monospace", marginRight: 6 }}>{acc.code}</span>}
                          <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.8)" }}>{acc.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── EXPENSE CATEGORIZATION TAB ──────────────────────────────────── */}
        {tab === "expense-cat" && (
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,#f59e0b,#d97706)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📂</div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800 }}>Expense Categorization</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>AI groups your expenses into categories and highlights where to cut costs</div>
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 18, padding: "24px 26px", marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 18 }}>
                {[
                  { label: "This Month Expenses", value: ctx ? `${ctx.company.currency} ${Number(ctx.expenses.thisMonth).toLocaleString()}` : "—", color: "#ef4444" },
                  { label: "Top Expense", value: ctx?.topExpenses?.[0]?.category || "—", color: "#f59e0b" },
                  { label: "Expense Categories", value: ctx?.topExpenses?.length ? `${ctx.topExpenses.length} detected` : "—", color: "#a78bfa" },
                ].map(card => (
                  <div key={card.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: "14px 16px" }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 6 }}>{card.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: card.color }}>{card.value}</div>
                  </div>
                ))}
              </div>
              <button onClick={handleExpenseCat} disabled={expenseCatLoading}
                style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: "none", cursor: expenseCatLoading ? "not-allowed" : "pointer", background: expenseCatLoading ? "rgba(255,255,255,.07)" : "linear-gradient(135deg,#f59e0b,#d97706)", color: expenseCatLoading ? "rgba(255,255,255,.3)" : "white", fontSize: 14, fontWeight: 700, fontFamily: "inherit", transition: "all .2s" }}>
                {expenseCatLoading ? "🔄 Analyzing expenses..." : "📂 Run Expense Categorization"}
              </button>
            </div>
            {expenseCatLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 24px", background: "rgba(255,255,255,.03)", borderRadius: 14, border: "1px solid rgba(255,255,255,.07)" }}>
                <div style={{ width: 20, height: 20, border: "2px solid rgba(245,158,11,.3)", borderTopColor: "#f59e0b", borderRadius: "50%", animation: "spin .8s linear infinite", flexShrink: 0 }} />
                <span style={{ color: "rgba(255,255,255,.5)", fontSize: 13 }}>AI is analyzing your expense patterns...</span>
              </div>
            )}
            {expenseCat && !expenseCatLoading && (
              <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: "20px 22px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 14 }}>Categorization Report</div>
                {renderMarkdown(expenseCat)}
              </div>
            )}
          </div>
        )}

        {/* ── BUDGET & VARIANCE TAB ───────────────────────────────────────── */}
        {tab === "budget" && (
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📊</div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800 }}>Budget & Variance Analysis</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>AI suggests realistic budget targets and shows where you&apos;re over or under plan</div>
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 18, padding: "24px 26px", marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 18 }}>
                {[
                  { label: "Revenue This Month", value: ctx ? `${ctx.company.currency} ${Number(ctx.revenue.thisMonth).toLocaleString()}` : "—", color: "#10b981" },
                  { label: "Revenue Last Month", value: ctx ? `${ctx.company.currency} ${Number(ctx.revenue.lastMonth).toLocaleString()}` : "—", color: "#34d399" },
                  { label: "Net Profit This Month", value: ctx ? `${ctx.company.currency} ${Number(ctx.profit.thisMonth).toLocaleString()}` : "—", color: "#a78bfa" },
                ].map(card => (
                  <div key={card.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: "14px 16px" }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 6 }}>{card.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: card.color }}>{card.value}</div>
                  </div>
                ))}
              </div>
              <button onClick={handleBudgetAnalysis} disabled={budgetLoading}
                style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: "none", cursor: budgetLoading ? "not-allowed" : "pointer", background: budgetLoading ? "rgba(255,255,255,.07)" : "linear-gradient(135deg,#10b981,#059669)", color: budgetLoading ? "rgba(255,255,255,.3)" : "white", fontSize: 14, fontWeight: 700, fontFamily: "inherit", transition: "all .2s" }}>
                {budgetLoading ? "🔄 Building budget plan..." : "📊 Generate Budget & Variance Report"}
              </button>
            </div>
            {budgetLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 24px", background: "rgba(255,255,255,.03)", borderRadius: 14, border: "1px solid rgba(255,255,255,.07)" }}>
                <div style={{ width: 20, height: 20, border: "2px solid rgba(16,185,129,.3)", borderTopColor: "#10b981", borderRadius: "50%", animation: "spin .8s linear infinite", flexShrink: 0 }} />
                <span style={{ color: "rgba(255,255,255,.5)", fontSize: 13 }}>AI is building your budget roadmap...</span>
              </div>
            )}
            {budgetAnalysis && !budgetLoading && (
              <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: "20px 22px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 14 }}>Budget Plan & Variance</div>
                {renderMarkdown(budgetAnalysis)}
              </div>
            )}
          </div>
        )}

        {/* ── DUPLICATE DETECTION TAB ─────────────────────────────────────── */}
        {tab === "duplicate" && (
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,#ef4444,#b91c1c)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🔍</div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800 }}>Duplicate & Anomaly Detection</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>AI scans for duplicate invoices, suspicious patterns, and internal control gaps</div>
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 18, padding: "24px 26px", marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 18 }}>
                {[
                  { label: "Recent Invoices Scanned", value: ctx?.recentInvoices?.length ? `${ctx.recentInvoices.length} invoices` : "—", color: "#ef4444" },
                  { label: "Top Customer", value: ctx?.topCustomers?.[0]?.name || "—", color: "#f59e0b" },
                  { label: "Overdue Count", value: ctx?.receivables?.overdueCount != null ? `${ctx.receivables.overdueCount} overdue` : "—", color: "#f87171" },
                ].map(card => (
                  <div key={card.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: "14px 16px" }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 6 }}>{card.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: card.color }}>{card.value}</div>
                  </div>
                ))}
              </div>
              <button onClick={handleDuplicateDetection} disabled={duplicateLoading}
                style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: "none", cursor: duplicateLoading ? "not-allowed" : "pointer", background: duplicateLoading ? "rgba(255,255,255,.07)" : "linear-gradient(135deg,#ef4444,#b91c1c)", color: duplicateLoading ? "rgba(255,255,255,.3)" : "white", fontSize: 14, fontWeight: 700, fontFamily: "inherit", transition: "all .2s" }}>
                {duplicateLoading ? "🔄 Scanning for anomalies..." : "🔍 Scan for Duplicates & Anomalies"}
              </button>
            </div>
            {duplicateLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 24px", background: "rgba(255,255,255,.03)", borderRadius: 14, border: "1px solid rgba(255,255,255,.07)" }}>
                <div style={{ width: 20, height: 20, border: "2px solid rgba(239,68,68,.3)", borderTopColor: "#ef4444", borderRadius: "50%", animation: "spin .8s linear infinite", flexShrink: 0 }} />
                <span style={{ color: "rgba(255,255,255,.5)", fontSize: 13 }}>AI is reviewing your transaction history...</span>
              </div>
            )}
            {duplicateResult && !duplicateLoading && (
              <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: "20px 22px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 14 }}>Audit & Anomaly Report</div>
                {renderMarkdown(duplicateResult)}
              </div>
            )}
          </div>
        )}

        {/* ── CUSTOMER PROFITABILITY TAB ──────────────────────────────────── */}
        {tab === "customer-profit" && (
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,#38bdf8,#0284c7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>👤</div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800 }}>Customer Profitability</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>AI ranks customers by revenue, payment behaviour, and estimated CLV</div>
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 18, padding: "24px 26px", marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 18 }}>
                {[
                  { label: "Total Customers", value: ctx?.topCustomers?.length ? `${ctx.topCustomers.length} tracked` : "—", color: "#38bdf8" },
                  { label: "Top Customer Revenue", value: ctx?.topCustomers?.[0] ? `${ctx.company?.currency} ${Number(ctx.topCustomers[0].amount).toLocaleString()}` : "—", color: "#34d399" },
                  { label: "Total Receivables", value: ctx ? `${ctx.company.currency} ${Number(ctx.receivables.total).toLocaleString()}` : "—", color: "#f59e0b" },
                ].map(card => (
                  <div key={card.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: "14px 16px" }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 6 }}>{card.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: card.color }}>{card.value}</div>
                  </div>
                ))}
              </div>
              <button onClick={handleCustomerProfit} disabled={customerProfitLoading}
                style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: "none", cursor: customerProfitLoading ? "not-allowed" : "pointer", background: customerProfitLoading ? "rgba(255,255,255,.07)" : "linear-gradient(135deg,#38bdf8,#0284c7)", color: customerProfitLoading ? "rgba(255,255,255,.3)" : "white", fontSize: 14, fontWeight: 700, fontFamily: "inherit", transition: "all .2s" }}>
                {customerProfitLoading ? "🔄 Ranking customers..." : "👤 Analyze Customer Profitability"}
              </button>
            </div>
            {customerProfitLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 24px", background: "rgba(255,255,255,.03)", borderRadius: 14, border: "1px solid rgba(255,255,255,.07)" }}>
                <div style={{ width: 20, height: 20, border: "2px solid rgba(56,189,248,.3)", borderTopColor: "#38bdf8", borderRadius: "50%", animation: "spin .8s linear infinite", flexShrink: 0 }} />
                <span style={{ color: "rgba(255,255,255,.5)", fontSize: 13 }}>AI is analysing customer value and CLV...</span>
              </div>
            )}
            {customerProfit && !customerProfitLoading && (
              <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: "20px 22px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 14 }}>Customer Profitability Report</div>
                {renderMarkdown(customerProfit)}
              </div>
            )}
          </div>
        )}

        {/* ── FINANCIAL RATIOS TAB ────────────────────────────────────────── */}
        {tab === "ratios" && (
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,#a78bfa,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>⚖️</div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800 }}>Financial Ratio Analysis</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>Full profitability, liquidity, efficiency, and leverage ratios with benchmarks</div>
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 18, padding: "24px 26px", marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 18 }}>
                {[
                  { label: "Revenue", value: ctx ? `${ctx.company.currency} ${Number(ctx.revenue.thisMonth).toLocaleString()}` : "—", color: "#10b981" },
                  { label: "Profit", value: ctx ? `${ctx.company.currency} ${Number(ctx.profit.thisMonth).toLocaleString()}` : "—", color: "#a78bfa" },
                  { label: "Receivables", value: ctx ? `${ctx.company.currency} ${Number(ctx.receivables.total).toLocaleString()}` : "—", color: "#f59e0b" },
                  { label: "Cash Position", value: ctx ? `${ctx.company.currency} ${Number(ctx.cashPosition).toLocaleString()}` : "—", color: "#38bdf8" },
                ].map(card => (
                  <div key={card.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: "14px 16px" }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 6 }}>{card.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: card.color }}>{card.value}</div>
                  </div>
                ))}
              </div>
              <button onClick={handleRatioAnalysis} disabled={ratiosLoading}
                style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: "none", cursor: ratiosLoading ? "not-allowed" : "pointer", background: ratiosLoading ? "rgba(255,255,255,.07)" : "linear-gradient(135deg,#a78bfa,#7c3aed)", color: ratiosLoading ? "rgba(255,255,255,.3)" : "white", fontSize: 14, fontWeight: 700, fontFamily: "inherit", transition: "all .2s" }}>
                {ratiosLoading ? "🔄 Calculating ratios..." : "⚖️ Run Full Ratio Analysis"}
              </button>
            </div>
            {ratiosLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 24px", background: "rgba(255,255,255,.03)", borderRadius: 14, border: "1px solid rgba(255,255,255,.07)" }}>
                <div style={{ width: 20, height: 20, border: "2px solid rgba(167,139,250,.3)", borderTopColor: "#a78bfa", borderRadius: "50%", animation: "spin .8s linear infinite", flexShrink: 0 }} />
                <span style={{ color: "rgba(255,255,255,.5)", fontSize: 13 }}>AI is computing your financial ratios...</span>
              </div>
            )}
            {ratiosResult && !ratiosLoading && (
              <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: "20px 22px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 14 }}>Financial Ratios Report</div>
                {renderMarkdown(ratiosResult)}
              </div>
            )}
          </div>
        )}

          </div>
        </div>
      </div>
    </div>
  );
}
