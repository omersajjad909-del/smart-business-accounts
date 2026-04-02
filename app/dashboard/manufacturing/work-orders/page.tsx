"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { mapProductionOrderRecord, mapWorkOrderRecord } from "../_shared";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";
const statusColor: Record<string, string> = { open: "#f59e0b", in_progress: "#38bdf8", completed: "#22c55e", on_hold: "#6b7280" };

export default function WorkOrdersPage() {
  const workStore = useBusinessRecords("work_order");
  const productionStore = useBusinessRecords("production_order");
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    title: "",
    linkedProductionOrderId: "",
    machine: "",
    operator: "",
    priority: "medium",
    scheduledDate: new Date().toISOString().slice(0, 10),
    estimatedHours: 1,
  });

  const workOrders = useMemo(() => workStore.records.map(mapWorkOrderRecord), [workStore.records]);
  const productionOrders = useMemo(() => productionStore.records.map(mapProductionOrderRecord), [productionStore.records]);

  async function startWorkOrder(id: string, linkedProductionOrderId: string) {
    if (linkedProductionOrderId) {
      const production = productionOrders.find((item) => item.orderId === linkedProductionOrderId);
      if (!production || production.status !== "in_progress") {
        alert("Start the linked production order before starting this work order.");
        return;
      }
    }
    await workStore.update(id, { status: "in_progress" });
  }

  async function completeWorkOrder(id: string, linkedProductionOrderId: string) {
    if (linkedProductionOrderId) {
      const production = productionOrders.find((item) => item.orderId === linkedProductionOrderId);
      if (!production || (production.status !== "in_progress" && production.status !== "completed")) {
        alert("Linked production order is not ready for work-order completion.");
        return;
      }
    }
    await workStore.update(id, { status: "completed" });
  }

  async function save() {
    if (!form.title.trim()) {
      setFormError("Task or operation title is required.");
      return;
    }
    if (!form.machine.trim()) {
      setFormError("Machine or equipment is required.");
      return;
    }
    if (!form.operator.trim()) {
      setFormError("Operator is required.");
      return;
    }
    if (!form.scheduledDate) {
      setFormError("Scheduled date is required.");
      return;
    }
    if (form.estimatedHours <= 0) {
      setFormError("Estimated hours must be greater than zero.");
      return;
    }
    setFormError("");
    const linkedOrder = productionOrders.find((item) => item.orderId === form.linkedProductionOrderId);
    await workStore.create({
      title: form.title.trim(),
      status: "open",
      date: form.scheduledDate,
      data: {
        workOrderId: `WO-${String(workOrders.length + 1).padStart(4, "0")}`,
        machine: form.machine,
        operator: form.operator,
        priority: form.priority,
        estimatedHours: form.estimatedHours,
        linkedProductionOrderId: form.linkedProductionOrderId,
        linkedProduct: linkedOrder?.product || "",
      },
    });
    setShowModal(false);
    setForm({
      title: "",
      linkedProductionOrderId: "",
      machine: "",
      operator: "",
      priority: "medium",
      scheduledDate: new Date().toISOString().slice(0, 10),
      estimatedHours: 1,
    });
    setFormError("");
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Work Orders</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.42)", margin: 0 }}>Assign machines, operators, and execution slots against production orders.</p>
        </div>
        <button onClick={() => { setShowModal(true); setFormError(""); }} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#f97316", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + New Work Order
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Work Orders", value: workOrders.length, color: "#f97316" },
          { label: "Open", value: workOrders.filter((item) => item.status === "open").length, color: "#f59e0b" },
          { label: "In Progress", value: workOrders.filter((item) => item.status === "in_progress").length, color: "#38bdf8" },
          { label: "Completed", value: workOrders.filter((item) => item.status === "completed").length, color: "#22c55e" },
        ].map((card) => (
          <div key={card.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.48)", marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 21, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Work Order", "Task", "Linked Production", "Machine", "Operator", "Hours", "Priority", "Status", "Action"].map((head) => (
                <th key={head} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,.5)", borderBottom: `1px solid ${border}`, fontWeight: 600 }}>
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {workOrders.map((order) => (
              <tr key={order.id}>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "rgba(255,255,255,.48)" }}>{order.workOrderId}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 700 }}>{order.title}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "rgba(255,255,255,.55)" }}>{order.linkedProductionOrderId || "Standalone"}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{order.machine}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{order.operator}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{order.estimatedHours}h</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <span style={{ color: order.priority === "high" ? "#ef4444" : order.priority === "medium" ? "#f59e0b" : "#22c55e", fontWeight: 700, fontSize: 12 }}>
                    {order.priority}
                  </span>
                </td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <span style={{ display: "inline-block", background: `${statusColor[order.status] || "#94a3b8"}20`, color: statusColor[order.status] || "#94a3b8", borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 700 }}>
                    {order.status.replace("_", " ").toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  {order.status === "open" && (
                    <button onClick={() => startWorkOrder(order.id, order.linkedProductionOrderId)} style={{ padding: "5px 10px", background: "rgba(56,189,248,.15)", border: "1px solid rgba(56,189,248,.3)", color: "#38bdf8", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
                      Start
                    </button>
                  )}
                  {order.status === "in_progress" && (
                    <button onClick={() => completeWorkOrder(order.id, order.linkedProductionOrderId)} style={{ padding: "5px 10px", background: "rgba(34,197,94,.15)", border: "1px solid rgba(34,197,94,.3)", color: "#22c55e", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
                      Done
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!workStore.loading && workOrders.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: 36, textAlign: "center", color: "rgba(255,255,255,.28)" }}>
                  No work orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 30, width: 540, fontFamily: ff }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>New Work Order</h2>
            {formError && <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,.14)", border: "1px solid rgba(239,68,68,.28)", color: "#fca5a5", fontSize: 12 }}>{formError}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Task / Operation</label>
                <input value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Linked Production Order</label>
                <select value={form.linkedProductionOrderId} onChange={(e) => setForm((current) => ({ ...current, linkedProductionOrderId: e.target.value }))} style={{ width: "100%", background: "#161b27", border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff" }}>
                  <option value="">Standalone</option>
                  {productionOrders.map((order) => (
                    <option key={order.id} value={order.orderId}>{order.orderId} - {order.product}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Machine / Equipment</label>
                <input value={form.machine} onChange={(e) => setForm((current) => ({ ...current, machine: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Operator</label>
                <input value={form.operator} onChange={(e) => setForm((current) => ({ ...current, operator: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Scheduled Date</label>
                <input type="date" value={form.scheduledDate} onChange={(e) => setForm((current) => ({ ...current, scheduledDate: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Priority</label>
                <select value={form.priority} onChange={(e) => setForm((current) => ({ ...current, priority: e.target.value }))} style={{ width: "100%", background: "#161b27", border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff" }}>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Estimated Hours</label>
                <input type="number" value={form.estimatedHours} onChange={(e) => setForm((current) => ({ ...current, estimatedHours: Number(e.target.value) }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#f97316", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Create Work Order</button>
              <button onClick={() => setShowModal(false)} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.65)", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
