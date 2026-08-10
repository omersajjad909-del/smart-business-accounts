"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { mapBomRecord, loadManufacturingItems, type ManufacturingItem } from "../_shared";
import { useResponsive } from "@/hooks/useResponsive";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";

const inputStyle: React.CSSProperties = {
  width: "100%", background: bg, border: `1px solid ${border}`,
  borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box",
};

type Tab = "RAW_MATERIAL" | "FINISHED";

/**
 * Materials are real inventory items now.
 *
 * This page used to keep its own `raw_material` BusinessRecord list with a
 * hand-typed stock number, so a purchase invoice for the same material updated
 * nothing here and production could not consume it. Stock and cost below come
 * from InventoryTxn — the same numbers purchasing, sales and the stock reports
 * read — and cannot be edited by hand, because stock moves through documents.
 */
export default function RawMaterialsPage() {
  const { isMobile } = useResponsive();
  const bomStore = useBusinessRecords("bom");

  const [tab, setTab] = useState<Tab>("RAW_MATERIAL");
  const [items, setItems] = useState<ManufacturingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", unit: "kg", minStock: 10, purchaseRate: 0, rate: 0 });

  const boms = useMemo(() => bomStore.records.map(mapBomRecord), [bomStore.records]);

  const reload = useCallback(async () => {
    setLoading(true);
    setItems(await loadManufacturingItems(tab));
    setLoading(false);
  }, [tab]);

  useEffect(() => { reload(); }, [reload]);

  const totalValue = items.reduce((sum, item) => sum + item.stockValue, 0);
  const lowCount = items.filter((item) => item.isLow).length;

  // Which materials a BOM depends on — a low material that nothing consumes is
  // less urgent than one three products are waiting on.
  const usedByBom = useMemo(() => {
    const counts = new Map<string, number>();
    for (const bom of boms) for (const line of bom.lines) {
      counts.set(line.itemId, (counts.get(line.itemId) || 0) + 1);
    }
    return counts;
  }, [boms]);

  async function save() {
    const name = form.name.trim();
    if (!name) { setError("Name is required."); return; }
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/manufacturing/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, name, category: tab }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Could not save the item.");
      setShowModal(false);
      setForm({ name: "", unit: "kg", minStock: 10, purchaseRate: 0, rate: 0 });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the item.");
    } finally {
      setSaving(false);
    }
  }

  const isRaw = tab === "RAW_MATERIAL";

  return (
    <div style={{ padding: isMobile ? "15px 14px" : "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22, gap: 14, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Materials & Products</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.42)", margin: 0 }}>
            Real inventory — stock and cost come from purchases and production, not typed in.
          </p>
        </div>
        <button onClick={() => { setShowModal(true); setError(""); }} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#f97316", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + New {isRaw ? "Raw Material" : "Finished Product"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {([["RAW_MATERIAL", "Raw Materials"], ["FINISHED", "Finished Products"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
            border: `1px solid ${tab === key ? "rgba(249,115,22,.45)" : border}`,
            background: tab === key ? "rgba(249,115,22,.14)" : "transparent",
            color: tab === key ? "#fb923c" : "rgba(255,255,255,.5)",
          }}>{label}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: isRaw ? "Raw Materials" : "Finished Products", value: items.length, color: "#f97316" },
          { label: "Low Stock", value: lowCount, color: lowCount ? "#ef4444" : "#22c55e" },
          { label: "Stock Value", value: `Rs. ${Math.round(totalValue).toLocaleString()}`, color: "#22c55e" },
          { label: "Linked BOMs", value: boms.length, color: "#38bdf8" },
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
                {["Item", "Unit", "In Stock", "Avg Cost", "Stock Value", isRaw ? "Used in BOMs" : "Sale Rate"].map((h, i) => (
                  <th key={h} style={{ padding: "12px 16px", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".05em", textAlign: i >= 2 ? "right" : "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} style={{ borderTop: `1px solid ${border}` }}>
                  <td style={{ padding: "12px 16px", fontSize: 13 }}>
                    <div style={{ fontWeight: 700 }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.32)" }}>{item.code}</div>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "rgba(255,255,255,.5)" }}>{item.unit}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, textAlign: "right", fontWeight: 700, color: item.isLow ? "#fca5a5" : "#e2e8f0" }}>
                    {item.currentStock}
                    {item.isLow && <span style={{ marginLeft: 6, fontSize: 10, padding: "2px 6px", borderRadius: 5, background: "rgba(239,68,68,.15)", color: "#fca5a5" }}>LOW</span>}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, textAlign: "right", color: "rgba(255,255,255,.62)" }}>Rs. {Math.round(item.unitCost).toLocaleString()}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, textAlign: "right", fontWeight: 700, color: "#22c55e" }}>Rs. {Math.round(item.stockValue).toLocaleString()}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, textAlign: "right", color: "rgba(255,255,255,.5)" }}>
                    {isRaw ? (usedByBom.get(item.id) || 0) : `Rs. ${Math.round(item.rate).toLocaleString()}`}
                  </td>
                </tr>
              ))}
              {!loading && items.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 36, textAlign: "center", color: "rgba(255,255,255,.28)", fontSize: 13 }}>
                  No {isRaw ? "raw materials" : "finished products"} yet.
                </td></tr>
              )}
              {loading && (
                <tr><td colSpan={6} style={{ padding: 36, textAlign: "center", color: "rgba(255,255,255,.28)", fontSize: 13 }}>Loading…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 16, padding: "13px 18px", borderRadius: 12, background: "rgba(56,189,248,.07)", border: "1px solid rgba(56,189,248,.2)", fontSize: 12.5, color: "rgba(255,255,255,.55)", lineHeight: 1.6 }}>
        Stock rises on a purchase invoice or GRN and falls when production consumes it — there is no manual stock field, so
        the number here always matches the stock reports and the Raw Material Stock account.
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 30, width: 500, fontFamily: ff }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>New {isRaw ? "Raw Material" : "Finished Product"}</h2>
            {error && <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,.14)", border: "1px solid rgba(239,68,68,.28)", color: "#fca5a5", fontSize: 12 }}>{error}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Name</label>
                <input value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Unit</label>
                <input value={form.unit} onChange={(e) => setForm((c) => ({ ...c, unit: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Reorder level</label>
                <input type="number" min={0} value={form.minStock} onChange={(e) => setForm((c) => ({ ...c, minStock: Number(e.target.value) }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Purchase rate (Rs.)</label>
                <input type="number" min={0} value={form.purchaseRate} onChange={(e) => setForm((c) => ({ ...c, purchaseRate: Number(e.target.value) }))} style={inputStyle} />
              </div>
              {!isRaw && (
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Sale rate (Rs.)</label>
                  <input type="number" min={0} value={form.rate} onChange={(e) => setForm((c) => ({ ...c, rate: Number(e.target.value) }))} style={inputStyle} />
                </div>
              )}
            </div>
            <div style={{ marginTop: 12, fontSize: 11.5, color: "rgba(255,255,255,.35)", lineHeight: 1.6 }}>
              Opening stock is not set here. Receive it with a purchase invoice or GRN so the cost lands in the ledger too.
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <button onClick={save} disabled={saving} style={{ flex: 1, padding: "11px 0", background: saving ? "rgba(249,115,22,.5)" : "#f97316", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "Saving…" : "Create"}
              </button>
              <button onClick={() => { setShowModal(false); setError(""); }} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.65)", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
