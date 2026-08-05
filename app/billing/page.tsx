"use client";
import { useEffect, useMemo, useState } from "react";
import { fmtDate } from "@/lib/dateUtils";
import { getCurrentUser } from "@/lib/auth";

type Plan = { code: string; name: string };
type CompanyBilling = {
  plan: string;
  subscriptionStatus: string;
  billingCycle?: string;
  currentPeriodEnd?: string | null;
  currency?: string;
  amount?: number;
  extraSeats?: number;
};

const DEFAULT_PLAN_PRICING: Record<string, { monthly: number; yearly: number }> = {
  starter: { monthly: 49, yearly: 39 },
  pro: { monthly: 99, yearly: 79 },
  enterprise: { monthly: 249, yearly: 199 },
};

const DISPLAY_PLAN: Record<string, string> = {
  STARTER: "Starter",
  PRO: "Professional",
  PROFESSIONAL: "Professional",
  ENTERPRISE: "Enterprise",
  CUSTOM: "Custom",
};

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planPricing, setPlanPricing] = useState<Record<string, { monthly: number; yearly: number }>>(DEFAULT_PLAN_PRICING);
  const [seatPricing, setSeatPricing] = useState({ monthly: 7, yearly: 6 });
  const [billingData, setBillingData] = useState<CompanyBilling | null>(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [introOfferClaimed, setIntroOfferClaimed] = useState(false);
  const [showAnnual, setShowAnnual] = useState(false);
  const [extraSeats, setExtraSeats] = useState(0);

  const currentPlanCode = useMemo(() => {
    if (!billingData?.plan) return "STARTER";
    const normalized = String(billingData.plan || "").toUpperCase();
    if (normalized === "PRO") return "PROFESSIONAL";
    return normalized;
  }, [billingData]);

  const currentPlanName = DISPLAY_PLAN[currentPlanCode] || currentPlanCode;
  const currentStatus = billingData?.subscriptionStatus || "inactive";
  const isActive = ["active", "trialing"].includes(currentStatus.toLowerCase());
  const currentBillingCycle = billingData?.billingCycle?.toLowerCase() === "yearly" ? "yearly" : "monthly";
  const currentAmount = billingData?.amount ?? planPricing[currentPlanCode === "ENTERPRISE" ? "enterprise" : currentPlanCode === "PROFESSIONAL" ? "professional" : "starter"]?.monthly ?? 0;
  const nextRenewal = billingData?.currentPeriodEnd ? fmtDate(billingData.currentPeriodEnd) : "—";
  const monthlyAmountLabel = currentBillingCycle === "yearly" ? `$${currentAmount}/mo` : `$${currentAmount}/mo`;

  useEffect(() => {
    (async () => {
      try {
        const u = getCurrentUser();
        const headers: Record<string, string> = {};
        if (u?.role) headers["x-user-role"] = u.role;
        if (u?.id) headers["x-user-id"] = u.id;
        if (u?.companyId) headers["x-company-id"] = u.companyId;

        const [planRes, pricingRes, companyRes] = await Promise.all([
          fetch("/api/public/plan-config", { cache: "no-store" }),
          fetch("/api/public/pricing", { cache: "no-store" }),
          fetch("/api/me/company", { cache: "no-store", headers }),
        ]);

        if (planRes.ok) {
          const data = await planRes.json();
          setPlans(Array.isArray(data?.plans) ? data.plans : []);
        }

        if (pricingRes.ok) {
          const data = await pricingRes.json();
          setPlanPricing({
            starter: {
              monthly: Number(data?.pricing?.starter?.monthly ?? 49),
              yearly: Math.round(Number(data?.pricing?.starter?.yearly ?? 468) / 12),
            },
            professional: {
              monthly: Number(data?.pricing?.pro?.monthly ?? 99),
              yearly: Math.round(Number(data?.pricing?.pro?.yearly ?? 948) / 12),
            },
            enterprise: {
              monthly: Number(data?.pricing?.enterprise?.monthly ?? 249),
              yearly: Math.round(Number(data?.pricing?.enterprise?.yearly ?? 2388) / 12),
            },
          });
          setSeatPricing({
            monthly: Number(data?.seatPricing?.monthly ?? 7),
            yearly: Math.round(Number(data?.seatPricing?.yearly ?? 72) / 12),
          });
        }

        if (companyRes.ok) {
          const company = await companyRes.json();
          setBillingData({
            plan: company.plan || "STARTER",
            subscriptionStatus: company.subscriptionStatus || "inactive",
            billingCycle: company.billingCycle || "monthly",
            currentPeriodEnd: company.currentPeriodEnd || null,
            currency: company.baseCurrency || "USD",
            amount: company.amount ? Number(company.amount) : undefined,
            extraSeats: Number(company.extraSeats || 0),
          });
          setIntroOfferClaimed(!!company.introOfferClaimed);
          setExtraSeats(Math.max(0, Number(company.extraSeats || 0)));
        }
      } catch (error) {
        console.error("Billing page load error", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function checkout(planCode: string, billingCycle: "monthly" | "yearly" = "monthly") {
    setMsg("");
    const prices: Record<string, string> = {
      starter: process.env.NEXT_PUBLIC_PRICE_STARTER || "price_starter",
      pro: process.env.NEXT_PUBLIC_PRICE_PRO || "price_pro",
      enterprise: process.env.NEXT_PUBLIC_PRICE_ENTERPRISE || "price_enterprise",
    };
    const normalizedPlanCode = planCode.toLowerCase() === "professional" ? "pro" : planCode.toLowerCase();
    const priceId = prices[normalizedPlanCode] || prices.pro;
    const u = getCurrentUser();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (u?.role) headers["x-user-role"] = u.role;
    if (u?.id) headers["x-user-id"] = u.id;
    if (u?.companyId) headers["x-company-id"] = u.companyId;

    const successUrl = window.location.origin + "/dashboard?upgrade=success";
    const cancelUrl = window.location.origin + "/billing?cancel=1";
    const key = normalizedPlanCode === "enterprise" ? "enterprise" : normalizedPlanCode === "pro" ? "pro" : "starter";
    const basePerMonth = planPricing[key]?.monthly ?? 49;
    const checkoutAmount = billingCycle === "yearly" ? (basePerMonth + extraSeats * seatPricing.yearly) * 12 : basePerMonth + extraSeats * seatPricing.monthly;

    const r = await fetch("/api/billing/checkout", {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({
        planCode: normalizedPlanCode === "pro" ? "professional" : normalizedPlanCode,
        billingCycle: billingCycle === "yearly" ? "YEARLY" : "MONTHLY",
        successUrl,
        cancelUrl,
        customPrice: checkoutAmount,
      }),
    });

    const j = await r.json().catch(() => ({}));
    if (r.ok && j?.url) {
      window.location.assign(j.url);
    } else {
      setMsg(j?.error || "Checkout failed or billing provider not configured");
    }
  }

  const currentPlanKey = currentPlanCode === "ENTERPRISE" ? "enterprise" : currentPlanCode === "PROFESSIONAL" ? "professional" : "starter";
  const selectedPlanPricing = planPricing[currentPlanKey] || planPricing.starter;
  const renewLabel = isActive ? `Renew ${currentPlanName}` : `Reactivate ${currentPlanName}`;

  const summaryCards = [
    { label: "Current Plan", value: currentPlanName, icon: "💎" },
    { label: "Status", value: currentStatus, icon: "●", isStatus: true },
    { label: "Next Renewal", value: nextRenewal, icon: "📅" },
    { label: "Monthly Amount", value: monthlyAmountLabel, icon: "💰" },
  ];

  const displayPlans = plans.length > 0 ? plans : [
    { code: "starter", name: "Starter" },
    { code: "professional", name: "Professional" },
    { code: "enterprise", name: "Enterprise" },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Billing</h1>
          <p className="text-slate-600 max-w-2xl">Manage your current plan, renew when needed, and choose the best subscription option for your business.</p>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-3xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-4 mb-10">
            {summaryCards.map((card) => (
              <div key={card.label} className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <div className="text-2xl mb-3">{card.icon}</div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">{card.label}</div>
                {card.isStatus ? (
                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${currentStatus.toLowerCase() === "active" ? "bg-emerald-100 text-emerald-700" : currentStatus.toLowerCase() === "trialing" ? "bg-indigo-100 text-indigo-700" : "bg-amber-100 text-amber-700"}`}>{card.value}</span>
                ) : (
                  <div className="text-xl font-bold text-slate-900">{card.value}</div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr] mb-10">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold">Current plan</h2>
                <p className="text-sm text-slate-500 mt-2">Renew your active subscription or change plans when you're ready.</p>
              </div>
              <button
                onClick={() => checkout(currentPlanKey, currentBillingCycle as "monthly" | "yearly")}
                className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                {renewLabel}
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Plan</div>
                <div className="text-lg font-bold">{currentPlanName}</div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Billing cycle</div>
                <div className="text-lg font-bold capitalize">{currentBillingCycle}</div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Renewal date</div>
                <div className="text-lg font-bold">{nextRenewal}</div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Seats</div>
                <div className="text-lg font-bold">{extraSeats} extra</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Pricing toggle</h2>
                <p className="text-sm text-slate-500">Switch billing display between monthly and annual pricing.</p>
              </div>
              <div className="rounded-full bg-slate-100 p-1 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowAnnual(false)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${!showAnnual ? "bg-slate-900 text-white" : "text-slate-700"}`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setShowAnnual(true)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${showAnnual ? "bg-slate-900 text-white" : "text-slate-700"}`}
                >
                  Annual
                </button>
              </div>
            </div>

            <div className="grid gap-4">
              {displayPlans.map((plan) => {
                const key = plan.code.toLowerCase() === "professional" ? "professional" : plan.code.toLowerCase() === "enterprise" ? "enterprise" : "starter";
                const price = showAnnual ? planPricing[key].yearly : planPricing[key].monthly;
                const priceLabel = showAnnual ? `$${price}/mo billed annually` : `$${price}/mo`;
                const isCurrent = plan.code.toLowerCase() === currentPlanCode.toLowerCase() || (currentPlanCode === "PROFESSIONAL" && plan.code.toLowerCase() === "professional");

                return (
                  <div key={plan.code} className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold">{plan.name}</h3>
                        <div className="text-sm text-slate-500">{priceLabel}</div>
                      </div>
                      {isCurrent ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Current</span>
                      ) : null}
                    </div>
                    <button
                      onClick={() => checkout(plan.code.toLowerCase() === "professional" ? "professional" : plan.code.toLowerCase(), showAnnual ? "yearly" : "monthly")}
                      className="mt-4 inline-flex w-full justify-center rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                      disabled={isCurrent}
                    >
                      {isCurrent ? "Current plan" : `Choose ${plan.name}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {msg ? <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700">{msg}</div> : null}
      </div>
    </div>
  );
}
