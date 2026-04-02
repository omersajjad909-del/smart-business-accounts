import type { BusinessRecord } from "@/lib/useBusinessRecords";

export const ispFont = "'Outfit','Inter',sans-serif";
export const ispBg = "rgba(255,255,255,.03)";
export const ispBorder = "rgba(255,255,255,.07)";
export const ispMuted = "rgba(255,255,255,.56)";

export type IspPackageStatus = "active" | "draft" | "retired";
export type IspConnectionStatus = "pending" | "active" | "suspended" | "closed";
export type IspBillStatus = "generated" | "paid" | "overdue" | "waived";
export type IspTicketStatus = "open" | "assigned" | "resolved" | "closed";

export type IspPackage = {
  id: string;
  name: string;
  speed: string;
  quota: string;
  price: number;
  status: IspPackageStatus;
};

export type IspConnection = {
  id: string;
  customer: string;
  phone: string;
  packageId: string;
  packageName: string;
  address: string;
  status: IspConnectionStatus;
  installedAt: string;
};

export type IspBill = {
  id: string;
  invoiceNo: string;
  customer: string;
  connectionId: string;
  amount: number;
  dueDate: string;
  status: IspBillStatus;
  cycle: string;
};

export type IspTicket = {
  id: string;
  customer: string;
  issue: string;
  connectionId: string;
  priority: string;
  status: IspTicketStatus;
  openedAt: string;
};

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function mapIspPackages(records: BusinessRecord[]): IspPackage[] {
  return records.map((record) => ({
    id: record.id,
    name: record.title,
    speed: String(record.data?.speed || ""),
    quota: String(record.data?.quota || "Unlimited"),
    price: Number(record.amount || 0),
    status: (record.status as IspPackageStatus) || "active",
  }));
}

export function mapIspConnections(records: BusinessRecord[]): IspConnection[] {
  return records.map((record) => ({
    id: record.id,
    customer: record.title,
    phone: String(record.data?.phone || ""),
    packageId: String(record.data?.packageId || ""),
    packageName: String(record.data?.packageName || ""),
    address: String(record.data?.address || ""),
    status: (record.status as IspConnectionStatus) || "pending",
    installedAt: String(record.date || record.data?.installedAt || todayIso()),
  }));
}

export function mapIspBills(records: BusinessRecord[]): IspBill[] {
  return records.map((record) => ({
    id: record.id,
    invoiceNo: String(record.data?.invoiceNo || `BILL-${record.id.slice(-6).toUpperCase()}`),
    customer: record.title,
    connectionId: String(record.data?.connectionId || ""),
    amount: Number(record.amount || 0),
    dueDate: String(record.data?.dueDate || todayIso()),
    status: (record.status as IspBillStatus) || "generated",
    cycle: String(record.data?.cycle || ""),
  }));
}

export function mapIspTickets(records: BusinessRecord[]): IspTicket[] {
  return records.map((record) => ({
    id: record.id,
    customer: record.title,
    issue: String(record.data?.issue || ""),
    connectionId: String(record.data?.connectionId || ""),
    priority: String(record.data?.priority || "Normal"),
    status: (record.status as IspTicketStatus) || "open",
    openedAt: String(record.date || record.data?.openedAt || todayIso()),
  }));
}

export function ispStatusColor(status: string) {
  const colors: Record<string, string> = {
    active: "#34d399",
    draft: "#f59e0b",
    retired: "#6b7280",
    pending: "#60a5fa",
    suspended: "#f97316",
    closed: "#6b7280",
    generated: "#818cf8",
    paid: "#34d399",
    overdue: "#ef4444",
    waived: "#fbbf24",
    open: "#60a5fa",
    assigned: "#c084fc",
    resolved: "#34d399",
  };
  return colors[status] || "#a78bfa";
}
