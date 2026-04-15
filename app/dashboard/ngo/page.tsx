"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NgoControlCenter, fetchJson, ngoBg, ngoBorder, ngoFont, ngoMuted } from "./_shared";

function StatCard({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div style={{ background: ngoBg, border: `1px solid ${ngoBorder}`, borderRadius: 18, padding: "20px 22px" }}>
      <div style={{ fontSize: 12, color: ngoMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: tone }}>{value}</div>
    </div>
  );
}

const emptyState: NgoControlCenter = {
  summary: { donors: 0, beneficiaries: 0, totalRaised: 0, donorRaised: 0, grantBook: 0, fundBalance: 0, pendingReports: 0, activeGrants: 0, monthlyAid: 0, transactions: 0 },
  donors: [],
  grants: [],
  beneficiaries: [],
  funds: [],
  transactions: [],
};

export default function NgoOverviewPage() {
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetchJson("/api/ngo/control-center", emptyState).then(setData);
  }, []);

  const { summary, donors, grants, beneficiaries, transactions } = data;
  const topDonors = [...donors].sort((a, b) => b.totalDonated - a.totalDonated).slice(0, 4);

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", color: "#fff", fontFamily: ngoFont }}>
      <div style={{ marginBottom: 26 }}>
        <div style={{ fontSize: 12, color: "#a5b4fc", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>NGO / Non-Profit</div>
        <h1 style={{ fontSize: 30, fontWeight: 900, margin: "0 0 10px" }}>Mission Control Desk</h1>
        <p style={{ margin: 0, fontSize: 14, color: ngoMuted, maxWidth: 760 }}>
          Fundraising, grants, beneficiaries, aur fund accounting ko ek hi command center se manage karein taa ke impact aur compliance dono clear rahen.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 14, marginBottom: 26 }}>
        <StatCard label="Donors" value={summary.donors} tone="#818cf8" />
        <StatCard label="Beneficiaries" value={summary.beneficiaries} tone="#34d399" />
        <StatCard label="Funds Raised" value={`Rs. ${summary.totalRaised.toLocaleString()}`} tone="#60a5fa" />
        <StatCard label="Fund Balance" value={`Rs. ${summary.fundBalance.toLocaleString()}`} tone="#f59e0b" />
        <StatCard label="Pending Reports" value={summary.pendingReports} tone="#f87171" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.15fr .85fr", gap: 18, marginBottom: 18 }}>
        <div style={{ background: "linear-gradient(135deg, rgba(99,102,241,.14), rgba(59,130,246,.1))", border: `1px solid ${ngoBorder}`, borderRadius: 20, padding: 24 }}>
          <div style={{ fontSize: 13, color: "#c7d2fe", fontWeight: 800, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".07em" }}>Mission Flow</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12 }}>
            {[
              { title: "Capture Donors", body: "Donor profile, frequency, aur fundraising relationships maintain karein." },
              { title: "Track Grants", body: "Grant amount, donor, report due dates, aur compliance monitor karein." },
              { title: "Manage Beneficiaries", body: "Aid category, monthly support, aur outreach records organize karein." },
              { title: "Control Funds", body: "Receipts, expenses, and fund balances ko accountability ke saath track karein." },
            ].map((step, index) => (
              <div key={step.title} style={{ background: "rgba(8,12,30,.36)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: 999, background: "rgba(129,140,248,.18)", color: "#e0e7ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, marginBottom: 12 }}>{index + 1}</div>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>{step.title}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.62)", lineHeight: 1.55 }}>{step.body}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: ngoBg, border: `1px solid ${ngoBorder}`, borderRadius: 20, padding: 24 }}>
          <div style={{ fontSize: 13, color: "#fbbf24", fontWeight: 800, marginBottom: 12, textTransform: "uppercase", letterSpacing: ".07em" }}>Quick Actions</div>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              { href: "/dashboard/ngo/donors", label: "Open Donor Desk", hint: "Fundraising relationships and donor tiers" },
              { href: "/dashboard/ngo/grants", label: "Review Grants", hint: "Grant status, reports, and utilization" },
              { href: "/dashboard/ngo/beneficiaries", label: "Manage Beneficiaries", hint: "Aid programs and profiles" },
              { href: "/dashboard/ngo/funds", label: "Fund Accounting", hint: "Receipts, expenses, and balances" },
              { href: "/dashboard/ngo/analytics", label: "See NGO Analytics", hint: "Mission-side financial and impact reading" },
            ].map((item) => (
              <Link prefetch={false} key={item.href} href={item.href} style={{ textDecoration: "none", color: "#fff", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 12, color: ngoMuted }}>{item.hint}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ background: ngoBg, border: `1px solid ${ngoBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#34d399", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Top Donors</div>
          <div style={{ display: "grid", gap: 10 }}>
            {topDonors.length === 0 ? (
              <div style={{ color: ngoMuted, fontSize: 13 }}>Donor base build hone ke baad yahan top contributors show honge.</div>
            ) : topDonors.map((donor) => (
              <div key={donor.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "12px 14px" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{donor.name}</div>
                  <div style={{ fontSize: 12, color: ngoMuted }}>{donor.type} · {donor.frequency}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#34d399" }}>Rs. {donor.totalDonated.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: ngoBg, border: `1px solid ${ngoBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#60a5fa", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Operational Reading</div>
          <div style={{ display: "grid", gap: 12 }}>
            {[
              { label: "Monthly aid commitment", value: `Rs. ${summary.monthlyAid.toLocaleString()}`, tone: "#60a5fa" },
              { label: "Active grants", value: `${summary.activeGrants} running`, tone: "#34d399" },
              { label: "Fund transactions", value: `${summary.transactions} entries on record`, tone: "#f59e0b" },
              { label: "Inactive beneficiaries", value: `${beneficiaries.filter((beneficiary) => beneficiary.status !== "active").length} paused`, tone: "#f87171" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "14px 16px" }}>
                <span style={{ fontSize: 13, color: ngoMuted }}>{row.label}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: row.tone }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
