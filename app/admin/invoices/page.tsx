"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import DateInput from "@/app/dashboard/reports/_components/DateInput";

/**
 * The platform's sales ledger.
 *
 * Every row is a PlatformInvoice — an immutable record of money FinovaOS
 * actually collected, with the provider's own subtotal/discount/tax breakdown
 * kept alongside it so the page doubles as the tax working set.
 */

type Invoice = {
  id: string;
  number: string;
  companyId: string;
  companyName: string | null;
  provider: string;
  providerOrderId: string | null;
  providerSubscriptionId: string | null;
  plan: string;
  billingCycle: string;
  currency: string;
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  taxName: string | null;
  total: number;
  customerName: string | null;
  customerEmail: string | null;
  customerCountry: string | null;
  customerTaxId: string | null;
  cardBrand: string | null;
  cardLast4: string | null;
  status: string;
  refundedAmount: number;
  refundedAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  issuedAt: string;
  /** Short human company reference — shown instead of the 36-char companyId. */
  companyNo: number | null;
  /** The company's name today, which may differ from the snapshot above. */
  currentCompanyName: string | null;
  companyRenamed: boolean;
};

type CurrencyTotal = {
  currency: string;
  gross: number;
  refunded: number;
  net: number;
  tax: number;
  count: number;
};

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  PAID:                { bg: "rgba(52,211,153,.12)",  color: "#34d399", label: "Paid" },
  REFUNDED:            { bg: "rgba(248,113,113,.12)", color: "#f87171", label: "Refunded" },
  PARTIALLY_REFUNDED:  { bg: "rgba(251,191,36,.12)",  color: "#fbbf24", label: "Part. refunded" },
  OPEN:                { bg: "rgba(251,191,36,.12)",  color: "#fbbf24", label: "Open" },
  VOID:                { bg: "rgba(255,255,255,.06)", color: "rgba(255,255,255,.4)", label: "Void" },
};

const PROVIDER_LABEL: Record<string, string> = {
  LEMONSQUEEZY: "Lemon Squeezy",
  SAFEPAY:      "Safepay 🇵🇰",
  STRIPE:       "Stripe",
  MANUAL:       "Manual 🇵🇰",
};

/** DD-MM-YYYY, matching every other date surface in the product. */
function fmtDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
}

/**
 * PKR is quoted in whole rupees; everything else keeps cents. Currency is always
 * printed with the figure — USD and PKR rows sit in one table and a bare number
 * would be unreadable, let alone auditable.
 */
function money(amount: number, currency: string) {
  const digits = currency === "PKR" ? 0 : 2;
  const symbol = currency === "PKR" ? "₨" : currency === "USD" ? "$" : "";
  const n = (Number(amount) || 0).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return symbol ? `${symbol}${n}` : `${currency} ${n}`;
}

