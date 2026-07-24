"use client";
import { useEffect, useState } from "react";
import { useResponsive } from "@/hooks/useResponsive";

const FONT = "'Outfit','Inter',sans-serif";

type Tab = "overview" | "whatsapp" | "drip" | "webhooks" | "leads" | "sheets" | "social" | "content" | "chatbot";

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

// ─── ANIMATED DEMO COMPONENTS ────────────────────────────────────────────────
function WADemo() {
  const messages = [
    { from: "user", text: "Hi, what's the status of my order #1234?" },
    { from: "ai",   text: "Hello! 👋 Your order #1234 is being packed and ships today. You'll get a tracking SMS shortly." },
    { from: "user", text: "Can I change the delivery address?" },
    { from: "ai",   text: "Of course! Share your new address and I'll update it right away ✅" },
  ];
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(0);
    const t = setInterval(() => setCount(p => Math.min(p + 1, messages.length)), 1100);
    return () => clearInterval(t);
  }, []);
  return (
    <div>
      <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "demoPing 1.2s infinite" }} />
        LIVE PREVIEW — WhatsApp AI Auto-Reply
      </div>
      <div style={{ background: "#0a1929", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(34,197,94,.2)" }}>
        <div style={{ background: "#075e54", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#128c7e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🏪</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "white" }}>Your Business</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>🤖 AI Auto-Reply Active</div>
          </div>
        </div>
        <div style={{ padding: "12px 14px", minHeight: 180, display: "flex", flexDirection: "column", gap: 8 }}>
          {messages.slice(0, count).map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.from === "user" ? "flex-start" : "flex-end", animation: m.from === "user" ? "demoSlideL 0.4s ease" : "demoSlideR 0.4s ease" }}>
              <div style={{ maxWidth: "78%", padding: "7px 11px", borderRadius: m.from === "user" ? "0 10px 10px 10px" : "10px 0 10px 10px", background: m.from === "user" ? "rgba(255,255,255,.1)" : "#005c4b", fontSize: 11.5, color: "rgba(255,255,255,.9)", lineHeight: 1.4 }}>
                {m.text}
                {m.from === "ai" && <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginTop: 2, textAlign: "right" }}>🤖 AI ✓✓</div>}
              </div>
            </div>
          ))}
          {count > 0 && count < messages.length && (
            <div style={{ display: "flex", gap: 3, padding: "6px 10px", background: "rgba(255,255,255,.06)", borderRadius: "0 10px 10px 10px", width: "fit-content" }}>
              {[0, 0.2, 0.4].map((d, i) => <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", animation: `demoDot 1s ${d}s infinite` }} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DripDemo() {
  const steps = [
    { day: "Day 1",  subject: "Welcome to our store! 👋",          color: "#38bdf8" },
    { day: "Day 3",  subject: "Did you know about our rewards?",    color: "#818cf8" },
    { day: "Day 7",  subject: "Exclusive 10% off — just for you",   color: "#a78bfa" },
    { day: "Day 14", subject: "We miss you! Come back for a deal",  color: "#f472b6" },
  ];
  const [active, setActive] = useState(-1);
  useEffect(() => {
    setActive(-1);
    let i = -1;
    const t = setInterval(() => { i++; setActive(i); if (i >= steps.length - 1) clearInterval(t); }, 900);
    return () => clearInterval(t);
  }, []);
  return (
    <div>
      <div style={{ fontSize: 11, color: "#38bdf8", fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#38bdf8", display: "inline-block", animation: "demoPing 1.2s infinite" }} />
        LIVE PREVIEW — Email Drip Campaign
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 14px", borderRadius: 10, border: `1px solid ${i <= active ? s.color + "50" : "rgba(255,255,255,.07)"}`, background: i === active ? s.color + "12" : "transparent", transition: "all 0.5s ease" }}>
            <div style={{ fontSize: 16 }}>{i <= active ? "📧" : "📭"}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: i <= active ? s.color : "rgba(255,255,255,.3)", fontWeight: 700 }}>{s.day}</div>
              <div style={{ fontSize: 12, color: i <= active ? "rgba(255,255,255,.85)" : "rgba(255,255,255,.3)", fontWeight: i === active ? 600 : 400 }}>{s.subject}</div>
            </div>
            {i <= active && <div style={{ fontSize: 11, color: s.color, fontWeight: 700 }}>✓</div>}
          </div>
        ))}
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", textAlign: "right", marginTop: 4 }}>📊 1,234 subscribers • 32% avg open rate</div>
      </div>
    </div>
  );
}

