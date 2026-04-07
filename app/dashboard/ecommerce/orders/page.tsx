"use client";
import { fmtDate } from "@/lib/dateUtils";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  ecommerceBg,
  ecommerceBorder,
  ecommerceFont,
  ecommerceMuted,
  ecommerceStatusColor,
  mapEcommerceOrders,
  mapEcommerceProducts,
  platformOptions,
} from "../_shared";

type OrderForm = {
  customer: string;
  phone: string;
  productId: string;
  quantity: string;
  amount: string;
  address: string;
  platform: string;
};

const emptyForm: OrderForm = {
  customer: "",
  phone: "",
  productId: "",
  quantity: "1",
  amount: "",
  address: "",
  platform: "Website",
};

const nextStatus: Record<string, string> = {
  pending: "processing",
  processing: "shipped",
  shipped: "delivered",
};

export default function EcommerceOrdersPage() {
  const { records, loading, create, update } = useBusinessRecords("ecommerce_order");
  const productsHook = useBusinessRecords("ecommerce_product");
  const orders = useMemo(() => mapEcommerceOrders(records), [records]);
  const products = useMemo(() => mapEcommerceProducts(productsHook.records).filter((product) => product.status === "active"), [productsHook.records]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<OrderForm>(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const totalRevenue = orders.filter((order) => order.status === "delivered").reduce((sum, order) => sum + order.amount, 0);
  const selectedProduct = products.find((product) => product.id === form.productId) || null;

  async function save() {
    const customer = form.customer.trim();
    const phone = form.phone.trim();
    const address = form.address.trim();
    const quantity = Number(form.quantity);
    const amount = Number(form.amount);

    if (!customer) return setError("Customer name zaroori hai.");
    if (!selectedProduct) return setError("Valid product select karein.");
    if (!address) return setError("Delivery address zaroori hai.");
    if (!Number.isFinite(quantity) || quantity <= 0) return setError("Quantity zero se bari honi chahiye.");
    if (!Number.isFinite(amount) || amount <= 0) return setError("Order amount zero se bari honi chahiye.");
    if (selectedProduct.stock <= 0) return setError("Selected product out of stock hai.");
    if (quantity > selectedProduct.stock) return setError("Selected quantity available stock se zyada hai.");

    setSaving(true);
    setError("");
    try {
      const orderNo = `ORD-${Date.now().toString().slice(-6)}`;
      await create({
        title: customer,
        status: "pending",
        amount,
        data: {
          orderId: orderNo,
          phone,
          product: selectedProduct.name,
          productId: selectedProduct.id,
          quantity,
          address,
          platform: form.platform,
        },
      });
      setShowModal(false);
      setForm(emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order create nahi ho saka.");
    } finally {
      setSaving(false);
    }
  }

  async function moveOrder(orderId: string, status: string) {
    try {
      setError("");
      const currentOrder = orders.find((order) => order.id === orderId) || null;
      await update(orderId, { status });
      if (status === "delivered" && currentOrder?.productId) {
        const productRecord = productsHook.records.find((record) => record.id === currentOrder.productId);
        if (productRecord) {
          const currentStock = Number(productRecord.data?.stock || 0);
          const currentSales = Number(productRecord.data?.sales || 0);
          await productsHook.update(currentOrder.productId, {
            data: {
              stock: Math.max(0, currentStock - currentOrder.quantity),
              sales: currentSales + currentOrder.quantity,
            },
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order update nahi ho saka.");
    }
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: ecommerceFont, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 6px" }}>Orders Desk</h1>
          <p style={{ fontSize: 13, color: ecommerceMuted, margin: 0 }}>Pending se delivered tak online orders ko disciplined flow me chalayen.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={primaryButton}>
          + New Order
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total Orders", value: orders.length, color: "#818cf8" },
          { label: "Pending / Processing", value: orders.filter((order) => order.status === "pending" || order.status === "processing").length, color: "#f59e0b" },
          { label: "Shipped", value: orders.filter((order) => order.status === "shipped").length, color: "#60a5fa" },
          { label: "Delivered Revenue", value: `Rs. ${totalRevenue.toLocaleString()}`, color: "#34d399" },
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
        <div style={{ textAlign: "center", padding: 44, color: ecommerceMuted }}>Loading orders...</div>
      ) : (
        <div style={{ background: ecommerceBg, border: `1px solid ${ecommerceBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Order ID", "Customer", "Product", "Qty", "Amount", "Platform", "Date", "Status", "Action"].map((heading) => (
                  <th key={heading} style={thStyle}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 700 }}>{order.orderId}</div>
                    <div style={{ fontSize: 11, color: ecommerceMuted }}>{order.phone || "No phone"}</div>
                  </td>
                  <td style={tdStyle}>{order.customer}</td>
                  <td style={tdStyle}>
                    <div>{order.product}</div>
                    <div style={{ fontSize: 11, color: ecommerceMuted, maxWidth: 260, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{order.address}</div>
                  </td>
                  <td style={tdStyle}>{order.quantity}</td>
                  <td style={{ ...tdStyle, color: "#34d399", fontWeight: 800 }}>Rs. {order.amount.toLocaleString()}</td>
                  <td style={tdStyle}>{order.platform}</td>
                  <td style={tdStyle}>{fmtDate(order.createdAt)}</td>
                  <td style={tdStyle}>
                    <span style={{ display: "inline-block", borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: ecommerceStatusColor(order.status), background: `${ecommerceStatusColor(order.status)}20` }}>
                      {order.status}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {nextStatus[order.status] && (
                        <button onClick={() => moveOrder(order.id, nextStatus[order.status])} style={{ ...actionButton, color: ecommerceStatusColor(nextStatus[order.status]), borderColor: `${ecommerceStatusColor(nextStatus[order.status])}55` }}>
                          {nextStatus[order.status]}
                        </button>
                      )}
                      {!["cancelled", "delivered"].includes(order.status) && (
                        <button onClick={() => moveOrder(order.id, "cancelled")} style={{ ...actionButton, color: "#f87171", borderColor: "rgba(248,113,113,.35)" }}>
                          cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!orders.length && (
                <tr>
                  <td colSpan={9} style={{ padding: 42, textAlign: "center", color: "rgba(255,255,255,.28)" }}>
                    Orders abhi create nahi hue.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ margin: "0 0 24px", fontSize: 20, fontWeight: 800 }}>Create New Order</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={labelStyle}>Customer Name</label>
                <input value={form.customer} onChange={(event) => setForm((current) => ({ ...current, customer: event.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Platform</label>
                <select value={form.platform} onChange={(event) => setForm((current) => ({ ...current, platform: event.target.value }))} style={inputStyle}>
                  {platformOptions.map((platform) => <option key={platform}>{platform}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={labelStyle}>Product</label>
                <select value={form.productId} onChange={(event) => {
                  const product = products.find((item) => item.id === event.target.value) || null;
                  setForm((current) => ({
                    ...current,
                    productId: event.target.value,
                    amount: product ? String(product.price) : current.amount,
                  }));
                }} style={inputStyle}>
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {product.platform} - Rs. {product.price}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Quantity</label>
                <input type="number" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Amount (Rs.)</label>
                <input type="number" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} style={inputStyle} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={labelStyle}>Address</label>
                <textarea value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} style={{ ...inputStyle, minHeight: 84, resize: "vertical" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <button onClick={save} disabled={saving} style={{ ...primaryButton, flex: 1, opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving..." : "Create Order"}
              </button>
              <button onClick={() => { setShowModal(false); setError(""); }} style={secondaryButton}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "12px 16px",
  fontSize: 12,
  color: ecommerceMuted,
  borderBottom: `1px solid ${ecommerceBorder}`,
  fontWeight: 700,
};

const tdStyle: CSSProperties = {
  padding: "14px 16px",
  borderBottom: "1px solid rgba(255,255,255,.04)",
  fontSize: 13,
  verticalAlign: "top",
};

const primaryButton: CSSProperties = {
  padding: "10px 20px",
  borderRadius: 12,
  border: "none",
  background: "#6366f1",
  color: "#fff",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryButton: CSSProperties = {
  padding: "11px 24px",
  background: "transparent",
  border: `1px solid ${ecommerceBorder}`,
  borderRadius: 10,
  color: "rgba(255,255,255,.65)",
  fontSize: 14,
  cursor: "pointer",
};

const inputStyle: CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,.04)",
  border: `1px solid ${ecommerceBorder}`,
  borderRadius: 10,
  padding: "10px 12px",
  color: "#fff",
  fontSize: 14,
  boxSizing: "border-box",
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 12,
  color: ecommerceMuted,
  marginBottom: 6,
};

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.72)",
  zIndex: 50,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalStyle: CSSProperties = {
  background: "#161b27",
  border: `1px solid ${ecommerceBorder}`,
  borderRadius: 18,
  padding: 32,
  width: 540,
  fontFamily: ecommerceFont,
};

const actionButton: CSSProperties = {
  padding: "5px 9px",
  background: "rgba(255,255,255,.04)",
  border: "1px solid rgba(255,255,255,.08)",
  borderRadius: 8,
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
  textTransform: "capitalize",
};
