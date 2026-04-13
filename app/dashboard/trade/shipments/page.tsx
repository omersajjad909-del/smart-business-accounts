"use client";
import { useMemo, useState } from "react";
import { useBusinessRecords, BusinessRecord } from "@/lib/useBusinessRecords";

// ─── Types ────────────────────────────────────────────────────────────────────

type ShipmentType   = "Import" | "Export";
type ShipmentMode   = "Sea" | "Air" | "Road" | "Rail";
type Incoterm       = "FOB" | "CIF" | "EXW" | "CFR" | "DAP" | "DDP" | "FCA";
type ShipmentStatus = "BOOKING" | "IN_TRANSIT" | "AT_PORT" | "CUSTOMS" | "CLEARED" | "DELAYED";

interface TrackingEntry {
  note:      string;
  timestamp: string;
  status:    ShipmentStatus;
}

interface ShipmentData {
  type:             ShipmentType;
  ref:              string;
  counterparty:     string;
  originPort:       string;
  destinationPort:  string;
  incoterm:         Incoterm;
  mode:             ShipmentMode;
  blAwbNo:          string;
  eta:              string;
  etd:              string;
  cargoDescription: string;
  hsCode:           string;
  insurance:        number;
  freightCost:      number;
  notes:            string;
  trackingNotes:    TrackingEntry[];
}

interface Shipment extends ShipmentData {
  id:     string;
  amount: number;
  status: ShipmentStatus;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_STATUSES: ShipmentStatus[] = [
  "BOOKING", "IN_TRANSIT", "AT_PORT", "CUSTOMS", "CLEARED", "DELAYED",
];

const STATUS_META: Record<ShipmentStatus, { label: string; color: string; bg: string; border: string }> = {
  BOOKING:    { label: "Booking",    color: "#a78bfa", bg: "rgba(167,139,250,.12)", border: "rgba(167,139,250,.35)" },
  IN_TRANSIT: { label: "In Transit", color: "#60a5fa", bg: "rgba(96,165,250,.12)",  border: "rgba(96,165,250,.35)"  },
  AT_PORT:    { label: "At Port",    color: "#fbbf24", bg: "rgba(251,191,36,.12)",   border: "rgba(251,191,36,.35)"  },
  CUSTOMS:    { label: "Customs",    color: "#fb923c", bg: "rgba(251,146,60,.12)",   border: "rgba(251,146,60,.35)"  },
  CLEARED:    { label: "Cleared",    color: "#4ade80", bg: "rgba(74,222,128,.12)",   border: "rgba(74,222,128,.35)"  },
  DELAYED:    { label: "Delayed",    color: "#f87171", bg: "rgba(248,113,113,.12)",  border: "rgba(248,113,113,.35)" },
};

const TYPE_META: Record<ShipmentType, { color: string; bg: string; border: string }> = {
  Import: { color: "#60a5fa", bg: "rgba(96,165,250,.12)",  border: "rgba(96,165,250,.35)"  },
  Export: { color: "#4ade80", bg: "rgba(74,222,128,.12)",  border: "rgba(74,222,128,.35)"  },
};

const INCOTERMS: Incoterm[]       = ["FOB", "CIF", "EXW", "CFR", "DAP", "DDP", "FCA"];
const MODES:     ShipmentMode[]   = ["Sea", "Air", "Road", "Rail"];

const FILTER_TABS = [
  { key: "ALL",        label: "All"        },
  { key: "Import",     label: "Import"     },
  { key: "Export",     label: "Export"     },
  { key: "IN_TRANSIT", label: "In Transit" },
  { key: "CUSTOMS",    label: "Customs"    },
  { key: "CLEARED",    label: "Cleared"    },
  { key: "DELAYED",    label: "Delayed"    },
];

const EMPTY_FORM = {
  type:             "Import" as ShipmentType,
  ref:              "",
  counterparty:     "",
  originPort:       "",
  destinationPort:  "",
  incoterm:         "FOB"  as Incoterm,
  mode:             "Sea"  as ShipmentMode,
  blAwbNo:          "",
  eta:              "",
  etd:              "",
  cargoDescription: "",
  hsCode:           "",
  insurance:        "",
  freightCost:      "",
  totalValue:       "",
  notes:            "",
};

// ─── Style helpers ────────────────────────────────────────────────────────────

const font  = "'Outfit','Inter',sans-serif";
const panel = { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 12 };

const inp: React.CSSProperties = {
  background:  "rgba(255,255,255,.06)",
  border:      "1px solid var(--border)",
  borderRadius: 8,
  padding:     "9px 13px",
  color:       "var(--text-primary)",
  fontFamily:  font,
  width:       "100%",
  boxSizing:   "border-box",
  fontSize:    14,
  outline:     "none",
};

const labelSt: React.CSSProperties = {
  fontSize:     12,
  color:        "var(--text-muted)",
  display:      "block",
  marginBottom: 5,
};

function btn(bg: string, extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    background: bg,
    border:     "none",
    borderRadius: 8,
    padding:    "9px 20px",
    color:      "#fff",
    fontFamily: font,
    cursor:     "pointer",
    fontSize:   14,
    fontWeight: 600,
    ...extra,
  };
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

function mapRecord(r: BusinessRecord): Shipment {
  const d = (r.data || {}) as Partial<ShipmentData>;
  return {
    id:               r.id,
    ref:              d.ref              ?? r.title ?? "—",
    type:             d.type             ?? "Import",
    counterparty:     d.counterparty     ?? "—",
    blAwbNo:          d.blAwbNo          ?? "—",
    originPort:       d.originPort       ?? "—",
    destinationPort:  d.destinationPort  ?? "—",
    incoterm:         d.incoterm         ?? "FOB",
    mode:             d.mode             ?? "Sea",
    eta:              d.eta              ?? "",
    etd:              d.etd              ?? "",
    status:           (r.status as ShipmentStatus) ?? "BOOKING",
    amount:           r.amount           ?? 0,
    cargoDescription: d.cargoDescription ?? "",
    hsCode:           d.hsCode           ?? "",
    insurance:        d.insurance        ?? 0,
    freightCost:      d.freightCost      ?? 0,
    notes:            d.notes            ?? "",
    trackingNotes:    d.trackingNotes    ?? [],
  };
}

function genRef(count: number) {
  return `SHP-${String(count + 1).padStart(6, "0")}`;
}

function fmtDate(iso: string) {
  if (!iso) return "—";
  return fmtDate(iso);
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ShipmentStatus }) {
  const m = STATUS_META[status];
  return (
    <span style={{
      background:   m.bg,
      color:        m.color,
      border:       `1px solid ${m.border}`,
      borderRadius: 20,
      padding:      "3px 10px",
      fontSize:     11,
      fontWeight:   700,
      whiteSpace:   "nowrap",
    }}>
      {m.label}
    </span>
  );
}

