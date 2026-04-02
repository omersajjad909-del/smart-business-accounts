"use client";

import Link from "next/link";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { ispBg, ispBorder, ispFont, ispMuted, mapIspBills, mapIspConnections, mapIspPackages, mapIspTickets } from "./_shared";

export default function IspOverviewPage() {
  const packages = mapIspPackages(useBusinessRecords("isp_package").records);
  const connections = mapIspConnections(useBusinessRecords("isp_connection").records);
  const bills = mapIspBills(useBusinessRecords("isp_bill").records);
  const tickets = mapIspTickets(useBusinessRecords("isp_ticket").records);

  const activeConnections = connections.filter((item) => item.status === "active").length;
  const suspendedConnections = connections.filter((item) => item.status === "suspended").length;
  const openTickets = tickets.filter((item) => item.status === "open" || item.status === "assigned").length;
  const collected = bills.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amount, 0);

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", color: "#fff", fontFamily: ispFont }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 12, color: "#60a5fa", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>ISP / Cable Network</div>
          <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 900 }}>Connections, billing, and service reliability command center</h1>
          <p style={{ margin: 0, fontSize: 14, color: ispMuted, maxWidth: 760 }}>
            Packages, customer connections, monthly bills, aur support tickets ko ek utility-service workflow me monitor karein.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { href: "/dashboard/isp/packages", label: "Packages" },
            { href: "/dashboard/isp/connections", label: "Connections" },
            { href: "/dashboard/isp/billing", label: "Monthly Bills" },
            { href: "/dashboard/isp/support", label: "Support Tickets" },
          ].map((item) => (
            <Link key={item.href} href={item.href} style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${ispBorder}`, background: ispBg, color: "#93c5fd", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Packages", value: packages.length, color: "#60a5fa" },
          { label: "Active Connections", value: activeConnections, color: "#34d399" },
          { label: "Suspended", value: suspendedConnections, color: "#f97316" },
          { label: "Open Tickets", value: openTickets, color: "#c084fc" },
          { label: "Collected", value: `Rs. ${collected.toLocaleString()}`, color: "#22c55e" },
        ].map((card) => (
          <div key={card.label} style={{ background: ispBg, border: `1px solid ${ispBorder}`, borderRadius: 16, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: ispMuted, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "linear-gradient(135deg, rgba(59,130,246,.14), rgba(14,165,233,.08))", border: `1px solid ${ispBorder}`, borderRadius: 20, padding: 24 }}>
        <div style={{ fontSize: 13, color: "#bfdbfe", fontWeight: 800, marginBottom: 12, textTransform: "uppercase", letterSpacing: ".07em" }}>Service Flow</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12 }}>
          {[
            { title: "Package Setup", body: "Bandwidth plans, quotas, aur monthly rates define karein." },
            { title: "Connection Desk", body: "Customer address aur assigned package ke saath live connection onboard karein." },
            { title: "Monthly Billing", body: "Cycle-wise bills generate karein aur overdue recovery monitor karein." },
            { title: "Support Response", body: "Technical complaints aur outage tickets ko SLA-style handle karein." },
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
