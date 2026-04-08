"use client";
import { fmtDate } from "@/lib/dateUtils";
import { confirmToast } from "@/lib/toast-feedback";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getCurrentUser } from "@/lib/auth";

const FONT = "'Outfit','Inter',sans-serif";
const ACCENT = "#6366f1";
const PANEL = "var(--panel-bg)";
const BORDER = "var(--border)";
const TEXT = "var(--text-primary)";
const MUTED = "var(--text-muted)";
const BG = "var(--app-bg)";

type PO = {
  id: string; poNo: string; date: string; supplierId: string;
  supplier?: { name: string }; remarks?: string; approvalStatus?: string;
  items: Array<{ item: { name: string }; qty: number; rate: number }>;
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  DRAFT:    { bg: "rgba(148,163,184,0.12)", text: "#94a3b8", border: "rgba(148,163,184,0.3)" },
  PENDING:  { bg: "rgba(251,191,36,0.12)",  text: "#fbbf24", border: "rgba(251,191,36,0.3)" },
  APPROVED: { bg: "rgba(52,211,153,0.12)",  text: "#34d399", border: "rgba(52,211,153,0.3)" },
  REJECTED: { bg: "rgba(248,113,113,0.12)", text: "#f87171", border: "rgba(248,113,113,0.3)" },
};

function inp(extra?: React.CSSProperties): React.CSSProperties {
  return {
    padding: "9px 13px", borderRadius: 8, border: `1.5px solid ${BORDER}`,
    background: BG, color: TEXT, fontFamily: FONT, fontSize: 13.5, outline: "none",
    width: "100%", boxSizing: "border-box" as const, ...extra,
  };
}
function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10.5, color: MUTED, fontWeight: 700, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.6 }}>{children}</div>;
}

