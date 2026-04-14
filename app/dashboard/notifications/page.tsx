"use client";

import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type Channel = "whatsapp" | "sms" | "email";
type Tab = "whatsapp" | "email" | "sms" | "preferences";

const NOTIF_TYPES = [
  { key: "invoice_sent",       label: "Invoice Sent",        desc: "When a sales invoice is created or sent",        icon: "🧾" },
  { key: "payment_received",   label: "Payment Received",    desc: "When a payment receipt is recorded",             icon: "✅" },
  { key: "payment_reminder",   label: "Payment Reminder",    desc: "For overdue invoices (auto-scheduled)",          icon: "⏰" },
  { key: "low_stock",          label: "Low Stock Alert",     desc: "When item stock falls below threshold",          icon: "📦" },
  { key: "purchase_approved",  label: "PO Approved",         desc: "When a purchase order is approved",             icon: "🛒" },
  { key: "expense_submitted",  label: "Expense Submitted",   desc: "When an expense voucher is submitted",           icon: "💸" },
  { key: "new_user_joined",    label: "New Team Member",     desc: "When a new user joins the workspace",            icon: "👤" },
];

type WhatsAppForm = { enabled: boolean; token: string; phoneId: string; apiVersion: string };
type EmailForm    = { enabled: boolean; host: string; port: number; secure: boolean; user: string; pass: string; from: string; fromName: string };

const DEFAULT_WA:  WhatsAppForm = { enabled: false, token: "", phoneId: "", apiVersion: "v18.0" };
const DEFAULT_EMAIL: EmailForm  = { enabled: false, host: "", port: 587, secure: false, user: "", pass: "", from: "", fromName: "FinovaOS" };

