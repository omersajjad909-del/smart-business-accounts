"use client";
import { useEffect, useState } from "react";

const FONT = "'Outfit','Inter',sans-serif";

type DemoSession = { bookingId?: string; companyId?: string; endsAt: number };

// Instant demos carry a companyId, booked ones a bookingId — either is enough
// to identify the sandbox to wipe on exit.
function readDemoCookie(): DemoSession | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)finova_demo=([^;]+)/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1]));
    if (typeof parsed?.endsAt !== "number") return null;
    if (parsed.bookingId || parsed.companyId) return parsed;
  } catch {}
  return null;
}

function pad(n: number) { return n.toString().padStart(2, "0"); }

export default function DemoSessionTimer() {
  const [session, setSession] = useState<DemoSession | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [ending, setEnding] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState("");

  /* Empties the workspace and stays in it. The session, its cookie and its
     remaining time are untouched — only what is inside the company goes. */
  async function clearDemo() {
    if (clearing) return;
    setClearing(true);
    setClearError("");
    try {
      const res = await fetch("/api/demo/clear", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Could not clear the workspace.");
      // A full reload rather than a refetch: every screen in the app is now
      // holding rows that no longer exist, and there is no cheaper way to be
      // sure none of them is still showing one.
      window.location.reload();
    } catch (e) {
      setClearError(e instanceof Error ? e.message : "Could not clear the workspace.");
      setClearing(false);
    }
  }

  useEffect(() => {
    setSession(readDemoCookie());
    const poll = setInterval(() => {
      setSession(readDemoCookie());
    }, 3000);
    return () => clearInterval(poll);
  }, []);

  useEffect(() => {
    if (!session) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [session]);

  async function endDemo() {
    if (ending) return;
    setEnding(true);
    try {
      await fetch("/api/demo/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: session?.bookingId }),
      });
    } catch {}
    // Clear cookies client-side too
    document.cookie = "sb_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "finova_demo=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    window.location.href = "/demo?ended=1";
  }

  if (!session) return null;

  const remaining = Math.max(0, Math.floor((session.endsAt - now) / 1000));
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const urgent = remaining < 300;
  const critical = remaining < 60;

  if (remaining === 0 && !ending) {
    endDemo();
  }

  const color = critical ? "#ef4444" : urgent ? "#fbbf24" : "#34d399";
  const bg = critical ? "rgba(239,68,68,.15)" : urgent ? "rgba(251,191,36,.12)" : "rgba(52,211,153,.1)";
  const border = critical ? "rgba(239,68,68,.4)" : urgent ? "rgba(251,191,36,.3)" : "rgba(52,211,153,.28)";

  return (
    <>
      <div className="demo-session-timer" style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 9998,
        display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
        borderRadius: 16, background: bg, border: `1px solid ${border}`,
        backdropFilter: "blur(12px)", fontFamily: FONT, color: "white",
        boxShadow: `0 12px 40px ${color}25`, minWidth: 220,
      }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, animation: critical ? "demoPulse 1s ease infinite" : "none" }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color, letterSpacing: ".08em", textTransform: "uppercase" }}>
            Demo Session
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: -0.4 }}>
            {pad(mins)}:{pad(secs)}
          </div>
        </div>
        {/* Two different things, so two buttons. Clear empties the workspace
            and leaves the visitor in it — the common case, somebody who has
            filled it with trial entries and wants a clean sheet without
            starting the tour again. End destroys the sandbox and signs out. */}
        <button
          onClick={() => setConfirmClear(true)}
          disabled={ending || clearing}
          title="Delete everything in this demo workspace and start fresh, without ending the session"
          style={{
            padding: "7px 10px", borderRadius: 10,
            background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)",
            color: "white", cursor: ending || clearing ? "not-allowed" : "pointer",
            fontSize: 11, fontWeight: 700, fontFamily: FONT, whiteSpace: "nowrap",
          }}
        >
          {clearing ? "Clearing…" : "Clear"}
        </button>
        <button
          onClick={() => setConfirmEnd(true)}
          disabled={ending || clearing}
          style={{
            padding: "7px 12px", borderRadius: 10,
            background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)",
            color: "white", cursor: ending || clearing ? "not-allowed" : "pointer",
            fontSize: 11, fontWeight: 700, fontFamily: FONT,
          }}
        >
          End
        </button>
      </div>

      {confirmClear && (
        <div
          onClick={() => !clearing && setConfirmClear(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999, background: "rgba(4,6,20,.75)",
            backdropFilter: "blur(6px)", display: "flex", alignItems: "center",
            justifyContent: "center", padding: 20, fontFamily: FONT,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: 400, width: "100%", background: "linear-gradient(160deg,#0b0e28,#0a0d24)",
              border: "1px solid rgba(251,191,36,.3)", borderRadius: 20, padding: 24, color: "white",
            }}
          >
            <div style={{ fontSize: 34, marginBottom: 12 }}>🧹</div>
            <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>Clear this workspace?</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.6)", lineHeight: 1.7, marginBottom: 20 }}>
              Everything in this demo goes — the sample data and anything you have entered.
              You stay signed in on an empty workspace, with the time you have left unchanged.
              This cannot be undone.
            </div>
            {clearError && (
              <div style={{ fontSize: 12.5, color: "#fca5a5", marginBottom: 14 }}>{clearError}</div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={clearDemo}
                disabled={clearing}
                style={{
                  flex: 1, padding: "11px 0", borderRadius: 12, border: "none",
                  background: clearing ? "rgba(251,191,36,.4)" : "#fbbf24",
                  color: "#1a1205", fontSize: 13.5, fontWeight: 800, fontFamily: FONT,
                  cursor: clearing ? "not-allowed" : "pointer",
                }}
              >
                {clearing ? "Clearing…" : "Clear everything"}
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                disabled={clearing}
                style={{
                  padding: "11px 18px", borderRadius: 12,
                  background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.14)",
                  color: "white", fontSize: 13.5, fontWeight: 700, fontFamily: FONT,
                  cursor: clearing ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmEnd && (
        <div
          onClick={() => !ending && setConfirmEnd(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999, background: "rgba(4,6,20,.75)",
            backdropFilter: "blur(6px)", display: "flex", alignItems: "center",
            justifyContent: "center", padding: 20, fontFamily: FONT,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: 400, width: "100%", background: "linear-gradient(160deg,#0b0e28,#0a0d24)",
              border: "1px solid rgba(239,68,68,.3)", borderRadius: 20, padding: 24, color: "white",
            }}
          >
            <div style={{ fontSize: 34, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>End demo session?</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.6)", lineHeight: 1.7, marginBottom: 20 }}>
              This will log you out and delete all data you created in this demo. This cannot be undone.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setConfirmEnd(false)}
                disabled={ending}
                style={{
                  flex: 1, padding: "12px 16px", borderRadius: 12,
                  background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)",
                  color: "white", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: FONT,
                }}
              >
                Keep going
              </button>
              <button
                onClick={endDemo}
                disabled={ending}
                style={{
                  flex: 1, padding: "12px 16px", borderRadius: 12,
                  background: "linear-gradient(135deg,#dc2626,#ef4444)",
                  border: "none", color: "white", cursor: ending ? "not-allowed" : "pointer",
                  fontSize: 13, fontWeight: 800, fontFamily: FONT,
                }}
              >
                {ending ? "Ending…" : "End demo"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes demoPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: .5; transform: scale(1.3); }
        }
        @media (max-width: 767px) {
          .demo-session-timer {
            bottom: calc(92px + env(safe-area-inset-bottom)) !important;
            right: 16px !important;
          }
        }
      `}</style>
    </>
  );
}
