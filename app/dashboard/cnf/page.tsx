"use client";
import { confirmToast } from "@/lib/toast-feedback";
import toast from "react-hot-toast";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { getCurrentUser } from "@/lib/auth";
import { useResponsive } from "@/hooks/useResponsive";

// ── Design tokens ──────────────────────────────────────────────────────────────
const FONT   = "'Outfit','Inter',sans-serif";
const BG     = "rgba(255,255,255,.035)";
const BORDER = "rgba(255,255,255,.08)";
const MUTED  = "rgba(255,255,255,.5)";
const ACCENT = "#f472b6";

type JobStatus = "DRAFT" | "ACTIVE" | "CUSTOMS_PENDING" | "CUSTOMS_CLEARED" | "DELIVERED" | "INVOICED" | "CLOSED";
type TransportMode = "Sea" | "Air" | "Land";

const STATUS_META: Record<JobStatus, { label: string; color: string; bg: string }> = {
  DRAFT:            { label: "Draft",            color: "#6b7280", bg: "rgba(107,114,128,.15)" },
  ACTIVE:           { label: "Active",           color: "#38bdf8", bg: "rgba(56,189,248,.15)"  },
  CUSTOMS_PENDING:  { label: "Customs Pending",  color: "#fbbf24", bg: "rgba(251,191,36,.15)"  },
  CUSTOMS_CLEARED:  { label: "Customs Cleared",  color: "#34d399", bg: "rgba(52,211,153,.15)"  },
  DELIVERED:        { label: "Delivered",        color: "#a78bfa", bg: "rgba(167,139,250,.15)" },
  INVOICED:         { label: "Invoiced",         color: "#f472b6", bg: "rgba(244,114,182,.15)" },
  CLOSED:           { label: "Closed",           color: "#4ade80", bg: "rgba(74,222,128,.15)"  },
};

const MODES: TransportMode[] = ["Sea", "Air", "Land"];
const MODE_ICON: Record<TransportMode, string> = { Sea: "🚢", Air: "✈️", Land: "🚛" };
const STATUSES = Object.keys(STATUS_META) as JobStatus[];

interface JobForm {
  clientName: string;
  clientId: string;
  shipmentRef: string;
  blAwbNo: string;
  portOfEntry: string;
  mode: TransportMode;
  description: string;
  customsDuty: string;
  freightCharge: string;
  handlingFee: string;
  storageFee: string;
  otherExpenses: string;
  serviceCharge: string;
  status: JobStatus;
  etaDate: string;
  date: string;
  notes: string;
}

const EMPTY: JobForm = {
  clientName: "", clientId: "", shipmentRef: "", blAwbNo: "",
  portOfEntry: "", mode: "Sea", description: "",
  customsDuty: "0", freightCharge: "0", handlingFee: "0",
  storageFee: "0", otherExpenses: "0", serviceCharge: "0",
  status: "DRAFT", etaDate: "", date: new Date().toISOString().slice(0, 10), notes: "",
};

function n(v: string | number) { return Number(v) || 0; }
function fmt(v: number) { return `Rs. ${v.toLocaleString()}`; }
function todayIso() { return new Date().toISOString().slice(0, 10); }

const inp: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,.05)",
  border: `1px solid ${BORDER}`, borderRadius: 8, padding: "9px 12px",
  color: "#f1f5f9", fontFamily: FONT, fontSize: 13, outline: "none",
};
const lbl: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 5,
};

interface Customer { id: string; name: string; }

