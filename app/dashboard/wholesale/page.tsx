"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useBusinessRecords, type BusinessRecord } from "@/lib/useBusinessRecords";

const wholesaleBg = "rgba(255,255,255,.035)";
const wholesaleBorder = "rgba(255,255,255,.08)";
const wholesaleMuted = "rgba(255,255,255,.56)";
const wholesaleFont = "'Outfit','Inter',sans-serif";

type Summary = {
  totalRevenue?: number;
  totalPurchases?: number;
  totalReceivable?: number;
  totalPayable?: number;
};

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

function formatMoney(value: number) {
  return `Rs. ${value.toLocaleString()}`;
}

function mapWarehouse(record: BusinessRecord) {
  return {
    id: record.id,
    name: record.title,
    location: (record.data.location as string) || "Unassigned",
    status: record.status || "ACTIVE",
    itemsCount: Number(record.data.itemsCount || 0),
    stockValue: Number(record.amount || 0),
    capacity: Number(record.data.capacity || 0),
    capacityUsed: Number(record.data.capacityUsed || 0),
  };
}

function mapTransfer(record: BusinessRecord) {
  return {
    id: record.id,
    item: (record.data.item as string) || record.title,
    from: (record.data.from as string) || "Unknown",
    to: (record.data.to as string) || "Unknown",
    qty: Number(record.data.qty || 0),
    status: record.status || "COMPLETED",
    date: record.date || record.createdAt,
  };
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
  const warehouseStore = useBusinessRecords("warehouse");
  const transferStore = useBusinessRecords("stock_transfer");
  const [summary, setSummary] = useState<Summary>({});

  useEffect(() => {
    let active = true;
    fetch("/api/reports/dashboard-summary")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        setSummary({
          totalRevenue: Number(data.totalRevenue || 0),
          totalPurchases: Number(data.totalPurchases || 0),
          totalReceivable: Number(data.totalReceivable || 0),
          totalPayable: Number(data.totalPayable || 0),
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const warehouses = useMemo(() => warehouseStore.records.map(mapWarehouse), [warehouseStore.records]);
  const transfers = useMemo(() => transferStore.records.map(mapTransfer), [transferStore.records]);

  const activeWarehouses = warehouses.filter((row) => row.status === "ACTIVE").length;
  const totalStockValue = warehouses.reduce((sum, row) => sum + row.stockValue, 0);
  const totalSkuCoverage = warehouses.reduce((sum, row) => sum + row.itemsCount, 0);
  const activeTransfers = transfers.filter((row) => row.status === "PENDING" || row.status === "IN_TRANSIT").length;
  const highUtilization = warehouses.filter((row) => row.capacity > 0 && row.capacityUsed / row.capacity >= 0.8).length;

  const warehouseWatchlist = [...warehouses]
    .sort((a, b) => b.stockValue - a.stockValue)
    .slice(0, 5);

  const transferWatchlist = [...transfers]
    .sort((a, b) => new Date(b.date || "").getTime() - new Date(a.date || "").getTime())
    .slice(0, 6);

  return (
    <div style={{ minHeight: "100vh", padding: "28px 32px", color: "#fff", fontFamily: wholesaleFont }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 12, color: "#fbbf24", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>
            Wholesale / Distribution
          </div>
          <h1 style={{ margin: "0 0 8px", fontSize: 30, fontWeight: 900 }}>Wholesale Command Center</h1>
          <p style={{ margin: 0, fontSize: 14, color: wholesaleMuted, maxWidth: 760 }}>
            Procurement, warehousing, bulk sales, and receivable pressure in one live overview for high-volume trading teams.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "Sales Invoice", href: "/dashboard/sales-invoice" },
            { label: "Purchase Order", href: "/dashboard/purchase-order" },
            { label: "Inventory", href: "/dashboard/inventory" },
            { label: "Warehouses", href: "/dashboard/warehouses" },
            { label: "Parties", href: "/dashboard/parties" },
            { label: "Stock Report", href: "/dashboard/stock-report" },
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
        <StatCard label="Revenue" value={formatCompact(summary.totalRevenue || 0)} tone="#34d399" sub="This month" />
        <StatCard label="Purchases" value={formatCompact(summary.totalPurchases || 0)} tone="#818cf8" sub="This month" />
        <StatCard label="Receivable" value={formatCompact(summary.totalReceivable || 0)} tone="#f59e0b" sub="Outstanding" />
        <StatCard label="Payable" value={formatCompact(summary.totalPayable || 0)} tone="#f87171" sub="Outstanding" />
        <StatCard label="Stock Value" value={formatCompact(totalStockValue)} tone="#38bdf8" sub={`${activeWarehouses} active warehouses`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.15fr .85fr", gap: 18, marginBottom: 18 }}>
        <div style={{ background: "linear-gradient(135deg, rgba(245,158,11,.14), rgba(59,130,246,.10))", border: `1px solid ${wholesaleBorder}`, borderRadius: 20, padding: 24 }}>
          <div style={{ fontSize: 13, color: "#fde68a", fontWeight: 800, marginBottom: 12, textTransform: "uppercase", letterSpacing: ".07em" }}>
            Operating Flow
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12 }}>
            {[
              { title: "Procure", body: "Purchase orders, GRN, and supplier billing stay aligned." },
              { title: "Store", body: "Warehouse capacity, stock value, and SKU spread remain visible." },
              { title: "Distribute", body: "Delivery and stock movement keep dispatch smooth." },
              { title: "Recover Cash", body: "Receivable, payable, and ageing pressure stay monitored." },
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
              { label: "Warehouses live", value: activeWarehouses, tone: "#34d399" },
              { label: "SKU coverage", value: totalSkuCoverage.toLocaleString(), tone: "#fde68a" },
              { label: "Transfer jobs open", value: activeTransfers, tone: "#60a5fa" },
              { label: "High utilization sites", value: highUtilization, tone: "#f59e0b" },
              { label: "Total stock value", value: formatMoney(totalStockValue), tone: "#38bdf8" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ fontSize: 13, color: wholesaleMuted }}>{row.label}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: row.tone }}>{row.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ background: wholesaleBg, border: `1px solid ${wholesaleBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#34d399", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>
            Warehouse Watchlist
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {warehouseWatchlist.length === 0 ? (
              <div style={{ color: wholesaleMuted, fontSize: 13 }}>No warehouses added yet. Start with warehouse setup to unlock the wholesale control view.</div>
            ) : (
              warehouseWatchlist.map((warehouse) => {
                const utilization = warehouse.capacity > 0 ? Math.round((warehouse.capacityUsed / warehouse.capacity) * 100) : 0;
                return (
                  <div key={warehouse.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "12px 14px" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{warehouse.name}</div>
                      <div style={{ fontSize: 12, color: wholesaleMuted }}>{warehouse.location} | {warehouse.itemsCount} SKUs</div>
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
            Stock Movement Desk
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {transferWatchlist.length === 0 ? (
              <div style={{ color: wholesaleMuted, fontSize: 13 }}>No stock transfers yet. Internal warehouse movement will appear here once logged.</div>
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
    </div>
  );
}
