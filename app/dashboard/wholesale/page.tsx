"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const wholesaleBg = "rgba(255,255,255,.035)";
const wholesaleBorder = "rgba(255,255,255,.08)";
const wholesaleMuted = "rgba(255,255,255,.56)";
const wholesaleFont = "'Outfit','Inter',sans-serif";

type WholesaleWarehouse = {
  id: string;
  name: string;
  location: string;
  status: string;
  itemsCount: number;
  stockValue: number;
  capacity: number;
  capacityUsed: number;
};

type WholesaleTransfer = {
  id: string;
  item: string;
  from: string;
  to: string;
  qty: number;
  status: string;
  date: string;
};

type WholesaleSalesOrder = {
  id: string;
  orderNo: string;
  customerName: string;
  amount: number;
  status: string;
  date: string;
};

type WholesaleInvoice = {
  id: string;
  invoiceNo: string;
  date: string;
  total: number;
  customerName?: string;
  supplierName?: string;
};

type WholesalePriceList = {
  id: string;
  name: string;
  type: string;
  discount: number;
  status: string;
  itemCount: number;
};

type WholesaleCreditLimit = {
  id: string;
  customerName: string;
  limit: number;
  used: number;
  available: number;
  utilization: number;
  status: "OK" | "WARNING" | "EXCEEDED";
};

type WholesalePartyExposure = {
  id: string;
  name: string;
  city: string | null;
  phone: string | null;
  creditDays: number | null;
  creditLimit: number | null;
  receivable?: number;
  payable?: number;
};

type WholesaleControlCenter = {
  summary: {
    totalRevenue: number;
    totalPurchases: number;
    totalReceivable: number;
    totalPayable: number;
    totalSalesInvoices: number;
    totalPurchaseInvoices: number;
    totalSalesOrders: number;
    pendingSalesOrders: number;
    activeWarehouses: number;
    totalStockValue: number;
    totalSkuCoverage: number;
    activeTransfers: number;
    highUtilizationSites: number;
    activePriceLists: number;
    customersOverLimit: number;
  };
  warehouses: WholesaleWarehouse[];
  transfers: WholesaleTransfer[];
  salesOrders: WholesaleSalesOrder[];
  salesInvoices: WholesaleInvoice[];
  purchaseInvoices: WholesaleInvoice[];
  priceLists: WholesalePriceList[];
  creditLimits: WholesaleCreditLimit[];
  topCustomers: WholesalePartyExposure[];
  topSuppliers: WholesalePartyExposure[];
};

const emptyState: WholesaleControlCenter = {
  summary: {
    totalRevenue: 0,
    totalPurchases: 0,
    totalReceivable: 0,
    totalPayable: 0,
    totalSalesInvoices: 0,
    totalPurchaseInvoices: 0,
    totalSalesOrders: 0,
    pendingSalesOrders: 0,
    activeWarehouses: 0,
    totalStockValue: 0,
    totalSkuCoverage: 0,
    activeTransfers: 0,
    highUtilizationSites: 0,
    activePriceLists: 0,
    customersOverLimit: 0,
  },
  warehouses: [],
  transfers: [],
  salesOrders: [],
  salesInvoices: [],
  purchaseInvoices: [],
  priceLists: [],
  creditLimits: [],
  topCustomers: [],
  topSuppliers: [],
};

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

function formatMoney(value: number) {
  return `Rs. ${Number(value || 0).toLocaleString()}`;
}

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
}

function StatCard({ label, value, tone, sub }: { label: string; value: string | number; tone: string; sub?: string }) {
  return (
    <div style={{ background: wholesaleBg, border: `1px solid ${wholesaleBorder}`, borderRadius: 18, padding: "20px 22px" }}>
      <div style={{ fontSize: 12, color: wholesaleMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: tone }}>{value}</div>
      {sub ? <div style={{ fontSize: 12, color: "rgba(255,255,255,.42)", marginTop: 8 }}>{sub}</div> : null}
    </div>
  );
}

