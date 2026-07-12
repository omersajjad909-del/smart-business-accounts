"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type BusinessType = {
  id: string;
  label: string;
  icon: string;
  phase: 1 | 2 | 3 | 4;
  liveByDefault: boolean;
  description: string;
  category: string;
  isLive: boolean;
};

export default function AdminBusinessTypesPage() {
  const [items, setItems] = useState<BusinessType[]>([]);
  const [liveIds, setLiveIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<string>("");

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/business-types");
      const d = await r.json();
      const types: BusinessType[] = Array.isArray(d.types) ? d.types : [];
      setItems(types);
      setLiveIds(new Set(types.filter(t => t.isLive).map(t => t.id)));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function toggle(id: string) {
    setLiveIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    try {
      const r = await fetch("/api/admin/business-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liveIds: Array.from(liveIds) }),
      });
      if (!r.ok) throw new Error("Save failed");
      toast.success("Business type visibility saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const filtered = useMemo(() => items.filter(b => {
    if (phaseFilter && String(b.phase) !== phaseFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!b.label.toLowerCase().includes(q) && !b.description.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [items, search, phaseFilter]);

  const byCategory = useMemo(() => {
    const map = new Map<string, BusinessType[]>();
    filtered.forEach(b => {
      if (!map.has(b.category)) map.set(b.category, []);
      map.get(b.category)!.push(b);
    });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "white", padding: "0 0 60px" }}>
      <style>{css}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>Business Types</h1>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.4)" }}>
            Control which business types are live on signup. Toggle and save.
          </p>
        </div>
        <button className="bt-btn" onClick={save} disabled={saving || loading}
          style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white" }}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Total Types", val: items.length,              color: "#818cf8" },
          { label: "Live",        val: liveIds.size,              color: "#34d399" },
          { label: "Hidden",      val: items.length - liveIds.size, color: "#94a3b8" },
        ].map(k => (
          <div key={k.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "20px 22px" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: k.color }}>{k.val}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 4, fontWeight: 600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <select className="bt-sel" value={phaseFilter} onChange={e => setPhaseFilter(e.target.value)}>
          <option value="">All Phases</option>
          <option value="1">Phase 1</option>
          <option value="2">Phase 2</option>
          <option value="3">Phase 3</option>
          <option value="4">Phase 4</option>
        </select>
        <input className="bt-inp" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: "rgba(255,255,255,.3)" }}>Loading…</div>
      ) : byCategory.map(([cat, list]) => (
        <div key={cat} style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.5)", letterSpacing: ".08em", marginBottom: 10, textTransform: "uppercase" }}>{cat}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
            {list.map(b => {
              const live = liveIds.has(b.id);
              return (
                <div key={b.id} onClick={() => toggle(b.id)}
                  style={{
                    background: live ? "rgba(52,211,153,.06)" : "rgba(255,255,255,.02)",
                    border: `1px solid ${live ? "rgba(52,211,153,.35)" : "rgba(255,255,255,.07)"}`,
                    borderRadius: 14, padding: "14px 16px", cursor: "pointer", transition: "all .2s",
                  }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ fontSize: 22 }}>{b.icon}</div>
                    <span style={{
                      padding: "2px 9px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                      background: live ? "rgba(52,211,153,.15)" : "rgba(148,163,184,.15)",
                      color: live ? "#34d399" : "#94a3b8",
                    }}>{live ? "LIVE" : "HIDDEN"}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6 }}>{b.label}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", marginTop: 4, lineHeight: 1.4 }}>{b.description}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", marginTop: 8 }}>Phase {b.phase}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

const css = `
  .bt-sel, .bt-inp { background:rgba(255,255,255,.04); border:1.5px solid rgba(255,255,255,.1); border-radius:10px; padding:8px 14px; color:white; font-family:inherit; font-size:13px; outline:none; }
  .bt-inp { min-width:260px; }
  .bt-btn { border:none; border-radius:10px; padding:9px 20px; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer; transition:opacity .2s; }
  .bt-btn:disabled { opacity:.4; cursor:not-allowed; }
  .bt-btn:hover:not(:disabled) { opacity:.85; }
`;
