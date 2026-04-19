"use client";
/**
 * Admin Marketing Automation
 * /admin/automation
 *
 * Tabs:
 *  1. WhatsApp Broadcasts   — bulk WhatsApp to all leads/subscribers
 *  2. Email Drip Campaigns  — multi-step email sequences for FinovaOS leads
 *  3. AI Content Generator  — generate marketing copy for FinovaOS
 *  4. Social Media          — redirect to /admin/social
 *  5. Lead Capture          — manage leads from website/forms
 *  6. Webhooks              — Zapier/Make integration
 *  7. Website Chatbot       — embeddable AI chatbot config
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

const F = "'Outfit','Inter',sans-serif";
const BG = "#070b14";
const PANEL = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.08)";

type Tab = "whatsapp" | "drip" | "content" | "social" | "leads" | "webhooks" | "chatbot" | "analytics";

function adminHdrs(json = false): Record<string, string> {
  const u = getCurrentUser();
  const h: Record<string, string> = {};
  if (json) h["Content-Type"] = "application/json";
  if (u?.id)   h["x-user-id"]   = u.id;
  if (u?.role) h["x-user-role"] = u.role;
  // Admin automation uses a special env-level company ID for FinovaOS itself
  const adminCo = process.env.NEXT_PUBLIC_ADMIN_COMPANY_ID || "";
  if (adminCo) h["x-company-id"] = adminCo;
  return h;
}

// ─── Shared atoms ─────────────────────────────────────────────────────────────
function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "20px 22px", ...style }}>{children}</div>;
}

function Inp({ label, ...p }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 5 }}>{label}</label>
      <input {...p} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.06)", color: "#e2e8f0", fontSize: 13, fontFamily: F, outline: "none", boxSizing: "border-box", ...p.style }} />
    </div>
  );
}

function Txta({ label, ...p }: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 5 }}>{label}</label>
      <textarea {...p} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.06)", color: "#e2e8f0", fontSize: 13, fontFamily: F, outline: "none", resize: "vertical", boxSizing: "border-box", ...p.style }} />
    </div>
  );
}

function Btn({ children, variant = "primary", loading = false, ...p }: {
  children: React.ReactNode; variant?: "primary" | "ghost" | "danger"; loading?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...p} disabled={loading || p.disabled} style={{
      padding: "8px 18px", borderRadius: 8, border: variant === "danger" ? "1px solid rgba(239,68,68,.3)" : "none",
      background: variant === "primary" ? "linear-gradient(135deg,#7c3aed,#2563eb)" : variant === "danger" ? "rgba(239,68,68,.12)" : "rgba(255,255,255,.07)",
      color: variant === "danger" ? "#f87171" : "#fff",
      fontSize: 13, fontFamily: F, fontWeight: 600, cursor: "pointer",
      opacity: (loading || p.disabled) ? 0.55 : 1, ...p.style,
    }}>{loading ? "..." : children}</button>
  );
}

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      background: ok ? "rgba(52,211,153,.12)" : "rgba(239,68,68,.12)",
      border: `1px solid ${ok ? "rgba(52,211,153,.3)" : "rgba(239,68,68,.3)"}`,
      color: ok ? "#34d399" : "#f87171",
      padding: "10px 18px", borderRadius: 10, fontSize: 13, fontFamily: F,
    }}>{msg}</div>
  );
}

function useToast() {
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const show = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };
  return { toast, show };
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function AdminAutomationPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("whatsapp");

  useEffect(() => {
    const u = getCurrentUser();
    if (!u || String(u.role || "").toUpperCase() !== "ADMIN") {
      router.replace("/admin/login");
      return;
    }
    setReady(true);
  }, []);

  if (!ready) return <div style={{ minHeight: "100vh", background: BG }} />;

  const tabs: { id: Tab; label: string; icon: string; color: string }[] = [
    { id: "whatsapp",  label: "WhatsApp Blasts",   icon: "💬", color: "#22c55e" },
    { id: "drip",      label: "Email Drip",        icon: "📧", color: "#38bdf8" },
    { id: "content",   label: "AI Content",        icon: "✍️", color: "#fbbf24" },
    { id: "social",    label: "Social Media",      icon: "📱", color: "#f472b6" },
    { id: "leads",     label: "Lead Management",   icon: "🎯", color: "#fb923c" },
    { id: "webhooks",  label: "Webhooks",          icon: "🔗", color: "#a78bfa" },
    { id: "chatbot",   label: "Website Chatbot",   icon: "🤖", color: "#38bdf8" },
    { id: "analytics", label: "Analytics",         icon: "📊", color: "#34d399" },
  ];

  return (
    <div style={{ fontFamily: F, color: "#e2e8f0", minHeight: "100vh", background: BG, padding: "32px 32px 32px 280px" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div style={{ fontSize: 28 }}>⚡</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, background: "linear-gradient(135deg,#a78bfa,#38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Marketing Automation
          </h1>
        </div>
        <p style={{ margin: 0, color: "rgba(255,255,255,.4)", fontSize: 14 }}>
          FinovaOS marketing — WhatsApp blasts, email campaigns, AI content, lead management
        </p>
      </div>

      {/* Stats bar */}
      <AdminAutomationStats />

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "28px 0 24px" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "8px 16px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontFamily: F,
            background: tab === t.id ? "linear-gradient(135deg,#7c3aed,#2563eb)" : PANEL,
            color: tab === t.id ? "#fff" : "rgba(255,255,255,.55)",
            fontWeight: tab === t.id ? 700 : 400,
            borderBottom: tab === t.id ? "none" : `1px solid ${BORDER}`,
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "whatsapp" && <WhatsAppBlastTab />}
      {tab === "drip"     && <DripTab />}
      {tab === "content"  && <ContentTab />}
      {tab === "social"   && <SocialTab />}
      {tab === "leads"    && <LeadsTab />}
      {tab === "webhooks"  && <WebhooksTab />}
      {tab === "chatbot"   && <ChatbotTab />}
      {tab === "analytics" && <AnalyticsTab />}
    </div>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────
