"use client";
import { useEffect, useState } from "react";
import { useResponsive } from "@/hooks/useResponsive";
import { AUTOMATION_ADDON_ENABLED } from "@/lib/addons";

const FONT = "'Outfit','Inter',sans-serif";

type Tab = "overview" | "reminders" | "lowstock" | "reports" | "webhooks" | "sheets";

function getCurrentUser() {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem("currentUser") || "null"); } catch { return null; }
}

function authHeaders(): Record<string, string> {
  const u = getCurrentUser();
  const h: Record<string, string> = {};
  if (u?.id) h["x-user-id"] = u.id;
  if (u?.companyId) h["x-company-id"] = u.companyId;
  if (u?.role) h["x-user-role"] = u.role;
  return h;
}

// ─── Upsell (shown when the add-on isn't active) ──────────────────────────────
function UpsellGate() {
  const { isMobile } = useResponsive();
  const FEATURES = [
    { icon: "🔔", title: "Overdue Invoice Reminders", color: "#22c55e", desc: "See every overdue invoice in one place and send a reminder with one click." },
    { icon: "📦", title: "Low Stock Reorder Alerts", color: "#38bdf8", desc: "Set a reorder point per item and get notified before you run out." },
    { icon: "📊", title: "Scheduled Financial Reports", color: "#a78bfa", desc: "A real business summary, delivered to your inbox weekly or monthly." },
    { icon: "🔗", title: "Zapier / Make Webhooks", color: "#34d399", desc: "Connect FinovaOS events to 5,000+ business apps." },
    { icon: "📈", title: "Google Sheets Sync", color: "#fbbf24", desc: "Push invoices, inventory & contacts to a live spreadsheet." },
  ];

  return (
    <div style={{ marginBottom: 28, fontFamily: FONT }}>
      <div style={{ borderRadius: 20, background: "linear-gradient(135deg,rgba(124,58,237,.2),rgba(37,99,235,.14))", border: "1px solid rgba(124,58,237,.4)", overflow: "hidden", marginBottom: 20 }}>
        <div style={{ height: 3, background: "linear-gradient(90deg,#7c3aed,#2563eb,#a78bfa,#38bdf8)" }} />
        <div style={{ padding: isMobile ? "12px 12px" : "22px 26px", display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <div style={{ width: 50, height: 50, borderRadius: 14, background: "linear-gradient(135deg,#7c3aed,#2563eb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>⚡</div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "white" }}>Business Automation Add-on</h2>
              <span style={{ padding: "3px 10px", borderRadius: 20, background: "rgba(251,191,36,.15)", color: "#fbbf24", fontSize: 11, fontWeight: 700, border: "1px solid rgba(251,191,36,.3)" }}>
                {AUTOMATION_ADDON_ENABLED ? "$79/month" : "Coming soon"}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.55)", lineHeight: 1.6 }}>
              Operational automation for invoice follow-up, stock alerts, reporting, and business-app integrations.
            </p>
          </div>
          {/* No price, no buy button until it can actually be purchased. */}
          {AUTOMATION_ADDON_ENABLED && (
            <a href="/onboarding/payment/addon-automation?cycle=monthly" style={{ padding: "11px 22px", borderRadius: 10, background: "linear-gradient(135deg,#7c3aed,#2563eb)", color: "white", fontSize: 13, fontWeight: 700, textDecoration: "none", display: "inline-block", flexShrink: 0, whiteSpace: "nowrap" }}>
              Add to my plan →
            </a>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
        {FEATURES.map(f => (
          <div key={f.title} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 26, marginBottom: 10 }}>{f.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: f.color, marginBottom: 6 }}>{f.title}</div>
            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>{f.desc}</div>
          </div>
        ))}
      </div>

      {AUTOMATION_ADDON_ENABLED ? (
        <div style={{ marginTop: 14, padding: "12px 18px", borderRadius: 12, background: "rgba(0,0,0,.25)", border: "1px solid rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: "#22c55e" }}>$79/mo</div>
          <a href="/onboarding/payment/addon-automation?cycle=monthly" style={{ padding: "9px 18px", borderRadius: 10, background: "linear-gradient(135deg,#7c3aed,#2563eb)", color: "white", fontSize: 12, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
            Get Started →
          </a>
        </div>
      ) : (
        <div style={{ marginTop: 14, padding: "12px 18px", borderRadius: 12, background: "rgba(0,0,0,.25)", border: "1px solid rgba(255,255,255,.06)", fontSize: 12.5, color: "rgba(255,255,255,.45)", textAlign: "center" }}>
          Launching soon — we&apos;ll let you know the moment it&apos;s ready.
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function AutomationPage() {
  const { isMobile } = useResponsive();
  const [tab, setTab] = useState<Tab>("overview");
  const [addonEnabled, setAddonEnabled] = useState<boolean | null>(null); // null = loading
  const [showActivatedBanner, setShowActivatedBanner] = useState(false);
  // "?addon=activated" only means the user came BACK from checkout — the
  // add-on actually turns on when the provider's webhook lands, which can be
  // a few seconds later (or never, if payment ultimately failed). Showing
  // "Activated!" straight off the URL param — before confirming via
  // /api/automation/addon-status — is exactly what claimed success while
  // nothing was actually enabled.
  const [awaitingActivation, setAwaitingActivation] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cameFromCheckout = params.get("addon") === "activated";
    if (cameFromCheckout) {
      window.history.replaceState({}, "", window.location.pathname);
    }

    let cancelled = false;
    const checkStatus = async (): Promise<boolean> => {
      try {
        const r = await fetch("/api/automation/addon-status", { headers: authHeaders() });
        const d = await r.json();
        return d.enabled === true;
      } catch {
        return false;
      }
    };

    (async () => {
      const enabled = await checkStatus();
      if (cancelled) return;
      setAddonEnabled(enabled);

      if (!cameFromCheckout) return;

      if (enabled) {
        setShowActivatedBanner(true);
        setTimeout(() => setShowActivatedBanner(false), 6000);
        return;
      }

      setAwaitingActivation(true);
      for (let attempt = 0; attempt < 5 && !cancelled; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        if (cancelled) return;
        const nowEnabled = await checkStatus();
        if (cancelled) return;
        if (nowEnabled) {
          setAddonEnabled(true);
          setAwaitingActivation(false);
          setShowActivatedBanner(true);
          setTimeout(() => setShowActivatedBanner(false), 6000);
          return;
        }
      }
      if (!cancelled) setAwaitingActivation(false);
    })();

    return () => { cancelled = true; };
  }, []);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "overview",  label: "Overview",         icon: "⚡" },
    { id: "reminders", label: "Invoice Reminders", icon: "🔔" },
    { id: "lowstock",  label: "Low Stock Alerts",  icon: "📦" },
    { id: "reports",   label: "Scheduled Reports", icon: "📊" },
    { id: "webhooks",  label: "Webhooks",          icon: "🔗" },
    { id: "sheets",    label: "Google Sheets",     icon: "📈" },
  ];

  return (
    <div style={{ fontFamily: FONT, color: "#e2e8f0", minHeight: "100vh", padding: isMobile ? "12px" : "24px" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, background: "linear-gradient(135deg,#a78bfa,#38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Business Automation
        </h1>
        <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,0.45)", fontSize: 14 }}>
          Invoice follow-up, stock alerts, reporting, and business-app integrations
        </p>
      </div>

      {/* Activation success banner */}
      {showActivatedBanner && (
        <div style={{ marginBottom: 20, padding: isMobile ? "12px 10px" : "14px 20px", borderRadius: 12, background: "linear-gradient(135deg,rgba(34,197,94,.15),rgba(16,185,129,.1))", border: "1px solid rgba(34,197,94,.35)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22 }}>🎉</span>
          <div>
            <div style={{ fontWeight: 700, color: "#22c55e", fontSize: 15 }}>Business Automation Activated!</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>All automation tools are now unlocked for your account.</div>
          </div>
        </div>
      )}

      {awaitingActivation && (
        <div style={{ marginBottom: 20, padding: isMobile ? "12px 10px" : "14px 20px", borderRadius: 12, background: "linear-gradient(135deg,rgba(251,191,36,.12),rgba(217,119,6,.08))", border: "1px solid rgba(251,191,36,.3)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22 }}>⏳</span>
          <div>
            <div style={{ fontWeight: 700, color: "#fbbf24", fontSize: 15 }}>Payment received — activating your add-on…</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>We&apos;re confirming your payment with the billing provider. This usually takes under a minute.</div>
          </div>
        </div>
      )}

      {addonEnabled === false && !awaitingActivation && <UpsellGate />}

      {(addonEnabled !== false || awaitingActivation) && (
        <>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 28 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontFamily: FONT,
                background: tab === t.id ? "linear-gradient(135deg,#7c3aed,#2563eb)" : "rgba(255,255,255,0.06)",
                color: tab === t.id ? "#fff" : "rgba(255,255,255,0.6)",
                fontWeight: tab === t.id ? 600 : 400,
                transition: "all 0.18s",
              }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {tab === "overview"  && <OverviewTab onNavigate={setTab} />}
          {tab === "reminders" && <RemindersTab />}
          {tab === "lowstock"  && <LowStockTab />}
          {tab === "reports"   && <ReportsTab />}
          {tab === "webhooks"  && <WebhooksTab />}
          {tab === "sheets"    && <SheetsTab />}
        </>
      )}
    </div>
  );
}

// ─── Shared UI atoms ──────────────────────────────────────────────────────────
function Card({ children, style = {}, onClick }: { children: React.ReactNode; style?: React.CSSProperties; onClick?: () => void }) {
  const { isMobile } = useResponsive();
  return (
    <div onClick={onClick} style={{
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 14, padding: isMobile ? "12px 10px" : "20px 22px", ...style,
    }}>{children}</div>
  );
}

function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 5 }}>{label}</label>
      <input {...props} style={{
        width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.06)", color: "#e2e8f0", fontSize: 13, fontFamily: FONT,
        outline: "none", boxSizing: "border-box", ...props.style,
      }} />
    </div>
  );
}

function Textarea({ label, ...props }: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 5 }}>{label}</label>
      <textarea {...props} style={{
        width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.06)", color: "#e2e8f0", fontSize: 13, fontFamily: FONT,
        outline: "none", resize: "vertical", boxSizing: "border-box", ...props.style,
      }} />
    </div>
  );
}

function Btn({ children, variant = "primary", loading = false, ...props }: {
  children: React.ReactNode; variant?: "primary" | "secondary" | "danger"; loading?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const bg = variant === "primary" ? "linear-gradient(135deg,#7c3aed,#2563eb)"
    : variant === "danger" ? "rgba(239,68,68,0.15)"
    : "rgba(255,255,255,0.07)";
  return (
    <button {...props} disabled={loading || props.disabled} style={{
      padding: "8px 18px", borderRadius: 8, border: variant === "danger" ? "1px solid rgba(239,68,68,0.3)" : "none",
      background: bg, color: variant === "danger" ? "#f87171" : "#fff", fontSize: 13,
      fontFamily: FONT, fontWeight: 600, cursor: "pointer", opacity: (loading || props.disabled) ? 0.6 : 1,
      ...props.style,
    }}>
      {loading ? "..." : children}
    </button>
  );
}

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      background: ok ? "rgba(52,211,153,0.12)" : "rgba(239,68,68,0.12)",
      border: `1px solid ${ok ? "rgba(52,211,153,0.3)" : "rgba(239,68,68,0.3)"}`,
      color: ok ? "#34d399" : "#f87171",
      padding: "10px 18px", borderRadius: 10, fontSize: 13, fontFamily: FONT,
    }}>{msg}</div>
  );
}

