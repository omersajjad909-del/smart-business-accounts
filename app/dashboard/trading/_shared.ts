export const tradingFont = "'Outfit','Inter',sans-serif";
export const tradingBg = "rgba(255,255,255,0.03)";
export const tradingBorder = "rgba(255,255,255,0.07)";
export const tradingMuted = "rgba(255,255,255,.45)";

export type DashboardSummary = {
  sales?: number;
  purchases?: number;
  profit?: number;
  customers?: number;
  overdueReceivables?: number;
  overdueReceivablesCount?: number;
  lowStockCount?: number;
};

export type AccountLite = {
  id: string;
  code?: string;
  name: string;
  partyType?: string | null;
  city?: string | null;
  phone?: string | null;
  openDebit?: number | null;
  openCredit?: number | null;
  creditDays?: number | null;
  creditLimit?: number | null;
};

export type QuotationLite = {
  id: string;
  quotationNo: string;
  date: string;
  customerName?: string | null;
  customer?: { name?: string | null } | null;
  total?: number | null;
  status?: string | null;
};

export type SalesInvoiceLite = {
  id: string;
  invoiceNo: string;
  customerName?: string;
  date: string;
  total?: number | null;
  driverName?: string | null;
  vehicleNo?: string | null;
};

export type DeliveryChallanLite = {
  id: string;
  challanNo: string;
  date: string;
  status?: string | null;
  customer?: { name?: string | null } | null;
  driverName?: string | null;
  vehicleNo?: string | null;
};

export type SaleReturnLite = {
  id: string;
  returnNo: string;
  date: string;
  total?: number | null;
  customer?: { name?: string | null } | null;
  invoice?: { invoiceNo?: string | null } | null;
};

export type PurchaseOrderLite = {
  id: string;
  poNo: string;
  date: string;
  status?: string | null;
  approvalStatus?: string | null;
  supplier?: { name?: string | null } | null;
  items?: Array<{ qty?: number | null; rate?: number | null }>;
};

export type PurchaseInvoiceLite = {
  id: string;
  invoiceNo: string;
  date: string;
  total?: number | null;
  supplier?: { name?: string | null } | null;
};

export type GrnLite = {
  id: string;
  grnNo: string;
  date: string;
  status?: string | null;
  supplier?: { name?: string | null } | null;
  po?: { poNo?: string | null } | null;
};

export type OutwardLite = {
  id: string;
  outwardNo: number;
  date: string;
  driverName?: string | null;
  vehicleNo?: string | null;
  customer?: { name?: string | null } | null;
  items?: Array<{ qty?: number | null }>;
};

export type PaymentReceiptLite = {
  id: string;
  receiptNo: string;
  date: string;
  amount?: number | null;
  paymentMode?: string | null;
  status?: string | null;
  party?: { name?: string | null } | null;
};

export type StockRow = {
  itemId: string;
  itemName: string;
  unit?: string | null;
  description?: string | null;
  stockQty: number;
  stockValue: number;
};

export function normalizeStatus(value: string | null | undefined) {
  return String(value || "").trim().toUpperCase();
}

export async function fetchJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export type TradingControlCenter = {
  summary: DashboardSummary;
  quotations: QuotationLite[];
  salesInvoices: SalesInvoiceLite[];
  purchaseOrders: PurchaseOrderLite[];
  purchaseInvoices: PurchaseInvoiceLite[];
  challans: DeliveryChallanLite[];
  saleReturns: SaleReturnLite[];
  outwards: OutwardLite[];
  grns: GrnLite[];
  receipts: PaymentReceiptLite[];
  accounts: AccountLite[];
  stock: StockRow[];
};

export function formatMoney(value: number | null | undefined) {
  return `Rs. ${Number(value || 0).toLocaleString()}`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
}

export function sumLineAmount(lines: Array<{ qty?: number | null; rate?: number | null }> | undefined) {
  return (lines || []).reduce((sum, line) => sum + Number(line.qty || 0) * Number(line.rate || 0), 0);
}
