"use client";
import { useState, useMemo } from "react";
import { useBusinessRecords, BusinessRecord } from "@/lib/useBusinessRecords";
import DateInput from "@/app/dashboard/reports/_components/DateInput";

// ─── Types ────────────────────────────────────────────────────────────────────

type ContainerType   = "20ft" | "40ft" | "40ft HC" | "20ft Reefer" | "40ft Reefer" | "20ft OT" | "40ft OT" | "Flat Rack";
type ContainerStatus = "BOOKING" | "LOADED" | "IN_TRANSIT" | "AT_PORT" | "CUSTOMS" | "RELEASED" | "RETURNED" | "DAMAGED";

interface TrackingEntry { note: string; timestamp: string; status: ContainerStatus; }

interface ContainerData {
  containerNo:   string;
  sealNo:        string;
  shipmentRef:   string;
  blNo:          string;
  type:          ContainerType;
  lineOperator:  string;
  originPort:    string;
  destinationPort: string;
  etd:           string;
  eta:           string;
  grossWeight:   number;
  netWeight:     number;
  cbm:           number;
  tare:          number;
  cargoDesc:     string;
  hsCode:        string;
  temperature:   string;
  notes:         string;
  tracking:      TrackingEntry[];
}

interface ContainerRecord extends ContainerData {
  id:        string;
  status:    ContainerStatus;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CONTAINER_TYPES: ContainerType[] = ["20ft","40ft","40ft HC","20ft Reefer","40ft Reefer","20ft OT","40ft OT","Flat Rack"];

const STATUS_META: Record<ContainerStatus, { label: string; color: string; bg: string; border: string }> = {
  BOOKING:    { label: "Booking",    color: "#a78bfa", bg: "rgba(167,139,250,.12)", border: "rgba(167,139,250,.35)" },
  LOADED:     { label: "Loaded",     color: "#38bdf8", bg: "rgba(56,189,248,.12)",  border: "rgba(56,189,248,.35)"  },
  IN_TRANSIT: { label: "In Transit", color: "#60a5fa", bg: "rgba(96,165,250,.12)",  border: "rgba(96,165,250,.35)"  },
  AT_PORT:    { label: "At Port",    color: "#fbbf24", bg: "rgba(251,191,36,.12)",   border: "rgba(251,191,36,.35)"  },
  CUSTOMS:    { label: "Customs",    color: "#fb923c", bg: "rgba(251,146,60,.12)",   border: "rgba(251,146,60,.35)"  },
  RELEASED:   { label: "Released",   color: "#4ade80", bg: "rgba(74,222,128,.12)",   border: "rgba(74,222,128,.35)"  },
  RETURNED:   { label: "Returned",   color: "#94a3b8", bg: "rgba(148,163,184,.12)",  border: "rgba(148,163,184,.35)" },
  DAMAGED:    { label: "Damaged",    color: "#f87171", bg: "rgba(248,113,113,.12)",  border: "rgba(248,113,113,.35)" },
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
  tabBtn: (active: boolean) => ({ background: active ? "#14b8a6" : "rgba(255,255,255,.06)", border: `1px solid ${active ? "#14b8a6" : "var(--border)"}`, borderRadius: 8, padding: "7px 14px", color: active ? "#fff" : "var(--text-muted)", fontFamily: FONT, cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" as const }),
};

const todayIso = () => new Date().toISOString().split("T")[0];
function genContNo() { return `CONT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`; }

const BLANK_FORM = {
  containerNo: "", sealNo: "", shipmentRef: "", blNo: "",
  type: "40ft" as ContainerType, lineOperator: "", originPort: "", destinationPort: "",
  etd: "", eta: "", grossWeight: "", netWeight: "", cbm: "", tare: "2300",
  cargoDesc: "", hsCode: "", temperature: "", notes: "", status: "BOOKING" as ContainerStatus,
};

function mapRecord(r: BusinessRecord): ContainerRecord {
  const d = (r.data ?? {}) as Partial<ContainerData>;
  return {
    id: r.id, status: (r.status as ContainerStatus) ?? "BOOKING", createdAt: r.createdAt,
    containerNo: d.containerNo ?? r.title ?? "",
    sealNo: d.sealNo ?? "", shipmentRef: d.shipmentRef ?? "", blNo: d.blNo ?? "",
    type: (d.type as ContainerType) ?? "40ft", lineOperator: d.lineOperator ?? "",
    originPort: d.originPort ?? "", destinationPort: d.destinationPort ?? "",
    etd: d.etd ?? "", eta: d.eta ?? "",
    grossWeight: Number(d.grossWeight ?? 0), netWeight: Number(d.netWeight ?? 0),
    cbm: Number(d.cbm ?? 0), tare: Number(d.tare ?? 2300),
    cargoDesc: d.cargoDesc ?? "", hsCode: d.hsCode ?? "",
    temperature: d.temperature ?? "", notes: d.notes ?? "",
    tracking: Array.isArray(d.tracking) ? d.tracking : [],
  };
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ContainerManagementPage() {
  const { records, loading, create, update, remove } = useBusinessRecords("trade_container");
  const [filterTab, setFilterTab] = useState("ALL");
  const [search, setSearch]       = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [form, setForm]           = useState({ ...BLANK_FORM });
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [trackNote, setTrackNote] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const containers = useMemo(() => records.map(mapRecord), [records]);

  const kpis = useMemo(() => ({
    total:     containers.length,
    inTransit: containers.filter(c => c.status === "IN_TRANSIT").length,
    atPort:    containers.filter(c => c.status === "AT_PORT" || c.status === "CUSTOMS").length,
    released:  containers.filter(c => c.status === "RELEASED").length,
    totalCbm:  containers.reduce((s, c) => s + c.cbm, 0),
  }), [containers]);

  const TABS = ["ALL", ...Object.keys(STATUS_META)];

  const filtered = useMemo(() => {
    let list = containers;
    if (filterTab !== "ALL") list = list.filter(c => c.status === filterTab);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(c =>
        c.containerNo.toLowerCase().includes(q) ||
        c.sealNo.toLowerCase().includes(q) ||
        c.shipmentRef.toLowerCase().includes(q) ||
        c.blNo.toLowerCase().includes(q) ||
        c.lineOperator.toLowerCase().includes(q)
      );
    }
    return list;
  }, [containers, filterTab, search]);

  const sf = (k: keyof typeof BLANK_FORM, v: string) => setForm(p => ({ ...p, [k]: v }));

  const openNew = () => {
    setEditId(null);
    setForm({ ...BLANK_FORM, containerNo: genContNo() });
    setTrackNote("");
    setError("");
    setShowModal(true);
  };

  const openEdit = (c: ContainerRecord) => {
    setEditId(c.id);
    setForm({
      containerNo: c.containerNo, sealNo: c.sealNo, shipmentRef: c.shipmentRef, blNo: c.blNo,
      type: c.type, lineOperator: c.lineOperator, originPort: c.originPort,
      destinationPort: c.destinationPort, etd: c.etd, eta: c.eta,
      grossWeight: String(c.grossWeight), netWeight: String(c.netWeight),
      cbm: String(c.cbm), tare: String(c.tare),
      cargoDesc: c.cargoDesc, hsCode: c.hsCode,
      temperature: c.temperature, notes: c.notes, status: c.status,
    });
    setTrackNote("");
    setError("");
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setError(""); setEditId(null); };

  const save = async () => {
    if (!form.containerNo.trim()) { setError("Container number is required."); return; }
    if (!form.originPort.trim() || !form.destinationPort.trim()) { setError("Origin and destination ports are required."); return; }

    const existing = editId ? containers.find(c => c.id === editId) : null;
    const newTracking: TrackingEntry[] = existing?.tracking ? [...existing.tracking] : [];
    if (trackNote.trim()) {
      newTracking.push({ note: trackNote.trim(), timestamp: new Date().toISOString(), status: form.status });
    }

    const data: ContainerData = {
      containerNo: form.containerNo.trim(), sealNo: form.sealNo.trim(),
      shipmentRef: form.shipmentRef.trim(), blNo: form.blNo.trim(),
      type: form.type, lineOperator: form.lineOperator.trim(),
      originPort: form.originPort.trim(), destinationPort: form.destinationPort.trim(),
      etd: form.etd, eta: form.eta,
      grossWeight: parseFloat(form.grossWeight as string) || 0,
      netWeight:   parseFloat(form.netWeight as string) || 0,
      cbm:         parseFloat(form.cbm as string) || 0,
      tare:        parseFloat(form.tare as string) || 2300,
      cargoDesc: form.cargoDesc.trim(), hsCode: form.hsCode.trim(),
      temperature: form.temperature.trim(), notes: form.notes.trim(),
      tracking: newTracking,
    };

    setSaving(true);
    try {
      if (editId) {
        await update(editId, { title: data.containerNo, status: form.status, data: data as unknown as Record<string, unknown>, amount: data.cbm, date: form.etd || todayIso() });
      } else {
        await create({ title: data.containerNo, status: form.status, data: data as unknown as Record<string, unknown>, amount: data.cbm, date: form.etd || todayIso() });
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
            <span>📦</span> Container Management
          </h1>
          <p style={{ margin: "5px 0 0", color: "var(--text-muted)", fontSize: 13 }}>
            Track container numbers, seal numbers, cargo details, and movement status.
          </p>
        </div>
        <button onClick={openNew} style={s.btn("#14b8a6")}>+ New Container</button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Containers", value: kpis.total,     color: "#a78bfa" },
          { label: "In Transit",       value: kpis.inTransit, color: "#60a5fa" },
          { label: "At Port / Customs",value: kpis.atPort,    color: "#fbbf24" },
          { label: "Released",         value: kpis.released,  color: "#4ade80" },
          { label: "Total CBM",        value: kpis.totalCbm.toFixed(1), color: "#14b8a6" },
        ].map(k => (
          <div key={k.label} style={s.kpi as React.CSSProperties}>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color, marginBottom: 4 }}>{k.value}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setFilterTab(t)} style={s.tabBtn(filterTab === t)}>
              {t === "ALL" ? "All" : STATUS_META[t as ContainerStatus].label}
            </button>
          ))}
        </div>
        <input
          placeholder="Search container no, seal, shipment, carrier…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...s.inp, width: 300, padding: "8px 13px" }}
        />
      </div>

      {/* Table */}
      <div style={{ ...s.panel, overflow: "auto" }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>Loading containers…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 56, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
            No containers found. Click &quot;+ New Container&quot; to add one.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1200 }}>
            <thead>
              <tr>
                {["Container No","Seal No","Type","Carrier / Line","Route","Shipment / BL","Cargo","Weight (kg)","CBM","ETD","ETA","Status","Actions"].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const sm = STATUS_META[c.status];
                const isExpanded = expandedId === c.id;
                return (
                  <>
                    <tr key={c.id}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.03)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ ...s.td, fontWeight: 700, color: "#14b8a6" }}>
                        <button onClick={() => setExpandedId(isExpanded ? null : c.id)}
                          style={{ background: "none", border: "none", color: "#14b8a6", cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: FONT, padding: 0 }}>
                          {c.containerNo} {isExpanded ? "▲" : "▼"}
                        </button>
                      </td>
                      <td style={s.td}>{c.sealNo || "—"}</td>
                      <td style={s.td}><span style={{ background: "rgba(20,184,166,.12)", color: "#14b8a6", border: "1px solid rgba(20,184,166,.3)", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{c.type}</span></td>
                      <td style={s.td}>{c.lineOperator || "—"}</td>
                      <td style={s.td}>
                        <div style={{ fontSize: 12 }}>{c.originPort || "—"}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>→ {c.destinationPort || "—"}</div>
                      </td>
                      <td style={s.td}>
                        <div>{c.shipmentRef || "—"}</div>
                        {c.blNo && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{c.blNo}</div>}
                      </td>
                      <td style={{ ...s.td, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }}>
                        <div>{c.cargoDesc || "—"}</div>
                        {c.hsCode && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>HS: {c.hsCode}</div>}
                      </td>
                      <td style={{ ...s.td, textAlign: "right" }}>
                        <div>{c.grossWeight.toLocaleString()}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Net: {c.netWeight.toLocaleString()}</div>
                      </td>
                      <td style={{ ...s.td, textAlign: "right" }}>{c.cbm.toFixed(2)}</td>
                      <td style={s.td}>{c.etd || "—"}</td>
                      <td style={s.td}>{c.eta || "—"}</td>
                      <td style={s.td}><span style={s.badge(sm.color, sm.bg, sm.border)}>{sm.label}</span></td>
                      <td style={s.td}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => openEdit(c)} style={s.btn("rgba(20,184,166,.2)", true)}>Edit</button>
                          <select value={c.status} onChange={e => changeStatus(c.id, e.target.value)}
                            style={{ ...s.inp, width: "auto", padding: "5px 8px", fontSize: 11 }}>
                            {Object.keys(STATUS_META).map(st => <option key={st} value={st}>{STATUS_META[st as ContainerStatus].label}</option>)}
                          </select>
                          <button onClick={() => setConfirmDel(c.id)} style={s.btn("rgba(239,68,68,.18)", true)}>Del</button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && c.tracking.length > 0 && (
                      <tr key={`${c.id}-track`}>
                        <td colSpan={13} style={{ padding: "12px 20px", background: "rgba(20,184,166,.04)", borderBottom: "1px solid var(--border)" }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#14b8a6", marginBottom: 8 }}>Tracking History</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {[...c.tracking].reverse().map((t, i) => (
                              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                                <span style={s.badge(STATUS_META[t.status]?.color ?? "#9ca3af", STATUS_META[t.status]?.bg ?? "rgba(156,163,175,.12)", STATUS_META[t.status]?.border ?? "rgba(156,163,175,.35)")}>{STATUS_META[t.status]?.label ?? t.status}</span>
                                <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{new Date(t.timestamp).toLocaleString()}</span>
                                <span style={{ fontSize: 12 }}>{t.note}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
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
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Delete Container?</div>
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
          <div style={{ ...s.panel, width: "100%", maxWidth: 780, padding: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{editId ? "Edit Container" : "New Container"}</h2>
              <button onClick={closeModal} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 22 }}>×</button>
            </div>

            {/* Container No + Seal No + Type + Status */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div><label style={s.label}>Container No *</label>
                <input value={form.containerNo} onChange={e => sf("containerNo", e.target.value)} style={s.inp} placeholder="e.g. MSCU1234567" /></div>
              <div><label style={s.label}>Seal No</label>
                <input value={form.sealNo} onChange={e => sf("sealNo", e.target.value)} style={s.inp} placeholder="e.g. SL-9876543" /></div>
              <div><label style={s.label}>Container Type</label>
                <select value={form.type} onChange={e => sf("type", e.target.value)} style={s.inp}>
                  {CONTAINER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select></div>
              <div><label style={s.label}>Status</label>
                <select value={form.status} onChange={e => sf("status", e.target.value)} style={s.inp}>
                  {Object.keys(STATUS_META).map(st => <option key={st} value={st}>{STATUS_META[st as ContainerStatus].label}</option>)}
                </select></div>
            </div>

            {/* Shipment Ref + BL + Line Operator */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div><label style={s.label}>Shipment Ref</label>
                <input value={form.shipmentRef} onChange={e => sf("shipmentRef", e.target.value)} style={s.inp} placeholder="e.g. SHIP-2024-001" /></div>
              <div><label style={s.label}>BL / AWB No</label>
                <input value={form.blNo} onChange={e => sf("blNo", e.target.value)} style={s.inp} placeholder="e.g. BL-2024-00123" /></div>
              <div><label style={s.label}>Shipping Line / Carrier</label>
                <input value={form.lineOperator} onChange={e => sf("lineOperator", e.target.value)} style={s.inp} placeholder="e.g. MSC, Maersk, Hapag-Lloyd" /></div>
            </div>

            {/* Ports + Dates */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div><label style={s.label}>Origin Port *</label>
                <input value={form.originPort} onChange={e => sf("originPort", e.target.value)} style={s.inp} placeholder="e.g. Karachi" /></div>
              <div><label style={s.label}>Destination Port *</label>
                <input value={form.destinationPort} onChange={e => sf("destinationPort", e.target.value)} style={s.inp} placeholder="e.g. Dubai" /></div>
              <div><label style={s.label}>ETD (Departure)</label>
                <DateInput value={form.etd || ""} onChange={v => sf("etd", v)} style={s.inp} /></div>
              <div><label style={s.label}>ETA (Arrival)</label>
                <DateInput value={form.eta || ""} onChange={v => sf("eta", v)} style={s.inp} /></div>
            </div>

            {/* Weight + CBM + Tare */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div><label style={s.label}>Gross Weight (kg)</label>
                <input type="number" min="0" value={form.grossWeight} onChange={e => sf("grossWeight", e.target.value)} style={s.inp} placeholder="0" /></div>
              <div><label style={s.label}>Net Weight (kg)</label>
                <input type="number" min="0" value={form.netWeight} onChange={e => sf("netWeight", e.target.value)} style={s.inp} placeholder="0" /></div>
              <div><label style={s.label}>Volume (CBM)</label>
                <input type="number" min="0" step="0.01" value={form.cbm} onChange={e => sf("cbm", e.target.value)} style={s.inp} placeholder="0.00" /></div>
              <div><label style={s.label}>Tare Weight (kg)</label>
                <input type="number" min="0" value={form.tare} onChange={e => sf("tare", e.target.value)} style={s.inp} placeholder="2300" /></div>
            </div>

            {/* Cargo + HS Code + Temperature */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div><label style={s.label}>Cargo Description</label>
                <input value={form.cargoDesc} onChange={e => sf("cargoDesc", e.target.value)} style={s.inp} placeholder="e.g. Electronic components, textiles" /></div>
              <div><label style={s.label}>HS Code</label>
                <input value={form.hsCode} onChange={e => sf("hsCode", e.target.value)} style={s.inp} placeholder="e.g. 8471.30" /></div>
              <div><label style={s.label}>Temperature (Reefer only)</label>
                <input value={form.temperature} onChange={e => sf("temperature", e.target.value)} style={s.inp} placeholder="e.g. -18°C" /></div>
            </div>

            {/* Tracking note */}
            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>Add Tracking Note (optional)</label>
              <input value={trackNote} onChange={e => setTrackNote(e.target.value)} style={s.inp} placeholder="e.g. Container loaded at Karachi port, vessel MAERSK ALTAIR" />
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 22 }}>
              <label style={s.label}>Internal Notes</label>
              <textarea value={form.notes} onChange={e => sf("notes", e.target.value)} rows={2} style={{ ...s.inp, resize: "vertical" }} placeholder="Any additional notes…" />
            </div>

            {error && (
              <div style={{ marginBottom: 14, padding: "10px 14px", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", borderRadius: 8, fontSize: 13, color: "#fca5a5" }}>{error}</div>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={save} disabled={saving} style={{ ...s.btn("#14b8a6"), flex: 1, opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : editId ? "Update Container" : "Create Container"}
              </button>
              <button onClick={closeModal} style={{ ...s.btn("rgba(255,255,255,.07)"), flex: 0.4 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
