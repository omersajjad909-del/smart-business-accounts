"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AutomotiveControlCenter, autoBg, autoBorder, autoFont, autoMuted, fetchJson } from "./_shared";

const emptyState: AutomotiveControlCenter = {
  summary: {
    vehicles: 0,
    availableVehicles: 0,
    reservedVehicles: 0,
    soldVehicles: 0,
    inventoryValue: 0,
    soldValue: 0,
    openDeals: 0,
    wonDeals: 0,
    lostDeals: 0,
    completedDrives: 0,
    scheduledDrives: 0,
    conversionRate: 0,
  },
  vehicles: [],
  testDrives: [],
  deals: [],
};

export default function AutomotiveOverviewPage() {
  const [data, setData] = useState<AutomotiveControlCenter>(emptyState);

  useEffect(() => {
    fetchJson("/api/automotive/control-center", emptyState).then(setData);
  }, []);

  const pipelineMix = useMemo(
    () => [
      { label: "Available", value: data.summary.availableVehicles, tone: "#34d399" },
      { label: "Reserved", value: data.summary.reservedVehicles, tone: "#f59e0b" },
      { label: "Scheduled Drives", value: data.summary.scheduledDrives, tone: "#60a5fa" },
      { label: "Won Deals", value: data.summary.wonDeals, tone: "#c084fc" },
    ],
    [data.summary]
  );

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", color: "#fff", fontFamily: autoFont }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 12, color: "#60a5fa", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>Car Showroom</div>
          <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 900 }}>Vehicle inventory, test drives, and deals command center</h1>
          <p style={{ margin: 0, fontSize: 14, color: autoMuted, maxWidth: 760 }}>
            Showroom stock, customer drive pipeline, and financing-assisted deal closure are now running through one dedicated automotive control center.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { href: "/dashboard/automotive/vehicles", label: "Vehicle Stock" },
            { href: "/dashboard/automotive/test-drives", label: "Test Drives" },
            { href: "/dashboard/automotive/deals", label: "Deals & Finance" },
            { href: "/dashboard/automotive/analytics", label: "Analytics" },
          ].map((item) => (
            <Link prefetch={false} key={item.href} href={item.href} style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${autoBorder}`, background: autoBg, color: "#93c5fd", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Vehicles", value: data.summary.vehicles, color: "#60a5fa" },
          { label: "Inventory Value", value: `$${data.summary.inventoryValue.toLocaleString()}`, color: "#34d399" },
          { label: "Open Deals", value: data.summary.openDeals, color: "#c084fc" },
          { label: "Completed Drives", value: data.summary.completedDrives, color: "#f59e0b" },
        ].map((card) => (
          <div key={card.label} style={{ background: autoBg, border: `1px solid ${autoBorder}`, borderRadius: 16, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: autoMuted, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "linear-gradient(135deg, rgba(59,130,246,.14), rgba(14,165,233,.08))", border: `1px solid ${autoBorder}`, borderRadius: 20, padding: 24 }}>
        <div style={{ fontSize: 13, color: "#bfdbfe", fontWeight: 800, marginBottom: 12, textTransform: "uppercase", letterSpacing: ".07em" }}>Showroom Flow</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12 }}>
          {[
            { title: "Vehicle Stock", body: `${data.summary.availableVehicles} units are open for sale with VIN and pricing control.` },
            { title: "Test Drives", body: `${data.summary.scheduledDrives} customer drives are currently scheduled.` },
            { title: "Deals & Finance", body: `${data.summary.openDeals} deals are active across lead, negotiation, and financed stages.` },
            { title: "Analytics", body: `${data.summary.conversionRate}% close rate from the current deal pipeline.` },
          ].map((step, index) => (
            <div key={step.title} style={{ background: "rgba(8,12,30,.36)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: 16 }}>
              <div style={{ width: 28, height: 28, borderRadius: 999, background: "rgba(147,197,253,.16)", color: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, marginBottom: 12 }}>{index + 1}</div>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>{step.title}</div>
              <div style={{ fontSize: 13, lineHeight: 1.55, color: "rgba(255,255,255,.62)" }}>{step.body}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ background: autoBg, border: `1px solid ${autoBorder}`, borderRadius: 18, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Pipeline Mix</div>
          <div style={{ display: "grid", gap: 10 }}>
            {pipelineMix.map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", borderRadius: 12, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.03)", padding: "10px 12px" }}>
                <span style={{ fontSize: 13, color: autoMuted }}>{row.label}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: row.tone }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: autoBg, border: `1px solid ${autoBorder}`, borderRadius: 18, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Recent Wins</div>
          <div style={{ display: "grid", gap: 10 }}>
            {data.deals.filter((row) => row.status === "won").slice(0, 5).map((row) => (
              <div key={row.id} style={{ display: "flex", justifyContent: "space-between", borderRadius: 12, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.03)", padding: "10px 12px" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{row.customer}</div>
                  <div style={{ fontSize: 12, color: autoMuted }}>{row.vehicleLabel || "Vehicle not linked"}</div>
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#34d399" }}>${row.amount.toLocaleString()}</span>
              </div>
            ))}
            {!data.deals.some((row) => row.status === "won") ? <div style={{ color: autoMuted, fontSize: 13 }}>No closed deals yet.</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
