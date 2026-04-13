"use client";
import { confirmToast, alertToast } from "@/lib/toast-feedback";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { mapImportCostingRecords, tradeBg, tradeBorder, tradeFont, tradeMuted } from "../_shared";

type CostingStatus = "draft" | "reviewed" | "posted";

const STATUS_COLORS: Record<CostingStatus, { bg: string; color: string; border: string }> = {
  draft: { bg: "rgba(148,163,184,.12)", color: "#cbd5e1", border: "rgba(148,163,184,.28)" },
  reviewed: { bg: "rgba(59,130,246,.12)", color: "#60a5fa", border: "rgba(59,130,246,.28)" },
  posted: { bg: "rgba(16,185,129,.12)", color: "#34d399", border: "rgba(16,185,129,.28)" },
};

const CURRENCIES = ["USD", "EUR", "GBP", "AED", "CNY", "PKR"];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: `1px solid ${tradeBorder}`,
  background: "rgba(255,255,255,.04)",
  color: "var(--text-primary)",
  fontSize: 13,
  fontFamily: tradeFont,
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  color: tradeMuted,
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: ".06em",
  fontWeight: 700,
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function num(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function ImportCostingPage() {
  const { records, loading, create, update, remove } = useBusinessRecords("import_costing");
  const rows = useMemo(() => mapImportCostingRecords(records), [records]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | CostingStatus>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    shipmentRef: "",
    supplier: "",
    currency: "USD",
    goodsValue: "",
    freight: "",
    customs: "",
    insurance: "",
    clearing: "",
    otherCharges: "",
    units: "",
    date: todayIso(),
    status: "draft" as CostingStatus,
  });

  const landedCost = num(form.goodsValue) + num(form.freight) + num(form.customs) + num(form.insurance) + num(form.clearing) + num(form.otherCharges);
  const landedPerUnit = num(form.units) > 0 ? landedCost / num(form.units) : 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = statusFilter === "all" ? true : row.status === statusFilter;
      const matchesSearch = !q || row.shipmentRef.toLowerCase().includes(q) || row.supplier.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [rows, search, statusFilter]);

  const kpis = useMemo(() => ({
    records: rows.length,
    bookedValue: rows.reduce((sum, row) => sum + row.landedCost, 0),
    avgLanded: rows.length ? rows.reduce((sum, row) => sum + row.landedPerUnit, 0) / rows.length : 0,
    pending: rows.filter((row) => row.status !== "posted").length,
  }), [rows]);

  function resetForm() {
    setForm({
      shipmentRef: "",
      supplier: "",
      currency: "USD",
      goodsValue: "",
      freight: "",
      customs: "",
      insurance: "",
      clearing: "",
      otherCharges: "",
      units: "",
      date: todayIso(),
      status: "draft",
    });
    setEditingId(null);
    setError("");
  }

  function openNew() {
    resetForm();
    setShowModal(true);
  }

  function openEdit(id: string) {
    const row = rows.find((entry) => entry.id === id);
    if (!row) return;
    setForm({
      shipmentRef: row.shipmentRef,
      supplier: row.supplier,
      currency: row.currency,
      goodsValue: String(row.goodsValue),
      freight: String(row.freight),
      customs: String(row.customs),
      insurance: String(row.insurance),
      clearing: String(row.clearing),
      otherCharges: String(row.otherCharges),
      units: String(row.units || ""),
      date: row.date || todayIso(),
      status: row.status as CostingStatus,
    });
    setEditingId(id);
    setError("");
    setShowModal(true);
  }

  async function save() {
    if (!form.shipmentRef.trim()) return setError("Shipment reference required.");
    if (!form.supplier.trim()) return setError("Supplier / vendor required.");
    if (!form.date) return setError("Costing date required.");
    if (landedCost <= 0) return setError("At least one landed cost component should be greater than zero.");
    if (num(form.units) < 0) return setError("Units cannot be negative.");

    const payload = {
      title: form.shipmentRef.trim(),
      status: form.status,
      amount: landedCost,
      date: form.date,
      data: {
        shipmentRef: form.shipmentRef.trim(),
        supplier: form.supplier.trim(),
        currency: form.currency,
        goodsValue: num(form.goodsValue),
        freight: num(form.freight),
        customs: num(form.customs),
        insurance: num(form.insurance),
        clearing: num(form.clearing),
        otherCharges: num(form.otherCharges),
        units: num(form.units),
        landedPerUnit,
      },
    };

    setSaving(true);
    setError("");
    try {
      if (editingId) await update(editingId, payload);
      else await create(payload);
      setShowModal(false);
      resetForm();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, shipmentRef: string) {
    if (!await confirmToast(`Delete landed costing for ${shipmentRef}?`)) return;
    await remove(id);
  }

  return (
    <div style={{ minHeight: "100vh", padding: "28px 32px", color: "var(--text-primary)", fontFamily: tradeFont }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800 }}>Import Costing</h1>
          <p style={{ margin: 0, fontSize: 13, color: tradeMuted }}>Landed cost booking per shipment with freight, customs, insurance, and clearing charges.</p>
        </div>
        <button onClick={openNew} style={{ border: "none", borderRadius: 10, background: "#2563eb", color: "var(--text-primary)", padding: "10px 16px", fontFamily: tradeFont, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          New Costing
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 22 }}>
        {[
          { label: "Costing Records", value: kpis.records, color: "#60a5fa" },
          { label: "Booked Landed Cost", value: `USD ${kpis.bookedValue.toLocaleString()}`, color: "#34d399" },
          { label: "Avg Landed / Unit", value: `USD ${kpis.avgLanded.toFixed(2)}`, color: "#fbbf24" },
          { label: "Pending Review", value: kpis.pending, color: "#c084fc" },
        ].map((card) => (
          <div key={card.label} style={{ background: tradeBg, border: `1px solid ${tradeBorder}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: tradeMuted, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search shipment ref or supplier..." style={{ ...inputStyle, flex: 1, minWidth: 260 }} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | CostingStatus)} style={{ ...inputStyle, width: 180 }}>
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="reviewed">Reviewed</option>
          <option value="posted">Posted</option>
        </select>
      </div>

      <div style={{ background: tradeBg, border: `1px solid ${tradeBorder}`, borderRadius: 16, overflow: "hidden" }}>
        {loading ? <div style={{ padding: "56px 20px", textAlign: "center", color: tradeMuted }}>Loading costing records...</div>
          : filtered.length === 0 ? <div style={{ padding: "56px 20px", textAlign: "center", color: tradeMuted }}>No landed costing records yet.</div>
          : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Shipment", "Supplier", "Goods", "Freight", "Customs", "Landed Cost", "Per Unit", "Status", "Actions"].map((head) => (
                    <th key={head} style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", color: tradeMuted, borderBottom: `1px solid ${tradeBorder}` }}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const meta = STATUS_COLORS[row.status as CostingStatus] || STATUS_COLORS.draft;
                  return (
                    <tr key={row.id}>
                      <td style={{ padding: "12px 14px", borderBottom: `1px solid ${tradeBorder}`, fontWeight: 700, color: "#93c5fd" }}>{row.shipmentRef}</td>
                      <td style={{ padding: "12px 14px", borderBottom: `1px solid ${tradeBorder}` }}>{row.supplier}</td>
                      <td style={{ padding: "12px 14px", borderBottom: `1px solid ${tradeBorder}` }}>{row.currency} {row.goodsValue.toLocaleString()}</td>
                      <td style={{ padding: "12px 14px", borderBottom: `1px solid ${tradeBorder}` }}>{row.currency} {row.freight.toLocaleString()}</td>
                      <td style={{ padding: "12px 14px", borderBottom: `1px solid ${tradeBorder}` }}>{row.currency} {row.customs.toLocaleString()}</td>
                      <td style={{ padding: "12px 14px", borderBottom: `1px solid ${tradeBorder}`, fontWeight: 800 }}>{row.currency} {row.landedCost.toLocaleString()}</td>
                      <td style={{ padding: "12px 14px", borderBottom: `1px solid ${tradeBorder}` }}>{row.units ? `${row.currency} ${row.landedPerUnit.toFixed(2)}` : "-"}</td>
                      <td style={{ padding: "12px 14px", borderBottom: `1px solid ${tradeBorder}` }}>
                        <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 999, background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, fontSize: 11, fontWeight: 700 }}>
                          {row.status}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", borderBottom: `1px solid ${tradeBorder}` }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => openEdit(row.id)} style={{ background: "transparent", border: `1px solid ${tradeBorder}`, color: "var(--text-primary)", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>Edit</button>
                          <button onClick={() => handleDelete(row.id, row.shipmentRef)} style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer" }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", zIndex: 1200, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 20, overflowY: "auto" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={{ width: "100%", maxWidth: 980, margin: "24px 0", background: "#101522", border: `1px solid ${tradeBorder}`, borderRadius: 18, padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800 }}>{editingId ? "Edit Import Costing" : "New Import Costing"}</h2>
                <p style={{ margin: 0, fontSize: 12, color: tradeMuted }}>Capture all landed cost components before posting shipment costing.</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: "transparent", border: "none", color: tradeMuted, fontSize: 24, cursor: "pointer" }}>x</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 14 }}>
              <div><label style={labelStyle}>Shipment Ref</label><input value={form.shipmentRef} onChange={(e) => setForm((prev) => ({ ...prev, shipmentRef: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Supplier</label><input value={form.supplier} onChange={(e) => setForm((prev) => ({ ...prev, supplier: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Currency</label><select value={form.currency} onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))} style={inputStyle}>{CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency}</option>)}</select></div>
              <div><label style={labelStyle}>Goods Value</label><input type="number" min="0" step="0.01" value={form.goodsValue} onChange={(e) => setForm((prev) => ({ ...prev, goodsValue: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Freight</label><input type="number" min="0" step="0.01" value={form.freight} onChange={(e) => setForm((prev) => ({ ...prev, freight: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Customs</label><input type="number" min="0" step="0.01" value={form.customs} onChange={(e) => setForm((prev) => ({ ...prev, customs: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Insurance</label><input type="number" min="0" step="0.01" value={form.insurance} onChange={(e) => setForm((prev) => ({ ...prev, insurance: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Clearing</label><input type="number" min="0" step="0.01" value={form.clearing} onChange={(e) => setForm((prev) => ({ ...prev, clearing: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Other Charges</label><input type="number" min="0" step="0.01" value={form.otherCharges} onChange={(e) => setForm((prev) => ({ ...prev, otherCharges: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Units</label><input type="number" min="0" step="1" value={form.units} onChange={(e) => setForm((prev) => ({ ...prev, units: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Date</label><input type="date" value={form.date} onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Status</label><select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as CostingStatus }))} style={inputStyle}><option value="draft">Draft</option><option value="reviewed">Reviewed</option><option value="posted">Posted</option></select></div>
            </div>

            <div style={{ marginTop: 18, padding: "14px 16px", borderRadius: 12, background: "var(--panel-bg)", border: `1px solid ${tradeBorder}`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: tradeMuted, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Total Landed Cost</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#34d399" }}>{form.currency} {landedCost.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: tradeMuted, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Landed Cost Per Unit</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#60a5fa" }}>{num(form.units) > 0 ? `${form.currency} ${landedPerUnit.toFixed(2)}` : "-"}</div>
              </div>
            </div>

            {error ? <div style={{ marginTop: 14, color: "#f87171", fontSize: 13 }}>{error}</div> : null}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <button onClick={() => setShowModal(false)} style={{ background: "rgba(255,255,255,.08)", border: "none", color: "var(--text-primary)", borderRadius: 10, padding: "10px 14px", cursor: "pointer" }}>Cancel</button>
              <button onClick={save} disabled={saving} style={{ background: "#2563eb", border: "none", color: "var(--text-primary)", borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontWeight: 700 }}>
                {saving ? "Saving..." : editingId ? "Update Costing" : "Create Costing"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
