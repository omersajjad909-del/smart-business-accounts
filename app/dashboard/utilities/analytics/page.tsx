"use client";

import { useMemo } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { mapUtilityBilling, mapUtilityConnection, mapUtilityMeter, utilityAccent } from "../_shared";

function card(label: string, value: string | number, color: string) {
  return (
    <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "18px 20px" }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

export default function UtilityAnalyticsPage() {
  const connectionStore = useBusinessRecords("utility_connection");
  const meterStore = useBusinessRecords("utility_meter");
  const billingStore = useBusinessRecords("utility_billing");

  const connections = useMemo(() => connectionStore.records.map(mapUtilityConnection), [connectionStore.records]);
  const meters = useMemo(() => meterStore.records.map(mapUtilityMeter), [meterStore.records]);
  const bills = useMemo(() => billingStore.records.map(mapUtilityBilling), [billingStore.records]);

  const stats = useMemo(() => {
    const billed = bills.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const units = meters.reduce((sum, item) => sum + Number(item.units || 0), 0);
    return {
      activeAccounts: connections.filter((item) => String(item.status) === "active").length,
      openBills: bills.filter((item) => String(item.status) === "open").length,
      verifiedReadings: meters.filter((item) => String(item.status) === "verified").length,
      billed,
      units,
    };
  }, [connections, meters, bills]);

  return (
    <div style={{ padding: "28px 32px", color: "#e2e8f0", fontFamily: "'Outfit','Inter',sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800, color: "white" }}>Utility Analytics</h1>
        <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,.45)" }}>
          Account base, billing pressure, and meter coverage from live operations records.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 24 }}>
        {card("Active Accounts", stats.activeAccounts, utilityAccent)}
        {card("Open Bills", stats.openBills, "#fbbf24")}
        {card("Verified Readings", stats.verifiedReadings, "#34d399")}
        {card("Billed Value", stats.billed.toLocaleString(), "#60a5fa")}
        {card("Units Logged", stats.units.toLocaleString(), "#a78bfa")}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 16 }}>
        <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 14 }}>Billing Snapshot</div>
          {billingStore.loading ? (
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)" }}>Loading billing...</div>
          ) : bills.length ? (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Invoice", "Account", "Month", "Amount", "Status"].map((head) => (
                    <th key={head} style={{ textAlign: "left", padding: "0 0 10px", borderBottom: "1px solid rgba(255,255,255,.07)", fontSize: 11, color: "rgba(255,255,255,.45)", textTransform: "uppercase", letterSpacing: ".06em" }}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bills.slice(0, 8).map((item) => (
                  <tr key={item.id}>
                    <td style={{ padding: "14px 12px 14px 0", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{item.invoice}</td>
                    <td style={{ padding: "14px 12px 14px 0", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{item.account || "-"}</td>
                    <td style={{ padding: "14px 12px 14px 0", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{item.billingMonth || "-"}</td>
                    <td style={{ padding: "14px 12px 14px 0", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{Number(item.amount || 0).toLocaleString()}</td>
                    <td style={{ padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{String(item.status || "-")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)" }}>No bills available yet.</div>
          )}
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 12 }}>Connection Mix</div>
            {connections.length ? connections.slice(0, 6).map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{item.account}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{item.customer || "-"}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13 }}>{item.tariff || "-"}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{String(item.status || "-")}</div>
                </div>
              </div>
            )) : <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)" }}>No connections available yet.</div>}
          </div>

          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 12 }}>Meter Coverage</div>
            {meters.length ? meters.slice(0, 6).map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{item.meter}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{item.account || "-"}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13 }}>{Number(item.units || 0).toLocaleString()}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{String(item.status || "-")}</div>
                </div>
              </div>
            )) : <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)" }}>No meter readings available yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