// ─── OVERVIEW ─────────────────────────────────────────────────────────────────
function OverviewTab({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const features = [
    { id: "reminders" as Tab, icon: "🔔", title: "Overdue Invoice Reminders", desc: "See every overdue invoice in one place and send a reminder with one click.", color: "#22c55e" },
    { id: "lowstock" as Tab, icon: "📦", title: "Low Stock Reorder Alerts", desc: "Set a reorder point per item and get notified before you run out.", color: "#38bdf8" },
    { id: "reports" as Tab, icon: "📊", title: "Scheduled Financial Reports", desc: "A real business summary — sales, purchases, receivables, payables — delivered on a schedule.", color: "#a78bfa" },
    { id: "webhooks" as Tab, icon: "🔗", title: "Zapier / Make Webhooks", desc: "Send & receive data to/from 5,000+ apps via outbound and inbound webhooks.", color: "#34d399" },
    { id: "sheets" as Tab, icon: "📈", title: "Google Sheets Sync", desc: "Sync your invoices, inventory, and contacts to Google Sheets automatically.", color: "#fbbf24" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
      {features.map(f => (
        <Card key={f.id} style={{ cursor: "pointer", transition: "transform 0.15s, border-color 0.15s" }}
          onClick={() => onNavigate(f.id)}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>{f.icon}</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: f.color, marginBottom: 6 }}>{f.title}</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>{f.desc}</div>
          <div style={{ marginTop: 14, fontSize: 12, color: f.color, fontWeight: 600 }}>Open →</div>
        </Card>
      ))}
    </div>
  );
}

