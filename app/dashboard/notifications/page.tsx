"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type Channel = "whatsapp" | "sms" | "email";

const NOTIF_TYPES = [
  { key: "invoice_sent", label: "Invoice Sent", desc: "When a sales invoice is created" },
  { key: "payment_received", label: "Payment Received", desc: "When a payment receipt is recorded" },
  { key: "payment_reminder", label: "Payment Reminder", desc: "For overdue invoices" },
  { key: "low_stock", label: "Low Stock Alert", desc: "When item stock falls below threshold" },
];

export default function NotificationsPage() {
  const [status, setStatus] = useState<Record<string, boolean>>({});
  const [prefs, setPrefs] = useState<Record<string, Record<Channel, boolean>>>(() =>
    Object.fromEntries(NOTIF_TYPES.map((n) => [n.key, { whatsapp: true, sms: false, email: true }]))
  );
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState<Channel | null>(null);
  const [testResult, setTestResult] = useState("");
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [savingComms, setSavingComms] = useState(false);

  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappToken, setWhatsappToken] = useState("");
  const [whatsappPhoneId, setWhatsappPhoneId] = useState("");
  const [whatsappApiVersion, setWhatsappApiVersion] = useState("v18.0");

  useEffect(() => {
    const user = getCurrentUser();
    const h: Record<string, string> = {};
    if (user?.id)        h["x-user-id"]    = user.id;
    if (user?.role)      h["x-user-role"]  = user.role;
    if (user?.companyId) h["x-company-id"] = user.companyId;

    fetch("/api/notifications/status", { headers: h, credentials: "include" })
      .then((r) => r.json()).then((d) => setStatus(d)).catch(() => {});

    fetch("/api/notifications/preferences", { headers: h, credentials: "include" })
      .then((r) => r.json()).then((d) => { if (d.prefs) setPrefs(d.prefs); }).catch(() => {});

    fetch("/api/company/comms-config", { headers: h, credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const config = data?.whatsapp;
        if (!config) return;
        setWhatsappEnabled(Boolean(config.enabled));
        setWhatsappToken(config.token || "");
        setWhatsappPhoneId(config.phoneId || "");
        setWhatsappApiVersion(config.apiVersion || "v18.0");
      })
      .catch(() => {});
  }, []);

  function togglePref(notifKey: string, channel: Channel) {
    setPrefs((prev) => ({
      ...prev,
      [notifKey]: { ...prev[notifKey], [channel]: !prev[notifKey][channel] },
    }));
  }

  async function testChannel(ch: Channel) {
    if (!testPhone.trim()) {
      setTestResult("Please enter a destination first.");
      return;
    }
    setTesting(ch);
    setTestResult("");
    try {
      const res = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: ch, phone: testPhone }),
      });
      const d = await res.json();
      setTestResult(d.success ? `Test ${ch} sent successfully.` : `Failed: ${d.error || "Unknown error"}`);
    } catch {
      setTestResult("Connection error");
    } finally {
      setTesting(null);
    }
  }

  async function savePrefs() {
    setSavingPrefs(true);
    try {
      await fetch("/api/notifications/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefs }),
      });
      alert("Notification preferences saved.");
    } finally {
      setSavingPrefs(false);
    }
  }

  async function saveWhatsAppConfig() {
    setSavingComms(true);
    try {
      const res = await fetch("/api/company/comms-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsapp: {
            enabled: whatsappEnabled,
            provider: "meta",
            token: whatsappToken,
            phoneId: whatsappPhoneId,
            apiVersion: whatsappApiVersion,
          },
        }),
      });
      if (!res.ok) throw new Error("Failed to save WhatsApp configuration");
      const latest = await fetch("/api/notifications/status").then((r) => r.json()).catch(() => null);
      if (latest) setStatus(latest);
      alert("WhatsApp configuration saved securely for this company.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to save WhatsApp configuration");
    } finally {
      setSavingComms(false);
    }
  }

  return (
    <div style={{ padding: "24px 28px", maxWidth: 980, fontFamily: "'Outfit','DM Sans',sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "white", margin: "0 0 4px" }}>Notifications & Alerts</h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0 }}>
          Har company apni encrypted WhatsApp settings aur notification preferences yahan manage karegi.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { key: "whatsapp", label: "WhatsApp", icon: "💬" },
          { key: "sms", label: "SMS", icon: "📱" },
          { key: "email", label: "Email", icon: "📧" },
        ].map((item) => (
          <div key={item.key} style={{ padding: "18px 20px", borderRadius: 14, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontWeight: 700, color: "white" }}>{item.icon} {item.label}</div>
              <span style={{ fontSize: 11, color: status[item.key] ? "#34d399" : "#f87171" }}>
                {status[item.key] ? "Configured" : "Not Set"}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ borderRadius: 14, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", padding: 20, marginBottom: 18 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "white", marginTop: 0 }}>WhatsApp Business API</h2>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>
          Ye credentials company-level encrypted storage me save hongi, `.env` me nahi.
        </p>

        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "1fr 1fr" }}>
          <label style={{ color: "white", fontSize: 13 }}>
            <input type="checkbox" checked={whatsappEnabled} onChange={(e) => setWhatsappEnabled(e.target.checked)} style={{ marginRight: 8 }} />
            Enable company-specific WhatsApp
          </label>
          <div />
          <input value={whatsappToken} onChange={(e) => setWhatsappToken(e.target.value)} placeholder="Meta access token" style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.04)", color: "white" }} />
          <input value={whatsappPhoneId} onChange={(e) => setWhatsappPhoneId(e.target.value)} placeholder="Phone Number ID" style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.04)", color: "white" }} />
          <input value={whatsappApiVersion} onChange={(e) => setWhatsappApiVersion(e.target.value)} placeholder="v18.0" style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.04)", color: "white" }} />
        </div>

        <button onClick={saveWhatsAppConfig} disabled={savingComms} style={{ marginTop: 16, padding: "10px 16px", borderRadius: 10, border: "none", background: "#25D366", color: "#08131b", fontWeight: 700, cursor: "pointer" }}>
          {savingComms ? "Saving..." : "Save WhatsApp Configuration"}
        </button>
      </div>

      <div style={{ borderRadius: 14, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", padding: 20, marginBottom: 18 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "white", marginTop: 0 }}>Test Delivery</h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="phone ya email" style={{ flex: 1, minWidth: 220, padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.04)", color: "white" }} />
          {(["whatsapp", "sms", "email"] as Channel[]).map((ch) => (
            <button key={ch} onClick={() => testChannel(ch)} disabled={!!testing} style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(99,102,241,.3)", background: "rgba(99,102,241,.15)", color: "#a5b4fc", cursor: "pointer" }}>
              {testing === ch ? "Sending..." : `Test ${ch}`}
            </button>
          ))}
        </div>
        {testResult && <div style={{ marginTop: 12, color: "rgba(255,255,255,.75)", fontSize: 13 }}>{testResult}</div>}
      </div>

      <div style={{ borderRadius: 14, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "white", fontWeight: 700 }}>Notification Preferences</span>
          <button onClick={savePrefs} disabled={savingPrefs} style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: "#4f46e5", color: "white", cursor: "pointer" }}>
            {savingPrefs ? "Saving..." : "Save Preferences"}
          </button>
        </div>
        <div style={{ padding: 20 }}>
          {NOTIF_TYPES.map((n) => (
            <div key={n.key} style={{ display: "grid", gridTemplateColumns: "1.5fr repeat(3,120px)", gap: 10, alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
              <div>
                <div style={{ color: "white", fontWeight: 600 }}>{n.label}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>{n.desc}</div>
              </div>
              {(["whatsapp", "sms", "email"] as Channel[]).map((ch) => (
                <label key={ch} style={{ color: "rgba(255,255,255,.75)", fontSize: 13 }}>
                  <input type="checkbox" checked={prefs[n.key]?.[ch]} onChange={() => togglePref(n.key, ch)} style={{ marginRight: 8 }} />
                  {ch}
                </label>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
