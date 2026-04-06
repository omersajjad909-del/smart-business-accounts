"use client";

import toast from "react-hot-toast";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { mapSaaSPlans, saasBg, saasBorder, saasFont, saasMuted, saasStatusColor } from "../_shared";

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

type TierRecord = {
  id: string;
  title: string;
  status: string;
  data: Record<string, unknown>;
};

export default function MembershipContentTiersPage() {
  const planStore = useBusinessRecords("subscription_plan");
  const { records, loading, create, update } = useBusinessRecords("membership_content_tier");
  const plans = useMemo(() => mapSaaSPlans(planStore.records).filter((plan) => plan.status === "active"), [planStore.records]);
  const tiers = records as TierRecord[];
  const [form, setForm] = useState({ title: "", planId: "", modules: "", description: "" });

  const saveTier = async () => {
    const title = form.title.trim();
    const plan = plans.find((item) => item.id === form.planId);
    const modules = form.modules
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (!title) return toast.error("Tier title required hai.");
    if (!plan) return toast.error("Active plan select karein.");
    if (!modules.length) return toast.error("Kam az kam aik content/module access required hai.");
    if (tiers.some((item) => item.title.trim().toLowerCase() === title.toLowerCase() && item.status !== "inactive")) {
      return toast.error("Is naam ka content tier already maujood hai.");
    }

    await create({
      title,
      status: "active",
      data: {
        planId: plan.id,
        planName: plan.name,
        modules,
        description: form.description.trim(),
      },
    });
    setForm({ title: "", planId: "", modules: "", description: "" });
  };

  return (
    <div style={{ padding: "28px 32px", color: "#fff", minHeight: "100vh", fontFamily: saasFont }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 900 }}>Content Tiers</h1>
        <p style={{ margin: 0, color: saasMuted, fontSize: 14 }}>Member plans ko courses, premium libraries, downloads, aur gated communities ke saath map karein.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.15fr", gap: 18 }}>
        <div style={{ background: saasBg, border: `1px solid ${saasBorder}`, borderRadius: 18, padding: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>New Content Tier</div>
          <div style={{ display: "grid", gap: 12 }}>
            <input style={inputStyle} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Tier title" />
            <select style={inputStyle} value={form.planId} onChange={(e) => setForm((p) => ({ ...p, planId: e.target.value }))}>
              <option value="">Select plan</option>
              {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
            </select>
            <textarea style={{ ...inputStyle, minHeight: 110, resize: "vertical" as const }} value={form.modules} onChange={(e) => setForm((p) => ({ ...p, modules: e.target.value }))} placeholder="Modules or content access, comma separated" />
            <textarea style={{ ...inputStyle, minHeight: 90, resize: "vertical" as const }} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Tier summary" />
            <button style={primaryButton} onClick={saveTier}>Save Tier</button>
          </div>
        </div>

        <div style={{ background: saasBg, border: `1px solid ${saasBorder}`, borderRadius: 18, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${saasBorder}`, fontSize: 16, fontWeight: 800 }}>Tier Catalog</div>
          <div style={{ display: "grid", gap: 12, padding: 18 }}>
            {!loading && tiers.length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No content tiers yet.</div>}
            {tiers.map((tier) => {
              const modules = Array.isArray(tier.data?.modules) ? (tier.data.modules as string[]) : [];
              return (
                <div key={tier.id} style={{ border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.03)", borderRadius: 14, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800 }}>{tier.title}</div>
                      <div style={{ fontSize: 12, color: saasMuted, marginTop: 6 }}>{String(tier.data?.planName || "-")}</div>
                      <div style={{ fontSize: 12, color: "#93c5fd", marginTop: 8 }}>{modules.join(" • ") || "No modules listed"}</div>
                    </div>
                    <span style={{ padding: "4px 10px", borderRadius: 999, background: `${saasStatusColor(tier.status)}20`, color: saasStatusColor(tier.status), fontSize: 12, fontWeight: 700 }}>{tier.status}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                    {tier.status === "active" && <button style={smallButton} onClick={() => update(tier.id, { status: "inactive" })}>Deactivate</button>}
                    {tier.status !== "active" && <button style={smallButton} onClick={() => update(tier.id, { status: "active" })}>Activate</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
