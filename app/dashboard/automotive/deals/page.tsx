import toast from "react-hot-toast";
"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { autoBg, autoBorder, autoFont, autoMuted, autoStatusColor, mapShowroomDeals, mapShowroomVehicles } from "../_shared";

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,.06)",
  border: "1px solid rgba(255,255,255,.1)",
  borderRadius: 10,
  color: "#fff",
  padding: "12px 14px",
  fontSize: 14,
};

const primaryButton: React.CSSProperties = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "12px 16px",
  fontWeight: 800,
  cursor: "pointer",
};

const smallButton: React.CSSProperties = {
  background: "rgba(37,99,235,.18)",
  color: "#bfdbfe",
  border: "1px solid rgba(96,165,250,.25)",
  borderRadius: 10,
  padding: "8px 10px",
  fontWeight: 700,
  cursor: "pointer",
};

export default function DealsPage() {
  const vehicleStore = useBusinessRecords("auto_vehicle");
  const { records, loading, create, update } = useBusinessRecords("showroom_deal");
  const vehicles = useMemo(() => mapShowroomVehicles(vehicleStore.records).filter((item) => item.status !== "Sold"), [vehicleStore.records]);
  const deals = useMemo(() => mapShowroomDeals(records), [records]);
  const [form, setForm] = useState({ customer: "", vehicleId: "", amount: "", financier: "Direct" });

  const saveDeal = async () => {
    const customer = form.customer.trim();
    const vehicle = vehicles.find((item) => item.id === form.vehicleId);
    const amount = Number(form.amount);
    if (!customer) return toast.error("Customer required hai.");
    if (!vehicle) return toast.error("Vehicle select karein.");
    if (amount <= 0) return toast("Deal amount valid honi chahiye.");
    if (deals.some((item) => item.customer.trim().toLowerCase() === customer.toLowerCase() && item.vehicleId === vehicle.id && item.status !== "lost")) {
      return toast.error("Is customer ka same vehicle ke liye active deal already hai.");
    }
    await create({
      title: customer,
      status: "lead",
      amount,
      data: {
        vehicleId: vehicle.id,
        vehicleLabel: `${vehicle.make} ${vehicle.model} ${vehicle.year}`,
        financier: form.financier.trim() || "Direct",
      },
    });
    setForm({ customer: "", vehicleId: "", amount: "", financier: "Direct" });
  };

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", color: "#fff", fontFamily: autoFont }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 900 }}>Deals & Finance</h1>
        <p style={{ margin: 0, fontSize: 14, color: autoMuted }}>Negotiation pipeline, booking value, aur financer involvement yahan manage karein.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 18 }}>
        <div style={{ background: autoBg, border: `1px solid ${autoBorder}`, borderRadius: 18, padding: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>New Deal</div>
          <div style={{ display: "grid", gap: 12 }}>
            <input style={inputStyle} value={form.customer} onChange={(e) => setForm((p) => ({ ...p, customer: e.target.value }))} placeholder="Customer name" />
            <select style={inputStyle} value={form.vehicleId} onChange={(e) => setForm((p) => ({ ...p, vehicleId: e.target.value }))}>
              <option value="">Select vehicle</option>
              {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.make} {vehicle.model} {vehicle.year}</option>)}
            </select>
            <input style={inputStyle} value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} placeholder="Deal amount" />
            <input style={inputStyle} value={form.financier} onChange={(e) => setForm((p) => ({ ...p, financier: e.target.value }))} placeholder="Financier / Direct" />
            <button style={primaryButton} onClick={saveDeal}>Save Deal</button>
          </div>
        </div>

        <div style={{ background: autoBg, border: `1px solid ${autoBorder}`, borderRadius: 18, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${autoBorder}`, fontSize: 16, fontWeight: 800 }}>Deal Pipeline</div>
          <div style={{ display: "grid", gap: 12, padding: 18 }}>
            {!loading && deals.length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No deals yet.</div>}
            {deals.map((row) => (
              <div key={row.id} style={{ border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.03)", borderRadius: 14, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>{row.customer}</div>
                    <div style={{ fontSize: 12, color: autoMuted, marginTop: 6 }}>{row.financier} | ${row.amount.toLocaleString()}</div>
                    <div style={{ fontSize: 12, color: "#93c5fd", marginTop: 8 }}>{row.vehicleLabel}</div>
                  </div>
                  <span style={{ padding: "4px 10px", borderRadius: 999, background: `${autoStatusColor(row.status)}20`, color: autoStatusColor(row.status), fontSize: 12, fontWeight: 700 }}>{row.status}</span>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                  {row.status === "lead" && <button style={smallButton} onClick={() => update(row.id, { status: "negotiation" })}>Move to Negotiation</button>}
                  {(row.status === "lead" || row.status === "negotiation") && <button style={smallButton} onClick={() => update(row.id, { status: "financed" })}>Financed</button>}
                  {row.status !== "won" && <button style={smallButton} onClick={() => update(row.id, { status: "won" })}>Win Deal</button>}
                  {row.status !== "lost" && <button style={smallButton} onClick={() => update(row.id, { status: "lost" })}>Lose Deal</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
