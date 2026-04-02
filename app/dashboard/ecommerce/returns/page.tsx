"use client";

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
  mapEcommerceReturns,
  returnReasons,
  toPkDate,
} from "../_shared";

type ReturnForm = {
  orderId: string;
  customer: string;
  product: string;
  qty: string;
  amount: string;
  reason: string;
};

const emptyForm: ReturnForm = {
  orderId: "",
  customer: "",
  product: "",
  qty: "1",
  amount: "",
  reason: "Damaged",
};

export default function ReturnsPage() {
  const { records, loading, create, update } = useBusinessRecords("ecommerce_return");
  const ordersHook = useBusinessRecords("ecommerce_order");
  const productsHook = useBusinessRecords("ecommerce_product");
  const returns = useMemo(() => mapEcommerceReturns(records), [records]);
  const orders = useMemo(() => mapEcommerceOrders(ordersHook.records), [ordersHook.records]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<ReturnForm>(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? returns : returns.filter((record) => record.status === filter);
  const pendingCount = returns.filter((record) => record.status === "pending").length;
  const approvedCount = returns.filter((record) => record.status === "approved").length;
  const refundedTotal = returns.filter((record) => record.status === "refunded").reduce((sum, record) => sum + record.amount, 0);

  const selectedOrder = orders.find((order) => order.orderId === form.orderId) || null;

  async function addReturn() {
    const customer = form.customer.trim();
    const product = form.product.trim();
    const qty = Number(form.qty);
    const amount = Number(form.amount);
    const orderId = form.orderId.trim();

    if (!orderId) return setError("Order select karein.");
    if (!selectedOrder) return setError("Valid order select karein.");
    if (!customer) return setError("Customer name zaroori hai.");
    if (!product) return setError("Product name zaroori hai.");
    if (!Number.isFinite(qty) || qty <= 0) return setError("Qty zero se bari honi chahiye.");
    if (!Number.isFinite(amount) || amount <= 0) return setError("Return amount zero se bari honi chahiye.");
    if (returns.some((record) => record.orderId === orderId && record.product.toLowerCase() === product.toLowerCase() && record.status !== "rejected")) {
      return setError("Is order/product ke liye active return request already maujood hai.");
    }

    setSaving(true);
    setError("");
    try {
      const returnNo = `RET-${Date.now().toString().slice(-6)}`;
      await create({
        title: customer,
        status: "pending",
        amount,
        data: { returnNo, orderId, product, qty, reason: form.reason, method: "" },
      });
      setShowAdd(false);
      setForm(emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Return save nahi ho saka.");
    } finally {
      setSaving(false);
    }
  }

  async function moveReturn(id: string, next: "approved" | "rejected" | "refunded") {
    try {
      setError("");
      const currentReturn = returns.find((record) => record.id === id) || null;
      await update(id, {
        status: next,
        data: next === "approved" ? { method: "Refund pending" } : next === "refunded" ? { method: "Refund completed" } : {},
      });
      if (next === "refunded" && currentReturn) {
        const sourceOrder = orders.find((order) => order.orderId === currentReturn.orderId) || null;
        if (sourceOrder?.productId) {
          const productRecord = productsHook.records.find((record) => record.id === sourceOrder.productId);
          if (productRecord) {
            const currentStock = Number(productRecord.data?.stock || 0);
            await productsHook.update(sourceOrder.productId, {
              data: { stock: currentStock + currentReturn.qty },
            });
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Return update nahi ho saka.");
    }
  }

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", color: "#fff", fontFamily: ecommerceFont }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 6px" }}>Returns & Refunds</h1>
          <p style={{ fontSize: 13, color: ecommerceMuted, margin: 0 }}>Customer trust aur refund discipline dono ko yahan se manage karein.</p>
        </div>
        <button onClick={() => setShowAdd(true)} style={primaryButton}>+ Add Return</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Cases", value: returns.length, color: "#818cf8" },
          { label: "Pending Approval", value: pendingCount, color: "#f59e0b" },
          { label: "Approved", value: approvedCount, color: "#60a5fa" },
          { label: "Refunded Value", value: `Rs. ${refundedTotal.toLocaleString()}`, color: "#14b8a6" },
        ].map((card) => (
          <div key={card.label} style={{ background: ecommerceBg, border: `1px solid ${ecommerceBorder}`, borderRadius: 16, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: ecommerceMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {["all", "pending", "approved", "rejected", "refunded"].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              border: filter === status ? "1px solid rgba(99,102,241,.4)" : "1px solid rgba(255,255,255,.08)",
              background: filter === status ? "rgba(99,102,241,.16)" : "rgba(255,255,255,.03)",
              color: filter === status ? "#c7d2fe" : "rgba(255,255,255,.65)",
              fontSize: 12,
              fontWeight: 700,
              textTransform: "capitalize",
              cursor: "pointer",
            }}
          >
            {status}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ marginBottom: 16, background: "rgba(248,113,113,.12)", border: "1px solid rgba(248,113,113,.28)", color: "#fca5a5", borderRadius: 12, padding: "12px 14px", fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 44, color: ecommerceMuted }}>Loading returns...</div>
      ) : (
        <div style={{ background: ecommerceBg, border: `1px solid ${ecommerceBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Return ID", "Order", "Customer", "Product", "Reason", "Amount", "Status", "Actions"].map((heading) => (
                  <th key={heading} style={thStyle}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((record) => (
                <tr key={record.id}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 700 }}>{record.returnNo}</div>
                    <div style={{ fontSize: 11, color: ecommerceMuted }}>{toPkDate(record.createdAt)}</div>
                  </td>
                  <td style={tdStyle}>{record.orderId}</td>
                  <td style={tdStyle}>{record.customer}</td>
                  <td style={tdStyle}>
                    <div>{record.product}</div>
                    <div style={{ fontSize: 11, color: ecommerceMuted }}>Qty: {record.qty}</div>
                  </td>
                  <td style={tdStyle}>{record.reason}</td>
                  <td style={{ ...tdStyle, color: "#fbbf24", fontWeight: 800 }}>Rs. {record.amount.toLocaleString()}</td>
                  <td style={tdStyle}>
                    <span style={{ display: "inline-block", borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: ecommerceStatusColor(record.status), background: `${ecommerceStatusColor(record.status)}20` }}>
                      {record.status}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {record.status === "pending" && (
                        <>
                          <button onClick={() => moveReturn(record.id, "approved")} style={{ ...actionButton, color: "#38bdf8", borderColor: "rgba(56,189,248,.35)" }}>approve</button>
                          <button onClick={() => moveReturn(record.id, "rejected")} style={{ ...actionButton, color: "#f87171", borderColor: "rgba(248,113,113,.35)" }}>reject</button>
                        </>
                      )}
                      {record.status === "approved" && (
                        <button onClick={() => moveReturn(record.id, "refunded")} style={{ ...actionButton, color: "#14b8a6", borderColor: "rgba(20,184,166,.35)" }}>mark refunded</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={8} style={{ padding: 42, textAlign: "center", color: "rgba(255,255,255,.28)" }}>
                    Is filter me koi return case nahi mila.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ margin: "0 0 24px", fontSize: 20, fontWeight: 800 }}>Add Return Request</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={labelStyle}>Order</label>
                <select
                  value={form.orderId}
                  onChange={(event) => {
                    const order = orders.find((item) => item.orderId === event.target.value) || null;
                    setForm((current) => ({
                      ...current,
                      orderId: event.target.value,
                      customer: order?.customer || current.customer,
                      product: order?.product || current.product,
                      amount: order ? String(order.amount) : current.amount,
                    }));
                  }}
                  style={inputStyle}
                >
                  <option value="">Select order</option>
                  {orders.map((order) => (
                    <option key={order.id} value={order.orderId}>
                      {order.orderId} - {order.customer} - {order.product}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Customer</label>
                <input value={form.customer} onChange={(event) => setForm((current) => ({ ...current, customer: event.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Product</label>
                <input value={form.product} onChange={(event) => setForm((current) => ({ ...current, product: event.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Qty</label>
                <input type="number" value={form.qty} onChange={(event) => setForm((current) => ({ ...current, qty: event.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Amount (Rs.)</label>
                <input type="number" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} style={inputStyle} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={labelStyle}>Reason</label>
                <select value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} style={inputStyle}>
                  {returnReasons.map((reason) => <option key={reason}>{reason}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <button onClick={addReturn} disabled={saving} style={{ ...primaryButton, flex: 1, opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving..." : "Submit Return"}
              </button>
              <button onClick={() => { setShowAdd(false); setError(""); }} style={secondaryButton}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const primaryButton: CSSProperties = {
  padding: "10px 20px",
  borderRadius: 12,
  border: "none",
  background: "#f59e0b",
  color: "#fff",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
};

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
