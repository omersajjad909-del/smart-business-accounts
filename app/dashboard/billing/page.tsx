"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { getCurrentUser } from "@/lib/auth";

type Invoice = {
  id: string;
  number: string;
  date: string;
  amount: number;
  currency: string;
  status: "paid" | "open" | "void";
  plan: string;
  billingCycle?: string;
};

type Subscription = {
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  amount: number;
  currency: string;
  billingCycle: string;
  introOfferClaimed: boolean;
};

type PaymentMethodsResponse = {
  provider?: string;
  managedExternally?: boolean;
  note?: string;
};

const PLANS = [
  {
    code: "starter",
    name: "Starter",
    price: 49,
    color: "#38bdf8",
    features: ["Core accounting", "Invoices and billing", "Email support"],
  },
  {
    code: "pro",
    name: "Professional",
    price: 99,
    color: "#818cf8",
    popular: true,
    features: ["Inventory", "CRM", "Multi-branch", "Advanced reports"],
  },
  {
    code: "enterprise",
    name: "Enterprise",
    price: 249,
    color: "#c4b5fd",
    features: ["Unlimited users", "Payroll", "API access", "Priority support"],
  },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    paid: { bg: "#dcfce7", color: "#16a34a", label: "Paid" },
    open: { bg: "#fef3c7", color: "#d97706", label: "Open" },
    void: { bg: "#f1f5f9", color: "#64748b", label: "Void" },
    active: { bg: "#dbeafe", color: "#2563eb", label: "Active" },
    trialing: { bg: "#dcfce7", color: "#16a34a", label: "Trial" },
    past_due: { bg: "#fee2e2", color: "#dc2626", label: "Past Due" },
    canceled: { bg: "#f1f5f9", color: "#64748b", label: "Canceled" },
  };
  const config = map[status.toLowerCase()] || {
    bg: "#f1f5f9",
    color: "#64748b",
    label: status,
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        background: config.bg,
        color: config.color,
        fontSize: 11,
        fontWeight: 800,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: config.color,
        }}
      />
      {config.label}
    </span>
  );
}