// ─── OVERDUE INVOICE REMINDERS ────────────────────────────────────────────────
function RemindersTab() {
  const { isMobile } = useResponsive();
  type Row = {
    id: string; invoiceNo: string; total: number; daysOverdue: number;
    customerName: string; customerEmail: string | null; lastReminderSentAt: string | null;
  };
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const load = () => {
    setLoading(true);
    fetch("/api/automation/invoice-reminders", { headers: authHeaders() })
      .then(r => r.json()).then(d => setRows(Array.isArray(d.invoices) ? d.invoices : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  async function sendReminder(id: string) {
    setSendingId(id);
    const r = await fetch("/api/automation/invoice-reminders", {
      method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId: id }),
    });
    const d = await r.json();
    setSendingId(null);
    if (r.ok) { showToast("Reminder sent", true); load(); }
    else showToast(d.error || "Failed to send", false);
  }

  return (
    <Card>
      {toast && <Toast {...toast} />}
      <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>Overdue Invoices</h3>
      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 0, marginBottom: 18 }}>
        Auto-detected from your sales invoices&apos; due dates. Review and send — nothing goes out automatically.
      </p>

      {loading ? (
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Loading…</p>
      ) : rows.length === 0 ? (
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>No overdue invoices right now. 🎉</p>
      ) : (
        <div style={{ overflowX: "auto" as const }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: isMobile ? 12 : 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "rgba(255,255,255,0.4)", fontSize: 11, textTransform: "uppercase" as const }}>
                <th style={{ padding: "8px 10px" }}>Invoice</th>
                <th style={{ padding: "8px 10px" }}>Customer</th>
                <th style={{ padding: "8px 10px" }}>Amount</th>
                <th style={{ padding: "8px 10px" }}>Days Overdue</th>
                <th style={{ padding: "8px 10px" }}>Last Reminder</th>
                <th style={{ padding: "8px 10px" }} />
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <td style={{ padding: "10px" }}>{row.invoiceNo}</td>
                  <td style={{ padding: "10px" }}>{row.customerName}</td>
                  <td style={{ padding: "10px" }}>{row.total.toLocaleString()}</td>
                  <td style={{ padding: "10px", color: row.daysOverdue >= 30 ? "#f87171" : row.daysOverdue >= 15 ? "#fbbf24" : "#e2e8f0" }}>{row.daysOverdue}d</td>
                  <td style={{ padding: "10px", color: "rgba(255,255,255,0.4)" }}>
                    {row.lastReminderSentAt ? new Date(row.lastReminderSentAt).toLocaleDateString() : "—"}
                  </td>
                  <td style={{ padding: "10px" }}>
                    <Btn onClick={() => sendReminder(row.id)} loading={sendingId === row.id} disabled={!row.customerEmail}>
                      {row.customerEmail ? "Send Reminder" : "No email on file"}
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ─── LOW STOCK REORDER ALERTS ─────────────────────────────────────────────────
function LowStockTab() {
  const { isMobile } = useResponsive();
  type Item = { id: string; name: string; code: string };
  type Rule = { id: string; itemId: string; itemName: string; reorderPoint: number; reorderQty: number; active: boolean };
  type Alert = Rule & { currentStock: number };

  const [items, setItems] = useState<Item[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [form, setForm] = useState({ itemId: "", reorderPoint: 0, reorderQty: 0 });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const load = () => {
    fetch("/api/items-new", { headers: authHeaders() }).then(r => r.json()).then(d => Array.isArray(d) && setItems(d.map((i: any) => ({ id: i.id, name: i.name, code: i.code })))).catch(() => {});
    fetch("/api/inventory/reorder", { headers: authHeaders() }).then(r => r.json()).then(d => setRules(Array.isArray(d.rules) ? d.rules : [])).catch(() => {});
    fetch("/api/inventory/reorder?action=alerts", { headers: authHeaders() }).then(r => r.json()).then(d => setAlerts(Array.isArray(d.alerts) ? d.alerts : [])).catch(() => {});
  };
  useEffect(load, []);

  async function saveRule() {
    const item = items.find(i => i.id === form.itemId);
    if (!item) return showToast("Select an item", false);
    setLoading(true);
    const r = await fetch("/api/inventory/reorder", {
      method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id, itemName: item.name, reorderPoint: form.reorderPoint, reorderQty: form.reorderQty, active: true }),
    });
    setLoading(false);
    if (r.ok) { showToast("Reorder rule saved", true); setForm({ itemId: "", reorderPoint: 0, reorderQty: 0 }); load(); }
    else showToast("Failed to save", false);
  }

  async function deleteRule(ruleId: string) {
    const r = await fetch(`/api/inventory/reorder?ruleId=${ruleId}`, { method: "DELETE", headers: authHeaders() });
    if (r.ok) { showToast("Rule removed", true); load(); }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20 }}>
      {toast && <Toast {...toast} />}

      <Card>
        <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>Set a Reorder Point</h3>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 0, marginBottom: 16 }}>
          When stock for an item drops to or below this level, you&apos;ll get notified.
        </p>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 5 }}>Item</label>
          <select value={form.itemId} onChange={e => setForm(f => ({ ...f, itemId: e.target.value }))} style={{
            width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)", color: "#e2e8f0", fontSize: 13, fontFamily: FONT, outline: "none",
          }}>
            <option value="">Select an item…</option>
            {items.map(i => <option key={i.id} value={i.id} style={{ color: "#000" }}>{i.name} ({i.code})</option>)}
          </select>
        </div>
        <Input label="Reorder Point (alert when stock ≤ this)" type="number" value={form.reorderPoint}
          onChange={e => setForm(f => ({ ...f, reorderPoint: Number(e.target.value) || 0 }))} />
        <Input label="Suggested Reorder Quantity" type="number" value={form.reorderQty}
          onChange={e => setForm(f => ({ ...f, reorderQty: Number(e.target.value) || 0 }))} />
        <Btn onClick={saveRule} loading={loading}>Save Reorder Rule</Btn>

        <div style={{ marginTop: 18 }}>
          {rules.map(rule => (
            <div key={rule.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{rule.itemName}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Alert at ≤ {rule.reorderPoint} · reorder {rule.reorderQty}</div>
              </div>
              <Btn variant="danger" onClick={() => deleteRule(rule.id)}>Remove</Btn>
            </div>
          ))}
          {rules.length === 0 && <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>No reorder rules yet</p>}
        </div>
      </Card>

      <Card>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Currently Below Reorder Point</h3>
        {alerts.length === 0 ? (
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Nothing is low on stock right now. 🎉</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
            {alerts.map(a => (
              <div key={a.id} style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{a.itemName}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#f87171" }}>{a.currentStock} left</span>
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>Reorder point: {a.reorderPoint} · Suggested qty: {a.reorderQty}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── SCHEDULED REPORTS ─────────────────────────────────────────────────────────
function ReportsTab() {
  const [cfg, setCfg] = useState<{ frequency: "weekly" | "monthly"; recipients: string[]; lastSentAt?: string }>({ frequency: "monthly", recipients: [] });
  const [recipientsText, setRecipientsText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    fetch("/api/automation/scheduled-reports", { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { setCfg(d); setRecipientsText((d.recipients || []).join(", ")); })
      .catch(() => {});
  }, []);

  async function saveConfig() {
    const recipients = recipientsText.split(",").map(s => s.trim()).filter(Boolean);
    if (recipients.length === 0) return showToast("Add at least one recipient", false);
    setLoading(true);
    const r = await fetch("/api/automation/scheduled-reports", {
      method: "PUT", headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ frequency: cfg.frequency, recipients }),
    });
    setLoading(false);
    showToast(r.ok ? "Schedule saved" : "Failed to save", r.ok);
  }

  async function sendNow() {
    setSending(true);
    const r = await fetch("/api/automation/scheduled-reports?action=send_now", { method: "POST", headers: authHeaders() });
    const d = await r.json();
    setSending(false);
    showToast(r.ok ? "Report sent" : (d.error || "Failed to send"), r.ok);
  }

  return (
    <Card>
      {toast && <Toast {...toast} />}
      <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>Scheduled Financial Reports</h3>
      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 0, marginBottom: 18 }}>
        A real business summary — sales, purchases, overdue receivables & payables — pulled from your own ledger and emailed on a schedule.
      </p>

      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 5 }}>Frequency</label>
        <select value={cfg.frequency} onChange={e => setCfg(c => ({ ...c, frequency: e.target.value as "weekly" | "monthly" }))} style={{
          width: "100%", maxWidth: 240, padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.06)", color: "#e2e8f0", fontSize: 13, fontFamily: FONT, outline: "none",
        }}>
          <option value="weekly" style={{ color: "#000" }}>Weekly</option>
          <option value="monthly" style={{ color: "#000" }}>Monthly</option>
        </select>
      </div>

      <Textarea label="Recipients (comma-separated emails)" value={recipientsText} onChange={e => setRecipientsText(e.target.value)} rows={2} placeholder="owner@company.com, accountant@company.com" />

      {cfg.lastSentAt && (
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 14 }}>Last sent: {new Date(cfg.lastSentAt).toLocaleString()}</p>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <Btn onClick={saveConfig} loading={loading}>Save Schedule</Btn>
        <Btn variant="secondary" onClick={sendNow} loading={sending}>Send Now (test)</Btn>
      </div>
    </Card>
  );
}

