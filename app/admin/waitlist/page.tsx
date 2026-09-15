"use client";

import { useEffect, useState } from "react";

type Entry = {
  id: string;
  email: string;
  name?: string | null;
  businessType: string;
  createdAt: string;
  notified: boolean;
  notifiedAt?: string | null;
};

type ListCfg = { label: string; emoji: string };

export default function AdminWaitlistPage() {
  const [items, setItems] = useState<Entry[]>([]);
  const [counts, setCounts] = useState<Record<string, { total: number; unnotified: number }>>({});
  const [lists, setLists] = useState<Record<string, ListCfg>>({});
  const [active, setActive] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [notifying, setNotifying] = useState(false);
  const [lastResult, setLastResult] = useState<{ list: string; sent: number; total: number } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params = active === "all" ? "" : `?list=${active}`;
      const r = await fetch(`/api/admin/waitlist${params}`);
      const d = await r.json();
      setItems(d.items || []);
      setCounts(d.counts || {});
      if (d.lists) setLists(d.lists);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [active]);

  async function notifyList(list: string) {
    if (!confirm(`Email everyone waiting on "${lists[list]?.label || list}" that it's live?`)) return;
    setNotifying(true);
    setLastResult(null);
    try {
      const r = await fetch("/api/admin/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ list }),
      });
      const d = await r.json();
      setLastResult({ list, sent: d.sent ?? 0, total: d.total ?? 0 });
      load();
    } finally {
      setNotifying(false);
    }
  }

  const tabs = [{ id: "all", label: "All" }, ...Object.entries(lists).map(([id, cfg]) => ({ id, label: cfg.label }))];

  return (
    <div style={{ padding: 24, maxWidth: 1000 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Waitlist</h1>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 20 }}>
        People who asked to be notified when a Coming Soon page (careers, affiliate program) goes live.
      </p>

      {/* Summary cards */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        {Object.entries(lists).map(([id, cfg]) => (
          <div key={id} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "14px 18px", minWidth: 200 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{cfg.emoji} {cfg.label}</div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>{counts[id]?.total ?? 0}</div>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 10 }}>
              {counts[id]?.unnotified ?? 0} not yet notified
            </div>
            <button
              onClick={() => notifyList(id)}
              disabled={notifying || !(counts[id]?.unnotified > 0)}
              style={{
                padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                border: "none", background: (counts[id]?.unnotified > 0) ? "#4f46e5" : "#e5e7eb",
                color: (counts[id]?.unnotified > 0) ? "white" : "#999",
              }}
            >
              {notifying ? "Sending…" : "Notify all"}
            </button>
          </div>
        ))}
      </div>

      {lastResult && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: "#ecfdf5", color: "#065f46", fontSize: 13 }}>
          Sent {lastResult.sent} of {lastResult.total} emails for {lists[lastResult.list]?.label || lastResult.list}.
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActive(t.id)}
            style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none",
              background: active === t.id ? "#4f46e5" : "#f1f1f4",
              color: active === t.id ? "white" : "#555",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1.2fr 1fr", padding: "10px 16px", fontSize: 11, fontWeight: 800, color: "#888", textTransform: "uppercase", borderBottom: "1px solid #e5e7eb" }}>
          <span>Email</span><span>Name</span><span>List</span><span>Joined</span><span>Notified</span>
        </div>
        {loading ? (
          <div style={{ padding: 24, textAlign: "center", color: "#999", fontSize: 13 }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "#999", fontSize: 13 }}>No one has joined this waitlist yet.</div>
        ) : (
          items.map(item => (
            <div key={item.id} style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1.2fr 1fr", padding: "10px 16px", fontSize: 13, borderBottom: "1px solid #f1f1f4", alignItems: "center" }}>
              <span>{item.email}</span>
              <span style={{ color: "#666" }}>{item.name || "—"}</span>
              <span>{lists[item.businessType]?.emoji} {lists[item.businessType]?.label || item.businessType}</span>
              <span style={{ color: "#888" }}>{new Date(item.createdAt).toLocaleDateString()}</span>
              <span style={{ color: item.notified ? "#059669" : "#999" }}>{item.notified ? "✓ Notified" : "—"}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
