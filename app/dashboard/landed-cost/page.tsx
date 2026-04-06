"use client";`r`nimport { confirmToast, alertToast } from "@/lib/toast-feedback";`r`n
import { useState, useMemo } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const ACCENT = "#8b5cf6";
const FONT = "'Outfit','Inter',sans-serif";

interface FormState {
  ref:       string;
  invoiceRef: string;
  freight:   string;
  customs:   string;
  handling:  string;
  other:     string;
}

const EMPTY_FORM: FormState = {
  ref: "", invoiceRef: "", freight: "", customs: "", handling: "", other: "",
};

function calcTotal(f: FormState): number {
  return (
    (Number(f.freight)  || 0) +
    (Number(f.customs)  || 0) +
    (Number(f.handling) || 0) +
    (Number(f.other)    || 0)
  );
}

function statusBadge(status: string) {
  const map: Record<string, { bg: string; color: string }> = {
    PENDING:   { bg: "rgba(251,191,36,.15)", color: "#fbbf24" },
    ALLOCATED: { bg: "rgba(16,185,129,.15)", color: "#10b981" },
  };
  const s = map[status] ?? map.PENDING;
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: "3px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 700, letterSpacing: .4,
    }}>
      {status}
    </span>
  );
}

const cell: React.CSSProperties = {
  padding: "13px 14px",
  borderBottom: "1px solid var(--border)",
  fontSize: 13,
  color: "var(--text-primary)",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600,
  color: "var(--text-muted)", marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: "rgba(255,255,255,.05)",
  border: "1px solid var(--border)",
  borderRadius: 8, padding: "9px 12px",
  fontSize: 13, color: "var(--text-primary)",
  fontFamily: FONT, outline: "none",
};

