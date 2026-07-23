"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import toast from "react-hot-toast";
import { useResponsive } from "@/hooks/useResponsive";

const ff = "'Outfit','Inter',sans-serif";

type Features = {
  advancedPurchasing:    boolean;
  multiWarehouse:        boolean;
  approvalWorkflow:      boolean;
  customerCreditLimits:  boolean;
  batchSerialTracking:   boolean;
  productVariants:       boolean;
  discountEngine:        boolean;
  taxConfiguration:      boolean;
  smsNotifications:      boolean;
};

const DEFAULT: Features = {
  advancedPurchasing:    false,
  multiWarehouse:        false,
  approvalWorkflow:      false,
  customerCreditLimits:  false,
  batchSerialTracking:   false,
  productVariants:       false,
  discountEngine:        false,
  taxConfiguration:      false,
  smsNotifications:      false,
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
  {
    key: "customerCreditLimits" as keyof Features,
    icon: "💳",
    title: "Customer Credit Limits",
    subtitle: "Per-customer credit control",
    who: "Wholesale / B2B",
    whoColor: "#fb923c",
    description:
      "Set a maximum credit limit per customer. Block or warn when a new invoice would exceed that limit. Prevents bad debt before it happens.",
    simple: {
      label: "Simple Mode (OFF)",
      flow: ["Create invoice for any customer", "→ No credit check done", "→ Invoice saved directly ✅"],
      note: "Full trust mode. Good for small retail or cash-only businesses.",
    },
    advanced: {
      label: "Advanced Mode (ON)",
      flow: ["Set credit limit per customer", "→ New invoice checked against outstanding balance", "→ Blocked if limit exceeded", "→ Manager override available ✅"],
      note: "Prevents over-exposure to slow-paying customers.",
    },
    unlocks: ["Credit limit field on customer profile", "Over-limit block at invoice creation", "Manager override on blocked sales"],
    color: "#fb923c",
    bg: "rgba(251,146,60,.07)",
    border: "rgba(251,146,60,.2)",
  },
  {
    key: "batchSerialTracking" as keyof Features,
    icon: "🔢",
    title: "Batch & Serial Number Tracking",
    subtitle: "Lot numbers, expiry, individual units",
    who: "Pharma / Electronics",
    whoColor: "#38bdf8",
    description:
      "Track inventory by batch (with expiry date) or by serial number per unit. Enables recalls, warranty tracking, and compliance reporting.",
    simple: {
      label: "Simple Mode (OFF)",
      flow: ["Stock received in bulk", "→ No batch or serial required", "→ Stock count updated ✅"],
      note: "Standard stock tracking. Works for most general retail.",
    },
    advanced: {
      label: "Advanced Mode (ON)",
      flow: ["Purchase: enter batch no. + expiry date", "→ Sale: batch/serial auto-assigned (FEFO)", "→ Full traceability per unit", "→ Expiry alerts before stock expires ✅"],
      note: "Mandatory for pharma, medical devices, and electronics.",
    },
    unlocks: ["Batch number on purchase receipt", "Serial number capture on sale", "Expiry date tracking & alerts"],
    color: "#38bdf8",
    bg: "rgba(56,189,248,.07)",
    border: "rgba(56,189,248,.2)",
  },
  {
    key: "productVariants" as keyof Features,
    icon: "👕",
    title: "Product Variants",
    subtitle: "Size, color, weight per product",
    who: "Clothing / Footwear / FMCG",
    whoColor: "#e879f9",
    description:
      "A single product can have multiple variants (S / M / L, Red / Blue). Each variant has its own price and stock level.",
    simple: {
      label: "Simple Mode (OFF)",
      flow: ["One product → one SKU", "→ One price, one stock", "→ Done ✅"],
      note: "Clean and simple. Best for single-item businesses.",
    },
    advanced: {
      label: "Advanced Mode (ON)",
      flow: ["Create product with variant attributes", "→ Generate variants (S-Red, S-Blue, M-Red…)", "→ Per-variant price & stock", "→ Variant-wise sales report ✅"],
      note: "Essential for clothing, shoes, beverages with sizes.",
    },
    unlocks: ["Variant attribute builder (Size, Color, Weight)", "Per-variant pricing & stock", "Variant-wise sales analytics"],
    color: "#e879f9",
    bg: "rgba(232,121,249,.07)",
    border: "rgba(232,121,249,.2)",
  },
  {
    key: "discountEngine" as keyof Features,
    icon: "🏷️",
    title: "Discount & Promotions Engine",
    subtitle: "BOGO, category discounts, timed sales",
    who: "Retail / FMCG",
    whoColor: "#f97316",
    description:
      "Run structured promotions — Buy 1 Get 1, category-wide % off, bundle pricing, and time-limited sale prices. Applied automatically at POS.",
    simple: {
      label: "Simple Mode (OFF)",
      flow: ["Manual discount on each invoice line", "→ No promo rules", "→ Discount at cashier's discretion ✅"],
      note: "Ad-hoc discounts only. No automated promotions.",
    },
    advanced: {
      label: "Advanced Mode (ON)",
      flow: ["Create promo rule (type + date range + scope)", "→ Auto-applied at POS on matching items", "→ Stacking rules controlled", "→ Promo performance report ✅"],
      note: "Structured promotions with full audit trail.",
    },
    unlocks: ["Promotions rule manager", "BOGO & bundle pricing engine", "Category-wise % discount rules"],
    color: "#f97316",
    bg: "rgba(249,115,22,.07)",
    border: "rgba(249,115,22,.2)",
  },
  {
    key: "taxConfiguration" as keyof Features,
    icon: "📑",
    title: "Tax & GST Configuration",
    subtitle: "GST / Sales Tax on invoices",
    who: "Registered Businesses",
    whoColor: "#4ade80",
    description:
      "Enable tax on invoices. Assign tax classes to products, choose tax-inclusive or exclusive pricing, and generate tax summary reports.",
    simple: {
      label: "Simple Mode (OFF)",
      flow: ["Price entered directly", "→ No tax calculation", "→ Invoice total = net price ✅"],
      note: "For unregistered or informal businesses.",
    },
    advanced: {
      label: "Advanced Mode (ON)",
      flow: ["Tax class assigned per product", "→ Tax auto-calculated on invoice", "→ Tax-inclusive or exclusive toggle", "→ GST summary report for filing ✅"],
      note: "Required for FBR/GST-registered businesses.",
    },
    unlocks: ["Tax class setup (Standard, Zero-rated, Exempt)", "Auto tax on sales & purchase invoices", "Tax summary report for filing"],
    color: "#4ade80",
    bg: "rgba(74,222,128,.07)",
    border: "rgba(74,222,128,.2)",
  },
  {
    key: "smsNotifications" as keyof Features,
    icon: "💬",
    title: "SMS & WhatsApp Notifications",
    subtitle: "Automated customer & owner alerts",
    who: "Customer-Facing Businesses",
    whoColor: "#34d399",
    description:
      "Send automated messages to customers — sale receipts via WhatsApp, payment due reminders, and low-stock alerts to the owner.",
    simple: {
      label: "Simple Mode (OFF)",
      flow: ["Sale complete", "→ No message sent", "→ Customer walks out with paper receipt ✅"],
      note: "No external API needed. Fully offline-friendly.",
    },
    advanced: {
      label: "Advanced Mode (ON)",
      flow: ["Sale complete → WhatsApp receipt sent instantly", "→ Payment overdue → Reminder sent automatically", "→ Stock below threshold → Owner alerted", "→ Full delivery log ✅"],
      note: "Requires WhatsApp Business API or SMS gateway setup.",
    },
    unlocks: ["WhatsApp receipt on sale completion", "Payment due reminders to customers", "Low-stock owner alerts"],
    color: "#34d399",
    bg: "rgba(52,211,153,.07)",
    border: "rgba(52,211,153,.2)",
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
  const { isMobile } = useResponsive();
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
    <div style={{ padding: isMobile ? "22px 13px" : "40px 28px", fontFamily: ff }}>
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
        <div style={{ marginTop: 20, padding: isMobile ? "12px 10px" : "14px 18px", borderRadius: 12, background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.15)", display: "flex", gap: 14, alignItems: "flex-start" }}>
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
              <div style={{ padding: isMobile ? "12px 10px" : "18px 22px", display: "flex", alignItems: "center", gap: 16 }}>
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
                <div style={{ padding: isMobile ? "12px 10px" : "14px 18px", borderRight: "1px solid rgba(255,255,255,.05)", background: !isOn ? "rgba(52,211,153,.04)" : "transparent" }}>
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
                <div style={{ padding: isMobile ? "12px 10px" : "14px 18px", background: isOn ? `${fc.color}08` : "transparent" }}>
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
