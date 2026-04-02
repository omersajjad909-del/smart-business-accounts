"use client";

import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  salonBg,
  salonBorder,
  salonFont,
  salonMuted,
  mapSalonAppointments,
  mapSalonServices,
  mapSalonStylists,
} from "../_shared";

function Metric({ title, value, note, color }: { title: string; value: string; note: string; color: string }) {
  return (
    <div style={{ background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 18, padding: "20px 22px" }}>
      <div style={{ fontSize: 12, color: salonMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 12, color: salonMuted, marginTop: 6 }}>{note}</div>
    </div>
  );
}

export default function SalonAnalyticsPage() {
  const appointments = mapSalonAppointments(useBusinessRecords("salon_appointment").records);
  const stylists = mapSalonStylists(useBusinessRecords("stylist").records);
  const services = mapSalonServices(useBusinessRecords("salon_service").records);

  const completed = appointments.filter((appointment) => appointment.status === "completed");
  const grossRevenue = completed.reduce((sum, appointment) => sum + appointment.price, 0);
  const completionRate = appointments.length ? Math.round((completed.length / appointments.length) * 100) : 0;
  const cancellationRate = appointments.length ? Math.round((appointments.filter((appointment) => appointment.status === "cancelled").length / appointments.length) * 100) : 0;
  const activeStylists = stylists.filter((stylist) => stylist.status === "Active").length;

  const serviceTotals = new Map<string, number>();
  for (const appointment of completed) {
    const key = appointment.service || "Unassigned";
    serviceTotals.set(key, (serviceTotals.get(key) || 0) + appointment.price);
  }
  const serviceMix = [...serviceTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const stylistTotals = new Map<string, { count: number; revenue: number }>();
  for (const appointment of appointments) {
    const key = appointment.stylist || "Unassigned";
    const current = stylistTotals.get(key) || { count: 0, revenue: 0 };
    stylistTotals.set(key, {
      count: current.count + 1,
      revenue: current.revenue + (appointment.status === "completed" ? appointment.price : 0),
    });
  }
  const stylistLoad = [...stylistTotals.entries()].sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5);

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", color: "#fff", fontFamily: salonFont }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: "#f472b6", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>Salon Analytics</div>
        <h1 style={{ fontSize: 30, fontWeight: 900, margin: "0 0 10px" }}>Revenue, stylist load, aur service mix</h1>
        <p style={{ margin: 0, fontSize: 14, color: salonMuted, maxWidth: 760 }}>
          Salon owner ko yahan se pata chalta hai ke kaunsi services sabse zyada revenue la rahi hain, kaunsa stylist most loaded hai, aur cancellations kitni pressure create kar rahi hain.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 14, marginBottom: 24 }}>
        <Metric title="Gross Revenue" value={`Rs. ${grossRevenue.toLocaleString()}`} note="Completed appointments" color="#34d399" />
        <Metric title="Completion Rate" value={`${completionRate}%`} note="Completed vs total bookings" color="#60a5fa" />
        <Metric title="Cancellation Rate" value={`${cancellationRate}%`} note="Cancelled bookings ratio" color="#f87171" />
        <Metric title="Active Stylists" value={String(activeStylists)} note={`${services.filter((service) => service.status === "Active").length} active services live`} color="#f59e0b" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#34d399", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Top Revenue Services</div>
          <div style={{ display: "grid", gap: 12 }}>
            {serviceMix.length === 0 ? (
              <div style={{ color: salonMuted, fontSize: 13 }}>Abhi completed service revenue data available nahi hai.</div>
            ) : serviceMix.map(([service, total]) => {
              const width = grossRevenue ? Math.max(10, Math.round((total / grossRevenue) * 100)) : 10;
              return (
                <div key={service}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{service}</span>
                    <span style={{ fontSize: 12, color: salonMuted }}>Rs. {total.toLocaleString()}</span>
                  </div>
                  <div style={{ height: 10, borderRadius: 999, background: "rgba(255,255,255,.05)", overflow: "hidden" }}>
                    <div style={{ width: `${width}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#ec4899,#8b5cf6)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#60a5fa", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Stylist Utilization</div>
          <div style={{ display: "grid", gap: 10 }}>
            {stylistLoad.length === 0 ? (
              <div style={{ color: salonMuted, fontSize: 13 }}>Stylist load show karne ke liye appointments add karein.</div>
            ) : stylistLoad.map(([stylist, summary]) => (
              <div key={stylist} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "12px 14px" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{stylist}</div>
                  <div style={{ fontSize: 12, color: salonMuted }}>{summary.count} total bookings</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#34d399" }}>Rs. {summary.revenue.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
