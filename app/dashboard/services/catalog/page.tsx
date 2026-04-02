"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { mapServiceCatalogRecord } from "../_shared";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";

export default function ServiceCatalogPage() {
  const store = useBusinessRecords("service_catalog");
  const services = useMemo(() => store.records.map(mapServiceCatalogRecord), [store.records]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", billingType: "fixed", rate: 0, turnaroundDays: 7, scope: "" });

  async function save() {
    if (!form.name) return;
    await store.create({
      title: form.name,
      status: "active",
      amount: form.rate,
      data: { billingType: form.billingType, turnaroundDays: form.turnaroundDays, scope: form.scope },
    });
    setShowModal(false);
    setForm({ name: "", billingType: "fixed", rate: 0, turnaroundDays: 7, scope: "" });
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Service Catalog</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.42)", margin: 0 }}>Define service lines, rates, and expected turnaround.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#34d399", color: "#fff", fontWeight: 700, cursor: "pointer" }}>+ Add Service</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
        {services.map((service) => (
          <div key={service.id} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{service.name}</div>
            <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,.45)" }}>{service.scope || "No scope added"}</div>
            <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "#38bdf8" }}>{service.billingType}</span>
              <span style={{ color: "#22c55e", fontWeight: 700 }}>Rs. {service.rate.toLocaleString()}</span>
            </div>
            <div style={{ marginTop: 6, fontSize: 11, color: "rgba(255,255,255,.4)" }}>TAT: {service.turnaroundDays} days</div>
          </div>
        ))}
        {!store.loading && services.length === 0 && <div style={{ color: "rgba(255,255,255,.3)" }}>No services configured yet.</div>}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 520, background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 28 }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 700 }}>New Service</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "rgba(255,255,255,.45)" }}>Service Name</label>
                <input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "rgba(255,255,255,.45)" }}>Billing Type</label>
                <select value={form.billingType} onChange={(e) => setForm((current) => ({ ...current, billingType: e.target.value }))} style={{ width: "100%", background: "#161b27", border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff" }}>
                  <option value="fixed">Fixed Fee</option>
                  <option value="hourly">Hourly</option>
                  <option value="retainer">Retainer</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "rgba(255,255,255,.45)" }}>Rate</label>
                <input type="number" value={form.rate} onChange={(e) => setForm((current) => ({ ...current, rate: Number(e.target.value) }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "rgba(255,255,255,.45)" }}>Turnaround Days</label>
                <input type="number" value={form.turnaroundDays} onChange={(e) => setForm((current) => ({ ...current, turnaroundDays: Number(e.target.value) }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "rgba(255,255,255,.45)" }}>Scope</label>
                <textarea value={form.scope} onChange={(e) => setForm((current) => ({ ...current, scope: e.target.value }))} rows={4} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box", resize: "vertical" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#34d399", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, cursor: "pointer" }}>Save</button>
              <button onClick={() => setShowModal(false)} style={{ padding: "11px 24px", borderRadius: 8, border: `1px solid ${border}`, background: "transparent", color: "rgba(255,255,255,.65)", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
