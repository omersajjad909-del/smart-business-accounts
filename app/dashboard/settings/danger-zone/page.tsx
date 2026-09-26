"use client";

/**
 * Settings → Danger Zone.
 *
 * One irreversible action lives here: wipe every record this company has
 * ever entered (invoices, vouchers, ledger, contacts, employees — everything
 * clearCompanyData touches) while keeping the company, its plan and its
 * logins intact.
 *
 * Because there is no undo, confirming it takes two steps rather than one.
 * The first asks for the admin's current password and the company's exact
 * name and deletes nothing; it only mails a code. The second asks for that
 * code. Whoever presses the button therefore has to hold the inbox too, and
 * the warning mail reaches its reader while the books are still there.
 */

import { useEffect, useState } from "react";
import { useResponsive } from "@/hooks/useResponsive";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(var(--ink),0.03)";
const border = "rgba(239,68,68,0.35)";

const field: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 9, background: "rgba(var(--ink),.04)",
  border: "1px solid rgba(var(--ink),.1)", color: "var(--ink-solid, #fff)", fontSize: 13, fontFamily: ff,
  boxSizing: "border-box", outline: "none",
};

const label: React.CSSProperties = {
  display: "block", fontSize: 11.5, color: "rgba(var(--ink),var(--ta-50, .5))", marginBottom: 5,
};

