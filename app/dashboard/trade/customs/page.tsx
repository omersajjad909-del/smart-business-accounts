"use client";

import { useMemo, useState, useCallback } from "react";
import { useBusinessRecords, BusinessRecord } from "@/lib/useBusinessRecords";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HSLine {
  hsCode: string;
  description: string;
  qty: number;
  unit: string;
  unitValue: number;
  totalValue: number;
}

interface DeclarationData {
  declarationNo: string;
  type: "Import" | "Export";
  shipperName: string;
  consigneeName: string;
  portOfEntryExit: string;
  countryOriginDest: string;
  mode: "Sea" | "Air" | "Road";
  blAwbNo: string;
  hsLines: HSLine[];
  cifFobValue: number;
  dutyRate: number;
  additionalTaxRate: number;
  dutyAmount: number;
  vatTaxAmount: number;
  otherCharges: number;
  totalPayable: number;
  customsAgent: string;
  agentContact: string;
  filingDate: string;
  expectedClearanceDate: string;
  clearanceDate: string;
  notes: string;
}

interface DeclarationRecord {
  id: string;
  declarationNo: string;
  type: "Import" | "Export";
  shipperName: string;
  consigneeName: string;
  portOfEntryExit: string;
  countryOriginDest: string;
  mode: "Sea" | "Air" | "Road";
  blAwbNo: string;
  hsLines: HSLine[];
  cifFobValue: number;
  dutyRate: number;
  additionalTaxRate: number;
  dutyAmount: number;
  vatTaxAmount: number;
  otherCharges: number;
  totalPayable: number;
  customsAgent: string;
  agentContact: string;
  filingDate: string;
  expectedClearanceDate: string;
  clearanceDate: string;
  notes: string;
  status: string;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUSES = ["FILED", "UNDER_EXAMINATION", "DUTY_PAID", "CLEARED", "HELD"] as const;

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  FILED:             { label: "Filed",             color: "#9ca3af", bg: "#9ca3af18", border: "#9ca3af44" },
  UNDER_EXAMINATION: { label: "Under Examination", color: "#fbbf24", bg: "#fbbf2418", border: "#fbbf2444" },
  DUTY_PAID:         { label: "Duty Paid",          color: "#3b82f6", bg: "#3b82f618", border: "#3b82f644" },
  CLEARED:           { label: "Cleared",            color: "#22c55e", bg: "#22c55e18", border: "#22c55e44" },
  HELD:              { label: "Held",               color: "#ef4444", bg: "#ef444418", border: "#ef444444" },
};

const TYPE_META = {
  Import: { color: "#3b82f6", bg: "#3b82f618", border: "#3b82f644" },
  Export: { color: "#22c55e", bg: "#22c55e18", border: "#22c55e44" },
};

const FILTER_TABS = [
  { key: "ALL", label: "All" },
  { key: "Import", label: "Import" },
  { key: "Export", label: "Export" },
  ...STATUSES.map(s => ({ key: s, label: STATUS_META[s].label })),
];

const EMPTY_HS_LINE: HSLine = { hsCode: "", description: "", qty: 1, unit: "PCS", unitValue: 0, totalValue: 0 };

const todayIso = () => new Date().toISOString().split("T")[0];

