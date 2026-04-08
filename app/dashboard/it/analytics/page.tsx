"use client";

import { useEffect, useState } from "react";
import { ItControlCenter, fetchJson, itBg, itBorder, itFont, itMuted } from "../_shared";

function Metric({ title, value, note, color }: { title: string; value: string; note: string; color: string }) {
  return (
    <div style={{ background: itBg, border: `1px solid ${itBorder}`, borderRadius: 18, padding: "20px 22px" }}>
      <div style={{ fontSize: 12, color: itMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 12, color: itMuted, marginTop: 6 }}>{note}</div>
    </div>
  );
}

const emptyState: ItControlCenter = {
  summary: {
    projects: 0,
    activeProjects: 0,
    averageProgress: 0,
    sprints: 0,
    activeSprints: 0,
    contracts: 0,
    activeContractValue: 0,
    activeMrr: 0,
    tickets: 0,
    openTickets: 0,
    criticalTickets: 0,
  },
  projects: [],
  sprints: [],
  contracts: [],
  tickets: [],
};

export default function ITAnalyticsPage() {
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetchJson("/api/it/control-center", emptyState).then(setData);
  }, []);

  const { summary, projects, sprints, tickets } = data;
  const totalSpent = projects.reduce((sum, project) => sum + project.spent, 0);
  const avgVelocity = sprints.length ? Math.round(sprints.reduce((sum, sprint) => sum + sprint.velocity, 0) / sprints.length) : 0;

  const stackMap = new Map<string, number>();
  projects.forEach((project) => project.techStack.forEach((stack) => stackMap.set(stack, (stackMap.get(stack) || 0) + 1)));
  const stackMix = [...stackMap.entries()].sort((a, b) => b[1] - a[1]);

  const supportByStatus = ["Open", "In Progress", "Waiting Client", "Resolved", "Closed"].map((status) => ({
    status,
    count: tickets.filter((ticket) => ticket.status === status).length,
  }));

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", color: "#fff", fontFamily: itFont }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: "#a78bfa", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>IT Analytics</div>
        <h1 style={{ fontSize: 30, fontWeight: 900, margin: "0 0 10px" }}>Delivery health, stack mix, and support pressure</h1>
        <p style={{ margin: 0, fontSize: 14, color: itMuted, maxWidth: 760 }}>
          Project portfolio performance, contract value, sprint pace, and support backlog ko ek hi jagah dekh sakte hain.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 14, marginBottom: 24 }}>
        <Metric title="Active Revenue" value={`Rs. ${summary.activeContractValue.toLocaleString()}`} note="Active contracts only" color="#60a5fa" />
        <Metric title="Project Spend" value={`Rs. ${totalSpent.toLocaleString()}`} note="Tracked delivery burn" color="#f59e0b" />
        <Metric title="Average Progress" value={`${summary.averageProgress}%`} note={`${summary.projects} projects tracked`} color="#8b5cf6" />
        <Metric title="Average Velocity" value={`${avgVelocity} pts`} note={`${summary.sprints} sprints logged`} color="#34d399" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ background: itBg, border: `1px solid ${itBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#34d399", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Tech Stack Mix</div>
          <div style={{ display: "grid", gap: 12 }}>
            {stackMix.length === 0 ? (
              <div style={{ color: itMuted, fontSize: 13 }}>Tech stack insight dekhne ke liye projects add karein.</div>
            ) : stackMix.map(([stack, count]) => {
              const pct = projects.length ? Math.max(12, Math.round((count / projects.length) * 100)) : 12;
              return (
                <div key={stack}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{stack}</span>
                    <span style={{ fontSize: 12, color: itMuted }}>{count} projects</span>
                  </div>
                  <div style={{ height: 10, borderRadius: 999, background: "rgba(255,255,255,.05)", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#8b5cf6,#60a5fa)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ background: itBg, border: `1px solid ${itBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#f87171", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Support Backlog</div>
          <div style={{ display: "grid", gap: 10 }}>
            {supportByStatus.map((row) => (
              <div key={row.status} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "12px 14px" }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{row.status}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: row.status === "Resolved" || row.status === "Closed" ? "#34d399" : row.status === "Waiting Client" ? "#fbbf24" : "#f87171" }}>{row.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
