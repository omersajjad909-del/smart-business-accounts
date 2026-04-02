"use client";
import { useEffect, useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const FONT = "'Outfit','Inter',sans-serif";
const ACCENT = "#6366f1";

const INCOTERMS = ["FOB","CIF","EXW","CFR","DAP","DDP","FCA","CPT","CIP","FAS"];
const CURRENCIES = ["USD","EUR","GBP","AED","CNY","JPY","SAR","SGD","CAD","AUD"];

interface LineItem { hsCode: string; description: string; qty: number; unit: string; unitPrice: number; }

function newLine(): LineItem { return { hsCode: "", description: "", qty: 1, unit: "pcs", unitPrice: 0 }; }
function lineTotal(l: LineItem) { return l.qty * l.unitPrice; }

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  DRAFT:     { bg: "rgba(148,163,184,0.12)", color: "#94a3b8" },
  ISSUED:    { bg: "rgba(14,165,233,0.12)",  color: "#38bdf8" },
  SENT:      { bg: "rgba(251,191,36,0.12)",  color: "#fbbf24" },
  ACCEPTED:  { bg: "rgba(16,185,129,0.12)",  color: "#34d399" },
  PAID:      { bg: "rgba(99,102,241,0.12)",  color: "#a5b4fc" },
  CANCELLED: { bg: "rgba(239,68,68,0.12)",   color: "#f87171" },
};

