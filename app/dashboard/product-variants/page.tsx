"use client";
import toast from "react-hot-toast";
import { useState, useMemo } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { useResponsive } from "@/hooks/useResponsive";

const ff = "'Outfit','Inter',sans-serif";
const ACCENT = "#e879f9";
const BG = "rgba(255,255,255,.03)";
const BORDER = "rgba(255,255,255,.08)";
const MUTED = "rgba(255,255,255,.45)";

const inp: React.CSSProperties = { width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,.05)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#fff", fontFamily: ff, outline: "none" };
const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase" as const, letterSpacing: ".06em", display: "block", marginBottom: 5 };

const PRESET_ATTRS: Record<string, string[]> = {
  "Size":   ["XS", "S", "M", "L", "XL", "XXL"],
  "Color":  ["Red", "Blue", "Green", "Black", "White", "Yellow"],
  "Weight": ["250g", "500g", "1kg", "2kg", "5kg"],
  "Volume": ["100ml", "250ml", "500ml", "1L", "2L"],
};

type VariantGroup = {
  id: string;
  product: string;
  attribute: string;
  values: string[];
  status: string;
};

export default function ProductVariantsPage() {
  const { isMobile } = useResponsive();
  const { records, loading, create, update, remove } = useBusinessRecords("variant_group");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState({ product: "", attribute: "", customAttr: "", values: "" });
  const [saving, setSaving]       = useState(false);

  const groups: VariantGroup[] = records.map(r => ({
    id:        r.id,
    product:   r.title,
    attribute: String(r.data.attribute || ""),
    values:    Array.isArray(r.data.values) ? (r.data.values as string[]) : [],
    status:    r.status || "active",
  }));

  const totalProducts  = useMemo(() => new Set(groups.map(g => g.product)).size, [groups]);
  const totalVariants  = useMemo(() => groups.reduce((a, g) => a + g.values.length, 0), [groups]);
  const activeGroups   = groups.filter(g => g.status === "active").length;

  const attrName = form.attribute === "__custom__" ? form.customAttr.trim() : form.attribute;
  const presetValues = PRESET_ATTRS[form.attribute] ?? [];

  async function handleSave() {
    const product = form.product.trim();
    const values  = form.values.split(",").map(v => v.trim()).filter(Boolean);
    if (!product)      return toast.error("Product name is required.");
    if (!attrName)     return toast.error("Attribute name is required.");
    if (!values.length) return toast.error("At least one variant value is required.");
    if (groups.some(g => g.product.toLowerCase() === product.toLowerCase() && g.attribute.toLowerCase() === attrName.toLowerCase())) {
      return toast.error("This product already has this attribute.");
    }
    setSaving(true);
    try {
      await create({ title: product, status: "active", data: { attribute: attrName, values } });
      setForm({ product: "", attribute: "", customAttr: "", values: "" });
      setShowModal(false);
      toast.success("Variant group added.");
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
          <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 900 }}>👕 Product Variants</h1>
          <p style={{ margin: 0, fontSize: 13, color: MUTED }}>Define size, color, weight and other variant attributes per product.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: ACCENT, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + Add Variant Group
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Products with Variants", value: totalProducts, color: ACCENT },
          { label: "Variant Groups",          value: activeGroups,  color: "#818cf8" },
          { label: "Total Variant Values",    value: totalVariants, color: "#34d399" },
          { label: "Attribute Types",         value: new Set(groups.map(g => g.attribute)).size, color: "#fbbf24" },
        ].map(k => (
          <div key={k.label} style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: isMobile ? "12px 10px" : "18px 20px" }}>
            <div style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Preset Attributes Info */}
      <div style={{ background: "rgba(232,121,249,.06)", border: "1px solid rgba(232,121,249,.15)", borderRadius: 12, padding: isMobile ? "12px 10px" : "14px 18px", marginBottom: 24, display: "flex", gap: 14, alignItems: "flex-start" }}>
        <span style={{ fontSize: 20 }}>💡</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: ACCENT, marginBottom: 4 }}>Built-in Attribute Presets</div>
          <div style={{ fontSize: 12, color: MUTED }}>
            Select a preset attribute (Size, Color, Weight, Volume) to auto-fill common values — or choose Custom to define your own.
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["Product", "Attribute", "Variant Values", "Count", "Status", "Action"].map(h => <th key={h} style={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ ...td, textAlign: "center", padding: 40, color: MUTED }}>Loading…</td></tr>
            ) : groups.length === 0 ? (
              <tr><td colSpan={6} style={{ ...td, textAlign: "center", padding: 48, color: MUTED }}>No variant groups yet. Add one to get started.</td></tr>
            ) : groups.map(g => (
              <tr key={g.id}>
                <td style={{ ...td, fontWeight: 700 }}>{g.product}</td>
                <td style={{ ...td }}>
                  <span style={{ padding: "2px 10px", borderRadius: 6, background: "rgba(232,121,249,.12)", color: ACCENT, fontSize: 12, fontWeight: 700 }}>{g.attribute}</span>
                </td>
                <td style={td}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {g.values.map(v => (
                      <span key={v} style={{ padding: "2px 8px", borderRadius: 6, background: "rgba(255,255,255,.07)", color: "#e2e8f0", fontSize: 12, fontWeight: 600 }}>{v}</span>
                    ))}
                  </div>
                </td>
                <td style={{ ...td, color: MUTED }}>{g.values.length}</td>
                <td style={td}>
                  <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: g.status === "active" ? "rgba(52,211,153,.1)" : "rgba(148,163,184,.1)", color: g.status === "active" ? "#34d399" : "#94a3b8" }}>
                    {g.status}
                  </span>
                </td>
                <td style={td}>
                  <button onClick={() => update(g.id, { status: g.status === "active" ? "inactive" : "active" })} style={{ background: "none", border: "none", color: "#818cf8", fontSize: 12, fontWeight: 700, cursor: "pointer", marginRight: 10 }}>
                    {g.status === "active" ? "Disable" : "Enable"}
                  </button>
                  <button onClick={() => remove(g.id)} style={{ background: "none", border: "none", color: "#f87171", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#0f172a", border: `1px solid ${BORDER}`, borderRadius: 16, padding: 28, width: 460, fontFamily: ff }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 20px" }}>Add Variant Group</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={lbl}>Product Name *</label>
                <input style={inp} value={form.product} onChange={e => setForm(p => ({ ...p, product: e.target.value }))} placeholder="e.g. Men's Classic T-Shirt" />
              </div>
              <div>
                <label style={lbl}>Attribute *</label>
                <select style={inp} value={form.attribute} onChange={e => {
                  const v = e.target.value;
                  setForm(p => ({ ...p, attribute: v, values: v !== "__custom__" && PRESET_ATTRS[v] ? PRESET_ATTRS[v].join(", ") : "" }));
                }}>
                  <option value="">— Select attribute —</option>
                  {Object.keys(PRESET_ATTRS).map(a => <option key={a} value={a}>{a}</option>)}
                  <option value="__custom__">Custom…</option>
                </select>
              </div>
              {form.attribute === "__custom__" && (
                <div>
                  <label style={lbl}>Custom Attribute Name *</label>
                  <input style={inp} value={form.customAttr} onChange={e => setForm(p => ({ ...p, customAttr: e.target.value }))} placeholder="e.g. Flavour, Style, Material" />
                </div>
              )}
              <div>
                <label style={lbl}>Values (comma separated) *</label>
                <input style={inp} value={form.values} onChange={e => setForm(p => ({ ...p, values: e.target.value }))} placeholder="e.g. S, M, L, XL" />
                {presetValues.length > 0 && (
                  <div style={{ marginTop: 6, fontSize: 11, color: MUTED }}>Preset: {presetValues.join(" · ")}</div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: ACCENT, color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? .7 : 1 }}>
                {saving ? "Saving…" : "Save Group"}
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
