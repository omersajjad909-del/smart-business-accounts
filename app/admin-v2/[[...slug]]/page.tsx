"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

const CompaniesPage = dynamic(() => import("@/app/admin/companies/page"));
const RevenuePage = dynamic(() => import("@/app/admin/revenue/page"));
const GeoPage = dynamic(() => import("@/app/admin/geo/page"));
const UsagePage = dynamic(() => import("@/app/admin/usage/page"));
const PlansPage = dynamic(() => import("@/app/admin/plans/page"));
const SystemPage = dynamic(() => import("@/app/admin/system/page"));
const LogsPage = dynamic(() => import("@/app/admin/logs/page"));
const PermissionsPage = dynamic(() => import("@/app/admin/permissions/page"));
const UsersPage = dynamic(() => import("@/app/admin/users/page"));
const SubscriptionsPage = dynamic(() => import("@/app/admin/subscriptions/page"));
const BroadcastsPage = dynamic(() => import("@/app/admin/broadcasts/page"));
const FeatureFlagsPage = dynamic(() => import("@/app/admin/feature-flags/page"));
const ApiKeysPage = dynamic(() => import("@/app/admin/feature-flags/page"));
const EmailLogsPage = dynamic(() => import("@/app/admin/email-logs/page"));
const TestimonialsPage = dynamic(() => import("@/app/admin/testimonials/page"));
const LeadsPage = dynamic(() => import("@/app/admin/leads/page"));
const SocialPage = dynamic(() => import("@/app/admin/social/page"));
const BusinessModulesPage = dynamic(() => import("@/app/admin/business-modules/page"));
const NewsletterPage = dynamic(() => import("@/app/admin/newsletter/page"));
const FeedbackPage = dynamic(() => import("@/app/admin/feedback/page"));
const CrmPage = dynamic(() => import("@/app/admin/crm/page"));
const FraudPage = dynamic(() => import("@/app/admin/fraud/page"));
const DevTestPage = dynamic(() => import("@/app/admin/dev-test/page"));
const AutomationPage = dynamic(() => import("@/app/admin/automation/page"));
const MarketingAutopilotPage = dynamic(() => import("@/app/admin/marketing-autopilot/page"));
const WebPage = dynamic(() => import("@/app/admin/web/page"));
const AuditTrailPage = dynamic(() => import("@/app/admin/audit-trail/page"));

type AdminSection = {
  id: string;
  label: string;
  href: string;
  icon: string;
  description: string;
  badge?: string;
  standalone?: boolean;
  group: string;
};

