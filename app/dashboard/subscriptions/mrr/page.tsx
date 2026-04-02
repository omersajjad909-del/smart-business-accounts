"use client";

import { useMemo } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { formatMoney, mapSaaSBillingRuns, mapSaaSSubscribers, saasBg, saasBorder, saasFont, saasMuted } from "../_shared";

export default function MrrArrPage() {
  const subscriberStore = useBusinessRecords("subscription_subscriber");
  const billingStore = useBusinessRecords("subscription_billing");
  const subscribers = useMemo(() => mapSaaSSubscribers(subscriberStore.records), [subscriberStore.records]);
  const billings = useMemo(() => mapSaaSBillingRuns(billingStore.records), [billingStore.records]);

  const mrr = subscribers
    .filter((item) => item.status === "active" || item.status === "past_due")
    .reduce((sum, item) => sum + (item.interval === "Yearly" ? item.amount / 12 : item.interval === "Quarterly" ? item.amount / 3 : item.amount), 0);
  const arr = mrr * 12;
  const churn = subscribers.length ? Math.round((subscribers.filter((item) => item.status === "cancelled").length / subscribers.length) * 100) : 0;
  const collected = billings.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amount, 0);
  const overdue = subscribers.filter((item) => item.status === "past_due").reduce((sum, item) => sum + item.amount, 0);

  return (
    <div style={{ padding: "28px 32px", color: "#fff", minHeight: "100vh", fontFamily: saasFont }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 900 }}>MRR / ARR</h1>
        <p style={{ margin: 0, color: saasMuted, fontSize: 14 }}>Recurring revenue, churn pressure, aur collection quality ka clean SaaS snapshot.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "MRR", value: formatMoney(Math.round(mrr)), color: "#34d399" },
          { label: "ARR", value: formatMoney(Math.round(arr)), color: "#60a5fa" },
          { label: "Collected", value: formatMoney(Math.round(collected)), color: "#c084fc" },
          { label: "Churn", value: `${churn}%`, color: "#f59e0b" },
        ].map((card) => (
          <div key={card.label} style={{ background: saasBg, border: `1px solid ${saasBorder}`, borderRadius: 16, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: saasMuted, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ background: saasBg, border: `1px solid ${saasBorder}`, borderRadius: 18, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Plan Mix</div>
          <div style={{ display: "grid", gap: 10 }}>
            {Array.from(new Set(subscribers.map((item) => item.planName))).map((planName) => {
              const list = subscribers.filter((item) => item.planName === planName && item.status !== "cancelled");
              const value = list.reduce((sum, item) => sum + item.amount, 0);
              return (
                <div key={planName} style={{ display: "flex", justifyContent: "space-between", borderRadius: 12, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.03)", padding: "10px 12px" }}>
                  <span style={{ fontSize: 13, color: saasMuted }}>{planName}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#bfdbfe" }}>{list.length} accounts | {formatMoney(value)}</span>
                </div>
              );
            })}
            {subscribers.length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No subscriber data yet.</div>}
          </div>
        </div>

        <div style={{ background: saasBg, border: `1px solid ${saasBorder}`, borderRadius: 18, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Revenue Pressure</div>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              { label: "Past due exposure", value: formatMoney(Math.round(overdue)), color: "#f97316" },
              { label: "Trial to active pipeline", value: subscribers.filter((item) => item.status === "trial").length, color: "#60a5fa" },
              { label: "Cancelled accounts", value: subscribers.filter((item) => item.status === "cancelled").length, color: "#f87171" },
              { label: "Active accounts", value: subscribers.filter((item) => item.status === "active").length, color: "#34d399" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", borderRadius: 12, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.03)", padding: "10px 12px" }}>
                <span style={{ fontSize: 13, color: saasMuted }}>{row.label}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
