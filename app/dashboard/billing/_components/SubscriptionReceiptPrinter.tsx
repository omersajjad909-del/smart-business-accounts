"use client";

/* ─────────────────────────────────────────────────────────────────────────────
   Subscription receipt printer
   ---------------------------------------------------------------------------
   Cinematic "receipt rolling out of a thermal printer" confirmation, shown once
   after a subscription payment lands. The paper is a real DOM node clipped by a
   mask that grows downward from the printer slot, so what the customer reads is
   the same markup they can print — not a video or an image.

   Only render this when the payment is genuinely confirmed (an ACTIVE
   subscription plus a paid invoice row). ?upgrade=success alone just means the
   customer came back from the provider's checkout, which is not proof of
   payment — printing a receipt off that would be a receipt for nothing.
   ───────────────────────────────────────────────────────────────────────────── */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { fmtDate } from "@/lib/dateUtils";

export type SubscriptionReceiptData = {
  companyName: string;
  planLabel: string;
  /** "monthly" | "yearly" — anything else is printed verbatim. */
  billingCycle: string;
  invoiceNo: string;
  /** ISO date string of the charge. */
  paidAt: string;
  total: number;
  currency: string;
  /** Optional breakdown — omitted rows are simply not printed, never guessed. */
  subtotal?: number | null;
  tax?: number | null;
  paymentMethod?: string | null;
  nextBillingDate?: string | null;
  /** Address the confirmation email went to, printed as a footer line. */
  emailedTo?: string | null;
};

type Stage = "processing" | "printing" | "done";

const PAPER_W = 300;
const PROCESSING_MS = 1200;
const PRINT_MS = 2600;

