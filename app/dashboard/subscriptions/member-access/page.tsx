"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { mapSaaSSubscribers, saasBg, saasBorder, saasFont, saasMuted, saasStatusColor, todayIso } from "../_shared";

type AccessRecord = {
  id: string;
  title: string;
  status: string;
  date?: string | null;
  data: Record<string, unknown>;
};

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

export default function MemberAccessPage() {
  const subscriberStore = useBusinessRecords("subscription_subscriber");
  const tierStore = useBusinessRecords("membership_content_tier");
  const { records, loading, create, update } = useBusinessRecords("membership_access");
  const subscribers = useMemo(() => mapSaaSSubscribers(subscriberStore.records).filter((item) => item.status !== "cancelled"), [subscriberStore.records]);
  const tiers = tierStore.records;
  const accessRows = records as AccessRecord[];
  const [form, setForm] = useState({ subscriberId: "", tierId: "", validUntil: todayIso() });

  const saveAccess = async () => {
    const subscriber = subscribers.find((item) => item.id === form.subscriberId);
    const tier = tiers.find((item) => item.id === form.tierId);
    if (!subscriber) return alert("Subscriber select karein.");
    if (!tier) return alert("Content tier select karein.");
    if (accessRows.some((row) => row.data?.subscriberId === subscriber.id && row.data?.tierId === tier.id && row.status !== "revoked")) {
      return alert("Is subscriber ka ye access pehle se active hai.");
    }
    await create({
      title: subscriber.company,
      status: subscriber.status === "active" ? "active" : "pending",
      date: todayIso(),
      data: {
        subscriberId: subscriber.id,
        subscriberEmail: subscriber.email,
        tierId: tier.id,
        tierName: tier.title,
        validUntil: form.validUntil,
      },
    });
    setForm({ subscriberId: "", tierId: "", validUntil: todayIso() });
  };

  return (
    <div style={{ padding: "28px 32px", color: "#fff", minHeight: "100vh", fontFamily: saasFont }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 900 }}>Member Access</h1>
        <p style={{ margin: 0, color: saasMuted, fontSize: 14 }}>Subscribers ko tier-based access assign karein aur revoke / renew lifecycle manage karein.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 18 }}>
        <div style={{ background: saasBg, border: `1px solid ${saasBorder}`, borderRadius: 18, padding: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Grant Access</div>
          <div style={{ display: "grid", gap: 12 }}>
            <select style={inputStyle} value={form.subscriberId} onChange={(e) => setForm((p) => ({ ...p, subscriberId: e.target.value }))}>
              <option value="">Select subscriber</option>
              {subscribers.map((subscriber) => <option key={subscriber.id} value={subscriber.id}>{subscriber.company}</option>)}
            </select>
            <select style={inputStyle} value={form.tierId} onChange={(e) => setForm((p) => ({ ...p, tierId: e.target.value }))}>
              <option value="">Select content tier</option>
              {tiers.map((tier) => <option key={tier.id} value={tier.id}>{tier.title}</option>)}
            </select>
            <input type="date" style={inputStyle} value={form.validUntil} onChange={(e) => setForm((p) => ({ ...p, validUntil: e.target.value }))} />
            <button style={primaryButton} onClick={saveAccess}>Grant Access</button>
          </div>
        </div>

        <div style={{ background: saasBg, border: `1px solid ${saasBorder}`, borderRadius: 18, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${saasBorder}`, fontSize: 16, fontWeight: 800 }}>Access Matrix</div>
          <div style={{ display: "grid", gap: 12, padding: 18 }}>
            {!loading && accessRows.length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No access records yet.</div>}
            {accessRows.map((row) => (
              <div key={row.id} style={{ border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.03)", borderRadius: 14, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>{row.title}</div>
                    <div style={{ fontSize: 12, color: saasMuted, marginTop: 6 }}>{String(row.data?.subscriberEmail || "-")}</div>
                    <div style={{ fontSize: 12, color: "#93c5fd", marginTop: 8 }}>{String(row.data?.tierName || "-")} | Valid until {String(row.data?.validUntil || "-")}</div>
                  </div>
                  <span style={{ padding: "4px 10px", borderRadius: 999, background: `${saasStatusColor(row.status)}20`, color: saasStatusColor(row.status), fontSize: 12, fontWeight: 700 }}>{row.status}</span>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  {row.status !== "active" && <button style={smallButton} onClick={() => update(row.id, { status: "active" })}>Activate</button>}
                  {row.status !== "revoked" && <button style={smallButton} onClick={() => update(row.id, { status: "revoked" })}>Revoke</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
