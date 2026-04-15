"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const F = "'Outfit','Inter',sans-serif";

// ─── ROI Calculator data ──────────────────────────────────────────────────────
function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, vis] as const;
}

// ─── Features ─────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: "💬",
    title: "WhatsApp Auto-Reply",
    color: "#22c55e",
    glow: "rgba(34,197,94,.15)",
    border: "rgba(34,197,94,.25)",
    tagline: "Never miss a customer message — even at 3am",
    description: "When a customer messages your WhatsApp Business number, our AI reads the message and sends an intelligent, context-aware reply instantly. You configure the personality and knowledge — we handle the rest 24/7.",
    bullets: [
      "AI replies in seconds, day or night",
      "Trained on your business info & FAQs",
      "Handles price inquiries, order status, complaints",
      "Hands off to human when needed",
      "Full conversation logs in your dashboard",
    ],
    roi: "Average business misses 60% of WhatsApp messages. Each missed message = lost sale.",
    value: "Replaces a dedicated WhatsApp operator ($200–400/month)",
  },
  {
    icon: "📧",
    title: "Email Drip Campaigns",
    color: "#38bdf8",
    glow: "rgba(56,189,248,.15)",
    border: "rgba(56,189,248,.25)",
    tagline: "Turn cold leads into paying customers — automatically",
    description: "Build multi-step email sequences that automatically nurture your leads over days or weeks. A new lead signs up → they get email 1 immediately → email 2 after 3 days → email 3 after 7 days. All on autopilot.",
    bullets: [
      "Unlimited campaigns with unlimited steps",
      "AI-generated email body (no copywriter needed)",
      "Personalized with customer name & details",
      "Pause, edit, or stop campaigns anytime",
      "Open/click tracking (coming soon)",
    ],
    roi: "Email drip campaigns have 3–10x higher ROI than one-time email blasts.",
    value: "Replaces Mailchimp ($150/mo) + copywriter ($500+/month)",
  },
  {
    icon: "🤖",
    title: "Website Chatbot",
    color: "#a78bfa",
    glow: "rgba(167,139,250,.15)",
    border: "rgba(167,139,250,.25)",
    tagline: "Convert website visitors into leads while you sleep",
    description: "Embed a smart AI chatbot on your website with a single line of code. Visitors get instant answers about your products, pricing, and services. The chatbot collects their contact info and passes it to your CRM automatically.",
    bullets: [
      "One script tag — works on any website",
      "Fully customizable color, name & greeting",
      "AI trained on your business information",
      "Auto-collects leads into your CRM",
      "Mobile responsive, works everywhere",
    ],
    roi: "Websites with live chat convert 3.5x more visitors than those without.",
    value: "Replaces Intercom / Drift ($74–400/month)",
  },
  {
    icon: "🎯",
    title: "Lead Capture & CRM",
    color: "#fb923c",
    glow: "rgba(251,146,60,.15)",
    border: "rgba(251,146,60,.25)",
    tagline: "Every lead captured, tracked, and followed up",
    description: "Capture leads from multiple sources — your website chatbot, Facebook Lead Ads, WhatsApp, manual entry, and inbound webhooks from Zapier. All leads land in one clean CRM with status tracking and auto-follow-up.",
    bullets: [
      "Facebook Lead Ads direct integration",
      "Website chatbot lead capture",
      "WhatsApp inquiry auto-capture",
      "Lead pipeline: New → Contacted → Qualified → Won",
      "Auto-WhatsApp greeting on new lead",
    ],
    roi: "Businesses that follow up within 5 minutes are 9x more likely to convert.",
    value: "Replaces HubSpot CRM ($50–400/month)",
  },
  {
    icon: "🔗",
    title: "Zapier / Make Webhooks",
    color: "#f472b6",
    glow: "rgba(244,114,182,.15)",
    border: "rgba(244,114,182,.25)",
    tagline: "Connect FinovaOS to 5,000+ apps — no code needed",
    description: "Send data OUT to Zapier, Make, or n8n when events happen in FinovaOS (invoice paid, new lead, etc.). Receive data IN from any app via our secure inbound webhook tokens. Build complex automations without writing a single line of code.",
    bullets: [
      "Outbound: trigger Zapier on any FinovaOS event",
      "Inbound: receive data from any app",
      "HMAC-SHA256 signed for security",
      "Create leads, send WhatsApp from Zaps",
      "Connect Google Forms, Typeform, Calendly & more",
    ],
    roi: "Manual data entry costs businesses 10–20% of staff time. Webhooks eliminate it.",
    value: "Replaces Zapier Professional ($49–799/month) for integrations",
  },
  {
    icon: "📱",
    title: "Social Media Auto-Posting",
    color: "#ec4899",
    glow: "rgba(236,72,153,.15)",
    border: "rgba(236,72,153,.25)",
    tagline: "Schedule once, publish everywhere",
    description: "Write a post, select your platforms, pick a time — done. FinovaOS automatically publishes to Facebook, Instagram, and LinkedIn at the scheduled time. No more logging into 3 different apps every day.",
    bullets: [
      "Facebook Pages, Instagram Business, LinkedIn",
      "Schedule posts in advance",
      "Publish immediately or queue for later",
      "Image support for Instagram",
      "Post history with status tracking",
    ],
    roi: "Consistent social media presence increases brand awareness by 80% and generates 3x more leads.",
    value: "Replaces Buffer / Hootsuite ($18–99/month)",
  },
  {
    icon: "📊",
    title: "Google Sheets Sync",
    color: "#34d399",
    glow: "rgba(52,211,153,.15)",
    border: "rgba(52,211,153,.25)",
    tagline: "Your data in Google Sheets — always up to date",
    description: "Connect your Google Spreadsheet and sync your FinovaOS data with one click. Leads, customers, contacts — exported instantly to a Google Sheet that your team can access and share. Perfect for reporting, analysis, and sharing with stakeholders.",
    bullets: [
      "One-click sync of leads & customers",
      "Custom column mapping",
      "Works with Google Service Account (no login needed)",
      "Auto-append — doesn't overwrite existing data",
      "Share with your team or investors instantly",
    ],
    roi: "Finance teams spend 4–6 hours/week manually copying data to spreadsheets.",
    value: "Replaces Coupler.io / Sheetgo ($19–49/month)",
  },
  {
    icon: "✍️",
    title: "AI Content Generator",
    color: "#fbbf24",
    glow: "rgba(251,191,36,.15)",
    border: "rgba(251,191,36,.25)",
    tagline: "Professional marketing content in 10 seconds",
    description: "Generate high-quality social media posts, email campaigns, ad copy, product descriptions, and WhatsApp messages using Claude AI. Just describe what you want — get ready-to-publish content in English or Urdu instantly.",
    bullets: [
      "Social posts, email, ad copy, WhatsApp, blog",
      "English and Urdu / Roman Urdu support",
      "Tone control: professional, casual, persuasive",
      "Keyword injection for SEO",
      "Generates 150–1000 words in seconds",
    ],
    roi: "A freelance copywriter charges $15–50 per piece. You'll generate hundreds per month.",
    value: "Replaces Jasper AI / Copy.ai ($49–125/month)",
  },
];