export default function CommercialInvoicePage() {
  const { records, loading, create, update, remove } = useBusinessRecords("commercial_invoice");
  const [salesInvoices, setSalesInvoices] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    sourceSalesInvoiceId: "", sourceSalesInvoiceNo: "",
    invoiceNo: "", invoiceDate: new Date().toISOString().slice(0,10),
    exporter: "", exporterAddress: "", exporterCountry: "",
    importer: "", importerAddress: "", importerCountry: "",
    portOfLoading: "", portOfDischarge: "", incoterm: "FOB",
    currency: "USD", paymentTerms: "", lcNo: "", blNo: "",
    countryOfOrigin: "", countryOfDestination: "",
    packingType: "", totalPackages: "", grossWeight: "", netWeight: "",
    freight: 0, insurance: 0, discount: 0,
    notes: "", status: "DRAFT",
  });
  const [lines, setLines] = useState<LineItem[]>([newLine()]);

  const subtotal = lines.reduce((s, l) => s + lineTotal(l), 0);
  const grandTotal = subtotal + Number(form.freight) + Number(form.insurance) - Number(form.discount);
  const fmt = (n: number) => `${form.currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const STATUSES = ["ALL", "DRAFT", "ISSUED", "SENT", "ACCEPTED", "PAID", "CANCELLED"];

  const enriched = useMemo(() => records.map(r => ({
    ...r,
    d: typeof r.data === "string" ? JSON.parse(r.data || "{}") : (r.data || {}),
  })), [records]);

  useEffect(() => {
    fetch("/api/sales-invoice")
      .then((r) => r.json())
      .then((data) => setSalesInvoices(Array.isArray(data?.invoices) ? data.invoices : []))
      .catch(() => setSalesInvoices([]));
  }, []);

  const filtered = useMemo(() => {
    let list = enriched;
    if (filterStatus !== "ALL") list = list.filter(r => r.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => r.title?.toLowerCase().includes(q) || r.d.importer?.toLowerCase().includes(q) || r.d.blNo?.toLowerCase().includes(q));
    }
    return list;
  }, [enriched, filterStatus, search]);

  const kpis = useMemo(() => ({
    total:    enriched.length,
    issued:   enriched.filter(r => r.status === "ISSUED" || r.status === "SENT").length,
    paid:     enriched.filter(r => r.status === "PAID").length,
    totalVal: enriched.reduce((s, r) => s + (r.amount || 0), 0),
  }), [enriched]);

  const openNew = () => {
    const n = String(Date.now()).slice(-6);
    setForm(f => ({ ...f, invoiceNo: `CI-${n}`, status: "DRAFT" }));
    setLines([newLine()]);
    setEditing(null);
    setModal(true);
  };

  const openEdit = (r: typeof enriched[0]) => {
    const d = r.d;
    setForm({
      sourceSalesInvoiceId: d.sourceSalesInvoiceId || "", sourceSalesInvoiceNo: d.sourceSalesInvoiceNo || "",
      invoiceNo: r.title || "", invoiceDate: r.date?.slice(0,10) || new Date().toISOString().slice(0,10),
      exporter: d.exporter||"", exporterAddress: d.exporterAddress||"", exporterCountry: d.exporterCountry||"",
      importer: d.importer||"", importerAddress: d.importerAddress||"", importerCountry: d.importerCountry||"",
      portOfLoading: d.portOfLoading||"", portOfDischarge: d.portOfDischarge||"",
      incoterm: d.incoterm||"FOB", currency: d.currency||"USD",
      paymentTerms: d.paymentTerms||"", lcNo: d.lcNo||"", blNo: d.blNo||"",
      countryOfOrigin: d.countryOfOrigin||"", countryOfDestination: d.countryOfDestination||"",
      packingType: d.packingType||"", totalPackages: d.totalPackages||"",
      grossWeight: d.grossWeight||"", netWeight: d.netWeight||"",
      freight: d.freight||0, insurance: d.insurance||0, discount: d.discount||0,
      notes: d.notes||"", status: r.status||"DRAFT",
    });
    setLines(d.lines?.length ? d.lines : [newLine()]);
    setEditing(r.id);
    setModal(true);
  };

  const handleSave = async () => {
    const data = { ...form, lines, subtotal, grandTotal };
    if (editing) {
      await update(editing, { title: form.invoiceNo, status: form.status, amount: grandTotal, date: form.invoiceDate, data });
    } else {
      await create({ title: form.invoiceNo, status: form.status, amount: grandTotal, date: form.invoiceDate, data });
    }
    setModal(false);
  };

  const sf = (k: keyof typeof form, v: string | number) => setForm(f => ({ ...f, [k]: v }));
  const fillFromSalesInvoice = (invoiceId: string) => {
    const inv = salesInvoices.find((row) => row.id === invoiceId);
    if (!inv) return;
    setForm((prev) => ({
      ...prev,
      sourceSalesInvoiceId: inv.id,
      sourceSalesInvoiceNo: inv.invoiceNo || "",
      importer: inv.customer?.name || inv.customerName || prev.importer,
      invoiceDate: String(inv.date || prev.invoiceDate).slice(0, 10),
    }));
    if (Array.isArray(inv.items) && inv.items.length) {
      setLines(inv.items.map((line: any) => ({
        hsCode: line.item?.hsCode || "",
        description: line.item?.name || line.item?.description || "",
        qty: Number(line.qty || 0),
        unit: line.item?.unit || "pcs",
        unitPrice: Number(line.rate || 0),
      })));
    }
  };
  const sl = (i: number, k: keyof LineItem, v: string | number) =>
    setLines(ls => ls.map((l, idx) => idx === i ? { ...l, [k]: v } : l));
  const printRecord = (r: typeof enriched[0]) => {
    const win = window.open("", "_blank", "width=1100,height=900");
    if (!win) return;
    const d = r.d;
    const linesHtml = (d.lines || []).map((line: LineItem) => `
      <tr><td>${line.hsCode || "-"}</td><td>${line.description || "-"}</td><td style="text-align:right">${line.qty || 0}</td><td>${line.unit || "-"}</td><td style="text-align:right">${Number(line.unitPrice || 0).toFixed(2)}</td><td style="text-align:right">${(Number(line.qty || 0) * Number(line.unitPrice || 0)).toFixed(2)}</td></tr>
    `).join("");
    win.document.write(`<!doctype html><html><head><title>${r.title}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #d1d5db;padding:8px;font-size:12px;text-align:left}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}</style></head><body><h1>Commercial Invoice</h1><div><b>Invoice:</b> ${r.title}</div><div><b>Date:</b> ${String(r.date || "").slice(0, 10)}</div><div class="grid"><div><b>Importer:</b> ${d.importer || "-"}</div><div><b>Exporter:</b> ${d.exporter || "-"}</div><div><b>Incoterm:</b> ${d.incoterm || "-"}</div><div><b>BL / AWB:</b> ${d.blNo || "-"}</div><div><b>LC No:</b> ${d.lcNo || "-"}</div><div><b>Source SI:</b> ${d.sourceSalesInvoiceNo || "-"}</div></div><table><thead><tr><th>HS Code</th><th>Description</th><th>Qty</th><th>Unit</th><th>Unit Price</th><th>Total</th></tr></thead><tbody>${linesHtml}</tbody></table><div style="margin-top:16px"><b>Total:</b> ${(d.currency || "USD")} ${Number(r.amount || 0).toFixed(2)}</div></body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  const th: React.CSSProperties = { padding: "11px 14px", textAlign: "left", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.7, borderBottom: "1px solid var(--border)", fontWeight: 600, whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "11px 14px", fontSize: 13, borderBottom: "1px solid var(--border)", color: "var(--text-primary)" };
  const inp = (extra?: React.CSSProperties): React.CSSProperties => ({ background: "var(--app-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", color: "var(--text-primary)", fontSize: 13, fontFamily: FONT, outline: "none", width: "100%", boxSizing: "border-box", ...extra });
  const lbl: React.CSSProperties = { fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, display: "block", marginBottom: 5 };

  return (
    <div style={{ minHeight: "100vh", background: "var(--app-bg)", padding: "32px 28px", fontFamily: FONT, color: "var(--text-primary)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px", letterSpacing: -0.5 }}>Commercial Invoice</h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Export documents with HS codes, Incoterms, and customs declarations</p>
        </div>
        <button onClick={openNew} style={{ background: ACCENT, color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>
          + New Commercial Invoice
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Total Invoices", value: kpis.total,    color: ACCENT },
          { label: "Issued / Sent",  value: kpis.issued,   color: "#38bdf8" },
          { label: "Paid",           value: kpis.paid,     color: "#34d399" },
          { label: "Total Value",    value: `$${(kpis.totalVal/1000).toFixed(1)}k`, color: "#a5b4fc" },
        ].map(k => (
          <div key={k.label} style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 3, background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 10, padding: 3 }}>
          {STATUSES.map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{
              background: filterStatus === s ? ACCENT : "transparent", color: filterStatus === s ? "#fff" : "var(--text-muted)",
              border: "none", borderRadius: 7, padding: "5px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT,
            }}>{s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}</button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoice no, importer, BL…"
          style={{ flex: 1, minWidth: 200, ...inp() }} />
      </div>

      {/* Table */}
      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        {loading ? <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)" }}>Loading…</div>
        : filtered.length === 0 ? <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)" }}>No commercial invoices yet.</div>
        : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Invoice No","Importer","Port Loading→Discharge","Incoterm","Currency","BL No","Amount","Status","Actions"].map(h => <th key={h} style={th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const ss = STATUS_STYLE[r.status] || STATUS_STYLE.DRAFT;
                return (
                  <tr key={r.id} style={{ background: i % 2 === 1 ? "rgba(255,255,255,0.013)" : "transparent" }}>
                    <td style={{ ...td, fontWeight: 700, color: "#a5b4fc" }}>{r.title}</td>
                    <td style={td}>{r.d.importer || "—"}</td>
                    <td style={{ ...td, fontSize: 12, color: "var(--text-muted)" }}>
                      {r.d.portOfLoading || "—"} → {r.d.portOfDischarge || "—"}
                    </td>
                    <td style={td}>
                      <span style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                        {r.d.incoterm || "—"}
                      </span>
                    </td>
                    <td style={{ ...td, fontSize: 12 }}>{r.d.currency || "USD"}</td>
                    <td style={{ ...td, fontSize: 12, fontFamily: "monospace", color: "var(--text-muted)" }}>{r.d.blNo || "—"}</td>
                    <td style={{ ...td, fontWeight: 700, textAlign: "right" }}>
                      {r.d.currency || "USD"} {(r.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td style={td}>
                      <span style={{ ...ss, display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                        {r.status}
                      </span>
                    </td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => openEdit(r)} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 10px", fontSize: 12, color: "var(--text-muted)", cursor: "pointer" }}>Edit</button>
                        <button onClick={() => printRecord(r)} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 10px", fontSize: 12, color: "#38bdf8", cursor: "pointer" }}>Print</button>
                        <button onClick={() => remove(r.id)} style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", fontSize: 15, padding: "0 4px" }}>×</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "20px", overflowY: "auto" }}
          onClick={e => { if (e.target === e.currentTarget) setModal(false); }}>
          <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 18, width: "100%", maxWidth: 860, padding: "28px 32px", fontFamily: FONT, marginTop: 20, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{editing ? "Edit Commercial Invoice" : "New Commercial Invoice"}</h2>
              <button onClick={() => setModal(false)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: 22, cursor: "pointer" }}>×</button>
            </div>

            {/* Section: Invoice Info */}
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 12 }}>Invoice Info</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div><label style={lbl}>Source Sales Invoice</label>
                <select value={form.sourceSalesInvoiceId} onChange={e => fillFromSalesInvoice(e.target.value)} style={inp()}>
                  <option value="">Select source invoice</option>
                  {salesInvoices.map((inv) => <option key={inv.id} value={inv.id}>{inv.invoiceNo} - {inv.customer?.name || inv.customerName || "Customer"}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Invoice No</label><input value={form.invoiceNo} onChange={e => sf("invoiceNo", e.target.value)} style={inp()} /></div>
              <div><label style={lbl}>Invoice Date</label><input type="date" value={form.invoiceDate} onChange={e => sf("invoiceDate", e.target.value)} style={inp()} /></div>
              <div><label style={lbl}>Status</label>
                <select value={form.status} onChange={e => sf("status", e.target.value)} style={inp()}>
                  {["DRAFT","ISSUED","SENT","ACCEPTED","PAID","CANCELLED"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Section: Parties */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              <div style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 12, padding: "16px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 12 }}>Exporter (Seller)</div>
                <div style={{ marginBottom: 10 }}><label style={lbl}>Company Name</label><input value={form.exporter} onChange={e => sf("exporter", e.target.value)} style={inp()} placeholder="Your company name" /></div>
                <div style={{ marginBottom: 10 }}><label style={lbl}>Address</label><textarea value={form.exporterAddress} onChange={e => sf("exporterAddress", e.target.value)} rows={2} style={{ ...inp(), resize: "none" }} /></div>
                <div><label style={lbl}>Country</label><input value={form.exporterCountry} onChange={e => sf("exporterCountry", e.target.value)} style={inp()} /></div>
              </div>
              <div style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 12, padding: "16px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#34d399", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 12 }}>Importer (Buyer)</div>
                <div style={{ marginBottom: 10 }}><label style={lbl}>Company Name</label><input value={form.importer} onChange={e => sf("importer", e.target.value)} style={inp()} placeholder="Buyer company name" /></div>
                <div style={{ marginBottom: 10 }}><label style={lbl}>Address</label><textarea value={form.importerAddress} onChange={e => sf("importerAddress", e.target.value)} rows={2} style={{ ...inp(), resize: "none" }} /></div>
                <div><label style={lbl}>Country</label><input value={form.importerCountry} onChange={e => sf("importerCountry", e.target.value)} style={inp()} /></div>
              </div>
            </div>

            {/* Section: Shipping */}
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 12 }}>Shipping Details</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><label style={lbl}>Incoterm</label>
                <select value={form.incoterm} onChange={e => sf("incoterm", e.target.value)} style={inp()}>
                  {INCOTERMS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Currency</label>
                <select value={form.currency} onChange={e => sf("currency", e.target.value)} style={inp()}>
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Country of Origin</label><input value={form.countryOfOrigin} onChange={e => sf("countryOfOrigin", e.target.value)} style={inp()} /></div>
              <div><label style={lbl}>Country of Destination</label><input value={form.countryOfDestination} onChange={e => sf("countryOfDestination", e.target.value)} style={inp()} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div><label style={lbl}>Port of Loading</label><input value={form.portOfLoading} onChange={e => sf("portOfLoading", e.target.value)} style={inp()} /></div>
              <div><label style={lbl}>Port of Discharge</label><input value={form.portOfDischarge} onChange={e => sf("portOfDischarge", e.target.value)} style={inp()} /></div>
              <div><label style={lbl}>BL / AWB No</label><input value={form.blNo} onChange={e => sf("blNo", e.target.value)} style={inp()} /></div>
              <div><label style={lbl}>LC No</label><input value={form.lcNo} onChange={e => sf("lcNo", e.target.value)} style={inp()} /></div>
            </div>

            {/* Section: Line Items */}
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 12 }}>Goods / Line Items</div>
            <div style={{ background: "var(--app-bg)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["HS Code","Description","Qty","Unit","Unit Price","Total",""].map(h => (
                      <th key={h} style={{ padding: "9px 12px", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600, textAlign: "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "6px 8px", width: 110 }}><input value={l.hsCode} onChange={e => sl(i, "hsCode", e.target.value)} placeholder="e.g. 6204.62" style={{ ...inp(), fontSize: 12 }} /></td>
                      <td style={{ padding: "6px 8px" }}><input value={l.description} onChange={e => sl(i, "description", e.target.value)} placeholder="Goods description" style={inp()} /></td>
                      <td style={{ padding: "6px 8px", width: 80 }}><input type="number" value={l.qty} onChange={e => sl(i, "qty", Number(e.target.value))} min={0} style={{ ...inp(), textAlign: "right" }} /></td>
                      <td style={{ padding: "6px 8px", width: 80 }}><input value={l.unit} onChange={e => sl(i, "unit", e.target.value)} placeholder="pcs" style={inp()} /></td>
                      <td style={{ padding: "6px 8px", width: 110 }}><input type="number" value={l.unitPrice} onChange={e => sl(i, "unitPrice", Number(e.target.value))} min={0} step={0.01} style={{ ...inp(), textAlign: "right" }} /></td>
                      <td style={{ padding: "6px 12px", width: 100, fontSize: 13, fontWeight: 700, color: "#a5b4fc", textAlign: "right" }}>
                        {lineTotal(l).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "6px 8px", width: 32 }}>
                        {lines.length > 1 && <button onClick={() => setLines(ls => ls.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 16 }}>×</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={() => setLines(ls => [...ls, newLine()])}
                style={{ width: "100%", background: "transparent", border: "none", padding: "10px", fontSize: 13, color: ACCENT, cursor: "pointer", fontWeight: 600, fontFamily: FONT }}>
                + Add Line Item
              </button>
            </div>

            {/* Charges + Totals */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div><label style={lbl}>Freight ({form.currency})</label><input type="number" value={form.freight} onChange={e => sf("freight", Number(e.target.value))} style={inp()} /></div>
                  <div><label style={lbl}>Insurance ({form.currency})</label><input type="number" value={form.insurance} onChange={e => sf("insurance", Number(e.target.value))} style={inp()} /></div>
                  <div><label style={lbl}>Discount ({form.currency})</label><input type="number" value={form.discount} onChange={e => sf("discount", Number(e.target.value))} style={inp()} /></div>
                </div>
                <div><label style={lbl}>Payment Terms</label><input value={form.paymentTerms} onChange={e => sf("paymentTerms", e.target.value)} placeholder="e.g. 30% advance, 70% against BL" style={inp()} /></div>
              </div>
              <div style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 12, padding: "16px" }}>
                {[
                  { label: "Subtotal (FOB)", value: subtotal },
                  { label: "Freight", value: Number(form.freight) },
                  { label: "Insurance", value: Number(form.insurance) },
                  { label: "Discount", value: -Number(form.discount) },
                ].map(row => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13, color: "var(--text-muted)" }}>
                    <span>{row.label}</span>
                    <span>{fmt(row.value)}</span>
                  </div>
                ))}
                <div style={{ borderTop: "1px solid rgba(99,102,241,0.2)", paddingTop: 10, display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 16, color: "#a5b4fc" }}>
                  <span>Grand Total ({form.incoterm})</span>
                  <span>{fmt(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Packing */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
              <div><label style={lbl}>Packing Type</label><input value={form.packingType} onChange={e => sf("packingType", e.target.value)} placeholder="Cartons, Pallets…" style={inp()} /></div>
              <div><label style={lbl}>Total Packages</label><input value={form.totalPackages} onChange={e => sf("totalPackages", e.target.value)} style={inp()} /></div>
              <div><label style={lbl}>Gross Weight (kg)</label><input value={form.grossWeight} onChange={e => sf("grossWeight", e.target.value)} style={inp()} /></div>
              <div><label style={lbl}>Net Weight (kg)</label><input value={form.netWeight} onChange={e => sf("netWeight", e.target.value)} style={inp()} /></div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Notes / Special Instructions</label>
              <textarea value={form.notes} onChange={e => sf("notes", e.target.value)} rows={2} style={{ ...inp(), resize: "none" }} />
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setModal(false)} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 9, padding: "9px 20px", fontSize: 13, cursor: "pointer", color: "var(--text-muted)", fontFamily: FONT }}>Cancel</button>
              <button onClick={handleSave} style={{ background: ACCENT, color: "#fff", border: "none", borderRadius: 9, padding: "9px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
                {editing ? "Update Invoice" : "Create Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
