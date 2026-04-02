"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { ispBg, ispBorder, ispFont, ispMuted, ispStatusColor, mapIspConnections, mapIspPackages, todayIso } from "../_shared";

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

export default function IspConnectionsPage() {
  const packageStore = useBusinessRecords("isp_package");
  const { records, loading, create, update } = useBusinessRecords("isp_connection");
  const packages = useMemo(() => mapIspPackages(packageStore.records).filter((item) => item.status === "active"), [packageStore.records]);
  const connections = useMemo(() => mapIspConnections(records), [records]);
  const [form, setForm] = useState({ customer: "", phone: "", address: "", packageId: "", installedAt: todayIso() });

  const saveConnection = async () => {
    const customer = form.customer.trim();
    const phone = form.phone.trim();
    const address = form.address.trim();
    const selectedPackage = packages.find((item) => item.id === form.packageId);
    if (!customer || !phone || !address) return alert("Customer, phone, aur address required hain.");
    if (!selectedPackage) return alert("Active package select karein.");
    if (connections.some((item) => item.phone.trim() === phone && item.status !== "closed")) {
      return alert("Is phone ka active connection already maujood hai.");
    }
    await create({
      title: customer,
      status: "pending",
      date: form.installedAt,
      data: {
        phone,
        address,
        packageId: selectedPackage.id,
        packageName: selectedPackage.name,
      },
    });
    setForm({ customer: "", phone: "", address: "", packageId: "", installedAt: todayIso() });
  };

  return (
    <div style={{ padding: "28px 32px", color: "#fff", minHeight: "100vh", fontFamily: ispFont }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 900 }}>Connections</h1>
        <p style={{ margin: 0, color: ispMuted, fontSize: 14 }}>Customer installs, active lines, package mapping, aur suspended accounts yahan manage karein.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 18 }}>
        <div style={{ background: ispBg, border: `1px solid ${ispBorder}`, borderRadius: 18, padding: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>New Connection</div>
          <div style={{ display: "grid", gap: 12 }}>
            <input style={inputStyle} value={form.customer} onChange={(e) => setForm((p) => ({ ...p, customer: e.target.value }))} placeholder="Customer name" />
            <input style={inputStyle} value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone" />
            <textarea style={{ ...inputStyle, minHeight: 90, resize: "vertical" as const }} value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} placeholder="Installation address" />
            <select style={inputStyle} value={form.packageId} onChange={(e) => setForm((p) => ({ ...p, packageId: e.target.value }))}>
              <option value="">Select package</option>
              {packages.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <input type="date" style={inputStyle} value={form.installedAt} onChange={(e) => setForm((p) => ({ ...p, installedAt: e.target.value }))} />
            <button style={primaryButton} onClick={saveConnection}>Save Connection</button>
          </div>
        </div>

        <div style={{ background: ispBg, border: `1px solid ${ispBorder}`, borderRadius: 18, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${ispBorder}`, fontSize: 16, fontWeight: 800 }}>Connection Desk</div>
          <div style={{ display: "grid", gap: 12, padding: 18 }}>
            {!loading && connections.length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No connections yet.</div>}
            {connections.map((row) => (
              <div key={row.id} style={{ border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.03)", borderRadius: 14, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>{row.customer}</div>
                    <div style={{ fontSize: 12, color: ispMuted, marginTop: 6 }}>{row.phone} | {row.packageName}</div>
                    <div style={{ fontSize: 12, color: "#93c5fd", marginTop: 8 }}>{row.address}</div>
                  </div>
                  <span style={{ padding: "4px 10px", borderRadius: 999, background: `${ispStatusColor(row.status)}20`, color: ispStatusColor(row.status), fontSize: 12, fontWeight: 700 }}>{row.status}</span>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                  {row.status !== "active" && <button style={smallButton} onClick={() => update(row.id, { status: "active" })}>Activate</button>}
                  {row.status === "active" && <button style={smallButton} onClick={() => update(row.id, { status: "suspended" })}>Suspend</button>}
                  {row.status !== "closed" && <button style={smallButton} onClick={() => update(row.id, { status: "closed" })}>Close</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
