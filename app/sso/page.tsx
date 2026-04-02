"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function SsoForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(searchParams.get("error") || "");

  async function startSso() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/sso/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Unable to start SSO");
      window.location.href = data.redirectUrl;
    } catch (err: any) {
      setError(err?.message || "Unable to start SSO");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
        <div className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-indigo-300">Enterprise SSO</div>
        <h1 className="text-3xl font-bold">Sign in with your company identity provider</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Enter your work email. Finova will detect your company domain and redirect you to the configured OIDC provider.
        </p>

        <div className="mt-6 space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
          />
          <button
            onClick={startSso}
            disabled={loading || !email.trim()}
            className="w-full rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Redirecting..." : "Continue with SSO"}
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SsoPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#020817", color:"rgba(255,255,255,.4)", fontSize:14 }}>
        Loading…
      </div>
    }>
      <SsoForm/>
    </Suspense>
  );
}
