"use client";

import { useMemo } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { mapMediaCampaign, mapMediaClient, mapMediaPlan, mediaAccent } from "../_shared";

function card(label: string, value: string | number, color: string) {
  return (
    <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "18px 20px" }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

export default function MediaAnalyticsPage() {
  const campaignStore = useBusinessRecords("media_campaign");
  const clientStore = useBusinessRecords("media_client");
  const planStore = useBusinessRecords("media_plan");

  const campaigns = useMemo(() => campaignStore.records.map(mapMediaCampaign), [campaignStore.records]);
  const clients = useMemo(() => clientStore.records.map(mapMediaClient), [clientStore.records]);
  const plans = useMemo(() => planStore.records.map(mapMediaPlan), [planStore.records]);

  const stats = useMemo(() => {
    const campaignBudget = campaigns.reduce((sum, item) => sum + Number(item.budget || 0), 0);
    const retainers = clients.reduce((sum, item) => sum + Number(item.retainer || 0), 0);
    const plannedSpend = plans.reduce((sum, item) => sum + Number(item.spend || 0), 0);
    return {
      activeCampaigns: campaigns.filter((item) => String(item.status) === "active").length,
      activeClients: clients.filter((item) => String(item.status) === "active").length,
      approvedPlans: plans.filter((item) => String(item.status) === "approved" || String(item.status) === "live").length,
      campaignBudget,
      retainers,
      plannedSpend,
    };
  }, [campaigns, clients, plans]);

  return (
    <div style={{ padding: "28px 32px", color: "#e2e8f0", fontFamily: "'Outfit','Inter',sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800, color: "white" }}>Media Analytics</h1>
        <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,.45)" }}>
          Campaign load, client exposure, and media-plan readiness from live workspace records.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 24 }}>
        {card("Active Campaigns", stats.activeCampaigns, mediaAccent)}
        {card("Active Clients", stats.activeClients, "#34d399")}
        {card("Approved Plans", stats.approvedPlans, "#60a5fa")}
        {card("Campaign Budget", stats.campaignBudget.toLocaleString(), "#fbbf24")}
        {card("Retainers", stats.retainers.toLocaleString(), "#f97316")}
        {card("Planned Spend", stats.plannedSpend.toLocaleString(), "#a78bfa")}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 16 }}>
        <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 14 }}>Campaign Snapshot</div>
          {campaignStore.loading ? (
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)" }}>Loading campaigns...</div>
          ) : campaigns.length ? (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Campaign", "Client", "Channel", "Budget", "Status"].map((head) => (
                    <th key={head} style={{ textAlign: "left", padding: "0 0 10px", borderBottom: "1px solid rgba(255,255,255,.07)", fontSize: 11, color: "rgba(255,255,255,.45)", textTransform: "uppercase", letterSpacing: ".06em" }}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.slice(0, 8).map((item) => (
                  <tr key={item.id}>
                    <td style={{ padding: "14px 12px 14px 0", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{item.campaign}</td>
                    <td style={{ padding: "14px 12px 14px 0", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{item.client || "-"}</td>
                    <td style={{ padding: "14px 12px 14px 0", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{item.channel || "-"}</td>
                    <td style={{ padding: "14px 12px 14px 0", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{Number(item.budget || 0).toLocaleString()}</td>
                    <td style={{ padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{String(item.status || "-")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)" }}>No campaigns available yet.</div>
          )}
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 12 }}>Client Portfolio</div>
            {clients.length ? clients.slice(0, 6).map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{item.client}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{item.industry || "General"}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13 }}>{Number(item.retainer || 0).toLocaleString()}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{String(item.status || "-")}</div>
                </div>
              </div>
            )) : <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)" }}>No clients available yet.</div>}
          </div>

          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 12 }}>Planning Readiness</div>
            {plans.length ? plans.slice(0, 6).map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{item.plan}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{item.channel || "-"}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13 }}>{Number(item.spend || 0).toLocaleString()}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{String(item.status || "-")}</div>
                </div>
              </div>
            )) : <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)" }}>No media plans available yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
