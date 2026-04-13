"use client";
import { fmtDate } from "@/lib/dateUtils";
import { confirmToast } from "@/lib/toast-feedback";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { exportToCSV } from "@/lib/export";

// ─── Design tokens ────────────────────────────────────────────────────────────
const ff     = "'Outfit','Inter',sans-serif";
const accent = "#6366f1";
const green  = "#22c55e";

interface PaymentReceipt {
  id: string; receiptNo: string; date: string; amount: number;
  paymentMode: string; referenceNo?: string; status: string;
  narration?: string;
  party?: { id: string; name: string; phone?: string };
  voucher?: { id: string; voucherNo: string };
}
interface Party       { id: string; code: string; name: string; phone?: string }
interface BankAccount { id: string; accountNo: string; bankName: string; accountName: string }

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: "rgba(251,191,36,0.15)",  text: "#fbbf24" },
  CLEARED: { bg: "rgba(34,197,94,0.15)",   text: "#22c55e" },
  BOUNCED: { bg: "rgba(248,113,113,0.15)", text: "#f87171" },
};
const MODE_LABEL: Record<string, string> = { CASH: "Cash", CHEQUE: "Cheque", BANK_TRANSFER: "Bank Transfer" };

function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

const EMPTY_FORM = {
  receiptNo: "", date: new Date().toISOString().slice(0, 10),
  amount: 0, paymentMode: "CASH", partyId: "",
  bankAccountId: "", referenceNo: "", narration: "",
};

