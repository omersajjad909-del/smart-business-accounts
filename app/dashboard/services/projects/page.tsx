"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { mapServiceCatalogRecord, mapServiceProjectRecord } from "../_shared";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";

export default function ServiceProjectsPage() {
  const projectStore = useBusinessRecords("service_project");
  const catalogStore = useBusinessRecords("service_catalog");
  const projects = useMemo(() => projectStore.records.map(mapServiceProjectRecord), [projectStore.records]);
  const catalog = useMemo(() => catalogStore.records.map(mapServiceCatalogRecord), [catalogStore.records]);
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({ name: "", client: "", manager: "", dueDate: new Date().toISOString().slice(0, 10), budget: 0, serviceName: "" });

  async function save() {
    if (!form.name.trim()) {
      setFormError("Project name is required.");
      return;
    }
    if (!form.client.trim()) {
      setFormError("Client name is required.");
      return;
    }
    if (!form.serviceName) {
      setFormError("Service selection is required.");
      return;
    }
    if (form.budget < 0) {
      setFormError("Budget cannot be negative.");
      return;
    }
    setFormError("");
    await projectStore.create({
      title: form.name.trim(),
      status: "active",
      amount: form.budget,
      date: form.dueDate,
      data: {
        projectCode: `SRV-${String(projects.length + 1).padStart(4, "0")}`,
        client: form.client.trim(),
        manager: form.manager.trim(),
        serviceName: form.serviceName,
      },
    });
    setShowModal(false);
    setForm({ name: "", client: "", manager: "", dueDate: new Date().toISOString().slice(0, 10), budget: 0, serviceName: "" });
    setFormError("");
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Client Projects</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.42)", margin: 0 }}>Track active client assignments and service delivery scope.</p>
        </div>
        <button onClick={() => { setShowModal(true); setFormError(""); }} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#38bdf8", color: "#fff", fontWeight: 700, cursor: "pointer" }}>+ New Project</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {projects.map((project) => (
          <div key={project.id} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{project.name}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.42)", marginTop: 4 }}>{project.projectCode} • {project.client} • Manager {project.manager || "N/A"}</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: project.status === "completed" ? "#22c55e" : "#38bdf8" }}>{project.status.toUpperCase()}</div>
            </div>
            <div style={{ marginTop: 10, fontSize: 13, color: "rgba(255,255,255,.55)" }}>Budget Rs. {project.budget.toLocaleString()} • Due {project.dueDate}</div>
          </div>
        ))}
        {!projectStore.loading && projects.length === 0 && <div style={{ color: "rgba(255,255,255,.3)" }}>No service projects yet.</div>}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 520, background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 28 }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 700 }}>New Client Project</h2>
            {formError && <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,.14)", border: "1px solid rgba(239,68,68,.28)", color: "#fca5a5", fontSize: 12 }}>{formError}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "rgba(255,255,255,.45)" }}>Project Name</label>
                <input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "rgba(255,255,255,.45)" }}>Client</label>
                <input value={form.client} onChange={(e) => setForm((current) => ({ ...current, client: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "rgba(255,255,255,.45)" }}>Manager</label>
                <input value={form.manager} onChange={(e) => setForm((current) => ({ ...current, manager: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "rgba(255,255,255,.45)" }}>Service</label>
                <select value={form.serviceName} onChange={(e) => setForm((current) => ({ ...current, serviceName: e.target.value }))} style={{ width: "100%", background: "#161b27", border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff" }}>
                  <option value="">Select Service</option>
                  {catalog.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "rgba(255,255,255,.45)" }}>Due Date</label>
                <input type="date" value={form.dueDate} onChange={(e) => setForm((current) => ({ ...current, dueDate: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "rgba(255,255,255,.45)" }}>Budget</label>
                <input type="number" value={form.budget} onChange={(e) => setForm((current) => ({ ...current, budget: Number(e.target.value) }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#38bdf8", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, cursor: "pointer" }}>Save</button>
              <button onClick={() => setShowModal(false)} style={{ padding: "11px 24px", borderRadius: 8, border: `1px solid ${border}`, background: "transparent", color: "rgba(255,255,255,.65)", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
