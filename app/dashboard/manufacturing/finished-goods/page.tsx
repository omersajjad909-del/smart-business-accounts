"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { mapFinishedGoodsRecord, mapProductionOrderRecord } from "../_shared";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";

export default function FinishedGoodsPage() {
  const goodsStore = useBusinessRecords("finished_good_batch");
  const productionStore = useBusinessRecords("production_order");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    product: "",
    quantity: 0,
    warehouse: "Main Warehouse",
    productionOrderId: "",
    productionDate: new Date().toISOString().slice(0, 10),
  });

  const goods = useMemo(() => goodsStore.records.map(mapFinishedGoodsRecord), [goodsStore.records]);
  const productionOrders = useMemo(() => productionStore.records.map(mapProductionOrderRecord), [productionStore.records]);

  async function save() {
    if (!form.product || !form.quantity) return;
    await goodsStore.create({
      title: form.product,
      status: "available",
      date: form.productionDate,
      data: {
        batchNo: `FG-${String(goods.length + 1).padStart(4, "0")}`,
        quantity: form.quantity,
        warehouse: form.warehouse,
        productionOrderId: form.productionOrderId,
      },
    });
    setShowModal(false);
    setForm({
      product: "",
      quantity: 0,
      warehouse: "Main Warehouse",
      productionOrderId: "",
      productionDate: new Date().toISOString().slice(0, 10),
    });
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Finished Goods</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0 }}>Track produced batches ready for dispatch or sale.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#22c55e", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + Record Batch
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Batches", value: goods.length, color: "#22c55e" },
          { label: "Total Quantity", value: goods.reduce((sum, item) => sum + item.quantity, 0), color: "#38bdf8" },
          { label: "Warehouses", value: new Set(goods.map((item) => item.warehouse)).size, color: "#f59e0b" },
          { label: "Linked Orders", value: goods.filter((item) => item.productionOrderId).length, color: "#a78bfa" },
        ].map((card) => (
          <div key={card.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Batch", "Product", "Qty", "Warehouse", "Prod. Order", "Date", "Status"].map((head) => (
                <th key={head} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,.5)", borderBottom: `1px solid ${border}`, fontWeight: 600 }}>
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {goods.map((item) => (
              <tr key={item.id}>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.05)", color: "rgba(255,255,255,.55)" }}>{item.batchNo}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.05)", fontWeight: 700 }}>{item.product}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>{item.quantity}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>{item.warehouse}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.05)", color: "rgba(255,255,255,.55)" }}>{item.productionOrderId || "Manual"}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>{item.productionDate}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                  <span style={{ display: "inline-block", background: "rgba(34,197,94,.15)", color: "#22c55e", borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 700 }}>
                    {item.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
            {!goodsStore.loading && goods.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 36, textAlign: "center", color: "rgba(255,255,255,.28)" }}>
                  No finished goods batches recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 30, width: 520, fontFamily: ff }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>Record Finished Goods Batch</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Product</label>
                <input value={form.product} onChange={(e) => setForm((current) => ({ ...current, product: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Quantity</label>
                <input type="number" value={form.quantity} onChange={(e) => setForm((current) => ({ ...current, quantity: Number(e.target.value) }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Production Date</label>
                <input type="date" value={form.productionDate} onChange={(e) => setForm((current) => ({ ...current, productionDate: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Warehouse</label>
                <input value={form.warehouse} onChange={(e) => setForm((current) => ({ ...current, warehouse: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Production Order</label>
                <select value={form.productionOrderId} onChange={(e) => setForm((current) => ({ ...current, productionOrderId: e.target.value }))} style={{ width: "100%", background: "#161b27", border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff" }}>
                  <option value="">Manual / Not Linked</option>
                  {productionOrders.map((order) => (
                    <option key={order.id} value={order.orderId}>{order.orderId} - {order.product}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#22c55e", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Save Batch</button>
              <button onClick={() => setShowModal(false)} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.65)", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
