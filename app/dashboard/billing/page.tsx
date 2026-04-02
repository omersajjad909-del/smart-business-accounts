"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { getCurrentUser } from "@/lib/auth";

/* ─── Types ──────────────────────────────────────────── */
type PaymentMethod = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  holderName: string;
  isDefault: boolean;
};

type Invoice = {
  id: string;
  number: string;
  date: string;
  amount: number;
  currency: string;
  status: "paid" | "open" | "void";
  plan: string;
};

type Subscription = {
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  amount: number;
  currency: string;
  introOfferClaimed: boolean;
};

/* ─── MOCK_INVOICES removed — data is now fetched from /api/billing/invoices ─── */

/* ─── Card brand config ──────────────────────────────── */
const CARD_BRANDS: Record<string, { icon: string; color: string; label: string }> = {
  visa:       { icon: "💳", color: "#1a1f71", label: "Visa" },
  mastercard: { icon: "💳", color: "#eb001b", label: "Mastercard" },
  amex:       { icon: "💳", color: "#007bc1", label: "Amex" },
  discover:   { icon: "💳", color: "#f76f20", label: "Discover" },
  unknown:    { icon: "💳", color: "#6366f1", label: "Card" },
};

const PLANS = [
  {
    code: "starter", name: "Starter", price: 49, color: "#38bdf8",
    features: ["Up to 5 users", "Core Accounting", "Sales & Purchase Invoices", "Bank Reconciliation", "Basic Reports", "Email Support"],
    notIncluded: ["HR & Payroll", "Advanced Reports", "Multi-Branch", "API Access"],
  },
  {
    code: "pro", name: "Professional", price: 99, color: "#818cf8", popular: true,
    features: ["Up to 20 users", "Everything in Starter", "CRM & Sales Pipeline", "Inventory Management", "Multi-Branch Support", "Advanced Reports", "Backup & Restore", "Priority Support"],
    notIncluded: ["HR & Payroll", "API Access", "Dedicated Account Manager"],
  },
  {
    code: "enterprise", name: "Enterprise", price: 249, color: "#c4b5fd",
    features: ["Unlimited users", "Everything in Pro", "HR & Payroll", "API Access & Webhooks", "Custom Integrations", "Dedicated Account Manager", "SLA Support", "Custom Modules"],
    notIncluded: [],
  },
];

