"use client";
import { useState, useMemo } from "react";
import { useBusinessRecords, BusinessRecord } from "@/lib/useBusinessRecords";

// ─── Types ────────────────────────────────────────────────────────────────────

type CategoryType = "PRODUCT" | "SERVICE" | "RAW_MATERIAL" | "FINISHED_GOODS" | "SPARE_PARTS";
type CategoryStatus = "ACTIVE" | "INACTIVE";

interface ProductCategoryData {
  code: string; name: string; type: CategoryType; description: string; parentCategory: string;
}

interface ProductCategoryRecord extends ProductCategoryData {
  id: string; status: CategoryStatus; createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_META: Record<CategoryType, { label: string; color: string; bg: string; border: string }> = {
  PRODUCT:        { label: "Product",        color: "#60a5fa", bg: "rgba(96,165,250,.12)",  border: "rgba(96,165,250,.35)"  },
  SERVICE:        { label: "Service",        color: "#a78bfa", bg: "rgba(167,139,250,.12)", border: "rgba(167,139,250,.35)" },
  RAW_MATERIAL:   { label: "Raw Material",   color: "#fbbf24", bg: "rgba(251,191,36,.12)",  border: "rgba(251,191,36,.35)"  },
  FINISHED_GOODS: { label: "Finished Goods", color: "#4ade80", bg: "rgba(74,222,128,.12)",  border: "rgba(74,222,128,.35)"  },
  SPARE_PARTS:    { label: "Spare Parts",    color: "#fb923c", bg: "rgba(251,146,60,.12)",  border: "rgba(251,146,60,.35)"  },
};

const FONT = "'Outfit','Inter',sans-serif";
const ACCENT = "#14b8a6";

const s = {
  page:  { fontFamily: FONT, color: "var(--text-primary)", padding: "28px 24px", minHeight: "100vh", background: "var(--app-bg)" },
  panel: { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14 },
  inp:   { background: "rgba(255,255,255,.05)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 13px", color: "var(--text-primary)", fontFamily: FONT, fontSize: 13, width: "100%", boxSizing: "border-box" as const, outline: "none" },
  label: { fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5, fontWeight: 500 } as React.CSSProperties,
  btn:   (bg: string, sm?: boolean) => ({ background: bg, border: "none", borderRadius: 8, padding: sm ? "7px 14px" : "10px 22px", color: "#fff", fontFamily: FONT, cursor: "pointer", fontSize: sm ? 12 : 13, fontWeight: 600, lineHeight: 1 } as React.CSSProperties),
  badge: (m: { color: string; bg: string; border: string }) => ({ background: m.bg, color: m.color, border: `1px solid ${m.border}`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" as const, display: "inline-block" }),
  th:    { padding: "11px 13px", textAlign: "left" as const, fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em", borderBottom: "1px solid var(--border)" },
  td:    { padding: "12px 13px", fontSize: 13, borderBottom: "1px solid var(--border)", verticalAlign: "middle" as const },
};

const genCode = () => `CAT-${String(Math.floor(Math.random() * 9000) + 1000)}`;
const BLANK_FORM = { code: genCode(), name: "", type: "PRODUCT" as CategoryType, description: "", parentCategory: "", status: "ACTIVE" as CategoryStatus };

function mapRecord(r: BusinessRecord): ProductCategoryRecord {
  const d = (r.data ?? {}) as Partial<ProductCategoryData>;
  return {
    id: r.id, status: (r.status as CategoryStatus) ?? "ACTIVE", createdAt: r.createdAt,
    code: d.code ?? r.title ?? "", name: d.name ?? r.title ?? "",
    type: (d.type as CategoryType) ?? "PRODUCT",
    description: d.description ?? "", parentCategory: d.parentCategory ?? "",
  };
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProductCategoriesPage() {
  const { records, loading, create, update, remove } = useBusinessRecords("product_category");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState<CategoryType | "ALL">("ALL");
  const [search, setSearch] = useState("");

  const categories = useMemo(() => records.map(mapRecord), [records]);

  const filtered = useMemo(() => {
    let list = filterType === "ALL" ? categories : categories.filter(c => c.type === filterType);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
    }
    return list;
  }, [categories, filterType, search]);

  const sf = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const openNew = () => { setForm({ ...BLANK_FORM, code: genCode() }); setEditing(null); setShowForm(true); };
  const openEdit = (c: ProductCategoryRecord) => {
    setForm({ code: c.code, name: c.name, type: c.type, description: c.description, parentCategory: c.parentCategory, status: c.status });
    setEditing(c.id); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return alert("Category name is required");
    setSaving(true);
    const payload = { category: "product_category", title: form.name, status: form.status, data: { ...form } };
    editing ? await update(editing, payload) : await create(payload);
    setSaving(false); setShowForm(false);
  };

  const kpis = useMemo(() => ({
    total:   categories.length,
    active:  categories.filter(c => c.status === "ACTIVE").length,
    product: categories.filter(c => c.type === "PRODUCT").length,
    service: categories.filter(c => c.type === "SERVICE").length,
  }), [categories]);

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 5px" }}>Product Categories</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Organise your products, services, and materials into categories.</p>
        </div>
        <button onClick={openNew} style={s.btn(ACCENT)}>+ New Category</button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Categories", value: kpis.total,   color: "#a78bfa" },
          { label: "Active",           value: kpis.active,  color: "#4ade80" },
          { label: "Products",         value: kpis.product, color: "#60a5fa" },
          { label: "Services",         value: kpis.service, color: "#fb923c" },
        ].map(k => (
          <div key={k.label} style={{ ...s.panel, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ ...s.panel, padding: 24, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{editing ? "Edit" : "New"} Category</h2>
            <button onClick={() => setShowForm(false)} style={s.btn("rgba(255,255,255,.08)", true)}>✕ Close</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div><label style={s.label}>Category Code</label>
              <input value={form.code} onChange={e => sf("code", e.target.value)} style={s.inp} placeholder="CAT-001" /></div>
            <div><label style={s.label}>Category Name *</label>
              <input value={form.name} onChange={e => sf("name", e.target.value)} style={s.inp} placeholder="e.g. Electronics" /></div>
            <div><label style={s.label}>Type</label>
              <select value={form.type} onChange={e => sf("type", e.target.value)} style={s.inp}>
                {(Object.keys(TYPE_META) as CategoryType[]).map(t => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
              </select></div>
            <div><label style={s.label}>Status</label>
              <select value={form.status} onChange={e => sf("status", e.target.value)} style={s.inp}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select></div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            <div><label style={s.label}>Parent Category</label>
              <input value={form.parentCategory} onChange={e => sf("parentCategory", e.target.value)} style={s.inp} placeholder="Leave blank for top-level" /></div>
            <div><label style={s.label}>Description</label>
              <input value={form.description} onChange={e => sf("description", e.target.value)} style={s.inp} placeholder="Brief description" /></div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleSave} disabled={saving} style={s.btn(ACCENT)}>{saving ? "Saving…" : editing ? "Update" : "Create Category"}</button>
            <button onClick={() => setShowForm(false)} style={s.btn("rgba(255,255,255,.08)")}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filter + Search */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        {(["ALL", ...Object.keys(TYPE_META)] as const).map(t => (
          <button key={t} onClick={() => setFilterType(t as CategoryType | "ALL")} style={{ background: filterType === t ? ACCENT : "rgba(255,255,255,.06)", border: `1px solid ${filterType === t ? ACCENT : "var(--border)"}`, borderRadius: 8, padding: "6px 14px", color: filterType === t ? "#fff" : "var(--text-muted)", fontFamily: FONT, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            {t === "ALL" ? "All Types" : TYPE_META[t as CategoryType].label}
          </button>
        ))}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search categories…" style={{ ...s.inp, width: 200, marginLeft: "auto" }} />
      </div>

      {/* Table */}
      <div style={s.panel}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>No categories found. Create your first category.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,.03)" }}>
                <th style={s.th}>Code</th>
                <th style={s.th}>Name</th>
                <th style={s.th}>Type</th>
                <th style={s.th}>Parent</th>
                <th style={s.th}>Description</th>
                <th style={s.th}>Status</th>
                <th style={{ ...s.th, textAlign: "right" as const }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const meta = TYPE_META[c.type];
                return (
                  <tr key={c.id}>
                    <td style={{ ...s.td, fontWeight: 700, color: ACCENT, fontFamily: "monospace" }}>{c.code}</td>
                    <td style={{ ...s.td, fontWeight: 600 }}>{c.name}</td>
                    <td style={s.td}><span style={s.badge(meta)}>{meta.label}</span></td>
                    <td style={{ ...s.td, color: "var(--text-muted)" }}>{c.parentCategory || "—"}</td>
                    <td style={{ ...s.td, color: "var(--text-muted)", maxWidth: 220 }}>{c.description || "—"}</td>
                    <td style={s.td}>
                      <span style={{ ...s.badge(c.status === "ACTIVE" ? { color: "#4ade80", bg: "rgba(74,222,128,.12)", border: "rgba(74,222,128,.35)" } : { color: "#94a3b8", bg: "rgba(148,163,184,.12)", border: "rgba(148,163,184,.35)" }) }}>{c.status}</span>
                    </td>
                    <td style={{ ...s.td, textAlign: "right" as const }}>
                      <button onClick={() => openEdit(c)} style={{ ...s.btn("rgba(255,255,255,.08)", true), marginRight: 6 }}>Edit</button>
                      <button onClick={async () => { if (confirm("Delete this category?")) await remove(c.id); }} style={s.btn("rgba(248,113,113,.15)", true)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
