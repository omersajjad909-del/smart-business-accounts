"use client";

import { useMemo } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

function card(label: string, value: string | number, color: string) {
  return (
    <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "18px 20px" }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

export default function FranchiseAnalyticsPage() {
  const outletStore = useBusinessRecords("franchise_outlet");
  const royaltyStore = useBusinessRecords("franchise_royalty");

  const outlets = useMemo(
    () =>
      outletStore.records.map((record) => ({
        id: record.id,
        outletName: String(record.data?.outletName ?? record.title ?? ""),
        location: String(record.data?.location ?? ""),
        franchisee: String(record.data?.franchisee ?? ""),
        monthlySales: Number(record.amount ?? 0),
        status: record.status || "Active",
      })),
    [outletStore.records],
  );

  const royalties = useMemo(
    () =>
      royaltyStore.records.map((record) => ({
        id: record.id,
        outlet: record.title,
        month: String(record.data?.month ?? ""),
        rate: Number(record.data?.rate ?? 0),
        amount: Number(record.amount ?? 0),
        status: record.status || "calculated",
      })),
    [royaltyStore.records],
  );

  const stats = useMemo(() => {
    const monthlySales = outlets.reduce((sum, item) => sum + Number(item.monthlySales || 0), 0);
    const royaltyValue = royalties.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return {
      outlets: outlets.length,
      activeOutlets: outlets.filter((item) => String(item.status) === "Active").length,
      royaltyValue,
      monthlySales,
      received: royalties.filter((item) => String(item.status) === "received").length,
    };
  }, [outlets, royalties]);

  return (
    <div style={{ padding: "28px 32px", color: "#e2e8f0", fontFamily: "'Outfit','Inter',sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800, color: "white" }}>Franchise Analytics</h1>
        <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,.45)" }}>
          Outlet spread, royalty recovery, and network health from live franchise records.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 24 }}>
        {card("Outlets", stats.outlets, "#22c55e")}
        {card("Active Outlets", stats.activeOutlets, "#60a5fa")}
        {card("Monthly Sales", stats.monthlySales.toLocaleString(), "#fbbf24")}
        {card("Royalty Value", stats.royaltyValue.toLocaleString(), "#a78bfa")}
        {card("Received Cycles", stats.received, "#34d399")}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 16 }}>
        <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 14 }}>Outlet Snapshot</div>
          {outletStore.loading ? (
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)" }}>Loading outlets...</div>
          ) : outlets.length ? (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Outlet", "Location", "Franchisee", "Monthly Sales", "Status"].map((head) => (
                    <th key={head} style={{ textAlign: "left", padding: "0 0 10px", borderBottom: "1px solid rgba(255,255,255,.07)", fontSize: 11, color: "rgba(255,255,255,.45)", textTransform: "uppercase", letterSpacing: ".06em" }}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {outlets.slice(0, 8).map((item) => (
                  <tr key={item.id}>
                    <td style={{ padding: "14px 12px 14px 0", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{item.outletName}</td>
                    <td style={{ padding: "14px 12px 14px 0", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{item.location || "-"}</td>
                    <td style={{ padding: "14px 12px 14px 0", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{item.franchisee || "-"}</td>
                    <td style={{ padding: "14px 12px 14px 0", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{Number(item.monthlySales || 0).toLocaleString()}</td>
                    <td style={{ padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{String(item.status || "-")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)" }}>No outlets available yet.</div>
          )}
        </div>

        <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 12 }}>Royalty Snapshot</div>
          {royalties.length ? royalties.slice(0, 8).map((item) => (
            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{item.outlet}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{item.month || "-"}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13 }}>{Number(item.amount || 0).toLocaleString()}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{String(item.status || "-")}</div>
              </div>
            </div>
          )) : <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)" }}>No royalty cycles available yet.</div>}
        </div>
      </div>
    </div>
  );
}