const SECTIONS: AdminSection[] = [
  { id: "dashboard", label: "Overview", href: "/admin-v2", icon: "◈", description: "Premium command center", group: "Overview", standalone: true },
  { id: "companies", label: "Companies", href: "/admin-v2/companies", icon: "⌂", description: "Tenants, plans, business types", group: "Core", standalone: true },
  { id: "users", label: "Users", href: "/admin-v2/users", icon: "◎", description: "Access and user operations", group: "Core", standalone: true },
  { id: "subscriptions", label: "Subscriptions", href: "/admin-v2/subscriptions", icon: "◍", description: "Billing overrides and renewals", group: "Core", standalone: true },
  { id: "plans", label: "Plans", href: "/admin-v2/plans", icon: "✦", description: "Pricing, plan permissions, modules", group: "Core", standalone: true },
  { id: "permissions", label: "Permissions", href: "/admin-v2/permissions", icon: "◇", description: "Business plan permissions", group: "Core", standalone: true },
  { id: "business-modules", label: "Business Modules", href: "/admin-v2/business-modules", icon: "⬡", description: "Industry module controls", group: "Core", standalone: true },
  { id: "revenue", label: "Revenue", href: "/admin-v2/revenue", icon: "↗", description: "MRR and plan mix", group: "Analytics", standalone: true },
  { id: "geo", label: "Geo", href: "/admin-v2/geo", icon: "◌", description: "Regional intelligence", group: "Analytics", standalone: true },
  { id: "usage", label: "Usage", href: "/admin-v2/usage", icon: "⋯", description: "Behavior and risk signals", group: "Analytics", standalone: true },
  { id: "audit-trail", label: "Audit Trail", href: "/admin-v2/audit-trail", icon: "▤", description: "Deep activity trace", group: "Analytics", standalone: true },
  { id: "web", label: "Web Metrics", href: "/admin-v2/web", icon: "☰", description: "Site traffic and web KPIs", group: "Analytics", standalone: true },
  { id: "crm", label: "CRM", href: "/admin-v2/crm", icon: "◐", description: "Leads and visitor funnel", group: "Growth", standalone: true },
  { id: "leads", label: "Leads", href: "/admin-v2/leads", icon: "✓", description: "Lead operations", group: "Growth", standalone: true },
  { id: "broadcasts", label: "Broadcasts", href: "/admin-v2/broadcasts", icon: "◔", description: "Outbound campaigns", group: "Growth", standalone: true },
  { id: "newsletter", label: "Newsletter", href: "/admin-v2/newsletter", icon: "✉", description: "Subscriber engagement", group: "Growth", standalone: true },
  { id: "social", label: "Social", href: "/admin-v2/social", icon: "⌘", description: "Social publishing", group: "Growth", standalone: true },
  { id: "feedback", label: "Feedback", href: "/admin-v2/feedback", icon: "✎", description: "User sentiment and issues", group: "Growth", standalone: true },
  { id: "testimonials", label: "Testimonials", href: "/admin-v2/testimonials", icon: "★", description: "Public proof management", group: "Growth", standalone: true },
  { id: "automation", label: "Automation", href: "/admin-v2/automation", icon: "⚡", description: "Marketing automations", group: "Growth", standalone: true, badge: "NEW" },
  { id: "marketing-autopilot", label: "Autopilot", href: "/admin-v2/marketing-autopilot", icon: "☼", description: "AI growth workspace", group: "Growth", standalone: true, badge: "AI" },
  { id: "system", label: "System", href: "/admin-v2/system", icon: "▣", description: "Environment health", group: "Security", standalone: true },
  { id: "logs", label: "Logs", href: "/admin-v2/logs", icon: "▦", description: "Operational logs", group: "Security", standalone: true },
  { id: "email-logs", label: "Email Logs", href: "/admin-v2/email-logs", icon: "✉", description: "Outbound email activity", group: "Security", standalone: true },
  { id: "feature-flags", label: "Feature Flags", href: "/admin-v2/feature-flags", icon: "⚑", description: "Controlled releases", group: "Security", standalone: true },
  { id: "fraud", label: "Fraud Monitor", href: "/admin-v2/fraud", icon: "⛨", description: "Risk and abuse review", group: "Security", standalone: true },
  { id: "dev-test", label: "Dev Test Mode", href: "/admin-v2/dev-test", icon: "⌁", description: "Developer preview tooling", group: "Security", standalone: true, badge: "DEV" },
  { id: "settings", label: "Legacy Settings", href: "/admin", icon: "⚙", description: "Fallback to current admin for legacy-only sections", group: "Legacy", standalone: false },
];

const GROUP_ORDER = ["Overview", "Core", "Analytics", "Growth", "Security", "Legacy"];

function getSectionId(pathname: string) {
  const part = pathname.replace(/^\/admin-v2\/?/, "").split("/")[0] || "dashboard";
  return part;
}

function renderSection(sectionId: string) {
  switch (sectionId) {
    case "companies":
      return <CompaniesPage />;
    case "users":
      return <UsersPage />;
    case "subscriptions":
      return <SubscriptionsPage />;
    case "plans":
      return <PlansPage />;
    case "permissions":
      return <PermissionsPage />;
    case "business-modules":
      return <BusinessModulesPage />;
    case "revenue":
      return <RevenuePage />;
    case "geo":
      return <GeoPage />;
    case "usage":
      return <UsagePage />;
    case "audit-trail":
      return <AuditTrailPage />;
    case "web":
      return <WebPage />;
    case "crm":
      return <CrmPage />;
    case "leads":
      return <LeadsPage />;
    case "broadcasts":
      return <BroadcastsPage />;
    case "newsletter":
      return <NewsletterPage />;
    case "social":
      return <SocialPage />;
    case "feedback":
      return <FeedbackPage />;
    case "testimonials":
      return <TestimonialsPage />;
    case "automation":
      return <AutomationPage />;
    case "marketing-autopilot":
      return <MarketingAutopilotPage />;
    case "system":
      return <SystemPage />;
    case "logs":
      return <LogsPage />;
    case "email-logs":
      return <EmailLogsPage />;
    case "feature-flags":
      return <FeatureFlagsPage />;
    case "apikeys":
      return <ApiKeysPage />;
    case "fraud":
      return <FraudPage />;
    case "dev-test":
      return <DevTestPage />;
    default:
      return null;
  }
}

