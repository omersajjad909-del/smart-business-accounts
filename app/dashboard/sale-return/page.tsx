"use client";
import { fmtDate } from "@/lib/dateUtils";
import { DateInput } from "@/app/dashboard/reports/_components/DateInput";
import { confirmToast } from "@/lib/toast-feedback";
import toast from "react-hot-toast";
import { useCallback, useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { PrintActionBar } from "@/components/print/PrintActionBar";
import { PrintDocA4, PrintPaperWrapper } from "@/components/print/PrintDocA4";
import { useResponsive } from "@/hooks/useResponsive";

const FONT  = "'Outfit','Inter',sans-serif";
const ACCENT = "#f87171";
const PANEL  = "var(--panel-bg)";
const BORDER = "var(--border)";
const TEXT   = "var(--text-primary)";
const MUTED  = "var(--text-muted)";
const BG     = "var(--app-bg)";

function inp(extra?: React.CSSProperties): React.CSSProperties {
  return { padding: isMobile ? "8px 8px" : "9px 13px", borderRadius: 8, border: `1.5px solid ${BORDER}`, background: BG, color: TEXT, fontFamily: FONT, fontSize: 13.5, outline: "none", width: "100%", boxSizing: "border-box" as const, ...extra };
}
function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10.5, color: MUTED, fontWeight: 700, marginBottom: 5, textTransform: "uppercase" as const, letterSpacing: 0.6 }}>{children}</div>;
}
function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

type Invoice = { id: string; invoiceNo: string; customerName: string; customerId: string };
type Row     = { itemId: string; name: string; qty: number | ""; rate: number; maxQty: number; discountPercent: number | ""; taxPercent: number | "" };
type SaleReturn = {
  id: string; returnNo: string; date: string;
  customerId: string; customer?: { name: string };
  invoiceId: string; invoice?: { invoiceNo: string };
  total: number; driverName?: string; vehicleNo?: string; remarks?: string;
  items: Array<{ itemId?: string; item?: { name: string }; qty: number; rate: number; discountPercent?: number; taxPercent?: number }>;
};
type SavedData = {
  returnNo: string; date: string; customerName: string; invoiceNo: string;
  items: { name: string; qty: number; rate: number }[];
  total: number; freight: number; netTotal: number;
  driverName: string; vehicleNo: string; remarks: string;
};

