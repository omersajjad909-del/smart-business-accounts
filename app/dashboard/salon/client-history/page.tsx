"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  mapSalonAppointments,
  salonBg,
  salonBorder,
  salonFont,
  salonMuted,
  salonStatusColor,
  salonStatusLabel,
} from "../_shared";

export default function SalonClientHistoryPage() {
  const appointments = mapSalonAppointments(useBusinessRecords("salon_appointment").records);
  const [search, setSearch] = useState("");

  const clients = useMemo(() => {
    const grouped = new Map<string, typeof appointments>();
    for (const appointment of appointments) {
      const key = `${appointment.client}::${appointment.phone}`;
      grouped.set(key, [...(grouped.get(key) || []), appointment]);
    }
    return [...grouped.entries()]
      .map(([key, visits]) => {
        const [client, phone] = key.split("::");
        const completedVisits = visits.filter((visit) => visit.status === "completed");
        const totalSpend = completedVisits.reduce((sum, visit) => sum + visit.price, 0);
        const lastVisit = [...visits].sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))[0];
        const favoriteService = Object.entries(
          visits.reduce<Record<string, number>>((acc, visit) => {
            acc[visit.service] = (acc[visit.service] || 0) + 1;
            return acc;
          }, {}),
        ).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
        return { client, phone, visits, totalSpend, lastVisit, favoriteService };
      })
      .filter((client) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return client.client.toLowerCase().includes(q) || client.phone.toLowerCase().includes(q);
      })
      .sort((a, b) => b.totalSpend - a.totalSpend);
  }, [appointments, search]);

  return (
    <div style={{ padding: "32px", fontFamily: salonFont, color: "#fff", minHeight: "100vh" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Client History</h1>
        <p style={{ fontSize: 14, color: salonMuted, marginTop: 6 }}>Repeat clients, favorite services, aur spend history ko yahan se samjhein.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        <div style={{ background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 16, padding: "20px 24px" }}><div style={{ fontSize: 13, color: salonMuted, marginBottom: 6 }}>Clients</div><div style={{ fontSize: 28, fontWeight: 800 }}>{clients.length}</div></div>
        <div style={{ background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 16, padding: "20px 24px" }}><div style={{ fontSize: 13, color: salonMuted, marginBottom: 6 }}>Repeat Clients</div><div style={{ fontSize: 28, fontWeight: 800, color: "#34d399" }}>{clients.filter((client) => client.visits.length > 1).length}</div></div>
        <div style={{ background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 16, padding: "20px 24px" }}><div style={{ fontSize: 13, color: salonMuted, marginBottom: 6 }}>High Value</div><div style={{ fontSize: 24, fontWeight: 800, color: "#fbbf24" }}>{clients.filter((client) => client.totalSpend >= 10000).length}</div></div>
        <div style={{ background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 16, padding: "20px 24px" }}><div style={{ fontSize: 13, color: salonMuted, marginBottom: 6 }}>Total Visits</div><div style={{ fontSize: 24, fontWeight: 800, color: "#a78bfa" }}>{appointments.length}</div></div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by client name or phone..."
          style={{ width: "100%", maxWidth: 420, boxSizing: "border-box", background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 12, padding: "12px 14px", color: "#fff", fontSize: 14 }}
        />
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        {clients.length === 0 ? (
          <div style={{ background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 16, padding: 40, color: salonMuted, textAlign: "center" }}>No client history found.</div>
        ) : clients.map((client) => (
          <div key={`${client.client}-${client.phone}`} style={{ background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 16, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 20, marginBottom: 14, alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{client.client}</div>
                <div style={{ fontSize: 13, color: salonMuted }}>{client.phone} • Favorite: {client.favoriteService}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#34d399" }}>Rs. {client.totalSpend.toLocaleString()}</div>
                <div style={{ fontSize: 12, color: salonMuted }}>{client.visits.length} total visits</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12, marginBottom: 14 }}>
              <div style={{ background: "rgba(255,255,255,.025)", borderRadius: 12, border: "1px solid rgba(255,255,255,.06)", padding: "12px 14px" }}>
                <div style={{ fontSize: 12, color: salonMuted }}>Last Visit</div>
                <div style={{ marginTop: 4, fontWeight: 700 }}>{client.lastVisit?.date || "-"} {client.lastVisit?.time || ""}</div>
              </div>
              <div style={{ background: "rgba(255,255,255,.025)", borderRadius: 12, border: "1px solid rgba(255,255,255,.06)", padding: "12px 14px" }}>
                <div style={{ fontSize: 12, color: salonMuted }}>Last Service</div>
                <div style={{ marginTop: 4, fontWeight: 700 }}>{client.lastVisit?.service || "-"}</div>
              </div>
              <div style={{ background: "rgba(255,255,255,.025)", borderRadius: 12, border: "1px solid rgba(255,255,255,.06)", padding: "12px 14px" }}>
                <div style={{ fontSize: 12, color: salonMuted }}>Last Status</div>
                <div style={{ marginTop: 4, fontWeight: 700, color: salonStatusColor(client.lastVisit?.status || "") }}>{salonStatusLabel(client.lastVisit?.status || "-")}</div>
              </div>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {client.visits.slice(0, 5).map((visit) => (
                <div key={visit.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.05)" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{visit.service}</div>
                    <div style={{ fontSize: 12, color: salonMuted }}>{visit.date} • {visit.time} • {visit.stylist}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#34d399" }}>Rs. {visit.price.toLocaleString()}</div>
                    <div style={{ fontSize: 12, color: salonStatusColor(visit.status) }}>{salonStatusLabel(visit.status)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
