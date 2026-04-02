"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  mapSalonAppointments,
  mapSalonServices,
  salonBg,
  salonBorder,
  salonFont,
  salonMuted,
  salonServiceCategories,
  salonStatusColor,
} from "../_shared";

const CATEGORY_TABS = ["All", ...salonServiceCategories];

export default function ServicesPage() {
  const servicesHook = useBusinessRecords("salon_service");
  const appointments = mapSalonAppointments(useBusinessRecords("salon_appointment").records);
  const services = mapSalonServices(servicesHook.records);

  const [tab, setTab] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", category: "Hair", duration: "", price: "", status: "Active" });

  const filtered = tab === "All" ? services : services.filter((service) => service.category === tab);
  const active = services.filter((service) => service.status === "Active").length;
  const avgPrice = services.length > 0 ? Math.round(services.reduce((sum, service) => sum + service.price, 0) / services.length) : 0;

  const popular = useMemo(() => {
    const totals = new Map<string, number>();
    for (const appointment of appointments.filter((record) => record.status === "completed")) {
      totals.set(appointment.service, (totals.get(appointment.service) || 0) + 1);
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
  }, [appointments]);

  const handleAdd = async () => {
    setError("");
    if (!form.name.trim()) return setError("Service name required hai.");
    if (!form.duration || Number(form.duration) <= 0) return setError("Duration positive honi chahiye.");
    if (!form.price || Number(form.price) <= 0) return setError("Price positive honi chahiye.");
    if (services.some((service) => service.name.toLowerCase() === form.name.trim().toLowerCase())) {
      return setError("Ye service pehle se menu me hai.");
    }

    await servicesHook.create({
      title: form.name.trim(),
      status: form.status,
      amount: Number(form.price),
      data: {
        serviceId: `SVC-${String(services.length + 1).padStart(3, "0")}`,
        category: form.category,
        duration: Number(form.duration),
        price: Number(form.price),
        popular: false,
      },
    });
    setShowModal(false);
    setForm({ name: "", category: "Hair", duration: "", price: "", status: "Active" });
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    if (currentStatus === "Active") {
      const service = services.find((record) => record.id === id);
      const hasOpenAppointments = appointments.some((appointment) =>
        appointment.service === service?.name &&
        (appointment.status === "booked" || appointment.status === "confirmed" || appointment.status === "in_progress"),
      );
      if (hasOpenAppointments) {
        setError("Is service ke active appointments hain. Pehle unhein close karein.");
        return;
      }
    }
    await servicesHook.update(id, { status: currentStatus === "Active" ? "Inactive" : "Active" });
  };

  return (
    <div style={{ padding: "32px", fontFamily: salonFont, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Service Menu</h1>
          <p style={{ fontSize: 14, color: salonMuted, marginTop: 6 }}>Salon cards, duration, pricing, aur live menu status yahan se manage hota hai.</p>
        </div>
        <button style={{ background: "#ec4899", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: 14 }} onClick={() => setShowModal(true)}>+ Add Service</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
        <div style={{ background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 16, padding: "20px 24px" }}><div style={{ fontSize: 13, color: salonMuted, marginBottom: 6 }}>Total Services</div><div style={{ fontSize: 28, fontWeight: 800 }}>{services.length}</div></div>
        <div style={{ background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 16, padding: "20px 24px" }}><div style={{ fontSize: 13, color: salonMuted, marginBottom: 6 }}>Active Services</div><div style={{ fontSize: 28, fontWeight: 800, color: "#34d399" }}>{active}</div></div>
        <div style={{ background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 16, padding: "20px 24px" }}><div style={{ fontSize: 13, color: salonMuted, marginBottom: 6 }}>Most Popular</div><div style={{ fontSize: 18, fontWeight: 800, color: "#ec4899" }}>{popular}</div></div>
        <div style={{ background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 16, padding: "20px 24px" }}><div style={{ fontSize: 13, color: salonMuted, marginBottom: 6 }}>Avg Price</div><div style={{ fontSize: 24, fontWeight: 800, color: "#fbbf24" }}>Rs. {avgPrice.toLocaleString()}</div></div>
      </div>

      {error && <div style={{ marginBottom: 14, fontSize: 12, color: "#fda4af" }}>{error}</div>}

      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {CATEGORY_TABS.map((category) => (
          <button key={category} style={{ background: tab === category ? "#ec4899" : "rgba(255,255,255,.06)", color: tab === category ? "#fff" : salonMuted, border: "none", borderRadius: 999, padding: "8px 16px", cursor: "pointer", fontWeight: 700, fontSize: 13 }} onClick={() => setTab(category)}>
            {category}
          </button>
        ))}
      </div>

      <div style={{ background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 16, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Service Name", "Category", "Duration", "Price", "Status", "Actions"].map((heading) => (
                <th key={heading} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: salonMuted, borderBottom: "1px solid rgba(255,255,255,.07)", fontWeight: 700 }}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: salonMuted, fontSize: 14 }}>No services found.</td></tr>
            ) : filtered.map((service) => (
              <tr key={service.id}>
                <td style={{ padding: "14px 16px", fontSize: 14, borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <div style={{ fontWeight: 700 }}>{service.name}</div>
                  {service.name === popular && <span style={{ fontSize: 11, color: "#fbbf24" }}>Most booked</span>}
                </td>
                <td style={{ padding: "14px 16px", fontSize: 14, borderBottom: "1px solid rgba(255,255,255,.04)" }}>{service.category}</td>
                <td style={{ padding: "14px 16px", fontSize: 14, borderBottom: "1px solid rgba(255,255,255,.04)" }}>{service.duration} min</td>
                <td style={{ padding: "14px 16px", fontSize: 14, borderBottom: "1px solid rgba(255,255,255,.04)" }}>Rs. {service.price.toLocaleString()}</td>
                <td style={{ padding: "14px 16px", fontSize: 14, borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <span style={{ display: "inline-block", background: `${salonStatusColor(service.status)}20`, color: salonStatusColor(service.status), borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{service.status}</span>
                </td>
                <td style={{ padding: "14px 16px", fontSize: 14, borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <button style={{ padding: "6px 12px", fontSize: 12, borderRadius: 8, border: "1px solid rgba(255,255,255,.1)", background: service.status === "Active" ? "rgba(255,255,255,.06)" : "rgba(52,211,153,.16)", color: "#fff", cursor: "pointer" }} onClick={() => toggleStatus(service.id, service.status)}>
                    {service.status === "Active" ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={(event) => { if (event.target === event.currentTarget) setShowModal(false); }}>
          <div style={{ background: "#1a1a2e", border: `1px solid ${salonBorder}`, borderRadius: 16, padding: 32, width: "100%", maxWidth: 480 }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 24 }}>Add New Service</div>
            <div style={{ marginBottom: 16 }}><label style={{ display: "block", fontSize: 13, color: salonMuted, marginBottom: 6 }}>Service Name</label><input style={{ width: "100%", background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Hair Cut & Blow Dry" /></div>
            <div style={{ marginBottom: 16 }}><label style={{ display: "block", fontSize: 13, color: salonMuted, marginBottom: 6 }}>Category</label><select style={{ width: "100%", background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14 }} value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>{salonServiceCategories.map((category) => <option key={category}>{category}</option>)}</select></div>
            <div style={{ marginBottom: 16 }}><label style={{ display: "block", fontSize: 13, color: salonMuted, marginBottom: 6 }}>Duration (minutes)</label><input type="number" style={{ width: "100%", background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} value={form.duration} onChange={(event) => setForm((current) => ({ ...current, duration: event.target.value }))} placeholder="45" /></div>
            <div style={{ marginBottom: 16 }}><label style={{ display: "block", fontSize: 13, color: salonMuted, marginBottom: 6 }}>Price (Rs.)</label><input type="number" style={{ width: "100%", background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} placeholder="1500" /></div>
            <div style={{ marginBottom: 16 }}><label style={{ display: "block", fontSize: 13, color: salonMuted, marginBottom: 6 }}>Status</label><select style={{ width: "100%", background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14 }} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}><option>Active</option><option>Inactive</option></select></div>
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button style={{ flex: 1, background: "#ec4899", color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontSize: 14, fontWeight: 700, cursor: "pointer" }} onClick={handleAdd}>Save Service</button>
              <button style={{ flex: 1, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "#fff", borderRadius: 8, padding: "10px", fontSize: 14, cursor: "pointer" }} onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
