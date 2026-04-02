"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  mapSalonAppointments,
  mapSalonStylists,
  salonBg,
  salonBorder,
  salonFont,
  salonMuted,
  salonStatusColor,
  stylistSpecialties,
} from "../_shared";

type StylistForm = {
  name: string;
  specialization: string;
  phone: string;
  status: "Active" | "On Leave";
};

const EMPTY_FORM: StylistForm = { name: "", specialization: "Hair Styling", phone: "", status: "Active" };

export default function StylistsPage() {
  const stylistsHook = useBusinessRecords("stylist");
  const appointmentsHook = useBusinessRecords("salon_appointment");

  const stylists = mapSalonStylists(stylistsHook.records);
  const appointments = mapSalonAppointments(appointmentsHook.records);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");

  const stylistsWithLiveStats = useMemo(() => {
    return stylists.map((stylist) => {
      const related = appointments.filter((appointment) => appointment.stylist === stylist.name);
      const todayCount = related.filter((appointment) => appointment.date === new Date().toISOString().slice(0, 10) && appointment.status !== "cancelled").length;
      const monthlyRevenue = related.filter((appointment) => appointment.status === "completed").reduce((sum, appointment) => sum + appointment.price, 0);
      return {
        ...stylist,
        appointmentsToday: todayCount,
        monthlyEarnings: monthlyRevenue || stylist.monthlyEarnings,
      };
    });
  }, [appointments, stylists]);

  const active = stylistsWithLiveStats.filter((stylist) => stylist.status === "Active").length;
  const avgEarnings = stylistsWithLiveStats.length > 0 ? Math.round(stylistsWithLiveStats.reduce((sum, stylist) => sum + stylist.monthlyEarnings, 0) / stylistsWithLiveStats.length) : 0;
  const top = stylistsWithLiveStats.length > 0 ? [...stylistsWithLiveStats].sort((a, b) => b.monthlyEarnings - a.monthlyEarnings)[0] : null;

  const initials = (name: string) => name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  const handleAdd = async () => {
    setError("");
    if (!form.name.trim()) return setError("Stylist name required hai.");
    if (!form.phone.trim()) return setError("Phone required hai.");
    if (stylistsWithLiveStats.some((stylist) => stylist.name.toLowerCase() === form.name.trim().toLowerCase())) {
      return setError("Ye stylist pehle se maujood hai.");
    }
    if (stylistsWithLiveStats.some((stylist) => stylist.phone === form.phone.trim())) {
      return setError("Ye phone number pehle se use ho raha hai.");
    }

    await stylistsHook.create({
      title: form.name.trim(),
      status: form.status,
      amount: 0,
      data: {
        stylistId: `STY-${String(stylistsWithLiveStats.length + 1).padStart(3, "0")}`,
        specialization: form.specialization,
        phone: form.phone.trim(),
        appointmentsToday: 0,
        monthlyEarnings: 0,
      },
    });

    setShowModal(false);
    setForm(EMPTY_FORM);
  };

  async function toggleStatus(id: string, currentStatus: string) {
    if (currentStatus === "Active") {
      const stylist = stylistsWithLiveStats.find((record) => record.id === id);
      const hasOpenAppointments = appointments.some((appointment) =>
        appointment.stylist === stylist?.name &&
        (appointment.status === "booked" || appointment.status === "confirmed" || appointment.status === "in_progress"),
      );
      if (hasOpenAppointments) {
        setError("Is stylist ke open appointments hain. Pehle schedule clear karein.");
        return;
      }
    }
    await stylistsHook.update(id, { status: currentStatus === "Active" ? "On Leave" : "Active" });
  }

  return (
    <div style={{ padding: "32px", fontFamily: salonFont, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Salon Stylists</h1>
          <p style={{ fontSize: 14, color: salonMuted, marginTop: 6 }}>Team capacity, specialization, aur daily chair load ko yahan se control karein.</p>
        </div>
        <button style={{ background: "#ec4899", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: 14 }} onClick={() => setShowModal(true)}>+ Add Stylist</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
        <div style={{ background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 16, padding: "20px 24px" }}><div style={{ fontSize: 13, color: salonMuted, marginBottom: 6 }}>Total Stylists</div><div style={{ fontSize: 28, fontWeight: 800 }}>{stylistsWithLiveStats.length}</div></div>
        <div style={{ background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 16, padding: "20px 24px" }}><div style={{ fontSize: 13, color: salonMuted, marginBottom: 6 }}>Active Today</div><div style={{ fontSize: 28, fontWeight: 800, color: "#34d399" }}>{active}</div></div>
        <div style={{ background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 16, padding: "20px 24px" }}><div style={{ fontSize: 13, color: salonMuted, marginBottom: 6 }}>Avg Earnings</div><div style={{ fontSize: 24, fontWeight: 800, color: "#fbbf24" }}>Rs. {avgEarnings.toLocaleString()}</div></div>
        <div style={{ background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 16, padding: "20px 24px" }}><div style={{ fontSize: 13, color: salonMuted, marginBottom: 6 }}>Top Earner</div><div style={{ fontSize: 18, fontWeight: 800, color: "#ec4899" }}>{top?.name || "-"}</div></div>
      </div>

      {error && <div style={{ marginBottom: 14, fontSize: 12, color: "#fda4af" }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 20 }}>
        {!stylistsHook.loading && stylistsWithLiveStats.length === 0 && (
          <div style={{ background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 16, padding: 40, color: salonMuted, textAlign: "center" }}>No stylists found.</div>
        )}
        {stylistsWithLiveStats.map((stylist) => (
          <div key={stylist.id} style={{ background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 16, padding: 24 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,#ec4899,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 20, marginBottom: 16 }}>
              {initials(stylist.name)}
            </div>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{stylist.name}</div>
            <div style={{ display: "inline-block", background: "rgba(236,72,153,.16)", color: "#f9a8d4", borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 700, marginBottom: 12 }}>{stylist.specialization}</div>
            <div style={{ marginBottom: 14 }}>
              <span style={{ display: "inline-block", background: `${salonStatusColor(stylist.status)}20`, color: salonStatusColor(stylist.status), borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 700 }}>{stylist.status}</span>
            </div>
            <div style={{ display: "grid", gap: 8, fontSize: 13, color: "rgba(255,255,255,.7)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Phone</span><span>{stylist.phone}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Appointments Today</span><span style={{ color: "#fff", fontWeight: 700 }}>{stylist.appointmentsToday}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Revenue</span><span style={{ color: "#34d399", fontWeight: 700 }}>Rs. {stylist.monthlyEarnings.toLocaleString()}</span></div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button style={{ flex: 1, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "#fff", borderRadius: 8, padding: "8px", fontSize: 13, cursor: "pointer" }}>View Schedule</button>
              <button style={{ flex: 1, background: stylist.status === "Active" ? "rgba(255,255,255,.06)" : "rgba(52,211,153,.16)", border: "1px solid rgba(255,255,255,.1)", color: "#fff", borderRadius: 8, padding: "8px", fontSize: 13, cursor: "pointer" }} onClick={() => toggleStatus(stylist.id, stylist.status)}>
                {stylist.status === "Active" ? "Set Leave" : "Activate"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={(event) => { if (event.target === event.currentTarget) setShowModal(false); }}>
          <div style={{ background: "#1a1a2e", border: `1px solid ${salonBorder}`, borderRadius: 16, padding: 32, width: "100%", maxWidth: 480 }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 24 }}>Add New Stylist</div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, color: salonMuted, marginBottom: 6 }}>Full Name</label>
              <input style={{ width: "100%", background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Stylist name" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, color: salonMuted, marginBottom: 6 }}>Specialization</label>
              <select style={{ width: "100%", background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14 }} value={form.specialization} onChange={(event) => setForm((current) => ({ ...current, specialization: event.target.value }))}>
                {stylistSpecialties.map((specialty) => <option key={specialty}>{specialty}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, color: salonMuted, marginBottom: 6 }}>Phone</label>
              <input style={{ width: "100%", background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="03XX-XXXXXXX" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, color: salonMuted, marginBottom: 6 }}>Status</label>
              <select style={{ width: "100%", background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14 }} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as "Active" | "On Leave" }))}>
                <option>Active</option>
                <option>On Leave</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button style={{ flex: 1, background: "#ec4899", color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontSize: 14, fontWeight: 700, cursor: "pointer" }} onClick={handleAdd}>Add Stylist</button>
              <button style={{ flex: 1, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "#fff", borderRadius: 8, padding: "10px", fontSize: 14, cursor: "pointer" }} onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
