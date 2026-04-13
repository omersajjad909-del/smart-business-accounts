"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchJson, tradeBg, tradeBorder, tradeFont, tradeMuted, type TradeControlCenter } from "../_shared";

export default function TradeAnalyticsPage() {
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

  const routeRows = useMemo(() => {
    const bucket = new Map<string, number>();
    shipments.forEach((row) => {
      const key = `${row.originPort} -> ${row.destinationPort}`;
      bucket.set(key, (bucket.get(key) || 0) + 1);
    });
    return [...bucket.entries()].map(([route, count]) => ({ route, count })).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [shipments]);

  const statusRows = useMemo(() => {
    const bucket = new Map<string, number>();
    customs.forEach((row) => bucket.set(row.status, (bucket.get(row.status) || 0) + 1));
    return [...bucket.entries()].map(([status, count]) => ({ status, count }));
  }, [customs]);

  const lcCurrencyRows = useMemo(() => {
    const bucket = new Map<string, number>();
    lcs.forEach((row) => bucket.set(row.currency, (bucket.get(row.currency) || 0) + row.amount));
    return [...bucket.entries()].map(([currency, amount]) => ({ currency, amount })).sort((a, b) => b.amount - a.amount);
  }, [lcs]);

  return (
    <div style={{ minHeight: "100vh", padding: "28px 32px", color: "var(--text-primary)", fontFamily: tradeFont }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800 }}>Trade Analytics</h1>
        <p style={{ margin: 0, fontSize: 13, color: tradeMuted }}>Movement, compliance, finance, and claim visibility.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Shipment Value", value: `USD ${data.summary.shipmentValue.toLocaleString()}`, color: "#38bdf8" },
          { label: "LC / TT Value", value: `USD ${data.summary.lcValue.toLocaleString()}`, color: "#a78bfa" },
          { label: "Landed Cost", value: `USD ${data.summary.landedCost.toLocaleString()}`, color: "#f59e0b" },
          { label: "Rebate Value", value: `USD ${data.summary.rebateValue.toLocaleString()}`, color: "#22c55e" },
        ].map((card) => (
          <div key={card.label} style={{ background: tradeBg, border: `1px solid ${tradeBorder}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: tradeMuted, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>
        <section style={{ background: tradeBg, border: `1px solid ${tradeBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${tradeBorder}`, fontSize: 15, fontWeight: 800 }}>Top Routes</div>
          <div style={{ padding: 18, display: "grid", gap: 10 }}>
            {routeRows.map((row) => (
              <div key={row.route} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "var(--panel-bg)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13 }}>{row.route}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#7dd3fc" }}>{row.count}</span>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: tradeBg, border: `1px solid ${tradeBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${tradeBorder}`, fontSize: 15, fontWeight: 800 }}>Customs Status</div>
          <div style={{ padding: 18, display: "grid", gap: 10 }}>
            {statusRows.map((row) => (
              <div key={row.status} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "var(--panel-bg)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13 }}>{row.status}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#f59e0b" }}>{row.count}</span>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: tradeBg, border: `1px solid ${tradeBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${tradeBorder}`, fontSize: 15, fontWeight: 800 }}>LC Currency Mix</div>
          <div style={{ padding: 18, display: "grid", gap: 10 }}>
            {lcCurrencyRows.map((row) => (
              <div key={row.currency} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "var(--panel-bg)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13 }}>{row.currency}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#a78bfa" }}>{row.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
