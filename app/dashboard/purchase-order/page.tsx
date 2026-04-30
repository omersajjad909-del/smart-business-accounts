"use client";
import { fmtDate } from "@/lib/dateUtils";
import { DateInput } from "@/app/dashboard/reports/_components/DateInput";
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
  supplier?: { name: string }; remarks?: string; approvalStatus?: string; status?: string;
  branch?: { id: string; name: string } | null;
  items: Array<{ item: { id: string; name: string }; qty: number; rate: number }>;
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  DRAFT:               { bg: "rgba(148,163,184,0.12)", text: "#94a3b8", border: "rgba(148,163,184,0.3)" },
  PENDING:             { bg: "rgba(251,191,36,0.12)",  text: "#fbbf24", border: "rgba(251,191,36,0.3)" },
  APPROVED:            { bg: "rgba(52,211,153,0.12)",  text: "#34d399", border: "rgba(52,211,153,0.3)" },
  REJECTED:            { bg: "rgba(248,113,113,0.12)", text: "#f87171", border: "rgba(248,113,113,0.3)" },
  RECEIVED:            { bg: "rgba(99,102,241,0.14)",  text: "#818cf8", border: "rgba(99,102,241,0.3)" },
  PARTIALLY_RECEIVED:  { bg: "rgba(14,165,233,0.12)",  text: "#38bdf8", border: "rgba(14,165,233,0.3)" },
  PARTIALLY_INVOICED:  { bg: "rgba(168,85,247,0.12)",  text: "#c084fc", border: "rgba(168,85,247,0.3)" },
  COMPLETED:           { bg: "rgba(16,185,129,0.12)",  text: "#10b981", border: "rgba(16,185,129,0.3)" },
  CANCELLED:           { bg: "rgba(248,113,113,0.12)", text: "#f87171", border: "rgba(248,113,113,0.3)" },
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
  const [isMobile, setIsMobile] = useState(false);

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
  const [dueDate, setDueDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [notes, setNotes] = useState("");
  const [discount, setDiscount] = useState("");
  const [discountType, setDiscountType] = useState("flat");
  const [freight, setFreight] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("PENDING");
  const emptyRow = () => ({ itemId: "", name: "", desc: "", qty: "", rate: "", discountPercent: "", taxPercent: "", unit: "", sku: "" });
  const [rows, setRows] = useState([emptyRow()]);
  const [saving, setSaving] = useState(false);
  // "none" | "a4" | "58mm"
  const [printMode, setPrintMode] = useState<"none" | "a4" | "58mm">("none");
  const [preview, setPreview] = useState(false);
  const [savedPO, setSavedPO] = useState<PO | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 900px)");
    const onChange = () => setIsMobile(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

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
    const copy = [...rows]; (copy[i] as any)[key] = val;
    if (i === copy.length - 1 && val !== "" && val != null) copy.push(emptyRow());
    setRows(copy);
  }
  function removeRow(i: number) { if (rows.length > 1) setRows(rows.filter((_, idx) => idx !== i)); }

  const subTotal = rows.reduce((s, r) => s + (r.qty && r.rate ? Number(r.qty) * Number(r.rate) : 0), 0);
  const discountAmt = discountType === "percent" ? subTotal * Number(discount) / 100 : Number(discount) || 0;
  const freightAmt = Number(freight) || 0;
  const grandTotal = subTotal - discountAmt + freightAmt;
  const cur = companyInfo?.baseCurrency || "Rs.";

  async function savePO() {
    const clean = rows.filter(r => r.itemId && r.qty);
    if (!supplierId || !clean.length) { toast.error("Supplier and items are required"); return; }
    setSaving(true);
    try {
      const method = editing ? "PUT" : "POST";
      const body = editing
        ? { id: editing.id, poNo, supplierId, date, dueDate: dueDate || null, remarks, notes: notes || null, approvalStatus, paymentTerms: paymentTerms || null, discount: Number(discount) || 0, discountType, freight: Number(freight) || 0, items: clean.map((r: any) => ({ ...r, discountPercent: Number(r.discountPercent) || 0, taxPercent: Number(r.taxPercent) || 0 })) }
        : { poNo, supplierId, date, dueDate: dueDate || null, remarks, notes: notes || null, approvalStatus, paymentTerms: paymentTerms || null, discount: Number(discount) || 0, discountType, freight: Number(freight) || 0, items: clean.map((r: any) => ({ ...r, discountPercent: Number(r.discountPercent) || 0, taxPercent: Number(r.taxPercent) || 0 })) };
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
    const po2 = po as any;
    setEditing(po); setPoNo(po.poNo); setSupplierId(po.supplierId);
    setSupplierName(po.supplier?.name || ""); setDate(new Date(po.date).toISOString().slice(0, 10));
    setDueDate(po2.dueDate ? new Date(po2.dueDate).toISOString().slice(0, 10) : "");
    setRemarks(po.remarks || ""); setNotes(po2.notes || ""); setApprovalStatus(po.approvalStatus || "PENDING");
    setPaymentTerms(po2.paymentTerms || ""); setDiscount(po2.discount ?? ""); setDiscountType(po2.discountType || "flat"); setFreight(po2.freight ?? "");
    setRows(po.items.map((it: any) => ({ itemId: it.itemId || it.item?.id || "", name: it.item?.name || "", desc: it.item?.description || "", qty: it.qty.toString(), rate: it.rate.toString(), discountPercent: it.discountPercent ?? "", taxPercent: it.taxPercent ?? "", unit: it.item?.unit || "", sku: it.item?.code || "" })));
    setShowForm(true); setShowList(false); setPreview(false); setPrintMode("none");
  }

  async function deletePO(id: string) {
    if (!await confirmToast("Delete this Purchase Order?")) return;
    const res = await fetch(`/api/purchase-order?id=${id}`, { method: "DELETE", headers: { "x-user-role": user?.role || "ADMIN", "x-user-id": user?.id || "", "x-company-id": user?.companyId || "" } });
    if (res.ok) { toast.success("PO deleted"); await loadPOs(); }
    else toast.error("Delete failed");
  }

  async function approvePO(po: PO) {
    try {
      const res = await fetch("/api/purchase-order", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-user-role": user?.role || "ADMIN", "x-user-id": user?.id || "", "x-company-id": user?.companyId || "" },
        body: JSON.stringify({
          id: po.id,
          supplierId: po.supplierId,
          date: po.date,
          approvalStatus: "APPROVED",
          items: po.items?.map((it: any) => ({ itemId: it.itemId || it.item?.id, qty: it.qty, rate: it.rate, amount: it.amount })) || [],
        }),
      });
      if (res.ok) { toast.success("PO Approved!"); await loadPOs(); }
      else toast.error("Approval failed");
    } catch { toast.error("Approval failed"); }
  }

  function resetForm() {
    setEditing(null); setPoNo(""); setSupplierId(""); setSupplierName("");
    setDate(today); setDueDate(""); setRemarks(""); setNotes(""); setFreight(""); setDiscount(""); setDiscountType("flat"); setPaymentTerms(""); setApprovalStatus("PENDING");
    setRows([emptyRow()]);
    setPreview(false); setPrintMode("none");
  }

  function doPrint(mode: "a4" | "58mm") {
    setPrintMode(mode);
    setTimeout(() => { window.print(); }, 150);
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
  const filledRows = rows.filter(r => r.name && r.qty);

  return (
    <div style={{ fontFamily: FONT, color: TEXT, minHeight: "100vh" }}>

      {/* ─── Print CSS ─── */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .po-print, .po-print * { visibility: visible !important; }
          .po-print {
            position: fixed !important; inset: 0 !important;
            background: white !important; color: black !important;
            filter: grayscale(100%) !important;
          }
          .po-print.a4-print {
            padding: 28px 36px !important;
            font-size: 12px !important;
          }
          .po-print.thermal-print {
            padding: 8px 10px !important;
            width: 55mm !important;
            font-size: 9px !important;
          }
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
                  {["PO Number", "Date", "Supplier", "Branch", "Approval", "GRN Status", "Items", "Actions"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: MUTED, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.7, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pos.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: "40px 16px", textAlign: "center", color: MUTED }}>No purchase orders yet</td></tr>
                ) : pos.map((po) => {
                  const scApproval = STATUS_COLORS[po.approvalStatus || "PENDING"] || STATUS_COLORS.PENDING;
                  const scGrn = STATUS_COLORS[po.status || "PENDING"] || STATUS_COLORS.PENDING;
                  return (
                    <tr key={po.id} style={{ borderBottom: `1px solid ${BORDER}`, transition: "background .12s" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.05)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                      <td style={{ padding: "13px 16px", fontWeight: 700, color: ACCENT, fontFamily: "monospace", fontSize: 13 }}>{po.poNo}</td>
                      <td style={{ padding: "13px 16px", color: MUTED, fontSize: 12 }}>{fmtDate(po.date)}</td>
                      <td style={{ padding: "13px 16px", fontWeight: 600 }}>{po.supplier?.name || "—"}</td>
                      <td style={{ padding: "13px 16px" }}>
                        {po.branch?.name
                          ? <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: "rgba(99,102,241,0.1)", color: ACCENT, border: `1px solid rgba(99,102,241,0.25)` }}>🏢 {po.branch.name}</span>
                          : <span style={{ fontSize: 12, color: MUTED }}>—</span>}
                      </td>
                      <td style={{ padding: "13px 16px" }}>
                        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: scApproval.bg, color: scApproval.text, border: `1px solid ${scApproval.border}` }}>
                          {po.approvalStatus || "PENDING"}
                        </span>
                      </td>
                      <td style={{ padding: "13px 16px" }}>
                        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: scGrn.bg, color: scGrn.text, border: `1px solid ${scGrn.border}` }}>
                          {po.status || "PENDING"}
                        </span>
                      </td>
                      <td style={{ padding: "13px 16px", maxWidth: 200 }}>
                        {po.items?.length > 0 ? (
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: TEXT, lineHeight: 1.5 }}>
                              {po.items.slice(0, 2).map(it => it.item?.name).filter(Boolean).join(", ")}
                              {po.items.length > 2 && <span style={{ color: MUTED }}> +{po.items.length - 2} more</span>}
                            </div>
                            <div style={{ fontSize: 10, color: MUTED, marginTop: 1 }}>{po.items.length} item{po.items.length > 1 ? "s" : ""}</div>
                          </div>
                        ) : <span style={{ color: MUTED, fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ padding: "13px 16px" }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {(!po.approvalStatus || po.approvalStatus === "PENDING") && (
                            <button onClick={() => approvePO(po)} style={{ padding: "5px 13px", borderRadius: 6, border: "1px solid rgba(52,211,153,0.4)", background: "rgba(52,211,153,0.1)", color: "#34d399", fontFamily: FONT, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>✓ Approve</button>
                          )}
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
          <div style={{ padding: "11px 18px", borderTop: `1px solid ${BORDER}`, fontSize: 12, color: MUTED }}>{pos.length} purchase orders</div>
        </div>
      )}

      {/* ── Form ── */}
      {showForm && !preview && (
        <div className="no-print">
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 320px", gap: 20, alignItems: "start" }}>

            {/* LEFT COLUMN */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Supplier + Business Details */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
                <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: TEXT }}>Supplier Details</div>
                  <select value={supplierId} onChange={e => { setSupplierId(e.target.value); const s = suppliers.find((x: any) => x.id === e.target.value); setSupplierName(s?.name || ""); }} style={{ ...inp(), marginBottom: 10 }}>
                    <option value="">— Select Supplier —</option>
                    {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  {supplierId && suppliers.find((s: any) => s.id === supplierId) && (() => {
                    const s = suppliers.find((x: any) => x.id === supplierId);
                    return (
                      <div style={{ padding: "10px 12px", background: "var(--panel-bg-2)", borderRadius: 8, border: `1px solid ${BORDER}` }}>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{s.name}</div>
                        {(s.email || s.phone) && <div style={{ fontSize: 12, color: MUTED, marginBottom: 3, display: "flex", gap: 12, flexWrap: "wrap" }}>{s.email && <span>{s.email}</span>}{s.phone && <span>{s.phone}</span>}</div>}
                        {s.address && <div style={{ fontSize: 12, color: MUTED, marginBottom: 3 }}>{s.address}{s.city ? `, ${s.city}` : ""}</div>}
                        {(s.ntn || s.strn) && <div style={{ fontSize: 11, color: MUTED, display: "flex", gap: 12 }}>{s.ntn && <span>NTN: {s.ntn}</span>}{s.strn && <span>STRN: {s.strn}</span>}</div>}
                      </div>
                    );
                  })()}
                </div>

                <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: TEXT }}>Your Business Details</div>
                  {companyInfo ? (
                    <div style={{ padding: "10px 12px", background: "var(--panel-bg-2)", borderRadius: 8, border: `1px solid ${BORDER}` }}>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{companyInfo.name}</div>
                      {companyInfo.address && <div style={{ fontSize: 12, color: MUTED, marginBottom: 3 }}>{companyInfo.address}</div>}
                      <div style={{ fontSize: 12, color: MUTED, display: "flex", gap: 12, flexWrap: "wrap" }}>{companyInfo.phone && <span>Phone: {companyInfo.phone}</span>}{companyInfo.email && <span>{companyInfo.email}</span>}</div>
                      {(companyInfo.ntn || companyInfo.gst) && <div style={{ fontSize: 11, color: MUTED, marginTop: 3, display: "flex", gap: 12 }}>{companyInfo.ntn && <span>NTN: {companyInfo.ntn}</span>}{companyInfo.gst && <span>GST: {companyInfo.gst}</span>}</div>}
                    </div>
                  ) : <div style={{ fontSize: 13, color: MUTED }}>Loading…</div>}
                </div>
              </div>

              {/* Items Table */}
              <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: TEXT }}>Order Items</div>
                {isMobile ? (
                  <div>
                    {rows.map((r, i) => {
                      const lineBase = (Number(r.qty) * Number(r.rate)) || 0;
                      const lineDisc = lineBase * ((r as any).discountPercent ? Number((r as any).discountPercent) / 100 : 0);
                      const lineTax = (lineBase - lineDisc) * ((r as any).taxPercent ? Number((r as any).taxPercent) / 100 : 0);
                      return (
                        <div key={i} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 12, marginBottom: 10, background: "var(--panel-bg-2)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase" }}>Item {i + 1}</span>
                            <button type="button" tabIndex={-1} onKeyDown={e => e.preventDefault()} onClick={() => removeRow(i)} disabled={rows.length === 1} style={{ background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.35)", borderRadius: 6, color: "#f87171", cursor: rows.length === 1 ? "not-allowed" : "pointer", opacity: rows.length === 1 ? 0.3 : 1, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                            </button>
                          </div>
                          <select value={r.itemId} onChange={e => {
                            const it = items.find((x: any) => x.id === e.target.value);
                            if (!it) return;
                            const copy = [...rows];
                            copy[i] = { ...copy[i], itemId: it.id, name: it.name, desc: it.description || "", rate: String(it.purchaseRate || it.rate || ""), unit: it.unit || "", sku: it.code || "" };
                            if (i === copy.length - 1) copy.push(emptyRow());
                            setRows(copy);
                          }} style={{ ...inp({ marginBottom: 8 }) }}>
                            <option value="">— Select Item —</option>
                            {items.map((it: any) => <option key={it.id} value={it.id}>{it.name}</option>)}
                          </select>
                          {(r as any).sku && <div style={{ fontSize: 11, color: MUTED, marginBottom: 6 }}>SKU: {(r as any).sku}{(r as any).unit ? ` | Unit: ${(r as any).unit}` : ""}</div>}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            {(["qty","rate","discountPercent","taxPercent"] as const).map(k => (
                              <div key={k}><div style={{ fontSize: 10, color: MUTED, fontWeight: 700, marginBottom: 3, textTransform: "uppercase" }}>{k === "qty" ? "Qty" : k === "rate" ? "Unit Price" : k === "discountPercent" ? "Disc %" : "Tax %"}</div>
                                <input type="number" value={(r as any)[k]} onChange={e => updateRow(i, k, e.target.value)} placeholder="0" style={inp({ textAlign: "right" })} /></div>
                            ))}
                          </div>
                          {lineBase > 0 && <div style={{ textAlign: "right", fontWeight: 700, fontSize: 13, marginTop: 8, color: ACCENT }}>Total: {(lineBase - lineDisc + lineTax).toLocaleString()}</div>}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                          {["#","Item / Description","SKU","Qty","Unit","Unit Price","Disc %","Tax %","Total",""].map((h,hi) => (
                            <th key={h+hi} style={{ padding: "8px 7px", fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 0.4, textAlign: hi >= 3 && hi <= 8 ? "right" : "left", whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => {
                          const lineBase = (Number(r.qty) * Number(r.rate)) || 0;
                          const lineDisc = lineBase * ((r as any).discountPercent ? Number((r as any).discountPercent) / 100 : 0);
                          const lineTax = (lineBase - lineDisc) * ((r as any).taxPercent ? Number((r as any).taxPercent) / 100 : 0);
                          const isEmpty = !r.itemId && !r.qty && !r.rate;
                          return (
                            <tr key={i}
                              style={{ borderBottom: `1px solid ${BORDER}`, position: "relative" }}
                              onMouseEnter={e => { const btn = (e.currentTarget as HTMLElement).querySelector(".row-del-btn") as HTMLElement; if (btn) btn.style.opacity = "1"; }}
                              onMouseLeave={e => { const btn = (e.currentTarget as HTMLElement).querySelector(".row-del-btn") as HTMLElement; if (btn) btn.style.opacity = "0"; }}
                            >
                              <td style={{ padding: "6px 7px", fontSize: 12, color: MUTED, width: 28 }}>{i + 1}</td>
                              <td style={{ padding: "6px 7px", minWidth: 140 }}>
                                <select value={r.itemId} onChange={e => {
                                  const it = items.find((x: any) => x.id === e.target.value);
                                  if (!it) return;
                                  const copy = [...rows];
                                  copy[i] = { ...copy[i], itemId: it.id, name: it.name, desc: it.description || "", rate: String(it.purchaseRate || it.rate || ""), unit: it.unit || "", sku: it.code || "" };
                                  if (i === copy.length - 1) copy.push(emptyRow());
                                  setRows(copy);
                                }} style={{ ...inp({ padding: "5px 7px", fontSize: 13 }) }}>
                                  <option value="">— Select —</option>
                                  {items.map((it: any) => <option key={it.id} value={it.id}>{it.name}</option>)}
                                </select>
                                {r.desc && <div style={{ fontSize: 11, color: MUTED, marginTop: 2, paddingLeft: 2 }}>{r.desc}</div>}
                              </td>
                              <td style={{ padding: "6px 7px", fontSize: 12, color: MUTED, width: 72 }}>{(r as any).sku || "—"}</td>
                              <td style={{ padding: "6px 7px", width: 68 }}><input type="number" value={r.qty} onChange={e => updateRow(i, "qty", e.target.value)} placeholder="0" style={inp({ padding: "5px 7px", textAlign: "right", fontSize: 13 })} /></td>
                              <td style={{ padding: "6px 7px", fontSize: 12, color: MUTED, width: 52 }}>{(r as any).unit || "—"}</td>
                              <td style={{ padding: "6px 7px", width: 94 }}><input type="number" value={r.rate} onChange={e => updateRow(i, "rate", e.target.value)} placeholder="0.00" style={inp({ padding: "5px 7px", textAlign: "right", fontSize: 13 })} /></td>
                              <td style={{ padding: "6px 7px", width: 66 }}><input type="number" value={(r as any).discountPercent} onChange={e => updateRow(i, "discountPercent", e.target.value)} placeholder="0" style={inp({ padding: "5px 7px", textAlign: "right", fontSize: 13 })} /></td>
                              <td style={{ padding: "6px 7px", width: 66 }}><input type="number" value={(r as any).taxPercent} onChange={e => updateRow(i, "taxPercent", e.target.value)} placeholder="0" style={inp({ padding: "5px 7px", textAlign: "right", fontSize: 13 })} /></td>
                              <td style={{ padding: "6px 7px", textAlign: "right", fontWeight: 600, fontSize: 13, width: 94, whiteSpace: "nowrap" }}>{lineBase > 0 ? (lineBase - lineDisc + lineTax).toLocaleString() : <span style={{ color: MUTED }}>—</span>}</td>
                              {/* DELETE — hover only, NOT in tab order, NEVER triggered by Enter */}
                              <td style={{ padding: "6px 4px", width: 34, textAlign: "center" }}>
                                {rows.length > 1 && !isEmpty && (
                                  <button
                                    type="button"
                                    tabIndex={-1}
                                    className="row-del-btn"
                                    onClick={() => removeRow(i)}
                                    onKeyDown={e => e.preventDefault()}
                                    title="Remove row"
                                    style={{ opacity: 0, transition: "opacity .15s", background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.35)", borderRadius: 6, color: "#f87171", cursor: "pointer", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Payment + Notes */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
                <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: TEXT }}>Payment Details</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div><Label>Payment Terms</Label>
                      <select value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} style={inp()}>
                        <option value="">Select Terms</option>
                        <option value="Immediate">Immediate</option>
                        <option value="Net 15">Net 15 Days</option>
                        <option value="Net 30">Net 30 Days</option>
                        <option value="Net 45">Net 45 Days</option>
                        <option value="Net 60">Net 60 Days</option>
                      </select>
                    </div>
                    <div><Label>Approval Status</Label>
                      <select value={approvalStatus} onChange={e => setApprovalStatus(e.target.value)} style={{ ...inp(), color: (STATUS_COLORS[approvalStatus] || STATUS_COLORS.PENDING).text, fontWeight: 700 }}>
                        <option value="DRAFT">Draft</option>
                        <option value="PENDING">Pending</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: TEXT }}>Notes & Remarks</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div><Label>Remarks</Label><textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Special instructions…" style={{ ...inp({ minHeight: 60, resize: "vertical" as const }) }} /></div>
                    <div><Label>Internal Notes</Label><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any internal notes…" style={{ ...inp({ minHeight: 60, resize: "vertical" as const }) }} /></div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16, position: isMobile ? "static" : "sticky", top: 24 }}>

              {/* PO Header */}
              <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Purchase Order</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "monospace", color: TEXT }}>{poNo || "—"}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: (STATUS_COLORS[approvalStatus] || STATUS_COLORS.PENDING).bg, color: (STATUS_COLORS[approvalStatus] || STATUS_COLORS.PENDING).text, border: `1px solid ${(STATUS_COLORS[approvalStatus] || STATUS_COLORS.PENDING).border}` }}>{approvalStatus}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div><Label>Order Date</Label><DateInput value={date} onChange={setDate} style={inp()} /></div>
                    <div><Label>Due Date</Label><DateInput value={dueDate} onChange={setDueDate} style={inp()} /></div>
                  </div>
                </div>
              </div>

              {/* Totals */}
              <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: MUTED }}>Subtotal</span><span>{cur} {subTotal.toLocaleString()}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                    <span style={{ color: MUTED }}>Discount</span>
                    <div style={{ display: "flex", gap: 5 }}>
                      <select value={discountType} onChange={e => setDiscountType(e.target.value)} style={{ ...inp({ width: 58, padding: "3px 6px", fontSize: 12 }) }}><option value="flat">Flat</option><option value="percent">%</option></select>
                      <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0" style={{ ...inp({ width: 78, padding: "3px 7px", fontSize: 12, textAlign: "right" }) }} />
                    </div>
                  </div>
                  {discountAmt > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--danger)" }}><span>Discount Amount</span><span>— {cur} {discountAmt.toLocaleString()}</span></div>}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                    <span style={{ color: MUTED }}>Shipping Charges</span>
                    <input type="number" value={freight} onChange={e => setFreight(e.target.value)} placeholder="0.00" style={{ ...inp({ width: 100, padding: "3px 7px", fontSize: 12, textAlign: "right" }) }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: `2px solid ${BORDER}`, paddingTop: 12, fontSize: 18, fontWeight: 800 }}>
                    <span>Grand Total</span>
                    <span style={{ color: ACCENT }}>{cur} {grandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Save Buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button onClick={savePO} disabled={saving} style={{ padding: "12px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", fontFamily: FONT, fontSize: 15, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving…" : editing ? "Update PO" : "Save & Preview"}</button>
                <button onClick={() => { setShowForm(false); resetForm(); }} style={{ padding: "10px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontFamily: FONT, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Preview Action Bar ── */}
      {showForm && preview && (
        <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {/* A4 Print */}
          <button onClick={() => doPrint("a4")} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#1e293b", color: "#f1f5f9", fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="12" y2="15"/></svg>
            Print A4
          </button>
          {/* 58mm / Thermal Print */}
          <button onClick={() => doPrint("58mm")} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#1e293b", color: "#f1f5f9", fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print 58mm
          </button>
          <button onClick={() => { const s = suppliers.find(s => s.id === supplierId); setRecipientEmail(s?.email || ""); setEmailModalOpen(true); }}
            style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            📧 Send Email
          </button>
          <button onClick={() => setPreview(false)} style={{ padding: "10px 18px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: TEXT, fontFamily: FONT, fontSize: 13, cursor: "pointer" }}>✏️ Edit</button>
          <button onClick={() => { resetForm(); loadPOs(); }} style={{ padding: "10px 18px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontFamily: FONT, fontSize: 13, cursor: "pointer" }}>+ New PO</button>
        </div>
      )}

      {/* ══════════════════════════════════════════
          A4 PREVIEW
      ══════════════════════════════════════════ */}
      {showForm && preview && (printMode === "none" || printMode === "a4") && (
        <div className={`po-print a4-print`} style={{
          background: "white", color: "#111",
          fontFamily: "'Outfit','Inter',sans-serif",
          borderRadius: 14, overflow: "hidden",
          boxShadow: "0 8px 50px rgba(0,0,0,0.25)",
          maxWidth: 860, margin: "0 auto 32px",
          filter: "none",
        }}>
          {/* Top bar */}
          <div style={{ height: 5, background: "#111" }} />

          {/* Header */}
          <div style={{ padding: "28px 36px 20px", borderBottom: "1.5px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#0f172a", letterSpacing: -0.8, lineHeight: 1 }}>{companyInfo?.name || "Company Name"}</div>
              {companyInfo?.address && <div style={{ fontSize: 11, color: "#64748b", marginTop: 5 }}>{companyInfo.address}</div>}
              {companyInfo?.phone  && <div style={{ fontSize: 11, color: "#64748b" }}>{companyInfo.phone}</div>}
              {companyInfo?.email  && <div style={{ fontSize: 11, color: "#64748b" }}>{companyInfo.email}</div>}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ background: "#0f172a", color: "white", padding: "5px 16px", borderRadius: 6, fontSize: 11, fontWeight: 800, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 10, display: "inline-block" }}>Purchase Order</div>
              <table style={{ fontSize: 12, borderCollapse: "collapse", marginLeft: "auto" }}>
                {[["PO Number", savedPO?.poNo ?? poNo], ["Date", fmtDate(date)], ["Status", approvalStatus]].map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ padding: "2px 12px 2px 0", color: "#94a3b8", fontWeight: 600, textAlign: "right" }}>{k}</td>
                    <td style={{ padding: "2px 0", fontWeight: 800, color: "#0f172a", fontFamily: k === "PO Number" ? "monospace" : "inherit" }}>{v}</td>
                  </tr>
                ))}
              </table>
            </div>
          </div>

          {/* Supplier */}
          <div style={{ padding: "14px 36px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Supplier / Vendor</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>{supplierName || "—"}</div>
            {(() => { const s = suppliers.find(x => x.id === supplierId); return s?.phone || s?.city ? (
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>{[s.phone, s.city].filter(Boolean).join("  ·  ")}</div>
            ) : null; })()}
          </div>

          {/* Items */}
          <div style={{ padding: "0 36px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #0f172a" }}>
                  {[["#","left",30],["Item Description","left","auto"],["Qty","center",70],["Unit Rate","right",110],["Amount","right",120]].map(([label, align, w]) => (
                    <th key={label as string} style={{ padding: "12px 0 8px", textAlign: align as any, fontSize: 9, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8, width: w as any }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filledRows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "11px 0", fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{i + 1}</td>
                    <td style={{ padding: "11px 0" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{r.name}</div>
                      {r.desc && <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>{r.desc}</div>}
                    </td>
                    <td style={{ padding: "11px 0", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{r.qty}</td>
                    <td style={{ padding: "11px 0", textAlign: "right", fontSize: 12, color: "#475569" }}>{Number(r.rate).toLocaleString()}</td>
                    <td style={{ padding: "11px 0", textAlign: "right", fontSize: 13, fontWeight: 800, color: "#0f172a" }}>{(Number(r.qty) * Number(r.rate)).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals + Remarks */}
          <div style={{ padding: "16px 36px 28px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, borderTop: "1.5px solid #e2e8f0", marginTop: 4 }}>
            <div style={{ flex: 1 }}>
              {remarks && (
                <div style={{ borderLeft: "3px solid #cbd5e1", paddingLeft: 12, marginBottom: 12 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 }}>Remarks</div>
                  <div style={{ fontSize: 12, color: "#475569" }}>{remarks}</div>
                </div>
              )}
            </div>
            <div style={{ minWidth: 230 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "7px 0", color: "#64748b", fontWeight: 600 }}>Sub Total</td>
                    <td style={{ padding: "7px 0", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>{cur} {subTotal.toLocaleString()}</td>
                  </tr>
                  {freightAmt > 0 && (
                    <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "7px 0", color: "#64748b", fontWeight: 600 }}>Freight</td>
                      <td style={{ padding: "7px 0", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>{cur} {freightAmt.toLocaleString()}</td>
                    </tr>
                  )}
                  <tr style={{ background: "#0f172a" }}>
                    <td style={{ padding: "10px 12px", color: "white", fontWeight: 800, fontSize: 13, borderRadius: "4px 0 0 4px" }}>NET TOTAL</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "white", fontWeight: 900, fontSize: 15, borderRadius: "0 4px 4px 0" }}>{cur} {grandTotal.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Signatures */}
          <div style={{ padding: "0 36px 28px", display: "flex", gap: 32 }}>
            {["Prepared By", "Checked By", "Authorized By"].map(label => (
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

      {/* ══════════════════════════════════════════
          58mm THERMAL PREVIEW
      ══════════════════════════════════════════ */}
      {showForm && preview && (
        <div className={`po-print thermal-print`} style={{
          background: "white", color: "#000",
          fontFamily: "'Courier New',Courier,monospace",
          width: 220, margin: "0 auto",
          padding: "10px 12px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
          borderRadius: 4,
          display: printMode === "58mm" ? "block" : "none",
        }}>
          {/* Company */}
          <div style={{ textAlign: "center", borderBottom: "1px dashed #555", paddingBottom: 6, marginBottom: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1 }}>{companyInfo?.name || "Company"}</div>
            {companyInfo?.phone && <div style={{ fontSize: 9, marginTop: 2 }}>{companyInfo.phone}</div>}
          </div>
          {/* Title */}
          <div style={{ textAlign: "center", fontSize: 10, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>
            *** PURCHASE ORDER ***
          </div>
          {/* Info */}
          <div style={{ fontSize: 9, marginBottom: 5 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>PO No:</span><span style={{ fontWeight: 700 }}>{savedPO?.poNo ?? poNo}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Date:</span><span>{fmtDate(date)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Status:</span><span style={{ fontWeight: 700 }}>{approvalStatus}</span></div>
          </div>
          {/* Supplier */}
          <div style={{ fontSize: 9, borderTop: "1px dashed #555", borderBottom: "1px dashed #555", padding: "4px 0", marginBottom: 5 }}>
            <div style={{ fontWeight: 700 }}>Supplier: {supplierName}</div>
          </div>
          {/* Items */}
          <div style={{ fontSize: 9, marginBottom: 5 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, borderBottom: "1px solid #000", paddingBottom: 2, marginBottom: 3 }}>
              <span style={{ flex: 2 }}>Item</span>
              <span style={{ width: 28, textAlign: "right" }}>Qty</span>
              <span style={{ width: 40, textAlign: "right" }}>Rate</span>
              <span style={{ width: 44, textAlign: "right" }}>Amt</span>
            </div>
            {filledRows.map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ flex: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 80 }}>{r.name}</span>
                <span style={{ width: 28, textAlign: "right" }}>{r.qty}</span>
                <span style={{ width: 40, textAlign: "right" }}>{Number(r.rate).toLocaleString()}</span>
                <span style={{ width: 44, textAlign: "right", fontWeight: 700 }}>{(Number(r.qty)*Number(r.rate)).toLocaleString()}</span>
              </div>
            ))}
          </div>
          {/* Totals */}
          <div style={{ fontSize: 9, borderTop: "1px dashed #555", paddingTop: 4, marginBottom: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Sub Total:</span><span>{cur} {subTotal.toLocaleString()}</span></div>
            {freightAmt > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span>Freight:</span><span>{cur} {freightAmt.toLocaleString()}</span></div>}
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: 11, borderTop: "1px solid #000", marginTop: 3, paddingTop: 3 }}>
              <span>TOTAL:</span><span>{cur} {grandTotal.toLocaleString()}</span>
            </div>
          </div>
          {/* Remarks */}
          {remarks && (
            <div style={{ fontSize: 8, borderTop: "1px dashed #555", paddingTop: 4, marginBottom: 4 }}>
              <span style={{ fontWeight: 700 }}>Note: </span>{remarks}
            </div>
          )}
          {/* Footer */}
          <div style={{ textAlign: "center", fontSize: 8, borderTop: "1px dashed #555", paddingTop: 4, marginTop: 4 }}>
            <div>FinovaOS · {fmtDate(new Date())}</div>
            <div>Thank You</div>
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
              <button onClick={confirmSendEmail} disabled={sendingEmail} style={{ padding: "9px 22px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: sendingEmail ? 0.7 : 1 }}>
                {sendingEmail ? "Sending…" : "Send Email"}
              </button>
              <button onClick={() => setEmailModalOpen(false)} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontFamily: FONT, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
