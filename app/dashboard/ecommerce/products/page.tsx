"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { ecommerceBg, ecommerceBorder, ecommerceFont, ecommerceMuted, mapEcommerceProducts, platformOptions } from "../_shared";

type ProductForm = {
  name: string;
  category: string;
  sku: string;
  price: string;
  stock: string;
  platform: string;
};

const emptyForm: ProductForm = {
  name: "",
  category: "",
  sku: "",
  price: "",
  stock: "",
  platform: "Website",
};

export default function EcommerceProductsPage() {
  const { records, loading, create, update } = useBusinessRecords("ecommerce_product");
  const products = useMemo(() => mapEcommerceProducts(records), [records]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const totalRevenue = products.reduce((sum, product) => sum + product.price * product.sales, 0);
  const lowStock = products.filter((product) => product.stock > 0 && product.stock <= 5).length;

  async function save() {
    const name = form.name.trim();
    const category = form.category.trim();
    const sku = form.sku.trim().toUpperCase();
    const price = Number(form.price);
    const stock = Number(form.stock);

    if (!name) return setError("Product name zaroori hai.");
    if (!category) return setError("Category select ya enter karein.");
    if (!sku) return setError("SKU zaroori hai.");
    if (!Number.isFinite(price) || price <= 0) return setError("Price zero se bari honi chahiye.");
    if (!Number.isFinite(stock) || stock < 0) return setError("Stock negative nahi ho sakta.");
    if (products.some((product) => product.sku.toUpperCase() === sku)) return setError("Ye SKU already maujood hai.");

    setSaving(true);
    setError("");
    try {
      await create({
        title: name,
        status: "active",
        amount: price,
        data: { category, sku, stock, platform: form.platform, sales: 0 },
      });
      setShowModal(false);
      setForm(emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Product save nahi ho saka.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: ecommerceFont, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 6px" }}>Product Listings</h1>
          <p style={{ fontSize: 13, color: ecommerceMuted, margin: 0 }}>Catalog, pricing, SKU aur platform presence ko ek jagah se control karein.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 20px", borderRadius: 12, border: "none", background: "#6366f1", color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
          + Add Product
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total Products", value: products.length, color: "#818cf8" },
          { label: "Active Listings", value: products.filter((product) => product.status === "active").length, color: "#34d399" },
          { label: "Low Stock", value: lowStock, color: "#f59e0b" },
          { label: "Sales Value", value: `Rs. ${totalRevenue.toLocaleString()}`, color: "#a78bfa" },
        ].map((card) => (
          <div key={card.label} style={{ background: ecommerceBg, border: `1px solid ${ecommerceBorder}`, borderRadius: 16, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: ecommerceMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ marginBottom: 16, background: "rgba(248,113,113,.12)", border: "1px solid rgba(248,113,113,.28)", color: "#fca5a5", borderRadius: 12, padding: "12px 14px", fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 44, color: ecommerceMuted }}>Loading products...</div>
      ) : (
        <div style={{ background: ecommerceBg, border: `1px solid ${ecommerceBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Product", "Category", "SKU", "Platform", "Price", "Stock", "Sales", "Status"].map((heading) => (
                  <th key={heading} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: ecommerceMuted, borderBottom: `1px solid ${ecommerceBorder}`, fontWeight: 700 }}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 700 }}>{product.name}</td>
                  <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{product.category}</td>
                  <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 12, color: ecommerceMuted }}>{product.sku}</td>
                  <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{product.platform}</td>
                  <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#34d399", fontWeight: 700 }}>Rs. {product.price.toLocaleString()}</td>
                  <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: product.stock === 0 ? "#f87171" : "#fff", fontWeight: product.stock <= 5 ? 700 : 500 }}>{product.stock}</td>
                  <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{product.sales}</td>
                  <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                    <button
                      onClick={() => update(product.id, { status: product.status === "active" ? "inactive" : "active" })}
                      style={{
                        display: "inline-block",
                        background: product.status === "active" ? "rgba(52,211,153,.15)" : "rgba(107,114,128,.15)",
                        color: product.status === "active" ? "#34d399" : "#94a3b8",
                        borderRadius: 999,
                        padding: "4px 10px",
                        fontSize: 11,
                        fontWeight: 700,
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      {product.status}
                    </button>
                  </td>
                </tr>
              ))}
              {!products.length && (
                <tr>
                  <td colSpan={8} style={{ padding: 42, textAlign: "center", color: "rgba(255,255,255,.28)" }}>
                    Catalog abhi empty hai. Pehla product add karein.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${ecommerceBorder}`, borderRadius: 18, padding: 32, width: 520, fontFamily: ecommerceFont }}>
            <h2 style={{ margin: "0 0 24px", fontSize: 20, fontWeight: 800 }}>Add Product Listing</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: ecommerceMuted, marginBottom: 6 }}>Product Name</label>
                <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: ecommerceMuted, marginBottom: 6 }}>Category</label>
                <input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: ecommerceMuted, marginBottom: 6 }}>SKU</label>
                <input value={form.sku} onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))} style={inputStyle} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: ecommerceMuted, marginBottom: 6 }}>Platform</label>
                <select value={form.platform} onChange={(event) => setForm((current) => ({ ...current, platform: event.target.value }))} style={inputStyle}>
                  {platformOptions.map((platform) => <option key={platform}>{platform}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: ecommerceMuted, marginBottom: 6 }}>Price (Rs.)</label>
                <input type="number" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: ecommerceMuted, marginBottom: 6 }}>Opening Stock</label>
                <input type="number" value={form.stock} onChange={(event) => setForm((current) => ({ ...current, stock: event.target.value }))} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <button onClick={save} disabled={saving} style={{ flex: 1, padding: "11px 0", background: "#6366f1", border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving..." : "Add Product"}
              </button>
              <button onClick={() => { setShowModal(false); setError(""); }} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${ecommerceBorder}`, borderRadius: 10, color: "rgba(255,255,255,.65)", fontSize: 14, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,.04)",
  border: "1px solid rgba(255,255,255,.08)",
  borderRadius: 10,
  padding: "10px 12px",
  color: "#fff",
  fontSize: 14,
  boxSizing: "border-box",
};
