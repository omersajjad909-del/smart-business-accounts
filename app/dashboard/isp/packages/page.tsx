import toast from "react-hot-toast";
"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { ispBg, ispBorder, ispFont, ispMuted, ispStatusColor, mapIspPackages } from "../_shared";

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

export default function IspPackagesPage() {
  const { records, loading, create, update } = useBusinessRecords("isp_package");
  const packages = useMemo(() => mapIspPackages(records), [records]);
  const [form, setForm] = useState({ name: "", speed: "", quota: "Unlimited", price: "" });

  const savePackage = async () => {
    const name = form.name.trim();
    const speed = form.speed.trim();
    const quota = form.quota.trim();
    const price = Number(form.price);
    if (!name || !speed) return toast.error("Package name aur speed required hain.");
    if (price <= 0) return toast("Package price valid honi chahiye.");
    if (packages.some((item) => item.name.trim().toLowerCase() === name.toLowerCase() && item.status !== "retired")) {
      return toast.error("Is naam ka package already maujood hai.");
    }
    await create({ title: name, status: "active", amount: price, data: { speed, quota } });
    setForm({ name: "", speed: "", quota: "Unlimited", price: "" });
  };

  return (
    <div style={{ padding: "28px 32px", color: "#fff", minHeight: "100vh", fontFamily: ispFont }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 900 }}>Packages</h1>
        <p style={{ margin: 0, color: ispMuted, fontSize: 14 }}>Bandwidth plans, monthly prices, aur quota structure ko yahan define karein.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 18 }}>
        <div style={{ background: ispBg, border: `1px solid ${ispBorder}`, borderRadius: 18, padding: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>New Package</div>
          <div style={{ display: "grid", gap: 12 }}>
            <input style={inputStyle} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Package name" />
            <input style={inputStyle} value={form.speed} onChange={(e) => setForm((p) => ({ ...p, speed: e.target.value }))} placeholder="Speed e.g. 20 Mbps" />
            <input style={inputStyle} value={form.quota} onChange={(e) => setForm((p) => ({ ...p, quota: e.target.value }))} placeholder="Quota" />
            <input style={inputStyle} value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} placeholder="Monthly price" />
            <button style={primaryButton} onClick={savePackage}>Save Package</button>
          </div>
        </div>

        <div style={{ background: ispBg, border: `1px solid ${ispBorder}`, borderRadius: 18, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${ispBorder}`, fontSize: 16, fontWeight: 800 }}>Package Catalog</div>
          <div style={{ display: "grid", gap: 12, padding: 18 }}>
            {!loading && packages.length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No packages yet.</div>}
            {packages.map((row) => (
              <div key={row.id} style={{ border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.03)", borderRadius: 14, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>{row.name}</div>
                    <div style={{ fontSize: 12, color: ispMuted, marginTop: 6 }}>{row.speed} | {row.quota}</div>
                    <div style={{ fontSize: 12, color: "#93c5fd", marginTop: 8 }}>Rs. {row.price.toLocaleString()} / month</div>
                  </div>
                  <span style={{ padding: "4px 10px", borderRadius: 999, background: `${ispStatusColor(row.status)}20`, color: ispStatusColor(row.status), fontSize: 12, fontWeight: 700 }}>{row.status}</span>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  {row.status === "active" && <button style={smallButton} onClick={() => update(row.id, { status: "retired" })}>Retire</button>}
                  {row.status !== "active" && <button style={smallButton} onClick={() => update(row.id, { status: "active" })}>Activate</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
