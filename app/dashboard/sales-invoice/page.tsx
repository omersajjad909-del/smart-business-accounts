"use client";
import { fmtDate } from "@/lib/dateUtils";
import { confirmToast } from "@/lib/toast-feedback";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import dynamic from "next/dynamic";
import { getCurrentUser } from "@/lib/auth";
import { QRCodeSVG } from "qrcode.react";
import { hasPermission } from "@/lib/hasPermission";
import { PERMISSIONS } from "@/lib/permissions";

const Barcode = dynamic(() => import("react-barcode"), {
  ssr: false,
  loading: () => <span />,
});

// ─── Design tokens ────────────────────────────────────────────────────────────
const ff = "'Outfit','Inter',sans-serif";
const accent = "#6366f1";

// ─── Types ───────────────────────────────────────────────────────────────────
type Account = { id: string; name: string };
type Item = { id: string; name: string; description?: string; availableQty: number; barcode?: string; salePrice?: number };
type Row = { itemId: string; name: string; description: string; availableQty: number; qty: number | ""; rate: number | "" };
type SalesInvoice = {
  id: string; invoiceNo: string; date: string; customerId: string;
  customer?: { name: string }; total: number;
  items: Array<{ item: { name: string; description?: string }; qty: number; rate: number }>;
  driverName?: string; vehicleNo?: string;
};
type TaxConfig = { id: string; taxType: string; taxCode: string; taxRate: number; description?: string };
type Currency = { id: string; code: string; name: string; exchangeRate: number };

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Component ───────────────────────────────────────────────────────────────
function SalesInvoiceContent() {
  const searchParams = useSearchParams();
  const queryId = searchParams.get("id");
  const today = new Date().toISOString().slice(0, 10);
  const user = getCurrentUser();
  const canCreate = hasPermission(user, PERMISSIONS.CREATE_SALES_INVOICE);
  const [isMobile, setIsMobile] = useState(false);

  // ── Data ──
  const [customers, setCustomers]   = useState<Account[]>([]);
  const [items, setItems]           = useState<Item[]>([]);
  const [invoices, setInvoices]     = useState<SalesInvoice[]>([]);
  const [taxes, setTaxes]           = useState<TaxConfig[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  // ── View state ──
  const [showList, setShowList]   = useState(false);
  const [showForm, setShowForm]   = useState(true);
  const [editing, setEditing]     = useState<SalesInvoice | null>(null);
  const [preview, setPreview]     = useState(false);
  const [printMode, setPrintMode] = useState<"a4" | "55mm">("a4");
  const [previewMode, setPreviewMode] = useState<"INVOICE" | "DELIVERY">("INVOICE");
  const [loading, setLoading]     = useState(true);

  // ── Form state ──
  const [invoiceNo, setInvoiceNo]       = useState("");
  const [linkedSoId, setLinkedSoId]     = useState("");
  const [linkedSoNo, setLinkedSoNo]     = useState("");
  const [customerId, setCustomerId]     = useState("");
  const [customerName, setCustomerName] = useState("");
  const [date, setDate]                 = useState(today);
  const [location, setLocation]         = useState("MAIN");
  const [driverName, setDriverName]     = useState("");
  const [vehicleNo, setVehicleNo]       = useState("");
  const [notes, setNotes]               = useState("");
  const [rows, setRows]                 = useState<Row[]>([{ itemId: "", name: "", description: "", availableQty: 0, qty: "", rate: "" }]);
  const [freight, setFreight]           = useState<number | "">("");
  const [discount, setDiscount]         = useState<number | "">("");
  const [discountType, setDiscountType] = useState<"flat" | "percent">("flat");
  const [applyTax, setApplyTax]         = useState(false);
  const [selectedTaxId, setSelectedTaxId] = useState("");
  const [currencyId, setCurrencyId]     = useState("");
  const [exchangeRate, setExchangeRate] = useState(1);
  const [saving, setSaving]             = useState(false);
  const [savedInvoice, setSavedInvoice] = useState<any>(null);
  const [scanCode, setScanCode]         = useState("");
  const [scanActive, setScanActive]     = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [origin, setOrigin]             = useState("");

  // ── Logo / print prefs ──
  const [printPrefs, setPrintPrefs] = useState({ showLogo: true, logoUrl: "", headerNote: "", footerNote: "Thank you for your business." });

  // ── Init ──
  useEffect(() => {
    setOrigin(window.location.origin);
    fetch("/api/me/company").then(r => r.ok ? r.json() : null).then(d => { if (d) setCompanyInfo(d); });
    fetch("/api/company/admin-control").then(r => r.ok ? r.json() : null).then(d => {
      if (d?.printPreferences) setPrintPrefs(p => ({ ...p, ...d.printPreferences }));
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 900px)");
    const onChange = () => setIsMobile(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    fetch("/api/currencies").then(r => r.json()).then(d => { if (Array.isArray(d)) setCurrencies(d); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    loadInvoices();
    const h: Record<string, string> = {
      "x-user-role": user.role || "",
      "x-user-id": user.id || "",
      ...(user.companyId ? { "x-company-id": user.companyId } : {}),
    };
    fetch("/api/accounts", { headers: h }).then(r => r.json()).then(d => {
      const list = Array.isArray(d) ? d : d.accounts || [];
      setCustomers(list.filter((a: any) => a.partyType === "CUSTOMER"));
    });
    fetch("/api/items-new", { headers: h }).then(r => r.json()).then(d => {
      const list = Array.isArray(d) ? d : [];
      setItems(list.map((i: any) => ({ id: i.id, name: i.name, description: i.description || "", availableQty: 0, barcode: i.barcode || "", salePrice: i.rate ?? 0 })));
    });
    fetch("/api/tax-configuration").then(r => r.json()).then(d => setTaxes(Array.isArray(d) ? d : [])).catch(() => {});
    fetch("/api/sales-invoice", { headers: { "x-user-role": user.role || "", "x-user-id": user.id || "" } })
      .then(r => { if (r.status === 403) throw new Error("No Permission"); return r.json(); })
      .then(d => { if (d?.nextNo) setInvoiceNo(d.nextNo); })
      .catch(() => {});
  }, []);

  // ── Pre-fill from Sales Order ──
  useEffect(() => {
    const draft = sessionStorage.getItem("draft_invoice_from_so");
    if (!draft) return;
    try {
      const so = JSON.parse(draft);
      sessionStorage.removeItem("draft_invoice_from_so");
      if (so.soId) setLinkedSoId(so.soId);
      if (so.soNo) setLinkedSoNo(so.soNo);
      if (so.customerId) setCustomerId(so.customerId);
      if (so.customerName) setCustomerName(so.customerName);
      if (so.date) setDate(so.date);
      if (so.notes) setNotes(so.notes + (so.soNo ? `\nRef: Sales Order ${so.soNo}` : ""));
      if (so.items?.length) {
        const mapped = so.items.filter((i: any) => i.name || i.itemId).map((i: any) => ({
          itemId: i.itemId || "", name: i.name || "", description: "", availableQty: 0, qty: i.qty || 1, rate: i.unitPrice || 0,
        }));
        if (mapped.length > 0) setRows(mapped);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!queryId || !user) return;
    fetch(`/api/sales-invoice?id=${queryId}`, { headers: { "x-user-role": user.role || "", "x-user-id": user.id || "" } })
      .then(r => r.json()).then(inv => {
        if (inv && !inv.error) { setSavedInvoice(inv); setInvoiceNo(inv.invoiceNo || invoiceNo); setCustomerName(inv.customer?.name || ""); setPreview(true); setShowForm(true); setShowList(false); }
      }).catch(() => {});
  }, [queryId, user]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.code === "F7" || e.key === "F7") && showForm && !preview) { e.preventDefault(); setDate(today); setCustomerId(""); setCustomerName(""); }
      if ((e.code === "F8" || e.key === "F8") && showForm && !preview) {
        e.preventDefault();
        const q = prompt("Enter customer name or invoice no:");
        if (q) { const found = customers.find(c => c.name.toLowerCase().includes(q.toLowerCase())); if (found) { setCustomerId(found.id); setCustomerName(found.name); } else toast.error(`No customer found for "${q}"`); }
      }
    }
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [today, showForm, preview, customers]);

  async function loadInvoices() {
    try {
      const res = await fetch("/api/sales-invoice", { headers: { "x-user-role": user?.role || "", "x-user-id": user?.id || "" } });
      const data = await res.json();
      if (data?.invoices) setInvoices(data.invoices);
    } catch {}
  }

  function handleScan(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!scanCode) return;
      const found = items.find(i => i.barcode === scanCode || i.id === scanCode);
      if (found) {
        const newRow: Row = { itemId: found.id, name: found.name, description: found.description || "", availableQty: found.availableQty, qty: 1, rate: "" };
        const last = rows[rows.length - 1];
        if (!last.itemId) { const r = [...rows]; r[rows.length - 1] = newRow; setRows(r); } else setRows([...rows, newRow]);
        toast.success(`Added ${found.name}`); setScanCode("");
      } else { toast.error("Item not found"); setScanCode(""); }
    }
  }

  function addRow() { setRows(r => [...r, { itemId: "", name: "", description: "", availableQty: 0, qty: "", rate: "" }]); }

  function selectItem(idx: number, itemId: string) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const copy = [...rows];
    copy[idx] = { ...copy[idx], itemId: item.id, name: item.name, description: item.description || "", availableQty: item.availableQty, qty: "", rate: item.salePrice || "" };
    setRows(copy);
  }

  function updateRow(idx: number, key: "qty" | "rate", val: string) {
    const copy = [...rows];
    copy[idx][key] = val === "" ? "" : Number(val);
    setRows(copy);
  }

  function removeRow(idx: number) { if (rows.length > 1) setRows(rows.filter((_, i) => i !== idx)); }

  const subtotal      = rows.reduce((s, r) => s + (Number(r.qty) * Number(r.rate) || 0), 0);
  const discountAmt   = discount === "" ? 0 : discountType === "percent" ? (subtotal * Number(discount) / 100) : Number(discount);
  const afterDiscount = subtotal - discountAmt;
  const selectedTax   = taxes.find(t => t.id === selectedTaxId);
  const taxAmt        = applyTax && selectedTax ? (afterDiscount * selectedTax.taxRate / 100) : 0;
  const netTotal      = afterDiscount + (freight === "" ? 0 : Number(freight)) + taxAmt;

  async function saveInvoice() {
    const clean = rows.filter(r => r.itemId && r.qty && r.rate);
    if (!customerId || !clean.length) { toast.error("Customer aur items zaroori hain"); return; }
    setSaving(true);
    try {
      const method = editing ? "PUT" : "POST";
      const baseBody = {
        invoiceNo, customerId, date, location, driverName, vehicleNo,
        freight: freight || 0,
        items: clean.map(r => ({ itemId: r.itemId, qty: Number(r.qty), rate: Number(r.rate) })),
        applyTax, taxConfigId: applyTax ? selectedTaxId : null,
        currencyId: currencyId || null, exchangeRate,
        soId: (!editing && linkedSoId) ? linkedSoId : undefined,
      };
      const body = editing ? { id: editing.id, ...baseBody } : baseBody;
      const res = await fetch("/api/sales-invoice", { method, credentials: "include", headers: { "Content-Type": "application/json", "x-user-role": user?.role || "", "x-user-id": user?.id || "" }, body: JSON.stringify(body) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Save failed"); }
      const data = await res.json();
      if (data.invoice) { setSavedInvoice(data.invoice); setInvoiceNo(data.invoiceNo || invoiceNo); setCustomerName(data.invoice.customer?.name || customerName); }
      setPreview(true);
      await loadInvoices();
      if (editing) { setEditing(null); setShowForm(false); setShowList(true); }
      toast.success("Invoice saved!");
    } catch (e: any) { toast.error("Failed: " + (e.message || "Unknown error")); }
    finally { setSaving(false); }
  }

  function startEdit(inv: SalesInvoice) {
    setEditing(inv); setInvoiceNo(inv.invoiceNo); setCustomerId(inv.customerId);
    setCustomerName(inv.customer?.name || ""); setDate(new Date(inv.date).toISOString().slice(0, 10));
    setDriverName(inv.driverName || ""); setVehicleNo(inv.vehicleNo || "");
    setRows(inv.items.map((it: any) => ({ itemId: it.itemId || "", name: it.item?.name || "", description: it.item?.description || "", availableQty: it.qty || 0, qty: it.qty.toString(), rate: it.rate.toString() })));
    setShowForm(true); setShowList(false);
  }

  async function deleteInvoice(id: string) {
    if (!await confirmToast("Delete this invoice?")) return;
    const res = await fetch(`/api/sales-invoice?id=${id}`, { method: "DELETE", headers: { "x-user-role": user?.role || "", "x-user-id": user?.id || "" } });
    if (res.ok) { toast.success("Deleted"); await loadInvoices(); } else toast.error("Delete failed");
  }

  function resetForm() {
    setEditing(null); setCustomerId(""); setCustomerName(""); setLinkedSoId(""); setLinkedSoNo("");
    setDate(today); setLocation("MAIN"); setDriverName(""); setVehicleNo(""); setFreight("");
    setDiscount(""); setNotes("");
    setRows([{ itemId: "", name: "", description: "", availableQty: 0, qty: "", rate: "" }]);
    setApplyTax(false); setSelectedTaxId(""); setPreview(false); setSavedInvoice(null);
  }

  async function sendInvoiceEmail() {
    if (!savedInvoice?.id) { toast.error("Save invoice first"); return; }
    const email = prompt("Customer email:");
    if (!email?.includes("@")) { toast.error("Invalid email"); return; }
    setSendingEmail(true);
    try {
      const res = await fetch("/api/email/send", { method: "POST", headers: { "Content-Type": "application/json", "x-user-role": user?.role || "", "x-user-id": user?.id || "" }, body: JSON.stringify({ type: "sales-invoice", invoiceId: savedInvoice.id, to: email }) });
      if (res.ok) toast.success("Email sent!"); else toast.error("Email failed");
    } catch { toast.error("Email error"); } finally { setSendingEmail(false); }
  }

  function shareWhatsApp() {
    if (!savedInvoice) return;
    let msg = `*Invoice: ${savedInvoice.invoiceNo}*\nDate: ${fmtDate(savedInvoice.date)}\nCustomer: ${customerName}\n\nItems:\n`;
    savedInvoice.items.forEach((it: any, i: number) => { msg += `${i + 1}. ${it.item.name} x ${it.qty} @ ${it.rate} = ${(it.qty * it.rate).toLocaleString()}\n`; });
    msg += `\n*Total: ${savedInvoice.total.toLocaleString()}*`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  // ── Styles ──
  const panelStyle: React.CSSProperties = { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, fontFamily: ff };
  const inputStyle: React.CSSProperties = { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text-primary)", fontFamily: ff, fontSize: 14, outline: "none", boxSizing: "border-box" };
  const labelStyle: React.CSSProperties = { fontSize: 12, color: "var(--text-muted)", fontWeight: 600, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 0.5 };
  const btnPrimary: React.CSSProperties = { background: accent, color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontFamily: ff, fontSize: 14, fontWeight: 600, cursor: "pointer" };
  const btnGhost: React.CSSProperties = { background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 16px", fontFamily: ff, fontSize: 14, cursor: "pointer" };

  if (!canCreate) return <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontFamily: ff }}>Access Denied</div>;
  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontFamily: ff }}>Loading…</div>;

  const invNo = savedInvoice?.invoiceNo || invoiceNo;
  const invDate = savedInvoice?.date ? new Date(savedInvoice.date).toISOString().slice(0, 10) : date;
  const invCustomer = savedInvoice?.customer?.name || customerName || "—";
  const invItems = savedInvoice?.items || rows.filter(r => r.itemId);
  const invTotal = savedInvoice?.total ?? netTotal;

  return (
    <>
      {/* ── Print CSS ── */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area { position: fixed; inset: 0; }
          @page { margin: 8mm 10mm; }
        }
        @media screen { .print-area { display: none; } }
      `}</style>

      {/* ══════════════════════════ SCREEN UI ══════════════════════════ */}
      <div style={{ padding: isMobile ? "12px 10px" : "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1200 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", marginBottom: 24, gap: 10, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Sales Invoice</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>Create and manage sales invoices</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={btnGhost} onClick={() => { setShowList(!showList); if (!showList) { setShowForm(false); loadInvoices(); } else setShowForm(true); }}>
              {showList ? "Hide List" : "Show List"}
            </button>
            <button style={btnPrimary} onClick={() => { setShowForm(true); setShowList(false); resetForm(); loadInvoices(); }}>
              + New Invoice
            </button>
          </div>
        </div>

        {/* ── Invoices List ── */}
        {showList && (
          <div style={{ ...panelStyle, padding: 0, overflow: "hidden", marginBottom: 24 }}>
            <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Invoice No", "Date", "Customer", "Total", "Actions"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, textAlign: h === "Total" ? "right" : "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>No invoices found</td></tr>
                ) : invoices.map((inv, idx) => (
                  <tr key={inv.id} style={{ borderBottom: idx < invoices.length - 1 ? "1px solid var(--border)" : "none" }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "rgba(255,255,255,0.03)"}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}>
                    <td style={{ padding: "12px 16px", fontWeight: 700, color: accent, fontSize: 14 }}>{inv.invoiceNo}</td>
                    <td style={{ padding: "12px 16px", fontSize: 14, color: "var(--text-muted)" }}>{fmtDate(inv.date)}</td>
                    <td style={{ padding: "12px 16px", fontSize: 14 }}>{inv.customer?.name || "—"}</td>
                    <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 600, textAlign: "right" }}>{fmt(inv.total)}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button style={{ ...btnGhost, padding: "5px 12px", fontSize: 12 }} onClick={() => startEdit(inv)}>Edit</button>
                        <button style={{ ...btnGhost, padding: "5px 12px", fontSize: 12, color: "#f87171", borderColor: "#f8717144" }} onClick={() => deleteInvoice(inv.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {/* ── Form / Preview ── */}
        {showForm && (
          <>
            {/* Action bar */}
            <div style={{ ...panelStyle, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>
                  {preview ? invNo : (editing ? `Edit Invoice — ${invoiceNo}` : `New Invoice — ${invoiceNo}`)}
                </div>
                {linkedSoNo && !preview && (
                  <div style={{ fontSize: 12, color: accent, fontWeight: 600, marginTop: 3 }}>Linked to Sales Order: {linkedSoNo}</div>
                )}
              </div>
              {!preview ? (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button style={btnPrimary} onClick={saveInvoice} disabled={saving}>{saving ? "Saving…" : editing ? "Update Invoice" : "Save & Preview"}</button>
                  <button style={btnGhost} onClick={() => { setShowForm(false); setEditing(null); resetForm(); }}>Cancel</button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button style={{ ...btnPrimary, background: "#16a34a" }} onClick={() => { setPrintMode("a4"); setTimeout(() => window.print(), 100); }}>Print A4</button>
                  <button style={{ ...btnPrimary, background: "#0891b2" }} onClick={() => { setPrintMode("55mm"); setTimeout(() => window.print(), 100); }}>Print 55mm</button>
                  <button style={{ ...btnPrimary, background: "#7c3aed" }} onClick={() => setPreviewMode(p => p === "INVOICE" ? "DELIVERY" : "INVOICE")}>
                    {previewMode === "DELIVERY" ? "Show Rates" : "Delivery Note"}
                  </button>
                  <button style={btnGhost} onClick={sendInvoiceEmail} disabled={sendingEmail}>{sendingEmail ? "Sending…" : "Email"}</button>
                  <button style={{ ...btnGhost, color: "#22c55e", borderColor: "#22c55e44" }} onClick={shareWhatsApp}>WhatsApp</button>
                  <button style={btnGhost} onClick={() => setPreview(false)}>Edit</button>
                  <button style={btnGhost} onClick={() => { setPreview(false); resetForm(); }}>New Invoice</button>
                </div>
              )}
            </div>

            {/* ── Entry Form ── */}
            {!preview && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Row 1: Invoice No, Customer, Date */}
                <div style={{ ...panelStyle }}>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16, fontWeight: 600 }}>
                    Keyboard: <strong style={{ color: accent }}>F7</strong> = Clear Customer/Date &nbsp;|&nbsp; <strong style={{ color: accent }}>F8</strong> = Search Customer
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                    <div>
                      <label style={labelStyle}>Invoice No</label>
                      <input style={{ ...inputStyle, background: "rgba(255,255,255,0.02)", color: "var(--text-muted)" }} value={invoiceNo} readOnly />
                    </div>
                    <div>
                      <label style={labelStyle}>Customer *</label>
                      <select style={inputStyle} value={customerId} onChange={e => { setCustomerId(e.target.value); setCustomerName(customers.find(c => c.id === e.target.value)?.name || ""); }}>
                        <option value="">— Select Customer —</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Date</label>
                      <input type="date" style={inputStyle} value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                    <div>
                      <label style={labelStyle}>Currency</label>
                      <select style={inputStyle} value={currencyId} onChange={e => { const id = e.target.value; setCurrencyId(id); const cur = currencies.find(c => c.id === id); if (cur) setExchangeRate(cur.exchangeRate || 1); }}>
                        <option value="">Base Currency</option>
                        {currencies.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Location</label>
                      <select style={inputStyle} value={location} onChange={e => setLocation(e.target.value)}>
                        <option value="MAIN">Main</option>
                        <option value="SHOP">Shop</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Driver Name</label>
                      <input style={inputStyle} value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="Optional" />
                    </div>
                    <div>
                      <label style={labelStyle}>Vehicle No</label>
                      <input style={inputStyle} value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} placeholder="Optional" />
                    </div>
                  </div>
                </div>

                {/* Barcode Scanner */}
                <div
                  onClick={() => setScanActive(true)}
                  style={{ ...panelStyle, display: "flex", alignItems: "center", gap: 16, cursor: "pointer",
                    background: scanActive ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.05)",
                    border: scanActive ? "1.5px solid rgba(99,102,241,0.55)" : "1px dashed rgba(99,102,241,0.25)",
                  }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: "linear-gradient(135deg,#6366f1,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="10" x2="6" y2="14"/><line x1="10" y1="8" x2="10" y2="16"/><line x1="14" y1="10" x2="14" y2="14"/><line x1="18" y1="9" x2="18" y2="15"/></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#a5b4fc", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Scan Barcode / SKU to Add Item</div>
                    <input value={scanCode} onChange={e => setScanCode(e.target.value)} onKeyDown={handleScan} onFocus={() => setScanActive(true)} onBlur={() => setScanActive(false)}
                      placeholder="Click here and scan barcode or type SKU…"
                      style={{ width: "100%", padding: "9px 14px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(99,102,241,0.3)", color: "white", fontSize: 14, fontFamily: "monospace", outline: "none" }} />
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textAlign: "center", lineHeight: 1.6, flexShrink: 0 }}>Press<br/><span style={{ color: "#a5b4fc", fontWeight: 700 }}>Enter</span><br/>to add</div>
                </div>

                {/* Items Table */}
                <div style={panelStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>Line Items</span>
                    <button style={{ ...btnGhost, padding: "5px 14px", fontSize: 12, color: accent, borderColor: accent + "55" }} onClick={addRow}>+ Add Row</button>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)" }}>
                          {["Item", "Qty", "Rate", "Amount", ""].map(h => (
                            <th key={h} style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, textAlign: h === "Amount" ? "right" : "left" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td style={{ padding: "8px 10px", minWidth: 180 }}>
                              <select style={{ ...inputStyle, padding: "7px 10px" }} value={r.itemId} onChange={e => selectItem(i, e.target.value)}>
                                <option value="">— Select Item —</option>
                                {items.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                              </select>
                            </td>
                            <td style={{ padding: "8px 10px", width: 90 }}>
                              <input type="number" style={{ ...inputStyle, padding: "7px 10px", textAlign: "right" }} value={r.qty} onChange={e => updateRow(i, "qty", e.target.value)} placeholder="0" />
                            </td>
                            <td style={{ padding: "8px 10px", width: 110 }}>
                              <input type="number" style={{ ...inputStyle, padding: "7px 10px", textAlign: "right" }} value={r.rate} onChange={e => updateRow(i, "rate", e.target.value)} placeholder="0" />
                            </td>
                            <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, fontSize: 14, width: 110 }}>
                              {fmt(Number(r.qty) * Number(r.rate) || 0)}
                            </td>
                            <td style={{ padding: "8px 10px", width: 36 }}>
                              <button style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 0 }} onClick={() => removeRow(i)} disabled={rows.length === 1}>×</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals */}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                    <div style={{ width: isMobile ? "100%" : 300, display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                        <span style={{ color: "var(--text-muted)" }}>Subtotal</span>
                        <span style={{ fontWeight: 600 }}>{fmt(subtotal)}</span>
                      </div>

                      {/* Discount */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14 }}>
                        <span style={{ color: "var(--text-muted)" }}>Discount</span>
                        <div style={{ display: "flex", gap: 6 }}>
                          <select style={{ ...inputStyle, width: 70, padding: "4px 8px", fontSize: 13 }} value={discountType} onChange={e => setDiscountType(e.target.value as "flat" | "percent")}>
                            <option value="flat">Flat</option>
                            <option value="percent">%</option>
                          </select>
                          <input type="number" style={{ ...inputStyle, width: 90, padding: "4px 8px", fontSize: 13, textAlign: "right" }} value={discount} onChange={e => setDiscount(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0" />
                        </div>
                      </div>
                      {discountAmt > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#f87171" }}><span>Discount applied</span><span>— {fmt(discountAmt)}</span></div>}

                      {/* Freight */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14 }}>
                        <span style={{ color: "var(--text-muted)" }}>Freight</span>
                        <input type="number" style={{ ...inputStyle, width: 110, padding: "4px 8px", fontSize: 13, textAlign: "right" }} value={freight} onChange={e => setFreight(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0" />
                      </div>

                      {/* Tax */}
                      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                        <button style={{ ...btnGhost, width: "100%", fontSize: 13, padding: "7px 12px", background: applyTax ? accent + "22" : "transparent", color: applyTax ? accent : "var(--text-muted)", borderColor: applyTax ? accent + "55" : "var(--border)" }}
                          onClick={() => { setApplyTax(!applyTax); if (!applyTax) setSelectedTaxId(""); }}>
                          {applyTax ? "✔ Tax Applied" : "+ Add Tax"}
                        </button>
                        {applyTax && (
                          <select style={{ ...inputStyle, marginTop: 8 }} value={selectedTaxId} onChange={e => setSelectedTaxId(e.target.value)}>
                            <option value="">— Select Tax —</option>
                            {taxes.map(t => <option key={t.id} value={t.id}>{t.taxType} ({t.taxCode}) — {t.taxRate}%</option>)}
                          </select>
                        )}
                        {applyTax && selectedTax && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: accent, marginTop: 6 }}><span>{selectedTax.taxType} ({selectedTax.taxRate}%)</span><span>{fmt(taxAmt)}</span></div>}
                      </div>

                      {/* Net Total */}
                      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "2px solid var(--border)", paddingTop: 12, fontSize: 18, fontWeight: 800 }}>
                        <span>Net Total</span>
                        <span style={{ color: accent }}>{fmt(netTotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div style={panelStyle}>
                  <label style={labelStyle}>Notes / Remarks</label>
                  <textarea style={{ ...inputStyle, minHeight: 72, resize: "vertical" }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes or references…" />
                </div>
              </div>
            )}

            {/* ── Invoice Preview (screen) ── */}
            {preview && (
              <div style={{ ...panelStyle, background: "#fff", color: "#111", padding: 40, maxWidth: 860, margin: "0 auto", fontFamily: "'Outfit','Arial',sans-serif" }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "3px solid #111", paddingBottom: 20, marginBottom: 24 }}>
                  <div>
                    {printPrefs.showLogo && printPrefs.logoUrl && <img src={printPrefs.logoUrl} alt="logo" style={{ height: 56, marginBottom: 8 }} />}
                    <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 1 }}>{previewMode === "DELIVERY" ? "DELIVERY NOTE" : "SALES INVOICE"}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#555", letterSpacing: 2, textTransform: "uppercase", marginTop: 4 }}>{companyInfo?.name || ""}</div>
                    {companyInfo?.phone && <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{companyInfo.phone}</div>}
                    {companyInfo?.address && <div style={{ fontSize: 12, color: "#666" }}>{companyInfo.address}</div>}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, marginBottom: 4 }}><b>Invoice #:</b> {invNo}</div>
                    <div style={{ fontSize: 13, marginBottom: 4 }}><b>Date:</b> {invDate}</div>
                    {location && <div style={{ fontSize: 13, marginBottom: 8 }}><b>Location:</b> {location}</div>}
                    {invNo && (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                        <Barcode value={invNo} width={1.5} height={36} fontSize={11} displayValue={false} />
                        {origin && savedInvoice?.id && (
                          <div style={{ textAlign: "center" }}>
                            <QRCodeSVG value={`${origin}/view/sales-invoice?id=${savedInvoice.id}`} size={72} />
                            <div style={{ fontSize: 9, fontWeight: 700, background: "#111", color: "#fff", padding: "2px 4px", marginTop: 2 }}>SCAN FOR ONLINE BILL</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bill To */}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Bill To</div>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>{invCustomer}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {(savedInvoice?.driverName || driverName) && <div style={{ fontSize: 13 }}><b>Driver:</b> {savedInvoice?.driverName || driverName}</div>}
                    {(savedInvoice?.vehicleNo || vehicleNo) && <div style={{ fontSize: 13 }}><b>Vehicle:</b> {savedInvoice?.vehicleNo || vehicleNo}</div>}
                    {linkedSoNo && <div style={{ fontSize: 12, color: "#6366f1", marginTop: 4 }}><b>SO Ref:</b> {linkedSoNo}</div>}
                  </div>
                </div>

                {/* Items Table */}
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24, fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderTop: "2px solid #111", borderBottom: "2px solid #111", background: "#f5f5f5" }}>
                      <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700 }}>Description</th>
                      <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, width: 70 }}>Qty</th>
                      {previewMode === "INVOICE" && <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, width: 100 }}>Rate</th>}
                      {previewMode === "INVOICE" && <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, width: 110 }}>Amount</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {invItems.map((r: any, i: number) => {
                      const name = r.item?.name || r.name || "—";
                      const desc = r.item?.description || r.description || "";
                      const qty = r.qty || 0;
                      const rate = r.rate || 0;
                      return (
                        <tr key={i} style={{ borderBottom: "1px solid #e5e5e5" }}>
                          <td style={{ padding: "10px 12px" }}>
                            <div style={{ fontWeight: 600 }}>{name}</div>
                            {desc && <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{desc}</div>}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "center" }}>{qty}</td>
                          {previewMode === "INVOICE" && <td style={{ padding: "10px 12px", textAlign: "right" }}>{fmt(rate)}</td>}
                          {previewMode === "INVOICE" && <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>{fmt(qty * rate)}</td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Totals */}
                {previewMode === "INVOICE" && (
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 32 }}>
                    <div style={{ width: 280, fontSize: 13 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
                      {discountAmt > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, color: "#d00" }}><span>Discount</span><span>— {fmt(discountAmt)}</span></div>}
                      {Number(freight) > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span>Freight</span><span>{fmt(Number(freight))}</span></div>}
                      {applyTax && selectedTax && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span>{selectedTax.taxType} ({selectedTax.taxRate}%)</span><span>{fmt(taxAmt)}</span></div>}
                      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "3px solid #111", paddingTop: 10, fontWeight: 900, fontSize: 17 }}><span>Net Total</span><span>{fmt(invTotal)}</span></div>
                    </div>
                  </div>
                )}

                {/* Signatures */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginBottom: 24 }}>
                  {["Prepared By", "Received By"].map(label => (
                    <div key={label}>
                      <div style={{ borderTop: "1px solid #111", paddingTop: 8, fontSize: 12, color: "#555" }}>{label}</div>
                      <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>_________________________</div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                {printPrefs.footerNote && (
                  <div style={{ textAlign: "center", fontSize: 12, color: "#888", borderTop: "1px solid #eee", paddingTop: 12 }}>{printPrefs.footerNote}</div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ══════════════════════════ PRINT AREAS ══════════════════════════ */}

      {/* A4 Print */}
      {preview && printMode === "a4" && (
        <div className="print-area" style={{ fontFamily: "'Outfit','Arial',sans-serif", fontSize: 13, color: "#000", background: "#fff", padding: "8mm 10mm" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "3px solid #000", paddingBottom: 14, marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: 1 }}>{previewMode === "DELIVERY" ? "DELIVERY NOTE" : "SALES INVOICE"}</div>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginTop: 3 }}>{companyInfo?.name || ""}</div>
              {companyInfo?.phone && <div style={{ fontSize: 11, color: "#333", marginTop: 2 }}>{companyInfo.phone}</div>}
              {companyInfo?.address && <div style={{ fontSize: 11, color: "#333" }}>{companyInfo.address}</div>}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ marginBottom: 3 }}><b>Invoice #:</b> {invNo}</div>
              <div style={{ marginBottom: 3 }}><b>Date:</b> {invDate}</div>
              {location && <div style={{ marginBottom: 8 }}><b>Location:</b> {location}</div>}
              <Barcode value={invNo || "SI-0"} width={1.5} height={32} fontSize={10} displayValue={false} />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>Bill To</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{invCustomer}</div>
            </div>
            <div style={{ textAlign: "right", fontSize: 12 }}>
              {(savedInvoice?.driverName || driverName) && <div><b>Driver:</b> {savedInvoice?.driverName || driverName}</div>}
              {(savedInvoice?.vehicleNo || vehicleNo) && <div><b>Vehicle:</b> {savedInvoice?.vehicleNo || vehicleNo}</div>}
              {linkedSoNo && <div><b>SO Ref:</b> {linkedSoNo}</div>}
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 18, fontSize: 12 }}>
            <thead>
              <tr style={{ borderTop: "2px solid #000", borderBottom: "2px solid #000", background: "#f0f0f0" }}>
                <th style={{ padding: "8px 10px", textAlign: "left" }}>Description</th>
                <th style={{ padding: "8px 10px", textAlign: "center", width: 60 }}>Qty</th>
                {previewMode === "INVOICE" && <th style={{ padding: "8px 10px", textAlign: "right", width: 90 }}>Rate</th>}
                {previewMode === "INVOICE" && <th style={{ padding: "8px 10px", textAlign: "right", width: 100 }}>Amount</th>}
              </tr>
            </thead>
            <tbody>
              {invItems.map((r: any, i: number) => {
                const name = r.item?.name || r.name || "—";
                const desc = r.item?.description || r.description || "";
                const qty = r.qty || 0;
                const rate = r.rate || 0;
                return (
                  <tr key={i} style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "8px 10px" }}><div style={{ fontWeight: 600 }}>{name}</div>{desc && <div style={{ fontSize: 10, color: "#555" }}>{desc}</div>}</td>
                    <td style={{ padding: "8px 10px", textAlign: "center" }}>{qty}</td>
                    {previewMode === "INVOICE" && <td style={{ padding: "8px 10px", textAlign: "right" }}>{fmt(rate)}</td>}
                    {previewMode === "INVOICE" && <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>{fmt(qty * rate)}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {previewMode === "INVOICE" && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 28 }}>
              <div style={{ width: 260, fontSize: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
                {discountAmt > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span>Discount</span><span>— {fmt(discountAmt)}</span></div>}
                {Number(freight) > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span>Freight</span><span>{fmt(Number(freight))}</span></div>}
                {applyTax && selectedTax && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span>{selectedTax.taxType} ({selectedTax.taxRate}%)</span><span>{fmt(taxAmt)}</span></div>}
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "3px solid #000", paddingTop: 8, fontWeight: 900, fontSize: 16 }}><span>Net Total</span><span>{fmt(invTotal)}</span></div>
              </div>
            </div>
          )}

          {notes && <div style={{ fontSize: 11, color: "#444", marginBottom: 20, borderLeft: "3px solid #ccc", paddingLeft: 10 }}>{notes}</div>}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginBottom: 20 }}>
            {["Prepared By", "Received By"].map(l => (
              <div key={l}><div style={{ borderTop: "1px solid #000", paddingTop: 6, fontSize: 11, color: "#444" }}>{l}</div></div>
            ))}
          </div>

          {printPrefs.footerNote && <div style={{ textAlign: "center", fontSize: 10, color: "#666", borderTop: "1px solid #ddd", paddingTop: 8 }}>{printPrefs.footerNote}</div>}
        </div>
      )}

      {/* 55mm Thermal Print */}
      {preview && printMode === "55mm" && (
        <div className="print-area" style={{ fontFamily: "'Courier New',monospace", fontSize: 11, color: "#000", background: "#fff", width: "55mm", margin: "0 auto", padding: "3mm" }}>
          <div style={{ textAlign: "center", borderBottom: "2px solid #000", paddingBottom: 8, marginBottom: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 900 }}>{previewMode === "DELIVERY" ? "DELIVERY NOTE" : "RECEIPT"}</div>
            <div style={{ fontSize: 11, fontWeight: 700 }}>{companyInfo?.name || ""}</div>
            {companyInfo?.phone && <div style={{ fontSize: 9 }}>{companyInfo.phone}</div>}
          </div>

          <div style={{ fontSize: 10, marginBottom: 6 }}>
            <div><b>INV#:</b> {invNo}</div>
            <div><b>Date:</b> {invDate}</div>
            <div><b>Customer:</b> {invCustomer}</div>
            {(savedInvoice?.driverName || driverName) && <div><b>Driver:</b> {savedInvoice?.driverName || driverName}</div>}
          </div>

          <div style={{ borderTop: "1px dashed #000", borderBottom: "1px dashed #000", padding: "6px 0", marginBottom: 6 }}>
            {invItems.map((r: any, i: number) => {
              const name = r.item?.name || r.name || "—";
              const qty = r.qty || 0;
              const rate = r.rate || 0;
              return (
                <div key={i} style={{ marginBottom: 5 }}>
                  <div style={{ fontWeight: 700, fontSize: 11 }}>{name}</div>
                  {previewMode === "INVOICE" && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                      <span>{qty} x {fmt(rate)}</span>
                      <span style={{ fontWeight: 700 }}>{fmt(qty * rate)}</span>
                    </div>
                  )}
                  {previewMode === "DELIVERY" && <div style={{ fontSize: 10 }}>Qty: {qty}</div>}
                </div>
              );
            })}
          </div>

          {previewMode === "INVOICE" && (
            <div style={{ fontSize: 10, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Subtotal:</span><span>{fmt(subtotal)}</span></div>
              {discountAmt > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span>Discount:</span><span>-{fmt(discountAmt)}</span></div>}
              {Number(freight) > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span>Freight:</span><span>{fmt(Number(freight))}</span></div>}
              {applyTax && selectedTax && <div style={{ display: "flex", justifyContent: "space-between" }}><span>{selectedTax.taxCode} {selectedTax.taxRate}%:</span><span>{fmt(taxAmt)}</span></div>}
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "2px solid #000", paddingTop: 4, fontWeight: 900, fontSize: 13 }}><span>TOTAL:</span><span>{fmt(invTotal)}</span></div>
            </div>
          )}

          {invNo && (
            <div style={{ textAlign: "center", marginBottom: 6 }}>
              <Barcode value={invNo} width={1} height={30} fontSize={9} displayValue={true} />
            </div>
          )}

          <div style={{ textAlign: "center", fontSize: 9, borderTop: "1px dashed #000", paddingTop: 6 }}>
            {printPrefs.footerNote || "Thank you for your business!"}
          </div>
        </div>
      )}
    </>
  );
}

export default function SalesInvoicePage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center", fontFamily: "'Outfit',sans-serif", color: "var(--text-muted)" }}>Loading Invoice…</div>}>
      <SalesInvoiceContent />
    </Suspense>
  );
}
