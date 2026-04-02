"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  constructionBg,
  constructionBorder,
  constructionFont,
  constructionMuted,
  mapConstructionMaterials,
  mapConstructionProjects,
  mapConstructionSites,
} from "../_shared";

export default function ConstructionMaterialsPage() {
  const materialStore = useBusinessRecords("construction_material");
  const siteStore = useBusinessRecords("construction_site");
  const projectStore = useBusinessRecords("construction_project");
  const { records, loading, create } = materialStore;
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", unit: "bags", quantity: 0, unitCost: 0, supplier: "", site: "", project: "" });

  const materials = useMemo(() => mapConstructionMaterials(records), [records]);
  const sites = useMemo(() => mapConstructionSites(siteStore.records), [siteStore.records]);
  const projects = useMemo(() => mapConstructionProjects(projectStore.records), [projectStore.records]);

  const totalValue = materials.reduce((a, m) => a + m.quantity * m.unitCost, 0);

  async function save() {
    const name = form.name.trim();
    if (!name || !form.site || !form.project) {
      setError("Material, site, and project are required.");
      return;
    }
    if (form.quantity <= 0 || form.unitCost <= 0) {
      setError("Quantity and unit cost must be greater than zero.");
      return;
    }
    if (!sites.some((site) => site.name === form.site)) {
      setError("Selected site does not exist.");
      return;
    }
    const linkedProject = projects.find((project) => project.name === form.project);
    if (!linkedProject) {
      setError("Selected project does not exist.");
      return;
    }
    if (linkedProject.site && linkedProject.site !== form.site) {
      setError("Project is assigned to a different site.");
      return;
    }
    if (materials.some((row) => row.name.toLowerCase() === name.toLowerCase() && row.site === form.site && row.project === form.project && row.status !== "consumed")) {
      setError("This material is already open for the selected site and project.");
      return;
    }

    await create({
      title: name,
      status: "in_stock",
      amount: form.unitCost,
      data: { unit: form.unit, quantity: form.quantity, supplier: form.supplier.trim(), site: form.site, project: form.project },
    });
    setShowModal(false);
    setError("");
    setForm({ name: "", unit: "bags", quantity: 0, unitCost: 0, supplier: "", site: "", project: "" });
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: constructionFont, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div><h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Construction Materials</h1><p style={{ fontSize: 13, color: constructionMuted, margin: 0 }}>Track site-issued materials and procurement exposure.</p></div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#f97316", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Add Material</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 28 }}>
        {[{ label: "Total Materials", val: materials.length, color: "#f97316" }, { label: "Total Value", val: `Rs. ${totalValue.toLocaleString()}`, color: "#34d399" }, { label: "Suppliers", val: new Set(materials.map((m) => m.supplier).filter(Boolean)).size, color: "#818cf8" }].map((s) => (
          <div key={s.label} style={{ background: constructionBg, border: `1px solid ${constructionBorder}`, borderRadius: 12, padding: "20px 24px" }}><div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 6 }}>{s.label}</div><div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.val}</div></div>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.4)" }}>Loading...</div>}

      <div style={{ background: constructionBg, border: `1px solid ${constructionBorder}`, borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Material", "Unit", "Quantity", "Unit Cost", "Total Value", "Supplier", "Site", "Project"].map((h) => (
            <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,.5)", borderBottom: `1px solid ${constructionBorder}`, fontWeight: 600 }}>{h}</th>
          ))}</tr></thead>
          <tbody>
            {materials.map((m) => (
              <tr key={m.id}>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 600 }}>{m.name}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{m.unit}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 600 }}>{m.quantity}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>Rs. {m.unitCost.toLocaleString()}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#34d399", fontWeight: 600 }}>Rs. {(m.quantity * m.unitCost).toLocaleString()}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13, color: "rgba(255,255,255,.5)" }}>{m.supplier || "—"}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13, color: "rgba(255,255,255,.5)" }}>{m.site}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13, color: "#fdba74" }}>{m.project || "—"}</td>
              </tr>
            ))}
            {!loading && materials.length === 0 && <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)" }}>No materials yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${constructionBorder}`, borderRadius: 16, padding: 32, width: 520, fontFamily: constructionFont }}>
            <h2 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 700 }}>Add Material</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[["Material Name", "name", "text", "span 2"], ["Supplier", "supplier", "text", ""], ["Site", "site", "select", ""], ["Project", "project", "select", "span 2"]].map(([label, key, type, col]) => (
                <div key={key} style={{ gridColumn: col || undefined }}>
                  <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>{label}</label>
                  {type === "select" ? (
                    <select value={String((form as Record<string, unknown>)[key] ?? "")} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} style={{ width: "100%", background: "#161b27", border: `1px solid ${constructionBorder}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14 }}>
                      <option value="">Select {label.toLowerCase()}</option>
                      {(key === "site" ? sites : projects).map((row) => <option key={row.id} value={row.name}>{row.name}</option>)}
                    </select>
                  ) : (
                    <input type={type} value={String((form as Record<string, unknown>)[key] ?? "")} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} style={{ width: "100%", background: constructionBg, border: `1px solid ${constructionBorder}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
                  )}
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Unit</label>
                <select value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} style={{ width: "100%", background: "#161b27", border: `1px solid ${constructionBorder}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14 }}>
                  {["bags", "tons", "pieces", "meters", "liters", "kg"].map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Quantity</label>
                <input type="number" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))} style={{ width: "100%", background: constructionBg, border: `1px solid ${constructionBorder}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Unit Cost (Rs.)</label>
                <input type="number" value={form.unitCost} onChange={(e) => setForm((f) => ({ ...f, unitCost: Number(e.target.value) }))} style={{ width: "100%", background: constructionBg, border: `1px solid ${constructionBorder}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            </div>
            {error && <div style={{ marginTop: 12, color: "#fda4af", fontSize: 12 }}>{error}</div>}
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#f97316", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Add Material</button>
              <button onClick={() => { setShowModal(false); setError(""); }} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${constructionBorder}`, borderRadius: 8, color: "rgba(255,255,255,.6)", fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