// ─── WEBHOOKS ─────────────────────────────────────────────────────────────────
function WebhooksTab() {
  const [outbound, setOutbound] = useState<any[]>([]);
  const [inbound, setInbound] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", url: "", events: "" });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const load = () => {
    fetch("/api/automation/webhooks", { headers: authHeaders() }).then(r => r.json()).then(d => Array.isArray(d) && setOutbound(d)).catch(() => {});
    fetch("/api/automation/webhooks/inbound", { headers: authHeaders() }).then(r => r.json()).then(d => Array.isArray(d) && setInbound(d)).catch(() => {});
  };
  useEffect(load, []);

  async function createWebhook() {
    if (!form.name || !form.url) return showToast("Name and URL required", false);
    setLoading(true);
    const events = form.events ? form.events.split(",").map(e => e.trim()).filter(Boolean) : [];
    const r = await fetch("/api/automation/webhooks", {
      method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, events }),
    });
    setLoading(false);
    if (r.ok) { showToast("Webhook created", true); setForm({ name: "", url: "", events: "" }); load(); }
    else showToast("Failed", false);
  }

  async function createInboundToken() {
    setLoading(true);
    const r = await fetch("/api/automation/webhooks/inbound", {
      method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Zapier/Make Token" }),
    });
    const d = await r.json();
    setLoading(false);
    if (r.ok) { showToast(`Token: ${d.token}`, true); load(); }
    else showToast("Failed", false);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      {toast && <Toast {...toast} />}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Outbound Webhooks</h3>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 0, marginBottom: 14 }}>
            FinovaOS sends data TO Zapier/Make when business events happen (invoice paid, stock low, PO approved).
          </p>
          <Input label="Webhook Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Low Stock Notifier" />
          <Input label="Target URL" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://hooks.zapier.com/hooks/..." />
          <Input label="Events (comma-separated, or * for all)" value={form.events} onChange={e => setForm(f => ({ ...f, events: e.target.value }))} placeholder="invoice.paid, stock.low" />
          <Btn onClick={createWebhook} loading={loading}>Add Webhook</Btn>

          <div style={{ marginTop: 18 }}>
            {outbound.map(w => (
              <div key={w.id} style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{w.name}</span>
                  <span style={{ fontSize: 11, color: w.active ? "#22c55e" : "#888" }}>{w.active ? "Active" : "Off"}</span>
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>{w.url.slice(0, 50)}...</div>
                {w.lastFired && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>Last fired: {new Date(w.lastFired).toLocaleString()}</div>}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Inbound Webhooks</h3>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 0, marginBottom: 14 }}>
          Receive data FROM Zapier/Make/n8n. Use the token URL in your automation tool.
        </p>
        <Btn onClick={createInboundToken} loading={loading}>+ Generate New Token</Btn>
        <div style={{ marginTop: 16 }}>
          {inbound.map(t => (
            <div key={t.id} style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{t.name}</div>
              <div style={{ fontSize: 11, color: "#a78bfa", wordBreak: "break-all" }}>
                {typeof window !== "undefined" ? window.location.origin : ""}/api/automation/webhooks/inbound?token={t.token}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>Hits: {t.hitCount}</div>
            </div>
          ))}
          {inbound.length === 0 && <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>No tokens yet</p>}
        </div>
      </Card>
    </div>
  );
}

