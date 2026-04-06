"use client";

import toast from "react-hot-toast";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { mapSaaSSubscribers, saasBg, saasBorder, saasFont, saasMuted, saasStatusColor, todayIso } from "../_shared";

type FulfillmentRecord = {
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

export default function SubscriptionFulfillmentPage() {
  const subscriberStore = useBusinessRecords("subscription_subscriber");
  const boxStore = useBusinessRecords("subscription_box_catalog");
  const { records, loading, create, update } = useBusinessRecords("subscription_fulfillment");
  const subscribers = useMemo(() => mapSaaSSubscribers(subscriberStore.records).filter((item) => item.status === "active" || item.status === "past_due"), [subscriberStore.records]);
  const boxes = boxStore.records;
  const rows = records as FulfillmentRecord[];
  const [form, setForm] = useState({ subscriberId: "", boxId: "", dispatchDate: todayIso(), courier: "", trackingNo: "" });

  const saveRun = async () => {
    const subscriber = subscribers.find((item) => item.id === form.subscriberId);
    const box = boxes.find((item) => item.id === form.boxId);
    if (!subscriber) return toast.error("Subscriber select karein.");
    if (!box) return toast.error("Curated box select karein.");
    if (!form.courier.trim()) return toast.error("Courier required hai.");
    if (rows.some((item) => item.data?.subscriberId === subscriber.id && item.data?.boxId === box.id && item.status !== "delivered")) {
      return toast.error("Is member ke liye is box ka active fulfillment run already hai.");
    }
    await create({
      title: subscriber.company,
      status: "packed",
      date: form.dispatchDate,
      data: {
        subscriberId: subscriber.id,
        boxId: box.id,
        boxName: box.title,
        courier: form.courier.trim(),
        trackingNo: form.trackingNo.trim() || `BOX-${String(rows.length + 1).padStart(4, "0")}`,
      },
    });
    setForm({ subscriberId: "", boxId: "", dispatchDate: todayIso(), courier: "", trackingNo: "" });
  };

  return (
    <div style={{ padding: "28px 32px", color: "#fff", minHeight: "100vh", fontFamily: saasFont }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 900 }}>Fulfillment Cycles</h1>
        <p style={{ margin: 0, color: saasMuted, fontSize: 14 }}>Packing, dispatch, tracking, aur delivered lifecycle ko member-wise manage karein.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 18 }}>
        <div style={{ background: saasBg, border: `1px solid ${saasBorder}`, borderRadius: 18, padding: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>New Fulfillment Run</div>
          <div style={{ display: "grid", gap: 12 }}>
            <select style={inputStyle} value={form.subscriberId} onChange={(e) => setForm((p) => ({ ...p, subscriberId: e.target.value }))}>
              <option value="">Select member</option>
              {subscribers.map((subscriber) => <option key={subscriber.id} value={subscriber.id}>{subscriber.company}</option>)}
            </select>
            <select style={inputStyle} value={form.boxId} onChange={(e) => setForm((p) => ({ ...p, boxId: e.target.value }))}>
              <option value="">Select box</option>
              {boxes.map((box) => <option key={box.id} value={box.id}>{box.title}</option>)}
            </select>
            <input type="date" style={inputStyle} value={form.dispatchDate} onChange={(e) => setForm((p) => ({ ...p, dispatchDate: e.target.value }))} />
            <input style={inputStyle} value={form.courier} onChange={(e) => setForm((p) => ({ ...p, courier: e.target.value }))} placeholder="Courier" />
            <input style={inputStyle} value={form.trackingNo} onChange={(e) => setForm((p) => ({ ...p, trackingNo: e.target.value }))} placeholder="Tracking no (optional)" />
            <button style={primaryButton} onClick={saveRun}>Create Fulfillment</button>
          </div>
        </div>

        <div style={{ background: saasBg, border: `1px solid ${saasBorder}`, borderRadius: 18, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${saasBorder}`, fontSize: 16, fontWeight: 800 }}>Dispatch Watchlist</div>
          <div style={{ display: "grid", gap: 12, padding: 18 }}>
            {!loading && rows.length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No fulfillment cycles yet.</div>}
            {rows.map((row) => (
              <div key={row.id} style={{ border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.03)", borderRadius: 14, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>{row.title}</div>
                    <div style={{ fontSize: 12, color: saasMuted, marginTop: 6 }}>{String(row.data?.boxName || "-")} | {String(row.data?.courier || "-")}</div>
                    <div style={{ fontSize: 12, color: "#93c5fd", marginTop: 8 }}>{String(row.data?.trackingNo || "-")} | Dispatch {String(row.date || "-")}</div>
                  </div>
                  <span style={{ padding: "4px 10px", borderRadius: 999, background: `${saasStatusColor(row.status)}20`, color: saasStatusColor(row.status), fontSize: 12, fontWeight: 700 }}>{row.status}</span>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                  {row.status === "packed" && <button style={smallButton} onClick={() => update(row.id, { status: "dispatched" })}>Dispatch</button>}
                  {row.status === "dispatched" && <button style={smallButton} onClick={() => update(row.id, { status: "delivered" })}>Mark Delivered</button>}
                  {row.status !== "cancelled" && row.status !== "delivered" && <button style={smallButton} onClick={() => update(row.id, { status: "cancelled" })}>Cancel</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
