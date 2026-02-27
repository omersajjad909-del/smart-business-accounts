"use client";
import Link from "next/link";
import { useState } from "react";
import Image from "next/image";

export default function LandingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const prices = {
    monthly: { starter: 0, pro: 49, enterprise: 99 },
    yearly: { starter: 0, pro: 39, enterprise: 79 },
  }[billingCycle];

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white text-slate-900">
      <header className="border-b border-indigo-100/50 bg-white/60 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 shadow-lg" />
            <span className="text-xl font-bold tracking-tight">Smart Business Accounts</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm font-semibold text-indigo-700 hover:text-indigo-900">View Demo</Link>
            <Link href="/signup" onClick={() => {
              try {
                const blob = new Blob([JSON.stringify({ name: "cta_start_trial" })], { type: "application/json" });
                navigator.sendBeacon("/api/analytics", blob);
              } catch {}
            }} className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold shadow hover:bg-indigo-700">Start Free Trial</Link>
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-6 pt-20 pb-10">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-slate-900">Cloud Financial Management for Modern SMEs</h1>
            <p className="mt-4 text-lg text-slate-600">Secure, powerful, and simple accounting built for traders, distributors, manufacturers, and service businesses.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/signup" onClick={() => {
                try {
                  const blob = new Blob([JSON.stringify({ name: "cta_start_trial" })], { type: "application/json" });
                  navigator.sendBeacon("/api/analytics", blob);
                } catch {}
              }} className="px-5 py-3 rounded-lg bg-indigo-600 text-white font-semibold shadow hover:bg-indigo-700">Start Free Trial</Link>
              <Link href="/dashboard" onClick={() => {
                try {
                  const blob = new Blob([JSON.stringify({ name: "cta_view_demo" })], { type: "application/json" });
                  navigator.sendBeacon("/api/analytics", blob);
                } catch {}
              }} className="px-5 py-3 rounded-lg bg-white border border-indigo-200 text-indigo-700 font-semibold hover:bg-indigo-50">View Demo</Link>
            </div>
            <div className="mt-6">
              <div className="text-xs text-slate-500">Trusted by teams</div>
              <div className="mt-2 flex items-center gap-4">
                <Image src="/icon.png" alt="Partner A" width={32} height={32} className="rounded-lg border border-indigo-100" />
                <Image src="/icon11.png" alt="Partner B" width={32} height={32} className="rounded-lg border border-indigo-100" />
                <Image src="/icon.png" alt="Partner C" width={32} height={32} className="rounded-lg border border-indigo-100" />
                <Image src="/icon11.png" alt="Partner D" width={32} height={32} className="rounded-lg border border-indigo-100" />
                <Image src="/icon.png" alt="Partner E" width={32} height={32} className="rounded-lg border border-indigo-100" />
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white shadow-xl p-4">
              <div className="h-64 md:h-80 rounded-xl bg-gradient-to-tr from-indigo-600/20 to-blue-500/20" />
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border border-indigo-100 p-6 shadow-sm">
            <div className="text-2xl">⚠️</div>
            <h3 className="mt-3 font-semibold">Manual accounting errors</h3>
            <p className="mt-2 text-sm text-slate-600">Spreadsheets and manual ledgers lead to costly mistakes.</p>
          </div>
          <div className="bg-white rounded-xl border border-indigo-100 p-6 shadow-sm">
            <div className="text-2xl">💸</div>
            <h3 className="mt-3 font-semibold">Cash flow confusion</h3>
            <p className="mt-2 text-sm text-slate-600">No clear visibility of inflows, outflows, and balances.</p>
          </div>
          <div className="bg-white rounded-xl border border-indigo-100 p-6 shadow-sm">
            <div className="text-2xl">📉</div>
            <h3 className="mt-3 font-semibold">No real-time financials</h3>
            <p className="mt-2 text-sm text-slate-600">Decisions suffer without live dashboards and reports.</p>
          </div>
          <div className="bg-white rounded-xl border border-indigo-100 p-6 shadow-sm">
            <div className="text-2xl">🏢</div>
            <h3 className="mt-3 font-semibold">Multi-branch complexity</h3>
            <p className="mt-2 text-sm text-slate-600">Hard to consolidate across companies, branches, and teams.</p>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div className="order-2 md:order-1">
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white shadow-xl p-4">
              <div className="h-64 md:h-80 rounded-xl bg-gradient-to-tr from-indigo-600/20 to-blue-500/20" />
            </div>
          </div>
          <div className="order-1 md:order-2">
            <h2 className="text-3xl font-bold">The modern solution</h2>
            <ul className="mt-6 space-y-4">
              <li className="flex items-start gap-3">
                <span className="text-indigo-600">✔</span>
                <div>
                  <div className="font-semibold">Real-time dashboards</div>
                  <div className="text-sm text-slate-600">Instant visibility into sales, purchases, cash, and profit.</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-indigo-600">✔</span>
                <div>
                  <div className="font-semibold">Smart reporting</div>
                  <div className="text-sm text-slate-600">Ledger, trial balance, P&L and balance sheet in seconds.</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-indigo-600">✔</span>
                <div>
                  <div className="font-semibold">Multi-company management</div>
                  <div className="text-sm text-slate-600">Manage multiple companies with secure role-based access.</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-indigo-600">✔</span>
                <div>
                  <div className="font-semibold">Secure cloud access</div>
                  <div className="text-sm text-slate-600">Encrypted, reliable, always-on infrastructure.</div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center">Everything you need</h2>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { t: "Multi-Company Support", i: "🏢" },
            { t: "Sales & Purchase Invoices", i: "🧾" },
            { t: "Payment & Expense Tracking", i: "💵" },
            { t: "Ledger & Trial Balance", i: "📑" },
            { t: "Role-Based Access Control", i: "🔐" },
            { t: "Bank Reconciliation", i: "🏦" },
            { t: "Cloud Backup & Security", i: "☁️" },
            { t: "Professional Reports", i: "📈" },
          ].map((f) => (
            <div key={f.t} className="bg-white rounded-xl border border-indigo-100 p-6 shadow-sm">
              <div className="text-2xl">{f.i}</div>
              <div className="mt-3 font-semibold">{f.t}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center">How it works</h2>
        <div className="mt-10 grid md:grid-cols-3 gap-6">
          {[
            { t: "Create Company", d: "Set up your company and branches." },
            { t: "Add Transactions", d: "Record sales, purchases, payments, and expenses." },
            { t: "Generate Reports", d: "Get instant financial statements and insights." },
          ].map((s, idx) => (
            <div key={s.t} className="bg-white rounded-xl border border-indigo-100 p-6 shadow-sm">
              <div className="text-2xl font-bold text-indigo-600">{idx + 1}</div>
              <div className="mt-3 font-semibold">{s.t}</div>
              <div className="mt-2 text-sm text-slate-600">{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`px-4 py-2 rounded-lg border ${billingCycle === "monthly" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-indigo-700 border-indigo-200"}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle("yearly")}
            className={`px-4 py-2 rounded-lg border ${billingCycle === "yearly" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-indigo-700 border-indigo-200"}`}
          >
            Yearly
          </button>
        </div>
        <h2 className="mt-8 text-3xl font-bold text-center">Simple pricing</h2>
        <div className="mt-10 grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-indigo-100 p-6 shadow-sm">
            <div className="font-bold">Starter</div>
            <div className="mt-2 text-4xl font-extrabold">${prices.starter}</div>
            <div className="mt-2 text-sm text-slate-600">Essential features for getting started</div>
            <div className="mt-6 space-y-2 text-sm">
              <div>Multi-company</div>
              <div>Invoices</div>
              <div>Ledger & Trial Balance</div>
            </div>
            <Link href="/dashboard" onClick={() => {
              try {
                const blob = new Blob([JSON.stringify({ name: "pricing_starter_click" })], { type: "application/json" });
                navigator.sendBeacon("/api/analytics", blob);
              } catch {}
            }} className="mt-6 inline-block w-full text-center px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold">Start Free</Link>
          </div>
          <div className="bg-white rounded-2xl border-2 border-indigo-600 p-6 shadow-lg">
            <div className="font-bold">Professional</div>
            <div className="mt-2 text-4xl font-extrabold text-indigo-700">${prices.pro}</div>
            <div className="mt-2 text-sm text-slate-600">Recommended for growing teams</div>
            <div className="mt-6 space-y-2 text-sm">
              <div>Everything in Starter</div>
              <div>Advanced reports</div>
              <div>Bank reconciliation</div>
            </div>
            <Link href="/onboarding/choose-plan" onClick={() => {
              try {
                const blob = new Blob([JSON.stringify({ name: "pricing_pro_click" })], { type: "application/json" });
                navigator.sendBeacon("/api/analytics", blob);
              } catch {}
            }} className="mt-6 inline-block w-full text-center px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold">Upgrade</Link>
          </div>
          <div className="bg-white rounded-2xl border border-indigo-100 p-6 shadow-sm">
            <div className="font-bold">Enterprise</div>
            <div className="mt-2 text-4xl font-extrabold">${prices.enterprise}</div>
            <div className="mt-2 text-sm text-slate-600">For large operations and custom needs</div>
            <div className="mt-6 space-y-2 text-sm">
              <div>Custom integrations</div>
              <div>Priority support</div>
              <div>Dedicated onboarding</div>
            </div>
            <Link href="/support" onClick={() => {
              try {
                const blob = new Blob([JSON.stringify({ name: "pricing_enterprise_click" })], { type: "application/json" });
                navigator.sendBeacon("/api/analytics", blob);
              } catch {}
            }} className="mt-6 inline-block w-full text-center px-4 py-2 rounded-lg bg-white border border-indigo-200 text-indigo-700 font-semibold">Contact Sales</Link>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center">Security you can trust</h2>
        <div className="mt-10 grid md:grid-cols-4 gap-6">
          {[
            { t: "Encrypted data", i: "🔒" },
            { t: "Secure login", i: "🔐" },
            { t: "Multi-tenant isolation", i: "🧩" },
            { t: "Daily backups", i: "☁️" },
          ].map((f) => (
            <div key={f.t} className="bg-white rounded-xl border border-indigo-100 p-6 shadow-sm">
              <div className="text-2xl">{f.i}</div>
              <div className="mt-3 font-semibold">{f.t}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center">What customers say</h2>
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-indigo-100 p-6 shadow-sm">
              <div className="text-sm text-slate-600">Testimonial placeholder</div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center">Frequently asked questions</h2>
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          {[
            { q: "Is my data safe?", a: "Yes. Data is encrypted and isolated per company." },
            { q: "Can I manage multiple companies?", a: "Yes. Create and switch companies securely." },
            { q: "Do you support branches?", a: "Yes. Multi-branch operations are supported." },
            { q: "How do I get started?", a: "Start a free trial and import your opening balances." },
          ].map((f) => (
            <div key={f.q} className="bg-white rounded-xl border border-indigo-100 p-6 shadow-sm">
              <div className="font-semibold">{f.q}</div>
              <div className="mt-2 text-sm text-slate-600">{f.a}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-500 p-10 text-white text-center shadow-xl">
          <h2 className="text-3xl font-extrabold">Start managing your business professionally today</h2>
          <p className="mt-3 text-indigo-100">Powerful financial management made simple and trustworthy</p>
          <div className="mt-6">
            <Link href="/signup" onClick={() => {
              try {
                const blob = new Blob([JSON.stringify({ name: "cta_final_signup" })], { type: "application/json" });
                navigator.sendBeacon("/api/analytics", blob);
              } catch {}
            }} className="inline-block px-6 py-3 rounded-lg bg-white text-indigo-700 font-semibold">Sign Up Free</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-indigo-100/50 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-6 text-sm text-slate-500 flex items-center justify-between">
          <div>© {new Date().getFullYear()} Smart Business Accounts</div>
          <div className="flex gap-4">
            <Link href="/dashboard" className="hover:text-slate-700">Dashboard</Link>
            <Link href="/legal/terms" className="hover:text-slate-700">Terms</Link>
            <Link href="/legal/privacy" className="hover:text-slate-700">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
