"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LawControlCenter, fetchJson, lawBg, lawBorder, lawFont, lawMuted } from "./_shared";

function StatCard({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div style={{ background: lawBg, border: `1px solid ${lawBorder}`, borderRadius: 18, padding: "20px 22px" }}>
      <div style={{ fontSize: 12, color: lawMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: tone }}>{value}</div>
    </div>
  );
}

const emptyState: LawControlCenter = {
  summary: { cases: 0, activeCases: 0, hearingsThisWeek: 0, clients: 0, outstanding: 0, paidRevenue: 0, totalBilled: 0, billableHours: 0, unbilledTime: 0 },
  cases: [],
  clients: [],
  invoices: [],
  entries: [],
};

export default function LawFirmOverviewPage() {
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetchJson("/api/law-firm/control-center", emptyState).then(setData);
  }, []);

  const { summary, cases, invoices } = data;
  const topMatters = [...cases].slice(0, 4);

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", color: "#fff", fontFamily: lawFont }}>
      <div style={{ marginBottom: 26 }}>
        <div style={{ fontSize: 12, color: "#fdba74", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>Law Firm</div>
        <h1 style={{ fontSize: 30, fontWeight: 900, margin: "0 0 10px" }}>Practice Control Center</h1>
        <p style={{ margin: 0, fontSize: 14, color: lawMuted, maxWidth: 760 }}>
          Cases, hearings, client dues, legal billing, aur time tracking ko ek hi practice management dashboard me monitor karein.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 14, marginBottom: 26 }}>
        <StatCard label="Active Cases" value={summary.activeCases} tone="#34d399" />
        <StatCard label="Hearings This Week" value={summary.hearingsThisWeek} tone="#fbbf24" />
        <StatCard label="Clients" value={summary.clients} tone="#60a5fa" />
        <StatCard label="Outstanding" value={`Rs. ${summary.outstanding.toLocaleString()}`} tone="#f87171" />
        <StatCard label="Paid Revenue" value={`Rs. ${summary.paidRevenue.toLocaleString()}`} tone="#a78bfa" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.15fr .85fr", gap: 18, marginBottom: 18 }}>
        <div style={{ background: "linear-gradient(135deg, rgba(146,64,14,.14), rgba(251,191,36,.08))", border: `1px solid ${lawBorder}`, borderRadius: 20, padding: 24 }}>
          <div style={{ fontSize: 13, color: "#fed7aa", fontWeight: 800, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".07em" }}>Practice Flow</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12 }}>
            {[
              { title: "Open Client", body: "Client file, contact details, aur account standing maintain karein." },
              { title: "Register Case", body: "Case type, court, hearing schedule, aur assigned lawyer track karein." },
              { title: "Log Time", body: "Matter-wise billable aur non-billable effort capture karein." },
              { title: "Bill & Collect", body: "Invoices raise karein, dues follow-up karein, aur practice cashflow control karein." },
            ].map((step, index) => (
              <div key={step.title} style={{ background: "rgba(8,12,30,.36)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: 999, background: "rgba(251,191,36,.16)", color: "#fde68a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, marginBottom: 12 }}>{index + 1}</div>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>{step.title}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.62)", lineHeight: 1.55 }}>{step.body}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: lawBg, border: `1px solid ${lawBorder}`, borderRadius: 20, padding: 24 }}>
          <div style={{ fontSize: 13, color: "#fbbf24", fontWeight: 800, marginBottom: 12, textTransform: "uppercase", letterSpacing: ".07em" }}>Quick Actions</div>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              { href: "/dashboard/law-firm/cases", label: "Open Case Desk", hint: "Matter register and hearing schedule" },
              { href: "/dashboard/law-firm/clients", label: "Manage Clients", hint: "Client files, outstanding, and portfolio" },
              { href: "/dashboard/law-firm/time-billing", label: "Time Billing", hint: "Billable effort and pending entries" },
              { href: "/dashboard/law-firm/billing", label: "Legal Billing", hint: "Invoices, receipts, and dues follow-up" },
              { href: "/dashboard/law-firm/analytics", label: "See Law Analytics", hint: "Practice health and revenue reading" },
            ].map((item) => (
              <Link key={item.href} href={item.href} style={{ textDecoration: "none", color: "#fff", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 12, color: lawMuted }}>{item.hint}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ background: lawBg, border: `1px solid ${lawBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#34d399", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Recent Matters</div>
          <div style={{ display: "grid", gap: 10 }}>
            {topMatters.length === 0 ? (
              <div style={{ color: lawMuted, fontSize: 13 }}>Cases add karne ke baad yahan active matters show honge.</div>
            ) : topMatters.map((legalCase) => (
              <div key={legalCase.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "12px 14px" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{legalCase.title}</div>
                  <div style={{ fontSize: 12, color: lawMuted }}>{legalCase.client} · {legalCase.court}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: legalCase.status === "Active" ? "#34d399" : "#94a3b8" }}>{legalCase.status}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: lawBg, border: `1px solid ${lawBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#60a5fa", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Operational Reading</div>
          <div style={{ display: "grid", gap: 12 }}>
            {[
              { label: "Unbilled time", value: `Rs. ${summary.unbilledTime.toLocaleString()}`, tone: "#60a5fa" },
              { label: "Paid invoices", value: `${invoices.filter((invoice) => invoice.status === "Paid").length} settled`, tone: "#34d399" },
              { label: "Sent invoices", value: `${invoices.filter((invoice) => invoice.status === "Sent").length} awaiting payment`, tone: "#fbbf24" },
              { label: "Closed cases", value: `${cases.filter((legalCase) => legalCase.status === "Closed" || legalCase.status === "Won" || legalCase.status === "Lost").length} archived`, tone: "#a78bfa" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "14px 16px" }}>
                <span style={{ fontSize: 13, color: lawMuted }}>{row.label}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: row.tone }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
