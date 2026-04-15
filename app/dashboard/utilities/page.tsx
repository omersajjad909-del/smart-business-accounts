"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchJson, type UtilityControlCenter } from "./_shared";

const emptyState: UtilityControlCenter = {
  summary: { activeAccounts: 0, pendingAccounts: 0, suspendedAccounts: 0, meters: 0, verifiedReadings: 0, openBills: 0, billedValue: 0, unitsLogged: 0 },
  connections: [],
  meters: [],
  bills: [],
};

export default function UtilitiesOverviewPage() {
  const [data, setData] = useState(emptyState);
  const [businessType, setBusinessType] = useState("electric_company");

  useEffect(() => {
    fetchJson("/api/utilities/control-center", emptyState).then(setData);
    fetchJson<{ businessType?: string }>("/api/company/business-type", { businessType: "electric_company" }).then((company) => {
      if (company.businessType) setBusinessType(company.businessType);
    });
  }, []);

  const { summary, connections, meters, bills } = data;
  const utilityConfig =
    businessType === "gas_distribution"
      ? {
          title: "Gas Distribution Command Center",
          description: "Monitor subscriber accounts, cylinder and meter coverage, route billing, and service recovery from live gas operations.",
          connectionLabel: "Customer Accounts",
          billingLabel: "Gas Billing",
          meterLabel: "Meter & Delivery Readings",
        }
      : businessType === "water_supply"
        ? {
            title: "Water Supply Command Center",
            description: "Track water customer accounts, meter readings, billing cycles, and service continuity from one live utility workspace.",
            connectionLabel: "Consumer Connections",
            billingLabel: "Water Billing",
            meterLabel: "Meter Readings",
          }
        : {
            title: "Electric Utility Command Center",
            description: "Connections, billing cycles, and meter coverage from live utility operations records.",
            connectionLabel: "Connections",
            billingLabel: "Utility Billing",
            meterLabel: "Meter Readings",
          };

  return (
    <div style={{ padding: "28px 32px", color: "#e2e8f0", fontFamily: "'Outfit','Inter',sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800, color: "white" }}>{utilityConfig.title}</h1>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.45)" }}>{utilityConfig.description}</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: utilityConfig.connectionLabel, href: "/dashboard/utilities/connections" },
            { label: utilityConfig.billingLabel, href: "/dashboard/utilities/billing" },
            { label: utilityConfig.meterLabel, href: "/dashboard/utilities/meters" },
            { label: "Analytics", href: "/dashboard/utilities/analytics" },
          ].map((item) => (
            <Link prefetch={false} key={item.href} href={item.href} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", color: "#bae6fd", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Active Accounts", value: summary.activeAccounts, color: "#38bdf8" },
          { label: "Pending Accounts", value: summary.pendingAccounts, color: "#fbbf24" },
          { label: "Open Bills", value: summary.openBills, color: "#f87171" },
          { label: "Verified Readings", value: summary.verifiedReadings, color: "#34d399" },
          { label: "Billed Value", value: summary.billedValue.toLocaleString(), color: "#60a5fa" },
        ].map((card) => (
          <div key={card.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 16 }}>
        <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 14 }}>Billing Watchlist</div>
          <div style={{ display: "grid", gap: 10 }}>
            {bills.slice(0, 6).map((item) => (
              <div key={item.id} style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{item.invoice}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", marginTop: 4 }}>{item.account || "-"} | {item.billingMonth || "-"}</div>
                <div style={{ fontSize: 12, color: "#93c5fd", marginTop: 6 }}>Amount {item.amount.toLocaleString()} | {item.status}</div>
              </div>
            ))}
            {bills.length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No utility bills available yet.</div>}
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 12 }}>Connection Desk</div>
            <div style={{ display: "grid", gap: 10 }}>
              {connections.slice(0, 5).map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{item.account}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{item.customer || "-"}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{item.tariff || "-"}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{item.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 12 }}>Meter Coverage</div>
            <div style={{ display: "grid", gap: 10 }}>
              {meters.slice(0, 5).map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{item.meter}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{item.account || "-"}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{item.units.toLocaleString()}</div>
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