export default function LandedCostPage() {
  const { records, loading, create, setStatus, remove } = useBusinessRecords("landed_cost");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  const entries = useMemo(() =>
    records.map((r) => ({
      id:         r.id,
      ref:        r.title,
      invoiceRef: (r.data.invoiceRef as string) || "-",
      freight:    Number(r.data.freight)  || 0,
      customs:    Number(r.data.customs)  || 0,
      handling:   Number(r.data.handling) || 0,
      other:      Number(r.data.other)    || 0,
      total:      r.amount                || 0,
      allocatedTo:(r.data.allocatedTo as string) || "-",
      status:     r.status                || "PENDING",
    })),
  [records]);

  const totalEntries     = entries.length;
  const pendingCount     = entries.filter((e) => e.status === "PENDING").length;
  const allocatedCount   = entries.filter((e) => e.status === "ALLOCATED").length;
  const totalLandedCost  = entries.reduce((a, e) => a + e.total, 0);

  const kpis = [
    { label: "Total Entries",       value: totalEntries,                              color: ACCENT },
    { label: "Pending Allocation",  value: pendingCount,                              color: "#fbbf24" },
    { label: "Allocated",           value: allocatedCount,                            color: "#10b981" },
    { label: "Total Landed Cost",   value: `$${totalLandedCost.toLocaleString()}`,    color: "#60a5fa" },
  ];

  function setField<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function closeModal() {
    setShowModal(false);
    setForm(EMPTY_FORM);
    setError("");
  }

  async function handleSave() {
    setError("");
    if (!form.ref.trim()) { setError("Reference is required."); return; }
    const total = calcTotal(form);
    if (total <= 0) { setError("At least one cost component must be greater than zero."); return; }
    setSaving(true);
    try {
      await create({
        title:  form.ref.trim(),
        status: "PENDING",
        amount: total,
        data: {
          invoiceRef:  form.invoiceRef.trim() || null,
          freight:     Number(form.freight)   || 0,
          customs:     Number(form.customs)   || 0,
          handling:    Number(form.handling)  || 0,
          other:       Number(form.other)     || 0,
          allocatedTo: null,
        },
      });
      closeModal();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleAllocate(id: string) {
    try { await setStatus(id, "ALLOCATED"); } catch {}
  }

  async function handleDelete(id: string) {
    if (!await confirmToast("Delete this landed cost entry?")) return;
    try { await remove(id); } catch {}
  }

  const previewTotal = calcTotal(form);

  return (
    <div style={{ padding: "28px 32px", fontFamily: FONT, color: "var(--text-primary)", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Landed Cost</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
            Allocate freight, customs &amp; handling to purchase invoices
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: "10px 20px", borderRadius: 10, border: "none",
            background: ACCENT, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}
        >
          + New Entry
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 }}>
        {kpis.map((k) => (
          <div key={k.label} style={{
            background: "var(--panel-bg)", border: "1px solid var(--border)",
            borderRadius: 12, padding: "20px 24px",
          }}>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
          Loading landed cost entriesâ€¦
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div style={{
          background: "var(--panel-bg)", border: "1px solid var(--border)",
          borderRadius: 12, overflow: "auto",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr>
                {[
                  "Reference", "Invoice / GRN",
                  "Freight ($)", "Customs ($)", "Handling ($)", "Other ($)",
                  "Total ($)", "Allocated To", "Status", "Actions",
                ].map((h) => (
                  <th key={h} style={{
                    textAlign: "left", padding: "12px 14px",
                    fontSize: 11, color: "var(--text-muted)",
                    borderBottom: "1px solid var(--border)",
                    fontWeight: 600, letterSpacing: .5,
                    textTransform: "uppercase", whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: 48, color: "var(--text-muted)", fontSize: 14 }}>
                    No landed cost entries yet. Add your first entry to get started.
                  </td>
                </tr>
              ) : entries.map((e) => (
                <tr key={e.id}
                  onMouseEnter={(ev) => (ev.currentTarget.style.background = "rgba(255,255,255,.03)")}
                  onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}
                >
                  <td style={{ ...cell, fontWeight: 600 }}>{e.ref}</td>
                  <td style={{ ...cell, color: "var(--text-muted)" }}>{e.invoiceRef}</td>
                  <td style={cell}>${e.freight.toLocaleString()}</td>
                  <td style={cell}>${e.customs.toLocaleString()}</td>
                  <td style={cell}>${e.handling.toLocaleString()}</td>
                  <td style={cell}>${e.other.toLocaleString()}</td>
                  <td style={{ ...cell, fontWeight: 700, color: ACCENT }}>${e.total.toLocaleString()}</td>
                  <td style={{ ...cell, color: "var(--text-muted)", fontSize: 12 }}>{e.allocatedTo}</td>
                  <td style={cell}>{statusBadge(e.status)}</td>
                  <td style={{ ...cell, display: "flex", gap: 8, alignItems: "center" }}>
                    {e.status === "PENDING" && (
                      <button
                        onClick={() => handleAllocate(e.id)}
                        style={{
                          padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                          border: `1px solid ${ACCENT}`,
                          background: "transparent", color: ACCENT, cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Allocate
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(e.id)}
                      style={{
                        padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                        border: "1px solid rgba(239,68,68,.4)", background: "transparent",
                        color: "#ef4444", cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.6)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
        }}>
          <div style={{
            background: "var(--panel-bg)", border: "1px solid var(--border)",
            borderRadius: 16, padding: "32px 28px", width: 500, fontFamily: FONT,
            maxHeight: "90vh", overflowY: "auto",
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 20px", color: "var(--text-primary)" }}>
              New Landed Cost Entry
            </h2>

            {error && (
              <div style={{
                background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.3)",
                color: "#f87171", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16,
              }}>{error}</div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Reference *</label>
                <input
                  style={inputStyle}
                  placeholder="e.g. LC-2024-001"
                  value={form.ref}
                  onChange={(e) => setField("ref", e.target.value)}
                />
              </div>

              <div>
                <label style={labelStyle}>Purchase Invoice Ref</label>
                <input
                  style={inputStyle}
                  placeholder="e.g. PI-0042 / GRN-007"
                  value={form.invoiceRef}
                  onChange={(e) => setField("invoiceRef", e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Freight ($)</label>
                  <input
                    type="number" min="0" step="0.01"
                    style={inputStyle}
                    placeholder="0.00"
                    value={form.freight}
                    onChange={(e) => setField("freight", e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Customs ($)</label>
                  <input
                    type="number" min="0" step="0.01"
                    style={inputStyle}
                    placeholder="0.00"
                    value={form.customs}
                    onChange={(e) => setField("customs", e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Handling ($)</label>
                  <input
                    type="number" min="0" step="0.01"
                    style={inputStyle}
                    placeholder="0.00"
                    value={form.handling}
                    onChange={(e) => setField("handling", e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Other ($)</label>
                  <input
                    type="number" min="0" step="0.01"
                    style={inputStyle}
                    placeholder="0.00"
                    value={form.other}
                    onChange={(e) => setField("other", e.target.value)}
                  />
                </div>
              </div>

              {/* Auto-calculated total */}
              <div style={{
                background: "rgba(139,92,246,.1)", border: "1px solid rgba(139,92,246,.25)",
                borderRadius: 10, padding: "14px 16px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>
                  Calculated Total
                </span>
                <span style={{ fontSize: 20, fontWeight: 800, color: ACCENT }}>
                  ${previewTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
              <button
                onClick={closeModal}
                style={{
                  padding: "9px 20px", borderRadius: 8, border: "1px solid var(--border)",
                  background: "transparent", color: "var(--text-muted)", fontSize: 13, cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: "9px 22px", borderRadius: 8, border: "none",
                  background: ACCENT, color: "#fff", fontSize: 13, fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer", opacity: saving ? .7 : 1,
                }}
              >
                {saving ? "Savingâ€¦" : "Create Entry"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