export default function DangerZonePage() {
  const { isMobile } = useResponsive();
  const [companyName, setCompanyName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showConfirm, setShowConfirm] = useState(false);
  const [step, setStep] = useState<"credentials" | "code">("credentials");
  const [password, setPassword] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch("/api/company/reset-all", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.error) { setError(d.error); return; }
        setCompanyName(d.companyName || "");
        setIsAdmin(Boolean(d.isAdmin));
      })
      .catch(() => setError("Could not load company info."))
      .finally(() => setLoading(false));
  }, []);

  function openConfirm() {
    setModalError("");
    setStep("credentials");
    setPassword("");
    setConfirmName("");
    setCode("");
    setSentTo("");
    setShowConfirm(true);
  }

  function closeConfirm() {
    if (submitting) return;
    setShowConfirm(false);
  }

  async function post(body: Record<string, string>) {
    const res = await fetch("/api/company/reset-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "Something went wrong.");
    return json;
  }

  async function requestCode() {
    setModalError("");
    if (!password) {
      setModalError("Enter your current password.");
      return;
    }
    if (confirmName.trim() !== companyName) {
      setModalError("Type the company name exactly as shown to confirm.");
      return;
    }
    setSubmitting(true);
    try {
      const body = await post({ password, confirmName });
      setSentTo(body.sentTo || "your email");
      setStep("code");
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Could not send the code.");
    } finally {
      setSubmitting(false);
    }
  }

  async function doReset() {
    setModalError("");
    if (code.trim().length < 6) {
      setModalError("Enter the 6-digit code from your email.");
      return;
    }
    setSubmitting(true);
    try {
      await post({ password, confirmName, code: code.trim() });
      setShowConfirm(false);
      setDone(true);
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Could not reset the system.");
    } finally {
      setSubmitting(false);
    }
  }

  const canRequest = password.length > 0 && confirmName.trim() === companyName && !submitting;
  const canReset = code.trim().length === 6 && !submitting;

  return (
    <div style={{ fontFamily: ff, color: "var(--ink-solid, #fff)", padding: isMobile ? "16px 12px 80px" : "24px 28px 80px", maxWidth: 760, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Danger Zone</h1>
      <p style={{ fontSize: 13.5, color: "rgba(var(--ink),var(--ta-45, .45))", margin: 0, maxWidth: 620, lineHeight: 1.6 }}>
        Actions here cannot be undone. Read each one carefully before continuing.
      </p>

      {error && (
        <div style={{ marginTop: 18, padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.3)", color: "var(--tx-fca5a5, #fca5a5)", fontSize: 12.5 }}>
          {error}
        </div>
      )}

      {done && (
        <div style={{ marginTop: 18, padding: "10px 14px", borderRadius: 10, background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.28)", color: "var(--tx-86efac, #86efac)", fontSize: 12.5 }}>
          System reset. Every record has been cleared — your login, company and plan are untouched.
        </div>
      )}

      {loading ? (
        <div style={{ marginTop: 24, color: "rgba(var(--ink),var(--ta-30, .3))", fontSize: 13 }}>Loading…</div>
      ) : (
        <div style={{ marginTop: 18, background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: isMobile ? "16px 14px" : "20px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div style={{ maxWidth: 480 }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--tx-fca5a5, #fca5a5)" }}>Reset All System</div>
              <p style={{ fontSize: 12.5, color: "rgba(var(--ink),var(--ta-50, .5))", margin: "6px 0 0", lineHeight: 1.7 }}>
                Permanently deletes every invoice, voucher, ledger entry, contact, employee, bank
                account and record this company has ever entered. Your login, the company itself
                and its subscription are kept — this only empties what is inside.
              </p>
              <p style={{ fontSize: 12, color: "rgba(var(--ink),var(--ta-35, .35))", margin: "8px 0 0", lineHeight: 1.7 }}>
                Needs your password, the company name, and a code sent to your email before
                anything is deleted.
              </p>
            </div>
            {!isAdmin ? (
              <div style={{ fontSize: 12, color: "rgba(var(--ink),var(--ta-40, .4))", whiteSpace: "nowrap" }}>
                Only an admin can do this
              </div>
            ) : (
              <button
                onClick={openConfirm}
                style={{
                  padding: "10px 18px", borderRadius: 10, border: "1px solid rgba(239,68,68,.5)",
                  background: "rgba(239,68,68,.12)", color: "var(--tx-fca5a5, #fca5a5)", fontSize: 13, fontWeight: 800,
                  fontFamily: ff, cursor: "pointer", whiteSpace: "nowrap",
                }}
              >
                Reset All System
              </button>
            )}
          </div>
        </div>
      )}

      {showConfirm && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 100,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          }}
          onClick={closeConfirm}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 440, background: "var(--dk-0d1035, #0d1035)", border: `1px solid ${border}`,
              borderRadius: 16, padding: "22px 22px 20px", fontFamily: ff, color: "var(--ink-solid, #fff)",
              boxShadow: "0 20px 60px rgba(0,0,0,.5)",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "rgba(var(--ink),var(--ta-30, .3))", textTransform: "uppercase", marginBottom: 6 }}>
              Step {step === "credentials" ? "1" : "2"} of 2
            </div>

            {step === "credentials" ? (
              <>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--tx-fca5a5, #fca5a5)" }}>Reset all system data?</div>
                <p style={{ fontSize: 12.5, color: "rgba(var(--ink),var(--ta-50, .5))", margin: "8px 0 16px", lineHeight: 1.7 }}>
                  This deletes everything this company has recorded, and it cannot be undone.
                  Nothing is deleted yet — confirm your password and the company name, and we will
                  email you a code to finish.
                </p>

                <label style={label}>Current password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus style={field} />

                <label style={{ ...label, marginTop: 14 }}>
                  Type <strong style={{ color: "var(--ink-solid, #fff)" }}>{companyName}</strong> to confirm
                </label>
                <input type="text" value={confirmName} onChange={(e) => setConfirmName(e.target.value)} placeholder={companyName} style={field} />
              </>
            ) : (
              <>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--tx-fca5a5, #fca5a5)" }}>Enter the code we emailed you</div>
                <p style={{ fontSize: 12.5, color: "rgba(var(--ink),var(--ta-50, .5))", margin: "8px 0 16px", lineHeight: 1.7 }}>
                  A 6-digit code was sent to <strong style={{ color: "var(--ink-solid, #fff)" }}>{sentTo}</strong>. It expires
                  in 15 minutes. <strong style={{ color: "var(--tx-fca5a5, #fca5a5)" }}>Nothing has been deleted yet</strong> —
                  entering this code is what deletes it.
                </p>

                <label style={label}>6-digit code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  autoFocus
                  placeholder="000000"
                  style={{ ...field, letterSpacing: 8, fontSize: 18, fontWeight: 700, textAlign: "center", fontFamily: "monospace" }}
                />
              </>
            )}

            {modalError && (
              <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.3)", color: "var(--tx-fca5a5, #fca5a5)", fontSize: 12 }}>
                {modalError}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
              <button
                onClick={closeConfirm}
                disabled={submitting}
                style={{
                  padding: "9px 16px", borderRadius: 9, background: "rgba(var(--ink),.05)",
                  border: `1px solid ${border}`, color: "rgba(var(--ink),var(--ta-70, .7))", fontSize: 12.5,
                  fontWeight: 700, fontFamily: ff, cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
              {step === "credentials" ? (
                <button
                  onClick={requestCode}
                  disabled={!canRequest}
                  style={{
                    padding: "9px 18px", borderRadius: 9, border: "none",
                    background: canRequest ? "#ef4444" : "rgba(239,68,68,.35)",
                    color: "#fff", fontSize: 12.5, fontWeight: 800, fontFamily: ff,
                    cursor: canRequest ? "pointer" : "not-allowed",
                  }}
                >
                  {submitting ? "Sending…" : "Email me the code"}
                </button>
              ) : (
                <button
                  onClick={doReset}
                  disabled={!canReset}
                  style={{
                    padding: "9px 18px", borderRadius: 9, border: "none",
                    background: canReset ? "#ef4444" : "rgba(239,68,68,.35)",
                    color: "#fff", fontSize: 12.5, fontWeight: 800, fontFamily: ff,
                    cursor: canReset ? "pointer" : "not-allowed",
                  }}
                >
                  {submitting ? "Resetting…" : "Reset everything"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
