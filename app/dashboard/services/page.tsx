"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ServicesControlCenter,
  fetchJson,
  serviceBg,
  serviceBorder,
  serviceFont,
  serviceMuted,
} from "./_shared";

const emptyState: ServicesControlCenter = {
  summary: {
    catalog: 0,
    activeProjects: 0,
    completedProjects: 0,
    deliveries: 0,
    overdueDeliveries: 0,
    reviewDeliveries: 0,
    timesheets: 0,
    draftTimesheets: 0,
    billableHours: 0,
    billableValue: 0,
    activeClients: 0,
  },
  catalog: [],
  projects: [],
  deliveries: [],
  timesheets: [],
};

export default function ServicesDashboard() {
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetchJson("/api/services/control-center", emptyState).then(setData);
  }, []);

  const { summary, deliveries } = data;
  const quickLinks = [
    { label: "Service Catalog", href: "/dashboard/services/catalog" },
    { label: "Client Projects", href: "/dashboard/services/projects" },
    { label: "Delivery Tracker", href: "/dashboard/services/delivery" },
    { label: "Time Billing", href: "/dashboard/services/time-billing" },
    { label: "Service Analytics", href: "/dashboard/services/analytics" },
    { label: "Sales Invoice", href: "/dashboard/sales-invoice" },
  ];

  return (
    <div style={{ padding: "28px 32px", fontFamily: serviceFont, color: "#e2e8f0" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "white", margin: 0 }}>Service Command Center</h1>
        <p style={{ color: serviceMuted, fontSize: 14, marginTop: 6 }}>
          Service catalog, client delivery, billable hours, aur project tracking aik workspace me.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Catalog Services", value: summary.catalog, color: "#34d399" },
          { label: "Active Projects", value: summary.activeProjects, color: "#38bdf8" },
          { label: "Open Deliveries", value: summary.deliveries - summary.completedProjects, color: "#f59e0b" },
          { label: "Billable Value", value: `Rs. ${summary.billableValue.toLocaleString()}`, color: "#f97316" },
        ].map((card) => (
          <div key={card.label} style={{ background: serviceBg, border: `1px solid ${serviceBorder}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 26 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.5)", marginBottom: 12, letterSpacing: ".06em" }}>QUICK ACTIONS</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {quickLinks.map((link) => (
            <Link prefetch={false} key={link.href} href={link.href} style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.2)", color: "#c7d2fe", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 16 }}>
        <div style={{ background: serviceBg, border: `1px solid ${serviceBorder}`, borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Live Delivery Board</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {deliveries.slice(0, 5).map((delivery) => (
              <div key={delivery.id} style={{ border: `1px solid ${serviceBorder}`, borderRadius: 12, padding: "12px 14px", background: "rgba(255,255,255,.02)" }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{delivery.milestone}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", marginTop: 4 }}>
                  {delivery.projectCode || "No project"} · {delivery.client || "No client"} · {delivery.status}
                </div>
              </div>
            ))}
            {!deliveries.length && <div style={{ color: "rgba(255,255,255,.35)" }}>No deliveries planned yet.</div>}
          </div>
        </div>

        <div style={{ background: serviceBg, border: `1px solid ${serviceBorder}`, borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Enterprise Summary</div>
          <div style={{ fontSize: 13, lineHeight: 1.8, color: "rgba(255,255,255,.55)" }}>
            Overdue Deliveries: <span style={{ color: summary.overdueDeliveries ? "#f87171" : "#22c55e" }}>{summary.overdueDeliveries}</span>
            <br />
            Waiting Review: <span style={{ color: summary.reviewDeliveries ? "#f59e0b" : "#22c55e" }}>{summary.reviewDeliveries}</span>
            <br />
            Draft Timesheets: <span style={{ color: summary.draftTimesheets ? "#f59e0b" : "#22c55e" }}>{summary.draftTimesheets}</span>
            <br />
            Active Projects: <span style={{ color: "#38bdf8" }}>{summary.activeProjects}</span>
            <br />
            Active Clients: <span style={{ color: "#34d399" }}>{summary.activeClients}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
