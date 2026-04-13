"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchJson, tradeBg, tradeBorder, tradeFont, tradeMuted, type TradeControlCenter } from "./_shared";

export default function TradeOverviewPage() {
  const [data, setData] = useState<TradeControlCenter>({
    summary: {
      shipmentCount: 0,
      activeLcCount: 0,
      openCustomsCount: 0,
      rebateCount: 0,
      shipmentValue: 0,
      lcValue: 0,
      landedCost: 0,
      rebateValue: 0,
      openCustomsPayable: 0,
      shipmentFreight: 0,
    },
    shipments: [],
    lcs: [],
    customs: [],
    costings: [],
    rebates: [],
  });

  useEffect(() => {
    fetchJson<TradeControlCenter>("/api/trade/control-center", {
      summary: {
        shipmentCount: 0,
        activeLcCount: 0,
        openCustomsCount: 0,
        rebateCount: 0,
        shipmentValue: 0,
        lcValue: 0,
        landedCost: 0,
        rebateValue: 0,
        openCustomsPayable: 0,
        shipmentFreight: 0,
      },
      shipments: [],
      lcs: [],
      customs: [],
      costings: [],
      rebates: [],
    }).then(setData);
  }, []);

  const shipments = data.shipments;
  const lcs = data.lcs;
  const customs = data.customs;
  const costings = data.costings;
  const rebates = data.rebates;

  return (
    <div style={{ minHeight: "100vh", padding: "28px 32px", color: "var(--text-primary)", fontFamily: tradeFont }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800 }}>Import / Export Command Center</h1>
          <p style={{ margin: 0, fontSize: 13, color: tradeMuted }}>Shipments, export documents, LC desk, customs, costing, and rebate tracking.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "Shipments", href: "/dashboard/trade/shipments" },
            { label: "Commercial Invoice", href: "/dashboard/commercial-invoice" },
            { label: "Packing List", href: "/dashboard/packing-list" },
            { label: "LC / TT", href: "/dashboard/trade/lc" },
            { label: "Customs", href: "/dashboard/trade/customs" },
            { label: "Import Costing", href: "/dashboard/trade/costing" },
            { label: "Rebate", href: "/dashboard/trade/rebate" },
            { label: "Analytics", href: "/dashboard/trade/analytics" },
          ].map((item) => (
            <Link key={item.href} href={item.href} style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${tradeBorder}`, background: tradeBg, color: "#7dd3fc", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[ 
          { label: "Shipments", value: data.summary.shipmentCount, color: "#38bdf8" },
          { label: "Active LC / TT", value: data.summary.activeLcCount, color: "#a78bfa" },
          { label: "Customs Open", value: data.summary.openCustomsCount, color: "#f59e0b" },
          { label: "Rebate Claims", value: data.summary.rebateCount, color: "#22c55e" },
        ].map((card) => (
          <div key={card.label} style={{ background: tradeBg, border: `1px solid ${tradeBorder}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: tradeMuted, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ background: tradeBg, border: `1px solid ${tradeBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${tradeBorder}`, fontSize: 15, fontWeight: 800 }}>Movement Watchlist</div>
          <div style={{ padding: 18, display: "grid", gap: 10 }}>
            {shipments.filter((row) => row.status !== "CLEARED").slice(0, 6).map((row) => (
              <div key={row.id} style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{row.ref}</div>
                <div style={{ fontSize: 12, color: tradeMuted, marginTop: 4 }}>{row.type} | {row.originPort} to {row.destinationPort}</div>
                <div style={{ fontSize: 12, color: "#7dd3fc", marginTop: 6 }}>{row.blAwbNo || "No BL/AWB"} | {row.incoterm}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: tradeBg, border: `1px solid ${tradeBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${tradeBorder}`, fontSize: 15, fontWeight: 800 }}>Financial Snapshot</div>
          <div style={{ padding: 18, display: "grid", gap: 10 }}>
            {[
              { label: "Open customs payable", value: `USD ${data.summary.openCustomsPayable.toLocaleString()}`, color: "#f59e0b" },
              { label: "Import costing booked", value: `USD ${data.summary.landedCost.toLocaleString()}`, color: "#60a5fa" },
              { label: "Export rebate claimed", value: `USD ${data.summary.rebateValue.toLocaleString()}`, color: "#34d399" },
              { label: "Shipment freight", value: `USD ${data.summary.shipmentFreight.toLocaleString()}`, color: "#f87171" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13, color: tradeMuted }}>{row.label}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
