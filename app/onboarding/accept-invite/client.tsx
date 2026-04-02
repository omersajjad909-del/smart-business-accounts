"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function ClientAcceptInvite() {
  const sp = useSearchParams();
  const router = useRouter();
  const token = sp.get("token") || "";
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit() {
    setError("");
    try {
      const r = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      });
      const j = await r.json();
      if (r.ok && j.ok) {
        setDone(true);
        setTimeout(() => router.replace("/login"), 1200);
      } else setError(j.error || "Failed");
    } catch (e: any) {
      setError(e.message || "Network error");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-slate-900 px-6">
      <div className="max-w-md w-full border rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-2">Accept Invite</h1>
        <p className="text-sm text-slate-600 mb-4">Set your name and password to join.</p>
        {error && <div className="text-sm text-rose-600 mb-2">{error}</div>}
        {done ? (
          <div className="text-emerald-600">Success. Redirecting to login…</div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="space-y-3"
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full px-3 py-2 border rounded"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              type="password"
              className="w-full px-3 py-2 border rounded"
            />
            <button className="px-4 py-2 rounded-md bg-indigo-600 text-white">Join</button>
          </form>
        )}
      </div>
    </div>
  );
}
