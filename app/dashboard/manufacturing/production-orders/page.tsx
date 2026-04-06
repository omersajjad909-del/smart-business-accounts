import toast from "react-hot-toast";
"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { mapBomRecord, mapFinishedGoodsRecord, mapProductionOrderRecord, mapWorkOrderRecord } from "../_shared";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";
const statusColor: Record<string, string> = { planned: "#818cf8", in_progress: "#f59e0b", completed: "#22c55e", cancelled: "#6b7280" };

export default function ProductionOrdersPage() {
  const orderStore = useBusinessRecords("production_order");
  const bomStore = useBusinessRecords("bom");
  const goodsStore = useBusinessRecords("finished_good_batch");
  const workStore = useBusinessRecords("work_order");
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    product: "",
    bomId: "",
    quantity: 1,
    plannedDate: new Date().toISOString().slice(0, 10),
    assignedTo: "",
    notes: "",
  });

  const orders = useMemo(() => orderStore.records.map(mapProductionOrderRecord), [orderStore.records]);
  const boms = useMemo(() => bomStore.records.map(mapBomRecord), [bomStore.records]);
  const finishedGoods = useMemo(() => goodsStore.records.map(mapFinishedGoodsRecord), [goodsStore.records]);
  const workOrders = useMemo(() => workStore.records.map(mapWorkOrderRecord), [workStore.records]);

  async function save() {
    if (!form.product.trim()) {
      setFormError("Product name is required.");
      return;
    }
    if (!form.bomId) {
      setFormError("Linked BOM is required.");
      return;
    }
    if (form.quantity <= 0) {
      setFormError("Quantity must be greater than zero.");
      return;
    }
    if (!form.plannedDate) {
      setFormError("Planned date is required.");
      return;
    }
    setFormError("");
    const selectedBom = boms.find((item) => item.id === form.bomId) || boms.find((item) => item.product === form.product);
    await orderStore.create({
      title: form.product,
      status: "planned",
      date: form.plannedDate,
      data: {
        orderId: `PO-${String(orders.length + 1).padStart(4, "0")}`,
        quantity: form.quantity,
        completed: 0,
        assignedTo: form.assignedTo,
        notes: form.notes,
        bomId: selectedBom?.id || "",
        bomVersion: selectedBom?.version || "",
      },
    });
    setShowModal(false);
    setForm({
      product: "",
      bomId: "",
      quantity: 1,
      plannedDate: new Date().toISOString().slice(0, 10),
      assignedTo: "",
      notes: "",
    });
    setFormError("");
  }

  async function startOrder(orderId: string) {
    await orderStore.update(orderId, { status: "in_progress" });
  }

  async function completeOrder(order: ReturnType<typeof mapProductionOrderRecord>) {
    const linkedWorkOrders = workOrders.filter((item) => item.linkedProductionOrderId === order.orderId);
    if (linkedWorkOrders.some((item) => item.status !== "completed")) {
      toast("Complete linked work orders before finishing this production order.");
      return;
    }
    await orderStore.update(order.id, {
      status: "completed",
      data: { completed: order.quantity },
    });

    if (!finishedGoods.some((item) => item.productionOrderId === order.orderId)) {
      await goodsStore.create({
        title: order.product,
        status: "available",
        date: order.plannedDate || new Date().toISOString().slice(0, 10),
        data: {
          batchNo: `FG-${String(finishedGoods.length + 1).padStart(4, "0")}`,
          quantity: order.quantity,
          warehouse: "Main Warehouse",
          productionOrderId: order.orderId,
        },
      });
    }
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Production Orders</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.42)", margin: 0 }}>Issue shop-floor production based on BOMs and push completed orders into finished goods.</p>
        </div>
        <button onClick={() => { setShowModal(true); setFormError(""); }} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#f97316", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + New Order
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Orders", value: orders.length, color: "#f97316" },
          { label: "Planned", value: orders.filter((item) => item.status === "planned").length, color: "#818cf8" },
          { label: "In Progress", value: orders.filter((item) => item.status === "in_progress").length, color: "#f59e0b" },
          { label: "Completed To FG", value: orders.filter((item) => item.status === "completed").length, color: "#22c55e" },
        ].map((card) => (
          <div key={card.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.48)", marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 21, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {orders.map((order) => {
          const linkedBom = boms.find((item) => item.id === order.bomId) || boms.find((item) => item.product === order.product);
          const progress = order.quantity > 0 ? Math.round((order.completed / order.quantity) * 100) : 0;
          const fgCreated = finishedGoods.some((item) => item.productionOrderId === order.orderId);
          const linkedWorkOrders = workOrders.filter((item) => item.linkedProductionOrderId === order.orderId);
          const incompleteWorkOrders = linkedWorkOrders.filter((item) => item.status !== "completed").length;
          return (
            <div key={order.id} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: "18px 22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{order.product}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.42)", marginTop: 4 }}>
                    {order.orderId} • BOM {linkedBom?.version || order.bomVersion || "Not linked"} • Qty {order.completed}/{order.quantity}
                  </div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, color: statusColor[order.status] || "#94a3b8" }}>{order.status.replace("_", " ").toUpperCase()}</div>
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 10 }}>
                Due {order.plannedDate || "Not set"} • Assigned {order.assignedTo || "Unassigned"} • {fgCreated ? "Finished goods batch created" : "FG pending"} • Work orders open {incompleteWorkOrders}
              </div>
              <div style={{ background: "rgba(255,255,255,.08)", height: 6, borderRadius: 999, overflow: "hidden", marginBottom: 14 }}>
                <div style={{ width: `${progress}%`, height: "100%", background: statusColor[order.status] || "#94a3b8" }} />
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {order.status === "planned" && (
                  <button onClick={() => startOrder(order.id)} style={{ padding: "7px 14px", background: "rgba(245,158,11,.15)", border: "1px solid rgba(245,158,11,.3)", color: "#f59e0b", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    Start
                  </button>
                )}
                {order.status === "in_progress" && (
                  <button onClick={() => completeOrder(order)} style={{ padding: "7px 14px", background: "rgba(34,197,94,.15)", border: "1px solid rgba(34,197,94,.3)", color: "#22c55e", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    Complete + FG Batch
                  </button>
                )}
                {order.status !== "completed" && order.status !== "cancelled" && (
                  <button onClick={() => orderStore.update(order.id, { status: "cancelled" })} style={{ padding: "7px 14px", background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.25)", color: "#ef4444", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {!orderStore.loading && orders.length === 0 && (
          <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: 36, textAlign: "center", color: "rgba(255,255,255,.28)" }}>
            No production orders yet.
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 30, width: 540, fontFamily: ff }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>New Production Order</h2>
            {formError && <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,.14)", border: "1px solid rgba(239,68,68,.28)", color: "#fca5a5", fontSize: 12 }}>{formError}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Product</label>
                <input list="manufacturing-boms" value={form.product} onChange={(e) => setForm((current) => ({ ...current, product: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
                <datalist id="manufacturing-boms">
                  {boms.map((item) => <option key={item.id} value={item.product} />)}
                </datalist>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Linked BOM</label>
                <select value={form.bomId} onChange={(e) => {
                  const selectedBom = boms.find((item) => item.id === e.target.value);
                  setForm((current) => ({ ...current, bomId: e.target.value, product: selectedBom?.product || current.product }));
                }} style={{ width: "100%", background: "#161b27", border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff" }}>
                  <option value="">Select BOM</option>
                  {boms.map((item) => <option key={item.id} value={item.id}>{item.product} • {item.version}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Quantity</label>
                <input type="number" value={form.quantity} onChange={(e) => setForm((current) => ({ ...current, quantity: Number(e.target.value) }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Planned Date</label>
                <input type="date" value={form.plannedDate} onChange={(e) => setForm((current) => ({ ...current, plannedDate: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Assigned To</label>
                <input value={form.assignedTo} onChange={(e) => setForm((current) => ({ ...current, assignedTo: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} rows={4} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box", resize: "vertical" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#f97316", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Create Order</button>
              <button onClick={() => setShowModal(false)} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.65)", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

