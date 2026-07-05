"use client";
import { fmtDate } from "@/lib/dateUtils";
import { DateInput } from "@/app/dashboard/reports/_components/DateInput";
import { confirmToast } from "@/lib/toast-feedback";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getCurrentUser } from "@/lib/auth";
import { PrintActionBar } from "@/components/print/PrintActionBar";
import { PrintDocA4, PrintPaperWrapper } from "@/components/print/PrintDocA4";

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
  const [isMobile, setIsMobile] = useState(false);

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [allItems,  setAllItems]  = useState<any[]>([]);
  const [pos,       setPos]       = useState<PO[]>([]);
  const [grns,      setGrns]      = useState<GRN[]>([]);
  const [showList,  setShowList]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [preview,   setPreview]   = useState(false);
  const [printMode, setPrintMode] = useState<"a4"|"58mm">("a4");

  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [grnNo,      setGrnNo]      = useState("");
  const [date,       setDate]       = useState(today);
  const [poId,       setPoId]       = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [remarks,    setRemarks]    = useState("");
  const [notes,      setNotes]      = useState("");
  const [rows, setRows] = useState<GRNItem[]>([
    { itemId: "", name: "", orderedQty: "", receivedQty: "", rate: "", remarks: "" },
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 900px)");
    const onChange = () => setIsMobile(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  function bh(): Record<string, string> {
    return { "Content-Type": "application/json", "x-company-id": user?.companyId || "", "x-user-role": user?.role || "", "x-user-id": user?.id || "" };
  }

  useEffect(() => {
    fetch("/api/me/company").then(r => r.ok ? r.json() : null).then(d => { if (d) setCompanyInfo(d); }).catch(() => {});
    fetch("/api/accounts",       { headers: bh() }).then(r => r.json()).then(d => {
      const list = Array.isArray(d) ? d : [];
      setSuppliers(list.filter((a: any) => a.partyType === "SUPPLIER"));
    }).catch(() => {});
    fetch("/api/items-new",     { headers: bh() }).then(r => r.json()).then(d => setAllItems(Array.isArray(d) ? d : [])).catch(() => {});
    fetch("/api/purchase-order",{ headers: bh() }).then(r => r.json()).then(d => setPos(Array.isArray(d) ? d : [])).catch(() => {});
    loadGRNs();
    loadNextGrnNo();
  }, []);

  function loadGRNs() {
    fetch("/api/grn", { headers: bh() }).then(r => r.json()).then(d => setGrns(Array.isArray(d) ? d : [])).catch(() => {});
  }

  async function loadNextGrnNo() {
    try {
      const r = await fetch("/api/grn?nextNo=true", { headers: bh() });
      const d = await r.json();
      if (d?.grnNo) setGrnNo(d.grnNo);
    } catch {}
  }

  function handlePOSelect(id: string) {
    setPoId(id);
    if (!id) return;
    const po = pos.find(p => p.id === id);
    if (!po) return;
    setSupplierId(po.supplier.id);
    setRows(po.items.map(i => ({ itemId: i.itemId, name: i.item.name, orderedQty: String(i.qty), receivedQty: String(i.qty), rate: String(i.rate || ""), remarks: "" })));
  }

  function updateRow(idx: number, field: keyof GRNItem, value: string) {
    const u = [...rows];
    u[idx] = { ...u[idx], [field]: value };
    if (field === "itemId") { const f = allItems.find((it: any) => it.id === value); if (f) u[idx].name = f.name; }
    if (idx === u.length - 1 && value !== "")
      u.push({ itemId: "", name: "", orderedQty: "", receivedQty: "", rate: "", remarks: "" });
    setRows(u);
  }

  function resetForm() {
    setDate(today); setPoId(""); setSupplierId(""); setRemarks(""); setNotes("");
    setRows([{ itemId: "", name: "", orderedQty: "", receivedQty: "", rate: "", remarks: "" }]);
    setPreview(false);
    loadNextGrnNo();
  }

  async function handleSubmit() {
    const filledItems = rows.filter(r => r.itemId && r.receivedQty);
    if (!grnNo || !supplierId || filledItems.length === 0) {
      toast.error("GRN No, Supplier, and at least one item are required"); return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/grn", {
        method: "POST", headers: bh(),
        body: JSON.stringify({ grnNo, date, poId: poId || null, supplierId, remarks, items: filledItems.map(r => ({ itemId: r.itemId, orderedQty: Number(r.orderedQty) || 0, receivedQty: Number(r.receivedQty), rate: Number(r.rate) || 0, remarks: r.remarks })) }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      toast.success("GRN saved successfully!");
      setPreview(true);
      loadGRNs();
      loadNextGrnNo();
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

  function shareWhatsApp() {
    let msg = `*GOODS RECEIPT NOTE: ${grnNo}*\nDate: ${fmtDate(date)}\nSupplier: ${supplierName}`;
    if (poRef) msg += `\nPO Ref: ${poRef}`;
    msg += `\n\nTotal: ${totalAmt.toLocaleString()}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  function sendEmail() {
    const email = prompt("Supplier email:");
    if (!email?.includes("@")) return;
    fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "generic",
        to: email,
        subject: `Goods Receipt Note ${grnNo}`,
        html: `<p>Dear ${supplierName},</p><p>Please find your Goods Receipt Note <strong>${grnNo}</strong> dated ${fmtDate(date)}.</p><p>Total received value: ${totalAmt.toLocaleString()}</p>`,
      }),
    }).then(r => r.ok ? toast.success("Email sent!") : toast.error("Email failed")).catch(() => toast.error("Email failed"));
  }

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
          {/* Page Header */}
          <div style={{ background: PANEL, border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: "14px 22px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(52,211,153,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>New Goods Receipt Note</div>
                <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>Record items received from supplier</div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 320px", gap: 20, alignItems: "start" }}>

            {/* LEFT COLUMN */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Supplier + Business Details */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
                <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: TEXT }}>Supplier Details</div>
                  <select value={supplierId} onChange={e => setSupplierId(e.target.value)} style={{ ...inp(), marginBottom: 10 }}>
                    <option value="">— Select Supplier —</option>
                    {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  {supplierId && suppliers.find((s: any) => s.id === supplierId) && (() => {
                    const s = suppliers.find((x: any) => x.id === supplierId);
                    return (
                      <div style={{ padding: "10px 12px", background: "var(--panel-bg-2,rgba(255,255,255,0.03))", borderRadius: 8, border: `1px solid ${BORDER}` }}>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{s.name}</div>
                        {(s.email || s.phone) && <div style={{ fontSize: 12, color: MUTED, marginBottom: 3, display: "flex", gap: 12, flexWrap: "wrap" }}>{s.email && <span>{s.email}</span>}{s.phone && <span>{s.phone}</span>}</div>}
                        {s.address && <div style={{ fontSize: 12, color: MUTED }}>{s.address}</div>}
                      </div>
                    );
                  })()}
                </div>
                <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: TEXT }}>Your Business</div>
                  {companyInfo ? (
                    <div style={{ padding: "10px 12px", background: "var(--panel-bg-2,rgba(255,255,255,0.03))", borderRadius: 8, border: `1px solid ${BORDER}` }}>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{companyInfo.name}</div>
                      {companyInfo.address && <div style={{ fontSize: 12, color: MUTED, marginBottom: 3 }}>{companyInfo.address}</div>}
                      {companyInfo.phone && <div style={{ fontSize: 12, color: MUTED }}>{companyInfo.phone}</div>}
                    </div>
                  ) : <div style={{ fontSize: 12, color: MUTED, fontStyle: "italic" }}>Loading company info…</div>}
                  <div style={{ marginTop: 10 }}>
                    <Label>Against PO (optional)</Label>
                    <select value={poId} onChange={e => handlePOSelect(e.target.value)} style={inp()}>
                      <option value="">— No PO Reference —</option>
                      {pos.map(p => <option key={p.id} value={p.id}>{p.poNo} · {p.supplier.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>Items Received</div>
                  <div style={{ fontSize: 11, color: MUTED }}>{rows.filter(r => r.itemId && r.receivedQty).length} items</div>
                </div>
                {isMobile ? (
                  <div style={{ padding: "10px 14px" }}>
                    {rows.map((row, idx) => {
                      const amt = (Number(row.receivedQty) || 0) * (Number(row.rate) || 0);
                      const isShort = row.orderedQty && row.receivedQty && Number(row.receivedQty) < Number(row.orderedQty);
                      return (
                        <div key={idx} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase" as const }}>Item {idx + 1}</span>
                            <button onClick={() => setRows(rows.filter((_, i) => i !== idx))} disabled={rows.length === 1} style={{ background: "none", border: "none", cursor: rows.length === 1 ? "not-allowed" : "pointer", color: "#f87171", fontSize: 18, lineHeight: 1, padding: 0, opacity: rows.length === 1 ? 0.3 : 1 }}>×</button>
                          </div>
                          <select value={row.itemId} onChange={e => updateRow(idx, "itemId", e.target.value)} style={{ ...inp({ marginBottom: 8 }) }}>
                            <option value="">— Select Item —</option>
                            {allItems.map((it: any) => <option key={it.id} value={it.id}>{it.name}</option>)}
                          </select>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                            <div><Label>Ordered</Label><input type="number" value={row.orderedQty} onChange={e => updateRow(idx, "orderedQty", e.target.value)} placeholder="0" style={inp({ textAlign: "center" })} /></div>
                            <div><Label><span style={{ color: isShort ? "#fbbf24" : "#34d399" }}>Received</span></Label><input type="number" value={row.receivedQty} onChange={e => updateRow(idx, "receivedQty", e.target.value)} placeholder="0" style={inp({ textAlign: "center", color: isShort ? "#fbbf24" : "#34d399", fontWeight: 700 })} /></div>
                            <div><Label>Rate</Label><input type="number" value={row.rate} onChange={e => updateRow(idx, "rate", e.target.value)} placeholder="0.00" style={inp({ textAlign: "right" })} /></div>
                          </div>
                          {amt > 0 && <div style={{ textAlign: "right", fontWeight: 700, fontSize: 13, marginTop: 6, color: ACCENT }}>= {amt.toLocaleString()}</div>}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 540, fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "rgba(99,102,241,0.07)" }}>
                          {[["#","left",30],["Item","left","auto"],["Ordered","center",90],["Received","center",90],["Note","left",120],["","center",30]].map(([h,a,w]) => (
                            <th key={h as string} style={{ padding: "10px 8px", textAlign: a as any, color: MUTED, fontWeight: 700, fontSize: 10, textTransform: "uppercase" as const, letterSpacing: 0.6, width: w as any }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, idx) => {
                          const amt = (Number(row.receivedQty) || 0) * (Number(row.rate) || 0);
                          const isShort = row.orderedQty && row.receivedQty && Number(row.receivedQty) < Number(row.orderedQty);
                          return (
                            <tr key={idx} style={{ borderTop: `1px solid ${BORDER}` }}>
                              <td style={{ padding: "6px 8px", color: MUTED, fontSize: 12 }}>{idx + 1}</td>
                              <td style={{ padding: "6px 8px" }}>
                                <select value={row.itemId} onChange={e => updateRow(idx, "itemId", e.target.value)} style={inp({ padding: "6px 10px" })}>
                                  <option value="">Select Item</option>
                                  {allItems.map((it: any) => <option key={it.id} value={it.id}>{it.name}</option>)}
                                </select>
                              </td>
                              <td style={{ padding: "6px 8px" }}><input type="number" value={row.orderedQty} onChange={e => updateRow(idx, "orderedQty", e.target.value)} placeholder="0" style={inp({ padding: "5px 7px", textAlign: "center", color: MUTED })} /></td>
                              <td style={{ padding: "6px 8px" }}><input type="number" value={row.receivedQty} onChange={e => updateRow(idx, "receivedQty", e.target.value)} placeholder="0" style={inp({ padding: "5px 7px", textAlign: "center", color: isShort ? "#fbbf24" : "#34d399", fontWeight: 700 })} /></td>
                              <td style={{ padding: "6px 8px" }}><input value={row.remarks} onChange={e => updateRow(idx, "remarks", e.target.value)} placeholder="Note..." style={inp({ padding: "5px 8px", fontSize: 12 })} /></td>
                              <td style={{ padding: "6px 8px" }}><button onClick={() => setRows(rows.filter((_, i) => i !== idx))} disabled={rows.length === 1} style={{ background: "none", border: "none", cursor: "pointer", color: "#f87171", fontSize: 16, padding: 0, opacity: rows.length === 1 ? 0.3 : 1 }}>×</button></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Remarks + Notes */}
              <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: TEXT }}>Notes & Remarks</div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                  <div><Label>Remarks</Label><input value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Optional remarks..." style={inp()} /></div>
                  <div><Label>Internal Notes</Label><input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes..." style={inp()} /></div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16, position: isMobile ? "static" : "sticky", top: 24 }}>

              {/* GRN Header */}
              <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 6 }}>GRN</div>
                <div style={{ fontSize: 17, fontWeight: 800, fontFamily: "monospace", color: ACCENT, marginBottom: 16 }}>{grnNo || "Auto #"}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div><Label>Receipt Date</Label><DateInput value={date} onChange={setDate} style={inp()} /></div>
                </div>
              </div>

              {/* Totals */}
              <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: MUTED }}>Items</span><span>{rows.filter(r => r.itemId && r.receivedQty).length} line(s)</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: `2px solid ${BORDER}`, paddingTop: 12, fontSize: 18, fontWeight: 800 }}>
                    <span>Total Value</span>
                    <span style={{ color: ACCENT }}>{totalAmt.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Save Buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button onClick={handleSubmit} disabled={saving} style={{ padding: "12px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", fontFamily: FONT, fontSize: 15, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, boxShadow: "0 4px 14px rgba(99,102,241,0.35)" }}>{saving ? "Saving…" : "Save & Preview"}</button>
                <button onClick={resetForm} style={{ padding: "10px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontFamily: FONT, fontSize: 13, cursor: "pointer" }}>Clear Form</button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ── Preview Action Bar ── */}
      {!showList && preview && (
        <div className="no-print" style={{ marginBottom: 20 }}>
          <PrintActionBar
            onPrintA4={() => { setPrintMode("a4"); setTimeout(() => window.print(), 100); }}
            onPrintThermal={() => { setPrintMode("58mm"); setTimeout(() => window.print(), 100); }}
            thermalLabel="58mm"
            onEmail={sendEmail}
            onWhatsApp={shareWhatsApp}
            onEdit={() => setPreview(false)}
            onNew={() => { resetForm(); }}
            newLabel="New GRN"
          />
        </div>
      )}

      {/* ══ A4 PRINT PREVIEW ══ */}
      {!showList && preview && printMode !== "58mm" && (
        <PrintPaperWrapper>
          <PrintDocA4
            companyName={companyInfo?.name || "Company Name"}
            companyAddress={companyInfo?.address}
            companyPhone={companyInfo?.phone}
            docTitle="GOODS RECEIPT NOTE"
            docNo={grnNo}
            date={fmtDate(date)}
            partyLabel="Supplier"
            partyName={supplierName || "—"}
            metaFields={poRef ? [{ label: "PO Reference", value: poRef }] : []}
            columns={[
              { key: "no", label: "#", align: "center", width: 30 },
              { key: "name", label: "Item" },
              { key: "ordered", label: "Ordered", align: "center", width: 70 },
              { key: "received", label: "Received", align: "center", width: 70 },
              { key: "rate", label: "Rate", align: "right", width: 80 },
              { key: "amount", label: "Amount", align: "right", width: 90 },
            ]}
            rows={filledRows.map((r, i) => ({
              no: i + 1,
              name: r.name,
              ordered: r.orderedQty || "—",
              received: r.receivedQty,
              rate: Number(r.rate).toLocaleString(),
              amount: ((Number(r.receivedQty) || 0) * (Number(r.rate) || 0)).toLocaleString(),
            }))}
            totalsLines={[
              { label: "Total Received Amount:", value: totalAmt, bold: true, borderTop: true },
            ]}
            notes={remarks || undefined}
            signatureLabels={["Received By", "Verified By"]}
          />
        </PrintPaperWrapper>
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
