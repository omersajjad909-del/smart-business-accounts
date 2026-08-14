"use client";

/**
 * The Launch Now card on the admin dashboard.
 *
 * Opening the public site to the world is outward-facing and not silently
 * reversible in the visitor's memory, so the button always asks first. The
 * celebration afterwards is deliberate: launching a product should feel like
 * something happened.
 *
 * The confetti and fireworks are hand-rolled on a canvas rather than pulled from
 * a package — the site's CSP blocks external script hosts, and a little physics
 * beats a dependency for one animation. The sound is synthesised with Web Audio
 * for the same reason: no asset to host, nothing for the CSP to block. The
 * countdown is read aloud through the browser's own speech synthesis.
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

/**
 * One popper per edge of the screen. Angles are in degrees with 0 pointing
 * right and -90 straight up; `along` places the muzzle somewhere on that edge
 * so repeat waves do not all fire from the same spot.
 */
const SIDES = [
  { name: "left",   at: (w: number, h: number, r: number) => [0, h * (0.3 + r * 0.55)], angle: -30,  spread: 48,  speed: 1 },
  { name: "right",  at: (w: number, h: number, r: number) => [w, h * (0.3 + r * 0.55)], angle: -150, spread: 48,  speed: 1 },
  { name: "bottom", at: (w: number, h: number, r: number) => [w * (0.1 + r * 0.8), h],  angle: -90,  spread: 66,  speed: 1.05 },
  { name: "top",    at: (w: number, h: number, r: number) => [w * (0.1 + r * 0.8), 0],  angle: 90,   spread: 120, speed: 0.45 },
];

// Four volleys, so the celebration lasts a few seconds instead of a blink.
const WAVES = [0, 720, 1420, 2850];
const PER_SIDE = 34;
const FADE_AFTER = 2000;

/**
 * When each aerial shell detonates, in ms from the start of the show. The
 * canvas bursts and the audio booms both read this list, which is the only
 * reason picture and sound stay together.
 */
const SHELLS = [850, 1750, 2600, 3500, 4300];
const SHELL_RISE = 620;   // whistle lead-in before the boom
const SHOW_ENDS = 5600;

type Piece = {
  x: number; y: number; vx: number; vy: number;
  size: number; color: string; rot: number; spin: number;
  born: number; life: number;
};

type Spark = {
  x: number; y: number; vx: number; vy: number;
  size: number; color: string; born: number; ttl: number;
};