function AdminAutomationStats() {
  const [stats, setStats] = useState({ leads: 0, chatMessages: 0, webhookHits: 0, contentGenerated: 0 });

  useEffect(() => {
    // Count from activity logs
    fetch("/api/admin/automation-stats", { headers: adminHdrs() })
      .then(r => r.json()).then(d => d && setStats(d)).catch(() => {});
  }, []);

  const items = [
    { label: "Total Leads", value: stats.leads, color: "#fb923c", icon: "🎯" },
    { label: "Chat Messages", value: stats.chatMessages, color: "#38bdf8", icon: "💬" },
    { label: "Webhook Hits", value: stats.webhookHits, color: "#a78bfa", icon: "🔗" },
    { label: "Content Generated", value: stats.contentGenerated, color: "#fbbf24", icon: "✍️" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
      {items.map(s => (
        <Card key={s.label} style={{ padding: "16px 18px" }}>
          <div style={{ fontSize: 20, marginBottom: 8 }}>{s.icon}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 3 }}>{s.label}</div>
        </Card>
      ))}
    </div>
  );
}

// ─── 1. WHATSAPP BLASTS ───────────────────────────────────────────────────────
function WhatsAppBlastTab() {
  const { toast, show } = useToast();
  const [phones, setPhones] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ phone: string; success: boolean; error?: string }[]>([]);
  const [autoReply, setAutoReply] = useState({ enabled: false, systemPrompt: "" });
  const [cfgLoading, setCfgLoading] = useState(false);

  function handleCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const nums = text.split(/[\r\n,;]+/).map(s => s.trim().replace(/[^0-9+]/g, "")).filter(s => s.length >= 10);
      setPhones(prev => [...new Set([...prev.split(/[\n,]/).map(p => p.trim()).filter(Boolean), ...nums])].join("\n"));
      show(`${nums.length} numbers imported from CSV`, true);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  useEffect(() => {
    fetch("/api/whatsapp/send", { headers: adminHdrs() })
      .then(r => r.json()).then(d => { if (!d.error) setAutoReply(d); }).catch(() => {});
  }, []);

  async function sendBlast() {
    const list = phones.split(/[\n,]/).map(p => p.trim()).filter(Boolean);
    if (!list.length || !msg.trim()) return show("Phone numbers and message are both required", false);
    setLoading(true);
    setResults([]);

    const res: typeof results = [];
    for (const phone of list) {
      const r = await fetch("/api/whatsapp/send", {
        method: "POST", headers: adminHdrs(true),
        body: JSON.stringify({ to: phone, type: "text", text: msg }),
      });
      const d = await r.json();
      res.push({ phone, success: r.ok, error: d.error });
    }
    setResults(res);
    setLoading(false);
    const sent = res.filter(x => x.success).length;
    show(`${sent}/${list.length} messages sent`, sent > 0);
  }

  async function saveAutoReply() {
    setCfgLoading(true);
    const r = await fetch("/api/whatsapp/send", {
      method: "PUT", headers: adminHdrs(true),
      body: JSON.stringify(autoReply),
    });
    setCfgLoading(false);
    show(r.ok ? "Saved" : "Failed", r.ok);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      {toast && <Toast {...toast} />}

      <Card>
        <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700 }}>Bulk WhatsApp Blast</h3>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 0, marginBottom: 16 }}>
          Send a message to multiple numbers at once. Pakistani format supported: 03001234567
        </p>
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
            <label style={{ fontSize: 12, color: "rgba(255,255,255,.5)" }}>Phone Numbers (one per line or comma-separated)</label>
            <label style={{ fontSize: 11, color: "#38bdf8", cursor: "pointer", padding: "3px 10px", borderRadius: 6, border: "1px solid rgba(56,189,248,.3)", background: "rgba(56,189,248,.06)" }}>
              📂 Import CSV
              <input type="file" accept=".csv,.txt" onChange={handleCSV} style={{ display: "none" }} />
            </label>
          </div>
          <textarea value={phones} onChange={e => setPhones(e.target.value)} rows={5}
            placeholder={"03001234567\n03211234567\n923001234567"}
            style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "rgba(255,255,255,.06)", color: "#e2e8f0", fontSize: 13, fontFamily: F, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
        </div>
        <Txta label="Message" value={msg} onChange={e => setMsg(e.target.value)} rows={4} placeholder="Hello! FinovaOS..." />
        <Btn onClick={sendBlast} loading={loading}>Send Blast ({phones.split(/[\n,]/).filter(p => p.trim()).length} numbers)</Btn>

        {results.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginBottom: 8 }}>Results:</div>
            {results.map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0", borderBottom: `1px solid ${BORDER}` }}>
                <span style={{ color: "rgba(255,255,255,.6)" }}>{r.phone}</span>
                <span style={{ color: r.success ? "#34d399" : "#f87171" }}>{r.success ? "✓ Sent" : `✗ ${r.error}`}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700 }}>Auto-Reply (AI)</h3>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 0, marginBottom: 16 }}>
          When someone messages on WhatsApp, AI automatically replies on your behalf.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,.7)" }}>Auto-Reply</span>
          <div onClick={() => setAutoReply(c => ({ ...c, enabled: !c.enabled }))} style={{
            width: 40, height: 22, borderRadius: 11, cursor: "pointer",
            background: autoReply.enabled ? "#22c55e" : "rgba(255,255,255,.15)", position: "relative", transition: "background .2s",
          }}>
            <div style={{ position: "absolute", top: 3, left: autoReply.enabled ? 21 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
          </div>
        </div>
        <Txta label="AI System Prompt" value={autoReply.systemPrompt} onChange={e => setAutoReply(c => ({ ...c, systemPrompt: e.target.value }))} rows={5}
          placeholder="You are FinovaOS support assistant. Answer customer questions in Urdu or English..." />
        <div style={{ marginBottom: 16, padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,.03)", fontSize: 11, color: "rgba(255,255,255,.35)" }}>
          Webhook URL (add in Meta Business Manager):<br />
          <span style={{ color: "#a78bfa" }}>{typeof window !== "undefined" ? window.location.origin : ""}/api/whatsapp/webhook</span>
        </div>
        <Btn onClick={saveAutoReply} loading={cfgLoading}>Save Config</Btn>
      </Card>
    </div>
  );
}

// ─── 2. EMAIL DRIP ────────────────────────────────────────────────────────────
function DripTab() {
  const { toast, show } = useToast();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", steps: [{ delayDays: 0, subject: "", bodyHtml: "", useAI: false, aiPrompt: "" }] });
  const [enroll, setEnroll] = useState({ campaignId: "", email: "", name: "" });
  const [loading, setLoading] = useState(false);

  const load = () => {
    fetch("/api/automation/drip", { headers: adminHdrs() })
      .then(r => r.json()).then(d => Array.isArray(d) && setCampaigns(d)).catch(() => {});
  };
  useEffect(load, []);

  async function create() {
    if (!form.name) return show("Campaign name is required", false);
    setLoading(true);
    const r = await fetch("/api/automation/drip", { method: "POST", headers: adminHdrs(true), body: JSON.stringify(form) });
    setLoading(false);
    if (r.ok) { show("Campaign created!", true); setForm({ name: "", steps: [{ delayDays: 0, subject: "", bodyHtml: "", useAI: false, aiPrompt: "" }] }); load(); }
    else show("Failed", false);
  }

  async function enrollContact() {
    if (!enroll.campaignId || !enroll.email) return show("Campaign and email are both required", false);
    setLoading(true);
    const r = await fetch("/api/automation/drip?action=enroll", { method: "POST", headers: adminHdrs(true), body: JSON.stringify(enroll) });
    setLoading(false);
    show(r.ok ? "Enrolled!" : "Failed", r.ok);
  }

  const addStep = () => setForm(f => ({ ...f, steps: [...f.steps, { delayDays: 1, subject: "", bodyHtml: "", useAI: false, aiPrompt: "" }] }));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      {toast && <Toast {...toast} />}

      <Card>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Create Campaign</h3>
        <Inp label="Campaign Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="FinovaOS Welcome Series" />
        {form.steps.map((step, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,.03)", borderRadius: 10, padding: 12, marginBottom: 10, border: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginBottom: 8 }}>Step {i + 1}</div>
            <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 10 }}>
              <Inp label="Delay (days)" type="number" value={step.delayDays}
                onChange={e => setForm(f => ({ ...f, steps: f.steps.map((s, j) => j === i ? { ...s, delayDays: +e.target.value } : s) }))} />
              <Inp label="Subject" value={step.subject}
                onChange={e => setForm(f => ({ ...f, steps: f.steps.map((s, j) => j === i ? { ...s, subject: e.target.value } : s) }))}
                placeholder="Welcome to FinovaOS!" />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <input type="checkbox" checked={step.useAI} onChange={e => setForm(f => ({ ...f, steps: f.steps.map((s, j) => j === i ? { ...s, useAI: e.target.checked } : s) }))} />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,.5)" }}>Generate body with AI</span>
            </div>
            {step.useAI
              ? <Inp label="AI Prompt" value={step.aiPrompt} onChange={e => setForm(f => ({ ...f, steps: f.steps.map((s, j) => j === i ? { ...s, aiPrompt: e.target.value } : s) }))} placeholder="Welcome email for a new FinovaOS user..." />
              : <Txta label="Email Body" value={step.bodyHtml} onChange={e => setForm(f => ({ ...f, steps: f.steps.map((s, j) => j === i ? { ...s, bodyHtml: e.target.value } : s) }))} rows={3} />
            }
          </div>
        ))}
        <div style={{ display: "flex", gap: 10 }}>
          <Btn variant="ghost" onClick={addStep}>+ Step</Btn>
          <Btn onClick={create} loading={loading}>Create Campaign</Btn>
        </div>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Enroll a Lead</h3>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 5 }}>Campaign</label>
            <select value={enroll.campaignId} onChange={e => setEnroll(v => ({ ...v, campaignId: e.target.value }))}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "rgba(255,255,255,.06)", color: "#e2e8f0", fontSize: 13, fontFamily: F }}>
              <option value="">Select...</option>
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <Inp label="Email" value={enroll.email} onChange={e => setEnroll(v => ({ ...v, email: e.target.value }))} placeholder="lead@email.com" />
          <Inp label="Name" value={enroll.name} onChange={e => setEnroll(v => ({ ...v, name: e.target.value }))} placeholder="Ahmed Ali" />
          <Btn onClick={enrollContact} loading={loading}>Enroll</Btn>
        </Card>

        <Card>
          <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700 }}>Campaigns ({campaigns.length})</h3>
          {campaigns.length === 0 && <p style={{ color: "rgba(255,255,255,.3)", fontSize: 13 }}>No campaigns yet</p>}
          {campaigns.map(c => (
            <div key={c.id} style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,.04)", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>{c.steps?.length || 0} steps</div>
              </div>
              <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, height: "fit-content", background: c.active ? "rgba(34,197,94,.15)" : "rgba(255,255,255,.05)", color: c.active ? "#22c55e" : "#888" }}>
                {c.active ? "Active" : "Paused"}
              </span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ─── 3. AI CONTENT ────────────────────────────────────────────────────────────
