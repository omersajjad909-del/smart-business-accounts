"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type FranchiseControlCenter = {
  summary: {
    outlets: number;
    activeOutlets: number;
    monthlySales: number;
    royaltyValue: number;
    receivedCycles: number;
  };
  outlets: Array<{ id: string; outletName: string; location: string; franchisee: string; monthlySales: number; status: string }>;
  royalties: Array<{ id: string; outlet: string; month: string; amount: number; status: string }>;
};

const emptyState: FranchiseControlCenter = {
  summary: { outlets: 0, activeOutlets: 0, monthlySales: 0, royaltyValue: 0, receivedCycles: 0 },
  outlets: [],
  royalties: [],
};

export default function FranchiseOverviewPage() {
  const [data, setData] = useState(emptyState);
  const [businessType, setBusinessType] = useState("franchise_brand");

  useEffect(() => {
    fetch("/api/franchise/control-center", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : emptyState))
      .then(setData)
      .catch(() => setData(emptyState));
    fetch("/api/company/business-type", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { businessType: "franchise_brand" }))
      .then((company) => {
        if (company.businessType) setBusinessType(company.businessType);
      })
      .catch(() => setBusinessType("franchise_brand"));
  }, []);

  const { summary, outlets, royalties } = data;
  const franchiseConfig =
    businessType === "chain_store"
      ? {
          title: "Chain Store Command Center",
          description: "Monitor store network growth, outlet health, royalty flows, and network performance from live chain-store records.",
          outletLabel: "Stores",
          tone: "#86efac",
        }
      : businessType === "franchise_restaurant"
        ? {
            title: "Franchise Restaurant Command Center",
            description: "Track outlet expansion, royalty control, and restaurant network performance from live franchise operations.",
            outletLabel: "Restaurant Outlets",
            tone: "#fbbf24",
          }
        : {
            title: "Franchise Command Center",
            description: "Outlet expansion, royalty control, and network performance from live franchise records.",
            outletLabel: "Outlets",
            tone: "#86efac",
          };

  return (
    <div style={{ padding: "28px 32px", color: "#e2e8f0", fontFamily: "'Outfit','Inter',sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800, color: "white" }}>{franchiseConfig.title}</h1>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.45)" }}>{franchiseConfig.description}</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: franchiseConfig.outletLabel, href: "/dashboard/franchise/outlets" },
            { label: "Royalty", href: "/dashboard/franchise/royalty" },
            { label: "Analytics", href: "/dashboard/franchise/analytics" },
          ].map((item) => (
            <Link prefetch={false} key={item.href} href={item.href} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", color: franchiseConfig.tone, textDecoration: "none", fontSize: 12, fontWeight: 700 }}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: franchiseConfig.outletLabel, value: summary.outlets, color: "#22c55e" },
          { label: "Active Outlets", value: summary.activeOutlets, color: "#60a5fa" },
          { label: "Monthly Sales", value: summary.monthlySales.toLocaleString(), color: "#fbbf24" },
          { label: "Royalty Value", value: summary.royaltyValue.toLocaleString(), color: "#a78bfa" },
          { label: "Received Cycles", value: summary.receivedCycles, color: "#34d399" },
        ].map((card) => (
          <div key={card.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 16 }}>
        <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 14 }}>Outlet Watchlist</div>
          <div style={{ display: "grid", gap: 10 }}>
            {outlets.slice(0, 6).map((item) => (
              <div key={item.id} style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{item.outletName}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", marginTop: 4 }}>{item.location || "-"} | {item.franchisee || "-"}</div>
                <div style={{ fontSize: 12, color: franchiseConfig.tone, marginTop: 6 }}>{item.monthlySales.toLocaleString()} | {item.status}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 12 }}>Royalty Desk</div>
          <div style={{ display: "grid", gap: 10 }}>
            {royalties.slice(0, 6).map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{item.outlet}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{item.month || "-"}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{item.amount.toLocaleString()}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{item.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
