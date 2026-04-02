import type { BusinessRecord } from "@/lib/useBusinessRecords";

export const saasFont = "'Outfit','Inter',sans-serif";
export const saasBg = "rgba(255,255,255,.03)";
export const saasBorder = "rgba(255,255,255,.07)";
export const saasMuted = "rgba(255,255,255,.56)";

export type SaaSPlanStatus = "active" | "draft" | "retired";
export type SaaSSubscriberStatus = "trial" | "active" | "past_due" | "cancelled";
export type SaaSBillingStatus = "scheduled" | "generated" | "paid" | "failed";

export type SaaSPlan = {
  id: string;
  planCode: string;
  name: string;
  interval: string;
  price: number;
  trialDays: number;
  seats: number;
  status: SaaSPlanStatus;
  subscribers: number;
};

export type SaaSSubscriber = {
  id: string;
  company: string;
  contact: string;
  email: string;
  planId: string;
  planName: string;
  interval: string;
  amount: number;
  status: SaaSSubscriberStatus;
  renewalDate: string;
  joinedAt: string;
};

export type SaaSBillingRun = {
  id: string;
  invoiceNo: string;
  subscriberId: string;
  company: string;
  planName: string;
  amount: number;
  dueDate: string;
  paidAt: string;
  status: SaaSBillingStatus;
};

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function addBillingCycle(base: string, interval: string) {
  const next = new Date(base || todayIso());
  if (interval === "Yearly") next.setFullYear(next.getFullYear() + 1);
  else if (interval === "Quarterly") next.setMonth(next.getMonth() + 3);
  else next.setMonth(next.getMonth() + 1);
  return next.toISOString().slice(0, 10);
}

export function formatMoney(value: number) {
  return `$${value.toLocaleString()}`;
}

export function mapSaaSPlans(records: BusinessRecord[]): SaaSPlan[] {
  return records.map((record) => ({
    id: record.id,
    planCode: String(record.data?.planCode || `PLAN-${record.id.slice(-4).toUpperCase()}`),
    name: record.title,
    interval: String(record.data?.interval || "Monthly"),
    price: Number(record.amount || 0),
    trialDays: Number(record.data?.trialDays || 0),
    seats: Number(record.data?.seats || 1),
    status: (record.status as SaaSPlanStatus) || "active",
    subscribers: Number(record.data?.subscribers || 0),
  }));
}

export function mapSaaSSubscribers(records: BusinessRecord[]): SaaSSubscriber[] {
  return records.map((record) => ({
    id: record.id,
    company: record.title,
    contact: String(record.data?.contact || ""),
    email: String(record.data?.email || ""),
    planId: String(record.data?.planId || ""),
    planName: String(record.data?.planName || ""),
    interval: String(record.data?.interval || "Monthly"),
    amount: Number(record.amount || 0),
    status: (record.status as SaaSSubscriberStatus) || "trial",
    renewalDate: String(record.data?.renewalDate || todayIso()),
    joinedAt: String(record.date || record.data?.joinedAt || todayIso()),
  }));
}

export function mapSaaSBillingRuns(records: BusinessRecord[]): SaaSBillingRun[] {
  return records.map((record) => ({
    id: record.id,
    invoiceNo: String(record.data?.invoiceNo || `INV-${record.id.slice(-6).toUpperCase()}`),
    subscriberId: String(record.data?.subscriberId || ""),
    company: record.title,
    planName: String(record.data?.planName || ""),
    amount: Number(record.amount || 0),
    dueDate: String(record.data?.dueDate || todayIso()),
    paidAt: String(record.data?.paidAt || ""),
    status: (record.status as SaaSBillingStatus) || "scheduled",
  }));
}

export function saasStatusColor(status: string) {
  const colors: Record<string, string> = {
    active: "#34d399",
    draft: "#f59e0b",
    retired: "#6b7280",
    trial: "#60a5fa",
    past_due: "#f97316",
    cancelled: "#f87171",
    scheduled: "#818cf8",
    generated: "#38bdf8",
    paid: "#34d399",
    failed: "#ef4444",
  };
  return colors[status] || "#a78bfa";
}
