"use client";

import toast from "react-hot-toast";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { addBillingCycle, mapSaaSBillingRuns, mapSaaSSubscribers, saasBg, saasBorder, saasFont, saasMuted, saasStatusColor, todayIso } from "../_shared";

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,.06)",
  border: "1px solid rgba(255,255,255,.1)",
  borderRadius: 10,
  color: "#fff",
  padding: "12px 14px",
  fontSize: 14,
};

const primaryButton: React.CSSProperties = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "12px 16px",
  fontWeight: 800,
  cursor: "pointer",
};

const smallButton: React.CSSProperties = {
  background: "rgba(37,99,235,.18)",
  color: "#bfdbfe",
  border: "1px solid rgba(96,165,250,.25)",
  borderRadius: 10,
  padding: "8px 10px",
  fontWeight: 700,
  cursor: "pointer",
};

export default function RecurringBillingPage() {
  const subscriberStore = useBusinessRecords("subscription_subscriber");
  const { records, loading, create, update } = useBusinessRecords("subscription_billing");
  const subscribers = useMemo(() => mapSaaSSubscribers(subscriberStore.records).filter((item) => item.status === "active" || item.status === "past_due"), [subscriberStore.records]);
  const billings = useMemo(() => mapSaaSBillingRuns(records), [records]);
  const [subscriberId, setSubscriberId] = useState("");

  const createRun = async () => {
    const subscriber = subscribers.find((item) => item.id === subscriberId);
    if (!subscriber) return toast.error("Subscriber select karein.");
    if (billings.some((item) => item.subscriberId === subscriber.id && item.status !== "failed" && item.status !== "paid")) {
      return toast.error("Is subscriber ka open billing run already maujood hai.");
    }
    await create({
      title: subscriber.company,
      status: "generated",
      amount: subscriber.amount,
      date: todayIso(),
      data: {
        subscriberId: subscriber.id,
        planName: subscriber.planName,
        invoiceNo: `SUB-${String(billings.length + 1).padStart(4, "0")}`,
        dueDate: subscriber.renewalDate || addBillingCycle(todayIso(), subscriber.interval),
      },
    });
    setSubscriberId("");
  };

  return (
    <div style={{ padding: "28px 32px", color: "#fff", minHeight: "100vh", fontFamily: saasFont }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 900 }}>Recurring Billing</h1>
        <p style={{ margin: 0, color: saasMuted, fontSize: 14 }}>Invoice runs, due dates, aur collection state ko subscription-wise monitor karein.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 18 }}>
        <div style={{ background: saasBg, border: `1px solid ${saasBorder}`, borderRadius: 18, padding: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>Generate Billing Run</div>
          <select style={inputStyle} value={subscriberId} onChange={(e) => setSubscriberId(e.target.value)}>
            <option value="">Select subscriber</option>
            {subscribers.map((item) => <option key={item.id} value={item.id}>{item.company} - {item.planName}</option>)}
          </select>
          <button style={{ ...primaryButton, marginTop: 12, width: "100%" }} onClick={createRun}>Generate Invoice</button>
        </div>

        <div style={{ background: saasBg, border: `1px solid ${saasBorder}`, borderRadius: 18, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${saasBorder}`, fontSize: 16, fontWeight: 800 }}>Billing Runs</div>
          <div style={{ display: "grid", gap: 12, padding: 18 }}>
            {!loading && billings.length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No billing runs yet.</div>}
            {billings.map((row) => (
              <div key={row.id} style={{ border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.03)", borderRadius: 14, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800 }}>{row.invoiceNo}</div>
                    <div style={{ fontSize: 12, color: saasMuted, marginTop: 6 }}>{row.company} | {row.planName}</div>
                    <div style={{ fontSize: 12, color: "#93c5fd", marginTop: 6 }}>Due {row.dueDate || "-"}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "#34d399" }}>${row.amount.toLocaleString()}</div>
                    <span style={{ padding: "4px 10px", borderRadius: 999, background: `${saasStatusColor(row.status)}20`, color: saasStatusColor(row.status), fontSize: 12, fontWeight: 700 }}>{row.status}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  {row.status !== "paid" && <button style={smallButton} onClick={() => update(row.id, { status: "paid", data: { paidAt: todayIso() } })}>Mark Paid</button>}
                  {row.status !== "failed" && row.status !== "paid" && <button style={smallButton} onClick={() => update(row.id, { status: "failed" })}>Mark Failed</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
