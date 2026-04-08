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
const TEXT  = "var(--text-primary)";
const MUTED = "var(--text-muted)";
const BG    = "var(--app-bg)";

type GRNItem = { itemId: string; name: string; orderedQty: string; receivedQty: string; rate: string; remarks: string };
type GRN = { id: string; grnNo: string; date: string; status: string; supplier?: { name: string }; po?: { poNo: string } | null; items: Array<{ item: { name: string }; orderedQty: number; receivedQty: number; rate: number }> };
type PO  = { id: string; poNo: string; supplier: { id: string; name: string }; items: Array<{ itemId: string; item: { id: string; name: string }; qty: number; rate: number }> };

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  RECEIVED: { bg: "rgba(52,211,153,0.12)",  text: "#34d399", border: "rgba(52,211,153,0.3)"  },
  PARTIAL:  { bg: "rgba(251,191,36,0.12)",  text: "#fbbf24", border: "rgba(251,191,36,0.3)"  },
  PENDING:  { bg: "rgba(148,163,184,0.12)", text: "#94a3b8", border: "rgba(148,163,184,0.3)" },
};

function inp(extra?: React.CSSProperties): React.CSSProperties {
  return { padding: "9px 13px", borderRadius: 8, border: `1.5px solid ${BORDER}`, background: BG, color: TEXT, fontFamily: FONT, fontSize: 13.5, outline: "none", width: "100%", boxSizing: "border-box" as const, ...extra };
}
function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10.5, color: MUTED, fontWeight: 700, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.6 }}>{children}</div>;
}

