"use client";
import { ForgeNav, ForgeFooter, useInView } from "../../components/shared";

const ff = "'Outfit','DM Sans',sans-serif";

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", padding: "5px 14px", borderRadius: 100, background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.2)", fontSize: 11, fontWeight: 700, color: "#fbbf24", letterSpacing: ".08em", marginBottom: 20 }}>
      {children}
    </div>
  );
}

const PILLARS = [
  {
    icon: "🔐",
    color: "#818cf8",
    title: "Data Encryption",
    desc: "All data is encrypted at rest using AES-256 and in transit using TLS 1.3. No plain-text storage of any sensitive business or user data.",
    points: ["AES-256 encryption at rest", "TLS 1.3 in transit", "Encrypted backups", "Field-level encryption for sensitive records"],
  },
  {
    icon: "🛡️",
    color: "#34d399",
    title: "Access Control",
    desc: "Granular role-based access control ensures every user sees only what they need. Permissions cascade from company level down to individual module features.",
    points: ["Role-based permissions (RBAC)", "Module-level access gates", "Branch and cost-center isolation", "API key scoping"],
  },
  {
    icon: "📋",
    color: "#f59e0b",
    title: "Audit Logs",
    desc: "Every action in FinovaOS is logged — who did what, when, and from where. Audit trails are tamper-evident and available for export.",
    points: ["Full action audit trail", "User session tracking", "Login and access history", "Exportable compliance logs"],
  },
  {
    icon: "💾",
    color: "#f472b6",
    title: "Backups & Recovery",
    desc: "Automated daily backups with point-in-time recovery. Your data can be restored to any point within the retention window.",
    points: ["Daily automated backups", "Point-in-time recovery", "Cross-region redundancy", "User-initiated manual backups"],
  },
  {
    icon: "🏢",
    color: "#60a5fa",
    title: "Data Isolation",
    desc: "Each company's data is completely isolated at the database level. Multi-tenant architecture ensures no data leakage between organizations.",
    points: ["Tenant-level data isolation", "Company-scoped queries", "No cross-tenant data access", "Isolated storage namespaces"],
  },
  {
    icon: "🔑",
    color: "#fb923c",
    title: "Authentication",
    desc: "Multi-factor authentication, SSO, magic link login, and session management. We support enterprise authentication requirements.",
    points: ["Two-factor authentication (2FA/TOTP)", "Google SSO / OAuth", "Magic link login", "Session expiry controls"],
  },
  {
    icon: "⚡",
    color: "#a78bfa",
    title: "Infrastructure",
    desc: "Built on enterprise-grade cloud infrastructure with high availability, DDoS protection, and automated scaling.",
    points: ["Vercel / Supabase infrastructure", "DDoS mitigation", "Auto-scaling architecture", "99.9% uptime target"],
  },
  {
    icon: "🔍",
    color: "#22d3ee",
    title: "Vulnerability Management",
    desc: "Regular dependency audits, security patches, and responsible disclosure practices. We take security reports seriously.",
    points: ["Dependency vulnerability scanning", "Regular security patches", "Responsible disclosure policy", "Internal security reviews"],
  },
];

const PRACTICES = [
  { label: "Password Hashing", detail: "bcrypt with work factor 12 — passwords are never stored in plain text." },
  { label: "API Security", detail: "All API routes require authenticated sessions or signed API keys. Rate limiting is enforced." },
  { label: "Input Validation", detail: "All user inputs are validated and sanitized server-side to prevent injection attacks." },
  { label: "HTTPS Only", detail: "All traffic is served over HTTPS. HTTP requests are redirected automatically." },
  { label: "Secure Headers", detail: "Security headers including HSTS, CSP, X-Frame-Options, and X-Content-Type-Options." },
  { label: "Session Management", detail: "Secure, httpOnly cookies with SameSite protection and configurable expiry." },
];

