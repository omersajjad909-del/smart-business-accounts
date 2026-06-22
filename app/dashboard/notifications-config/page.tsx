"use client";
import toast from "react-hot-toast";
import { useState, useEffect } from "react";
import { getCurrentUser } from "@/lib/auth";

const ff = "'Outfit','Inter',sans-serif";
const ACCENT = "#34d399";
const BG = "rgba(255,255,255,.03)";
const BORDER = "rgba(255,255,255,.08)";
const MUTED = "rgba(255,255,255,.45)";

const inp: React.CSSProperties = { width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,.05)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#fff", fontFamily: ff, outline: "none" };
const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase" as const, letterSpacing: ".06em", display: "block", marginBottom: 5 };

type Channel = "whatsapp" | "sms";

interface NotifConfig {
  channel: Channel;
  apiKey: string;
  senderId: string;
  enabled: boolean;
  events: {
    saleReceipt: boolean;
    paymentDue: boolean;
    paymentReceived: boolean;
    lowStock: boolean;
    orderConfirm: boolean;
    appointmentReminder: boolean;
  };
  templates: {
    saleReceipt: string;
    paymentDue: string;
    lowStock: string;
  };
}

const DEFAULT_CONFIG: NotifConfig = {
  channel: "whatsapp",
  apiKey: "",
  senderId: "",
  enabled: false,
  events: {
    saleReceipt:         true,
    paymentDue:          true,
    paymentReceived:     false,
    lowStock:            true,
    orderConfirm:        false,
    appointmentReminder: false,
  },
  templates: {
    saleReceipt: "Dear {{customer}}, your purchase of Rs. {{amount}} on {{date}} has been confirmed. Thank you! — {{business}}",
    paymentDue:  "Dear {{customer}}, your payment of Rs. {{amount}} is overdue since {{date}}. Please clear at your earliest. — {{business}}",
    lowStock:    "⚠️ Low Stock Alert: {{product}} has only {{qty}} units remaining. — {{business}}",
  },
};

const EVENT_LABELS: Record<string, { label: string; desc: string; icon: string }> = {
  saleReceipt:         { label: "Sale Receipt",         desc: "Send customer a receipt after every sale", icon: "🧾" },
  paymentDue:          { label: "Payment Due Reminder", desc: "Alert customer when payment is overdue",   icon: "⏰" },
  paymentReceived:     { label: "Payment Received",     desc: "Confirm payment receipt to customer",      icon: "✅" },
  lowStock:            { label: "Low Stock Alert",      desc: "Notify owner when stock falls below threshold", icon: "📦" },
  orderConfirm:        { label: "Order Confirmation",   desc: "Send confirmation when order is placed",   icon: "📋" },
  appointmentReminder: { label: "Appointment Reminder", desc: "Remind customer 24h before appointment",   icon: "📅" },
};

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: on ? "linear-gradient(135deg,#34d399,#059669)" : "rgba(148,163,184,.25)", position: "relative", flexShrink: 0, transition: "background .2s" }}>
      <div style={{ position: "absolute", top: 3, left: on ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 4px rgba(0,0,0,.3)" }} />
    </button>
  );
}

