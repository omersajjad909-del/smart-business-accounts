import toast from "react-hot-toast";
"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { mapServiceDeliveryRecord, mapServiceProjectRecord } from "../_shared";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";

export default function ServiceDeliveryPage() {
  const deliveryStore = useBusinessRecords("service_delivery");
  const projectStore = useBusinessRecords("service_project");
  const deliveries = useMemo(() => deliveryStore.records.map(mapServiceDeliveryRecord), [deliveryStore.records]);
  const projects = useMemo(() => projectStore.records.map(mapServiceProjectRecord), [projectStore.records]);
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({ milestone: "", projectCode: "", client: "", dueDate: new Date().toISOString().slice(0, 10) });

  async function moveDeliveryStatus(id: string, nextStatus: "in_review" | "completed", projectCode: string) {
    const project = projects.find((item) => item.projectCode === projectCode);
    if (!project || project.status !== "active") {
      toast.error("Only active projects can progress delivery milestones.");
      return;
    }
    await deliveryStore.update(id, { status: nextStatus });
  }

  async function save() {
    if (!form.milestone.trim()) {
      setFormError("Milestone title is required.");
      return;
    }
    if (!form.projectCode) {
      setFormError("Project selection is required.");
      return;
    }
    if (!form.client.trim()) {
      setFormError("Client name is required.");
      return;
    }
    setFormError("");
    await deliveryStore.create({
      title: form.milestone.trim(),
      status: "planned",
      date: form.dueDate,
      data: {
        deliveryNo: `DLV-${String(deliveries.length + 1).padStart(4, "0")}`,
        projectCode: form.projectCode,
        client: form.client.trim(),
      },
    });
    setShowModal(false);
    setForm({ milestone: "", projectCode: "", client: "", dueDate: new Date().toISOString().slice(0, 10) });
    setFormError("");
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Delivery Tracker</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.42)", margin: 0 }}>Track project milestones, approvals, and service completion status.</p>
        </div>
        <button onClick={() => { setShowModal(true); setFormError(""); }} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#f59e0b", color: "#fff", fontWeight: 700, cursor: "pointer" }}>+ New Delivery</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {deliveries.map((delivery) => (
          <div key={delivery.id} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: 20, display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{delivery.milestone}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.42)", marginTop: 4 }}>{delivery.deliveryNo} • {delivery.projectCode || "No project"} • {delivery.client || "No client"}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: delivery.status === "completed" ? "#22c55e" : "#f59e0b" }}>{delivery.status.toUpperCase()}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginTop: 4 }}>Due {delivery.dueDate}</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
                {delivery.status === "planned" && (
                  <button onClick={() => moveDeliveryStatus(delivery.id, "in_review", delivery.projectCode)} style={{ padding: "5px 10px", background: "rgba(59,130,246,.15)", border: "1px solid rgba(59,130,246,.3)", color: "#60a5fa", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
                    Review
                  </button>
                )}
                {delivery.status === "in_review" && (
                  <button onClick={() => moveDeliveryStatus(delivery.id, "completed", delivery.projectCode)} style={{ padding: "5px 10px", background: "rgba(34,197,94,.15)", border: "1px solid rgba(34,197,94,.3)", color: "#22c55e", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
                    Complete
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {!deliveryStore.loading && deliveries.length === 0 && <div style={{ color: "rgba(255,255,255,.3)" }}>No deliveries tracked yet.</div>}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 520, background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 28 }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 700 }}>New Delivery Milestone</h2>
            {formError && <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,.14)", border: "1px solid rgba(239,68,68,.28)", color: "#fca5a5", fontSize: 12 }}>{formError}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "rgba(255,255,255,.45)" }}>Milestone</label>
                <input value={form.milestone} onChange={(e) => setForm((current) => ({ ...current, milestone: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "rgba(255,255,255,.45)" }}>Project</label>
                <select value={form.projectCode} onChange={(e) => {
                  const project = projects.find((item) => item.projectCode === e.target.value);
                  setForm((current) => ({ ...current, projectCode: e.target.value, client: project?.client || current.client }));
                }} style={{ width: "100%", background: "#161b27", border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff" }}>
                  <option value="">Select Project</option>
                  {projects.map((item) => <option key={item.id} value={item.projectCode}>{item.projectCode} - {item.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "rgba(255,255,255,.45)" }}>Client</label>
                <input value={form.client} onChange={(e) => setForm((current) => ({ ...current, client: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "rgba(255,255,255,.45)" }}>Due Date</label>
                <input type="date" value={form.dueDate} onChange={(e) => setForm((current) => ({ ...current, dueDate: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#f59e0b", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, cursor: "pointer" }}>Save</button>
              <button onClick={() => setShowModal(false)} style={{ padding: "11px 24px", borderRadius: 8, border: `1px solid ${border}`, background: "transparent", color: "rgba(255,255,255,.65)", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

