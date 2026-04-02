"use client";
import { useState, useMemo } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const FONT = "'Outfit','Inter',sans-serif";

type VehicleType   = "New" | "Used" | "In-Transit";
type VehicleStatus = "Available" | "Reserved" | "Sold";

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: string;
  color: string;
  type: VehicleType;
  vin: string;
  price: number;
  status: VehicleStatus;
}

const STATUS_PALETTE: Record<string, { bg: string; color: string }> = {
  Available:    { bg: "rgba(34,197,94,0.15)",   color: "#4ade80" },
  Reserved:     { bg: "rgba(251,191,36,0.15)",  color: "#fbbf24" },
  Sold:         { bg: "rgba(239,68,68,0.15)",   color: "#f87171" },
};
const TYPE_PALETTE: Record<string, { bg: string; color: string }> = {
  New:          { bg: "rgba(99,102,241,0.15)",  color: "#a5b4fc" },
  Used:         { bg: "rgba(251,191,36,0.12)",  color: "#fbbf24" },
  "In-Transit": { bg: "rgba(139,92,246,0.15)",  color: "#c084fc" },
};

const BLANK = { make: "", model: "", year: String(new Date().getFullYear()), color: "", type: "New" as VehicleType, vin: "", price: "" };

function Badge({ label, palette }: { label: string; palette: Record<string, { bg: string; color: string }> }) {
  const style = palette[label] ?? { bg: "rgba(120,120,120,0.2)", color: "#aaa" };
  return (
    <span style={{ display: "inline-block", padding: "3px 11px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: style.bg, color: style.color, letterSpacing: 0.3 }}>
      {label}
    </span>
  );
}

export default function VehiclesPage() {
  const { records, loading, create, setStatus, remove } = useBusinessRecords("auto_vehicle");
  const [modal, setModal]   = useState(false);
  const [form, setForm]     = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const vehicles = useMemo<Vehicle[]>(() =>
    records.map(r => ({
      id:     r.id,
      make:   String(r.data.make  ?? ""),
      model:  String(r.data.model ?? ""),
      year:   String(r.data.year  ?? ""),
      color:  String(r.data.color ?? ""),
      type:   (r.data.type as VehicleType) ?? "New",
      vin:    String(r.data.vin   ?? ""),
      price:  Number(r.amount     ?? r.data.price ?? 0),
      status: (r.status as VehicleStatus) ?? "Available",
    }))
  , [records]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q
      ? vehicles.filter(v =>
          v.make.toLowerCase().includes(q) ||
          v.model.toLowerCase().includes(q) ||
          v.vin.toLowerCase().includes(q) ||
          v.color.toLowerCase().includes(q)
        )
      : vehicles;
  }, [vehicles, search]);

  const kpis = useMemo(() => ({
    total:     vehicles.length,
    available: vehicles.filter(v => v.status === "Available").length,
    reserved:  vehicles.filter(v => v.status === "Reserved").length,
    sold:      vehicles.filter(v => v.status === "Sold").length,
  }), [vehicles]);

  const field = (key: keyof typeof BLANK) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [key]: e.target.value }));

  const handleCreate = async () => {
    if (!form.make.trim() || !form.model.trim()) return;
    setSaving(true);
    try {
      await create({
        title: `${form.make} ${form.model} (${form.year})`,
        status: "Available",
        amount: parseFloat(form.price) || 0,
        data: { make: form.make, model: form.model, year: form.year, color: form.color, type: form.type, vin: form.vin, price: parseFloat(form.price) || 0 },
      });
      setForm(BLANK);
      setModal(false);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = (v: Vehicle) =>
    setStatus(v.id, v.status === "Available" ? "Sold" : "Available");

  /* ── shared style snippets ── */
  const input: React.CSSProperties  = { width: "100%", background: "var(--app-bg)", border: "1px solid var(--border)", borderRadius: 9, padding: "9px 13px", color: "var(--text-primary)", fontSize: 14, fontFamily: FONT, outline: "none", boxSizing: "border-box" };
  const label: React.CSSProperties  = { fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, display: "block", marginBottom: 5 };
  const th: React.CSSProperties     = { padding: "12px 16px", textAlign: "left", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.7, borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.02)", fontWeight: 600 };
  const td: React.CSSProperties     = { padding: "13px 16px", fontSize: 14, borderBottom: "1px solid var(--border)", color: "var(--text-primary)" };

  return (
    <div style={{ minHeight: "100vh", background: "var(--app-bg)", padding: "32px 28px", fontFamily: FONT, color: "var(--text-primary)" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px", letterSpacing: -0.5 }}>Vehicle Inventory</h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Manage new, used, and in-transit stock</p>
        </div>
        <button
          onClick={() => setModal(true)}
          style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: FONT, display: "flex", alignItems: "center", gap: 6 }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add Vehicle
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Total Vehicles", value: kpis.total,     accent: "#6366f1" },
          { label: "Available",      value: kpis.available, accent: "#4ade80" },
          { label: "Reserved",       value: kpis.reserved,  accent: "#fbbf24" },
          { label: "Sold",           value: kpis.sold,      accent: "#f87171" },
        ].map(k => (
          <div key={k.label} style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 24px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>{k.label}</div>
            <div style={{ fontSize: 34, fontWeight: 700, color: k.accent, lineHeight: 1 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div style={{ marginBottom: 16 }}>
        <input
          style={{ width: "100%", background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 14px", color: "var(--text-primary)", fontSize: 14, fontFamily: FONT, outline: "none", boxSizing: "border-box" }}
          placeholder="Search by make, model, VIN, or color…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* ── Table ── */}
      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "64px 20px", color: "var(--text-muted)", fontSize: 15 }}>Loading vehicles…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 20px", color: "var(--text-muted)", fontSize: 15 }}>
            {search ? "No vehicles match your search." : "No vehicles yet — add your first one."}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Make / Model", "Year", "Color", "Type", "VIN", "Price", "Status", "Actions"].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((v, i) => (
                <tr key={v.id} style={{ background: i % 2 === 1 ? "rgba(255,255,255,0.013)" : "transparent" }}>
                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{v.make}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{v.model}</div>
                  </td>
                  <td style={td}>{v.year || "—"}</td>
                  <td style={td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 13, height: 13, borderRadius: "50%", background: v.color.toLowerCase() || "#888", border: "1px solid var(--border)", flexShrink: 0 }} />
                      {v.color || "—"}
                    </div>
                  </td>
                  <td style={td}><Badge label={v.type} palette={TYPE_PALETTE} /></td>
                  <td style={{ ...td, fontFamily: "monospace", fontSize: 12, letterSpacing: 0.4 }}>{v.vin || "—"}</td>
                  <td style={{ ...td, fontWeight: 600 }}>${v.price.toLocaleString()}</td>
                  <td style={td}><Badge label={v.status} palette={STATUS_PALETTE} /></td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                      <button
                        onClick={() => toggleStatus(v)}
                        style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 11px", fontSize: 12, cursor: "pointer", color: "var(--text-muted)", fontFamily: FONT }}
                      >
                        {v.status === "Available" ? "Mark Sold" : "Relist"}
                      </button>
                      <button
                        onClick={() => remove(v.id)}
                        title="Delete"
                        style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", fontSize: 18, padding: "0 4px", lineHeight: 1, fontFamily: FONT }}
                      >
                        ×
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Add Modal ── */}
      {modal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) { setModal(false); setForm(BLANK); } }}
        >
          <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 18, width: "100%", maxWidth: 560, padding: "32px 36px", fontFamily: FONT }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 24px" }}>Add Vehicle</h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 20px", marginBottom: 24 }}>
              {([
                { key: "make",  label: "Make / Brand",  placeholder: "Toyota"            },
                { key: "model", label: "Model",          placeholder: "Camry"             },
                { key: "year",  label: "Year",           placeholder: String(new Date().getFullYear()) },
                { key: "color", label: "Color",          placeholder: "White"             },
                { key: "vin",   label: "VIN",            placeholder: "1HGCM82633A123456" },
                { key: "price", label: "Price (USD)",    placeholder: "25000"             },
              ] as { key: keyof typeof BLANK; label: string; placeholder: string }[]).map(f => (
                <div key={f.key}>
                  <label style={label}>{f.label}</label>
                  <input style={input} placeholder={f.placeholder} value={form[f.key]} onChange={field(f.key)} />
                </div>
              ))}
              <div>
                <label style={label}>Type</label>
                <select style={{ ...input }} value={form.type} onChange={field("type")}>
                  {(["New", "Used", "In-Transit"] as VehicleType[]).map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={() => { setModal(false); setForm(BLANK); }}
                style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 20px", fontSize: 14, cursor: "pointer", color: "var(--text-muted)", fontFamily: FONT }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.make.trim() || !form.model.trim()}
                style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 10, padding: "9px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: FONT, opacity: saving ? 0.7 : 1 }}
              >
                {saving ? "Saving…" : "Add Vehicle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
