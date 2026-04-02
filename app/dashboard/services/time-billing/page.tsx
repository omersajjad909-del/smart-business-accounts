"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { mapServiceProjectRecord, mapServiceTimesheetRecord } from "../_shared";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export default function ServiceTimeBillingPage() {
  const timesheetStore = useBusinessRecords("service_timesheet");
  const projectStore = useBusinessRecords("service_project");

  const entries = useMemo(() => timesheetStore.records.map(mapServiceTimesheetRecord), [timesheetStore.records]);
  const projects = useMemo(() => projectStore.records.map(mapServiceProjectRecord), [projectStore.records]);

  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    projectCode: "",
    consultant: "",
    billableHours: 1,
    billingRate: 0,
    workDate: getToday(),
  });

  const totalHours = entries.reduce((sum, item) => sum + item.billableHours, 0);
  const totalValue = entries.reduce((sum, item) => sum + item.billableHours * item.billingRate, 0);
  const approvedCount = entries.filter((item) => item.status === "approved").length;
  const draftCount = entries.filter((item) => item.status !== "approved").length;

  async function save() {
    const consultant = form.consultant.trim();
    if (!consultant) {
      setFormError("Consultant name is required.");
      return;
    }
    if (!form.projectCode) {
      setFormError("Project selection is required.");
      return;
    }
    if (form.billableHours <= 0 || form.billingRate < 0) {
      setFormError("Billable hours must be greater than zero and rate cannot be negative.");
      return;
    }
    if (!form.workDate) {
      setFormError("Work date is required.");
      return;
    }
    setFormError("");

    await timesheetStore.create({
      title: `TMS-${String(entries.length + 1).padStart(4, "0")}`,
      status: "draft",
      amount: form.billingRate,
      date: form.workDate,
      data: {
        entryNo: `TMS-${String(entries.length + 1).padStart(4, "0")}`,
        projectCode: form.projectCode,
        consultant,
        billableHours: form.billableHours,
      },
    });

    setShowModal(false);
    setForm({
      projectCode: "",
      consultant: "",
      billableHours: 1,
      billingRate: 0,
      workDate: getToday(),
    });
    setFormError("");
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Time Billing</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.42)", margin: 0 }}>
            Capture consultant hours, billable rates, and ready-to-invoice effort.
          </p>
        </div>
        <button
          onClick={() => { setShowModal(true); setFormError(""); }}
          style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#8b5cf6", color: "#fff", fontWeight: 700, cursor: "pointer" }}
        >
          + New Entry
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 14, marginBottom: 22 }}>
        {[
          { label: "Billable Hours", value: totalHours.toLocaleString(), color: "#38bdf8" },
          { label: "Billable Value", value: `Rs. ${totalValue.toLocaleString()}`, color: "#22c55e" },
          { label: "Approved Entries", value: approvedCount, color: "#f59e0b" },
          { label: "Draft Entries", value: draftCount, color: "#f97316" },
        ].map((card) => (
          <div key={card.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>
              {card.label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {entries.map((entry) => (
          <div
            key={entry.id}
            style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: 20, display: "flex", justifyContent: "space-between", gap: 12 }}
          >
            <div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{entry.consultant || "Unknown consultant"}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.42)", marginTop: 4 }}>
                {entry.entryNo} - {entry.projectCode || "No project"} - {entry.billableHours} hrs
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: entry.status === "approved" ? "#22c55e" : "#f59e0b" }}>
                {entry.status.toUpperCase()}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginTop: 4 }}>
                {entry.workDate} - Rs. {(entry.billableHours * entry.billingRate).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
        {!timesheetStore.loading && entries.length === 0 && <div style={{ color: "rgba(255,255,255,.3)" }}>No time entries recorded yet.</div>}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 520, background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 28 }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 700 }}>New Time Entry</h2>
            {formError && <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,.14)", border: "1px solid rgba(239,68,68,.28)", color: "#fca5a5", fontSize: 12 }}>{formError}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "rgba(255,255,255,.45)" }}>Project</label>
                <select
                  value={form.projectCode}
                  onChange={(e) => setForm((current) => ({ ...current, projectCode: e.target.value }))}
                  style={{ width: "100%", background: "#161b27", border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff" }}
                >
                  <option value="">Select Project</option>
                  {projects.map((item) => (
                    <option key={item.id} value={item.projectCode}>
                      {item.projectCode} - {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "rgba(255,255,255,.45)" }}>Consultant</label>
                <input
                  value={form.consultant}
                  onChange={(e) => setForm((current) => ({ ...current, consultant: e.target.value }))}
                  style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "rgba(255,255,255,.45)" }}>Billable Hours</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={form.billableHours}
                  onChange={(e) => setForm((current) => ({ ...current, billableHours: Number(e.target.value) }))}
                  style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "rgba(255,255,255,.45)" }}>Billing Rate</label>
                <input
                  type="number"
                  value={form.billingRate}
                  onChange={(e) => setForm((current) => ({ ...current, billingRate: Number(e.target.value) }))}
                  style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "rgba(255,255,255,.45)" }}>Work Date</label>
                <input
                  type="date"
                  value={form.workDate}
                  onChange={(e) => setForm((current) => ({ ...current, workDate: e.target.value }))}
                  style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <button
                onClick={save}
                style={{ flex: 1, padding: "11px 0", background: "#8b5cf6", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, cursor: "pointer" }}
              >
                Save
              </button>
              <button
                onClick={() => { setShowModal(false); setFormError(""); }}
                style={{ padding: "11px 24px", borderRadius: 8, border: `1px solid ${border}`, background: "transparent", color: "rgba(255,255,255,.65)", cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
