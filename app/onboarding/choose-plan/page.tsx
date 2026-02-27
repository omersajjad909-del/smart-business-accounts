"use client";
import { useEffect, useState } from "react";

export default function ChoosePlanPage() {
  const [priceId, setPriceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const envPrice = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO;
    if (envPrice && typeof envPrice === "string") setPriceId(envPrice);
  }, []);

  async function upgradeToPro() {
    if (!priceId) return alert("Stripe Price ID missing");
    try {
      setLoading(true);
      try {
        const blob = new Blob([JSON.stringify({ name: "upgrade_attempt" })], { type: "application/json" });
        navigator.sendBeacon("/api/analytics", blob);
      } catch {}
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planCode: "PRO",
          priceId,
          successUrl: window.location.origin + "/dashboard",
          cancelUrl: window.location.origin + "/dashboard",
        }),
      });
      const data = await res.json();
      if (res.ok && data?.url) {
        try {
          const blob = new Blob([JSON.stringify({ name: "upgrade_redirect" })], { type: "application/json" });
          navigator.sendBeacon("/api/analytics", blob);
        } catch {}
        window.location.href = data.url;
      } else {
        alert(data?.error || "Checkout failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white flex items-center justify-center px-6">
      <div className="w-full max-w-3xl grid md:grid-cols-2 gap-6">
        <div className="bg-white border border-indigo-100 rounded-2xl shadow p-6">
          <div className="font-bold">Starter</div>
          <div className="mt-2 text-sm text-slate-600">Get started and explore features</div>
          <button
            onClick={async () => {
              try {
                const blob = new Blob([JSON.stringify({ name: "demo_seed" })], { type: "application/json" });
                navigator.sendBeacon("/api/analytics", blob);
              } catch {}
              await fetch("/api/demo/seed", { method: "POST" });
              window.location.href = "/dashboard";
            }}
            className="mt-4 w-full px-4 py-2 rounded-lg border border-indigo-200 bg-white text-indigo-700 font-semibold hover:bg-indigo-50"
          >
            Load Demo Data
          </button>
          <button
            onClick={() => {
              try {
                const blob = new Blob([JSON.stringify({ name: "starter_continue" })], { type: "application/json" });
                navigator.sendBeacon("/api/analytics", blob);
              } catch {}
              window.location.href = "/dashboard";
            }}
            className="mt-6 w-full px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold shadow hover:bg-indigo-700"
          >
            Continue to Dashboard
          </button>
        </div>
        <div className="bg-white border-2 border-indigo-600 rounded-2xl shadow-lg p-6">
          <div className="font-bold">Professional</div>
          <div className="mt-2 text-sm text-slate-600">Advanced reporting and reconciliation</div>
          <div className="mt-4">
            <label className="block text-xs text-slate-500 mb-1">Stripe Price ID</label>
            <input
              type="text"
              value={priceId || ""}
              onChange={(e) => setPriceId(e.target.value)}
              className="w-full rounded-lg border border-indigo-200 bg-indigo-50/30 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="price_123..."
            />
          </div>
          <button
            onClick={upgradeToPro}
            disabled={loading}
            className="mt-6 w-full px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold shadow hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Redirecting..." : "Upgrade to PRO"}
          </button>
        </div>
      </div>
    </div>
  );
}
