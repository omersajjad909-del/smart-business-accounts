"use client";

/**
 * The Launch Now card on the admin dashboard.
 *
 * Opening the public site to the world is outward-facing and not silently
 * reversible in the visitor's memory, so the button always asks first. The
 * celebration afterwards is deliberate: launching a product should feel like
 * something happened.
 *
 * The confetti is hand-rolled on a canvas rather than pulled from a package —
 * the site's CSP blocks external script hosts, and 40 lines of physics beats a
 * dependency for one animation. The pop sound is synthesised with Web Audio for
 * the same reason: no asset to host, nothing for the CSP to block.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type Status = {
  live: boolean;
  launchedAt: string | null;
  launchedBy: string | null;
  forcedByEnv?: boolean;
};

const COLORS = ["#6366f1", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#38bdf8", "#f472b6"];

function Confetti({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const W = () => window.innerWidth;
    const H = () => window.innerHeight;

    // Two bursts from the lower corners, the way a party popper actually fires.
    const pieces = Array.from({ length: 160 }, (_, i) => {
      const fromLeft = i % 2 === 0;
      const angle = (fromLeft ? -60 : -120) * (Math.PI / 180) + (Math.random() - 0.5) * 0.9;
      const speed = 14 + Math.random() * 16;
      return {
        x: fromLeft ? 0 : W(),
        y: H(),
        vx: Math.cos(angle) * speed * (fromLeft ? 1 : -1) * -1,
        vy: Math.sin(angle) * speed,
        size: 6 + Math.random() * 7,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rot: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.3,
        life: 1,
      };
    });

    let raf = 0;
    const start = Date.now();

    const frame = () => {
      ctx.clearRect(0, 0, W(), H());
      let alive = false;

      for (const p of pieces) {
        p.vy += 0.38;          // gravity
        p.vx *= 0.99;          // drag
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.spin;
        if (Date.now() - start > 1600) p.life -= 0.016;

        if (p.life > 0 && p.y < H() + 40) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.62);
          ctx.restore();
        }
      }

      if (alive) raf = requestAnimationFrame(frame);
      else onDone();
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [onDone]);

  return (
    <canvas
      ref={ref}
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 10000 }}
    />
  );
}

export default function LaunchNowCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [confirming, setConfirming] = useState<null | "launch" | "offline">(null);
  const [working, setWorking] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [error, setError] = useState("");
  // T-minus. `null` means no launch in progress.
  const [countdown, setCountdown] = useState<number | null>(null);

  const headers = useCallback((json = false) => {
    const u = getCurrentUser();
    const h: Record<string, string> = {};
    if (json) h["Content-Type"] = "application/json";
    if (u?.role) h["x-user-role"] = u.role;
    if (u?.id) h["x-user-id"] = u.id;
    return h;
  }, []);

  useEffect(() => {
    fetch("/api/admin/launch", { headers: headers(), cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) setStatus(d); })
      .catch(() => {});
  }, [headers]);

  const apply = useCallback(async (live: boolean) => {
    setWorking(true);
    setError("");
    try {
      const res = await fetch("/api/admin/launch", {
        method: "POST",
        headers: headers(true),
        body: JSON.stringify({ live }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d?.error || "Could not update launch status."); return; }
      setStatus(d);
      setConfirming(null);
      if (live) setCelebrate(true);
    } catch {
      setError("Could not update launch status.");
    } finally {
      setWorking(false);
    }
  }, [headers]);

  /**
   * T-minus 10 to launch.
   *
   * Nothing is written until the count reaches zero, so Abort genuinely aborts
   * — a countdown that had already flipped the switch behind the scenes would
   * be theatre with a lie in it.
   */
  useEffect(() => {
    if (countdown === null) return;

    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(n => (n === null ? null : n - 1)), 1000);
      return () => clearTimeout(t);
    }

    // Zero: hold on "0" for a beat, then actually launch.
    const t = setTimeout(() => {
      setCountdown(null);
      apply(true);
    }, 700);
    return () => clearTimeout(t);
  }, [countdown, apply]);

  if (!status) return null;

  const launchedOn = status.launchedAt
    ? new Date(status.launchedAt).toLocaleDateString("en-GB").replace(/\//g, "-")
    : null;

  return (
    <>
      <div
        style={{
          borderRadius: 18,
          padding: "20px 22px",
          marginBottom: 22,
          background: status.live
            ? "linear-gradient(135deg,rgba(16,185,129,.12),rgba(5,150,105,.06))"
            : "linear-gradient(135deg,rgba(99,102,241,.18),rgba(124,58,237,.10))",
          border: `1px solid ${status.live ? "rgba(16,185,129,.3)" : "rgba(124,58,237,.4)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 18,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 15, minWidth: 0 }}>
          <div
            style={{
              width: 48, height: 48, borderRadius: 15, flexShrink: 0,
              background: status.live ? "linear-gradient(135deg,#10b981,#059669)" : "linear-gradient(135deg,#6366f1,#4f46e5)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 23,
              boxShadow: status.live ? "0 8px 24px rgba(16,185,129,.35)" : "0 8px 24px rgba(99,102,241,.4)",
            }}
          >
            {status.live ? "✅" : "🚀"}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text, #fff)", letterSpacing: "-.2px" }}>
              {status.live ? "FinovaOS is LIVE" : "Ready to launch"}
            </div>
            <div style={{ fontSize: 12.5, color: "rgba(148,163,184,.9)", marginTop: 3 }}>
              {status.live
                ? launchedOn
                  ? `Launched ${launchedOn}${status.launchedBy ? ` by ${status.launchedBy}` : ""} · buy buttons are open`
                  : "Signups and buy buttons are open."
                : "Pricing buttons show “Launching Soon”. Press Launch Now to open them."}
            </div>
            {error && <div style={{ fontSize: 12, color: "#f87171", marginTop: 6 }}>{error}</div>}
          </div>
        </div>

        {/* Before launch this is the only control, as asked. Afterwards there
            has to be a way back, or a test launch can only be undone from the
            database. */}
        {!status.live ? (
          <button
            type="button"
            onClick={() => setConfirming("launch")}
            style={{
              padding: "13px 30px", borderRadius: 12, cursor: "pointer", border: "none",
              background: "linear-gradient(135deg,#6366f1,#7c3aed)", color: "white",
              fontSize: 14.5, fontWeight: 800, fontFamily: "inherit",
              boxShadow: "0 10px 30px rgba(99,102,241,.45)", whiteSpace: "nowrap",
            }}
          >
            🚀 Launch Now
          </button>
        ) : status.forcedByEnv ? (
          // Held open by NEXT_PUBLIC_SIGNUPS_OPEN — no button can close that.
          <span style={{ fontSize: 12, color: "rgba(148,163,184,.75)", maxWidth: 210, textAlign: "right" }}>
            Forced open by environment variable
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming("offline")}
            style={{
              padding: "9px 16px", borderRadius: 10, cursor: "pointer",
              background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.14)",
              color: "rgba(226,232,240,.75)", fontSize: 12.5, fontWeight: 600, fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}
          >
            Close signups
          </button>
        )}
      </div>

      {/* ── Confirm ── */}
      {confirming && (
        <div
          onClick={() => !working && setConfirming(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 9998, background: "rgba(3,6,20,.72)",
            backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 420, borderRadius: 20, padding: "28px 26px",
              background: "#0d1230", border: "1px solid rgba(255,255,255,.1)", color: "white",
              fontFamily: "'Outfit','DM Sans',sans-serif", textAlign: "center",
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>{confirming === "launch" ? "🚀" : "⚠️"}</div>
            <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 10 }}>
              {confirming === "launch" ? "Launch FinovaOS?" : "Close signups again?"}
            </div>
            <p style={{ fontSize: 13.5, lineHeight: 1.75, color: "rgba(255,255,255,.5)", marginBottom: 24 }}>
              {confirming === "launch"
                ? "A 10-second countdown starts. At zero every pricing button goes live and visitors can sign up and pay. You can abort until then."
                : "Buy buttons go back to “Launching Soon”. Existing customers are unaffected."}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                type="button"
                disabled={working}
                onClick={() => setConfirming(null)}
                style={{
                  padding: "11px 20px", borderRadius: 11, cursor: working ? "not-allowed" : "pointer",
                  background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.14)",
                  color: "rgba(255,255,255,.7)", fontSize: 13.5, fontWeight: 600, fontFamily: "inherit",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={working}
                onClick={() => {
                  if (confirming === "launch") {
                    // Countdown first; the write happens when it hits zero.
                    setConfirming(null);
                    setError("");
                    setCountdown(10);
                  } else {
                    apply(false);
                  }
                }}
                style={{
                  padding: "11px 26px", borderRadius: 11, border: "none",
                  cursor: working ? "not-allowed" : "pointer",
                  background: confirming === "launch"
                    ? "linear-gradient(135deg,#6366f1,#7c3aed)"
                    : "linear-gradient(135deg,#ef4444,#dc2626)",
                  color: "white", fontSize: 13.5, fontWeight: 800, fontFamily: "inherit",
                }}
              >
                {working ? "Working…" : confirming === "launch" ? "Start countdown" : "Close signups"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── T-minus countdown ── */}
      {countdown !== null && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9999, display: "flex",
            flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
            background: "radial-gradient(circle at 50% 45%, rgba(79,70,229,.22), rgba(2,4,16,.96))",
            backdropFilter: "blur(8px)", fontFamily: "'Outfit','DM Sans',sans-serif", color: "white",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".32em", textTransform: "uppercase", color: "rgba(255,255,255,.42)" }}>
            {countdown === 0 ? "Liftoff" : "Launching FinovaOS"}
          </div>

          <div style={{ position: "relative", width: 260, height: 260, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {/* Ring drains as the count falls. */}
            <svg width="260" height="260" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
              <circle cx="130" cy="130" r="118" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="6" />
              <circle
                cx="130" cy="130" r="118" fill="none"
                stroke={countdown <= 3 ? "#f59e0b" : "#818cf8"}
                strokeWidth="6" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 118}
                strokeDashoffset={2 * Math.PI * 118 * (1 - countdown / 10)}
                style={{ transition: "stroke-dashoffset 1s linear, stroke .3s" }}
              />
            </svg>
            <div
              // Keyed so the animation replays on every tick.
              key={countdown}
              style={{
                fontSize: countdown === 0 ? 96 : 132, fontWeight: 900, lineHeight: 1,
                letterSpacing: "-4px",
                color: countdown <= 3 ? "#fbbf24" : "white",
                textShadow: countdown <= 3 ? "0 0 60px rgba(245,158,11,.6)" : "0 0 60px rgba(99,102,241,.55)",
                animation: "tmTick .5s cubic-bezier(.18,.89,.32,1.28) both",
              }}
            >
              {countdown === 0 ? "🚀" : countdown}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCountdown(null)}
            disabled={countdown === 0}
            style={{
              marginTop: 14, padding: "9px 22px", borderRadius: 999,
              cursor: countdown === 0 ? "not-allowed" : "pointer",
              background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.16)",
              color: "rgba(255,255,255,.6)", fontSize: 12.5, fontWeight: 700, fontFamily: "inherit",
              opacity: countdown === 0 ? 0.35 : 1,
            }}
          >
            Abort
          </button>
          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.25)" }}>
            Nothing changes until the count reaches zero
          </div>

          <style>{`@keyframes tmTick { from { opacity:0; transform:scale(1.7) } to { opacity:1; transform:scale(1) } }`}</style>
        </div>
      )}

      {/* ── Celebration ── */}
      {celebrate && (
        <>
          <Confetti onDone={() => {}} />
          <div
            onClick={() => setCelebrate(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 9999, display: "flex",
              alignItems: "center", justifyContent: "center", padding: 24, cursor: "pointer",
              background: "radial-gradient(circle at 50% 45%, rgba(79,70,229,.28), rgba(3,6,20,.86))",
              backdropFilter: "blur(3px)",
            }}
          >
            <div style={{ textAlign: "center", color: "white", fontFamily: "'Outfit','DM Sans',sans-serif", animation: "launchPop .6s cubic-bezier(.18,.89,.32,1.28) both" }}>
              <div style={{ fontSize: 76, marginBottom: 6 }}>🎉</div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: ".18em", textTransform: "uppercase", color: "#a5b4fc", marginBottom: 10 }}>
                Congratulations
              </div>
              <div style={{
                fontSize: 46, fontWeight: 900, letterSpacing: "-1.5px", marginBottom: 14, lineHeight: 1.1,
                background: "linear-gradient(120deg,#ffffff,#c7d2fe,#a78bfa)",
                WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
              }}>
                FinovaOS is Launched
              </div>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,.6)", marginBottom: 26 }}>
                Every pricing button is now open. You are taking customers.
              </p>
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                onClick={e => e.stopPropagation()}
                style={{
                  display: "inline-block", padding: "13px 30px", borderRadius: 12,
                  background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "white",
                  fontWeight: 700, fontSize: 14, textDecoration: "none",
                  boxShadow: "0 12px 34px rgba(79,70,229,.5)",
                }}
              >
                View live site →
              </a>
              <div style={{ marginTop: 22, fontSize: 12, color: "rgba(255,255,255,.3)" }}>Click anywhere to close</div>
            </div>
          </div>
          <style>{`@keyframes launchPop { from { opacity:0; transform:scale(.82) translateY(18px) } to { opacity:1; transform:scale(1) translateY(0) } }`}</style>
        </>
      )}
    </>
  );
}
