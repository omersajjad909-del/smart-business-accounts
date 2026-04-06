"use client";`r`nimport { confirmToast, alertToast } from "@/lib/toast-feedback";`r`n
import toast from "react-hot-toast";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  mapDispatchRecords,
  mapTripRecords,
  todayIso,
  transportBg,
  transportBorder,
  transportFont,
  transportMuted,
} from "../_shared";

type DispatchStatus = "planned" | "dispatched" | "arrived" | "closed" | "cancelled";

type DispatchForm = {
  dispatchNo: string;
  tripId: string;
  customer: string;
  cargo: string;
  origin: string;
  destination: string;
  dispatchDate: string;
  eta: string;
  notes: string;
  status: DispatchStatus;
};

const initialForm: DispatchForm = {
  dispatchNo: "",
  tripId: "",
  customer: "",
  cargo: "",
  origin: "",
  destination: "",
  dispatchDate: todayIso(),
  eta: "",
  notes: "",
  status: "planned",
};

const statusColor: Record<DispatchStatus, string> = {
  planned: "#60a5fa",
  dispatched: "#38bdf8",
  arrived: "#22c55e",
  closed: "#a78bfa",
  cancelled: "#f87171",
};

const statusLabel: Record<DispatchStatus, string> = {
  planned: "Planned",
  dispatched: "Dispatched",
  arrived: "Arrived",
  closed: "Closed",
  cancelled: "Cancelled",
};

