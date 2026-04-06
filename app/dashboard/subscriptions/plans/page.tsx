import toast from "react-hot-toast";
"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { mapSaaSPlans, saasBg, saasBorder, saasFont, saasMuted, saasStatusColor } from "../_shared";

const intervals = ["Monthly", "Quarterly", "Yearly"];

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

export default function SubscriptionPlansPage() {
  const { records, loading, create, update } = useBusinessRecords("subscription_plan");
  const plans = useMemo(() => mapSaaSPlans(records), [records]);
  const [form, setForm] = useState({ name: "", interval: "Monthly", price: "99", trialDays: "14", seats: "5" });

  const addPlan = async () => {
    const name = form.name.trim();
    const price = Number(form.price);
    const trialDays = Number(form.trialDays);
    const seats = Number(form.seats);
    if (!name) return toast.error("Plan name required hai.");
    if (plans.some((plan) => plan.name.trim().toLowerCase() === name.toLowerCase() && plan.status !== "retired")) {
      return toast.error("Is name ka plan already maujood hai.");
    }
    if (price <= 0) return toast("Plan price zero se zyada honi chahiye.");
    if (trialDays < 0 || seats <= 0) return toast("Trial days aur seat limit valid honi chahiye.");
    await create({
      title: name,
      status: "active",
      amount: price,
      data: {
        interval: form.interval,
        trialDays,
        seats,
        planCode: `PLAN-${String(plans.length + 1).padStart(3, "0")}`,
        subscribers: 0,
      },
    });
    setForm({ name: "", interval: "Monthly", price: "99", trialDays: "14", seats: "5" });
  };

  return (
    <div style={{ padding: "28px 32px", color: "#fff", minHeight: "100vh", fontFamily: saasFont }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 900 }}>Subscription Plans</h1>
        <p style={{ margin: 0, color: saasMuted, fontSize: 14 }}>Pricing tiers, trial structure, aur seat packaging yahan se manage karein.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 18 }}>
        <div style={{ background: saasBg, border: `1px solid ${saasBorder}`, borderRadius: 18, padding: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>New Plan</div>
          <div style={{ display: "grid", gap: 12 }}>
            <input style={inputStyle} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Plan name" />
            <select style={inputStyle} value={form.interval} onChange={(e) => setForm((p) => ({ ...p, interval: e.target.value }))}>
              {intervals.map((interval) => <option key={interval}>{interval}</option>)}
            </select>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <input style={inputStyle} value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} placeholder="Price" />
              <input style={inputStyle} value={form.trialDays} onChange={(e) => setForm((p) => ({ ...p, trialDays: e.target.value }))} placeholder="Trial days" />
              <input style={inputStyle} value={form.seats} onChange={(e) => setForm((p) => ({ ...p, seats: e.target.value }))} placeholder="Seats" />
            </div>
            <button style={primaryButton} onClick={addPlan}>Save Plan</button>
          </div>
        </div>

        <div style={{ background: saasBg, border: `1px solid ${saasBorder}`, borderRadius: 18, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${saasBorder}`, fontSize: 16, fontWeight: 800 }}>Plan Catalog</div>
          <div style={{ display: "grid", gap: 12, padding: 18 }}>
            {!loading && plans.length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No plans yet.</div>}
            {plans.map((plan) => (
              <div key={plan.id} style={{ border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.03)", borderRadius: 14, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>{plan.name}</div>
                    <div style={{ fontSize: 12, color: saasMuted, marginTop: 6 }}>{plan.planCode} | {plan.interval} | {plan.seats} seats | {plan.trialDays}d trial</div>
                  </div>
                  <span style={{ padding: "4px 10px", borderRadius: 999, background: `${saasStatusColor(plan.status)}20`, color: saasStatusColor(plan.status), fontSize: 12, fontWeight: 700 }}>{plan.status}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, alignItems: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#93c5fd" }}>${plan.price.toLocaleString()}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {plan.status !== "active" && <button style={smallButton} onClick={() => update(plan.id, { status: "active" })}>Activate</button>}
                    {plan.status === "active" && <button style={smallButton} onClick={() => update(plan.id, { status: "retired" })}>Retire</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
