"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  fetchJson,
  pharmacyBg,
  pharmacyBorder,
  pharmacyFont,
  pharmacyMuted,
  type PharmacyControlCenter,
} from "./_shared";

const emptyState: PharmacyControlCenter = {
  summary: { medicines: 0, lowStock: 0, expired: 0, inventoryValue: 0, pendingPrescriptions: 0, dispensedPrescriptions: 0, counterSales: 0, counterRevenue: 0, purchaseSpend: 0, activeBatches: 0 },
  drugs: [],
  prescriptions: [],
  batches: [],
  purchases: [],
  sales: [],
};

export default function PharmacyOverviewPage() {
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetchJson("/api/pharmacy/control-center", emptyState).then(setData);
  }, []);

  const { summary, prescriptions } = data;

  return (
    <div style={{ minHeight: "100vh", padding: "28px 32px", color: "#fff", fontFamily: pharmacyFont }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800 }}>Pharmacy Command Center</h1>
          <p style={{ margin: 0, fontSize: 13, color: pharmacyMuted }}>Inventory risk, prescriptions, and counter movement in one operating view.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "Inventory", href: "/dashboard/pharmacy/inventory" },
            { label: "Batches", href: "/dashboard/pharmacy/batches" },
            { label: "Purchases", href: "/dashboard/pharmacy/purchases" },
            { label: "Counter Sales", href: "/dashboard/pharmacy/counter-sales" },
            { label: "Analytics", href: "/dashboard/pharmacy/analytics" },
          ].map((item) => (
            <Link prefetch={false} key={item.href} href={item.href} style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${pharmacyBorder}`, background: pharmacyBg, color: "#fda4af", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Medicines", value: summary.medicines, color: "#fb7185" },
          { label: "Low Stock", value: summary.lowStock, color: "#f59e0b" },
          { label: "Expired", value: summary.expired, color: "#f87171" },
          { label: "Counter Revenue", value: `Rs. ${summary.counterRevenue.toLocaleString()}`, color: "#34d399" },
          { label: "Purchase Spend", value: `Rs. ${summary.purchaseSpend.toLocaleString()}`, color: "#60a5fa" },
        ].map((card) => (
          <div key={card.label} style={{ background: pharmacyBg, border: `1px solid ${pharmacyBorder}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: pharmacyMuted, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 18 }}>
        <div style={{ background: pharmacyBg, border: `1px solid ${pharmacyBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${pharmacyBorder}`, fontSize: 15, fontWeight: 800 }}>Prescription Watchlist</div>
          <div style={{ padding: 18, display: "grid", gap: 10 }}>
            {prescriptions.filter((row) => row.status !== "dispensed").slice(0, 6).map((row) => (
              <div key={row.id} style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{row.patient}</div>
                <div style={{ fontSize: 12, color: pharmacyMuted, marginTop: 4 }}>Dr. {row.doctor} | {row.date || "No date"}</div>
                <div style={{ fontSize: 12, color: "#fda4af", marginTop: 6 }}>{row.drugs}</div>
              </div>
            ))}
            {prescriptions.filter((row) => row.status !== "dispensed").length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No pending prescriptions right now.</div>}
          </div>
        </div>

        <div style={{ background: pharmacyBg, border: `1px solid ${pharmacyBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${pharmacyBorder}`, fontSize: 15, fontWeight: 800 }}>Operations Snapshot</div>
          <div style={{ padding: 18, display: "grid", gap: 10 }}>
            {[
              { label: "Inventory value", value: `Rs. ${summary.inventoryValue.toLocaleString()}`, color: "#60a5fa" },
              { label: "Dispensed prescriptions", value: summary.dispensedPrescriptions, color: "#34d399" },
              { label: "Pending prescriptions", value: summary.pendingPrescriptions, color: "#f59e0b" },
              { label: "Counter sales", value: summary.counterSales, color: "#fb7185" },
              { label: "Active batches", value: summary.activeBatches, color: "#c084fc" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13, color: pharmacyMuted }}>{row.label}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
