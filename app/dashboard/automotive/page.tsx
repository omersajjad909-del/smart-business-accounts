"use client";

import Link from "next/link";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { autoBg, autoBorder, autoFont, autoMuted, mapShowroomDeals, mapShowroomTestDrives, mapShowroomVehicles } from "./_shared";

export default function AutomotiveOverviewPage() {
  const vehicles = mapShowroomVehicles(useBusinessRecords("auto_vehicle").records);
  const testDrives = mapShowroomTestDrives(useBusinessRecords("showroom_test_drive").records);
  const deals = mapShowroomDeals(useBusinessRecords("showroom_deal").records);

  const inventoryValue = vehicles.filter((item) => item.status !== "Sold").reduce((sum, item) => sum + item.price, 0);
  const openDeals = deals.filter((item) => item.status === "lead" || item.status === "negotiation" || item.status === "financed").length;
  const completedDrives = testDrives.filter((item) => item.status === "completed").length;

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", color: "#fff", fontFamily: autoFont }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 12, color: "#60a5fa", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>Car Showroom</div>
          <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 900 }}>Vehicle inventory, test drives, and deals command center</h1>
          <p style={{ margin: 0, fontSize: 14, color: autoMuted, maxWidth: 760 }}>
            Showroom stock, customer drive pipeline, aur financing-assisted deal closure ko ek clean automotive sales flow me monitor karein.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { href: "/dashboard/automotive/vehicles", label: "Vehicle Stock" },
            { href: "/dashboard/automotive/test-drives", label: "Test Drives" },
            { href: "/dashboard/automotive/deals", label: "Deals & Finance" },
            { href: "/dashboard/automotive/analytics", label: "Analytics" },
          ].map((item) => (
            <Link key={item.href} href={item.href} style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${autoBorder}`, background: autoBg, color: "#93c5fd", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Vehicles", value: vehicles.length, color: "#60a5fa" },
          { label: "Inventory Value", value: `$${inventoryValue.toLocaleString()}`, color: "#34d399" },
          { label: "Open Deals", value: openDeals, color: "#c084fc" },
          { label: "Completed Drives", value: completedDrives, color: "#f59e0b" },
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
            { title: "Vehicle Stock", body: "New, used, aur in-transit stock ko VIN aur pricing ke saath control karein." },
            { title: "Test Drives", body: "Interested customers ko shortlisted vehicles ke against schedule karein." },
            { title: "Deals & Finance", body: "Negotiation, booking, financier involvement, aur closure stage-wise manage karein." },
            { title: "Analytics", body: "Inventory mix, pipeline health, aur sales conversion ko showroom lens se monitor karein." },
          ].map((step, index) => (
            <div key={step.title} style={{ background: "rgba(8,12,30,.36)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: 16 }}>
              <div style={{ width: 28, height: 28, borderRadius: 999, background: "rgba(147,197,253,.16)", color: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, marginBottom: 12 }}>{index + 1}</div>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>{step.title}</div>
              <div style={{ fontSize: 13, lineHeight: 1.55, color: "rgba(255,255,255,.62)" }}>{step.body}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