function Celebration({ onDone }: { onDone: () => void }) {
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

    const pieces: Piece[] = [];
    const sparks: Spark[] = [];

    const spawn = () => {
      const w = W(), h = H(), now = Date.now();
      for (const s of SIDES) {
        for (let i = 0; i < PER_SIDE; i++) {
          const [x, y] = s.at(w, h, Math.random());
          const a = (s.angle + (Math.random() - 0.5) * s.spread) * (Math.PI / 180);
          const speed = (13 + Math.random() * 15) * s.speed;
          pieces.push({
            x, y,
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed,
            size: 6 + Math.random() * 7,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            rot: Math.random() * Math.PI,
            spin: (Math.random() - 0.5) * 0.3,
            born: now,
            life: 1,
          });
        }
      }
    };

    /**
     * A shell detonating: a ring of sparks thrown outward, drawn additively so
     * the middle of the burst blooms white the way a real one does.
     */
    const burst = () => {
      const w = W(), h = H(), now = Date.now();
      const cx = w * (0.15 + Math.random() * 0.7);
      const cy = h * (0.12 + Math.random() * 0.34);
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const count = 90 + Math.floor(Math.random() * 40);
      const power = 4.4 + Math.random() * 2.4;

      for (let i = 0; i < count; i++) {
        // Even angles with a little jitter keep the ring from clumping.
        const a = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
        const speed = power * (0.45 + Math.random() * 0.75);
        sparks.push({
          x: cx, y: cy,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          size: 1.5 + Math.random() * 2,
          // A few stragglers in a second colour, like a two-tone shell.
          color: Math.random() < 0.22 ? "#fff7ed" : color,
          born: now,
          ttl: 900 + Math.random() * 700,
        });
      }
    };

    spawn();
    const timers = [
      ...WAVES.slice(1).map(delay => setTimeout(spawn, delay)),
      ...SHELLS.map(delay => setTimeout(burst, delay)),
    ];

    let raf = 0;
    const start = Date.now();

    const frame = () => {
      const w = W(), h = H(), now = Date.now();
      ctx.clearRect(0, 0, w, h);
      let alive = false;

      for (const p of pieces) {
        p.vy += 0.36;          // gravity
        p.vx *= 0.99;          // drag
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.spin;
        if (now - p.born > FADE_AFTER) p.life -= 0.012;

        if (p.life > 0 && p.y < h + 40 && p.x > -120 && p.x < w + 120) {
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

      // Sparks glow: additive blending, so overlapping trails burn brighter.
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const s of sparks) {
        const age = now - s.born;
        if (age > s.ttl) continue;
        s.vy += 0.045;         // sparks are light; they hang before they drop
        s.vx *= 0.976;
        s.vy *= 0.976;
        s.x += s.vx;
        s.y += s.vy;

        alive = true;
        // Bright and steady at first, then a quick flicker as it burns out.
        const t = age / s.ttl;
        const fade = 1 - t * t;
        ctx.globalAlpha = Math.max(0, fade * (t > 0.55 ? 0.55 + Math.random() * 0.45 : 1));
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * (1 - t * 0.45), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Keep the loop running until the last shell has had its turn, even if
      // everything fired earlier has already landed.
      if (alive || now - start < SHOW_ENDS) raf = requestAnimationFrame(frame);
      else onDone();
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(t => clearTimeout(t));
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

/** A single party-popper report: a filtered noise crack over a low body thump. */
function popAt(ctx: AudioContext, out: GainNode, t: number, level: number) {
  const dur = 0.2;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 0.8;
  band.frequency.setValueAtTime(2000, t);
  band.frequency.exponentialRampToValueAtTime(600, t + dur);
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(level, t);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  noise.connect(band).connect(ng).connect(out);
  noise.start(t);

  const body = ctx.createOscillator();
  body.type = "sine";
  body.frequency.setValueAtTime(420, t);
  body.frequency.exponentialRampToValueAtTime(70, t + 0.12);
  const bg = ctx.createGain();
  bg.gain.setValueAtTime(level * 0.55, t);
  bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
  body.connect(bg).connect(out);
  body.start(t);
  body.stop(t + 0.16);
}

/** One note of the little rising fanfare that rides over the pops. */
function chimeAt(ctx: AudioContext, out: GainNode, t: number, freq: number) {
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + 0.95);
}

/** Fills a buffer with white noise shaped by `env(progress) -> 0..1`. */
function noiseBuffer(ctx: AudioContext, dur: number, env: (p: number) => number) {
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * env(i / data.length);
  }
  return buf;
}

/** The rising whistle of a shell on its way up. Ends where the boom begins. */
function whistleAt(ctx: AudioContext, out: GainNode, t: number, dur: number) {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(600, t);
  osc.frequency.exponentialRampToValueAtTime(2300, t + dur * 0.82);
  osc.frequency.exponentialRampToValueAtTime(1500, t + dur);

  // A slow warble stops it sounding like a test tone.
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 11;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 45;
  lfo.connect(lfoDepth).connect(osc.frequency);

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.1, t + 0.12);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(out);

  osc.start(t); osc.stop(t + dur);
  lfo.start(t); lfo.stop(t + dur);
}

/** The detonation: a wide low-passed blast with a sub-bass thump underneath. */
function boomAt(ctx: AudioContext, out: GainNode, t: number, level: number) {
  const dur = 1;
  const blast = ctx.createBufferSource();
  blast.buffer = noiseBuffer(ctx, dur, p => Math.pow(1 - p, 2.2));
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.Q.value = 1.1;
  lp.frequency.setValueAtTime(900, t);
  lp.frequency.exponentialRampToValueAtTime(70, t + dur * 0.7);
  const bg = ctx.createGain();
  bg.gain.setValueAtTime(level, t);
  bg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  blast.connect(lp).connect(bg).connect(out);
  blast.start(t);

  const sub = ctx.createOscillator();
  sub.type = "sine";
  sub.frequency.setValueAtTime(95, t);
  sub.frequency.exponentialRampToValueAtTime(28, t + 0.45);
  const sg = ctx.createGain();
  sg.gain.setValueAtTime(level * 0.85, t);
  sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
  sub.connect(sg).connect(out);
  sub.start(t); sub.stop(t + 0.62);
}

/** The scattered tick-tick-tick of burning stars after the shell opens. */
function crackleAt(ctx: AudioContext, out: GainNode, t: number, dur: number, level: number) {
  const src = ctx.createBufferSource();
  // Sparse random spikes over a decaying floor: that gap between ticks is what
  // makes it read as crackle rather than as hiss.
  src.buffer = noiseBuffer(ctx, dur, p => {
    const decay = Math.pow(1 - p, 1.6);
    return decay * (Math.random() < 0.06 ? 1 : 0.09);
  });
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 2400;
  const g = ctx.createGain();
  g.gain.setValueAtTime(level, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(hp).connect(g).connect(out);
  src.start(t);
}

/**
 * The sound of the launch, about five and a half seconds of it: a popper on
 * each side of the screen, a short fanfare, then five shells that whistle up,
 * boom and crackle away — timed to the same `SHELLS` list the canvas uses, so
 * every bang lands on a burst. Audio is decoration; if the browser refuses it
 * (no Web Audio, blocked autoplay) the launch carries on silently.
 */
function playLaunchSound() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    void ctx.resume().catch(() => {});

    const master = ctx.createGain();
    master.gain.value = 0.45;
    master.connect(ctx.destination);

    const t0 = ctx.currentTime + 0.02;

    // Poppers, one per side, then lighter rounds on the later confetti waves.
    [0, 0.08, 0.16, 0.24].forEach((d, i) => popAt(ctx, master, t0 + d, 0.85 - i * 0.1));
    WAVES.slice(1).forEach((ms, i) => {
      popAt(ctx, master, t0 + ms / 1000, 0.6 - i * 0.08);
      popAt(ctx, master, t0 + ms / 1000 + 0.09, 0.5 - i * 0.08);
    });

    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => chimeAt(ctx, master, t0 + 0.2 + i * 0.11, f));

    // Shells. The last one is the finale, so it gets the longest tail.
    SHELLS.forEach((ms, i) => {
      const at = t0 + ms / 1000;
      const finale = i === SHELLS.length - 1;
      whistleAt(ctx, master, at - SHELL_RISE / 1000, SHELL_RISE / 1000);
      boomAt(ctx, master, at, finale ? 0.95 : 0.62 + Math.random() * 0.2);
      crackleAt(ctx, master, at + 0.05, finale ? 1.5 : 0.9, finale ? 0.4 : 0.28);
    });

    // Let the tail ring out, then release the audio device.
    setTimeout(() => { void ctx.close().catch(() => {}); }, SHOW_ENDS + 2000);
  } catch {
    /* no sound, no problem */
  }
}