function Hero() {
  return (
    <section className="forge-sec-hero" style={{
      minHeight: "60vh", padding: "clamp(90px,15vw,140px) clamp(16px,3vw,48px) clamp(48px,8vw,80px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      textAlign: "center", position: "relative", fontFamily: ff,
      background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(129,140,248,.16), transparent)",
    }}>
      <div style={{ position: "absolute", inset: 0, opacity: .03, backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />
      <div style={{ maxWidth: 720, position: "relative", zIndex: 1 }}>
        <Chip>SECURITY &amp; TRUST</Chip>
        <h1 style={{ fontSize: "clamp(36px,6vw,68px)", fontWeight: 900, color: "white", letterSpacing: "-2.5px", margin: "0 0 24px", lineHeight: 1.05 }}>
          Your data is your business.
          <br />
          <span style={{ background: "linear-gradient(135deg,#818cf8,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            We treat it that way.
          </span>
        </h1>
        <p style={{ fontSize: "clamp(14px,1.8vw,17px)", color: "rgba(255,255,255,.45)", margin: "0 auto", lineHeight: 1.85, maxWidth: 560 }}>
          Security is not a feature in FinovaOS. It is the foundation. Every layer of our infrastructure
          is designed to protect your business data from unauthorized access, loss, and breach.
        </p>
      </div>
    </section>
  );
}

function Pillars() {
  const [ref, vis] = useInView();
  return (
    <section style={{ padding: "clamp(48px,8vw,80px) clamp(16px,3vw,48px)", fontFamily: ff }}>
      <div ref={ref} style={{ maxWidth: 1200, margin: "0 auto", opacity: vis ? 1 : 0, transform: vis ? "none" : "translateY(28px)", transition: "all .65s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <Chip>SECURITY PILLARS</Chip>
          <h2 style={{ fontSize: "clamp(26px,3.5vw,44px)", fontWeight: 900, color: "white", letterSpacing: "-1.5px", margin: 0 }}>
            Eight layers of protection
          </h2>
        </div>
        <div className="forge-pillars-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 18 }}>
          {PILLARS.map((p, i) => (
            <div key={i}
              style={{ padding: "28px 24px", borderRadius: 18, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)", transition: "all .3s" }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = `${p.color}08`; el.style.borderColor = `${p.color}28`; el.style.transform = "translateY(-3px)"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = "rgba(255,255,255,.025)"; el.style.borderColor = "rgba(255,255,255,.07)"; el.style.transform = "translateY(0)"; }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${p.color}14`, border: `1px solid ${p.color}28`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 16 }}>{p.icon}</div>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: "white", margin: "0 0 10px" }}>{p.title}</h3>
              <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.38)", lineHeight: 1.75, margin: "0 0 16px" }}>{p.desc}</p>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                {p.points.map((pt, j) => (
                  <li key={j} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "rgba(255,255,255,.45)" }}>
                    <span style={{ color: p.color, flexShrink: 0, marginTop: 2 }}>✓</span>{pt}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Practices() {
  const [ref, vis] = useInView();
  return (
    <section style={{ padding: "clamp(48px,8vw,80px) clamp(16px,3vw,48px)", background: "rgba(255,255,255,.015)", borderTop: "1px solid rgba(255,255,255,.05)", fontFamily: ff }}>
      <div ref={ref} style={{ maxWidth: 900, margin: "0 auto", opacity: vis ? 1 : 0, transform: vis ? "none" : "translateY(28px)", transition: "all .65s ease" }}>
        <div style={{ marginBottom: 40 }}>
          <Chip>DEVELOPMENT PRACTICES</Chip>
          <h2 style={{ fontSize: "clamp(24px,3vw,38px)", fontWeight: 900, color: "white", letterSpacing: "-1.2px", margin: 0 }}>
            Security built into every line
          </h2>
        </div>
        <div style={{ display: "grid", gap: 2 }}>
          {PRACTICES.map((p, i) => (
            <div key={i} style={{ display: "flex", gap: 20, padding: "18px 20px", borderRadius: 12, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)", alignItems: "flex-start" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#818cf8", marginTop: 7, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "rgba(255,255,255,.85)", marginBottom: 4 }}>{p.label}</div>
                <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.38)", lineHeight: 1.7 }}>{p.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Honesty() {
  const [ref, vis] = useInView();
  return (
    <section style={{ padding: "clamp(48px,8vw,80px) clamp(16px,3vw,48px)", fontFamily: ff }}>
      <div ref={ref} style={{ maxWidth: 760, margin: "0 auto", opacity: vis ? 1 : 0, transform: vis ? "none" : "translateY(28px)", transition: "all .65s ease" }}>
        <div className="forge-honesty-card" style={{ padding: "clamp(24px,5vw,36px) clamp(20px,5vw,36px)", borderRadius: 22, background: "rgba(251,191,36,.04)", border: "1px solid rgba(251,191,36,.15)" }}>
          <div style={{ fontSize: 28, marginBottom: 16 }}>⚠️</div>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: "white", margin: "0 0 14px", letterSpacing: "-.5px" }}>
            What we don&apos;t claim
          </h3>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,.45)", lineHeight: 1.85, margin: "0 0 14px" }}>
            We do not hold ISO 27001, SOC 2, or PCI-DSS certifications at this stage. We are a growing
            company and we build security with the same seriousness as large enterprises — but we will
            not fabricate certifications to appear larger than we are.
          </p>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,.45)", lineHeight: 1.85 }}>
            What we do have: strong engineering practices, encrypted infrastructure, isolated tenancy,
            and an honest commitment to improving our security posture as we grow.
            Transparency is our policy.
          </p>
        </div>
      </div>
    </section>
  );
}

function Disclosure() {
  const [ref, vis] = useInView();
  return (
    <section style={{ padding: "clamp(40px,7vw,60px) clamp(16px,3vw,48px) clamp(64px,10vw,100px)", background: "rgba(255,255,255,.015)", borderTop: "1px solid rgba(255,255,255,.05)", fontFamily: ff }}>
      <div ref={ref} className="forge-disclosure-grid" style={{ maxWidth: 900, margin: "0 auto", opacity: vis ? 1 : 0, transform: vis ? "none" : "translateY(28px)", transition: "all .65s ease", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 32, alignItems: "start" }}>
        <div>
          <Chip>RESPONSIBLE DISCLOSURE</Chip>
          <h2 style={{ fontSize: "clamp(22px,2.5vw,32px)", fontWeight: 900, color: "white", letterSpacing: "-1px", margin: "0 0 16px" }}>
            Found a vulnerability?
          </h2>
          <p style={{ fontSize: 13.5, color: "rgba(255,255,255,.4)", lineHeight: 1.85, margin: "0 0 24px" }}>
            We take security reports seriously. If you discover a potential vulnerability in FinovaOS or
            our infrastructure, please contact us privately. We will investigate, act, and respond promptly.
          </p>
          <a href="mailto:security@finovaforge.com"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 10, background: "rgba(129,140,248,.12)", border: "1px solid rgba(129,140,248,.28)", color: "#818cf8", fontWeight: 700, fontSize: 13, textDecoration: "none", transition: "all .2s" }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "rgba(129,140,248,.2)"; el.style.color = "#a5b4fc"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "rgba(129,140,248,.12)"; el.style.color = "#818cf8"; }}>
            security@finovaforge.com →
          </a>
        </div>
        <div style={{ display: "grid", gap: 14 }}>
          {[
            { icon: "📧", label: "Report", desc: "Send details to security@finovaforge.com" },
            { icon: "⏱️", label: "Response", desc: "We acknowledge within 48 hours" },
            { icon: "🔧", label: "Fix", desc: "We investigate and patch promptly" },
            { icon: "✅", label: "Credit", desc: "Responsible reporters are credited (if desired)" },
          ].map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(129,140,248,.1)", border: "1px solid rgba(129,140,248,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{step.icon}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.8)", marginBottom: 3 }}>{step.label}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", lineHeight: 1.6 }}>{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function SecurityPage() {
  return (
    <div style={{ fontFamily: ff, color: "white" }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: rgb(7,8,15); overflow-x: hidden; }
        .forge-pillars-grid { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
        .forge-disclosure-grid { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
        @media (max-width: 900px) {
          .forge-pillars-grid { grid-template-columns: repeat(2, 1fr); gap: 14px !important; }
          .forge-disclosure-grid { grid-template-columns: 1fr !important; gap: 28px !important; }
        }
        @media (max-width: 600px) {
          .forge-pillars-grid { grid-template-columns: 1fr !important; }
          .forge-honesty-card { padding: 24px 20px !important; }
        }
      `}</style>
      <ForgeNav />
      <Hero />
      <Pillars />
      <Practices />
      <Honesty />
      <Disclosure />
      <ForgeFooter />
    </div>
  );
}
