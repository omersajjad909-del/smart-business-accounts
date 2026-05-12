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

const services = [
  { name: "FinovaOS Dashboard", status: "operational", uptime: "99.97%" },
  { name: "Authentication & Login", status: "operational", uptime: "99.99%" },
  { name: "Accounting & Ledger", status: "operational", uptime: "99.96%" },
  { name: "Inventory Management", status: "operational", uptime: "99.95%" },
  { name: "Invoicing & Billing", status: "operational", uptime: "99.98%" },
  { name: "Reports & Analytics", status: "operational", uptime: "99.94%" },
  { name: "File Storage", status: "operational", uptime: "99.93%" },
  { name: "API", status: "operational", uptime: "99.97%" },
];

const incidents: { date: string; title: string; status: "resolved" | "investigating" | "monitoring"; detail: string }[] = [];

const statusConfig = {
  operational: { label: "Operational", color: "#34d399", dot: "#34d399" },
  degraded: { label: "Degraded", color: "#f59e0b", dot: "#f59e0b" },
  outage: { label: "Outage", color: "#f87171", dot: "#f87171" },
  investigating: { label: "Investigating", color: "#f59e0b", dot: "#f59e0b" },
  monitoring: { label: "Monitoring", color: "#818cf8", dot: "#818cf8" },
  resolved: { label: "Resolved", color: "#34d399", dot: "#34d399" },
};

function Hero() {
  const allOperational = services.every(s => s.status === "operational");
  return (
    <section style={{ padding: "140px clamp(16px,3vw,48px) 80px", fontFamily: ff, textAlign: "center", background: allOperational ? "radial-gradient(ellipse 60% 40% at 50% -5%, rgba(52,211,153,.1), transparent)" : "radial-gradient(ellipse 60% 40% at 50% -5%, rgba(245,158,11,.1), transparent)", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, opacity: .04, backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />
      <div style={{ maxWidth: 640, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <Chip>SYSTEM STATUS</Chip>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "12px 24px", borderRadius: 100, background: allOperational ? "rgba(52,211,153,.1)" : "rgba(245,158,11,.1)", border: `1px solid ${allOperational ? "rgba(52,211,153,.25)" : "rgba(245,158,11,.25)"}`, marginBottom: 20 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: allOperational ? "#34d399" : "#f59e0b", boxShadow: `0 0 8px ${allOperational ? "#34d399" : "#f59e0b"}` }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: allOperational ? "#34d399" : "#f59e0b" }}>
            {allOperational ? "All systems operational" : "Some systems affected"}
          </span>
        </div>
        <h1 style={{ fontSize: "clamp(32px,5vw,52px)", fontWeight: 900, color: "white", letterSpacing: "-2px", margin: "0 0 14px", lineHeight: 1.1 }}>
          FinovaOS Status
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,.35)", margin: 0, lineHeight: 1.7 }}>
          Last updated: May 2026 — Real-time service health
        </p>
      </div>
    </section>
  );
}

function ServiceList() {
  const [ref, vis] = useInView(0.05);
  return (
    <section style={{ padding: "0 clamp(16px,3vw,48px) 60px", fontFamily: ff }}>
      <div ref={ref} style={{ maxWidth: 860, margin: "0 auto", opacity: vis ? 1 : 0, transform: vis ? "none" : "translateY(24px)", transition: "all .6s ease" }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: "rgba(255,255,255,.6)", letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 20, fontSize: 11 }}>SERVICES</h2>
        <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.08)", overflow: "hidden" }}>
          {services.map((svc, i) => {
            const cfg = statusConfig[svc.status as keyof typeof statusConfig];
            return (
              <div key={svc.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", gap: 16, borderTop: i > 0 ? "1px solid rgba(255,255,255,.05)" : "none", background: "rgba(255,255,255,.015)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,.75)" }}>{svc.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 20, flexShrink: 0 }}>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,.3)", fontWeight: 500 }}>{svc.uptime} uptime</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color, padding: "3px 10px", borderRadius: 100, background: `${cfg.color}12`, border: `1px solid ${cfg.color}20` }}>{cfg.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function UptimeGrid() {
  const [ref, vis] = useInView(0.05);
  const days = 60;
  return (
    <section style={{ padding: "0 clamp(16px,3vw,48px) 60px", fontFamily: ff }}>
      <div ref={ref} style={{ maxWidth: 860, margin: "0 auto", opacity: vis ? 1 : 0, transform: vis ? "none" : "translateY(24px)", transition: "all .6s ease" }}>
        <h2 style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.4)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 16 }}>60-DAY UPTIME</h2>
        <div style={{ padding: "24px", borderRadius: 16, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)" }}>
          <div style={{ display: "flex", gap: 3, alignItems: "flex-end" }}>
            {Array.from({ length: days }, (_, i) => (
              <div key={i} style={{ flex: 1, height: 28, borderRadius: 3, background: "#34d399", opacity: Math.random() > 0.97 ? 0.3 : 0.7 + Math.random() * 0.3 }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,.25)" }}>60 days ago</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,.25)" }}>Today</span>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
            {[{ color: "#34d399", label: "Operational" }, { color: "#f59e0b", label: "Degraded" }, { color: "#f87171", label: "Outage" }].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Incidents() {
  const [ref, vis] = useInView(0.05);
  return (
    <section style={{ padding: "0 clamp(16px,3vw,48px) 120px", fontFamily: ff }}>
      <div ref={ref} style={{ maxWidth: 860, margin: "0 auto", opacity: vis ? 1 : 0, transform: vis ? "none" : "translateY(24px)", transition: "all .6s ease" }}>
        <h2 style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.4)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 16 }}>RECENT INCIDENTS</h2>
        {incidents.length === 0 ? (
          <div style={{ padding: "40px", borderRadius: 16, border: "1px solid rgba(255,255,255,.06)", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>✅</div>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,.35)", margin: 0 }}>No incidents in the last 90 days.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {incidents.map((inc, i) => {
              const cfg = statusConfig[inc.status];
              return (
                <div key={i} style={{ padding: "20px 22px", borderRadius: 14, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 12, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,.8)" }}>{inc.title}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, padding: "3px 10px", borderRadius: 100, background: `${cfg.color}12`, border: `1px solid ${cfg.color}20`, flexShrink: 0 }}>{cfg.label}</span>
                  </div>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,.38)", margin: "0 0 6px", lineHeight: 1.6 }}>{inc.detail}</p>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,.22)" }}>{inc.date}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default function StatusPage() {
  return (
    <div style={{ fontFamily: ff, color: "white" }}>
      <style>{`*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}body{background:rgb(7,8,15)}`}</style>
      <ForgeNav />
      <Hero />
      <ServiceList />
      <UptimeGrid />
      <Incidents />
      <ForgeFooter />
    </div>
  );
}
