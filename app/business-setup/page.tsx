"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BUSINESS_TYPES, BUSINESS_PHASE_CONFIG, BUSINESS_CATEGORIES, type BusinessType } from "@/lib/businessModules";
import { getCurrentUser } from "@/lib/auth";

const BADGE_MAP: Record<string, { labels: string[]; color: string; bg: string }> = {
  manufacturing:  { labels: ["BOM", "Production", "Work Orders"], color: "#fbbf24", bg: "rgba(245,158,11,.15)" },
  restaurant:     { labels: ["Tables", "Kitchen", "Menu"], color: "#fca5a5", bg: "rgba(248,113,113,.15)" },
  real_estate:    { labels: ["Properties", "Rent", "Leases"], color: "#a5b4fc", bg: "rgba(129,140,248,.15)" },
  construction:   { labels: ["Projects", "Sites", "Subcontractors"], color: "#fdba74", bg: "rgba(251,146,60,.15)" },
  distribution:   { labels: ["Routes", "Van Sales", "Delivery"], color: "#c4b5fd", bg: "rgba(139,92,246,.15)" },
  retail:         { labels: ["POS", "Loyalty", "Catalog"], color: "#f9a8d4", bg: "rgba(236,72,153,.15)" },
  hospital:       { labels: ["Patients", "Appointments", "Lab"], color: "#6ee7b7", bg: "rgba(52,211,153,.15)" },
  clinic:         { labels: ["Patients", "Prescriptions"], color: "#6ee7b7", bg: "rgba(52,211,153,.15)" },
  hotel:          { labels: ["Rooms", "Housekeeping", "Front Desk"], color: "#7dd3fc", bg: "rgba(56,189,248,.15)" },
  school:         { labels: ["Students", "Fees", "Exams"], color: "#fde68a", bg: "rgba(245,158,11,.15)" },
  pharmacy:       { labels: ["Drugs", "Expiry", "Prescriptions"], color: "#86efac", bg: "rgba(34,197,94,.15)" },
  salon:          { labels: ["Appointments", "Stylists", "Services"], color: "#f9a8d4", bg: "rgba(244,114,182,.15)" },
  gym:            { labels: ["Memberships", "Trainers", "Classes"], color: "#67e8f9", bg: "rgba(6,182,212,.15)" },
  transport:      { labels: ["Fleet", "Trips", "Drivers"], color: "#fca5a5", bg: "rgba(239,68,68,.15)" },
  agriculture:    { labels: ["Crops", "Livestock", "Harvest"], color: "#86efac", bg: "rgba(34,197,94,.15)" },
  ngo:            { labels: ["Donors", "Grants", "Beneficiaries"], color: "#c4b5fd", bg: "rgba(139,92,246,.15)" },
  ecommerce:      { labels: ["Listings", "Orders", "Returns"], color: "#7dd3fc", bg: "rgba(56,189,248,.15)" },
  it_company:          { labels: ["Projects", "Sprints", "Support"], color: "#a5b4fc", bg: "rgba(99,102,241,.15)" },
  law_firm:            { labels: ["Cases", "Billing", "Time"], color: "#fde68a", bg: "rgba(234,179,8,.15)" },
  food_processing:     { labels: ["BOM", "Production", "HACCP"], color: "#fca5a5", bg: "rgba(248,113,113,.15)" },
  car_showroom:        { labels: ["Vehicle Stock", "Test Drive", "Finance"], color: "#7dd3fc", bg: "rgba(14,165,233,.15)" },
  car_workshop:        { labels: ["Job Cards", "Parts", "Labour"], color: "#94a3b8", bg: "rgba(100,116,139,.15)" },
  spare_parts:         { labels: ["Parts Stock", "Barcode", "Reorder"], color: "#cbd5e1", bg: "rgba(120,113,108,.15)" },
  car_rental:          { labels: ["Fleet", "Bookings", "AMC"], color: "#c4b5fd", bg: "rgba(124,58,237,.15)" },
  advertising_agency:  { labels: ["Campaigns", "Media Buy", "Billing"], color: "#fda4af", bg: "rgba(244,63,94,.15)" },
  digital_marketing:   { labels: ["Retainers", "Campaigns", "ROI"], color: "#67e8f9", bg: "rgba(6,182,212,.15)" },
  printing_press:      { labels: ["Print Jobs", "Paper Stock", "Delivery"], color: "#93c5fd", bg: "rgba(30,64,175,.15)" },
  saas_company:        { labels: ["MRR", "Subscribers", "Churn"], color: "#a5b4fc", bg: "rgba(99,102,241,.15)" },
  isp:                 { labels: ["Connections", "Billing", "Support"], color: "#7dd3fc", bg: "rgba(2,132,199,.15)" },
  accounting_firm:     { labels: ["Clients", "Tax Filing", "Billing"], color: "#6ee7b7", bg: "rgba(5,150,105,.15)" },
  consultancy_firm:    { labels: ["Projects", "Retainers", "Reports"], color: "#fde68a", bg: "rgba(217,119,6,.15)" },
  mobile_repair:       { labels: ["Job Cards", "Parts", "Warranty"], color: "#c4b5fd", bg: "rgba(124,58,237,.15)" },
  equipment_maintenance:{ labels: ["AMC", "Service Jobs", "Parts"], color: "#94a3b8", bg: "rgba(71,85,105,.15)" },
  solar_company:       { labels: ["Projects", "kWp", "AMC"], color: "#fde68a", bg: "rgba(245,158,11,.15)" },
  import_company:      { labels: ["Shipments", "Customs", "LC"], color: "#67e8f9", bg: "rgba(8,145,178,.15)" },
  export_company:      { labels: ["Shipments", "LC/TT", "FOB"], color: "#6ee7b7", bg: "rgba(13,148,136,.15)" },
  clearing_forwarding: { labels: ["Files", "Customs", "Delivery"], color: "#fbbf24", bg: "rgba(120,53,15,.15)" },
  event_planner:       { labels: ["Events", "Vendors", "Budget"], color: "#e879f9", bg: "rgba(192,38,211,.15)" },
  wedding_planner:     { labels: ["Bookings", "Vendors", "Decor"], color: "#fda4af", bg: "rgba(225,29,72,.15)" },
  equipment_rental:    { labels: ["Rentals", "Utilization", "Maintenance"], color: "#fdba74", bg: "rgba(234,88,12,.15)" },
  franchise_brand:     { labels: ["Outlets", "Royalty", "Brand"], color: "#c4b5fd", bg: "rgba(124,58,237,.15)" },
};

