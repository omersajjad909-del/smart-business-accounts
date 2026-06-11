"use client";
import { useState, useMemo } from "react";
import { useBusinessRecords, BusinessRecord } from "@/lib/useBusinessRecords";
import DateInput from "@/app/dashboard/reports/_components/DateInput";

// ─── Types ────────────────────────────────────────────────────────────────────

type DocType   = "Shipping Bill" | "Export Declaration" | "Bill of Lading" | "Airway Bill" | "Export Permit" | "Phytosanitary Certificate" | "Fumigation Certificate" | "Inspection Certificate" | "Insurance Certificate" | "Other";
type DocStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "CANCELLED";

interface ExportDocData {
  docNo:         string;
  docType:       DocType;
  shipmentRef:   string;
  invoiceNo:     string;
  exporterName:  string;
  importerName:  string;
  portOfLoading: string;
  portOfDest:    string;
  countryOfDest: string;
  vessel:        string;
  etd:           string;
  cargoDesc:     string;
  hsCode:        string;
  grossWeight:   number;
  netWeight:     number;
  packages:      number;
  declaredValue: number;
  currency:      string;
  sbNo:          string;
  sbDate:        string;
  authority:     string;
  notes:         string;
  attachments:   string[];
}

interface ExportDocRecord extends ExportDocData {
  id:        string;
  status:    DocStatus;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DOC_TYPES: DocType[] = [
  "Shipping Bill", "Export Declaration", "Bill of Lading", "Airway Bill",
  "Export Permit", "Phytosanitary Certificate", "Fumigation Certificate",
  "Inspection Certificate", "Insurance Certificate", "Other",
];

const STATUS_META: Record<DocStatus, { label: string; color: string; bg: string; border: string }> = {
  DRAFT:     { label: "Draft",     color: "#9ca3af", bg: "rgba(156,163,175,.12)", border: "rgba(156,163,175,.35)" },
  SUBMITTED: { label: "Submitted", color: "#fbbf24", bg: "rgba(251,191,36,.12)",  border: "rgba(251,191,36,.35)"  },
  APPROVED:  { label: "Approved",  color: "#4ade80", bg: "rgba(74,222,128,.12)",   border: "rgba(74,222,128,.35)"  },
  REJECTED:  { label: "Rejected",  color: "#f87171", bg: "rgba(248,113,113,.12)",  border: "rgba(248,113,113,.35)" },
  CANCELLED: { label: "Cancelled", color: "#6b7280", bg: "rgba(107,114,128,.12)",  border: "rgba(107,114,128,.35)" },
};

const DOC_ICON: Record<string, string> = {
  "Shipping Bill": "📋", "Export Declaration": "📄", "Bill of Lading": "🚢",
  "Airway Bill": "✈️", "Export Permit": "🪪", "Phytosanitary Certificate": "🌿",
  "Fumigation Certificate": "💨", "Inspection Certificate": "🔍",
  "Insurance Certificate": "🛡️", "Other": "📎",
};

const CURRENCIES = ["USD","EUR","GBP","AED","PKR","CNY"];
const FONT = "'Outfit','Inter',sans-serif";

const s = {
  page:   { fontFamily: FONT, color: "var(--text-primary)", padding: "28px 24px", minHeight: "100vh", background: "var(--app-bg)" },
  panel:  { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14 },
  inp:    { background: "rgba(255,255,255,.05)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 13px", color: "var(--text-primary)", fontFamily: FONT, fontSize: 13, width: "100%", boxSizing: "border-box" as const, outline: "none" },
  label:  { fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5, fontWeight: 500 } as React.CSSProperties,
  btn:    (bg: string, small?: boolean) => ({ background: bg, border: "none", borderRadius: 8, padding: small ? "7px 14px" : "10px 22px", color: "var(--text-primary)", fontFamily: FONT, cursor: "pointer", fontSize: small ? 12 : 13, fontWeight: 600, lineHeight: 1 } as React.CSSProperties),
  badge:  (color: string, bg: string, border: string) => ({ background: bg, color, border: `1px solid ${border}`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" as const, display: "inline-block" }),
  th:     { padding: "11px 13px", textAlign: "left" as const, fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em", whiteSpace: "nowrap" as const, borderBottom: "1px solid var(--border)" },
  td:     { padding: "12px 13px", fontSize: 12, color: "var(--text-primary)", borderBottom: "1px solid var(--border)", verticalAlign: "middle" as const },
  kpi:    { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px", minWidth: 0 },
  tabBtn: (active: boolean) => ({ background: active ? "#10b981" : "rgba(255,255,255,.06)", border: `1px solid ${active ? "#10b981" : "var(--border)"}`, borderRadius: 8, padding: "7px 14px", color: active ? "#fff" : "var(--text-muted)", fontFamily: FONT, cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" as const }),
};

const todayIso  = () => new Date().toISOString().split("T")[0];
function genDocNo(type: DocType) {
  const prefix = type === "Shipping Bill" ? "SB" : type === "Bill of Lading" ? "BL" : type === "Airway Bill" ? "AWB" : "EXP";
  return `${prefix}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

const BLANK = {
  docType: "Shipping Bill" as DocType, docNo: "", status: "DRAFT" as DocStatus,
  shipmentRef: "", invoiceNo: "", exporterName: "", importerName: "",
  portOfLoading: "", portOfDest: "", countryOfDest: "",
  vessel: "", etd: todayIso(), cargoDesc: "", hsCode: "",
  grossWeight: "", netWeight: "", packages: "", declaredValue: "",
  currency: "USD", sbNo: "", sbDate: "", authority: "", notes: "",
};

function mapRecord(r: BusinessRecord): ExportDocRecord {
  const d = (r.data ?? {}) as Partial<ExportDocData>;
  return {
    id: r.id, status: (r.status as DocStatus) ?? "DRAFT", createdAt: r.createdAt,
    docNo: d.docNo ?? r.title ?? "", docType: (d.docType as DocType) ?? "Shipping Bill",
    shipmentRef: d.shipmentRef ?? "", invoiceNo: d.invoiceNo ?? "",
    exporterName: d.exporterName ?? "", importerName: d.importerName ?? "",
    portOfLoading: d.portOfLoading ?? "", portOfDest: d.portOfDest ?? "",
    countryOfDest: d.countryOfDest ?? "", vessel: d.vessel ?? "",
    etd: d.etd ?? r.date ?? "", cargoDesc: d.cargoDesc ?? "", hsCode: d.hsCode ?? "",
    grossWeight: Number(d.grossWeight ?? 0), netWeight: Number(d.netWeight ?? 0),
    packages: Number(d.packages ?? 0), declaredValue: Number(d.declaredValue ?? r.amount ?? 0),
    currency: d.currency ?? "USD", sbNo: d.sbNo ?? "", sbDate: d.sbDate ?? "",
    authority: d.authority ?? "", notes: d.notes ?? "",
    attachments: Array.isArray(d.attachments) ? d.attachments : [],
  };
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExportDocumentationPage() {
  const { records, loading, create, update, remove } = useBusinessRecords("export_document");
  const [filterTab, setFilterTab] = useState("ALL");
  const [docTypeFilter, setDocTypeFilter] = useState("ALL");
  const [search, setSearch]       = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [form, setForm]           = useState({ ...BLANK });
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const docs = useMemo(() => records.map(mapRecord), [records]);

  const kpis = useMemo(() => ({
    total:     docs.length,
    approved:  docs.filter(d => d.status === "APPROVED").length,
    submitted: docs.filter(d => d.status === "SUBMITTED").length,
    draft:     docs.filter(d => d.status === "DRAFT").length,
    rejected:  docs.filter(d => d.status === "REJECTED").length,
  }), [docs]);

  const filtered = useMemo(() => {
    let list = docs;
    if (filterTab !== "ALL") list = list.filter(d => d.status === filterTab);
    if (docTypeFilter !== "ALL") list = list.filter(d => d.docType === docTypeFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(d =>
        d.docNo.toLowerCase().includes(q) ||
        d.exporterName.toLowerCase().includes(q) ||
        d.shipmentRef.toLowerCase().includes(q) ||
        d.invoiceNo.toLowerCase().includes(q)
      );
    }
    return list;
  }, [docs, filterTab, docTypeFilter, search]);

  const sf = (k: keyof typeof BLANK, v: string) => setForm(p => ({ ...p, [k]: v }));

  const openNew = () => {
    const type = "Shipping Bill" as DocType;
    setEditId(null);
    setForm({ ...BLANK, docType: type, docNo: genDocNo(type), etd: todayIso() });
    setError("");
    setShowModal(true);
  };

  const openEdit = (d: ExportDocRecord) => {
    setEditId(d.id);
    setForm({
      docType: d.docType, docNo: d.docNo, status: d.status,
      shipmentRef: d.shipmentRef, invoiceNo: d.invoiceNo,
      exporterName: d.exporterName, importerName: d.importerName,
      portOfLoading: d.portOfLoading, portOfDest: d.portOfDest,
      countryOfDest: d.countryOfDest, vessel: d.vessel, etd: d.etd,
      cargoDesc: d.cargoDesc, hsCode: d.hsCode,
      grossWeight: String(d.grossWeight), netWeight: String(d.netWeight),
      packages: String(d.packages), declaredValue: String(d.declaredValue),
      currency: d.currency, sbNo: d.sbNo, sbDate: d.sbDate,
      authority: d.authority, notes: d.notes,
    });
    setError("");
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setError(""); setEditId(null); };

  const save = async () => {
    if (!form.docNo.trim()) { setError("Document number is required."); return; }
    if (!form.exporterName.trim()) { setError("Exporter name is required."); return; }

    const data: ExportDocData = {
      docNo: form.docNo.trim(), docType: form.docType,
      shipmentRef: form.shipmentRef.trim(), invoiceNo: form.invoiceNo.trim(),
      exporterName: form.exporterName.trim(), importerName: form.importerName.trim(),
      portOfLoading: form.portOfLoading.trim(), portOfDest: form.portOfDest.trim(),
      countryOfDest: form.countryOfDest.trim(), vessel: form.vessel.trim(),
      etd: form.etd, cargoDesc: form.cargoDesc.trim(), hsCode: form.hsCode.trim(),
      grossWeight: parseFloat(String(form.grossWeight)) || 0,
      netWeight:   parseFloat(String(form.netWeight)) || 0,
      packages:    parseInt(String(form.packages)) || 0,
      declaredValue: parseFloat(String(form.declaredValue)) || 0,
      currency: form.currency, sbNo: form.sbNo.trim(), sbDate: form.sbDate,
      authority: form.authority.trim(), notes: form.notes.trim(), attachments: [],
    };

    setSaving(true);
    try {
      if (editId) {
        await update(editId, { title: data.docNo, status: form.status, data: data as unknown as Record<string, unknown>, amount: data.declaredValue, date: form.etd });
      } else {
        await create({ title: data.docNo, status: form.status, data: data as unknown as Record<string, unknown>, amount: data.declaredValue, date: form.etd });
      }
      closeModal();
    } catch (e) { setError(String(e)); }
    finally { setSaving(false); }
  };

  const changeStatus = (id: string, status: string) => update(id, { status });
  const doDelete = async (id: string) => { await remove(id); setConfirmDel(null); };

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 26 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
            <span>📋</span> Export Documentation
          </h1>
          <p style={{ margin: "5px 0 0", color: "var(--text-muted)", fontSize: 13 }}>
            Manage shipping bills, export declarations, BL, AWB, permits, and compliance certificates.
          </p>
        </div>
        <button onClick={openNew} style={s.btn("#10b981")}>+ New Document</button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Docs",  value: kpis.total,     color: "#a78bfa" },
          { label: "Approved",    value: kpis.approved,  color: "#4ade80" },
          { label: "Submitted",   value: kpis.submitted, color: "#fbbf24" },
          { label: "Draft",       value: kpis.draft,     color: "#9ca3af" },
          { label: "Rejected",    value: kpis.rejected,  color: "#f87171" },
        ].map(k => (
          <div key={k.label} style={s.kpi as React.CSSProperties}>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color, marginBottom: 4 }}>{k.value}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["ALL", ...Object.keys(STATUS_META)].map(t => (
            <button key={t} onClick={() => setFilterTab(t)} style={s.tabBtn(filterTab === t)}>
              {t === "ALL" ? "All Status" : STATUS_META[t as DocStatus].label}
            </button>
          ))}
        </div>
        <select value={docTypeFilter} onChange={e => setDocTypeFilter(e.target.value)}
          style={{ ...s.inp, width: "auto", padding: "7px 12px", fontSize: 12 }}>
          <option value="ALL">All Types</option>
          {DOC_TYPES.map(t => <option key={t} value={t}>{DOC_ICON[t]} {t}</option>)}
        </select>
        <input placeholder="Search doc no, exporter, shipment…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...s.inp, width: 260, padding: "8px 13px" }} />
      </div>

      {/* Table */}
      <div style={{ ...s.panel, overflow: "auto" }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>Loading documents…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 56, textAlign: "center", color: "var(--text-muted)" }}>
            No documents found. Click &quot;+ New Document&quot; to add one.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1200 }}>
            <thead>
              <tr>
                {["Doc No","Type","Exporter","Importer","Route","Shipment / Invoice","Cargo","Packages","Value","ETD","SB No","Authority","Status","Actions"].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => {
                const sm = STATUS_META[d.status];
                return (
                  <tr key={d.id}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.03)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ ...s.td, fontWeight: 700, color: "#10b981" }}>{d.docNo}</td>
                    <td style={s.td}><span style={{ background: "rgba(16,185,129,.1)", color: "#34d399", border: "1px solid rgba(16,185,129,.25)", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{DOC_ICON[d.docType]} {d.docType}</span></td>
                    <td style={{ ...s.td, fontWeight: 600 }}>{d.exporterName || "—"}</td>
                    <td style={s.td}>{d.importerName || "—"}</td>
                    <td style={s.td}>
                      <div>{d.portOfLoading || "—"} → {d.portOfDest || "—"}</div>
                      {d.countryOfDest && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{d.countryOfDest}</div>}
                    </td>
                    <td style={s.td}>
                      <div>{d.shipmentRef || "—"}</div>
                      {d.invoiceNo && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Inv: {d.invoiceNo}</div>}
                    </td>
                    <td style={{ ...s.td, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis" }}>
                      <div>{d.cargoDesc || "—"}</div>
                      {d.hsCode && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>HS: {d.hsCode}</div>}
                    </td>
                    <td style={{ ...s.td, textAlign: "right" }}>{d.packages || "—"}</td>
                    <td style={{ ...s.td, textAlign: "right", fontWeight: 700, color: "#4ade80" }}>
                      {d.declaredValue ? `${d.currency} ${d.declaredValue.toLocaleString()}` : "—"}
                    </td>
                    <td style={s.td}>{d.etd || "—"}</td>
                    <td style={s.td}>{d.sbNo || "—"}</td>
                    <td style={s.td}>{d.authority || "—"}</td>
                    <td style={s.td}><span style={s.badge(sm.color, sm.bg, sm.border)}>{sm.label}</span></td>
                    <td style={s.td}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => openEdit(d)} style={s.btn("rgba(16,185,129,.2)", true)}>Edit</button>
                        <select value={d.status} onChange={e => changeStatus(d.id, e.target.value)}
                          style={{ ...s.inp, width: "auto", padding: "5px 8px", fontSize: 11 }}>
                          {Object.keys(STATUS_META).map(st => <option key={st} value={st}>{STATUS_META[st as DocStatus].label}</option>)}
                        </select>
                        <button onClick={() => setConfirmDel(d.id)} style={s.btn("rgba(239,68,68,.18)", true)}>Del</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Confirm Delete */}
      {confirmDel && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
          <div style={{ ...s.panel, padding: 28, maxWidth: 360, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Delete Document?</div>
            <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 22 }}>This action cannot be undone.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => doDelete(confirmDel)} style={{ ...s.btn("#ef4444"), flex: 1 }}>Delete</button>
              <button onClick={() => setConfirmDel(null)} style={{ ...s.btn("rgba(255,255,255,.08)"), flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, overflowY: "auto", padding: "32px 16px" }}>
          <div style={{ ...s.panel, width: "100%", maxWidth: 800, padding: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{editId ? "Edit Export Document" : "New Export Document"}</h2>
              <button onClick={closeModal} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 22 }}>×</button>
            </div>

            {/* Doc Type + Doc No + Status */}
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div><label style={s.label}>Document Type *</label>
                <select value={form.docType} onChange={e => { sf("docType", e.target.value); sf("docNo", genDocNo(e.target.value as DocType)); }} style={s.inp}>
                  {DOC_TYPES.map(t => <option key={t} value={t}>{DOC_ICON[t]} {t}</option>)}
                </select></div>
              <div><label style={s.label}>Document No *</label>
                <input value={form.docNo} onChange={e => sf("docNo", e.target.value)} style={s.inp} placeholder="Auto-generated" /></div>
              <div><label style={s.label}>Status</label>
                <select value={form.status} onChange={e => sf("status", e.target.value as DocStatus)} style={s.inp}>
                  {Object.keys(STATUS_META).map(st => <option key={st} value={st}>{STATUS_META[st as DocStatus].label}</option>)}
                </select></div>
            </div>

            {/* Exporter + Importer */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div><label style={s.label}>Exporter Name *</label>
                <input value={form.exporterName} onChange={e => sf("exporterName", e.target.value)} style={s.inp} placeholder="Exporter / shipper" /></div>
              <div><label style={s.label}>Importer / Consignee</label>
                <input value={form.importerName} onChange={e => sf("importerName", e.target.value)} style={s.inp} placeholder="Importer name" /></div>
            </div>

            {/* Ports + Country + Vessel */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div><label style={s.label}>Port of Loading</label>
                <input value={form.portOfLoading} onChange={e => sf("portOfLoading", e.target.value)} style={s.inp} placeholder="e.g. Karachi" /></div>
              <div><label style={s.label}>Port of Destination</label>
                <input value={form.portOfDest} onChange={e => sf("portOfDest", e.target.value)} style={s.inp} placeholder="e.g. Dubai" /></div>
              <div><label style={s.label}>Country of Destination</label>
                <input value={form.countryOfDest} onChange={e => sf("countryOfDest", e.target.value)} style={s.inp} placeholder="UAE" /></div>
              <div><label style={s.label}>Vessel / Flight</label>
                <input value={form.vessel} onChange={e => sf("vessel", e.target.value)} style={s.inp} placeholder="Vessel name" /></div>
            </div>

            {/* References */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div><label style={s.label}>Shipment Ref</label>
                <input value={form.shipmentRef} onChange={e => sf("shipmentRef", e.target.value)} style={s.inp} placeholder="Linked shipment" /></div>
              <div><label style={s.label}>Invoice No</label>
                <input value={form.invoiceNo} onChange={e => sf("invoiceNo", e.target.value)} style={s.inp} placeholder="Export invoice no" /></div>
              <div><label style={s.label}>ETD Date</label>
                <DateInput value={form.etd || ""} onChange={v => sf("etd", v)} style={s.inp} /></div>
            </div>

            {/* SB No + Authority (for Shipping Bills) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div><label style={s.label}>SB No / Reference No</label>
                <input value={form.sbNo} onChange={e => sf("sbNo", e.target.value)} style={s.inp} placeholder="Shipping bill / reference number" /></div>
              <div><label style={s.label}>Issuing Authority</label>
                <input value={form.authority} onChange={e => sf("authority", e.target.value)} style={s.inp} placeholder="e.g. Customs, TDAP, Agriculture Dept" /></div>
            </div>

            {/* Cargo + HS */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 14 }}>
              <div><label style={s.label}>Cargo Description</label>
                <input value={form.cargoDesc} onChange={e => sf("cargoDesc", e.target.value)} style={s.inp} placeholder="Description of goods" /></div>
              <div><label style={s.label}>HS Code</label>
                <input value={form.hsCode} onChange={e => sf("hsCode", e.target.value)} style={s.inp} placeholder="e.g. 5208.11" /></div>
            </div>

            {/* Weights + Packages + Value */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div><label style={s.label}>Gross Weight (kg)</label>
                <input type="number" min="0" value={String(form.grossWeight)} onChange={e => sf("grossWeight", e.target.value)} style={s.inp} placeholder="0" /></div>
              <div><label style={s.label}>Net Weight (kg)</label>
                <input type="number" min="0" value={String(form.netWeight)} onChange={e => sf("netWeight", e.target.value)} style={s.inp} placeholder="0" /></div>
              <div><label style={s.label}>Packages</label>
                <input type="number" min="0" value={String(form.packages)} onChange={e => sf("packages", e.target.value)} style={s.inp} placeholder="0" /></div>
              <div><label style={s.label}>Currency</label>
                <select value={form.currency} onChange={e => sf("currency", e.target.value)} style={s.inp}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select></div>
              <div><label style={s.label}>Declared Value</label>
                <input type="number" min="0" step="0.01" value={String(form.declaredValue)} onChange={e => sf("declaredValue", e.target.value)} style={s.inp} placeholder="0.00" /></div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 22 }}>
              <label style={s.label}>Notes / Remarks</label>
              <textarea value={form.notes} onChange={e => sf("notes", e.target.value)} rows={2} style={{ ...s.inp, resize: "vertical" }} placeholder="Any remarks…" />
            </div>

            {error && (
              <div style={{ marginBottom: 14, padding: "10px 14px", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", borderRadius: 8, fontSize: 13, color: "#fca5a5" }}>{error}</div>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={save} disabled={saving} style={{ ...s.btn("#10b981"), flex: 1, opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : editId ? "Update Document" : "Create Document"}
              </button>
              <button onClick={closeModal} style={{ ...s.btn("rgba(255,255,255,.07)"), flex: 0.4 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
