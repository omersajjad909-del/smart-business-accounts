"use client";
import { fmtDate } from "@/lib/dateUtils";
import { confirmToast } from "@/lib/toast-feedback";
import toast from "react-hot-toast";
import { useCallback, useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

// ─── Design tokens ────────────────────────────────────────────────────────────
const ff = "'Outfit','Inter',sans-serif";
const danger = "#f87171";

// ─── Types ───────────────────────────────────────────────────────────────────
type Invoice = { id: string; invoiceNo: string; customerName: string; customerId: string };
type Row     = { itemId: string; name: string; qty: number | ""; rate: number; maxQty: number };
type SaleReturn = {
  id: string; returnNo: string; date: string;
  customerId: string; customer?: { name: string };
  invoiceId: string; invoice?: { invoiceNo: string };
  total: number;
  items: Array<{ itemId?: string; item?: { name: string }; qty: number; rate: number }>;
};
type SavedData = { returnNo: string; date: string; customerName: string; invoiceNo: string; items: { name: string; qty: number; rate: number }[]; total: number; freight: number; netTotal: number };

function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SalesReturnPage() {
  const today = new Date().toISOString().slice(0, 10);
  const user  = getCurrentUser();

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
  const [freight,          setFreight]          = useState<number | "">("");
  const [saving,           setSaving]           = useState(false);
  const [preview,          setPreview]          = useState(false);
  const [savedData,        setSavedData]        = useState<SavedData | null>(null);

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
      setRows(data.items || []);
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

  function updateRow(i: number, qty: number) {
    const copy = [...rows];
    copy[i] = { ...copy[i], qty: qty > copy[i].maxQty ? copy[i].maxQty : qty };
    setRows(copy);
  }

  const total    = rows.reduce((s, r) => s + (Number(r.qty) || 0) * r.rate, 0);
  const netTotal = total + (Number(freight) || 0);

  async function saveReturn() {
    const clean = rows.filter(r => r.itemId && Number(r.qty) > 0).map(r => ({ ...r, qty: Number(r.qty) }));
    if (!invoiceId || !clean.length) { toast.error("Select invoice and items to return"); return; }
    setSaving(true);
    try {
      const method = editing ? "PUT" : "POST";
      const body = editing
        ? { id: editing.id, customerId, invoiceId, date, freight: freight || 0, items: clean }
        : { customerId, invoiceId, date, freight: freight || 0, items: clean };
      const res = await fetch("/api/sale-return", { method, headers: { "Content-Type": "application/json", "x-user-role": user?.role || "ADMIN" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) {
        setSavedData({ returnNo: data.returnNo, date, customerName, invoiceNo: displayInvoiceNo, items: clean, total, freight: freight || 0, netTotal });
        setPreview(true);
        await loadReturns();
        if (editing) { setEditing(null); setShowForm(false); setShowList(true); }
        toast.success("Return recorded!");
      } else toast.error(data.error);
    } finally { setSaving(false); }
  }

  function startEdit(ret: SaleReturn) {
    setEditing(ret); setInvoiceId(ret.invoiceId); setDisplayInvoiceNo(ret.invoice?.invoiceNo || "");
    setCustomerId(ret.customerId); setCustomerName(ret.customer?.name || "");
    setDate(new Date(ret.date).toISOString().slice(0, 10));
    setRows(ret.items.map(it => ({ itemId: it.itemId || "", name: it.item?.name || "", qty: it.qty, rate: it.rate, maxQty: it.qty })));
    setShowForm(true); setShowList(false);
  }

  async function deleteReturn(id: string) {
    if (!await confirmToast("Delete this return?")) return;
    const res = await fetch(`/api/sale-return?id=${id}`, { method: "DELETE", headers: { "x-user-role": user?.role || "ADMIN" } });
    if (res.ok) { toast.success("Deleted"); await loadReturns(); } else toast.error("Delete failed");
  }

  function resetForm() {
    setEditing(null); setInvoiceId(""); setDisplayInvoiceNo(""); setCustomerId(""); setCustomerName("");
    setDate(today); setFreight(""); setRows([]); setPreview(false); setSavedData(null);
  }

  // ── Styles ──
  const panel: React.CSSProperties = { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, fontFamily: ff };
  const inp:   React.CSSProperties = { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text-primary)", fontFamily: ff, fontSize: 14, outline: "none", boxSizing: "border-box" };
  const lbl:   React.CSSProperties = { fontSize: 11, color: "var(--text-muted)", fontWeight: 700, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 0.5 };
  const btnDanger: React.CSSProperties = { background: danger, color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontFamily: ff, fontSize: 14, fontWeight: 700, cursor: "pointer" };
  const btnGhost:  React.CSSProperties = { background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 16px", fontFamily: ff, fontSize: 14, cursor: "pointer" };

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

      {/* ── Screen UI ── */}
      <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1000 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: danger }}>Sales Return</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>Process and track sales returns</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={btnGhost} onClick={() => { setShowList(!showList); if (!showList) { setShowForm(false); loadReturns(); } else setShowForm(true); }}>
              {showList ? "Hide List" : "Show List"}
            </button>
            <button style={btnDanger} onClick={() => { setShowForm(true); setShowList(false); resetForm(); }}>+ New Return</button>
          </div>
        </div>

        {/* ── Returns List ── */}
        {showList && (
          <div style={{ ...panel, padding: 0, overflow: "hidden", marginBottom: 24 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Return No", "Date", "Customer", "Invoice", "Total", "Actions"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, textAlign: h === "Total" ? "right" : "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {returns.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>No returns found</td></tr>
                ) : returns.map((ret, idx) => (
                  <tr key={ret.id} style={{ borderBottom: idx < returns.length - 1 ? "1px solid var(--border)" : "none" }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "rgba(255,255,255,0.03)"}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}>
                    <td style={{ padding: "12px 16px", fontWeight: 700, color: danger, fontSize: 14 }}>{ret.returnNo}</td>
                    <td style={{ padding: "12px 16px", fontSize: 14, color: "var(--text-muted)" }}>{fmtDate(ret.date)}</td>
                    <td style={{ padding: "12px 16px", fontSize: 14 }}>{ret.customer?.name || "—"}</td>
                    <td style={{ padding: "12px 16px", fontSize: 14, color: "var(--text-muted)" }}>{ret.invoice?.invoiceNo || "—"}</td>
                    <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 600, textAlign: "right" }}>{fmt(ret.total)}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button style={{ ...btnGhost, padding: "5px 12px", fontSize: 12 }} onClick={() => startEdit(ret)}>Edit</button>
                        <button style={{ ...btnGhost, padding: "5px 12px", fontSize: 12, color: danger, borderColor: danger + "44" }} onClick={() => deleteReturn(ret.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Form / Preview ── */}
        {showForm && (
          <>
            {!preview ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                {/* Action bar */}
                <div style={{ ...panel, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: danger }}>{editing ? "Edit Sales Return" : "New Sales Return"}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>
                      <strong style={{ color: "var(--text-primary)" }}>F7</strong> = Clear &nbsp;|&nbsp; <strong style={{ color: "var(--text-primary)" }}>F8</strong> = Search Invoice
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button style={btnDanger} onClick={saveReturn} disabled={saving}>{saving ? "Saving…" : editing ? "Update Return" : "Confirm Sales Return"}</button>
                    <button style={btnGhost} onClick={() => { setShowForm(false); resetForm(); }}>Cancel</button>
                  </div>
                </div>

                {/* Invoice + Date */}
                <div style={panel}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={lbl}>Select Invoice (F7: Clear, F8: Search)</label>
                      <select style={inp} value={invoiceId} onChange={e => handleInvoiceChange(e.target.value)}>
                        <option value="">— Choose Invoice —</option>
                        {invoices.map(i => <option key={i.id} value={i.id}>{i.invoiceNo} — {i.customerName}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Return Date</label>
                      <input type="date" style={inp} value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                  </div>

                  {/* Customer strip */}
                  <div style={{ background: customerName ? "rgba(248,113,113,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${customerName ? danger + "44" : "var(--border)"}`, borderRadius: 8, padding: "10px 14px", fontSize: 14, fontWeight: 600, color: customerName ? danger : "var(--text-muted)" }}>
                    {customerName ? `Customer: ${customerName}` : "Customer: Not Selected"}
                  </div>
                </div>

                {/* Items */}
                {rows.length > 0 && (
                  <div style={panel}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Return Items</div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid var(--border)" }}>
                            {["Item Name", "Available", "Return Qty", "Rate", "Amount", ""].map(h => (
                              <th key={h} style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", textAlign: h === "Amount" ? "right" : "center", letterSpacing: 0.5 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                              <td style={{ padding: "10px", fontWeight: 600, fontSize: 14 }}>{r.name}</td>
                              <td style={{ padding: "10px", textAlign: "center", fontWeight: 700, color: "#60a5fa", fontSize: 14 }}>{r.maxQty}</td>
                              <td style={{ padding: "8px 10px", width: 100 }}>
                                <input type="number" min={0} max={r.maxQty}
                                  style={{ ...inp, padding: "6px 10px", textAlign: "center", background: "rgba(248,113,113,0.06)", borderColor: danger + "44", fontWeight: 700 }}
                                  value={r.qty}
                                  onChange={e => updateRow(i, Number(e.target.value))}
                                />
                              </td>
                              <td style={{ padding: "10px", textAlign: "center", fontSize: 14, color: "var(--text-muted)" }}>{fmt(r.rate)}</td>
                              <td style={{ padding: "10px", textAlign: "right", fontWeight: 600, fontSize: 14 }}>{fmt((Number(r.qty) || 0) * r.rate)}</td>
                              <td style={{ padding: "10px", textAlign: "center" }}>
                                <button style={{ background: "transparent", border: "none", color: danger, cursor: "pointer", fontSize: 18, lineHeight: 1 }} onClick={() => setRows(rows.filter((_, idx) => idx !== i))}>×</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Totals */}
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                      <div style={{ width: 280, display: "flex", flexDirection: "column", gap: 10, fontSize: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--text-muted)" }}>Subtotal</span>
                          <span style={{ fontWeight: 600 }}>{fmt(total)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: "var(--text-muted)" }}>Freight</span>
                          <input type="number" style={{ ...inp, width: 110, padding: "4px 8px", textAlign: "right" }} value={freight} onChange={e => setFreight(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0" />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", borderTop: `2px solid ${danger}44`, paddingTop: 12, fontWeight: 800, fontSize: 18, color: danger }}>
                          <span>Net Total</span>
                          <span>{fmt(netTotal)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {rows.length === 0 && invoiceId && (
                  <div style={{ ...panel, textAlign: "center", color: "var(--text-muted)", padding: 40 }}>Loading invoice items…</div>
                )}
                {rows.length === 0 && !invoiceId && (
                  <div style={{ ...panel, textAlign: "center", color: "var(--text-muted)", padding: 40, fontSize: 14 }}>Select an invoice above to load returnable items</div>
                )}
              </div>

            ) : (
              /* ── Preview ── */
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Buttons */}
                <div style={{ ...panel, display: "flex", gap: 10 }}>
                  <button style={{ ...btnDanger, background: "#16a34a" }} onClick={() => window.print()}>Print Voucher</button>
                  <button style={btnGhost} onClick={() => { setPreview(false); resetForm(); }}>New Return</button>
                </div>

                {/* Screen preview */}
                <div style={{ ...panel, background: "#fff", color: "#111", padding: 40, fontFamily: "'Outfit','Arial',sans-serif" }}>
                  <div style={{ textAlign: "center", borderBottom: "3px solid #111", paddingBottom: 16, marginBottom: 24 }}>
                    <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: 1 }}>SALES RETURN VOUCHER</div>
                    <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
                      Date: {savedData?.date} &nbsp;|&nbsp; Voucher No: {savedData?.returnNo}
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, fontSize: 14 }}>
                    <div><strong>Customer:</strong> {savedData?.customerName}</div>
                    <div><strong>Ref Invoice:</strong> {savedData?.invoiceNo}</div>
                  </div>

                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 24 }}>
                    <thead>
                      <tr style={{ borderTop: "2px solid #111", borderBottom: "2px solid #111", background: "#f5f5f5" }}>
                        <th style={{ padding: "10px 12px", textAlign: "left" }}>Description</th>
                        <th style={{ padding: "10px 12px", textAlign: "center", width: 80 }}>Qty</th>
                        <th style={{ padding: "10px 12px", textAlign: "right", width: 100 }}>Rate</th>
                        <th style={{ padding: "10px 12px", textAlign: "right", width: 110 }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {savedData?.items.map((it, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #e5e5e5" }}>
                          <td style={{ padding: "10px 12px", fontWeight: 600 }}>{it.name}</td>
                          <td style={{ padding: "10px 12px", textAlign: "center" }}>{it.qty}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right" }}>{fmt(it.rate)}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>{fmt(it.qty * it.rate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 32 }}>
                    <div style={{ width: 260, fontSize: 13 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span>Subtotal</span><span>{fmt(savedData?.total || 0)}</span></div>
                      {(savedData?.freight || 0) > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span>Freight</span><span>{fmt(savedData?.freight || 0)}</span></div>}
                      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "3px solid #111", paddingTop: 10, fontWeight: 900, fontSize: 17 }}><span>Net Total</span><span>{fmt(savedData?.netTotal || 0)}</span></div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
                    {["Prepared By", "Received By"].map(l => (
                      <div key={l}><div style={{ borderTop: "1px solid #111", paddingTop: 8, fontSize: 12, color: "#555" }}>{l}</div></div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Print Area ── */}
      {preview && savedData && (
        <div className="print-area" style={{ fontFamily: "'Outfit','Arial',sans-serif", fontSize: 13, color: "#000", background: "#fff", padding: "8mm 10mm" }}>
          <div style={{ textAlign: "center", borderBottom: "3px solid #000", paddingBottom: 14, marginBottom: 20 }}>
            <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: 1 }}>SALES RETURN VOUCHER</div>
            <div style={{ fontSize: 12, color: "#333", marginTop: 4 }}>Date: {savedData.date} &nbsp;|&nbsp; Voucher No: {savedData.returnNo}</div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18, fontSize: 12 }}>
            <div><strong>Customer:</strong> {savedData.customerName}</div>
            <div><strong>Ref Invoice:</strong> {savedData.invoiceNo}</div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 18 }}>
            <thead>
              <tr style={{ borderTop: "2px solid #000", borderBottom: "2px solid #000", background: "#f0f0f0" }}>
                <th style={{ padding: "8px 10px", textAlign: "left" }}>Description</th>
                <th style={{ padding: "8px 10px", textAlign: "center", width: 60 }}>Qty</th>
                <th style={{ padding: "8px 10px", textAlign: "right", width: 90 }}>Rate</th>
                <th style={{ padding: "8px 10px", textAlign: "right", width: 100 }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {savedData.items.map((it, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #ddd" }}>
                  <td style={{ padding: "8px 10px", fontWeight: 600 }}>{it.name}</td>
                  <td style={{ padding: "8px 10px", textAlign: "center" }}>{it.qty}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right" }}>{fmt(it.rate)}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>{fmt(it.qty * it.rate)}</td>
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
            {["Prepared By", "Received By"].map(l => (
              <div key={l}><div style={{ borderTop: "1px solid #000", paddingTop: 6, fontSize: 11, color: "#444" }}>{l}</div></div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
