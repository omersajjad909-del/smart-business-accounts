"use client";

import { useMemo } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  mapCounterSaleRecords,
  mapDrugRecords,
  mapPrescriptionRecords,
  pharmacyBg,
  pharmacyBorder,
  pharmacyFont,
  pharmacyMuted,
} from "../_shared";

export default function PharmacyAnalyticsPage() {
  const inventoryStore = useBusinessRecords("drug");
  const prescriptionStore = useBusinessRecords("pharmacy_prescription");
  const salesStore = useBusinessRecords("pharmacy_sale");

  const drugs = useMemo(() => mapDrugRecords(inventoryStore.records), [inventoryStore.records]);
  const prescriptions = useMemo(() => mapPrescriptionRecords(prescriptionStore.records), [prescriptionStore.records]);
  const sales = useMemo(() => mapCounterSaleRecords(salesStore.records), [salesStore.records]);

  const categoryRows = useMemo(() => {
    const bucket = new Map<string, { stock: number; value: number }>();
    drugs.forEach((drug) => {
      const current = bucket.get(drug.category) || { stock: 0, value: 0 };
      current.stock += drug.stock;
      current.value += drug.stock * drug.unitPrice;
      bucket.set(drug.category, current);
    });
    return [...bucket.entries()].map(([category, values]) => ({ category, ...values })).sort((a, b) => b.value - a.value);
  }, [drugs]);

  const demandRows = useMemo(() => {
    const bucket = new Map<string, number>();
    prescriptions.forEach((prescription) => {
      prescription.drugs.split(",").map((item) => item.trim()).filter(Boolean).forEach((name) => {
        bucket.set(name, (bucket.get(name) || 0) + 1);
      });
    });
    return [...bucket.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [prescriptions]);

  const paymentRows = useMemo(() => {
    const bucket = new Map<string, number>();
    sales.forEach((sale) => bucket.set(sale.paymentMethod, (bucket.get(sale.paymentMethod) || 0) + sale.amount));
    return [...bucket.entries()].map(([method, amount]) => ({ method, amount })).sort((a, b) => b.amount - a.amount);
  }, [sales]);

  return (
    <div style={{ minHeight: "100vh", padding: "28px 32px", color: "#fff", fontFamily: pharmacyFont }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800 }}>Pharmacy Analytics</h1>
        <p style={{ margin: 0, fontSize: 13, color: pharmacyMuted }}>Inventory composition, prescription demand, and sales mix.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total Stock Units", value: drugs.reduce((sum, row) => sum + row.stock, 0), color: "#fb7185" },
          { label: "Inventory Value", value: `Rs. ${drugs.reduce((sum, row) => sum + row.stock * row.unitPrice, 0).toLocaleString()}`, color: "#34d399" },
          { label: "Expired Lines", value: drugs.filter((row) => row.isExpired).length, color: "#f87171" },
          { label: "Prescription Volume", value: prescriptions.length, color: "#60a5fa" },
        ].map((card) => (
          <div key={card.label} style={{ background: pharmacyBg, border: `1px solid ${pharmacyBorder}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: pharmacyMuted, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>
        <section style={{ background: pharmacyBg, border: `1px solid ${pharmacyBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${pharmacyBorder}`, fontSize: 15, fontWeight: 800 }}>Category Mix</div>
          <div style={{ padding: 18, display: "grid", gap: 10 }}>
            {categoryRows.slice(0, 6).map((row) => (
              <div key={row.category} style={{ display: "grid", gap: 4, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{row.category}</div>
                <div style={{ fontSize: 12, color: pharmacyMuted }}>Stock {row.stock} | Value Rs. {row.value.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: pharmacyBg, border: `1px solid ${pharmacyBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${pharmacyBorder}`, fontSize: 15, fontWeight: 800 }}>Prescription Demand</div>
          <div style={{ padding: 18, display: "grid", gap: 10 }}>
            {demandRows.map((row) => (
              <div key={row.name} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13 }}>{row.name}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#f59e0b" }}>{row.count}</span>
              </div>
            ))}
            {demandRows.length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No prescription data available.</div>}
          </div>
        </section>

        <section style={{ background: pharmacyBg, border: `1px solid ${pharmacyBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${pharmacyBorder}`, fontSize: 15, fontWeight: 800 }}>Payment Mix</div>
          <div style={{ padding: 18, display: "grid", gap: 10 }}>
            {paymentRows.map((row) => (
              <div key={row.method} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13, textTransform: "capitalize" }}>{row.method}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#34d399" }}>Rs. {row.amount.toLocaleString()}</span>
              </div>
            ))}
            {paymentRows.length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No counter sales recorded yet.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