function ContentTab() {
  const { toast, show } = useToast();
  const [form, setForm] = useState({ type: "social_post", topic: "", tone: "professional", language: "en", keywords: "", wordCount: 150, context: "FinovaOS — Pakistan's No.1 AI-powered business management software" });
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const types = ["social_post", "email", "ad_copy", "product_desc", "whatsapp", "blog_intro"];

  async function generate() {
    if (!form.topic) return show("Topic is required", false);
    setLoading(true); setResult("");
    const r = await fetch("/api/automation/content", {
      method: "POST", headers: adminHdrs(true),
      body: JSON.stringify({ ...form, keywords: form.keywords ? form.keywords.split(",").map(k => k.trim()) : [] }),
    });
    const d = await r.json();
    setLoading(false);
    if (r.ok) { setResult(d.content); show(`Generated (${d.wordCount} words)`, true); }
    else show(d.error || "Failed", false);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      {toast && <Toast {...toast} />}

      <Card>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>FinovaOS Marketing Content</h3>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 5 }}>Content Type</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {types.map(t => (
              <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))} style={{
                padding: "5px 12px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontFamily: F,
                background: form.type === t ? "linear-gradient(135deg,#7c3aed,#2563eb)" : "rgba(255,255,255,.07)",
                color: form.type === t ? "#fff" : "rgba(255,255,255,.55)",
              }}>{t.replace(/_/g, " ")}</button>
            ))}
          </div>
        </div>

        <Txta label="What to write about?" value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} rows={3}
          placeholder="FinovaOS ka new feature launch — AI-powered inventory management..." />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 5 }}>Tone</label>
            <select value={form.tone} onChange={e => setForm(f => ({ ...f, tone: e.target.value }))}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "rgba(255,255,255,.06)", color: "#e2e8f0", fontSize: 13, fontFamily: F }}>
              {["professional", "casual", "persuasive", "informative", "friendly"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 5 }}>Language</label>
            <select value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "rgba(255,255,255,.06)", color: "#e2e8f0", fontSize: 13, fontFamily: F }}>
              <option value="en">English</option>
              <option value="ur">Urdu / Roman Urdu</option>
            </select>
          </div>
        </div>

        <Inp label="Keywords" value={form.keywords} onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))} placeholder="FinovaOS, Pakistan, accounting software, AI" />
        <Inp label="Word Count" type="number" value={form.wordCount} onChange={e => setForm(f => ({ ...f, wordCount: +e.target.value }))} />
        <Txta label="Business Context" value={form.context} onChange={e => setForm(f => ({ ...f, context: e.target.value }))} rows={2} />
        <Btn onClick={generate} loading={loading}>Generate with Claude AI</Btn>
      </Card>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Generated Content</h3>
          {result && (
            <Btn variant="ghost" onClick={() => { navigator.clipboard?.writeText(result); show("Copied!", true); }} style={{ padding: "5px 12px", fontSize: 12 }}>Copy</Btn>
          )}
        </div>
        {loading && <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,.3)" }}>✍️ Generating...</div>}
        {!loading && !result && <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,.2)", fontSize: 13 }}>Fill the form and click Generate</div>}
        {result && (
          <div style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,.85)", padding: 16, borderRadius: 10, background: "rgba(255,255,255,.04)", border: `1px solid ${BORDER}` }}>
            {result}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── 4. LEAD MANAGEMENT ───────────────────────────────────────────────────────
function LeadsTab() {
  const { toast, show } = useToast();
  const [leads, setLeads] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", email: "", phone: "", source: "manual", notes: "" });
  const [loading, setLoading] = useState(false);

  const load = () => {
    fetch("/api/automation/leads", { headers: adminHdrs() })
      .then(r => r.json()).then(d => Array.isArray(d) && setLeads(d)).catch(() => {});
  };
  useEffect(load, []);

  async function add() {
    if (!form.name && !form.email) return show("Name or email is required", false);
    setLoading(true);
    const r = await fetch("/api/automation/leads", { method: "POST", headers: adminHdrs(true), body: JSON.stringify(form) });
    setLoading(false);
    if (r.ok) { show("Lead added!", true); setForm({ name: "", email: "", phone: "", source: "manual", notes: "" }); load(); }
    else show("Failed", false);
  }

  async function updateStatus(id: string, status: string) {
    await fetch("/api/automation/leads", { method: "PUT", headers: adminHdrs(true), body: JSON.stringify({ id, status }) });
    load();
  }

  async function deleteLead(id: string) {
    await fetch(`/api/automation/leads?id=${id}`, { method: "DELETE", headers: adminHdrs() });
    load();
  }

  const STATUS_COLOR: Record<string, string> = { new: "#38bdf8", contacted: "#a78bfa", qualified: "#22c55e", lost: "#f87171", won: "#fbbf24" };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>
      {toast && <Toast {...toast} />}

      <Card>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Add Lead</h3>
        <Inp label="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ahmed Ali" />
        <Inp label="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="ahmed@company.com" />
        <Inp label="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="03001234567" />
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 5 }}>Source</label>
          <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
            style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "rgba(255,255,255,.06)", color: "#e2e8f0", fontSize: 13, fontFamily: F }}>
            {["manual", "website", "facebook", "whatsapp", "referral", "google_ads"].map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
        </div>
        <Txta label="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
        <Btn onClick={add} loading={loading}>Add Lead</Btn>
      </Card>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>FinovaOS Leads ({leads.length})</h3>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["Name", "Email", "Phone", "Source", "Status", "Date", ""].map(h => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "rgba(255,255,255,.4)", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map(l => (
                <tr key={l.id} style={{ borderBottom: `1px solid rgba(255,255,255,.04)` }}>
                  <td style={{ padding: "8px 10px", fontWeight: 500 }}>{l.name || "—"}</td>
                  <td style={{ padding: "8px 10px", color: "rgba(255,255,255,.6)" }}>{l.email || "—"}</td>
                  <td style={{ padding: "8px 10px", color: "rgba(255,255,255,.6)" }}>{l.phone || "—"}</td>
                  <td style={{ padding: "8px 10px" }}><span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 5, background: "rgba(255,255,255,.07)" }}>{l.source}</span></td>
                  <td style={{ padding: "8px 10px" }}>
                    <select value={l.status} onChange={e => updateStatus(l.id, e.target.value)}
                      style={{ background: "transparent", border: "none", color: STATUS_COLOR[l.status] || "#888", fontSize: 12, fontFamily: F, cursor: "pointer" }}>
                      {Object.keys(STATUS_COLOR).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: "8px 10px", color: "rgba(255,255,255,.3)", fontSize: 11 }}>{new Date(l.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: "8px 10px" }}>
                    <button onClick={() => deleteLead(l.id)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 13 }}>✕</button>
                  </td>
                </tr>
              ))}
              {leads.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", padding: 30, color: "rgba(255,255,255,.2)" }}>No leads yet</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── 5. WEBHOOKS ─────────────────────────────────────────────────────────────
function WebhooksTab() {
  const { toast, show } = useToast();
  const [hooks, setHooks] = useState<any[]>([]);
  const [tokens, setTokens] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", url: "", events: "" });
  const [loading, setLoading] = useState(false);

  const load = () => {
    fetch("/api/automation/webhooks", { headers: adminHdrs() }).then(r => r.json()).then(d => Array.isArray(d) && setHooks(d)).catch(() => {});
    fetch("/api/automation/webhooks/inbound", { headers: adminHdrs() }).then(r => r.json()).then(d => Array.isArray(d) && setTokens(d)).catch(() => {});
  };
  useEffect(load, []);

  async function create() {
    if (!form.name || !form.url) return show("Name and URL are required", false);
    setLoading(true);
    const r = await fetch("/api/automation/webhooks", {
      method: "POST", headers: adminHdrs(true),
      body: JSON.stringify({ ...form, events: form.events ? form.events.split(",").map(e => e.trim()) : [] }),
    });
    setLoading(false);
    if (r.ok) { show("Webhook created!", true); setForm({ name: "", url: "", events: "" }); load(); }
    else show("Failed", false);
  }

  async function createToken() {
    setLoading(true);
    const r = await fetch("/api/automation/webhooks/inbound", { method: "POST", headers: adminHdrs(true), body: JSON.stringify({ name: "Admin Token" }) });
    const d = await r.json();
    setLoading(false);
    if (r.ok) { show(`Token: ${d.token}`, true); load(); }
    else show("Failed", false);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      {toast && <Toast {...toast} />}

      <Card>
        <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700 }}>Outbound Webhooks</h3>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 0, marginBottom: 16 }}>Send FinovaOS events to Zapier / Make</p>
        <Inp label="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Zapier Lead Notifier" />
        <Inp label="URL" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://hooks.zapier.com/..." />
        <Inp label="Events (* for all)" value={form.events} onChange={e => setForm(f => ({ ...f, events: e.target.value }))} placeholder="lead.created, *" />
        <Btn onClick={create} loading={loading}>Add Webhook</Btn>
        <div style={{ marginTop: 16 }}>
          {hooks.map(h => (
            <div key={h.id} style={{ padding: "9px 12px", borderRadius: 8, background: "rgba(255,255,255,.04)", marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{h.name}</span>
                <span style={{ fontSize: 11, color: h.active ? "#22c55e" : "#888" }}>{h.active ? "Active" : "Off"}</span>
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 2 }}>{h.url?.slice(0, 55)}...</div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700 }}>Inbound Tokens</h3>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 0, marginBottom: 16 }}>Receive data from Zapier / Make</p>
        <Btn onClick={createToken} loading={loading}>+ New Token</Btn>
        <div style={{ marginTop: 16 }}>
          {tokens.map(t => (
            <div key={t.id} style={{ padding: "9px 12px", borderRadius: 8, background: "rgba(255,255,255,.04)", marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{t.name}</div>
              <div style={{ fontSize: 10, color: "#a78bfa", wordBreak: "break-all" }}>
                {typeof window !== "undefined" ? window.location.origin : ""}/api/automation/webhooks/inbound?token={t.token}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 3 }}>Hits: {t.hitCount}</div>
            </div>
          ))}
          {tokens.length === 0 && <p style={{ color: "rgba(255,255,255,.3)", fontSize: 13 }}>No tokens yet</p>}
        </div>
      </Card>
    </div>
  );
}

