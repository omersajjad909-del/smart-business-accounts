"use client";
import toast from "react-hot-toast";
import { useState, useMemo } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { useResponsive } from "@/hooks/useResponsive";

const ff = "'Outfit','Inter',sans-serif";
const ACCENT = "#f97316";
const BG = "rgba(255,255,255,.03)";
const BORDER = "rgba(255,255,255,.08)";
const MUTED = "rgba(255,255,255,.45)";

const inp: React.CSSProperties = { width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,.05)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#fff", fontFamily: ff, outline: "none" };
const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase" as const, letterSpacing: ".06em", display: "block", marginBottom: 5 };

const PROMO_TYPES = [
  { value: "PERCENT_OFF",    label: "% Off",          icon: "🏷️", desc: "Percentage discount on item or category" },
  { value: "FIXED_OFF",      label: "Fixed Amount Off", icon: "💵", desc: "Fixed rupee discount on qualifying items" },
  { value: "BOGO",           label: "Buy 1 Get 1",    icon: "🎁", desc: "Buy one item, get one free" },
  { value: "BUNDLE",         label: "Bundle Price",   icon: "📦", desc: "Special price when buying a set together" },
  { value: "MIN_PURCHASE",   label: "Min Purchase",   icon: "🛒", desc: "Discount applied when order exceeds a minimum value" },
];

const SCOPE_OPTIONS = ["All Products", "Specific Category", "Specific Product", "Entire Order"];

type Promo = {
  id: string; name: string; type: string; scope: string;
  discount: number; minValue: number; startDate: string; endDate: string; status: string;
};

const EMPTY = { name: "", type: "PERCENT_OFF", scope: "All Products", discount: "", minValue: "", startDate: "", endDate: "" };

function PromoTypeBadge({ type }: { type: string }) {
  const t = PROMO_TYPES.find(p => p.value === type);
  return (
    <span style={{ padding: "2px 8px", borderRadius: 6, background: "rgba(249,115,22,.12)", color: ACCENT, fontSize: 11, fontWeight: 700 }}>
      {t?.icon} {t?.label || type}
    </span>
  );
}

function statusColor(s: string) {
  if (s === "active") return "#34d399";
  if (s === "scheduled") return "#38bdf8";
  if (s === "expired") return "#94a3b8";
  return "#fbbf24";
}

function computeStatus(startDate: string, endDate: string, manualStatus: string): string {
  if (manualStatus === "paused") return "paused";
  const now = Date.now();
  const start = startDate ? new Date(startDate).getTime() : 0;
  const end   = endDate   ? new Date(endDate).getTime()   : Infinity;
  if (now < start) return "scheduled";
  if (now > end)   return "expired";
  return manualStatus === "active" ? "active" : "paused";
}

