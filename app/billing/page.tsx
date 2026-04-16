"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type Plan = { code: string; name: string };

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [msg, setMsg] = useState("");
  const [introOfferClaimed, setIntroOfferClaimed] = useState(false);
  const [extraSeats, setExtraSeats] = useState(0);
  const [seatPricing, setSeatPricing] = useState({ monthly: 7, yearly: 6 });
  const [planPricing, setPlanPricing] = useState<Record<string, { monthly: number; yearly: number }>>({
    starter: { monthly: 49, yearly: 39 },
    pro: { monthly: 99, yearly: 79 },
    enterprise: { monthly: 249, yearly: 199 },
  });

  useEffect(() => {
    (async () => {
      try {
        const u = getCurrentUser();
        const headers: Record<string, string> = {};
        if (u?.role) headers["x-user-role"] = u.role;
        if (u?.id) headers["x-user-id"] = u.id;
        if (u?.companyId) headers["x-company-id"] = u.companyId;

        const r = await fetch("/api/public/plan-config", { cache: "no-store" });
        const j = await r.json();
        setPlans(Array.isArray(j?.plans) ? j.plans : []);

        const pr = await fetch("/api/public/pricing", { cache: "no-store" });
        if (pr.ok) {
          const pj = await pr.json();
          setPlanPricing({
            starter: {
              monthly: Number(pj?.pricing?.starter?.monthly ?? 49),
              yearly: Math.round(Number(pj?.pricing?.starter?.yearly ?? 468) / 12),
            },
            pro: {
              monthly: Number(pj?.pricing?.pro?.monthly ?? 99),
              yearly: Math.round(Number(pj?.pricing?.pro?.yearly ?? 948) / 12),
            },
            enterprise: {
              monthly: Number(pj?.pricing?.enterprise?.monthly ?? 249),
              yearly: Math.round(Number(pj?.pricing?.enterprise?.yearly ?? 2388) / 12),
            },
          });
          setSeatPricing({
            monthly: Number(pj?.seatPricing?.monthly ?? 7),
            yearly: Math.round(Number(pj?.seatPricing?.yearly ?? 72) / 12),
          });
        }

        const me = await fetch("/api/me/company", { cache: "no-store", headers });
        if (me.ok) {
          const cj = await me.json();
          setIntroOfferClaimed(!!cj?.introOfferClaimed);
          setExtraSeats(Math.max(0, Number(cj?.extraSeats || 0)));
        }
      } catch {}
    })();
  }, []);

  async function checkout(planCode: string) {
    setMsg("");
    const prices: Record<string, string> = {
      starter: process.env.NEXT_PUBLIC_PRICE_STARTER || "price_starter",
      pro: process.env.NEXT_PUBLIC_PRICE_PRO || "price_pro",
      enterprise: process.env.NEXT_PUBLIC_PRICE_ENTERPRISE || "price_enterprise",
    };
    const priceId = prices[planCode] || prices.pro;
    const u = getCurrentUser();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (u?.role) headers["x-user-role"] = u.role;
    if (u?.id) headers["x-user-id"] = u.id;
    if (u?.companyId) headers["x-company-id"] = u.companyId;

    const successUrl = window.location.origin + "/dashboard?upgrade=success";
    const cancelUrl = window.location.origin + "/billing?cancel=1";
    const key = planCode === "enterprise" ? "enterprise" : planCode === "pro" || planCode === "professional" ? "pro" : "starter";
    const basePerMonth = planPricing[key]?.monthly ?? 49;
    const checkoutAmount = basePerMonth + (extraSeats * seatPricing.monthly);
    const r = await fetch("/api/billing/checkout", {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ planCode, priceId, successUrl, cancelUrl, customPrice: checkoutAmount }),
    });

    const j = await r.json().catch(() => ({}));
    if (r.ok && j?.url) {
      window.location.assign(j.url);
    } else {
      setMsg(j?.error || "Checkout failed or billing provider not configured");
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Billing</h1>
        <p className="text-slate-600 mb-6">Select your plan and continue to secure hosted checkout.</p>

        {!introOfferClaimed && (
          <div className="mb-8 p-4 bg-indigo-50 border-2 border-indigo-200 rounded-xl flex items-center gap-4">
            <div className="text-3xl">Offer</div>
            <div>
              <div className="font-black text-indigo-900 uppercase">Special Offer: 75% OFF for 3 Months!</div>
              <div className="text-sm text-indigo-700">Get a 75% discount for your first 3 months. Standard pricing applies thereafter.</div>
            </div>
          </div>
        )}

        {msg ? <div className="mb-4 text-sm text-rose-600">{msg}</div> : null}

        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((p) => (
            <div key={p.code} className="border rounded-lg p-6 relative overflow-hidden">
              {!introOfferClaimed && (
                <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-black px-4 py-1 uppercase rotate-45 translate-x-4 translate-y-2">
                  75% OFF
                </div>
              )}

              <div className="font-bold text-xl mb-2 capitalize">{p.name || p.code}</div>

              {!introOfferClaimed && (
                <div className="text-xs font-bold text-indigo-600 mb-4 uppercase">First 3 Months: 75% OFF</div>
              )}

              <button
                onClick={() => checkout(p.code)}
                className="w-full py-3 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors"
              >
                Upgrade to {p.name || p.code}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