function genDeclarationNo() {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `GD-${n}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapRecord(r: BusinessRecord): DeclarationRecord {
  const d = (r.data ?? {}) as Partial<DeclarationData>;
  return {
    id: r.id,
    declarationNo: d.declarationNo ?? r.title ?? "—",
    type: (d.type as "Import" | "Export") ?? "Import",
    shipperName: d.shipperName ?? "",
    consigneeName: d.consigneeName ?? "",
    portOfEntryExit: d.portOfEntryExit ?? "",
    countryOriginDest: d.countryOriginDest ?? "",
    mode: (d.mode as "Sea" | "Air" | "Road") ?? "Sea",
    blAwbNo: d.blAwbNo ?? "",
    hsLines: Array.isArray(d.hsLines) ? d.hsLines : [],
    cifFobValue: Number(d.cifFobValue ?? 0),
    dutyRate: Number(d.dutyRate ?? 0),
    additionalTaxRate: Number(d.additionalTaxRate ?? 0),
    dutyAmount: Number(d.dutyAmount ?? 0),
    vatTaxAmount: Number(d.vatTaxAmount ?? 0),
    otherCharges: Number(d.otherCharges ?? 0),
    totalPayable: Number(d.totalPayable ?? r.amount ?? 0),
    customsAgent: d.customsAgent ?? "",
    agentContact: d.agentContact ?? "",
    filingDate: d.filingDate ?? r.date ?? "",
    expectedClearanceDate: d.expectedClearanceDate ?? "",
    clearanceDate: d.clearanceDate ?? "",
    notes: d.notes ?? "",
    status: r.status ?? "FILED",
    createdAt: r.createdAt,
  };
}

function fmt(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const FONT = "'Outfit','Inter',sans-serif";

const s = {
  page:   { fontFamily: FONT, color: "var(--text-primary)", padding: "28px 24px", minHeight: "100vh", background: "var(--app-bg)" },
  panel:  { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14 },
  inp:    { background: "rgba(255,255,255,.05)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 13px", color: "var(--text-primary)", fontFamily: FONT, fontSize: 13, width: "100%", boxSizing: "border-box" as const, outline: "none" },
  label:  { fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5, fontWeight: 500 } as React.CSSProperties,
  btn:    (bg: string, small?: boolean) => ({ background: bg, border: "none", borderRadius: 8, padding: small ? "7px 14px" : "10px 22px", color: "#fff", fontFamily: FONT, cursor: "pointer", fontSize: small ? 12 : 13, fontWeight: 600, lineHeight: 1 } as React.CSSProperties),
  badge:  (color: string, bg: string, border: string) => ({ background: bg, color, border: `1px solid ${border}`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" as const, display: "inline-block" }),
  th:     { padding: "11px 13px", textAlign: "left" as const, fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em", whiteSpace: "nowrap" as const, borderBottom: "1px solid var(--border)" },
  td:     { padding: "12px 13px", fontSize: 12, color: "var(--text-primary)", borderBottom: "1px solid var(--border)", verticalAlign: "middle" as const, whiteSpace: "nowrap" as const },
  kpi:    { ...{} as object, background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px", minWidth: 0 },
  tabBtn: (active: boolean) => ({ background: active ? "#3b82f6" : "rgba(255,255,255,.06)", border: `1px solid ${active ? "#3b82f6" : "var(--border)"}`, borderRadius: 8, padding: "7px 14px", color: active ? "#fff" : "var(--text-muted)", fontFamily: FONT, cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" as const }),
};

// ─── Initial Form State ───────────────────────────────────────────────────────

const INITIAL_FORM = {
  type: "Import" as "Import" | "Export",
  declarationNo: genDeclarationNo(),
  shipperName: "",
  consigneeName: "",
  portOfEntryExit: "",
  countryOriginDest: "",
  mode: "Sea" as "Sea" | "Air" | "Road",
  blAwbNo: "",
  cifFobValue: "",
  dutyRate: "",
  additionalTaxRate: "",
  dutyAmount: "",
  vatTaxAmount: "",
  otherCharges: "",
  customsAgent: "",
  agentContact: "",
  filingDate: todayIso(),
  expectedClearanceDate: "",
  clearanceDate: "",
  notes: "",
  status: "FILED" as string,
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CustomsClearancePage() {
  const { records, loading, create, update, remove } = useBusinessRecords("customs_clearance");

  const [filterTab, setFilterTab]   = useState("ALL");
  const [search, setSearch]         = useState("");
  const [showModal, setShowModal]   = useState(false);
  const [editId, setEditId]         = useState<string | null>(null);
  const [form, setForm]             = useState({ ...INITIAL_FORM });
  const [hsLines, setHsLines]       = useState<HSLine[]>([{ ...EMPTY_HS_LINE }]);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const declarations = useMemo(() => records.map(mapRecord), [records]);

  // ── KPIs ──────────────────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const total        = declarations.length;
    const pending      = declarations.filter(d => d.status === "FILED").length;
    const underExam    = declarations.filter(d => d.status === "UNDER_EXAMINATION").length;
    const cleared      = declarations.filter(d => d.status === "CLEARED").length;
    const dutiesPaid   = declarations.reduce((s, d) => s + d.totalPayable, 0);
    return { total, pending, underExam, cleared, dutiesPaid };
  }, [declarations]);

  // ── Filtered Records ──────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = declarations;
    if (filterTab !== "ALL") {
      if (filterTab === "Import" || filterTab === "Export") {
        list = list.filter(d => d.type === filterTab);
      } else {
        list = list.filter(d => d.status === filterTab);
      }
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(d =>
        d.declarationNo.toLowerCase().includes(q) ||
        d.shipperName.toLowerCase().includes(q) ||
        d.consigneeName.toLowerCase().includes(q) ||
        d.hsLines.some(h => h.hsCode.toLowerCase().includes(q))
      );
    }
    return list;
  }, [declarations, filterTab, search]);

  // ── Computed duty calcs ───────────────────────────────────────────────────

  const recalc = useCallback((f: typeof INITIAL_FORM) => {
    const cif    = parseFloat(f.cifFobValue || "0") || 0;
    const rate   = parseFloat(f.dutyRate || "0") || 0;
    const vatR   = parseFloat(f.additionalTaxRate || "0") || 0;
    const duty   = parseFloat(f.dutyAmount || "") || parseFloat(((cif * rate) / 100).toFixed(2));
    const vat    = parseFloat(f.vatTaxAmount || "") || parseFloat(((cif * vatR) / 100).toFixed(2));
    return { duty, vat };
  }, []);

  const setField = useCallback((key: keyof typeof INITIAL_FORM, val: string) => {
    setForm(prev => {
      const next = { ...prev, [key]: val };
      if (["cifFobValue", "dutyRate", "additionalTaxRate"].includes(key)) {
        const { duty, vat } = recalc(next);
        next.dutyAmount  = String(duty);
        next.vatTaxAmount = String(vat);
      }
      return next;
    });
  }, [recalc]);

  // ── HS Lines ──────────────────────────────────────────────────────────────

  const updateHsLine = (idx: number, key: keyof HSLine, val: string | number) => {
    setHsLines(prev => prev.map((row, i) => {
      if (i !== idx) return row;
      const updated = { ...row, [key]: val };
      if (key === "qty" || key === "unitValue") {
        updated.totalValue = (Number(updated.qty) || 0) * (Number(updated.unitValue) || 0);
      }
      return updated;
    }));
  };

  const addHsLine    = () => setHsLines(prev => [...prev, { ...EMPTY_HS_LINE }]);
  const removeHsLine = (idx: number) => setHsLines(prev => prev.filter((_, i) => i !== idx));

  // ── Open Modal ────────────────────────────────────────────────────────────

  const openNew = () => {
    setEditId(null);
    setForm({ ...INITIAL_FORM, declarationNo: genDeclarationNo(), filingDate: todayIso() });
    setHsLines([{ ...EMPTY_HS_LINE }]);
    setError("");
    setShowModal(true);
  };

  const openEdit = (d: DeclarationRecord) => {
    setEditId(d.id);
    setForm({
      type: d.type, declarationNo: d.declarationNo, shipperName: d.shipperName,
      consigneeName: d.consigneeName, portOfEntryExit: d.portOfEntryExit,
      countryOriginDest: d.countryOriginDest, mode: d.mode, blAwbNo: d.blAwbNo,
      cifFobValue: String(d.cifFobValue), dutyRate: String(d.dutyRate),
      additionalTaxRate: String(d.additionalTaxRate), dutyAmount: String(d.dutyAmount),
      vatTaxAmount: String(d.vatTaxAmount), otherCharges: String(d.otherCharges),
      customsAgent: d.customsAgent, agentContact: d.agentContact,
      filingDate: d.filingDate, expectedClearanceDate: d.expectedClearanceDate,
      clearanceDate: d.clearanceDate, notes: d.notes, status: d.status,
    });
    setHsLines(d.hsLines.length > 0 ? d.hsLines : [{ ...EMPTY_HS_LINE }]);
    setError("");
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setError(""); setEditId(null); };

  // ── Save ──────────────────────────────────────────────────────────────────

  const save = async () => {
    if (!form.declarationNo.trim()) { setError("Declaration number is required."); return; }
    if (!form.shipperName.trim() && !form.consigneeName.trim()) {
      setError("Shipper or Consignee name is required."); return;
    }
    if (!form.filingDate) { setError("Filing date is required."); return; }

    const cif   = parseFloat(form.cifFobValue || "0") || 0;
    const duty  = parseFloat(form.dutyAmount || "0") || 0;
    const vat   = parseFloat(form.vatTaxAmount || "0") || 0;
    const other = parseFloat(form.otherCharges || "0") || 0;
    const total = duty + vat + other;

    const data: DeclarationData = {
      declarationNo: form.declarationNo.trim(),
      type: form.type,
      shipperName: form.shipperName.trim(),
      consigneeName: form.consigneeName.trim(),
      portOfEntryExit: form.portOfEntryExit.trim(),
      countryOriginDest: form.countryOriginDest.trim(),
      mode: form.mode,
      blAwbNo: form.blAwbNo.trim(),
      hsLines: hsLines.filter(h => h.hsCode.trim()),
      cifFobValue: cif,
      dutyRate: parseFloat(form.dutyRate || "0") || 0,
      additionalTaxRate: parseFloat(form.additionalTaxRate || "0") || 0,
      dutyAmount: duty,
      vatTaxAmount: vat,
      otherCharges: other,
      totalPayable: total,
      customsAgent: form.customsAgent.trim(),
      agentContact: form.agentContact.trim(),
      filingDate: form.filingDate,
      expectedClearanceDate: form.expectedClearanceDate,
      clearanceDate: form.clearanceDate,
      notes: form.notes.trim(),
    };

    setSaving(true);
    try {
      if (editId) {
        await update(editId, { title: data.declarationNo, status: form.status, data: data as unknown as Record<string, unknown>, amount: total, date: form.filingDate });
      } else {
        await create({ title: data.declarationNo, status: form.status, data: data as unknown as Record<string, unknown>, amount: total, date: form.filingDate });
      }
      closeModal();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  // ── Status Quick-Update ───────────────────────────────────────────────────

  const changeStatus = async (id: string, status: string) => {
    await update(id, { status });
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const doDelete = async (id: string) => {
    await remove(id);
    setConfirmDelete(null);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 26 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>🛃</span> Customs Clearance
          </h1>
          <p style={{ margin: "5px 0 0", color: "var(--text-muted)", fontSize: 13 }}>
            Manage import/export declarations, duties, and clearance status.
          </p>
        </div>
        <button onClick={openNew} style={s.btn("#3b82f6")}>+ New Declaration</button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Declarations", value: kpis.total, color: "#a78bfa" },
          { label: "Pending (Filed)",    value: kpis.pending,   color: "#9ca3af" },
          { label: "Under Examination",  value: kpis.underExam, color: "#fbbf24" },
          { label: "Cleared",            value: kpis.cleared,   color: "#22c55e" },
          { label: "Total Duties Paid",  value: fmt(kpis.dutiesPaid), color: "#3b82f6" },
        ].map(k => (
          <div key={k.label} style={s.kpi as React.CSSProperties}>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color, marginBottom: 4 }}>{k.value}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
          {FILTER_TABS.map(t => (
            <button key={t.key} onClick={() => setFilterTab(t.key)} style={s.tabBtn(filterTab === t.key)}>{t.label}</button>
          ))}
        </div>
        <input
          placeholder="Search declaration no, shipper, consignee, HS code…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...s.inp, width: 300, padding: "8px 13px" }}
        />
      </div>

      {/* Table */}
      <div style={{ ...s.panel, overflow: "auto" }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>Loading declarations…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 56, textAlign: "center", color: "rgba(255,255,255,.2)", fontSize: 14 }}>
            No declarations found. Click &quot;+ New Declaration&quot; to add one.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1400 }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,.03)" }}>
                {["Declaration No","Type","Shipper / Consignee","HS Code(s)","Goods","CIF/FOB Value","Duty Rate","Duty Amount","VAT/Tax","Total Payable","Entry Date","Clearance Date","Status","Customs Agent","Actions"].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => {
                const sm = STATUS_META[d.status] ?? STATUS_META.FILED;
                const tm = TYPE_META[d.type] ?? TYPE_META.Import;
                const hsCodes = d.hsLines.map(h => h.hsCode).filter(Boolean).join(", ") || "—";
                const goods   = d.hsLines.map(h => h.description).filter(Boolean).join("; ") || "—";
                return (
                  <tr key={d.id} style={{ transition: "background .15s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.03)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ ...s.td, fontWeight: 700, color: "#60a5fa" }}>{d.declarationNo}</td>
                    <td style={s.td}><span style={s.badge(tm.color, tm.bg, tm.border)}>{d.type}</span></td>
                    <td style={{ ...s.td, maxWidth: 160 }}>
                      <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>{d.shipperName || "—"}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis" }}>{d.consigneeName || "—"}</div>
                    </td>
                    <td style={{ ...s.td, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>{hsCodes}</td>
                    <td style={{ ...s.td, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", color: "var(--text-muted)" }}>{goods}</td>
                    <td style={{ ...s.td, textAlign: "right" }}>{fmt(d.cifFobValue)}</td>
                    <td style={{ ...s.td, textAlign: "right" }}>{d.dutyRate}%</td>
                    <td style={{ ...s.td, textAlign: "right", color: "#fbbf24" }}>{fmt(d.dutyAmount)}</td>
                    <td style={{ ...s.td, textAlign: "right", color: "#a78bfa" }}>{fmt(d.vatTaxAmount)}</td>
                    <td style={{ ...s.td, textAlign: "right", fontWeight: 700, color: "#22c55e" }}>{fmt(d.totalPayable)}</td>
                    <td style={s.td}>{d.filingDate || "—"}</td>
                    <td style={s.td}>{d.clearanceDate || d.expectedClearanceDate || "—"}</td>
                    <td style={s.td}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={s.badge(sm.color, sm.bg, sm.border)}>{sm.label}</span>
                      </div>
                    </td>
                    <td style={s.td}>
                      <div style={{ fontWeight: 500 }}>{d.customsAgent || "—"}</div>
                      {d.agentContact && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{d.agentContact}</div>}
                    </td>
                    <td style={s.td}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => openEdit(d)} style={s.btn("rgba(59,130,246,.2)", true)}>Edit</button>
                        {d.status !== "CLEARED" && (
                          <select
                            value={d.status}
                            onChange={e => changeStatus(d.id, e.target.value)}
                            style={{ ...s.inp, width: "auto", padding: "5px 8px", fontSize: 11 }}
                          >
                            {STATUSES.map(st => <option key={st} value={st}>{STATUS_META[st].label}</option>)}
                          </select>
                        )}
                        <button onClick={() => setConfirmDelete(d.id)} style={s.btn("rgba(239,68,68,.18)", true)}>Del</button>
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
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
          <div style={{ ...s.panel, padding: 28, maxWidth: 380, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Delete Declaration?</div>
            <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 22 }}>This action cannot be undone.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => doDelete(confirmDelete)} style={{ ...s.btn("#ef4444"), flex: 1 }}>Delete</button>
              <button onClick={() => setConfirmDelete(null)} style={{ ...s.btn("rgba(255,255,255,.08)"), flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* New/Edit Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, overflowY: "auto", padding: "32px 16px" }}>
          <div style={{ ...s.panel, width: "100%", maxWidth: 780, padding: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                {editId ? "Edit Declaration" : "New Customs Declaration"}
              </h2>
              <button onClick={closeModal} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 22, lineHeight: 1 }}>×</button>
            </div>

            {/* Type + Declaration No + Status */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={s.label}>Type *</label>
                <select value={form.type} onChange={e => setField("type", e.target.value as "Import" | "Export")} style={s.inp}>
                  <option value="Import">Import</option>
                  <option value="Export">Export</option>
                </select>
              </div>
              <div>
                <label style={s.label}>Declaration No *</label>
                <input value={form.declarationNo} onChange={e => setField("declarationNo", e.target.value)} style={s.inp} placeholder="GD-XXXXXX" />
              </div>
              <div>
                <label style={s.label}>Status</label>
                <select value={form.status} onChange={e => setField("status", e.target.value)} style={s.inp}>
                  {STATUSES.map(st => <option key={st} value={st}>{STATUS_META[st].label}</option>)}
                </select>
              </div>
            </div>

            {/* Shipper / Consignee */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={s.label}>Shipper Name *</label>
                <input value={form.shipperName} onChange={e => setField("shipperName", e.target.value)} style={s.inp} placeholder="Shipper / Exporter" />
              </div>
              <div>
                <label style={s.label}>Consignee Name *</label>
                <input value={form.consigneeName} onChange={e => setField("consigneeName", e.target.value)} style={s.inp} placeholder="Consignee / Importer" />
              </div>
            </div>

            {/* Port + Country + Mode */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={s.label}>Port of {form.type === "Import" ? "Entry" : "Exit"}</label>
                <input value={form.portOfEntryExit} onChange={e => setField("portOfEntryExit", e.target.value)} style={s.inp} placeholder="e.g. Port Karachi" />
              </div>
              <div>
                <label style={s.label}>Country of {form.type === "Import" ? "Origin" : "Destination"}</label>
                <input value={form.countryOriginDest} onChange={e => setField("countryOriginDest", e.target.value)} style={s.inp} placeholder="Country" />
              </div>
              <div>
                <label style={s.label}>Mode of Transport</label>
                <select value={form.mode} onChange={e => setField("mode", e.target.value as "Sea" | "Air" | "Road")} style={s.inp}>
                  <option value="Sea">Sea</option>
                  <option value="Air">Air</option>
                  <option value="Road">Road</option>
                </select>
              </div>
            </div>

            {/* BL/AWB */}
            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>BL No / AWB No (link to shipment)</label>
              <input value={form.blAwbNo} onChange={e => setField("blAwbNo", e.target.value)} style={s.inp} placeholder="e.g. BL-2024-00123 or 176-12345678" />
            </div>

            {/* HS Code Lines */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label style={{ ...s.label, margin: 0 }}>HS Code Line Items</label>
                <button onClick={addHsLine} style={s.btn("#3b82f6", true)}>+ Add HS Code</button>
              </div>
              <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,.04)" }}>
                      {["HS Code","Description","Qty","Unit","Unit Value ($)","Total Value ($)",""].map(h => (
                        <th key={h} style={{ ...s.th, fontSize: 10 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {hsLines.map((line, i) => (
                      <tr key={i}>
                        <td style={{ padding: "6px 8px" }}>
                          <input value={line.hsCode} onChange={e => updateHsLine(i, "hsCode", e.target.value)} style={{ ...s.inp, padding: "6px 8px", fontSize: 12 }} placeholder="e.g. 8471.30" />
                        </td>
                        <td style={{ padding: "6px 8px" }}>
                          <input value={line.description} onChange={e => updateHsLine(i, "description", e.target.value)} style={{ ...s.inp, padding: "6px 8px", fontSize: 12 }} placeholder="Goods description" />
                        </td>
                        <td style={{ padding: "6px 8px", width: 72 }}>
                          <input type="number" min="0" value={line.qty} onChange={e => updateHsLine(i, "qty", parseFloat(e.target.value) || 0)} style={{ ...s.inp, padding: "6px 8px", fontSize: 12 }} />
                        </td>
                        <td style={{ padding: "6px 8px", width: 80 }}>
                          <input value={line.unit} onChange={e => updateHsLine(i, "unit", e.target.value)} style={{ ...s.inp, padding: "6px 8px", fontSize: 12 }} placeholder="PCS" />
                        </td>
                        <td style={{ padding: "6px 8px", width: 120 }}>
                          <input type="number" min="0" step="0.01" value={line.unitValue} onChange={e => updateHsLine(i, "unitValue", parseFloat(e.target.value) || 0)} style={{ ...s.inp, padding: "6px 8px", fontSize: 12 }} />
                        </td>
                        <td style={{ padding: "6px 8px", width: 120 }}>
                          <div style={{ padding: "6px 8px", fontSize: 12, color: "#22c55e", fontWeight: 600 }}>{fmt(line.totalValue)}</div>
                        </td>
                        <td style={{ padding: "6px 8px", width: 36 }}>
                          {hsLines.length > 1 && (
                            <button onClick={() => removeHsLine(i)} style={{ background: "rgba(239,68,68,.2)", border: "none", borderRadius: 6, padding: "5px 8px", color: "#ef4444", cursor: "pointer", fontSize: 12 }}>×</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Fields */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={s.label}>{form.type === "Import" ? "CIF Value" : "FOB Value"} ($) *</label>
                <input type="number" min="0" step="0.01" value={form.cifFobValue} onChange={e => setField("cifFobValue", e.target.value)} style={s.inp} placeholder="0.00" />
              </div>
              <div>
                <label style={s.label}>Duty Rate (%)</label>
                <input type="number" min="0" max="100" step="0.01" value={form.dutyRate} onChange={e => setField("dutyRate", e.target.value)} style={s.inp} placeholder="0.00" />
              </div>
              <div>
                <label style={s.label}>Additional Taxes (%)</label>
                <input type="number" min="0" max="100" step="0.01" value={form.additionalTaxRate} onChange={e => setField("additionalTaxRate", e.target.value)} style={s.inp} placeholder="0.00" />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={s.label}>Duty Amount ($) <span style={{ color: "#9ca3af", fontWeight: 400 }}>(auto-calc)</span></label>
                <input type="number" min="0" step="0.01" value={form.dutyAmount} onChange={e => setField("dutyAmount", e.target.value)} style={{ ...s.inp, borderColor: "#fbbf2466" }} placeholder="0.00" />
              </div>
              <div>
                <label style={s.label}>VAT / Tax Amount ($) <span style={{ color: "#9ca3af", fontWeight: 400 }}>(auto-calc)</span></label>
                <input type="number" min="0" step="0.01" value={form.vatTaxAmount} onChange={e => setField("vatTaxAmount", e.target.value)} style={{ ...s.inp, borderColor: "#a78bfa66" }} placeholder="0.00" />
              </div>
              <div>
                <label style={s.label}>Other Charges ($)</label>
                <input type="number" min="0" step="0.01" value={form.otherCharges} onChange={e => setField("otherCharges", e.target.value)} style={s.inp} placeholder="0.00" />
              </div>
            </div>

            {/* Total Payable summary */}
            <div style={{ background: "rgba(34,197,94,.07)", border: "1px solid rgba(34,197,94,.25)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Total Payable (Duty + VAT + Other)</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#22c55e" }}>
                {fmt(
                  (parseFloat(form.dutyAmount || "0") || 0) +
                  (parseFloat(form.vatTaxAmount || "0") || 0) +
                  (parseFloat(form.otherCharges || "0") || 0)
                )}
              </span>
            </div>

            {/* Agent */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={s.label}>Customs Agent / Broker</label>
                <input value={form.customsAgent} onChange={e => setField("customsAgent", e.target.value)} style={s.inp} placeholder="Agent name or company" />
              </div>
              <div>
                <label style={s.label}>Agent Contact</label>
                <input value={form.agentContact} onChange={e => setField("agentContact", e.target.value)} style={s.inp} placeholder="Phone or email" />
              </div>
            </div>

            {/* Dates */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={s.label}>Filing Date *</label>
                <input type="date" value={form.filingDate} onChange={e => setField("filingDate", e.target.value)} style={s.inp} />
              </div>
              <div>
                <label style={s.label}>Expected Clearance Date</label>
                <input type="date" value={form.expectedClearanceDate} onChange={e => setField("expectedClearanceDate", e.target.value)} style={s.inp} />
              </div>
              <div>
                <label style={s.label}>Actual Clearance Date</label>
                <input type="date" value={form.clearanceDate} onChange={e => setField("clearanceDate", e.target.value)} style={s.inp} />
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 22 }}>
              <label style={s.label}>Notes / Remarks</label>
              <textarea value={form.notes} onChange={e => setField("notes", e.target.value)} rows={3} style={{ ...s.inp, resize: "vertical" }} placeholder="Any additional notes or remarks…" />
            </div>

            {error && (
              <div style={{ marginBottom: 14, padding: "10px 14px", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", borderRadius: 8, fontSize: 13, color: "#fca5a5" }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={save} disabled={saving} style={{ ...s.btn("#3b82f6"), flex: 1, opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : editId ? "Update Declaration" : "Create Declaration"}
              </button>
              <button onClick={closeModal} style={{ ...s.btn("rgba(255,255,255,.07)"), flex: 0.4 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