export default function PaymentReceiptsPage() {
  const user = getCurrentUser();

  const [receipts,     setReceipts]     = useState<PaymentReceipt[]>([]);
  const [parties,      setParties]      = useState<Party[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [showList,     setShowList]     = useState(false);
  const [showForm,     setShowForm]     = useState(true);
  const [form,         setForm]         = useState({ ...EMPTY_FORM });
  const [loading,      setLoading]      = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [editingId,    setEditingId]    = useState("");
  const [savedReceipt, setSavedReceipt] = useState<PaymentReceipt | null>(null);
  const [search,       setSearch]       = useState("");
  const [company,      setCompany]      = useState<any>(null);

  const h = (json = false): Record<string, string> => ({
    "x-user-role":  user?.role      || "ADMIN",
    "x-user-id":    user?.id        || "",
    "x-company-id": user?.companyId || "",
    ...(json ? { "Content-Type": "application/json" } : {}),
  });

  useEffect(() => {
    fetchReceipts(); fetchParties(); fetchBankAccounts();
    fetch("/api/me/company", { headers: h() }).then(r => r.ok ? r.json() : null).then(d => d && setCompany(d)).catch(() => {});
  }, [statusFilter]);

  async function fetchReceipts() {
    try {
      const url = statusFilter ? `/api/payment-receipts?status=${statusFilter}` : "/api/payment-receipts";
      const res = await fetch(url, { headers: h() });
      const data = await res.json();
      setReceipts(Array.isArray(data) ? data : []);
    } catch { setReceipts([]); }
  }

  async function fetchParties() {
    try {
      const res = await fetch("/api/accounts", { headers: h() });
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.accounts || [];
      setParties(list.filter((a: any) => a.partyType === "CUSTOMER" || a.partyType === "SUPPLIER"));
    } catch { setParties([]); }
  }

  async function fetchBankAccounts() {
    try {
      const res = await fetch("/api/bank-accounts", { headers: h() });
      const data = await res.json();
      setBankAccounts(Array.isArray(data) ? data : []);
    } catch { setBankAccounts([]); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount || form.amount <= 0) { toast.error("Amount required"); return; }
    setLoading(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const url    = editingId ? `/api/payment-receipts?id=${editingId}` : "/api/payment-receipts";
      const res    = await fetch(url, { method, headers: h(true), body: JSON.stringify({ id: editingId, ...form }) });
      if (res.ok) {
        const saved = await res.json();
        toast.success(editingId ? "Receipt updated!" : "Receipt saved! Documents ready.");
        setSavedReceipt(saved);
        setShowForm(false);
        setShowList(false);
        clearForm();
        fetchReceipts();
      } else {
        const err = await res.json();
        toast.error(err.error || "Save failed");
      }
    } catch { toast.error("Save failed"); }
    setLoading(false);
  }

  function handleEdit(r: PaymentReceipt) {
    setEditingId(r.id);
    setSavedReceipt(null);
    setForm({
      receiptNo: r.receiptNo,
      date: new Date(r.date).toISOString().slice(0, 10),
      amount: r.amount,
      paymentMode: r.paymentMode,
      partyId: r.party?.id || "",
      bankAccountId: "",
      referenceNo: r.referenceNo || "",
      narration: r.narration || "",
    });
    setShowForm(true); setShowList(false);
  }

  async function handleDelete(id: string) {
    if (!await confirmToast("Delete this receipt? This cannot be undone.")) return;
    const res = await fetch(`/api/payment-receipts?id=${id}`, { method: "DELETE", headers: h() });
    if (res.ok) { toast.success("Deleted"); fetchReceipts(); } else toast.error("Delete failed");
  }

  async function handleClearCheque(r: PaymentReceipt) {
    if (!await confirmToast(`Mark cheque ${r.referenceNo || r.receiptNo} as CLEARED?`)) return;
    const res = await fetch(`/api/payment-receipts?id=${r.id}`, {
      method: "PUT", headers: h(true),
      body: JSON.stringify({ id: r.id, status: "CLEARED", date: r.date, amount: r.amount, paymentMode: r.paymentMode, partyId: r.party?.id, referenceNo: r.referenceNo, narration: r.narration }),
    });
    if (res.ok) { toast.success("Cheque cleared!"); fetchReceipts(); } else toast.error("Failed");
  }

  function clearForm() { setForm({ ...EMPTY_FORM }); setEditingId(""); }

  // ── Print Customer Receipt ──
  function printReceipt(r: PaymentReceipt) {
    const partyName = r.party?.name || "—";
    const w = window.open("", "_blank");
    if (!w) return toast.error("Allow popups to print");
    const co = company?.name || "COMPANY NAME";
    const cur = company?.baseCurrency || "PKR";
    w.document.open(); w.document.close();
    w.document.documentElement.innerHTML = `
      <html><head><title>Receipt - ${r.receiptNo}</title>
      <style>
        body{font-family:'Arial',sans-serif;padding:30px;max-width:520px;margin:0 auto;color:#111}
        .hdr{display:flex;justify-content:space-between;border-bottom:3px solid #111;padding-bottom:14px;margin-bottom:24px}
        .co{font-size:24px;font-weight:900}.sub{font-size:10px;color:#555;text-transform:uppercase;letter-spacing:2px}
        .rh{font-size:18px;font-weight:900;text-decoration:underline;text-align:right}
        .row{display:flex;gap:12px;border-bottom:1px solid #ddd;padding-bottom:8px;margin-bottom:8px;align-items:flex-end}
        .lbl{font-size:10px;font-weight:900;text-transform:uppercase;width:120px;flex-shrink:0}
        .val{font-weight:700;flex:1;border-bottom:1.5px solid #111;padding-left:4px}
        .amtbox{background:#f5f5f5;border:2px solid #111;padding:10px 16px}
        .amttitle{font-size:9px;font-weight:900;text-transform:uppercase;border-bottom:1px solid #111;margin-bottom:4px}
        .amt{font-size:22px;font-weight:900}
        .sigs{display:flex;gap:40px;margin-top:40px}
        .sig{border-top:2px solid #111;padding-top:4px;font-size:9px;font-weight:700;text-transform:uppercase;text-align:center;width:100px}
        .footer{margin-top:30px;text-align:center;font-size:9px;color:#aaa;border-top:1px solid #eee;padding-top:8px}
        @media print{body{padding:8mm 10mm}}
      </style></head><body>
      <div class="hdr">
        <div><div class="co">${co}</div><div class="sub">Payment Receipt</div></div>
        <div>
          <div class="rh">RECEIPT</div>
          <div style="font-size:12px;font-weight:700;text-align:right">No: ${r.receiptNo}</div>
          <div style="font-size:12px;font-weight:700;text-align:right">Date: ${r.date.slice(0,10)}</div>
        </div>
      </div>
      <div class="row"><span class="lbl">Received From:</span><span class="val">${partyName}</span></div>
      <div class="row"><span class="lbl">Amount (${cur}):</span><span class="val" style="font-size:18px">${fmt(r.amount)}/-</span></div>
      <div class="row"><span class="lbl">Payment Mode:</span><span class="val">${MODE_LABEL[r.paymentMode] || r.paymentMode}</span></div>
      ${r.referenceNo ? `<div class="row"><span class="lbl">Reference:</span><span class="val">${r.referenceNo}</span></div>` : ""}
      <div class="row"><span class="lbl">Description:</span><span class="val">${r.narration || "Payment received."}</span></div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:24px">
        <div class="amtbox"><div class="amttitle">Net Amount Received</div><div class="amt">${fmt(r.amount)}</div></div>
        <div class="sigs"><div class="sig">Payer Sign</div><div class="sig">Accountant</div></div>
      </div>
      <div class="footer">Powered by FinovaOS — ${new Date().toLocaleString()}</div>
      <script>window.print();</script></body></html>`;
  }

  // ── Print CRV (Internal Accounting) ──
  function printCRV(r: PaymentReceipt) {
    const partyName = r.party?.name || "—";
    const crvNo = r.voucher?.voucherNo || r.receiptNo;
    const w = window.open("", "_blank");
    if (!w) return toast.error("Allow popups to print");
    const co = company?.name || "COMPANY NAME";
    const cur = company?.baseCurrency || "PKR";
    w.document.open(); w.document.close();
    w.document.documentElement.innerHTML = `
      <html><head><title>CRV - ${crvNo}</title>
      <style>
        body{font-family:'Arial',sans-serif;padding:30px;max-width:580px;margin:0 auto;color:#111}
        .hdr{display:flex;justify-content:space-between;border-bottom:3px solid #111;padding-bottom:14px;margin-bottom:24px}
        .co{font-size:22px;font-weight:900}.sub{font-size:10px;color:#555;text-transform:uppercase;letter-spacing:2px}
        .rh{font-size:16px;font-weight:900;text-decoration:underline;text-align:right}
        table{width:100%;border-collapse:collapse;margin-top:20px}
        th{background:#f3f4f6;border:1px solid #999;padding:8px 10px;font-size:11px;text-transform:uppercase}
        td{border:1px solid #ccc;padding:8px 10px;font-size:13px}
        .dr{color:#1d4ed8;font-weight:700}.cr{color:#dc2626;font-weight:700}
        .narr{margin-top:16px;padding:12px;background:#f9fafb;border:1px solid #e5e7eb;font-size:12px}
        .sigs{display:flex;justify-content:space-between;margin-top:48px;padding:0 10px}
        .sig{border-top:2px solid #111;padding-top:4px;font-size:9px;font-weight:700;text-transform:uppercase;text-align:center;width:110px}
        .footer{margin-top:24px;text-align:center;font-size:9px;color:#aaa;border-top:1px solid #eee;padding-top:8px}
        @media print{body{padding:8mm 10mm}}
      </style></head><body>
      <div class="hdr">
        <div><div class="co">${co}</div><div class="sub">Internal Voucher — Accounting Copy</div></div>
        <div>
          <div class="rh">CASH RECEIPT VOUCHER</div>
          <div style="font-size:12px;font-weight:700;text-align:right">CRV No: ${crvNo}</div>
          <div style="font-size:12px;font-weight:700;text-align:right">Receipt No: ${r.receiptNo}</div>
          <div style="font-size:12px;font-weight:700;text-align:right">Date: ${r.date.slice(0,10)}</div>
        </div>
      </div>
      <table>
        <thead><tr><th style="text-align:left">Account</th><th>Dr / Cr</th><th style="text-align:right">Amount (${cur})</th></tr></thead>
        <tbody>
          <tr><td>Cash / Bank Account</td><td style="text-align:center" class="dr">Dr</td><td style="text-align:right" class="dr">${fmt(r.amount)}</td></tr>
          <tr><td>${partyName} (Customer)</td><td style="text-align:center" class="cr">Cr</td><td style="text-align:right" class="cr">${fmt(r.amount)}</td></tr>
        </tbody>
        <tfoot><tr><td colspan="2" style="text-align:right;font-weight:700;border-top:2px solid #111">Total</td><td style="text-align:right;font-weight:700;border-top:2px solid #111">${fmt(r.amount)}</td></tr></tfoot>
      </table>
      <div class="narr"><strong>Narration:</strong> ${r.narration || `Payment received from ${partyName}`}</div>
      <div class="sigs"><div class="sig">Prepared By</div><div class="sig">Reviewed By</div><div class="sig">Approved By</div></div>
      <div class="footer">Auto-generated CRV — Powered by FinovaOS — ${new Date().toLocaleString()}</div>
      <script>window.print();</script></body></html>`;
  }

  const filtered = receipts.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.receiptNo.toLowerCase().includes(q) || (r.party?.name || "").toLowerCase().includes(q) || r.paymentMode.toLowerCase().includes(q);
  });

  const needsBank      = form.paymentMode === "CHEQUE" || form.paymentMode === "BANK_TRANSFER";
  const totalAmount    = receipts.reduce((s, r) => s + r.amount, 0);
  const pendingCount   = receipts.filter(r => r.status === "PENDING").length;
  const clearedCount   = receipts.filter(r => r.status === "CLEARED").length;

  const panel: React.CSSProperties = { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, fontFamily: ff };
  const inp:   React.CSSProperties = { width: "100%", background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text-primary)", fontFamily: ff, fontSize: 14, outline: "none", boxSizing: "border-box" };
  const lbl:   React.CSSProperties = { fontSize: 11, color: "var(--text-muted)", fontWeight: 700, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 0.5 };
  const btnP:  React.CSSProperties = { background: accent, color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontFamily: ff, fontSize: 14, fontWeight: 700, cursor: "pointer" };
  const btnG:  React.CSSProperties = { background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 16px", fontFamily: ff, fontSize: 14, cursor: "pointer" };

  return (
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1200 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: accent }}>Payment Receipts</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
            One entry → Customer Receipt + CRV auto-generated
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {showList && receipts.length > 0 && (
            <button style={{ ...btnG, color: green, borderColor: green + "55" }}
              onClick={() => exportToCSV(receipts.map(r => ({ receiptNo: r.receiptNo, date: r.date, amount: r.amount, paymentMode: r.paymentMode, referenceNo: r.referenceNo || "", status: r.status, party: r.party?.name || "", crvNo: r.voucher?.voucherNo || "" })), "payment-receipts")}>
              Export CSV
            </button>
          )}
          <button style={btnG} onClick={() => { setShowList(!showList); setShowForm(!showForm); setSavedReceipt(null); }}>
            {showList ? "New Receipt" : "View List"}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Received",  value: (company?.baseCurrency || "PKR") + " " + fmt(totalAmount), color: accent },
          { label: "Pending Cheques", value: pendingCount,  color: "#fbbf24" },
          { label: "Cleared",         value: clearedCount,  color: green },
        ].map(k => (
          <div key={k.label} style={{ ...panel, padding: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* ── Documents Ready Panel (after save) ── */}
      {savedReceipt && !showForm && !showList && (
        <div style={{ marginBottom: 24 }}>
          {/* Success banner */}
          <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 10, padding: "12px 18px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20 }}>✅</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: green }}>Payment Recorded Successfully</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Both documents are ready to print</div>
              </div>
            </div>
            <button onClick={() => { setSavedReceipt(null); setShowForm(true); }} style={{ ...btnP }}>+ New Receipt</button>
          </div>

          {/* Two document cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

            {/* Customer Receipt */}
            <div style={{ ...panel, borderColor: `${accent}44` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: accent }}>🧾 Customer Receipt</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Customer-facing document</div>
                </div>
                <span style={{ background: "rgba(99,102,241,0.12)", color: accent, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>External</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {[
                  ["Receipt No",  savedReceipt.receiptNo],
                  ["Party",       savedReceipt.party?.name || "—"],
                  ["Amount",      `${company?.baseCurrency || "PKR"} ${fmt(savedReceipt.amount)}`],
                  ["Mode",        MODE_LABEL[savedReceipt.paymentMode] || savedReceipt.paymentMode],
                  ["Date",        savedReceipt.date.slice(0,10)],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: "1px solid var(--border)", paddingBottom: 6 }}>
                    <span style={{ color: "var(--text-muted)" }}>{k}</span>
                    <span style={{ fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => printReceipt(savedReceipt)} style={{ ...btnP, flex: 1, textAlign: "center" }}>Print Receipt</button>
                {savedReceipt.party?.phone && (
                  <button onClick={() => {
                    const ph = (savedReceipt.party!.phone || "").replace(/\D/g, "");
                    const fp = ph.startsWith("0") ? "92" + ph.slice(1) : ph;
                    const msg = `*PAYMENT RECEIPT*\nReceipt No: ${savedReceipt.receiptNo}\nAmount: ${company?.baseCurrency || "PKR"} ${fmt(savedReceipt.amount)}/-\nDate: ${savedReceipt.date.slice(0,10)}\nThank you!`;
                    window.open(`https://wa.me/${fp}?text=${encodeURIComponent(msg)}`, "_blank");
                  }} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontFamily: ff, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                    WhatsApp
                  </button>
                )}
              </div>
            </div>

            {/* Internal CRV */}
            <div style={{ ...panel, borderColor: "rgba(34,197,94,0.3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: green }}>📋 Cash Receipt Voucher (CRV)</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Auto-generated — Internal accounting copy</div>
                </div>
                <span style={{ background: "rgba(34,197,94,0.12)", color: green, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Internal</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {[
                  ["CRV No",    savedReceipt.voucher?.voucherNo || savedReceipt.receiptNo],
                  ["Receipt No", savedReceipt.receiptNo],
                  ["Dr (Debit)",  "Cash / Bank Account"],
                  ["Cr (Credit)", savedReceipt.party?.name || "Customer Account"],
                  ["Amount",     `${company?.baseCurrency || "PKR"} ${fmt(savedReceipt.amount)}`],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: "1px solid var(--border)", paddingBottom: 6 }}>
                    <span style={{ color: "var(--text-muted)" }}>{k}</span>
                    <span style={{ fontWeight: 600, color: String(k).startsWith("Dr") ? "#818cf8" : String(k).startsWith("Cr") ? "#f87171" : "var(--text-primary)" }}>{v}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => printCRV(savedReceipt)} style={{ background: green, color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontFamily: ff, fontSize: 14, fontWeight: 700, cursor: "pointer", width: "100%" }}>
                Print CRV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Entry Form ── */}
      {showForm && (
        <form onSubmit={handleSubmit}>
          <div style={{ ...panel, marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, color: accent }}>
              {editingId ? "Edit Receipt" : "New Payment Receipt"}
              {!editingId && <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 400, marginLeft: 10 }}>→ CRV will be auto-generated</span>}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={lbl}>Receipt No <span style={{ color: "var(--text-muted)", fontWeight: 400, textTransform: "none" }}>(auto if empty)</span></label>
                <input style={inp} value={form.receiptNo} onChange={e => setForm(f => ({ ...f, receiptNo: e.target.value }))} placeholder="Leave empty for auto" />
              </div>
              <div>
                <label style={lbl}>Date *</label>
                <input type="date" required style={inp} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Amount *</label>
                <input type="number" required step="0.01" min="0.01" style={{ ...inp, fontWeight: 700, fontSize: 16 }} value={form.amount || ""} onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} placeholder="0.00" />
              </div>
              <div>
                <label style={lbl}>Payment Mode</label>
                <select style={inp} value={form.paymentMode} onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value, bankAccountId: e.target.value === "CASH" ? "" : f.bankAccountId }))}>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>
              {needsBank && (
                <div>
                  <label style={lbl}>Bank Account *</label>
                  <select required style={inp} value={form.bankAccountId} onChange={e => setForm(f => ({ ...f, bankAccountId: e.target.value }))}>
                    <option value="">— Select Bank Account —</option>
                    {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName} — {b.accountNo} ({b.accountName})</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={lbl}>Party (Customer / Supplier) *</label>
                <select required style={inp} value={form.partyId} onChange={e => setForm(f => ({ ...f, partyId: e.target.value }))}>
                  <option value="">— Select Party —</option>
                  {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Reference No</label>
                <input style={inp} value={form.referenceNo} onChange={e => setForm(f => ({ ...f, referenceNo: e.target.value }))} placeholder="Cheque No or Transaction ID" />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Description / Narration</label>
              <textarea style={{ ...inp, minHeight: 72, resize: "vertical" }} value={form.narration} onChange={e => setForm(f => ({ ...f, narration: e.target.value }))} placeholder="Payment details or notes…" />
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button type="submit" style={btnP} disabled={loading}>{loading ? "Saving…" : editingId ? "Update Receipt" : "Save & Generate Documents"}</button>
              <button type="button" style={btnG} onClick={clearForm}>Clear</button>
              <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 4 }}>Receipt + CRV will be ready after saving</span>
            </div>
          </div>
        </form>
      )}

      {/* ── List View ── */}
      {showList && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <input style={{ ...inp, flex: 1, maxWidth: 300 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search receipt no, party…" />
            <select style={{ ...inp, width: 160 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="CLEARED">Cleared</option>
              <option value="BOUNCED">Bounced</option>
            </select>
          </div>

          <div style={{ ...panel, padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Receipt No","CRV No","Date","Amount","Mode","Party","Status","Actions"].map(col => (
                    <th key={col} style={{ padding: "12px 14px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, textAlign: col === "Amount" ? "right" : "left" }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>No receipts found</td></tr>
                ) : filtered.map((r, idx) => {
                  const sc = STATUS_COLOR[r.status] || STATUS_COLOR.PENDING;
                  return (
                    <tr key={r.id} style={{ borderBottom: idx < filtered.length - 1 ? "1px solid var(--border)" : "none" }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "var(--panel-bg)"}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}>
                      <td style={{ padding: "12px 14px", fontWeight: 700, color: accent, fontSize: 13 }}>{r.receiptNo}</td>
                      <td style={{ padding: "12px 14px", fontSize: 12, color: green, fontWeight: 600 }}>{r.voucher?.voucherNo || "—"}</td>
                      <td style={{ padding: "12px 14px", fontSize: 13, color: "var(--text-muted)" }}>{fmtDate(r.date)}</td>
                      <td style={{ padding: "12px 14px", fontSize: 14, fontWeight: 600, textAlign: "right" }}>{fmt(r.amount)}</td>
                      <td style={{ padding: "12px 14px", fontSize: 13 }}>{MODE_LABEL[r.paymentMode] || r.paymentMode}</td>
                      <td style={{ padding: "12px 14px", fontSize: 13 }}>{r.party?.name || "—"}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.text }}>{r.status}</span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {r.status === "PENDING" && r.paymentMode === "CHEQUE" && (
                            <button style={{ ...btnG, padding: "4px 10px", fontSize: 11, color: green, borderColor: green + "55" }} onClick={() => handleClearCheque(r)}>Clear ✓</button>
                          )}
                          <button style={{ ...btnG, padding: "4px 10px", fontSize: 11, color: accent, borderColor: accent + "44" }} onClick={() => printReceipt(r)}>Receipt</button>
                          <button style={{ ...btnG, padding: "4px 10px", fontSize: 11, color: green, borderColor: green + "44" }} onClick={() => printCRV(r)}>CRV</button>
                          <button style={{ ...btnG, padding: "4px 10px", fontSize: 11 }} onClick={() => handleEdit(r)}>Edit</button>
                          <button style={{ ...btnG, padding: "4px 10px", fontSize: 11, color: "#f87171", borderColor: "#f8717144" }} onClick={() => handleDelete(r.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
