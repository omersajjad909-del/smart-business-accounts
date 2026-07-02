"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const FONT = "'Outfit','Inter',sans-serif";

export default function DemoStartPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params?.get("token");
  const [status, setStatus] = useState<"loading" | "waiting" | "error" | "ok">("loading");
  const [error, setError] = useState<string | null>(null);
  const [waitSeconds, setWaitSeconds] = useState<number | null>(null);
  const [slotStart, setSlotStart] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Missing access token. Please use the booking link you received.");
      return;
    }
    let cancelled = false;

    const attempt = async () => {
      try {
        const r = await fetch("/api/demo/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: token }),
        });
        const d = await r.json();
        if (cancelled) return;
        if (r.status === 425) {
          setStatus("waiting");
          setWaitSeconds(d.startsInSeconds ?? null);
          setSlotStart(d.slotStart ?? null);
          return;
        }
        if (!r.ok) {
          setStatus("error");
          setError(d.error || "Could not start demo");
          return;
        }
        setStatus("ok");
        setTimeout(() => router.replace("/dashboard"), 400);
      } catch (e: any) {
        if (!cancelled) {
          setStatus("error");
          setError(e.message || "Network error");
        }
      }
    };

    attempt();
    return () => { cancelled = true; };
  }, [token, router]);

  useEffect(() => {
    if (status !== "waiting" || waitSeconds == null) return;
    const t = setInterval(() => {
      setWaitSeconds(s => (s == null ? null : Math.max(0, s - 1)));
    }, 1000);
    return () => clearInterval(t);
  }, [status, waitSeconds]);

  useEffect(() => {
    if (status === "waiting" && waitSeconds === 0) {
      window.location.reload();
    }
  }, [status, waitSeconds]);

  return (
    <div style={{
      minHeight: "100vh", background: "linear-gradient(160deg,#040616,#0a0d24)",
      color: "white", fontFamily: FONT, display: "flex", alignItems: "center",
      justifyContent: "center", padding: 24,
    }}>
      <div style={{
        maxWidth: 460, width: "100%", padding: "40px 32px",
        borderRadius: 24, background: "rgba(255,255,255,.03)",
        border: "1px solid rgba(129,140,248,.2)", textAlign: "center",
      }}>
        {status === "loading" && (
          <>
            <div style={{ fontSize: 44, marginBottom: 16 }}>⏳</div>
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>Preparing your demo…</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", lineHeight: 1.6 }}>
              Setting up a fresh workspace for you. This takes just a moment.
            </div>
          </>
        )}
        {status === "waiting" && (
          <>
            <div style={{ fontSize: 44, marginBottom: 16 }}>🕒</div>
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>Your demo hasn&apos;t started yet</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", lineHeight: 1.6, marginBottom: 20 }}>
              {slotStart && `Scheduled for ${new Date(slotStart).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}.`}
            </div>
            {waitSeconds != null && waitSeconds > 0 && (
              <div style={{ padding: "12px 20px", borderRadius: 12, background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.25)", display: "inline-block", fontSize: 15, fontWeight: 800, color: "#a5b4fc" }}>
                Starts in {Math.floor(waitSeconds / 60)}m {waitSeconds % 60}s
              </div>
            )}
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginTop: 18 }}>
              This page will auto-refresh when your slot begins.
            </div>
          </>
        )}
        {status === "ok" && (
          <>
            <div style={{ fontSize: 44, marginBottom: 16 }}>✓</div>
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>You&apos;re in!</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)" }}>
              Opening the dashboard…
            </div>
          </>
        )}
        {status === "error" && (
          <>
            <div style={{ fontSize: 44, marginBottom: 16 }}>⚠️</div>
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>Couldn&apos;t start demo</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", lineHeight: 1.6, marginBottom: 20 }}>
              {error}
            </div>
            <a href="/demo" style={{
              display: "inline-block", padding: "10px 20px", borderRadius: 10,
              background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)",
              color: "white", textDecoration: "none", fontSize: 13, fontWeight: 700,
            }}>
              ← Back to demos
            </a>
          </>
        )}
      </div>
    </div>
  );
}
