"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { mapVehicleRecords, todayIso, transportBg, transportBorder, transportFont, transportMuted } from "../_shared";

const statusColor: Record<string, string> = { available: "#22c55e", on_trip: "#3b82f6", maintenance: "#f59e0b", inactive: "#6b7280" };
const statusLabel: Record<string, string> = { available: "Available", on_trip: "On Trip", maintenance: "Maintenance", inactive: "Inactive" };
const typeIcon: Record<string, string> = { truck: "Truck", van: "Van", bus: "Bus", motorcycle: "Bike", car: "Car" };
const initialForm = { regNo: "", make: "", model: "", year: "2024", type: "truck", capacity: "", driver: "", fuelType: "Diesel", nextService: "" };

export default function FleetPage() {
  const { records, loading, create } = useBusinessRecords("vehicle");
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [error, setError] = useState("");
  const [form, setForm] = useState(initialForm);

  const vehicles = useMemo(() => mapVehicleRecords(records), [records]);

  const today = new Date();
  const isOverdue = (d: string) => d && new Date(d) < today;
  const isDueSoon = (d: string) => { if (!d) return false; const diff = (new Date(d).getTime() - today.getTime()) / (1000 * 60 * 60 * 24); return diff >= 0 && diff <= 30; };

  const stats = {
    total: vehicles.length,
    available: vehicles.filter((v) => v.status === "available").length,
    on_trip: vehicles.filter((v) => v.status === "on_trip").length,
    maintenance: vehicles.filter((v) => v.status === "maintenance").length,
  };

  const filtered = filterStatus === "all" ? vehicles : vehicles.filter((v) => v.status === filterStatus);

  const addVehicle = async () => {
    const regNo = form.regNo.trim().toUpperCase();
    if (!regNo || !form.make.trim() || !form.model.trim()) {
      setError("Registration no, make, and model are required.");
      return;
    }
    if (Number(form.year) < 1990 || Number(form.year) > 2100) {
      setError("Enter a valid vehicle year.");
      return;
    }
    if (vehicles.some((row) => row.regNo.toLowerCase() === regNo.toLowerCase())) {
      setError("This registration number already exists.");
      return;
    }
    await create({ title: regNo, status: "available", data: { make: form.make.trim(), model: form.model.trim(), year: Number(form.year), type: form.type, capacity: form.capacity.trim(), driver: form.driver.trim(), lastService: todayIso(), nextService: form.nextService, mileage: 0, fuelType: form.fuelType } });
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
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Fleet Management</h1>
          <p style={{ margin: "4px 0 0", color: transportMuted, fontSize: 14 }}>Manage your vehicle fleet.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={btn("#2563eb")}>Add Vehicle</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total Fleet", value: stats.total, color: "#2563eb" },
          { label: "Available", value: stats.available, color: "#22c55e" },
          { label: "On Trip", value: stats.on_trip, color: "#3b82f6" },
          { label: "In Maintenance", value: stats.maintenance, color: "#f59e0b" },
        ].map((s) => (
          <div key={s.label} style={{ ...card, textAlign: "center" }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ color: transportMuted, fontSize: 13, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["all", "available", "on_trip", "maintenance", "inactive"].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{ ...btn(filterStatus === s ? "#2563eb" : "rgba(255,255,255,.07)"), padding: "8px 16px", textTransform: "capitalize" }}>{s === "all" ? "All" : statusLabel[s]}</button>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: transportMuted }}>Loading...</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 16 }}>
        {!loading && filtered.length === 0 && <div style={{ ...card, textAlign: "center", padding: 40, color: "rgba(255,255,255,.25)" }}>No vehicles found.</div>}
        {filtered.map((v) => {
          const overdue = isOverdue(v.nextService);
          const dueSoon = isDueSoon(v.nextService);
          return (
            <div key={v.id} style={{ ...card, position: "relative" }}>
              {(overdue || dueSoon) && (
                <div style={{ position: "absolute", top: 12, right: 12, background: overdue ? "#ef4444" : "#f59e0b", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                  {overdue ? "SERVICE OVERDUE" : "SERVICE SOON"}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ fontSize: 16, fontWeight: 700, minWidth: 50 }}>{typeIcon[v.type] || "Vehicle"}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{v.regNo}</div>
                  <div style={{ color: transportMuted, fontSize: 13 }}>{v.year} {v.make} {v.model}</div>
                </div>
                <span style={{ marginLeft: "auto", background: `${statusColor[v.status] || "#6b7280"}22`, color: statusColor[v.status] || "#6b7280", border: `1px solid ${statusColor[v.status] || "#6b7280"}44`, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600 }}>
                  {statusLabel[v.status] || v.status}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13, color: "rgba(255,255,255,.6)" }}>
                <div>Driver: {v.driver || "-"}</div>
                <div>Capacity: {v.capacity || "-"}</div>
                <div>Fuel: {v.fuelType}</div>
                <div>Mileage: {v.mileage.toLocaleString()} km</div>
                <div style={{ color: overdue ? "#ef4444" : dueSoon ? "#f59e0b" : transportMuted }}>Next: {v.nextService || "-"}</div>
                <div>Last: {v.lastService || "-"}</div>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#1a1a2e", border: `1px solid ${transportBorder}`, borderRadius: 16, padding: 28, width: 500, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 18 }}>Add Vehicle</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[["Registration No", "regNo"], ["Make", "make"], ["Model", "model"], ["Year", "year"], ["Capacity", "capacity"], ["Driver", "driver"], ["Fuel Type", "fuelType"], ["Next Service", "nextService"]].map(([lbl, key]) => (
                <div key={key}>
                  <label style={{ fontSize: 12, color: transportMuted, display: "block", marginBottom: 4 }}>{lbl}</label>
                  <input value={(form as Record<string, string>)[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} style={inp} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, color: transportMuted, display: "block", marginBottom: 4 }}>Type</label>
                <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} style={inp}>
                  {["truck", "van", "bus", "motorcycle", "car"].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            {error && <div style={{ marginTop: 14, fontSize: 12, color: "#fca5a5" }}>{error}</div>}
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button onClick={addVehicle} style={{ ...btn("#2563eb"), flex: 1 }}>Add Vehicle</button>
              <button onClick={() => { setShowModal(false); setError(""); }} style={{ ...btn("rgba(255,255,255,.07)"), flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
