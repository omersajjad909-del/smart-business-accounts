"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getCurrentUser } from "@/lib/auth";
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from "recharts";

// ─── Types ─────────────────────────────────────────────────────────────────
type Tab = "overview" | "chat" | "insights" | "alerts" | "forecast" | "recommendations" | "reminders" | "tax" | "report" | "market" | "advisor";

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
  inventory: { totalItems: number; lowStockItems: number; lowStockNames: string[] };
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
  return Math.max(20, Math.min(100, Math.round(score)));
}
function riskLevel(score: number): { label: string; color: string } {
  if (score >= 75) return { label: "Low", color: "#10b981" };
  if (score >= 55) return { label: "Medium", color: "#f59e0b" };
  return { label: "High", color: "#ef4444" };
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

  // Chat state
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

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
      content: "👋 Hi! I'm **Finova AI** — your financial intelligence assistant.\n\nI can see your real business data and help you with:\n• Revenue & expense analysis\n• Cash flow forecasting\n• Invoice & customer insights\n• Inventory intelligence\n• Business recommendations\n\nWhat would you like to know?",
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
      .then(r => r.json())
      .then(d => { setRecommendations(d.recommendations || []); setLoadingRecs(false); })
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
      .then(r => r.json())
      .then(d => {
        setForecast({
          text: d.forecast || "",
          projections: d.projections || {},
          chartData: d.chartData || [],
        });
        setLoadingForecast(false);
      })
      .catch(() => setLoadingForecast(false));
  }

  function loadReport() {
    if (report || loadingReport) return;
    setLoadingReport(true);
    fetch("/api/ai/report", { headers: getHeaders() })
      .then(r => r.json())
      .then(d => { setReport(d); setLoadingReport(false); })
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
      window.alert(data?.message || "Reminder sent.");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to send reminder.");
    } finally {
      setSendingReminderRef(null);
    }
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

  // ── Markdown renderer (simple) ─────────────────────────────────────────────
  function renderMarkdown(text: string) {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      if (line.startsWith("# ")) return <h1 key={i} style={{ fontSize: 18, fontWeight: 800, color: "white", margin: "16px 0 8px", borderBottom: "1px solid rgba(255,255,255,.1)", paddingBottom: 8 }}>{line.slice(2)}</h1>;
      if (line.startsWith("## ")) return <h2 key={i} style={{ fontSize: 15, fontWeight: 700, color: "#a5b4fc", margin: "14px 0 6px" }}>{line.slice(3)}</h2>;
      if (line.startsWith("### ")) return <h3 key={i} style={{ fontSize: 13, fontWeight: 700, color: "#c7d2fe", margin: "10px 0 4px" }}>{line.slice(4)}</h3>;
      if (line.startsWith("• ") || line.startsWith("- ")) return <div key={i} style={{ paddingLeft: 16, color: "rgba(255,255,255,.8)", fontSize: 13, lineHeight: 1.7, display: "flex", gap: 8 }}><span style={{ color: "#6366f1", flexShrink: 0 }}>•</span>{line.slice(2)}</div>;
      if (line.startsWith("**") && line.endsWith("**")) return <div key={i} style={{ fontWeight: 700, color: "white", fontSize: 13, margin: "4px 0" }}>{line.slice(2, -2)}</div>;
      if (line.trim() === "") return <div key={i} style={{ height: 8 }} />;
      // Inline bold
      const boldProcessed = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return <div key={i} dangerouslySetInnerHTML={{ __html: boldProcessed }} style={{ color: "rgba(255,255,255,.75)", fontSize: 13, lineHeight: 1.7 }} />;
    });
  }

  // ── Loading screen ─────────────────────────────────────────────────────────
  const score = ctx ? healthScore(ctx) : 0;
  const risk = riskLevel(score);
  const currency = ctx?.company.currency || "PKR";
  const companyInitial = ctx?.company.name?.trim()?.charAt(0)?.toUpperCase() || "U";
  const aiProviderLabel = "OpenAI · gpt-4o-mini";

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
  ];

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "white", padding: "0 0 40px" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        .ai-tab { background:none; border:none; cursor:pointer; font-family:inherit; padding:10px 18px; border-radius:10px; font-size:13px; font-weight:600; transition:all .2s; color:rgba(255,255,255,.45); white-space:nowrap; }
        .ai-tab.active { background:rgba(99,102,241,.18); color:#a5b4fc; border:1px solid rgba(99,102,241,.3); }
        .ai-tab:hover:not(.active) { background:rgba(255,255,255,.06); color:rgba(255,255,255,.8); }
        .kpi-card { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:16px; padding:20px 22px; transition:all .2s; }
        .kpi-card:hover { border-color:rgba(99,102,241,.3); background:rgba(99,102,241,.06); }
        .q-pill { background:rgba(99,102,241,.1); border:1px solid rgba(99,102,241,.22); color:#c7d2fe; border-radius:999px; padding:8px 14px; font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; transition:all .2s; text-align:left; }
        .q-pill:hover { background:rgba(99,102,241,.18); color:#ffffff; border-color:rgba(99,102,241,.36); transform:translateY(-1px); }
        .chat-shell { background:radial-gradient(circle at top right, rgba(99,102,241,.12), transparent 36%), linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.02)); border:1px solid rgba(255,255,255,.08); border-radius:22px; overflow:hidden; }
        .chat-panel-head { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; padding:18px 18px 16px; border-bottom:1px solid rgba(255,255,255,.06); background:rgba(8,12,28,.36); }
        .chat-msg-user { background:linear-gradient(135deg,#6366f1,#4f46e5); border:1px solid rgba(165,180,252,.18); box-shadow:0 10px 28px rgba(79,70,229,.18); border-radius:20px 20px 6px 20px; padding:14px 16px; font-size:13.5px; line-height:1.68; max-width:76%; }
        .chat-msg-bot { background:linear-gradient(180deg, rgba(255,255,255,.075), rgba(255,255,255,.05)); border:1px solid rgba(255,255,255,.08); box-shadow:0 10px 24px rgba(0,0,0,.14); border-radius:20px 20px 20px 6px; padding:14px 16px; font-size:13.5px; line-height:1.68; max-width:82%; }
        .chat-role { display:block; font-size:10px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; margin-bottom:8px; opacity:.72; }
        .chat-composer { padding:14px 16px 16px; border-top:1px solid rgba(255,255,255,.06); background:rgba(8,12,28,.28); }
        .cursor-blink { display:inline-block; width:2px; height:14px; background:#6366f1; animation:pulse .8s ease infinite; margin-left:2px; vertical-align:middle; }
        .insight-block h1,h2,h3 { color:inherit }
      `}</style>

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div style={{ padding: "24px 28px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, background: "linear-gradient(135deg,#6366f1,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 20px rgba(99,102,241,.4)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: "-.3px" }}>AI Financial Intelligence</h1>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,.35)", margin: 0 }}>
                {ctx?.company.name || "Loading..."} · Powered by Finova AI
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginLeft: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", display: "inline-block", animation: "pulse 2s ease infinite" }} />
                  Live
                </span>
              </p>
            </div>
          </div>
          <button onClick={() => handleTab("report")} style={{
            padding: "9px 18px", borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#4f46e5)",
            border: "none", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 6, boxShadow: "0 4px 14px rgba(99,102,241,.35)",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
            </svg>
            Monthly Report
          </button>
        </div>
      </div>

      {/* ── Tab Bar ─────────────────────────────────────────────────────── */}
      <div style={{ padding: "16px 28px 0", display: "flex", gap: 6, overflowX: "auto", borderBottom: "1px solid rgba(255,255,255,.06)", paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.id} className={`ai-tab ${tab === t.id ? "active" : ""}`} onClick={() => handleTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────────── */}
      <div style={{ padding: "24px 28px 0" }}>

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
                </div>

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
          <div className="chat-shell" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 300px)", minHeight: 460, animation: "fadeUp .4s ease both" }}>
            <div className="chat-panel-head">
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 14, background: "linear-gradient(135deg,#6366f1,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 30px rgba(79,70,229,.24)", flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 12l10 5 10-5" />
                      <path d="M2 17l10 5 10-5" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "white" }}>Finova AI Assistant</div>
                    <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.48)" }}>
                      Ask about profit, cash flow, expenses, inventory, customers, and business performance.
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {["Financial analysis", "Live company context", "English + Urdu", "Practical actions"].map((item) => (
                    <span key={item} style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.74)", padding: "6px 10px", borderRadius: 999, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)" }}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: "right", minWidth: 160 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 999, background: "rgba(16,185,129,.1)", border: "1px solid rgba(16,185,129,.24)", color: "#86efac", fontSize: 11.5, fontWeight: 800 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                  {aiProviderLabel}
                </div>
                <div style={{ marginTop: 10, fontSize: 11.5, color: "rgba(255,255,255,.42)" }}>
                  Connected to your live company data
                </div>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "18px", display: "flex", flexDirection: "column", gap: 16 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
                  {m.role === "assistant" ? (
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                      </svg>
                    </div>
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#34d399,#059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{companyInitial}</div>
                  )}
                  <div className={m.role === "user" ? "chat-msg-user" : "chat-msg-bot"}>
                    <span className="chat-role" style={{ color: m.role === "user" ? "rgba(255,255,255,.82)" : "#a5b4fc" }}>
                      {m.role === "user" ? "You" : "Finova AI"}
                    </span>
                    {m.role === "assistant" ? (
                      <div>{renderMarkdown(m.content)}{streaming && i === messages.length - 1 && m.content && <span className="cursor-blink" />}</div>
                    ) : (
                      <span>{m.content}</span>
                    )}
                  </div>
                </div>
              ))}
              {chatLoading && messages[messages.length - 1]?.content === "" && (
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
                  </div>
                  <div className="chat-msg-bot" style={{ display: "flex", gap: 5, alignItems: "center" }}>
                    {[0, 1, 2].map(j => <div key={j} style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(99,102,241,.6)", animation: `pulse 1.2s ease ${j * .2}s infinite` }} />)}
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Quick pills */}
            {messages.length <= 1 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "0 18px 14px" }}>
                {QUICK_QUESTIONS.slice(0, 4).map(q => (
                  <button key={q} className="q-pill" onClick={() => sendChat(q)}>{q}</button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="chat-composer">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.58)" }}>Ask a business question</div>
                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.38)" }}>Examples: profit, late payments, stock, cash flow, top customers</div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", background: "linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.045))", border: "1px solid rgba(255,255,255,.1)", borderRadius: 16, padding: "10px 10px 10px 16px", boxShadow: "inset 0 1px 0 rgba(255,255,255,.03)" }}>
                <input
                  ref={chatInputRef}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                  placeholder="Ask about your finances… (Urdu or English)"
                  style={{ flex: 1, background: "none", border: "none", color: "white", fontSize: 13.5, fontFamily: "inherit", outline: "none" }}
                />
                <button onClick={() => sendChat()} disabled={!chatInput.trim() || chatLoading} style={{
                  width: 42, height: 42, borderRadius: 12, border: "none", cursor: chatInput.trim() && !chatLoading ? "pointer" : "not-allowed",
                  background: chatInput.trim() && !chatLoading ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "rgba(255,255,255,.08)",
                  display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s", boxShadow: chatInput.trim() && !chatLoading ? "0 10px 24px rgba(79,70,229,.24)" : "none",
                }}>
                  {chatLoading ? <Spinner size={16} /> : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                  )}
                </button>
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.2)", textAlign: "center", marginTop: 7 }}>AI reads your real financial data · Verify with your accountant</div>
            </div>
          </div>
        )}

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
            {loadingReport ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 320, gap: 16, color: "rgba(255,255,255,.4)" }}>
                <Spinner size={32} />
                <div style={{ textAlign: "center" }}>
                  <div style={{ marginBottom: 4 }}>AI is generating your Monthly Financial Report…</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.25)" }}>This may take 15–30 seconds</div>
                </div>
              </div>
            ) : report ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 24 }}>📄</div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 16 }}>Monthly Financial Report</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>Generated by Finova AI · {new Date(report.generatedAt || Date.now()).toLocaleDateString("en-US", { dateStyle: "long" })}</div>
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
                      w.document.write(`<html><head><title>Monthly Report</title><style>body{font-family:sans-serif;padding:40px;line-height:1.7}h1,h2,h3{margin-top:24px}</style></head><body>${printContent.innerHTML}</body></html>`);
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
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 10 }}>Generate Monthly AI Report</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,.4)", marginBottom: 28, maxWidth: 440, margin: "0 auto 28px" }}>
                  AI will analyze all your financial data and generate a comprehensive report including revenue, expenses, profit, cash flow, risks, and recommendations.
                </div>
                <button onClick={loadReport} style={{
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

      </div>
    </div>
  );
}
