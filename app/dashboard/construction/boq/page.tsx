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
  mapConstructionProjects,
} from "../_shared";

export default function ConstructionBoqPage() {
  const boqStore = useBusinessRecords("construction_boq");
  const projectStore = useBusinessRecords("construction_project");
  const { records, loading, create, update } = boqStore;
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ project: "", site: "", item: "", unit: "sqft", quantity: 0, unitRate: 0 });

  const boqs = useMemo(() => mapBoqRecords(records), [records]);
  const projects = useMemo(() => mapConstructionProjects(projectStore.records), [projectStore.records]);

  async function save() {
    if (!form.project || !form.item.trim() || !form.site) {
      setError("Project, site, and BOQ item are required.");
      return;
    }
    if (form.quantity <= 0 || form.unitRate <= 0) {
      setError("Quantity and rate must be greater than zero.");
      return;
    }
    const project = projects.find((row) => row.name === form.project);
    if (!project) {
      setError("Selected project does not exist.");
      return;
    }
    if (project.site && project.site !== form.site) {
      setError("BOQ site must match the linked project site.");
      return;
    }
    await create({
      title: form.project,
      status: "open",
      amount: form.unitRate,
      data: {
        item: form.item.trim(),
        site: form.site,
        unit: form.unit,
        quantity: form.quantity,
        billedQuantity: 0,
      },
    });
    setShowModal(false);
    setError("");
    setForm({ project: "", site: "", item: "", unit: "sqft", quantity: 0, unitRate: 0 });
  }

  async function closeItem(id: string) {
    const row = boqs.find((entry) => entry.id === id);
    if (!row) return;
    if (row.billedQuantity < row.quantity) {
      toast.error("BOQ item can only close after full billed quantity is reached.");
      return;
    }
    await update(id, { status: "closed" });
  }

  return (
    <div style={{ minHeight: "100vh", padding: "28px 32px", color: "#fff", fontFamily: constructionFont }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800 }}>BOQ Control</h1>
          <p style={{ margin: 0, fontSize: 13, color: constructionMuted }}>Bill of quantities by project and site with billed progress tracking.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "#f97316", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Add BOQ Item</button>
      </div>

      <div style={{ background: constructionBg, border: `1px solid ${constructionBorder}`, borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["Project", "Site", "Item", "Qty", "Billed", "Unit", "Rate", "Amount", "Status", "Action"].map((head) => (
              <th key={head} style={{ textAlign: "left", padding: "12px 16px", borderBottom: `1px solid ${constructionBorder}`, fontSize: 12, color: constructionMuted }}>{head}</th>
            ))}</tr>
          </thead>
          <tbody>
            {boqs.map((row) => (
              <tr key={row.id}>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 700 }}>{row.project}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.site}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.item}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.quantity}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#60a5fa" }}>{row.billedQuantity}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.unit}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>Rs. {row.unitRate.toLocaleString()}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#34d399" }}>Rs. {(row.quantity * row.unitRate).toLocaleString()}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.status}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  {row.status !== "closed" && <button onClick={() => closeItem(row.id)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 11, cursor: "pointer" }}>Close</button>}
                </td>
              </tr>
            ))}
            {!loading && boqs.length === 0 && <tr><td colSpan={10} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)" }}>No BOQ items yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 560, background: "#161b27", border: `1px solid ${constructionBorder}`, borderRadius: 16, padding: 28 }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 800 }}>Add BOQ Item</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: constructionMuted }}>Project</label>
                <select value={form.project} onChange={(e) => {
                  const next = e.target.value;
                  const project = projects.find((row) => row.name === next);
                  setForm((prev) => ({ ...prev, project: next, site: project?.site || prev.site }));
                }} style={{ width: "100%", padding: "10px 12px", background: "#111827", border: `1px solid ${constructionBorder}`, borderRadius: 8, color: "#fff" }}>
                  <option value="">Select project</option>
                  {projects.map((project) => <option key={project.id} value={project.name}>{project.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: constructionMuted }}>Site</label>
                <input value={form.site} onChange={(e) => setForm((prev) => ({ ...prev, site: e.target.value }))} style={{ width: "100%", padding: "10px 12px", background: "#111827", border: `1px solid ${constructionBorder}`, borderRadius: 8, color: "#fff" }} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: constructionMuted }}>Item</label>
                <input value={form.item} onChange={(e) => setForm((prev) => ({ ...prev, item: e.target.value }))} style={{ width: "100%", padding: "10px 12px", background: "#111827", border: `1px solid ${constructionBorder}`, borderRadius: 8, color: "#fff" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: constructionMuted }}>Unit</label>
                <input value={form.unit} onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))} style={{ width: "100%", padding: "10px 12px", background: "#111827", border: `1px solid ${constructionBorder}`, borderRadius: 8, color: "#fff" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: constructionMuted }}>Quantity</label>
                <input type="number" value={form.quantity} onChange={(e) => setForm((prev) => ({ ...prev, quantity: Number(e.target.value) }))} style={{ width: "100%", padding: "10px 12px", background: "#111827", border: `1px solid ${constructionBorder}`, borderRadius: 8, color: "#fff" }} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: constructionMuted }}>Unit Rate</label>
                <input type="number" value={form.unitRate} onChange={(e) => setForm((prev) => ({ ...prev, unitRate: Number(e.target.value) }))} style={{ width: "100%", padding: "10px 12px", background: "#111827", border: `1px solid ${constructionBorder}`, borderRadius: 8, color: "#fff" }} />
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