// ─── View Modal ───────────────────────────────────────────────────────────────

function ViewModal({ ship, onClose }: { ship: Shipment; onClose: () => void }) {
  const tm = TYPE_META[ship.type];
  const rows: [string, string][] = [
    ["Type",             ship.type],
    ["Counterparty",     ship.counterparty],
    ["BL / AWB No",      ship.blAwbNo],
    ["Mode",             ship.mode],
    ["Origin Port",      ship.originPort],
    ["Destination Port", ship.destinationPort],
    ["Incoterm",         ship.incoterm],
    ["ETD",              fmtDate(ship.etd)],
    ["ETA",              fmtDate(ship.eta)],
    ["Total Value",      `$${ship.amount.toLocaleString()}`],
    ["Freight Cost",     `$${ship.freightCost.toLocaleString()}`],
    ["Insurance",        `$${ship.insurance.toLocaleString()}`],
    ["HS Code",          ship.hsCode || "—"],
    ["Cargo",            ship.cargoDescription || "—"],
    ["Notes",            ship.notes || "—"],
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100 }}>
      <div style={{ ...panel, padding: 28, width: 620, maxHeight: "90vh", overflowY: "auto", fontFamily: font }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: "0 0 6px", fontSize: 20, color: "var(--text-primary)" }}>{ship.ref}</h2>
            <span style={{ background: tm.bg, color: tm.color, border: `1px solid ${tm.border}`, borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>
              {ship.type}
            </span>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <StatusBadge status={ship.status} />
            <button onClick={onClose} style={btn("rgba(255,255,255,.08)", { padding: "6px 14px", fontSize: 13 })}>
              Close
            </button>
          </div>
        </div>

        {/* Detail grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px", marginBottom: 20 }}>
          {rows.map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2, textTransform: "uppercase", letterSpacing: ".04em" }}>{k}</div>
              <div style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 500 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Tracking history */}
        {ship.trackingNotes.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>
              Tracking History
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...ship.trackingNotes].reverse().map((tn, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,.04)", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <StatusBadge status={tn.status} />
                    <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
                      {new Date(tn.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ color: "var(--text-primary)" }}>{tn.note}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Edit Status Modal ────────────────────────────────────────────────────────

function EditStatusModal({
  ship,
  onSave,
  onClose,
}: {
  ship:    Shipment;
  onSave:  (id: string, status: ShipmentStatus, note: string) => Promise<void>;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<ShipmentStatus>(ship.status);
  const [note,   setNote]   = useState("");
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await onSave(ship.id, status, note.trim());
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100 }}>
      <div style={{ ...panel, padding: 28, width: 440, fontFamily: font }}>
        <h2 style={{ margin: "0 0 6px", fontSize: 18, color: "var(--text-primary)" }}>
          Update Status
        </h2>
        <p style={{ margin: "0 0 20px", color: "var(--text-muted)", fontSize: 13 }}>{ship.ref}</p>

        <div style={{ marginBottom: 14 }}>
          <label style={labelSt}>New Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as ShipmentStatus)} style={inp}>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_META[s].label}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelSt}>Tracking Note (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="e.g. Vessel departed Hamburg, ETA updated to 12 Apr…"
            style={{ ...inp, resize: "vertical" }}
          />
        </div>

        {error && <div style={{ fontSize: 12, color: "#f87171", marginBottom: 10 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ ...btn("#2563eb"), flex: 1, opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Saving…" : "Save Status"}
          </button>
          <button onClick={onClose} style={{ ...btn("rgba(255,255,255,.08)"), flex: 1 }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── New Shipment Modal ───────────────────────────────────────────────────────

function NewShipmentModal({
  totalCount,
  onCreate,
  onClose,
}: {
  totalCount: number;
  onCreate:   (form: typeof EMPTY_FORM) => Promise<void>;
  onClose:    () => void;
}) {
  const [form,   setForm]   = useState({ ...EMPTY_FORM, ref: genRef(totalCount) });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleCreate = async () => {
    if (!form.counterparty.trim())    { setError(`${form.type === "Import" ? "Supplier" : "Buyer"} name is required.`); return; }
    if (!form.originPort.trim())      { setError("Origin port is required."); return; }
    if (!form.destinationPort.trim()) { setError("Destination port is required."); return; }
    if (!form.eta)                    { setError("ETA is required."); return; }
    if (Number(form.totalValue) <= 0) { setError("Total value must be greater than zero."); return; }

    setSaving(true);
    setError("");
    try {
      await onCreate(form);
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, key: string, type = "text", placeholder = "") => (
    <div key={key}>
      <label style={labelSt}>{label}</label>
      <input
        type={type}
        value={(form as Record<string, string>)[key]}
        onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
        style={inp}
      />
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100 }}>
      <div style={{ ...panel, padding: 28, width: 660, maxHeight: "92vh", overflowY: "auto", fontFamily: font }}>
        <h2 style={{ margin: "0 0 20px", fontSize: 18, color: "var(--text-primary)" }}>New Shipment</h2>

        {/* Type toggle */}
        <div style={{ marginBottom: 18 }}>
          <label style={labelSt}>Type</label>
          <div style={{ display: "flex", gap: 12 }}>
            {(["Import", "Export"] as ShipmentType[]).map((t) => {
              const m        = TYPE_META[t];
              const selected = form.type === t;
              return (
                <button
                  key={t}
                  onClick={() => set("type", t)}
                  style={{
                    flex:       1,
                    padding:    "10px 0",
                    borderRadius: 8,
                    cursor:     "pointer",
                    fontFamily: font,
                    fontWeight: 700,
                    fontSize:   14,
                    background: selected ? m.bg   : "rgba(255,255,255,.04)",
                    color:      selected ? m.color : "var(--text-muted)",
                    border:     selected ? `1px solid ${m.border}` : "1px solid var(--border)",
                    transition: "all .15s",
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {field("Shipment Ref", "ref", "text", "Auto-generated")}
          {field(form.type === "Import" ? "Supplier Name" : "Buyer Name", "counterparty")}
          {field("Origin Port", "originPort", "text", "e.g. Hamburg")}
          {field("Destination Port", "destinationPort", "text", "e.g. Karachi")}

          <div>
            <label style={labelSt}>Incoterm</label>
            <select value={form.incoterm} onChange={(e) => set("incoterm", e.target.value)} style={inp}>
              {INCOTERMS.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>

          <div>
            <label style={labelSt}>Mode</label>
            <select value={form.mode} onChange={(e) => set("mode", e.target.value)} style={inp}>
              {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {field("BL No / AWB No", "blAwbNo", "text", "e.g. HLCU1234567")}
          {field("ETD (Departure)", "etd", "date")}
          {field("ETA (Arrival)", "eta", "date")}
          {field("Total Value (USD)", "totalValue", "number")}
          {field("Freight Cost ($)", "freightCost", "number")}
          {field("Insurance ($)", "insurance", "number")}
          {field("HS Code", "hsCode", "text", "e.g. 8471.30")}

          <div style={{ gridColumn: "1/-1" }}>
            <label style={labelSt}>Cargo Description</label>
            <input
              value={form.cargoDescription}
              onChange={(e) => set("cargoDescription", e.target.value)}
              placeholder="e.g. 20 x 40ft containers of electronic components"
              style={inp}
            />
          </div>

          <div style={{ gridColumn: "1/-1" }}>
            <label style={labelSt}>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              style={{ ...inp, resize: "vertical" }}
            />
          </div>
        </div>

        {error && <div style={{ fontSize: 12, color: "#f87171", marginTop: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button
            onClick={handleCreate}
            disabled={saving}
            style={{ ...btn("#2563eb"), flex: 1, opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Creating…" : "Create Shipment"}
          </button>
          <button onClick={onClose} style={{ ...btn("rgba(255,255,255,.08)"), flex: 1 }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ShipmentsPage() {
  const { records, loading, create, update } = useBusinessRecords("shipment");

  const [activeTab,  setActiveTab]  = useState("ALL");
  const [search,     setSearch]     = useState("");
  const [showNew,    setShowNew]    = useState(false);
  const [editTarget, setEditTarget] = useState<Shipment | null>(null);
  const [viewTarget, setViewTarget] = useState<Shipment | null>(null);

  const shipments = useMemo(() => records.map(mapRecord), [records]);

  // KPIs
  const kpis = useMemo(() => ({
    total:      shipments.length,
    inTransit:  shipments.filter((s) => s.status === "IN_TRANSIT").length,
    cleared:    shipments.filter((s) => s.status === "CLEARED").length,
    delayed:    shipments.filter((s) => s.status === "DELAYED").length,
    totalValue: shipments.reduce((sum, s) => sum + s.amount, 0),
  }), [shipments]);

  // Filter + search
  const filtered = useMemo(() => {
    let list = shipments;
    if (activeTab !== "ALL") {
      if (activeTab === "Import" || activeTab === "Export") {
        list = list.filter((s) => s.type === activeTab);
      } else {
        list = list.filter((s) => s.status === activeTab);
      }
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.ref.toLowerCase().includes(q) ||
          s.counterparty.toLowerCase().includes(q) ||
          s.blAwbNo.toLowerCase().includes(q)
      );
    }
    return list;
  }, [shipments, activeTab, search]);

  // Create
  const handleCreate = async (form: typeof EMPTY_FORM) => {
    const ref = form.ref.trim() || genRef(records.length);
    await create({
      title:  ref,
      status: "BOOKING",
      amount: Number(form.totalValue) || 0,
      date:   form.eta || new Date().toISOString().slice(0, 10),
      data: {
        type:             form.type,
        ref,
        counterparty:     form.counterparty.trim(),
        originPort:       form.originPort.trim(),
        destinationPort:  form.destinationPort.trim(),
        incoterm:         form.incoterm,
        mode:             form.mode,
        blAwbNo:          form.blAwbNo.trim(),
        eta:              form.eta,
        etd:              form.etd,
        cargoDescription: form.cargoDescription.trim(),
        hsCode:           form.hsCode.trim(),
        insurance:        Number(form.insurance)   || 0,
        freightCost:      Number(form.freightCost) || 0,
        notes:            form.notes.trim(),
        trackingNotes:    [],
      },
    });
  };

  // Update status
  const handleUpdateStatus = async (id: string, status: ShipmentStatus, note: string) => {
    const existing  = shipments.find((s) => s.id === id);
    const prevNotes = existing?.trackingNotes ?? [];
    const newNotes  = note
      ? [...prevNotes, { note, timestamp: new Date().toISOString(), status }]
      : prevNotes;
    await update(id, { status, data: { trackingNotes: newNotes } });
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const kpiCard: React.CSSProperties = {
    ...panel,
    padding:    "18px 20px",
    textAlign:  "center",
  };

  return (
    <div style={{ fontFamily: font, color: "var(--text-primary)", padding: 24, minHeight: "100vh", background: "var(--app-bg)" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Shipment Tracker</h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: 14 }}>
            Manage imports &amp; exports — sea, air, road and rail shipments.
          </p>
        </div>
        <button onClick={() => setShowNew(true)} style={btn("#2563eb")}>
          + New Shipment
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Shipments", value: kpis.total,                            color: "#60a5fa" },
          { label: "In Transit",      value: kpis.inTransit,                        color: "#3b82f6" },
          { label: "Cleared",         value: kpis.cleared,                          color: "#4ade80" },
          { label: "Delayed",         value: kpis.delayed,                          color: "#f87171" },
          { label: "Total Value",     value: `$${kpis.totalValue.toLocaleString()}`, color: "#fbbf24" },
        ].map((k) => (
          <div key={k.label} style={kpiCard}>
            <div style={{ fontSize: 26, fontWeight: 700, color: k.color }}>{k.value}</div>
            <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {FILTER_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={btn(
                activeTab === t.key ? "#2563eb" : "rgba(255,255,255,.07)",
                { padding: "7px 14px", fontSize: 13, fontWeight: activeTab === t.key ? 700 : 500 }
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ref, supplier/buyer, BL/AWB…"
          style={{ ...inp, width: 290 }}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>Loading shipments…</div>
      ) : (
        <div style={{ ...panel, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {[
                  "Shipment Ref", "Type", "Supplier / Buyer", "BL / AWB No",
                  "Route", "Incoterm", "ETA", "Status", "Value ($)", "Actions",
                ].map((h) => (
                  <th key={h} style={{
                    padding:     "12px 14px",
                    textAlign:   "left",
                    color:       "var(--text-muted)",
                    fontWeight:  600,
                    fontSize:    12,
                    whiteSpace:  "nowrap",
                    textTransform: "uppercase",
                    letterSpacing: ".04em",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: 52, color: "var(--text-muted)", fontSize: 14 }}>
                    No shipments found.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => {
                  const tm = TYPE_META[s.type];
                  return (
                    <tr
                      key={s.id}
                      style={{ borderBottom: "1px solid var(--border)", transition: "background .1s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.03)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* Ref */}
                      <td style={{ padding: "12px 14px", fontWeight: 700, whiteSpace: "nowrap" }}>
                        {s.ref}
                      </td>

                      {/* Type badge */}
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{
                          background:   tm.bg,
                          color:        tm.color,
                          border:       `1px solid ${tm.border}`,
                          borderRadius: 20,
                          padding:      "3px 10px",
                          fontSize:     11,
                          fontWeight:   700,
                        }}>
                          {s.type}
                        </span>
                      </td>

                      {/* Counterparty */}
                      <td style={{ padding: "12px 14px", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.counterparty}
                      </td>

                      {/* BL / AWB */}
                      <td style={{ padding: "12px 14px", color: "var(--text-muted)", fontFamily: "monospace", fontSize: 12 }}>
                        {s.blAwbNo}
                      </td>

                      {/* Route */}
                      <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                        <span style={{ fontWeight: 600 }}>{s.originPort}</span>
                        <span style={{ color: "var(--text-muted)", margin: "0 6px" }}>→</span>
                        <span style={{ fontWeight: 600 }}>{s.destinationPort}</span>
                      </td>

                      {/* Incoterm */}
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ background: "rgba(255,255,255,.06)", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 700 }}>
                          {s.incoterm}
                        </span>
                      </td>

                      {/* ETA */}
                      <td style={{ padding: "12px 14px", whiteSpace: "nowrap", color: "var(--text-muted)" }}>
                        {fmtDate(s.eta)}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "12px 14px" }}>
                        <StatusBadge status={s.status} />
                      </td>

                      {/* Value */}
                      <td style={{ padding: "12px 14px", fontWeight: 700, textAlign: "right", whiteSpace: "nowrap" }}>
                        ${s.amount.toLocaleString()}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => setEditTarget(s)}
                            style={btn("rgba(37,99,235,.15)", {
                              padding: "5px 11px", fontSize: 12,
                              color:  "#60a5fa",
                              border: "1px solid rgba(37,99,235,.4)",
                            })}
                          >
                            Edit Status
                          </button>
                          <button
                            onClick={() => setViewTarget(s)}
                            style={btn("rgba(255,255,255,.06)", {
                              padding: "5px 11px", fontSize: 12,
                              color:  "var(--text-muted)",
                              border: "1px solid var(--border)",
                            })}
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showNew && (
        <NewShipmentModal
          totalCount={records.length}
          onCreate={handleCreate}
          onClose={() => setShowNew(false)}
        />
      )}

      {editTarget && (
        <EditStatusModal
          ship={editTarget}
          onSave={handleUpdateStatus}
          onClose={() => setEditTarget(null)}
        />
      )}

      {viewTarget && (
        <ViewModal
          ship={viewTarget}
          onClose={() => setViewTarget(null)}
        />
      )}
    </div>
  );
}
