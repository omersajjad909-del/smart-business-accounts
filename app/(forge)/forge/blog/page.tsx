"use client";
import Link from "next/link";
import { ForgeNav, ForgeFooter, useInView } from "../../components/shared";

const ff = "'Outfit','DM Sans',sans-serif";

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", padding: "5px 14px", borderRadius: 100, background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.2)", fontSize: 11, fontWeight: 700, color: "#fbbf24", letterSpacing: ".08em", marginBottom: 20 }}>
      {children}
    </div>
  );
}

const posts = [
  {
    tag: "ERP",
    tagColor: "#f59e0b",
    title: "Why Most Business Software Fails SMEs — and What to Do Instead",
    excerpt: "Enterprise ERP systems were built for enterprises. SMEs end up paying for features they never use while missing the ones they actually need. Here's the gap we're solving.",
    date: "May 2026",
    readTime: "5 min read",
    featured: true,
  },
  {
    tag: "Inventory",
    tagColor: "#34d399",
    title: "The Real Cost of a Stockout (It's Not Just Lost Sales)",
    excerpt: "A stockout doesn't just mean a missed sale. It damages supplier trust, disrupts cash flow, and creates hidden labor costs. Most businesses underestimate it by 3x.",
    date: "Apr 2026",
    readTime: "4 min read",
    featured: false,
  },
  {
    tag: "AI Operations",
    tagColor: "#818cf8",
    title: "What AI Actually Does in a Business Operating System",
    excerpt: "AI in business software isn't about chatbots. It's about demand forecasting, anomaly detection in transactions, and surfaces that surface insights before you think to ask.",
    date: "Apr 2026",
    readTime: "6 min read",
    featured: false,
  },
  {
    tag: "Retail",
    tagColor: "#f87171",
    title: "Multi-Store Retail Without the Chaos: A Practical Guide",
    excerpt: "Running 3+ stores means 3x the reconciliation, 3x the staff headaches, and zero consolidated view. Here's how operators who scale past 5 locations actually do it.",
    date: "Mar 2026",
    readTime: "7 min read",
    featured: false,
  },
  {
    tag: "Finance",
    tagColor: "#06b6d4",
    title: "Bank Reconciliation Shouldn't Take Half a Day",
    excerpt: "If your accountant spends 3–4 hours on reconciliation every week, the problem isn't your accountant. It's your system. Here's what automated reconciliation actually looks like.",
    date: "Mar 2026",
    readTime: "4 min read",
    featured: false,
  },
  {
    tag: "SaaS",
    tagColor: "#a78bfa",
    title: "How We Built FinovaOS: Architecture Decisions That Scale",
    excerpt: "From a monolith to a modular platform — the technical decisions behind FinovaOS, why we chose PostgreSQL over NoSQL, and what we'd do differently.",
    date: "Feb 2026",
    readTime: "8 min read",
    featured: false,
  },
];

