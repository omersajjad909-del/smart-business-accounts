"use client";
import { useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";

export default function ProductCatalogPage() {
  const { records, loading, create, update } = useBusinessRecords("catalog_product");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", sku: "", price: 0, costPrice: 0, stock: 0, description: "" });
  const [formError, setFormError] = useState("");

  const products = records.map(r => ({
    id: r.id,
    name: r.title,
    category: (r.data?.category as string) || "",
    sku: (r.data?.sku as string) || "",
    price: r.amount || 0,
    costPrice: Number(r.data?.costPrice) || 0,
    stock: Number(r.data?.stock) || 0,
    description: (r.data?.description as string) || "",
    status: r.status || "active",
    margin: r.amount ? Math.round((r.amount - Number(r.data?.costPrice || 0)) / r.amount * 100) : 0,
  }));

  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.status === "active").length;
  const avgMargin = products.length ? Math.round(products.reduce((a, p) => a + p.margin, 0) / products.length) : 0;

  async function save() {
    const name = form.name.trim();
    const category = form.category.trim();
    const sku = form.sku.trim();
    const description = form.description.trim();
    if (!name) {
      setFormError("Product name is required.");
      return;
    }
    if (!sku) {
      setFormError("SKU is required.");
      return;
    }
    if (form.price <= 0) {
      setFormError("Sale price must be greater than zero.");
      return;
    }
    if (form.costPrice < 0 || form.stock < 0) {
      setFormError("Cost price and stock cannot be negative.");
      return;
    }
    if (products.some((product) => product.sku.toLowerCase() === sku.toLowerCase())) {
      setFormError("SKU must be unique within this catalog.");
      return;
    }
    setFormError("");
    await create({ title: name, status: "active", amount: form.price, data: { category, sku, costPrice: form.costPrice, stock: form.stock, description } });
    setShowModal(false);
    setForm({ name: "", category: "", sku: "", price: 0, costPrice: 0, stock: 0, description: "" });
    setFormError("");
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div><h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>📦 Product Catalog</h1><p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0 }}>Manage retail product catalog</p></div>
        <button onClick={() => { setShowModal(true); setFormError(""); }} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#f97316", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Add Product</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 28 }}>
        {[{ label: "Total Products", val: totalProducts, color: "#f97316" }, { label: "Active", val: activeProducts, color: "#34d399" }, { label: "Avg Margin", val: `${avgMargin}%`, color: "#818cf8" }].map(s => (
          <div key={s.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "20px 24px" }}><div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 6 }}>{s.label}</div><div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.val}</div></div>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.4)" }}>Loading...</div>}

      <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Product", "Category", "SKU", "Cost", "Price", "Margin", "Stock", "Status", "Action"].map(h => (
            <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,.5)", borderBottom: `1px solid ${border}`, fontWeight: 600 }}>{h}</th>
          ))}</tr></thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 600 }}>{p.name}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{p.category}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 11, color: "rgba(255,255,255,.4)" }}>{p.sku}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>Rs. {p.costPrice.toLocaleString()}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#34d399", fontWeight: 600 }}>Rs. {p.price.toLocaleString()}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 600, color: p.margin > 30 ? "#34d399" : "#f59e0b" }}>{p.margin}%</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{p.stock}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <span style={{ display: "inline-block", background: p.status === "active" ? "rgba(52,211,153,.15)" : "rgba(107,114,128,.15)", color: p.status === "active" ? "#34d399" : "#6b7280", borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 600 }}>{p.status}</span>
                </td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <button onClick={() => update(p.id, { status: p.status === "active" ? "inactive" : "active" })} style={{ padding: "5px 8px", background: "rgba(249,115,22,.15)", border: "1px solid rgba(249,115,22,.3)", color: "#f97316", borderRadius: 6, fontSize: 10, cursor: "pointer" }}>Toggle</button>
                </td>
              </tr>
            ))}
            {!loading && products.length === 0 && <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)" }}>No products yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 32, width: 500, fontFamily: ff }}>
            <h2 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 700 }}>Add Product</h2>
            {formError && <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,.14)", border: "1px solid rgba(239,68,68,.28)", color: "#fca5a5", fontSize: 12 }}>{formError}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[["Product Name", "name", "text", "span 2"], ["Category", "category", "text", ""], ["SKU", "sku", "text", ""], ["Description", "description", "text", "span 2"]].map(([label, key, type, col]) => (
                <div key={key} style={{ gridColumn: col || undefined }}>
                  <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>{label}</label>
                  <input type={type} value={String((form as Record<string, unknown>)[key] ?? "")} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Cost Price (Rs.)</label>
                <input type="number" value={form.costPrice} onChange={e => setForm(f => ({ ...f, costPrice: Number(e.target.value) }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Sale Price (Rs.)</label>
                <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Stock</label>
                <input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#f97316", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Add Product</button>
              <button onClick={() => { setShowModal(false); setFormError(""); }} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.6)", fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
