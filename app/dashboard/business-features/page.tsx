"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import toast from "react-hot-toast";

const ff = "'Outfit','Inter',sans-serif";

type Features = {
  advancedPurchasing: boolean;
  multiWarehouse:     boolean;
  approvalWorkflow:   boolean;
};

const DEFAULT: Features = {
  advancedPurchasing: false,
  multiWarehouse:     false,
  approvalWorkflow:   false,
};

/* ─── Feature definitions ─── */
const FEATURE_CARDS = [
  {
    key: "advancedPurchasing" as keyof Features,
    icon: "📋",
    title: "Advanced Purchasing",
    subtitle: "Purchase Order → GRN → Invoice",
    who: "Medium / Large Business",
    whoColor: "#818cf8",
    description:
      "Full formal procurement flow with paper trail. Issue Purchase Orders to suppliers, receive goods via GRN, then match with Purchase Invoice.",
    simple: {
      label: "Simple Mode (OFF)",
      flow: ["Goods arrive from supplier", "→ Press Receive in Stock Receipts", "→ Done ✅"],
      note: "Quick 1-click stock receive. Perfect for small retail.",
    },
    advanced: {
      label: "Advanced Mode (ON)",
      flow: ["Create Purchase Order → send to supplier", "→ Goods arrive: create GRN (verify quantity)", "→ Match Purchase Invoice to GRN", "→ Auto-posted to accounts ✅"],
      note: "Formal procurement with full audit trail.",
    },
    unlocks: ["Purchase Orders (PO)", "GRN — Goods Receipt Note", "PO ↔ Invoice matching"],
    color: "#818cf8",
    bg: "rgba(99,102,241,.08)",
    border: "rgba(99,102,241,.2)",
  },
  {
    key: "multiWarehouse" as keyof Features,
    icon: "🏭",
    title: "Multi-Warehouse & Transfers",
    subtitle: "Multiple locations, stock movement",
    who: "Chain Store / Distributor",
    whoColor: "#34d399",
    description:
      "Manage stock across multiple physical locations. Transfer stock between branches, track per-warehouse levels.",
    simple: {
      label: "Simple Mode (OFF)",
      flow: ["All stock tracked in one place", "→ Use branch filter to view", "→ Done ✅"],
      note: "Single location inventory. Best for one-store setup.",
    },
    advanced: {
      label: "Advanced Mode (ON)",
      flow: ["Each warehouse tracked separately", "→ Transfer stock from Branch A to Branch B", "→ Per-location stock report", "→ Full movement history ✅"],
      note: "Multi-location inventory with transfer tracking.",
    },
    unlocks: ["Warehouses management", "Stock Transfer between branches", "Per-location stock reports"],
    color: "#34d399",
    bg: "rgba(52,211,153,.07)",
    border: "rgba(52,211,153,.2)",
  },
  {
    key: "approvalWorkflow" as keyof Features,
    icon: "✅",
    title: "Approval Workflow",
    subtitle: "Manager sign-off on purchases",
    who: "Enterprise / Large Team",
    whoColor: "#f59e0b",
    description:
      "Require manager approval before a Purchase Order is sent to a supplier. Prevents unauthorized spending.",
    simple: {
      label: "Simple Mode (OFF)",
      flow: ["Anyone can create a Purchase Invoice", "→ Saves directly without approval", "→ Done ✅"],
      note: "Fast workflow. Trust your team fully.",
    },
    advanced: {
      label: "Advanced Mode (ON)",
      flow: ["Staff submits PO for approval", "→ Manager reviews the request", "→ Approved → Sent to supplier", "→ Rejected → Returned to staff ✅"],
      note: "Controlled spending with full accountability.",
    },
    unlocks: ["PO Approval queue for managers", "Reject / Approve actions", "Approval audit log"],
    color: "#f59e0b",
    bg: "rgba(245,158,11,.07)",
    border: "rgba(245,158,11,.2)",
  },
] as const;

/* ─── Toggle component ─── */
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: 52, height: 28, borderRadius: 14, border: "none", cursor: "pointer",
        background: on ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(148,163,184,.25)",
        position: "relative", transition: "background .25s", flexShrink: 0,
      }}
    >
      <div style={{
        position: "absolute", top: 4, left: on ? 28 : 4,
        width: 20, height: 20, borderRadius: "50%", background: "#fff",
        transition: "left .25s", boxShadow: "0 2px 6px rgba(0,0,0,.3)",
      }} />
    </button>
  );
}