const COMPARE_TOOLS = [
  { tool: "WhatsApp Auto-Reply only (WATI/AiSensy)", price: "$49–199/mo" },
  { tool: "Email automation (Mailchimp/ActiveCampaign)", price: "$50–149/mo" },
  { tool: "Website chatbot (Intercom/Drift)", price: "$74–374/mo" },
  { tool: "CRM (HubSpot/Pipedrive)", price: "$50–400/mo" },
  { tool: "Social scheduler (Buffer/Hootsuite)", price: "$18–99/mo" },
  { tool: "Zapier Pro", price: "$49–799/mo" },
  { tool: "AI content (Jasper/Copy.ai)", price: "$49–125/mo" },
  { tool: "Google Sheets sync (Coupler.io)", price: "$19–49/mo" },
];

const FAQS = [
  { q: "Kya me sirf Automation add-on le sakta hun bina main plan ke?", a: "Automation add-on kisi bhi active FinovaOS plan ke saath available hai — Starter, Professional, ya Enterprise. Aapko pehle ek base plan lena hoga." },
  { q: "WhatsApp Auto-Reply ke liye kya zaroori hai?", a: "Aapko ek WhatsApp Business API account chahiye (Meta se). Aap Meta Business Suite mein free mein apply kar sakte hain. Setup mein aam tor par 1-3 din lagte hain. Hum step-by-step guide dete hain." },
  { q: "AI content Urdu mein bhi likhta hai?", a: "Haan. Claude AI Urdu aur Roman Urdu dono mein content generate kar sakta hai. Aap language dropdown se select kar sakte hain." },
  { q: "Chatbot apni website pe lagana mushkil hai?", a: "Bilkul nahi. Sirf ek script tag copy karke apni website ke </body> se pehle paste karo. Koi coding nahi, koi developer nahi — 2 minute ka kaam hai." },
  { q: "Kya existing leads import kar sakta hun?", a: "Haan. Excel/CSV se import wizard ke zariye leads upload kar sakte ho. Yeh feature Professional aur Enterprise plans mein available hai." },
  { q: "Demo available hai?", a: "Haan, aap ek personalized demo book kar sakte hain jahan hum aapke business ke liye automation setup dikhate hain. Book karne ke liye 'Get Started' pe click karein." },
];

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function AutomationLandingPage() {
  const [roiLeads, setRoiLeads] = useState(50);
  const [roiConvert, setRoiConvert] = useState(10);
  const [roiDeal, setRoiDeal] = useState(500);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [heroRef, heroVis] = useInView();

  const roiRevenue = Math.round((roiLeads * roiConvert / 100) * roiDeal);
  const roiReturn = roiRevenue - 79;
  const roiMultiple = roiReturn > 0 ? Math.round(roiReturn / 79) : 0;

  return (
    <div style={{ fontFamily: F, background: "#050812", color: "#e2e8f0", overflowX: "hidden" }}>

      {/* ── HERO ── */}
      <div ref={heroRef} style={{
        minHeight: "90vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        textAlign: "center", padding: "80px 24px 60px",
        background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(124,58,237,.18) 0%, transparent 70%)",
        position: "relative", overflow: "hidden",
      }}>
        {/* Grid bg */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)", backgroundSize: "50px 50px", zIndex: 0 }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 820 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(124,58,237,.15)", border: "1px solid rgba(124,58,237,.3)", borderRadius: 100, padding: "6px 16px", fontSize: 13, color: "#a78bfa", marginBottom: 28, fontWeight: 600 }}>
            ⚡ Add-On · $79/month · Works with any plan
          </div>

          <h1 style={{ fontSize: "clamp(2.2rem, 5vw, 3.8rem)", fontWeight: 900, margin: "0 0 20px", lineHeight: 1.15 }}>
            <span style={{ background: "linear-gradient(135deg,#a78bfa,#38bdf8,#34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              8 Powerful Automations
            </span>
            <br />
            <span style={{ color: "#fff" }}>in One Add-On</span>
          </h1>

          <p style={{ fontSize: "clamp(1rem, 2vw, 1.2rem)", color: "rgba(255,255,255,.6)", maxWidth: 620, margin: "0 auto 36px", lineHeight: 1.7 }}>
            WhatsApp auto-reply, email drip campaigns, AI chatbot, social media posting, lead capture, webhooks, Google Sheets sync, and AI content generation — all for <strong style={{ color: "#fff" }}>$79/month</strong>.
          </p>

          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/get-started" style={{
              padding: "14px 32px", borderRadius: 12, background: "linear-gradient(135deg,#7c3aed,#2563eb)",
              color: "#fff", textDecoration: "none", fontSize: 15, fontWeight: 700,
              boxShadow: "0 0 30px rgba(124,58,237,.4)",
            }}>
              Get Started →
            </Link>
            <Link href="/pricing" style={{
              padding: "14px 28px", borderRadius: 12, border: "1px solid rgba(255,255,255,.15)",
              color: "rgba(255,255,255,.8)", textDecoration: "none", fontSize: 15, fontWeight: 600,
              background: "rgba(255,255,255,.04)",
            }}>
              View All Plans
            </Link>
          </div>

          {/* Mini feature pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginTop: 40 }}>
            {["💬 WhatsApp AI", "📧 Email Drip", "🤖 Website Chatbot", "🎯 Lead CRM", "🔗 Webhooks", "📱 Social Media", "📊 Google Sheets", "✍️ AI Content"].map(f => (
              <span key={f} style={{ padding: "5px 14px", borderRadius: 100, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", fontSize: 13, color: "rgba(255,255,255,.65)" }}>{f}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── VS COMPETITORS ── */}
      <div style={{ padding: "80px 24px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 50 }}>
          <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 800, margin: "0 0 12px" }}>
            Ye sab tools alag alag khareedne se zyada mehnga padta hai
          </h2>
          <p style={{ color: "rgba(255,255,255,.5)", fontSize: 15 }}>
            Aap in sab tools ke <strong style={{ color: "#f87171" }}>$400–$2,200/month</strong> dete hain —<br />
            ya sirf FinovaOS Automation ke <strong style={{ color: "#34d399" }}>$79/month</strong>.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {COMPARE_TOOLS.map((t, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderRadius: 12, background: "rgba(248,113,113,.06)", border: "1px solid rgba(248,113,113,.15)" }}>
              <span style={{ fontSize: 14, color: "rgba(255,255,255,.65)" }}>{t.tool}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#f87171", whiteSpace: "nowrap" }}>{t.price}</span>
            </div>
          ))}
        </div>

        {/* Arrow */}
        <div style={{ textAlign: "center", margin: "30px 0 20px", fontSize: 28 }}>↓</div>

        <div style={{ padding: "24px 32px", borderRadius: 16, background: "linear-gradient(135deg,rgba(34,197,94,.1),rgba(52,211,153,.05))", border: "2px solid rgba(34,197,94,.3)", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#34d399", fontWeight: 600, marginBottom: 8 }}>FinovaOS Automation Add-On</div>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: "#34d399" }}>$79 <span style={{ fontSize: "1rem", color: "rgba(255,255,255,.5)", fontWeight: 400 }}>/month</span></div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginTop: 4 }}>All 8 features. One price. Cancel anytime.</div>
        </div>
      </div>

      {/* ── FEATURES DEEP DIVE ── */}
      <div style={{ padding: "20px 24px 80px", maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 800, margin: "0 0 12px" }}>
            Har feature ki poori detail
          </h2>
          <p style={{ color: "rgba(255,255,255,.5)", fontSize: 15 }}>Taki aap confident raho ke yeh add-on aapke paise ka poora fayda deta hai</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {FEATURES.map((f, i) => (
            <FeatureCard key={i} feature={f} index={i} />
          ))}
        </div>
      </div>

      {/* ── ROI CALCULATOR ── */}
      <div style={{ padding: "80px 24px", background: "rgba(255,255,255,.02)", borderTop: "1px solid rgba(255,255,255,.06)", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 800, margin: "0 0 10px" }}>
              ROI Calculator
            </h2>
            <p style={{ color: "rgba(255,255,255,.5)", fontSize: 15 }}>Dekho $79/month pe aapka kitna return aata hai</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 32 }}>
            {[
              { label: "Monthly leads (website + WhatsApp)", value: roiLeads, min: 5, max: 1000, step: 5, set: setRoiLeads },
              { label: "Conversion rate (%)", value: roiConvert, min: 1, max: 50, step: 1, set: setRoiConvert },
              { label: "Avg. deal value ($)", value: roiDeal, min: 50, max: 10000, step: 50, set: setRoiDeal },
            ].map((s, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: "18px 16px" }}>
                <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,.45)", marginBottom: 12, lineHeight: 1.4 }}>{s.label}</label>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#a78bfa", marginBottom: 12 }}>{s.value}{i === 1 ? "%" : i === 2 ? "$" : ""}</div>
                <input type="range" min={s.min} max={s.max} step={s.step} value={s.value}
                  onChange={e => s.set(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#7c3aed" }} />
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            {[
              { label: "Revenue from automation", value: `$${roiRevenue.toLocaleString()}`, color: "#34d399", sub: "per month" },
              { label: "Cost of add-on", value: "$79", color: "#f87171", sub: "per month" },
              { label: "Net return", value: roiMultiple > 0 ? `${roiMultiple}x ROI` : "—", color: "#fbbf24", sub: `$${Math.max(0, roiReturn).toLocaleString()} net profit` },
            ].map((r, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: "20px 18px", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 8 }}>{r.label}</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: r.color }}>{r.value}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 4 }}>{r.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── WHAT'S INCLUDED ── */}
      <div style={{ padding: "80px 24px", maxWidth: 800, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 800, margin: "0 0 10px" }}>
            $79/month mein kya kya milta hai
          </h2>
          <p style={{ color: "rgba(255,255,255,.5)", fontSize: 15 }}>Koi hidden fees nahi. Koi per-message charges nahi. Flat rate.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {[
            { icon: "💬", text: "WhatsApp auto-reply — unlimited conversations" },
            { icon: "📧", text: "Email drip — unlimited campaigns & contacts" },
            { icon: "🤖", text: "Website chatbot — embed on unlimited pages" },
            { icon: "🎯", text: "CRM leads — unlimited lead capture & tracking" },
            { icon: "🔗", text: "Webhooks — unlimited outbound & inbound tokens" },
            { icon: "📱", text: "Social media — Facebook, Instagram, LinkedIn" },
            { icon: "📊", text: "Google Sheets — unlimited syncs" },
            { icon: "✍️", text: "AI content — unlimited generation (Claude AI)" },
            { icon: "📈", text: "Full analytics dashboard" },
            { icon: "🔒", text: "HMAC-signed webhooks for security" },
            { icon: "📞", text: "Priority support for add-on issues" },
            { icon: "🔄", text: "Cancel anytime, no lock-in" },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,.75)", lineHeight: 1.5 }}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── FAQs ── */}
      <div style={{ padding: "20px 24px 80px", maxWidth: 700, margin: "0 auto" }}>
        <h2 style={{ textAlign: "center", fontSize: "clamp(1.4rem, 2.5vw, 2rem)", fontWeight: 800, marginBottom: 36 }}>Aksar Pooche Jane Wale Sawal</h2>
        {FAQS.map((faq, i) => (
          <div key={i} style={{ marginBottom: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", overflow: "hidden" }}>
            <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{
              width: "100%", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center",
              background: openFaq === i ? "rgba(124,58,237,.1)" : "rgba(255,255,255,.03)",
              border: "none", cursor: "pointer", color: "#e2e8f0", fontSize: 14, fontWeight: 600, fontFamily: F, textAlign: "left",
            }}>
              {faq.q}
              <span style={{ fontSize: 18, color: "rgba(255,255,255,.4)", flexShrink: 0, marginLeft: 16 }}>{openFaq === i ? "−" : "+"}</span>
            </button>
            {openFaq === i && (
              <div style={{ padding: "14px 20px 18px", fontSize: 14, color: "rgba(255,255,255,.6)", lineHeight: 1.7, background: "rgba(124,58,237,.06)" }}>
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── CTA ── */}
      <div style={{ padding: "80px 24px", textAlign: "center", background: "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(124,58,237,.2) 0%, transparent 70%)" }}>
        <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)", fontWeight: 900, margin: "0 0 16px" }}>
          Aaj shuru karo — 14 din free
        </h2>
        <p style={{ color: "rgba(255,255,255,.5)", fontSize: 16, marginBottom: 36 }}>
          No credit card. Cancel anytime. Full access to all 8 automation features.
        </p>
        <Link href="/get-started" style={{
          display: "inline-block", padding: "16px 40px", borderRadius: 14,
          background: "linear-gradient(135deg,#7c3aed,#2563eb)", color: "#fff",
          textDecoration: "none", fontSize: 16, fontWeight: 700,
          boxShadow: "0 0 40px rgba(124,58,237,.4)",
        }}>
          Add to My Plan — $79/month
        </Link>
        <div style={{ marginTop: 20, fontSize: 13, color: "rgba(255,255,255,.35)" }}>
          Requires an active FinovaOS plan · Works with Starter, Professional, and Enterprise
        </div>
      </div>

    </div>
  );
}

// ─── Feature Card Component ───────────────────────────────────────────────────
function FeatureCard({ feature: f, index }: { feature: typeof FEATURES[0]; index: number }) {
  const [ref, vis] = useInView();
  const isEven = index % 2 === 0;

  return (
    <div ref={ref} style={{
      display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0,
      borderRadius: 20, overflow: "hidden",
      border: `1px solid ${f.border}`,
      background: "rgba(255,255,255,.02)",
      opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(20px)",
      transition: "opacity .5s, transform .5s",
    }}>
      {/* Left: Info */}
      <div style={{ padding: "36px 36px", order: isEven ? 0 : 1 }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>{f.icon}</div>
        <h3 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px", color: f.color }}>{f.title}</h3>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,.45)", margin: "0 0 16px", fontStyle: "italic" }}>{f.tagline}</p>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,.65)", lineHeight: 1.7, margin: "0 0 20px" }}>{f.description}</p>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
          {f.bullets.map((b, i) => (
            <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "rgba(255,255,255,.7)" }}>
              <span style={{ color: f.color, flexShrink: 0, marginTop: 1 }}>✓</span> {b}
            </li>
          ))}
        </ul>
      </div>

      {/* Right: ROI box */}
      <div style={{ padding: "36px 32px", background: `${f.glow}`, display: "flex", flexDirection: "column", justifyContent: "center", gap: 20, order: isEven ? 1 : 0 }}>
        <div style={{ padding: "20px", borderRadius: 14, background: "rgba(0,0,0,.3)", border: `1px solid ${f.border}` }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>Why it pays for itself</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.7)", lineHeight: 1.6 }}>{f.roi}</div>
        </div>
        <div style={{ padding: "20px", borderRadius: 14, background: "rgba(0,0,0,.3)", border: `1px solid ${f.border}` }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>What it replaces</div>
          <div style={{ fontSize: 13, color: f.color, fontWeight: 600, lineHeight: 1.6 }}>{f.value}</div>
        </div>
      </div>
    </div>
  );
}
