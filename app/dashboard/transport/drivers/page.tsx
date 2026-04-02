"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { mapDriverRecords, todayIso, transportBg, transportBorder, transportFont, transportMuted } from "../_shared";

const statusColor: Record<string, string> = { available: "#22c55e", on_duty: "#3b82f6", off_day: "#f59e0b", suspended: "#ef4444" };
const statusLabel: Record<string, string> = { available: "Available", on_duty: "On Duty", off_day: "Off Day", suspended: "Suspended" };
const initialForm = { empId: "", name: "", phone: "", cnic: "", licenseNo: "", licenseExpiry: "", experience: "", salary: "" };

export default function DriversPage() {
  const { records, loading, create } = useBusinessRecords("driver");
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(initialForm);

  const drivers = useMemo(() => mapDriverRecords(records), [records]);

  const today = new Date();
  const daysTo = (d: string) => d ? Math.ceil((new Date(d).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 999;

  const stats = {
    total: drivers.length,
    available: drivers.filter((d) => d.status === "available").length,
    onDuty: drivers.filter((d) => d.status === "on_duty").length,
    expiringSoon: drivers.filter((d) => daysTo(d.licenseExpiry) <= 30).length,
  };

  const addDriver = async () => {
    const name = form.name.trim();
    const empId = form.empId.trim() || `DRV-${String(records.length + 1).padStart(3, "0")}`;
    if (!name || !form.phone.trim() || !form.licenseNo.trim()) {
      setError("Name, phone, and license number are required.");
      return;
    }
    if (!form.licenseExpiry || form.licenseExpiry < todayIso()) {
      setError("License expiry must be today or a future date.");
      return;
    }
    if (drivers.some((row) => row.empId.toLowerCase() === empId.toLowerCase())) {
      setError("This driver employee ID already exists.");
      return;
    }
    await create({ title: name, status: "available", amount: Number(form.salary || 0), data: { empId, phone: form.phone.trim(), cnic: form.cnic.trim(), licenseNo: form.licenseNo.trim(), licenseExpiry: form.licenseExpiry, experience: Number(form.experience || 0), trips_completed: 0, rating: 0, salary: Number(form.salary || 0) } });
    setShowModal(false);
    setError("");
    setForm(initialForm);
  };

  const stars = (r: number) => "★".repeat(Math.floor(r)) + "☆".repeat(Math.max(0, 5 - Math.floor(r)));

  const card = { background: transportBg, border: `1px solid ${transportBorder}`, borderRadius: 12, padding: 20 };
  const inp = { background: "rgba(255,255,255,.05)", border: `1px solid ${transportBorder}`, borderRadius: 8, padding: "10px 14px", color: "#fff", fontFamily: transportFont, width: "100%", boxSizing: "border-box" as const, fontSize: 14 };
  const btn = (c: string) => ({ background: c, border: "none", borderRadius: 8, padding: "10px 20px", color: "#fff", fontFamily: transportFont, cursor: "pointer", fontSize: 14, fontWeight: 600 });

  return (
    <div style={{ fontFamily: transportFont, color: "#fff", padding: 24, minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Driver Management</h1>
          <p style={{ margin: "4px 0 0", color: transportMuted, fontSize: 14 }}>Track driver status and compliance.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={btn("#2563eb")}>Add Driver</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total Drivers", value: stats.total, color: "#2563eb" },
          { label: "Available", value: stats.available, color: "#22c55e" },
          { label: "On Duty", value: stats.onDuty, color: "#3b82f6" },
          { label: "License Expiring Soon", value: stats.expiringSoon, color: "#ef4444" },
        ].map((s) => (
          <div key={s.label} style={{ ...card, textAlign: "center" }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ color: transportMuted, fontSize: 13, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: transportMuted }}>Loading...</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 16 }}>
        {!loading && drivers.length === 0 && <div style={{ ...card, textAlign: "center", padding: 40, color: "rgba(255,255,255,.25)" }}>No drivers found.</div>}
        {drivers.map((d) => {
          const days = daysTo(d.licenseExpiry);
          const expired = days < 0;
          const expiringSoon = days >= 0 && days <= 30;
          return (
            <div key={d.id} style={{ ...card }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(37,99,235,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                  {d.name.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{d.name}</div>
                  <div style={{ fontSize: 12, color: transportMuted }}>{d.empId} | {d.phone}</div>
                </div>
                <span style={{ background: `${statusColor[d.status] || "#6b7280"}22`, color: statusColor[d.status] || "#6b7280", border: `1px solid ${statusColor[d.status] || "#6b7280"}44`, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>{statusLabel[d.status] || d.status}</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13, marginBottom: 12 }}>
                <div style={{ color: transportMuted }}>Experience</div>
                <div>{d.experience} years</div>
                <div style={{ color: transportMuted }}>Trips Done</div>
                <div>{d.tripsCompleted.toLocaleString()}</div>
                <div style={{ color: transportMuted }}>Rating</div>
                <div style={{ color: "#f59e0b" }}>{stars(d.rating)} {d.rating}</div>
                <div style={{ color: transportMuted }}>Salary</div>
                <div>Rs. {d.salary.toLocaleString()}</div>
                <div style={{ color: transportMuted }}>CNIC</div>
                <div style={{ fontSize: 12 }}>{d.cnic || "-"}</div>
              </div>

              <div style={{ background: expired ? "rgba(239,68,68,.1)" : expiringSoon ? "rgba(245,158,11,.1)" : "rgba(255,255,255,.04)", border: `1px solid ${expired ? "#ef444440" : expiringSoon ? "#f59e0b40" : transportBorder}`, borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
                <span style={{ color: expired ? "#ef4444" : expiringSoon ? "#f59e0b" : transportMuted }}>
                  License: {d.licenseNo}
                </span>
                <span style={{ float: "right", color: expired ? "#ef4444" : expiringSoon ? "#f59e0b" : transportMuted }}>
                  {expired ? `Expired ${Math.abs(days)}d ago` : expiringSoon ? `Expires in ${days}d` : `Expires ${d.licenseExpiry}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#1a1a2e", border: `1px solid ${transportBorder}`, borderRadius: 16, padding: 28, width: 520, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 18 }}>Add Driver</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[["Employee ID", "empId"], ["Full Name", "name"], ["Phone", "phone"], ["CNIC", "cnic"], ["License No", "licenseNo"], ["License Expiry", "licenseExpiry"], ["Experience (yrs)", "experience"], ["Salary (Rs.)", "salary"]].map(([lbl, key]) => (
                <div key={key}>
                  <label style={{ fontSize: 12, color: transportMuted, display: "block", marginBottom: 4 }}>{lbl}</label>
                  <input value={(form as Record<string, string>)[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} style={inp} />
                </div>
              ))}
            </div>
            {error && <div style={{ marginTop: 14, fontSize: 12, color: "#fca5a5" }}>{error}</div>}
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button onClick={addDriver} style={{ ...btn("#2563eb"), flex: 1 }}>Add Driver</button>
              <button onClick={() => { setShowModal(false); setError(""); }} style={{ ...btn("rgba(255,255,255,.07)"), flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
