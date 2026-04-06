"use client";

import toast from "react-hot-toast";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  constructionBg,
  constructionBorder,
  constructionFont,
  constructionMuted,
  mapConstructionProjects,
  mapSubcontractors,
} from "../_shared";

export default function SubcontractorsPage() {
  const subcontractorStore = useBusinessRecords("subcontractor");
  const projectStore = useBusinessRecords("construction_project");
  const { records, loading, create, update } = subcontractorStore;
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", trade: "", phone: "", contractValue: 0, project: "", site: "" });

  const subs = useMemo(() => mapSubcontractors(records), [records]);
  const projects = useMemo(() => mapConstructionProjects(projectStore.records), [projectStore.records]);

  const totalContracts = subs.reduce((a, s) => a + s.contractValue, 0);
  const totalPaid = subs.reduce((a, s) => a + s.paid, 0);

  async function save() {
    const name = form.name.trim();
    if (!name || !form.trade.trim() || !form.project) {
      setError("Name, trade, and linked project are required.");
      return;
    }
    if (form.contractValue <= 0) {
      setError("Contract value must be greater than zero.");
      return;
    }
    const linkedProject = projects.find((project) => project.name === form.project);
    if (!linkedProject) {
      setError("Selected project does not exist.");
      return;
    }
    if (form.site && linkedProject.site && linkedProject.site !== form.site) {
      setError("Selected site does not match the project site.");
      return;
    }
    if (subs.some((row) => row.name.toLowerCase() === name.toLowerCase() && row.project === form.project && row.status !== "closed")) {
      setError("This subcontractor already has an open contract on the selected project.");
      return;
    }

    await create({
      title: name,
      status: "active",
      amount: form.contractValue,
      data: {
        trade: form.trade.trim(),
        phone: form.phone.trim(),
        project: form.project,
        site: form.site || linkedProject.site,
        paid: 0,
      },
    });
    setShowModal(false);
    setError("");
    setForm({ name: "", trade: "", phone: "", contractValue: 0, project: "", site: "" });
  }

  async function closeContract(id: string) {
    const row = subs.find((sub) => sub.id === id);
    if (!row) return;
    if (row.paid < row.contractValue) {
      toast.error("Close the contract only after clearing subcontractor dues.");
      return;
    }
    await update(id, { status: "closed" });
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: constructionFont, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div><h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Subcontractors</h1><p style={{ fontSize: 13, color: constructionMuted, margin: 0 }}>Manage subcontractors, package values, and outstanding contract exposure.</p></div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#f97316", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Add Subcontractor</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 }}>
        {[{ label: "Total Subcontractors", val: subs.length, color: "#f97316" }, { label: "Active", val: subs.filter((s) => s.status === "active").length, color: "#34d399" }, { label: "Total Contracts", val: `Rs. ${totalContracts.toLocaleString()}`, color: "#818cf8" }, { label: "Total Paid", val: `Rs. ${totalPaid.toLocaleString()}`, color: "#f59e0b" }].map((s) => (
          <div key={s.label} style={{ background: constructionBg, border: `1px solid ${constructionBorder}`, borderRadius: 12, padding: "20px 24px" }}><div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 6 }}>{s.label}</div><div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.val}</div></div>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.4)" }}>Loading...</div>}

      <div style={{ background: constructionBg, border: `1px solid ${constructionBorder}`, borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Name", "Trade", "Phone", "Project", "Site", "Contract", "Paid", "Balance", "Status", "Action"].map((h) => (
            <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,.5)", borderBottom: `1px solid ${constructionBorder}`, fontWeight: 600 }}>{h}</th>
          ))}</tr></thead>
          <tbody>
            {subs.map((sub) => (
              <tr key={sub.id}>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 600 }}>{sub.name}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{sub.trade}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{sub.phone}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13, color: "rgba(255,255,255,.5)" }}>{sub.project}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13, color: "#fdba74" }}>{sub.site || "—"}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>Rs. {sub.contractValue.toLocaleString()}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#34d399" }}>Rs. {sub.paid.toLocaleString()}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#f59e0b" }}>Rs. {(sub.contractValue - sub.paid).toLocaleString()}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <span style={{ display: "inline-block", background: sub.status === "active" ? "rgba(52,211,153,.15)" : "rgba(107,114,128,.15)", color: sub.status === "active" ? "#34d399" : "#d1d5db", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{sub.status}</span>
                </td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  {sub.status === "active" && <button onClick={() => closeContract(sub.id)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 11, cursor: "pointer" }}>Close</button>}
                </td>
              </tr>
            ))}
            {!loading && subs.length === 0 && <tr><td colSpan={10} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)" }}>No subcontractors yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${constructionBorder}`, borderRadius: 16, padding: 32, width: 520, fontFamily: constructionFont }}>
            <h2 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 700 }}>Add Subcontractor</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[["Name", "name", "text", "span 2"], ["Trade", "trade", "text", ""], ["Phone", "phone", "text", ""], ["Project", "project", "select", ""], ["Site", "site", "text", ""], ["Contract Value (Rs.)", "contractValue", "number", "span 2"]].map(([label, key, type, col]) => (
                <div key={key} style={{ gridColumn: col || undefined }}>
                  <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>{label}</label>
                  {type === "select" ? (
                    <select value={String((form as Record<string, unknown>)[key] ?? "")} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} style={{ width: "100%", background: "#161b27", border: `1px solid ${constructionBorder}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14 }}>
                      <option value="">Select project</option>
                      {projects.map((project) => <option key={project.id} value={project.name}>{project.name}</option>)}
                    </select>
                  ) : (
                    <input type={type} value={String((form as Record<string, unknown>)[key] ?? "")} onChange={(e) => setForm((f) => ({ ...f, [key]: type === "number" ? Number(e.target.value) : e.target.value }))} style={{ width: "100%", background: constructionBg, border: `1px solid ${constructionBorder}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
                  )}
                </div>
              ))}
            </div>
            {error && <div style={{ marginTop: 12, color: "#fda4af", fontSize: 12 }}>{error}</div>}
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#f97316", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Add</button>
              <button onClick={() => { setShowModal(false); setError(""); }} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${constructionBorder}`, borderRadius: 8, color: "rgba(255,255,255,.6)", fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