// ─── 6. WEBSITE CHATBOT ───────────────────────────────────────────────────────
function ChatbotTab() {
  const { toast, show } = useToast();
  const [cfg, setCfg] = useState({ botName: "FinovaOS Support", greeting: "Hi! Any questions about FinovaOS? I'm here to help.", systemPrompt: "", primaryColor: "#7c3aed", active: true, widgetToken: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/chatbot", { headers: adminHdrs() })
      .then(r => r.json()).then(d => { if (!d.error) setCfg(d); }).catch(() => {});
  }, []);

  async function save() {
    setLoading(true);
    const r = await fetch("/api/chatbot", { method: "PUT", headers: adminHdrs(true), body: JSON.stringify(cfg) });
    setLoading(false);
    show(r.ok ? "Saved" : "Failed", r.ok);
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "https://finovaos.app";
  const embed = `<script src="${origin}/chatbot-widget.js"\n        data-token="${cfg.widgetToken}"\n        data-color="${cfg.primaryColor}"\n        data-title="${cfg.botName}"\n        data-api="${origin}/api/chatbot">\n</script>`;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      {toast && <Toast {...toast} />}

      <Card>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Chatbot Settings</h3>
        <Inp label="Bot Name" value={cfg.botName} onChange={e => setCfg(c => ({ ...c, botName: e.target.value }))} />
        <Inp label="Greeting" value={cfg.greeting} onChange={e => setCfg(c => ({ ...c, greeting: e.target.value }))} />
        <Txta label="System Prompt" value={cfg.systemPrompt} onChange={e => setCfg(c => ({ ...c, systemPrompt: e.target.value }))} rows={5}
          placeholder="You are FinovaOS AI assistant. FinovaOS is Pakistan's leading business software. Explain features, pricing, and onboarding to prospects..." />
        <Inp label="Color" type="color" value={cfg.primaryColor} onChange={e => setCfg(c => ({ ...c, primaryColor: e.target.value }))} style={{ height: 40 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,.7)" }}>Active</span>
          <div onClick={() => setCfg(c => ({ ...c, active: !c.active }))} style={{ width: 40, height: 22, borderRadius: 11, cursor: "pointer", background: cfg.active ? "#22c55e" : "rgba(255,255,255,.15)", position: "relative", transition: "background .2s" }}>
            <div style={{ position: "absolute", top: 3, left: cfg.active ? 21 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
          </div>
        </div>
        <Btn onClick={save} loading={loading}>Save</Btn>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card>
          <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700 }}>Embed on Your Website</h3>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 0, marginBottom: 12 }}>
            Paste this script tag before <code style={{ color: "#a78bfa" }}>&lt;/body&gt;</code> on your website.
          </p>
          <div style={{ position: "relative" }}>
            <pre style={{ background: "rgba(0,0,0,.5)", borderRadius: 10, padding: 14, fontSize: 11, color: "#a78bfa", overflowX: "auto", border: `1px solid ${BORDER}`, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
              {embed}
            </pre>
            <Btn variant="ghost" onClick={() => { navigator.clipboard?.writeText(embed); show("Copied!", true); }}
              style={{ position: "absolute", top: 8, right: 8, padding: "4px 10px", fontSize: 11 }}>Copy</Btn>
          </div>
        </Card>

        <Card>
          <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700 }}>Widget Token</h3>
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(0,0,0,.3)", fontFamily: "monospace", fontSize: 12, color: "#38bdf8", wordBreak: "break-all" }}>
            {cfg.widgetToken || "Loading..."}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── SOCIAL MEDIA TAB ─────────────────────────────────────────────────────────
function SocialTab() {
  const { toast, show } = useToast();

  // Credentials
  const [creds, setCreds] = useState({ fbToken: "", fbPageId: "", igToken: "", igAccountId: "", liToken: "", liOrgId: "" });
  const [savingCreds, setSavingCreds] = useState(false);

  // New post
  const [postText, setPostText]       = useState("");
  const [platforms, setPlatforms]     = useState<string[]>(["facebook"]);
  const [scheduleAt, setScheduleAt]   = useState("");
  const [imageUrl, setImageUrl]       = useState("");
  const [posting, setPosting]         = useState(false);

  // History
  const [posts, setPosts]             = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  useEffect(() => {
    // Load credentials + post history
    fetch("/api/automation/social", { headers: adminHdrs() })
      .then(r => r.json())
      .then(d => {
        if (d?.config) {
          const c = d.config;
          setCreds({
            fbToken: c.facebook?.accessToken || "",
            fbPageId: c.facebook?.pageId || "",
            igToken: c.instagram?.accessToken || "",
            igAccountId: c.instagram?.accountId || "",
            liToken: c.linkedin?.accessToken || "",
            liOrgId: c.linkedin?.orgId || "",
          });
        }
        setLoadingPosts(true);
        return fetch("/api/automation/social?action=list", { headers: adminHdrs() });
      })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setPosts(d); })
      .catch(() => {})
      .finally(() => setLoadingPosts(false));
  }, []);

  async function saveCreds() {
    setSavingCreds(true);
    try {
      const r = await fetch("/api/automation/social", {
        method: "PUT",
        headers: adminHdrs(true),
        body: JSON.stringify({
          facebook:  { accessToken: creds.fbToken, pageId: creds.fbPageId },
          instagram: { accessToken: creds.igToken, accountId: creds.igAccountId },
          linkedin:  { accessToken: creds.liToken, orgId: creds.liOrgId },
        }),
      });
      if (r.ok) show("Credentials saved!", true); else show("Save failed", false);
    } finally { setSavingCreds(false); }
  }

  async function createPost() {
    if (!postText.trim()) return show("Post text is required", false);
    if (!platforms.length) return show("Select at least one platform", false);
    setPosting(true);
    try {
      const r = await fetch("/api/automation/social", {
        method: "POST",
        headers: adminHdrs(true),
        body: JSON.stringify({
          text: postText, platforms, scheduledAt: scheduleAt || null, imageUrl: imageUrl || null,
        }),
      });
      const d = await r.json();
      if (r.ok) {
        show(scheduleAt ? "Post scheduled!" : "Post created!", true);
        setPostText(""); setScheduleAt(""); setImageUrl("");
        if (d?.id) setPosts(p => [d, ...p]);
        // If no schedule → publish immediately
        if (!scheduleAt && d?.id) {
          await fetch(`/api/automation/social?action=publish&id=${d.id}`, { method: "POST", headers: adminHdrs() });
          show("Published to platforms!", true);
        }
      } else show(d?.error || "Failed", false);
    } finally { setPosting(false); }
  }

  function togglePlatform(p: string) {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  }

  const PLATFORMS = [
    { id: "facebook",  label: "Facebook",  color: "#1877f2", icon: "📘" },
    { id: "instagram", label: "Instagram", color: "#e1306c", icon: "📸" },
    { id: "linkedin",  label: "LinkedIn",  color: "#0a66c2", icon: "💼" },
  ];

  const STATUS_COLOR: Record<string, string> = { draft: "#94a3b8", scheduled: "#fbbf24", published: "#22c55e", failed: "#f87171" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      {/* ── Platform credentials ── */}
      <Card>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>📱 Platform Credentials</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          {/* Facebook */}
          <div style={{ padding: "16px", borderRadius: 12, background: "rgba(24,119,242,.06)", border: "1px solid rgba(24,119,242,.2)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#60a5fa", marginBottom: 12 }}>📘 Facebook Page</div>
            <Inp label="Page Access Token" value={creds.fbToken} onChange={e => setCreds(c => ({ ...c, fbToken: e.target.value }))} placeholder="EAAxxxxx..." type="password" />
            <Inp label="Page ID" value={creds.fbPageId} onChange={e => setCreds(c => ({ ...c, fbPageId: e.target.value }))} placeholder="123456789" />
          </div>
          {/* Instagram */}
          <div style={{ padding: "16px", borderRadius: 12, background: "rgba(225,48,108,.06)", border: "1px solid rgba(225,48,108,.2)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f472b6", marginBottom: 12 }}>📸 Instagram Business</div>
            <Inp label="Access Token" value={creds.igToken} onChange={e => setCreds(c => ({ ...c, igToken: e.target.value }))} placeholder="EAAxxxxx..." type="password" />
            <Inp label="Instagram Account ID" value={creds.igAccountId} onChange={e => setCreds(c => ({ ...c, igAccountId: e.target.value }))} placeholder="17841400000000" />
          </div>
          {/* LinkedIn */}
          <div style={{ padding: "16px", borderRadius: 12, background: "rgba(10,102,194,.06)", border: "1px solid rgba(10,102,194,.2)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#60a5fa", marginBottom: 12 }}>💼 LinkedIn</div>
            <Inp label="Access Token" value={creds.liToken} onChange={e => setCreds(c => ({ ...c, liToken: e.target.value }))} placeholder="AQVxx..." type="password" />
            <Inp label="Organization URN / ID" value={creds.liOrgId} onChange={e => setCreds(c => ({ ...c, liOrgId: e.target.value }))} placeholder="urn:li:organization:12345" />
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <Btn onClick={saveCreds} loading={savingCreds}>Save Credentials</Btn>
          <p style={{ margin: "8px 0 0", fontSize: 11, color: "rgba(255,255,255,.3)" }}>
            Credentials are encrypted and stored securely. Get the Page Access Token from Meta Business Manager for Facebook/Instagram.
          </p>
        </div>
      </Card>

      {/* ── Create post ── */}
      <Card>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>✍️ New Post</h3>

        {/* Platform toggles */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 8 }}>POST TO</label>
          <div style={{ display: "flex", gap: 8 }}>
            {PLATFORMS.map(pl => (
              <button key={pl.id} onClick={() => togglePlatform(pl.id)} style={{
                padding: "7px 16px", borderRadius: 20, border: `2px solid ${platforms.includes(pl.id) ? pl.color : "rgba(255,255,255,.1)"}`,
                background: platforms.includes(pl.id) ? `${pl.color}22` : "transparent",
                color: platforms.includes(pl.id) ? "#fff" : "rgba(255,255,255,.4)",
                fontSize: 13, fontFamily: F, cursor: "pointer", fontWeight: 600, transition: "all .15s",
              }}>{pl.icon} {pl.label}</button>
            ))}
          </div>
        </div>

        <Txta label="Post Text" value={postText} onChange={e => setPostText(e.target.value)} rows={4} placeholder="Exciting new feature in FinovaOS! Now manage your business even more efficiently..." />
        <Inp label="Image URL (optional)" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://cdn.yourdomain.com/image.jpg" />
        <Inp label="Schedule (optional — blank = post now)" type="datetime-local" value={scheduleAt} onChange={e => setScheduleAt(e.target.value)} />

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <Btn onClick={createPost} loading={posting}>
            {scheduleAt ? "📅 Schedule Post" : "🚀 Post Now"}
          </Btn>
        </div>
      </Card>

      {/* ── Post history ── */}
      <Card>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>📋 Post History</h3>
        {loadingPosts ? (
          <div style={{ color: "rgba(255,255,255,.3)", fontSize: 13 }}>Loading...</div>
        ) : posts.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center", color: "rgba(255,255,255,.25)", fontSize: 13 }}>No posts yet</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {posts.map((p: any) => (
              <div key={p.id} style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: `1px solid rgba(255,255,255,.07)`, display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "#e2e8f0", marginBottom: 6, lineHeight: 1.5 }}>{p.text?.slice(0, 120)}{p.text?.length > 120 ? "…" : ""}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    {(p.platforms || []).map((pl: string) => (
                      <span key={pl} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.5)", fontWeight: 600, textTransform: "capitalize" }}>{pl}</span>
                    ))}
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: `${STATUS_COLOR[p.status] || "#94a3b8"}22`, color: STATUS_COLOR[p.status] || "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>{p.status}</span>
                    {p.scheduledAt && <span style={{ fontSize: 10, color: "rgba(255,255,255,.3)" }}>📅 {new Date(p.scheduledAt).toLocaleString()}</span>}
                  </div>
                </div>
                {p.status === "scheduled" && (
                  <Btn variant="ghost" style={{ fontSize: 11, padding: "5px 10px" }}
                    onClick={async () => {
                      await fetch(`/api/automation/social?action=publish&id=${p.id}`, { method: "POST", headers: adminHdrs() });
                      show("Published!", true);
                      setPosts(prev => prev.map(x => x.id === p.id ? { ...x, status: "published" } : x));
                    }}>Publish Now</Btn>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── 8. ANALYTICS ─────────────────────────────────────────────────────────────
function AnalyticsTab() {
  const { toast, show } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/automation-stats?days=${range}`, { headers: adminHdrs() })
      .then(r => r.json())
      .then(d => { if (d && !d.error) setStats(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [range]);

  const kpis = stats ? [
    { label: "Total Leads",        value: stats.leads            ?? 0, color: "#fb923c", icon: "🎯" },
    { label: "WhatsApp Sent",      value: stats.whatsappSent     ?? 0, color: "#22c55e", icon: "💬" },
    { label: "Emails Sent",        value: stats.emailsSent       ?? 0, color: "#38bdf8", icon: "📧" },
    { label: "Drip Campaigns",     value: stats.dripCampaigns    ?? 0, color: "#a78bfa", icon: "📋" },
    { label: "Content Generated",  value: stats.contentGenerated ?? 0, color: "#fbbf24", icon: "✍️" },
    { label: "Social Posts",       value: stats.socialPosts      ?? 0, color: "#f472b6", icon: "📱" },
    { label: "Webhook Hits",       value: stats.webhookHits      ?? 0, color: "#a78bfa", icon: "🔗" },
    { label: "Chat Messages",      value: stats.chatMessages     ?? 0, color: "#38bdf8", icon: "🤖" },
  ] : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {toast && <Toast {...toast} />}

      <Card style={{ padding: "14px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,.6)", fontWeight: 600 }}>Period:</span>
          {[{ v: "7", l: "Last 7 days" }, { v: "30", l: "Last 30 days" }, { v: "90", l: "Last 90 days" }].map(opt => (
            <button key={opt.v} onClick={() => setRange(opt.v)} style={{
              padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontFamily: F,
              background: range === opt.v ? "linear-gradient(135deg,#7c3aed,#2563eb)" : "rgba(255,255,255,.07)",
              color: range === opt.v ? "#fff" : "rgba(255,255,255,.5)", fontWeight: range === opt.v ? 700 : 400,
            }}>{opt.l}</button>
          ))}
        </div>
      </Card>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,.3)" }}>Loading analytics…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 14 }}>
          {kpis.map(k => (
            <Card key={k.label} style={{ padding: "18px 20px", background: `${k.color}0d`, border: `1px solid ${k.color}30` }}>
              <div style={{ fontSize: 22, marginBottom: 10 }}>{k.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: k.color, lineHeight: 1 }}>{k.value.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginTop: 6, fontWeight: 600 }}>{k.label}</div>
            </Card>
          ))}
        </div>
      )}

      {stats?.campaigns?.length > 0 && (
        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>📧 Email Drip Performance</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["Campaign", "Enrolled", "Emails Sent", "Status"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "rgba(255,255,255,.4)", fontWeight: 500, fontSize: 11 }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.campaigns.map((c: any) => (
                <tr key={c.id} style={{ borderBottom: `1px solid rgba(255,255,255,.04)` }}>
                  <td style={{ padding: "10px 12px", fontWeight: 600 }}>{c.name}</td>
                  <td style={{ padding: "10px 12px", color: "rgba(255,255,255,.6)" }}>{c.enrolledCount ?? 0}</td>
                  <td style={{ padding: "10px 12px", color: "#38bdf8" }}>{c.sentCount ?? 0}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 5, background: c.active ? "rgba(34,197,94,.12)" : "rgba(255,255,255,.06)", color: c.active ? "#22c55e" : "#888" }}>
                      {c.active ? "Active" : "Paused"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {stats?.leadsByStage && (
        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>🎯 Lead Funnel</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Object.entries(stats.leadsByStage as Record<string, number>).map(([stage, count]) => {
              const total = Object.values(stats.leadsByStage as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
              const pct = total ? Math.round((count / total) * 100) : 0;
              const colors: Record<string, string> = { new: "#818cf8", contacted: "#38bdf8", qualified: "#22c55e", lost: "#f87171", won: "#fbbf24" };
              return (
                <div key={stage}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: "rgba(255,255,255,.7)", textTransform: "capitalize" }}>{stage}</span>
                    <span style={{ color: "rgba(255,255,255,.4)" }}>{count} ({pct}%)</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,.06)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: colors[stage] || "#818cf8", borderRadius: 3 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
