"use client";

import { useState, useMemo } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const ff = "'Outfit','Inter',sans-serif";
const panelBg = "rgba(255,255,255,.03)";
const panelBorder = "rgba(255,255,255,.07)";
const inputBg = "rgba(15,23,42,.72)";
const ACCENT = "#38bdf8";

const emptyForm = {
  passengerName: "", passportNo: "", nationality: "", dob: "",
  issueDate: "", expiryDate: "", phone: "", notes: "",
};

function getPassportStatus(expiryDate: string): { label: string; color: string } {
  if (!expiryDate) return { label: "unknown", color: "#6b7280" };
  const expiry = new Date(expiryDate);
  const now = new Date();
  const daysLeft = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { label: "expired", color: "#f87171" };
  if (daysLeft <= 180) return { label: "expiring_soon", color: "#fbbf24" };
  return { label: "valid", color: "#34d399" };
}

export default function PassportDatabasePage() {
  const { records, loading, create, update, remove } = useBusinessRecords("travel_passport");

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const passports = useMemo(() => records.map(r => {
    const expiryDate = String(r.data?.expiryDate || r.date || "").slice(0, 10);
    const { label: statusLabel, color: statusColor } = getPassportStatus(expiryDate);
    return {
      id: r.id,
      passengerName: String(r.data?.passengerName || r.title || ""),
      passportNo: String(r.data?.passportNo || ""),
      nationality: String(r.data?.nationality || ""),
      dob: String(r.data?.dob || "").slice(0, 10),
      issueDate: String(r.data?.issueDate || "").slice(0, 10),
      expiryDate,
      phone: String(r.data?.phone || ""),
      notes: String(r.data?.notes || ""),
      statusLabel,
      statusColor,
    };
  }), [records]);

  const filtered = useMemo(() => passports.filter(p => {
    const matchSearch = !search || [p.passengerName, p.passportNo, p.nationality, p.phone]
      .some(v => v.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === "all" || p.statusLabel === statusFilter;
    return matchSearch && matchStatus;
  }), [passports, search, statusFilter]);

  const totalValid = passports.filter(p => p.statusLabel === "valid").length;
  const totalExpiring = passports.filter(p => p.statusLabel === "expiring_soon").length;
  const totalExpired = passports.filter(p => p.statusLabel === "expired").length;

  function openAdd() {
    setEditId(null); setForm(emptyForm); setFormError(""); setShowModal(true);
  }

  function openEdit(p: typeof passports[0]) {
    setEditId(p.id);
    setForm({ passengerName: p.passengerName, passportNo: p.passportNo, nationality: p.nationality, dob: p.dob, issueDate: p.issueDate, expiryDate: p.expiryDate, phone: p.phone, notes: p.notes });
    setFormError(""); setShowModal(true);
  }

  async function handleSave() {
    if (!form.passengerName.trim()) { setFormError("Passenger name is required."); return; }
    if (!form.passportNo.trim()) { setFormError("Passport number is required."); return; }
    if (!form.expiryDate) { setFormError("Expiry date is required."); return; }
    const duplicate = passports.find(p => p.passportNo.toLowerCase() === form.passportNo.trim().toLowerCase() && p.id !== editId);
    if (duplicate) { setFormError("This passport number already exists."); return; }
    setSaving(true); setFormError("");
    try {
      const payload = {
        title: form.passengerName.trim(),
        date: form.expiryDate,
        data: { passengerName: form.passengerName.trim(), passportNo: form.passportNo.trim().toUpperCase(), nationality: form.nationality.trim(), dob: form.dob || null, issueDate: form.issueDate || null, expiryDate: form.expiryDate, phone: form.phone.trim(), notes: form.notes.trim() },
      };
      if (editId) {
        await update(editId, payload);
      } else {
        await create({ ...payload, status: "active" });
      }
      setShowModal(false); setForm(emptyForm);
    } catch { setFormError("Something went wrong. Please try again."); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await remove(id); setDeleteId(null);
  }

  const inp: React.CSSProperties = { width: "100%", background: inputBg, border: `1px solid ${panelBorder}`, borderRadius: 10, padding: "10px 12px", color: "#fff", fontSize: 13, boxSizing: "border-box", fontFamily: ff };

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#e2e8f0" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800, color: "white" }}>🛂 Passenger Passport Database</h1>
          <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,.45)" }}>Store and track passenger passports, expiry dates, and nationality.</p>
        </div>
        <button onClick={openAdd} style={{ background: ACCENT, color: "#0f172a", border: "none", borderRadius: 12, padding: "11px 20px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>+ Add Passport</button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Passports", value: passports.length, color: ACCENT },
          { label: "Valid", value: totalValid, color: "#34d399" },
          { label: "Expiring Soon", value: totalExpiring, color: "#fbbf24" },
          { label: "Expired", value: totalExpired, color: "#f87171" },
        ].map(s => (
          <div key={s.label} style={{ background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: 14, padding: "16px 20px" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search name, passport no, nationality..." style={{ ...inp, maxWidth: 340 }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inp, width: "auto", minWidth: 160 }}>
          <option value="all">All Statuses</option>
          <option value="valid">Valid</option>
          <option value="expiring_soon">Expiring Soon</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: 16, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.4)" }}>Loading...</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(56,189,248,.04)" }}>
                  {["Passenger", "Passport No", "Nationality", "DOB", "Issue Date", "Expiry Date", "Phone", "Status", "Actions"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "12px 14px", fontSize: 11, color: "rgba(255,255,255,.45)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", borderBottom: `1px solid ${panelBorder}`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} style={{ borderBottom: `1px solid rgba(255,255,255,.04)` }}>
                    <td style={{ padding: "13px 14px", fontWeight: 600, color: "#fff" }}>{p.passengerName}</td>
                    <td style={{ padding: "13px 14px", fontFamily: "monospace", fontSize: 13, color: ACCENT, letterSpacing: ".05em" }}>{p.passportNo}</td>
                    <td style={{ padding: "13px 14px", fontSize: 13, color: "rgba(255,255,255,.7)" }}>{p.nationality || "—"}</td>
                    <td style={{ padding: "13px 14px", fontSize: 12, color: "rgba(255,255,255,.5)" }}>{p.dob || "—"}</td>
                    <td style={{ padding: "13px 14px", fontSize: 12, color: "rgba(255,255,255,.5)" }}>{p.issueDate || "—"}</td>
                    <td style={{ padding: "13px 14px", fontSize: 13, fontWeight: 600, color: p.statusColor }}>{p.expiryDate || "—"}</td>
                    <td style={{ padding: "13px 14px", fontSize: 12, color: "rgba(255,255,255,.5)" }}>{p.phone || "—"}</td>
                    <td style={{ padding: "13px 14px" }}>
                      <span style={{ background: `${p.statusColor}18`, color: p.statusColor, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{p.statusLabel}</span>
                    </td>
                    <td style={{ padding: "13px 14px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => openEdit(p)} style={{ background: "rgba(99,102,241,.15)", color: "#818cf8", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Edit</button>
                        <button onClick={() => setDeleteId(p.id)} style={{ background: "rgba(239,68,68,.1)", color: "#f87171", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)", fontSize: 13 }}>
                    {search || statusFilter !== "all" ? "No passports match your filters." : "No passports yet. Add the first one."}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 20 }}>
          <div style={{ background: "#0f172a", border: `1px solid ${panelBorder}`, borderRadius: 18, padding: 28, width: "100%", maxWidth: 560, fontFamily: ff, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#fff" }}>{editId ? "✏️ Edit Passport" : "🛂 Add Passport"}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.5)", fontSize: 22, cursor: "pointer" }}>✕</button>
            </div>
            {formError && <div style={{ marginBottom: 14, padding: "9px 12px", borderRadius: 8, background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.25)", color: "#fca5a5", fontSize: 12 }}>{formError}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                { label: "Passenger Name *", key: "passengerName", span: 2 },
                { label: "Passport Number *", key: "passportNo", span: 1 },
                { label: "Nationality", key: "nationality", span: 1 },
                { label: "Date of Birth", key: "dob", type: "date", span: 1 },
                { label: "Issue Date", key: "issueDate", type: "date", span: 1 },
                { label: "Expiry Date *", key: "expiryDate", type: "date", span: 1 },
                { label: "Phone", key: "phone", span: 1 },
                { label: "Notes", key: "notes", span: 2 },
              ].map(f => (
                <div key={f.key} style={{ gridColumn: f.span === 2 ? "span 2" : undefined }}>
                  <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,.45)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>{f.label}</label>
                  <input
                    type={f.type || "text"}
                    value={(form as Record<string, string>)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={inp}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 22 }}>
              <button onClick={() => setShowModal(false)} style={{ background: "transparent", border: `1px solid ${panelBorder}`, color: "rgba(255,255,255,.6)", borderRadius: 10, padding: "10px 20px", fontSize: 13, cursor: "pointer", fontFamily: ff }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ background: ACCENT, color: "#0f172a", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 13, fontWeight: 800, cursor: "pointer", opacity: saving ? 0.7 : 1, fontFamily: ff }}>
                {saving ? "Saving…" : editId ? "Save Changes" : "Add Passport"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ background: "#0f172a", border: `1px solid ${panelBorder}`, borderRadius: 16, padding: 28, width: 360, textAlign: "center", fontFamily: ff }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🗑️</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px", color: "#fff" }}>Delete Passport Record?</h3>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,.45)", margin: "0 0 22px", lineHeight: 1.6 }}>This will permanently delete this passport record.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setDeleteId(null)} style={{ background: "transparent", border: `1px solid ${panelBorder}`, color: "rgba(255,255,255,.6)", borderRadius: 10, padding: "10px 20px", fontSize: 13, cursor: "pointer", fontFamily: ff }}>Cancel</button>
              <button onClick={() => handleDelete(deleteId)} style={{ background: "rgba(239,68,68,.15)", color: "#f87171", border: "1px solid rgba(239,68,68,.3)", borderRadius: 10, padding: "10px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: ff }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
