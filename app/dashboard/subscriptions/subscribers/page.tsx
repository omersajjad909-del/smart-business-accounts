import toast from "react-hot-toast";
"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { addBillingCycle, mapSaaSPlans, mapSaaSSubscribers, saasBg, saasBorder, saasFont, saasMuted, saasStatusColor, todayIso } from "../_shared";

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

export default function SubscribersPage() {
  const planStore = useBusinessRecords("subscription_plan");
  const { records, loading, create, update } = useBusinessRecords("subscription_subscriber");
  const plans = useMemo(() => mapSaaSPlans(planStore.records).filter((plan) => plan.status === "active"), [planStore.records]);
  const subscribers = useMemo(() => mapSaaSSubscribers(records), [records]);
  const [form, setForm] = useState({ company: "", contact: "", email: "", planId: "", joinedAt: todayIso() });

  const selectedPlan = plans.find((plan) => plan.id === form.planId);

  const addSubscriber = async () => {
    if (!form.company.trim() || !form.contact.trim() || !form.email.trim()) return toast.error("Company, contact, aur email required hain.");
    if (!selectedPlan) return toast.error("Active plan select karein.");
    if (subscribers.some((row) => row.email.trim().toLowerCase() === form.email.trim().toLowerCase() && row.status !== "cancelled")) {
      return toast.error("Is email ka active subscriber already maujood hai.");
    }
    await create({
      title: form.company.trim(),
      status: selectedPlan.trialDays > 0 ? "trial" : "active",
      date: form.joinedAt,
      amount: selectedPlan.price,
      data: {
        contact: form.contact.trim(),
        email: form.email.trim(),
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        interval: selectedPlan.interval,
        renewalDate: selectedPlan.trialDays > 0 ? addBillingCycle(form.joinedAt, "Monthly") : addBillingCycle(form.joinedAt, selectedPlan.interval),
        joinedAt: form.joinedAt,
      },
    });
    await planStore.update(selectedPlan.id, { data: { subscribers: selectedPlan.subscribers + 1 } });
    setForm({ company: "", contact: "", email: "", planId: "", joinedAt: todayIso() });
  };

  return (
    <div style={{ padding: "28px 32px", color: "#fff", minHeight: "100vh", fontFamily: saasFont }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 900 }}>Subscribers</h1>
        <p style={{ margin: 0, color: saasMuted, fontSize: 14 }}>Trials, active accounts, renewals, aur churn watchlist yahan se control karein.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 18 }}>
        <div style={{ background: saasBg, border: `1px solid ${saasBorder}`, borderRadius: 18, padding: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>New Subscriber</div>
          <div style={{ display: "grid", gap: 12 }}>
            <input style={inputStyle} value={form.company} onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))} placeholder="Company name" />
            <input style={inputStyle} value={form.contact} onChange={(e) => setForm((p) => ({ ...p, contact: e.target.value }))} placeholder="Contact person" />
            <input style={inputStyle} value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="Work email" />
            <select style={inputStyle} value={form.planId} onChange={(e) => setForm((p) => ({ ...p, planId: e.target.value }))}>
              <option value="">Select plan</option>
              {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} - ${plan.price} / {plan.interval}</option>)}
            </select>
            <input type="date" style={inputStyle} value={form.joinedAt} onChange={(e) => setForm((p) => ({ ...p, joinedAt: e.target.value }))} />
            <button style={primaryButton} onClick={addSubscriber}>Add Subscriber</button>
          </div>
        </div>

        <div style={{ background: saasBg, border: `1px solid ${saasBorder}`, borderRadius: 18, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${saasBorder}`, fontSize: 16, fontWeight: 800 }}>Subscriber Desk</div>
          <div style={{ display: "grid", gap: 12, padding: 18 }}>
            {!loading && subscribers.length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No subscribers added yet.</div>}
            {subscribers.map((row) => (
              <div key={row.id} style={{ border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.03)", borderRadius: 14, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>{row.company}</div>
                    <div style={{ fontSize: 12, color: saasMuted, marginTop: 6 }}>{row.contact} | {row.email}</div>
                    <div style={{ fontSize: 12, color: "#93c5fd", marginTop: 6 }}>{row.planName} | Renewal {row.renewalDate || "-"}</div>
                  </div>
                  <span style={{ padding: "4px 10px", borderRadius: 999, background: `${saasStatusColor(row.status)}20`, color: saasStatusColor(row.status), fontSize: 12, fontWeight: 700 }}>{row.status}</span>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                  {row.status === "trial" && <button style={smallButton} onClick={() => update(row.id, { status: "active" })}>Activate</button>}
                  {row.status !== "cancelled" && <button style={smallButton} onClick={() => update(row.id, { status: "past_due" })}>Mark Past Due</button>}
                  {row.status !== "cancelled" && <button style={smallButton} onClick={() => update(row.id, { status: "cancelled" })}>Cancel</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
