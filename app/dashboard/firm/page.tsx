"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  firmBg,
  firmBorder,
  firmFont,
  firmMuted,
  mapFirmBilling,
  mapFirmClients,
  mapFirmProjects,
  mapFirmTimesheets,
} from "./_shared";

function StatCard({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div style={{ background: firmBg, border: `1px solid ${firmBorder}`, borderRadius: 18, padding: "20px 22px" }}>
      <div style={{ fontSize: 12, color: firmMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: tone }}>{value}</div>
    </div>
  );
}

export default function FirmOverviewPage() {
  const [businessType, setBusinessType] = useState("accounting_firm");
  const clients = mapFirmClients(useBusinessRecords("firm_client").records);
  const projects = mapFirmProjects(useBusinessRecords("firm_project").records);
  const invoices = mapFirmBilling(useBusinessRecords("firm_billing").records);
  const timesheets = mapFirmTimesheets(useBusinessRecords("firm_timesheet").records);

  useEffect(() => {
    fetch("/api/company/business-type", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { businessType: "accounting_firm" }))
      .then((company) => {
        if (company.businessType) setBusinessType(company.businessType);
      })
      .catch(() => setBusinessType("accounting_firm"));
  }, []);

  const activeClients = clients.filter((client) => client.status === "Active").length;
  const activeEngagements = projects.filter((project) => project.status === "Active").length;
  const billedRevenue = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const billableHours = timesheets.filter((entry) => entry.billable === "Yes").reduce((sum, entry) => sum + entry.hours, 0);

  const firmConfig =
    businessType === "audit_firm"
      ? {
          eyebrow: "Audit Firm",
          title: "Audit planning, fieldwork, and fee recovery command center",
          description: "Monitor audit clients, active engagements, billable effort, and fee realization from one professional-services workspace.",
          workflow: [
            { title: "Engagement Setup", body: "Capture client, risk areas, deadlines, and team ownership for each audit assignment." },
            { title: "Fieldwork Planning", body: "Organize testing areas, findings, and completion timelines across active jobs." },
            { title: "Timesheets", body: "Track billable and non-billable staff effort for utilization and recovery analysis." },
            { title: "Fee Recovery", body: "Monitor invoice cycles, collections, and backlog before sign-off season closes." },
          ],
        }
      : businessType === "consultancy_firm"
        ? {
            eyebrow: "Consultancy Firm",
            title: "Client delivery, consulting engagements, and fee control center",
            description: "Track advisory clients, scoped projects, consultant effort, and billing realization from a single operations view.",
            workflow: [
              { title: "Client Intake", body: "Record advisory clients, retainer terms, and solution scope for each mandate." },
              { title: "Project Delivery", body: "Convert proposals into active consulting engagements with milestones and owners." },
              { title: "Timesheets", body: "Measure consultant effort and billable utilization across active client work." },
              { title: "Fee Billing", body: "Raise invoices, monitor dues, and protect margin across advisory workstreams." },
            ],
          }
        : businessType === "architecture_firm"
          ? {
              eyebrow: "Architecture Firm",
              title: "Design delivery, project milestones, and fee billing command center",
              description: "Manage design clients, active projects, team effort, and billing from one architecture operations workspace.",
              workflow: [
                { title: "Client Briefing", body: "Capture site requirements, design scope, and project expectations in the client desk." },
                { title: "Project Staging", body: "Track design milestones, deliverables, and owner accountability across engagements." },
                { title: "Timesheets", body: "Log architect and drafter effort against active design packages and revisions." },
                { title: "Fee Billing", body: "Monitor invoice stages, collection health, and realization across the design pipeline." },
              ],
            }
          : {
              eyebrow: "Accounting Firm",
              title: "Client servicing, engagements, and fee control center",
              description: "Monitor client portfolio, active engagements, fee billing, and staff time from one professional-services dashboard.",
              workflow: [
                { title: "Client Onboarding", body: "Capture industry, contacts, and retainer expectations in the client desk." },
                { title: "Engagement Planning", body: "Convert bookkeeping, tax, audit, or advisory work into active engagements." },
                { title: "Timesheets", body: "Track staff effort with billable and non-billable visibility across client work." },
                { title: "Fee Billing", body: "Raise invoices, monitor dues, and keep monthly realization under control." },
              ],
            };

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", color: "#fff", fontFamily: firmFont }}>
      <div style={{ marginBottom: 26 }}>
        <div style={{ fontSize: 12, color: "#818cf8", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>{firmConfig.eyebrow}</div>
        <h1 style={{ fontSize: 30, fontWeight: 900, margin: "0 0 10px" }}>{firmConfig.title}</h1>
        <p style={{ margin: 0, fontSize: 14, color: firmMuted, maxWidth: 760 }}>{firmConfig.description}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 14, marginBottom: 24 }}>
        <StatCard label="Active Clients" value={activeClients} tone="#34d399" />
        <StatCard label="Active Engagements" value={activeEngagements} tone="#60a5fa" />
        <StatCard label="Fee Billing" value={`$${billedRevenue.toLocaleString()}`} tone="#8b5cf6" />
        <StatCard label="Billable Hours" value={billableHours.toFixed(1)} tone="#f59e0b" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 18, marginBottom: 18 }}>
        <div style={{ background: "linear-gradient(135deg, rgba(99,102,241,.14), rgba(56,189,248,.08))", border: `1px solid ${firmBorder}`, borderRadius: 20, padding: 24 }}>
          <div style={{ fontSize: 13, color: "#c7d2fe", fontWeight: 800, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".07em" }}>Firm Workflow</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12 }}>
            {firmConfig.workflow.map((step, index) => (
              <div key={step.title} style={{ background: "rgba(8,12,30,.36)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: 999, background: "rgba(129,140,248,.16)", color: "#c7d2fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, marginBottom: 12 }}>{index + 1}</div>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>{step.title}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.62)", lineHeight: 1.55 }}>{step.body}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: firmBg, border: `1px solid ${firmBorder}`, borderRadius: 20, padding: 24 }}>
          <div style={{ fontSize: 13, color: "#60a5fa", fontWeight: 800, marginBottom: 12, textTransform: "uppercase", letterSpacing: ".07em" }}>Quick Actions</div>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              { href: "/dashboard/firm/clients", label: "Client Desk", hint: "Portfolio, status, and retainers" },
              { href: "/dashboard/firm/projects", label: "Engagements", hint: "Audit, advisory, and design work planning" },
              { href: "/dashboard/firm/timesheets", label: "Timesheets", hint: "Staff effort and utilization" },
              { href: "/dashboard/firm/billing", label: "Fee Billing", hint: "Invoice lifecycle and collection control" },
              { href: "/dashboard/firm/analytics", label: "Firm Analytics", hint: "Revenue mix, utilization, and backlog" },
            ].map((item) => (
              <Link prefetch={false} key={item.href} href={item.href} style={{ textDecoration: "none", color: "#fff", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 12, color: firmMuted }}>{item.hint}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