export default function TransportDispatchPage() {
  const dispatchStore = useBusinessRecords("transport_dispatch");
  const tripStore = useBusinessRecords("trip");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<DispatchStatus | "all">("all");
  const [form, setForm] = useState<DispatchForm>(initialForm);
  const [error, setError] = useState("");

  const trips = useMemo(() => mapTripRecords(tripStore.records), [tripStore.records]);
  const dispatches = useMemo(() => mapDispatchRecords(dispatchStore.records), [dispatchStore.records]);
  const filtered = filterStatus === "all" ? dispatches : dispatches.filter((row) => row.status === filterStatus);

  const summary = {
    total: dispatches.length,
    active: dispatches.filter((row) => row.status === "planned" || row.status === "dispatched").length,
    arrived: dispatches.filter((row) => row.status === "arrived").length,
    closed: dispatches.filter((row) => row.status === "closed").length,
  };

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
      customer: prev.customer || trip?.client || "",
      cargo: prev.cargo || trip?.cargo || "",
      origin: prev.origin || trip?.from || "",
      destination: prev.destination || trip?.to || "",
    }));
  }

  function editRow(id: string) {
    const row = dispatches.find((entry) => entry.id === id);
    if (!row) return;
    setEditingId(id);
    setForm({
      dispatchNo: row.dispatchNo,
      tripId: row.tripId,
      customer: row.customer,
      cargo: row.cargo,
      origin: row.origin,
      destination: row.destination,
      dispatchDate: row.dispatchDate || todayIso(),
      eta: row.eta,
      notes: row.notes,
      status: row.status as DispatchStatus,
    });
    setError("");
    setShowModal(true);
  }

  async function saveDispatch() {
    const dispatchNo = form.dispatchNo.trim() || `DSP-${String(dispatchStore.records.length + 1).padStart(4, "0")}`;
    const trip = trips.find((row) => row.id === form.tripId);
    if (!trip) {
      setError("Linked trip is required.");
      return;
    }
    if (!form.dispatchDate || !form.origin.trim() || !form.destination.trim() || !form.cargo.trim()) {
      setError("Dispatch date, origin, destination, and cargo are required.");
      return;
    }
    if (!editingId && dispatches.some((row) => row.dispatchNo.toLowerCase() === dispatchNo.toLowerCase())) {
      setError("This dispatch number already exists.");
      return;
    }
    if (form.status === "arrived" && !form.eta.trim()) {
      setError("ETA is required before marking a dispatch as arrived.");
      return;
    }

    const payload = {
      title: dispatchNo,
      status: form.status,
      date: form.dispatchDate,
      data: {
        tripId: trip.id,
        tripNo: trip.tripNo,
        vehicle: trip.vehicle,
        driver: trip.driver,
        customer: form.customer.trim() || trip.client,
        cargo: form.cargo.trim(),
        origin: form.origin.trim(),
        destination: form.destination.trim(),
        dispatchDate: form.dispatchDate,
        eta: form.eta.trim(),
        notes: form.notes.trim(),
      },
    };

    if (editingId) {
      await dispatchStore.update(editingId, payload);
    } else {
      await dispatchStore.create(payload);
    }
    closeModal();
  }

  async function moveStatus(id: string, nextStatus: DispatchStatus) {
    const row = dispatches.find((entry) => entry.id === id);
    if (!row) return;
    if (row.status === "closed" || row.status === "cancelled") return;
    if (nextStatus === "closed" && row.status !== "arrived") {
      toast.error("Only arrived dispatches can be closed.");
      return;
    }
    await dispatchStore.update(id, { status: nextStatus });
  }

  async function removeRow(id: string) {
    const row = dispatches.find((entry) => entry.id === id);
    if (!row) return;
    if (row.status === "dispatched" || row.status === "arrived" || row.status === "closed") {
      toast.success("Dispatched, arrived, or closed rows cannot be deleted.");
      return;
    }
    if (!await confirmToast(`Delete dispatch ${row.dispatchNo}?`)) return;
    await dispatchStore.remove(id);
  }

  const card = { background: transportBg, border: `1px solid ${transportBorder}`, borderRadius: 12, padding: 20 };
  const input = { width: "100%", background: "rgba(255,255,255,.05)", border: `1px solid ${transportBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontFamily: transportFont, boxSizing: "border-box" as const, fontSize: 14 };

  return (
    <div style={{ fontFamily: transportFont, color: "#fff", padding: 24, minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Dispatch Board</h1>
          <p style={{ margin: "4px 0 0", color: transportMuted, fontSize: 14 }}>Plan dispatches against trips and keep transport movement under control.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ background: "#2563eb", border: "none", borderRadius: 8, padding: "10px 18px", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
          + Add Dispatch
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Dispatches", value: summary.total, color: "#60a5fa" },
          { label: "Active", value: summary.active, color: "#38bdf8" },
          { label: "Arrived", value: summary.arrived, color: "#22c55e" },
          { label: "Closed", value: summary.closed, color: "#a78bfa" },
        ].map((item) => (
          <div key={item.label} style={card}>
            <div style={{ fontSize: 12, color: transportMuted, marginBottom: 8 }}>{item.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {["all", "planned", "dispatched", "arrived", "closed", "cancelled"].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status as DispatchStatus | "all")}
            style={{ background: filterStatus === status ? "#2563eb" : "rgba(255,255,255,.06)", border: "none", borderRadius: 999, padding: "8px 14px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
          >
            {status === "all" ? "All" : statusLabel[status as DispatchStatus]}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {!dispatchStore.loading && filtered.length === 0 && <div style={{ ...card, textAlign: "center", color: "rgba(255,255,255,.28)" }}>No dispatches logged yet.</div>}
        {filtered.map((row) => (
          <div key={row.id} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 16, fontWeight: 800 }}>{row.dispatchNo}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "4px 10px", color: statusColor[row.status as DispatchStatus], background: `${statusColor[row.status as DispatchStatus]}22`, border: `1px solid ${statusColor[row.status as DispatchStatus]}44` }}>
                    {statusLabel[row.status as DispatchStatus]}
                  </span>
                  <span style={{ fontSize: 12, color: transportMuted }}>Trip: {row.tripNo || "-"}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, fontSize: 13, color: "rgba(255,255,255,.62)" }}>
                  <div>Vehicle: {row.vehicle || "-"}</div>
                  <div>Driver: {row.driver || "-"}</div>
                  <div>Customer: {row.customer || "-"}</div>
                  <div>Cargo: {row.cargo || "-"}</div>
                  <div>Origin: {row.origin || "-"}</div>
                  <div>Destination: {row.destination || "-"}</div>
                  <div>Dispatch: {row.dispatchDate || "-"}</div>
                  <div>ETA: {row.eta || "-"}</div>
                </div>
                {row.notes && <div style={{ marginTop: 10, fontSize: 12, color: transportMuted }}>{row.notes}</div>}
              </div>
              <div style={{ display: "grid", gap: 8, minWidth: 170 }}>
                <button onClick={() => editRow(row.id)} style={{ background: "rgba(99,102,241,.16)", border: "1px solid rgba(99,102,241,.3)", color: "#c7d2fe", borderRadius: 8, padding: "8px 10px", fontSize: 12, cursor: "pointer" }}>Edit</button>
                {row.status === "planned" && <button onClick={() => void moveStatus(row.id, "dispatched")} style={{ background: "rgba(56,189,248,.16)", border: "1px solid rgba(56,189,248,.28)", color: "#7dd3fc", borderRadius: 8, padding: "8px 10px", fontSize: 12, cursor: "pointer" }}>Mark Dispatched</button>}
                {row.status === "dispatched" && <button onClick={() => void moveStatus(row.id, "arrived")} style={{ background: "rgba(34,197,94,.16)", border: "1px solid rgba(34,197,94,.28)", color: "#86efac", borderRadius: 8, padding: "8px 10px", fontSize: 12, cursor: "pointer" }}>Mark Arrived</button>}
                {row.status === "arrived" && <button onClick={() => void moveStatus(row.id, "closed")} style={{ background: "rgba(167,139,250,.16)", border: "1px solid rgba(167,139,250,.28)", color: "#ddd6fe", borderRadius: 8, padding: "8px 10px", fontSize: 12, cursor: "pointer" }}>Close Dispatch</button>}
                {(row.status === "planned" || row.status === "dispatched") && <button onClick={() => void moveStatus(row.id, "cancelled")} style={{ background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.25)", color: "#fca5a5", borderRadius: 8, padding: "8px 10px", fontSize: 12, cursor: "pointer" }}>Cancel</button>}
                <button onClick={() => void removeRow(row.id)} style={{ background: "transparent", border: `1px solid ${transportBorder}`, color: "rgba(255,255,255,.68)", borderRadius: 8, padding: "8px 10px", fontSize: 12, cursor: "pointer" }}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#161b27", border: `1px solid ${transportBorder}`, borderRadius: 16, padding: 28, width: 640, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 800 }}>{editingId ? "Edit Dispatch" : "Add Dispatch"}</h2>
            {error && <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,.14)", border: "1px solid rgba(239,68,68,.25)", color: "#fca5a5", fontSize: 12 }}>{error}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: transportMuted }}>Dispatch No</label>
                <input value={form.dispatchNo} onChange={(e) => setForm((prev) => ({ ...prev, dispatchNo: e.target.value }))} style={input} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: transportMuted }}>Linked Trip</label>
                <select value={form.tripId} onChange={(e) => syncTrip(e.target.value)} style={input}>
                  <option value="">Select trip</option>
                  {trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.tripNo} | {trip.from} to {trip.to}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: transportMuted }}>Customer</label>
                <input value={form.customer} onChange={(e) => setForm((prev) => ({ ...prev, customer: e.target.value }))} style={input} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: transportMuted }}>Cargo</label>
                <input value={form.cargo} onChange={(e) => setForm((prev) => ({ ...prev, cargo: e.target.value }))} style={input} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: transportMuted }}>Origin</label>
                <input value={form.origin} onChange={(e) => setForm((prev) => ({ ...prev, origin: e.target.value }))} style={input} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: transportMuted }}>Destination</label>
                <input value={form.destination} onChange={(e) => setForm((prev) => ({ ...prev, destination: e.target.value }))} style={input} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: transportMuted }}>Dispatch Date</label>
                <input type="date" value={form.dispatchDate} onChange={(e) => setForm((prev) => ({ ...prev, dispatchDate: e.target.value }))} style={input} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: transportMuted }}>ETA</label>
                <input value={form.eta} onChange={(e) => setForm((prev) => ({ ...prev, eta: e.target.value }))} style={input} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: transportMuted }}>Status</label>
                <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as DispatchStatus }))} style={input}>
                  {(["planned", "dispatched", "arrived", "closed", "cancelled"] as DispatchStatus[]).map((status) => <option key={status} value={status}>{statusLabel[status]}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: transportMuted }}>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} style={{ ...input, minHeight: 90, resize: "vertical" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <button onClick={() => void saveDispatch()} style={{ flex: 1, background: "#2563eb", border: "none", borderRadius: 8, padding: "11px 0", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Save Dispatch</button>
              <button onClick={closeModal} style={{ padding: "11px 20px", borderRadius: 8, border: `1px solid ${transportBorder}`, background: "transparent", color: "rgba(255,255,255,.7)", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
