"use client";

import { useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  mapSalonAppointments,
  mapSalonServices,
  mapSalonStylists,
  salonBg,
  salonBorder,
  salonFont,
  salonMuted,
  salonStatusColor,
  salonStatusLabel,
  todayIso,
} from "../_shared";

const EMPTY_FORM = {
  client: "",
  phone: "",
  stylist: "",
  service: "",
  duration: 60,
  price: 0,
  date: todayIso(),
  time: "09:00",
};

export default function SalonAppointmentsPage() {
  const appointmentsHook = useBusinessRecords("salon_appointment");
  const stylistsHook = useBusinessRecords("stylist");
  const servicesHook = useBusinessRecords("salon_service");

  const appointments = mapSalonAppointments(appointmentsHook.records);
  const stylists = mapSalonStylists(stylistsHook.records);
  const services = mapSalonServices(servicesHook.records);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterStylist, setFilterStylist] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [error, setError] = useState("");

  const activeStylists = stylists.filter((stylist) => stylist.status === "Active");
  const activeServices = services.filter((service) => service.status === "Active");

  const filtered = appointments
    .filter((appointment) => (filterStylist === "all" ? true : appointment.stylist === filterStylist))
    .filter((appointment) => (filterStatus === "all" ? true : appointment.status === filterStatus))
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  const grouped = new Map<string, typeof filtered>();
  for (const appointment of filtered) {
    const key = appointment.stylist || "Unassigned";
    grouped.set(key, [...(grouped.get(key) || []), appointment]);
  }
  const groupedByStylist = [...grouped.entries()];

  const todayTotal = appointments.filter((appointment) => appointment.date === todayIso()).length;
  const activeQueue = appointments.filter((appointment) => appointment.status === "confirmed" || appointment.status === "in_progress").length;
  const inProgress = appointments.filter((appointment) => appointment.status === "in_progress").length;
  const revenue = appointments.filter((appointment) => appointment.status === "completed").reduce((sum, appointment) => sum + appointment.price, 0);

  function syncFromService(serviceName: string) {
    const service = activeServices.find((record) => record.name === serviceName);
    if (!service) return;
    setForm((current) => ({
      ...current,
      service: service.name,
      duration: service.duration || current.duration,
      price: service.price || current.price,
    }));
  }

  async function save() {
    setError("");
    if (!form.client.trim()) return setError("Client name required hai.");
    if (!form.phone.trim()) return setError("Phone required hai.");
    if (!form.stylist) return setError("Stylist select karein.");
    if (!form.service) return setError("Service select karein.");
    if (!form.date || !form.time) return setError("Date aur time required hain.");
    if (form.duration <= 0) return setError("Duration positive honi chahiye.");
    if (form.price <= 0) return setError("Price zero se zyada honi chahiye.");

    const clash = appointments.some((appointment) =>
      appointment.stylist === form.stylist &&
      appointment.date === form.date &&
      appointment.time === form.time &&
      appointment.status !== "cancelled",
    );
    if (clash) return setError("Is stylist ka ye slot already booked hai.");

    await appointmentsHook.create({
      title: form.client.trim(),
      status: "booked",
      date: form.date,
      amount: form.price,
      data: {
        apptNo: `SA-${String(appointments.length + 1).padStart(3, "0")}`,
        phone: form.phone.trim(),
        stylist: form.stylist,
        service: form.service,
        duration: form.duration,
        time: form.time,
      },
    });

    setShowModal(false);
    setForm(EMPTY_FORM);
  }

  async function moveStatus(id: string, currentStatus: string, nextStatus: string) {
    const allowedTransitions: Record<string, string[]> = {
      booked: ["confirmed", "cancelled"],
      confirmed: ["in_progress", "cancelled"],
      in_progress: ["completed"],
      completed: [],
      cancelled: [],
    };
    if (!allowedTransitions[currentStatus]?.includes(nextStatus)) return;
    await appointmentsHook.update(id, { status: nextStatus });
  }

  return (
    <div style={{ minHeight: "100vh", color: "#fff", fontFamily: salonFont, padding: "28px 32px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>Salon Appointments</h1>
          <p style={{ margin: "6px 0 0", color: salonMuted, fontSize: 14 }}>Front desk booking, stylist capacity, aur visit lifecycle control.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ background: "#ec4899", color: "#fff", border: "none", borderRadius: 10, padding: "11px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: salonFont }}>+ Book Appointment</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Today Total", value: todayTotal, color: "#ec4899" },
          { label: "Confirmed / Active", value: activeQueue, color: "#60a5fa" },
          { label: "In Progress", value: inProgress, color: "#a78bfa" },
          { label: "Revenue", value: `Rs. ${revenue.toLocaleString()}`, color: "#34d399" },
        ].map((stat) => (
          <div key={stat.label} style={{ background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 16, padding: "20px 22px" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: stat.color }}>{stat.value}</div>
            <div style={{ marginTop: 6, fontSize: 12, color: salonMuted, textTransform: "uppercase", letterSpacing: ".06em" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 22 }}>
        {["all", ...activeStylists.map((stylist) => stylist.name)].map((stylist) => (
          <button
            key={stylist}
            onClick={() => setFilterStylist(stylist)}
            style={{
              padding: "7px 14px",
              borderRadius: 999,
              border: `1px solid ${filterStylist === stylist ? "#ec4899" : salonBorder}`,
              background: filterStylist === stylist ? "rgba(236,72,153,.16)" : salonBg,
              color: filterStylist === stylist ? "#f9a8d4" : salonMuted,
              fontFamily: salonFont,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {stylist === "all" ? "All Stylists" : stylist}
          </button>
        ))}
        {["all", "booked", "confirmed", "in_progress", "completed", "cancelled"].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            style={{
              padding: "7px 14px",
              borderRadius: 999,
              border: `1px solid ${filterStatus === status ? salonStatusColor(status) : salonBorder}`,
              background: filterStatus === status ? `${salonStatusColor(status)}18` : salonBg,
              color: filterStatus === status ? salonStatusColor(status) : salonMuted,
              fontFamily: salonFont,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {status === "all" ? "All Statuses" : salonStatusLabel(status)}
          </button>
        ))}
      </div>

      {appointmentsHook.loading ? (
        <div style={{ textAlign: "center", padding: 40, color: salonMuted }}>Loading appointments...</div>
      ) : groupedByStylist.length === 0 ? (
        <div style={{ background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 18, padding: 40, textAlign: "center", color: salonMuted }}>
          No appointments found. Front desk se first slot book karein.
        </div>
      ) : (
        groupedByStylist.map(([stylist, list]) => (
          <div key={stylist} style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 999, background: "rgba(236,72,153,.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>S</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>{stylist}</div>
                <div style={{ fontSize: 12, color: salonMuted }}>{list.length} booking{list.length !== 1 ? "s" : ""}</div>
              </div>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {list.map((appointment) => (
                <div key={appointment.id} style={{ background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 16, padding: "14px 18px", display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ minWidth: 70, textAlign: "center" }}>
                    <div style={{ fontSize: 17, fontWeight: 800 }}>{appointment.time}</div>
                    <div style={{ fontSize: 11, color: salonMuted }}>{appointment.duration} min</div>
                  </div>
                  <div style={{ width: 3, height: 48, background: salonStatusColor(appointment.status), borderRadius: 999 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 800 }}>{appointment.client}</span>
                      <span style={{ fontSize: 12, color: salonMuted }}>{appointment.phone}</span>
                      <span style={{ background: `${salonStatusColor(appointment.status)}22`, color: salonStatusColor(appointment.status), padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                        {salonStatusLabel(appointment.status)}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,.7)" }}>{appointment.service} • {appointment.date}</div>
                  </div>
                  <div style={{ minWidth: 92, textAlign: "right" }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#34d399" }}>Rs. {appointment.price.toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: salonMuted }}>{appointment.apptNo}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {appointment.status === "booked" && (
                      <button onClick={() => moveStatus(appointment.id, appointment.status, "confirmed")} style={{ padding: "6px 10px", background: "rgba(96,165,250,.16)", border: "1px solid rgba(96,165,250,.28)", color: "#60a5fa", borderRadius: 8, cursor: "pointer", fontFamily: salonFont, fontSize: 11, fontWeight: 700 }}>Confirm</button>
                    )}
                    {appointment.status === "confirmed" && (
                      <button onClick={() => moveStatus(appointment.id, appointment.status, "in_progress")} style={{ padding: "6px 10px", background: "rgba(167,139,250,.16)", border: "1px solid rgba(167,139,250,.28)", color: "#a78bfa", borderRadius: 8, cursor: "pointer", fontFamily: salonFont, fontSize: 11, fontWeight: 700 }}>Start</button>
                    )}
                    {appointment.status === "in_progress" && (
                      <button onClick={() => moveStatus(appointment.id, appointment.status, "completed")} style={{ padding: "6px 10px", background: "rgba(52,211,153,.16)", border: "1px solid rgba(52,211,153,.28)", color: "#34d399", borderRadius: 8, cursor: "pointer", fontFamily: salonFont, fontSize: 11, fontWeight: 700 }}>Complete</button>
                    )}
                    {(appointment.status === "booked" || appointment.status === "confirmed") && (
                      <button onClick={() => moveStatus(appointment.id, appointment.status, "cancelled")} style={{ padding: "6px 10px", background: "rgba(248,113,113,.12)", border: "1px solid rgba(248,113,113,.24)", color: "#f87171", borderRadius: 8, cursor: "pointer", fontFamily: salonFont, fontSize: 11, fontWeight: 700 }}>Cancel</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={(event) => { if (event.target === event.currentTarget) setShowModal(false); }}>
          <div style={{ background: "#161b27", border: `1px solid ${salonBorder}`, borderRadius: 18, padding: 28, width: 520, fontFamily: salonFont }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Book Appointment</h2>
                <div style={{ marginTop: 4, fontSize: 12, color: salonMuted }}>Client slot aur stylist allocation yahan se manage karein.</div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: salonMuted, fontSize: 20, cursor: "pointer" }}>×</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                ["Client Name", "client", "text"],
                ["Phone", "phone", "text"],
                ["Date", "date", "date"],
                ["Time", "time", "time"],
              ].map(([label, key, type]) => (
                <div key={key}>
                  <label style={{ display: "block", fontSize: 12, color: salonMuted, marginBottom: 6 }}>{label}</label>
                  <input
                    type={type}
                    value={String(form[key as keyof typeof form])}
                    onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                    style={{ width: "100%", background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 10, padding: "10px 12px", color: "#fff", fontFamily: salonFont, fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: 12, color: salonMuted, marginBottom: 6 }}>Stylist</label>
                <select value={form.stylist} onChange={(event) => setForm((current) => ({ ...current, stylist: event.target.value }))} style={{ width: "100%", background: "#161b27", border: `1px solid ${salonBorder}`, borderRadius: 10, padding: "10px 12px", color: "#fff", fontFamily: salonFont, fontSize: 14 }}>
                  <option value="">Select stylist</option>
                  {activeStylists.map((stylist) => <option key={stylist.id} value={stylist.name}>{stylist.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: salonMuted, marginBottom: 6 }}>Service</label>
                <select value={form.service} onChange={(event) => syncFromService(event.target.value)} style={{ width: "100%", background: "#161b27", border: `1px solid ${salonBorder}`, borderRadius: 10, padding: "10px 12px", color: "#fff", fontFamily: salonFont, fontSize: 14 }}>
                  <option value="">Select service</option>
                  {activeServices.map((service) => <option key={service.id} value={service.name}>{service.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: salonMuted, marginBottom: 6 }}>Duration (min)</label>
                <input type="number" value={form.duration} onChange={(event) => setForm((current) => ({ ...current, duration: Number(event.target.value) }))} style={{ width: "100%", background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 10, padding: "10px 12px", color: "#fff", fontFamily: salonFont, fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: salonMuted, marginBottom: 6 }}>Price (Rs.)</label>
                <input type="number" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: Number(event.target.value) }))} style={{ width: "100%", background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 10, padding: "10px 12px", color: "#fff", fontFamily: salonFont, fontSize: 14, boxSizing: "border-box" }} />
              </div>
            </div>

            {error && <div style={{ marginTop: 14, fontSize: 12, color: "#fda4af" }}>{error}</div>}

            <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#ec4899", border: "none", borderRadius: 10, color: "#fff", fontFamily: salonFont, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Book Appointment</button>
              <button onClick={() => setShowModal(false)} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${salonBorder}`, borderRadius: 10, color: salonMuted, fontFamily: salonFont, fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
