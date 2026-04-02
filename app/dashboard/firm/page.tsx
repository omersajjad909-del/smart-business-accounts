"use client";

import Link from "next/link";
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
  const clients = mapFirmClients(useBusinessRecords("firm_client").records);
  const projects = mapFirmProjects(useBusinessRecords("firm_project").records);
  const invoices = mapFirmBilling(useBusinessRecords("firm_billing").records);
  const timesheets = mapFirmTimesheets(useBusinessRecords("firm_timesheet").records);

  const activeClients = clients.filter((client) => client.status === "Active").length;
  const activeEngagements = projects.filter((project) => project.status === "Active").length;
  const billedRevenue = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const billableHours = timesheets.filter((entry) => entry.billable === "Yes").reduce((sum, entry) => sum + entry.hours, 0);

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", color: "#fff", fontFamily: firmFont }}>
      <div style={{ marginBottom: 26 }}>
        <div style={{ fontSize: 12, color: "#818cf8", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>Accounting Firm</div>
        <h1 style={{ fontSize: 30, fontWeight: 900, margin: "0 0 10px" }}>Client servicing, engagements, aur fee control center</h1>
        <p style={{ margin: 0, fontSize: 14, color: firmMuted, maxWidth: 760 }}>
          Client portfolio, active engagements, fee billing, aur staff time ko ek hi professional-services dashboard se monitor karein.
        </p>
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
            {[
              { title: "Client Onboarding", body: "Industry, contact, aur retainer expectations ko client desk me capture karein." },
              { title: "Engagement Planning", body: "Audit, tax, consulting, ya advisory work ko scoped engagement me convert karein." },
              { title: "Timesheets", body: "Staff effort ko billable/non-billable split ke saath log karein." },
              { title: "Fee Billing", body: "Invoices raise karein, dues monitor karein, aur monthly realization track karein." },
            ].map((step, index) => (
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
              { href: "/dashboard/firm/clients", label: "Client Desk", hint: "Portfolio, status, aur retainers" },
              { href: "/dashboard/firm/projects", label: "Engagements", hint: "Audit/tax/consulting work planning" },
              { href: "/dashboard/firm/timesheets", label: "Timesheets", hint: "Staff effort and utilization" },
              { href: "/dashboard/firm/billing", label: "Fee Billing", hint: "Invoice lifecycle and collection control" },
              { href: "/dashboard/firm/analytics", label: "Firm Analytics", hint: "Revenue mix, utilization, and backlog" },
            ].map((item) => (
              <Link key={item.href} href={item.href} style={{ textDecoration: "none", color: "#fff", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "14px 16px" }}>
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
