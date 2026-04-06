"use client";

import toast from "react-hot-toast";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { restaurantBg, restaurantBorder, restaurantFont, restaurantMuted } from "../_shared";

type TableStatus = "available" | "occupied" | "reserved" | "cleaning";
const STATUS_META: Record<TableStatus, { label: string; color: string; bg: string; emoji: string }> = {
  available: { label: "Available", color: "#34d399", bg: "rgba(52,211,153,.12)", emoji: "✓" },
  occupied: { label: "Occupied", color: "#f59e0b", bg: "rgba(245,158,11,.12)", emoji: "🍽️" },
  reserved: { label: "Reserved", color: "#818cf8", bg: "rgba(129,140,248,.12)", emoji: "📋" },
  cleaning: { label: "Cleaning", color: "#38bdf8", bg: "rgba(56,189,248,.12)", emoji: "🧹" },
};

export default function TablesPage() {
  const { records, loading, create, update } = useBusinessRecords("restaurant_table");
  const orderStore = useBusinessRecords("restaurant_order");
  const reservationStore = useBusinessRecords("restaurant_reservation");
  const [selected, setSelected] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ number: "", capacity: 4 });
  const [formError, setFormError] = useState("");

  const tables = useMemo(() => records.map((record) => ({
    id: record.id,
    number: Number(record.data?.number || 0),
    capacity: Number(record.data?.capacity || 4),
    status: (record.status || "available") as TableStatus,
    order: record.data?.order as { items: string[]; total: number; time: string } | undefined,
  })), [records]);

  const counts = { available: 0, occupied: 0, reserved: 0, cleaning: 0 };
  tables.forEach((table) => counts[table.status]++);
  const revenue = tables.filter((table) => table.order).reduce((sum, table) => sum + (table.order?.total || 0), 0);
  const selectedTable = selected ? tables.find((table) => table.id === selected) : null;

  async function addTable() {
    const tableNumber = Number(form.number);
    if (!tableNumber) return setFormError("Table number is required.");
    if (form.capacity <= 0) return setFormError("Capacity must be greater than zero.");
    if (tables.some((table) => table.number === tableNumber)) return setFormError("Table number already exists.");
    setFormError("");
    await create({ title: `Table ${tableNumber}`, status: "available", data: { number: tableNumber, capacity: form.capacity } });
    setShowModal(false);
    setForm({ number: "", capacity: 4 });
  }

  async function changeStatus(tableId: string, nextStatus: TableStatus) {
    const table = tables.find((entry) => entry.id === tableId);
    if (!table) return;
    const tableRef = `Table ${table.number}`;
    const hasOpenOrder = orderStore.records.some((record) => String(record.data?.tableRef || "") === tableRef && String(record.status || "") !== "closed");
    const hasActiveReservation = reservationStore.records.some((record) => String(record.data?.tableRef || "") === tableRef && ["booked", "confirmed"].includes(String(record.status || "")));
    if (nextStatus === "available" && hasOpenOrder) return toast("Close the active order before making this table available.");
    if (nextStatus === "cleaning" && hasActiveReservation) return toast("This table has an active reservation.");
    await update(tableId, { status: nextStatus });
  }

  return (
    <div style={{ padding: "28px", color: "white", fontFamily: restaurantFont }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Table Management</h1>
          <p style={{ fontSize: 13, color: restaurantMuted, margin: 0 }}>Live floor view with status discipline.</p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#34d399" }}>Revenue: Rs.{revenue.toLocaleString()}</div>
          <button onClick={() => { setShowModal(true); setFormError(""); }} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#f87171", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Add Table</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 }}>
        {(Object.entries(counts) as [TableStatus, number][]).map(([status, count]) => {
          const meta = STATUS_META[status];
          return <div key={status} style={{ padding: "16px 18px", borderRadius: 13, background: meta.bg, border: `1px solid ${meta.color}30` }}><div style={{ fontSize: 22, fontWeight: 800, color: meta.color }}>{count}</div><div style={{ fontSize: 12, color: "rgba(255,255,255,.6)", marginTop: 3 }}>{meta.emoji} {meta.label}</div></div>;
        })}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: restaurantMuted }}>Loading...</div>}

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 340px" : "1fr", gap: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 12 }}>
          {tables.map((table) => {
            const meta = STATUS_META[table.status];
            const isSelected = selected === table.id;
            return <div key={table.id} onClick={() => setSelected(isSelected ? null : table.id)} style={{ padding: "18px 14px", borderRadius: 14, background: isSelected ? meta.bg : restaurantBg, border: `2px solid ${isSelected ? meta.color : `${meta.color}30`}`, cursor: "pointer", textAlign: "center" }}><div style={{ fontSize: 26, marginBottom: 6 }}>{meta.emoji}</div><div style={{ fontSize: 18, fontWeight: 800 }}>Table {table.number}</div><div style={{ fontSize: 11, color: restaurantMuted, marginTop: 2 }}>Cap: {table.capacity}</div><div style={{ fontSize: 11, fontWeight: 700, color: meta.color, marginTop: 6, padding: "2px 8px", borderRadius: 20, background: `${meta.color}15`, display: "inline-block" }}>{meta.label}</div>{table.order && <div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", marginTop: 6 }}>Rs.{table.order.total.toLocaleString()}</div>}</div>;
          })}
          {!loading && tables.length === 0 && <div style={{ background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 12, padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)", gridColumn: "1/-1" }}>No tables added yet.</div>}
        </div>

        {selectedTable && (
          <div style={{ padding: "20px 22px", borderRadius: 16, background: restaurantBg, border: `1px solid ${restaurantBorder}`, height: "fit-content" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>Table {selectedTable.number}</div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.4)", fontSize: 18, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: restaurantMuted, marginBottom: 10, textTransform: "uppercase" }}>Change Status</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {(["available", "occupied", "reserved", "cleaning"] as TableStatus[]).map((status) => {
                const meta = STATUS_META[status];
                return <button key={status} onClick={() => void changeStatus(selectedTable.id, status)} style={{ padding: "9px", borderRadius: 9, border: `1px solid ${selectedTable.status === status ? meta.color : "rgba(255,255,255,.08)"}`, background: selectedTable.status === status ? meta.bg : "transparent", color: selectedTable.status === status ? meta.color : "rgba(255,255,255,.4)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{meta.emoji} {meta.label}</button>;
              })}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${restaurantBorder}`, borderRadius: 16, padding: 32, width: 400, fontFamily: restaurantFont }}>
            <h2 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 700 }}>Add Table</h2>
            {formError && <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,.14)", border: "1px solid rgba(239,68,68,.28)", color: "#fca5a5", fontSize: 12 }}>{formError}</div>}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, color: restaurantMuted, marginBottom: 6 }}>Table Number</label>
              <input type="number" value={form.number} onChange={(event) => setForm((prev) => ({ ...prev, number: event.target.value }))} style={{ width: "100%", background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 12, color: restaurantMuted, marginBottom: 6 }}>Capacity (seats)</label>
              <input type="number" value={form.capacity} onChange={(event) => setForm((prev) => ({ ...prev, capacity: Number(event.target.value) }))} style={{ width: "100%", background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={addTable} style={{ flex: 1, padding: "11px 0", background: "#f87171", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Add Table</button>
              <button onClick={() => setShowModal(false)} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${restaurantBorder}`, borderRadius: 8, color: "rgba(255,255,255,.6)", fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
