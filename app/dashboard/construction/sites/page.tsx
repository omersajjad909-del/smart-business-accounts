"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  constructionBg,
  constructionBorder,
  constructionFont,
  constructionMuted,
  mapConstructionProjects,
  mapConstructionSites,
} from "../_shared";

const STATUS_COLOR: Record<string, string> = { active: "#34d399", inactive: "#6b7280", maintenance: "#f59e0b" };

export default function ConstructionSitesPage() {
  const siteStore = useBusinessRecords("construction_site");
  const projectStore = useBusinessRecords("construction_project");
  const { records, loading, create, update } = siteStore;
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", location: "", supervisor: "", workers: 0, phone: "" });

  const sites = useMemo(() => mapConstructionSites(records), [records]);
  const projects = useMemo(() => mapConstructionProjects(projectStore.records), [projectStore.records]);

  async function save() {
    const name = form.name.trim();
    const location = form.location.trim();
    if (!name || !location || !form.supervisor.trim()) {
      setError("Site name, location, and supervisor are required.");
      return;
    }
    if (form.workers < 0) {
      setError("Workers count cannot be negative.");
      return;
    }
    if (sites.some((site) => site.name.toLowerCase() === name.toLowerCase() && site.location.toLowerCase() === location.toLowerCase())) {
      setError("A site with the same name and location already exists.");
      return;
    }

    await create({ title: name, status: "active", data: { location, supervisor: form.supervisor.trim(), workers: form.workers, phone: form.phone.trim() } });
    setShowModal(false);
    setError("");
    setForm({ name: "", location: "", supervisor: "", workers: 0, phone: "" });
  }

  async function changeStatus(id: string, status: "maintenance" | "active" | "inactive") {
    const site = sites.find((row) => row.id === id);
    if (!site) return;
    const linkedActiveProjects = projects.filter((project) => project.site === site.name && project.status !== "completed");
    if (status === "inactive" && linkedActiveProjects.length > 0) {
      window.alert("Complete or reassign active projects before deactivating this site.");
      return;
    }
    await update(id, { status });
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: constructionFont, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div><h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Construction Sites</h1><p style={{ fontSize: 13, color: constructionMuted, margin: 0 }}>Manage active construction sites and their staffing readiness.</p></div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#f97316", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Add Site</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 28 }}>
        {[{ label: "Total Sites", val: sites.length, color: "#f97316" }, { label: "Active", val: sites.filter((s) => s.status === "active").length, color: "#34d399" }, { label: "Total Workers", val: sites.reduce((a, s) => a + s.workers, 0), color: "#818cf8" }].map((s) => (
          <div key={s.label} style={{ background: constructionBg, border: `1px solid ${constructionBorder}`, borderRadius: 12, padding: "20px 24px" }}><div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 6 }}>{s.label}</div><div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.val}</div></div>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.4)" }}>Loading...</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 16 }}>
        {sites.map((site) => {
          const activeProjects = projects.filter((project) => project.site === site.name && project.status !== "completed");
          return (
            <div key={site.id} style={{ background: constructionBg, border: `1px solid ${constructionBorder}`, borderRadius: 12, padding: "20px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{site.name}</div>
                <span style={{ display: "inline-block", background: `${STATUS_COLOR[site.status]}20`, color: STATUS_COLOR[site.status], borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{site.status}</span>
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 6 }}>Location: {site.location}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 6 }}>Supervisor: {site.supervisor}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 12 }}>Workers: {site.workers} · {site.phone}</div>
              <div style={{ fontSize: 12, color: "#fdba74", marginBottom: 12 }}>Open projects: {activeProjects.length}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {site.status !== "maintenance" && <button onClick={() => changeStatus(site.id, "maintenance")} style={{ padding: "5px 10px", background: "rgba(245,158,11,.15)", border: "1px solid rgba(245,158,11,.3)", color: "#f59e0b", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Maintenance</button>}
                {site.status === "inactive" && <button onClick={() => changeStatus(site.id, "active")} style={{ padding: "5px 10px", background: "rgba(52,211,153,.15)", border: "1px solid rgba(52,211,153,.3)", color: "#34d399", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Activate</button>}
                {site.status === "active" && <button onClick={() => changeStatus(site.id, "inactive")} style={{ padding: "5px 10px", background: "rgba(107,114,128,.15)", border: "1px solid rgba(107,114,128,.3)", color: "#d1d5db", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Deactivate</button>}
              </div>
            </div>
          );
        })}
        {!loading && sites.length === 0 && <div style={{ background: constructionBg, border: `1px solid ${constructionBorder}`, borderRadius: 12, padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)", gridColumn: "1/-1" }}>No sites added yet.</div>}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${constructionBorder}`, borderRadius: 16, padding: 32, width: 480, fontFamily: constructionFont }}>
            <h2 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 700 }}>Add Site</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[["Site Name", "name", "text", "span 2"], ["Location", "location", "text", "span 2"], ["Supervisor", "supervisor", "text", ""], ["Phone", "phone", "text", ""]].map(([label, key, type, col]) => (
                <div key={key} style={{ gridColumn: col || undefined }}>
                  <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>{label}</label>
                  <input type={type} value={String((form as Record<string, unknown>)[key] ?? "")} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} style={{ width: "100%", background: constructionBg, border: `1px solid ${constructionBorder}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
                </div>
              ))}
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Workers Count</label>
                <input type="number" value={form.workers} onChange={(e) => setForm((f) => ({ ...f, workers: Number(e.target.value) }))} style={{ width: "100%", background: constructionBg, border: `1px solid ${constructionBorder}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            </div>
            {error && <div style={{ marginTop: 12, color: "#fda4af", fontSize: 12 }}>{error}</div>}
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#f97316", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Add Site</button>
              <button onClick={() => { setShowModal(false); setError(""); }} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${constructionBorder}`, borderRadius: 8, color: "rgba(255,255,255,.6)", fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
