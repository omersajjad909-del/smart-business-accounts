"use client";
import { confirmToast, alertToast } from "@/lib/toast-feedback";

import toast from "react-hot-toast";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { mapMaintenanceRecords, mapVehicleRecords, todayIso, transportBg, transportBorder, transportFont, transportMuted } from "../_shared";

type MaintenanceStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

type MaintenanceForm = {
  jobNo: string;
  vehicle: string;
  serviceType: string;
  workshop: string;
  scheduledDate: string;
  completionDate: string;
  cost: number;
  notes: string;
  status: MaintenanceStatus;
};

const initialForm: MaintenanceForm = {
  jobNo: "",
  vehicle: "",
  serviceType: "Routine Service",
  workshop: "",
  scheduledDate: todayIso(),
  completionDate: "",
  cost: 0,
  notes: "",
  status: "scheduled",
};

const statusColor: Record<MaintenanceStatus, string> = {
  scheduled: "#60a5fa",
  in_progress: "#f59e0b",
  completed: "#22c55e",
  cancelled: "#f87171",
};

export default function TransportMaintenancePage() {
  const maintenanceStore = useBusinessRecords("vehicle_maintenance");
  const fleetStore = useBusinessRecords("vehicle");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MaintenanceForm>(initialForm);
  const [error, setError] = useState("");

  const vehicles = useMemo(() => mapVehicleRecords(fleetStore.records), [fleetStore.records]);
  const jobs = useMemo(() => mapMaintenanceRecords(maintenanceStore.records), [maintenanceStore.records]);

  const scheduled = jobs.filter((row) => row.status === "scheduled").length;
  const inProgress = jobs.filter((row) => row.status === "in_progress").length;
  const completed = jobs.filter((row) => row.status === "completed").length;
  const costBooked = jobs.reduce((sum, row) => sum + row.cost, 0);

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(initialForm);
    setError("");
  }

  function editRow(id: string) {
    const row = jobs.find((entry) => entry.id === id);
    if (!row) return;
    setEditingId(id);
    setForm({
      jobNo: row.jobNo,
      vehicle: row.vehicle,
      serviceType: row.serviceType,
      workshop: row.workshop,
      scheduledDate: row.scheduledDate || todayIso(),
      completionDate: row.completionDate || "",
      cost: row.cost,
      notes: row.notes,
      status: row.status as MaintenanceStatus,
    });
    setShowModal(true);
  }

  async function saveJob() {
    const jobNo = form.jobNo.trim() || `MNT-${String(maintenanceStore.records.length + 1).padStart(4, "0")}`;
    if (!form.vehicle.trim() || !form.scheduledDate || !form.serviceType.trim()) {
      setError("Vehicle, service type, and scheduled date are required.");
      return;
    }
    if (form.cost < 0) {
      setError("Maintenance cost cannot be negative.");
      return;
    }
    if (!editingId && jobs.some((row) => row.jobNo.toLowerCase() === jobNo.toLowerCase())) {
      setError("This maintenance job number already exists.");
      return;
    }
    if (form.status === "completed" && !form.completionDate) {
      setError("Completion date is required before closing a maintenance job.");
      return;
    }

    const payload = {
      title: jobNo,
      status: form.status,
      date: form.scheduledDate,
      amount: form.cost,
      data: {
        vehicle: form.vehicle.trim(),
        serviceType: form.serviceType.trim(),
        workshop: form.workshop.trim(),
        scheduledDate: form.scheduledDate,
        completionDate: form.completionDate,
        notes: form.notes.trim(),
        cost: form.cost,
      },
    };

    if (editingId) {
      await maintenanceStore.update(editingId, payload);
    } else {
      await maintenanceStore.create(payload);
    }
    closeModal();
  }

  async function moveStatus(id: string, nextStatus: MaintenanceStatus) {
    const row = jobs.find((entry) => entry.id === id);
    if (!row) return;
    if (nextStatus === "completed" && !row.completionDate) {
      toast("Edit the job and add a completion date before marking it complete.");
      return;
    }
    await maintenanceStore.update(id, { status: nextStatus });
  }

  async function removeJob(id: string) {
    const row = jobs.find((entry) => entry.id === id);
    if (!row) return;
    if (row.status === "completed") {
      toast.success("Completed maintenance jobs should stay in the service history.");
      return;
    }
    if (!await confirmToast(`Delete maintenance job ${row.jobNo}?`)) return;
    await maintenanceStore.remove(id);
  }

  const card = { background: transportBg, border: `1px solid ${transportBorder}`, borderRadius: 12, padding: 20 };
  const input = { width: "100%", background: "rgba(255,255,255,.05)", border: `1px solid ${transportBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontFamily: transportFont, boxSizing: "border-box" as const, fontSize: 14 };

  return (
    <div style={{ fontFamily: transportFont, color: "#fff", padding: 24, minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Vehicle Maintenance</h1>
          <p style={{ margin: "4px 0 0", color: transportMuted, fontSize: 14 }}>Track service jobs, workshops, and maintenance cost across the fleet.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ background: "#f59e0b", border: "none", borderRadius: 8, padding: "10px 18px", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
          + Add Maintenance Job
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 22 }}>
        {[
          { label: "Scheduled", value: scheduled, color: "#60a5fa" },
          { label: "In Progress", value: inProgress, color: "#f59e0b" },
          { label: "Completed", value: completed, color: "#22c55e" },
          { label: "Cost Booked", value: `Rs. ${costBooked.toLocaleString()}`, color: "#fca5a5" },
        ].map((item) => (
          <div key={item.label} style={card}>
            <div style={{ fontSize: 12, color: transportMuted, marginBottom: 8 }}>{item.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {!maintenanceStore.loading && jobs.length === 0 && <div style={{ ...card, textAlign: "center", color: "rgba(255,255,255,.28)" }}>No maintenance jobs logged yet.</div>}
        {jobs.map((row) => (
          <div key={row.id} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 16, fontWeight: 800 }}>{row.jobNo}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "4px 10px", color: statusColor[row.status as MaintenanceStatus], background: `${statusColor[row.status as MaintenanceStatus]}22`, border: `1px solid ${statusColor[row.status as MaintenanceStatus]}44` }}>
                    {String(row.status).replace("_", " ")}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, fontSize: 13, color: "rgba(255,255,255,.62)" }}>
                  <div>Vehicle: {row.vehicle}</div>
                  <div>Service: {row.serviceType || "-"}</div>
                  <div>Workshop: {row.workshop || "-"}</div>
                  <div>Scheduled: {row.scheduledDate || "-"}</div>
                  <div>Completed: {row.completionDate || "-"}</div>
                  <div>Cost: Rs. {row.cost.toLocaleString()}</div>
                </div>
                {row.notes && <div style={{ marginTop: 10, fontSize: 12, color: transportMuted }}>{row.notes}</div>}
              </div>
              <div style={{ display: "grid", gap: 8, minWidth: 170 }}>
                <button onClick={() => editRow(row.id)} style={{ background: "rgba(99,102,241,.16)", border: "1px solid rgba(99,102,241,.3)", color: "#c7d2fe", borderRadius: 8, padding: "8px 10px", fontSize: 12, cursor: "pointer" }}>Edit</button>
                {row.status === "scheduled" && <button onClick={() => void moveStatus(row.id, "in_progress")} style={{ background: "rgba(245,158,11,.16)", border: "1px solid rgba(245,158,11,.25)", color: "#fcd34d", borderRadius: 8, padding: "8px 10px", fontSize: 12, cursor: "pointer" }}>Start Work</button>}
                {row.status === "in_progress" && <button onClick={() => void moveStatus(row.id, "completed")} style={{ background: "rgba(34,197,94,.16)", border: "1px solid rgba(34,197,94,.25)", color: "#86efac", borderRadius: 8, padding: "8px 10px", fontSize: 12, cursor: "pointer" }}>Mark Completed</button>}
                {(row.status === "scheduled" || row.status === "in_progress") && <button onClick={() => void moveStatus(row.id, "cancelled")} style={{ background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.25)", color: "#fca5a5", borderRadius: 8, padding: "8px 10px", fontSize: 12, cursor: "pointer" }}>Cancel</button>}
                <button onClick={() => void removeJob(row.id)} style={{ background: "transparent", border: `1px solid ${transportBorder}`, color: "rgba(255,255,255,.68)", borderRadius: 8, padding: "8px 10px", fontSize: 12, cursor: "pointer" }}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#161b27", border: `1px solid ${transportBorder}`, borderRadius: 16, padding: 28, width: 620, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 800 }}>{editingId ? "Edit Maintenance Job" : "Add Maintenance Job"}</h2>
            {error && <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,.14)", border: "1px solid rgba(239,68,68,.25)", color: "#fca5a5", fontSize: 12 }}>{error}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: transportMuted }}>Job No</label>
                <input value={form.jobNo} onChange={(e) => setForm((prev) => ({ ...prev, jobNo: e.target.value }))} style={input} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: transportMuted }}>Vehicle</label>
                <select value={form.vehicle} onChange={(e) => setForm((prev) => ({ ...prev, vehicle: e.target.value }))} style={input}>
                  <option value="">Select vehicle</option>
                  {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.regNo}>{vehicle.regNo} | {vehicle.make} {vehicle.model}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: transportMuted }}>Service Type</label>
                <input value={form.serviceType} onChange={(e) => setForm((prev) => ({ ...prev, serviceType: e.target.value }))} style={input} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: transportMuted }}>Workshop</label>
                <input value={form.workshop} onChange={(e) => setForm((prev) => ({ ...prev, workshop: e.target.value }))} style={input} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: transportMuted }}>Scheduled Date</label>
                <input type="date" value={form.scheduledDate} onChange={(e) => setForm((prev) => ({ ...prev, scheduledDate: e.target.value }))} style={input} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: transportMuted }}>Completion Date</label>
                <input type="date" value={form.completionDate} onChange={(e) => setForm((prev) => ({ ...prev, completionDate: e.target.value }))} style={input} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: transportMuted }}>Cost</label>
                <input type="number" min={0} value={form.cost} onChange={(e) => setForm((prev) => ({ ...prev, cost: Number(e.target.value) }))} style={input} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: transportMuted }}>Status</label>
                <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as MaintenanceStatus }))} style={input}>
                  {(["scheduled", "in_progress", "completed", "cancelled"] as MaintenanceStatus[]).map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: transportMuted }}>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} style={{ ...input, minHeight: 90, resize: "vertical" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <button onClick={() => void saveJob()} style={{ flex: 1, background: "#f59e0b", border: "none", borderRadius: 8, padding: "11px 0", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Save Job</button>
              <button onClick={closeModal} style={{ padding: "11px 20px", borderRadius: 8, border: `1px solid ${transportBorder}`, background: "transparent", color: "rgba(255,255,255,.7)", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
