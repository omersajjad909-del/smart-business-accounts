"use client";

import { useState, useMemo } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const ACCENT = "#10b981";
const FONT = "'Outfit','Inter',sans-serif";

const TYPE_OPTIONS = ["Retail", "Wholesale", "VIP", "Custom"] as const;
type PriceListType = (typeof TYPE_OPTIONS)[number];

interface FormState {
  name: string;
  type: PriceListType;
  discount: string;
  notes: string;
}

const EMPTY_FORM: FormState = { name: "", type: "Retail", discount: "", notes: "" };

function statusBadge(status: string) {
  const map: Record<string, { bg: string; color: string }> = {
    ACTIVE:  { bg: "rgba(16,185,129,.15)",  color: "#10b981" },
    DRAFT:   { bg: "rgba(251,191,36,.15)",  color: "#fbbf24" },
    EXPIRED: { bg: "rgba(107,114,128,.18)", color: "#9ca3af" },
  };
  const s = map[status] ?? map.DRAFT;
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

export default function PriceListsPage() {
  const { records, loading, create, setStatus, remove } = useBusinessRecords("price_list");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const lists = useMemo(() =>
    records.map((r) => ({
      id:               r.id,
      name:             r.title,
      type:             (r.data.type as string) || "Retail",
      discount:         Number(r.data.discount) || 0,
      items:            Number(r.data.items)    || 0,
      assignedCustomers:Number(r.data.assignedCustomers) || 0,
      status:           r.status || "DRAFT",
    })),
  [records]);

  const totalLists   = lists.length;
  const activeLists  = lists.filter((l) => l.status === "ACTIVE").length;
  const itemsCovered = lists.reduce((a, l) => a + l.items, 0);
  const customersAssigned = lists.reduce((a, l) => a + l.assignedCustomers, 0);

  const kpis = [
    { label: "Total Lists",        value: totalLists,        color: ACCENT },
    { label: "Active",             value: activeLists,       color: "#34d399" },
    { label: "Items Covered",      value: itemsCovered,      color: "#60a5fa" },
    { label: "Customers Assigned", value: customersAssigned, color: "#a78bfa" },
  ];

  function setField<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSave() {
    setError("");
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSaving(true);
    try {
      await create({
        title:  form.name.trim(),
        status: "DRAFT",
        data: {
          type:     form.type,
          discount: Number(form.discount) || 0,
          notes:    form.notes.trim(),
          items:    0,
          assignedCustomers: 0,
        },
      });
      setShowModal(false);
      setForm(EMPTY_FORM);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id: string, currentStatus: string) {
    const next = currentStatus === "ACTIVE" ? "DRAFT" : "ACTIVE";
    try { await setStatus(id, next); } catch {}
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this price list?")) return;
    try { await remove(id); } catch {}
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: FONT, color: "var(--text-primary)", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Price Lists</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
            Manage customer-specific and volume pricing
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: "10px 20px", borderRadius: 10, border: "none",
            background: ACCENT, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}
        >
          + New Price List
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
          Loading price lists…
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
                {["Name", "Type", "Discount %", "Items", "Customers", "Status", "Actions"].map((h) => (
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
              {lists.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 48, color: "var(--text-muted)", fontSize: 14 }}>
                    No price lists yet. Create one to get started.
                  </td>
                </tr>
              ) : lists.map((l) => (
                <tr key={l.id} style={{ transition: "background .15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.03)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ ...cell, fontWeight: 600 }}>{l.name}</td>
                  <td style={cell}>
                    <span style={{
                      background: "rgba(255,255,255,.07)", borderRadius: 6,
                      padding: "2px 9px", fontSize: 12,
                    }}>{l.type}</span>
                  </td>
                  <td style={{ ...cell, color: ACCENT, fontWeight: 700 }}>{l.discount}%</td>
                  <td style={cell}>{l.items}</td>
                  <td style={cell}>{l.assignedCustomers}</td>
                  <td style={cell}>{statusBadge(l.status)}</td>
                  <td style={{ ...cell, display: "flex", gap: 8, alignItems: "center" }}>
                    <button
                      onClick={() => handleToggle(l.id, l.status)}
                      style={{
                        padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                        border: `1px solid ${l.status === "ACTIVE" ? "#6b7280" : ACCENT}`,
                        background: "transparent",
                        color: l.status === "ACTIVE" ? "#9ca3af" : ACCENT,
                        cursor: "pointer",
                      }}
                    >
                      {l.status === "ACTIVE" ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDelete(l.id)}
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
            borderRadius: 16, padding: "32px 28px", width: 480, fontFamily: FONT,
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 20px", color: "var(--text-primary)" }}>
              New Price List
            </h2>

            {error && (
              <div style={{
                background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.3)",
                color: "#f87171", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16,
              }}>{error}</div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Name *</label>
                <input
                  style={inputStyle}
                  placeholder="e.g. Summer VIP Pricing"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                />
              </div>

              <div>
                <label style={labelStyle}>Type</label>
                <select
                  style={{ ...inputStyle, cursor: "pointer" }}
                  value={form.type}
                  onChange={(e) => setField("type", e.target.value as PriceListType)}
                >
                  {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Discount %</label>
                <input
                  type="number"
                  style={inputStyle}
                  placeholder="0"
                  min="0"
                  max="100"
                  step="0.1"
                  value={form.discount}
                  onChange={(e) => setField("discount", e.target.value)}
                />
              </div>

              <div>
                <label style={labelStyle}>Notes</label>
                <textarea
                  style={{ ...inputStyle, minHeight: 72, resize: "vertical" }}
                  placeholder="Optional notes…"
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
              <button
                onClick={() => { setShowModal(false); setForm(EMPTY_FORM); setError(""); }}
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
                {saving ? "Saving…" : "Create List"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
