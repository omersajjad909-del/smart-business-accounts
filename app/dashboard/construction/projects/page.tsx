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
  todayIso,
} from "../_shared";

const STATUS_COLOR: Record<string, string> = {
  planning: "#818cf8",
  active: "#f59e0b",
  completed: "#34d399",
  on_hold: "#6b7280",
};

export default function ConstructionProjectsPage() {
  const projectStore = useBusinessRecords("construction_project");
  const siteStore = useBusinessRecords("construction_site");
  const { loading, create, update } = projectStore;
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    client: "",
    budget: 0,
    startDate: todayIso(),
    endDate: "",
    location: "",
    site: "",
  });

  const projects = useMemo(() => mapConstructionProjects(projectStore.records), [projectStore.records]);
  const sites = useMemo(() => mapConstructionSites(siteStore.records), [siteStore.records]);

  const active = projects.filter((p) => p.status === "active").length;
  const totalBudget = projects.reduce((a, p) => a + p.budget, 0);
  const totalSpent = projects.reduce((a, p) => a + p.spent, 0);

  async function save() {
    const name = form.name.trim();
    const client = form.client.trim();
    const location = form.location.trim();
    if (!name || !client || !location) {
      setError("Project name, client, and location are required.");
      return;
    }
    if (form.budget <= 0) {
      setError("Project budget must be greater than zero.");
      return;
    }
    if (!form.startDate || !form.endDate || form.endDate < form.startDate) {
      setError("End date must be on or after the start date.");
      return;
    }
    if (form.site && !sites.some((site) => site.name === form.site)) {
      setError("Selected site does not exist.");
      return;
    }
    if (
      projects.some(
        (project) =>
          project.name.toLowerCase() === name.toLowerCase() &&
          project.location.toLowerCase() === location.toLowerCase() &&
          project.status !== "completed",
      )
    ) {
      setError("An active project with the same name and location already exists.");
      return;
    }

    await create({
      title: name,
      status: "planning",
      amount: form.budget,
      date: form.startDate,
      data: {
        client,
        endDate: form.endDate,
        location,
        site: form.site,
        spent: 0,
        progress: 0,
      },
    });

    setShowModal(false);
    setError("");
    setForm({ name: "", client: "", budget: 0, startDate: todayIso(), endDate: "", location: "", site: "" });
  }

  async function moveProject(id: string, nextStatus: string) {
    const project = projects.find((row) => row.id === id);
    if (!project) return;
    if (nextStatus === "active" && !project.site) {
      window.alert("Assign a site before starting the project.");
      return;
    }
    if (nextStatus === "completed" && project.progress < 100) {
      window.alert("Project progress must reach 100% before completion.");
      return;
    }
    await update(id, { status: nextStatus });
  }

  async function bumpProgress(id: string, delta: number) {
    const project = projects.find((row) => row.id === id);
    if (!project) return;
    const progress = Math.min(100, Math.max(0, project.progress + delta));
    const spent = Math.min(project.budget, Math.round((project.budget * progress) / 100));
    await update(id, {
      data: { progress, spent },
      status: progress === 100 ? "active" : project.status,
    });
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: constructionFont, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Construction Projects</h1>
          <p style={{ fontSize: 13, color: constructionMuted, margin: 0 }}>Manage civil projects, assigned sites, budget burn, and completion readiness.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#f97316", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>New Project</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Total Projects", val: projects.length, color: "#f97316" },
          { label: "Active", val: active, color: "#f59e0b" },
          { label: "Total Budget", val: `Rs. ${totalBudget.toLocaleString()}`, color: "#818cf8" },
          { label: "Spent to Date", val: `Rs. ${totalSpent.toLocaleString()}`, color: "#ef4444" },
        ].map((s) => (
          <div key={s.label} style={{ background: constructionBg, border: `1px solid ${constructionBorder}`, borderRadius: 12, padding: "20px 24px" }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.4)" }}>Loading...</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {projects.map((project) => (
          <div key={project.id} style={{ background: constructionBg, border: `1px solid ${constructionBorder}`, borderRadius: 12, padding: "20px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 16, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{project.name}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>{project.client} · {project.site || project.location} · {project.startDate} to {project.endDate}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ display: "inline-block", background: `${STATUS_COLOR[project.status]}20`, color: STATUS_COLOR[project.status], borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>{project.status.replace("_", " ")}</span>
                {project.status === "planning" && <button onClick={() => moveProject(project.id, "active")} style={{ padding: "5px 10px", background: "rgba(245,158,11,.15)", border: "1px solid rgba(245,158,11,.3)", color: "#f59e0b", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Start</button>}
                {project.status === "active" && <button onClick={() => moveProject(project.id, "on_hold")} style={{ padding: "5px 10px", background: "rgba(107,114,128,.15)", border: "1px solid rgba(107,114,128,.3)", color: "#d1d5db", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Hold</button>}
                {project.status === "on_hold" && <button onClick={() => moveProject(project.id, "active")} style={{ padding: "5px 10px", background: "rgba(245,158,11,.15)", border: "1px solid rgba(245,158,11,.3)", color: "#f59e0b", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Resume</button>}
                {(project.status === "active" || project.status === "on_hold") && <button onClick={() => moveProject(project.id, "completed")} style={{ padding: "5px 10px", background: "rgba(52,211,153,.15)", border: "1px solid rgba(52,211,153,.3)", color: "#34d399", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Complete</button>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 24, marginBottom: 10, flexWrap: "wrap" }}>
              <div style={{ fontSize: 13 }}>Budget: <span style={{ color: "#818cf8", fontWeight: 600 }}>Rs. {project.budget.toLocaleString()}</span></div>
              <div style={{ fontSize: 13 }}>Spent: <span style={{ color: "#ef4444", fontWeight: 600 }}>Rs. {project.spent.toLocaleString()}</span></div>
              <div style={{ fontSize: 13 }}>Site: <span style={{ color: "#fdba74", fontWeight: 600 }}>{project.site || "Unassigned"}</span></div>
            </div>
            <div style={{ background: "rgba(255,255,255,.08)", borderRadius: 4, height: 6 }}>
              <div style={{ width: `${project.progress}%`, height: "100%", borderRadius: 4, background: STATUS_COLOR[project.status] }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>{project.progress}% complete</div>
              {(project.status === "active" || project.status === "on_hold") && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => bumpProgress(project.id, 10)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 11, cursor: "pointer" }}>+10%</button>
                  <button onClick={() => bumpProgress(project.id, 25)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 11, cursor: "pointer" }}>+25%</button>
                </div>
              )}
            </div>
          </div>
        ))}
        {!loading && projects.length === 0 && <div style={{ background: constructionBg, border: `1px solid ${constructionBorder}`, borderRadius: 12, padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)" }}>No projects yet.</div>}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${constructionBorder}`, borderRadius: 16, padding: 32, width: 520, fontFamily: constructionFont }}>
            <h2 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 700 }}>New Project</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[["Project Name", "name", "text", "span 2"], ["Client", "client", "text", ""], ["Location", "location", "text", ""], ["Start Date", "startDate", "date", ""], ["End Date", "endDate", "date", ""]].map(([label, key, type, col]) => (
                <div key={key} style={{ gridColumn: col || undefined }}>
                  <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>{label}</label>
                  <input type={type} value={String((form as Record<string, unknown>)[key] ?? "")} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} style={{ width: "100%", background: constructionBg, border: `1px solid ${constructionBorder}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Assigned Site</label>
                <select value={form.site} onChange={(e) => setForm((f) => ({ ...f, site: e.target.value }))} style={{ width: "100%", background: "#161b27", border: `1px solid ${constructionBorder}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14 }}>
                  <option value="">Select site</option>
                  {sites.map((site) => <option key={site.id} value={site.name}>{site.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Budget (Rs.)</label>
                <input type="number" value={form.budget} onChange={(e) => setForm((f) => ({ ...f, budget: Number(e.target.value) }))} style={{ width: "100%", background: constructionBg, border: `1px solid ${constructionBorder}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            </div>
            {error && <div style={{ marginTop: 12, color: "#fda4af", fontSize: 12 }}>{error}</div>}
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#f97316", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Create Project</button>
              <button onClick={() => { setShowModal(false); setError(""); }} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${constructionBorder}`, borderRadius: 8, color: "rgba(255,255,255,.6)", fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
