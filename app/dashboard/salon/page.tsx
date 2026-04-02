"use client";

import Link from "next/link";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  salonBg,
  salonBorder,
  salonFont,
  salonMuted,
  mapSalonAppointments,
  mapSalonServices,
  mapSalonStylists,
} from "./_shared";

function StatCard({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div style={{ background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 18, padding: "20px 22px" }}>
      <div style={{ fontSize: 12, color: salonMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: tone }}>{value}</div>
    </div>
  );
}

export default function SalonOverviewPage() {
  const appointmentsHook = useBusinessRecords("salon_appointment");
  const stylistsHook = useBusinessRecords("stylist");
  const servicesHook = useBusinessRecords("salon_service");

  const appointments = mapSalonAppointments(appointmentsHook.records);
  const stylists = mapSalonStylists(stylistsHook.records);
  const services = mapSalonServices(servicesHook.records);

  const activeStylists = stylists.filter((stylist) => stylist.status === "Active").length;
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayAppointments = appointments.filter((appointment) => appointment.date === todayKey);
  const completedRevenue = appointments.filter((appointment) => appointment.status === "completed").reduce((sum, appointment) => sum + appointment.price, 0);
  const openAppointments = appointments.filter((appointment) => appointment.status === "booked" || appointment.status === "confirmed" || appointment.status === "in_progress").length;
  const activeServices = services.filter((service) => service.status === "Active").length;

  const topServices = [...services].sort((a, b) => Number(b.popular) - Number(a.popular) || b.price - a.price).slice(0, 4);

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", color: "#fff", fontFamily: salonFont }}>
      <div style={{ marginBottom: 26 }}>
        <div style={{ fontSize: 12, color: "#f472b6", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>Salon / Beauty</div>
        <h1 style={{ fontSize: 30, fontWeight: 900, margin: "0 0 10px" }}>Owner Beauty Desk</h1>
        <p style={{ margin: 0, fontSize: 14, color: salonMuted, maxWidth: 760 }}>
          Appointment se service delivery aur counter billing tak poora salon flow ek hi workspace me manage karein. Team capacity, service mix, aur daily revenue ek nazar me dekhein.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 14, marginBottom: 26 }}>
        <StatCard label="Appointments Today" value={todayAppointments.length} tone="#f472b6" />
        <StatCard label="Open Queue" value={openAppointments} tone="#60a5fa" />
        <StatCard label="Active Stylists" value={activeStylists} tone="#34d399" />
        <StatCard label="Active Services" value={activeServices} tone="#fbbf24" />
        <StatCard label="Completed Revenue" value={`Rs. ${completedRevenue.toLocaleString()}`} tone="#a78bfa" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.15fr .85fr", gap: 18, marginBottom: 18 }}>
        <div style={{ background: "linear-gradient(135deg, rgba(244,114,182,.14), rgba(129,140,248,.11))", border: `1px solid ${salonBorder}`, borderRadius: 20, padding: 24 }}>
          <div style={{ fontSize: 13, color: "#fbcfe8", fontWeight: 800, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".07em" }}>Business Flow</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12 }}>
            {[
              { title: "Book Slot", body: "Client, stylist, date, aur service ke saath appointment schedule." },
              { title: "Confirm Visit", body: "Stylist availability aur time-slot discipline maintain karein." },
              { title: "Deliver Service", body: "In-progress se complete tak treatment status track karein." },
              { title: "Review Earnings", body: "Revenue, service mix, aur stylist performance compare karein." },
            ].map((step, index) => (
              <div key={step.title} style={{ background: "rgba(8,12,30,.36)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: 999, background: "rgba(244,114,182,.2)", color: "#fbcfe8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, marginBottom: 12 }}>{index + 1}</div>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>{step.title}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.62)", lineHeight: 1.55 }}>{step.body}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 20, padding: 24 }}>
          <div style={{ fontSize: 13, color: "#fbbf24", fontWeight: 800, marginBottom: 12, textTransform: "uppercase", letterSpacing: ".07em" }}>Quick Actions</div>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              { href: "/dashboard/salon/appointments", label: "Open Appointment Desk", hint: "Bookings, confirmations, visit flow" },
              { href: "/dashboard/salon/stylists", label: "Manage Stylists", hint: "Capacity, specialization, team status" },
              { href: "/dashboard/salon/services", label: "Service Menu", hint: "Price, duration, service catalog" },
              { href: "/dashboard/sales-invoice", label: "Billing Counter", hint: "Issue invoice for products and services" },
              { href: "/dashboard/salon/analytics", label: "See Salon Analytics", hint: "Revenue, utilization, and service mix" },
            ].map((item) => (
              <Link key={item.href} href={item.href} style={{ textDecoration: "none", color: "#fff", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 12, color: salonMuted }}>{item.hint}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#34d399", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Top Service Cards</div>
          <div style={{ display: "grid", gap: 10 }}>
            {topServices.length === 0 ? (
              <div style={{ color: salonMuted, fontSize: 13 }}>Abhi service menu build nahi hua. Pehle services add karein phir yahan top cards aayenge.</div>
            ) : topServices.map((service) => (
              <div key={service.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "12px 14px" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{service.name}</div>
                  <div style={{ fontSize: 12, color: salonMuted }}>{service.category} • {service.duration} min</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#34d399" }}>Rs. {service.price.toLocaleString()}</div>
                  <div style={{ fontSize: 12, color: salonMuted }}>{service.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#60a5fa", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Operational Reading</div>
          <div style={{ display: "grid", gap: 12 }}>
            {[
              { label: "Confirmed queue", value: `${appointments.filter((appointment) => appointment.status === "confirmed").length} ready to start`, tone: "#60a5fa" },
              { label: "In progress now", value: `${appointments.filter((appointment) => appointment.status === "in_progress").length} clients on chair`, tone: "#f472b6" },
              { label: "Leave pressure", value: `${stylists.filter((stylist) => stylist.status === "On Leave").length} team members away`, tone: "#f59e0b" },
              { label: "Inactive services", value: `${services.filter((service) => service.status !== "Active").length} cards paused`, tone: "#94a3b8" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "14px 16px" }}>
                <span style={{ fontSize: 13, color: salonMuted }}>{row.label}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: row.tone }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