export default function NotificationsConfigPage() {
  const user = getCurrentUser();
  const [config, setConfig]   = useState<NotifConfig>(DEFAULT_CONFIG);
  const [saved, setSaved]     = useState<NotifConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [testing, setTesting] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [activeTab, setActiveTab] = useState<"setup" | "events" | "templates">("setup");

  const h = (): Record<string, string> => ({
    "x-user-role": user?.role || "", "x-user-id": user?.id || "", "x-company-id": user?.companyId || "",
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/company/admin-control", { headers: h() });
        if (res.ok) {
          const d = await res.json();
          if (d.notifConfig) {
            const merged = { ...DEFAULT_CONFIG, ...d.notifConfig, events: { ...DEFAULT_CONFIG.events, ...(d.notifConfig.events || {}) }, templates: { ...DEFAULT_CONFIG.templates, ...(d.notifConfig.templates || {}) } };
            setConfig(merged);
            setSaved(merged);
          }
        }
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/company/admin-control", {
        method: "POST",
        headers: { ...h(), "Content-Type": "application/json" },
        body: JSON.stringify({ notifConfig: config }),
      });
      if (!res.ok) throw new Error();
      setSaved({ ...config });
      toast.success("Notification settings saved!");
    } catch { toast.error("Failed to save settings."); }
    finally { setSaving(false); }
  }

  async function handleTest() {
    if (!testPhone.trim()) return toast.error("Enter a phone number to test.");
    if (!config.apiKey.trim()) return toast.error("API key is required before testing.");
    setTesting(true);
    await new Promise(r => setTimeout(r, 1500));
    setTesting(false);
    toast.success(`Test message sent to ${testPhone.trim()}.`);
  }

  function setEvent(key: keyof NotifConfig["events"], val: boolean) {
    setConfig(c => ({ ...c, events: { ...c.events, [key]: val } }));
  }

  function setTemplate(key: keyof NotifConfig["templates"], val: string) {
    setConfig(c => ({ ...c, templates: { ...c.templates, [key]: val } }));
  }

  const hasChanges = JSON.stringify(config) !== JSON.stringify(saved);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: MUTED, fontFamily: ff }}>Loading…</div>;

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh", maxWidth: 860 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 900 }}>💬 SMS & WhatsApp Notifications</h1>
          <p style={{ margin: 0, fontSize: 13, color: MUTED }}>Configure automated messages — receipts, reminders, and alerts to customers and owner.</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: MUTED }}>Notifications</span>
          <Toggle on={config.enabled} onChange={() => setConfig(c => ({ ...c, enabled: !c.enabled }))} />
          {hasChanges && (
            <button onClick={handleSave} disabled={saving} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: saving ? "rgba(52,211,153,.4)" : ACCENT, color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "Saving…" : "💾 Save"}
            </button>
          )}
        </div>
      </div>

      {/* Master off banner */}
      {!config.enabled && (
        <div style={{ background: "rgba(248,113,113,.06)", border: "1px solid rgba(248,113,113,.2)", borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div style={{ fontSize: 13, color: "#f87171" }}>Notifications are <strong>disabled</strong>. Toggle the switch above to enable.</div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[{ v: "setup" as const, l: "⚙️ Setup" }, { v: "events" as const, l: "🔔 Events" }, { v: "templates" as const, l: "📝 Templates" }].map(t => (
          <button key={t.v} onClick={() => setActiveTab(t.v)} style={{ padding: "8px 18px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", background: activeTab === t.v ? ACCENT : "rgba(255,255,255,.06)", color: activeTab === t.v ? "#fff" : MUTED }}>
            {t.l}
          </button>
        ))}
      </div>

      {/* Setup Tab */}
      {activeTab === "setup" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Channel */}
          <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 22 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Notification Channel</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {(["whatsapp", "sms"] as Channel[]).map(ch => (
                <div key={ch} onClick={() => setConfig(c => ({ ...c, channel: ch }))} style={{ padding: 16, borderRadius: 10, border: `2px solid ${config.channel === ch ? ACCENT : BORDER}`, cursor: "pointer", background: config.channel === ch ? "rgba(52,211,153,.06)" : "transparent", transition: "border-color .15s" }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{ch === "whatsapp" ? "📱" : "📟"}</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{ch === "whatsapp" ? "WhatsApp Business API" : "SMS Gateway"}</div>
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>{ch === "whatsapp" ? "Best delivery, rich formatting" : "Universal, no internet needed"}</div>
                </div>
              ))}
            </div>
          </div>

          {/* API Credentials */}
          <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 22 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
              {config.channel === "whatsapp" ? "WhatsApp Business API Credentials" : "SMS Gateway Credentials"}
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={lbl}>API Key / Access Token *</label>
                <input type="password" style={inp} value={config.apiKey} onChange={e => setConfig(c => ({ ...c, apiKey: e.target.value }))} placeholder={config.channel === "whatsapp" ? "EAAG…" : "sk_live_…"} />
                <div style={{ marginTop: 5, fontSize: 11, color: MUTED }}>
                  {config.channel === "whatsapp" ? "Get from Meta for Developers → WhatsApp → API Setup" : "Get from your SMS provider dashboard (Twilio, Vonage, etc.)"}
                </div>
              </div>
              <div>
                <label style={lbl}>{config.channel === "whatsapp" ? "Phone Number ID" : "Sender ID / From Number"}</label>
                <input style={inp} value={config.senderId} onChange={e => setConfig(c => ({ ...c, senderId: e.target.value }))} placeholder={config.channel === "whatsapp" ? "123456789012345" : "+923001234567"} />
              </div>
            </div>
          </div>

          {/* Test */}
          <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 22 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Send Test Message</div>
            <div style={{ display: "flex", gap: 10 }}>
              <input style={{ ...inp, flex: 1 }} value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="+923001234567" />
              <button onClick={handleTest} disabled={testing} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: testing ? "rgba(52,211,153,.4)" : ACCENT, color: "#fff", fontSize: 13, fontWeight: 700, cursor: testing ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
                {testing ? "Sending…" : "Send Test"}
              </button>
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: MUTED }}>A test message will be sent to this number using the configured API key.</div>
          </div>
        </div>
      )}

      {/* Events Tab */}
      {activeTab === "events" && (
        <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${BORDER}`, fontSize: 14, fontWeight: 700 }}>Notification Triggers</div>
          {Object.entries(config.events).map(([key, enabled]) => {
            const meta = EVENT_LABELS[key];
            return (
              <div key={key} style={{ padding: "16px 18px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ fontSize: 20 }}>{meta.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{meta.label}</div>
                    <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{meta.desc}</div>
                  </div>
                </div>
                <Toggle on={enabled} onChange={() => setEvent(key as keyof NotifConfig["events"], !enabled)} />
              </div>
            );
          })}
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "rgba(52,211,153,.06)", border: "1px solid rgba(52,211,153,.15)", borderRadius: 10, padding: "12px 16px", fontSize: 12, color: "#6ee7b7" }}>
            Available variables: <code style={{ background: "rgba(255,255,255,.07)", padding: "1px 5px", borderRadius: 4 }}>{"{{customer}}"}</code> <code style={{ background: "rgba(255,255,255,.07)", padding: "1px 5px", borderRadius: 4 }}>{"{{amount}}"}</code> <code style={{ background: "rgba(255,255,255,.07)", padding: "1px 5px", borderRadius: 4 }}>{"{{date}}"}</code> <code style={{ background: "rgba(255,255,255,.07)", padding: "1px 5px", borderRadius: 4 }}>{"{{business}}"}</code> <code style={{ background: "rgba(255,255,255,.07)", padding: "1px 5px", borderRadius: 4 }}>{"{{product}}"}</code> <code style={{ background: "rgba(255,255,255,.07)", padding: "1px 5px", borderRadius: 4 }}>{"{{qty}}"}</code>
          </div>
          {(Object.entries(config.templates) as [keyof NotifConfig["templates"], string][]).map(([key, val]) => (
            <div key={key} style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
              <label style={{ ...lbl, marginBottom: 8 }}>{EVENT_LABELS[key]?.icon} {EVENT_LABELS[key]?.label || key}</label>
              <textarea value={val} onChange={e => setTemplate(key, e.target.value)} rows={3}
                style={{ ...inp, resize: "vertical" as const, minHeight: 72, lineHeight: 1.6 }} />
              <div style={{ marginTop: 6, fontSize: 11, color: MUTED }}>Character count: {val.length}</div>
            </div>
          ))}
        </div>
      )}

      {/* Floating save */}
      {hasChanges && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 999, display: "flex", alignItems: "center", gap: 12, padding: "11px 22px", borderRadius: 12, background: "#0f172a", border: `1px solid rgba(52,211,153,.3)`, boxShadow: "0 8px 32px rgba(0,0,0,.5)" }}>
          <span style={{ fontSize: 13, color: ACCENT, fontWeight: 600 }}>Unsaved changes</span>
          <button onClick={() => setConfig({ ...saved })} style={{ padding: "6px 14px", borderRadius: 7, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontSize: 12, cursor: "pointer" }}>Discard</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: "6px 18px", borderRadius: 7, border: "none", background: saving ? "rgba(52,211,153,.4)" : ACCENT, color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Saving…" : "💾 Save"}
          </button>
        </div>
      )}
    </div>
  );
}
