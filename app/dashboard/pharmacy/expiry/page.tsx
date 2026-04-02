"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { mapDrugRecords, pharmacyBg, pharmacyBorder, pharmacyFont, pharmacyMuted } from "../_shared";

function getDaysUntilExpiry(dateStr: string): number {
  if (!dateStr) return 9999;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function ExpiryTrackingPage() {
  const { records, loading, update } = useBusinessRecords("drug");
  const [filter, setFilter] = useState<"all" | "critical" | "soon" | "expired">("all");

  const drugs = useMemo(() => mapDrugRecords(records).map((row) => {
    const days = getDaysUntilExpiry(row.expiryDate);
    return {
      ...row,
      daysLeft: days,
      tag: days < 0 ? "expired" : days <= 30 ? "critical" : days <= 90 ? "soon" : "ok",
    };
  }).filter((row) => row.expiryDate), [records]);

  const filtered = filter === "all" ? drugs : drugs.filter((d) => d.tag === filter);
  const expired = drugs.filter((d) => d.tag === "expired").length;
  const critical = drugs.filter((d) => d.tag === "critical").length;
  const soon = drugs.filter((d) => d.tag === "soon").length;

  const tagColor: Record<string, string> = { expired: "#ef4444", critical: "#f59e0b", soon: "#818cf8", ok: "#34d399" };

  return (
    <div style={{ padding: "28px 32px", fontFamily: pharmacyFont, color: "#fff", minHeight: "100vh" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Expiry Tracking</h1>
        <p style={{ fontSize: 13, color: pharmacyMuted, margin: 0 }}>Monitor drug expiry dates and disposal status.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 }}>
        {[{ label: "All Tracked", val: drugs.length, color: "#fb7185", key: "all" }, { label: "Expired", val: expired, color: "#ef4444", key: "expired" }, { label: "Critical (< 30d)", val: critical, color: "#f59e0b", key: "critical" }, { label: "Expiring Soon (< 90d)", val: soon, color: "#818cf8", key: "soon" }].map((s) => (
          <div key={s.label} onClick={() => setFilter(s.key as "all" | "critical" | "soon" | "expired")} style={{ background: filter === s.key ? `${s.color}15` : pharmacyBg, border: `1px solid ${filter === s.key ? s.color : pharmacyBorder}`, borderRadius: 12, padding: "20px 24px", cursor: "pointer" }}>
            <div style={{ fontSize: 13, color: pharmacyMuted, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: pharmacyMuted }}>Loading...</div>}

      <div style={{ background: pharmacyBg, border: `1px solid ${pharmacyBorder}`, borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Drug Name", "Category", "Batch No.", "Stock", "Expiry Date", "Days Left", "Status", "Action"].map((h) => (
            <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: pharmacyMuted, borderBottom: `1px solid ${pharmacyBorder}`, fontWeight: 600 }}>{h}</th>
          ))}</tr></thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id}>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 600 }}>{d.name}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{d.category}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 12, color: pharmacyMuted }}>{d.batchNo}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{d.stock}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 12 }}>{d.expiryDate}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 600, color: tagColor[d.tag] }}>{d.daysLeft < 0 ? "Expired" : `${d.daysLeft}d`}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <span style={{ display: "inline-block", background: `${tagColor[d.tag]}20`, color: tagColor[d.tag], borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 600 }}>{d.tag}</span>
                </td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  {d.tag === "expired" && d.status !== "disposed" && <button onClick={() => update(d.id, { status: "disposed" })} style={{ padding: "5px 10px", background: "rgba(239,68,68,.15)", border: "1px solid rgba(239,68,68,.3)", color: "#ef4444", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Mark Disposed</button>}
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)" }}>No drugs in this category.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
