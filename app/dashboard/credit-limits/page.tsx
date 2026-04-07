"use client";
import { confirmToast, alertToast } from "@/lib/toast-feedback";

import { useState, useMemo } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const ACCENT = "#f59e0b";
const FONT = "'Outfit','Inter',sans-serif";

interface FormState {
  customerName: string;
  limit: string;
  used: string;
}

const EMPTY_FORM: FormState = { customerName: "", limit: "", used: "" };

function deriveStatus(usedPct: number): "OK" | "WARNING" | "EXCEEDED" {
  if (usedPct > 100) return "EXCEEDED";
  if (usedPct > 80)  return "WARNING";
  return "OK";
}

function statusBadge(status: "OK" | "WARNING" | "EXCEEDED") {
  const map = {
    OK:       { bg: "rgba(16,185,129,.15)",  color: "#10b981" },
    WARNING:  { bg: "rgba(251,191,36,.15)",  color: "#fbbf24" },
    EXCEEDED: { bg: "rgba(239,68,68,.15)",   color: "#ef4444" },
  };
  const s = map[status];
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
  padding: "13px 16px",
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

export default function CreditLimitsPage() {
  const { records, loading, create, update, remove } = useBusinessRecords("credit_limit");
  const [showModal, setShowModal]   = useState(false);
  const [editId, setEditId]         = useState<string | null>(null);
  const [form, setForm]             = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");

  const rows = useMemo(() =>
    records.map((r) => {
      const limit  = Number(r.data.limit)  || 0;
      const used   = Number(r.data.used)   || 0;
      const avail  = Math.max(0, limit - used);
      const pct    = limit > 0 ? (used / limit) * 100 : 0;
      return {
        id:           r.id,
        customerName: r.title,
        limit,
        used,
        avail,
        pct,
        status:       deriveStatus(pct),
      };
    }),
  [records]);

  const totalCustomers  = rows.length;
  const withinLimit     = rows.filter((r) => r.status === "OK").length;
  const overLimit       = rows.filter((r) => r.status === "EXCEEDED").length;
  const totalExposure   = rows.reduce((a, r) => a + r.used, 0);

  const kpis = [
    { label: "Total Customers", value: totalCustomers, color: ACCENT },
    { label: "Within Limit",    value: withinLimit,    color: "#10b981" },
    { label: "Over Limit",      value: overLimit,      color: "#ef4444" },
    { label: "Total Exposure",  value: `$${totalExposure.toLocaleString()}`, color: "#a78bfa" },
  ];

  function setField<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function openEdit(row: typeof rows[number]) {
    setEditId(row.id);
    setForm({ customerName: row.customerName, limit: String(row.limit), used: String(row.used) });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditId(null);
    setForm(EMPTY_FORM);
    setError("");
  }

  async function handleSave() {
    setError("");
    if (!form.customerName.trim()) { setError("Customer name is required."); return; }
    if (!form.limit || Number(form.limit) <= 0) { setError("Credit limit must be greater than zero."); return; }
    setSaving(true);
    try {
      if (editId) {
        await update(editId, {
          title: form.customerName.trim(),
          data: { limit: Number(form.limit), used: Number(form.used) || 0 },
        });
      } else {
        await create({
          title:  form.customerName.trim(),
          status: "ACTIVE",
          amount: Number(form.limit),
          data:   { limit: Number(form.limit), used: Number(form.used) || 0 },
        });
      }
      closeModal();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!await confirmToast("Delete this credit limit record?")) return;
    try { await remove(id); } catch {}
  }

  function usageBar(pct: number, status: "OK" | "WARNING" | "EXCEEDED") {
    const color = status === "EXCEEDED" ? "#ef4444" : status === "WARNING" ? "#fbbf24" : "#10b981";
    const clamped = Math.min(100, pct);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width: 80, height: 6, background: "rgba(255,255,255,.08)",
          borderRadius: 4, overflow: "hidden",
        }}>
          <div style={{ width: `${clamped}%`, height: "100%", background: color, borderRadius: 4 }} />
        </div>
        <span style={{ fontSize: 12, color, fontWeight: 700 }}>{pct.toFixed(1)}%</span>
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: FONT, color: "var(--text-primary)", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Credit Limits</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
            Set and monitor credit exposure per customer
          </p>
        </div>
        <button
          onClick={() => { setEditId(null); setShowModal(true); }}
          style={{
            padding: "10px 20px", borderRadius: 10, border: "none",
            background: ACCENT, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}
        >
          + Set Limit
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
          Loading credit limits...
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div style={{
          background: "var(--panel-bg)", border: "1px solid var(--border)",
          borderRadius: 12, overflow: "hidden",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Customer Name", "Credit Limit", "Used", "Available", "Usage %", "Status", "Actions"].map((h) => (
                  <th key={h} style={{
                    textAlign: "left", padding: "12px 16px",
                    fontSize: 11, color: "var(--text-muted)",
                    borderBottom: "1px solid var(--border)",
                    fontWeight: 600, letterSpacing: .5,
                    textTransform: "uppercase",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 48, color: "var(--text-muted)", fontSize: 14 }}>
                    No credit limits configured yet.
                  </td>
                </tr>
              ) : rows.map((r) => (
                <tr key={r.id}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.03)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ ...cell, fontWeight: 600 }}>{r.customerName}</td>
                  <td style={{ ...cell, color: ACCENT, fontWeight: 700 }}>${r.limit.toLocaleString()}</td>
                  <td style={cell}>${r.used.toLocaleString()}</td>
                  <td style={cell}>${r.avail.toLocaleString()}</td>
                  <td style={cell}>{usageBar(r.pct, r.status)}</td>
                  <td style={cell}>{statusBadge(r.status)}</td>
                  <td style={{ ...cell, display: "flex", gap: 8, alignItems: "center" }}>
                    <button
                      onClick={() => openEdit(r)}
                      style={{
                        padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                        border: `1px solid ${ACCENT}`,
                        background: "transparent", color: ACCENT, cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
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
            borderRadius: 16, padding: "32px 28px", width: 440, fontFamily: FONT,
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 20px", color: "var(--text-primary)" }}>
              {editId ? "Edit Credit Limit" : "Set Credit Limit"}
            </h2>

            {error && (
              <div style={{
                background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.3)",
                color: "#f87171", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16,
              }}>{error}</div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Customer Name *</label>
                <input
                  style={inputStyle}
                  placeholder="e.g. Acme Corp"
                  value={form.customerName}
                  onChange={(e) => setField("customerName", e.target.value)}
                />
              </div>

              <div>
                <label style={labelStyle}>Credit Limit ($) *</label>
                <input
                  type="number"
                  style={inputStyle}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={form.limit}
                  onChange={(e) => setField("limit", e.target.value)}
                />
              </div>

              <div>
                <label style={labelStyle}>Currently Used ($) <span style={{ fontWeight: 400 }}>(optional)</span></label>
                <input
                  type="number"
                  style={inputStyle}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={form.used}
                  onChange={(e) => setField("used", e.target.value)}
                />
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
                {saving ? "SavingÃ¢â‚¬Â¦" : editId ? "Update" : "Save Limit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
