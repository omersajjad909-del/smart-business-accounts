"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchJson, mediaAccent, type MediaControlCenter } from "./_shared";

const emptyState: MediaControlCenter = {
  summary: { campaigns: 0, activeCampaigns: 0, clients: 0, activeClients: 0, approvedPlans: 0, campaignBudget: 0, retainers: 0, plannedSpend: 0 },
  campaigns: [],
  clients: [],
  plans: [],
};

export default function MediaOverviewPage() {
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetchJson("/api/media/control-center", emptyState).then(setData);
  }, []);

  const { summary, campaigns, clients, plans } = data;

  return (
    <div style={{ padding: "28px 32px", color: "#e2e8f0", fontFamily: "'Outfit','Inter',sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800, color: "white" }}>Media Command Center</h1>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.45)" }}>Campaign delivery, client portfolio, and media-plan readiness from live workspace records.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "Campaigns", href: "/dashboard/media/campaigns" },
            { label: "Clients", href: "/dashboard/media/clients" },
            { label: "Media Plan", href: "/dashboard/media/media-plan" },
            { label: "Analytics", href: "/dashboard/media/analytics" },
          ].map((item) => (
            <Link key={item.href} href={item.href} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", color: "#ddd6fe", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Campaigns", value: summary.campaigns, color: mediaAccent },
          { label: "Active Clients", value: summary.activeClients, color: "#34d399" },
          { label: "Approved Plans", value: summary.approvedPlans, color: "#60a5fa" },
          { label: "Campaign Budget", value: summary.campaignBudget.toLocaleString(), color: "#fbbf24" },
          { label: "Retainers", value: summary.retainers.toLocaleString(), color: "#f97316" },
        ].map((card) => (
          <div key={card.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 16 }}>
        <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 14 }}>Campaign Watchlist</div>
          <div style={{ display: "grid", gap: 10 }}>
            {campaigns.slice(0, 6).map((item) => (
              <div key={item.id} style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{item.campaign}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", marginTop: 4 }}>{item.client || "-"} | {item.channel || "-"}</div>
                <div style={{ fontSize: 12, color: "#c4b5fd", marginTop: 6 }}>Budget {Number(item.budget || 0).toLocaleString()} | {String(item.status || "-")}</div>
              </div>
            ))}
            {campaigns.length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No campaigns available yet.</div>}
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 12 }}>Client Portfolio</div>
            <div style={{ display: "grid", gap: 10 }}>
              {clients.slice(0, 5).map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{item.client}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{item.industry || "General"}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{item.retainer.toLocaleString()}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{item.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 12 }}>Planning Desk</div>
            <div style={{ display: "grid", gap: 10 }}>
              {plans.slice(0, 5).map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{item.plan}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{item.channel || "-"}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{item.spend.toLocaleString()}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{item.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
