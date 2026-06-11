"use client";
import { useState, useMemo } from "react";
import { useBusinessRecords, BusinessRecord } from "@/lib/useBusinessRecords";
import DateInput from "@/app/dashboard/reports/_components/DateInput";

// ─── Types ────────────────────────────────────────────────────────────────────

type COOStatus = "DRAFT" | "SUBMITTED" | "ISSUED" | "REJECTED" | "EXPIRED";
type COOType   = "Non-Preferential" | "Preferential" | "GSP" | "Form-E" | "Form-D" | "EUR.1";

interface GoodsLine {
  description: string;
  hsCode:      string;
  qty:         number;
  unit:        string;
  netWeight:   number;
  grossWeight: number;
  value:       number;
}

interface COOData {
  certNo:          string;
  type:            COOType;
  exporterName:    string;
  exporterAddress: string;
  importerName:    string;
  importerAddress: string;
  countryOfOrigin: string;
  countryOfDest:   string;
  shipmentRef:     string;
  invoiceNo:       string;
  blAwbNo:         string;
  vessel:          string;
  portOfLoading:   string;
  portOfDischarge: string;
  issuingAuthority: string;
  issuingCountry:  string;
  issueDate:       string;
  expiryDate:      string;
  remarks:         string;
  goods:           GoodsLine[];
}

