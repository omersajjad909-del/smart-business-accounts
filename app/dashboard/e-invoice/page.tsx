"use client";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/hasPermission";
import { PERMISSIONS } from "@/lib/permissions";
import { useResponsive } from "@/hooks/useResponsive";

// ─── Design tokens (matches sales-invoice / business-settings) ──────────────
const ff = "'Outfit','Inter',sans-serif";
const accent = "#6366f1";

const inp = (extra?: object) => ({
  width: "100%", padding: "10px 13px", borderRadius: 9, background: "rgba(255,255,255,.04)",
  border: "1px solid rgba(255,255,255,.1)", color: "var(--text-primary)", fontSize: 13,
  fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const, ...(extra || {}),
});
const lbl = { fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.4)", textTransform: "uppercase" as const, letterSpacing: ".07em", marginBottom: 5, display: "block" };
const section = (extra?: object) => ({ borderRadius: 14, background: "var(--panel-bg)", border: "1px solid var(--border)", padding: "20px 22px", marginBottom: 16, ...(extra || {}) });

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 14 }}><label style={lbl}>{label}</label>{children}</div>;
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type InvoiceRow = {
  id: string; invoiceNo: string; date: string; total: number;
  fbrStatus: "NOT_FILED" | "FILED" | "FAILED" | null;
  fbrInvoiceNo: string | null; fbrIrn: string | null; fbrQrPayload?: string | null; fbrFiledAt: string | null;
  customer?: { name: string; ntn?: string | null; strn?: string | null };
};

type FbrSettings = {
  enabled: boolean; environment: "sandbox" | "production"; bearerToken: string;
  sellerNtn: string; sellerBusinessName: string; sellerProvince: string; sellerAddress: string;
};

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  NOT_FILED: { bg: "rgba(148,163,184,.12)", fg: "#94a3b8", label: "Not Filed" },
  FILED: { bg: "rgba(52,211,153,.12)", fg: "#34d399", label: "Filed with FBR" },
  FAILED: { bg: "rgba(248,113,113,.12)", fg: "#f87171", label: "Failed" },
};

