"use client";

import { useState } from "react";

export default function LoginEmailPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const r = await fetch("/api/auth/magic/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const j = await r.json();
      if (r.ok && j.ok) {
        setSent(true);
      } else {
        setError(j.error || "Failed to send link");
      }
    } catch (e: any) {
      setError(e.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-slate-900 px-6">
      <div className="max-w-md w-full border rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-2">Login via Email</h1>
        <p className="text-sm text-slate-600 mb-4">We will send you a magic link.</p>
        {sent ? (
          <div className="text-emerald-600">Check your inbox for a login link.</div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            {error && <div className="text-sm text-rose-600">{error}</div>}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full px-3 py-2 border rounded"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 rounded-md bg-indigo-600 text-white"
            >
              {loading ? "Sending..." : "Send Magic Link"}
            </button>
            <a
              href="/api/auth/google/start"
              className="block w-full text-center px-4 py-2 rounded-md border border-slate-300"
            >
              Continue with Google
            </a>
          </form>
        )}
      </div>
    </div>
  );
}