// Notify Me modal state
interface NotifyState {
  businessType: string;
  label: string;
  emoji: string;
  email: string;
  name: string;
  loading: boolean;
  done: boolean;
  error: string;
}

export default function BusinessSetupPage() {
  const router = useRouter();
  const [selected,     setSelected]     = useState<BusinessType | null>(null);
  const [saving,       setSaving]        = useState(false);
  const [step,         setStep]          = useState<"type" | "details">("type");
  const [details,      setDetails]       = useState({ employees: "", revenue: "", city: "" });
  const [category,     setCategory]      = useState("All");
  const [search,       setSearch]        = useState("");
  const [liveTypes,    setLiveTypes]     = useState<Set<string> | null>(null);
  const [notify,       setNotify]        = useState<NotifyState | null>(null);

  // Fetch live business types from admin settings
  useEffect(() => {
    fetch("/api/public/business-module-status")
      .then(r => r.json())
      .then(d => setLiveTypes(new Set<string>(d.enabledTypes || [])))
      .catch(() => {
        // Fallback: only Phase 1 types are live by default
        const defaultLive = Object.entries(BUSINESS_PHASE_CONFIG)
          .filter(([, cfg]) => cfg.status === "live")
          .map(([id]) => id);
        setLiveTypes(new Set(defaultLive));
      });
  }, []);

  useEffect(() => {
    const user = getCurrentUser();
    const headers: Record<string, string> = {};
    if (user?.companyId) headers["x-company-id"] = user.companyId;
    if (user?.id)        headers["x-user-id"]    = user.id;
    fetch("/api/company/business-type", { headers })
      .then(r => r.json())
      .then(d => { if (d.businessSetupDone) router.replace("/dashboard"); })
      .catch(() => {});
    try {
      const pending = localStorage.getItem("pendingBusinessType");
      if (pending) {
        setSelected(pending as BusinessType);
        localStorage.removeItem("pendingBusinessType");
      }
    } catch {}
  }, []);

  const isLive = (id: string) => !liveTypes || liveTypes.has(id);

  const bt = selected ? BUSINESS_TYPES.find(b => b.id === selected) : null;

  // All BUSINESS_TYPES + any in BUSINESS_PHASE_CONFIG not yet in BUSINESS_TYPES
  const allTypes = BUSINESS_TYPES;

  const filtered = allTypes.filter(b => {
    if (category !== "All" && b.category !== category) return false;
    if (search && !b.label.toLowerCase().includes(search.toLowerCase()) && !b.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Separate live and coming-soon
  const liveFiltered       = filtered.filter(b => isLive(b.id));
  const comingSoonFiltered = filtered.filter(b => !isLive(b.id));

  async function save() {
    if (!selected) return;
    setSaving(true);
    try {
      const user = getCurrentUser();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (user?.companyId) headers["x-company-id"] = user.companyId;
      if (user?.id)        headers["x-user-id"]    = user.id;
      if (user?.role)      headers["x-user-role"]  = user.role;

      const res = await fetch("/api/company/setup", {
        method: "POST",
        headers,
        body: JSON.stringify({ businessType: selected }),
      });

      if (res.ok) {
        router.replace("/dashboard");
      } else {
        const text = await res.text().catch(() => "");
        let err: any = {};
        try { err = JSON.parse(text); } catch {}
        alert(`Setup failed (${res.status}): ${err.error || "Unknown error"}`);
        setSaving(false);
      }
    } catch {
      setSaving(false);
    }
  }

  async function submitNotify() {
    if (!notify || !notify.email) return;
    setNotify(n => n ? { ...n, loading: true, error: "" } : n);
    try {
      const r = await fetch("/api/public/notify-me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:        notify.email.trim(),
          businessType: notify.businessType,
          name:         notify.name.trim() || undefined,
        }),
      });
      const d = await r.json();
      if (r.ok) {
        setNotify(n => n ? { ...n, loading: false, done: true } : n);
      } else {
        setNotify(n => n ? { ...n, loading: false, error: d.error || "Failed" } : n);
      }
    } catch {
      setNotify(n => n ? { ...n, loading: false, error: "Connection error" } : n);
    }
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "12px 14px", borderRadius: 10,
    background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)",
    color: "white", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg,#080c1e 0%,#0d1035 60%,#080c1e 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      fontFamily: "'Outfit','Inter',sans-serif", padding: "40px 20px", color: "white",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .bt-card { transition: all .18s; cursor: pointer; }
        .bt-card:hover { transform: translateY(-3px); border-color: rgba(255,255,255,.18) !important; }
        .bt-card-soon { cursor: default; }
        .cat-pill { transition: all .15s; cursor: pointer; border: none; font-family: inherit; }
        .cat-pill:hover { opacity: .9; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 4px; }
        .modal-overlay { position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9998;display:flex;align-items:center;justify-content:center;animation:fadeIn .15s ease; }
        .modal-box { background:#0f1535;border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:32px;width:100%;max-width:400px;z-index:9999;animation:fadeUp .2s ease; }
      `}</style>

      {/* Background grid */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(99,102,241,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.03) 1px,transparent 1px)", backgroundSize: "48px 48px", pointerEvents: "none" }} />

      {/* Notify Me Modal */}
      {notify && (
        <div className="modal-overlay" onClick={() => !notify.loading && setNotify(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            {notify.done ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 10px" }}>You're on the list!</h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,.45)", margin: "0 0 20px" }}>
                  We'll email you as soon as <strong style={{ color: "white" }}>{notify.label}</strong> goes live.
                </p>
                <button onClick={() => setNotify(null)} style={{ padding: "10px 24px", borderRadius: 9, border: "none", background: "rgba(99,102,241,.2)", color: "#a5b4fc", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  Close
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <span style={{ fontSize: 36 }}>{notify.emoji}</span>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "white" }}>{notify.label}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginTop: 2 }}>Coming Soon — Get notified when live</div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
                  <input
                    type="text"
                    placeholder="Your name (optional)"
                    value={notify.name}
                    onChange={e => setNotify(n => n ? { ...n, name: e.target.value } : n)}
                    style={inp}
                  />
                  <input
                    type="email"
                    placeholder="Your email address *"
                    value={notify.email}
                    onChange={e => setNotify(n => n ? { ...n, email: e.target.value } : n)}
                    style={inp}
                  />
                </div>
                {notify.error && (
                  <div style={{ fontSize: 12, color: "#f87171", marginBottom: 12 }}>{notify.error}</div>
                )}
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setNotify(null)}
                    style={{ flex: 1, padding: "11px", borderRadius: 9, border: "1px solid rgba(255,255,255,.08)", background: "transparent", color: "rgba(255,255,255,.4)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    Cancel
                  </button>
                  <button
                    onClick={submitNotify}
                    disabled={notify.loading || !notify.email}
                    style={{ flex: 2, padding: "11px", borderRadius: 9, border: "none", background: notify.email ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "rgba(255,255,255,.06)", color: notify.email ? "white" : "rgba(255,255,255,.25)", fontSize: 13, fontWeight: 700, cursor: notify.email ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                    {notify.loading ? "Saving…" : "🔔 Notify Me"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Logo */}
      <div style={{ animation: "fadeUp .4s ease both", marginBottom: 36, textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#6366f1,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", boxShadow: "0 0 40px rgba(99,102,241,.4)" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", letterSpacing: ".1em", textTransform: "uppercase" }}>Welcome to Finova</div>
      </div>

      {/* ── STEP 1: Choose business type ── */}
      {step === "type" && (
        <div style={{ animation: "fadeUp .5s ease .1s both", width: "100%", maxWidth: 1000 }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <h1 style={{ fontSize: 30, fontWeight: 900, margin: "0 0 10px", background: "linear-gradient(135deg,#fff,rgba(255,255,255,.7))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              What kind of business do you run?
            </h1>
            <p style={{ color: "rgba(255,255,255,.4)", fontSize: 14, margin: 0 }}>
              We'll configure your entire dashboard — accounts, features, and KPIs — automatically
            </p>
          </div>

          {/* Search */}
          <div style={{ position: "relative", maxWidth: 400, margin: "0 auto 24px" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 15, opacity: .4 }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search business types…"
              style={{ ...inp, paddingLeft: 40, maxWidth: "100%" }}
            />
          </div>

          {/* Category pills */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 28 }}>
            {BUSINESS_CATEGORIES.map(cat => (
              <button
                key={cat}
                className="cat-pill"
                onClick={() => setCategory(cat)}
                style={{
                  padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: category === cat ? "rgba(99,102,241,.2)" : "rgba(255,255,255,.04)",
                  border: `1px solid ${category === cat ? "rgba(99,102,241,.5)" : "rgba(255,255,255,.08)"}`,
                  color: category === cat ? "#a5b4fc" : "rgba(255,255,255,.45)",
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* ── Live business types ── */}
          {liveFiltered.length > 0 && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#34d399", textTransform: "uppercase", letterSpacing: ".08em" }}>🟢 Available Now</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,.2)" }}>{liveFiltered.length} business types</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12, marginBottom: 32 }}>
                {liveFiltered.map((b) => {
                  const isSelected = selected === b.id;
                  const badges = BADGE_MAP[b.id];
                  return (
                    <div
                      key={b.id}
                      className="bt-card"
                      onClick={() => setSelected(b.id)}
                      style={{
                        borderRadius: 14, padding: "18px 20px", position: "relative", overflow: "hidden",
                        border: `2px solid ${isSelected ? b.color : "rgba(255,255,255,.07)"}`,
                        background: isSelected ? `${b.color}12` : "rgba(255,255,255,.02)",
                        boxShadow: isSelected ? `0 0 24px ${b.color}20` : "none",
                      }}
                    >
                      {isSelected && (
                        <div style={{ position: "absolute", top: 10, right: 10, width: 20, height: 20, borderRadius: "50%", background: b.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>✓</div>
                      )}
                      <div style={{ fontSize: 30, marginBottom: 8 }}>{b.icon}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 5 }}>{b.label}</div>
                      <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.38)", lineHeight: 1.5, marginBottom: 10 }}>{b.description}</div>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {badges ? badges.labels.map(l => (
                          <span key={l} style={{ fontSize: 9.5, padding: "2px 7px", borderRadius: 20, background: badges.bg, color: badges.color, fontWeight: 700 }}>{l}</span>
                        )) : null}
                        <span style={{ fontSize: 9.5, padding: "2px 7px", borderRadius: 20, background: "rgba(255,255,255,.06)", color: "rgba(255,255,255,.35)", fontWeight: 600 }}>
                          {b.modules.length} modules
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── Coming Soon business types ── */}
          {comingSoonFiltered.length > 0 && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, marginTop: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#fbbf24", textTransform: "uppercase", letterSpacing: ".08em" }}>⏳ Coming Soon</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,.2)" }}>{comingSoonFiltered.length} more types launching soon</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12 }}>
                {comingSoonFiltered.map((b) => {
                  const phaseCfg = BUSINESS_PHASE_CONFIG[b.id];
                  return (
                    <div
                      key={b.id}
                      className="bt-card-soon"
                      style={{
                        borderRadius: 14, padding: "18px 20px", position: "relative", overflow: "hidden",
                        border: "2px solid rgba(255,255,255,.04)",
                        background: "rgba(255,255,255,.01)",
                        opacity: 0.55,
                      }}
                    >
                      {/* Coming Soon badge */}
                      <div style={{ position: "absolute", top: 10, right: 10, padding: "2px 8px", borderRadius: 20, fontSize: 9, fontWeight: 800, background: "rgba(251,191,36,.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,.25)", letterSpacing: ".05em" }}>
                        SOON
                      </div>
                      <div style={{ fontSize: 30, marginBottom: 8, filter: "grayscale(.5)" }}>{b.icon}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,.6)", marginBottom: 5 }}>{b.label}</div>
                      <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.25)", lineHeight: 1.5, marginBottom: 12 }}>{b.description}</div>
                      <button
                        onClick={() => setNotify({
                          businessType: b.id,
                          label: b.label,
                          emoji: b.icon,
                          email: "",
                          name: "",
                          loading: false,
                          done: false,
                          error: "",
                        })}
                        style={{
                          width: "100%", padding: "7px 0", borderRadius: 8, border: "1px solid rgba(251,191,36,.25)",
                          background: "rgba(251,191,36,.06)", color: "#fbbf24", fontSize: 11, fontWeight: 700,
                          cursor: "pointer", fontFamily: "inherit", letterSpacing: ".02em",
                        }}
                      >
                        🔔 Notify Me When Live
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {liveFiltered.length === 0 && comingSoonFiltered.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,.25)", fontSize: 14 }}>
              No business types found for "{search}"
            </div>
          )}

          {/* Selected preview bar */}
          {selected && bt && isLive(selected) && (
            <div style={{ marginTop: 24, padding: "16px 22px", borderRadius: 14, background: `${bt.color}10`, border: `1px solid ${bt.color}30`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ fontSize: 28 }}>{bt.icon}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{bt.label} Selected</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 2 }}>{bt.tagline}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { label: "Accounts", value: bt.defaultAccounts.length },
                    { label: "KPIs",     value: bt.kpis.length },
                    { label: "Modules",  value: bt.modules.length },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: "center", padding: "6px 12px", borderRadius: 9, background: "rgba(255,255,255,.05)" }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: bt.color }}>{s.value}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,.35)" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setStep("details")}
                  style={{ padding: "11px 28px", borderRadius: 10, border: "none", cursor: "pointer", background: bt.gradient, color: "white", fontSize: 13, fontWeight: 700, fontFamily: "inherit", boxShadow: `0 6px 24px ${bt.color}35` }}
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {!selected && (
            <div style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "rgba(255,255,255,.25)" }}>
              Select a business type above to continue
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: Details ── */}
      {step === "details" && bt && (
        <div style={{ animation: "fadeUp .4s ease both", width: "100%", maxWidth: 520 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>{bt.icon}</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>Almost there!</h2>
            <p style={{ color: "rgba(255,255,255,.4)", fontSize: 13, margin: 0 }}>A few details to personalize your {bt.label} dashboard</p>
          </div>

          {/* What will be configured */}
          <div style={{ marginBottom: 20, padding: "16px 18px", borderRadius: 13, background: `${bt.color}08`, border: `1px solid ${bt.color}20` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>What we'll set up for you</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[
                { icon: "📊", label: `${bt.defaultAccounts.length} Accounts`, sub: "Chart of Accounts" },
                { icon: "📈", label: `${bt.kpis.length} KPIs`,                sub: "Dashboard metrics" },
                { icon: "🧩", label: `${bt.modules.length} Modules`,          sub: "Sidebar features" },
              ].map(s => (
                <div key={s.label} style={{ padding: "10px 12px", borderRadius: 9, background: "rgba(255,255,255,.04)", textAlign: "center" }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "white" }}>{s.label}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", marginTop: 2 }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { key: "city",      label: "Business City / Location",  placeholder: "e.g. Lahore, Karachi, Dubai" },
              { key: "employees", label: "Number of Employees",       placeholder: "e.g. 1-10, 10-50, 50+" },
              { key: "revenue",   label: "Monthly Revenue Range",     placeholder: "e.g. Under Rs.100K, Rs.100K-500K, 500K+" },
            ].map(field => (
              <div key={field.key}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 7 }}>{field.label}</label>
                <input
                  value={(details as any)[field.key]}
                  onChange={e => setDetails(d => ({ ...d, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  style={inp}
                />
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button onClick={() => setStep("type")} style={{ flex: 1, padding: "13px", borderRadius: 11, border: "1px solid rgba(255,255,255,.1)", background: "transparent", color: "rgba(255,255,255,.5)", fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>
              ← Back
            </button>
            <button
              onClick={save}
              disabled={saving}
              style={{ flex: 2, padding: "13px", borderRadius: 11, border: "none", background: bt.gradient, color: "white", fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", opacity: saving ? 0.7 : 1, boxShadow: `0 8px 28px ${bt.color}35` }}
            >
              {saving ? "⚙️ Configuring your dashboard…" : `🚀 Launch ${bt.label} Dashboard`}
            </button>
          </div>
          <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,.2)", marginTop: 14 }}>
            You can change this anytime in Business Settings
          </p>
        </div>
      )}
    </div>
  );
}
