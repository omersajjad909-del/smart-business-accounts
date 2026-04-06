"use client";
import { confirmToast, alertToast } from "@/lib/toast-feedback";

import toast from "react-hot-toast";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  mapDriverRecords,
  mapTransportExpenseRecords,
  mapTripRecords,
  mapVehicleRecords,
  todayIso,
  transportBg,
  transportBorder,
  transportFont,
  transportMuted,
} from "../_shared";

type ExpenseStatus = "logged" | "approved" | "posted";

type ExpenseForm = {
  expenseNo: string;
  vehicle: string;
  driver: string;
  tripId: string;
  expenseType: string;
  amount: number;
  date: string;
  notes: string;
  status: ExpenseStatus;
};

const initialForm: ExpenseForm = {
  expenseNo: "",
  vehicle: "",
  driver: "",
  tripId: "",
  expenseType: "Toll",
  amount: 0,
  date: todayIso(),
  notes: "",
  status: "logged",
};

const statusColor: Record<ExpenseStatus, string> = {
  logged: "#60a5fa",
  approved: "#f59e0b",
  posted: "#22c55e",
};

export default function TransportExpensesPage() {
  const expenseStore = useBusinessRecords("transport_expense");
  const tripStore = useBusinessRecords("trip");
  const fleetStore = useBusinessRecords("vehicle");
  const driverStore = useBusinessRecords("driver");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExpenseForm>(initialForm);
  const [error, setError] = useState("");

  const trips = useMemo(() => mapTripRecords(tripStore.records), [tripStore.records]);
  const vehicles = useMemo(() => mapVehicleRecords(fleetStore.records), [fleetStore.records]);
  const drivers = useMemo(() => mapDriverRecords(driverStore.records), [driverStore.records]);
  const expenses = useMemo(() => mapTransportExpenseRecords(expenseStore.records), [expenseStore.records]);

  const total = expenses.reduce((sum, row) => sum + row.amount, 0);
  const approved = expenses.filter((row) => row.status === "approved").reduce((sum, row) => sum + row.amount, 0);
  const posted = expenses.filter((row) => row.status === "posted").reduce((sum, row) => sum + row.amount, 0);

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(initialForm);
    setError("");
  }

  function syncTrip(tripId: string) {
    const trip = trips.find((row) => row.id === tripId);
    setForm((prev) => ({
      ...prev,
      tripId,
      vehicle: prev.vehicle || trip?.vehicle || "",
      driver: prev.driver || trip?.driver || "",
    }));
  }

  function editRow(id: string) {
    const row = expenses.find((entry) => entry.id === id);
    if (!row) return;
    setEditingId(id);
    setForm({
      expenseNo: row.expenseNo,
      vehicle: row.vehicle,
      driver: row.driver,
      tripId: row.tripId,
      expenseType: row.expenseType,
      amount: row.amount,
      date: row.date || todayIso(),
      notes: row.notes,
      status: row.status as ExpenseStatus,
    });
    setShowModal(true);
  }

  async function saveExpense() {
    const expenseNo = form.expenseNo.trim() || `TEX-${String(expenseStore.records.length + 1).padStart(4, "0")}`;
    const trip = form.tripId ? trips.find((row) => row.id === form.tripId) : null;
    if (!form.vehicle.trim() || !form.driver.trim() || !form.date || !form.expenseType.trim()) {
      setError("Vehicle, driver, date, and expense type are required.");
      return;
    }
    if (form.amount <= 0) {
      setError("Expense amount must be greater than zero.");
      return;
    }
    if (!editingId && expenses.some((row) => row.expenseNo.toLowerCase() === expenseNo.toLowerCase())) {
      setError("This expense number already exists.");
      return;
    }

    const payload = {
      title: expenseNo,
      status: form.status,
      amount: form.amount,
      date: form.date,
      data: {
        vehicle: form.vehicle.trim(),
        driver: form.driver.trim(),
        tripId: form.tripId,
        tripNo: trip?.tripNo || "",
        expenseType: form.expenseType.trim(),
        date: form.date,
        notes: form.notes.trim(),
      },
    };

    if (editingId) {
      await expenseStore.update(editingId, payload);
    } else {
      await expenseStore.create(payload);
    }
    closeModal();
  }

  async function moveStatus(id: string, nextStatus: ExpenseStatus) {
    const row = expenses.find((entry) => entry.id === id);
    if (!row) return;
    if (row.status === "posted") return;
    if (nextStatus === "posted" && row.status !== "approved") {
      toast("Approve an expense before posting it.");
      return;
    }
    await expenseStore.update(id, { status: nextStatus });
  }

  async function removeRow(id: string) {
    const row = expenses.find((entry) => entry.id === id);
    if (!row) return;
    if (row.status === "posted") {
      toast.success("Posted expenses cannot be deleted.");
      return;
    }
    if (!await confirmToast(`Delete expense ${row.expenseNo}?`)) return;
    await expenseStore.remove(id);
  }

  const card = { background: transportBg, border: `1px solid ${transportBorder}`, borderRadius: 12, padding: 20 };
  const input = { width: "100%", background: "rgba(255,255,255,.05)", border: `1px solid ${transportBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontFamily: transportFont, boxSizing: "border-box" as const, fontSize: 14 };

  return (
    <div style={{ fontFamily: transportFont, color: "#fff", padding: 24, minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Trip Expenses</h1>
          <p style={{ margin: "4px 0 0", color: transportMuted, fontSize: 14 }}>Log route expenses and move them through approval and posting stages.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ background: "#dc2626", border: "none", borderRadius: 8, padding: "10px 18px", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
          + Add Expense
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 22 }}>
        {[
          { label: "Total Logged", value: `Rs. ${total.toLocaleString()}`, color: "#f87171" },
          { label: "Approved", value: `Rs. ${approved.toLocaleString()}`, color: "#f59e0b" },
          { label: "Posted", value: `Rs. ${posted.toLocaleString()}`, color: "#22c55e" },
        ].map((item) => (
          <div key={item.label} style={card}>
            <div style={{ fontSize: 12, color: transportMuted, marginBottom: 8 }}>{item.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {!expenseStore.loading && expenses.length === 0 && <div style={{ ...card, textAlign: "center", color: "rgba(255,255,255,.28)" }}>No transport expenses logged yet.</div>}
        {expenses.map((row) => (
          <div key={row.id} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 16, fontWeight: 800 }}>{row.expenseNo}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "4px 10px", color: statusColor[row.status as ExpenseStatus], background: `${statusColor[row.status as ExpenseStatus]}22`, border: `1px solid ${statusColor[row.status as ExpenseStatus]}44` }}>
                    {row.status}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, fontSize: 13, color: "rgba(255,255,255,.62)" }}>
                  <div>Vehicle: {row.vehicle || "-"}</div>
                  <div>Driver: {row.driver || "-"}</div>
                  <div>Trip: {row.tripNo || "-"}</div>
                  <div>Type: {row.expenseType || "-"}</div>
                  <div>Date: {row.date || "-"}</div>
                </div>
                {row.notes && <div style={{ marginTop: 10, fontSize: 12, color: transportMuted }}>{row.notes}</div>}
              </div>
              <div style={{ minWidth: 190, display: "grid", gap: 8 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#fca5a5" }}>Rs. {row.amount.toLocaleString()}</div>
                <button onClick={() => editRow(row.id)} style={{ background: "rgba(99,102,241,.16)", border: "1px solid rgba(99,102,241,.3)", color: "#c7d2fe", borderRadius: 8, padding: "8px 10px", fontSize: 12, cursor: "pointer" }}>Edit</button>
                {row.status === "logged" && <button onClick={() => void moveStatus(row.id, "approved")} style={{ background: "rgba(245,158,11,.16)", border: "1px solid rgba(245,158,11,.25)", color: "#fcd34d", borderRadius: 8, padding: "8px 10px", fontSize: 12, cursor: "pointer" }}>Approve</button>}
                {row.status === "approved" && <button onClick={() => void moveStatus(row.id, "posted")} style={{ background: "rgba(34,197,94,.16)", border: "1px solid rgba(34,197,94,.25)", color: "#86efac", borderRadius: 8, padding: "8px 10px", fontSize: 12, cursor: "pointer" }}>Post</button>}
                <button onClick={() => void removeRow(row.id)} style={{ background: "transparent", border: `1px solid ${transportBorder}`, color: "rgba(255,255,255,.68)", borderRadius: 8, padding: "8px 10px", fontSize: 12, cursor: "pointer" }}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#161b27", border: `1px solid ${transportBorder}`, borderRadius: 16, padding: 28, width: 620, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 800 }}>{editingId ? "Edit Expense" : "Add Expense"}</h2>
            {error && <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,.14)", border: "1px solid rgba(239,68,68,.25)", color: "#fca5a5", fontSize: 12 }}>{error}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: transportMuted }}>Expense No</label>
                <input value={form.expenseNo} onChange={(e) => setForm((prev) => ({ ...prev, expenseNo: e.target.value }))} style={input} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: transportMuted }}>Trip</label>
                <select value={form.tripId} onChange={(e) => syncTrip(e.target.value)} style={input}>
                  <option value="">Select trip</option>
                  {trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.tripNo} | {trip.from} to {trip.to}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: transportMuted }}>Vehicle</label>
                <select value={form.vehicle} onChange={(e) => setForm((prev) => ({ ...prev, vehicle: e.target.value }))} style={input}>
                  <option value="">Select vehicle</option>
                  {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.regNo}>{vehicle.regNo}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: transportMuted }}>Driver</label>
                <select value={form.driver} onChange={(e) => setForm((prev) => ({ ...prev, driver: e.target.value }))} style={input}>
                  <option value="">Select driver</option>
                  {drivers.map((driver) => <option key={driver.id} value={driver.name}>{driver.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: transportMuted }}>Expense Type</label>
                <input value={form.expenseType} onChange={(e) => setForm((prev) => ({ ...prev, expenseType: e.target.value }))} style={input} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: transportMuted }}>Amount</label>
                <input type="number" min={0} value={form.amount} onChange={(e) => setForm((prev) => ({ ...prev, amount: Number(e.target.value) }))} style={input} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: transportMuted }}>Date</label>
                <input type="date" value={form.date} onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))} style={input} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: transportMuted }}>Status</label>
                <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as ExpenseStatus }))} style={input}>
                  {(["logged", "approved", "posted"] as ExpenseStatus[]).map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: transportMuted }}>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} style={{ ...input, minHeight: 90, resize: "vertical" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <button onClick={() => void saveExpense()} style={{ flex: 1, background: "#dc2626", border: "none", borderRadius: 8, padding: "11px 0", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Save Expense</button>
              <button onClick={closeModal} style={{ padding: "11px 20px", borderRadius: 8, border: `1px solid ${transportBorder}`, background: "transparent", color: "rgba(255,255,255,.7)", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
