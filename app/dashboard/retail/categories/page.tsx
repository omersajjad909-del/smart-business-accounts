"use client";
import { useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { useResponsive } from "@/hooks/useResponsive";

interface Category {
  id: string;
  name: string;
  color: string;
  description: string;
  productCount: number;
}

const ff = "'Outfit','Inter',sans-serif";
const COLORS = [
  "#f97316","#6366f1","#10b981","#f59e0b","#ef4444",
  "#8b5cf6","#06b6d4","#ec4899","#14b8a6","#3b82f6",
];

export default function RetailCategoriesPage() {
  const { isMobile } = useResponsive();
  const {
    records: catRecords,
    loading,
    create,
    update,
    remove,
  } = useBusinessRecords("retail_category");

  const { records: productRecords } = useBusinessRecords("catalog_product");

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", color: "#f97316", description: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const productCountByCategory = productRecords.reduce<Record<string, number>>((acc, r) => {
    const cat = String(r.data?.category || "").toLowerCase().trim();
    if (cat) acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const categories: Category[] = catRecords.map(r => ({
    id: r.id,
    name: r.title,
    color: String(r.data?.color || "#f97316"),
    description: String(r.data?.description || ""),
    productCount: productCountByCategory[r.title.toLowerCase().trim()] || 0,
  }));

  const filtered = categories.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  function openAdd() {
    setEditId(null);
    setForm({ name: "", color: "#f97316", description: "" });
    setError("");
    setShowModal(true);
  }

  function openEdit(c: Category) {
    setEditId(c.id);
    setForm({ name: c.name, color: c.color, description: c.description });
    setError("");
    setShowModal(true);
  }

  async function handleSave() {
    const name = form.name.trim();
    if (!name) { setError("Category name is required."); return; }
    const duplicate = categories.find(
      c => c.name.toLowerCase() === name.toLowerCase() && c.id !== editId
    );
    if (duplicate) { setError("A category with this name already exists."); return; }
    setSaving(true);
    setError("");
    try {
      if (editId) {
        await update(editId, { title: name, data: { color: form.color, description: form.description } });
      } else {
        await create({ title: name, data: { color: form.color, description: form.description } });
      }
      setShowModal(false);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await remove(id);
    setDeleteId(null);
  }

  const inp: React.CSSProperties = {
    padding: "9px 12px",
    background: "var(--app-bg)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--text-primary)",
    fontSize: 13,
    width: "100%",
    boxSizing: "border-box",
    fontFamily: ff,
    outline: "none",
  };

  const totalProducts = productRecords.length;
  const categorized = productRecords.filter(r => r.data?.category).length;

  return (
    <div style={{ fontFamily: ff, minHeight: "100vh", background: "var(--app-bg)", padding: isMobile ? "15px 11px" : "28px 24px", color: "var(--text-primary)" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');`}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>📂 Product Categories</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
            Organize your retail products into categories
          </p>
        </div>
        <button
          onClick={openAdd}
          style={{ background: "linear-gradient(135deg,#f97316,#ea580c)", color: "white", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        >
          + Add Category
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total Categories", val: categories.length, color: "#f97316" },
          { label: "Products Categorized", val: categorized, color: "#10b981" },
          { label: "Uncategorized Products", val: totalProducts - categorized, color: "#f59e0b" },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: isMobile ? "12px 10px" : "16px 20px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search categories..."
          style={{ ...inp, maxWidth: 320 }}
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)", fontSize: 14 }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>📂</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
            {search ? "No categories match your search" : "No categories yet"}
          </div>
          <div style={{ fontSize: 13 }}>
            {!search && 'Click "+ Add Category" to get started'}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 }}>
          {filtered.map(cat => (
            <div
              key={cat.id}
              style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 20px 16px", position: "relative", overflow: "hidden" }}
            >
              {/* top color stripe */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: cat.color, borderRadius: "14px 14px 0 0" }} />

              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, paddingTop: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat.name}</span>
                  </div>
                  {cat.description && (
                    <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 10px", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {cat.description}
                    </p>
                  )}
                  <div style={{ display: "inline-block", background: `${cat.color}22`, color: cat.color, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                    {cat.productCount} product{cat.productCount !== 1 ? "s" : ""}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => openEdit(cat)}
                    style={{ background: "rgba(99,102,241,.12)", color: "#818cf8", border: "none", borderRadius: 7, padding: "5px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteId(cat.id)}
                    style={{ background: "rgba(239,68,68,.1)", color: "#f87171", border: "none", borderRadius: 7, padding: "5px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}
                  >
                    Del
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 20 }}>
          <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 18, padding: 28, width: "100%", maxWidth: 440, fontFamily: ff }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{editId ? "Edit Category" : "Add Category"}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>✕</button>
            </div>

            {error && (
              <div style={{ marginBottom: 14, padding: "9px 12px", borderRadius: 8, background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.25)", color: "#fca5a5", fontSize: 12 }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", fontWeight: 600, marginBottom: 6 }}>Category Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value.toUpperCase() }))}
                  onKeyDown={e => e.key === "Enter" && handleSave()}
                  placeholder="e.g. Beverages, Snacks, Electronics…"
                  style={inp}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", fontWeight: 600, marginBottom: 10 }}>Color</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setForm(p => ({ ...p, color: c }))}
                      style={{
                        width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer",
                        border: form.color === c ? "3px solid white" : "3px solid transparent",
                        outline: form.color === c ? `2px solid ${c}` : "none",
                        outlineOffset: 2, transition: "transform .1s",
                      }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", fontWeight: 600, marginBottom: 6 }}>Description (optional)</label>
                <input
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Short description of this category…"
                  style={inp}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 22 }}>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: "var(--app-bg)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: 10, padding: "10px 20px", fontSize: 13, cursor: "pointer", fontFamily: ff }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ background: "linear-gradient(135deg,#f97316,#ea580c)", color: "white", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1, fontFamily: ff }}
              >
                {saving ? "Saving…" : editId ? "Save Changes" : "Add Category"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, width: 360, textAlign: "center", fontFamily: ff }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>Delete Category?</h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 22px", lineHeight: 1.6 }}>
              Products in this category won&apos;t be deleted — only the category label will be removed.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                onClick={() => setDeleteId(null)}
                style={{ background: "var(--app-bg)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: 10, padding: "10px 20px", fontSize: 13, cursor: "pointer", fontFamily: ff }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                style={{ background: "rgba(239,68,68,.15)", color: "#f87171", border: "1px solid rgba(239,68,68,.3)", borderRadius: 10, padding: "10px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: ff }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