function BillingPage() {
  const params = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [provider, setProvider] = useState("LEMON_SQUEEZY");
  const [providerManaged, setProviderManaged] = useState(true);
  const [paymentMethodsNote, setPaymentMethodsNote] = useState(
    "Payment methods are securely handled during checkout.",
  );
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(params.get("upgrade") === "success");

  useEffect(() => {
    let active = true;

    async function loadBilling() {
      setLoading(true);
      try {
        const user = getCurrentUser();
        const headers: Record<string, string> = {};
        if (user?.role) headers["x-user-role"] = user.role;
        if (user?.id) headers["x-user-id"] = user.id;
        if (user?.companyId) headers["x-company-id"] = user.companyId;

        const [companyRes, invoicesRes, paymentMethodsRes] = await Promise.all([
          fetch("/api/me/company", { headers, credentials: "include", cache: "no-store" }),
          fetch("/api/billing/invoices", { headers, credentials: "include", cache: "no-store" }),
          fetch("/api/billing/payment-methods", {
            headers,
            credentials: "include",
            cache: "no-store",
          }),
        ]);

        const companyData = await companyRes.json().catch(() => ({}));
        const invoicesData = await invoicesRes.json().catch(() => ({}));
        const paymentData = (await paymentMethodsRes.json().catch(() => ({}))) as PaymentMethodsResponse;

        if (!active) return;

        const currentInvoice = Array.isArray(invoicesData?.invoices) ? invoicesData.invoices[0] : null;
        const normalizedCycle = String(currentInvoice?.billingCycle || "MONTHLY").toLowerCase();
        setBilling(normalizedCycle === "yearly" ? "annual" : "monthly");

        setSubscription({
          plan: companyData?.plan || currentInvoice?.plan || "STARTER",
          status: companyData?.subscriptionStatus || "ACTIVE",
          currentPeriodEnd: companyData?.currentPeriodEnd || null,
          amount: Number(currentInvoice?.amount || 49),
          currency: String(currentInvoice?.currency || companyData?.baseCurrency || "USD"),
          billingCycle: String(currentInvoice?.billingCycle || "MONTHLY"),
          introOfferClaimed: Boolean(companyData?.introOfferClaimed),
        });

        setInvoices(Array.isArray(invoicesData?.invoices) ? invoicesData.invoices : []);
        setProvider(String(paymentData?.provider || "LEMON_SQUEEZY"));
        setProviderManaged(Boolean(paymentData?.managedExternally ?? true));
        setPaymentMethodsNote(
          String(
            paymentData?.note || "Payment methods are securely handled during checkout.",
          ),
        );
      } catch (error) {
        console.error("[billing/page] Failed to load billing data", error);
        toast.error("Failed to load billing details.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadBilling();
    return () => {
      active = false;
    };
  }, [params]);

  const currentPlan = useMemo(
    () => (subscription?.plan || "STARTER").toLowerCase(),
    [subscription?.plan],
  );

  async function handleCheckout(planCode: string) {
    setCheckingOut(planCode);
    try {
      const prices: Record<string, string> = {
        starter: process.env.NEXT_PUBLIC_PRICE_STARTER || "price_starter",
        pro: process.env.NEXT_PUBLIC_PRICE_PRO || "price_pro",
        enterprise: process.env.NEXT_PUBLIC_PRICE_ENTERPRISE || "price_enterprise",
      };
      const user = getCurrentUser();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (user?.role) headers["x-user-role"] = user.role;
      if (user?.id) headers["x-user-id"] = user.id;
      if (user?.companyId) headers["x-company-id"] = user.companyId;

      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          planCode,
          billingCycle: billing === "annual" ? "yearly" : "monthly",
          priceId: prices[planCode],
          successUrl: `${window.location.origin}/dashboard?upgrade=success`,
          cancelUrl: `${window.location.origin}/dashboard/billing?cancel=1`,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok && data?.url) {
        window.location.assign(data.url);
        return;
      }

      toast.error(data?.error || "Failed to open checkout.");
    } catch (error) {
      console.error("[billing/page] Checkout error", error);
      toast.error("Failed to open checkout.");
    } finally {
      setCheckingOut(null);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: "32px 28px" }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: 88,
              borderRadius: 16,
              background: "var(--skeleton-bg, #f1f5f9)",
              marginBottom: 16,
              animation: "pulse 1.5s infinite",
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 28px 60px", maxWidth: 1080, margin: "0 auto" }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        .billing-card {
          border-radius: 20px;
          border: 1px solid var(--border, #e2e8f0);
          background: var(--card-bg, white);
          box-shadow: 0 1px 4px rgba(0,0,0,.05);
        }
        .plan-card {
          border-radius: 20px;
          border: 1px solid var(--border, #e2e8f0);
          background: var(--card-bg, white);
          padding: 24px;
          transition: transform .2s ease, box-shadow .2s ease;
        }
        .plan-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 16px 36px rgba(15,23,42,.08);
        }
      `}</style>

      {showUpgradeBanner && (
        <div
          style={{
            marginBottom: 20,
            padding: "16px 20px",
            borderRadius: 16,
            background: "linear-gradient(135deg,rgba(16,185,129,.12),rgba(5,150,105,.08))",
            border: "1.5px solid rgba(16,185,129,.35)",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "rgba(16,185,129,.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              flexShrink: 0,
            }}
          >
            OK
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#065f46" }}>
              Subscription updated successfully
            </div>
            <div style={{ fontSize: 12, color: "#047857", marginTop: 2 }}>
              Your billing is now managed through {provider === "LEMON_SQUEEZY" ? "LemonSqueezy" : "your checkout provider"}.
            </div>
          </div>
          <button
            onClick={() => setShowUpgradeBanner(false)}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              border: "1px solid rgba(16,185,129,.3)",
              background: "transparent",
              cursor: "pointer",
              fontSize: 12,
              color: "#065f46",
            }}
          >
            x
          </button>
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "var(--text, #1e293b)" }}>
            Billing & Subscription
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--muted, #64748b)" }}>
            Manage your plan, renewals, invoices, and checkout provider.
          </p>
        </div>
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 14,
            background: "rgba(99,102,241,.08)",
            border: "1px solid rgba(99,102,241,.18)",
            fontSize: 12,
            fontWeight: 800,
            color: "#4f46e5",
          }}
        >
          Provider: {provider === "LEMON_SQUEEZY" ? "LemonSqueezy" : provider}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        {[
          {
            label: "Current Plan",
            value: subscription?.plan || "STARTER",
          },
          {
            label: "Status",
            value: subscription?.status || "ACTIVE",
            badge: true,
          },
          {
            label: "Next Renewal",
            value: subscription?.currentPeriodEnd
              ? new Date(subscription.currentPeriodEnd).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "Not set",
          },
          {
            label: "Billing Cycle",
            value: subscription?.billingCycle === "YEARLY" ? "Yearly" : "Monthly",
          },
        ].map((item) => (
          <div key={item.label} className="billing-card" style={{ padding: "18px 20px" }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--muted, #94a3b8)",
                letterSpacing: ".06em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              {item.label}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text, #1e293b)" }}>
              {item.badge ? <StatusBadge status={String(item.value)} /> : item.value}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.4fr) minmax(280px,.9fr)",
          gap: 18,
          marginBottom: 24,
        }}
      >
        <div className="billing-card" style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--muted, #94a3b8)",
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Billing Provider
              </div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--text, #1e293b)" }}>
                {provider === "LEMON_SQUEEZY" ? "LemonSqueezy Checkout" : "Managed Billing"}
              </h2>
              <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--muted, #64748b)", lineHeight: 1.6 }}>
                {paymentMethodsNote}
              </p>
            </div>
            <div
              style={{
                minWidth: 180,
                padding: "16px 18px",
                borderRadius: 16,
                background: "linear-gradient(135deg,rgba(99,102,241,.08),rgba(124,58,237,.08))",
                border: "1px solid rgba(99,102,241,.16)",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: "#4f46e5", marginBottom: 6 }}>
                Active amount
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#312e81" }}>
                {subscription?.currency || "USD"} {subscription?.amount || 0}
              </div>
              <div style={{ fontSize: 12, color: "#6366f1", marginTop: 4 }}>
                per {subscription?.billingCycle === "YEARLY" ? "year" : "month"}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 20,
              padding: "16px 18px",
              borderRadius: 16,
              background: "rgba(15,23,42,.03)",
              border: "1px solid rgba(148,163,184,.18)",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text, #1e293b)", marginBottom: 8 }}>
              What this means
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, color: "var(--muted, #64748b)", fontSize: 13, lineHeight: 1.8 }}>
              <li>Cards and wallets are collected securely by the checkout provider.</li>
              <li>Upgrades and renewals use the same hosted billing flow.</li>
              <li>Invoice history stays visible here for your team.</li>
            </ul>
          </div>
        </div>

        <div className="billing-card" style={{ padding: 24 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "var(--muted, #94a3b8)",
              letterSpacing: ".06em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Payment Methods
          </div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--text, #1e293b)" }}>
            Provider-managed billing
          </h3>
          <p style={{ margin: "10px 0 18px", fontSize: 13, color: "var(--muted, #64748b)", lineHeight: 1.7 }}>
            {providerManaged
              ? "You do not need to save cards inside Finova. Your checkout provider stores and reuses them securely."
              : "Payment methods will appear here once your billing provider is configured."}
          </p>
          <div
            style={{
              padding: "14px 16px",
              borderRadius: 14,
              background: "rgba(14,165,233,.08)",
              border: "1px solid rgba(14,165,233,.16)",
              fontSize: 12,
              color: "#0f766e",
              lineHeight: 1.7,
            }}
          >
            New cards, Apple Pay, Google Pay, and other supported methods are attached during hosted checkout.
          </div>
        </div>
      </div>

      <div className="billing-card" style={{ overflow: "hidden", marginBottom: 24 }}>
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border, #f1f5f9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--text, #1e293b)" }}>
              Invoice History
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted, #64748b)" }}>
              Your current and previous subscription billing records.
            </p>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted, #64748b)" }}>
            {provider === "LEMON_SQUEEZY" ? "Synced from Lemon-backed subscription state" : "Synced from active subscription"}
          </div>
        </div>

        {invoices.length === 0 ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--muted, #94a3b8)" }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>No invoices yet</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>
              Your billing history will appear here once a paid subscription is active.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--th-bg, #f8fafc)" }}>
                  {["Invoice #", "Date", "Plan", "Cycle", "Amount", "Status"].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        padding: "12px 20px",
                        textAlign: "left",
                        fontSize: 10,
                        fontWeight: 800,
                        color: "var(--muted, #94a3b8)",
                        letterSpacing: ".06em",
                        textTransform: "uppercase",
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice, index) => (
                  <tr
                    key={invoice.id}
                    style={{
                      borderTop: index === 0 ? "1px solid var(--border, #f1f5f9)" : "1px solid var(--border, #f8fafc)",
                    }}
                  >
                    <td style={{ padding: "14px 20px", fontFamily: "monospace", fontSize: 13, fontWeight: 700 }}>
                      {invoice.number}
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: 13, color: "var(--muted, #64748b)" }}>{invoice.date}</td>
                    <td style={{ padding: "14px 20px", fontSize: 13, color: "var(--text, #1e293b)" }}>{invoice.plan}</td>
                    <td style={{ padding: "14px 20px", fontSize: 13, color: "var(--muted, #64748b)" }}>
                      {invoice.billingCycle === "YEARLY" ? "Yearly" : "Monthly"}
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: 13, fontWeight: 700, color: "var(--text, #1e293b)" }}>
                      {invoice.currency} {invoice.amount}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <StatusBadge status={invoice.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginBottom: 8 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--text, #1e293b)" }}>
              Available Plans
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted, #64748b)" }}>
              Open hosted checkout to upgrade, downgrade, or renew billing.
            </p>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: 6,
              borderRadius: 12,
              border: "1px solid var(--border, #e2e8f0)",
              background: "var(--toggle-bg, #f8fafc)",
            }}
          >
            {(["monthly", "annual"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setBilling(mode)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 9,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  background: billing === mode ? "var(--card-bg, white)" : "transparent",
                  color: billing === mode ? "var(--text, #1e293b)" : "var(--muted, #94a3b8)",
                  boxShadow: billing === mode ? "0 1px 4px rgba(0,0,0,.1)" : "none",
                }}
              >
                {mode === "annual" ? "Yearly" : "Monthly"}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 18 }}>
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.code;
            const displayedPrice = billing === "annual" ? Math.round(plan.price * 12 * 0.8) : plan.price;

            return (
              <div
                key={plan.code}
                className="plan-card"
                style={{
                  border: isCurrent ? `2px solid ${plan.color}` : "1px solid var(--border, #e2e8f0)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--text, #1e293b)" }}>
                      {plan.name}
                    </h3>
                    <div style={{ marginTop: 8, fontSize: 30, fontWeight: 900, color: plan.color }}>
                      {subscription?.currency || "USD"} {displayedPrice}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted, #64748b)" }}>
                      per {billing === "annual" ? "year" : "month"}
                    </div>
                  </div>
                  {plan.popular && (
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: `${plan.color}20`,
                        color: plan.color,
                        fontSize: 10,
                        fontWeight: 800,
                      }}
                    >
                      Popular
                    </span>
                  )}
                </div>

                <div style={{ marginTop: 18, display: "grid", gap: 8 }}>
                  {plan.features.map((feature) => (
                    <div key={feature} style={{ fontSize: 13, color: "var(--text, #334155)" }}>
                      • {feature}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => !isCurrent && handleCheckout(plan.code)}
                  disabled={Boolean(checkingOut) || isCurrent}
                  style={{
                    width: "100%",
                    marginTop: 20,
                    padding: "12px 16px",
                    borderRadius: 12,
                    border: "none",
                    cursor: isCurrent ? "default" : "pointer",
                    background: isCurrent
                      ? "var(--secondary-bg, #f1f5f9)"
                      : `linear-gradient(135deg,${plan.color},${plan.color}cc)`,
                    color: isCurrent ? "var(--muted, #94a3b8)" : "white",
                    fontSize: 13,
                    fontWeight: 800,
                    opacity: checkingOut && checkingOut !== plan.code ? 0.65 : 1,
                  }}
                >
                  {checkingOut === plan.code
                    ? "Redirecting..."
                    : isCurrent
                      ? "Current plan"
                      : `Open ${provider === "LEMON_SQUEEZY" ? "LemonSqueezy" : "checkout"} →`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function BillingPageWrapper() {
  return (
    <Suspense fallback={<div style={{ padding: 32 }}>Loading billing...</div>}>
      <BillingPage />
    </Suspense>
  );
}
