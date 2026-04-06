"use client";

import toast from "react-hot-toast";

import { useEffect, useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { restaurantBg, restaurantBorder, restaurantFont, restaurantMuted } from "../_shared";

const PRIORITY_COLOR: Record<string, string> = { high: "#ef4444", medium: "#f59e0b", low: "#34d399" };

type KitchenRow = {
  id: string;
  orderId: string;
  table: string;
  items: string[];
  priority: string;
  notes: string;
  status: string;
  elapsed: number;
};

function KitchenKanbanCol({
  title,
  rows,
  color,
  onMove,
}: {
  title: string;
  rows: KitchenRow[];
  color: string;
  onMove: (id: string, nextStatus: string, table: string) => void;
}) {
  return (
    <div style={{ flex: 1, background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 14, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
        <span style={{ background: `${color}20`, color, borderRadius: 12, padding: "2px 10px", fontSize: 13, fontWeight: 700 }}>{rows.length}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.map((order) => (
          <div key={order.id} style={{ background: "rgba(255,255,255,.04)", border: `1px solid ${PRIORITY_COLOR[order.priority]}30`, borderLeft: `3px solid ${PRIORITY_COLOR[order.priority]}`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Table {order.table}</div>
              <div style={{ fontSize: 11, color: order.elapsed > 15 ? "#ef4444" : restaurantMuted }}>⏱ {order.elapsed}m</div>
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.6)", marginBottom: 10 }}>{order.items.join(", ")}</div>
            {order.notes && <div style={{ fontSize: 11, color: restaurantMuted, marginBottom: 10 }}>Note: {order.notes}</div>}
            <div style={{ display: "flex", gap: 6 }}>
              {order.status === "pending" && <button onClick={() => onMove(order.id, "preparing", order.table)} style={{ flex: 1, padding: "6px", background: "rgba(59,130,246,.15)", border: "1px solid rgba(59,130,246,.3)", color: "#3b82f6", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Start</button>}
              {order.status === "preparing" && <button onClick={() => onMove(order.id, "ready", order.table)} style={{ flex: 1, padding: "6px", background: "rgba(34,197,94,.15)", border: "1px solid rgba(34,197,94,.3)", color: "#22c55e", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Ready</button>}
              {order.status === "ready" && <button onClick={() => onMove(order.id, "served", order.table)} style={{ flex: 1, padding: "6px", background: "rgba(107,114,128,.15)", border: "1px solid rgba(107,114,128,.3)", color: "#9ca3af", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Served</button>}
            </div>
          </div>
        ))}
        {rows.length === 0 && <div style={{ textAlign: "center", padding: 24, color: "rgba(255,255,255,.2)", fontSize: 13 }}>No orders</div>}
      </div>
    </div>
  );
}

export default function KitchenPage() {
  const { records, loading, create, update } = useBusinessRecords("kitchen_order");
  const orderStore = useBusinessRecords("restaurant_order");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ table: "", items: "", priority: "medium", notes: "" });
  const [formError, setFormError] = useState("");
  const [now, setNow] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const orders = useMemo(() => records.map((record) => ({
    id: record.id,
    orderId: String(record.data?.orderId || record.title),
    table: String(record.data?.table || ""),
    items: String(record.data?.items || "").split(",").map((item) => item.trim()).filter(Boolean),
    priority: String(record.data?.priority || "medium"),
    notes: String(record.data?.notes || ""),
    status: String(record.status || "pending"),
    elapsed: Math.round((now - new Date(record.createdAt).getTime()) / 60000),
  })), [records, now]);

  const pending = orders.filter((order) => order.status === "pending");
  const preparing = orders.filter((order) => order.status === "preparing");
  const ready = orders.filter((order) => order.status === "ready");

  async function save() {
    const table = form.table.trim();
    const items = form.items.split(",").map((item) => item.trim()).filter(Boolean);
    if (!table) return setFormError("Table number is required.");
    if (items.length === 0) return setFormError("At least one kitchen item is required.");
    setFormError("");
    await create({
      title: `Table ${table}`,
      status: "pending",
      data: {
        orderId: `ORD-${String(records.length + 1).padStart(3, "0")}`,
        table,
        items: items.join(", "),
        priority: form.priority,
        notes: form.notes.trim(),
      },
    });
    setShowModal(false);
    setForm({ table: "", items: "", priority: "medium", notes: "" });
  }

  async function moveKitchenOrder(id: string, nextStatus: string, table: string) {
    const linkedOrder = orderStore.records.find((record) => String(record.data?.tableRef || "") === `Table ${table}` && String(record.status || "") !== "closed");
    if (nextStatus === "preparing" && linkedOrder && String(linkedOrder.status || "") !== "in_kitchen") {
      toast("Send the linked restaurant order to kitchen first.");
      return;
    }
    if (nextStatus === "served" && linkedOrder && String(linkedOrder.status || "") !== "served") {
      await orderStore.update(linkedOrder.id, { status: "served" });
    }
    await update(id, { status: nextStatus });
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: restaurantFont, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Kitchen Display</h1>
          <p style={{ fontSize: 13, color: restaurantMuted, margin: 0 }}>Live order tracking with service discipline.</p>
        </div>
        <button onClick={() => { setShowModal(true); setFormError(""); }} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#ef4444", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ New Order</button>
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: restaurantMuted }}>Loading...</div>}

      <div style={{ display: "flex", gap: 20 }}>
        <KitchenKanbanCol title="Pending" rows={pending} color="#f59e0b" onMove={(id, nextStatus, table) => { void moveKitchenOrder(id, nextStatus, table); }} />
        <KitchenKanbanCol title="Preparing" rows={preparing} color="#3b82f6" onMove={(id, nextStatus, table) => { void moveKitchenOrder(id, nextStatus, table); }} />
        <KitchenKanbanCol title="Ready" rows={ready} color="#34d399" onMove={(id, nextStatus, table) => { void moveKitchenOrder(id, nextStatus, table); }} />
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${restaurantBorder}`, borderRadius: 16, padding: 32, width: 480, fontFamily: restaurantFont }}>
            <h2 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 700 }}>New Kitchen Order</h2>
            {formError && <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,.14)", border: "1px solid rgba(239,68,68,.28)", color: "#fca5a5", fontSize: 12 }}>{formError}</div>}
            {[
              ["Table Number", "table", "text"],
              ["Items (comma separated)", "items", "text"],
              ["Notes", "notes", "text"],
            ].map(([label, key, type]) => (
              <div key={key} style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, color: restaurantMuted, marginBottom: 6 }}>{label}</label>
                <input type={type} value={String((form as Record<string, unknown>)[key] ?? "")} onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))} style={{ width: "100%", background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            ))}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, color: restaurantMuted, marginBottom: 6 }}>Priority</label>
              <select value={form.priority} onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))} style={{ width: "100%", background: "#161b27", border: `1px solid ${restaurantBorder}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14 }}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#ef4444", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Add Order</button>
              <button onClick={() => setShowModal(false)} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${restaurantBorder}`, borderRadius: 8, color: "rgba(255,255,255,.6)", fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