function Hero() {
  return (
    <section style={{ padding: "140px clamp(16px,3vw,48px) 80px", fontFamily: ff, textAlign: "center", background: "radial-gradient(ellipse 70% 45% at 50% -5%, rgba(245,158,11,.12), transparent)", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, opacity: .04, backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />
      <div style={{ maxWidth: 660, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <Chip>INSIGHTS & BLOG</Chip>
        <h1 style={{ fontSize: "clamp(36px,6vw,60px)", fontWeight: 900, color: "white", letterSpacing: "-2px", margin: "0 0 16px", lineHeight: 1.1 }}>
          Thinking out loud
          <br />
          <span style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            on business ops.
          </span>
        </h1>
        <p style={{ fontSize: "clamp(14px,1.8vw,16px)", color: "rgba(255,255,255,.4)", lineHeight: 1.8, margin: 0 }}>
          Practical writing on ERP, inventory, AI, and the future of business operations — from the team building FinovaOS.
        </p>
      </div>
    </section>
  );
}

function FeaturedPost() {
  const [ref, vis] = useInView(0.05);
  const post = posts[0];
  return (
    <section style={{ padding: "0 clamp(16px,3vw,48px) 48px", fontFamily: ff }}>
      <div ref={ref} style={{ maxWidth: 1100, margin: "0 auto", opacity: vis ? 1 : 0, transform: vis ? "none" : "translateY(24px)", transition: "all .6s ease" }}>
        <div style={{ padding: "40px", borderRadius: 20, background: "linear-gradient(135deg,rgba(245,158,11,.07),rgba(239,68,68,.03))", border: "1px solid rgba(245,158,11,.18)", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 32, alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: post.tagColor, padding: "3px 10px", borderRadius: 100, background: `${post.tagColor}15`, border: `1px solid ${post.tagColor}25`, letterSpacing: ".06em", textTransform: "uppercase" }}>{post.tag}</span>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: "rgba(255,255,255,.25)", padding: "3px 10px", borderRadius: 100, background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.15)", color: "#fbbf24", letterSpacing: ".06em" }}>FEATURED</span>
            </div>
            <h2 style={{ fontSize: "clamp(20px,3vw,28px)", fontWeight: 900, color: "white", margin: "0 0 14px", letterSpacing: "-.6px", lineHeight: 1.25 }}>{post.title}</h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,.42)", lineHeight: 1.8, margin: "0 0 20px" }}>{post.excerpt}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,.25)" }}>{post.date}</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,.15)" }}>·</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,.25)" }}>{post.readTime}</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ padding: "24px", borderRadius: 14, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.6)", marginBottom: 10 }}>In this article</div>
              {["The mismatch between SME needs and enterprise ERPs", "What 'good fit' software actually looks like", "The FinovaOS approach: modular by default"].map(pt => (
                <div key={pt} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#f59e0b", flexShrink: 0, marginTop: 5 }} />
                  <span style={{ fontSize: 12.5, color: "rgba(255,255,255,.35)", lineHeight: 1.6 }}>{pt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PostGrid() {
  const [ref, vis] = useInView(0.05);
  return (
    <section style={{ padding: "0 clamp(16px,3vw,48px) 120px", fontFamily: ff }}>
      <div ref={ref} style={{ maxWidth: 1100, margin: "0 auto", opacity: vis ? 1 : 0, transform: vis ? "none" : "translateY(24px)", transition: "all .6s ease" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.3)", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 20 }}>MORE ARTICLES</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 20 }}>
          {posts.slice(1).map((post, i) => (
            <div key={i} style={{ padding: "26px 24px", borderRadius: 16, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", transition: "all .3s", display: "flex", flexDirection: "column", gap: 12 }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.background = `${post.tagColor}06`; el.style.borderColor = `${post.tagColor}20`; el.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.background = "rgba(255,255,255,.02)"; el.style.borderColor = "rgba(255,255,255,.07)"; el.style.transform = "translateY(0)"; }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: post.tagColor, letterSpacing: ".06em", textTransform: "uppercase" }}>{post.tag}</span>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: "white", margin: 0, letterSpacing: "-.3px", lineHeight: 1.35 }}>{post.title}</h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,.38)", lineHeight: 1.75, margin: 0, flex: 1 }}>{post.excerpt}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 4, borderTop: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 11.5, color: "rgba(255,255,255,.22)" }}>{post.date}</span>
                <span style={{ fontSize: 11.5, color: "rgba(255,255,255,.15)" }}>·</span>
                <span style={{ fontSize: 11.5, color: "rgba(255,255,255,.22)" }}>{post.readTime}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Coming Soon notice */}
        <div style={{ marginTop: 40, padding: "28px", borderRadius: 16, background: "rgba(255,255,255,.015)", border: "1px solid rgba(255,255,255,.06)", textAlign: "center" }}>
          <p style={{ fontSize: 13.5, color: "rgba(255,255,255,.3)", margin: 0 }}>
            New articles published regularly. Topics: ERP, retail automation, inventory, AI operations, SaaS infrastructure.
          </p>
        </div>
      </div>
    </section>
  );
}

function Newsletter() {
  const [ref, vis] = useInView();
  return (
    <section style={{ padding: "0 clamp(16px,3vw,48px) 120px", fontFamily: ff }}>
      <div ref={ref} style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", padding: "56px 40px", borderRadius: 24, background: "linear-gradient(135deg,rgba(245,158,11,.08),rgba(239,68,68,.04))", border: "1px solid rgba(245,158,11,.18)", opacity: vis ? 1 : 0, transform: vis ? "none" : "translateY(24px)", transition: "all .6s ease" }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>✉️</div>
        <h2 style={{ fontSize: "clamp(20px,3vw,28px)", fontWeight: 900, color: "white", margin: "0 0 10px", letterSpacing: "-.8px" }}>Stay in the loop</h2>
        <p style={{ fontSize: 13.5, color: "rgba(255,255,255,.4)", margin: "0 0 24px", lineHeight: 1.75 }}>
          Get new articles on business operations, ERP, and AI — straight to your inbox. No spam, unsubscribe anytime.
        </p>
        <a href="mailto:hello@finovaforge.com?subject=Subscribe to Blog" style={{ display: "inline-block", padding: "12px 24px", borderRadius: 10, background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "white", fontWeight: 700, fontSize: 13, textDecoration: "none", boxShadow: "0 6px 20px rgba(245,158,11,.25)" }}>
          Subscribe via Email →
        </a>
      </div>
    </section>
  );
}

export default function BlogPage() {
  return (
    <div style={{ fontFamily: ff, color: "white" }}>
      <style>{`*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}body{background:rgb(7,8,15)}`}</style>
      <ForgeNav />
      <Hero />
      <FeaturedPost />
      <PostGrid />
      <Newsletter />
      <ForgeFooter />
    </div>
  );
}