export default function CnfPage() {
  const { isMobile } = useResponsive();
  const user = getCurrentUser();
  const { records, loading, create, update, remove } = useBusinessRecords("cnf_job");

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [form, setForm]           = useState<JobForm>({ ...EMPTY });
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | JobStatus>("ALL");
  const [customers, setCustomers] = useState<Customer[]>([]);

  const headers = useMemo(() => ({
    "x-user-role":  user?.role  || "ADMIN",
    "x-user-id":    user?.id    || "",
    "x-company-id": user?.companyId || "",
  }), [user]);

  useEffect(() => {
    fetch("/api/accounts", { headers })
      .then(r => r.ok ? r.json() : [])
      .then(d => {
        const list = Array.isArray(d) ? d : d.accounts || [];
        setCustomers(list.filter((a: { partyType?: string }) => a.partyType === "CUSTOMER").map((a: { id: string; name: string }) => ({ id: a.id, name: a.name })));
      }).catch(() => {});
  }, []);

  const jobs = useMemo(() => records.map(r => {
    const d = (r.data || {}) as Record<string, unknown>;
    const totalExpenses = n(d.customsDuty) + n(d.freightCharge) + n(d.handlingFee) + n(d.storageFee) + n(d.otherExpenses);
    const billed = n(r.amount || 0);
    return {
      id: r.id,
      jobNo: r.title,
      clientName:   String(d.clientName   || ""),
      clientId:     String(d.clientId     || ""),
      shipmentRef:  String(d.shipmentRef  || ""),
      blAwbNo:      String(d.blAwbNo      || ""),
      portOfEntry:  String(d.portOfEntry  || ""),
      mode:         String(d.mode         || "Sea") as TransportMode,
      description:  String(d.description  || ""),
      customsDuty:  n(d.customsDuty),
      freightCharge:n(d.freightCharge),
      handlingFee:  n(d.handlingFee),
      storageFee:   n(d.storageFee),
      otherExpenses:n(d.otherExpenses),
      serviceCharge:n(d.serviceCharge),
      totalExpenses,
      billed,
      profit: billed - totalExpenses,
      status: (r.status || "DRAFT") as JobStatus,
      date:   r.date?.toString().slice(0, 10) || "",
      etaDate:String(d.etaDate || ""),
      notes:  String(d.notes   || ""),
    };
  }), [records]);

  const filtered = useMemo(() => {
    let list = jobs;
    if (statusFilter !== "ALL") list = list.filter(j => j.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(j =>
        j.jobNo.toLowerCase().includes(q) ||
        j.clientName.toLowerCase().includes(q) ||
        j.shipmentRef.toLowerCase().includes(q) ||
        j.blAwbNo.toLowerCase().includes(q)
      );
    }
    return list;
  }, [jobs, search, statusFilter]);

  const kpis = useMemo(() => ({
    total:   jobs.length,
    active:  jobs.filter(j => !["INVOICED","CLOSED"].includes(j.status)).length,
    customs: jobs.filter(j => j.status === "CUSTOMS_PENDING").length,
    unbilled:jobs.filter(j => j.status === "DELIVERED").length,
    revenue: jobs.reduce((s, j) => s + j.billed, 0),
  }), [jobs]);

  function sf<K extends keyof JobForm>(k: K, v: JobForm[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function openNew() {
    setEditId(null);
    setForm({ ...EMPTY, date: todayIso() });
    setError("");
    setShowModal(true);
  }

  function openEdit(j: typeof jobs[number]) {
    setEditId(j.id);
    setForm({
      clientName: j.clientName, clientId: j.clientId,
      shipmentRef: j.shipmentRef, blAwbNo: j.blAwbNo,
      portOfEntry: j.portOfEntry, mode: j.mode,
      description: j.description,
      customsDuty: String(j.customsDuty), freightCharge: String(j.freightCharge),
      handlingFee: String(j.handlingFee), storageFee: String(j.storageFee),
      otherExpenses: String(j.otherExpenses), serviceCharge: String(j.serviceCharge),
      status: j.status, etaDate: j.etaDate, date: j.date || todayIso(), notes: j.notes,
    });
    setError("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditId(null);
    setForm({ ...EMPTY });
    setError("");
  }

  // Next sequential job number
  function nextJobNo() {
    const nums = jobs.map(j => { const m = j.jobNo.match(/CNF-(\d+)/); return m ? parseInt(m[1]) : 0; });
    return "CNF-" + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(5, "0");
  }

  const totalBilled = n(form.serviceCharge) +
    n(form.customsDuty) + n(form.freightCharge) +
    n(form.handlingFee) + n(form.storageFee) + n(form.otherExpenses);

  async function handleSave() {
    setError("");
    if (!form.clientName.trim()) { setError("Client name is required."); return; }
    if (!form.date)              { setError("Job date is required."); return; }

    const jobNo = editId ? jobs.find(j => j.id === editId)?.jobNo || nextJobNo() : nextJobNo();
    const wasInvoiced = editId ? jobs.find(j => j.id === editId)?.status === "INVOICED" : false;

    const payload = {
      title: jobNo,
      status: form.status,
      amount: totalBilled,
      date: form.date,
      data: {
        clientName:    form.clientName.trim(),
        clientId:      form.clientId,
        shipmentRef:   form.shipmentRef.trim(),
        blAwbNo:       form.blAwbNo.trim(),
        portOfEntry:   form.portOfEntry.trim(),
        mode:          form.mode,
        description:   form.description.trim(),
        customsDuty:   n(form.customsDuty),
        freightCharge: n(form.freightCharge),
        handlingFee:   n(form.handlingFee),
        storageFee:    n(form.storageFee),
        otherExpenses: n(form.otherExpenses),
        serviceCharge: n(form.serviceCharge),
        etaDate:       form.etaDate,
        notes:         form.notes.trim(),
      },
    };

    setSaving(true);
    try {
      if (editId) {
        await update(editId, payload);
      } else {
        await create(payload);
      }

      // Non-fatal: create Sales Invoice when job moves to INVOICED
      if (form.status === "INVOICED" && !wasInvoiced && totalBilled > 0 && form.clientId) {
        fetch("/api/sales-invoice", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({
            customerId: form.clientId,
            invoiceNo: `SI-${jobNo}`,
            date: form.date,
            items: [
              { description: `C&F Services — ${jobNo} (${form.shipmentRef || form.blAwbNo || "shipment"})`, qty: 1, rate: totalBilled, amount: totalBilled },
            ],
            total: totalBilled,
            discount: 0,
            freight: 0,
          }),
        }).catch(() => {});
        toast.success("Sales invoice created for this job.");
      }

      closeModal();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, jobNo: string) {
    if (!await confirmToast(`Delete job ${jobNo}?`)) return;
    try { await remove(id); } catch {}
  }

  async function quickStatus(id: string, status: JobStatus) {
    try { await update(id, { status }); } catch {}
  }

  const NEXT_STATUS: Partial<Record<JobStatus, JobStatus>> = {
    DRAFT: "ACTIVE", ACTIVE: "CUSTOMS_PENDING",
    CUSTOMS_PENDING: "CUSTOMS_CLEARED", CUSTOMS_CLEARED: "DELIVERED",
    DELIVERED: "INVOICED", INVOICED: "CLOSED",
  };

  return (
    <div style={{ minHeight: "100vh", padding: isMobile ? "15px 14px" : "28px 32px", color: "#f1f5f9", fontFamily: FONT }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: ACCENT, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 6 }}>
            Clearing &amp; Forwarding
          </div>
          <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 900 }}>C&amp;F Control Center</h1>
          <p style={{ margin: 0, fontSize: 13, color: MUTED }}>Job file management, customs tracking, and client billing for your C&amp;F operations.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "Customs",   href: "/dashboard/trade/customs"   },
            { label: "Freight",   href: "/dashboard/trade/freight"   },
            { label: "Shipments", href: "/dashboard/trade/shipments" },
            { label: "Sales Invoice", href: "/dashboard/sales-invoice" },
            { label: "Accounts Payable", href: "/dashboard/accounts?type=SUPPLIER" },
          ].map(item => (
            <Link prefetch={false} key={item.href} href={item.href}
              style={{ padding: "9px 14px", borderRadius: 10, border: `1px solid ${BORDER}`, background: BG, color: "#7dd3fc", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>
              {item.label}
            </Link>
          ))}
          <button onClick={openNew}
            style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: ACCENT, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            + New Job File
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 14, marginBottom: 26 }}>
        {[
          { label: "Total Jobs",       value: kpis.total,               color: ACCENT },
          { label: "Active Jobs",      value: kpis.active,              color: "#38bdf8" },
          { label: "Customs Pending",  value: kpis.customs,             color: "#fbbf24" },
          { label: "Unbilled Jobs",    value: kpis.unbilled,            color: "#f87171" },
          { label: "Total Billed",     value: fmt(kpis.revenue),        color: "#34d399" },
        ].map(card => (
          <div key={card.label} style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 16, padding: isMobile ? "12px 10px" : "18px 20px" }}>
            <div style={{ fontSize: 12, color: MUTED, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>{card.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search job no, client, shipment ref, BL/AWB…"
          style={{ ...inp, flex: 1, minWidth: 260 }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as "ALL" | JobStatus)}
          style={{ ...inp, width: 190 }}>
          <option value="ALL">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT }}>
          <thead>
            <tr>
              {["Job No","Client","Shipment Ref","Mode","Port","Total Billed","Profit","Date","Status","Actions"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "12px 14px", fontSize: 11, color: MUTED, borderBottom: `1px solid ${BORDER}`, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={10} style={{ padding: 40, textAlign: "center", color: MUTED }}>Loading…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={10} style={{ padding: 40, textAlign: "center", color: MUTED }}>
                {jobs.length === 0 ? "No job files yet. Create your first job with + New Job File." : "No jobs match the current filters."}
              </td></tr>
            )}
            {filtered.map(j => {
              const sm = STATUS_META[j.status];
              const next = NEXT_STATUS[j.status];
              return (
                <tr key={j.id}>
                  <td style={{ padding: "13px 14px", borderBottom: `1px solid ${BORDER}`, fontWeight: 700, color: ACCENT }}>{j.jobNo}</td>
                  <td style={{ padding: "13px 14px", borderBottom: `1px solid ${BORDER}`, fontWeight: 600 }}>{j.clientName || "—"}</td>
                  <td style={{ padding: "13px 14px", borderBottom: `1px solid ${BORDER}`, fontSize: 12, color: MUTED }}>{j.shipmentRef || j.blAwbNo || "—"}</td>
                  <td style={{ padding: "13px 14px", borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>{MODE_ICON[j.mode]} {j.mode}</td>
                  <td style={{ padding: "13px 14px", borderBottom: `1px solid ${BORDER}`, fontSize: 12, color: MUTED }}>{j.portOfEntry || "—"}</td>
                  <td style={{ padding: "13px 14px", borderBottom: `1px solid ${BORDER}`, color: "#34d399", fontWeight: 700 }}>{fmt(j.billed)}</td>
                  <td style={{ padding: "13px 14px", borderBottom: `1px solid ${BORDER}`, color: j.profit >= 0 ? "#4ade80" : "#f87171", fontWeight: 700 }}>{fmt(j.profit)}</td>
                  <td style={{ padding: "13px 14px", borderBottom: `1px solid ${BORDER}`, fontSize: 12, color: MUTED }}>{j.date || "—"}</td>
                  <td style={{ padding: "13px 14px", borderBottom: `1px solid ${BORDER}` }}>
                    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: sm.bg, color: sm.color }}>{sm.label}</span>
                  </td>
                  <td style={{ padding: "13px 14px", borderBottom: `1px solid ${BORDER}` }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button onClick={() => openEdit(j)}
                        style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, border: `1px solid ${BORDER}`, background: "transparent", color: "#a5b4fc", cursor: "pointer" }}>
                        Edit
                      </button>
                      {next && (
                        <button onClick={() => void quickStatus(j.id, next)}
                          style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, border: `1px solid ${STATUS_META[next].color}55`, background: "transparent", color: STATUS_META[next].color, cursor: "pointer" }}>
                          → {STATUS_META[next].label}
                        </button>
                      )}
                      <button onClick={() => void handleDelete(j.id, j.jobNo)}
                        style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, border: "1px solid rgba(239,68,68,.3)", background: "transparent", color: "#f87171", cursor: "pointer" }}>
                        Del
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#161b27", border: `1px solid ${BORDER}`, borderRadius: 18, padding: 32, width: "100%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto", fontFamily: FONT }}>
            <h2 style={{ margin: "0 0 22px", fontSize: 18, fontWeight: 800 }}>{editId ? "Edit Job File" : "New Job File"}</h2>

            {error && (
              <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.3)", color: "#f87171", fontSize: 13 }}>{error}</div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {/* Client */}
              <div style={{ gridColumn: "span 2" }}>
                <label style={lbl}>Client *</label>
                <select style={inp} value={form.clientId}
                  onChange={e => {
                    const c = customers.find(x => x.id === e.target.value);
                    sf("clientId", e.target.value);
                    sf("clientName", c?.name || "");
                  }}>
                  <option value="">— Select Client —</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {!form.clientId && (
                  <input style={{ ...inp, marginTop: 6 }} placeholder="Or type client name manually"
                    value={form.clientName} onChange={e => sf("clientName", e.target.value)} />
                )}
              </div>

              {/* Shipment details */}
              <div>
                <label style={lbl}>Shipment Reference</label>
                <input style={inp} value={form.shipmentRef} onChange={e => sf("shipmentRef", e.target.value)} placeholder="e.g. SHP-2025-001" />
              </div>
              <div>
                <label style={lbl}>BL / AWB Number</label>
                <input style={inp} value={form.blAwbNo} onChange={e => sf("blAwbNo", e.target.value)} placeholder="e.g. MAEU123456789" />
              </div>
              <div>
                <label style={lbl}>Mode of Transport</label>
                <select style={inp} value={form.mode} onChange={e => sf("mode", e.target.value as TransportMode)}>
                  {MODES.map(m => <option key={m} value={m}>{MODE_ICON[m]} {m}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Port of Entry / Exit</label>
                <input style={inp} value={form.portOfEntry} onChange={e => sf("portOfEntry", e.target.value)} placeholder="e.g. Karachi Port" />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={lbl}>Cargo Description</label>
                <input style={inp} value={form.description} onChange={e => sf("description", e.target.value)} placeholder="e.g. 20 FCL Steel Pipes" />
              </div>

              {/* Dates */}
              <div>
                <label style={lbl}>Job Date *</label>
                <input type="date" style={inp} value={form.date} onChange={e => sf("date", e.target.value)} />
              </div>
              <div>
                <label style={lbl}>ETA / Clearance Date</label>
                <input type="date" style={inp} value={form.etaDate} onChange={e => sf("etaDate", e.target.value)} />
              </div>

              {/* Expenses */}
              <div style={{ gridColumn: "span 2" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#fbbf24", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10, marginTop: 4 }}>
                  Expenses (Costs You Incur)
                </div>
              </div>
              {[
                ["Customs Duty",   "customsDuty"],
                ["Freight Charge", "freightCharge"],
                ["Handling Fee",   "handlingFee"],
                ["Storage Fee",    "storageFee"],
                ["Other Expenses", "otherExpenses"],
              ].map(([label, key]) => (
                <div key={key}>
                  <label style={lbl}>{label}</label>
                  <input type="number" min="0" style={inp} value={form[key as keyof JobForm]}
                    onChange={e => sf(key as keyof JobForm, e.target.value)} />
                </div>
              ))}

              {/* Revenue */}
              <div style={{ gridColumn: "span 2" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#34d399", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10, marginTop: 4 }}>
                  Your Service Charge (Revenue)
                </div>
              </div>
              <div>
                <label style={lbl}>Service / Agency Fee</label>
                <input type="number" min="0" style={inp} value={form.serviceCharge}
                  onChange={e => sf("serviceCharge", e.target.value)} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                <div style={{ padding: "9px 14px", borderRadius: 8, background: "rgba(52,211,153,.1)", border: "1px solid rgba(52,211,153,.25)", fontSize: 13 }}>
                  <span style={{ color: MUTED }}>Total Billed to Client: </span>
                  <span style={{ fontWeight: 800, color: "#34d399" }}>{fmt(totalBilled)}</span>
                </div>
              </div>

              {/* Status */}
              <div>
                <label style={lbl}>Status</label>
                <select style={inp} value={form.status} onChange={e => sf("status", e.target.value as JobStatus)}>
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Notes</label>
                <input style={inp} value={form.notes} onChange={e => sf("notes", e.target.value)} placeholder="Internal notes…" />
              </div>
            </div>

            {form.status === "INVOICED" && form.clientId && (
              <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 8, background: "rgba(244,114,182,.08)", border: "1px solid rgba(244,114,182,.25)", fontSize: 12, color: "#f9a8d4" }}>
                A Sales Invoice will be auto-created for {form.clientName} when you save.
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button onClick={handleSave} disabled={saving}
                style={{ flex: 1, padding: "11px 0", borderRadius: 9, border: "none", background: saving ? "#9d2d6a" : ACCENT, color: "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? .75 : 1 }}>
                {saving ? "Saving…" : editId ? "Update Job" : "Create Job"}
              </button>
              <button onClick={closeModal}
                style={{ padding: "11px 24px", borderRadius: 9, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontSize: 14, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
