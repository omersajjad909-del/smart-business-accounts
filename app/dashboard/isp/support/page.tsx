"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { ispBg, ispBorder, ispFont, ispMuted, ispStatusColor, mapIspConnections, mapIspTickets, todayIso } from "../_shared";

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

export default function IspSupportPage() {
  const connectionStore = useBusinessRecords("isp_connection");
  const { records, loading, create, update } = useBusinessRecords("isp_ticket");
  const connections = useMemo(() => mapIspConnections(connectionStore.records), [connectionStore.records]);
  const tickets = useMemo(() => mapIspTickets(records), [records]);
  const [form, setForm] = useState({ connectionId: "", issue: "", priority: "Normal" });

  const saveTicket = async () => {
    const connection = connections.find((item) => item.id === form.connectionId);
    if (!connection) return alert("Connection select karein.");
    if (!form.issue.trim()) return alert("Issue detail required hai.");
    if (tickets.some((item) => item.connectionId === connection.id && item.issue.trim().toLowerCase() === form.issue.trim().toLowerCase() && item.status !== "closed")) {
      return alert("Same issue ka open ticket already maujood hai.");
    }
    await create({
      title: connection.customer,
      status: "open",
      date: todayIso(),
      data: {
        connectionId: connection.id,
        issue: form.issue.trim(),
        priority: form.priority,
      },
    });
    setForm({ connectionId: "", issue: "", priority: "Normal" });
  };

  return (
    <div style={{ padding: "28px 32px", color: "#fff", minHeight: "100vh", fontFamily: ispFont }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 900 }}>Support Tickets</h1>
        <p style={{ margin: 0, color: ispMuted, fontSize: 14 }}>Service complaints, outage escalations, aur field follow-up yahan manage karein.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 18 }}>
        <div style={{ background: ispBg, border: `1px solid ${ispBorder}`, borderRadius: 18, padding: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>New Ticket</div>
          <div style={{ display: "grid", gap: 12 }}>
            <select style={inputStyle} value={form.connectionId} onChange={(e) => setForm((p) => ({ ...p, connectionId: e.target.value }))}>
              <option value="">Select connection</option>
              {connections.map((item) => <option key={item.id} value={item.id}>{item.customer}</option>)}
            </select>
            <select style={inputStyle} value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}>
              <option>Normal</option>
              <option>High</option>
              <option>Critical</option>
            </select>
            <textarea style={{ ...inputStyle, minHeight: 100, resize: "vertical" as const }} value={form.issue} onChange={(e) => setForm((p) => ({ ...p, issue: e.target.value }))} placeholder="Issue detail" />
            <button style={primaryButton} onClick={saveTicket}>Raise Ticket</button>
          </div>
        </div>

        <div style={{ background: ispBg, border: `1px solid ${ispBorder}`, borderRadius: 18, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${ispBorder}`, fontSize: 16, fontWeight: 800 }}>Support Desk</div>
          <div style={{ display: "grid", gap: 12, padding: 18 }}>
            {!loading && tickets.length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No support tickets yet.</div>}
            {tickets.map((row) => (
              <div key={row.id} style={{ border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.03)", borderRadius: 14, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>{row.customer}</div>
                    <div style={{ fontSize: 12, color: ispMuted, marginTop: 6 }}>{row.priority} priority | Opened {row.openedAt}</div>
                    <div style={{ fontSize: 12, color: "#93c5fd", marginTop: 8 }}>{row.issue}</div>
                  </div>
                  <span style={{ padding: "4px 10px", borderRadius: 999, background: `${ispStatusColor(row.status)}20`, color: ispStatusColor(row.status), fontSize: 12, fontWeight: 700 }}>{row.status}</span>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  {row.status === "open" && <button style={smallButton} onClick={() => update(row.id, { status: "assigned" })}>Assign</button>}
                  {(row.status === "open" || row.status === "assigned") && <button style={smallButton} onClick={() => update(row.id, { status: "resolved" })}>Resolve</button>}
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