// ─── GOOGLE SHEETS SYNC ─────────────────────────────────────────────────────────
function SheetsTab() {
  const { isMobile } = useResponsive();
  const [cfg, setCfg] = useState({ spreadsheetId: "", sheetName: "Sheet1", serviceAccountJson: "" });
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    fetch("/api/automation/sheets", { headers: authHeaders() })
      .then(r => r.json()).then(d => { setStatus(d); if (d.spreadsheetId) setCfg(c => ({ ...c, spreadsheetId: d.spreadsheetId, sheetName: d.sheetName })); }).catch(() => {});
  }, []);

  async function saveConfig() {
    if (!cfg.spreadsheetId) return showToast("Spreadsheet ID required", false);
    setLoading(true);
    const r = await fetch("/api/automation/sheets", {
      method: "PUT", headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(cfg),
    });
    setLoading(false);
    showToast(r.ok ? "Config saved" : "Failed", r.ok);
  }

  async function syncData(action: string) {
    setLoading(true);
    const r = await fetch(`/api/automation/sheets?action=${action}`, {
      method: "POST", headers: authHeaders(),
    });
    const d = await r.json();
    setLoading(false);
    showToast(r.ok ? `Synced ${d.synced} rows` : d.error, r.ok);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      {toast && <Toast {...toast} />}

      <Card>
        <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>Connect Google Sheets</h3>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 0, marginBottom: 16 }}>
          Uses a Google Service Account to write data directly to your spreadsheet.
        </p>
        {status?.configured && (
          <div style={{ marginBottom: 14, padding: "8px 12px", borderRadius: 8, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", fontSize: 12, color: "#22c55e" }}>
            Connected to: {status.spreadsheetId}
          </div>
        )}
        <Input label="Spreadsheet ID" value={cfg.spreadsheetId} onChange={e => setCfg(c => ({ ...c, spreadsheetId: e.target.value }))} placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms" />
        <Input label="Default Sheet Name" value={cfg.sheetName} onChange={e => setCfg(c => ({ ...c, sheetName: e.target.value }))} placeholder="Sheet1" />
        <Textarea label="Service Account JSON Key" value={cfg.serviceAccountJson} onChange={e => setCfg(c => ({ ...c, serviceAccountJson: e.target.value }))} rows={6} placeholder='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}' />
        <Btn onClick={saveConfig} loading={loading}>Save Configuration</Btn>
      </Card>

      <Card>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Sync Data</h3>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 0, marginBottom: 20 }}>
          Push your FinovaOS business data to Google Sheets with one click.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { action: "sync_invoices", label: "Sync Invoices", icon: "🧾", desc: "Export sales invoices to 'Invoices' sheet" },
            { action: "sync_inventory", label: "Sync Inventory", icon: "📦", desc: "Export inventory items to 'Inventory' sheet" },
            { action: "sync_contacts", label: "Sync Customers", icon: "🏢", desc: "Export all customers to 'Contacts' sheet" },
          ].map(item => (
            <div key={item.action} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "12px 10px" : "14px 16px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{item.icon} {item.label}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>{item.desc}</div>
              </div>
              <Btn onClick={() => syncData(item.action)} loading={loading} style={{ flexShrink: 0 }}>Sync Now</Btn>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20, padding: "14px", borderRadius: 10, background: "rgba(255,255,255,0.03)", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
          <div style={{ fontWeight: 600, marginBottom: 6, color: "rgba(255,255,255,0.6)" }}>Setup Instructions</div>
          <ol style={{ margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
            <li>Go to Google Cloud Console → Service Accounts</li>
            <li>Create a service account and download JSON key</li>
            <li>Share your Google Sheet with the service account email</li>
            <li>Paste the JSON key above and save</li>
          </ol>
        </div>
      </Card>
    </div>
  );
}