export default function PromotionsPage() {
  const { isMobile } = useResponsive();
  const { records, loading, create, update, remove } = useBusinessRecords("promotion");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [tab, setTab]             = useState("all");

  const promos: Promo[] = records.map(r => ({
    id:        r.id,
    name:      r.title,
    type:      String(r.data.type     || "PERCENT_OFF"),
    scope:     String(r.data.scope    || "All Products"),
    discount:  Number(r.data.discount || 0),
    minValue:  Number(r.data.minValue || 0),
    startDate: String(r.data.startDate || ""),
    endDate:   String(r.data.endDate   || ""),
    status:    computeStatus(String(r.data.startDate || ""), String(r.data.endDate || ""), r.status || "active"),
  }));

  const filtered = tab === "all" ? promos : promos.filter(p => p.status === tab);
  const activeCount    = promos.filter(p => p.status === "active").length;
  const scheduledCount = promos.filter(p => p.status === "scheduled").length;
  const expiredCount   = promos.filter(p => p.status === "expired").length;

  const selectedType = PROMO_TYPES.find(t => t.value === form.type);

  async function handleSave() {
    const name     = form.name.trim();
    const discount = Number(form.discount);
    if (!name)         return toast.error("Promotion name is required.");
    if (discount <= 0) return toast.error("Discount value must be greater than zero.");
    if (!form.startDate || !form.endDate) return toast.error("Start and end dates are required.");
    if (new Date(form.endDate) < new Date(form.startDate)) return toast.error("End date cannot be before start date.");
    if (promos.some(p => p.name.toLowerCase() === name.toLowerCase() && p.status !== "expired")) return toast.error("A promotion with this name already exists.");
    setSaving(true);
    try {
      const status = computeStatus(form.startDate, form.endDate, "active");
      await create({ title: name, status, date: form.startDate, amount: discount, data: { type: form.type, scope: form.scope, discount, minValue: Number(form.minValue) || 0, startDate: form.startDate, endDate: form.endDate } });
      setForm(EMPTY);
      setShowModal(false);
      toast.success("Promotion created.");
    } catch { toast.error("Failed to save."); }
    finally { setSaving(false); }
  }

  const th: React.CSSProperties = { padding: "10px 14px", fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase" as const, letterSpacing: ".05em", textAlign: "left" as const, borderBottom: `1px solid ${BORDER}` };
  const td: React.CSSProperties = { padding: "13px 14px", fontSize: 13, borderBottom: `1px solid ${BORDER}` };

  return (
    <div style={{ padding: isMobile ? "15px 14px" : "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 900 }}>🏷️ Discount & Promotions</h1>
          <p style={{ margin: 0, fontSize: 13, color: MUTED }}>Create and manage promotional rules — auto-applied at POS and on invoices.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: ACCENT, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + New Promotion
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total Promotions", value: promos.length,   color: ACCENT },
          { label: "Active Now",       value: activeCount,      color: "#34d399" },
          { label: "Scheduled",        value: scheduledCount,   color: "#38bdf8" },
          { label: "Expired",          value: expiredCount,     color: "#94a3b8" },
        ].map(k => (
          <div key={k.label} style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: isMobile ? "12px 10px" : "18px 20px" }}>
            <div style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[{ v: "all", l: "All" }, { v: "active", l: "Active" }, { v: "scheduled", l: "Scheduled" }, { v: "paused", l: "Paused" }, { v: "expired", l: "Expired" }].map(t => (
          <button key={t.v} onClick={() => setTab(t.v)} style={{ padding: "7px 16px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", background: tab === t.v ? ACCENT : "rgba(255,255,255,.06)", color: tab === t.v ? "#fff" : MUTED }}>
            {t.l}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["Promotion Name", "Type", "Scope", "Discount", "Duration", "Status", "Actions"].map(h => <th key={h} style={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ ...td, textAlign: "center", padding: 40, color: MUTED }}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ ...td, textAlign: "center", padding: 48, color: MUTED }}>No promotions found.</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id}>
                <td style={{ ...td, fontWeight: 700 }}>{p.name}</td>
                <td style={td}><PromoTypeBadge type={p.type} /></td>
                <td style={{ ...td, color: MUTED, fontSize: 12 }}>{p.scope}</td>
                <td style={{ ...td, color: ACCENT, fontWeight: 800 }}>
                  {p.type === "FIXED_OFF" ? `Rs. ${p.discount.toLocaleString()}` : p.type === "BOGO" ? "1+1" : `${p.discount}%`}
                  {p.minValue > 0 && <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>Min: Rs. {p.minValue.toLocaleString()}</div>}
                </td>
                <td style={{ ...td, fontSize: 11, color: MUTED }}>
                  <div>{p.startDate}</div>
                  <div>→ {p.endDate}</div>
                </td>
                <td style={td}>
                  <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${statusColor(p.status)}18`, color: statusColor(p.status) }}>
                    {p.status}
                  </span>
                </td>
                <td style={td}>
                  {p.status === "active" && (
                    <button onClick={() => update(p.id, { status: "paused" })} style={{ background: "none", border: "none", color: "#fbbf24", fontSize: 12, fontWeight: 700, cursor: "pointer", marginRight: 10 }}>Pause</button>
                  )}
                  {p.status === "paused" && (
                    <button onClick={() => update(p.id, { status: "active" })} style={{ background: "none", border: "none", color: "#34d399", fontSize: 12, fontWeight: 700, cursor: "pointer", marginRight: 10 }}>Resume</button>
                  )}
                  <button onClick={() => remove(p.id)} style={{ background: "none", border: "none", color: "#f87171", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#0f172a", border: `1px solid ${BORDER}`, borderRadius: 16, padding: 28, width: 500, fontFamily: ff, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 20px" }}>New Promotion</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div><label style={lbl}>Promotion Name *</label><input style={inp} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Eid Sale 20% Off" /></div>

              <div>
                <label style={lbl}>Promotion Type *</label>
                <select style={inp} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                  {PROMO_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label} — {t.desc}</option>)}
                </select>
                {selectedType && <div style={{ marginTop: 5, fontSize: 11, color: MUTED }}>{selectedType.desc}</div>}
              </div>

              <div>
                <label style={lbl}>Applies To *</label>
                <select style={inp} value={form.scope} onChange={e => setForm(p => ({ ...p, scope: e.target.value }))}>
                  {SCOPE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>{form.type === "FIXED_OFF" ? "Discount Amount (Rs.) *" : form.type === "BOGO" ? "Free Items Count *" : "Discount % *"}</label>
                  <input type="number" style={inp} min="0" value={form.discount} onChange={e => setForm(p => ({ ...p, discount: e.target.value }))} placeholder={form.type === "FIXED_OFF" ? "500" : "10"} />
                </div>
                <div>
                  <label style={lbl}>Min. Purchase (Rs.)</label>
                  <input type="number" style={inp} min="0" value={form.minValue} onChange={e => setForm(p => ({ ...p, minValue: e.target.value }))} placeholder="0 = no minimum" />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>Start Date *</label><input type="date" style={inp} value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} /></div>
                <div><label style={lbl}>End Date *</label><input type="date" style={inp} value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} /></div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: ACCENT, color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? .7 : 1 }}>
                {saving ? "Saving…" : "Create Promotion"}
              </button>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontSize: 13, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
