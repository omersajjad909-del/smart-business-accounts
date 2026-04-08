"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ServicesControlCenter,
  fetchJson,
  serviceBg,
  serviceBorder,
  serviceFont,
  serviceMuted,
} from "../_shared";

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

function Metric({ title, value, note, color }: { title: string; value: string; note: string; color: string }) {
  return (
    <div style={{ background: serviceBg, border: `1px solid ${serviceBorder}`, borderRadius: 18, padding: "20px 22px" }}>
      <div style={{ fontSize: 12, color: serviceMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 12, color: serviceMuted, marginTop: 6 }}>{note}</div>
    </div>
  );
}

export default function ServicesAnalyticsPage() {
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetchJson("/api/services/control-center", emptyState).then(setData);
  }, []);

  const projectMix = useMemo(() => {
    const counts = new Map<string, number>();
    data.projects.forEach((project) => counts.set(project.status, (counts.get(project.status) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [data.projects]);

  const consultantLoad = useMemo(() => {
    const totals = new Map<string, { hours: number; value: number }>();
    data.timesheets.forEach((item) => {
      const key = item.consultant || "Unassigned";
      const current = totals.get(key) || { hours: 0, value: 0 };
      totals.set(key, {
        hours: current.hours + item.billableHours,
        value: current.value + item.billableHours * item.billingRate,
      });
    });
    return [...totals.entries()].sort((a, b) => b[1].value - a[1].value).slice(0, 5);
  }, [data.timesheets]);

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", color: "#fff", fontFamily: serviceFont }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: "#86efac", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>Services Analytics</div>
        <h1 style={{ fontSize: 30, fontWeight: 900, margin: "0 0 10px" }}>Pipeline, billables, aur delivery pressure</h1>
        <p style={{ margin: 0, fontSize: 14, color: serviceMuted, maxWidth: 760 }}>
          Service business ke liye project status, billable intensity, consultant load, aur delivery backlog yahan se monitor hota hai.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 14, marginBottom: 24 }}>
        <Metric title="Billable Value" value={`Rs. ${data.summary.billableValue.toLocaleString()}`} note={`${data.summary.billableHours} tracked billable hours`} color="#34d399" />
        <Metric title="Active Projects" value={String(data.summary.activeProjects)} note={`${data.summary.completedProjects} projects closed`} color="#60a5fa" />
        <Metric title="Delivery Pressure" value={String(data.summary.overdueDeliveries)} note="Overdue milestone commitments" color="#f87171" />
        <Metric title="Review Queue" value={String(data.summary.reviewDeliveries)} note="Milestones waiting sign-off" color="#f59e0b" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ background: serviceBg, border: `1px solid ${serviceBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#34d399", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Project Status Mix</div>
          <div style={{ display: "grid", gap: 12 }}>
            {projectMix.length === 0 ? (
              <div style={{ color: serviceMuted, fontSize: 13 }}>Project mix show karne ke liye projects add karein.</div>
            ) : projectMix.map(([status, count]) => {
              const pct = data.projects.length ? Math.max(10, Math.round((count / data.projects.length) * 100)) : 10;
              return (
                <div key={status}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{status}</span>
                    <span style={{ fontSize: 12, color: serviceMuted }}>{count} projects</span>
                  </div>
                  <div style={{ height: 10, borderRadius: 999, background: "rgba(255,255,255,.05)", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#22c55e,#38bdf8)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ background: serviceBg, border: `1px solid ${serviceBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#60a5fa", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Top Consultant Load</div>
          <div style={{ display: "grid", gap: 10 }}>
            {consultantLoad.length === 0 ? (
              <div style={{ color: serviceMuted, fontSize: 13 }}>Consultant load show karne ke liye timesheets add karein.</div>
            ) : consultantLoad.map(([consultant, summary]) => (
              <div key={consultant} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "12px 14px" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{consultant}</div>
                  <div style={{ fontSize: 12, color: serviceMuted }}>{summary.hours} billable hours</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#34d399" }}>Rs. {summary.value.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