export default function PurchaseOrderPage() {
  const today = new Date().toISOString().slice(0, 10);
  const user = getCurrentUser();

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [pos, setPos] = useState<PO[]>([]);
  const [showList, setShowList] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [editing, setEditing] = useState<PO | null>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [poNo, setPoNo] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [date, setDate] = useState(today);
  const [remarks, setRemarks] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("PENDING");
  const [rows, setRows] = useState([{ itemId: "", name: "", desc: "", qty: "", rate: "" }]);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [savedPO, setSavedPO] = useState<PO | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.code === "F7") { e.preventDefault(); if (showForm && !preview) { setDate(today); setSupplierId(""); setSupplierName(""); } }
      if (e.code === "F8") {
        e.preventDefault();
        if (showForm && !preview) {
          const q = prompt("Search supplier:");
          if (q) {
            const found = suppliers.find(s => s.name.toLowerCase().includes(q.toLowerCase()));
            if (found) { setSupplierId(found.id); setSupplierName(found.name); }
            else toast.error(`No supplier found for "${q}"`);
          }
        }
      }
    }
    document.addEventListener("keydown", handleKey, true);
    return () => document.removeEventListener("keydown", handleKey, true);
  }, [today, showForm, preview, suppliers]);

  useEffect(() => {
    loadPOs(); loadCompany();
    const h = { "x-user-role": user?.role || "ADMIN", "x-user-id": user?.id || "", "x-company-id": user?.companyId || "" };
    fetch("/api/accounts", { headers: h }).then(r => r.json()).then(d => {
      const list = Array.isArray(d) ? d : d.accounts;
      setSuppliers(Array.isArray(list) ? list.filter((a: any) => a.partyType === "SUPPLIER") : []);
    }).catch(() => setSuppliers([]));
    fetch("/api/items-new", { headers: h }).then(r => r.json()).then(d => setItems(Array.isArray(d) ? d : [])).catch(() => setItems([]));
  }, []);

  async function loadCompany() {
    try { const r = await fetch("/api/me/company"); if (r.ok) setCompanyInfo(await r.json()); } catch {}
  }

  async function loadPOs() {
    try {
      const h = { "x-user-role": user?.role || "ADMIN", "x-user-id": user?.id || "", "x-company-id": user?.companyId || "" };
      const nr = await fetch("/api/purchase-order?nextNo=true", { headers: h });
      const nd = await nr.json(); if (nd?.poNo) setPoNo(nd.poNo);
      const r = await fetch("/api/purchase-order", { headers: h });
      const d = await r.json(); setPos(Array.isArray(d) ? d : []);
    } catch { setPos([]); }
  }

  function updateRow(i: number, key: string, val: any) {
    const copy = [...rows]; (copy[i] as any)[key] = val; setRows(copy);
  }
  function removeRow(i: number) { if (rows.length > 1) setRows(rows.filter((_, idx) => idx !== i)); }
  function addRow() { setRows([...rows, { itemId: "", name: "", desc: "", qty: "", rate: "" }]); }

  const total = rows.reduce((s, r) => s + (r.qty && r.rate ? Number(r.qty) * Number(r.rate) : 0), 0);

  async function savePO() {
    const clean = rows.filter(r => r.itemId && r.qty);
    if (!supplierId || !clean.length) { toast.error("Supplier and items are required"); return; }
    setSaving(true);
    try {
      const method = editing ? "PUT" : "POST";
      const body = editing ? { id: editing.id, poNo, supplierId, date, remarks, approvalStatus, items: clean }
                           : { poNo, supplierId, date, remarks, approvalStatus, items: clean };
      const res = await fetch("/api/purchase-order", {
        method, headers: { "Content-Type": "application/json", "x-user-role": user?.role || "ADMIN" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json(); setSavedPO(data); setPreview(true); await loadPOs();
        if (editing) { setEditing(null); setShowForm(false); setShowList(true); }
      } else { const e = await res.json(); toast.error(e.error || "Save failed"); }
    } catch { toast.error("Error saving PO"); }
    finally { setSaving(false); }
  }

  function startEdit(po: PO) {
    setEditing(po); setPoNo(po.poNo); setSupplierId(po.supplierId);
    setSupplierName(po.supplier?.name || ""); setDate(new Date(po.date).toISOString().slice(0, 10));
    setRemarks(po.remarks || ""); setApprovalStatus(po.approvalStatus || "PENDING");
    setRows(po.items.map((it: any) => ({ itemId: it.itemId || "", name: it.item?.name || "", desc: it.item?.description || "", qty: it.qty.toString(), rate: it.rate.toString() })));
    setShowForm(true); setShowList(false); setPreview(false);
  }

  async function deletePO(id: string) {
    if (!await confirmToast("Delete this Purchase Order?")) return;
    const res = await fetch(`/api/purchase-order?id=${id}`, { method: "DELETE", headers: { "x-user-role": user?.role || "ADMIN", "x-user-id": user?.id || "", "x-company-id": user?.companyId || "" } });
    if (res.ok) { toast.success("PO deleted"); await loadPOs(); }
    else toast.error("Delete failed");
  }

  function resetForm() {
    setEditing(null); setPoNo(""); setSupplierId(""); setSupplierName("");
    setDate(today); setRemarks(""); setApprovalStatus("PENDING");
    setRows([{ itemId: "", name: "", desc: "", qty: "", rate: "" }]); setPreview(false);
  }

  async function confirmSendEmail() {
    if (!recipientEmail.includes("@")) { toast.error("Valid email required"); return; }
    setSendingEmail(true);
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-role": user?.role || "", "x-user-id": user?.id || "" },
        body: JSON.stringify({ type: "purchase-order", invoiceId: savedPO?.id, to: recipientEmail }),
      });
      if (res.ok) { toast.success("Email sent!"); setEmailModalOpen(false); }
      else { const d = await res.json(); toast.error(d.error || "Failed"); }
    } catch { toast.error("Failed to send email"); }
    finally { setSendingEmail(false); }
  }

  const sc = STATUS_COLORS[approvalStatus] || STATUS_COLORS.PENDING;

  return (
    <div style={{ fontFamily: FONT, color: TEXT, minHeight: "100vh" }}>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .po-print, .po-print * { visibility: visible !important; }
          .po-print { position: fixed !important; inset: 0 !important; background: white !important; padding: 32px !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* ── Header ── */}
      <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Purchase Order</h1>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: MUTED }}>{pos.length} total orders</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { setShowList(!showList); if (!showList) setShowForm(false); else setShowForm(true); }}
            style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${BORDER}`, background: showList ? "rgba(99,102,241,0.12)" : PANEL, color: showList ? ACCENT : TEXT, fontFamily: FONT, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {showList ? "Hide List" : "Show List"}
          </button>
          <button onClick={() => { setShowForm(true); setShowList(false); resetForm(); loadPOs(); }}
            style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(99,102,241,0.4)" }}>
            + New PO
          </button>
        </div>
      </div>

      {/* ── List View ── */}
      {showList && (
        <div className="no-print" style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden", marginBottom: 24 }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "rgba(99,102,241,0.07)", borderBottom: `1px solid ${BORDER}` }}>
                  {["PO Number", "Date", "Supplier", "Status", "Items", "Actions"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: MUTED, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.7, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pos.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: "40px 16px", textAlign: "center", color: MUTED }}>No purchase orders yet</td></tr>
                ) : pos.map((po, i) => {
                  const sc2 = STATUS_COLORS[po.approvalStatus || "PENDING"] || STATUS_COLORS.PENDING;
                  return (
                    <tr key={po.id} style={{ borderBottom: `1px solid ${BORDER}`, transition: "background .12s" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.05)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                      <td style={{ padding: "13px 16px", fontWeight: 700, color: ACCENT, fontFamily: "monospace", fontSize: 13 }}>{po.poNo}</td>
                      <td style={{ padding: "13px 16px", color: MUTED, fontSize: 12 }}>{fmtDate(po.date)}</td>
                      <td style={{ padding: "13px 16px", fontWeight: 600 }}>{po.supplier?.name || "—"}</td>
                      <td style={{ padding: "13px 16px" }}>
                        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: sc2.bg, color: sc2.text, border: `1px solid ${sc2.border}` }}>
                          {po.approvalStatus || "PENDING"}
                        </span>
                      </td>
                      <td style={{ padding: "13px 16px", color: MUTED }}>{po.items?.length || 0} items</td>
                      <td style={{ padding: "13px 16px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => startEdit(po)} style={{ padding: "5px 13px", borderRadius: 6, border: `1px solid ${ACCENT}`, background: "rgba(99,102,241,0.1)", color: ACCENT, fontFamily: FONT, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Edit</button>
                          <button onClick={() => deletePO(po.id)} style={{ padding: "5px 13px", borderRadius: 6, border: "1px solid rgba(248,113,113,0.35)", background: "rgba(248,113,113,0.07)", color: "#f87171", fontFamily: FONT, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Del</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "11px 18px", borderTop: `1px solid ${BORDER}`, fontSize: 12, color: MUTED }}>
            {pos.length} purchase orders
          </div>
        </div>
      )}

      {/* ── Form ── */}
      {showForm && !preview && (
        <div className="no-print">
          {/* Form Header */}
          <div style={{ background: PANEL, border: `1.5px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ padding: "16px 22px", borderBottom: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(99,102,241,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{editing ? "Edit Purchase Order" : "Create Purchase Order"}</div>
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>F7 = Clear Supplier & Date &nbsp;|&nbsp; F8 = Search Supplier</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={savePO} disabled={saving} style={{ padding: "9px 22px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, boxShadow: "0 4px 14px rgba(99,102,241,0.35)" }}>
                  {saving ? "Saving…" : editing ? "Update PO" : "Save & Preview"}
                </button>
                <button onClick={() => { setShowForm(false); resetForm(); }} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontFamily: FONT, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>

            <div style={{ padding: "22px 22px" }}>
              {/* Row 1: PO No, Date, Status */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 18 }}>
                <div>
                  <Label>PO Number</Label>
                  <input value={poNo} disabled style={{ ...inp(), fontFamily: "monospace", fontWeight: 700, color: ACCENT, background: "rgba(99,102,241,0.06)", cursor: "not-allowed" }} />
                </div>
                <div>
                  <Label>Order Date</Label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inp(), colorScheme: "dark" }} />
                </div>
                <div>
                  <Label>Approval Status</Label>
                  <select value={approvalStatus} onChange={e => setApprovalStatus(e.target.value)} style={{ ...inp(), colorScheme: "dark", cursor: "pointer", color: sc.text, fontWeight: 700 }}>
                    <option value="DRAFT">Draft</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
              </div>

              {/* Supplier */}
              <div style={{ marginBottom: 20 }}>
                <Label>Supplier</Label>
                <select value={supplierId} onChange={e => { setSupplierId(e.target.value); const s = suppliers.find(x => x.id === e.target.value); setSupplierName(s?.name || ""); }} style={{ ...inp(), colorScheme: "dark", cursor: "pointer" }}>
                  <option value="">— Select Supplier —</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {/* Items Table */}
              <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "rgba(99,102,241,0.07)", borderBottom: `1px solid ${BORDER}` }}>
                      <th style={{ padding: "10px 14px", textAlign: "left", color: MUTED, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5 }}>#</th>
                      <th style={{ padding: "10px 14px", textAlign: "left", color: MUTED, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5 }}>Item</th>
                      <th style={{ padding: "10px 14px", textAlign: "center", color: MUTED, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5, width: 100 }}>Qty</th>
                      <th style={{ padding: "10px 14px", textAlign: "right", color: MUTED, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5, width: 130 }}>Rate</th>
                      <th style={{ padding: "10px 14px", textAlign: "right", color: MUTED, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5, width: 130 }}>Amount</th>
                      <th style={{ width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                        <td style={{ padding: "8px 14px", color: MUTED, fontSize: 12, fontWeight: 600 }}>{i + 1}</td>
                        <td style={{ padding: "8px 10px" }}>
                          <select value={r.itemId} onChange={e => {
                            const it = items.find(x => x.id === e.target.value);
                            if (!it) return;
                            const copy = [...rows];
                            copy[i] = { ...copy[i], itemId: it.id, name: it.name, desc: it.description || "", rate: String(it.rate || it.purchasePrice || "") };
                            setRows(copy);
                          }} style={{ ...inp({ padding: "7px 10px" }), colorScheme: "dark" }}>
                            <option value="">Select Item</option>
                            {items.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: "8px 6px" }}>
                          <input type="number" value={r.qty} onChange={e => updateRow(i, "qty", e.target.value)} placeholder="0" style={{ ...inp({ padding: "7px 8px", textAlign: "center" }) }} />
                        </td>
                        <td style={{ padding: "8px 6px" }}>
                          <input type="number" value={r.rate} onChange={e => updateRow(i, "rate", e.target.value)} placeholder="0.00" style={{ ...inp({ padding: "7px 8px", textAlign: "right" }) }} />
                        </td>
                        <td style={{ padding: "8px 14px", textAlign: "right", fontWeight: 700, fontSize: 13, color: r.qty && r.rate ? TEXT : MUTED }}>
                          {r.qty && r.rate ? (Number(r.qty) * Number(r.rate)).toLocaleString() : "—"}
                        </td>
                        <td style={{ padding: "8px 8px", textAlign: "center" }}>
                          <button onClick={() => removeRow(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#f87171", fontSize: 16, opacity: rows.length === 1 ? 0.3 : 1 }} disabled={rows.length === 1}>×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ padding: "10px 14px", borderTop: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <button onClick={addRow} style={{ background: "none", border: "none", cursor: "pointer", color: ACCENT, fontFamily: FONT, fontSize: 13, fontWeight: 700, padding: 0 }}>+ Add Row</button>
                  <div style={{ fontSize: 13, color: MUTED }}>
                    {rows.filter(r => r.itemId && r.qty).length} of {rows.length} rows filled
                  </div>
                </div>
              </div>

              {/* Remarks + Total */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 20, alignItems: "end" }}>
                <div>
                  <Label>Remarks / Notes</Label>
                  <textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Any special instructions or terms..." style={{ ...inp({ height: 80, resize: "none" as const, display: "block" }) }} />
                </div>
                <div style={{ background: "rgba(99,102,241,0.08)", border: `1px solid rgba(99,102,241,0.2)`, borderRadius: 12, padding: "16px 24px", textAlign: "right", minWidth: 200 }}>
                  <div style={{ fontSize: 11, color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Total Amount</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: ACCENT, letterSpacing: -1 }}>
                    {companyInfo?.baseCurrency || "Rs."} {total.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Preview Action Bar ── */}
      {showForm && preview && (
        <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <button onClick={() => window.print()} style={{ padding: "10px 22px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(16,185,129,0.35)" }}>
            🖨️ Print / PDF
          </button>
          <button onClick={() => { const s = suppliers.find(s => s.id === supplierId); setRecipientEmail(s?.email || ""); setEmailModalOpen(true); }} style={{ padding: "10px 22px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            📧 Send Email
          </button>
          <button onClick={() => setPreview(false)} style={{ padding: "10px 18px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: TEXT, fontFamily: FONT, fontSize: 13, cursor: "pointer" }}>
            ✏️ Edit
          </button>
          <button onClick={() => { resetForm(); loadPOs(); }} style={{ padding: "10px 18px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontFamily: FONT, fontSize: 13, cursor: "pointer" }}>
            + New PO
          </button>
        </div>
      )}

      {/* ── PRINT PREVIEW ── */}
      {showForm && preview && (
        <div className="po-print" style={{
          background: "white", color: "#111", fontFamily: "'Outfit','Inter',sans-serif",
          borderRadius: 16, overflow: "hidden",
          boxShadow: "0 8px 60px rgba(0,0,0,0.3)",
          maxWidth: 860, margin: "0 auto",
        }}>
          {/* Top color bar */}
          <div style={{ height: 6, background: "linear-gradient(90deg,#6366f1,#818cf8,#4f46e5)" }} />

          {/* Header */}
          <div style={{ padding: "32px 40px 24px", borderBottom: "2px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#0f172a", letterSpacing: -1, lineHeight: 1 }}>{companyInfo?.name || "Company Name"}</div>
              {companyInfo?.address && <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>{companyInfo.address}</div>}
              {companyInfo?.phone && <div style={{ fontSize: 12, color: "#64748b" }}>{companyInfo.phone}</div>}
              {companyInfo?.email && <div style={{ fontSize: 12, color: "#64748b" }}>{companyInfo.email}</div>}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "inline-block", background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white", padding: "6px 18px", borderRadius: 8, fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
                Purchase Order
              </div>
              <div style={{ fontSize: 13, color: "#475569" }}>
                <div style={{ display: "flex", gap: 16, justifyContent: "flex-end", marginBottom: 4 }}>
                  <span style={{ color: "#94a3b8", fontWeight: 600 }}>PO Number</span>
                  <span style={{ fontWeight: 800, color: "#0f172a", fontFamily: "monospace", fontSize: 14 }}>{poNo}</span>
                </div>
                <div style={{ display: "flex", gap: 16, justifyContent: "flex-end", marginBottom: 4 }}>
                  <span style={{ color: "#94a3b8", fontWeight: 600 }}>Date</span>
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>{fmtDate(date)}</span>
                </div>
                <div style={{ display: "flex", gap: 16, justifyContent: "flex-end" }}>
                  <span style={{ color: "#94a3b8", fontWeight: 600 }}>Status</span>
                  <span style={{ fontWeight: 800, color: approvalStatus === "APPROVED" ? "#059669" : approvalStatus === "REJECTED" ? "#dc2626" : "#d97706" }}>{approvalStatus}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Supplier Info */}
          <div style={{ padding: "20px 40px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Bill To / Supplier</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{supplierName}</div>
            {(() => { const s = suppliers.find(x => x.id === supplierId); return s ? (
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                {s.phone && <span>{s.phone} &nbsp; </span>}
                {s.city && <span>{s.city}</span>}
              </div>
            ) : null; })()}
          </div>

          {/* Items Table */}
          <div style={{ padding: "0 40px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 0 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #0f172a" }}>
                  <th style={{ padding: "14px 0 10px", textAlign: "left", fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8, width: 36 }}>#</th>
                  <th style={{ padding: "14px 0 10px", textAlign: "left", fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8 }}>Item Description</th>
                  <th style={{ padding: "14px 0 10px", textAlign: "center", fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8, width: 80 }}>Qty</th>
                  <th style={{ padding: "14px 0 10px", textAlign: "right", fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8, width: 110 }}>Unit Rate</th>
                  <th style={{ padding: "14px 0 10px", textAlign: "right", fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8, width: 120 }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.filter(r => r.name && r.qty).map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "13px 0", fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>{i + 1}</td>
                    <td style={{ padding: "13px 0" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{r.name}</div>
                      {r.desc && <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{r.desc}</div>}
                    </td>
                    <td style={{ padding: "13px 0", textAlign: "center", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{r.qty}</td>
                    <td style={{ padding: "13px 0", textAlign: "right", fontSize: 13, color: "#475569" }}>{Number(r.rate).toLocaleString()}</td>
                    <td style={{ padding: "13px 0", textAlign: "right", fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{(Number(r.qty) * Number(r.rate)).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals + Remarks */}
          <div style={{ padding: "20px 40px 32px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, borderTop: "2px solid #f1f5f9", marginTop: 4 }}>
            <div style={{ flex: 1 }}>
              {remarks && (
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderLeft: "4px solid #6366f1", borderRadius: "0 8px 8px 0", padding: "12px 16px" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Remarks</div>
                  <div style={{ fontSize: 13, color: "#475569" }}>{remarks}</div>
                </div>
              )}
            </div>
            <div style={{ minWidth: 240 }}>
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Sub Total</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{total.toLocaleString()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 16px", background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", fontWeight: 700 }}>NET TOTAL</span>
                  <span style={{ fontSize: 16, fontWeight: 900, color: "white" }}>{companyInfo?.baseCurrency || "Rs."} {total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Signature Lines */}
          <div style={{ padding: "0 40px 32px", display: "flex", gap: 40 }}>
            {["Prepared By", "Checked By", "Authorized By"].map(label => (
              <div key={label} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ borderTop: "1.5px solid #cbd5e1", paddingTop: 8, marginTop: 48 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ padding: "14px 40px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>Generated by FinovaOS · {fmtDate(new Date())}</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>This is a computer generated document</div>
          </div>
        </div>
      )}

      {/* ── Email Modal ── */}
      {emailModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 28, width: 380, fontFamily: FONT }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: TEXT, marginBottom: 18 }}>📧 Send Purchase Order</div>
            <Label>Recipient Email</Label>
            <input type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="supplier@example.com" style={{ ...inp(), marginBottom: 18 }} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setEmailModalOpen(false)} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontFamily: FONT, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={confirmSendEmail} disabled={sendingEmail} style={{ padding: "9px 22px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: sendingEmail ? 0.7 : 1 }}>
                {sendingEmail ? "Sending…" : "Send Email"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
