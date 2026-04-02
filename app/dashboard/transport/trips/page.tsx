"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { mapTripRecords, todayIso, transportBg, transportBorder, transportFont, transportMuted } from "../_shared";

const statusColor: Record<string, string> = { scheduled: "#2563eb", in_transit: "#3b82f6", completed: "#22c55e", cancelled: "#ef4444" };
const statusLabel: Record<string, string> = { scheduled: "Scheduled", in_transit: "In Transit", completed: "Completed", cancelled: "Cancelled" };
const initialForm = { tripNo: "", vehicle: "", driver: "", from: "", to: "", cargo: "", weight: "", client: "", date: todayIso(), startTime: "", distance: "", fare: "", expenses: "", status: "scheduled" };

export default function TripsPage() {
  const { records, loading, create } = useBusinessRecords("trip");
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [error, setError] = useState("");
  const [form, setForm] = useState(initialForm);

  const today = todayIso();
  const trips = useMemo(() => mapTripRecords(records), [records]);

  const todayTrips = trips.filter((t) => t.date === today).length;
  const inTransit = trips.filter((t) => t.status === "in_transit").length;
  const completed = trips.filter((t) => t.status === "completed").length;
  const netRevenue = trips.filter((t) => t.status === "completed").reduce((s, t) => s + t.fare - t.expenses, 0);

  const filtered = filterStatus === "all" ? trips : trips.filter((t) => t.status === filterStatus);

  const addTrip = async () => {
    const tripNo = form.tripNo.trim() || `TR-${String(records.length + 1).padStart(4, "0")}`;
    if (!form.vehicle.trim() || !form.driver.trim() || !form.from.trim() || !form.to.trim() || !form.date) {
      setError("Vehicle, driver, route, and date are required.");
      return;
    }
    if (Number(form.distance || 0) < 0 || Number(form.fare || 0) < 0 || Number(form.expenses || 0) < 0) {
      setError("Distance, fare, and expenses cannot be negative.");
      return;
    }
    if (trips.some((row) => row.tripNo.toLowerCase() === tripNo.toLowerCase())) {
      setError("This trip number already exists.");
      return;
    }
    await create({ title: tripNo, status: form.status, date: form.date, amount: Number(form.fare || 0), data: { tripNo, vehicle: form.vehicle.trim(), driver: form.driver.trim(), from: form.from.trim(), to: form.to.trim(), cargo: form.cargo.trim(), weight: Number(form.weight || 0), client: form.client.trim(), date: form.date, startTime: form.startTime.trim(), distance: Number(form.distance || 0), fare: Number(form.fare || 0), expenses: Number(form.expenses || 0) } });
    setShowModal(false);
    setError("");
    setForm(initialForm);
  };

  const card = { background: transportBg, border: `1px solid ${transportBorder}`, borderRadius: 12, padding: 20 };
  const inp = { background: "rgba(255,255,255,.05)", border: `1px solid ${transportBorder}`, borderRadius: 8, padding: "10px 14px", color: "#fff", fontFamily: transportFont, width: "100%", boxSizing: "border-box" as const, fontSize: 14 };
  const btn = (c: string) => ({ background: c, border: "none", borderRadius: 8, padding: "10px 20px", color: "#fff", fontFamily: transportFont, cursor: "pointer", fontSize: 14, fontWeight: 600 });

  return (
    <div style={{ fontFamily: transportFont, color: "#fff", padding: 24, minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Trip Management</h1>
          <p style={{ margin: "4px 0 0", color: transportMuted, fontSize: 14 }}>Track all transport trips.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={btn("#2563eb")}>Create Trip</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Today's Trips", value: todayTrips, color: "#2563eb" },
          { label: "In Transit", value: inTransit, color: "#3b82f6" },
          { label: "Completed", value: completed, color: "#22c55e" },
          { label: "Net Revenue", value: `Rs. ${netRevenue.toLocaleString()}`, color: "#f59e0b" },
        ].map((s) => (
          <div key={s.label} style={{ ...card, textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ color: transportMuted, fontSize: 13, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["all", "scheduled", "in_transit", "completed", "cancelled"].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{ ...btn(filterStatus === s ? "#2563eb" : "rgba(255,255,255,.07)"), padding: "8px 16px" }}>{s === "all" ? "All" : statusLabel[s]}</button>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: transportMuted }}>Loading...</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {!loading && filtered.length === 0 && <div style={{ ...card, textAlign: "center", padding: 40, color: "rgba(255,255,255,.25)" }}>No trips found.</div>}
        {filtered.map((t) => {
          const profit = t.fare - t.expenses;
          return (
            <div key={t.id} style={{ ...card }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>{t.tripNo}</span>
                    <span style={{ background: `${statusColor[t.status]}22`, color: statusColor[t.status], border: `1px solid ${statusColor[t.status]}44`, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>{statusLabel[t.status]}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, background: "rgba(255,255,255,.04)", borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{t.from}</div>
                    <div style={{ flex: 1, borderTop: "2px dashed rgba(255,255,255,.2)", position: "relative" }}>
                      <span style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", fontSize: 11, color: "rgba(255,255,255,.4)", whiteSpace: "nowrap" }}>{t.distance} km</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{t.to}</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, fontSize: 13, color: "rgba(255,255,255,.6)" }}>
                    <div>Vehicle: {t.vehicle}</div>
                    <div>Driver: {t.driver}</div>
                    <div>Cargo: {t.cargo} ({t.weight} kg)</div>
                    <div>Client: {t.client || "-"}</div>
                    {t.startTime && <div>Start: {t.startTime}</div>}
                    {t.endTime && <div>End: {t.endTime}</div>}
                  </div>
                </div>
                <div style={{ textAlign: "right", minWidth: 140 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#22c55e" }}>Rs. {t.fare.toLocaleString()}</div>
                  <div style={{ fontSize: 12, color: "#ef4444" }}>Exp: Rs. {t.expenses.toLocaleString()}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: profit >= 0 ? "#22c55e" : "#ef4444", marginTop: 4 }}>Net: Rs. {profit.toLocaleString()}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#1a1a2e", border: `1px solid ${transportBorder}`, borderRadius: 16, padding: 28, width: 560, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 18 }}>Create Trip</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[["Trip No", "tripNo"], ["Vehicle", "vehicle"], ["Driver", "driver"], ["From", "from"], ["To", "to"], ["Cargo", "cargo"], ["Weight (kg)", "weight"], ["Client", "client"], ["Date", "date"], ["Start Time", "startTime"], ["Distance (km)", "distance"], ["Fare (Rs.)", "fare"], ["Expenses (Rs.)", "expenses"]].map(([lbl, key]) => (
                <div key={key}>
                  <label style={{ fontSize: 12, color: transportMuted, display: "block", marginBottom: 4 }}>{lbl}</label>
                  <input value={(form as Record<string, string>)[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} style={inp} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, color: transportMuted, display: "block", marginBottom: 4 }}>Status</label>
                <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} style={inp}>
                  {["scheduled", "in_transit", "completed", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            {error && <div style={{ marginTop: 14, fontSize: 12, color: "#fca5a5" }}>{error}</div>}
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button onClick={addTrip} style={{ ...btn("#2563eb"), flex: 1 }}>Create Trip</button>
              <button onClick={() => { setShowModal(false); setError(""); }} style={{ ...btn("rgba(255,255,255,.07)"), flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
