"use client";

import Link from "next/link";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  itBg,
  itBorder,
  itFont,
  itMuted,
  mapItContracts,
  mapItProjects,
  mapItSprints,
  mapSupportTickets,
} from "./_shared";

function StatCard({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div style={{ background: itBg, border: `1px solid ${itBorder}`, borderRadius: 18, padding: "20px 22px" }}>
      <div style={{ fontSize: 12, color: itMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: tone }}>{value}</div>
    </div>
  );
}

export default function ITOverviewPage() {
  const projects = mapItProjects(useBusinessRecords("it_project").records);
  const sprints = mapItSprints(useBusinessRecords("sprint").records);
  const contracts = mapItContracts(useBusinessRecords("contract").records);
  const tickets = mapSupportTickets(useBusinessRecords("support_ticket").records);

  const activeProjects = projects.filter((project) => project.status === "Active").length;
  const projectRevenue = contracts.filter((contract) => contract.status === "Active").reduce((sum, contract) => sum + contract.value, 0);
  const openTickets = tickets.filter((ticket) => !["Resolved", "Closed"].includes(ticket.status)).length;
  const avgProgress = projects.length ? Math.round(projects.reduce((sum, project) => sum + project.progress, 0) / projects.length) : 0;

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", color: "#fff", fontFamily: itFont }}>
      <div style={{ marginBottom: 26 }}>
        <div style={{ fontSize: 12, color: "#a78bfa", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>IT Company</div>
        <h1 style={{ fontSize: 30, fontWeight: 900, margin: "0 0 10px" }}>Delivery, contracts, aur support command center</h1>
        <p style={{ margin: 0, fontSize: 14, color: itMuted, maxWidth: 760 }}>
          Projects, sprint execution, client contracts, aur support workload ko ek hi delivery board se monitor karein.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 14, marginBottom: 24 }}>
        <StatCard label="Active Projects" value={activeProjects} tone="#34d399" />
        <StatCard label="Average Progress" value={`${avgProgress}%`} tone="#8b5cf6" />
        <StatCard label="Open Tickets" value={openTickets} tone="#f87171" />
        <StatCard label="Active Contract Value" value={`Rs. ${projectRevenue.toLocaleString()}`} tone="#60a5fa" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 18, marginBottom: 18 }}>
        <div style={{ background: "linear-gradient(135deg, rgba(124,58,237,.14), rgba(59,130,246,.08))", border: `1px solid ${itBorder}`, borderRadius: 20, padding: 24 }}>
          <div style={{ fontSize: 13, color: "#c4b5fd", fontWeight: 800, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".07em" }}>Delivery Flow</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12 }}>
            {[
              { title: "Project Intake", body: "Client scope, stack, budget, aur target timeline define karein." },
              { title: "Sprint Planning", body: "Stories break karein, sprint cadence set karein, aur velocity track karein." },
              { title: "Contract Control", body: "Retainer, milestone, ya fixed-price agreements active rakhein." },
              { title: "Support & Renewals", body: "Post-delivery tickets, AMC, aur SLA commitments manage karein." },
            ].map((step, index) => (
              <div key={step.title} style={{ background: "rgba(8,12,30,.36)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: 999, background: "rgba(139,92,246,.16)", color: "#ddd6fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, marginBottom: 12 }}>{index + 1}</div>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>{step.title}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.62)", lineHeight: 1.55 }}>{step.body}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: itBg, border: `1px solid ${itBorder}`, borderRadius: 20, padding: 24 }}>
          <div style={{ fontSize: 13, color: "#60a5fa", fontWeight: 800, marginBottom: 12, textTransform: "uppercase", letterSpacing: ".07em" }}>Quick Actions</div>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              { href: "/dashboard/it/projects", label: "Projects Desk", hint: "Delivery pipeline aur budget visibility" },
              { href: "/dashboard/it/sprints", label: "Sprint Tracking", hint: "Stories, velocity, aur timeline tracking" },
              { href: "/dashboard/it/contracts", label: "Client Contracts", hint: "Retainers, renewals, and commercial control" },
              { href: "/dashboard/it/support", label: "Support Tickets", hint: "Client incidents aur SLA queue" },
              { href: "/dashboard/it/analytics", label: "IT Analytics", hint: "Portfolio health aur ops mix" },
            ].map((item) => (
              <Link key={item.href} href={item.href} style={{ textDecoration: "none", color: "#fff", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 12, color: itMuted }}>{item.hint}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ background: itBg, border: `1px solid ${itBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#34d399", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Project Portfolio</div>
          <div style={{ display: "grid", gap: 10 }}>
            {projects.length === 0 ? (
              <div style={{ color: itMuted, fontSize: 13 }}>Projects add karne ke baad yahan portfolio summary show hogi.</div>
            ) : projects.slice(0, 4).map((project) => (
              <div key={project.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "12px 14px" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{project.name}</div>
                  <div style={{ fontSize: 12, color: itMuted }}>{project.client} • {project.progress}% progress</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: project.status === "Active" ? "#34d399" : "#94a3b8" }}>{project.status}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: itBg, border: `1px solid ${itBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#f59e0b", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Operational Reading</div>
          <div style={{ display: "grid", gap: 12 }}>
            {[
              { label: "Active sprints", value: `${sprints.filter((sprint) => sprint.status === "Active").length} running`, tone: "#8b5cf6" },
              { label: "Retainer MRR", value: `Rs. ${contracts.filter((contract) => contract.status === "Active").reduce((sum, contract) => sum + contract.mrr, 0).toLocaleString()}`, tone: "#60a5fa" },
              { label: "Critical support", value: `${tickets.filter((ticket) => ticket.priority === "Critical" && !["Resolved", "Closed"].includes(ticket.status)).length} unresolved`, tone: "#f87171" },
              { label: "Completed projects", value: `${projects.filter((project) => project.status === "Completed").length} shipped`, tone: "#34d399" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "14px 16px" }}>
                <span style={{ fontSize: 13, color: itMuted }}>{row.label}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: row.tone }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