export default function WholesaleDashboard() {
  const [data, setData] = useState<WholesaleControlCenter>(emptyState);

  useEffect(() => {
    fetch("/api/wholesale/control-center", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((result) => {
        if (result) setData(result);
      })
      .catch(() => {});
  }, []);

  const warehouseWatchlist = useMemo(
    () => [...data.warehouses].sort((a, b) => b.stockValue - a.stockValue).slice(0, 5),
    [data.warehouses]
  );
  const transferWatchlist = useMemo(
    () => [...data.transfers].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6),
    [data.transfers]
  );
  const pricingWatchlist = useMemo(() => data.priceLists.slice(0, 6), [data.priceLists]);
  const creditWatchlist = useMemo(
    () => [...data.creditLimits].sort((a, b) => b.utilization - a.utilization).slice(0, 6),
    [data.creditLimits]
  );

  return (
    <div style={{ minHeight: "100vh", padding: "28px 32px", color: "#fff", fontFamily: wholesaleFont }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 12, color: "#fbbf24", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>
            Wholesale / Distribution
          </div>
          <h1 style={{ margin: "0 0 8px", fontSize: 30, fontWeight: 900 }}>Wholesale Command Center</h1>
          <p style={{ margin: 0, fontSize: 14, color: wholesaleMuted, maxWidth: 760 }}>
            Bulk commercial control across orders, warehouse load, pricing discipline, and customer credit exposure.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "Sales Order", href: "/dashboard/sales-order" },
            { label: "Sales Invoice", href: "/dashboard/sales-invoice" },
            { label: "Purchase Order", href: "/dashboard/purchase-order" },
            { label: "Price Lists", href: "/dashboard/price-lists" },
            { label: "Credit Limits", href: "/dashboard/credit-limits" },
            { label: "Warehouses", href: "/dashboard/warehouses" },
            { label: "Ageing", href: "/dashboard/reports/ageing" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: `1px solid ${wholesaleBorder}`,
                background: wholesaleBg,
                color: "#fde68a",
                textDecoration: "none",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 14, marginBottom: 26 }}>
        <StatCard label="Revenue" value={formatCompact(data.summary.totalRevenue)} tone="#34d399" sub={`${data.summary.totalSalesInvoices} sales invoices`} />
        <StatCard label="Purchases" value={formatCompact(data.summary.totalPurchases)} tone="#818cf8" sub={`${data.summary.totalPurchaseInvoices} purchase invoices`} />
        <StatCard label="Receivable" value={formatCompact(data.summary.totalReceivable)} tone="#f59e0b" sub="Outstanding customer exposure" />
        <StatCard label="Payable" value={formatCompact(data.summary.totalPayable)} tone="#f87171" sub="Outstanding supplier exposure" />
        <StatCard label="Stock Value" value={formatCompact(data.summary.totalStockValue)} tone="#38bdf8" sub={`${data.summary.activeWarehouses} active warehouses`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.15fr .85fr", gap: 18, marginBottom: 18 }}>
        <div style={{ background: "linear-gradient(135deg, rgba(245,158,11,.14), rgba(59,130,246,.10))", border: `1px solid ${wholesaleBorder}`, borderRadius: 20, padding: 24 }}>
          <div style={{ fontSize: 13, color: "#fde68a", fontWeight: 800, marginBottom: 12, textTransform: "uppercase", letterSpacing: ".07em" }}>
            Operating Flow
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12 }}>
            {[
              { title: "Quote & Order", body: `${data.summary.totalSalesOrders} sales orders tracked with ${data.summary.pendingSalesOrders} still pending.` },
              { title: "Procure & Receive", body: `${data.summary.totalPurchaseInvoices} purchase invoices already booked for supply continuity.` },
              { title: "Store & Move", body: `${data.summary.totalSkuCoverage.toLocaleString()} SKU coverage with ${data.summary.activeTransfers} live transfer jobs.` },
              { title: "Price & Recover", body: `${data.summary.activePriceLists} active price lists and ${data.summary.customersOverLimit} customer(s) already over limit.` },
            ].map((step, index) => (
              <div key={step.title} style={{ background: "rgba(8,12,30,.34)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: 999, background: "rgba(251,191,36,.18)", color: "#fde68a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, marginBottom: 12 }}>
                  {index + 1}
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>{step.title}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.62)", lineHeight: 1.55 }}>{step.body}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: wholesaleBg, border: `1px solid ${wholesaleBorder}`, borderRadius: 20, padding: 24 }}>
          <div style={{ fontSize: 13, color: "#93c5fd", fontWeight: 800, marginBottom: 12, textTransform: "uppercase", letterSpacing: ".07em" }}>
            Operations Snapshot
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              { label: "Warehouses live", value: data.summary.activeWarehouses, tone: "#34d399" },
              { label: "SKU coverage", value: data.summary.totalSkuCoverage.toLocaleString(), tone: "#fde68a" },
              { label: "Transfer jobs open", value: data.summary.activeTransfers, tone: "#60a5fa" },
              { label: "High utilization sites", value: data.summary.highUtilizationSites, tone: "#f59e0b" },
              { label: "Price lists active", value: data.summary.activePriceLists, tone: "#a78bfa" },
              { label: "Customers over limit", value: data.summary.customersOverLimit, tone: "#f87171" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ fontSize: 13, color: wholesaleMuted }}>{row.label}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: row.tone }}>{row.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
        <div style={{ background: wholesaleBg, border: `1px solid ${wholesaleBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#34d399", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>
            Warehouse Watchlist
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {warehouseWatchlist.length === 0 ? (
              <div style={{ color: wholesaleMuted, fontSize: 13 }}>No warehouses added yet.</div>
            ) : (
              warehouseWatchlist.map((warehouse) => {
                const utilization = warehouse.capacity > 0 ? Math.round((warehouse.capacityUsed / warehouse.capacity) * 100) : 0;
                return (
                  <div key={warehouse.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "12px 14px" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{warehouse.name}</div>
                      <div style={{ fontSize: 12, color: wholesaleMuted }}>{warehouse.location || "Unassigned"} | {warehouse.itemsCount} SKUs</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#38bdf8" }}>{formatMoney(warehouse.stockValue)}</div>
                      <div style={{ fontSize: 12, color: utilization >= 80 ? "#f59e0b" : wholesaleMuted }}>{warehouse.capacity ? `${utilization}% utilized` : warehouse.status}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div style={{ background: wholesaleBg, border: `1px solid ${wholesaleBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#f87171", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>
            Credit Watch
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {creditWatchlist.length === 0 ? (
              <div style={{ color: wholesaleMuted, fontSize: 13 }}>No customer credit limits configured yet.</div>
            ) : (
              creditWatchlist.map((row) => (
                <div key={row.id} style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{row.customerName}</div>
                      <div style={{ fontSize: 12, color: wholesaleMuted }}>{formatMoney(row.used)} used of {formatMoney(row.limit)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: row.status === "EXCEEDED" ? "#f87171" : row.status === "WARNING" ? "#f59e0b" : "#34d399" }}>
                        {row.utilization.toFixed(1)}%
                      </div>
                      <div style={{ fontSize: 12, color: wholesaleMuted }}>{row.status}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
        <div style={{ background: wholesaleBg, border: `1px solid ${wholesaleBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#60a5fa", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>
            Sales Order Desk
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {data.salesOrders.length === 0 ? (
              <div style={{ color: wholesaleMuted, fontSize: 13 }}>No sales orders posted yet.</div>
            ) : (
              data.salesOrders.slice(0, 6).map((row) => (
                <div key={row.id} style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{row.orderNo}</div>
                      <div style={{ fontSize: 12, color: wholesaleMuted }}>{row.customerName || "Customer not linked"} | {formatDate(row.date)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#60a5fa" }}>{formatMoney(row.amount)}</div>
                      <div style={{ fontSize: 12, color: wholesaleMuted }}>{row.status}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ background: wholesaleBg, border: `1px solid ${wholesaleBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#f97316", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>
            Stock Movement Desk
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {transferWatchlist.length === 0 ? (
              <div style={{ color: wholesaleMuted, fontSize: 13 }}>No stock transfers yet.</div>
            ) : (
              transferWatchlist.map((transfer) => (
                <div key={transfer.id} style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{transfer.item}</div>
                      <div style={{ fontSize: 12, color: wholesaleMuted }}>{transfer.from} {"->"} {transfer.to}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#fde68a" }}>{transfer.qty}</div>
                      <div style={{ fontSize: 12, color: transfer.status === "COMPLETED" ? "#34d399" : "#60a5fa" }}>{transfer.status}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ background: wholesaleBg, border: `1px solid ${wholesaleBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#a78bfa", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>
            Pricing Discipline
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {pricingWatchlist.length === 0 ? (
              <div style={{ color: wholesaleMuted, fontSize: 13 }}>No price lists configured yet.</div>
            ) : (
              pricingWatchlist.map((row) => (
                <div key={row.id} style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{row.name}</div>
                      <div style={{ fontSize: 12, color: wholesaleMuted }}>{row.type} | {row.itemCount} items</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#a78bfa" }}>{row.discount ? `${row.discount}%` : "Custom"}</div>
                      <div style={{ fontSize: 12, color: wholesaleMuted }}>{row.status}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ background: wholesaleBg, border: `1px solid ${wholesaleBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#34d399", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>
            Party Exposure
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {data.topCustomers.slice(0, 3).map((row) => (
              <div key={row.id} style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{row.name}</div>
                    <div style={{ fontSize: 12, color: wholesaleMuted }}>{row.city || row.phone || "Customer account"}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#34d399" }}>{formatMoney(Number(row.receivable || 0))}</div>
                    <div style={{ fontSize: 12, color: wholesaleMuted }}>Receivable</div>
                  </div>
                </div>
              </div>
            ))}
            {data.topSuppliers.slice(0, 3).map((row) => (
              <div key={row.id} style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{row.name}</div>
                    <div style={{ fontSize: 12, color: wholesaleMuted }}>{row.city || row.phone || "Supplier account"}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#f87171" }}>{formatMoney(Number(row.payable || 0))}</div>
                    <div style={{ fontSize: 12, color: wholesaleMuted }}>Payable</div>
                  </div>
                </div>
              </div>
            ))}
            {data.topCustomers.length === 0 && data.topSuppliers.length === 0 ? (
              <div style={{ color: wholesaleMuted, fontSize: 13 }}>No customer or supplier exposure to show yet.</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