export default function SalesReturnPage() {
  const { isMobile } = useResponsive();
  const today = new Date().toISOString().slice(0, 10);
  const user  = getCurrentUser();

  const [isMobile, setIsMobile] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [returns,  setReturns]  = useState<SaleReturn[]>([]);
  const [showList, setShowList] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [editing,  setEditing]  = useState<SaleReturn | null>(null);

  const [invoiceId,        setInvoiceId]        = useState("");
  const [displayInvoiceNo, setDisplayInvoiceNo] = useState("");
  const [customerName,     setCustomerName]     = useState("");
  const [customerId,       setCustomerId]       = useState("");
  const [rows,             setRows]             = useState<Row[]>([]);
  const [date,             setDate]             = useState(today);
  const [dueDate,          setDueDate]          = useState("");
  const [freight,          setFreight]          = useState<number | "">("");
  const [discount,         setDiscount]         = useState<number | "">("");
  const [discountType,     setDiscountType]     = useState("flat");
  const [notes,            setNotes]            = useState("");
  const [reference,        setReference]        = useState("");
  const [driverName,       setDriverName]       = useState("");
  const [vehicleNo,        setVehicleNo]        = useState("");
  const [remarks,          setRemarks]          = useState("");
  const [saving,           setSaving]           = useState(false);
  const [preview,          setPreview]          = useState(false);
  const [savedData,        setSavedData]        = useState<SavedData | null>(null);
  const [returnNo,         setReturnNo]         = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 900px)");
    const onChange = () => setIsMobile(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    fetch("/api/me/company").then(r => r.ok ? r.json() : null).then(d => { if (d) setCompanyInfo(d); }).catch(() => {});
  }, []);

  const loadReturns = useCallback(async () => {
    try {
      const res = await fetch("/api/sale-return", { headers: { "x-user-role": user?.role || "ADMIN" } });
      const data = await res.json();
      if (Array.isArray(data)) setReturns(data);
    } catch {}
  }, [user?.role]);

  const handleInvoiceChange = useCallback(async (id: string) => {
    setInvoiceId(id);
    if (!id) { setRows([]); setCustomerName(""); setDisplayInvoiceNo(""); return; }
    const sel = invoices.find(i => i.id === id);
    if (sel) setDisplayInvoiceNo(sel.invoiceNo);
    try {
      const u = getCurrentUser();
      const res = await fetch(`/api/sales-invoice/${id}`, { headers: { "x-user-role": u?.role || "", "x-user-id": u?.id || "" } });
      if (!res.ok) { toast.error("Failed to load invoice"); setInvoiceId(""); setRows([]); return; }
      const data = await res.json();
      if (data.items?.length === 0) { toast("This invoice is fully returned"); setInvoiceId(""); setRows([]); return; }
      setCustomerName(data.customerName || "");
      setCustomerId(data.customerId || "");
      setRows((data.items || []).map((it: any) => ({ ...it, discountPercent: "", taxPercent: "" })));
    } catch (e: any) { toast.error("Error: " + e.message); }
  }, [invoices]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.code === "F7" || e.key === "F7") && showForm && !preview) {
        e.preventDefault(); setDate(today); setInvoiceId(""); setCustomerId(""); setCustomerName(""); setDisplayInvoiceNo("");
      }
      if ((e.code === "F8" || e.key === "F8") && showForm && !preview) {
        e.preventDefault();
        const q = prompt("Search invoice no or customer name:");
        if (q) {
          const found = invoices.find(i => i.invoiceNo.toLowerCase().includes(q.toLowerCase()) || i.customerName.toLowerCase().includes(q.toLowerCase()));
          if (found) handleInvoiceChange(found.id); else toast(`No invoice matching "${q}"`);
        }
      }
    }
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [today, showForm, preview, invoices, handleInvoiceChange]);

  useEffect(() => {
    loadReturns();
    const u = getCurrentUser();
    if (!u) return;
    fetch("/api/sales-invoice", { headers: { "x-user-role": u.role || "", "x-user-id": u.id || "" } })
      .then(r => r.ok ? r.json() : { invoices: [] })
      .then(d => { if (d?.invoices) setInvoices(d.invoices.filter((i: any) => i.status !== "RETURNED")); });
  }, [loadReturns]);

  function updateRow(i: number, key: "qty" | "discountPercent" | "taxPercent", value: any) {
    const copy = [...rows];
    if (key === "qty") copy[i] = { ...copy[i], qty: Number(value) > copy[i].maxQty ? copy[i].maxQty : value };
    else (copy[i] as any)[key] = value;
    setRows(copy);
  }

  const subtotal         = rows.reduce((s, r) => s + (Number(r.qty) || 0) * r.rate, 0);
  const perItemDiscAmt   = rows.reduce((s, r) => s + (Number(r.qty) || 0) * r.rate * (Number(r.discountPercent) || 0) / 100, 0);
  const perItemTaxAmt    = rows.reduce((s, r) => { const b = (Number(r.qty) || 0) * r.rate * (1 - (Number(r.discountPercent) || 0) / 100); return s + b * (Number(r.taxPercent) || 0) / 100; }, 0);
  const discountAmt      = discountType === "percent" ? subtotal * (Number(discount) || 0) / 100 : Number(discount) || 0;
  const netTotal         = subtotal - perItemDiscAmt + perItemTaxAmt - discountAmt + (Number(freight) || 0);
  const cur              = companyInfo?.baseCurrency || "Rs.";

  async function saveReturn() {
    const clean = rows.filter(r => r.itemId && Number(r.qty) > 0).map(r => ({
      ...r, qty: Number(r.qty),
      discountPercent: Number(r.discountPercent) || 0,
      taxPercent: Number(r.taxPercent) || 0,
    }));
    if (!invoiceId || !clean.length) { toast.error("Select invoice and items to return"); return; }
    setSaving(true);
    try {
      const method = editing ? "PUT" : "POST";
      const body = {
        ...(editing ? { id: editing.id } : {}),
        customerId, invoiceId, date, dueDate: dueDate || null,
        freight: freight || 0, discount: Number(discount) || 0, discountType,
        notes: notes || null, reference: reference || null,
        items: clean, driverName, vehicleNo, remarks,
      };
      const res = await fetch("/api/sale-return", { method, headers: { "Content-Type": "application/json", "x-user-role": user?.role || "ADMIN" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) {
        setReturnNo(data.returnNo);
        setSavedData({ returnNo: data.returnNo, date, customerName, invoiceNo: displayInvoiceNo, items: clean, total: subtotal, freight: Number(freight) || 0, netTotal, driverName, vehicleNo, remarks });
        setPreview(true);
        await loadReturns();
        if (editing) { setEditing(null); setShowForm(false); setShowList(true); }
        toast.success("Return recorded!");
      } else toast.error(data.error);
    } finally { setSaving(false); }
  }

  function startEdit(ret: SaleReturn) {
    const ret2 = ret as any;
    setEditing(ret); setInvoiceId(ret.invoiceId); setDisplayInvoiceNo(ret.invoice?.invoiceNo || "");
    setCustomerId(ret.customerId); setCustomerName(ret.customer?.name || "");
    setDate(new Date(ret.date).toISOString().slice(0, 10));
    setDueDate(ret2.dueDate ? new Date(ret2.dueDate).toISOString().slice(0, 10) : "");
    setDiscount(ret2.discount ?? ""); setDiscountType(ret2.discountType || "flat");
    setNotes(ret2.notes || ""); setReference(ret2.reference || "");
    setDriverName(ret.driverName || ""); setVehicleNo(ret.vehicleNo || ""); setRemarks(ret.remarks || "");
    setRows(ret.items.map(it => ({ itemId: it.itemId || "", name: it.item?.name || "", qty: it.qty, rate: it.rate, maxQty: it.qty, discountPercent: it.discountPercent ?? "", taxPercent: it.taxPercent ?? "" })));
    setShowForm(true); setShowList(false);
  }

  async function deleteReturn(id: string) {
    if (!await confirmToast("Delete this return?")) return;
    const res = await fetch(`/api/sale-return?id=${id}`, { method: "DELETE", headers: { "x-user-role": user?.role || "ADMIN" } });
    if (res.ok) { toast.success("Deleted"); await loadReturns(); } else toast.error("Delete failed");
  }

  function resetForm() {
    setEditing(null); setInvoiceId(""); setDisplayInvoiceNo(""); setCustomerId(""); setCustomerName("");
    setDate(today); setDueDate(""); setFreight(""); setDiscount(""); setDiscountType("flat");
    setNotes(""); setReference(""); setDriverName(""); setVehicleNo(""); setRemarks("");
    setRows([]); setPreview(false); setSavedData(null); setReturnNo("");
  }

  return (
    <>
      {/* Print CSS */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area { position: fixed; inset: 0; }
          @page { margin: 8mm 10mm; }
        }
        @media screen { .print-area { display: none; } }
      `}</style>

      <div style={{ padding: isMobile ? 12 : 24, fontFamily: FONT, color: TEXT, maxWidth: 1380, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: -0.5, color: ACCENT }}>Sales Return</h1>
            <p style={{ margin: "3px 0 0", fontSize: 13, color: MUTED }}>{returns.length} total returns</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => { setShowList(!showList); if (!showList) { setShowForm(false); loadReturns(); } else setShowForm(true); }} style={{ padding: isMobile ? "8px 9px" : "9px 18px", borderRadius: 8, border: `1px solid ${BORDER}`, background: showList ? "rgba(248,113,113,0.12)" : PANEL, color: showList ? ACCENT : TEXT, fontFamily: FONT, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{showList ? "Hide List" : "Show List"}</button>
            <button onClick={() => { setShowForm(true); setShowList(false); resetForm(); }} style={{ padding: isMobile ? "8px 10px" : "9px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#f87171,#dc2626)", color: "#fff", fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(220,38,38,0.35)" }}>+ New Return</button>
          </div>
        </div>

        {/* List */}
        {showList && (
          <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden", marginBottom: 24 }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 700 }}>
                <thead>
                  <tr style={{ background: "rgba(248,113,113,0.07)" }}>
                    {["Return No", "Date", "Customer", "Invoice", "Total", "Actions"].map((h, hi) => (
                      <th key={h} style={{ padding: isMobile ? "8px 8px" : "12px 16px", textAlign: hi >= 4 ? "right" : "left", color: MUTED, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.7 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {returns.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: isMobile ? "24px 8px" : "40px 16px", textAlign: "center", color: MUTED }}>No returns found</td></tr>
                  ) : returns.map(ret => (
                    <tr key={ret.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                      <td style={{ padding: isMobile ? "8px 8px" : "13px 16px", fontWeight: 700, color: ACCENT, fontFamily: "monospace", fontSize: 13 }}>{ret.returnNo}</td>
                      <td style={{ padding: isMobile ? "8px 8px" : "13px 16px", color: MUTED }}>{fmtDate(ret.date)}</td>
                      <td style={{ padding: isMobile ? "8px 8px" : "13px 16px", fontWeight: 600 }}>{ret.customer?.name || "—"}</td>
                      <td style={{ padding: isMobile ? "8px 8px" : "13px 16px", color: MUTED }}>{ret.invoice?.invoiceNo || "—"}</td>
                      <td style={{ padding: isMobile ? "8px 8px" : "13px 16px", textAlign: "right", fontWeight: 700 }}>{fmt(ret.total)}</td>
                      <td style={{ padding: isMobile ? "8px 8px" : "13px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                        <button onClick={() => startEdit(ret)} style={{ padding: isMobile ? "8px 8px" : "5px 13px", borderRadius: 6, border: "1px solid rgba(248,113,113,0.35)", background: "rgba(248,113,113,0.08)", color: ACCENT, fontFamily: FONT, fontSize: 11, fontWeight: 700, cursor: "pointer", marginRight: 8 }}>Edit</button>
                        <button onClick={() => deleteReturn(ret.id)} style={{ padding: isMobile ? "8px 8px" : "5px 13px", borderRadius: 6, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontFamily: FONT, fontSize: 11, cursor: "pointer" }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: isMobile ? "8px 9px" : "11px 18px", borderTop: `1px solid ${BORDER}`, fontSize: 12, color: MUTED }}>{returns.length} returns</div>
          </div>
        )}

        {/* Form */}
        {showForm && !preview && (
          <div className="no-print">
            {/* Page header card */}
            <div style={{ background: PANEL, border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: isMobile ? "8px 11px" : "14px 22px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(248,113,113,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2"><polyline points="3 6 5 2 19 2 21 6"/><path d="M1 6h22"/><path d="M5 6l1 14h12l1-14"/><line x1="9" y1="11" x2="9" y2="17"/><line x1="15" y1="11" x2="15" y2="17"/></svg>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: ACCENT }}>{editing ? "Edit Sales Return" : "New Sales Return"}</div>
                <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>F7 = Clear &nbsp;|&nbsp; F8 = Search Invoice</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 320px", gap: 20, alignItems: "start" }}>

              {/* LEFT COLUMN */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Invoice Select + Customer Details */}
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
                  <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: TEXT }}>Invoice & Customer</div>
                    <div style={{ marginBottom: 10 }}>
                      <Label>Select Invoice (F7/F8)</Label>
                      <select style={inp()} value={invoiceId} onChange={e => handleInvoiceChange(e.target.value)}>
                        <option value="">— Choose Invoice —</option>
                        {invoices.map(i => <option key={i.id} value={i.id}>{i.invoiceNo} — {i.customerName}</option>)}
                      </select>
                    </div>
                    {customerName && (
                      <div style={{ padding: isMobile ? "8px 8px" : "10px 12px", background: "rgba(248,113,113,0.06)", borderRadius: 8, border: `1px solid rgba(248,113,113,0.25)` }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: ACCENT, marginBottom: 2 }}>{customerName}</div>
                        {displayInvoiceNo && <div style={{ fontSize: 11, color: MUTED }}>Invoice: {displayInvoiceNo}</div>}
                      </div>
                    )}
                  </div>
                  <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: TEXT }}>Your Business</div>
                    {companyInfo ? (
                      <div style={{ padding: isMobile ? "8px 8px" : "10px 12px", background: "var(--panel-bg-2,rgba(255,255,255,0.03))", borderRadius: 8, border: `1px solid ${BORDER}` }}>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{companyInfo.name}</div>
                        {companyInfo.address && <div style={{ fontSize: 12, color: MUTED, marginBottom: 3 }}>{companyInfo.address}</div>}
                        {companyInfo.phone && <div style={{ fontSize: 12, color: MUTED }}>{companyInfo.phone}</div>}
                      </div>
                    ) : <div style={{ fontSize: 12, color: MUTED, fontStyle: "italic" }}>Loading…</div>}
                  </div>
                </div>

                {/* Items Table */}
                {rows.length > 0 && (
                  <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
                    <div style={{ padding: isMobile ? "8px 8px" : "12px 16px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>Return Items</div>
                      <div style={{ fontSize: 11, color: MUTED }}>{rows.filter(r => Number(r.qty) > 0).length} selected</div>
                    </div>
                    {isMobile ? (
                      <div style={{ padding: isMobile ? "8px 8px" : "10px 14px" }}>
                        {rows.map((r, i) => (
                          <div key={i} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: isMobile ? "8px 8px" : "12px 14px", marginBottom: 10 }}>
                            <div style={{ fontWeight: 700, color: TEXT, marginBottom: 6 }}>{r.name}</div>
                            <div style={{ fontSize: 11, color: MUTED, marginBottom: 8 }}>Max returnable: <strong style={{ color: "#60a5fa" }}>{r.maxQty}</strong></div>
                            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8 }}>
                              <div><Label>Return Qty</Label><input type="number" min={0} max={r.maxQty} value={r.qty} onChange={e => updateRow(i, "qty", e.target.value)} style={inp({ textAlign: "right", borderColor: "rgba(248,113,113,0.4)" })} /></div>
                              <div><Label>Rate</Label><div style={{ ...inp(), background: "transparent" }}>{fmt(r.rate)}</div></div>
                              <div><Label>Disc%</Label><input type="number" value={r.discountPercent} onChange={e => updateRow(i, "discountPercent", e.target.value)} style={inp({ textAlign: "right" })} /></div>
                              <div><Label>Tax%</Label><input type="number" value={r.taxPercent} onChange={e => updateRow(i, "taxPercent", e.target.value)} style={inp({ textAlign: "right" })} /></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 540 }}>
                          <thead>
                            <tr style={{ background: "rgba(248,113,113,0.06)" }}>
                              {["Item", "Max Qty", "Return Qty", "Rate", "Disc%", "Tax%", "Amount", "×"].map((h, hi) => (
                                <th key={hi} style={{ padding: isMobile ? "8px 8px" : "10px 8px", textAlign: hi >= 3 ? "right" : "left", color: MUTED, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.6 }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((r, i) => {
                              const lineBase = (Number(r.qty) || 0) * r.rate;
                              const lineDisc = lineBase * (Number(r.discountPercent) || 0) / 100;
                              const lineTax  = (lineBase - lineDisc) * (Number(r.taxPercent) || 0) / 100;
                              return (
                                <tr key={i} style={{ borderTop: `1px solid ${BORDER}` }}>
                                  <td style={{ padding: "8px", fontWeight: 600, fontSize: 13, minWidth: 120 }}>{r.name}</td>
                                  <td style={{ padding: "8px", textAlign: "left", fontWeight: 700, color: "#60a5fa", fontSize: 13 }}>{r.maxQty}</td>
                                  <td style={{ padding: isMobile ? "8px 8px" : "6px 8px", width: 90 }}><input type="number" min={0} max={r.maxQty} value={r.qty} onChange={e => updateRow(i, "qty", e.target.value)} style={inp({ padding: isMobile ? "8px 8px" : "5px 7px", textAlign: "right", fontSize: 13, borderColor: "rgba(248,113,113,0.4)" })} /></td>
                                  <td style={{ padding: "8px", textAlign: "right", fontSize: 13, color: MUTED, width: 80 }}>{fmt(r.rate)}</td>
                                  <td style={{ padding: isMobile ? "8px 8px" : "6px 8px", width: 72 }}><input type="number" value={r.discountPercent} onChange={e => updateRow(i, "discountPercent", e.target.value)} placeholder="0" style={inp({ padding: isMobile ? "8px 8px" : "5px 7px", textAlign: "right", fontSize: 13 })} /></td>
                                  <td style={{ padding: isMobile ? "8px 8px" : "6px 8px", width: 72 }}><input type="number" value={r.taxPercent} onChange={e => updateRow(i, "taxPercent", e.target.value)} placeholder="0" style={inp({ padding: isMobile ? "8px 8px" : "5px 7px", textAlign: "right", fontSize: 13 })} /></td>
                                  <td style={{ padding: "8px", textAlign: "right", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", width: 90 }}>{fmt(lineBase - lineDisc + lineTax)}</td>
                                  <td style={{ padding: isMobile ? "8px 8px" : "6px 8px", width: 28 }}><button onClick={() => setRows(rows.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: ACCENT, cursor: "pointer", fontSize: 17, padding: 0 }}>×</button></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
                {rows.length === 0 && invoiceId && <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 40, textAlign: "center", color: MUTED }}>Loading invoice items…</div>}
                {rows.length === 0 && !invoiceId && <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 40, textAlign: "center", color: MUTED, fontSize: 14 }}>Select an invoice above to load returnable items</div>}

                {/* Transport + Notes */}
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
                  <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: TEXT }}>Transport Details</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div><Label>Driver / Person Name</Label><input style={inp()} value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="e.g. Ali Rikshaw wala" /></div>
                      <div><Label>Vehicle / Rikshaw No</Label><input style={inp()} value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} placeholder="e.g. LEA-1234" /></div>
                      <div><Label>Reference</Label><input style={inp()} value={reference} onChange={e => setReference(e.target.value)} placeholder="Reference no." /></div>
                    </div>
                  </div>
                  <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: TEXT }}>Notes & Remarks</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div><Label>Return Reason / Remarks</Label><textarea style={{ ...inp({ minHeight: 60, resize: "vertical" as const }) }} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="e.g. Damaged goods, Wrong item" /></div>
                      <div><Label>Internal Notes</Label><textarea style={{ ...inp({ minHeight: 60, resize: "vertical" as const }) }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any internal notes…" /></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16, position: isMobile ? "static" : "sticky", top: 24 }}>

                {/* Return Header */}
                <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Sales Return</div>
                  <div style={{ fontSize: 17, fontWeight: 800, fontFamily: "monospace", color: ACCENT, marginBottom: 16 }}>{editing?.returnNo || returnNo || "Auto #"}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                      <div><Label>Return Date</Label><DateInput value={date} onChange={setDate} style={inp()} /></div>
                      <div><Label>Due Date</Label><DateInput value={dueDate} onChange={setDueDate} style={inp()} /></div>
                    </div>
                  </div>
                </div>

                {/* Totals */}
                <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: MUTED }}>Subtotal</span><span>{cur} {fmt(subtotal)}</span></div>
                    {perItemDiscAmt > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--danger,#f87171)" }}><span>Item Discounts</span><span>— {cur} {fmt(perItemDiscAmt)}</span></div>}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                      <span style={{ color: MUTED }}>Overall Discount</span>
                      <div style={{ display: "flex", gap: 5 }}>
                        <select value={discountType} onChange={e => setDiscountType(e.target.value)} style={{ ...inp({ width: 58, padding: isMobile ? "8px 8px" : "3px 6px", fontSize: 12 }) }}><option value="flat">Flat</option><option value="percent">%</option></select>
                        <input type="number" value={discount} onChange={e => setDiscount(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0" style={{ ...inp({ width: 80, padding: isMobile ? "8px 8px" : "3px 7px", fontSize: 12, textAlign: "right" }) }} />
                      </div>
                    </div>
                    {discountAmt > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--danger,#f87171)" }}><span>Discount Amount</span><span>— {cur} {fmt(discountAmt)}</span></div>}
                    {perItemTaxAmt > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#60a5fa" }}><span>Item Tax</span><span>+ {cur} {fmt(perItemTaxAmt)}</span></div>}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                      <span style={{ color: MUTED }}>Freight</span>
                      <input type="number" value={freight} onChange={e => setFreight(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0.00" style={{ ...inp({ width: 100, padding: isMobile ? "8px 8px" : "3px 7px", fontSize: 12, textAlign: "right" }) }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: `2px solid ${BORDER}`, paddingTop: 12, fontSize: 18, fontWeight: 800 }}>
                      <span>Net Total</span>
                      <span style={{ color: ACCENT }}>{cur} {fmt(netTotal)}</span>
                    </div>
                  </div>
                </div>

                {/* Save Buttons */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <button onClick={saveReturn} disabled={saving || rows.length === 0} style={{ padding: "12px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#f87171,#dc2626)", color: "#fff", fontFamily: FONT, fontSize: 15, fontWeight: 700, cursor: saving || rows.length === 0 ? "not-allowed" : "pointer", opacity: saving || rows.length === 0 ? 0.6 : 1 }}>{saving ? "Saving…" : editing ? "Update Return" : "Confirm Sales Return"}</button>
                  <button onClick={() => { setShowForm(false); resetForm(); }} style={{ padding: "10px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontFamily: FONT, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview */}
        {showForm && preview && savedData && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="no-print">
              <PrintActionBar
                onPrintA4={() => window.print()}
                onWhatsApp={() => {
                  const msg = `*SALES RETURN VOUCHER: ${savedData.returnNo}*\nDate: ${savedData.date}\nCustomer: ${savedData.customerName}\nRef Invoice: ${savedData.invoiceNo}\n\nTotal: ${fmt(savedData.netTotal)}`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
                }}
                onEmail={() => {
                  const email = prompt("Customer email:");
                  if (!email?.includes("@")) return;
                  fetch("/api/email/send", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      type: "generic",
                      to: email,
                      subject: `Sales Return Voucher ${savedData.returnNo}`,
                      html: `<p>Dear ${savedData.customerName},</p><p>Your Sales Return Voucher <strong>${savedData.returnNo}</strong> dated ${savedData.date} has been processed.</p><p>Net Total: ${fmt(savedData.netTotal)}</p>`,
                    }),
                  }).then(r => r.ok ? toast.success("Email sent!") : toast.error("Email failed")).catch(() => toast.error("Email failed"));
                }}
                onEdit={() => setPreview(false)}
                onNew={() => { setPreview(false); resetForm(); }}
                newLabel="New Return"
              />
            </div>
            <PrintPaperWrapper>
              <PrintDocA4
                companyName={companyInfo?.name || "Company Name"}
                companyAddress={companyInfo?.address}
                companyPhone={companyInfo?.phone}
                docTitle="SALES RETURN VOUCHER"
                docNo={savedData.returnNo}
                date={savedData.date}
                partyLabel="Customer"
                partyName={savedData.customerName}
                metaFields={[
                  { label: "Ref Invoice", value: savedData.invoiceNo },
                  ...(savedData.driverName ? [{ label: "Driver", value: savedData.driverName }] : []),
                  ...(savedData.vehicleNo ? [{ label: "Vehicle", value: savedData.vehicleNo }] : []),
                ]}
                columns={[
                  { key: "no", label: "#", align: "center", width: 30 },
                  { key: "name", label: "Description" },
                  { key: "qty", label: "Qty", align: "center", width: 70 },
                  { key: "rate", label: "Rate", align: "right", width: 80 },
                  { key: "amount", label: "Amount", align: "right", width: 90 },
                ]}
                rows={savedData.items.map((it, idx) => ({
                  no: idx + 1,
                  name: it.name,
                  qty: it.qty,
                  rate: fmt(it.rate),
                  amount: fmt(it.qty * it.rate),
                }))}
                totalsLines={[
                  { label: "Subtotal:", value: savedData.total },
                  ...(savedData.freight > 0 ? [{ label: "Freight:", value: savedData.freight }] : []),
                  { label: "Net Total:", value: savedData.netTotal, bold: true, borderTop: true },
                ]}
                notes={savedData.remarks || undefined}
                signatureLabels={["Received By", "Authorized By"]}
              />
            </PrintPaperWrapper>
          </div>
        )}
      </div>

      {/* Print Area */}
      {preview && savedData && (
        <div className="print-area" style={{ fontFamily: "'Outfit','Arial',sans-serif", fontSize: 13, color: "#000", background: "#fff", padding: "8mm 10mm" }}>
          <div style={{ textAlign: "center", borderBottom: "3px solid #000", paddingBottom: 14, marginBottom: 20 }}>
            <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: 1 }}>SALES RETURN VOUCHER</div>
            <div style={{ fontSize: 12, color: "#333", marginTop: 4 }}>Date: {savedData.date} &nbsp;|&nbsp; Voucher No: {savedData.returnNo}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 16, fontSize: 12 }}>
            <div><strong>Customer:</strong> {savedData.customerName}</div>
            <div><strong>Ref Invoice:</strong> {savedData.invoiceNo}</div>
            {savedData.driverName && <div><strong>Driver / Person:</strong> {savedData.driverName}</div>}
            {savedData.vehicleNo  && <div><strong>Vehicle No:</strong> {savedData.vehicleNo}</div>}
            {savedData.remarks    && <div style={{ gridColumn: "1 / -1" }}><strong>Reason:</strong> {savedData.remarks}</div>}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 18 }}>
            <thead>
              <tr style={{ borderTop: "2px solid #000", borderBottom: "2px solid #000", background: "#f0f0f0" }}>
                <th style={{ padding: isMobile ? "8px 8px" : "8px 10px", textAlign: "left" }}>Description</th>
                <th style={{ padding: isMobile ? "8px 8px" : "8px 10px", textAlign: "center", width: 60 }}>Qty</th>
                <th style={{ padding: isMobile ? "8px 8px" : "8px 10px", textAlign: "right", width: 90 }}>Rate</th>
                <th style={{ padding: isMobile ? "8px 8px" : "8px 10px", textAlign: "right", width: 100 }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {savedData.items.map((it, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #ddd" }}>
                  <td style={{ padding: isMobile ? "8px 8px" : "8px 10px", fontWeight: 600 }}>{it.name}</td>
                  <td style={{ padding: isMobile ? "8px 8px" : "8px 10px", textAlign: "center" }}>{it.qty}</td>
                  <td style={{ padding: isMobile ? "8px 8px" : "8px 10px", textAlign: "right" }}>{fmt(it.rate)}</td>
                  <td style={{ padding: isMobile ? "8px 8px" : "8px 10px", textAlign: "right", fontWeight: 600 }}>{fmt(it.qty * it.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 28 }}>
            <div style={{ width: 240, fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span>Subtotal:</span><span>{fmt(savedData.total)}</span></div>
              {savedData.freight > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span>Freight:</span><span>{fmt(savedData.freight)}</span></div>}
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "3px solid #000", paddingTop: 8, fontWeight: 900, fontSize: 16 }}><span>Net Total:</span><span>{fmt(savedData.netTotal)}</span></div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 40 }}>
            {["Prepared By", "Received By"].map(l => (
              <div key={l}><div style={{ borderTop: "1px solid #000", paddingTop: 6, fontSize: 11, color: "#444" }}>{l}</div></div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
