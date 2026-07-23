"use client";
import { useState, useMemo, useEffect } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { getCurrentUser } from "@/lib/auth";
import toast from "react-hot-toast";
import { useResponsive } from "@/hooks/useResponsive";

const REASONS = ["Damaged / Broken", "Theft / Loss", "Found (surplus)", "Expired / Disposal", "Data Correction", "Physical Count", "Other"];
const BLANK = { itemId: "", itemName: "", itemCode: "", systemQty: "", physicalQty: "", reason: REASONS[0], notes: "" };

type InventoryItem = { id: string; name: string; code?: string; qty?: number };

export default function StockAdjustmentPage() {
  const { isMobile } = useResponsive();
  const { records, loading, create, setStatus } = useBusinessRecords("stock_adjustment");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [allItems, setAllItems] = useState<InventoryItem[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [showItemDrop, setShowItemDrop] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);

  useEffect(() => {
    const u = getCurrentUser();
    const h: Record<string, string> = u ? { "x-user-id": u.id, "x-user-role": u.role ?? "", "x-company-id": u.companyId || "" } : {};
    // Load inventory with current qtys
    fetch("/api/inventory", { headers: h })
      .then(r => r.ok ? r.json() : [])
      .then(d => setAllItems(Array.isArray(d) ? d.map((i: any) => ({ id: i.itemId, name: i.name, code: i.code, qty: i.qty })) : []))
      .catch(() => {});
  }, []);

  const itemResults = itemSearch.length >= 1
    ? allItems.filter(i => i.name.toLowerCase().includes(itemSearch.toLowerCase()) || (i.code || "").toLowerCase().includes(itemSearch.toLowerCase())).slice(0, 8)
    : [];

  function selectItem(item: InventoryItem) {
    setForm(p => ({ ...p, itemId: item.id, itemName: item.name, itemCode: item.code || "", systemQty: String(item.qty ?? "") }));
    setItemSearch(item.name);
    setShowItemDrop(false);
  }

  async function handleApprove(row: { id: string; itemId?: string; physicalQty: number; reason: string }) {
    if (approving) return;
    setApproving(row.id);
    try {
      if (row.itemId) {
        const u = getCurrentUser();
        const h: Record<string, string> = { "Content-Type": "application/json", ...(u ? { "x-user-id": u.id, "x-user-role": u.role ?? "ADMIN", "x-company-id": u.companyId || "" } : {}) };
        const res = await fetch("/api/stock-adjustment", {
          method: "POST",
          headers: h,
          body: JSON.stringify({ itemId: row.itemId, physicalQty: row.physicalQty, reason: row.reason }),
        });
        const data = await res.json();
        if (!res.ok) { toast.error(data.error || "Stock adjustment failed"); return; }
        if (data.diff === 0) toast("No change — physical count matches system.");
        else toast.success(`Stock adjusted by ${data.diff > 0 ? "+" : ""}${data.diff} units.`);
      }
      await setStatus(row.id, "APPROVED");
    } catch { toast.error("Approval failed"); }
    finally { setApproving(null); }
  }

  const adjustments = useMemo(() =>
    records.map(r => ({
      id: r.id,
      adjId: r.title,
      date: r.date || r.createdAt.slice(0, 10),
      itemId: String(r.data.itemId || ""),
      itemName: String(r.data.itemName || ""),
      itemCode: String(r.data.itemCode || ""),
      systemQty: Number(r.data.systemQty || 0),
      physicalQty: Number(r.data.physicalQty || 0),
      diff: Number(r.data.diff || 0),
      reason: String(r.data.reason || ""),
      notes: String(r.data.notes || ""),
      status: r.status,
    })),
  [records]);

  const physNum = Number(form.physicalQty);
  const sysNum = Number(form.systemQty);
  const diff = form.physicalQty !== "" && form.systemQty !== "" ? physNum - sysNum : null;

  async function handleSave() {
    if (!form.itemName || form.physicalQty === "" || form.systemQty === "") return;
    setSaving(true);
    try {
      const adjId = `ADJ-${String(Date.now()).slice(-5)}`;
      const diffVal = physNum - sysNum;
      await create({
        title: adjId,
        status: "PENDING",
        date: new Date().toISOString().slice(0, 10),
        data: { itemId: form.itemId, itemName: form.itemName, itemCode: form.itemCode, systemQty: sysNum, physicalQty: physNum, diff: diffVal, reason: form.reason, notes: form.notes },
      });
      setShowModal(false);
      setForm(BLANK);
      setItemSearch("");
    } finally {
      setSaving(false);
    }
  }

  const pending = adjustments.filter(a => a.status === "PENDING").length;
  const approved = adjustments.filter(a => a.status === "APPROVED").length;
  const totalDiff = adjustments.reduce((sum, a) => sum + a.diff, 0);

  const inp = { padding: "9px 12px", background: "var(--app-bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, width: "100%", boxSizing: "border-box" as const };
  const s = { fontFamily: "'Outfit','Inter',sans-serif" };

  return (
    <div style={{ ...s, minHeight: "100vh", background: "var(--app-bg)", padding: isMobile ? "15px 11px" : "28px 24px", color: "var(--text-primary)" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');`}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>🔧 Stock Adjustment</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>Correct stock quantities after physical count or damage</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#0f172a", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + New Adjustment
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Total Adjustments", val: adjustments.length, color: "#818cf8" },
          { label: "Pending Approval", val: pending, color: "#f59e0b" },
          { label: "Approved", val: approved, color: "#10b981" },
          { label: "Net Qty Variance", val: totalDiff > 0 ? `+${totalDiff}` : String(totalDiff), color: totalDiff < 0 ? "#ef4444" : "#10b981" },
        ].map(k => (
          <div key={k.label} style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: isMobile ? "12px 10px" : "16px 20px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{loading ? "…" : k.val}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>Loading adjustments…</div>
        ) : adjustments.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>No stock adjustments yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "rgba(99,102,241,.06)" }}>
                {["Adj. ID","Date","Item","Code","System Qty","Physical Qty","Variance","Reason","Status","Action"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {adjustments.map((row, i) => (
                <tr key={row.id} style={{ borderTop: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "rgba(99,102,241,.02)" }}>
                  <td style={{ padding: "11px 14px", fontWeight: 700, color: "#f59e0b" }}>{row.adjId}</td>
                  <td style={{ padding: "11px 14px", color: "var(--text-muted)" }}>{row.date}</td>
                  <td style={{ padding: "11px 14px", fontWeight: 500 }}>{row.itemName}</td>
                  <td style={{ padding: "11px 14px", color: "var(--text-muted)" }}>{row.itemCode || "—"}</td>
                  <td style={{ padding: "11px 14px" }}>{row.systemQty}</td>
                  <td style={{ padding: "11px 14px" }}>{row.physicalQty}</td>
                  <td style={{ padding: "11px 14px", fontWeight: 700, color: row.diff < 0 ? "#ef4444" : row.diff > 0 ? "#10b981" : "var(--text-muted)" }}>
                    {row.diff > 0 ? `+${row.diff}` : row.diff}
                  </td>
                  <td style={{ padding: "11px 14px", color: "var(--text-muted)" }}>{row.reason}</td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{ background: row.status === "APPROVED" ? "rgba(16,185,129,.1)" : "rgba(245,158,11,.1)", color: row.status === "APPROVED" ? "#10b981" : "#f59e0b", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{row.status}</span>
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    {row.status === "PENDING" && (
                      <button onClick={() => handleApprove(row)} disabled={approving === row.id} style={{ background: "rgba(16,185,129,.1)", color: "#10b981", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer", opacity: approving === row.id ? 0.6 : 1 }}>
                        {approving === row.id ? "…" : "Approve"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 20 }}>
          <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 18, padding: 28, width: "100%", maxWidth: 480 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>New Stock Adjustment</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 22, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ position: "relative" }}>
                <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Search Item *</label>
                <input value={itemSearch} onChange={e => { setItemSearch(e.target.value); setShowItemDrop(true); setForm(p => ({ ...p, itemId: "", itemName: e.target.value })); }} onFocus={() => setShowItemDrop(true)} placeholder="Type item name or code…" style={{ ...inp, marginTop: 6 }} />
                {showItemDrop && itemResults.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 8, zIndex: 50, maxHeight: 200, overflowY: "auto", marginTop: 2 }}>
                    {itemResults.map(item => (
                      <button key={item.id} onMouseDown={() => selectItem(item)} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 12px", background: "none", border: "none", color: "var(--text-primary)", cursor: "pointer", fontSize: 13 }}>
                        <span style={{ fontWeight: 600 }}>{item.name}</span>
                        {item.code && <span style={{ color: "var(--text-muted)", marginLeft: 8, fontSize: 11 }}>{item.code}</span>}
                        <span style={{ float: "right", color: "#10b981", fontSize: 11 }}>Qty: {item.qty ?? "?"}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>System Qty</label>
                  <input type="number" value={form.systemQty} onChange={e => setForm(p => ({ ...p, systemQty: e.target.value }))} placeholder="120" style={{ ...inp, marginTop: 6 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Physical Count *</label>
                  <input type="number" value={form.physicalQty} onChange={e => setForm(p => ({ ...p, physicalQty: e.target.value }))} placeholder="115" style={{ ...inp, marginTop: 6 }} />
                </div>
              </div>
              {diff !== null && (
                <div style={{ padding: "12px 16px", borderRadius: 10, background: diff < 0 ? "rgba(239,68,68,.08)" : diff > 0 ? "rgba(16,185,129,.08)" : "rgba(99,102,241,.08)", border: `1px solid ${diff < 0 ? "rgba(239,68,68,.2)" : diff > 0 ? "rgba(16,185,129,.2)" : "rgba(99,102,241,.2)"}`, fontSize: 13, fontWeight: 700, color: diff < 0 ? "#ef4444" : diff > 0 ? "#10b981" : "#818cf8" }}>
                  Variance: {diff > 0 ? `+${diff}` : diff} units {diff < 0 ? "(shortage)" : diff > 0 ? "(surplus)" : "(no change)"}
                </div>
              )}
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Reason</label>
                <select value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} style={{ ...inp, marginTop: 6 }}>
                  {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Additional details…" rows={2} style={{ ...inp, marginTop: 6, resize: "vertical" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} style={{ background: "var(--app-bg)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: 10, padding: "10px 20px", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.itemName || form.physicalQty === ""} style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#0f172a", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 13, fontWeight: 700, cursor: saving ? "wait" : "pointer", opacity: (!form.itemName || form.physicalQty === "") ? 0.5 : 1 }}>
                {saving ? "Saving…" : "Submit Adjustment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