/* ─── Helpers ────────────────────────────────────────── */
function formatCardNumber(val: string) {
  return val.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
function formatExpiry(val: string) {
  const digits = val.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? digits.slice(0, 2) + "/" + digits.slice(2) : digits;
}
function detectBrand(num: string): string {
  const n = num.replace(/\s/g, "");
  if (/^4/.test(n)) return "visa";
  if (/^5[1-5]/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  if (/^6/.test(n)) return "discover";
  return "unknown";
}

/* ─── Status Badge ───────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    paid:    { bg: "#dcfce7", color: "#16a34a", label: "Paid" },
    open:    { bg: "#fef3c7", color: "#d97706", label: "Open" },
    void:    { bg: "#f1f5f9", color: "#64748b", label: "Void" },
    active:  { bg: "#dbeafe", color: "#2563eb", label: "Active" },
    trialing:{ bg: "#f0fdf4", color: "#16a34a", label: "Trial" },
    past_due:{ bg: "#fee2e2", color: "#dc2626", label: "Past Due" },
    canceled:{ bg: "#f1f5f9", color: "#64748b", label: "Canceled" },
  };
  const s = map[status] ?? { bg: "#f1f5f9", color: "#64748b", label: status };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, background: s.bg, color: s.color, fontSize: 11, fontWeight: 700 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, display: "inline-block" }} />
      {s.label}
    </span>
  );
}

/* ─── Card Art Component ─────────────────────────────── */
function CreditCardArt({ brand, last4, expMonth, expYear, holderName, isDefault, onRemove, onSetDefault }: {
  brand: string; last4: string; expMonth: number; expYear: number;
  holderName: string; isDefault: boolean;
  onRemove: () => void; onSetDefault: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const cfg = CARD_BRANDS[brand] ?? CARD_BRANDS.unknown;

  const gradients: Record<string, string> = {
    visa:       "linear-gradient(135deg,#1a1f71 0%,#1e3a8a 100%)",
    mastercard: "linear-gradient(135deg,#2d1b69 0%,#c2185b 100%)",
    amex:       "linear-gradient(135deg,#1a3c5e 0%,#0277bd 100%)",
    discover:   "linear-gradient(135deg,#7c3102 0%,#f76f20 100%)",
    unknown:    "linear-gradient(135deg,#312e81 0%,#4f46e5 100%)",
  };

  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 16, padding: "16px 0", borderBottom: "1px solid var(--border, rgba(0,0,0,.08))" }}>
      {/* Mini card visual */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: 120, minHeight: 76, borderRadius: 12,
          background: gradients[brand] ?? gradients.unknown,
          padding: "12px 14px", position: "relative", flexShrink: 0,
          boxShadow: hovered ? "0 8px 30px rgba(0,0,0,.25)" : "0 4px 12px rgba(0,0,0,.15)",
          transition: "box-shadow .2s, transform .2s",
          transform: hovered ? "scale(1.02)" : "scale(1)",
        }}>
        {/* Chip */}
        <div style={{ width: 22, height: 16, borderRadius: 4, background: "linear-gradient(135deg,#fbbf24,#d97706)", marginBottom: 10, opacity: .9 }} />
        <div style={{ fontSize: 10, color: "rgba(255,255,255,.8)", fontFamily: "monospace", letterSpacing: 2 }}>
          •••• {last4}
        </div>
        <div style={{ fontSize: 8, color: "rgba(255,255,255,.5)", marginTop: 4 }}>
          {String(expMonth).padStart(2,"0")}/{expYear}
        </div>
        {/* Brand watermark */}
        <div style={{ position: "absolute", top: 10, right: 10, fontSize: 9, fontWeight: 900, color: "rgba(255,255,255,.4)", letterSpacing: 1 }}>
          {cfg.label.toUpperCase()}
        </div>
      </div>

      {/* Info + actions */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text, #1e293b)" }}>
            {cfg.label} ending in {last4}
          </span>
          {isDefault && (
            <span style={{ padding: "2px 8px", borderRadius: 10, background: "#dbeafe", color: "#2563eb", fontSize: 10, fontWeight: 700 }}>DEFAULT</span>
          )}
        </div>
        <div style={{ fontSize: 12, color: "var(--muted, #64748b)" }}>
          {holderName} &nbsp;·&nbsp; Expires {String(expMonth).padStart(2,"0")}/{expYear}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          {!isDefault && (
            <button onClick={onSetDefault}
              style={{ fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 8, border: "1px solid var(--border, #e2e8f0)", background: "transparent", color: "var(--text, #475569)", cursor: "pointer" }}>
              Set as Default
            </button>
          )}
          <button onClick={onRemove}
            style={{ fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 8, border: "1px solid #fecaca", background: "transparent", color: "#dc2626", cursor: "pointer" }}>
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Add Card Modal ─────────────────────────────────── */
function AddCardModal({ onClose, onSuccess }: { onClose: () => void; onSuccess?: (card: PaymentMethod) => void }) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry]         = useState("");
  const [cvc, setCvc]               = useState("");
  const [name, setName]             = useState("");
  const [address, setAddress]       = useState("");
  const [city, setCity]             = useState("");
  const [zip, setZip]               = useState("");
  const [country, setCountry]       = useState("US");
  const [saving, setSaving]         = useState(false);
  const [step, setStep]             = useState<"card"|"billing">("card");

  const brand = detectBrand(cardNumber);
  const cfg   = CARD_BRANDS[brand] ?? CARD_BRANDS.unknown;

  const gradients: Record<string, string> = {
    visa:       "linear-gradient(135deg,#1a1f71 0%,#1e3a8a 100%)",
    mastercard: "linear-gradient(135deg,#2d1b69 0%,#c2185b 100%)",
    amex:       "linear-gradient(135deg,#1a3c5e 0%,#0277bd 100%)",
    discover:   "linear-gradient(135deg,#7c3102 0%,#f76f20 100%)",
    unknown:    "linear-gradient(135deg,#312e81 0%,#4f46e5 100%)",
  };

  async function handleSave() {
    if (!cardNumber.replace(/\s/g,"") || !expiry || !name) {
      toast.error("Please fill in card number, expiry, and name.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/billing/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardNumber, expiry, holderName: name, cvc, address, city, zip, country }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.paymentMethod) {
        toast.success("Payment method added successfully!");
        onSuccess?.(data.paymentMethod);
        onClose();
      } else {
        toast.error(data?.error || "Failed to add card.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    }
    setSaving(false);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: 10,
    border: "1px solid var(--border, #e2e8f0)",
    background: "var(--input-bg, #f8fafc)",
    color: "var(--text, #1e293b)",
    fontSize: 13, outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: "var(--muted, #64748b)",
    letterSpacing: ".04em", marginBottom: 5, display: "block",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      {/* Overlay */}
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.55)", backdropFilter: "blur(4px)" }} />

      <div style={{ position: "relative", width: "100%", maxWidth: 520, background: "var(--card-bg, white)", borderRadius: 24, overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,.25)" }}>
        {/* Modal header */}
        <div style={{ padding: "22px 28px", borderBottom: "1px solid var(--border, #f1f5f9)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "var(--text, #1e293b)" }}>Add Payment Method</h2>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--muted, #64748b)" }}>Your card details are encrypted and secure</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border, #e2e8f0)", background: "transparent", cursor: "pointer", fontSize: 16, color: "var(--muted, #64748b)", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        <div style={{ padding: "24px 28px 28px" }}>
          {/* Step tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 24, padding: 4, background: "var(--tab-bg, #f1f5f9)", borderRadius: 12 }}>
            {(["card","billing"] as const).map(s => (
              <button key={s} onClick={() => setStep(s)}
                style={{ flex: 1, padding: "8px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, transition: "all .15s",
                  background: step === s ? "var(--card-bg, white)" : "transparent",
                  color: step === s ? "var(--text, #1e293b)" : "var(--muted, #94a3b8)",
                  boxShadow: step === s ? "0 1px 4px rgba(0,0,0,.1)" : "none",
                }}>
                {s === "card" ? "💳 Card Details" : "📍 Billing Address"}
              </button>
            ))}
          </div>

          {step === "card" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Live card preview */}
              <div style={{ height: 100, borderRadius: 16, background: gradients[brand] ?? gradients.unknown, padding: "16px 20px", position: "relative", marginBottom: 8, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,.2)" }}>
                <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,.06)" }} />
                <div style={{ position: "absolute", bottom: -30, right: 40, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,.04)" }} />
                <div style={{ width: 28, height: 20, borderRadius: 4, background: "linear-gradient(135deg,#fbbf24,#d97706)", marginBottom: 12 }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,.9)", fontFamily: "monospace", letterSpacing: 3 }}>
                      {cardNumber || "•••• •••• •••• ••••"}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", marginTop: 6 }}>
                      {name || "CARDHOLDER NAME"} &nbsp;&nbsp; {expiry || "MM/YY"}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 900, color: "rgba(255,255,255,.5)", letterSpacing: 1 }}>{cfg.label.toUpperCase()}</div>
                </div>
              </div>

              <div>
                <label style={labelStyle}>CARD NUMBER</label>
                <input value={cardNumber} onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                  placeholder="1234 5678 9012 3456" maxLength={19} style={{ ...inputStyle, fontFamily: "monospace", letterSpacing: 2 }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>EXPIRY DATE</label>
                  <input value={expiry} onChange={e => setExpiry(formatExpiry(e.target.value))}
                    placeholder="MM/YY" maxLength={5} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>SECURITY CODE</label>
                  <input value={cvc} onChange={e => setCvc(e.target.value.replace(/\D/g,"").slice(0,4))}
                    placeholder="CVC" maxLength={4} type="password" style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>CARDHOLDER NAME</label>
                <input value={name} onChange={e => setName(e.target.value.toUpperCase())}
                  placeholder="AS IT APPEARS ON CARD" style={{ ...inputStyle, textTransform: "uppercase" }} />
              </div>

              <button onClick={() => setStep("billing")}
                style={{ width: "100%", padding: "12px", borderRadius: 12, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>
                Continue to Billing Address →
              </button>
            </div>
          )}

          {step === "billing" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>BILLING ADDRESS</label>
                <input value={address} onChange={e => setAddress(e.target.value)}
                  placeholder="123 Main Street" style={inputStyle} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>CITY</label>
                  <input value={city} onChange={e => setCity(e.target.value)} placeholder="New York" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>ZIP / POSTAL CODE</label>
                  <input value={zip} onChange={e => setZip(e.target.value)} placeholder="10001" style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>COUNTRY</label>
                <select value={country} onChange={e => setCountry(e.target.value)}
                  style={{ ...inputStyle, cursor: "pointer", appearance: "none" }}>
                  <option value="US">United States</option>
                  <option value="GB">United Kingdom</option>
                  <option value="AE">United Arab Emirates</option>
                  <option value="CA">Canada</option>
                  <option value="AU">Australia</option>
                  <option value="SG">Singapore</option>
                  <option value="IN">India</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                  <option value="NL">Netherlands</option>
                  <option value="PK">Pakistan</option>
                  <option value="NG">Nigeria</option>
                  <option value="ZA">South Africa</option>
                  <option value="KE">Kenya</option>
                  <option value="PH">Philippines</option>
                  <option value="MY">Malaysia</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* Security notice */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", marginTop: 4 }}>
                <span style={{ fontSize: 18 }}>🔒</span>
                <p style={{ margin: 0, fontSize: 11, color: "#166534", lineHeight: 1.5 }}>
                  Your payment information is encrypted with 256-bit SSL. We never store your full card number.
                </p>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button onClick={() => setStep("card")}
                  style={{ flex: 1, padding: "12px", borderRadius: 12, background: "var(--secondary-bg, #f1f5f9)", border: "1px solid var(--border, #e2e8f0)", color: "var(--text, #475569)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  ← Back
                </button>
                <button onClick={handleSave} disabled={saving}
                  style={{ flex: 2, padding: "12px", borderRadius: 12, background: saving ? "#a5b4fc" : "linear-gradient(135deg,#4f46e5,#7c3aed)", border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: saving ? "wait" : "pointer" }}>
                  {saving ? "Saving..." : "Save Payment Method"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════ */
function BillingPage() {
  const searchParams = useSearchParams();
  const upgraded = searchParams?.get("upgrade") === "success";

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showAddCard, setShowAddCard] = useState(false);
  const [billing, setBillingToggle] = useState<"monthly" | "annual">("monthly");
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(upgraded);

  useEffect(() => {
    (async () => {
      try {
        const u = getCurrentUser();
        const h: Record<string, string> = {};
        if (u?.role) h["x-user-role"] = u.role;
        if (u?.id) h["x-user-id"] = u.id;
        if (u?.companyId) h["x-company-id"] = u.companyId;

        const [meRes, pmRes, invRes] = await Promise.all([
          fetch("/api/me/company", { cache: "no-store", headers: h, credentials: "include" }),
          fetch("/api/billing/payment-methods", { cache: "no-store", headers: h, credentials: "include" }),
          fetch("/api/billing/invoices", { cache: "no-store", headers: h, credentials: "include" }),
        ]);

        if (meRes.ok) {
          const d = await meRes.json();
          setSubscription({
            plan: d.plan || "STARTER",
            status: d.subscriptionStatus || "active",
            currentPeriodEnd: d.currentPeriodEnd || null,
            amount: d.plan === "PRO" ? 99 : d.plan === "ENTERPRISE" ? 249 : 49,
            currency: "USD",
            introOfferClaimed: !!d.introOfferClaimed,
          });
        }

        if (pmRes.ok) {
          const d = await pmRes.json();
          setPaymentMethods(d.paymentMethods || []);
        }

        if (invRes.ok) {
          const d = await invRes.json();
          setInvoices(d.invoices || []);
        }
      } catch { /* silent */ }
      setLoading(false);
    })();
  }, []);

  async function handleCheckout(planCode: string) {
    setCheckingOut(planCode);
    const prices: Record<string, string> = {
      starter:    process.env.NEXT_PUBLIC_PRICE_STARTER    || "price_starter",
      pro:        process.env.NEXT_PUBLIC_PRICE_PRO        || "price_pro",
      enterprise: process.env.NEXT_PUBLIC_PRICE_ENTERPRISE || "price_enterprise",
    };
    const u = getCurrentUser();
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (u?.role) h["x-user-role"] = u.role;
    if (u?.id) h["x-user-id"] = u.id;
    if (u?.companyId) h["x-company-id"] = u.companyId;

    const r = await fetch("/api/billing/checkout", {
      method: "POST", headers: h, credentials: "include",
      body: JSON.stringify({
        planCode, priceId: prices[planCode],
        successUrl: window.location.origin + "/dashboard?upgrade=success",
        cancelUrl: window.location.origin + "/dashboard/billing?cancel=1",
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j?.url) window.location.assign(j.url);
    else toast.error(j?.error || "Failed to change plan. Please try again.");
    setCheckingOut(null);
  }

  async function removeCard(id: string) {
    const res = await fetch(`/api/billing/payment-methods?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setPaymentMethods(prev => {
        const filtered = prev.filter(p => p.id !== id);
        // promote first to default if needed
        if (filtered.length > 0 && !filtered.some(p => p.isDefault)) {
          filtered[0] = { ...filtered[0], isDefault: true };
        }
        return filtered;
      });
      toast.success("Card removed.");
    } else {
      toast.error("Failed to remove card.");
    }
  }

  async function setDefaultCard(id: string) {
    const res = await fetch("/api/billing/payment-methods", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setPaymentMethods(prev => prev.map(p => ({ ...p, isDefault: p.id === id })));
      toast.success("Default card updated.");
    } else {
      toast.error("Failed to update default.");
    }
  }

  const currentPlan = subscription?.plan?.toLowerCase() ?? "pro";

  /* ── Skeleton ── */
  if (loading) return (
    <div style={{ padding: "32px 28px" }}>
      {[1,2,3].map(i => (
        <div key={i} style={{ height: 80, borderRadius: 16, background: "var(--skeleton-bg, #f1f5f9)", marginBottom: 16, animation: "pulse 1.5s infinite" }} />
      ))}
    </div>
  );

  return (
    <div style={{ padding: "28px 28px 60px", maxWidth: 1000, margin: "0 auto" }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        input:focus, select:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,.12); }
        .plan-card { border-radius: 20px; border: 1.5px solid var(--border, #e2e8f0); padding: 28px 24px; transition: all .2s ease; cursor: pointer; background: var(--card-bg, white); }
        .plan-card:hover { transform: translateY(-4px); box-shadow: 0 16px 48px rgba(0,0,0,.1); }
        .plan-card.current { background: var(--card-bg, white); }
      `}</style>

      {/* ── Upgrade success banner ── */}
      {showUpgradeBanner && (
        <div style={{ marginBottom: 20, padding: "16px 20px", borderRadius: 16, background: "linear-gradient(135deg,rgba(16,185,129,.12),rgba(5,150,105,.08))", border: "1.5px solid rgba(16,185,129,.35)", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(16,185,129,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🎉</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#065f46" }}>Plan activated successfully!</div>
            <div style={{ fontSize: 12, color: "#047857", marginTop: 2 }}>Your subscription is now active. Add a payment method below to ensure uninterrupted service.</div>
          </div>
          <button onClick={() => setShowUpgradeBanner(false)} style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid rgba(16,185,129,.3)", background: "transparent", cursor: "pointer", fontSize: 14, color: "#065f46", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
      )}

      {/* ── Page header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--text, #1e293b)" }}>Billing & Payments</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted, #64748b)" }}>
            Manage your subscription, payment methods, and invoices
          </p>
        </div>
        {subscription && !subscription.introOfferClaimed && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", borderRadius: 14, background: "linear-gradient(135deg,#fef3c7,#fde68a)", border: "1px solid #fbbf24" }}>
            <span style={{ fontSize: 18 }}>🎁</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#78350f" }}>75% OFF INTRO OFFER</div>
              <div style={{ fontSize: 10, color: "#92400e" }}>First 3 months — claim now!</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Stats row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Current Plan", value: (subscription?.plan || "—").charAt(0) + (subscription?.plan || "").slice(1).toLowerCase(), icon: "🚀", color: "#6366f1" },
          { label: "Status", value: subscription?.status || "—", icon: "✅", color: "#16a34a", isStatus: true },
          { label: "Next Renewal", value: subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}) : "—", icon: "📅", color: "#f59e0b" },
          { label: "Monthly Amount", value: subscription ? `$${subscription.amount}/mo` : "—", icon: "💰", color: "#0ea5e9" },
        ].map(s => (
          <div key={s.label} style={{ padding: "18px 20px", borderRadius: 16, background: "var(--card-bg, white)", border: "1px solid var(--border, #e2e8f0)", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 4px rgba(0,0,0,.05)" }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `${s.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted, #94a3b8)", letterSpacing: ".04em" }}>{s.label.toUpperCase()}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text, #1e293b)", marginTop: 2 }}>
                {s.isStatus ? <StatusBadge status={s.value.toLowerCase()} /> : s.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Subscription summary — full width ── */}
      <div style={{ borderRadius: 20, border: "1px solid var(--border, #e2e8f0)", background: "var(--card-bg, white)", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.05)", marginBottom: 24 }}>
        <div style={{ height: 4, background: "linear-gradient(90deg,#4f46e5,#7c3aed,#38bdf8)" }} />
        <div style={{ padding: "24px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
            {/* Plan badge */}
            <div style={{ padding: "20px 28px", borderRadius: 16, background: "linear-gradient(135deg,rgba(99,102,241,.08),rgba(124,58,237,.06))", border: "1px solid rgba(99,102,241,.15)", textAlign: "center", minWidth: 160 }}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>🚀</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#6366f1" }}>
                {(subscription?.plan || "STARTER").charAt(0) + (subscription?.plan || "STARTER").slice(1).toLowerCase()}
              </div>
              <div style={{ fontSize: 13, color: "var(--muted, #64748b)", marginTop: 4 }}>
                ${subscription?.amount ?? 49}<span style={{ fontSize: 11 }}>/month</span>
              </div>
            </div>
            {/* Details grid */}
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 16 }}>
              {[
                { label: "Status",        value: <StatusBadge status={subscription?.status?.toLowerCase() || "active"} />, raw: false },
                { label: "Billing Cycle", value: "Monthly", raw: true },
                { label: "Renewal Date",  value: subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}) : "—", raw: true },
                { label: "Currency",      value: "USD", raw: true },
              ].map(r => (
                <div key={r.label}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted, #94a3b8)", letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 6 }}>{r.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text, #1e293b)" }}>{r.value}</div>
                </div>
              ))}
            </div>
            {/* Action buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 180 }}>
              <button
                onClick={() => handleCheckout(currentPlan === "pro" ? "enterprise" : "pro")}
                disabled={!!checkingOut}
                style={{ padding: "11px 20px", borderRadius: 12, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: checkingOut ? .7 : 1 }}>
                {checkingOut ? "Redirecting..." : currentPlan === "enterprise" ? "Manage Subscription" : `Upgrade to ${currentPlan === "pro" ? "Enterprise" : "Pro"} →`}
              </button>
              <button style={{ padding: "10px 20px", borderRadius: 12, background: "transparent", border: "1px solid var(--border, #e2e8f0)", color: "var(--muted, #94a3b8)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                Cancel Subscription
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Invoice History ── */}
      <div style={{ borderRadius: 20, border: "1px solid var(--border, #e2e8f0)", background: "var(--card-bg, white)", overflow: "hidden", marginBottom: 28, boxShadow: "0 1px 4px rgba(0,0,0,.05)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border, #f1f5f9)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--text, #1e293b)" }}>Invoice History</h2>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--muted, #64748b)" }}>All past and upcoming invoices</p>
          </div>
          <button style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid var(--border, #e2e8f0)", background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--muted, #64748b)", cursor: "pointer" }}>
            Export CSV
          </button>
        </div>

        {invoices.length === 0 ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--muted, #94a3b8)" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🧾</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>No invoices yet</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Your billing history will appear here once you have an active subscription.</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--th-bg, #f8fafc)" }}>
                  {["Invoice #", "Date", "Plan", "Amount", "Status", "Action"].map(h => (
                    <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontSize: 10, fontWeight: 800, color: "var(--muted, #94a3b8)", letterSpacing: ".06em", borderBottom: "1px solid var(--border, #f1f5f9)" }}>{h.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => (
                  <tr key={inv.id} style={{ borderBottom: i < invoices.length - 1 ? "1px solid var(--border, #f8fafc)" : "none" }}>
                    <td style={{ padding: "14px 20px", fontSize: 13, fontWeight: 700, color: "var(--text, #1e293b)", fontFamily: "monospace" }}>{inv.number}</td>
                    <td style={{ padding: "14px 20px", fontSize: 13, color: "var(--muted, #64748b)" }}>{inv.date}</td>
                    <td style={{ padding: "14px 20px", fontSize: 13, color: "var(--text, #1e293b)" }}>{inv.plan}</td>
                    <td style={{ padding: "14px 20px", fontSize: 13, fontWeight: 700, color: "var(--text, #1e293b)" }}>${inv.amount}.00</td>
                    <td style={{ padding: "14px 20px" }}><StatusBadge status={inv.status} /></td>
                    <td style={{ padding: "14px 20px" }}>
                      <button onClick={() => toast("PDF download coming soon.")}
                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, border: "1px solid var(--border, #e2e8f0)", background: "transparent", fontSize: 11, fontWeight: 700, color: "var(--text, #475569)", cursor: "pointer" }}>
                        ⬇ PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Plan Upgrade Section ── */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--text, #1e293b)" }}>Available Plans</h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted, #64748b)" }}>Upgrade or change your plan anytime</p>
          </div>
          {/* Billing toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px", borderRadius: 12, background: "var(--toggle-bg, #f1f5f9)", border: "1px solid var(--border, #e2e8f0)" }}>
            {(["monthly","annual"] as const).map(t => (
              <button key={t} onClick={() => setBillingToggle(t)}
                style={{ padding: "7px 16px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, transition: "all .15s",
                  background: billing === t ? "var(--card-bg, white)" : "transparent",
                  color: billing === t ? "var(--text, #1e293b)" : "var(--muted, #94a3b8)",
                  boxShadow: billing === t ? "0 1px 4px rgba(0,0,0,.1)" : "none",
                }}>
                {t === "monthly" ? "Monthly" : "Annual"}{t === "annual" ? " (Save 20%)" : ""}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 18 }}>
          {PLANS.map(plan => {
            const isCurrent = currentPlan === plan.code;
            const price = billing === "annual" ? Math.round(plan.price * 0.8) : plan.price;
            return (
              <div key={plan.code} className={`plan-card ${isCurrent ? "current" : ""}`}
                style={{ border: isCurrent ? `2px solid ${plan.color}` : plan.popular ? `2px solid ${plan.color}40` : undefined,
                  boxShadow: plan.popular ? `0 0 0 1px ${plan.color}20, 0 8px 32px rgba(0,0,0,.08)` : undefined }}>

                {plan.popular && (
                  <div style={{ marginBottom: 12 }}>
                    <span style={{ padding: "3px 10px", borderRadius: 20, background: plan.color + "20", color: plan.color, fontSize: 10, fontWeight: 800, letterSpacing: ".05em" }}>⭐ MOST POPULAR</span>
                  </div>
                )}
                {isCurrent && (
                  <div style={{ marginBottom: 12 }}>
                    <span style={{ padding: "3px 10px", borderRadius: 20, background: plan.color + "15", color: plan.color, fontSize: 10, fontWeight: 800 }}>✓ CURRENT PLAN</span>
                  </div>
                )}

                <h3 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800, color: "var(--text, #1e293b)" }}>{plan.name}</h3>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 20 }}>
                  <span style={{ fontSize: 32, fontWeight: 900, color: plan.color }}>${price}</span>
                  <span style={{ fontSize: 12, color: "var(--muted, #94a3b8)", fontWeight: 500 }}>/ mo{billing === "annual" ? " · billed annually" : ""}</span>
                </div>

                {/* Features */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text, #374151)" }}>
                      <span style={{ color: "#16a34a", fontSize: 14, flexShrink: 0 }}>✓</span> {f}
                    </div>
                  ))}
                  {plan.notIncluded.map(f => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--muted, #9ca3af)" }}>
                      <span style={{ fontSize: 14, flexShrink: 0, opacity: .4 }}>✕</span> {f}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => !isCurrent && handleCheckout(plan.code)}
                  disabled={isCurrent || !!checkingOut}
                  style={{
                    width: "100%", padding: "12px", borderRadius: 12, border: "none", fontSize: 13, fontWeight: 700, cursor: isCurrent ? "default" : "pointer",
                    background: isCurrent ? "var(--secondary-bg, #f1f5f9)" : `linear-gradient(135deg,${plan.color},${plan.color}bb)`,
                    color: isCurrent ? "var(--muted, #94a3b8)" : "white",
                    opacity: checkingOut && checkingOut !== plan.code ? .6 : 1,
                  }}>
                  {checkingOut === plan.code ? "Redirecting..." : isCurrent ? "Current Plan" : `Upgrade to ${plan.name} →`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Card Modal */}
      {showAddCard && (
        <AddCardModal
          onClose={() => setShowAddCard(false)}
          onSuccess={card => setPaymentMethods(prev => [...prev, card])}
        />
      )}
    </div>
  );
}

export default function BillingPageWrapper() {
  return (
    <Suspense fallback={<div style={{ padding: 32 }}>Loading...</div>}>
      <BillingPage />
    </Suspense>
  );
}