function money(amount: number, currency: string) {
  const symbol = currency === "PKR" ? "₨" : currency === "USD" ? "$" : `${currency} `;
  const digits = currency === "PKR" ? 0 : 2;
  return `${symbol}${amount.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

function cycleLabel(cycle: string) {
  const c = String(cycle || "").toLowerCase();
  if (c === "yearly" || c === "annual") return "Annual subscription";
  if (c === "monthly") return "Monthly subscription";
  return cycle || "Subscription";
}

/* Deterministic bar pattern seeded off the receipt number — the same receipt
   always prints the same bars, so a reprint matches the original. */
function ReceiptBarcode({ value }: { value: string }) {
  let s = value.split("").reduce((a, c) => a + c.charCodeAt(0), 1);
  const bars: number[] = [];
  for (let i = 0; i < 84; i++) {
    s = Math.abs((s * 1664525 + 1013904223) & 0x7fffffff);
    bars.push(1 + (s % 3));
  }
  const totalW = bars.reduce((a, b) => a + b, 0);
  let x = 0;
  return (
    <svg width="100%" height="44" viewBox={`0 0 ${totalW} 44`} preserveAspectRatio="none" style={{ display: "block" }}>
      {bars.map((w, i) => {
        const rx = x;
        x += w;
        return i % 2 === 0 ? <rect key={i} x={rx} y={0} width={w} height={44} fill="#111" /> : null;
      })}
    </svg>
  );
}

function Line({ dashed = true }: { dashed?: boolean }) {
  return <div style={{ borderTop: dashed ? "1px dashed #b9b9b9" : "2px solid #111", margin: "9px 0" }} />;
}

function Row({ label, value, bold, large }: { label: string; value: string; bold?: boolean; large?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: large ? 14 : 11, fontWeight: bold ? 800 : 400, marginBottom: 3, letterSpacing: large ? "-.2px" : 0 }}>
      <span>{label}</span>
      <span style={{ textAlign: "right" }}>{value}</span>
    </div>
  );
}

/* The printed page itself. Kept as its own component so the same markup can be
   dropped into an invoice reprint later without the printer chrome. */
export function SubscriptionReceiptPaper({ data }: { data: SubscriptionReceiptData }) {
  const dt = new Date(data.paidAt);
  const timeStr = isNaN(dt.getTime())
    ? ""
    : dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      style={{
        width: PAPER_W,
        background: "#fdfdfb",
        color: "#111",
        fontFamily: "'Courier New',Courier,monospace",
        fontSize: 11,
        lineHeight: 1.55,
        padding: "18px 16px 14px",
        backgroundImage: "repeating-linear-gradient(0deg,rgba(0,0,0,.018) 0 1px,transparent 1px 3px)",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 10 }}>
        <div style={{ width: 34, height: 34, margin: "0 auto 8px", borderRadius: 9, background: "#111", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 900, fontFamily: "system-ui,sans-serif" }}>F</div>
        <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: "1px" }}>FINOVAOS</div>
        <div style={{ fontSize: 10, opacity: .65, marginTop: 2 }}>PAYMENT RECEIPT</div>
      </div>

      <Line dashed={false} />

      {/* What was bought */}
      <Row label={data.planLabel.toUpperCase()} value={money(data.total, data.currency)} bold />
      <div style={{ fontSize: 10, opacity: .6 }}>{cycleLabel(data.billingCycle)}</div>

      <Line />

      {typeof data.subtotal === "number" && <Row label="Subtotal" value={money(data.subtotal, data.currency)} />}
      {typeof data.tax === "number" && <Row label="Tax" value={money(data.tax, data.currency)} />}
      {(typeof data.subtotal === "number" || typeof data.tax === "number") && <Line />}

      <Row label="TOTAL PAID" value={money(data.total, data.currency)} bold large />

      <Line />

      {/* Transaction detail */}
      <Row label="Receipt no" value={data.invoiceNo} />
      {data.paymentMethod ? <Row label="Paid with" value={data.paymentMethod} /> : null}
      <Row label="Date" value={`${fmtDate(data.paidAt)}${timeStr ? `  ${timeStr}` : ""}`} />
      {data.nextBillingDate ? <Row label="Next billing" value={fmtDate(data.nextBillingDate)} /> : null}
      <Row label="Billed to" value={data.companyName} />
      <Row label="Status" value="PAID" bold />

      <Line />

      <div style={{ textAlign: "center", fontSize: 10, opacity: .7, margin: "10px 0 8px", lineHeight: 1.7 }}>
        Thank you for subscribing to FinovaOS.
        {data.emailedTo ? <><br />A copy has been emailed to {data.emailedTo}</> : null}
      </div>

      <ReceiptBarcode value={data.invoiceNo} />
      <div style={{ textAlign: "center", fontSize: 10, letterSpacing: "2px", marginTop: 5 }}>{data.invoiceNo}</div>
    </div>
  );
}

export function SubscriptionReceiptPrinter({
  data,
  open,
  onClose,
}: {
  data: SubscriptionReceiptData;
  open: boolean;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<Stage>("processing");
  const [reveal, setReveal] = useState(0);
  const paperRef = useRef<HTMLDivElement | null>(null);
  const paperH = useRef(0);

  const reduceMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useLayoutEffect(() => {
    if (!open) return;
    paperH.current = paperRef.current?.offsetHeight ?? 0;
    if (reduceMotion) {
      setStage("done");
      setReveal(paperH.current);
    }
  }, [open, reduceMotion, data]);

  useEffect(() => {
    if (!open || reduceMotion) return;
    setStage("processing");
    setReveal(0);
    const t1 = window.setTimeout(() => {
      setStage("printing");
      // Height is re-read here rather than reused from layout: late font loading
      // changes the paper's height, and a stale value would clip the tail.
      setReveal(paperRef.current?.offsetHeight ?? paperH.current);
    }, PROCESSING_MS);
    const t2 = window.setTimeout(() => setStage("done"), PROCESSING_MS + PRINT_MS);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [open, reduceMotion, data.invoiceNo]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function skip() {
    setStage("done");
    setReveal(paperRef.current?.offsetHeight ?? paperH.current);
  }

  if (!open) return null;

  const statusText =
    stage === "processing" ? "Processing your order"
      : stage === "printing" ? "Printing your receipt"
        : "Order complete";

  return (
    <div
      className="fnv-receipt-overlay"
      onClick={(e) => { if (e.target === e.currentTarget && stage === "done") onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 3000,
        background: "rgba(6,8,16,.82)", backdropFilter: "blur(10px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "40px 16px", overflowY: "auto",
        animation: "fnvRcptFade .35s ease",
      }}
    >
      <style>{`
        @keyframes fnvRcptFade { from { opacity:0 } to { opacity:1 } }
        @keyframes fnvRcptRise { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:none } }
        @keyframes fnvRcptSpin { to { transform:rotate(360deg) } }
        @keyframes fnvRcptFeed { 0%,100% { transform:translateY(0) } 50% { transform:translateY(.7px) } }
        @keyframes fnvRcptLed  { 0%,100% { opacity:1 } 50% { opacity:.25 } }
        @media print {
          body * { visibility: hidden !important; }
          .fnv-receipt-paper, .fnv-receipt-paper * { visibility: visible !important; }
          .fnv-receipt-overlay { position:absolute !important; inset:auto !important; background:none !important; backdrop-filter:none !important; padding:0 !important; display:block !important; overflow:visible !important; }
          .fnv-receipt-chrome, .fnv-receipt-actions { display:none !important; }
          .fnv-receipt-mask { height:auto !important; overflow:visible !important; }
          .fnv-receipt-paper { position:absolute; left:0; top:0; box-shadow:none !important; animation:none !important; }
        }
      `}</style>

      <div style={{ width: "100%", maxWidth: 420, animation: "fnvRcptRise .45s cubic-bezier(.22,.61,.36,1)" }}>

        {/* ── Order summary card (the "till display" above the printer) ── */}
        <div className="fnv-receipt-chrome" style={{ borderRadius: 18, background: "rgba(255,255,255,.055)", border: "1px solid rgba(255,255,255,.1)", padding: "16px 18px", marginBottom: 18, backdropFilter: "blur(6px)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{data.planLabel}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.42)", marginTop: 2 }}>{cycleLabel(data.billingCycle)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.32)" }}>Total</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", marginTop: 2 }}>{money(data.total, data.currency)}</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 14, paddingTop: 13, borderTop: "1px solid rgba(255,255,255,.08)" }}>
            {stage === "done" ? (
              <span style={{ width: 16, height: 16, borderRadius: "50%", background: "#34d399", color: "#04241a", fontSize: 10, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✓</span>
            ) : (
              <span style={{ width: 15, height: 15, borderRadius: "50%", border: "2px solid rgba(255,255,255,.16)", borderTopColor: "#818cf8", animation: "fnvRcptSpin .7s linear infinite", flexShrink: 0 }} />
            )}
            <span style={{ fontSize: 12.5, fontWeight: 600, color: stage === "done" ? "#34d399" : "rgba(255,255,255,.6)" }}>
              {statusText}
            </span>
            {stage !== "done" && (
              <button
                onClick={skip}
                style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(255,255,255,.35)", fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                Skip →
              </button>
            )}
          </div>
        </div>

        {/* ── Printer body ── */}
        <div className="fnv-receipt-chrome" style={{ width: PAPER_W + 40, maxWidth: "100%", margin: "0 auto", borderRadius: "16px 16px 6px 6px", background: "linear-gradient(180deg,#2a2e3a,#171a23)", border: "1px solid rgba(255,255,255,.09)", padding: "14px 20px 12px", boxShadow: "0 22px 50px rgba(0,0,0,.5)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 11 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: stage === "done" ? "#34d399" : "#fbbf24", animation: stage === "done" ? "none" : "fnvRcptLed .8s ease-in-out infinite" }} />
            <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".14em", color: "rgba(255,255,255,.28)", textTransform: "uppercase" }}>
              {stage === "done" ? "Ready" : "Printing"}
            </span>
          </div>
          {/* Slot */}
          <div style={{ height: 9, borderRadius: 5, background: "#0a0c12", boxShadow: "inset 0 3px 7px rgba(0,0,0,.9), 0 1px 0 rgba(255,255,255,.06)" }} />
        </div>

        {/* ── Paper, clipped by a mask that grows downward out of the slot ── */}
        <div
          className="fnv-receipt-mask"
          style={{
            width: PAPER_W,
            maxWidth: "100%",
            margin: "0 auto",
            height: reveal,
            overflow: "hidden",
            transition: reduceMotion ? "none" : `height ${PRINT_MS}ms cubic-bezier(.2,.62,.3,1)`,
          }}
        >
          <div
            ref={paperRef}
            className="fnv-receipt-paper"
            style={{
              boxShadow: "0 18px 40px rgba(0,0,0,.45)",
              animation: stage === "printing" && !reduceMotion ? "fnvRcptFeed .18s steps(2) infinite" : "none",
            }}
          >
            <SubscriptionReceiptPaper data={data} />
            {/* Torn bottom edge */}
            <div
              style={{
                height: 9,
                background: "#fdfdfb",
                clipPath: "polygon(0 0,100% 0,100% 0,97.5% 100%,95% 0,92.5% 100%,90% 0,87.5% 100%,85% 0,82.5% 100%,80% 0,77.5% 100%,75% 0,72.5% 100%,70% 0,67.5% 100%,65% 0,62.5% 100%,60% 0,57.5% 100%,55% 0,52.5% 100%,50% 0,47.5% 100%,45% 0,42.5% 100%,40% 0,37.5% 100%,35% 0,32.5% 100%,30% 0,27.5% 100%,25% 0,22.5% 100%,20% 0,17.5% 100%,15% 0,12.5% 100%,10% 0,7.5% 100%,5% 0,2.5% 100%,0 0)",
              }}
            />
          </div>
        </div>

        {/* ── Actions ── */}
        {stage === "done" && (
          <div className="fnv-receipt-actions" style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 22, animation: "fnvRcptRise .4s ease" }}>
            <button
              onClick={() => window.print()}
              style={{ padding: "10px 18px", borderRadius: 11, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.06)", color: "rgba(255,255,255,.8)", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              🖨 Print receipt
            </button>
            <button
              onClick={onClose}
              style={{ padding: "10px 22px", borderRadius: 11, border: "none", background: "linear-gradient(135deg,#6366f1,#7c3aed)", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
