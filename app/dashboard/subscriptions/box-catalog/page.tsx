import toast from "react-hot-toast";
"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { mapSaaSPlans, saasBg, saasBorder, saasFont, saasMuted, saasStatusColor } from "../_shared";

type BoxRecord = {
  id: string;
  title: string;
  status: string;
  amount?: number | null;
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

export default function SubscriptionBoxCatalogPage() {
  const planStore = useBusinessRecords("subscription_plan");
  const { records, loading, create, update } = useBusinessRecords("subscription_box_catalog");
  const plans = useMemo(() => mapSaaSPlans(planStore.records).filter((plan) => plan.status === "active"), [planStore.records]);
  const boxes = records as BoxRecord[];
  const [form, setForm] = useState({ title: "", planId: "", items: "", note: "", price: "79" });

  const saveBox = async () => {
    const title = form.title.trim();
    const plan = plans.find((item) => item.id === form.planId);
    const items = form.items.split(",").map((item) => item.trim()).filter(Boolean);
    const price = Number(form.price);
    if (!title) return toast.error("Box name required hai.");
    if (!plan) return toast.error("Active plan select karein.");
    if (!items.length) return toast("Kam az kam aik curated item add karein.");
    if (price <= 0) return toast("Box price valid honi chahiye.");
    if (boxes.some((item) => item.title.trim().toLowerCase() === title.toLowerCase() && item.status !== "archived")) {
      return toast.error("Is naam ka box already maujood hai.");
    }
    await create({
      title,
      status: "active",
      amount: price,
      data: {
        planId: plan.id,
        planName: plan.name,
        items,
        note: form.note.trim(),
      },
    });
    setForm({ title: "", planId: "", items: "", note: "", price: "79" });
  };

  return (
    <div style={{ padding: "28px 32px", color: "#fff", minHeight: "100vh", fontFamily: saasFont }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 900 }}>Box Catalog</h1>
        <p style={{ margin: 0, color: saasMuted, fontSize: 14 }}>Har subscription cycle ke liye curated box bundles aur plan-wise catalog yahan manage karein.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.15fr", gap: 18 }}>
        <div style={{ background: saasBg, border: `1px solid ${saasBorder}`, borderRadius: 18, padding: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>New Box</div>
          <div style={{ display: "grid", gap: 12 }}>
            <input style={inputStyle} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Box title" />
            <select style={inputStyle} value={form.planId} onChange={(e) => setForm((p) => ({ ...p, planId: e.target.value }))}>
              <option value="">Select plan</option>
              {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
            </select>
            <input style={inputStyle} value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} placeholder="Box price" />
            <textarea style={{ ...inputStyle, minHeight: 100, resize: "vertical" as const }} value={form.items} onChange={(e) => setForm((p) => ({ ...p, items: e.target.value }))} placeholder="Box items, comma separated" />
            <textarea style={{ ...inputStyle, minHeight: 90, resize: "vertical" as const }} value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} placeholder="Curation note" />
            <button style={primaryButton} onClick={saveBox}>Save Box</button>
          </div>
        </div>

        <div style={{ background: saasBg, border: `1px solid ${saasBorder}`, borderRadius: 18, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${saasBorder}`, fontSize: 16, fontWeight: 800 }}>Curated Boxes</div>
          <div style={{ display: "grid", gap: 12, padding: 18 }}>
            {!loading && boxes.length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No box bundles yet.</div>}
            {boxes.map((box) => {
              const items = Array.isArray(box.data?.items) ? (box.data.items as string[]) : [];
              return (
                <div key={box.id} style={{ border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.03)", borderRadius: 14, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800 }}>{box.title}</div>
                      <div style={{ fontSize: 12, color: saasMuted, marginTop: 6 }}>{String(box.data?.planName || "-")} | ${(Number(box.amount || 0)).toLocaleString()}</div>
                      <div style={{ fontSize: 12, color: "#93c5fd", marginTop: 8 }}>{items.join(" • ") || "No items listed"}</div>
                    </div>
                    <span style={{ padding: "4px 10px", borderRadius: 999, background: `${saasStatusColor(box.status)}20`, color: saasStatusColor(box.status), fontSize: 12, fontWeight: 700 }}>{box.status}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                    {box.status === "active" && <button style={smallButton} onClick={() => update(box.id, { status: "archived" })}>Archive</button>}
                    {box.status !== "active" && <button style={smallButton} onClick={() => update(box.id, { status: "active" })}>Activate</button>}
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