function OverviewPanel() {
  const user = getCurrentUser();
  const quickLinks = SECTIONS.filter((section) => section.standalone && section.id !== "dashboard").slice(0, 8);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section
        style={{
          borderRadius: 30,
          padding: 28,
          background:
            "linear-gradient(135deg, rgba(14,25,58,.96), rgba(8,12,24,.98))",
          border: "1px solid rgba(125,211,252,.16)",
          boxShadow: "0 24px 80px rgba(0,0,0,.34)",
        }}
      >
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <span style={pill("#67e8f9", "rgba(103,232,249,.14)")}>Premium Admin Preview</span>
            <span style={pill("#34d399", "rgba(52,211,153,.12)")}>Current Admin Safe</span>
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, color: "white", letterSpacing: "-.03em" }}>
            FinovaOS Admin V2
          </div>
          <div style={{ maxWidth: 760, fontSize: 15, lineHeight: 1.7, color: "rgba(226,232,240,.72)" }}>
            Yeh redesigned workspace current admin functionality ko replace kiye baghair preview mode me chal raha hai.
            Aap compare kar sakte ho, aur agar pasand na aaye to purana admin bilkul safe rahega.
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 4 }}>
            <Link href="/admin" style={primaryGhost}>
              Open Current Admin
            </Link>
            <Link href="/admin-v2/companies" style={primaryButton}>
              Open Premium Workspace
            </Link>
          </div>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: 14,
        }}
      >
        {[
          { label: "Admin User", value: user?.name || "Admin", note: "Current authenticated admin" },
          { label: "Preview Route", value: "/admin-v2", note: "Rollback-safe redesign route" },
          { label: "Fallback", value: "/admin", note: "Existing panel remains untouched" },
          { label: "Responsive Goal", value: "Mobile + Tablet + Desktop", note: "Redesign shell built for all sizes" },
        ].map((card) => (
          <div key={card.label} style={metricCard}>
            <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(148,163,184,.72)" }}>
              {card.label}
            </div>
            <div style={{ marginTop: 10, fontSize: 22, fontWeight: 800, color: "white" }}>{card.value}</div>
            <div style={{ marginTop: 6, fontSize: 12, color: "rgba(148,163,184,.82)" }}>{card.note}</div>
          </div>
        ))}
      </section>

      <section
        style={{
          borderRadius: 28,
          padding: 22,
          background: "rgba(7,12,24,.86)",
          border: "1px solid rgba(255,255,255,.07)",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, color: "white", marginBottom: 14 }}>Quick Access</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          {quickLinks.map((section) => (
            <Link key={section.id} href={section.href} style={quickCard}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span style={{ fontSize: 20, color: "#7dd3fc" }}>{section.icon}</span>
                {section.badge ? <span style={miniBadge}>{section.badge}</span> : null}
              </div>
              <div style={{ marginTop: 18, fontSize: 16, fontWeight: 700, color: "white" }}>{section.label}</div>
              <div style={{ marginTop: 6, fontSize: 12.5, lineHeight: 1.6, color: "rgba(148,163,184,.84)" }}>
                {section.description}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function LegacyFallbackCard({ section }: { section: AdminSection | undefined }) {
  return (
    <div
      style={{
        borderRadius: 28,
        padding: 28,
        background: "rgba(7,12,24,.9)",
        border: "1px solid rgba(251,191,36,.16)",
        display: "grid",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <span style={pill("#fbbf24", "rgba(251,191,36,.12)")}>Legacy Section</span>
        <span style={pill("#cbd5e1", "rgba(148,163,184,.12)")}>No feature removed</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: "white" }}>
        {section?.label || "Legacy Admin Section"}
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(226,232,240,.72)", maxWidth: 760 }}>
        Yeh section abhi current legacy admin shell me available hai. Premium redesign preview me bhi feature ko remove nahi kiya gaya,
        balki safe fallback diya gaya hai taa ke aap kisi bhi waqt purana flow use kar sako.
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <Link href="/admin" style={primaryButton}>
          Open Current Admin
        </Link>
        <Link href="/admin-v2" style={primaryGhost}>
          Back to Preview Home
        </Link>
      </div>
    </div>
  );
}

export default function AdminV2Page() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const sectionId = getSectionId(pathname);
  const activeSection = SECTIONS.find((item) => item.id === sectionId) || SECTIONS[0];
  const standaloneContent = renderSection(sectionId);
  const groupedSections = useMemo(
    () =>
      GROUP_ORDER.map((group) => ({
        group,
        items: SECTIONS.filter((section) => section.group === group),
      })).filter((entry) => entry.items.length > 0),
    []
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(30,41,84,.42), rgba(5,8,18,1) 42%), #050812",
        color: "white",
        fontFamily: "'Outfit','Inter',sans-serif",
      }}
    >
      <style>{responsiveStyles}</style>

      <div className="adminv2-shell">
        <aside className={`adminv2-sidebar${mobileNavOpen ? " open" : ""}`}>
          <div className="adminv2-sidebarTop">
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.03em" }}>FinovaOS</div>
                  <div style={{ fontSize: 11, color: "rgba(148,163,184,.86)", letterSpacing: ".14em", textTransform: "uppercase" }}>
                    Admin V2 Preview
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="adminv2-mobileClose"
                >
                  ×
                </button>
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.6, color: "rgba(203,213,225,.72)" }}>
                Premium redesign in progress. Existing admin remains available as fallback.
              </div>
            </div>
          </div>

          <div className="adminv2-nav">
            {groupedSections.map((entry) => (
              <div key={entry.group} style={{ display: "grid", gap: 8 }}>
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(148,163,184,.72)",
                    textTransform: "uppercase",
                    letterSpacing: ".14em",
                    fontWeight: 700,
                  }}
                >
                  {entry.group}
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  {entry.items.map((section) => {
                    const active = section.id === activeSection.id;
                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => {
                          setMobileNavOpen(false);
                          router.push(section.href);
                        }}
                        style={{
                          borderRadius: 18,
                          padding: "14px 14px",
                          border: active ? "1px solid rgba(125,211,252,.28)" : "1px solid rgba(255,255,255,.05)",
                          background: active
                            ? "linear-gradient(135deg, rgba(18,34,71,.96), rgba(8,15,34,.96))"
                            : "rgba(255,255,255,.02)",
                          color: "white",
                          cursor: "pointer",
                          textAlign: "left",
                          display: "grid",
                          gap: 4,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                            <span style={{ color: active ? "#7dd3fc" : "rgba(148,163,184,.78)", fontSize: 16 }}>{section.icon}</span>
                            <span style={{ fontSize: 13.5, fontWeight: 700, color: active ? "#e0f2fe" : "white" }}>{section.label}</span>
                          </div>
                          {section.badge ? <span style={miniBadge}>{section.badge}</span> : null}
                        </div>
                        <div style={{ fontSize: 11.5, lineHeight: 1.55, color: "rgba(148,163,184,.84)" }}>
                          {section.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="adminv2-sidebarBottom">
            <Link href="/admin" style={{ ...primaryGhost, width: "100%", justifyContent: "center" }}>
              Switch to Current Admin
            </Link>
          </div>
        </aside>

        <main className="adminv2-main">
          <header className="adminv2-header">
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <button
                type="button"
                className="adminv2-burger"
                onClick={() => setMobileNavOpen(true)}
              >
                ☰
              </button>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, color: "rgba(148,163,184,.74)", letterSpacing: ".14em)", textTransform: "uppercase" }}>
                  Premium Admin Workspace
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.03em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {activeSection.label}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
              <span style={pill("#34d399", "rgba(52,211,153,.12)")}>Responsive Preview</span>
              <Link href="/admin" style={primaryGhost}>
                Legacy Admin
              </Link>
            </div>
          </header>

          <div className="adminv2-content">
            {sectionId === "dashboard" ? (
              <OverviewPanel />
            ) : standaloneContent ? (
              <div style={contentShell}>{standaloneContent}</div>
            ) : (
              <LegacyFallbackCard section={activeSection} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

const primaryButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "12px 18px",
  borderRadius: 14,
  textDecoration: "none",
  color: "#03111d",
  fontWeight: 700,
  background: "linear-gradient(135deg,#7dd3fc,#a78bfa)",
  boxShadow: "0 14px 32px rgba(125,211,252,.24)",
};

const primaryGhost: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "12px 18px",
  borderRadius: 14,
  textDecoration: "none",
  color: "white",
  fontWeight: 700,
  border: "1px solid rgba(255,255,255,.08)",
  background: "rgba(255,255,255,.04)",
};

const metricCard: React.CSSProperties = {
  borderRadius: 22,
  padding: 20,
  background: "rgba(255,255,255,.035)",
  border: "1px solid rgba(255,255,255,.06)",
};

const quickCard: React.CSSProperties = {
  display: "block",
  borderRadius: 22,
  padding: 18,
  background: "linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02))",
  border: "1px solid rgba(255,255,255,.06)",
  textDecoration: "none",
};

const miniBadge: React.CSSProperties = {
  padding: "3px 7px",
  borderRadius: 999,
  background: "rgba(103,232,249,.12)",
  border: "1px solid rgba(103,232,249,.2)",
  color: "#67e8f9",
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: ".08em",
  textTransform: "uppercase",
};

const contentShell: React.CSSProperties = {
  borderRadius: 28,
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,.06)",
  background: "rgba(255,255,255,.015)",
  boxShadow: "0 24px 80px rgba(0,0,0,.24)",
};

function pill(color: string, bg: string): React.CSSProperties {
  return {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    color,
    background: bg,
    border: `1px solid ${bg.replace(".12", ".22").replace(".14", ".24")}`,
  };
}

const responsiveStyles = `
.adminv2-shell{display:grid;grid-template-columns:320px minmax(0,1fr);min-height:100vh}
.adminv2-sidebar{position:sticky;top:0;height:100vh;display:grid;grid-template-rows:auto 1fr auto;padding:22px 18px;background:linear-gradient(180deg,rgba(8,12,24,.98),rgba(5,8,18,.98));border-right:1px solid rgba(255,255,255,.06)}
.adminv2-sidebarTop{padding:8px 6px 18px}
.adminv2-nav{overflow:auto;display:grid;gap:20px;padding:8px 6px 14px}
.adminv2-sidebarBottom{padding:12px 6px 6px}
.adminv2-main{min-width:0;display:grid;grid-template-rows:auto 1fr}
.adminv2-header{position:sticky;top:0;z-index:20;display:flex;justify-content:space-between;align-items:center;gap:14px;padding:22px 28px;background:rgba(5,8,18,.82);backdrop-filter:blur(18px);border-bottom:1px solid rgba(255,255,255,.06)}
.adminv2-content{padding:24px 28px 40px}
.adminv2-burger,.adminv2-mobileClose{display:none;width:42px;height:42px;border-radius:14px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.05);color:white;cursor:pointer}
@media (max-width: 1024px){
  .adminv2-shell{grid-template-columns:1fr}
  .adminv2-sidebar{position:fixed;left:0;top:0;bottom:0;width:min(88vw,340px);z-index:40;transform:translateX(-100%);transition:transform .25s ease;box-shadow:0 24px 80px rgba(0,0,0,.5)}
  .adminv2-sidebar.open{transform:translateX(0)}
  .adminv2-burger,.adminv2-mobileClose{display:inline-flex;align-items:center;justify-content:center}
}
@media (max-width: 640px){
  .adminv2-header{padding:18px 16px}
  .adminv2-content{padding:16px 16px 30px}
}
`;
