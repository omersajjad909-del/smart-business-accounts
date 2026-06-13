"use client";
import { useState, useEffect } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";

const UNITS = ["Pcs", "Kg", "Gram", "Ltr", "ML", "Meter", "Foot", "Box", "Pack", "Dozen", "Pair", "Set", "Bag", "Bottle", "Can", "Carton"];

const emptyForm = { name: "", category: "", sku: "", unit: "Pcs", price: 0, costPrice: 0, stock: 0, description: "" };

export default function ProductCatalogPage() {
  const user = getCurrentUser();
  const authHeaders: HeadersInit = {
    "Content-Type": "application/json",
    "x-user-id": (user as { id?: string } | null)?.id || "",
    "x-user-role": "ADMIN",
    "x-company-id": (user as { companyId?: string } | null)?.companyId || "",
  };

  const { records, loading, create, update, remove } = useBusinessRecords("catalog_product");
  const { records: catRecords } = useBusinessRecords("retail_category");
  const categoryNames = catRecords.map(r => r.title);

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Receive stock modal
  const [receiveProduct, setReceiveProduct] = useState<{ id: string; name: string; itemNewId: string; costPrice: number; stock: number } | null>(null);
  const [receiveForm, setReceiveForm] = useState({ qty: 1, costPrice: 0, supplierId: "", supplierName: "", notes: "" });
  const [receiveSaving, setReceiveSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch("/api/accounts", { headers: authHeaders })
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : d.accounts ?? [];
        setSuppliers(list.filter((a: any) => a.partyType === "SUPPLIER").map((a: any) => ({ id: a.id, name: a.name })));
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allProducts = records.map(r => ({
    id: r.id,
    name: r.title,
    category: (r.data?.category as string) || "",
    sku: (r.data?.sku as string) || "",
    unit: (r.data?.unit as string) || "Pcs",
    price: r.amount || 0,
    costPrice: Number(r.data?.costPrice) || 0,
    stock: Number(r.data?.stock) || 0,
    description: (r.data?.description as string) || "",
    status: r.status || "active",
    margin: r.amount ? Math.round((r.amount - Number(r.data?.costPrice || 0)) / r.amount * 100) : 0,
  }));

  const products = filterCategory
    ? allProducts.filter(p => p.category.toLowerCase() === filterCategory.toLowerCase())
    : allProducts;

  const totalProducts = allProducts.length;
  const activeProducts = allProducts.filter(p => p.status === "active").length;
  const avgMargin = allProducts.length
    ? Math.round(allProducts.reduce((a, p) => a + p.margin, 0) / allProducts.length)
    : 0;

  function openAdd() {
    setEditId(null);
    setForm(emptyForm);
    setFormError("");
    setShowModal(true);
  }

  function openEdit(p: typeof allProducts[0]) {
    setEditId(p.id);
    setForm({ name: p.name, category: p.category, sku: p.sku, unit: p.unit, price: p.price, costPrice: p.costPrice, stock: p.stock, description: p.description });
    setFormError("");
    setShowModal(true);
  }

  async function save() {
    const name = form.name.trim();
    const category = form.category.trim();
    const sku = form.sku.trim();
    const description = form.description.trim();

    if (!name) { setFormError("Product name is required."); return; }
    if (!sku) { setFormError("SKU is required."); return; }
    if (form.price <= 0) { setFormError("Sale price must be greater than zero."); return; }
    if (form.costPrice < 0 || form.stock < 0) { setFormError("Cost price and stock cannot be negative."); return; }

    const skuExists = allProducts.some(p => p.sku.toLowerCase() === sku.toLowerCase() && p.id !== editId);
    if (skuExists) { setFormError("SKU already exists. Use a different SKU."); return; }

    setFormError("");

    if (editId) {
      const existing = records.find(r => r.id === editId);
      const itemNewId = existing?.data?.itemNewId as string | undefined;
      const existingStock = Number(existing?.data?.stock ?? form.stock);
      await update(editId, {
        title: name,
        amount: form.price,
        data: { category, sku, unit: form.unit, costPrice: form.costPrice, stock: existingStock, description, ...(itemNewId ? { itemNewId } : {}) },
      });
      // Sync to Item Master
      if (itemNewId) {
        await fetch(`/api/items-new`, {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify({ id: itemNewId, name, category: "TRADING", unit: form.unit, rate: form.price, purchaseRate: form.costPrice, taxRate: 0, barcode: sku, description }),
        });
      } else {
        const res = await fetch("/api/items-new", {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ name, category: "TRADING", unit: form.unit, rate: form.price, purchaseRate: form.costPrice, taxRate: 0, barcode: sku, description }),
        });
        if (res.ok) {
          const created = await res.json();
          await update(editId, { data: { itemNewId: created.id } });
        }
      }
    } else {
      const saved = await create({
        title: name,
        status: "active",
        amount: form.price,
        data: { category, sku, unit: form.unit, costPrice: form.costPrice, stock: form.stock, description },
      });
      // Sync to Item Master
      const res = await fetch("/api/items-new", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ name, category: "TRADING", unit: form.unit, rate: form.price, purchaseRate: form.costPrice, taxRate: 0, barcode: sku, description }),
      });
      if (res.ok) {
        const created = await res.json();
        await update(saved.id, { data: { itemNewId: created.id } });
        // Create opening InventoryTxn if initial stock > 0
        if (form.stock > 0) {
          await fetch("/api/retail/stock-receipt", {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify({ itemNewId: created.id, qty: form.stock, costPrice: form.costPrice }),
          });
        }
      }
    }

    setShowModal(false);
    setForm(emptyForm);
  }

  async function handleDelete(id: string) {
    const existing = records.find(r => r.id === id);
    const itemNewId = existing?.data?.itemNewId as string | undefined;
    await remove(id);
    if (itemNewId) {
      await fetch(`/api/items-new?id=${itemNewId}`, { method: "DELETE", headers: authHeaders });
    }
    setDeleteId(null);
  }

  async function syncAllToItemMaster() {
    const unsynced = records.filter(r => !r.data?.itemNewId);
    if (!unsynced.length) return;
    for (const r of unsynced) {
      const res = await fetch("/api/items-new", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          name: r.title, category: "TRADING", unit: "PCS",
          rate: r.amount || 0, purchaseRate: Number(r.data?.costPrice || 0),
          taxRate: 0, barcode: (r.data?.sku as string) || "",
          description: (r.data?.description as string) || "",
        }),
      });
      if (res.ok) {
        const created = await res.json();
        await update(r.id, { data: { ...r.data, itemNewId: created.id } });
        // Create opening InventoryTxn if product has existing stock
        const openingStock = Number(r.data?.stock || 0);
        if (openingStock > 0) {
          await fetch("/api/retail/stock-receipt", {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify({ itemNewId: created.id, qty: openingStock, costPrice: Number(r.data?.costPrice || 0) }),
          });
        }
      }
    }
  }

  function openReceive(p: typeof allProducts[0]) {
    setReceiveProduct({ id: p.id, name: p.name, itemNewId: (records.find(r => r.id === p.id)?.data?.itemNewId as string) || "", costPrice: p.costPrice, stock: p.stock });
    setReceiveForm({ qty: 1, costPrice: p.costPrice, supplierId: suppliers[0]?.id || "", supplierName: suppliers[0]?.name || "", notes: "" });
  }

  async function handleReceive() {
    if (!receiveProduct || receiveForm.qty <= 0) return;
    setReceiveSaving(true);
    try {
      const stockBefore = receiveProduct.stock;
      const stockAfter = stockBefore + receiveForm.qty;

      // 1. Create InventoryTxn (if linked to ItemNew)
      if (receiveProduct.itemNewId) {
        const res = await fetch("/api/retail/stock-receipt", {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ itemNewId: receiveProduct.itemNewId, qty: receiveForm.qty, costPrice: receiveForm.costPrice }),
        });
        if (!res.ok) throw new Error("InventoryTxn failed");
      }

      // 2. Create proper PurchaseInvoice if supplier is selected
      if (receiveForm.supplierId && receiveProduct.itemNewId) {
        const piCount = await fetch("/api/purchase-invoice", { headers: authHeaders }).then(r => r.json()).then(d => Array.isArray(d) ? d.length : 0).catch(() => 0);
        await fetch("/api/purchase-invoice", {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            supplierId: receiveForm.supplierId,
            date: new Date().toISOString().slice(0, 10),
            items: [{ itemId: receiveProduct.itemNewId, name: receiveProduct.name, qty: receiveForm.qty, rate: receiveForm.costPrice, discountPercent: 0, taxPercent: 0, unit: "", sku: "", description: "" }],
            total: receiveForm.qty * receiveForm.costPrice,
            freight: 0,
            approvalStatus: "APPROVED",
            location: "MAIN",
            notes: receiveForm.notes,
            reference: `SR-${String(piCount + 1).padStart(4, "0")}`,
          }),
        }).catch(() => {});
      }

      // 3. Save stock_receipt business_record
      const { create: createReceipt } = { create: async (d: object) => { await fetch("/api/business-records", { method: "POST", headers: authHeaders, body: JSON.stringify({ type: "stock_receipt", title: receiveProduct.name, amount: receiveForm.qty * receiveForm.costPrice, data: d }) }); } };
      await createReceipt({ productName: receiveProduct.name, itemNewId: receiveProduct.itemNewId, qtyReceived: receiveForm.qty, costPrice: receiveForm.costPrice, supplierId: receiveForm.supplierId, supplierName: receiveForm.supplierName || "—", notes: receiveForm.notes, stockBefore, stockAfter });

      // 4. Update catalog_product data.stock
      const existing = records.find(r => r.id === receiveProduct.id);
      await update(receiveProduct.id, { data: { ...existing?.data, stock: stockAfter } });

      setReceiveProduct(null);
    } catch (e) {
      console.error(e);
    }
    setReceiveSaving(false);
  }

  const inp: React.CSSProperties = {
    width: "100%", background: bg, border: `1px solid ${border}`,
    borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box",
  };

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>📦 Product Catalog</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0 }}>Manage retail product catalog</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={syncAllToItemMaster}
            title="Sync all catalog products to Item Master"
            style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(99,102,241,.35)", background: "rgba(99,102,241,.1)", color: "#a5b4fc", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            🔗 Sync to Item Master
          </button>
          <Link prefetch={false} href="/dashboard/retail/categories" style={{ padding: "10px 16px", borderRadius: 10, border: `1px solid ${border}`, background: "transparent", color: "rgba(255,255,255,.7)", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            📂 Categories
          </Link>
          <button onClick={openAdd} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#f97316", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            + Add Product
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Total Products", val: totalProducts, color: "#f97316" },
          { label: "Active", val: activeProducts, color: "#34d399" },
          { label: "Avg Margin", val: `${avgMargin}%`, color: "#818cf8" },
        ].map(s => (
          <div key={s.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "20px 24px" }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.4)" }}>Loading...</div>}

      {/* Category filter pills */}
      {categoryNames.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {["All", ...categoryNames].map(n => {
            const active = n === "All" ? filterCategory === "" : filterCategory === n;
            return (
              <button
                key={n}
                onClick={() => setFilterCategory(n === "All" ? "" : (n === filterCategory ? "" : n))}
                style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${active ? "#f97316" : border}`, background: active ? "rgba(249,115,22,.15)" : "transparent", color: active ? "#f97316" : "rgba(255,255,255,.5)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                {n}
              </button>
            );
          })}
        </div>
      )}

      {/* Table */}
      <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Product", "Category", "SKU", "Unit", "Cost", "Sale Price", "Margin", "Stock", "Status", "Actions"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,.5)", borderBottom: `1px solid ${border}`, fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                <td style={{ padding: "13px 16px", fontWeight: 600 }}>{p.name}</td>
                <td style={{ padding: "13px 16px", fontSize: 13 }}>{p.category || <span style={{ color: "rgba(255,255,255,.2)" }}>—</span>}</td>
                <td style={{ padding: "13px 16px", fontSize: 11, color: "rgba(255,255,255,.4)" }}>{p.sku}</td>
                <td style={{ padding: "13px 16px" }}>
                  <span style={{ background: "rgba(99,102,241,.12)", color: "#a5b4fc", borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{p.unit}</span>
                </td>
                <td style={{ padding: "13px 16px", fontSize: 13 }}>Rs. {p.costPrice.toLocaleString()}</td>
                <td style={{ padding: "13px 16px", color: "#34d399", fontWeight: 600 }}>Rs. {p.price.toLocaleString()}</td>
                <td style={{ padding: "13px 16px", fontWeight: 600, color: p.margin > 30 ? "#34d399" : "#f59e0b" }}>{p.margin}%</td>
                <td style={{ padding: "13px 16px" }}>
                  <span style={{ fontWeight: 700, color: p.stock <= 0 ? "#f87171" : p.stock <= 5 ? "#f59e0b" : "#34d399" }}>
                    {p.stock}
                  </span>
                  {p.stock <= 0 && <span style={{ fontSize: 10, marginLeft: 4, color: "#f87171" }}>OUT</span>}
                  {p.stock > 0 && p.stock <= 5 && <span style={{ fontSize: 10, marginLeft: 4, color: "#f59e0b" }}>LOW</span>}
                </td>
                <td style={{ padding: "13px 16px" }}>
                  <span style={{ display: "inline-block", background: p.status === "active" ? "rgba(52,211,153,.15)" : "rgba(107,114,128,.15)", color: p.status === "active" ? "#34d399" : "#6b7280", borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 600 }}>
                    {p.status}
                  </span>
                </td>
                <td style={{ padding: "13px 16px" }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button
                      onClick={() => openReceive(p)}
                      style={{ padding: "5px 10px", background: "rgba(52,211,153,.12)", border: "1px solid rgba(52,211,153,.3)", color: "#34d399", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 600 }}
                    >
                      📦 Receive
                    </button>
                    <button
                      onClick={() => openEdit(p)}
                      style={{ padding: "5px 10px", background: "rgba(99,102,241,.15)", border: "1px solid rgba(99,102,241,.3)", color: "#818cf8", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 600 }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => update(p.id, { status: p.status === "active" ? "inactive" : "active" })}
                      style={{ padding: "5px 10px", background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.25)", color: "#f59e0b", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 600 }}
                    >
                      {p.status === "active" ? "Disable" : "Enable"}
                    </button>
                    <button
                      onClick={() => setDeleteId(p.id)}
                      style={{ padding: "5px 10px", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)", color: "#f87171", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 600 }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && products.length === 0 && (
              <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)" }}>
                {filterCategory ? `No products in "${filterCategory}"` : "No products yet."}
              </td></tr>

            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(6px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 32, width: 520, fontFamily: ff, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{editId ? "✏️ Edit Product" : "➕ Add Product"}</h2>
              <button onClick={() => { setShowModal(false); setFormError(""); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,.5)", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>✕</button>
            </div>

            {formError && (
              <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,.14)", border: "1px solid rgba(239,68,68,.28)", color: "#fca5a5", fontSize: 12 }}>
                {formError}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Product Name *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}  style={inp} autoFocus />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Category</label>
                {categoryNames.length > 0 ? (
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    style={{ ...inp, background: "#1e2535", cursor: "pointer", color: form.category ? "#fff" : "rgba(255,255,255,.35)" }}
                  >
                    <option value="">-- Select --</option>
                    {categoryNames.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                ) : (
                  <input type="text" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Type category" style={inp} />
                )}
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>
                  SKU * <span style={{ color: "rgba(255,255,255,.2)", fontWeight: 400 }}>(unique code)</span>
                </label>
                <input type="text" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} style={inp} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Unit *</label>
                <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                  style={{ ...inp, background: "#1e2535", cursor: "pointer" }}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Description</label>
                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional product description" style={inp} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Cost Price (Rs.)</label>
                <input type="number" value={form.costPrice} onChange={e => setForm(f => ({ ...f, costPrice: Number(e.target.value) }))} style={inp} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Sale Price (Rs.) *</label>
                <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} style={inp} />
              </div>

              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Stock Quantity</label>
                <input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))} style={inp} />
              </div>

            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button
                onClick={save}
                style={{ flex: 1, padding: "11px 0", background: "#f97316", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
              >
                {editId ? "Save Changes" : "Add Product"}
              </button>
              <button
                onClick={() => { setShowModal(false); setFormError(""); }}
                style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.6)", fontSize: 14, cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(6px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 28, width: 360, textAlign: "center", fontFamily: ff }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>Delete Product?</h3>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,.45)", margin: "0 0 22px", lineHeight: 1.6 }}>
             This product will be permanently deleted. This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                onClick={() => setDeleteId(null)}
                style={{ background: "transparent", border: `1px solid ${border}`, color: "rgba(255,255,255,.6)", borderRadius: 10, padding: "10px 20px", fontSize: 13, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                style={{ background: "rgba(239,68,68,.15)", color: "#f87171", border: "1px solid rgba(239,68,68,.3)", borderRadius: 10, padding: "10px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receive Stock Modal */}
      {receiveProduct && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(6px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 32, width: 440, fontFamily: ff }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>📦 Receive Stock</h2>
              <button onClick={() => setReceiveProduct(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.5)", fontSize: 22, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ background: "rgba(52,211,153,.07)", border: "1px solid rgba(52,211,153,.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 20, fontSize: 13 }}>
              <strong>{receiveProduct.name}</strong>
              <span style={{ marginLeft: 10, color: "rgba(255,255,255,.4)", fontSize: 12 }}>Current stock: {receiveProduct.stock}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "Qty Received *", key: "qty", type: "number" },
                { label: "Cost Price (Rs.)", key: "costPrice", type: "number" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>{f.label}</label>
                  <input
                    type={f.type}
                    value={(receiveForm as Record<string, number | string>)[f.key]}
                    onChange={e => setReceiveForm(p => ({ ...p, [f.key]: Number(e.target.value) }))}
                    style={inp}
                  />
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Supplier</label>
                <select value={receiveForm.supplierId} onChange={e => { const s = suppliers.find(x => x.id === e.target.value); setReceiveForm(p => ({ ...p, supplierId: e.target.value, supplierName: s?.name || "" })); }} style={inp}>
                  <option value="">— Walk-in / No Supplier —</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Notes</label>
                <input value={receiveForm.notes} onChange={e => setReceiveForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" style={inp} />
              </div>
            </div>
            {receiveForm.qty > 0 && (
              <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(99,102,241,.08)", borderRadius: 8, fontSize: 12, color: "rgba(255,255,255,.6)" }}>
                Stock after: <strong style={{ color: "#34d399" }}>{receiveProduct.stock + receiveForm.qty}</strong>
                {receiveForm.costPrice > 0 && <span style={{ marginLeft: 14 }}>Total cost: <strong style={{ color: "#f59e0b" }}>Rs. {(receiveForm.qty * receiveForm.costPrice).toLocaleString()}</strong></span>}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                onClick={handleReceive}
                disabled={receiveSaving || receiveForm.qty <= 0}
                style={{ flex: 1, padding: "11px 0", background: "#34d399", border: "none", borderRadius: 8, color: "#0a0f1a", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: receiveForm.qty <= 0 ? 0.5 : 1 }}
              >
                {receiveSaving ? "Saving…" : "✓ Receive Stock"}
              </button>
              <button
                onClick={() => setReceiveProduct(null)}
                style={{ padding: "11px 20px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.6)", fontSize: 14, cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
