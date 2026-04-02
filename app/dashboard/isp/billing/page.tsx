"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { ispBg, ispBorder, ispFont, ispMuted, ispStatusColor, mapIspBills, mapIspConnections, mapIspPackages, todayIso } from "../_shared";

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

export default function IspBillingPage() {
  const connectionStore = useBusinessRecords("isp_connection");
  const packageStore = useBusinessRecords("isp_package");
  const { records, loading, create, update } = useBusinessRecords("isp_bill");
  const connections = useMemo(() => mapIspConnections(connectionStore.records).filter((item) => item.status === "active" || item.status === "suspended"), [connectionStore.records]);
  const packages = useMemo(() => mapIspPackages(packageStore.records), [packageStore.records]);
  const bills = useMemo(() => mapIspBills(records), [records]);
  const [connectionId, setConnectionId] = useState("");

  const generateBill = async () => {
    const connection = connections.find((item) => item.id === connectionId);
    if (!connection) return alert("Connection select karein.");
    if (bills.some((item) => item.connectionId === connection.id && item.status !== "paid" && item.status !== "waived")) {
      return alert("Is connection ka open bill already maujood hai.");
    }
    const pack = packages.find((item) => item.id === connection.packageId);
    const amount = Number(pack?.price || 0);
    if (amount <= 0) return alert("Assigned package price valid nahi hai.");
    await create({
      title: connection.customer,
      status: "generated",
      amount,
      date: todayIso(),
      data: {
        connectionId: connection.id,
        invoiceNo: `ISP-${String(bills.length + 1).padStart(4, "0")}`,
        dueDate: todayIso(),
        cycle: new Date().toLocaleString("en-US", { month: "short", year: "numeric" }),
      },
    });
    setConnectionId("");
  };

  return (
    <div style={{ padding: "28px 32px", color: "#fff", minHeight: "100vh", fontFamily: ispFont }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 900 }}>Monthly Bills</h1>
        <p style={{ margin: 0, color: ispMuted, fontSize: 14 }}>Cycle-wise bill generation, overdue recovery, aur paid collections yahan manage karein.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 18 }}>
        <div style={{ background: ispBg, border: `1px solid ${ispBorder}`, borderRadius: 18, padding: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>Generate Monthly Bill</div>
          <select style={inputStyle} value={connectionId} onChange={(e) => setConnectionId(e.target.value)}>
            <option value="">Select connection</option>
            {connections.map((item) => <option key={item.id} value={item.id}>{item.customer} - {item.packageName}</option>)}
          </select>
          <button style={{ ...primaryButton, marginTop: 12, width: "100%" }} onClick={generateBill}>Generate Bill</button>
        </div>

        <div style={{ background: ispBg, border: `1px solid ${ispBorder}`, borderRadius: 18, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${ispBorder}`, fontSize: 16, fontWeight: 800 }}>Billing Desk</div>
          <div style={{ display: "grid", gap: 12, padding: 18 }}>
            {!loading && bills.length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No bills generated yet.</div>}
            {bills.map((row) => (
              <div key={row.id} style={{ border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.03)", borderRadius: 14, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>{row.invoiceNo}</div>
                    <div style={{ fontSize: 12, color: ispMuted, marginTop: 6 }}>{row.customer} | {row.cycle}</div>
                    <div style={{ fontSize: 12, color: "#93c5fd", marginTop: 8 }}>Due {row.dueDate}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "#34d399" }}>Rs. {row.amount.toLocaleString()}</div>
                    <span style={{ padding: "4px 10px", borderRadius: 999, background: `${ispStatusColor(row.status)}20`, color: ispStatusColor(row.status), fontSize: 12, fontWeight: 700 }}>{row.status}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  {row.status !== "paid" && <button style={smallButton} onClick={() => update(row.id, { status: "paid" })}>Mark Paid</button>}
                  {row.status !== "overdue" && row.status !== "paid" && <button style={smallButton} onClick={() => update(row.id, { status: "overdue" })}>Mark Overdue</button>}
                  {row.status !== "waived" && row.status !== "paid" && <button style={smallButton} onClick={() => update(row.id, { status: "waived" })}>Waive</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
