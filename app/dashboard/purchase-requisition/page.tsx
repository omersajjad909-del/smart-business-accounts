"use client";
import { useState, useMemo } from "react";
import { useBusinessRecords, BusinessRecord } from "@/lib/useBusinessRecords";
import DateInput from "@/app/dashboard/reports/_components/DateInput";
import { useResponsive } from "@/hooks/useResponsive";

// ─── Types ────────────────────────────────────────────────────────────────────

type PRStatus   = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "ORDERED";
type PRPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface PRItem { itemName: string; qty: number | ""; unit: string; estimatedCost: number | ""; description: string; }

interface PurchaseRequisitionData {
  prNo: string; date: string; requiredBy: string; requestedBy: string; department: string;
  priority: PRPriority; purpose: string; items: PRItem[]; notes: string;
}

interface PurchaseRequisitionRecord extends PurchaseRequisitionData {
  id: string; status: PRStatus; createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_META: Record<PRStatus, { label: string; color: string; bg: string; border: string }> = {
  DRAFT:   { label: "Draft",    color: "#94a3b8", bg: "rgba(148,163,184,.12)", border: "rgba(148,163,184,.35)" },
  PENDING: { label: "Pending",  color: "#fbbf24", bg: "rgba(251,191,36,.12)",  border: "rgba(251,191,36,.35)"  },
  APPROVED:{ label: "Approved", color: "#4ade80", bg: "rgba(74,222,128,.12)",  border: "rgba(74,222,128,.35)"  },
  REJECTED:{ label: "Rejected", color: "#f87171", bg: "rgba(248,113,113,.12)", border: "rgba(248,113,113,.35)" },
  ORDERED: { label: "Ordered",  color: "#60a5fa", bg: "rgba(96,165,250,.12)",  border: "rgba(96,165,250,.35)"  },
};

const PRIORITY_META: Record<PRPriority, { label: string; color: string; bg: string; border: string }> = {
  LOW:    { label: "Low",    color: "#94a3b8", bg: "rgba(148,163,184,.12)", border: "rgba(148,163,184,.35)" },
  MEDIUM: { label: "Medium", color: "#60a5fa", bg: "rgba(96,165,250,.12)",  border: "rgba(96,165,250,.35)"  },
  HIGH:   { label: "High",   color: "#fbbf24", bg: "rgba(251,191,36,.12)",  border: "rgba(251,191,36,.35)"  },
  URGENT: { label: "Urgent", color: "#f87171", bg: "rgba(248,113,113,.12)", border: "rgba(248,113,113,.35)" },
};

const DEPARTMENTS = ["Procurement", "Operations", "Sales", "Finance", "IT", "HR", "Warehouse", "Admin", "Other"];
const FONT = "'Outfit','Inter',sans-serif";
const ACCENT = "#6366f1";

const s = {
  page:  { fontFamily: FONT, color: "var(--text-primary)", padding: isMobile ? "15px 11px" : "28px 24px", minHeight: "100vh", background: "var(--app-bg)" },
  panel: { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14 },
  inp:   { background: "rgba(255,255,255,.05)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 13px", color: "var(--text-primary)", fontFamily: FONT, fontSize: 13, width: "100%", boxSizing: "border-box" as const, outline: "none" },
  label: { fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5, fontWeight: 500 } as React.CSSProperties,
  btn:   (bg: string, sm?: boolean) => ({ background: bg, border: "none", borderRadius: 8, padding: sm ? "7px 14px" : "10px 22px", color: "#fff", fontFamily: FONT, cursor: "pointer", fontSize: sm ? 12 : 13, fontWeight: 600, lineHeight: 1 } as React.CSSProperties),
  badge: (m: { color: string; bg: string; border: string }) => ({ background: m.bg, color: m.color, border: `1px solid ${m.border}`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" as const, display: "inline-block" }),
  th:    { padding: "11px 13px", textAlign: "left" as const, fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em", borderBottom: "1px solid var(--border)" },
  td:    { padding: "12px 13px", fontSize: 13, borderBottom: "1px solid var(--border)", verticalAlign: "middle" as const },
};

const todayIso = () => new Date().toISOString().split("T")[0];
const genPrNo = () => `PR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
const BLANK_ITEM: PRItem = { itemName: "", qty: "", unit: "PCS", estimatedCost: "", description: "" };
const BLANK_FORM = { prNo: genPrNo(), date: todayIso(), requiredBy: "", requestedBy: "", department: "Procurement", priority: "MEDIUM" as PRPriority, purpose: "", items: [{ ...BLANK_ITEM }], notes: "", status: "DRAFT" as PRStatus };

function mapRecord(r: BusinessRecord): PurchaseRequisitionRecord {
  const d = (r.data ?? {}) as Partial<PurchaseRequisitionData>;
  return {
    id: r.id, status: (r.status as PRStatus) ?? "DRAFT", createdAt: r.createdAt,
    prNo: d.prNo ?? r.title ?? "", date: d.date ?? r.date ?? "",
    requiredBy: d.requiredBy ?? "", requestedBy: d.requestedBy ?? "",
    department: d.department ?? "", priority: (d.priority as PRPriority) ?? "MEDIUM",
    purpose: d.purpose ?? "", items: Array.isArray(d.items) ? d.items : [{ ...BLANK_ITEM }],
    notes: d.notes ?? "",
  };
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PurchaseRequisitionPage() {
  const { isMobile } = useResponsive();
  const { records, loading, create, update, remove } = useBusinessRecords("purchase_requisition");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<PRStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");

  const requisitions = useMemo(() => records.map(mapRecord), [records]);

  const filtered = useMemo(() => {
    let list = filterStatus === "ALL" ? requisitions : requisitions.filter(r => r.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => r.prNo.toLowerCase().includes(q) || r.requestedBy.toLowerCase().includes(q) || r.department.toLowerCase().includes(q));
    }
    return list;
  }, [requisitions, filterStatus, search]);

  const sf = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));
  const addItem = () => setForm(p => ({ ...p, items: [...p.items, { ...BLANK_ITEM }] }));
  const removeItem = (i: number) => setForm(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));
  const setItem = (i: number, k: keyof PRItem, v: string | number) =>
    setForm(p => { const items = [...p.items]; items[i] = { ...items[i], [k]: v }; return { ...p, items }; });

  const openNew = () => { setForm({ ...BLANK_FORM, prNo: genPrNo() }); setEditing(null); setShowForm(true); };
  const openEdit = (r: PurchaseRequisitionRecord) => {
    setForm({ prNo: r.prNo, date: r.date, requiredBy: r.requiredBy, requestedBy: r.requestedBy, department: r.department, priority: r.priority, purpose: r.purpose, items: r.items.length ? r.items : [{ ...BLANK_ITEM }], notes: r.notes, status: r.status });
    setEditing(r.id); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.requestedBy.trim()) return alert("Requested By is required");
    if (form.items.some(i => !i.itemName.trim())) return alert("All items must have a name");
    setSaving(true);
    const payload = { category: "purchase_requisition", title: form.prNo, status: form.status, date: form.date, data: { ...form } };
    editing ? await update(editing, payload) : await create(payload);
    setSaving(false); setShowForm(false);
  };

  const estimatedTotal = (items: PRItem[]) => items.reduce((sum, i) => sum + Number(i.estimatedCost || 0) * Number(i.qty || 0), 0);

  const kpis = useMemo(() => ({
    total:    requisitions.length,
    pending:  requisitions.filter(r => r.status === "PENDING").length,
    approved: requisitions.filter(r => r.status === "APPROVED").length,
    urgent:   requisitions.filter(r => r.priority === "URGENT").length,
  }), [requisitions]);

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 5px" }}>Purchase Requisitions</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Internal purchase requests that flow into Purchase Orders upon approval.</p>
        </div>
        <button onClick={openNew} style={s.btn(ACCENT)}>+ New PR</button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total PRs",       value: kpis.total,    color: "#a78bfa" },
          { label: "Pending Approval",value: kpis.pending,  color: "#fbbf24" },
          { label: "Approved",        value: kpis.approved, color: "#4ade80" },
          { label: "Urgent",          value: kpis.urgent,   color: "#f87171" },
        ].map(k => (
          <div key={k.label} style={{ ...s.panel, padding: isMobile ? "12px 10px" : "18px 20px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ ...s.panel, padding: 24, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{editing ? "Edit" : "New"} Purchase Requisition</h2>
            <button onClick={() => setShowForm(false)} style={s.btn("rgba(255,255,255,.08)", true)}>✕ Close</button>
          </div>

          {/* Row 1 */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div><label style={s.label}>PR Number</label>
              <input value={form.prNo} onChange={e => sf("prNo", e.target.value)} style={s.inp} /></div>
            <div><label style={s.label}>Date</label>
              <DateInput value={form.date} onChange={v => sf("date", v)} style={s.inp} /></div>
            <div><label style={s.label}>Required By Date</label>
              <DateInput value={form.requiredBy} onChange={v => sf("requiredBy", v)} style={s.inp} /></div>
            <div><label style={s.label}>Priority</label>
              <select value={form.priority} onChange={e => sf("priority", e.target.value)} style={s.inp}>
                {(Object.keys(PRIORITY_META) as PRPriority[]).map(p => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
              </select></div>
          </div>

          {/* Row 2 */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div><label style={s.label}>Requested By *</label>
              <input value={form.requestedBy} onChange={e => sf("requestedBy", e.target.value)} style={s.inp} placeholder="Employee name" /></div>
            <div><label style={s.label}>Department</label>
              <select value={form.department} onChange={e => sf("department", e.target.value)} style={s.inp}>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select></div>
            <div><label style={s.label}>Status</label>
              <select value={form.status} onChange={e => sf("status", e.target.value)} style={s.inp}>
                {(Object.keys(STATUS_META) as PRStatus[]).map(st => <option key={st} value={st}>{STATUS_META[st].label}</option>)}
              </select></div>
          </div>

          {/* Purpose */}
          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>Purpose / Justification</label>
            <textarea value={form.purpose} onChange={e => sf("purpose", e.target.value)} style={{ ...s.inp, height: 64, resize: "vertical" }} placeholder="Why are these items needed?" />
          </div>

          {/* Items */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={{ ...s.label, margin: 0 }}>Requested Items</label>
              <button onClick={addItem} style={s.btn(ACCENT, true)}>+ Add Item</button>
            </div>
            <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,.03)" }}>
                    <th style={{ ...s.th, width: "30%" }}>Item / Product</th>
                    <th style={{ ...s.th, width: "12%" }}>Qty</th>
                    <th style={{ ...s.th, width: "10%" }}>Unit</th>
                    <th style={{ ...s.th, width: "18%" }}>Est. Cost / Unit</th>
                    <th style={{ ...s.th, width: "24%" }}>Description</th>
                    <th style={{ ...s.th, width: "6%" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((item, i) => (
                    <tr key={i}>
                      <td style={s.td}><input value={item.itemName} onChange={e => setItem(i, "itemName", e.target.value)} style={s.inp} placeholder="Product name" /></td>
                      <td style={s.td}><input type="number" min="0" value={item.qty} onChange={e => setItem(i, "qty", Number(e.target.value))} style={s.inp} /></td>
                      <td style={s.td}><input value={item.unit} onChange={e => setItem(i, "unit", e.target.value)} style={s.inp} placeholder="PCS" /></td>
                      <td style={s.td}><input type="number" min="0" value={item.estimatedCost} onChange={e => setItem(i, "estimatedCost", Number(e.target.value))} style={s.inp} placeholder="0" /></td>
                      <td style={s.td}><input value={item.description} onChange={e => setItem(i, "description", e.target.value)} style={s.inp} placeholder="Optional" /></td>
                      <td style={s.td}>{form.items.length > 1 && <button onClick={() => removeItem(i)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>×</button>}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} style={{ ...s.td, textAlign: "right" as const, color: "var(--text-muted)", fontSize: 12 }}>Estimated Total:</td>
                    <td style={{ ...s.td, fontWeight: 700 }}>{estimatedTotal(form.items).toLocaleString("en-PK", { maximumFractionDigits: 0 })}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={s.label}>Notes</label>
            <textarea value={form.notes} onChange={e => sf("notes", e.target.value)} style={{ ...s.inp, height: 56, resize: "vertical" }} placeholder="Additional notes for approver…" />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleSave} disabled={saving} style={s.btn(ACCENT)}>{saving ? "Saving…" : editing ? "Update PR" : "Submit PR"}</button>
            <button onClick={() => setShowForm(false)} style={s.btn("rgba(255,255,255,.08)")}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filter + Search */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        {(["ALL", ...Object.keys(STATUS_META)] as const).map(st => (
          <button key={st} onClick={() => setFilterStatus(st as PRStatus | "ALL")} style={{ background: filterStatus === st ? ACCENT : "rgba(255,255,255,.06)", border: `1px solid ${filterStatus === st ? ACCENT : "var(--border)"}`, borderRadius: 8, padding: "6px 14px", color: filterStatus === st ? "#fff" : "var(--text-muted)", fontFamily: FONT, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            {st === "ALL" ? "All" : STATUS_META[st as PRStatus].label}
          </button>
        ))}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search PR / requester / dept…" style={{ ...s.inp, width: 240, marginLeft: "auto" }} />
      </div>

      {/* Table */}
      <div style={s.panel}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>No purchase requisitions found.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,.03)" }}>
                <th style={s.th}>PR No</th>
                <th style={s.th}>Date</th>
                <th style={s.th}>Required By</th>
                <th style={s.th}>Requested By</th>
                <th style={s.th}>Department</th>
                <th style={s.th}>Items</th>
                <th style={s.th}>Est. Total</th>
                <th style={s.th}>Priority</th>
                <th style={s.th}>Status</th>
                <th style={{ ...s.th, textAlign: "right" as const }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const sMeta = STATUS_META[r.status] ?? STATUS_META.DRAFT;
                const pMeta = PRIORITY_META[r.priority] ?? PRIORITY_META.MEDIUM;
                const total = estimatedTotal(r.items);
                return (
                  <tr key={r.id}>
                    <td style={{ ...s.td, fontWeight: 700, color: ACCENT }}>{r.prNo}</td>
                    <td style={s.td}>{r.date ? new Date(r.date).toLocaleDateString("en-PK") : "—"}</td>
                    <td style={{ ...s.td, color: "var(--text-muted)" }}>{r.requiredBy ? new Date(r.requiredBy).toLocaleDateString("en-PK") : "—"}</td>
                    <td style={s.td}>{r.requestedBy}</td>
                    <td style={{ ...s.td, color: "var(--text-muted)" }}>{r.department}</td>
                    <td style={{ ...s.td, color: "var(--text-muted)" }}>{r.items.length}</td>
                    <td style={{ ...s.td, fontWeight: 600 }}>{total > 0 ? total.toLocaleString("en-PK", { maximumFractionDigits: 0 }) : "—"}</td>
                    <td style={s.td}><span style={s.badge(pMeta)}>{pMeta.label}</span></td>
                    <td style={s.td}><span style={s.badge(sMeta)}>{sMeta.label}</span></td>
                    <td style={{ ...s.td, textAlign: "right" as const }}>
                      <button onClick={() => openEdit(r)} style={{ ...s.btn("rgba(255,255,255,.08)", true), marginRight: 6 }}>Edit</button>
                      <button onClick={async () => { if (confirm("Delete this PR?")) await remove(r.id); }} style={s.btn("rgba(248,113,113,.15)", true)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
