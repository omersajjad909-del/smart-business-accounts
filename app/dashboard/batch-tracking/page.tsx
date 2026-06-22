"use client";
import toast from "react-hot-toast";
import { useState, useMemo } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const ff = "'Outfit','Inter',sans-serif";
const ACCENT = "#38bdf8";
const BG = "rgba(255,255,255,.03)";
const BORDER = "rgba(255,255,255,.08)";
const MUTED = "rgba(255,255,255,.45)";

const inp: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: "rgba(255,255,255,.05)", border: `1px solid ${BORDER}`,
  borderRadius: 8, padding: "9px 12px", fontSize: 13,
  color: "#fff", fontFamily: ff, outline: "none",
};
const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase" as const, letterSpacing: ".06em", display: "block", marginBottom: 5 };

type Tab = "batches" | "serials";
type BatchRecord = { id: string; product: string; batchNo: string; expiry: string; qty: number; status: string };
type SerialRecord = { id: string; product: string; serialNo: string; saleDate: string; customer: string; status: string };

const EMPTY_BATCH = { product: "", batchNo: "", expiry: "", qty: "" };
const EMPTY_SERIAL = { product: "", serialNo: "", saleDate: "", customer: "" };

function daysUntil(dateStr: string) {
  if (!dateStr) return 9999;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function ExpiryBadge({ days }: { days: number }) {
  if (days < 0) return <span style={{ padding: "2px 8px", borderRadius: 20, background: "rgba(239,68,68,.15)", color: "#ef4444", fontSize: 11, fontWeight: 700 }}>Expired</span>;
  if (days <= 30) return <span style={{ padding: "2px 8px", borderRadius: 20, background: "rgba(251,191,36,.15)", color: "#fbbf24", fontSize: 11, fontWeight: 700 }}>Expiring in {days}d</span>;
  return <span style={{ padding: "2px 8px", borderRadius: 20, background: "rgba(52,211,153,.1)", color: "#34d399", fontSize: 11, fontWeight: 700 }}>OK</span>;
}

export default function BatchTrackingPage() {
  const batchHook  = useBusinessRecords("batch_record");
  const serialHook = useBusinessRecords("serial_record");
  const [tab, setTab]           = useState<Tab>("batches");
  const [showModal, setShowModal] = useState(false);
  const [bForm, setBForm]       = useState(EMPTY_BATCH);
  const [sForm, setSForm]       = useState(EMPTY_SERIAL);
  const [saving, setSaving]     = useState(false);

  const batches: BatchRecord[] = batchHook.records.map(r => ({
    id: r.id,
    product:  r.title,
    batchNo:  String(r.data.batchNo || ""),
    expiry:   String(r.data.expiry  || ""),
    qty:      Number(r.data.qty     || 0),
    status:   r.status || "active",
  }));

  const serials: SerialRecord[] = serialHook.records.map(r => ({
    id:       r.id,
    product:  r.title,
    serialNo: String(r.data.serialNo  || ""),
    saleDate: String(r.data.saleDate  || ""),
    customer: String(r.data.customer  || ""),
    status:   r.status || "in_stock",
  }));

  const expiring = useMemo(() => batches.filter(b => daysUntil(b.expiry) <= 30).length, [batches]);
  const expired  = useMemo(() => batches.filter(b => daysUntil(b.expiry) < 0).length,  [batches]);
  const sold     = serials.filter(s => s.status === "sold").length;

  async function saveBatch() {
    if (!bForm.product.trim()) return toast.error("Product name is required.");
    if (!bForm.batchNo.trim()) return toast.error("Batch number is required.");
    if (!bForm.expiry)         return toast.error("Expiry date is required.");
    if (Number(bForm.qty) <= 0) return toast.error("Quantity must be greater than zero.");
    setSaving(true);
    try {
      await batchHook.create({ title: bForm.product.trim(), status: "active", amount: Number(bForm.qty), date: bForm.expiry, data: { batchNo: bForm.batchNo.trim(), expiry: bForm.expiry, qty: Number(bForm.qty) } });
      setBForm(EMPTY_BATCH);
      setShowModal(false);
      toast.success("Batch record added.");
    } catch { toast.error("Failed to save."); }
    finally { setSaving(false); }
  }

  async function saveSerial() {
    if (!sForm.product.trim())  return toast.error("Product name is required.");
    if (!sForm.serialNo.trim()) return toast.error("Serial number is required.");
    if (serials.some(s => s.serialNo === sForm.serialNo.trim())) return toast.error("This serial number already exists.");
    setSaving(true);
    try {
      await serialHook.create({ title: sForm.product.trim(), status: "in_stock", data: { serialNo: sForm.serialNo.trim(), saleDate: sForm.saleDate, customer: sForm.customer.trim() } });
      setSForm(EMPTY_SERIAL);
      setShowModal(false);
      toast.success("Serial record added.");
    } catch { toast.error("Failed to save."); }
    finally { setSaving(false); }
  }

  const th: React.CSSProperties = { padding: "10px 14px", fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase" as const, letterSpacing: ".05em", textAlign: "left" as const, borderBottom: `1px solid ${BORDER}` };
  const td: React.CSSProperties = { padding: "12px 14px", fontSize: 13, borderBottom: `1px solid ${BORDER}` };

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 900 }}>🔢 Batch & Serial Tracking</h1>
          <p style={{ margin: 0, fontSize: 13, color: MUTED }}>Track inventory by batch number (expiry) or serial number (individual unit).</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: ACCENT, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + Add Record
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total Batches",      value: batches.length,  color: ACCENT },
          { label: "Expiring ≤ 30 days", value: expiring,         color: "#fbbf24" },
          { label: "Expired",            value: expired,          color: "#ef4444" },
          { label: "Serials Sold",       value: sold,             color: "#a78bfa" },
        ].map(k => (
          <div key={k.label} style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["batches", "serials"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "8px 20px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", background: tab === t ? ACCENT : "rgba(255,255,255,.06)", color: tab === t ? "#fff" : MUTED }}>
            {t === "batches" ? "Batch Records" : "Serial Numbers"}
          </button>
        ))}
      </div>

      {/* Batches Table */}
      {tab === "batches" && (
        <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["Product", "Batch No.", "Expiry Date", "Qty", "Status", "Action"].map(h => <th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {batchHook.loading ? (
                <tr><td colSpan={6} style={{ ...td, textAlign: "center", padding: 40, color: MUTED }}>Loading…</td></tr>
              ) : batches.length === 0 ? (
                <tr><td colSpan={6} style={{ ...td, textAlign: "center", padding: 40, color: MUTED }}>No batch records yet.</td></tr>
              ) : batches.map(b => {
                const days = daysUntil(b.expiry);
                return (
                  <tr key={b.id}>
                    <td style={{ ...td, fontWeight: 600 }}>{b.product}</td>
                    <td style={{ ...td, color: ACCENT, fontWeight: 700 }}>{b.batchNo}</td>
                    <td style={td}>{b.expiry}</td>
                    <td style={td}>{b.qty.toLocaleString()}</td>
                    <td style={td}><ExpiryBadge days={days} /></td>
                    <td style={td}>
                      <button onClick={() => batchHook.remove(b.id)} style={{ background: "none", border: "none", color: "#f87171", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Remove</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Serials Table */}
      {tab === "serials" && (
        <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["Product", "Serial No.", "Status", "Customer", "Sale Date", "Action"].map(h => <th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {serialHook.loading ? (
                <tr><td colSpan={6} style={{ ...td, textAlign: "center", padding: 40, color: MUTED }}>Loading…</td></tr>
              ) : serials.length === 0 ? (
                <tr><td colSpan={6} style={{ ...td, textAlign: "center", padding: 40, color: MUTED }}>No serial records yet.</td></tr>
              ) : serials.map(s => (
                <tr key={s.id}>
                  <td style={{ ...td, fontWeight: 600 }}>{s.product}</td>
                  <td style={{ ...td, color: ACCENT, fontWeight: 700 }}>{s.serialNo}</td>
                  <td style={td}>
                    <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.status === "sold" ? "rgba(167,139,250,.15)" : "rgba(52,211,153,.1)", color: s.status === "sold" ? "#a78bfa" : "#34d399" }}>
                      {s.status === "sold" ? "Sold" : "In Stock"}
                    </span>
                  </td>
                  <td style={{ ...td, color: MUTED }}>{s.customer || "—"}</td>
                  <td style={{ ...td, color: MUTED }}>{s.saleDate || "—"}</td>
                  <td style={td}>
                    {s.status !== "sold" && (
                      <button onClick={() => serialHook.update(s.id, { status: "sold" })} style={{ background: "none", border: "none", color: "#a78bfa", fontSize: 12, fontWeight: 700, cursor: "pointer", marginRight: 10 }}>Mark Sold</button>
                    )}
                    <button onClick={() => serialHook.remove(s.id)} style={{ background: "none", border: "none", color: "#f87171", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#0f172a", border: `1px solid ${BORDER}`, borderRadius: 16, padding: 28, width: 440, fontFamily: ff }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 20px" }}>
              {tab === "batches" ? "Add Batch Record" : "Add Serial Number"}
            </h2>

            {tab === "batches" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div><label style={lbl}>Product Name *</label><input style={inp} value={bForm.product} onChange={e => setBForm(p => ({ ...p, product: e.target.value }))} placeholder="e.g. Paracetamol 500mg" /></div>
                <div><label style={lbl}>Batch Number *</label><input style={inp} value={bForm.batchNo} onChange={e => setBForm(p => ({ ...p, batchNo: e.target.value }))} placeholder="e.g. BTH-2024-001" /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={lbl}>Expiry Date *</label><input type="date" style={inp} value={bForm.expiry} onChange={e => setBForm(p => ({ ...p, expiry: e.target.value }))} /></div>
                  <div><label style={lbl}>Quantity *</label><input type="number" style={inp} min="1" value={bForm.qty} onChange={e => setBForm(p => ({ ...p, qty: e.target.value }))} placeholder="0" /></div>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div><label style={lbl}>Product Name *</label><input style={inp} value={sForm.product} onChange={e => setSForm(p => ({ ...p, product: e.target.value }))} placeholder="e.g. Samsung Galaxy S24" /></div>
                <div><label style={lbl}>Serial Number *</label><input style={inp} value={sForm.serialNo} onChange={e => setSForm(p => ({ ...p, serialNo: e.target.value }))} placeholder="e.g. SN-2024-00123" /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={lbl}>Customer (if sold)</label><input style={inp} value={sForm.customer} onChange={e => setSForm(p => ({ ...p, customer: e.target.value }))} placeholder="Customer name" /></div>
                  <div><label style={lbl}>Sale Date</label><input type="date" style={inp} value={sForm.saleDate} onChange={e => setSForm(p => ({ ...p, saleDate: e.target.value }))} /></div>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button onClick={tab === "batches" ? saveBatch : saveSerial} disabled={saving} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: ACCENT, color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? .7 : 1 }}>
                {saving ? "Saving…" : "Save"}
              </button>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontSize: 13, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
