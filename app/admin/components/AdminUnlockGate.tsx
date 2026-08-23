"use client";

/**
 * The password prompt shown in front of a locked console page.
 *
 * Purely the front door: the pages behind it are refused by the API too (423
 * from `requireAdmin`), so closing this dialog in devtools reveals a screen
 * whose every request fails rather than any actual data.
 */

import { useEffect, useRef, useState } from "react";

export default function AdminUnlockGate({
  pageLabel,
  onUnlocked,
  onCancel,
}: {
  pageLabel: string;
  onUnlocked: () => void;
  onCancel: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/security/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "Wrong password");
        setPassword("");
        return;
      }
      onUnlocked();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        fontFamily: "'Outfit','DM Sans',sans-serif",
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: "100%",
          maxWidth: 400,
          background: "rgba(255,255,255,.03)",
          border: "1px solid rgba(255,255,255,.08)",
          borderRadius: 20,
          padding: 32,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 34, marginBottom: 12 }} aria-hidden>
          🔒
        </div>
        <h2 style={{ margin: "0 0 6px", fontSize: 19, fontWeight: 800, color: "white" }}>
          {pageLabel} is protected
        </h2>
        <p style={{ margin: "0 0 22px", fontSize: 13, color: "rgba(255,255,255,.4)", lineHeight: 1.6 }}>
          Enter the page password to continue. It stays unlocked for 30 minutes.
        </p>

        {error && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              background: "rgba(248,113,113,.1)",
              border: "1px solid rgba(248,113,113,.2)",
              color: "#f87171",
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <input
          ref={inputRef}
          type="password"
          autoComplete="off"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Page password"
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: 12,
            background: "rgba(255,255,255,.05)",
            border: "1px solid rgba(255,255,255,.1)",
            color: "white",
            outline: "none",
            fontFamily: "inherit",
            fontSize: 14,
            textAlign: "center",
            boxSizing: "border-box",
          }}
        />

        <button
          type="submit"
          disabled={busy || !password}
          style={{
            width: "100%",
            marginTop: 14,
            padding: 13,
            borderRadius: 12,
            background: "linear-gradient(135deg,#6366f1,#4f46e5)",
            border: "none",
            color: "white",
            fontSize: 14,
            fontWeight: 700,
            fontFamily: "inherit",
            cursor: busy || !password ? "not-allowed" : "pointer",
            opacity: busy || !password ? 0.5 : 1,
          }}
        >
          {busy ? "Checking…" : "Unlock"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          style={{
            marginTop: 14,
            background: "none",
            border: "none",
            color: "rgba(255,255,255,.35)",
            fontSize: 13,
            fontFamily: "inherit",
            cursor: "pointer",
          }}
        >
          Back to dashboard
        </button>
      </form>
    </div>
  );
}