function csvCell(value: unknown) {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [totals, setTotals] = useState<CurrencyTotal[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [taxIdDraft, setTaxIdDraft] = useState("");
  const [savingTaxId, setSavingTaxId] = useState(false);

  const [q, setQ] = useState("");
  const [provider, setProvider] = useState("");
  const [status, setStatus] = useState("");
  const [plan, setPlan] = useState("");
  const [currency, setCurrency] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (provider) params.set("provider", provider);
      if (status) params.set("status", status);
      if (plan) params.set("plan", plan);
      if (currency) params.set("currency", currency);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const r = await fetch(`/api/admin/invoices?${params.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });
      const d = await r.json();
      if (!r.ok) {
        toast.error(d?.error || "Failed to load invoices");
        return;
      }
      setInvoices(d.invoices || []);
      setTotals(d.totals || []);
      setMigrationRequired(Boolean(d.migrationRequired));
      setTruncated(Boolean(d.summary?.truncated));
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [q, provider, status, plan, currency, from, to]);

  useEffect(() => { load(); }, [load]);

  const companyCount = useMemo(
    () => new Set(invoices.map((i) => i.companyId)).size,
    [invoices],
  );

  function exportCsv() {
    if (invoices.length === 0) { toast.error("Nothing to export"); return; }

    const headers = [
      "Invoice No", "Issued", "Company", "Company Now", "Company No", "Company ID",
      "Customer", "Email", "Country", "Tax ID",
      "Plan", "Cycle", "Provider", "Order Ref", "Subscription Ref",
      "Currency", "Subtotal", "Discount", "Tax Name", "Tax Rate %", "Tax Amount", "Total",
      "Refunded", "Net", "Status", "Card", "Period Start", "Period End",
    ];

    const rows = invoices.map((i) => [
      i.number, fmtDate(i.issuedAt),
      i.companyName || "", i.currentCompanyName || "", i.companyNo ?? "", i.companyId,
      i.customerName || "", i.customerEmail || "", i.customerCountry || "", i.customerTaxId || "",
      i.plan, i.billingCycle, PROVIDER_LABEL[i.provider] || i.provider,
      i.providerOrderId || "", i.providerSubscriptionId || "",
      i.currency, i.subtotal, i.discount, i.taxName || "", i.taxRate, i.taxAmount, i.total,
      i.refundedAmount, (Number(i.total) || 0) - (Number(i.refundedAmount) || 0), i.status,
      i.cardBrand ? `${i.cardBrand} ****${i.cardLast4 || ""}` : "",
      fmtDate(i.periodStart), fmtDate(i.periodEnd),
    ]);

    const csv = [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
    // BOM so Excel opens the ₨ and ° characters as UTF-8 rather than mojibake.
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finovaos-invoices-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${invoices.length} invoice(s)`);
  }

  async function saveTaxId() {
    if (!selected) return;
    setSavingTaxId(true);
    try {
      const r = await fetch("/api/admin/invoices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: selected.id, customerTaxId: taxIdDraft }),
      });
      const d = await r.json();
      if (!r.ok) { toast.error(d?.error || "Failed to save"); return; }
      toast.success("Tax ID saved");
      setSelected(d.invoice);
      setInvoices((prev) => prev.map((i) => (i.id === d.invoice.id ? d.invoice : i)));
    } catch {
      toast.error("Network error");
    } finally {
      setSavingTaxId(false);
    }
  }

  function resetFilters() {
    setQ(""); setProvider(""); setStatus(""); setPlan(""); setCurrency(""); setFrom(""); setTo("");
  }

  const inp: React.CSSProperties = {
    padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)",
    background: "rgba(255,255,255,.04)", color: "white", fontSize: 13,
    outline: "none", fontFamily: "inherit",
  };
  const th: React.CSSProperties = {
    padding: "11px 14px", textAlign: "left", fontSize: 10, fontWeight: 700,
    color: "rgba(255,255,255,.32)", letterSpacing: ".06em", textTransform: "uppercase",
    borderBottom: "1px solid rgba(255,255,255,.07)", whiteSpace: "nowrap",
  };
  const td: React.CSSProperties = {
    padding: "12px 14px", fontSize: 12.5, color: "rgba(255,255,255,.72)",
    borderBottom: "1px solid rgba(255,255,255,.04)", whiteSpace: "nowrap",
  };

  return (
    <div style={{ padding: "32px 28px 80px", minHeight: "100vh", background: "#0b0f24", color: "white", fontFamily: "'Outfit', sans-serif" }}>
      <style>{`
        .inv-row:hover{background:rgba(255,255,255,.03)!important}
        .inv-input:focus{border-color:rgba(99,102,241,.6)!important;box-shadow:0 0 0 3px rgba(99,102,241,.12)!important}
        .inv-input option{background:#12172f;color:white}
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 25, fontWeight: 800, letterSpacing: "-0.6px" }}>Invoices</h1>
          <p style={{ margin: "5px 0 0", fontSize: 13, color: "rgba(255,255,255,.42)" }}>
            Every subscription payment FinovaOS has collected — permanent, numbered records for accounting and tax.
          </p>
        </div>
        <div style={{ display: "flex", gap: 9 }}>
          <button onClick={load} style={{ ...inp, cursor: "pointer", fontWeight: 600 }}>↻ Refresh</button>
          <button
            onClick={exportCsv}
            style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#6366f1,#7c3aed)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
          >
            ⬇ Export CSV
          </button>
        </div>
      </div>

      {migrationRequired && (
        <div style={{ marginBottom: 20, padding: "15px 18px", borderRadius: 14, background: "rgba(251,191,36,.09)", border: "1px solid rgba(251,191,36,.28)" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#fcd34d", marginBottom: 5 }}>Ledger table not created yet</div>
          <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.6)", lineHeight: 1.65 }}>
            Run <code style={{ background: "rgba(0,0,0,.3)", padding: "2px 6px", borderRadius: 5 }}>prisma/migrations/manual_platform_invoices.sql</code>{" "}
            against the database, then{" "}
            <code style={{ background: "rgba(0,0,0,.3)", padding: "2px 6px", borderRadius: 5 }}>node scripts/backfill-platform-invoices.js --commit</code>{" "}
            to import historical payments.
          </div>
        </div>
      )}

      {/* ── Per-currency totals ──
          Never summed across currencies: Lemon Squeezy settles USD and Safepay
          PKR, and one blended number would be meaningless on a tax return. */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(215px,1fr))", gap: 13, marginBottom: 22 }}>
        {totals.length === 0 ? (
          <div style={{ padding: "17px 19px", borderRadius: 15, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", fontSize: 13, color: "rgba(255,255,255,.35)" }}>
            No revenue in this selection
          </div>
        ) : totals.map((t) => (
          <div key={t.currency} style={{ padding: "16px 19px", borderRadius: 15, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".08em", color: "rgba(255,255,255,.34)" }}>{t.currency} REVENUE</span>
              <span style={{ fontSize: 10.5, color: "rgba(255,255,255,.3)" }}>{t.count} inv</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.5px" }}>{money(t.net, t.currency)}</div>
            <div style={{ display: "flex", gap: 14, marginTop: 9, fontSize: 11, color: "rgba(255,255,255,.4)", flexWrap: "wrap" }}>
              <span>Gross {money(t.gross, t.currency)}</span>
              {t.refunded > 0 && <span style={{ color: "#f87171" }}>Refunded {money(t.refunded, t.currency)}</span>}
              <span>Tax {money(t.tax, t.currency)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{ padding: "15px 17px", borderRadius: 16, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", marginBottom: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(158px,1fr))", gap: 11 }}>
          <input className="inv-input" style={inp} placeholder="Invoice #, company, email, order ref…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="inv-input" style={{ ...inp, cursor: "pointer" }} value={provider} onChange={(e) => setProvider(e.target.value)}>
            <option value="">All providers</option>
            {Object.entries(PROVIDER_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className="inv-input" style={{ ...inp, cursor: "pointer" }} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {Object.keys(STATUS_STYLE).map((s) => <option key={s} value={s}>{STATUS_STYLE[s].label}</option>)}
          </select>
          <select className="inv-input" style={{ ...inp, cursor: "pointer" }} value={plan} onChange={(e) => setPlan(e.target.value)}>
            <option value="">All plans</option>
            {["STARTER", "PROFESSIONAL", "PRO", "ENTERPRISE", "CUSTOM"].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className="inv-input" style={{ ...inp, cursor: "pointer" }} value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="">All currencies</option>
            <option value="USD">USD</option>
            <option value="PKR">PKR</option>
          </select>
          {/* Both DateInputs show the same DD-MM-YYYY placeholder, so they are
              labelled — otherwise the pair is indistinguishable. */}
          <DateRangeField label="From" value={from} onChange={setFrom} style={inp} />
          <DateRangeField label="To" value={to} onChange={setTo} style={inp} />
          <button onClick={resetFilters} style={{ ...inp, cursor: "pointer", color: "rgba(255,255,255,.5)", fontWeight: 600 }}>Clear</button>
        </div>
        <div style={{ marginTop: 11, fontSize: 11.5, color: "rgba(255,255,255,.35)" }}>
          {loading ? "Loading…" : `${invoices.length} invoice${invoices.length === 1 ? "" : "s"} · ${companyCount} compan${companyCount === 1 ? "y" : "ies"}`}
          {truncated && <span style={{ color: "#fbbf24" }}> · showing the first 200 only — narrow the date range for complete totals</span>}
        </div>
      </div>

      {/* ── Ledger ── */}
      <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "56px 24px", textAlign: "center", color: "rgba(255,255,255,.3)", fontSize: 13 }}>Loading ledger…</div>
        ) : invoices.length === 0 ? (
          <div style={{ padding: "56px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 38, marginBottom: 11 }}>🧾</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 5 }}>No invoices found</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.34)" }}>
              {migrationRequired ? "Create the ledger table to start recording payments." : "Try widening the filters above."}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Invoice #", "Issued", "Company", "Plan", "Provider", "Subtotal", "Discount", "Tax", "Total", "Status", ""].map((h) => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((i) => {
                  const s = STATUS_STYLE[i.status] || STATUS_STYLE.OPEN;
                  return (
                    <tr key={i.id} className="inv-row" style={{ cursor: "pointer" }} onClick={() => { setSelected(i); setTaxIdDraft(i.customerTaxId || ""); }}>
                      <td style={{ ...td, fontFamily: "monospace", fontWeight: 700, color: "rgba(255,255,255,.9)" }}>{i.number}</td>
                      <td style={td}>{fmtDate(i.issuedAt)}</td>
                      {/* Snapshot name is the record; the live name appears only
                          when it has drifted. The raw companyId is never printed
                          here — `companyNo` is the readable reference, and the
                          full id is one click away in the drawer. */}
                      <td style={{ ...td, maxWidth: 230, whiteSpace: "normal" }}>
                        <div style={{ color: "rgba(255,255,255,.85)", fontWeight: 600 }}>
                          {i.companyName || i.currentCompanyName || "—"}
                          {i.companyNo != null && (
                            <span style={{ fontSize: 10.5, fontWeight: 600, color: "rgba(255,255,255,.28)" }}> · #{i.companyNo}</span>
                          )}
                        </div>
                        {i.customerEmail && (
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,.32)" }}>{i.customerEmail}</div>
                        )}
                        {i.companyRenamed && (
                          <div style={{ fontSize: 10.5, color: "#a5b4fc" }}>now: {i.currentCompanyName}</div>
                        )}
                      </td>
                      <td style={td}>
                        {i.plan}
                        <span style={{ fontSize: 10.5, color: "rgba(255,255,255,.3)" }}> · {i.billingCycle.toLowerCase()}</span>
                      </td>
                      <td style={{ ...td, fontSize: 11.5 }}>{PROVIDER_LABEL[i.provider] || i.provider}</td>
                      <td style={td}>{money(i.subtotal, i.currency)}</td>
                      <td style={{ ...td, color: i.discount > 0 ? "#a5b4fc" : "rgba(255,255,255,.25)" }}>
                        {i.discount > 0 ? `−${money(i.discount, i.currency)}` : "—"}
                      </td>
                      <td style={{ ...td, color: i.taxAmount > 0 ? "rgba(255,255,255,.72)" : "rgba(255,255,255,.25)" }}>
                        {i.taxAmount > 0 ? money(i.taxAmount, i.currency) : "—"}
                      </td>
                      <td style={{ ...td, fontWeight: 800, color: "white" }}>
                        {money(i.total, i.currency)}
                        {i.refundedAmount > 0 && (
                          <div style={{ fontSize: 10.5, fontWeight: 600, color: "#f87171" }}>−{money(i.refundedAmount, i.currency)}</div>
                        )}
                      </td>
                      <td style={td}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, background: s.bg, color: s.color, fontSize: 10.5, fontWeight: 700 }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.color }} />
                          {s.label}
                        </span>
                      </td>
                      <td style={td} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => window.open(`/api/admin/invoices/pdf?id=${encodeURIComponent(i.id)}`, "_blank")}
                          style={{ padding: "4px 11px", borderRadius: 8, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.04)", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.5)", cursor: "pointer", fontFamily: "inherit" }}
                        >
                          ⬇ PDF
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Detail drawer ── */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", justifyContent: "flex-end" }}>
          <div onClick={() => setSelected(null)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.66)", backdropFilter: "blur(4px)" }} />
          <div style={{ position: "relative", width: "100%", maxWidth: 540, height: "100%", overflowY: "auto", background: "#101733", borderLeft: "1px solid rgba(255,255,255,.09)", padding: "26px 28px 60px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, fontFamily: "monospace" }}>{selected.number}</div>
                <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.4)", marginTop: 4 }}>
                  Issued {fmtDate(selected.issuedAt)} · {PROVIDER_LABEL[selected.provider] || selected.provider}
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ width: 32, height: 32, borderRadius: 9, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.5)", cursor: "pointer", fontSize: 15 }}>✕</button>
            </div>

            <Section title="Billed to">
              <Row label="Company (at sale)" value={selected.companyName || "—"} />
              {selected.companyRenamed && (
                <Row label="Company (now)" value={selected.currentCompanyName || "—"} />
              )}
              <Row label="Company No" value={selected.companyNo != null ? `#${selected.companyNo}` : "—"} />
              <Row label="Company ID" value={selected.companyId} mono />
              <Row label="Contact" value={selected.customerName || "—"} />
              <Row label="Email" value={selected.customerEmail || "—"} />
              <Row label="Country" value={selected.customerCountry || "—"} />
            </Section>

            <Section title="Amounts">
              <Row label="Subtotal" value={money(selected.subtotal, selected.currency)} />
              <Row label="Discount" value={selected.discount > 0 ? `−${money(selected.discount, selected.currency)}` : "—"} />
              <Row
                label={selected.taxName ? `${selected.taxName} (${selected.taxRate}%)` : "Tax"}
                value={selected.taxAmount > 0 ? money(selected.taxAmount, selected.currency) : "—"}
              />
              <Row label="Total charged" value={money(selected.total, selected.currency)} strong />
              {selected.refundedAmount > 0 && (
                <>
                  <Row label="Refunded" value={`−${money(selected.refundedAmount, selected.currency)}`} />
                  <Row label="Refunded on" value={fmtDate(selected.refundedAt)} />
                  <Row label="Net" value={money(selected.total - selected.refundedAmount, selected.currency)} strong />
                </>
              )}
            </Section>

            <Section title="Subscription">
              <Row label="Plan" value={`${selected.plan} · ${selected.billingCycle.toLowerCase()}`} />
              <Row label="Period" value={selected.periodStart || selected.periodEnd ? `${fmtDate(selected.periodStart)} → ${fmtDate(selected.periodEnd)}` : "—"} />
              <Row label="Status" value={(STATUS_STYLE[selected.status] || STATUS_STYLE.OPEN).label} />
            </Section>

            <Section title="Payment reference">
              <Row label="Provider" value={PROVIDER_LABEL[selected.provider] || selected.provider} />
              <Row label="Order ref" value={selected.providerOrderId || "—"} mono />
              <Row label="Subscription ref" value={selected.providerSubscriptionId || "—"} mono />
              <Row label="Card" value={selected.cardBrand ? `${selected.cardBrand} ····${selected.cardLast4 || ""}` : "—"} />
            </Section>

            {/* The only editable field: nothing captures a buyer's tax
                registration at checkout yet, so it is filled in here when a
                customer asks for a tax-compliant invoice. */}
            <Section title="Tax registration">
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.35)", lineHeight: 1.6, marginBottom: 10 }}>
                NTN / VAT / GST number for this buyer. Not collected at checkout — add it here when requested.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  className="inv-input"
                  style={{ ...inp, flex: 1 }}
                  placeholder="e.g. 1234567-8"
                  value={taxIdDraft}
                  onChange={(e) => setTaxIdDraft(e.target.value)}
                />
                <button
                  onClick={saveTaxId}
                  disabled={savingTaxId || taxIdDraft === (selected.customerTaxId || "")}
                  style={{
                    padding: "9px 17px", borderRadius: 10, border: "none", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                    cursor: savingTaxId || taxIdDraft === (selected.customerTaxId || "") ? "not-allowed" : "pointer",
                    background: savingTaxId || taxIdDraft === (selected.customerTaxId || "") ? "rgba(255,255,255,.06)" : "linear-gradient(135deg,#6366f1,#7c3aed)",
                    color: savingTaxId || taxIdDraft === (selected.customerTaxId || "") ? "rgba(255,255,255,.3)" : "white",
                  }}
                >
                  {savingTaxId ? "Saving…" : "Save"}
                </button>
              </div>
            </Section>

            <button
              onClick={() => window.open(`/api/admin/invoices/pdf?id=${encodeURIComponent(selected.id)}`, "_blank")}
              style={{ width: "100%", marginTop: 22, padding: "12px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#6366f1,#7c3aed)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              ⬇ Download customer PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DateRangeField({ label, value, onChange, style }: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  style: React.CSSProperties;
}) {
  return (
    <div style={{ position: "relative" }}>
      <span style={{ position: "absolute", top: -7, left: 10, padding: "0 5px", background: "#12172f", fontSize: 9.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "rgba(255,255,255,.38)" }}>
        {label}
      </span>
      <DateInput value={value} onChange={onChange} style={{ ...style, width: "100%" }} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22, padding: "16px 18px", borderRadius: 14, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.32)", marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value, mono, strong }: { label: string; value: string; mono?: boolean; strong?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "6px 0", fontSize: 12.5 }}>
      <span style={{ color: "rgba(255,255,255,.42)", flexShrink: 0 }}>{label}</span>
      <span style={{
        color: strong ? "white" : "rgba(255,255,255,.82)",
        fontWeight: strong ? 800 : 600,
        fontFamily: mono ? "monospace" : "inherit",
        fontSize: mono ? 11.5 : undefined,
        textAlign: "right",
        wordBreak: "break-all",
      }}>{value}</span>
    </div>
  );
}