/* ─── Flow step list ─── */
function FlowList({ steps, color }: { steps: readonly string[]; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: i === 0 ? "rgba(255,255,255,.75)" : "#475569", lineHeight: 1.5 }}>
          {i > 0 && <span style={{ color, flexShrink: 0, marginTop: 1 }}>▸</span>}
          <span style={i === 0 ? { fontWeight: 600 } : {}}>{s}</span>
        </div>
      ))}
    </div>
  );
}

/* ══════════════ PAGE ══════════════ */
export default function BusinessFeaturesPage() {
  const [features, setFeatures] = useState<Features>({ ...DEFAULT });
  const [saved,    setSaved]    = useState<Features>({ ...DEFAULT });
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  const user = getCurrentUser() as any;
  const isAdmin = user?.role?.toUpperCase() === "ADMIN";

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/company/admin-control");
        if (!res.ok) return;
        const data = await res.json();
        const f: Features = { ...DEFAULT, ...(data.features || {}) };
        setFeatures(f);
        setSaved(f);
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  function toggle(key: keyof Features) {
    if (!isAdmin) return;
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }));
  }

  async function save() {
    setSaving(true);
    try {
      const hdrs: Record<string, string> = { "Content-Type": "application/json" };
      if (user?.id)        hdrs["x-user-id"]    = user.id;
      if (user?.role)      hdrs["x-user-role"]  = user.role;
      if (user?.companyId) hdrs["x-company-id"] = user.companyId;

      const res = await fetch("/api/company/admin-control", {
        method: "POST", headers: hdrs,
        body: JSON.stringify({ features }),
      });
      if (!res.ok) throw new Error();
      setSaved({ ...features });
      toast.success("Business features saved! Sidebar will update on next page load.");
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  }

  const hasChanges = JSON.stringify(features) !== JSON.stringify(saved);

  if (loading) return (
    <div style={{ padding: 40, textAlign: "center", color: "#475569", fontFamily: ff }}>Loading…</div>
  );

  if (!isAdmin) return (
    <div style={{ padding: "40px 28px", fontFamily: ff }}>
      <div style={{ padding: 32, borderRadius: 16, background: "rgba(248,113,113,.07)", border: "1px solid rgba(248,113,113,.25)", textAlign: "center", color: "#f87171" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Admin Only</div>
        <div style={{ fontSize: 13, color: "#475569" }}>Only admins can configure business features.</div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: "28px 32px 80px", maxWidth: 900, fontFamily: ff, color: "white" }}>
      <style>{`* { box-sizing: border-box; }`}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, letterSpacing: "-.3px" }}>⚡ Business Features</h1>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: "#475569", lineHeight: 1.6 }}>
              Enable only what your business needs. Same system — adaptive workflow.
            </p>
          </div>
          {hasChanges && (
            <button onClick={save} disabled={saving} style={{ padding: "10px 28px", borderRadius: 10, background: saving ? "rgba(99,102,241,.4)" : "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none", color: "white", fontFamily: ff, fontSize: 14, fontWeight: 700, cursor: saving ? "default" : "pointer", boxShadow: "0 4px 14px rgba(99,102,241,.35)" }}>
              {saving ? "Saving…" : "💾 Save Changes"}
            </button>
          )}
        </div>

        {/* Concept banner */}
        <div style={{ marginTop: 20, padding: "14px 18px", borderRadius: 12, background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.15)", display: "flex", gap: 14, alignItems: "flex-start" }}>
          <span style={{ fontSize: 22, flexShrink: 0 }}>🧠</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#818cf8", marginBottom: 4 }}>One system. Adaptive workflow.</div>
            <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.7 }}>
              Every feature uses the <strong style={{ color: "rgba(255,255,255,.6)" }}>same database and backend</strong> — only the screen and workflow adapts.
              Simple 2-click flow for small shops. Full approval + audit trail for enterprise.
              <br />
              <strong style={{ color: "rgba(255,255,255,.5)" }}>Default: all OFF</strong> — enable only what your business actually needs.
            </div>
          </div>
        </div>
      </div>

      {/* ── Core (always ON) ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#334155", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 12 }}>
          Core — Always Active
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
          {["🛍️ Products & Catalog", "📦 Inventory & Stock", "💳 Sales & POS", "👥 Customers & CRM", "💰 Payments", "📊 Reports"].map(f => (
            <div key={f} style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(52,211,153,.06)", border: "1px solid rgba(52,211,153,.15)", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#34d399" }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Optional Feature Cards ── */}
      <div style={{ fontSize: 11, fontWeight: 800, color: "#334155", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 14 }}>
        Optional Features — Enable as needed
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {FEATURE_CARDS.map(fc => {
          const isOn = features[fc.key];
          return (
            <div key={fc.key} style={{
              borderRadius: 16, border: `1px solid ${isOn ? fc.border : "rgba(255,255,255,.07)"}`,
              background: isOn ? fc.bg : "rgba(255,255,255,.02)",
              overflow: "hidden", transition: "border-color .2s, background .2s",
            }}>
              {/* Card header */}
              <div style={{ padding: "18px 22px", display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ fontSize: 28, flexShrink: 0 }}>{fc.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>{fc.title}</div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: `${fc.whoColor}18`, color: fc.whoColor, border: `1px solid ${fc.whoColor}30` }}>
                      {fc.who}
                    </span>
                    {isOn && <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "rgba(16,185,129,.12)", color: "#10b981", border: "1px solid rgba(16,185,129,.25)" }}>✓ ENABLED</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#475569", marginTop: 3 }}>{fc.subtitle}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginTop: 6, lineHeight: 1.6 }}>{fc.description}</div>
                </div>
                <Toggle on={isOn} onChange={() => toggle(fc.key)} />
              </div>

              {/* Flow comparison */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: `1px solid ${isOn ? fc.border : "rgba(255,255,255,.05)"}` }}>
                {/* Simple side */}
                <div style={{ padding: "14px 18px", borderRight: "1px solid rgba(255,255,255,.05)", background: !isOn ? "rgba(52,211,153,.04)" : "transparent" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: !isOn ? "#34d399" : "#334155" }} />
                    <div style={{ fontSize: 10, fontWeight: 800, color: !isOn ? "#34d399" : "#334155", textTransform: "uppercase", letterSpacing: ".06em" }}>
                      {!isOn ? "✓ Active Now" : "Simple Mode"}
                    </div>
                  </div>
                  <FlowList steps={fc.simple.flow} color="#34d399" />
                  <div style={{ marginTop: 8, fontSize: 11, color: "#334155", fontStyle: "italic" }}>{fc.simple.note}</div>
                </div>

                {/* Advanced side */}
                <div style={{ padding: "14px 18px", background: isOn ? `${fc.color}08` : "transparent" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: isOn ? fc.color : "#334155" }} />
                    <div style={{ fontSize: 10, fontWeight: 800, color: isOn ? fc.color : "#334155", textTransform: "uppercase", letterSpacing: ".06em" }}>
                      {isOn ? "✓ Active Now" : "Advanced Mode"}
                    </div>
                  </div>
                  <FlowList steps={fc.advanced.flow} color={fc.color} />
                  <div style={{ marginTop: 8, fontSize: 11, color: "#334155", fontStyle: "italic" }}>{fc.advanced.note}</div>
                </div>
              </div>

              {/* Unlocks bar */}
              {isOn && (
                <div style={{ padding: "10px 18px", borderTop: `1px solid ${fc.border}`, background: `${fc.color}06`, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: fc.color, textTransform: "uppercase", letterSpacing: ".06em" }}>Unlocked:</span>
                  {fc.unlocks.map(u => (
                    <span key={u} style={{ fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 20, background: `${fc.color}15`, color: fc.color, border: `1px solid ${fc.color}25` }}>
                      {u}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Save bar ── */}
      {hasChanges && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 999, display: "flex", alignItems: "center", gap: 14, padding: "12px 24px", borderRadius: 14, background: "#0f172a", border: "1px solid rgba(99,102,241,.35)", boxShadow: "0 8px 40px rgba(0,0,0,.5)" }}>
          <span style={{ fontSize: 13, color: "#818cf8", fontWeight: 600 }}>Unsaved changes</span>
          <button onClick={() => setFeatures({ ...saved })} style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,.1)", background: "transparent", color: "#475569", fontFamily: ff, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Discard</button>
          <button onClick={save} disabled={saving} style={{ padding: "7px 20px", borderRadius: 8, background: saving ? "rgba(99,102,241,.4)" : "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none", color: "white", fontFamily: ff, fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer" }}>
            {saving ? "Saving…" : "💾 Save"}
          </button>
        </div>
      )}
    </div>
  );
}
