"use client";
import { useState, useMemo } from "react";
import { useBusinessRecords, BusinessRecord } from "@/lib/useBusinessRecords";
import DateInput from "@/app/dashboard/reports/_components/DateInput";

// ─── Types ────────────────────────────────────────────────────────────────────

type FreightMode   = "Sea" | "Air" | "Land" | "Rail" | "Multimodal";
type FreightStatus = "QUOTED" | "BOOKED" | "IN_TRANSIT" | "ARRIVED" | "DELIVERED" | "CANCELLED";

interface FreightData {
  mode:          FreightMode;
  carrier:       string;
  shipmentRef:   string;
  blAwbNo:       string;
  originPort:    string;
  destinationPort: string;
  originCountry: string;
  destCountry:   string;
  etd:           string;
  eta:           string;
  incoterm:      string;
  currency:      string;
  freightRate:   number;
  surcharges:    number;
  insurance:     number;
  otherCharges:  number;
  totalCost:     number;
  cbm:           number;
  weight:        number;
  containers:    number;
  containerType: string;
  cargoDesc:     string;
  transitDays:   number;
  notes:         string;
}

interface FreightRecord extends FreightData {
  id:        string;
  status:    FreightStatus;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MODES: FreightMode[] = ["Sea", "Air", "Land", "Rail", "Multimodal"];
const INCOTERMS = ["FOB","CIF","EXW","CFR","DAP","DDP","FCA","CPT","CIP","FAS"];
const CURRENCIES = ["USD","EUR","GBP","AED","PKR","CNY","SGD","CAD","AUD"];

const STATUS_META: Record<FreightStatus, { label: string; color: string; bg: string; border: string }> = {
  QUOTED:     { label: "Quoted",     color: "#a78bfa", bg: "rgba(167,139,250,.12)", border: "rgba(167,139,250,.35)" },
  BOOKED:     { label: "Booked",     color: "#38bdf8", bg: "rgba(56,189,248,.12)",  border: "rgba(56,189,248,.35)"  },
  IN_TRANSIT: { label: "In Transit", color: "#60a5fa", bg: "rgba(96,165,250,.12)",  border: "rgba(96,165,250,.35)"  },
  ARRIVED:    { label: "Arrived",    color: "#fbbf24", bg: "rgba(251,191,36,.12)",   border: "rgba(251,191,36,.35)"  },
  DELIVERED:  { label: "Delivered",  color: "#4ade80", bg: "rgba(74,222,128,.12)",   border: "rgba(74,222,128,.35)"  },
  CANCELLED:  { label: "Cancelled",  color: "#f87171", bg: "rgba(248,113,113,.12)",  border: "rgba(248,113,113,.35)" },
};

const MODE_ICON: Record<FreightMode, string> = {
  Sea: "🚢", Air: "✈️", Land: "🚛", Rail: "🚂", Multimodal: "🔄",
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
  tabBtn: (active: boolean) => ({ background: active ? "#6366f1" : "rgba(255,255,255,.06)", border: `1px solid ${active ? "#6366f1" : "var(--border)"}`, borderRadius: 8, padding: "7px 14px", color: active ? "#fff" : "var(--text-muted)", fontFamily: FONT, cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" as const }),
};

const todayIso = () => new Date().toISOString().split("T")[0];
function genRef() { return `FRT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`; }

const BLANK: Record<string, string | number> = {
  mode: "Sea", carrier: "", shipmentRef: "", blAwbNo: "",
  originPort: "", destinationPort: "", originCountry: "", destCountry: "",
  etd: "", eta: "", incoterm: "FOB", currency: "USD",
  freightRate: "", surcharges: "", insurance: "", otherCharges: "",
  cbm: "", weight: "", containers: "", containerType: "40ft",
  cargoDesc: "", transitDays: "", notes: "", status: "QUOTED",
};

function mapRecord(r: BusinessRecord): FreightRecord {
  const d = (r.data ?? {}) as Partial<FreightData>;
  return {
    id: r.id, status: (r.status as FreightStatus) ?? "QUOTED", createdAt: r.createdAt,
    mode: (d.mode as FreightMode) ?? "Sea", carrier: d.carrier ?? "", shipmentRef: d.shipmentRef ?? "",
    blAwbNo: d.blAwbNo ?? "", originPort: d.originPort ?? "", destinationPort: d.destinationPort ?? "",
    originCountry: d.originCountry ?? "", destCountry: d.destCountry ?? "",
    etd: d.etd ?? "", eta: d.eta ?? "", incoterm: d.incoterm ?? "FOB", currency: d.currency ?? "USD",
    freightRate:  Number(d.freightRate ?? 0), surcharges: Number(d.surcharges ?? 0),
    insurance:    Number(d.insurance ?? 0),   otherCharges: Number(d.otherCharges ?? 0),
    totalCost:    Number(d.totalCost ?? r.amount ?? 0),
    cbm:          Number(d.cbm ?? 0),         weight: Number(d.weight ?? 0),
    containers:   Number(d.containers ?? 0),  containerType: d.containerType ?? "40ft",
    cargoDesc: d.cargoDesc ?? "", transitDays: Number(d.transitDays ?? 0), notes: d.notes ?? "",
  };
}

function fmtAmt(n: number, cur = "USD") {
  return `${cur} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FreightManagementPage() {
  const { records, loading, create, update, remove } = useBusinessRecords("trade_freight");
  const [filterTab, setFilterTab] = useState("ALL");
  const [modeFilter, setModeFilter] = useState("ALL");
  const [search, setSearch]       = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [form, setForm]           = useState({ ...BLANK });
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const freights = useMemo(() => records.map(mapRecord), [records]);

  const kpis = useMemo(() => ({
    total:       freights.length,
    inTransit:   freights.filter(f => f.status === "IN_TRANSIT").length,
    totalCost:   freights.reduce((s, f) => s + f.totalCost, 0),
    sea:         freights.filter(f => f.mode === "Sea").length,
    air:         freights.filter(f => f.mode === "Air").length,
    land:        freights.filter(f => f.mode === "Land").length,
  }), [freights]);

  const filtered = useMemo(() => {
    let list = freights;
    if (filterTab !== "ALL") list = list.filter(f => f.status === filterTab);
    if (modeFilter !== "ALL") list = list.filter(f => f.mode === modeFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(f =>
        f.carrier.toLowerCase().includes(q) ||
        f.shipmentRef.toLowerCase().includes(q) ||
        f.blAwbNo.toLowerCase().includes(q) ||
        f.originPort.toLowerCase().includes(q) ||
        f.destinationPort.toLowerCase().includes(q)
      );
    }
    return list;
  }, [freights, filterTab, modeFilter, search]);

  const sf = (k: string, v: string | number) => setForm(p => ({ ...p, [k]: v }));

  const calcTotal = (f: typeof BLANK) =>
    (parseFloat(String(f.freightRate)) || 0) + (parseFloat(String(f.surcharges)) || 0) +
    (parseFloat(String(f.insurance)) || 0) + (parseFloat(String(f.otherCharges)) || 0);

  const openNew = () => {
    setEditId(null);
    setForm({ ...BLANK });
    setError("");
    setShowModal(true);
  };

  const openEdit = (f: FreightRecord) => {
    setEditId(f.id);
    setForm({
      mode: f.mode, carrier: f.carrier, shipmentRef: f.shipmentRef, blAwbNo: f.blAwbNo,
      originPort: f.originPort, destinationPort: f.destinationPort,
      originCountry: f.originCountry, destCountry: f.destCountry,
      etd: f.etd, eta: f.eta, incoterm: f.incoterm, currency: f.currency,
      freightRate: f.freightRate, surcharges: f.surcharges,
      insurance: f.insurance, otherCharges: f.otherCharges,
      cbm: f.cbm, weight: f.weight, containers: f.containers, containerType: f.containerType,
      cargoDesc: f.cargoDesc, transitDays: f.transitDays, notes: f.notes, status: f.status,
    });
    setError("");
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setError(""); setEditId(null); };

  const save = async () => {
    if (!form.carrier || !String(form.carrier).trim()) { setError("Carrier is required."); return; }
    if (!form.originPort || !String(form.originPort).trim()) { setError("Origin port is required."); return; }
    if (!form.destinationPort || !String(form.destinationPort).trim()) { setError("Destination port is required."); return; }

    const total = calcTotal(form);
    const ref = form.shipmentRef ? String(form.shipmentRef) : genRef();

    const data: FreightData = {
      mode: form.mode as FreightMode, carrier: String(form.carrier).trim(),
      shipmentRef: ref, blAwbNo: String(form.blAwbNo || "").trim(),
      originPort: String(form.originPort).trim(), destinationPort: String(form.destinationPort).trim(),
      originCountry: String(form.originCountry || "").trim(), destCountry: String(form.destCountry || "").trim(),
      etd: String(form.etd || ""), eta: String(form.eta || ""),
      incoterm: String(form.incoterm || "FOB"), currency: String(form.currency || "USD"),
      freightRate:  parseFloat(String(form.freightRate)) || 0,
      surcharges:   parseFloat(String(form.surcharges)) || 0,
      insurance:    parseFloat(String(form.insurance)) || 0,
      otherCharges: parseFloat(String(form.otherCharges)) || 0,
      totalCost: total,
      cbm:        parseFloat(String(form.cbm)) || 0,
      weight:     parseFloat(String(form.weight)) || 0,
      containers: parseInt(String(form.containers)) || 0,
      containerType: String(form.containerType || "40ft"),
      cargoDesc:  String(form.cargoDesc || "").trim(),
      transitDays: parseInt(String(form.transitDays)) || 0,
      notes: String(form.notes || "").trim(),
    };

    setSaving(true);
    try {
      if (editId) {
        await update(editId, { title: `${MODE_ICON[data.mode]} ${data.carrier} — ${data.originPort} → ${data.destinationPort}`, status: String(form.status), data: data as unknown as Record<string, unknown>, amount: total, date: data.etd || todayIso() });
      } else {
        await create({ title: `${MODE_ICON[data.mode]} ${data.carrier} — ${data.originPort} → ${data.destinationPort}`, status: String(form.status), data: data as unknown as Record<string, unknown>, amount: total, date: data.etd || todayIso() });
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
            <span>🚢</span> Freight Management
          </h1>
          <p style={{ margin: "5px 0 0", color: "var(--text-muted)", fontSize: 13 }}>
            Manage sea, air, and land freight bookings, costs, and tracking.
          </p>
        </div>
        <button onClick={openNew} style={s.btn("#6366f1")}>+ New Freight</button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Shipments", value: kpis.total,     color: "#a78bfa" },
          { label: "In Transit",      value: kpis.inTransit, color: "#60a5fa" },
          { label: "🚢 Sea",          value: kpis.sea,        color: "#38bdf8" },
          { label: "✈️ Air",          value: kpis.air,        color: "#fbbf24" },
          { label: "🚛 Land",         value: kpis.land,       color: "#4ade80" },
          { label: "Total Cost (USD)", value: `$${Math.round(kpis.totalCost).toLocaleString()}`, color: "#6366f1" },
        ].map(k => (
          <div key={k.label} style={s.kpi as React.CSSProperties}>
            <div style={{ fontSize: 20, fontWeight: 800, color: k.color, marginBottom: 4 }}>{k.value}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["ALL", ...Object.keys(STATUS_META)].map(t => (
            <button key={t} onClick={() => setFilterTab(t)} style={s.tabBtn(filterTab === t)}>
              {t === "ALL" ? "All Status" : STATUS_META[t as FreightStatus].label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["ALL", ...MODES].map(m => (
            <button key={m} onClick={() => setModeFilter(m)}
              style={{ ...s.tabBtn(modeFilter === m), background: modeFilter === m ? "rgba(99,102,241,.25)" : "rgba(255,255,255,.04)", border: `1px solid ${modeFilter === m ? "#6366f1" : "var(--border)"}` }}>
              {m === "ALL" ? "All Modes" : `${MODE_ICON[m as FreightMode]} ${m}`}
            </button>
          ))}
        </div>
        <input placeholder="Search carrier, shipment, route…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...s.inp, width: 260, padding: "8px 13px" }} />
      </div>

      {/* Table */}
      <div style={{ ...s.panel, overflow: "auto" }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>Loading freight records…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 56, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
            No freight records found. Click &quot;+ New Freight&quot; to add one.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1300 }}>
            <thead>
              <tr>
                {["Mode","Carrier / Line","Route","Shipment / BL","Incoterm","Currency","Freight Rate","Surcharges","Insurance","Total Cost","ETD","ETA","Transit","Status","Actions"].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => {
                const sm = STATUS_META[f.status];
                return (
                  <tr key={f.id}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.03)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={s.td}>
                      <span style={{ fontSize: 18 }}>{MODE_ICON[f.mode]}</span>{" "}
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{f.mode}</span>
                    </td>
                    <td style={{ ...s.td, fontWeight: 700, color: "#6366f1" }}>{f.carrier || "—"}</td>
                    <td style={s.td}>
                      <div>{f.originPort} → {f.destinationPort}</div>
                      {(f.originCountry || f.destCountry) && (
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{f.originCountry} → {f.destCountry}</div>
                      )}
                    </td>
                    <td style={s.td}>
                      <div>{f.shipmentRef || "—"}</div>
                      {f.blAwbNo && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{f.blAwbNo}</div>}
                    </td>
                    <td style={s.td}><span style={{ background: "rgba(99,102,241,.12)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,.3)", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{f.incoterm}</span></td>
                    <td style={s.td}>{f.currency}</td>
                    <td style={{ ...s.td, textAlign: "right" }}>{f.freightRate.toLocaleString()}</td>
                    <td style={{ ...s.td, textAlign: "right", color: "var(--text-muted)" }}>{f.surcharges.toLocaleString()}</td>
                    <td style={{ ...s.td, textAlign: "right", color: "var(--text-muted)" }}>{f.insurance.toLocaleString()}</td>
                    <td style={{ ...s.td, textAlign: "right", fontWeight: 700, color: "#4ade80" }}>{fmtAmt(f.totalCost, f.currency)}</td>
                    <td style={s.td}>{f.etd || "—"}</td>
                    <td style={s.td}>{f.eta || "—"}</td>
                    <td style={{ ...s.td, textAlign: "right" }}>{f.transitDays ? `${f.transitDays}d` : "—"}</td>
                    <td style={s.td}><span style={s.badge(sm.color, sm.bg, sm.border)}>{sm.label}</span></td>
                    <td style={s.td}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => openEdit(f)} style={s.btn("rgba(99,102,241,.2)", true)}>Edit</button>
                        <select value={f.status} onChange={e => changeStatus(f.id, e.target.value)}
                          style={{ ...s.inp, width: "auto", padding: "5px 8px", fontSize: 11 }}>
                          {Object.keys(STATUS_META).map(st => <option key={st} value={st}>{STATUS_META[st as FreightStatus].label}</option>)}
                        </select>
                        <button onClick={() => setConfirmDel(f.id)} style={s.btn("rgba(239,68,68,.18)", true)}>Del</button>
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
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Delete Freight Record?</div>
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
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{editId ? "Edit Freight" : "New Freight Booking"}</h2>
              <button onClick={closeModal} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 22 }}>×</button>
            </div>

            {/* Mode + Carrier + Status */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", gap: 14, marginBottom: 14 }}>
              <div><label style={s.label}>Mode *</label>
                <select value={String(form.mode)} onChange={e => sf("mode", e.target.value)} style={s.inp}>
                  {MODES.map(m => <option key={m} value={m}>{MODE_ICON[m]} {m}</option>)}
                </select></div>
              <div><label style={s.label}>Carrier / Shipping Line *</label>
                <input value={String(form.carrier)} onChange={e => sf("carrier", e.target.value)} style={s.inp} placeholder="e.g. MSC, DHL, FedEx, NLC" /></div>
              <div><label style={s.label}>Status</label>
                <select value={String(form.status)} onChange={e => sf("status", e.target.value)} style={s.inp}>
                  {Object.keys(STATUS_META).map(st => <option key={st} value={st}>{STATUS_META[st as FreightStatus].label}</option>)}
                </select></div>
            </div>

            {/* Shipment Ref + BL/AWB */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div><label style={s.label}>Shipment Ref</label>
                <input value={String(form.shipmentRef)} onChange={e => sf("shipmentRef", e.target.value)} style={s.inp} placeholder="e.g. SHIP-2024-001 (auto if blank)" /></div>
              <div><label style={s.label}>BL No / AWB No</label>
                <input value={String(form.blAwbNo)} onChange={e => sf("blAwbNo", e.target.value)} style={s.inp} placeholder="e.g. BL-2024-00123" /></div>
            </div>

            {/* Ports + Countries */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div><label style={s.label}>Origin Port *</label>
                <input value={String(form.originPort)} onChange={e => sf("originPort", e.target.value)} style={s.inp} placeholder="e.g. Karachi" /></div>
              <div><label style={s.label}>Destination Port *</label>
                <input value={String(form.destinationPort)} onChange={e => sf("destinationPort", e.target.value)} style={s.inp} placeholder="e.g. Dubai" /></div>
              <div><label style={s.label}>Origin Country</label>
                <input value={String(form.originCountry)} onChange={e => sf("originCountry", e.target.value)} style={s.inp} placeholder="Pakistan" /></div>
              <div><label style={s.label}>Destination Country</label>
                <input value={String(form.destCountry)} onChange={e => sf("destCountry", e.target.value)} style={s.inp} placeholder="UAE" /></div>
            </div>

            {/* Dates + Transit */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div><label style={s.label}>ETD (Departure)</label>
                <DateInput value={String(form.etd || "")} onChange={v => sf("etd", v)} style={s.inp} /></div>
              <div><label style={s.label}>ETA (Arrival)</label>
                <DateInput value={String(form.eta || "")} onChange={v => sf("eta", v)} style={s.inp} /></div>
              <div><label style={s.label}>Incoterm</label>
                <select value={String(form.incoterm)} onChange={e => sf("incoterm", e.target.value)} style={s.inp}>
                  {INCOTERMS.map(i => <option key={i} value={i}>{i}</option>)}
                </select></div>
              <div><label style={s.label}>Transit Days</label>
                <input type="number" min="0" value={String(form.transitDays)} onChange={e => sf("transitDays", e.target.value)} style={s.inp} placeholder="e.g. 21" /></div>
            </div>

            {/* Cargo */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div><label style={s.label}>Cargo Description</label>
                <input value={String(form.cargoDesc)} onChange={e => sf("cargoDesc", e.target.value)} style={s.inp} placeholder="e.g. Textile goods, machinery parts" /></div>
              <div><label style={s.label}>Containers</label>
                <input type="number" min="0" value={String(form.containers)} onChange={e => sf("containers", e.target.value)} style={s.inp} placeholder="0" /></div>
              <div><label style={s.label}>Container Type</label>
                <input value={String(form.containerType)} onChange={e => sf("containerType", e.target.value)} style={s.inp} placeholder="40ft" /></div>
              <div><label style={s.label}>Weight (kg)</label>
                <input type="number" min="0" value={String(form.weight)} onChange={e => sf("weight", e.target.value)} style={s.inp} placeholder="0" /></div>
            </div>

            {/* Costs */}
            <div style={{ background: "rgba(99,102,241,.04)", border: "1px solid rgba(99,102,241,.15)", borderRadius: 12, padding: "16px 18px", marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#a5b4fc", marginBottom: 12 }}>Cost Breakdown</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 14 }}>
                <div><label style={s.label}>Currency</label>
                  <select value={String(form.currency)} onChange={e => sf("currency", e.target.value)} style={s.inp}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select></div>
                <div><label style={s.label}>Freight Rate</label>
                  <input type="number" min="0" step="0.01" value={String(form.freightRate)} onChange={e => sf("freightRate", e.target.value)} style={s.inp} placeholder="0.00" /></div>
                <div><label style={s.label}>Surcharges (BAF/CAF etc)</label>
                  <input type="number" min="0" step="0.01" value={String(form.surcharges)} onChange={e => sf("surcharges", e.target.value)} style={s.inp} placeholder="0.00" /></div>
                <div><label style={s.label}>Insurance</label>
                  <input type="number" min="0" step="0.01" value={String(form.insurance)} onChange={e => sf("insurance", e.target.value)} style={s.inp} placeholder="0.00" /></div>
                <div><label style={s.label}>Other Charges</label>
                  <input type="number" min="0" step="0.01" value={String(form.otherCharges)} onChange={e => sf("otherCharges", e.target.value)} style={s.inp} placeholder="0.00" /></div>
              </div>
              <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Total Cost:</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: "#4ade80" }}>
                  {String(form.currency || "USD")} {calcTotal(form).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 22 }}>
              <label style={s.label}>Notes</label>
              <textarea value={String(form.notes)} onChange={e => sf("notes", e.target.value)} rows={2} style={{ ...s.inp, resize: "vertical" }} placeholder="Any additional notes…" />
            </div>

            {error && (
              <div style={{ marginBottom: 14, padding: "10px 14px", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", borderRadius: 8, fontSize: 13, color: "#fca5a5" }}>{error}</div>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={save} disabled={saving} style={{ ...s.btn("#6366f1"), flex: 1, opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : editId ? "Update Freight" : "Create Freight Booking"}
              </button>
              <button onClick={closeModal} style={{ ...s.btn("rgba(255,255,255,.07)"), flex: 0.4 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
