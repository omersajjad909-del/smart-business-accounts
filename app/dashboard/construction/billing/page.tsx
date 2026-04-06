import toast from "react-hot-toast";
"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  constructionBg,
  constructionBorder,
  constructionFont,
  constructionMuted,
  mapBoqRecords,
  mapConstructionBilling,
  mapConstructionProjects,
  todayIso,
} from "../_shared";

export default function ConstructionBillingPage() {
  const billingStore = useBusinessRecords("construction_billing");
  const projectStore = useBusinessRecords("construction_project");
  const boqStore = useBusinessRecords("construction_boq");
  const { records, loading, create, update } = billingStore;
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ project: "", invoiceNo: "", progress: 0, certifiedValue: 0, date: todayIso() });

  const billings = useMemo(() => mapConstructionBilling(records), [records]);
  const projects = useMemo(() => mapConstructionProjects(projectStore.records), [projectStore.records]);
  const boqs = useMemo(() => mapBoqRecords(boqStore.records), [boqStore.records]);

  async function save() {
    const project = projects.find((row) => row.name === form.project);
    if (!project) {
      setError("Select a valid project.");
      return;
    }
    if (!form.invoiceNo.trim()) {
      setError("Invoice number is required.");
      return;
    }
    if (form.progress <= 0 || form.progress > 100) {
      setError("Progress must be between 1 and 100.");
      return;
    }
    if (form.certifiedValue <= 0) {
      setError("Certified value must be greater than zero.");
      return;
    }
    const boqValue = boqs.filter((row) => row.project === project.name).reduce((sum, row) => sum + row.quantity * row.unitRate, 0);
    const approvedValue = billings.filter((row) => row.project === project.name && row.status !== "draft").reduce((sum, row) => sum + row.certifiedValue, 0);
    if (boqValue > 0 && approvedValue + form.certifiedValue > boqValue) {
      setError("Billing exceeds total BOQ value.");
      return;
    }
    await create({
      title: project.name,
      status: "draft",
      amount: form.certifiedValue,
      date: form.date,
      data: {
        client: project.client,
        site: project.site,
        invoiceNo: form.invoiceNo.trim(),
        progress: form.progress,
      },
    });
    setShowModal(false);
    setError("");
    setForm({ project: "", invoiceNo: "", progress: 0, certifiedValue: 0, date: todayIso() });
  }

  async function advance(id: string, status: "submitted" | "approved" | "paid") {
    const row = billings.find((entry) => entry.id === id);
    if (!row) return;
    if (status === "paid" && row.status !== "approved") {
      toast.success("Only approved bills can be marked paid.");
      return;
    }
    await update(id, { status });
  }

  return (
    <div style={{ minHeight: "100vh", padding: "28px 32px", color: "#fff", fontFamily: constructionFont }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800 }}>Progress Billing</h1>
          <p style={{ margin: 0, fontSize: 13, color: constructionMuted }}>Client billing, certification progress, and payment closure per project.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "#f97316", color: "#fff", fontWeight: 700, cursor: "pointer" }}>New Bill</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 18 }}>
        {[
          { label: "Draft Bills", value: billings.filter((row) => row.status === "draft").length, color: "#f59e0b" },
          { label: "Approved", value: billings.filter((row) => row.status === "approved").length, color: "#818cf8" },
          { label: "Paid Value", value: `Rs. ${billings.filter((row) => row.status === "paid").reduce((sum, row) => sum + row.certifiedValue, 0).toLocaleString()}`, color: "#34d399" },
          { label: "Pending Value", value: `Rs. ${billings.filter((row) => row.status !== "paid").reduce((sum, row) => sum + row.certifiedValue, 0).toLocaleString()}`, color: "#f87171" },
        ].map((card) => (
          <div key={card.label} style={{ background: constructionBg, border: `1px solid ${constructionBorder}`, borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: constructionMuted, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: constructionBg, border: `1px solid ${constructionBorder}`, borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["Project", "Invoice", "Client", "Site", "Progress", "Value", "Date", "Status", "Action"].map((head) => (
              <th key={head} style={{ textAlign: "left", padding: "12px 16px", borderBottom: `1px solid ${constructionBorder}`, fontSize: 12, color: constructionMuted }}>{head}</th>
            ))}</tr>
          </thead>
          <tbody>
            {billings.map((row) => (
              <tr key={row.id}>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 700 }}>{row.project}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.invoiceNo}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.client}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.site}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#60a5fa" }}>{row.progress}%</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#34d399" }}>Rs. {row.certifiedValue.toLocaleString()}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.date}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.status}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {row.status === "draft" && <button onClick={() => advance(row.id, "submitted")} style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(245,158,11,.15)", border: "1px solid rgba(245,158,11,.3)", color: "#f59e0b", cursor: "pointer" }}>Submit</button>}
                    {row.status === "submitted" && <button onClick={() => advance(row.id, "approved")} style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(129,140,248,.15)", border: "1px solid rgba(129,140,248,.3)", color: "#a5b4fc", cursor: "pointer" }}>Approve</button>}
                    {row.status === "approved" && <button onClick={() => advance(row.id, "paid")} style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(52,211,153,.15)", border: "1px solid rgba(52,211,153,.3)", color: "#34d399", cursor: "pointer" }}>Mark Paid</button>}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && billings.length === 0 && <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)" }}>No billing records yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 560, background: "#161b27", border: `1px solid ${constructionBorder}`, borderRadius: 16, padding: 28 }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 800 }}>New Progress Bill</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: constructionMuted }}>Project</label>
                <select value={form.project} onChange={(e) => setForm((prev) => ({ ...prev, project: e.target.value }))} style={{ width: "100%", padding: "10px 12px", background: "#111827", border: `1px solid ${constructionBorder}`, borderRadius: 8, color: "#fff" }}>
                  <option value="">Select project</option>
                  {projects.map((project) => <option key={project.id} value={project.name}>{project.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: constructionMuted }}>Invoice No</label>
                <input value={form.invoiceNo} onChange={(e) => setForm((prev) => ({ ...prev, invoiceNo: e.target.value }))} style={{ width: "100%", padding: "10px 12px", background: "#111827", border: `1px solid ${constructionBorder}`, borderRadius: 8, color: "#fff" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: constructionMuted }}>Progress %</label>
                <input type="number" value={form.progress} onChange={(e) => setForm((prev) => ({ ...prev, progress: Number(e.target.value) }))} style={{ width: "100%", padding: "10px 12px", background: "#111827", border: `1px solid ${constructionBorder}`, borderRadius: 8, color: "#fff" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: constructionMuted }}>Certified Value</label>
                <input type="number" value={form.certifiedValue} onChange={(e) => setForm((prev) => ({ ...prev, certifiedValue: Number(e.target.value) }))} style={{ width: "100%", padding: "10px 12px", background: "#111827", border: `1px solid ${constructionBorder}`, borderRadius: 8, color: "#fff" }} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: constructionMuted }}>Billing Date</label>
                <input type="date" value={form.date} onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))} style={{ width: "100%", padding: "10px 12px", background: "#111827", border: `1px solid ${constructionBorder}`, borderRadius: 8, color: "#fff" }} />
              </div>
            </div>
            {error && <div style={{ marginTop: 12, color: "#fda4af", fontSize: 12 }}>{error}</div>}
            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", borderRadius: 8, border: "none", background: "#f97316", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Save</button>
              <button onClick={() => { setShowModal(false); setError(""); }} style={{ padding: "11px 18px", borderRadius: 8, border: `1px solid ${constructionBorder}`, background: "transparent", color: "#cbd5e1", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