/**
 * The countdown read aloud. Each number speaks its actual word only; no extra
 * launch phrase is added at zero.
 */
const COUNT_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

function speakCount(n: number) {
  try {
    if (n <= 0) return;

    const synth = window.speechSynthesis;
    if (!synth) return;
    const word = COUNT_WORDS[n] ?? String(n);
    const u = new SpeechSynthesisUtterance(word);
    u.lang = "en-US";
    u.rate = 1.1;
    u.pitch = 1;
    const voice = synth.getVoices().find(v => /^en[-_]?/i.test(v.lang));
    if (voice) u.voice = voice;
    // Drop whatever is still speaking so the next number does not overlap the
    // current one and the spoken count stays in sync with the visual countdown.
    synth.cancel();
    synth.speak(u);
  } catch {
    /* silence is an acceptable countdown */
  }
}

function stopSpeaking() {
  try { window.speechSynthesis?.cancel(); } catch { /* nothing to stop */ }
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
      if (live) { setCelebrate(true); playLaunchSound(); }
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

    // Zero: hold on "0" long enough for "Let's start" to land, then launch.
    const t = setTimeout(() => {
      setCountdown(null);
      apply(true);
    }, 900);
    return () => clearTimeout(t);
  }, [countdown, apply]);

  // Ten, nine, eight… and "Let's start" on zero. Kept in its own effect so the
  // voice follows the number on screen and nothing else re-triggers it.
  useEffect(() => {
    if (countdown === null) return;
    speakCount(countdown);
  }, [countdown]);

  // An aborted or unmounted countdown must not keep talking.
  useEffect(() => stopSpeaking, []);

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
            onClick={() => { stopSpeaking(); setCountdown(null); }}
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
          <Celebration onDone={() => {}} />
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
