"use client";

import { useCallback, useEffect, useState } from "react";
import { loadManufacturingItems, type ManufacturingItem } from "../_shared";
import { useResponsive } from "@/hooks/useResponsive";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";
const red = "#f87171";

const inputStyle: React.CSSProperties = {
  width: "100%", background: bg, border: `1px solid ${border}`,
  borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box",
};

const REASONS = ["Cutting / Trim Loss", "Damaged", "Expired", "Process Waste", "Other"];

type WastageEntry = {
  id: string;
  date: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  unit: string;
  qty: number;
  valueLost: number;
  reason: string;
  notes: string;
};

/**
 * What's left of a raw material after cutting, trimming or spoilage and can't
 * go back on the shelf — logged here in the item's own unit (kg, meters,
 * pcs…) and dropped straight off stock, so the raw material screen and the
 * stock reports fall by the same amount instead of quietly disagreeing.
 */
export default function WastagePage() {
  const { isMobile } = useResponsive();

  const [materials, setMaterials] = useState<ManufacturingItem[]>([]);
  const [entries, setEntries] = useState<WastageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ itemId: "", qty: "", reason: REASONS[0], notes: "" });

  const reload = useCallback(async () => {
    setLoading(true);
    const [mats, log] = await Promise.all([
      loadManufacturingItems("RAW_MATERIAL"),
      fetch("/api/manufacturing/wastage", { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ]);
    setMaterials(mats);
    setEntries(Array.isArray(log) ? log : []);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const selected = materials.find((m) => m.id === form.itemId) || null;
  const totalQty = entries.reduce((sum, e) => sum + e.qty, 0);
  const totalValue = entries.reduce((sum, e) => sum + e.valueLost, 0);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMonthValue = entries.filter((e) => e.date.startsWith(thisMonth)).reduce((sum, e) => sum + e.valueLost, 0);

  async function save() {
    const itemId = form.itemId;
    const qty = Number(form.qty);
    if (!itemId) { setError("Pick a raw material."); return; }
    if (!Number.isFinite(qty) || qty <= 0) { setError("Enter a quantity greater than zero."); return; }
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/manufacturing/wastage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, qty, reason: form.reason, notes: form.notes }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Could not record wastage.");
      setShowModal(false);
      setForm({ itemId: "", qty: "", reason: REASONS[0], notes: "" });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record wastage.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: isMobile ? "15px 14px" : "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22, gap: 14, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Wastage</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.42)", margin: 0 }}>
            Leftover raw material that can&apos;t be used again — logged in kg, meters or pcs and taken off stock.
          </p>
        </div>
        <button onClick={() => { setShowModal(true); setError(""); }} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: red, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + Log Wastage
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Wastage Entries", value: entries.length, color: "#f87171" },
          { label: "Total Qty Wasted", value: totalQty.toLocaleString(undefined, { maximumFractionDigits: 2 }), color: "#fb923c" },
          { label: "Value Lost", value: `Rs. ${Math.round(totalValue).toLocaleString()}`, color: "#f87171" },
          { label: "This Month", value: `Rs. ${Math.round(thisMonthValue).toLocaleString()}`, color: "#fb923c" },
        ].map((card) => (
          <div key={card.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: isMobile ? "12px 10px" : "18px 20px" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.48)", marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 21, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,.03)" }}>
                {["Date", "Material", "Qty Wasted", "Value Lost", "Reason", "Notes"].map((h, i) => (
                  <th key={h} style={{ padding: "12px 16px", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".05em", textAlign: i === 2 || i === 3 ? "right" : "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} style={{ borderTop: `1px solid ${border}` }}>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "rgba(255,255,255,.5)" }}>{e.date}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13 }}>
                    <div style={{ fontWeight: 700 }}>{e.itemName}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.32)" }}>{e.itemCode}</div>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, textAlign: "right", fontWeight: 700, color: red }}>{e.qty} {e.unit}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, textAlign: "right", color: "rgba(255,255,255,.62)" }}>Rs. {Math.round(e.valueLost).toLocaleString()}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "rgba(255,255,255,.5)" }}>{e.reason}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "rgba(255,255,255,.4)" }}>{e.notes || "—"}</td>
                </tr>
              ))}
              {!loading && entries.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 36, textAlign: "center", color: "rgba(255,255,255,.28)", fontSize: 13 }}>
                  No wastage logged yet.
                </td></tr>
              )}
              {loading && (
                <tr><td colSpan={6} style={{ padding: 36, textAlign: "center", color: "rgba(255,255,255,.28)", fontSize: 13 }}>Loading…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 16, padding: "13px 18px", borderRadius: 12, background: "rgba(248,113,113,.07)", border: "1px solid rgba(248,113,113,.2)", fontSize: 12.5, color: "rgba(255,255,255,.55)", lineHeight: 1.6 }}>
        Logging wastage takes it straight off the raw material&apos;s stock — the same number Raw Materials and the stock reports show, so
        there is nothing to reconcile afterwards.
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 30, width: 500, fontFamily: ff }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>Log Wastage</h2>
            {error && <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,.14)", border: "1px solid rgba(239,68,68,.28)", color: "#fca5a5", fontSize: 12 }}>{error}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Raw Material</label>
                <select value={form.itemId} onChange={(e) => setForm((c) => ({ ...c, itemId: e.target.value }))} style={inputStyle}>
                  <option value="">Select material…</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} — {m.currentStock} {m.unit} in stock</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>
                  Quantity Wasted{selected ? ` (${selected.unit})` : ""}
                </label>
                <input type="number" min={0} step="any" value={form.qty} onChange={(e) => setForm((c) => ({ ...c, qty: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Reason</label>
                <select value={form.reason} onChange={(e) => setForm((c) => ({ ...c, reason: e.target.value }))} style={inputStyle}>
                  {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
              </div>
            </div>
            {selected && Number(form.qty) > selected.currentStock && (
              <div style={{ marginTop: 12, fontSize: 12, color: "#fca5a5" }}>
                Only {selected.currentStock} {selected.unit} of {selected.name} in stock.
              </div>
            )}
            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <button onClick={save} disabled={saving} style={{ flex: 1, padding: "11px 0", background: saving ? "rgba(248,113,113,.5)" : red, border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "Saving…" : "Log Wastage"}
              </button>
              <button onClick={() => { setShowModal(false); setError(""); }} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.65)", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
