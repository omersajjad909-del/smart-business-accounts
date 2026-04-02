 "use client";
import { useState, useEffect } from "react";
 import { useRouter } from "next/navigation";
 import Link from "next/link";
 
 export default function GetStartedPage() {
   const router = useRouter();
  useEffect(() => {
    router.replace("/pricing");
  }, [router]);
   const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
   const prices = {
     monthly: { starter: 0, pro: 49, enterprise: 99 },
     yearly: { starter: 0, pro: 39, enterprise: 79 },
   }[billingCycle];
 
   const [companyName, setCompanyName] = useState("");
   const [name, setName] = useState("");
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
 
   async function submit(e: React.FormEvent) {
     e.preventDefault();
     setError(null);
     setLoading(true);
     try {
       const res = await fetch("/api/onboarding/signup", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ companyName, name, email, password }),
       });
       const data = await res.json();
       if (!res.ok) {
         setError(data.error || "Signup failed");
         setLoading(false);
         return;
       }
       if (data?.needsVerification) {
         router.replace(`/auth?mode=verify&email=${encodeURIComponent(email)}`);
         return;
       }
       try {
         const blob = new Blob([JSON.stringify({ name: "signup_success" })], { type: "application/json" });
         navigator.sendBeacon("/api/analytics", blob);
       } catch {}
       router.replace("/pricing");
     } catch (err: unknown) {
       setError(err instanceof Error ? err.message : "Network error");
       setLoading(false);
     }
   }
 
   return (
     <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white text-slate-900">
       <header className="border-b border-indigo-100/50 bg-white/60 backdrop-blur">
         <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 shadow-lg" />
             <span className="text-xl font-bold tracking-tight">Finova</span>
           </div>
           <div className="flex items-center gap-3">
             <Link href="/dashboard" className="text-sm font-semibold text-indigo-700 hover:text-indigo-900">View Demo</Link>
           </div>
         </div>
       </header>
 
       <section className="max-w-7xl mx-auto px-6 pt-20 pb-10">
         <div className="grid md:grid-cols-2 gap-10 items-center">
           <div>
             <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-slate-900">Cloud Financial Management for Modern SMEs</h1>
             <p className="mt-4 text-lg text-slate-600">Secure, powerful, and simple accounting built for traders, distributors, manufacturers, and service businesses.</p>
             <div className="mt-6 flex flex-wrap gap-3">
               <a
                 href="#pricing"
                 onClick={() => {
                   try {
                     const blob = new Blob([JSON.stringify({ name: "cta_view_pricing" })], { type: "application/json" });
                     navigator.sendBeacon("/api/analytics", blob);
                   } catch {}
                 }}
                 className="px-5 py-3 rounded-lg bg-white border border-indigo-200 text-indigo-700 font-semibold hover:bg-indigo-50"
               >
                 View Pricing
               </a>
               <a
                 href="#signup"
                 onClick={() => {
                   try {
                     const blob = new Blob([JSON.stringify({ name: "cta_goto_signup" })], { type: "application/json" });
                     navigator.sendBeacon("/api/analytics", blob);
                   } catch {}
                 }}
                 className="px-5 py-3 rounded-lg bg-indigo-600 text-white font-semibold shadow hover:bg-indigo-700"
               >
                 Create Your Company
               </a>
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
           {[
             { i: "🏢", t: "Multi-Company Support" },
             { i: "🧾", t: "Sales & Purchase Invoices" },
             { i: "💵", t: "Payments & Expenses" },
             { i: "📑", t: "Ledger & Trial Balance" },
           ].map(f => (
             <div key={f.t} className="bg-white rounded-xl border border-indigo-100 p-6 shadow-sm">
               <div className="text-2xl">{f.i}</div>
               <div className="mt-3 font-semibold">{f.t}</div>
             </div>
           ))}
         </div>
       </section>
 
       <section id="pricing" className="max-w-7xl mx-auto px-6 py-16">
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
            <a href="#signup" className="mt-6 inline-block w-full text-center px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold">Get Started Now</a>
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
             <Link href="/pricing" className="mt-6 inline-block w-full text-center px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold">Upgrade</Link>
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
             <Link href="/onboarding/signup/enterprise" className="mt-6 inline-block w-full text-center px-4 py-2 rounded-lg bg-white border border-indigo-200 text-indigo-700 font-semibold">Go Enterprise</Link>
           </div>
         </div>
       </section>
 
       <section id="signup" className="max-w-7xl mx-auto px-6 py-16">
         <h2 className="text-3xl font-bold text-center">Create your company</h2>
         <form onSubmit={submit} className="mt-8 max-w-xl mx-auto bg-white border border-indigo-100 rounded-2xl p-6 shadow-sm">
           {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-sm rounded">{error}</div>}
           <div className="grid gap-4">
             <div>
               <label className="block text-xs text-slate-500 mb-1">Company Name</label>
               <input
                 type="text"
                 value={companyName}
                 onChange={(e) => setCompanyName(e.target.value)}
                 className="w-full rounded-lg border border-indigo-200 bg-indigo-50/30 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                 placeholder="Your Company Name"
                 required
               />
             </div>
             <div className="grid sm:grid-cols-2 gap-4">
               <div>
                 <label className="block text-xs text-slate-500 mb-1">Your Name</label>
                 <input
                   type="text"
                   value={name}
                   onChange={(e) => setName(e.target.value)}
                   className="w-full rounded-lg border border-indigo-200 bg-indigo-50/30 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                   placeholder="Umer Sajjad"
                   required
                 />
               </div>
               <div>
                 <label className="block text-xs text-slate-500 mb-1">Email</label>
                 <input
                   type="email"
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                   className="w-full rounded-lg border border-indigo-200 bg-indigo-50/30 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                   placeholder="umer@traders.com"
                   required
                 />
               </div>
             </div>
             <div>
               <label className="block text-xs text-slate-500 mb-1">Password</label>
               <input
                 type="password"
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 className="w-full rounded-lg border border-indigo-200 bg-indigo-50/30 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                 placeholder="••••••••"
                 required
               />
             </div>
             <button
               type="submit"
               disabled={loading}
               className="mt-2 w-full px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold shadow hover:bg-indigo-700 disabled:opacity-50"
             >
               {loading ? "Creating..." : "Create & Continue"}
             </button>
           </div>
         </form>
       </section>
 
       <footer className="border-t border-indigo-100/50 bg-white">
         <div className="max-w-7xl mx-auto px-6 py-6 text-sm text-slate-500 flex items-center justify-between">
           <div>© {new Date().getFullYear()} Finova</div>
           <div className="flex gap-4">
             <Link href="/legal/terms" className="hover:text-slate-700">Terms</Link>
             <Link href="/legal/privacy" className="hover:text-slate-700">Privacy</Link>
           </div>
         </div>
       </footer>
     </div>
   );
 }
