"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  mapServiceCatalogRecord,
  mapServiceDeliveryRecord,
  mapServiceProjectRecord,
  mapServiceTimesheetRecord,
} from "./_shared";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";
const TODAY_KEY = new Date().toISOString().slice(0, 10);

export default function ServicesDashboard() {
  const catalogStore = useBusinessRecords("service_catalog");
  const projectStore = useBusinessRecords("service_project");
  const deliveryStore = useBusinessRecords("service_delivery");
  const timesheetStore = useBusinessRecords("service_timesheet");

  const catalog = useMemo(() => catalogStore.records.map(mapServiceCatalogRecord), [catalogStore.records]);
  const projects = useMemo(() => projectStore.records.map(mapServiceProjectRecord), [projectStore.records]);
  const deliveries = useMemo(() => deliveryStore.records.map(mapServiceDeliveryRecord), [deliveryStore.records]);
  const timesheets = useMemo(() => timesheetStore.records.map(mapServiceTimesheetRecord), [timesheetStore.records]);

  const billableValue = timesheets.reduce((sum, item) => sum + item.billableHours * item.billingRate, 0);
  const overdueDeliveries = deliveries.filter((item) => item.status !== "completed" && item.dueDate && item.dueDate < TODAY_KEY).length;
  const reviewDeliveries = deliveries.filter((item) => item.status === "in_review").length;
  const draftTimesheets = timesheets.filter((item) => item.status === "draft").length;

  const quickLinks = [
    { label: "Service Catalog", href: "/dashboard/services/catalog" },
    { label: "Client Projects", href: "/dashboard/services/projects" },
    { label: "Delivery Tracker", href: "/dashboard/services/delivery" },
    { label: "Time Billing", href: "/dashboard/services/time-billing" },
    { label: "Quotation", href: "/dashboard/quotation" },
    { label: "Sales Invoice", href: "/dashboard/sales-invoice" },
  ];

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#e2e8f0" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "white", margin: 0 }}>Service Command Center</h1>
        <p style={{ color: "rgba(255,255,255,.45)", fontSize: 14, marginTop: 6 }}>
          Service catalog, client delivery, billable hours, aur project tracking aik workspace me.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Catalog Services", value: catalog.length, color: "#34d399" },
          { label: "Active Projects", value: projects.filter((item) => item.status !== "completed").length, color: "#38bdf8" },
          { label: "Open Deliveries", value: deliveries.filter((item) => item.status !== "completed").length, color: "#f59e0b" },
          { label: "Billable Value", value: `Rs. ${billableValue.toLocaleString()}`, color: "#f97316" },
        ].map((card) => (
          <div key={card.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 26 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.5)", marginBottom: 12, letterSpacing: ".06em" }}>QUICK ACTIONS</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href} style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.2)", color: "#c7d2fe", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 16 }}>
        <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Live Delivery Board</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {deliveries.slice(0, 5).map((delivery) => (
              <div key={delivery.id} style={{ border: `1px solid ${border}`, borderRadius: 12, padding: "12px 14px", background: "rgba(255,255,255,.02)" }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{delivery.milestone}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", marginTop: 4 }}>
                  {delivery.projectCode || "No project"} • {delivery.client || "No client"} • {delivery.status}
                </div>
              </div>
            ))}
            {!deliveries.length && <div style={{ color: "rgba(255,255,255,.35)" }}>No deliveries planned yet.</div>}
          </div>
        </div>

        <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Enterprise Summary</div>
          <div style={{ fontSize: 13, lineHeight: 1.8, color: "rgba(255,255,255,.55)" }}>
            Overdue Deliveries: <span style={{ color: overdueDeliveries ? "#f87171" : "#22c55e" }}>{overdueDeliveries}</span>
            <br />
            Waiting Review: <span style={{ color: reviewDeliveries ? "#f59e0b" : "#22c55e" }}>{reviewDeliveries}</span>
            <br />
            Draft Timesheets: <span style={{ color: draftTimesheets ? "#f59e0b" : "#22c55e" }}>{draftTimesheets}</span>
            <br />
            Active Projects: <span style={{ color: "#38bdf8" }}>{projects.filter((item) => item.status !== "completed").length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
