"use client";
import { useState } from "react";

/**
 * Email capture for a Coming Soon marketing page. Saves to the shared
 * waitlist (see lib/comingSoonWaitlist.ts / app/api/admin/waitlist) so the
 * people who asked can be emailed in one shot when the page goes live.
 */
export default function ComingSoonSubscribe({ list, accent = "#818cf8", dark = true }: { list: "careers" | "affiliate"; accent?: string; dark?: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || status === "loading") return;
    setStatus("loading");
    try {
      const r = await fetch("/api/public/coming-soon-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, list }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Something went wrong");
      setMessage(d.message || "You're on the list!");
      setStatus("done");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  const inputBg = dark ? "rgba(255,255,255,.06)" : "var(--surface, #f8fafc)";
  const inputBorder = dark ? "1px solid rgba(255,255,255,.15)" : "1px solid var(--border, #e2e8f0)";
  const inputColor = dark ? "white" : "var(--text-primary, #0f172a)";

  if (status === "done") {
    return (
      <div style={{ padding: "14px 18px", borderRadius: 12, background: `${accent}15`, border: `1px solid ${accent}40`, color: dark ? "white" : "var(--text-primary, #0f172a)", fontSize: 13, maxWidth: 420, margin: "0 auto" }}>
        ✅ {message}
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", maxWidth: 420, margin: "0 auto" }}>
      <input
        type="email"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="you@example.com"
        style={{ flex: "1 1 220px", padding: "12px 16px", borderRadius: 10, background: inputBg, border: inputBorder, color: inputColor, fontSize: 13, outline: "none" }}
      />
      <button
        type="submit"
        disabled={status === "loading"}
        style={{ padding: "12px 22px", borderRadius: 10, fontWeight: 800, fontSize: 13, background: status === "loading" ? (dark ? "rgba(var(--ink),.1)" : "var(--surface, #e2e8f0)") : `linear-gradient(135deg,${accent},#7c3aed)`, color: "white", border: "none", cursor: status === "loading" ? "default" : "pointer", whiteSpace: "nowrap" }}
      >
        {status === "loading" ? "…" : "Notify me"}
      </button>
      {status === "error" && (
        <div style={{ width: "100%", fontSize: 12, color: "#dc2626" }}>{message}</div>
      )}
    </form>
  );
}
