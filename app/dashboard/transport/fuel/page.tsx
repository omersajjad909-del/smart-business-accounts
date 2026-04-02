"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { mapFuelRecords, todayIso, transportBg, transportBorder, transportFont, transportMuted } from "../_shared";

const ftColor: Record<string, string> = { petrol: "#3b82f6", diesel: "#f59e0b", cng: "#22c55e" };
const initialForm = { vehicle: "", driver: "", date: todayIso(), liters: "", pricePerLiter: "", odometer: "", station: "", fuelType: "diesel" };

export default function FuelPage() {
  const { records, loading, create } = useBusinessRecords("fuel_log");
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(initialForm);

  const fuelRecords = useMemo(() => mapFuelRecords(records), [records]);

  const monthCost = fuelRecords.reduce((s, r) => s + r.totalCost, 0);
  const monthLiters = fuelRecords.reduce((s, r) => s + r.liters, 0);
  const withMileage = fuelRecords.filter((r) => r.mileage);
  const avgPerKm = withMileage.length > 0 ? withMileage.reduce((s, r) => s + (r.mileage || 0), 0) / withMileage.length : 0;
  const vehicleCount = [...new Set(fuelRecords.map((r) => r.vehicle))].length;

  const addRecord = async () => {
    const liters = Number(form.liters || 0);
    const ppl = Number(form.pricePerLiter || 0);
    if (!form.vehicle.trim() || !form.driver.trim() || !form.date) {
      setError("Vehicle, driver, and date are required.");
      return;
    }
    if (liters <= 0 || ppl <= 0) {
      setError("Liters and price per liter must be greater than zero.");
      return;
    }
    await create({ title: form.vehicle.trim(), status: "logged", date: form.date, amount: liters * ppl, data: { driver: form.driver.trim(), date: form.date, liters, pricePerLiter: ppl, totalCost: liters * ppl, odometer: Number(form.odometer || 0), station: form.station.trim(), fuelType: form.fuelType } });
    setShowModal(false);
    setError("");
    setForm(initialForm);
  };

  const card = { background: transportBg, border: `1px solid ${transportBorder}`, borderRadius: 12, padding: 20 };
  const inp = { background: "rgba(255,255,255,.05)", border: `1px solid ${transportBorder}`, borderRadius: 8, padding: "10px 14px", color: "#fff", fontFamily: transportFont, width: "100%", boxSizing: "border-box" as const, fontSize: 14 };
  const btn = (c: string) => ({ background: c, border: "none", borderRadius: 8, padding: "10px 20px", color: "#fff", fontFamily: transportFont, cursor: "pointer", fontSize: 14, fontWeight: 600 });

  const byDate: Record<string, number> = {};
  fuelRecords.forEach((r) => { byDate[r.date] = (byDate[r.date] || 0) + r.totalCost; });
  const sortedDates = Object.keys(byDate).sort();
  const maxBar = Math.max(...Object.values(byDate), 1);

  return (
    <div style={{ fontFamily: transportFont, color: "#fff", padding: 24, minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Fuel Tracking</h1>
          <p style={{ margin: "4px 0 0", color: transportMuted, fontSize: 14 }}>Monitor fuel consumption and costs.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={btn("#2563eb")}>Add Record</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "This Month Cost", value: `Rs. ${monthCost.toLocaleString()}`, color: "#ef4444" },
          { label: "Total Liters", value: `${monthLiters.toLocaleString()} L`, color: "#3b82f6" },
          { label: "Avg Mileage", value: `${avgPerKm.toFixed(1)} km/L`, color: "#22c55e" },
          { label: "Vehicles Tracked", value: vehicleCount, color: "#f59e0b" },
        ].map((s) => (
          <div key={s.label} style={{ ...card, textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ color: transportMuted, fontSize: 13, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: transportMuted }}>Loading...</div>}

      {sortedDates.length > 0 && (
        <div style={{ ...card, marginBottom: 24 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "rgba(255,255,255,.7)" }}>Daily Fuel Cost (Rs.)</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
            {sortedDates.map((date) => {
              const h = (byDate[date] / maxBar) * 70;
              return (
                <div key={date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,.4)" }}>{(byDate[date] / 1000).toFixed(0)}k</div>
                  <div style={{ width: "100%", height: h, background: "linear-gradient(to top,#2563eb,#60a5fa)", borderRadius: "4px 4px 0 0" }} />
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,.4)", transform: "rotate(-30deg)", transformOrigin: "top left", marginTop: 4 }}>{date.slice(5)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ ...card }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "rgba(255,255,255,.7)" }}>Fuel Log</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ color: "rgba(255,255,255,.4)" }}>
                {["Vehicle", "Driver", "Date", "Fuel Type", "Liters", "Price/L", "Total", "Station", "Mileage"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 12px", borderBottom: `1px solid ${transportBorder}`, fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && fuelRecords.length === 0 && (
                <tr><td colSpan={9} style={{ padding: 32, textAlign: "center", color: "rgba(255,255,255,.25)" }}>No fuel records found.</td></tr>
              )}
              {fuelRecords.map((r) => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${transportBorder}` }}>
                  <td style={{ padding: "10px 12px", fontWeight: 600 }}>{r.vehicle}</td>
                  <td style={{ padding: "10px 12px", color: "rgba(255,255,255,.6)" }}>{r.driver}</td>
                  <td style={{ padding: "10px 12px", color: "rgba(255,255,255,.6)" }}>{r.date}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ background: `${ftColor[r.fuelType] || "#6b7280"}22`, color: ftColor[r.fuelType] || "#6b7280", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>{r.fuelType}</span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>{r.liters} L</td>
                  <td style={{ padding: "10px 12px", color: "rgba(255,255,255,.6)" }}>Rs. {r.pricePerLiter}</td>
                  <td style={{ padding: "10px 12px", fontWeight: 600, color: "#ef4444" }}>Rs. {r.totalCost.toLocaleString()}</td>
                  <td style={{ padding: "10px 12px", color: "rgba(255,255,255,.6)", fontSize: 12 }}>{r.station || "-"}</td>
                  <td style={{ padding: "10px 12px", color: r.mileage && r.mileage < 8 ? "#ef4444" : "#22c55e" }}>{r.mileage ? `${r.mileage} km/L` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#1a1a2e", border: `1px solid ${transportBorder}`, borderRadius: 16, padding: 28, width: 520, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 18 }}>Add Fuel Record</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[["Vehicle", "vehicle"], ["Driver", "driver"], ["Date", "date"], ["Liters", "liters"], ["Price/Liter", "pricePerLiter"], ["Odometer (km)", "odometer"], ["Station", "station"]].map(([lbl, key]) => (
                <div key={key}>
                  <label style={{ fontSize: 12, color: transportMuted, display: "block", marginBottom: 4 }}>{lbl}</label>
                  <input value={(form as Record<string, string>)[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} style={inp} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, color: transportMuted, display: "block", marginBottom: 4 }}>Fuel Type</label>
                <select value={form.fuelType} onChange={(e) => setForm((p) => ({ ...p, fuelType: e.target.value }))} style={inp}>
                  {["petrol", "diesel", "cng"].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            {error && <div style={{ marginTop: 14, fontSize: 12, color: "#fca5a5" }}>{error}</div>}
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button onClick={addRecord} style={{ ...btn("#2563eb"), flex: 1 }}>Add Record</button>
              <button onClick={() => { setShowModal(false); setError(""); }} style={{ ...btn("rgba(255,255,255,.07)"), flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
