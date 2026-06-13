"use client";
import { useState, useMemo, useEffect } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { getCurrentUser } from "@/lib/auth";
import toast from "react-hot-toast";

const STATUS_COLOR: Record<string, string> = { COMPLETED: "#10b981", IN_TRANSIT: "#f59e0b", PENDING: "#6366f1" };

type Branch = { id: string; name: string; code: string; isActive: boolean };
type InventoryItem = { id: string; name: string; code?: string; qty?: number };
type TransferRow = { itemId: string; itemName: string; qty: string; search: string; showDrop: boolean };

const emptyRow = (): TransferRow => ({ itemId: "", itemName: "", qty: "", search: "", showDrop: false });

export default function StockTransferPage() {
  const { records, loading, create, setStatus } = useBusinessRecords("stock_transfer");
  const [showModal, setShowModal] = useState(false);
  const [fromBranch, setFromBranch] = useState("");
  const [toBranch, setToBranch]   = useState("");
  const [notes, setNotes]         = useState("");
  const [rows, setRows]           = useState<TransferRow[]>([emptyRow()]);
  const [saving, setSaving]       = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);
  const [branches, setBranches]   = useState<Branch[]>([]);
  const [allItems, setAllItems]   = useState<InventoryItem[]>([]);

  useEffect(() => {
    const u = getCurrentUser();
    const h: Record<string, string> = u ? { "x-user-id": u.id, "x-user-role": u.role ?? "", "x-company-id": u.companyId || "" } : {};
    fetch("/api/branches", { headers: h })
      .then(r => r.ok ? r.json() : [])
      .then(d => setBranches(Array.isArray(d) ? d.filter((b: Branch) => b.isActive) : []));
    fetch("/api/inventory", { headers: h })
      .then(r => r.ok ? r.json() : [])
      .then(d => setAllItems(Array.isArray(d) ? d.map((i: any) => ({ id: i.itemId, name: i.name, code: i.code, qty: i.qty })) : []));
  }, []);

  const transfers = useMemo(() =>
    records.map(r => ({
      id: r.id,
      transferId: r.title,
      date: r.date || r.createdAt.slice(0, 10),
      fromBranch: String(r.data.fromBranch || ""),
      toBranch: String(r.data.toBranch || ""),
      itemCount: Number(r.data.itemCount || 0),
      structuredItems: Array.isArray(r.data.structuredItems) ? r.data.structuredItems as { itemId: string; itemName: string; qty: number }[] : [],
      notes: String(r.data.notes || ""),
      status: r.status,
    })),
  [records]);

  function updateRow(idx: number, field: keyof TransferRow, val: string | boolean) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  }
  function selectItem(idx: number, item: InventoryItem) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, itemId: item.id, itemName: item.name, search: item.name, showDrop: false } : r));
  }
  function addRow() { setRows(prev => [...prev, emptyRow()]); }
  function removeRow(idx: number) { if (rows.length > 1) setRows(prev => prev.filter((_, i) => i !== idx)); }

  async function handleSave() {
    if (!fromBranch || !toBranch) return;
    const validRows = rows.filter(r => r.itemId && r.qty && Number(r.qty) > 0);
    if (validRows.length === 0) return;
    setSaving(true);
    try {
      const tId = `TRF-${String(Date.now()).slice(-5)}`;
      await create({
        title: tId,
        status: "PENDING",
        date: new Date().toISOString().slice(0, 10),
        data: {
          fromBranch, toBranch,
          itemCount: validRows.length,
          structuredItems: validRows.map(r => ({ itemId: r.itemId, itemName: r.itemName, qty: Number(r.qty) })),
          notes,
        },
      });
      setShowModal(false);
      setFromBranch(""); setToBranch(""); setNotes(""); setRows([emptyRow()]);
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete(transfer: typeof transfers[0]) {
    if (completing) return;
    setCompleting(transfer.id);
    try {
      const u = getCurrentUser();
      const h = { "Content-Type": "application/json", ...(u ? { "x-user-id": u.id, "x-user-role": u.role ?? "ADMIN", "x-company-id": u.companyId || "" } : {}) };
      // Create InventoryTxn pairs for each transferred item
      if (transfer.structuredItems.length > 0) {
        for (const item of transfer.structuredItems) {
          if (!item.itemId || !item.qty) continue;
          // OUT from source branch
          await fetch("/api/inventory-txn", {
            method: "POST",
            headers: h,
            body: JSON.stringify({ type: "TRANSFER_OUT", itemId: item.itemId, qty: -item.qty, location: transfer.fromBranch, date: new Date().toISOString(), rate: 0, amount: 0 }),
          }).catch(() => {});
          // IN to destination branch
          await fetch("/api/inventory-txn", {
            method: "POST",
            headers: h,
            body: JSON.stringify({ type: "TRANSFER_IN", itemId: item.itemId, qty: item.qty, location: transfer.toBranch, date: new Date().toISOString(), rate: 0, amount: 0 }),
          }).catch(() => {});
        }
      }
      await setStatus(transfer.id, "COMPLETED");
      toast.success(`Transfer ${transfer.transferId} completed`);
    } catch { toast.error("Completion failed"); }
    finally { setCompleting(null); }
  }

  const inp = { padding: "9px 12px", background: "var(--app-bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, width: "100%", boxSizing: "border-box" as const };
  const s = { fontFamily: "'Outfit','Inter',sans-serif" };

  return (
    <div style={{ ...s, minHeight: "100vh", background: "var(--app-bg)", padding: "28px 24px", color: "var(--text-primary)" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');`}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>🔄 Stock Transfer</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>Move inventory between branches</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          + New Transfer
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total Transfers", val: transfers.length, color: "#818cf8" },
          { label: "Pending", val: transfers.filter(t => t.status === "PENDING").length, color: "#6366f1" },
          { label: "In Transit", val: transfers.filter(t => t.status === "IN_TRANSIT").length, color: "#f59e0b" },
          { label: "Completed", val: transfers.filter(t => t.status === "COMPLETED").length, color: "#10b981" },
        ].map(k => (
          <div key={k.label} style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 20px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{loading ? "…" : k.val}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>Loading transfers…</div>
        ) : transfers.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>No stock transfers yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "rgba(99,102,241,.06)" }}>
                {["Transfer ID","Date","From","To","Items","Status","Action"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transfers.map((row, i) => (
                <tr key={row.id} style={{ borderTop: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "rgba(99,102,241,.02)" }}>
                  <td style={{ padding: "11px 14px", fontWeight: 700, color: "#818cf8" }}>{row.transferId}</td>
                  <td style={{ padding: "11px 14px", color: "var(--text-muted)" }}>{row.date}</td>
                  <td style={{ padding: "11px 14px" }}>{row.fromBranch}</td>
                  <td style={{ padding: "11px 14px" }}>{row.toBranch}</td>
                  <td style={{ padding: "11px 14px" }}>{row.itemCount} item(s)</td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{ background: (STATUS_COLOR[row.status] || "#94a3b8") + "20", color: STATUS_COLOR[row.status] || "#94a3b8", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{row.status.replace("_", " ")}</span>
                  </td>
                  <td style={{ padding: "11px 14px", display: "flex", gap: 6 }}>
                    {row.status === "PENDING" && (
                      <button onClick={() => setStatus(row.id, "IN_TRANSIT")} style={{ background: "rgba(245,158,11,.1)", color: "#f59e0b", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>Dispatch</button>
                    )}
                    {row.status === "IN_TRANSIT" && (
                      <button onClick={() => handleComplete(row)} disabled={completing === row.id} style={{ background: "rgba(16,185,129,.1)", color: "#10b981", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer", opacity: completing === row.id ? 0.6 : 1 }}>
                        {completing === row.id ? "…" : "Receive"}
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
          <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 18, padding: 28, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>New Stock Transfer</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 22, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>From Branch *</label>
                  <select value={fromBranch} onChange={e => setFromBranch(e.target.value)} style={{ ...inp, marginTop: 6 }}>
                    <option value="">— Select —</option>
                    {branches.filter(b => b.name !== toBranch).map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>To Branch *</label>
                  <select value={toBranch} onChange={e => setToBranch(e.target.value)} style={{ ...inp, marginTop: 6 }}>
                    <option value="">— Select —</option>
                    {branches.filter(b => b.name !== fromBranch).map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Item rows */}
              <div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, marginBottom: 8 }}>Items to Transfer *</div>
                {rows.map((row, idx) => {
                  const results = row.search.length >= 1
                    ? allItems.filter(i => i.name.toLowerCase().includes(row.search.toLowerCase()) || (i.code || "").toLowerCase().includes(row.search.toLowerCase())).slice(0, 6)
                    : [];
                  return (
                    <div key={idx} style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 80px 32px", gap: 8, marginBottom: 8 }}>
                      <div style={{ position: "relative" }}>
                        <input
                          value={row.search}
                          onChange={e => { updateRow(idx, "search", e.target.value); updateRow(idx, "showDrop", true); updateRow(idx, "itemId", ""); }}
                          onFocus={() => updateRow(idx, "showDrop", true)}
                          placeholder="Search item…"
                          style={inp}
                        />
                        {row.showDrop && results.length > 0 && (
                          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 8, zIndex: 50, maxHeight: 160, overflowY: "auto", marginTop: 2 }}>
                            {results.map(item => (
                              <button key={item.id} onMouseDown={() => selectItem(idx, item)} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", background: "none", border: "none", color: "var(--text-primary)", cursor: "pointer", fontSize: 12 }}>
                                {item.name} {item.code && <span style={{ color: "var(--text-muted)" }}>({item.code})</span>}
                                <span style={{ float: "right", color: "#10b981" }}>Qty: {item.qty ?? "?"}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <input type="number" value={row.qty} onChange={e => updateRow(idx, "qty", e.target.value)} placeholder="Qty" style={{ ...inp, textAlign: "right" }} />
                      <button onClick={() => removeRow(idx)} style={{ background: "rgba(239,68,68,.1)", color: "#ef4444", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 16, opacity: rows.length === 1 ? 0.3 : 1 }} disabled={rows.length === 1}>×</button>
                    </div>
                  );
                })}
                <button onClick={addRow} style={{ fontSize: 12, color: "#6366f1", background: "none", border: "1px dashed var(--border)", borderRadius: 8, padding: "6px 14px", cursor: "pointer", width: "100%" }}>+ Add Item</button>
              </div>

              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Notes</label>
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" style={{ ...inp, marginTop: 6 }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} style={{ background: "var(--app-bg)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: 10, padding: "10px 20px", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleSave} disabled={saving || !fromBranch || !toBranch || rows.every(r => !r.itemId)} style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 13, fontWeight: 600, cursor: saving ? "wait" : "pointer", opacity: (!fromBranch || !toBranch) ? 0.5 : 1 }}>
                {saving ? "Creating…" : "Create Transfer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