function StatusBadge({ status }: { status: string | null }) {
  const s = STATUS_STYLE[status || "NOT_FILED"] || STATUS_STYLE.NOT_FILED;
  return (
    <span style={{ background: s.bg, color: s.fg, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

export default function EInvoicePage() {
  const { isMobile } = useResponsive();
  const user = getCurrentUser();
  const canManage = hasPermission(user, PERMISSIONS.CREATE_SALES_INVOICE);

  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fbrConfigured, setFbrConfigured] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [filingId, setFilingId] = useState<string | null>(null);
  const [qrFor, setQrFor] = useState<InvoiceRow | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<FbrSettings>({
    enabled: false, environment: "sandbox", bearerToken: "",
    sellerNtn: "", sellerBusinessName: "", sellerProvince: "", sellerAddress: "",
  });
  const [savingSettings, setSavingSettings] = useState(false);

  function showToast(msg: string, type: "ok" | "err" = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function load() {
    setLoading(true);
    try {
      const qs = statusFilter ? `?status=${statusFilter}` : "";
      const [listRes, settingsRes] = await Promise.all([
        fetch(`/api/e-invoice${qs}`).then(r => r.json()),
        fetch("/api/company/admin-control").then(r => r.json()),
      ]);
      if (!listRes.error) {
        setInvoices(listRes.invoices || []);
        setFbrConfigured(Boolean(listRes.fbrConfigured));
      }
      if (settingsRes?.fbrSettings) setSettings(prev => ({ ...prev, ...settingsRes.fbrSettings }));
    } catch {
      showToast("Failed to load e-invoices", "err");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [statusFilter]);

  async function saveSettings() {
    if (!settings.sellerNtn.trim() || !settings.bearerToken.trim()) {
      showToast("NTN and gateway token are required to enable filing", "err");
      return;
    }
    setSavingSettings(true);
    try {
      const r = await fetch("/api/company/admin-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fbrSettings: { ...settings, enabled: true } }),
      });
      if (!r.ok) throw new Error("Failed");
      setSettings(prev => ({ ...prev, enabled: true }));
      setFbrConfigured(true);
      showToast("FBR settings saved");
      setShowSettings(false);
    } catch {
      showToast("Could not save settings", "err");
    } finally {
      setSavingSettings(false);
    }
  }

  async function fileInvoice(inv: InvoiceRow) {
    if (!fbrConfigured) { setShowSettings(true); return; }
    setFilingId(inv.id);
    try {
      const r = await fetch(`/api/e-invoice/${inv.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Filing failed");
      setInvoices(prev => prev.map(x => x.id === inv.id ? { ...x, ...data.invoice } : x));
      showToast(`Filed — FBR invoice no. ${data.invoice.fbrInvoiceNo}`);
    } catch (e: any) {
      showToast(e.message || "Filing failed", "err");
      load();
    } finally {
      setFilingId(null);
    }
  }

  const filtered = invoices.filter(inv => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return inv.invoiceNo.toLowerCase().includes(q) || (inv.customer?.name || "").toLowerCase().includes(q);
  });

  return (
    <div style={{ fontFamily: ff, padding: isMobile ? 12 : 24, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>🧾 E-Invoice (FBR)</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.5)", margin: "4px 0 0" }}>
            File sales invoices with FBR&apos;s digital invoicing gateway and print the FBR QR code.
          </p>
        </div>
        {canManage && (
          <button onClick={() => setShowSettings(s => !s)} style={{
            background: "rgba(255,255,255,.06)", border: "1px solid var(--border)", color: "var(--text-primary)",
            borderRadius: 9, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>⚙️ FBR Settings</button>
        )}
      </div>

      {!fbrConfigured && (
        <div style={{ ...section(), background: "rgba(251,191,36,.08)", border: "1px solid rgba(251,191,36,.25)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontSize: 13, color: "#fbbf24" }}>
            ⚠️ FBR integration is not connected yet. Add your seller NTN and gateway token to start filing invoices digitally.
          </div>
          <button onClick={() => setShowSettings(true)} style={{ background: "#fbbf24", color: "#111", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
            Configure now
          </button>
        </div>
      )}

      {showSettings && (
        <div style={section()}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px", color: "var(--text-primary)" }}>FBR Gateway Settings</h3>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
            <Field label="Environment">
              <select value={settings.environment} onChange={e => setSettings(p => ({ ...p, environment: e.target.value as any }))} style={inp()}>
                <option value="sandbox">Sandbox (testing)</option>
                <option value="production">Production (live)</option>
              </select>
            </Field>
            <Field label="Gateway Bearer Token">
              <input type="password" value={settings.bearerToken} onChange={e => setSettings(p => ({ ...p, bearerToken: e.target.value }))} style={inp()} placeholder="Token from your FBR IRIS / PRAL account" />
            </Field>
            <Field label="Seller NTN / CNIC">
              <input value={settings.sellerNtn} onChange={e => setSettings(p => ({ ...p, sellerNtn: e.target.value }))} style={inp()} placeholder="e.g. 1234567" />
            </Field>
            <Field label="Seller Business Name">
              <input value={settings.sellerBusinessName} onChange={e => setSettings(p => ({ ...p, sellerBusinessName: e.target.value }))} style={inp()} />
            </Field>
            <Field label="Seller Province">
              <input value={settings.sellerProvince} onChange={e => setSettings(p => ({ ...p, sellerProvince: e.target.value }))} style={inp()} placeholder="e.g. Punjab, Sindh" />
            </Field>
            <Field label="Seller Address">
              <input value={settings.sellerAddress} onChange={e => setSettings(p => ({ ...p, sellerAddress: e.target.value }))} style={inp()} />
            </Field>
          </div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,.4)", margin: "4px 0 14px" }}>
            Sandbox mode is for testing against FBR&apos;s test gateway — nothing filed there counts as a real return. Switch to Production only once your token and seller details are confirmed with FBR.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={saveSettings} disabled={savingSettings} style={{ background: accent, color: "#fff", border: "none", borderRadius: 9, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: savingSettings ? .6 : 1 }}>
              {savingSettings ? "Saving…" : "Save & Enable"}
            </button>
            <button onClick={() => setShowSettings(false)} style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: 9, padding: "10px 18px", fontSize: 13, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoice # or customer…" style={{ ...inp(), maxWidth: 280 }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inp(), maxWidth: 200 }}>
          <option value="">All statuses</option>
          <option value="NOT_FILED">Not Filed</option>
          <option value="FILED">Filed</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      <div style={{ ...section({ padding: 0, overflow: "hidden" }) }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,.03)", textAlign: "left" }}>
                {["Invoice #", "Date", "Customer", "Total", "Status", "FBR Invoice No.", ""].map(h => (
                  <th key={h} style={{ padding: "12px 16px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: "rgba(255,255,255,.4)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "rgba(255,255,255,.4)" }}>Loading…</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "rgba(255,255,255,.4)" }}>No invoices found.</td></tr>
              )}
              {!loading && filtered.map(inv => (
                <tr key={inv.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--text-primary)" }}>{inv.invoiceNo}</td>
                  <td style={{ padding: "12px 16px", color: "rgba(255,255,255,.6)" }}>{new Date(inv.date).toLocaleDateString()}</td>
                  <td style={{ padding: "12px 16px", color: "rgba(255,255,255,.7)" }}>{inv.customer?.name || "—"}</td>
                  <td style={{ padding: "12px 16px", color: "var(--text-primary)" }}>{fmt(inv.total)}</td>
                  <td style={{ padding: "12px 16px" }}><StatusBadge status={inv.fbrStatus} /></td>
                  <td style={{ padding: "12px 16px", color: "rgba(255,255,255,.6)", fontFamily: "monospace", fontSize: 12 }}>{inv.fbrInvoiceNo || "—"}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                    {inv.fbrStatus === "FILED" ? (
                      <button onClick={() => setQrFor(inv)} style={{ background: "rgba(52,211,153,.12)", color: "#34d399", border: "none", borderRadius: 7, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>View QR</button>
                    ) : canManage ? (
                      <button onClick={() => fileInvoice(inv)} disabled={filingId === inv.id} style={{ background: accent, color: "#fff", border: "none", borderRadius: 7, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: filingId === inv.id ? .6 : 1 }}>
                        {filingId === inv.id ? "Filing…" : inv.fbrStatus === "FAILED" ? "Retry" : "File with FBR"}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {qrFor && (
        <div onClick={() => setQrFor(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, textAlign: "center", maxWidth: 320 }}>
            <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{qrFor.invoiceNo}</h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "rgba(255,255,255,.5)" }}>FBR Invoice No. {qrFor.fbrInvoiceNo}</p>
            <div style={{ background: "#fff", padding: 12, borderRadius: 10, display: "inline-block" }}>
              <QRCodeSVG value={qrFor.fbrQrPayload || qrFor.fbrInvoiceNo || qrFor.invoiceNo} size={180} />
            </div>
            <p style={{ margin: "16px 0 0", fontSize: 11, color: "rgba(255,255,255,.4)", wordBreak: "break-all" }}>{qrFor.fbrQrPayload}</p>
            <button onClick={() => setQrFor(null)} style={{ marginTop: 16, background: "rgba(255,255,255,.06)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: 8, padding: "8px 18px", fontSize: 12.5, cursor: "pointer" }}>Close</button>
          </div>
        </div>
      )}

      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, background: toast.type === "ok" ? "#34d399" : "#f87171",
          color: "#111", padding: "11px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 200,
        }}>{toast.msg}</div>
      )}
    </div>
  );
}
