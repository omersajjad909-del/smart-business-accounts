"use client";

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
} from "../_shared";

function Metric({ title, value, note, color }: { title: string; value: string; note: string; color: string }) {
  return (
    <div style={{ background: firmBg, border: `1px solid ${firmBorder}`, borderRadius: 18, padding: "20px 22px" }}>
      <div style={{ fontSize: 12, color: firmMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 12, color: firmMuted, marginTop: 6 }}>{note}</div>
    </div>
  );
}

export default function FirmAnalyticsPage() {
  const clients = mapFirmClients(useBusinessRecords("firm_client").records);
  const projects = mapFirmProjects(useBusinessRecords("firm_project").records);
  const invoices = mapFirmBilling(useBusinessRecords("firm_billing").records);
  const timesheets = mapFirmTimesheets(useBusinessRecords("firm_timesheet").records);

  const billed = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const collected = invoices.filter((invoice) => invoice.status === "Paid").reduce((sum, invoice) => sum + invoice.amount, 0);
  const totalHours = timesheets.reduce((sum, entry) => sum + entry.hours, 0);
  const billableHours = timesheets.filter((entry) => entry.billable === "Yes").reduce((sum, entry) => sum + entry.hours, 0);
  const utilization = totalHours ? Math.round((billableHours / totalHours) * 100) : 0;

  const industryMap = new Map<string, number>();
  clients.forEach((client) => {
    const industry = client.industry || "Unspecified";
    industryMap.set(industry, (industryMap.get(industry) || 0) + 1);
  });
  const industryMix = [...industryMap.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", color: "#fff", fontFamily: firmFont }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: "#818cf8", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>Firm Analytics</div>
        <h1 style={{ fontSize: 30, fontWeight: 900, margin: "0 0 10px" }}>Portfolio mix, fee realization, aur utilization</h1>
        <p style={{ margin: 0, fontSize: 14, color: firmMuted, maxWidth: 760 }}>
          Client concentration, engagement load, collections, aur staff billability ko ek hi analytics board par dekh sakte hain.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 14, marginBottom: 24 }}>
        <Metric title="Clients" value={`${clients.length}`} note="Total portfolio size" color="#60a5fa" />
        <Metric title="Engagements" value={`${projects.length}`} note="All active + closed work" color="#8b5cf6" />
        <Metric title="Fee Realization" value={`$${collected.toLocaleString()}`} note={`of $${billed.toLocaleString()} billed`} color="#34d399" />
        <Metric title="Utilization" value={`${utilization}%`} note="Billable vs total hours" color="#f59e0b" />
      </div>

      <div style={{ background: firmBg, border: `1px solid ${firmBorder}`, borderRadius: 20, padding: 22 }}>
        <div style={{ fontSize: 13, color: "#34d399", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Client Industry Mix</div>
        <div style={{ display: "grid", gap: 12 }}>
          {industryMix.length === 0 ? (
            <div style={{ color: firmMuted, fontSize: 13 }}>Industry mix dekhne ke liye clients add karein.</div>
          ) : industryMix.map(([industry, count]) => {
            const pct = clients.length ? Math.max(12, Math.round((count / clients.length) * 100)) : 12;
            return (
              <div key={industry}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{industry}</span>
                  <span style={{ fontSize: 12, color: firmMuted }}>{count} clients</span>
                </div>
                <div style={{ height: 10, borderRadius: 999, background: "rgba(255,255,255,.05)", overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#818cf8,#60a5fa)" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