export default function NotificationsPage() {
  const currentUser = getCurrentUser();

  const [tab, setTab]           = useState<Tab>("whatsapp");
  const [status, setStatus]     = useState<Record<Channel, boolean>>({ whatsapp: false, sms: false, email: false });
  const [prefs, setPrefs]       = useState<Record<string, Record<Channel, boolean>>>(() =>
    Object.fromEntries(NOTIF_TYPES.map((n) => [n.key, { whatsapp: true, sms: false, email: true }]))
  );

  const [wa, setWa]             = useState<WhatsAppForm>(DEFAULT_WA);
  const [email, setEmail]       = useState<EmailForm>(DEFAULT_EMAIL);
  const [savingWa, setSavingWa] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // test
  const [testDest, setTestDest]     = useState("");
  const [testing, setTesting]       = useState<Channel | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // load
  useEffect(() => {
    const user = currentUser;
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (user?.id)        h["x-user-id"]    = user.id;
    if (user?.role)      h["x-user-role"]  = user.role;
    if (user?.companyId) h["x-company-id"] = user.companyId;

    fetch("/api/notifications/status", { headers: h }).then(r => r.json()).then(d => setStatus(d)).catch(() => {});

    fetch("/api/notifications/preferences", { headers: h }).then(r => r.json()).then(d => {
      if (d.prefs) setPrefs(d.prefs);
    }).catch(() => {});

    fetch("/api/company/comms-config", { headers: h }).then(r => r.ok ? r.json() : null).then(data => {
      if (!data) return;
      if (data.whatsapp) setWa(w => ({ ...w, ...data.whatsapp, token: data.whatsapp.token === "********" ? w.token : (data.whatsapp.token || "") }));
      if (data.email)    setEmail(e => ({ ...e, ...data.email, pass: data.email.pass === "********" ? e.pass : (data.email.pass || "") }));
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── save whatsapp ──────────────────────────────────────────────────────────
  async function saveWa() {
    setSavingWa(true);
    try {
      const h = getHeaders();
      const res = await fetch("/api/company/comms-config", {
        method: "POST", headers: h,
        body: JSON.stringify({ whatsapp: { enabled: wa.enabled, provider: "meta", token: wa.token || undefined, phoneId: wa.phoneId, apiVersion: wa.apiVersion } }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Save failed");
      toast.success("WhatsApp configuration saved securely.");
      const st = await fetch("/api/notifications/status", { headers: h }).then(r => r.json()).catch(() => null);
      if (st) setStatus(st);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingWa(false);
    }
  }

  // ── save email ──────────────────────────────────────────────────────────────
  async function saveEmailConfig() {
    setSavingEmail(true);
    try {
      const h = getHeaders();
      const res = await fetch("/api/company/comms-config", {
        method: "POST", headers: h,
        body: JSON.stringify({ email: { ...email, pass: email.pass || undefined } }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Save failed");
      toast.success("Email configuration saved securely.");
      const st = await fetch("/api/notifications/status", { headers: h }).then(r => r.json()).catch(() => null);
      if (st) setStatus(st);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingEmail(false);
    }
  }

  // ── save prefs ──────────────────────────────────────────────────────────────
  async function savePrefs() {
    setSavingPrefs(true);
    try {
      const h = getHeaders();
      await fetch("/api/notifications/preferences", { method: "POST", headers: h, body: JSON.stringify({ prefs }) });
      toast.success("Notification preferences saved.");
    } catch {
      toast.error("Failed to save preferences.");
    } finally {
      setSavingPrefs(false);
    }
  }

  // ── test channel ──────────────────────────────────────────────────────────
  async function testChannel(ch: Channel) {
    if (!testDest.trim()) { setTestResult({ ok: false, msg: "Enter a phone number or email first." }); return; }
    setTesting(ch);
    setTestResult(null);
    try {
      const h = getHeaders();
      const res = await fetch("/api/notifications/test", { method: "POST", headers: h, body: JSON.stringify({ channel: ch, phone: testDest }) });
      const d = await res.json();
      setTestResult({ ok: !!d.success, msg: d.success ? `Test ${ch} message sent successfully!` : (d.error || "Failed to send") });
    } catch {
      setTestResult({ ok: false, msg: "Network error" });
    } finally {
      setTesting(null);
    }
  }

  function getHeaders(): Record<string, string> {
    const user = currentUser;
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (user?.id)        h["x-user-id"]    = user.id;
    if (user?.role)      h["x-user-role"]  = user.role;
    if (user?.companyId) h["x-company-id"] = user.companyId;
    return h;
  }

  function togglePref(key: string, ch: Channel) {
    setPrefs(p => ({ ...p, [key]: { ...p[key], [ch]: !p[key][ch] } }));
  }

  // ── styles ─────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 13px", borderRadius: "8px",
    border: "1px solid var(--border)", background: "var(--app-bg)",
    color: "var(--text-primary)", fontSize: "13px", outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: "11px", fontWeight: 600, color: "var(--text-muted)",
    textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "6px",
  };

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "whatsapp",    label: "WhatsApp",    icon: "💬" },
    { id: "email",       label: "Email / SMTP",icon: "📧" },
    { id: "sms",         label: "SMS",         icon: "📱" },
    { id: "preferences", label: "Preferences", icon: "🔔" },
  ];

  return (
    <div style={{ padding: "32px", maxWidth: "820px" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Notifications & Alerts</h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
          Configure how your team and customers receive alerts — WhatsApp, Email, and SMS.
        </p>
      </div>

      {/* Channel status chips */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
        {([
          { key: "whatsapp" as Channel, label: "WhatsApp", icon: "💬", color: "#25D366" },
          { key: "sms"      as Channel, label: "SMS",       icon: "📱", color: "#6366f1" },
          { key: "email"    as Channel, label: "Email",     icon: "📧", color: "#0891b2" },
        ]).map(ch => (
          <div key={ch.key} style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "8px 14px", borderRadius: "20px",
            background: status[ch.key] ? `${ch.color}14` : "var(--panel-bg)",
            border: `1px solid ${status[ch.key] ? ch.color + "40" : "var(--border)"}`,
          }}>
            <span style={{ fontSize: "13px" }}>{ch.icon}</span>
            <span style={{ fontSize: "12px", fontWeight: 600, color: status[ch.key] ? ch.color : "var(--text-muted)" }}>
              {ch.label}
            </span>
            <span style={{
              fontSize: "10px", fontWeight: 700, padding: "1px 7px", borderRadius: "10px",
              background: status[ch.key] ? `${ch.color}20` : "var(--app-bg)",
              color: status[ch.key] ? ch.color : "var(--text-muted)",
              border: `1px solid ${status[ch.key] ? ch.color + "35" : "var(--border)"}`,
            }}>
              {status[ch.key] ? "Configured" : "Not Set"}
            </span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "20px", borderBottom: "1px solid var(--border)", paddingBottom: "0" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "10px 16px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600,
            background: "transparent", borderBottom: tab === t.id ? "2px solid #6366f1" : "2px solid transparent",
            color: tab === t.id ? "#6366f1" : "var(--text-muted)",
            marginBottom: "-1px", display: "flex", alignItems: "center", gap: "6px",
            transition: "color .15s",
          }}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* ── WHATSAPP TAB ── */}
      {tab === "whatsapp" && (
        <div>
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>WhatsApp Business API</div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "3px" }}>
                  Meta (Facebook) Business API — credentials stored encrypted, not in .env
                </div>
              </div>
              {/* Enable toggle */}
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{wa.enabled ? "Enabled" : "Disabled"}</span>
                <div
                  onClick={() => setWa(w => ({ ...w, enabled: !w.enabled }))}
                  style={{
                    width: "42px", height: "24px", borderRadius: "12px", cursor: "pointer",
                    background: wa.enabled ? "#25D366" : "var(--border)",
                    position: "relative", transition: "background .2s",
                  }}
                >
                  <div style={{
                    position: "absolute", top: "3px",
                    left: wa.enabled ? "21px" : "3px",
                    width: "18px", height: "18px", borderRadius: "50%",
                    background: "white", transition: "left .2s",
                    boxShadow: "0 1px 4px rgba(0,0,0,.3)",
                  }}/>
                </div>
              </label>
            </div>

            {/* How to get credentials info */}
            <div style={{
              padding: "12px 16px", borderRadius: "10px", marginBottom: "20px",
              background: "rgba(37,211,102,0.06)", border: "1px solid rgba(37,211,102,0.2)",
              fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.7",
            }}>
              <strong style={{ color: "#25D366" }}>How to get credentials:</strong><br/>
              1. Go to <strong>developers.facebook.com</strong> → My Apps → Create App → Business<br/>
              2. Add <strong>WhatsApp</strong> product → Go to WhatsApp Setup<br/>
              3. Copy <strong>Temporary Access Token</strong> and <strong>Phone Number ID</strong> from the setup page
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Meta Access Token <span style={{ color: "#ef4444" }}>*</span></label>
                <input
                  style={inputStyle} type="password"
                  value={wa.token} onChange={e => setWa(w => ({ ...w, token: e.target.value }))}
                  placeholder="EAAxxxxxxxxxx... (your permanent or temp token)"
                />
              </div>
              <div>
                <label style={labelStyle}>Phone Number ID <span style={{ color: "#ef4444" }}>*</span></label>
                <input
                  style={inputStyle}
                  value={wa.phoneId} onChange={e => setWa(w => ({ ...w, phoneId: e.target.value }))}
                  placeholder="e.g. 1234567890123"
                />
              </div>
              <div>
                <label style={labelStyle}>API Version</label>
                <input
                  style={inputStyle}
                  value={wa.apiVersion} onChange={e => setWa(w => ({ ...w, apiVersion: e.target.value }))}
                  placeholder="v18.0"
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
              <button
                onClick={saveWa} disabled={savingWa}
                style={{
                  padding: "10px 20px", borderRadius: "8px", border: "none",
                  background: savingWa ? "var(--border)" : "#25D366",
                  color: savingWa ? "var(--text-muted)" : "#08131b",
                  fontWeight: 700, fontSize: "13px", cursor: savingWa ? "not-allowed" : "pointer",
                }}
              >
                {savingWa ? "Saving…" : "Save WhatsApp Config"}
              </button>
            </div>
          </div>

          {/* Test delivery */}
          <TestDelivery
            activeChannel="whatsapp"
            testDest={testDest} setTestDest={setTestDest}
            testing={testing} testResult={testResult}
            onTest={testChannel}
            destLabel="WhatsApp number (with country code, e.g. 14155552671)"
            destPlaceholder="14155552671"
          />
        </div>
      )}

      {/* ── EMAIL TAB ── */}
      {tab === "email" && (
        <div>
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>Email / SMTP Configuration</div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "3px" }}>
                  Configure your own SMTP server (Gmail, Outlook, custom) — credentials stored encrypted
                </div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{email.enabled ? "Enabled" : "Disabled"}</span>
                <div
                  onClick={() => setEmail(e => ({ ...e, enabled: !e.enabled }))}
                  style={{
                    width: "42px", height: "24px", borderRadius: "12px", cursor: "pointer",
                    background: email.enabled ? "#0891b2" : "var(--border)",
                    position: "relative", transition: "background .2s",
                  }}
                >
                  <div style={{
                    position: "absolute", top: "3px",
                    left: email.enabled ? "21px" : "3px",
                    width: "18px", height: "18px", borderRadius: "50%",
                    background: "white", transition: "left .2s",
                    boxShadow: "0 1px 4px rgba(0,0,0,.3)",
                  }}/>
                </div>
              </label>
            </div>

            {/* Quick presets */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Quick Presets
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {[
                  { label: "Gmail",   host: "smtp.gmail.com",   port: 587, secure: false },
                  { label: "Outlook", host: "smtp.office365.com", port: 587, secure: false },
                  { label: "Yahoo",   host: "smtp.mail.yahoo.com", port: 465, secure: true },
                  { label: "Custom",  host: "", port: 587, secure: false },
                ].map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => setEmail(e => ({ ...e, host: preset.host, port: preset.port, secure: preset.secure }))}
                    style={{
                      padding: "6px 14px", borderRadius: "20px", cursor: "pointer", fontSize: "12px", fontWeight: 600,
                      background: email.host === preset.host && preset.host !== "" ? "rgba(8,145,178,0.15)" : "var(--app-bg)",
                      border: `1px solid ${email.host === preset.host && preset.host !== "" ? "#0891b2" : "var(--border)"}`,
                      color: email.host === preset.host && preset.host !== "" ? "#0891b2" : "var(--text-muted)",
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
              <div>
                <label style={labelStyle}>SMTP Host <span style={{ color: "#ef4444" }}>*</span></label>
                <input style={inputStyle} value={email.host} onChange={e => setEmail(f => ({ ...f, host: e.target.value }))} placeholder="smtp.gmail.com" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "10px" }}>
                <div>
                  <label style={labelStyle}>Port</label>
                  <input style={inputStyle} type="number" value={email.port} onChange={e => setEmail(f => ({ ...f, port: Number(e.target.value) }))} placeholder="587" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", paddingBottom: "10px" }}>
                    <input type="checkbox" checked={email.secure} onChange={e => setEmail(f => ({ ...f, secure: e.target.checked }))} style={{ accentColor: "#0891b2" }} />
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>SSL/TLS</span>
                  </label>
                </div>
              </div>
              <div>
                <label style={labelStyle}>SMTP Username (Email) <span style={{ color: "#ef4444" }}>*</span></label>
                <input style={inputStyle} value={email.user} onChange={e => setEmail(f => ({ ...f, user: e.target.value }))} placeholder="you@gmail.com" />
              </div>
              <div>
                <label style={labelStyle}>SMTP Password / App Password <span style={{ color: "#ef4444" }}>*</span></label>
                <input style={inputStyle} type="password" value={email.pass} onChange={e => setEmail(f => ({ ...f, pass: e.target.value }))} placeholder="Gmail: use App Password, not account password" />
              </div>
              <div>
                <label style={labelStyle}>From Email</label>
                <input style={inputStyle} value={email.from} onChange={e => setEmail(f => ({ ...f, from: e.target.value }))} placeholder="noreply@yourcompany.com" />
              </div>
              <div>
                <label style={labelStyle}>From Name</label>
                <input style={inputStyle} value={email.fromName} onChange={e => setEmail(f => ({ ...f, fromName: e.target.value }))} placeholder="FinovaOS" />
              </div>
            </div>

            {/* Gmail note */}
            {email.host === "smtp.gmail.com" && (
              <div style={{
                padding: "10px 14px", borderRadius: "8px", marginBottom: "16px",
                background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)",
                fontSize: "12px", color: "#fbbf24",
              }}>
                💡 <strong>Gmail tip:</strong> Use an <strong>App Password</strong> (not your Gmail password). Go to Google Account → Security → 2-Step Verification → App Passwords.
              </div>
            )}

            <button
              onClick={saveEmailConfig} disabled={savingEmail}
              style={{
                padding: "10px 20px", borderRadius: "8px", border: "none",
                background: savingEmail ? "var(--border)" : "#0891b2",
                color: savingEmail ? "var(--text-muted)" : "#fff",
                fontWeight: 700, fontSize: "13px", cursor: savingEmail ? "not-allowed" : "pointer",
              }}
            >
              {savingEmail ? "Saving…" : "Save Email Config"}
            </button>
          </div>

          <TestDelivery
            activeChannel="email"
            testDest={testDest} setTestDest={setTestDest}
            testing={testing} testResult={testResult}
            onTest={testChannel}
            destLabel="Recipient email address"
            destPlaceholder="test@example.com"
          />
        </div>
      )}

      {/* ── SMS TAB ── */}
      {tab === "sms" && (
        <div style={card}>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>SMS Configuration</div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px" }}>
            SMS is configured at the server level via environment variables — not per-company.
          </div>

          <div style={{
            padding: "16px 20px", borderRadius: "10px", marginBottom: "20px",
            background: status.sms ? "rgba(99,102,241,0.06)" : "rgba(248,113,113,0.06)",
            border: `1px solid ${status.sms ? "rgba(99,102,241,0.25)" : "rgba(248,113,113,0.2)"}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <div style={{
                width: "10px", height: "10px", borderRadius: "50%",
                background: status.sms ? "#6366f1" : "#f87171",
                boxShadow: `0 0 6px ${status.sms ? "rgba(99,102,241,0.5)" : "rgba(248,113,113,0.5)"}`,
              }}/>
              <span style={{ fontSize: "14px", fontWeight: 700, color: status.sms ? "#6366f1" : "#f87171" }}>
                {status.sms ? "SMS Configured" : "SMS Not Configured"}
              </span>
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.7" }}>
              {status.sms
                ? "SMS API is active. Add SMS_API_URL and SMS_API_KEY to your .env to configure."
                : <>
                    To enable SMS, add these to your <code style={{ background: "var(--app-bg)", padding: "1px 5px", borderRadius: "4px" }}>.env</code> file:<br />
                    <code style={{ background: "var(--app-bg)", padding: "4px 10px", borderRadius: "6px", display: "inline-block", marginTop: "6px", fontSize: "11px", color: "var(--text-primary)" }}>
                      SMS_API_URL=https://your-sms-provider.com/send<br />
                      SMS_API_KEY=your_api_key_here
                    </code>
                  </>
              }
            </div>
          </div>

          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "10px" }}>Popular SMS Providers</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: "10px" }}>
            {[
              { name: "Twilio",        desc: "Global — most widely used" },
              { name: "Vonage",        desc: "Global — EU & US focused" },
              { name: "AWS SNS",       desc: "Global — Amazon cloud SMS" },
              { name: "MessageBird",   desc: "Global — 180+ countries" },
              { name: "Plivo",         desc: "Global — cost-effective" },
              { name: "Sinch",         desc: "Global — enterprise grade" },
            ].map(p => (
              <div key={p.name} style={{
                padding: "12px 14px", borderRadius: "10px",
                background: "var(--app-bg)", border: "1px solid var(--border)",
              }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{p.name}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "3px" }}>{p.desc}</div>
              </div>
            ))}
          </div>

          {/* Test SMS */}
          <div style={{ marginTop: "20px" }}>
            <TestDelivery
              activeChannel="sms"
              testDest={testDest} setTestDest={setTestDest}
              testing={testing} testResult={testResult}
              onTest={testChannel}
              destLabel="Phone number (with country code, e.g. 14155552671)"
              destPlaceholder="14155552671"
            />
          </div>
        </div>
      )}

      {/* ── PREFERENCES TAB ── */}
      {tab === "preferences" && (
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>Notification Preferences</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "3px" }}>
                Choose which events trigger which channels
              </div>
            </div>
            <button
              onClick={savePrefs} disabled={savingPrefs}
              style={{
                padding: "9px 18px", borderRadius: "8px", border: "none",
                background: savingPrefs ? "var(--border)" : "#6366f1",
                color: savingPrefs ? "var(--text-muted)" : "#fff",
                fontWeight: 700, fontSize: "13px", cursor: savingPrefs ? "not-allowed" : "pointer",
              }}
            >
              {savingPrefs ? "Saving…" : "Save Preferences"}
            </button>
          </div>

          {/* Table header */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 100px 100px 100px",
            gap: "8px", padding: "8px 12px", marginBottom: "4px",
          }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Event</div>
            {(["whatsapp","sms","email"] as Channel[]).map(ch => (
              <div key={ch} style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", textAlign: "center" }}>
                {ch === "whatsapp" ? "💬 WA" : ch === "sms" ? "📱 SMS" : "📧 Email"}
              </div>
            ))}
          </div>

          {/* Rows */}
          {NOTIF_TYPES.map((n, i) => (
            <div key={n.key} style={{
              display: "grid", gridTemplateColumns: "1fr 100px 100px 100px",
              gap: "8px", padding: "12px 12px", alignItems: "center",
              background: i % 2 === 0 ? "var(--app-bg)" : "transparent",
              borderRadius: "8px",
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "14px" }}>{n.icon}</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{n.label}</span>
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px", paddingLeft: "22px" }}>{n.desc}</div>
              </div>
              {(["whatsapp","sms","email"] as Channel[]).map(ch => (
                <div key={ch} style={{ display: "flex", justifyContent: "center" }}>
                  <div
                    onClick={() => togglePref(n.key, ch)}
                    style={{
                      width: "36px", height: "20px", borderRadius: "10px", cursor: "pointer",
                      background: prefs[n.key]?.[ch]
                        ? ch === "whatsapp" ? "#25D366" : ch === "email" ? "#0891b2" : "#6366f1"
                        : "var(--border)",
                      position: "relative", transition: "background .2s",
                      opacity: (ch === "whatsapp" && !status.whatsapp) || (ch === "sms" && !status.sms) || (ch === "email" && !status.email) ? 0.45 : 1,
                    }}
                    title={!status[ch] ? `${ch} not configured` : ""}
                  >
                    <div style={{
                      position: "absolute", top: "2px",
                      left: prefs[n.key]?.[ch] ? "18px" : "2px",
                      width: "16px", height: "16px", borderRadius: "50%",
                      background: "white", transition: "left .2s",
                      boxShadow: "0 1px 3px rgba(0,0,0,.3)",
                    }}/>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* Legend */}
          <div style={{ marginTop: "16px", padding: "12px 14px", borderRadius: "8px", background: "var(--app-bg)", border: "1px solid var(--border)", fontSize: "11px", color: "var(--text-muted)" }}>
            💡 Dimmed toggles mean that channel is not yet configured. Set it up in the WhatsApp, Email, or SMS tabs first.
          </div>
        </div>
      )}
    </div>
  );
}

// ── TestDelivery sub-component ────────────────────────────────────────────────
function TestDelivery({
  activeChannel, testDest, setTestDest, testing, testResult, onTest, destLabel, destPlaceholder,
}: {
  activeChannel: Channel;
  testDest: string;
  setTestDest: (v: string) => void;
  testing: Channel | null;
  testResult: { ok: boolean; msg: string } | null;
  onTest: (ch: Channel) => void;
  destLabel: string;
  destPlaceholder: string;
}) {
  return (
    <div style={{
      marginTop: "16px",
      background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px",
    }}>
      <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
        Test Delivery
      </div>
      <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "14px" }}>
        Send a test message to verify your configuration is working correctly.
      </div>

      <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "6px" }}>
            {destLabel}
          </label>
          <input
            value={testDest}
            onChange={e => setTestDest(e.target.value)}
            placeholder={destPlaceholder}
            style={{
              width: "100%", padding: "10px 13px", borderRadius: "8px",
              border: "1px solid var(--border)", background: "var(--app-bg)",
              color: "var(--text-primary)", fontSize: "13px", outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
        <button
          onClick={() => onTest(activeChannel)}
          disabled={!!testing || !testDest.trim()}
          style={{
            padding: "10px 20px", borderRadius: "8px", border: "none", whiteSpace: "nowrap",
            background: testing || !testDest.trim() ? "var(--border)" : "#6366f1",
            color: testing || !testDest.trim() ? "var(--text-muted)" : "#fff",
            fontWeight: 700, fontSize: "13px", cursor: testing || !testDest.trim() ? "not-allowed" : "pointer",
          }}
        >
          {testing === activeChannel ? "Sending…" : `Send Test ${activeChannel === "whatsapp" ? "WhatsApp" : activeChannel === "email" ? "Email" : "SMS"}`}
        </button>
      </div>

      {testResult && (
        <div style={{
          marginTop: "12px", padding: "10px 14px", borderRadius: "8px",
          background: testResult.ok ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.08)",
          border: `1px solid ${testResult.ok ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`,
          fontSize: "13px", fontWeight: 500,
          color: testResult.ok ? "#34d399" : "#f87171",
        }}>
          {testResult.ok ? "✓ " : "✗ "}{testResult.msg}
        </div>
      )}
    </div>
  );
}