export default function GRNPage() {
  const today = new Date().toISOString().slice(0, 10);
  const user  = getCurrentUser();

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [allItems,  setAllItems]  = useState<any[]>([]);
  const [pos,       setPos]       = useState<PO[]>([]);
  const [grns,      setGrns]      = useState<GRN[]>([]);
  const [showList,  setShowList]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [preview,   setPreview]   = useState(false);
  const [printMode, setPrintMode] = useState<"a4"|"58mm">("a4");

  const [grnNo,      setGrnNo]      = useState("");
  const [date,       setDate]       = useState(today);
  const [poId,       setPoId]       = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [remarks,    setRemarks]    = useState("");
  const [rows, setRows] = useState<GRNItem[]>([
    { itemId: "", name: "", orderedQty: "", receivedQty: "", rate: "", remarks: "" },
  ]);

  function bh(): Record<string, string> {
    return { "Content-Type": "application/json", "x-company-id": user?.companyId || "", "x-user-role": user?.role || "", "x-user-id": user?.id || "" };
  }

  useEffect(() => {
    fetch("/api/accounts?type=SUPPLIER", { headers: bh() }).then(r => r.json()).then(d => {
      const list = Array.isArray(d) ? d : [];
      setSuppliers(list.filter((a: any) => a.partyType === "SUPPLIER" || a.partyType === "SUPPLIER"));
    }).catch(() => {});
    fetch("/api/items-new",     { headers: bh() }).then(r => r.json()).then(d => setAllItems(Array.isArray(d) ? d : [])).catch(() => {});
    fetch("/api/purchase-order",{ headers: bh() }).then(r => r.json()).then(d => setPos(Array.isArray(d) ? d : [])).catch(() => {});
    fetch("/api/accounts",      { headers: bh() }).then(r => r.json()).then(d => {
      const list = Array.isArray(d) ? d : [];
      setSuppliers(list.filter((a: any) => a.partyType === "SUPPLIER"));
    }).catch(() => {});
    loadGRNs();
  }, []);

  function loadGRNs() {
    fetch("/api/grn", { headers: bh() }).then(r => r.json()).then(d => setGrns(Array.isArray(d) ? d : [])).catch(() => {});
  }

  function handlePOSelect(id: string) {
    setPoId(id);
    if (!id) return;
    const po = pos.find(p => p.id === id);
    if (!po) return;
    setSupplierId(po.supplier.id);
    setRows(po.items.map(i => ({ itemId: i.itemId, name: i.item.name, orderedQty: String(i.qty), receivedQty: String(i.qty), rate: String(i.rate), remarks: "" })));
  }

  function updateRow(idx: number, field: keyof GRNItem, value: string) {
    const u = [...rows];
    u[idx] = { ...u[idx], [field]: value };
    if (field === "itemId") { const f = allItems.find((it: any) => it.id === value); if (f) u[idx].name = f.name; }
    setRows(u);
  }

  function resetForm() {
    setGrnNo(""); setDate(today); setPoId(""); setSupplierId(""); setRemarks("");
    setRows([{ itemId: "", name: "", orderedQty: "", receivedQty: "", rate: "", remarks: "" }]);
    setPreview(false);
  }

  async function handleSubmit() {
    if (!grnNo || !supplierId || rows.some(r => !r.itemId || !r.receivedQty)) {
      toast.error("GRN No, Supplier, and all item rows are required"); return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/grn", {
        method: "POST", headers: bh(),
        body: JSON.stringify({ grnNo, date, poId: poId || null, supplierId, remarks, items: rows.map(r => ({ itemId: r.itemId, orderedQty: Number(r.orderedQty) || 0, receivedQty: Number(r.receivedQty), rate: Number(r.rate) || 0, remarks: r.remarks })) }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      toast.success("GRN saved successfully!");
      setPreview(true);
      loadGRNs();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!await confirmToast("Delete this GRN?")) return;
    const res = await fetch(`/api/grn?id=${id}`, { method: "DELETE", headers: bh() });
    if (res.ok) { toast.success("Deleted"); loadGRNs(); }
    else toast.error("Delete failed");
  }

  function doPrint(mode: "a4" | "58mm") { setPrintMode(mode); setTimeout(() => window.print(), 150); }

  const totalAmt  = rows.reduce((s, r) => s + (Number(r.receivedQty) || 0) * (Number(r.rate) || 0), 0);
  const filledRows = rows.filter(r => r.name && r.receivedQty);
  const supplierName = suppliers.find(s => s.id === supplierId)?.name || "";
  const poRef = pos.find(p => p.id === poId)?.poNo || "";

  return (
    <div style={{ fontFamily: FONT, color: TEXT, minHeight: "100vh" }}>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .grn-print, .grn-print * { visibility: visible !important; }
          .grn-print { position: fixed !important; inset: 0 !important; background: white !important; color: black !important; filter: grayscale(100%) !important; }
          .grn-print.a4-print  { padding: 28px 36px !important; font-size: 12px !important; }
          .grn-print.t58-print { padding: 8px 10px !important; width: 55mm !important; font-size: 9px !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* ── Header ── */}
      <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Goods Receipt Note</h1>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: MUTED }}>{grns.length} total GRNs</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { setShowList(!showList); if (!showList) { setPreview(false); } }}
            style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${BORDER}`, background: showList ? "rgba(99,102,241,0.12)" : PANEL, color: showList ? ACCENT : TEXT, fontFamily: FONT, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {showList ? "New GRN" : `View All GRNs (${grns.length})`}
          </button>
          {showList && (
            <button onClick={() => { setShowList(false); resetForm(); }}
              style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(99,102,241,0.4)" }}>
              + New GRN
            </button>
          )}
        </div>
      </div>

      {/* ── List View ── */}
      {showList && (
        <div className="no-print" style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden", marginBottom: 24 }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "rgba(99,102,241,0.07)", borderBottom: `1px solid ${BORDER}` }}>
                  {["GRN No", "Date", "Supplier", "PO Ref", "Status", "Items", "Actions"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: MUTED, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.7, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grns.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: "48px 16px", textAlign: "center", color: MUTED }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📥</div>
                    <div style={{ fontWeight: 600 }}>No GRNs recorded yet</div>
                  </td></tr>
                ) : grns.map(grn => {
                  const sc = STATUS_COLORS[grn.status] || STATUS_COLORS.PENDING;
                  return (
                    <tr key={grn.id} style={{ borderBottom: `1px solid ${BORDER}`, transition: "background .12s" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.05)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                      <td style={{ padding: "13px 16px", fontWeight: 700, color: ACCENT, fontFamily: "monospace", fontSize: 13 }}>{grn.grnNo}</td>
                      <td style={{ padding: "13px 16px", color: MUTED, fontSize: 12 }}>{fmtDate(grn.date)}</td>
                      <td style={{ padding: "13px 16px", fontWeight: 600 }}>{grn.supplier?.name || "—"}</td>
                      <td style={{ padding: "13px 16px", color: MUTED, fontSize: 12, fontFamily: "monospace" }}>{grn.po?.poNo || "—"}</td>
                      <td style={{ padding: "13px 16px" }}>
                        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>{grn.status}</span>
                      </td>
                      <td style={{ padding: "13px 16px", color: MUTED }}>{grn.items.length} items</td>
                      <td style={{ padding: "13px 16px" }}>
                        {user?.role === "ADMIN" && (
                          <button onClick={() => handleDelete(grn.id)} style={{ padding: "5px 13px", borderRadius: 6, border: "1px solid rgba(248,113,113,0.35)", background: "rgba(248,113,113,0.07)", color: "#f87171", fontFamily: FONT, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Delete</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "11px 18px", borderTop: `1px solid ${BORDER}`, fontSize: 12, color: MUTED }}>{grns.length} goods receipt notes</div>
        </div>
      )}

      {/* ── Form ── */}
      {!showList && !preview && (
        <div className="no-print">
          <div style={{ background: PANEL, border: `1.5px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>

            {/* Form Header */}
            <div style={{ padding: "16px 22px", borderBottom: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(52,211,153,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>New Goods Receipt Note</div>
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>Record items received from supplier</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleSubmit} disabled={saving}
                  style={{ padding: "9px 22px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, boxShadow: "0 4px 14px rgba(99,102,241,0.35)" }}>
                  {saving ? "Saving…" : "Save & Preview"}
                </button>
                <button onClick={resetForm} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontFamily: FONT, fontSize: 13, cursor: "pointer" }}>Clear</button>
              </div>
            </div>

            <div style={{ padding: "22px" }}>
              {/* Row 1: GRN No, Date, Against PO, Supplier */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 18 }}>
                <div>
                  <Label>GRN Number *</Label>
                  <input value={grnNo} onChange={e => setGrnNo(e.target.value)} placeholder="GRN-001"
                    style={{ ...inp(), fontFamily: "monospace", fontWeight: 700, color: ACCENT }} />
                </div>
                <div>
                  <Label>Receipt Date *</Label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inp(), colorScheme: "dark" }} />
                </div>
                <div>
                  <Label>Against PO (optional)</Label>
                  <select value={poId} onChange={e => handlePOSelect(e.target.value)} style={{ ...inp(), colorScheme: "dark", cursor: "pointer" }}>
                    <option value="">— No PO Reference —</option>
                    {pos.map(p => <option key={p.id} value={p.id}>{p.poNo} · {p.supplier.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Supplier *</Label>
                  <select value={supplierId} onChange={e => setSupplierId(e.target.value)} style={{ ...inp(), colorScheme: "dark", cursor: "pointer" }}>
                    <option value="">— Select Supplier —</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Remarks */}
              <div style={{ marginBottom: 20 }}>
                <Label>Remarks / Notes</Label>
                <input value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Optional notes..." style={inp()} />
              </div>

              {/* Section Title */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>Items Received</span>
                <div style={{ flex: 1, height: 1, background: BORDER }} />
              </div>

              {/* Items Table */}
              <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "rgba(99,102,241,0.07)", borderBottom: `1px solid ${BORDER}` }}>
                      {[["#","left",36],["Item","left","auto"],["Ordered Qty","center",110],["Received Qty","center",110],["Rate","right",110],["Amount","right",120],["Note","left",140],["","center",36]].map(([h,a,w]) => (
                        <th key={h as string} style={{ padding: "10px 12px", textAlign: a as any, color: MUTED, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, width: w as any }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => {
                      const amt = (Number(row.receivedQty) || 0) * (Number(row.rate) || 0);
                      const isShort = row.orderedQty && row.receivedQty && Number(row.receivedQty) < Number(row.orderedQty);
                      return (
                        <tr key={idx} style={{ borderBottom: `1px solid ${BORDER}` }}>
                          <td style={{ padding: "7px 12px", color: MUTED, fontSize: 12, fontWeight: 600 }}>{idx + 1}</td>
                          <td style={{ padding: "7px 8px" }}>
                            <select value={row.itemId} onChange={e => updateRow(idx, "itemId", e.target.value)} style={{ ...inp({ padding: "7px 10px" }), colorScheme: "dark" }}>
                              <option value="">Select Item</option>
                              {allItems.map((it: any) => <option key={it.id} value={it.id}>{it.name}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: "7px 6px" }}>
                            <input type="number" value={row.orderedQty} onChange={e => updateRow(idx, "orderedQty", e.target.value)} placeholder="0"
                              style={{ ...inp({ padding: "7px 8px", textAlign: "center", color: MUTED }) }} />
                          </td>
                          <td style={{ padding: "7px 6px" }}>
                            <input type="number" value={row.receivedQty} onChange={e => updateRow(idx, "receivedQty", e.target.value)} placeholder="0"
                              style={{ ...inp({ padding: "7px 8px", textAlign: "center", color: isShort ? "#fbbf24" : "#34d399", fontWeight: 700 }) }} />
                          </td>
                          <td style={{ padding: "7px 6px" }}>
                            <input type="number" value={row.rate} onChange={e => updateRow(idx, "rate", e.target.value)} placeholder="0.00"
                              style={{ ...inp({ padding: "7px 8px", textAlign: "right" }) }} />
                          </td>
                          <td style={{ padding: "7px 12px", textAlign: "right", fontWeight: 700, color: amt > 0 ? TEXT : MUTED }}>
                            {amt > 0 ? amt.toLocaleString() : "—"}
                          </td>
                          <td style={{ padding: "7px 6px" }}>
                            <input value={row.remarks} onChange={e => updateRow(idx, "remarks", e.target.value)} placeholder="Note..."
                              style={{ ...inp({ padding: "7px 8px", fontSize: 12 }) }} />
                          </td>
                          <td style={{ padding: "7px 8px", textAlign: "center" }}>
                            <button onClick={() => setRows(rows.filter((_, i) => i !== idx))} style={{ background: "none", border: "none", cursor: "pointer", color: "#f87171", fontSize: 16, opacity: rows.length === 1 ? 0.3 : 1 }} disabled={rows.length === 1}>×</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div style={{ padding: "10px 14px", borderTop: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button onClick={() => setRows([...rows, { itemId: "", name: "", orderedQty: "", receivedQty: "", rate: "", remarks: "" }])}
                    style={{ background: "none", border: "none", cursor: "pointer", color: ACCENT, fontFamily: FONT, fontSize: 13, fontWeight: 700, padding: 0 }}>+ Add Row</button>
                  <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                    <span style={{ fontSize: 12, color: MUTED }}>{rows.filter(r => r.itemId && r.receivedQty).length} of {rows.length} rows filled</span>
                    <div style={{ background: "rgba(99,102,241,0.1)", border: `1px solid rgba(99,102,241,0.2)`, borderRadius: 8, padding: "8px 18px", textAlign: "right" }}>
                      <span style={{ fontSize: 11, color: MUTED, marginRight: 10, fontWeight: 600 }}>TOTAL</span>
                      <span style={{ fontSize: 18, fontWeight: 800, color: ACCENT }}>{totalAmt.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Preview Action Bar ── */}
      {!showList && preview && (
        <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <button onClick={() => doPrint("a4")} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#1e293b", color: "#f1f5f9", fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/></svg>
            Print A4
          </button>
          <button onClick={() => doPrint("58mm")} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#1e293b", color: "#f1f5f9", fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print 58mm
          </button>
          <button onClick={() => setPreview(false)} style={{ padding: "10px 18px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: TEXT, fontFamily: FONT, fontSize: 13, cursor: "pointer" }}>✏️ Edit</button>
          <button onClick={() => { resetForm(); }} style={{ padding: "10px 18px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontFamily: FONT, fontSize: 13, cursor: "pointer" }}>+ New GRN</button>
        </div>
      )}

      {/* ══ A4 PRINT PREVIEW ══ */}
      {!showList && preview && (
        <div className={`grn-print a4-print`} style={{
          background: "white", color: "#111", fontFamily: "'Outfit','Inter',sans-serif",
          borderRadius: 14, overflow: "hidden", boxShadow: "0 8px 50px rgba(0,0,0,0.25)",
          maxWidth: 860, margin: "0 auto 32px", display: printMode === "58mm" ? "none" : "block",
        }}>
          <div style={{ height: 5, background: "#111" }} />

          {/* Header */}
          <div style={{ padding: "28px 36px 20px", borderBottom: "1.5px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 25, fontWeight: 900, color: "#0f172a", letterSpacing: -0.8, lineHeight: 1 }}>Goods Receipt Note</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>GRN Document</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <table style={{ fontSize: 12, borderCollapse: "collapse", marginLeft: "auto" }}>
                {[["GRN No", grnNo], ["Date", fmtDate(date)], ...(poRef ? [["PO Ref", poRef]] : [])].map(([k,v]) => (
                  <tr key={k}>
                    <td style={{ padding: "2px 12px 2px 0", color: "#94a3b8", fontWeight: 600 }}>{k}</td>
                    <td style={{ padding: "2px 0", fontWeight: 800, color: "#0f172a", fontFamily: k === "GRN No" || k === "PO Ref" ? "monospace" : "inherit" }}>{v}</td>
                  </tr>
                ))}
              </table>
            </div>
          </div>

          {/* Supplier */}
          <div style={{ padding: "14px 36px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Received From (Supplier)</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>{supplierName || "—"}</div>
            {remarks && <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>Note: {remarks}</div>}
          </div>

          {/* Items */}
          <div style={{ padding: "0 36px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #0f172a" }}>
                  {[["#","left",30],["Item","left","auto"],["Ordered","center",80],["Received","center",80],["Rate","right",100],["Amount","right",110]].map(([l,a,w]) => (
                    <th key={l as string} style={{ padding: "12px 0 8px", textAlign: a as any, fontSize: 9, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8, width: w as any }}>{l}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filledRows.map((r, i) => {
                  const short = r.orderedQty && Number(r.receivedQty) < Number(r.orderedQty);
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "11px 0", fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{i + 1}</td>
                      <td style={{ padding: "11px 0" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{r.name}</div>
                        {r.remarks && <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>Note: {r.remarks}</div>}
                      </td>
                      <td style={{ padding: "11px 0", textAlign: "center", fontSize: 12, color: "#475569" }}>{r.orderedQty || "—"}</td>
                      <td style={{ padding: "11px 0", textAlign: "center", fontSize: 13, fontWeight: 700, color: short ? "#d97706" : "#059669" }}>{r.receivedQty}</td>
                      <td style={{ padding: "11px 0", textAlign: "right", fontSize: 12, color: "#475569" }}>{Number(r.rate).toLocaleString()}</td>
                      <td style={{ padding: "11px 0", textAlign: "right", fontSize: 13, fontWeight: 800, color: "#0f172a" }}>{((Number(r.receivedQty)||0)*(Number(r.rate)||0)).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div style={{ padding: "16px 36px 28px", display: "flex", justifyContent: "flex-end", borderTop: "1.5px solid #e2e8f0", marginTop: 4 }}>
            <table style={{ minWidth: 230, borderCollapse: "collapse", fontSize: 12 }}>
              <tbody>
                <tr style={{ background: "#0f172a" }}>
                  <td style={{ padding: "10px 12px", color: "white", fontWeight: 800, fontSize: 13, borderRadius: "4px 0 0 4px" }}>TOTAL AMOUNT</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: "white", fontWeight: 900, fontSize: 15, borderRadius: "0 4px 4px 0" }}>{totalAmt.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div style={{ padding: "0 36px 28px", display: "flex", gap: 32 }}>
            {["Received By", "Checked By", "Approved By"].map(label => (
              <div key={label} style={{ flex: 1, textAlign: "center", borderTop: "1.5px solid #cbd5e1", paddingTop: 7, marginTop: 40 }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ padding: "10px 36px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between" }}>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>Generated by FinovaOS · {fmtDate(new Date())}</div>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>Computer generated document</div>
          </div>
        </div>
      )}

      {/* ══ 58mm THERMAL PREVIEW ══ */}
      {!showList && preview && (
        <div className="grn-print t58-print" style={{
          background: "white", color: "#000",
          fontFamily: "'Courier New',Courier,monospace",
          width: 220, margin: "0 auto",
          padding: "10px 12px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
          borderRadius: 4,
          display: printMode === "58mm" ? "block" : "none",
        }}>
          <div style={{ textAlign: "center", borderBottom: "1px dashed #555", paddingBottom: 6, marginBottom: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1 }}>GOODS RECEIPT NOTE</div>
          </div>
          <div style={{ fontSize: 9, marginBottom: 5 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>GRN No:</span><span style={{ fontWeight: 700 }}>{grnNo}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Date:</span><span>{fmtDate(date)}</span></div>
            {poRef && <div style={{ display: "flex", justifyContent: "space-between" }}><span>PO Ref:</span><span>{poRef}</span></div>}
          </div>
          <div style={{ fontSize: 9, borderTop: "1px dashed #555", borderBottom: "1px dashed #555", padding: "4px 0", marginBottom: 5 }}>
            <div style={{ fontWeight: 700 }}>Supplier: {supplierName}</div>
          </div>
          <div style={{ fontSize: 9, marginBottom: 5 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, borderBottom: "1px solid #000", paddingBottom: 2, marginBottom: 3 }}>
              <span style={{ flex: 2 }}>Item</span>
              <span style={{ width: 24, textAlign: "right" }}>Rcv</span>
              <span style={{ width: 40, textAlign: "right" }}>Rate</span>
              <span style={{ width: 44, textAlign: "right" }}>Amt</span>
            </div>
            {filledRows.map((r, i) => (
              <div key={i} style={{ display: "flex", marginBottom: 2 }}>
                <span style={{ flex: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 76 }}>{r.name}</span>
                <span style={{ width: 24, textAlign: "right" }}>{r.receivedQty}</span>
                <span style={{ width: 40, textAlign: "right" }}>{Number(r.rate).toLocaleString()}</span>
                <span style={{ width: 44, textAlign: "right", fontWeight: 700 }}>{((Number(r.receivedQty)||0)*(Number(r.rate)||0)).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, borderTop: "1px solid #000", paddingTop: 4, display: "flex", justifyContent: "space-between", fontWeight: 900 }}>
            <span>TOTAL:</span><span>{totalAmt.toLocaleString()}</span>
          </div>
          {remarks && <div style={{ fontSize: 8, borderTop: "1px dashed #555", paddingTop: 3, marginTop: 4 }}><span style={{ fontWeight: 700 }}>Note: </span>{remarks}</div>}
          <div style={{ textAlign: "center", fontSize: 8, borderTop: "1px dashed #555", paddingTop: 4, marginTop: 4 }}>
            <div>FinovaOS · {fmtDate(new Date())}</div>
          </div>
        </div>
      )}
    </div>
  );
}
