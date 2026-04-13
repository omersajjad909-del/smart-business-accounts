"use client";
import { confirmToast, alertToast } from "@/lib/toast-feedback";
import { useState, useMemo } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

// ── Style constants ────────────────────────────────────────────────────────────
const FF = "'Outfit','Inter',sans-serif";
const BG = "rgba(255,255,255,0.03)";
const BD = "rgba(255,255,255,0.07)";
const MODAL_BG = "#12161f";

const inp: React.CSSProperties = {
  width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${BD}`,
  borderRadius: 8, padding: "9px 12px", color: "var(--text-primary)", fontFamily: FF, fontSize: 13,
  boxSizing: "border-box",
};
const sel: React.CSSProperties = { ...inp, background: "#161b27" };
const lbl: React.CSSProperties = { display: "block", fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 5, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" };
const card: React.CSSProperties = { background: BG, border: `1px solid ${BD}`, borderRadius: 12, padding: 20, fontFamily: FF };

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  DRAFT: "#6b7280",
  ISSUED: "#3b82f6",
  DOCUMENTS_PRESENTED: "#f59e0b",
  SETTLED: "#22c55e",
  EXPIRED: "#ef4444",
  CANCELLED: "#6b7280",
};
const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft", ISSUED: "Issued", DOCUMENTS_PRESENTED: "Docs Presented",
  SETTLED: "Settled", EXPIRED: "Expired", CANCELLED: "Cancelled",
};
const ALL_STATUSES = Object.keys(STATUS_LABELS);

const DOCS_LIST = [
  "Commercial Invoice", "Packing List", "BL / AWB",
  "Certificate of Origin", "Inspection Certificate",
];

const CURRENCIES = ["USD", "EUR", "GBP", "AED", "CNY", "JPY"];

// ── Helpers ────────────────────────────────────────────────────────────────────
function genRef(type: "LC" | "TT"): string {
  const yr = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return type === "LC" ? `LC-${yr}-${seq}` : `TT-${yr}-${seq}`;
}

function daysUntil(dateStr: string): number {
  if (!dateStr) return Infinity;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Empty form ─────────────────────────────────────────────────────────────────
interface LCForm {
  id?: string;
  type: "LC" | "TT";
  direction: "Import" | "Export";
  refNo: string;
  issuingBank: string;
  beneficiaryName: string;
  applicantName: string;
  amount: string;
  currency: string;
  issueDate: string;
  expiryDate: string;
  latestShipDate: string;
  presentationPeriod: string;
  paymentTerms: string;
  usanceDays: string;
  portLoading: string;
  portDischarge: string;
  goodsDesc: string;
  partialShipment: "Allowed" | "Not Allowed";
  transhipment: "Allowed" | "Not Allowed";
  docsRequired: string[];
  bankCharges: "Our Account" | "Beneficiary" | "Shared";
  notes: string;
  status: string;
}

const EMPTY: LCForm = {
  type: "LC", direction: "Import", refNo: "", issuingBank: "",
  beneficiaryName: "", applicantName: "", amount: "", currency: "USD",
  issueDate: "", expiryDate: "", latestShipDate: "", presentationPeriod: "21",
  paymentTerms: "Sight", usanceDays: "30", portLoading: "", portDischarge: "",
  goodsDesc: "", partialShipment: "Not Allowed", transhipment: "Not Allowed",
  docsRequired: ["Commercial Invoice", "Packing List", "BL / AWB"],
  bankCharges: "Our Account", notes: "", status: "DRAFT",
};

// ── Filter tabs ────────────────────────────────────────────────────────────────
const TABS = ["All", "LC", "TT", ...ALL_STATUSES];

// ── Main page ──────────────────────────────────────────────────────────────────
export default function LCPage() {
  const { records, loading, create, update, remove } = useBusinessRecords("lc_tt");

  const [tab, setTab] = useState("All");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<LCForm>({ ...EMPTY });
  const [formErr, setFormErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);

  // ── Parse records ──────────────────────────────────────────────────────────
  const items = useMemo(() => records.map(r => ({
    id: r.id,
    refNo:        (r.data?.refNo as string)           || r.title,
    type:         (r.data?.type as "LC" | "TT")       || "LC",
    direction:    (r.data?.direction as string)        || "Import",
    issuingBank:  (r.data?.issuingBank as string)      || "",
    beneficiaryName: (r.data?.beneficiaryName as string) || "",
    applicantName:(r.data?.applicantName as string)    || "",
    amount:       r.amount                             || 0,
    currency:     (r.data?.currency as string)         || "USD",
    issueDate:    r.date                               || (r.data?.issueDate as string) || "",
    expiryDate:   (r.data?.expiryDate as string)       || "",
    latestShipDate:(r.data?.latestShipDate as string)  || "",
    presentationPeriod: (r.data?.presentationPeriod as string) || "21",
    paymentTerms: (r.data?.paymentTerms as string)     || "Sight",
    usanceDays:   (r.data?.usanceDays as string)       || "30",
    portLoading:  (r.data?.portLoading as string)      || "",
    portDischarge:(r.data?.portDischarge as string)    || "",
    goodsDesc:    (r.data?.goodsDesc as string)        || "",
    partialShipment: (r.data?.partialShipment as string) || "Not Allowed",
    transhipment: (r.data?.transhipment as string)     || "Not Allowed",
    docsRequired: (r.data?.docsRequired as string[])   || [],
    bankCharges:  (r.data?.bankCharges as string)      || "Our Account",
    notes:        (r.data?.notes as string)            || "",
    status:       r.status                             || "DRAFT",
  })), [records]);

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const totalLCs    = items.filter(i => i.type === "LC").length;
  const activeLCs   = items.filter(i => i.type === "LC" && ["ISSUED", "DOCUMENTS_PRESENTED"].includes(i.status)).length;
  const ttCount     = items.filter(i => i.type === "TT").length;
  const totalValue  = items.reduce((s, i) => s + i.amount, 0);
  const expiringSoon = items.filter(i =>
    i.expiryDate && !["SETTLED", "EXPIRED", "CANCELLED"].includes(i.status) &&
    daysUntil(i.expiryDate) <= 30 && daysUntil(i.expiryDate) >= 0
  ).length;

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(i => {
      const matchTab =
        tab === "All" ? true :
        tab === "LC"  ? i.type === "LC" :
        tab === "TT"  ? i.type === "TT" :
        i.status === tab;
      const matchSearch = !q ||
        i.refNo.toLowerCase().includes(q) ||
        i.issuingBank.toLowerCase().includes(q) ||
        i.beneficiaryName.toLowerCase().includes(q) ||
        i.applicantName.toLowerCase().includes(q);
      return matchTab && matchSearch;
    });
  }, [items, tab, search]);

  const selectedItem = items.find(i => i.id === detail) || null;

  // ── Open modal helpers ─────────────────────────────────────────────────────
  function openNew() {
    setFormErr("");
    const today = new Date().toISOString().split("T")[0];
    setForm({ ...EMPTY, refNo: genRef("LC"), issueDate: today });
    setShowModal(true);
  }

  function openEdit(item: typeof items[0]) {
    setFormErr("");
    setForm({
      id: item.id, type: item.type, direction: item.direction as "Import" | "Export",
      refNo: item.refNo, issuingBank: item.issuingBank,
      beneficiaryName: item.beneficiaryName, applicantName: item.applicantName,
      amount: String(item.amount), currency: item.currency,
      issueDate: item.issueDate, expiryDate: item.expiryDate,
      latestShipDate: item.latestShipDate, presentationPeriod: item.presentationPeriod,
      paymentTerms: item.paymentTerms, usanceDays: item.usanceDays,
      portLoading: item.portLoading, portDischarge: item.portDischarge,
      goodsDesc: item.goodsDesc, partialShipment: item.partialShipment as "Allowed" | "Not Allowed",
      transhipment: item.transhipment as "Allowed" | "Not Allowed",
      docsRequired: item.docsRequired, bankCharges: item.bankCharges as "Our Account" | "Beneficiary" | "Shared",
      notes: item.notes, status: item.status,
    });
    setShowModal(true);
  }

  function setF<K extends keyof LCForm>(k: K, v: LCForm[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function toggleDoc(doc: string) {
    setForm(f => ({
      ...f,
      docsRequired: f.docsRequired.includes(doc)
        ? f.docsRequired.filter(d => d !== doc)
        : [...f.docsRequired, doc],
    }));
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  async function save() {
    if (!form.refNo.trim())        return setFormErr("LC/TT reference number is required.");
    if (!form.issuingBank.trim())  return setFormErr("Issuing / Remitting bank is required.");
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0)
                                   return setFormErr("A valid amount is required.");
    if (!form.issueDate)           return setFormErr("Issue date is required.");
    setFormErr("");
    setSaving(true);
    const payload = {
      title: form.refNo.trim(),
      status: form.status,
      amount: Number(form.amount),
      date: form.issueDate,
      data: {
        type: form.type, direction: form.direction, refNo: form.refNo.trim(),
        issuingBank: form.issuingBank.trim(), beneficiaryName: form.beneficiaryName.trim(),
        applicantName: form.applicantName.trim(), currency: form.currency,
        issueDate: form.issueDate, expiryDate: form.expiryDate,
        latestShipDate: form.latestShipDate, presentationPeriod: form.presentationPeriod,
        paymentTerms: form.paymentTerms, usanceDays: form.usanceDays,
        portLoading: form.portLoading.trim(), portDischarge: form.portDischarge.trim(),
        goodsDesc: form.goodsDesc.trim(), partialShipment: form.partialShipment,
        transhipment: form.transhipment, docsRequired: form.docsRequired,
        bankCharges: form.bankCharges, notes: form.notes.trim(),
      },
    };
    try {
      if (form.id) await update(form.id, payload);
      else         await create(payload);
      setShowModal(false);
    } catch (e) {
      setFormErr(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: string, refNo: string) {
    if (!await confirmToast(`Delete ${refNo}?`)) return;
    await remove(id);
    if (detail === id) setDetail(null);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "var(--app-bg,#0d1117)", color: "var(--text-primary,#fff)", fontFamily: FF, padding: "28px 32px" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px" }}>LC / TT Management</h1>
          <p style={{ margin: "5px 0 0", color: "var(--text-muted,rgba(255,255,255,0.45))", fontSize: 13 }}>
            Letters of Credit &amp; Telegraphic Transfers for import/export trade finance
          </p>
        </div>
        <button onClick={openNew}
          style={{ background: "#6366f1", color: "var(--text-primary)", border: "none", borderRadius: 9, padding: "10px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FF, letterSpacing: "0.01em" }}>
          + New LC / TT
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, marginBottom: 26 }}>
        {[
          { label: "Total LCs",       value: totalLCs,                    color: "#a78bfa" },
          { label: "Active LCs",      value: activeLCs,                   color: "#3b82f6" },
          { label: "TT Transfers",    value: ttCount,                     color: "#38bdf8" },
          { label: "Total LC Value",  value: `$${fmt(totalValue)}`,       color: "#22c55e" },
          { label: "Expiring ≤30d",   value: expiringSoon,                color: expiringSoon > 0 ? "#ef4444" : "#6b7280" },
        ].map(k => (
          <div key={k.label} style={{ ...card, textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: k.color, letterSpacing: "-0.5px" }}>{k.value}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted,rgba(255,255,255,0.45))", marginTop: 5, fontWeight: 500 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search LC No, bank, beneficiary, applicant…"
          style={{ flex: "1 1 260px", ...inp, padding: "10px 14px", fontSize: 13 }}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                padding: "7px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FF,
                border: `1px solid ${tab === t ? "#6366f1" : BD}`,
                background: tab === t ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.02)",
                color: tab === t ? "#a5b4fc" : "rgba(255,255,255,0.5)",
              }}>
              {t === "DOCUMENTS_PRESENTED" ? "Docs Presented" : t}
            </button>
          ))}
        </div>
      </div>

      {/* Main layout */}
      <div style={{ display: "grid", gridTemplateColumns: selectedItem ? "1fr 380px" : "1fr", gap: 18 }}>

        {/* Table */}
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          {loading
            ? <div style={{ padding: 48, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>Loading…</div>
            : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BD}` }}>
                      {["LC/TT No","Type","Direction","Bank","Beneficiary / Applicant","Amount","Ccy","Issue Date","Expiry","Terms","Status",""].map(h => (
                        <th key={h} style={{ padding: "13px 14px", textAlign: "left", color: "rgba(255,255,255,0.38)", fontWeight: 500, fontSize: 11, whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && (
                      <tr><td colSpan={12} style={{ padding: 48, textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 14 }}>No records found.</td></tr>
                    )}
                    {filtered.map(item => {
                      const expDays = daysUntil(item.expiryDate);
                      const expRed  = item.expiryDate && expDays <= 30 && expDays >= 0 && !["SETTLED","EXPIRED","CANCELLED"].includes(item.status);
                      const sc = STATUS_COLOR[item.status] || "#6b7280";
                      const terms = item.paymentTerms === "Sight"
                        ? "At Sight"
                        : `Usance ${item.usanceDays}d`;
                      return (
                        <tr key={item.id}
                          onClick={() => setDetail(item.id === detail ? null : item.id)}
                          style={{ borderBottom: `1px solid ${BD}`, cursor: "pointer", background: detail === item.id ? "rgba(99,102,241,0.07)" : "transparent", transition: "background 0.12s" }}>
                          <td style={{ padding: "12px 14px", color: "#a78bfa", fontWeight: 700, whiteSpace: "nowrap" }}>{item.refNo}</td>
                          <td style={{ padding: "12px 14px" }}>
                            <span style={{ background: item.type === "LC" ? "rgba(167,139,250,0.15)" : "rgba(56,189,248,0.15)", color: item.type === "LC" ? "#a78bfa" : "#38bdf8", padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{item.type}</span>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <span style={{ background: item.direction === "Import" ? "rgba(251,146,60,0.15)" : "rgba(34,197,94,0.15)", color: item.direction === "Import" ? "#fb923c" : "#22c55e", padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{item.direction}</span>
                          </td>
                          <td style={{ padding: "12px 14px", color: "rgba(255,255,255,0.7)", maxWidth: 160, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.issuingBank}</td>
                          <td style={{ padding: "12px 14px", maxWidth: 180 }}>
                            <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.beneficiaryName}</div>
                            {item.applicantName && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.applicantName}</div>}
                          </td>
                          <td style={{ padding: "12px 14px", fontWeight: 700, whiteSpace: "nowrap" }}>{fmt(item.amount)}</td>
                          <td style={{ padding: "12px 14px", color: "rgba(255,255,255,0.5)", fontSize: 12 }}>{item.currency}</td>
                          <td style={{ padding: "12px 14px", color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap", fontSize: 12 }}>{item.issueDate}</td>
                          <td style={{ padding: "12px 14px", whiteSpace: "nowrap", fontSize: 12, color: expRed ? "#ef4444" : "rgba(255,255,255,0.5)", fontWeight: expRed ? 700 : 400 }}>
                            {item.expiryDate || "—"}
                            {expRed && <span style={{ marginLeft: 4, fontSize: 10 }}>({expDays}d)</span>}
                          </td>
                          <td style={{ padding: "12px 14px", color: "rgba(255,255,255,0.5)", fontSize: 12, whiteSpace: "nowrap" }}>{terms}</td>
                          <td style={{ padding: "12px 14px" }}>
                            <span style={{ background: `${sc}22`, color: sc, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                              {STATUS_LABELS[item.status] || item.status}
                            </span>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button onClick={e => { e.stopPropagation(); openEdit(item); }}
                                style={{ padding: "4px 10px", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 6, color: "#a5b4fc", fontSize: 11, cursor: "pointer", fontFamily: FF, fontWeight: 600 }}>Edit</button>
                              <button onClick={e => { e.stopPropagation(); void handleRemove(item.id, item.refNo); }}
                                style={{ padding: "4px 8px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, color: "#ef4444", fontSize: 11, cursor: "pointer", fontFamily: FF }}>✕</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
        </div>

        {/* Detail panel */}
        {selectedItem && (
          <div style={{ ...card, position: "relative", alignSelf: "start" }}>
            <button onClick={() => setDetail(null)} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 18, cursor: "pointer" }}>✕</button>
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              <span style={{ background: selectedItem.type === "LC" ? "rgba(167,139,250,0.15)" : "rgba(56,189,248,0.15)", color: selectedItem.type === "LC" ? "#a78bfa" : "#38bdf8", padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{selectedItem.type}</span>
              <span style={{ background: selectedItem.direction === "Import" ? "rgba(251,146,60,0.15)" : "rgba(34,197,94,0.15)", color: selectedItem.direction === "Import" ? "#fb923c" : "#22c55e", padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{selectedItem.direction}</span>
              <span style={{ background: `${STATUS_COLOR[selectedItem.status] || "#6b7280"}22`, color: STATUS_COLOR[selectedItem.status] || "#6b7280", padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{STATUS_LABELS[selectedItem.status] || selectedItem.status}</span>
            </div>
            <h2 style={{ margin: "0 0 2px", fontSize: 18, fontWeight: 800 }}>{selectedItem.refNo}</h2>
            <p style={{ margin: "0 0 18px", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>{selectedItem.issuingBank}</p>

            {[
              ["Beneficiary", selectedItem.beneficiaryName],
              ["Applicant",   selectedItem.applicantName],
              ["Amount",      `${selectedItem.currency} ${fmt(selectedItem.amount)}`],
              ["Issue Date",  selectedItem.issueDate],
              ["Expiry Date", selectedItem.expiryDate || "—"],
              ["Latest Ship", selectedItem.latestShipDate || "—"],
              ["Pres. Period",`${selectedItem.presentationPeriod} days`],
              ["Payment",     selectedItem.paymentTerms === "Sight" ? "At Sight" : `Usance ${selectedItem.usanceDays} days`],
              ["Port Loading", selectedItem.portLoading || "—"],
              ["Port Discharge", selectedItem.portDischarge || "—"],
              ["Partial Ship", selectedItem.partialShipment],
              ["Transhipment", selectedItem.transhipment],
              ["Bank Charges", selectedItem.bankCharges],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${BD}` }}>
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>{k}</span>
                <span style={{ fontSize: 12, fontWeight: 600, textAlign: "right", maxWidth: 200 }}>{v}</span>
              </div>
            ))}

            {selectedItem.docsRequired.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Documents Required</div>
                {selectedItem.docsRequired.map(d => (
                  <div key={d} style={{ fontSize: 12, padding: "4px 0", color: "rgba(255,255,255,0.65)" }}>✓ {d}</div>
                ))}
              </div>
            )}

            {selectedItem.goodsDesc && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 5 }}>Goods Description</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>{selectedItem.goodsDesc}</div>
              </div>
            )}

            {selectedItem.notes && (
              <div style={{ marginTop: 14, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
                {selectedItem.notes}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button onClick={() => openEdit(selectedItem)}
                style={{ flex: 1, padding: "9px 0", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", color: "#a5b4fc", borderRadius: 8, cursor: "pointer", fontFamily: FF, fontSize: 13, fontWeight: 700 }}>Edit</button>
              <button onClick={() => void handleRemove(selectedItem.id, selectedItem.refNo)}
                style={{ padding: "9px 16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", borderRadius: 8, cursor: "pointer", fontFamily: FF, fontSize: 13 }}>Delete</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={{ background: MODAL_BG, border: `1px solid ${BD}`, borderRadius: 16, padding: 32, width: 680, maxHeight: "90vh", overflowY: "auto", fontFamily: FF }}>

            {/* Modal header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{form.id ? "Edit LC / TT" : "New LC / TT"}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            {formErr && (
              <div style={{ marginBottom: 16, padding: "10px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, color: "#fca5a5", fontSize: 12 }}>{formErr}</div>
            )}

            {/* Type + Direction toggle */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 6 }}>
              <div>
                <label style={lbl}>Type</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["LC", "TT"] as const).map(t => (
                    <button key={t} onClick={() => { setF("type", t); if (!form.id) setF("refNo", genRef(t)); }}
                      style={{ flex: 1, padding: "9px 0", borderRadius: 8, fontFamily: FF, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
                        border: `1px solid ${form.type === t ? (t === "LC" ? "#a78bfa" : "#38bdf8") : BD}`,
                        background: form.type === t ? (t === "LC" ? "rgba(167,139,250,0.15)" : "rgba(56,189,248,0.15)") : "rgba(255,255,255,0.02)",
                        color: form.type === t ? (t === "LC" ? "#a78bfa" : "#38bdf8") : "rgba(255,255,255,0.45)" }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={lbl}>Direction</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["Import", "Export"] as const).map(d => (
                    <button key={d} onClick={() => setF("direction", d)}
                      style={{ flex: 1, padding: "9px 0", borderRadius: 8, fontFamily: FF, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
                        border: `1px solid ${form.direction === d ? (d === "Import" ? "#fb923c" : "#22c55e") : BD}`,
                        background: form.direction === d ? (d === "Import" ? "rgba(251,146,60,0.12)" : "rgba(34,197,94,0.12)") : "rgba(255,255,255,0.02)",
                        color: form.direction === d ? (d === "Import" ? "#fb923c" : "#22c55e") : "rgba(255,255,255,0.45)" }}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main fields grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
              <div>
                <label style={lbl}>{form.type} Reference No</label>
                <input style={inp} value={form.refNo} onChange={e => setF("refNo", e.target.value)} placeholder="LC-2024-0001" />
              </div>
              <div>
                <label style={lbl}>{form.type === "LC" ? "Issuing Bank" : "Remitting Bank"}</label>
                <input style={inp} value={form.issuingBank} onChange={e => setF("issuingBank", e.target.value)} placeholder="Bank name" />
              </div>
              <div>
                <label style={lbl}>Beneficiary Name</label>
                <input style={inp} value={form.beneficiaryName} onChange={e => setF("beneficiaryName", e.target.value)} placeholder="Beneficiary / Supplier" />
              </div>
              <div>
                <label style={lbl}>Applicant Name</label>
                <input style={inp} value={form.applicantName} onChange={e => setF("applicantName", e.target.value)} placeholder="Applicant / Buyer" />
              </div>
              <div>
                <label style={lbl}>Amount</label>
                <input style={inp} type="number" min="0" step="0.01" value={form.amount} onChange={e => setF("amount", e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <label style={lbl}>Currency</label>
                <select style={sel} value={form.currency} onChange={e => setF("currency", e.target.value)}>
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Issue Date</label>
                <input style={inp} type="date" value={form.issueDate} onChange={e => setF("issueDate", e.target.value)} />
              </div>
              <div>
                <label style={lbl}>Expiry Date</label>
                <input style={inp} type="date" value={form.expiryDate} onChange={e => setF("expiryDate", e.target.value)} />
              </div>
              <div>
                <label style={lbl}>Latest Shipment Date</label>
                <input style={inp} type="date" value={form.latestShipDate} onChange={e => setF("latestShipDate", e.target.value)} />
              </div>
              <div>
                <label style={lbl}>Presentation Period (days)</label>
                <input style={inp} type="number" min="1" value={form.presentationPeriod} onChange={e => setF("presentationPeriod", e.target.value)} />
              </div>
              <div>
                <label style={lbl}>Payment Terms</label>
                <select style={sel} value={form.paymentTerms} onChange={e => setF("paymentTerms", e.target.value)}>
                  <option value="Sight">At Sight</option>
                  <option value="Usance">Usance</option>
                </select>
              </div>
              {form.paymentTerms === "Usance" && (
                <div>
                  <label style={lbl}>Usance Days</label>
                  <select style={sel} value={form.usanceDays} onChange={e => setF("usanceDays", e.target.value)}>
                    {["30","60","90","120"].map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={lbl}>Port of Loading</label>
                <input style={inp} value={form.portLoading} onChange={e => setF("portLoading", e.target.value)} placeholder="e.g. Shanghai" />
              </div>
              <div>
                <label style={lbl}>Port of Discharge</label>
                <input style={inp} value={form.portDischarge} onChange={e => setF("portDischarge", e.target.value)} placeholder="e.g. Dubai (Jebel Ali)" />
              </div>
              <div>
                <label style={lbl}>Partial Shipment</label>
                <select style={sel} value={form.partialShipment} onChange={e => setF("partialShipment", e.target.value as "Allowed" | "Not Allowed")}>
                  <option>Allowed</option>
                  <option>Not Allowed</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Transhipment</label>
                <select style={sel} value={form.transhipment} onChange={e => setF("transhipment", e.target.value as "Allowed" | "Not Allowed")}>
                  <option>Allowed</option>
                  <option>Not Allowed</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Bank Charges</label>
                <select style={sel} value={form.bankCharges} onChange={e => setF("bankCharges", e.target.value as "Our Account" | "Beneficiary" | "Shared")}>
                  <option>Our Account</option>
                  <option>Beneficiary</option>
                  <option>Shared</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Status</label>
                <select style={sel} value={form.status} onChange={e => setF("status", e.target.value)}>
                  {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={lbl}>Goods Description</label>
                <textarea style={{ ...inp, height: 64, resize: "vertical" }} value={form.goodsDesc} onChange={e => setF("goodsDesc", e.target.value)} placeholder="Brief description of goods/services" />
              </div>
            </div>

            {/* Documents checklist */}
            <div style={{ marginTop: 18 }}>
              <label style={lbl}>Documents Required</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {DOCS_LIST.map(doc => {
                  const checked = form.docsRequired.includes(doc);
                  return (
                    <button key={doc} onClick={() => toggleDoc(doc)}
                      style={{ padding: "6px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FF, transition: "all 0.12s",
                        border: `1px solid ${checked ? "#6366f1" : BD}`,
                        background: checked ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.02)",
                        color: checked ? "#a5b4fc" : "rgba(255,255,255,0.4)" }}>
                      {checked ? "✓ " : ""}{doc}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginTop: 14 }}>
              <label style={lbl}>Notes</label>
              <textarea style={{ ...inp, height: 56, resize: "vertical" }} value={form.notes} onChange={e => setF("notes", e.target.value)} placeholder="Additional notes or instructions…" />
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button onClick={save} disabled={saving}
                style={{ flex: 1, padding: "11px 0", background: saving ? "#4b5563" : "#6366f1", border: "none", borderRadius: 9, color: "var(--text-primary)", fontFamily: FF, fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "Saving…" : form.id ? "Save Changes" : `Create ${form.type}`}
              </button>
              <button onClick={() => setShowModal(false)}
                style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${BD}`, borderRadius: 9, color: "rgba(255,255,255,0.5)", fontFamily: FF, fontSize: 14, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