interface COORecord extends COOData {
  id:        string;
  status:    COOStatus;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COO_TYPES: COOType[] = ["Non-Preferential","Preferential","GSP","Form-E","Form-D","EUR.1"];

const STATUS_META: Record<COOStatus, { label: string; color: string; bg: string; border: string }> = {
  DRAFT:     { label: "Draft",     color: "#9ca3af", bg: "rgba(156,163,175,.12)", border: "rgba(156,163,175,.35)" },
  SUBMITTED: { label: "Submitted", color: "#fbbf24", bg: "rgba(251,191,36,.12)",  border: "rgba(251,191,36,.35)"  },
  ISSUED:    { label: "Issued",    color: "#4ade80", bg: "rgba(74,222,128,.12)",   border: "rgba(74,222,128,.35)"  },
  REJECTED:  { label: "Rejected",  color: "#f87171", bg: "rgba(248,113,113,.12)",  border: "rgba(248,113,113,.35)" },
  EXPIRED:   { label: "Expired",   color: "#6b7280", bg: "rgba(107,114,128,.12)",  border: "rgba(107,114,128,.35)" },
};

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
  tabBtn: (active: boolean) => ({ background: active ? "#f59e0b" : "rgba(255,255,255,.06)", border: `1px solid ${active ? "#f59e0b" : "var(--border)"}`, borderRadius: 8, padding: "7px 14px", color: active ? "#fff" : "var(--text-muted)", fontFamily: FONT, cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" as const }),
};

const todayIso  = () => new Date().toISOString().split("T")[0];
function genCertNo() { return `COO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`; }
const BLANK_GOODS: GoodsLine = { description: "", hsCode: "", qty: 1, unit: "PCS", netWeight: 0, grossWeight: 0, value: 0 };

const BLANK = {
  certNo: "", type: "Non-Preferential" as COOType, status: "DRAFT" as COOStatus,
  exporterName: "", exporterAddress: "", importerName: "", importerAddress: "",
  countryOfOrigin: "", countryOfDest: "", shipmentRef: "", invoiceNo: "",
  blAwbNo: "", vessel: "", portOfLoading: "", portOfDischarge: "",
  issuingAuthority: "", issuingCountry: "", issueDate: todayIso(), expiryDate: "", remarks: "",
};

function mapRecord(r: BusinessRecord): COORecord {
  const d = (r.data ?? {}) as Partial<COOData>;
  return {
    id: r.id, status: (r.status as COOStatus) ?? "DRAFT", createdAt: r.createdAt,
    certNo: d.certNo ?? r.title ?? "",
    type: (d.type as COOType) ?? "Non-Preferential",
    exporterName: d.exporterName ?? "", exporterAddress: d.exporterAddress ?? "",
    importerName: d.importerName ?? "", importerAddress: d.importerAddress ?? "",
    countryOfOrigin: d.countryOfOrigin ?? "", countryOfDest: d.countryOfDest ?? "",
    shipmentRef: d.shipmentRef ?? "", invoiceNo: d.invoiceNo ?? "",
    blAwbNo: d.blAwbNo ?? "", vessel: d.vessel ?? "",
    portOfLoading: d.portOfLoading ?? "", portOfDischarge: d.portOfDischarge ?? "",
    issuingAuthority: d.issuingAuthority ?? "", issuingCountry: d.issuingCountry ?? "",
    issueDate: d.issueDate ?? r.date ?? "", expiryDate: d.expiryDate ?? "",
    remarks: d.remarks ?? "",
    goods: Array.isArray(d.goods) ? d.goods : [],
  };
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CertificateOfOriginPage() {
  const { records, loading, create, update, remove } = useBusinessRecords("certificate_of_origin");
  const [filterTab, setFilterTab] = useState("ALL");
  const [search, setSearch]       = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [form, setForm]           = useState({ ...BLANK });
  const [goods, setGoods]         = useState<GoodsLine[]>([{ ...BLANK_GOODS }]);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const certs = useMemo(() => records.map(mapRecord), [records]);

  const kpis = useMemo(() => ({
    total:     certs.length,
    issued:    certs.filter(c => c.status === "ISSUED").length,
    submitted: certs.filter(c => c.status === "SUBMITTED").length,
    draft:     certs.filter(c => c.status === "DRAFT").length,
    expired:   certs.filter(c => c.status === "EXPIRED").length,
  }), [certs]);

  const filtered = useMemo(() => {
    let list = certs;
    if (filterTab !== "ALL") list = list.filter(c => c.status === filterTab);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(c =>
        c.certNo.toLowerCase().includes(q) ||
        c.exporterName.toLowerCase().includes(q) ||
        c.importerName.toLowerCase().includes(q) ||
        c.countryOfOrigin.toLowerCase().includes(q) ||
        c.invoiceNo.toLowerCase().includes(q)
      );
    }
    return list;
  }, [certs, filterTab, search]);

  const sf = (k: keyof typeof BLANK, v: string) => setForm(p => ({ ...p, [k]: v }));

  const updateGoods = (idx: number, k: keyof GoodsLine, v: string | number) =>
    setGoods(prev => prev.map((row, i) => i === idx ? { ...row, [k]: v } : row));

  const openNew = () => {
    setEditId(null);
    setForm({ ...BLANK, certNo: genCertNo(), issueDate: todayIso() });
    setGoods([{ ...BLANK_GOODS }]);
    setError("");
    setShowModal(true);
  };

  const openEdit = (c: COORecord) => {
    setEditId(c.id);
    setForm({ certNo: c.certNo, type: c.type, status: c.status, exporterName: c.exporterName, exporterAddress: c.exporterAddress, importerName: c.importerName, importerAddress: c.importerAddress, countryOfOrigin: c.countryOfOrigin, countryOfDest: c.countryOfDest, shipmentRef: c.shipmentRef, invoiceNo: c.invoiceNo, blAwbNo: c.blAwbNo, vessel: c.vessel, portOfLoading: c.portOfLoading, portOfDischarge: c.portOfDischarge, issuingAuthority: c.issuingAuthority, issuingCountry: c.issuingCountry, issueDate: c.issueDate, expiryDate: c.expiryDate, remarks: c.remarks });
    setGoods(c.goods.length > 0 ? c.goods : [{ ...BLANK_GOODS }]);
    setError("");
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setError(""); setEditId(null); };

  const save = async () => {
    if (!form.certNo.trim()) { setError("Certificate number is required."); return; }
    if (!form.exporterName.trim()) { setError("Exporter name is required."); return; }
    if (!form.countryOfOrigin.trim()) { setError("Country of origin is required."); return; }

    const totalValue = goods.reduce((s, g) => s + Number(g.value), 0);

    const data: COOData = {
      certNo: form.certNo.trim(), type: form.type,
      exporterName: form.exporterName.trim(), exporterAddress: form.exporterAddress.trim(),
      importerName: form.importerName.trim(), importerAddress: form.importerAddress.trim(),
      countryOfOrigin: form.countryOfOrigin.trim(), countryOfDest: form.countryOfDest.trim(),
      shipmentRef: form.shipmentRef.trim(), invoiceNo: form.invoiceNo.trim(),
      blAwbNo: form.blAwbNo.trim(), vessel: form.vessel.trim(),
      portOfLoading: form.portOfLoading.trim(), portOfDischarge: form.portOfDischarge.trim(),
      issuingAuthority: form.issuingAuthority.trim(), issuingCountry: form.issuingCountry.trim(),
      issueDate: form.issueDate, expiryDate: form.expiryDate, remarks: form.remarks.trim(),
      goods: goods.filter(g => g.description.trim()),
    };

    setSaving(true);
    try {
      if (editId) {
        await update(editId, { title: data.certNo, status: form.status, data: data as unknown as Record<string, unknown>, amount: totalValue, date: form.issueDate });
      } else {
        await create({ title: data.certNo, status: form.status, data: data as unknown as Record<string, unknown>, amount: totalValue, date: form.issueDate });
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
            <span>🏛</span> Certificate of Origin
          </h1>
          <p style={{ margin: "5px 0 0", color: "var(--text-muted)", fontSize: 13 }}>
            Issue and manage certificates of origin for export shipments.
          </p>
        </div>
        <button onClick={openNew} style={s.btn("#f59e0b")}>+ New Certificate</button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total",     value: kpis.total,     color: "#a78bfa" },
          { label: "Issued",    value: kpis.issued,    color: "#4ade80" },
          { label: "Submitted", value: kpis.submitted, color: "#fbbf24" },
          { label: "Draft",     value: kpis.draft,     color: "#9ca3af" },
          { label: "Expired",   value: kpis.expired,   color: "#6b7280" },
        ].map(k => (
          <div key={k.label} style={s.kpi as React.CSSProperties}>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color, marginBottom: 4 }}>{k.value}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, flex: 1, flexWrap: "wrap" }}>
          {["ALL", ...Object.keys(STATUS_META)].map(t => (
            <button key={t} onClick={() => setFilterTab(t)} style={s.tabBtn(filterTab === t)}>
              {t === "ALL" ? "All" : STATUS_META[t as COOStatus].label}
            </button>
          ))}
        </div>
        <input placeholder="Search cert no, exporter, country…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...s.inp, width: 280, padding: "8px 13px" }} />
      </div>

      {/* Table */}
      <div style={{ ...s.panel, overflow: "auto" }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>Loading certificates…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 56, textAlign: "center", color: "var(--text-muted)" }}>
            No certificates found. Click &quot;+ New Certificate&quot; to add one.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1200 }}>
            <thead>
              <tr>
                {["Cert No","Type","Exporter","Importer","Origin Country","Dest Country","Invoice No","Issuing Authority","Issue Date","Expiry Date","Status","Actions"].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const sm = STATUS_META[c.status];
                return (
                  <tr key={c.id}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.03)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ ...s.td, fontWeight: 700, color: "#f59e0b" }}>{c.certNo}</td>
                    <td style={s.td}><span style={{ background: "rgba(245,158,11,.1)", color: "#fbbf24", border: "1px solid rgba(245,158,11,.25)", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{c.type}</span></td>
                    <td style={s.td}>
                      <div style={{ fontWeight: 600 }}>{c.exporterName || "—"}</div>
                      {c.exporterAddress && <div style={{ fontSize: 11, color: "var(--text-muted)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>{c.exporterAddress}</div>}
                    </td>
                    <td style={s.td}>{c.importerName || "—"}</td>
                    <td style={s.td}><span style={{ fontWeight: 600 }}>{c.countryOfOrigin || "—"}</span></td>
                    <td style={s.td}>{c.countryOfDest || "—"}</td>
                    <td style={s.td}>{c.invoiceNo || "—"}</td>
                    <td style={s.td}>
                      <div>{c.issuingAuthority || "—"}</div>
                      {c.issuingCountry && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{c.issuingCountry}</div>}
                    </td>
                    <td style={s.td}>{c.issueDate || "—"}</td>
                    <td style={s.td}>{c.expiryDate || "—"}</td>
                    <td style={s.td}><span style={s.badge(sm.color, sm.bg, sm.border)}>{sm.label}</span></td>
                    <td style={s.td}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => openEdit(c)} style={s.btn("rgba(245,158,11,.2)", true)}>Edit</button>
                        <select value={c.status} onChange={e => changeStatus(c.id, e.target.value)}
                          style={{ ...s.inp, width: "auto", padding: "5px 8px", fontSize: 11 }}>
                          {Object.keys(STATUS_META).map(st => <option key={st} value={st}>{STATUS_META[st as COOStatus].label}</option>)}
                        </select>
                        <button onClick={() => setConfirmDel(c.id)} style={s.btn("rgba(239,68,68,.18)", true)}>Del</button>
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
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Delete Certificate?</div>
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
          <div style={{ ...s.panel, width: "100%", maxWidth: 820, padding: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{editId ? "Edit Certificate of Origin" : "New Certificate of Origin"}</h2>
              <button onClick={closeModal} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 22 }}>×</button>
            </div>

            {/* Cert No + Type + Status */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div><label style={s.label}>Certificate No *</label>
                <input value={form.certNo} onChange={e => sf("certNo", e.target.value)} style={s.inp} placeholder="e.g. COO-2024-0001" /></div>
              <div><label style={s.label}>Certificate Type</label>
                <select value={form.type} onChange={e => sf("type", e.target.value as COOType)} style={s.inp}>
                  {COO_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select></div>
              <div><label style={s.label}>Status</label>
                <select value={form.status} onChange={e => sf("status", e.target.value as COOStatus)} style={s.inp}>
                  {Object.keys(STATUS_META).map(st => <option key={st} value={st}>{STATUS_META[st as COOStatus].label}</option>)}
                </select></div>
            </div>

            {/* Exporter */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div><label style={s.label}>Exporter Name *</label>
                <input value={form.exporterName} onChange={e => sf("exporterName", e.target.value)} style={s.inp} placeholder="Company / exporter name" /></div>
              <div><label style={s.label}>Exporter Address</label>
                <input value={form.exporterAddress} onChange={e => sf("exporterAddress", e.target.value)} style={s.inp} placeholder="Full address" /></div>
            </div>

            {/* Importer */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div><label style={s.label}>Importer / Consignee Name</label>
                <input value={form.importerName} onChange={e => sf("importerName", e.target.value)} style={s.inp} placeholder="Importer name" /></div>
              <div><label style={s.label}>Importer Address</label>
                <input value={form.importerAddress} onChange={e => sf("importerAddress", e.target.value)} style={s.inp} placeholder="Full address" /></div>
            </div>

            {/* Countries */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div><label style={s.label}>Country of Origin *</label>
                <input value={form.countryOfOrigin} onChange={e => sf("countryOfOrigin", e.target.value)} style={s.inp} placeholder="e.g. Pakistan" /></div>
              <div><label style={s.label}>Country of Destination</label>
                <input value={form.countryOfDest} onChange={e => sf("countryOfDest", e.target.value)} style={s.inp} placeholder="e.g. UAE" /></div>
            </div>

            {/* References */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div><label style={s.label}>Invoice No</label>
                <input value={form.invoiceNo} onChange={e => sf("invoiceNo", e.target.value)} style={s.inp} placeholder="Commercial invoice no" /></div>
              <div><label style={s.label}>Shipment Ref</label>
                <input value={form.shipmentRef} onChange={e => sf("shipmentRef", e.target.value)} style={s.inp} placeholder="Linked shipment" /></div>
              <div><label style={s.label}>BL / AWB No</label>
                <input value={form.blAwbNo} onChange={e => sf("blAwbNo", e.target.value)} style={s.inp} placeholder="e.g. BL-2024-001" /></div>
            </div>

            {/* Vessel + Ports */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div><label style={s.label}>Vessel / Flight</label>
                <input value={form.vessel} onChange={e => sf("vessel", e.target.value)} style={s.inp} placeholder="Vessel name or flight no" /></div>
              <div><label style={s.label}>Port of Loading</label>
                <input value={form.portOfLoading} onChange={e => sf("portOfLoading", e.target.value)} style={s.inp} placeholder="e.g. Karachi" /></div>
              <div><label style={s.label}>Port of Discharge</label>
                <input value={form.portOfDischarge} onChange={e => sf("portOfDischarge", e.target.value)} style={s.inp} placeholder="e.g. Dubai" /></div>
            </div>

            {/* Issuing Authority + Dates */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div><label style={s.label}>Issuing Authority</label>
                <input value={form.issuingAuthority} onChange={e => sf("issuingAuthority", e.target.value)} style={s.inp} placeholder="e.g. TDAP, FPCCI" /></div>
              <div><label style={s.label}>Issuing Country</label>
                <input value={form.issuingCountry} onChange={e => sf("issuingCountry", e.target.value)} style={s.inp} placeholder="e.g. Pakistan" /></div>
              <div><label style={s.label}>Issue Date</label>
                <DateInput value={form.issueDate || ""} onChange={v => sf("issueDate", v)} style={s.inp} /></div>
              <div><label style={s.label}>Expiry Date</label>
                <DateInput value={form.expiryDate || ""} onChange={v => sf("expiryDate", v)} style={s.inp} /></div>
            </div>

            {/* Goods Lines */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label style={{ ...s.label, margin: 0 }}>Goods Description</label>
                <button onClick={() => setGoods(p => [...p, { ...BLANK_GOODS }])} style={s.btn("#f59e0b", true)}>+ Add Row</button>
              </div>
              <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,.04)" }}>
                      {["Description","HS Code","Qty","Unit","Net Wt (kg)","Gross Wt (kg)","Value (USD)",""].map(h => (
                        <th key={h} style={{ ...s.th, fontSize: 10 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {goods.map((g, i) => (
                      <tr key={i}>
                        <td style={{ padding: "6px 8px" }}><input value={g.description} onChange={e => updateGoods(i, "description", e.target.value)} style={{ ...s.inp, padding: "6px 8px", fontSize: 12 }} placeholder="Goods description" /></td>
                        <td style={{ padding: "6px 8px", width: 100 }}><input value={g.hsCode} onChange={e => updateGoods(i, "hsCode", e.target.value)} style={{ ...s.inp, padding: "6px 8px", fontSize: 12 }} placeholder="HS Code" /></td>
                        <td style={{ padding: "6px 8px", width: 72 }}><input type="number" min="0" value={g.qty} onChange={e => updateGoods(i, "qty", parseFloat(e.target.value) || 0)} style={{ ...s.inp, padding: "6px 8px", fontSize: 12 }} /></td>
                        <td style={{ padding: "6px 8px", width: 72 }}><input value={g.unit} onChange={e => updateGoods(i, "unit", e.target.value)} style={{ ...s.inp, padding: "6px 8px", fontSize: 12 }} placeholder="PCS" /></td>
                        <td style={{ padding: "6px 8px", width: 100 }}><input type="number" min="0" step="0.01" value={g.netWeight} onChange={e => updateGoods(i, "netWeight", parseFloat(e.target.value) || 0)} style={{ ...s.inp, padding: "6px 8px", fontSize: 12 }} /></td>
                        <td style={{ padding: "6px 8px", width: 100 }}><input type="number" min="0" step="0.01" value={g.grossWeight} onChange={e => updateGoods(i, "grossWeight", parseFloat(e.target.value) || 0)} style={{ ...s.inp, padding: "6px 8px", fontSize: 12 }} /></td>
                        <td style={{ padding: "6px 8px", width: 110 }}><input type="number" min="0" step="0.01" value={g.value} onChange={e => updateGoods(i, "value", parseFloat(e.target.value) || 0)} style={{ ...s.inp, padding: "6px 8px", fontSize: 12 }} /></td>
                        <td style={{ padding: "6px 8px", width: 36 }}>
                          {goods.length > 1 && <button onClick={() => setGoods(p => p.filter((_, j) => j !== i))} style={{ background: "rgba(239,68,68,.2)", border: "none", borderRadius: 6, padding: "5px 8px", color: "#ef4444", cursor: "pointer", fontSize: 12 }}>×</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Remarks */}
            <div style={{ marginBottom: 22 }}>
              <label style={s.label}>Remarks</label>
              <textarea value={form.remarks} onChange={e => sf("remarks", e.target.value)} rows={2} style={{ ...s.inp, resize: "vertical" }} placeholder="Any additional remarks or declarations…" />
            </div>

            {error && (
              <div style={{ marginBottom: 14, padding: "10px 14px", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", borderRadius: 8, fontSize: 13, color: "#fca5a5" }}>{error}</div>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={save} disabled={saving} style={{ ...s.btn("#f59e0b"), flex: 1, opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : editId ? "Update Certificate" : "Create Certificate"}
              </button>
              <button onClick={closeModal} style={{ ...s.btn("rgba(255,255,255,.07)"), flex: 0.4 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