function SocialDemo() {
  const phases = ["writing", "scheduling", "publishing", "posted"] as const;
  type Phase = typeof phases[number];
  const [phase, setPhase] = useState<Phase>("writing");
  useEffect(() => {
    setPhase("writing");
    let i = 0;
    const t = setInterval(() => { i++; if (i < phases.length) setPhase(phases[i]); else clearInterval(t); }, 1300);
    return () => clearInterval(t);
  }, []);
  const platforms = [{ icon: "📘", name: "Facebook", color: "#3b82f6" }, { icon: "📸", name: "Instagram", color: "#ec4899" }, { icon: "💼", name: "LinkedIn", color: "#0ea5e9" }];
  return (
    <div>
      <div style={{ fontSize: 11, color: "#f472b6", fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f472b6", display: "inline-block", animation: "demoPing 1.2s infinite" }} />
        LIVE PREVIEW — Social Media Auto-Post
      </div>
      <div style={{ background: "rgba(0,0,0,.3)", borderRadius: 12, padding: "16px", border: "1px solid rgba(244,114,182,.2)" }}>
        <div style={{ background: "rgba(255,255,255,.05)", borderRadius: 8, padding: "10px 12px", marginBottom: 12, fontSize: 12, color: "rgba(255,255,255,.8)", lineHeight: 1.5 }}>
          🚀 Summer Sale is here! Up to 50% off select items. Shop in-store or online. Limited stock — act now! 🛍️ #SummerSale
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {platforms.map(p => (
            <div key={p.name} style={{ flex: 1, padding: "8px 4px", borderRadius: 8, background: phase === "posted" ? p.color + "20" : "rgba(255,255,255,.04)", border: `1px solid ${phase === "posted" ? p.color + "60" : "rgba(255,255,255,.08)"}`, textAlign: "center", transition: "all 0.5s ease" }}>
              <div style={{ fontSize: 18 }}>{p.icon}</div>
              <div style={{ fontSize: 10, color: phase === "posted" ? p.color : "rgba(255,255,255,.4)", fontWeight: 600, marginTop: 2 }}>{phase === "posted" ? "✓ Posted" : p.name}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: "8px 12px", borderRadius: 8, textAlign: "center", fontSize: 12, fontWeight: 700, transition: "all 0.4s", background: phase === "posted" ? "rgba(34,197,94,.1)" : "rgba(255,255,255,.05)", border: `1px solid ${phase === "posted" ? "rgba(34,197,94,.3)" : "rgba(255,255,255,.08)"}`, color: phase === "posted" ? "#22c55e" : "rgba(255,255,255,.5)" }}>
          {phase === "writing"    && "✏️ Composing..."}
          {phase === "scheduling" && "📅 Scheduling..."}
          {phase === "publishing" && "📤 Publishing to 3 platforms..."}
          {phase === "posted"     && "✅ Published to all 3 platforms!"}
        </div>
      </div>
    </div>
  );
}

function ContentDemo() {
  const full = "🚀 Big announcement! Our summer collection just dropped — 50+ new styles, up to 50% off. Available in-store & online. Shop now before it sells out! ✨ #NewArrival #SummerSale";
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(0);
    const t = setInterval(() => setShown(p => Math.min(p + 4, full.length)), 55);
    return () => clearInterval(t);
  }, []);
  return (
    <div>
      <div style={{ fontSize: 11, color: "#fbbf24", fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fbbf24", display: "inline-block", animation: "demoPing 1.2s infinite" }} />
        LIVE PREVIEW — AI Content Generator
      </div>
      <div style={{ background: "rgba(0,0,0,.3)", borderRadius: 12, padding: isMobile ? "12px 10px" : "14px 16px", border: "1px solid rgba(251,191,36,.2)" }}>
        <div style={{ fontSize: 11, color: "#fbbf24", marginBottom: 8, fontWeight: 600 }}>Prompt: "Write a social post for our summer sale"</div>
        <div style={{ background: "rgba(255,255,255,.04)", borderRadius: 8, padding: "10px 12px", minHeight: 90, fontSize: 12.5, color: "rgba(255,255,255,.85)", lineHeight: 1.6 }}>
          {full.slice(0, shown)}
          {shown < full.length && <span style={{ display: "inline-block", width: 2, height: 13, background: "#fbbf24", marginLeft: 2, animation: "demoBlink 0.7s infinite", verticalAlign: "middle" }} />}
        </div>
        {shown >= full.length && (
          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
            {["📱 Post to Instagram", "📘 Post to Facebook", "📧 Use in Email", "📝 Generate variation"].map(t => (
              <span key={t} style={{ padding: "3px 8px", borderRadius: 6, background: "rgba(251,191,36,.1)", border: "1px solid rgba(251,191,36,.2)", fontSize: 10.5, color: "#fbbf24" }}>{t}</span>
            ))}
          </div>
        )}
        <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.3)", marginTop: 8, textAlign: "right" }}>⚡ Generated by FinovaOS AI</div>
      </div>
    </div>
  );
}

function LeadsDemo() {
  const leads = [
    { name: "Ahmed Khan",  source: "Facebook Ad",   status: "New",       color: "#38bdf8", val: "$450" },
    { name: "Sara Malik",  source: "Website Form",  status: "Contacted", color: "#a78bfa", val: "$780" },
    { name: "Bilal Raza",  source: "WhatsApp",      status: "Qualified", color: "#22c55e", val: "$1,200" },
  ];
  const [visible, setVisible] = useState(0);
  useEffect(() => {
    setVisible(0);
    const t = setInterval(() => setVisible(p => Math.min(p + 1, leads.length)), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div>
      <div style={{ fontSize: 11, color: "#fb923c", fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fb923c", display: "inline-block", animation: "demoPing 1.2s infinite" }} />
        LIVE PREVIEW — CRM Lead Capture
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {leads.slice(0, visible).map((lead, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,.04)", border: `1px solid ${lead.color}30`, animation: "demoSlideD 0.4s ease" }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: `${lead.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, border: `1px solid ${lead.color}35`, flexShrink: 0 }}>👤</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "white" }}>{lead.name}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>via {lead.source}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ padding: "2px 8px", borderRadius: 20, background: `${lead.color}15`, color: lead.color, fontSize: 10.5, fontWeight: 700, border: `1px solid ${lead.color}30`, marginBottom: 3 }}>{lead.status}</div>
              <div style={{ fontSize: 12, color: "#22c55e", fontWeight: 700 }}>{lead.val}</div>
            </div>
          </div>
        ))}
        {visible < leads.length && <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", textAlign: "center", padding: 8 }}>Capturing new lead...</div>}
        {visible >= leads.length && <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", textAlign: "right", marginTop: 2 }}>✅ 3 leads captured automatically • 0 manual work</div>}
      </div>
    </div>
  );
}

function WebhooksDemo() {
  const nodes = [
    { icon: "🛒", label: "New Order",       sub: "Shopify / WooCommerce",      color: "#38bdf8" },
    { icon: "⚡", label: "Your System",      sub: "Automation trigger",          color: "#a78bfa" },
    { icon: "📊", label: "Google Sheets",    sub: "Row added automatically",     color: "#22c55e" },
    { icon: "💬", label: "WhatsApp Alert",   sub: "Owner notified instantly",    color: "#22c55e" },
  ];
  const [flow, setFlow] = useState(-1);
  useEffect(() => {
    setFlow(-1);
    let i = -1;
    const t = setInterval(() => {
      i++;
      setFlow(i);
      if (i >= nodes.length - 1) { clearInterval(t); setTimeout(() => setFlow(-1), 900); }
    }, 900);
    return () => clearInterval(t);
  }, []);
  return (
    <div>
      <div style={{ fontSize: 11, color: "#a78bfa", fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa", display: "inline-block", animation: "demoPing 1.2s infinite" }} />
        LIVE PREVIEW — Webhook Automation Flow
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {nodes.map((node, i) => (
          <div key={i}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 14px", borderRadius: 10, background: flow >= i ? `${node.color}10` : "rgba(255,255,255,.03)", border: `1px solid ${flow >= i ? node.color + "40" : "rgba(255,255,255,.07)"}`, transition: "all 0.5s ease" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: flow >= i ? `${node.color}20` : "rgba(255,255,255,.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, transition: "all 0.4s", border: `1px solid ${flow >= i ? node.color + "35" : "rgba(255,255,255,.08)"}` }}>
                {node.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, color: flow >= i ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.3)", fontWeight: flow >= i ? 600 : 400, transition: "all 0.3s" }}>{node.label}</div>
                <div style={{ fontSize: 10.5, color: flow >= i ? node.color : "rgba(255,255,255,.2)", transition: "all 0.3s" }}>{node.sub}</div>
              </div>
              {flow >= i && <div style={{ fontSize: 14, color: node.color }}>✓</div>}
            </div>
            {i < nodes.length - 1 && (
              <div style={{ marginLeft: 31, width: 2, height: 12, background: flow > i ? "#a78bfa50" : "rgba(255,255,255,.08)", transition: "all 0.4s" }} />
            )}
          </div>
        ))}
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", textAlign: "center", marginTop: 6 }}>Connect 5,000+ apps via Zapier &amp; Make.com</div>
      </div>
    </div>
  );
}

function UpsellGate() {
  type DemoId = "whatsapp" | "drip" | "social" | "content" | "leads" | "webhooks";
  const [demoTab, setDemoTab] = useState<DemoId>("whatsapp");
  const [autoPlay, setAutoPlay] = useState(true);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "bot"; text: string }[]>([
    { role: "bot", text: "👋 Hi! I can answer any question about the Automation Add-on. What would you like to know?" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatTyping, setChatTyping] = useState(false);

  const demoOrder: DemoId[] = ["whatsapp", "drip", "social", "content", "leads", "webhooks"];

  useEffect(() => {
    if (!autoPlay) return;
    const t = setInterval(() => setDemoTab(prev => {
      const i = demoOrder.indexOf(prev);
      return demoOrder[(i + 1) % demoOrder.length];
    }), 4200);
    return () => clearInterval(t);
  }, [autoPlay]);

  const FAQ: { kw: string[]; ans: string }[] = [
    { kw: ["price", "cost", "much", "79", "dollar", "expensive"], ans: "The Automation Add-on is $79/month — far less than individual tools: WATI $99, Mailchimp $99, Intercom $74, HubSpot $50, Zapier $49, Buffer $18 = $438+/mo. You save over $350 every month." },
    { kw: ["whatsapp", "reply", "message", "wa", "auto"], ans: "WhatsApp AI automatically replies to every customer message 24/7 using FinovaOS AI. You set a system prompt once, and it handles order status, FAQs, bookings — everything, instantly." },
    { kw: ["email", "drip", "campaign", "sequence", "nurture"], ans: "Email Drip Campaigns send a series of emails over time (Day 1 → Day 3 → Day 7...). Perfect for automatically onboarding new customers, nurturing leads, or re-engaging customers who haven't purchased recently." },
    { kw: ["social", "facebook", "instagram", "linkedin", "post", "schedule", "publish"], ans: "Social Media Scheduler lets you write a post once and publish to Facebook, Instagram, and LinkedIn simultaneously. Schedule in advance or publish instantly — zero manual work per platform." },
    { kw: ["content", "generate", "write", "copy", "ad"], ans: "AI Content Generator uses FinovaOS AI to write social posts, email copy, product descriptions, and ads in seconds. Just describe what you need and get professional copy instantly." },
    { kw: ["lead", "crm", "capture", "form", "contact"], ans: "CRM Lead Capture automatically saves leads from website forms, Facebook Lead Ads, and webhooks into your account. Every potential customer is captured and tracked — nothing falls through the cracks." },
    { kw: ["webhook", "zapier", "make", "connect", "integrate", "app"], ans: "Webhooks connect your account to 5,000+ apps via Zapier or Make.com. Trigger actions when orders are placed, send data to Google Sheets, notify your team on Slack — automate any workflow." },
    { kw: ["sheets", "google", "sync", "export", "spreadsheet"], ans: "Google Sheets Sync exports your leads, orders, and contacts to Google Sheets in real-time. Great for custom reports, sharing live data with your team, or feeding into your own analytics." },
    { kw: ["chatbot", "website", "embed", "widget", "bot"], ans: "Website Chatbot embeds on any website with one script tag. It answers visitor questions 24/7 using your business information as context — handles FAQs, pricing, hours, and more automatically." },
    { kw: ["trial", "free", "test", "try"], ans: "No free trial, but at $79/mo vs $438+/mo in individual tools, the ROI is immediate from day one. You can cancel anytime — no contracts, no lock-in." },
    { kw: ["cancel", "refund", "contract"], ans: "Cancel anytime — no long-term contracts. Billing is monthly. We offer pro-rated credits within the first 7 days if you're not satisfied." },
    { kw: ["setup", "easy", "start", "how", "begin", "install", "difficult"], ans: "Setup takes under 10 minutes. Each tool has a simple form — no coding required. WhatsApp, social, and chatbot tools are especially plug-and-play." },
  ];

  function getBotResponse(input: string): string {
    const lower = input.toLowerCase();
    for (const { kw, ans } of FAQ) {
      if (kw.some(k => lower.includes(k))) return ans;
    }
    return "Great question! The Add-on includes: 💬 WhatsApp AI, 📧 Email Drip, 📱 Social Scheduler, ✍️ AI Content, 👥 CRM Leads, 🔗 Webhooks, 📊 Sheets Sync, and 🤖 Website Chatbot — all for $79/month. Which feature would you like to know more about?";
  }

  function doSendChat(msg: string) {
    if (!msg.trim()) return;
    setChatMessages(prev => [...prev, { role: "user", text: msg }]);
    setChatTyping(true);
    setTimeout(() => {
      setChatMessages(prev => [...prev, { role: "bot", text: getBotResponse(msg) }]);
      setChatTyping(false);
    }, 700 + Math.random() * 500);
  }

  const DEMO_TABS: { id: DemoId; label: string; icon: string; color: string }[] = [
    { id: "whatsapp", label: "WhatsApp AI", icon: "💬", color: "#22c55e" },
    { id: "drip",     label: "Email Drip",  icon: "📧", color: "#38bdf8" },
    { id: "social",   label: "Social",      icon: "📱", color: "#f472b6" },
    { id: "content",  label: "AI Content",  icon: "✍️", color: "#fbbf24" },
    { id: "leads",    label: "CRM Leads",   icon: "👥", color: "#fb923c" },
    { id: "webhooks", label: "Webhooks",    icon: "🔗", color: "#a78bfa" },
  ];

  const QUICK_QS = ["How much does it cost?", "How does WhatsApp AI work?", "What social platforms?", "Is setup easy?", "Can I cancel anytime?"];

  return (
    <div style={{ marginBottom: 28, fontFamily: FONT }}>
      <style>{`
        @keyframes demoPing   { 0%,100%{opacity:.4;transform:scale(.8)} 50%{opacity:1;transform:scale(1)} }
        @keyframes demoDot    { 0%,80%,100%{transform:scale(.6);opacity:.4} 40%{transform:scale(1);opacity:1} }
        @keyframes demoSlideL { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
        @keyframes demoSlideR { from{opacity:0;transform:translateX(8px)}  to{opacity:1;transform:translateX(0)} }
        @keyframes demoSlideD { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes demoBlink  { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes demoFadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{ borderRadius: 20, background: "linear-gradient(135deg,rgba(124,58,237,.2),rgba(37,99,235,.14))", border: "1px solid rgba(124,58,237,.4)", overflow: "hidden", marginBottom: 16 }}>
        <div style={{ height: 3, background: "linear-gradient(90deg,#7c3aed,#2563eb,#a78bfa,#38bdf8)" }} />
        <div style={{ padding: isMobile ? "12px 12px" : "22px 26px", display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <div style={{ width: 50, height: 50, borderRadius: 14, background: "linear-gradient(135deg,#7c3aed,#2563eb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>⚡</div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "white" }}>Business Automation Add-on</h2>
              <span style={{ padding: "3px 10px", borderRadius: 20, background: "rgba(251,191,36,.15)", color: "#fbbf24", fontSize: 11, fontWeight: 700, border: "1px solid rgba(251,191,36,.3)" }}>$79/month</span>
              <span style={{ padding: "3px 10px", borderRadius: 20, background: "rgba(34,197,94,.1)", color: "#22c55e", fontSize: 11, fontWeight: 700, border: "1px solid rgba(34,197,94,.25)" }}>Save $358+/mo</span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.55)", lineHeight: 1.6 }}>
              8+ AI-powered tools in one — replaces WATI, Mailchimp, HubSpot, Zapier, Buffer &amp; Intercom. See them live below, then add to your plan.
            </p>
          </div>
          <a href="/onboarding/payment/addon-automation?cycle=monthly" style={{ padding: "11px 22px", borderRadius: 10, background: "linear-gradient(135deg,#7c3aed,#2563eb)", color: "white", fontSize: 13, fontWeight: 700, textDecoration: "none", display: "inline-block", flexShrink: 0, whiteSpace: "nowrap" }}>
            Add to my plan →
          </a>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 350px", gap: 14 }}>
        <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ display: "flex", overflowX: "auto", borderBottom: "1px solid rgba(255,255,255,.08)", scrollbarWidth: "none" as const }}>
            {DEMO_TABS.map(dt => (
              <button key={dt.id} onClick={() => { setAutoPlay(false); setDemoTab(dt.id); }} style={{ padding: "11px 15px", border: "none", background: "transparent", cursor: "pointer", fontFamily: FONT, fontSize: 12, fontWeight: demoTab === dt.id ? 700 : 400, color: demoTab === dt.id ? dt.color : "rgba(255,255,255,.4)", borderBottom: demoTab === dt.id ? `2px solid ${dt.color}` : "2px solid transparent", whiteSpace: "nowrap" as const, transition: "all 0.15s" }}>
                {dt.icon} {dt.label}
              </button>
            ))}
          </div>
          <div style={{ padding: isMobile ? "12px 10px" : "18px 20px", minHeight: 280, position: "relative" as const }}>
            {demoTab === "whatsapp" && <WADemo key="wa" />}
            {demoTab === "drip"     && <DripDemo key="drip" />}
            {demoTab === "social"   && <SocialDemo key="social" />}
            {demoTab === "content"  && <ContentDemo key="content" />}
            {demoTab === "leads"    && <LeadsDemo key="leads" />}
            {demoTab === "webhooks" && <WebhooksDemo key="hooks" />}
            {autoPlay && (
              <div style={{ position: "absolute" as const, bottom: 10, right: 14, fontSize: 10.5, color: "rgba(255,255,255,.25)", display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", animation: "demoPing 1.2s infinite" }} />
                auto-play
              </div>
            )}
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(124,58,237,.25)", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column" as const }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.07)", background: "rgba(124,58,237,.08)", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#2563eb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🤖</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "white" }}>Automation Assistant</div>
              <div style={{ fontSize: 10.5, color: "#22c55e", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                Online — ask me anything
              </div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto" as const, padding: "12px 14px", display: "flex", flexDirection: "column" as const, gap: 8, maxHeight: 240 }}>
            {chatMessages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", animation: "demoFadeUp 0.25s ease" }}>
                <div style={{ maxWidth: "88%", padding: "7px 11px", borderRadius: m.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px", background: m.role === "user" ? "linear-gradient(135deg,#7c3aed,#2563eb)" : "rgba(255,255,255,.07)", border: m.role === "bot" ? "1px solid rgba(255,255,255,.09)" : "none", fontSize: 12, color: "rgba(255,255,255,.9)", lineHeight: 1.55 }}>
                  {m.text}
                </div>
              </div>
            ))}
            {chatTyping && (
              <div style={{ display: "flex", alignItems: "center", gap: 3, padding: "6px 10px", background: "rgba(255,255,255,.06)", borderRadius: "10px 10px 10px 3px", width: "fit-content", border: "1px solid rgba(255,255,255,.08)" }}>
                {[0, 0.2, 0.4].map((d, i) => <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#a78bfa", animation: `demoDot 1.1s ${d}s infinite` }} />)}
              </div>
            )}
          </div>

          <div style={{ padding: "6px 12px 4px", display: "flex", gap: 5, overflowX: "auto" as const, scrollbarWidth: "none" as const, borderTop: "1px solid rgba(255,255,255,.05)" }}>
            {QUICK_QS.map(q => (
              <button key={q} onClick={() => doSendChat(q)} style={{ padding: "4px 9px", borderRadius: 20, border: "1px solid rgba(124,58,237,.3)", background: "rgba(124,58,237,.07)", color: "#a78bfa", fontSize: 10.5, cursor: "pointer", fontFamily: FONT, whiteSpace: "nowrap" as const }}>{q}</button>
            ))}
          </div>

          <div style={{ padding: "8px 12px", borderTop: "1px solid rgba(255,255,255,.07)", display: "flex", gap: 6 }}>
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { const v = chatInput; setChatInput(""); doSendChat(v); } }}
              placeholder="Ask about any feature..."
              style={{ flex: 1, padding: "7px 11px", borderRadius: 8, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", color: "#e2e8f0", fontSize: 12, fontFamily: FONT, outline: "none" }}
            />
            <button onClick={() => { const v = chatInput; setChatInput(""); doSendChat(v); }} style={{ padding: "7px 13px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#7c3aed,#2563eb)", color: "white", fontSize: 13, cursor: "pointer" }}>→</button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, padding: "12px 18px", borderRadius: 12, background: "rgba(0,0,0,.25)", border: "1px solid rgba(255,255,255,.06)", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>ALTERNATIVES:</div>
        <div style={{ display: "flex", gap: 10, flex: 1, flexWrap: "wrap" }}>
          {[["WATI","$99"],["Mailchimp","$99"],["Intercom","$74"],["HubSpot","$50"],["Zapier","$49"],["Buffer","$18"]].map(([tool, price]) => (
            <span key={tool} style={{ fontSize: 11.5, color: "#475569" }}>{tool} <span style={{ color: "#f87171", fontWeight: 700 }}>{price}</span></span>
          ))}
        </div>
        <div style={{ fontSize: 13 }}>
          <span style={{ color: "#f87171", fontWeight: 900, textDecoration: "line-through" }}>$438+/mo</span>
          <span style={{ color: "#22c55e", fontWeight: 900, marginLeft: 8 }}>vs $79/mo</span>
        </div>
        <a href="/onboarding/payment/addon-automation?cycle=monthly" style={{ padding: "9px 18px", borderRadius: 10, background: "linear-gradient(135deg,#7c3aed,#2563eb)", color: "white", fontSize: 12, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
          Get Started →
        </a>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function AutomationPage() {
  const { isMobile } = useResponsive();
  const [tab, setTab] = useState<Tab>("overview");
  const [addonEnabled, setAddonEnabled] = useState<boolean | null>(null); // null = loading
  const [showActivatedBanner, setShowActivatedBanner] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("addon") === "activated") {
      setShowActivatedBanner(true);
      // Clean URL without reload
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(() => setShowActivatedBanner(false), 6000);
    }
    (async () => {
      try {
        const r = await fetch("/api/automation/addon-status", { headers: authHeaders() });
        const d = await r.json();
        setAddonEnabled(d.enabled === true);
      } catch {
        setAddonEnabled(false);
      }
    })();
  }, []);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "overview",  label: "Overview",        icon: "⚡" },
    { id: "whatsapp",  label: "WhatsApp",         icon: "💬" },
    { id: "drip",      label: "Email Drip",       icon: "📧" },
    { id: "webhooks",  label: "Webhooks",         icon: "🔗" },
    { id: "leads",     label: "CRM Leads",        icon: "👥" },
    { id: "sheets",    label: "Google Sheets",    icon: "📊" },
    { id: "social",    label: "Social Media",     icon: "📱" },
    { id: "content",   label: "AI Content",       icon: "✍️" },
    { id: "chatbot",   label: "Website Chatbot",  icon: "🤖" },
  ];

  return (
    <div style={{ fontFamily: FONT, color: "#e2e8f0", minHeight: "100vh", padding: isMobile ? "12px" : "24px" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, background: "linear-gradient(135deg,#a78bfa,#38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Business Automation
        </h1>
        <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,0.45)", fontSize: 14 }}>
          AI-powered automations for WhatsApp, email, social media, leads, and more
        </p>
      </div>

      {/* Activation success banner */}
      {showActivatedBanner && (
        <div style={{ marginBottom: 20, padding: isMobile ? "12px 10px" : "14px 20px", borderRadius: 12, background: "linear-gradient(135deg,rgba(34,197,94,.15),rgba(16,185,129,.1))", border: "1px solid rgba(34,197,94,.35)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22 }}>🎉</span>
          <div>
            <div style={{ fontWeight: 700, color: "#22c55e", fontSize: 15 }}>Automation Add-on Activated!</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>All automation tools are now unlocked for your account.</div>
          </div>
        </div>
      )}

      {addonEnabled === false && <UpsellGate />}

      {/* Tabs + content — only show if addon active (or still loading) */}
      {addonEnabled !== false && (
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

          {/* Tab content */}
          {tab === "overview"  && <OverviewTab onNavigate={setTab} />}
          {tab === "whatsapp"  && <WhatsAppTab />}
          {tab === "drip"      && <DripTab />}
          {tab === "webhooks"  && <WebhooksTab />}
          {tab === "leads"     && <LeadsTab />}
          {tab === "sheets"    && <SheetsTab />}
          {tab === "social"    && <SocialTab />}
          {tab === "content"   && <ContentTab />}
          {tab === "chatbot"   && <ChatbotTab />}
        </>
      )}
    </div>
  );
}

// ─── Shared UI atoms ──────────────────────────────────────────────────────────
function Card({ children, style = {}, onClick }: { children: React.ReactNode; style?: React.CSSProperties; onClick?: () => void }) {
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
    { id: "whatsapp" as Tab, icon: "💬", title: "WhatsApp Auto-Reply", desc: "AI-powered auto-replies to WhatsApp messages. Respond instantly 24/7.", color: "#22c55e" },
    { id: "drip" as Tab, icon: "📧", title: "Email Drip Campaigns", desc: "Multi-step email sequences that automatically nurture leads over time.", color: "#38bdf8" },
    { id: "webhooks" as Tab, icon: "🔗", title: "Zapier / Make Webhooks", desc: "Send & receive data to/from 5000+ apps via outbound and inbound webhooks.", color: "#a78bfa" },
    { id: "leads" as Tab, icon: "👥", title: "CRM Lead Capture", desc: "Capture leads from forms, Facebook Lead Ads, and webhooks into your CRM.", color: "#fb923c" },
    { id: "sheets" as Tab, icon: "📊", title: "Google Sheets Sync", desc: "Sync your leads, contacts, and data to Google Sheets automatically.", color: "#34d399" },
    { id: "social" as Tab, icon: "📱", title: "Social Media Posting", desc: "Schedule and auto-publish posts to Facebook, Instagram, and LinkedIn.", color: "#f472b6" },
    { id: "content" as Tab, icon: "✍️", title: "AI Content Generator", desc: "Generate social posts, email copy, ad content with FinovaOS AI in seconds.", color: "#fbbf24" },
    { id: "chatbot" as Tab, icon: "🤖", title: "Website Chatbot", desc: "Embed an AI chatbot on your website. Paste one script tag — it works instantly.", color: "#38bdf8" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
      {features.map(f => (
        <Card key={f.id} style={{ cursor: "pointer", transition: "transform 0.15s, border-color 0.15s" }}
          onClick={() => onNavigate(f.id)}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>{f.icon}</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: f.color, marginBottom: 6 }}>{f.title}</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>{f.desc}</div>
          <div style={{ marginTop: 14, fontSize: 12, color: f.color, fontWeight: 600 }}>Configure →</div>
        </Card>
      ))}
    </div>
  );
}

// ─── WHATSAPP ─────────────────────────────────────────────────────────────────
function WhatsAppTab() {
  const [cfg, setCfg] = useState({ enabled: false, systemPrompt: "" });
  const [loading, setLoading] = useState(false);
  const [sendTo, setSendTo] = useState("");
  const [sendText, setSendText] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    fetch("/api/whatsapp/send", { headers: authHeaders() })
      .then(r => r.json()).then(d => { if (!d.error) setCfg(d); }).catch(() => {});
  }, []);

  async function saveConfig() {
    setLoading(true);
    const r = await fetch("/api/whatsapp/send", {
      method: "PUT", headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(cfg),
    });
    setLoading(false);
    showToast(r.ok ? "Config saved" : "Save failed", r.ok);
  }

  async function sendMessage() {
    if (!sendTo || !sendText) return showToast("Fill phone and message", false);
    setLoading(true);
    const r = await fetch("/api/whatsapp/send", {
      method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ to: sendTo, type: "text", text: sendText }),
    });
    const d = await r.json();
    setLoading(false);
    showToast(r.ok ? `Sent! ID: ${d.messageId}` : d.error, r.ok);
    if (r.ok) { setSendTo(""); setSendText(""); }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
      {toast && <Toast {...toast} />}

      <Card>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Auto-Reply Configuration</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <label style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>Auto-reply enabled</label>
          <div onClick={() => setCfg(c => ({ ...c, enabled: !c.enabled }))} style={{
            width: 40, height: 22, borderRadius: 11, cursor: "pointer", transition: "background 0.2s",
            background: cfg.enabled ? "#22c55e" : "rgba(255,255,255,0.15)", position: "relative",
          }}>
            <div style={{
              position: "absolute", top: 3, left: cfg.enabled ? 21 : 3, width: 16, height: 16,
              borderRadius: "50%", background: "#fff", transition: "left 0.2s",
            }} />
          </div>
        </div>
        <Textarea label="AI System Prompt"
          value={cfg.systemPrompt}
          onChange={e => setCfg(c => ({ ...c, systemPrompt: e.target.value }))}
          rows={5}
          placeholder="You are a helpful business assistant. Reply politely and concisely..."
        />
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 14 }}>
          Webhook URL for Meta: <code style={{ color: "#a78bfa" }}>{typeof window !== "undefined" ? window.location.origin : ""}/api/whatsapp/webhook</code>
        </div>
        <Btn onClick={saveConfig} loading={loading}>Save Config</Btn>
      </Card>

      <Card>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Send Test Message</h3>
        <Input label="Phone Number (e.g. 03001234567)" value={sendTo} onChange={e => setSendTo(e.target.value)} placeholder="03001234567" />
        <Textarea label="Message" value={sendText} onChange={e => setSendText(e.target.value)} rows={4} placeholder="Hello! This is a test message." />
        <Btn onClick={sendMessage} loading={loading}>Send WhatsApp</Btn>
      </Card>
    </div>
  );
}

// ─── EMAIL DRIP ───────────────────────────────────────────────────────────────
function DripTab() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", steps: [{ delayDays: 0, subject: "", bodyHtml: "", useAI: false, aiPrompt: "" }] });
  const [enroll, setEnroll] = useState({ campaignId: "", email: "", name: "" });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    fetch("/api/automation/drip", { headers: authHeaders() })
      .then(r => r.json()).then(d => Array.isArray(d) && setCampaigns(d)).catch(() => {});
  }, []);

  async function createCampaign() {
    if (!form.name) return showToast("Campaign name required", false);
    setLoading(true);
    const r = await fetch("/api/automation/drip", {
      method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (r.ok) {
      showToast("Campaign created", true);
      setForm({ name: "", steps: [{ delayDays: 0, subject: "", bodyHtml: "", useAI: false, aiPrompt: "" }] });
      fetch("/api/automation/drip", { headers: authHeaders() }).then(r => r.json()).then(d => Array.isArray(d) && setCampaigns(d));
    } else showToast("Failed", false);
  }

  async function enrollContact() {
    if (!enroll.campaignId || !enroll.email) return showToast("Select campaign and enter email", false);
    setLoading(true);
    const r = await fetch("/api/automation/drip?action=enroll", {
      method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(enroll),
    });
    setLoading(false);
    showToast(r.ok ? "Enrolled!" : "Failed", r.ok);
  }

  const addStep = () => setForm(f => ({ ...f, steps: [...f.steps, { delayDays: 1, subject: "", bodyHtml: "", useAI: false, aiPrompt: "" }] }));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      {toast && <Toast {...toast} />}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Create Campaign</h3>
          <Input label="Campaign Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Welcome Series" />
          {form.steps.map((step, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "12px", marginBottom: 10, border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>Step {i + 1}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
                <Input label="Delay (days)" type="number" value={step.delayDays}
                  onChange={e => setForm(f => ({ ...f, steps: f.steps.map((s, j) => j === i ? { ...s, delayDays: +e.target.value } : s) }))} />
                <Input label="Email Subject" value={step.subject}
                  onChange={e => setForm(f => ({ ...f, steps: f.steps.map((s, j) => j === i ? { ...s, subject: e.target.value } : s) }))}
                  placeholder="Hello {{name}}!" />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <input type="checkbox" checked={step.useAI}
                  onChange={e => setForm(f => ({ ...f, steps: f.steps.map((s, j) => j === i ? { ...s, useAI: e.target.checked } : s) }))} />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Generate body with AI</span>
              </div>
              {step.useAI
                ? <Input label="AI Prompt" value={step.aiPrompt}
                    onChange={e => setForm(f => ({ ...f, steps: f.steps.map((s, j) => j === i ? { ...s, aiPrompt: e.target.value } : s) }))}
                    placeholder="Write a follow-up email for new customers..." />
                : <Textarea label="Email Body (HTML or plain)" value={step.bodyHtml}
                    onChange={e => setForm(f => ({ ...f, steps: f.steps.map((s, j) => j === i ? { ...s, bodyHtml: e.target.value } : s) }))}
                    rows={3} />
              }
            </div>
          ))}
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="secondary" onClick={addStep}>+ Add Step</Btn>
            <Btn onClick={createCampaign} loading={loading}>Create Campaign</Btn>
          </div>
        </Card>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Enroll Contact</h3>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 5 }}>Campaign</label>
            <select value={enroll.campaignId} onChange={e => setEnroll(v => ({ ...v, campaignId: e.target.value }))}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#e2e8f0", fontSize: 13, fontFamily: FONT }}>
              <option value="">Select campaign...</option>
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <Input label="Contact Email" value={enroll.email} onChange={e => setEnroll(v => ({ ...v, email: e.target.value }))} placeholder="customer@email.com" />
          <Input label="Contact Name" value={enroll.name} onChange={e => setEnroll(v => ({ ...v, name: e.target.value }))} placeholder="Ahmed Ali" />
          <Btn onClick={enrollContact} loading={loading}>Enroll</Btn>
        </Card>

        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Active Campaigns ({campaigns.length})</h3>
          {campaigns.length === 0 && <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>No campaigns yet</p>}
          {campaigns.map(c => (
            <div key={c.id} style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{c.steps?.length || 0} steps</div>
              </div>
              <div style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: c.active ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)", color: c.active ? "#22c55e" : "#888" }}>
                {c.active ? "Active" : "Paused"}
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
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
            FinovaOS sends data TO Zapier/Make when events happen.
          </p>
          <Input label="Webhook Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Zapier Lead Notifier" />
          <Input label="Target URL" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://hooks.zapier.com/hooks/..." />
          <Input label="Events (comma-separated, or * for all)" value={form.events} onChange={e => setForm(f => ({ ...f, events: e.target.value }))} placeholder="lead.created, invoice.paid" />
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

// ─── CRM LEADS ────────────────────────────────────────────────────────────────
function LeadsTab() {
  const [leads, setLeads] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", email: "", phone: "", source: "manual", notes: "" });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const load = () => {
    fetch("/api/automation/leads", { headers: authHeaders() })
      .then(r => r.json()).then(d => Array.isArray(d) && setLeads(d)).catch(() => {});
  };
  useEffect(load, []);

  async function createLead() {
    if (!form.name && !form.email && !form.phone) return showToast("At least one field required", false);
    setLoading(true);
    const r = await fetch("/api/automation/leads", {
      method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (r.ok) { showToast("Lead added", true); setForm({ name: "", email: "", phone: "", source: "manual", notes: "" }); load(); }
    else showToast("Failed", false);
  }

  async function updateStatus(id: string, status: string) {
    await fetch("/api/automation/leads", {
      method: "PUT", headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    load();
  }

  const statusColors: Record<string, string> = { new: "#38bdf8", contacted: "#a78bfa", qualified: "#22c55e", lost: "#f87171", won: "#fbbf24" };

  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "320px 1fr", gap: 20 }}>
      {toast && <Toast {...toast} />}

      <Card>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Add Lead</h3>
        <Input label="Full Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ahmed Ali" />
        <Input label="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="ahmed@email.com" />
        <Input label="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="03001234567" />
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 5 }}>Source</label>
          <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
            style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#e2e8f0", fontSize: 13, fontFamily: FONT }}>
            {["manual", "website", "facebook_lead_ads", "whatsapp", "referral", "walk_in"].map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
        </div>
        <Textarea label="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
        <Btn onClick={createLead} loading={loading}>Add Lead</Btn>

        <div style={{ marginTop: 18, padding: "12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
          <div style={{ fontWeight: 600, marginBottom: 6, color: "rgba(255,255,255,0.6)" }}>Facebook Lead Ads Webhook</div>
          <code style={{ color: "#a78bfa", fontSize: 11 }}>{typeof window !== "undefined" ? window.location.origin : ""}/api/automation/leads</code>
          <div style={{ marginTop: 4 }}>Verify token: <code style={{ color: "#38bdf8" }}>finovaos_leads</code></div>
        </div>
      </Card>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>CRM Leads ({leads.length})</h3>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {["Name", "Email", "Phone", "Source", "Status", "Created"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map(l => (
                <tr key={l.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "8px 10px", fontWeight: 500 }}>{l.name || "—"}</td>
                  <td style={{ padding: "8px 10px", color: "rgba(255,255,255,0.6)" }}>{l.email || "—"}</td>
                  <td style={{ padding: "8px 10px", color: "rgba(255,255,255,0.6)" }}>{l.phone || "—"}</td>
                  <td style={{ padding: "8px 10px" }}>
                    <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 5, background: "rgba(255,255,255,0.07)" }}>{l.source}</span>
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    <select value={l.status} onChange={e => updateStatus(l.id, e.target.value)}
                      style={{ background: "transparent", border: "none", color: statusColors[l.status] || "#888", fontSize: 12, fontFamily: FONT, cursor: "pointer" }}>
                      {Object.keys(statusColors).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: "8px 10px", color: "rgba(255,255,255,0.35)", fontSize: 11 }}>{new Date(l.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "30px", color: "rgba(255,255,255,0.2)" }}>No leads yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── GOOGLE SHEETS ────────────────────────────────────────────────────────────
function SheetsTab() {
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
          Push your FinovaOS data to Google Sheets with one click.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { action: "sync_leads", label: "Sync CRM Leads", icon: "👥", desc: "Export all leads to 'Leads' sheet" },
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

// ─── SOCIAL MEDIA ─────────────────────────────────────────────────────────────
function SocialTab() {
  const [data, setData] = useState<any>({ config: {}, posts: [] });
  const [form, setForm] = useState({ content: "", platforms: [] as string[], scheduledAt: "" });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const load = () => {
    fetch("/api/automation/social", { headers: authHeaders() }).then(r => r.json()).then(d => d && setData(d)).catch(() => {});
  };
  useEffect(load, []);

  const togglePlatform = (p: string) => setForm(f => ({
    ...f, platforms: f.platforms.includes(p) ? f.platforms.filter(x => x !== p) : [...f.platforms, p],
  }));

  async function createPost() {
    if (!form.content || !form.platforms.length) return showToast("Content and platform required", false);
    setLoading(true);
    const r = await fetch("/api/automation/social", {
      method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (r.ok) { showToast("Post queued!", true); setForm({ content: "", platforms: [], scheduledAt: "" }); load(); }
    else showToast("Failed", false);
  }

  const platforms = [
    { id: "facebook", label: "Facebook", color: "#1877f2", connected: data.config?.facebook?.connected },
    { id: "instagram", label: "Instagram", color: "#e1306c", connected: data.config?.instagram?.connected },
    { id: "linkedin", label: "LinkedIn", color: "#0a66c2", connected: data.config?.linkedin?.connected },
  ];

  const statusColors: Record<string, string> = { published: "#22c55e", scheduled: "#38bdf8", failed: "#f87171", pending: "#fbbf24" };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      {toast && <Toast {...toast} />}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Create Post</h3>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {platforms.map(p => (
              <div key={p.id} onClick={() => togglePlatform(p.id)} style={{
                padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600,
                border: `1px solid ${form.platforms.includes(p.id) ? p.color : "rgba(255,255,255,0.1)"}`,
                background: form.platforms.includes(p.id) ? `${p.color}22` : "transparent",
                color: form.platforms.includes(p.id) ? p.color : "rgba(255,255,255,0.5)",
                transition: "all 0.15s",
              }}>
                {p.label} {p.connected ? "✓" : "(not connected)"}
              </div>
            ))}
          </div>
          <Textarea label="Post Content" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={5} placeholder="Write your post here..." />
          <Input label="Schedule (optional)" type="datetime-local" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} />
          <Btn onClick={createPost} loading={loading}>
            {form.scheduledAt ? "Schedule Post" : "Publish Now"}
          </Btn>
        </Card>

        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Connect Platforms</h3>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 0, marginBottom: 14 }}>
            Go to Integrations → Notifications to set Facebook/Instagram/LinkedIn access tokens.
          </p>
          {platforms.map(p => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{p.label}</span>
              <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: p.connected ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.05)", color: p.connected ? "#22c55e" : "#888" }}>
                {p.connected ? "Connected" : "Not connected"}
              </span>
            </div>
          ))}
        </Card>
      </div>

      <Card>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Post History ({data.posts?.length || 0})</h3>
        {(data.posts || []).map((p: any) => (
          <div key={p.id} style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ display: "flex", gap: 6 }}>
                {p.platforms.map((pl: string) => (
                  <span key={pl} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(255,255,255,0.08)" }}>{pl}</span>
                ))}
              </div>
              <span style={{ fontSize: 11, color: statusColors[p.status] || "#888", fontWeight: 600 }}>{p.status}</span>
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.4 }}>{p.content.slice(0, 100)}{p.content.length > 100 ? "..." : ""}</div>
            {p.scheduledAt && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>Scheduled: {new Date(p.scheduledAt).toLocaleString()}</div>}
          </div>
        ))}
        {!data.posts?.length && <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>No posts yet</p>}
      </Card>
    </div>
  );
}

// ─── AI CONTENT GENERATION ────────────────────────────────────────────────────
function ContentTab() {
  const [form, setForm] = useState({ type: "social_post", topic: "", tone: "professional", language: "en", keywords: "", wordCount: 150, context: "" });
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  async function generate() {
    if (!form.topic) return showToast("Topic required", false);
    setLoading(true);
    setResult("");
    const r = await fetch("/api/automation/content", {
      method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, keywords: form.keywords ? form.keywords.split(",").map(k => k.trim()) : [] }),
    });
    const d = await r.json();
    setLoading(false);
    if (r.ok) { setResult(d.content); showToast(`Generated (${d.wordCount} words)`, true); }
    else showToast(d.error || "Failed", false);
  }

  const contentTypes = [
    { id: "social_post", label: "Social Post" },
    { id: "email", label: "Email" },
    { id: "ad_copy", label: "Ad Copy" },
    { id: "product_desc", label: "Product Desc" },
    { id: "whatsapp", label: "WhatsApp" },
    { id: "blog_intro", label: "Blog Intro" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      {toast && <Toast {...toast} />}

      <Card>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>AI Content Generator</h3>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 5 }}>Content Type</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {contentTypes.map(t => (
              <button key={t.id} onClick={() => setForm(f => ({ ...f, type: t.id }))} style={{
                padding: "5px 12px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontFamily: FONT,
                background: form.type === t.id ? "linear-gradient(135deg,#7c3aed,#2563eb)" : "rgba(255,255,255,0.07)",
                color: form.type === t.id ? "#fff" : "rgba(255,255,255,0.6)",
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        <Textarea label="Topic / What to write about" value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} rows={3}
          placeholder="New sale on electronics, 30% off all laptops this weekend..." />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 5 }}>Tone</label>
            <select value={form.tone} onChange={e => setForm(f => ({ ...f, tone: e.target.value }))}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#e2e8f0", fontSize: 13, fontFamily: FONT }}>
              {["professional", "casual", "persuasive", "informative", "friendly"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 5 }}>Language</label>
            <select value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#e2e8f0", fontSize: 13, fontFamily: FONT }}>
              <option value="en">English</option>
              <option value="ur">Urdu / Roman Urdu</option>
            </select>
          </div>
        </div>

        <Input label="Keywords (comma-separated)" value={form.keywords} onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))} placeholder="sale, discount, electronics, Lahore" />
        <Input label="Target Word Count" type="number" value={form.wordCount} onChange={e => setForm(f => ({ ...f, wordCount: +e.target.value }))} />
        <Textarea label="Business Context (optional)" value={form.context} onChange={e => setForm(f => ({ ...f, context: e.target.value }))} rows={2}
          placeholder="We are a Lahore-based electronics retailer specializing in laptops..." />
        <Btn onClick={generate} loading={loading}>Generate with AI</Btn>
      </Card>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Generated Content</h3>
          {result && (
            <Btn variant="secondary" onClick={() => { navigator.clipboard?.writeText(result); showToast("Copied!", true); }}>
              Copy
            </Btn>
          )}
        </div>
        {loading && (
          <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.4)" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>✍️</div>
            <div>Generating...</div>
          </div>
        )}
        {!loading && !result && (
          <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
            Fill in the form and click Generate to create AI content
          </div>
        )}
        {result && (
          <div style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)", padding: "16px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {result}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── WEBSITE CHATBOT ──────────────────────────────────────────────────────────
function ChatbotTab() {
  const [cfg, setCfg] = useState({ botName: "Assistant", greeting: "Hi! How can I help you today?", systemPrompt: "", primaryColor: "#7c3aed", active: true, widgetToken: "" });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    fetch("/api/chatbot", { headers: authHeaders() })
      .then(r => r.json()).then(d => { if (!d.error) setCfg(d); }).catch(() => {});
  }, []);

  async function saveConfig() {
    setLoading(true);
    const r = await fetch("/api/chatbot", {
      method: "PUT", headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(cfg),
    });
    setLoading(false);
    showToast(r.ok ? "Config saved" : "Failed", r.ok);
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "https://your-domain.com";
  const embedCode = `<script src="${origin}/chatbot-widget.js"\n        data-token="${cfg.widgetToken}"\n        data-color="${cfg.primaryColor}"\n        data-title="${cfg.botName}"\n        data-api="${origin}/api/chatbot">\n</script>`;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      {toast && <Toast {...toast} />}

      <Card>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Chatbot Configuration</h3>
        <Input label="Bot Name" value={cfg.botName} onChange={e => setCfg(c => ({ ...c, botName: e.target.value }))} placeholder="Assistant" />
        <Input label="Greeting Message" value={cfg.greeting} onChange={e => setCfg(c => ({ ...c, greeting: e.target.value }))} placeholder="Hi! How can I help you today?" />
        <Textarea label="AI System Prompt" value={cfg.systemPrompt} onChange={e => setCfg(c => ({ ...c, systemPrompt: e.target.value }))} rows={4}
          placeholder="You are a helpful assistant for [Business Name]. Answer questions about our products, hours, and services..." />
        <Input label="Primary Color" type="color" value={cfg.primaryColor} onChange={e => setCfg(c => ({ ...c, primaryColor: e.target.value }))} style={{ height: 40 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <label style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>Chatbot active</label>
          <div onClick={() => setCfg(c => ({ ...c, active: !c.active }))} style={{
            width: 40, height: 22, borderRadius: 11, cursor: "pointer", transition: "background 0.2s",
            background: cfg.active ? "#22c55e" : "rgba(255,255,255,0.15)", position: "relative",
          }}>
            <div style={{ position: "absolute", top: 3, left: cfg.active ? 21 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
          </div>
        </div>
        <Btn onClick={saveConfig} loading={loading}>Save Config</Btn>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card>
          <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700 }}>Embed on Your Website</h3>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 0, marginBottom: 14 }}>
            Paste this single script tag before the closing <code>&lt;/body&gt;</code> tag on any website.
          </p>
          <div style={{ position: "relative" }}>
            <pre style={{
              background: "rgba(0,0,0,0.4)", borderRadius: 10, padding: "14px", fontSize: 11,
              color: "#a78bfa", overflowX: "auto", border: "1px solid rgba(255,255,255,0.08)", margin: 0,
              whiteSpace: "pre-wrap", wordBreak: "break-all",
            }}>{embedCode}</pre>
            <Btn variant="secondary" onClick={() => { navigator.clipboard?.writeText(embedCode); showToast("Copied!", true); }}
              style={{ position: "absolute", top: 8, right: 8, padding: "4px 10px", fontSize: 11 }}>
              Copy
            </Btn>
          </div>
        </Card>

        <Card>
          <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700 }}>Widget Token</h3>
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(0,0,0,0.3)", fontFamily: "monospace", fontSize: 12, color: "#38bdf8", wordBreak: "break-all" }}>
            {cfg.widgetToken || "Loading..."}
          </div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", margin: "8px 0 0" }}>
            This token identifies your company. Keep it safe — anyone with this token can query your chatbot.
          </p>
        </Card>

        <Card>
          <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700 }}>Features</h3>
          {[
            "AI-powered responses using FinovaOS AI",
            "Conversation memory within a session",
            "Auto-open after 5 seconds for new visitors",
            "Mobile responsive design",
            "Customizable color, name, and greeting",
            "All conversations logged to your dashboard",
          ].map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
              <span style={{ color: "#22c55e" }}>✓</span> {f}
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
