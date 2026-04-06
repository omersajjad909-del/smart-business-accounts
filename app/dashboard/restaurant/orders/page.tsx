"use client";
import { confirmToast, alertToast } from "@/lib/toast-feedback";

import toast from "react-hot-toast";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  mapRestaurantMenuRecords,
  mapRestaurantOrderRecords,
  mapRestaurantTableRecords,
  restaurantBg,
  restaurantBorder,
  restaurantFont,
  todayIso,
  type RestaurantOrderStatus,
} from "../_shared";

type OrderForm = {
  tableRef: string;
  serviceMode: "dine_in" | "takeaway" | "delivery";
  guests: number;
  itemsSummary: string;
  total: number;
  date: string;
};

const emptyForm: OrderForm = {
  tableRef: "",
  serviceMode: "dine_in",
  guests: 2,
  itemsSummary: "",
  total: 0,
  date: todayIso(),
};

export default function RestaurantOrdersPage() {
  const orderStore = useBusinessRecords("restaurant_order");
  const tableStore = useBusinessRecords("restaurant_table");
  const menuStore = useBusinessRecords("menu_item");
  const kitchenStore = useBusinessRecords("kitchen_order");
  const reservationStore = useBusinessRecords("restaurant_reservation");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<OrderForm>(emptyForm);
  const [formError, setFormError] = useState("");

  const orders = useMemo(() => mapRestaurantOrderRecords(orderStore.records), [orderStore.records]);
  const tables = useMemo(() => mapRestaurantTableRecords(tableStore.records), [tableStore.records]);
  const menu = useMemo(() => mapRestaurantMenuRecords(menuStore.records), [menuStore.records]);

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
  }

  function editOrder(order: (typeof orders)[number]) {
    if (order.status === "closed") {
      toast("Closed orders are locked.");
      return;
    }
    setEditingId(order.id);
    setForm({
      tableRef: order.tableRef,
      serviceMode: order.serviceMode as OrderForm["serviceMode"],
      guests: order.guests,
      itemsSummary: order.itemsSummary,
      total: order.total,
      date: order.date || todayIso(),
    });
    setShowModal(true);
  }

  function getTableRecord(tableRef: string) {
    return tableStore.records.find((record) => `Table ${Number(record.data?.number || 0)}` === tableRef);
  }

  function hasOtherOpenOrders(tableRef: string, excludeOrderId?: string) {
    return orders.some((row) => row.tableRef === tableRef && row.status !== "closed" && row.id !== excludeOrderId);
  }

  function hasBlockingReservation(tableRef: string, excludeReservationId?: string) {
    return reservationStore.records.some((record) => String(record.data?.tableRef || "") === tableRef && ["booked", "confirmed"].includes(String(record.status || "")) && record.id !== excludeReservationId);
  }

  function hasActiveReservation(tableRef: string, excludeReservationId?: string) {
    return reservationStore.records.some((record) => String(record.data?.tableRef || "") === tableRef && ["booked", "confirmed", "arrived"].includes(String(record.status || "")) && record.id !== excludeReservationId);
  }

  async function updateTableStatus(tableRef: string, nextStatus: "available" | "occupied" | "reserved" | "cleaning") {
    const tableRecord = getTableRecord(tableRef);
    if (!tableRecord) return;
    await tableStore.update(tableRecord.id, { status: nextStatus });
  }

  async function ensureKitchenOrder(order: (typeof orders)[number]) {
    const tableName = order.tableRef.replace("Table ", "").trim();
    const existing = kitchenStore.records.find((record) => String(record.data?.restaurantOrderId || "") === order.id && String(record.status || "") !== "served");
    const payload = {
      title: order.tableRef || order.orderNo,
      status: "pending",
      data: {
        orderId: order.orderNo,
        restaurantOrderId: order.id,
        table: tableName,
        items: order.itemsSummary,
        priority: "medium",
        notes: `${order.serviceMode.replace("_", " ")} order`,
      },
    };

    if (existing) {
      await kitchenStore.update(existing.id, payload);
      return;
    }

    await kitchenStore.create(payload);
  }

  async function save() {
    const tableRef = form.tableRef.trim();
    if (form.serviceMode === "dine_in" && !tableRef) return setFormError("Table is required for dine-in orders.");
    if (form.guests <= 0) return setFormError("Guests must be greater than zero.");
    if (!form.itemsSummary.trim()) return setFormError("Items summary is required.");
    if (form.total <= 0) return setFormError("Order total must be greater than zero.");
    if (!form.date) return setFormError("Order date is required.");
    const selectedTable = tableRef ? tables.find((table) => `Table ${table.number}` === tableRef) : null;
    if (form.serviceMode === "dine_in" && selectedTable && form.guests > selectedTable.capacity) {
      return setFormError("Guest count exceeds table capacity.");
    }
    setFormError("");

    const current = editingId ? orders.find((row) => row.id === editingId) : null;
    const payload = {
      title: tableRef ? `Order ${tableRef}` : `Order ${form.serviceMode}`,
      status: (current?.status || "draft") as RestaurantOrderStatus,
      amount: form.total,
      date: form.date,
      data: {
        orderNo: current?.orderNo || `RST-${String(orderStore.records.length + 1).padStart(4, "0")}`,
        tableRef,
        serviceMode: form.serviceMode,
        guests: form.guests,
        itemsSummary: form.itemsSummary.trim(),
      },
    };

    if (editingId) {
      await orderStore.update(editingId, payload);
    } else {
      await orderStore.create(payload);
    }
    closeModal();
  }

  async function moveOrder(order: (typeof orders)[number], nextStatus: RestaurantOrderStatus) {
    const isDineIn = order.serviceMode === "dine_in" && order.tableRef;
    if (nextStatus === "in_kitchen" && order.status !== "confirmed") {
      toast.success("Only confirmed orders can move to kitchen.");
      return;
    }
    if (nextStatus === "served" && order.status !== "in_kitchen") {
      toast.error("Only kitchen orders can be marked served.");
      return;
    }
    if (nextStatus === "closed" && order.status !== "served") {
      toast.error("Only served orders can be closed.");
      return;
    }

    if (nextStatus === "confirmed" && isDineIn) {
      const table = tables.find((row) => `Table ${row.number}` === order.tableRef);
      if (!table) {
        toast("Linked table no longer exists.");
        return;
      }
      if (table.status === "cleaning") {
        toast("This table is under cleaning.");
        return;
      }
      if (hasBlockingReservation(order.tableRef)) {
        toast("This table has an active reservation. Resolve it before confirming the order.");
        return;
      }
      await updateTableStatus(order.tableRef, "occupied");
    }

    if (nextStatus === "in_kitchen") {
      await ensureKitchenOrder(order);
      if (isDineIn) {
        await updateTableStatus(order.tableRef, "occupied");
      }
    }

    await orderStore.update(order.id, { status: nextStatus });

    if (nextStatus === "closed" && isDineIn) {
      if (hasOtherOpenOrders(order.tableRef, order.id)) return;
      await updateTableStatus(order.tableRef, hasActiveReservation(order.tableRef) ? "reserved" : "cleaning");
    }
  }

  async function removeOrder(order: (typeof orders)[number]) {
    if (order.status !== "draft") {
      toast.success("Only draft orders can be deleted.");
      return;
    }
    if (!await confirmToast(`Delete ${order.orderNo}?`)) return;
    await orderStore.remove(order.id);
  }

  return (
    <div style={{ padding: "28px 32px", color: "#fff", fontFamily: restaurantFont, minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>Restaurant Order Board</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.45)", margin: 0 }}>Manage dine-in, takeaway, and delivery orders before they hit billing and kitchen.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "#ef4444", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ New Order</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Draft Orders", value: orders.filter((row) => row.status === "draft").length, color: "#94a3b8" },
          { label: "Kitchen Queue", value: orders.filter((row) => row.status === "in_kitchen").length, color: "#f59e0b" },
          { label: "Served", value: orders.filter((row) => row.status === "served").length, color: "#34d399" },
          { label: "Ticket Value", value: `Rs. ${orders.reduce((sum, row) => sum + row.total, 0).toLocaleString()}`, color: "#fca5a5" },
        ].map((card) => (
          <div key={card.label} style={{ background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 16, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Order", "Table", "Mode", "Guests", "Items", "Total", "Status", "Actions"].map((header) => (
                <th key={header} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,.45)", borderBottom: `1px solid ${restaurantBorder}` }}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 700 }}>{order.orderNo}</td>
                <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{order.tableRef || "-"}</td>
                <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", textTransform: "capitalize" }}>{order.serviceMode.replace("_", " ")}</td>
                <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{order.guests}</td>
                <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", maxWidth: 260, color: "rgba(255,255,255,.65)" }}>{order.itemsSummary}</td>
                <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#34d399", fontWeight: 700 }}>Rs. {order.total.toLocaleString()}</td>
                <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", textTransform: "uppercase", fontSize: 11, color: "#fca5a5", fontWeight: 700 }}>{order.status}</td>
                <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => editOrder(order)} style={{ padding: "6px 10px", background: "rgba(99,102,241,.16)", border: "1px solid rgba(99,102,241,.3)", color: "#c7d2fe", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Edit</button>
                  {order.status === "draft" && <button onClick={() => void moveOrder(order, "confirmed")} style={{ padding: "6px 10px", background: "rgba(59,130,246,.15)", border: "1px solid rgba(59,130,246,.3)", color: "#38bdf8", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Confirm</button>}
                  {order.status === "confirmed" && <button onClick={() => void moveOrder(order, "in_kitchen")} style={{ padding: "6px 10px", background: "rgba(245,158,11,.15)", border: "1px solid rgba(245,158,11,.3)", color: "#f59e0b", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Send Kitchen</button>}
                  {order.status === "in_kitchen" && <button onClick={() => void moveOrder(order, "served")} style={{ padding: "6px 10px", background: "rgba(52,211,153,.15)", border: "1px solid rgba(52,211,153,.3)", color: "#34d399", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Serve</button>}
                  {order.status === "served" && <button onClick={() => void moveOrder(order, "closed")} style={{ padding: "6px 10px", background: "rgba(148,163,184,.15)", border: "1px solid rgba(148,163,184,.3)", color: "#cbd5e1", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Close</button>}
                  <button onClick={() => void removeOrder(order)} style={{ padding: "6px 10px", background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.25)", color: "#f87171", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Delete</button>
                </td>
              </tr>
            ))}
            {!orderStore.loading && orders.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: 36, textAlign: "center", color: "rgba(255,255,255,.25)" }}>No restaurant orders yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40 }}>
          <div style={{ width: 560, background: "#161b27", border: `1px solid ${restaurantBorder}`, borderRadius: 16, padding: 28 }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 800 }}>{editingId ? "Edit Order" : "New Order"}</h2>
            {formError && <div style={{ marginBottom: 14, padding: "10px 12px", background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.26)", borderRadius: 8, color: "#fca5a5", fontSize: 12 }}>{formError}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Service Mode</label>
                <select value={form.serviceMode} onChange={(event) => setForm((prev) => ({ ...prev, serviceMode: event.target.value as OrderForm["serviceMode"] }))} style={{ width: "100%", background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff" }}>
                  <option value="dine_in">Dine In</option>
                  <option value="takeaway">Takeaway</option>
                  <option value="delivery">Delivery</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Table</label>
                <select value={form.tableRef} onChange={(event) => setForm((prev) => ({ ...prev, tableRef: event.target.value }))} style={{ width: "100%", background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff" }}>
                  <option value="">Select table</option>
                  {tables.map((table) => (
                    <option key={table.id} value={`Table ${table.number}`}>Table {table.number} ({table.status})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Guests</label>
                <input type="number" min={1} value={form.guests} onChange={(event) => setForm((prev) => ({ ...prev, guests: Number(event.target.value) }))} style={{ width: "100%", background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Order Date</label>
                <input type="date" value={form.date} onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))} style={{ width: "100%", background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Items Summary</label>
                <input value={form.itemsSummary} onChange={(event) => setForm((prev) => ({ ...prev, itemsSummary: event.target.value }))} placeholder={menu.slice(0, 3).map((item) => item.name).join(", ") || "Burger, Fries, Tea"} style={{ width: "100%", background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Total</label>
                <input type="number" min={0} value={form.total} onChange={(event) => setForm((prev) => ({ ...prev, total: Number(event.target.value) }))} style={{ width: "100%", background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#ef4444", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{editingId ? "Update Order" : "Create Order"}</button>
              <button onClick={closeModal} style={{ padding: "11px 20px", background: "transparent", border: `1px solid ${restaurantBorder}`, borderRadius: 8, color: "rgba(255,255,255,.65)", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
