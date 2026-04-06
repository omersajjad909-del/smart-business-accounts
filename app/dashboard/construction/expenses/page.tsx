"use client";

import toast from "react-hot-toast";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  constructionBg,
  constructionBorder,
  constructionFont,
  constructionMuted,
  mapConstructionExpenses,
  mapConstructionProjects,
  mapConstructionSites,
  todayIso,
} from "../_shared";

export default function ConstructionExpensesPage() {
  const expenseStore = useBusinessRecords("construction_expense");
  const siteStore = useBusinessRecords("construction_site");
  const projectStore = useBusinessRecords("construction_project");
  const { records, loading, create, update } = expenseStore;
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", project: "", site: "", category: "", vendor: "", amount: 0, date: todayIso() });

  const expenses = useMemo(() => mapConstructionExpenses(records), [records]);
  const sites = useMemo(() => mapConstructionSites(siteStore.records), [siteStore.records]);
  const projects = useMemo(() => mapConstructionProjects(projectStore.records), [projectStore.records]);

  async function save() {
    if (!form.title.trim() || !form.project || !form.site || !form.category.trim()) {
      setError("Title, project, site, and category are required.");
      return;
    }
    if (form.amount <= 0) {
      setError("Expense amount must be greater than zero.");
      return;
    }
    const project = projects.find((row) => row.name === form.project);
    if (!project) {
      setError("Selected project does not exist.");
      return;
    }
    if (project.site && project.site !== form.site) {
      setError("Expense site must match the linked project site.");
      return;
    }
    if (!sites.some((row) => row.name === form.site)) {
      setError("Selected site does not exist.");
      return;
    }
    await create({
      title: form.title.trim(),
      status: "open",
      amount: form.amount,
      date: form.date,
      data: {
        site: form.site,
        project: form.project,
        category: form.category.trim(),
        vendor: form.vendor.trim(),
      },
    });
    setShowModal(false);
    setError("");
    setForm({ title: "", project: "", site: "", category: "", vendor: "", amount: 0, date: todayIso() });
  }

  async function step(id: string, status: "approved" | "posted") {
    const row = expenses.find((entry) => entry.id === id);
    if (!row) return;
    if (status === "posted" && row.status !== "approved") {
      toast.success("Only approved expenses can be posted.");
      return;
    }
    await update(id, { status });
  }

  return (
    <div style={{ minHeight: "100vh", padding: "28px 32px", color: "#fff", fontFamily: constructionFont }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800 }}>Site Expenses</h1>
          <p style={{ margin: 0, fontSize: 13, color: constructionMuted }}>Track site overheads, petty cash, and posted execution expenses.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "#f97316", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Add Expense</button>
      </div>

      <div style={{ background: constructionBg, border: `1px solid ${constructionBorder}`, borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["Title", "Project", "Site", "Category", "Vendor", "Amount", "Date", "Status", "Action"].map((head) => (
              <th key={head} style={{ textAlign: "left", padding: "12px 16px", borderBottom: `1px solid ${constructionBorder}`, fontSize: 12, color: constructionMuted }}>{head}</th>
            ))}</tr>
          </thead>
          <tbody>
            {expenses.map((row) => (
              <tr key={row.id}>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 700 }}>{row.title}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.project}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.site}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.category}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.vendor || "—"}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#f87171" }}>Rs. {row.amount.toLocaleString()}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.date}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.status}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {row.status === "open" && <button onClick={() => step(row.id, "approved")} style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(129,140,248,.15)", border: "1px solid rgba(129,140,248,.3)", color: "#a5b4fc", cursor: "pointer" }}>Approve</button>}
                    {row.status === "approved" && <button onClick={() => step(row.id, "posted")} style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(52,211,153,.15)", border: "1px solid rgba(52,211,153,.3)", color: "#34d399", cursor: "pointer" }}>Post</button>}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && expenses.length === 0 && <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)" }}>No expenses yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 560, background: "#161b27", border: `1px solid ${constructionBorder}`, borderRadius: 16, padding: 28 }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 800 }}>Add Site Expense</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                ["Title", "title", "text", "span 2"],
                ["Project", "project", "select", ""],
                ["Site", "site", "select", ""],
                ["Category", "category", "text", ""],
                ["Vendor", "vendor", "text", ""],
                ["Amount", "amount", "number", ""],
                ["Date", "date", "date", ""],
              ].map(([label, key, type, col]) => (
                <div key={key} style={{ gridColumn: col || undefined }}>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: constructionMuted }}>{label}</label>
                  {type === "select" ? (
                    <select value={String((form as Record<string, unknown>)[key] ?? "")} onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))} style={{ width: "100%", padding: "10px 12px", background: "#111827", border: `1px solid ${constructionBorder}`, borderRadius: 8, color: "#fff" }}>
                      <option value="">Select {label.toLowerCase()}</option>
                      {(key === "project" ? projects : sites).map((row) => <option key={row.id} value={row.name}>{row.name}</option>)}
                    </select>
                  ) : (
                    <input type={type} value={String((form as Record<string, unknown>)[key] ?? "")} onChange={(e) => setForm((prev) => ({ ...prev, [key]: type === "number" ? Number(e.target.value) : e.target.value }))} style={{ width: "100%", padding: "10px 12px", background: "#111827", border: `1px solid ${constructionBorder}`, borderRadius: 8, color: "#fff" }} />
                  )}
                </div>
              ))}
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
